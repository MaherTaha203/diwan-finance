// AUTH-002 · change-password — server-authoritative password change (D4 + D5).
// verify_jwt = TRUE (the caller must present a valid user session). The whole security-
// sensitive sequence runs here, never on the client:
//   verify current password → reuse-history check → set new password →
//   clear app_metadata.must_change_password → revoke all OTHER sessions → audit.
// The forced-change flag lives in app_metadata (service-role only), so this function is the
// ONLY thing that can clear it — the client can no longer bypass the first-login lock.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validatePassword } from '../_shared/auth-core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

let REQ_IP: string | null = null;   // AUTH-003: request IP for audit (set per request)
async function audit(action: string, actor: string, targetId: string | null, description: string) {
  try { await admin.from('audit_log').insert({ action, user_name: actor, table_name: 'auth', record_id: targetId, description, actor_user_id: targetId, ip: REQ_IP }); } catch (_) {}
}

/* Salted reuse fingerprint — SHA-256(userId::password). Mirrors the retired client logic. */
async function fingerprint(pw: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(String(salt || '') + '::' + String(pw || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const _xf = req.headers.get('x-forwarded-for');   // AUTH-003: audit IP
  REQ_IP = _xf ? _xf.split(',')[0].trim() : (req.headers.get('x-real-ip') || null);

  // 1 · Authenticate the caller from their Bearer token.
  const authz = req.headers.get('Authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return json({ error: 'unauthenticated' }, 401);
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u?.user?.email) return json({ error: 'unauthenticated' }, 401);
  const user = u.user;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const current = String(body?.current_password || '');
  const next = String(body?.new_password || '');
  if (!current || !next) return json({ error: 'missing_fields' }, 400);
  if (!validatePassword(next).valid) return json({ error: 'weak_password' }, 400);
  if (next === current) return json({ error: 'same_as_current' }, 400);

  try {
    // 2 · Verify the CURRENT password on an isolated client (never swaps this session).
    const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const grant = await anon.auth.signInWithPassword({ email: user.email!, password: current });
    try { await anon.auth.signOut(); } catch (_) {}
    if (grant.error) return json({ error: 'wrong_current' }, 403);

    // 3 · Reuse prevention — last 5 salted fingerprints held in app_metadata (service-role only).
    const appMeta: Record<string, any> = user.app_metadata || {};
    const hist: string[] = Array.isArray(appMeta.pw_history) ? appMeta.pw_history.slice() : [];
    const fpNew = await fingerprint(next, user.id);
    const fpCur = await fingerprint(current, user.id);
    if (hist.indexOf(fpNew) >= 0) return json({ error: 'password_reused' }, 409);
    const newHist = [fpNew, fpCur].concat(hist).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 5);

    // 4 · Apply the change + clear the forced-change flag + refresh history — one admin write.
    const { error: sErr } = await admin.auth.admin.updateUserById(user.id, {
      password: next,
      app_metadata: { ...appMeta, must_change_password: false, pw_history: newHist },
    });
    if (sErr) return json({ error: 'change_failed', detail: sErr.message }, 400);

    // 5 · AUTH-002 D5 — revoke every OTHER session; the caller's current session stays valid.
    try { await admin.auth.admin.signOut(token, 'others'); } catch (_) {}

    await audit('password_change', user.email!, user.id, 'Password changed (current verified; other sessions revoked)');
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'unexpected', detail: String((e as Error)?.message || e) }, 500);
  }
});
