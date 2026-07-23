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
| PR‑2 | `admin-users` Edge Function + User Management UI | ⏳ |
| PR‑3 | `login-gate` Edge Function + progressive lockout + audit (flagged) | ⏳ |
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
