# SEC-2 — Production Security Remediation

## Status
COMPLETE ✅  Date: 2026-06-24

Security-only remediation of the Production Security Audit findings. No changes to
FIN.*, Item 9, Food Donation Allocation, A1/A2/A3, Annual Debt / Delinquency,
QR verification logic, printing, or accounting calculations.

---

## Findings resolved

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| C1 | CRITICAL | `members_backup_phase0_20260621` (149 PII) & `member_subscriptions_backup_phase0_20260621` (292) had RLS **disabled** + anon grants → world read/write | RLS enabled + client grants revoked → service_role only (retained for documented rollback) |
| C2 | CRITICAL | Fail-open auth: read policies `USING(true)` for any `authenticated` user; login defaulted unknown users to `viewer` | Reads now require `is_provisioned_user()`; login is fail-closed (no default viewer) |
| H1 | HIGH | `vouchers_write` policy `USING(true) WITH CHECK(true)` let any authenticated user write the voucher cache | Dropped permissive policy; `vouchers_admin_write` (admin-only) remains |
| H2 | HIGH | `audit_log.user_name` was client-supplied → actor identity forgeable | BEFORE INSERT trigger stamps actor from verified JWT for authenticated callers |
| M1 | MEDIUM | `is_admin()` (SECURITY DEFINER) callable by `anon` via RPC | EXECUTE revoked from anon/public; authenticated + service_role only |

---

## Database migrations (applied to project ralifvemgapmsgrjgazh)

1. `sec_phase2_lockdown_phase0_backups` — `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` on both phase-0 backup tables.
2. `sec_phase3_drop_permissive_vouchers_write` — `DROP POLICY vouchers_write ON public.vouchers`.
3. `sec_phase5_audit_log_actor_integrity` — `public.audit_log_stamp_actor()` BEFORE INSERT trigger; sets `user_name := auth.jwt()->>'email'` when `auth.uid() IS NOT NULL` (service_role path keeps server-supplied value).
4. `sec_phase4_fail_closed_provisioned_reads` — `public.is_provisioned_user()` (SECURITY DEFINER, `EXISTS user_roles WHERE user_id = auth.uid()`); all permissive authenticated SELECT policies converted to `USING (is_provisioned_user())`; `audit_log` INSERT check tightened to `is_provisioned_user()`.
5. `sec_phase6_revoke_is_admin_anon_exec` — `REVOKE EXECUTE ON is_admin() FROM public, anon`.
6. `sec_phase6_lock_trigger_fn_rpc` — `REVOKE EXECUTE ON audit_log_stamp_actor() FROM public, anon, authenticated` (trigger still fires under owner context).
7. `sec_phase7_remove_orphan_user_roles` — delete `user_roles` rows referencing non-existent auth users (removed 1 orphan `viewer`).

## Code change
- `public/js/app.js` `afterLogin()` — fail-closed: a user with no `admin`/`viewer` role row is signed out and denied (no default-viewer fallback). Only security change; no accounting/printing/QR logic touched.

---

## Verification (live, RLS simulated per role)

| Scenario | Result |
|----------|--------|
| Provisioned admin | reads members=149/receipts=47/payments=24/subs=298; `is_admin=true` |
| Unprovisioned authenticated | reads 0/0/0/0; `is_admin=false` |
| Provisioned viewer | reads 149; `is_admin=false` (cannot write) |
| anon → members/receipts/payments | 0 rows (anon_block) |
| anon → phase-0 backup table | `ERROR 42501 permission denied` |
| viewer → INSERT vouchers | `ERROR: violates row-level security policy` |
| admin → INSERT vouchers | allowed (rolled back) |
| audit spoof (`user_name='SPOOFED'`) | stored as JWT email, spoof discarded |
| QR token lookup (service_role) | S7yUHX5iFf9INvg6→REC-00031, fqfLNqMAlkfEoVO5→PAY-00001 |

Security advisors: **ERROR 2 → 0**, permissive-policy WARN **1 → 0**, anon SECURITY DEFINER WARN **1 → 0**.

## Residual (accepted / owner action)
- `is_admin()` / `is_provisioned_user()` are executable by `authenticated` (required for RLS policy evaluation; return only a boolean about the caller; anon revoked). Standard Supabase pattern. Optional future hardening: move to a non-exposed schema.
- Leaked-password protection: enable in Supabase Dashboard → Auth → Passwords (dashboard-only).
- Disable public self-registration: Supabase Dashboard → Auth → Providers → Email → "Allow new users to sign up" OFF. (Impact already neutralized: unprovisioned accounts have zero data access.)
- `super-function` edge function (FX rates, service_role-confined to `settings`, `verify_jwt=true`): low impact; CORS hardening deferred to avoid redeploy risk.
