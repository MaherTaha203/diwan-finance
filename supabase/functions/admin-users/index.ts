// AUTH-001 · admin-users — privileged user management (service_role, admin-JWT gated).
// Actions: create · update · disable · enable · unlock · reset_password · force_change.
// Every action verifies the caller maps to an `admin` role, mutates via the GoTrue Admin
// API + user_roles + login_attempts, and writes a full audit trail. No financial surface.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  canonicalEmail, normalizePhone, validatePassword, generatePassword,
  safeRole, onAdminUnlock, VALID_ROLES,
} from '../_shared/auth-core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function audit(action: string, actor: string, targetId: string | null, description: string) {
  try {
    await admin.from('audit_log').insert({
      action, user_name: actor, table_name: 'auth', record_id: targetId, description,
    });
  } catch (_) { /* audit must never break the operation */ }
}

/* Resolve + verify the caller is an admin. Returns {id, label} or null. */
async function requireAdmin(req: Request): Promise<{ id: string; label: string } | null> {
  const authz = req.headers.get('Authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return null;
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u?.user) return null;
  const { data: role } = await admin.from('user_roles').select('role, full_name, email').eq('user_id', u.user.id).maybeSingle();
  if (!role || role.role !== 'admin') return null;
  return { id: u.user.id, label: role.full_name || role.email || u.user.email || u.user.id };
}

async function identityInUse(email: string | null, phone: string | null, exceptUserId?: string) {
  if (email) {
    const q = await admin.from('user_roles').select('user_id').ilike('email', email).maybeSingle();
    if (q.data && q.data.user_id !== exceptUserId) return 'email';
  }
  if (phone) {
    const q = await admin.from('user_roles').select('user_id').eq('phone', phone).maybeSingle();
    if (q.data && q.data.user_id !== exceptUserId) return 'phone';
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const actor = await requireAdmin(req);
  if (!actor) return json({ error: 'not_admin' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const action = String(body?.action || '');

  try {
    switch (action) {
      case 'create': {
        const full_name = String(body.full_name || '').trim();
        const role = safeRole(body.role);
        if (VALID_ROLES.indexOf(body.role) < 0) return json({ error: 'invalid_role' }, 400);
        const email = body.email ? String(body.email).trim().toLowerCase() : null;
        const phone = body.phone ? normalizePhone(body.phone) : null;
        if (!email && !phone) return json({ error: 'identifier_required' }, 400);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
        const dup = await identityInUse(email, phone);
        if (dup) return json({ error: 'duplicate_identifier', field: dup }, 409);

        const mode = body.mode === 'manual' ? 'manual' : 'auto';
        const password = mode === 'manual' ? String(body.password || '') : generatePassword(16);
        if (!validatePassword(password).valid) return json({ error: 'weak_password' }, 400);
        const forceChange = body.force_change !== false;   // default TRUE
        const canonical = canonicalEmail({ email, phone });

        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: canonical, password, email_confirm: true,
          user_metadata: { full_name: full_name || canonical, must_change_password: forceChange },
        });
        if (cErr || !created?.user) return json({ error: 'create_failed', detail: cErr?.message }, 400);
        const uid = created.user.id;

        const { error: rErr } = await admin.from('user_roles').upsert(
          { user_id: uid, role, full_name: full_name || canonical, email, phone, is_disabled: false },
          { onConflict: 'user_id' },
        );
        if (rErr) { await admin.auth.admin.deleteUser(uid); return json({ error: 'role_write_failed', detail: rErr.message }, 400); }

        await audit('user_created', actor.label, uid, `Created ${email || phone} · role ${role}`);
        if (mode === 'auto') await audit('password_generated', actor.label, uid, 'Temporary password generated at creation');
        return json({ ok: true, user_id: uid, identifier: email || phone, password }, 201);
      }

      case 'update': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        const patch: any = {};
        if (body.full_name != null) patch.full_name = String(body.full_name).trim();
        if (body.role != null) { if (VALID_ROLES.indexOf(body.role) < 0) return json({ error: 'invalid_role' }, 400); patch.role = safeRole(body.role); }
        const email = body.email != null ? (String(body.email).trim().toLowerCase() || null) : undefined;
        const phone = body.phone != null ? (normalizePhone(body.phone) || null) : undefined;
        if (email !== undefined) patch.email = email;
        if (phone !== undefined) patch.phone = phone;
        const dup = await identityInUse(email ?? null, phone ?? null, uid);
        if (dup) return json({ error: 'duplicate_identifier', field: dup }, 409);
        if (Object.keys(patch).length) {
          const { error } = await admin.from('user_roles').update(patch).eq('user_id', uid);
          if (error) return json({ error: 'update_failed', detail: error.message }, 400);
        }
        if (email !== undefined && email) {
          await admin.auth.admin.updateUserById(uid, { email, email_confirm: true });
        }
        await audit('user_updated', actor.label, uid, `Updated ${Object.keys(patch).join(', ') || 'identity'}`);
        return json({ ok: true });
      }

      case 'disable': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        await admin.from('user_roles').update({ is_disabled: true }).eq('user_id', uid);
        await admin.auth.admin.updateUserById(uid, { ban_duration: '876000h' });   // blocks login + refresh
        await audit('account_disabled', actor.label, uid, 'Account disabled (sessions revoked on next refresh; SPA guard terminates active tabs)');
        return json({ ok: true });
      }

      case 'enable': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        await admin.from('user_roles').update({ is_disabled: false }).eq('user_id', uid);
        await admin.auth.admin.updateUserById(uid, { ban_duration: 'none' });
        await audit('account_enabled', actor.label, uid, 'Account enabled');
        return json({ ok: true });
      }

      case 'unlock': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        const { data: r } = await admin.from('user_roles').select('email, phone').eq('user_id', uid).maybeSingle();
        const ident = canonicalEmail({ email: r?.email, phone: r?.phone });
        const reset = onAdminUnlock();
        await admin.from('login_attempts').update({ ...reset, updated_at: new Date().toISOString() })
          .or(`user_id.eq.${uid}${ident ? `,identifier.eq.${ident}` : ''}`);
        await audit('account_unlocked', actor.label, uid, 'Lockout cleared → initial state');
        return json({ ok: true });
      }

      case 'reset_password': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        const mode = body.mode === 'manual' ? 'manual' : 'auto';
        const password = mode === 'manual' ? String(body.password || '') : generatePassword(16);
        if (!validatePassword(password).valid) return json({ error: 'weak_password' }, 400);
        const { data: cur } = await admin.auth.admin.getUserById(uid);
        const meta = { ...(cur?.user?.user_metadata || {}), must_change_password: true };   // ALWAYS force change
        const { error } = await admin.auth.admin.updateUserById(uid, { password, user_metadata: meta });
        if (error) return json({ error: 'reset_failed', detail: error.message }, 400);
        await audit('password_reset', actor.label, uid, 'Admin reset password (force change enforced)');
        if (mode === 'auto') await audit('password_generated', actor.label, uid, 'Temporary password generated at reset');
        return json({ ok: true, password: mode === 'auto' ? password : undefined });
      }

      case 'force_change': {
        const uid = String(body.user_id || '');
        if (!uid) return json({ error: 'user_id_required' }, 400);
        const { data: cur } = await admin.auth.admin.getUserById(uid);
        const meta = { ...(cur?.user?.user_metadata || {}), must_change_password: true };
        const { error } = await admin.auth.admin.updateUserById(uid, { user_metadata: meta });
        if (error) return json({ error: 'force_change_failed', detail: error.message }, 400);
        await audit('force_password_change', actor.label, uid, 'Force password change on next login');
        return json({ ok: true });
      }

      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    return json({ error: 'unexpected', detail: String((e as Error)?.message || e) }, 500);
  }
});
