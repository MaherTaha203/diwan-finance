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
| PR‑2 | `admin-users` Edge Function + User Management UI | ✅ merged (#168) · function deploy owner‑run |
| PR‑3 | `login-gate` Edge Function + progressive lockout + audit | 🚧 code complete (#169) · awaiting `login-gate` deploy + live‑verify |
| PR‑4 | Password policy + minimal password UI | ✅ merged (#170) |
| PR‑5 | Create‑User workflow + one‑time credentials dialog | ✅ merged (#171) |
| PR‑6 | Audit completion + documentation + final verification | 🚧 code complete · in PR |

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

## PR‑5 — Create‑User workflow + one‑time credentials dialog (routes through admin-users)
Replaces the legacy client‑side `signUp` create path with the owner‑approved Create‑User screen,
performed by the **`admin-users`** Edge Function (service_role) so identity, audit and the one‑time
password are all server‑authoritative.
- **`public/index.html`** — the User‑Management modal (`#m-invite`) rebuilt to the approved screen:
  **Full Name · Role · Phone · Email**, a password‑mode radio (**auto** default / **manual**), a
  manual‑password block (reuses `.pw-note` + 3‑tier meter), and **“force password change on first
  login”** (default **on**). At least one of phone/email is required. Header button → «إنشاء مستخدم»
  / `openCreateUser()`. `user-admin.js` bumped `?v=1.0 → 1.1`; `auth-password.js` `1.1 → 1.2`.
- **`public/js/user-admin.js`** — `openCreateUser` (fresh reset + mode toggle + lazy policy wiring),
  `createUser` (client pre‑checks → `admin-users` `create` → maps every server error code to a
  specific bilingual message → **one‑time `showCredentials`** with identifier + temp password →
  `loadUsers`), and `genCreatePass` (via `AuthDS.genPassword`).
- **`public/js/app.js`** — legacy `inviteUser` (isolated `signUp` + role upsert) retired; kept as a
  thin alias to `createUser` so older callers and the security seal still resolve.
- **`public/js/auth-password.js`** — removed the now‑dead `genInvitePass` + `wireInvite` (their
  `inv-*` markup is gone); `AuthDS` (checkPassword/attachPolicyUI/genPassword) now reused by the
  Create‑User manual‑password block.
- **`public/js/i18n.js`** — modal localization retargeted to the `cu-*` ids; `users.invite` →
  «إنشاء مستخدم» / “Create User”.
**Deploy dependency:** live creation requires `admin-users` deployed (`supabase functions deploy
admin-users --project-ref ralifvemgapmsgrjgazh`, Verify JWT ON). If the function is unreachable the
flow surfaces a clear error rather than silently failing.
**Local verification:** `node --check` clean (user-admin/app/auth-password/i18n); `auth-core` 39/39;
Constitutional Laboratory **90/90** (23/23 certified) — app boots with the rebuilt modal, no
financial regression.

## PR‑6 — Audit vocabulary completion + documentation + final verification
Closes the audit surface and finalises the roadmap. Client‑only (deploy‑independent).
- **`public/js/app.js`** — added `AUTH_AUDIT`, a single bilingual map (label + badge colour)
  for every AUTH‑001 action code written by the Edge Functions and client auth flows:
  `user_created · user_updated · account_enabled · account_disabled · account_unlocked ·
  account_locked · password_reset · password_generated · password_change ·
  force_password_change · credentials_copied · login_success · login_failed`. `auditActionLabel`
  and the new `auditActionColor` read from it (green = grant/benign, red = block/deny, blue =
  neutral); the audit grid badge now colours security events correctly. Added a «الأمان والحسابات»
  optgroup to the audit filter so these events are filterable.
- Coverage confirmed by enumerating every `audit('…')` (Edge) and `logAction('…')` (client) code —
  all map entries present, none missing.
**Local verification:** `node --check` clean; `auth-core` 39/39; Constitutional Laboratory
**90/90** (23/23 certified).

## Final status
Authentication redesign is **code‑complete end‑to‑end**. Merged to `main`: PR‑1, PR‑2, PR‑4, PR‑5,
PR‑6. **Remaining to reach fully‑live:**
1. **`login-gate` deploy** (`supabase functions deploy login-gate --project-ref
   ralifvemgapmsgrjgazh`, **Verify JWT OFF**) → then live‑verify the progressive‑lockout ladder
   (15 → 5m → 15m → 1h → admin) + audit rows, and **merge PR‑3 (#169)**. Until then the client
   falls back to direct sign‑in, so **login works with no lockout and no regression**.
2. **`admin-users`** must be live for User Management + Create‑User (owner‑run). The client shows a
   clear error if it is ever unreachable.

No financial / MODEL2 / business‑logic surface was touched at any point; the Constitutional
Laboratory held **90/90** on every PR.
