# AUTH-002 v1.1 — Implementation & Deployment Log

**Date:** 2026-07-25 · **Project:** diwan-erp-system (`ralifvemgapmsgrjgazh`)
**Status:** `APPROVED` · `ARCHITECTURE FROZEN` · `IMPLEMENTATION AUTHORIZED`
**PR:** #198 (`claude/new-session-51j8hh-auth002`)

## Applied to production in this program
| Item | Detail |
|---|---|
| Migration `auth002_final_constitution` | `auth_state_ok()` + RESTRICTIVE write guards on 18 financial tables (D4) · `fn_last_admin_guard` trigger with EXECUTE revoked (D11/F-1) · `revoke_user_sessions()` service_role-only (D5). Verified present; F-1 proven firing (disable-last-admin rejected). |
| Clean environment (D10) | Verified backup → `backup_auth_20260725` (auth_users, auth_identities, user_roles, login_attempts; live counts matched). Reduced to **administrator only** (`maher.taha88@gmail.com`); 5 non-admin accounts removed; orphan lockout row cleared; operation audited. |
| Advisor fix | Revoked REST EXECUTE on `fn_last_admin_guard` (trigger fn; advisor 0028/0029). |

## Staged in PR #198 (owner-gated cutover)
- Client (`public/js/auth.js`, `auth-password.js`) and Edge Functions (`login-gate`, `admin-users`, new `change-password`, `_shared/auth-core.mjs`), plus the migration file and Constitution v1.1.
- The DB layer is backward-compatible with the currently-live code, so production is fully functional in the interim (the sole admin carries no forced-change flag → the new guards are dormant until new users exist).

## Remaining cutover steps (run in order)
1. **Deploy the Edge Functions** — `supabase functions deploy login-gate admin-users change-password`
   (ships exact reviewed bytes + bundles `_shared`). Do this **before** merging the client PR, because the new client calls `change-password`. Keep `login-gate` at `verify_jwt=false`; `admin-users` / `change-password` self-verify their JWT.
2. **Merge PR #198** — Vercel deploys the new client. Final architecture fully live.
3. **Recreate operational users** through `admin-users`; provision a **second administrator** (D14 two-admin minimum).
4. **Optional:** enable Supabase Auth leaked-password protection (HaveIBeenPwned).

## Verification
- `auth-core` 43 checks · 23 node suites · constitutional verifier 12/12 · client `node --check` clean.
- Security findings A-1/A-2/A-3 closed; F-1 demonstrated in production.
- No financial rule, engine, ledger, or FD-* behaviour touched.

## Rollback
- Migration is additive; `backup_auth_20260725` retains the pre-clean auth snapshot; client is a PR revert.
