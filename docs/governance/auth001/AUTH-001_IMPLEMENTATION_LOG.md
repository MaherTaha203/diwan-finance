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
| PR‑3 | `login-gate` Edge Function + progressive lockout + audit (flagged) | ⏳ |
| PR‑4 | Password policy + minimal password UI | 🚧 code complete · in PR |
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

## PR‑4 — Password policy + minimal password UI (client‑only; deploy‑independent)
Aligns the **client** password experience with the owner‑ratified final policy and the
`auth-core.mjs` server rule — **≥10 chars AND ≥2 of** {upper, lower, number, symbol}. No Edge
Function or DB change, so it lands independently of the pending function deploys.
- **`public/js/auth-password.js`** — `checkPassword` rewritten to the frozen rule (new `classCount`
  helper mirroring `auth-core.passwordClasses`). Returns `{valid, level(0/1/2), levelLabel, message}`
  with **one actionable hint at a time** (length → second‑class → accepted). The old 12‑char /
  8‑item checklist (incl. the similarity + common‑password gates the owner dropped) and its now‑dead
  `FORBIDDEN`/`COMMON`/`tokensOf` data were removed. `attachPolicyUI` paints a single `.pw-note` line
  + a **3‑tier meter** (red = below policy · amber = meets · green = strong) instead of the grid
  checklist; `checksEl` kept as a back‑compat alias for `noteEl`.
- **`public/css/app.css`** — meter collapsed from 5 colour levels to 3 (l0 red / l1 amber / l2 green);
  `.pw-checks` grid replaced by a `.pw-note` single‑line style; mobile + invite‑modal rules updated.
- **`public/index.html`** — change‑password overlay + invite modal markup switched `pw-checks`/
  `inv-checks` → `pw-note`/`inv-note`; invite placeholder retext to «10+ أحرف · نوعان على الأقل»;
  `auth-password.js` bumped `?v=1.0 → 1.1`.
- **`public/reset-password.html`** — same policy note + 3‑tier meter (standalone recovery screen).
**Local verification:** `node --check` clean (auth-password/app/auth); `auth-core` 39/39;
Constitutional Laboratory **90/90** (23/23 certified) — app boots with the new policy UI, no
financial regression.
