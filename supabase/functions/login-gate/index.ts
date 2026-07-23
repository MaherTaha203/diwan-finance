// AUTH-001 · login-gate — server-authoritative login with progressive lockout + audit.
// verify_jwt = FALSE (unauthenticated login). Mandatory order:
//   normalize identifier → disabled → admin-lock → timed-lock → validate creds →
//   (fail: attempts++/escalate/audit) | (success: reset/audit/issue session).
// Always responds 200 with a structured verdict (client localizes the message).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveLoginEmail, normalizePhone, lockStatus, onFailure, onSuccess } from '../_shared/auth-core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON = Deno.env.get('SUPABASE_ANON_KEY');
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function audit(action, actor, targetId, description) {
  try { await admin.from('audit_log').insert({ action, user_name: actor, table_name: 'auth', record_id: targetId, description }); } catch (_) {}
}

/* Resolve typed identifier → {canonical GoTrue email, user_id, is_disabled}. */
async function resolveIdentity(identifier) {
  const guess = resolveLoginEmail(identifier);
  const phone = normalizePhone(identifier);
  // Match by email OR phone in user_roles (email was backfilled = auth email).
  const { data } = await admin.from('user_roles')
    .select('user_id, email, phone, is_disabled')
    .or(`email.eq.${guess},phone.eq.${phone}`).maybeSingle();
  if (data) {
    const canonical = data.email || guess;   // phone-only rows have null email → synthetic guess
    return { canonical, user_id: data.user_id, is_disabled: !!data.is_disabled };
  }
  return { canonical: guess, user_id: null, is_disabled: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 200); }
  const identifier = String(body?.identifier || '').trim();
  const password = String(body?.password || '');
  if (!identifier || !password) return json({ ok: false, error: 'missing_credentials' }, 200);

  try {
    // 1 · Normalize + resolve
    const id = await resolveIdentity(identifier);
    const now = Date.now();

    // 2 · Disabled
    if (id.is_disabled) {
      await audit('login_failed', id.canonical, id.user_id, 'Login blocked: account disabled');
      return json({ ok: false, disabled: true });
    }

    // load lockout row
    const { data: row } = await admin.from('login_attempts').select('*').eq('identifier', id.canonical).maybeSingle();

    // 3 · Admin lock  4 · Timed lock
    const st = lockStatus(row, now);
    if (st.locked) {
      await audit('login_failed', id.canonical, id.user_id, `Login blocked: ${st.scope} lock`);
      return json({ ok: false, locked: true, scope: st.scope, retry_after_seconds: st.retryAfterMs ? Math.ceil(st.retryAfterMs / 1000) : null });
    }

    // 5 · Validate credentials (isolated anon client — never persists a session server-side)
    const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const grant = await anon.auth.signInWithPassword({ email: id.canonical, password });

    if (!grant.error && grant.data?.session) {
      // 6 · Success → full reset
      const reset = onSuccess(row);
      await admin.from('login_attempts').upsert(
        { identifier: id.canonical, user_id: id.user_id, ...reset, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'identifier' });
      await audit('login_success', id.canonical, id.user_id, 'Successful login');
      const mustChange = !!grant.data.user?.user_metadata?.must_change_password;
      return json({ ok: true, access_token: grant.data.session.access_token, refresh_token: grant.data.session.refresh_token, must_change_password: mustChange });
    }

    // 7 · Failure → increment / escalate
    const { next, verdict } = onFailure(row, now);
    await admin.from('login_attempts').upsert(
      { identifier: id.canonical, user_id: id.user_id, ...next, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'identifier' });
    if (verdict.locked) await audit('account_locked', id.canonical, id.user_id, `Locked after 15 failed attempts (${verdict.scope})`);
    await audit('login_failed', id.canonical, id.user_id, 'Invalid credentials');
    return json({ ok: false, locked: verdict.locked, scope: verdict.scope, retry_after_seconds: verdict.retryAfterMs ? Math.ceil(verdict.retryAfterMs / 1000) : null });
  } catch (e) {
    // Genuine infra error → let the client fall back to direct sign-in.
    return json({ error: 'gate_error', detail: String(e?.message || e) }, 500);
  }
});
