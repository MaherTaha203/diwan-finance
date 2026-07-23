# AUTH‑001 — Implementation Log (living document)

Authentication & User Management redesign. Executed autonomously per the owner‑approved
design (Rev. 3) and the AUTH‑001 Autonomous Engineering Execution authorization. Kept in
sync with the code as each PR lands. Scope is authentication only — **no** financial /
MODEL2 / business‑logic changes.

## Architecture (as built)
- Client SPA + **two Supabase Edge Functions** (`login-gate`, `admin-users`) holding the only
  `service_role`. Self‑service change‑password / forgot stay on GoTrue directly.
- Progressive lockout is **server‑authoritative** in `login_attempts` (non‑cumulative: fresh
  15 attempts per stage → 5m → 15m → 1h → administrative lock).
- Phone auth keeps the existing **synthetic‑email** scheme (`‹digits›@diwan-fainance.com`) —
  domain unchanged, existing users not migrated. `login-gate` resolves phone/email → canonical
  GoTrue email via `user_roles`.
- Roles unchanged (admin / viewer / reservation; `accountant` untouched — other track).
- Password policy (final): **≥10 chars and ≥2 of** {upper, lower, number, symbol}.

## Roadmap status
| PR | Scope | State |
|---|---|---|
| PR‑1 | Database migration (`login_attempts`, `user_roles` identity/status, backfill) | ✅ merged |
| PR‑2 | `admin-users` Edge Function + User Management UI | 🚧 code complete · awaiting deploy |
| PR‑3 | `login-gate` Edge Function + progressive lockout + audit | 🚧 code complete · awaiting deploy |
| PR‑4 | Password policy + minimal password UI | ⏳ |
| PR‑5 | Create‑User workflow + one‑time credentials dialog | ⏳ |
| PR‑6 | Audit completion + documentation + final verification | ⏳ |

## PR‑1 — Database migration (merged)
**Migration:** `supabase/migrations/20260723140000_auth001_login_attempts_and_user_identity.sql`
(applied to `ralifvemgapmsgrjgazh` as `auth001_login_attempts_and_user_identity`).
- **`public.login_attempts`** — `identifier` (unique canonical email), `user_id`,
  `attempts_in_stage`, `escalation_level`, `locked_until`, `admin_locked`, `last_attempt_at`,
  `updated_at`. RLS **enabled with no policies** → `service_role`‑only (Edge Functions).
- **`public.user_roles`** — added `email`, `phone`, `is_disabled`; unique partial indexes on
  `lower(email)` and `phone` (where not null).
- **Backfill** — existing users' `email` derived from `auth.users`; legacy synthetic‑phone
  accounts would derive `phone` from the local‑part (both current users are real‑email admins,
  so `email` set for 2/2, `phone` 0).
- **Verification:** schema + RLS + backfill confirmed on the live schema; fast Node regression
  (`constitutional-verification` 12/12, `fin2`, refund/writeoff/allocation) all pass. No app JS
  changed, so the Constitutional Laboratory (mock DB) is unaffected.

**Backward compatibility:** additive only; no existing column altered; no login behaviour
changed (this PR ships schema only, read by later Edge Functions). Rollback: the table/columns
are inert and empty — safe to leave; drop only if explicitly desired.

## PR‑2 — admin-users Edge Function + User Management (code complete; deploy pending)
**Edge Function** `supabase/functions/admin-users/index.ts` (+ `_shared/auth-core.mjs`):
admin‑JWT‑gated, `service_role`. Actions `create · update · disable · enable · unlock ·
reset_password · force_change`; every action audited. `reset_password` **always** forces
`must_change_password=true`. `disable` sets `is_disabled` + GoTrue ban.
**Client** `public/js/user-admin.js` (+ `loadUsers` template update + `is_disabled` login/tab
guards in `auth.js`/`user-admin.js`): per‑row Reset / Force‑change / Unlock / Disable‑Enable,
and a **reusable one‑time credentials dialog** (`window.showCredentials`, emits
`credentials_copied`). Legacy `inviteUser`/`changeRole` left untouched (create UI redesign =
PR‑5), so PR‑2 is purely additive management — no create/login regression.
**Deploy command (fallback workflow):** `supabase functions deploy admin-users --project-ref ralifvemgapmsgrjgazh` (Verify JWT ON).
**Local verification:** `node --check` clean (user-admin/auth/app); `auth-core.test.mjs` 39/39;
`constitutional-verification` 12/12; `fin2` PASS; Constitutional Laboratory (regression) — see PR.
**Live verification (post‑deploy):** unauthenticated call → 401 `not_admin`; admin create/reset/
disable/enable/unlock/force round‑trip; audit rows written.

## PR‑3 — login-gate Edge Function + progressive lockout + audit (code complete; deploy pending)
**Edge Function** `supabase/functions/login-gate/index.ts` (`verify_jwt = false`): enforces the
**mandatory order** — normalize/resolve identifier → disabled → admin‑lock → timed‑lock →
validate credentials → (fail: `attempts++` / escalate / audit) | (success: reset / audit /
issue session). Non‑cumulative ladder (fresh 15 per stage → 5m → 15m → 1h → admin) via the
shared `onFailure`/`onSuccess`/`lockStatus`; success and admin‑unlock both reset to initial
state. Always 200 with a structured verdict; audits `login_success` / `login_failed` /
`account_locked`.
**Client** `public/js/auth.js`: `window.login` routes through `login-gate` (`window.USE_LOGIN_GATE
!== false`) and **falls back to the legacy direct sign‑in on a genuine infra error** (undeployed /
5xx / network) so login always works; a business verdict (disabled / locked / invalid) is honoured
and never falls back. Human‑readable lock message (owner decision 8), bilingual, with retry hint.
Legacy synthetic phone→email mapping preserved in the fallback (domain unchanged).
**Deploy command (fallback workflow):** `supabase functions deploy login-gate --project-ref ralifvemgapmsgrjgazh` (**Verify JWT OFF**).
**Local verification:** `node --check` clean; `auth-core` 39/39 (lockout ladder); Constitutional
Laboratory 90/90 (app boots with the rerouted login); `constitutional-verification` 12/12; `fin2` PASS.
**Live verification (post‑deploy):** correct password → session; wrong password increments; 15th →
5‑minute lock + message; unlock via admin‑users resets; audit rows for each. Before deploy, the
client fallback keeps login working (no lockout) — no login regression at any point.
