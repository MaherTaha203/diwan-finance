# User Roles & Permissions — Authorization Audit

> **Read-only audit. No code was changed and nothing was implemented.**
> Scope: the complete authorization model of Diwan Finance as it exists today —
> roles, capabilities, the permission matrix, user-management operations, and
> whether role changes are safe. Every claim below is traced to a file/line in
> the repository. Recommendations are listed last and are **not** implemented.

**Audited at:** commit on `main` (post nav-gap merge), 2026‑07‑26.
**Method:** static review of the client (`public/js/*`), the Edge Functions
(`supabase/functions/*`), and the SQL migrations (`supabase/migrations/*`).

---

## 0 · Executive summary

- The system has **three active roles** — `admin`, `viewer`, `reservation` —
  plus **one legacy/vestigial role** (`accountant`) that survives only in
  scattered constants and cannot be assigned through any UI.
- Authorization is **two-layered and server-authoritative**: the client hides
  affordances by role, but the **real** enforcement is Postgres **RLS** keyed on
  `is_admin()`, `is_provisioned_user()`, and `can_manage_reservations()`, plus an
  `auth_state_ok()` restrictive guard and a **last-admin** trigger.
- Effectively there is **one write tier** for all finance: **admin can do
  everything; viewer is read-only; reservation is finance-blind** and limited to
  the reservations calendar.
- Role change is **safe at the database layer** (RLS re-reads the live role on
  every request; a last-admin trigger blocks self-lockout). The one weakness is
  that the **UI role dropdown writes the role directly** and does **not** revoke
  the target's sessions, so the *client* keeps stale admin affordances until
  reload (the DB still refuses writes). See §5.

---

## 1 · Role inventory

| Role (internal id) | Display name (AR / EN) | Defined in | Used in (authority) | Status |
|---|---|---|---|---|
| `admin` | مدير / Admin | `VALID_ROLES` (`supabase/functions/_shared/auth-core.mjs:134`); `ROLES` map (`public/js/app.js:13`) | `is_admin()` gates **every** finance write + all user management; `can.*` in `public/js/app.js:157` | **Active** |
| `viewer` | عارض / Viewer | `VALID_ROLES` (`auth-core.mjs:134`); `ROLES` (`app.js:13`) | Read-only: `is_provisioned_user()` allows SELECT; no write; data-protection listeners (`app.js:2319`) | **Active** |
| `reservation` | مدير الحجوزات / Reservations Manager | `VALID_ROLES` (`auth-core.mjs:134`); `ROLES` (`app.js:13`) | `can_manage_reservations()` (`…create_reservations_module.sql:46`); UI lockdown `body.role-reservation` + `applyPerms` (`public/js/auth.js:186`) | **Active** |
| `accountant` | محاسب / Accountant | i18n only (`public/js/i18n.js:241,589`); DB role-domain CHECK array (`…create_reservations_module.sql:32`); `is_provisioned_user()` allow-list (`…:42`) | **Not** in `VALID_ROLES`, **not** in the `ROLES` display map, **not** offered by any create/change dropdown | **Legacy / unreachable** |

**Notes**
- `VALID_ROLES = ['admin','viewer','reservation']` and `safeRole()` coerce any
  unknown value to `viewer` (`auth-core.mjs:134-135`) — the authoritative
  allow-list for creation and updates.
- The login gate is **fail-closed**: `afterLogin()` signs the user out unless the
  role is exactly one of `admin | viewer | reservation` (`public/js/auth.js:84`).
  There is **no default-viewer fallback** for un-provisioned accounts.
- `accountant` is genuinely present but **dead**: it can read finance *if* such a
  row existed (it is in `is_provisioned_user()`), but no code path can create or
  assign it, and `ROLES['accountant']` is undefined so the UI would render a raw
  string. Treated as a cleanup item, not an active role (see §7 R2).

---

## 2 · Capability inventory (where each permission lives)

**Client-side gate — `public/js/app.js:157`:**
```
can.write  = role === 'admin'
can.admin  = role === 'admin'
can.print  = role === 'admin'
can.export = role === 'admin'
```
So on the client, **every** privileged affordance collapses to "is admin".
Viewer and reservation get none of `write/print/export/admin`.

**Server-side authority (the real enforcement) — RLS predicates:**

| Predicate | Definition | Grants |
|---|---|---|
| `is_admin()` | `EXISTS(user_roles where user_id=auth.uid() and role='admin')` — `STABLE SECURITY DEFINER` (`…audit_rls_perf_and_hardening.sql:8`) | All finance **writes**; `user_roles` writes; management |
| `is_provisioned_user()` | role ∈ (`admin`,`accountant`,`viewer`) (`…create_reservations_module.sql:35`) | Finance **reads** (SELECT). **Excludes `reservation`.** |
| `can_manage_reservations()` | role ∈ (`admin`,`reservation`) (`…:46`) | Reservations read + write |
| `auth_state_ok()` | `app_metadata.must_change_password` ≠ true (`…auth002_final_constitution.sql`) | RESTRICTIVE guard AND-ed into every finance write — blocks writes while a temp password is unresolved |
| `fn_last_admin_guard()` | trigger on `user_roles` (`…auth002_final_constitution.sql`) | Refuses any UPDATE/DELETE that would leave **zero** enabled admins — fires even for `service_role` |

**Write policies** on finance tables use `is_admin()` (e.g. `vouchers_admin_write`,
`refunds_admin_*`, `member_write_offs_admin_*`, `allocation_records_*`,
`internal_transfers` insert, `fiscal_snapshots` insert, `historical_subscription_truth`).
**Read policies** use `is_provisioned_user()`. `user_roles` writes are gated by
`is_admin()` with `WITH CHECK` (prevents privilege escalation) —
`…user_roles_admin_write_policies.sql`.

**Auth lifecycle capabilities:**
- **Login** — any provisioned, non-disabled, non-locked account, exclusively via
  the `login-gate` Edge Function (`auth.js:48`; no direct sign-in fallback).
- **Lockout** — 15 failed attempts → tiered lock 5m/15m/1h (`auth-core.mjs:80`);
  admins are exempt from permanent lock but still audited (`login-gate/index.ts`).
- **Forced password change** — authoritative in `app_metadata` (service-role only);
  UI opens a locked overlay **and** RLS refuses writes until cleared by the
  `change-password` function.

---

## 3 · Permission matrix

Legend: ✅ allowed · ❌ not allowed. "Enforced by" names the authoritative layer
(RLS unless noted); the client mirror is in addition to, not instead of, RLS.

| Permission | Admin | Viewer | Reservation | Enforced by |
|---|:---:|:---:|:---:|---|
| Can Login | ✅ | ✅ | ✅ | `login-gate`; fail-closed role check `auth.js:84` |
| Can View Dashboard | ✅ | ✅ | ❌ | UI `applyPerms`; reservation locked to calendar (`auth.js:186`, CSS `body.role-reservation`) |
| Can View financial data (members, receipts, payments, reports) | ✅ | ✅ | ❌ | `is_provisioned_user()` (RLS SELECT) |
| Can Create Members | ✅ | ❌ | ❌ | `is_admin()` (members write) |
| Can Edit Members | ✅ | ❌ | ❌ | `is_admin()` |
| Can Cancel/Delete Members | ✅ | ❌ | ❌ | `is_admin()` |
| Can Create Receipts / Payments / Vouchers | ✅ | ❌ | ❌ | `*_admin_write` (`is_admin()`) |
| Can Edit / Correct Vouchers | ✅ | ❌ | ❌ | `is_admin()` |
| Can Delete / Cancel Vouchers | ✅ | ❌ | ❌ | `is_admin()` |
| Can Apply Annual Dues | ✅ | ❌ | ❌ | `is_admin()` |
| Can Refund / Write-off | ✅ | ❌ | ❌ | `refunds_admin_*`, `member_write_offs_admin_*` |
| Can Internal Fund Transfer | ✅ | ❌ | ❌ | `internal_transfers` insert `is_admin()` |
| Can Close / Reopen Fiscal Period | ✅ | ❌ | ❌ | `is_admin()` + snapshot/guard migrations |
| Can View Reports | ✅ | ✅ | ❌ | `is_provisioned_user()` |
| Can Export / Print | ✅ | ❌ | ❌ | `can.export/print` (`app.js:157`); viewer print/export elements swept + copy/context blocked (`auth.js`, `app.js:2319`) |
| Can Manage Reservations | ✅ | ❌ | ✅ | `can_manage_reservations()` |
| Can Manage Users (create/disable/reset…) | ✅ | ❌ | ❌ | `admin-users` re-verifies admin JWT (`admin-users/index.ts:52`) |
| Can Change Roles | ✅ | ❌ | ❌ | `user_roles` update `is_admin()` + last-admin trigger |
| Can Manage Settings | ✅ | ❌ | ❌ | write `is_admin()`; read `is_provisioned_user()` |
| Can View Audit Log | ✅ | ❌ | ❌ | UI nav admin-gated (`applyPerms` hides `audit`/`bk`) |
| Subject to forced password change | ✅ | ✅ | ✅ | `auth_state_ok()` restrictive guard (writes) |

> Reservation is intentionally **finance-blind**: it is excluded from
> `is_provisioned_user()`, so even the finance **reads** are RLS-denied server-side,
> not merely hidden — confirmed at `…create_reservations_module.sql:42`.

---

## 4 · User-management operations

Backends: `supabase/functions/admin-users/index.ts` (service-role, re-verifies
admin JWT). UI: `public/js/user-admin.js` + the users list in `public/js/app.js`.

| Operation | Backend (edge) | UI exposed | State |
|---|---|---|---|
| Create User | `create` (`index.ts:88`) | `openCreateUser`/`createUser` (`user-admin.js:96,124`) | ✅ Exists |
| Edit User — role | `update` (`index.ts:126`) | role `<select>` → `changeRole` (`app.js:1524`) | ✅ Exists (see §5 caveat) |
| Edit User — name / email / phone | `update` supports it (`index.ts:130-135`) | **not surfaced** in the users list | ⚠️ Partial (backend only) |
| Delete User (hard) | `delete` (`index.ts:215`, self-delete blocked, last-admin guarded) | **no button** | ⚠️ Partial (backend only, "reserved") |
| Disable User | `disable` (`index.ts:154`, bans in GoTrue + revokes sessions) | `adminUserDisable` (`user-admin.js:29`) | ✅ Exists |
| Enable User | `enable` (`index.ts:169`) | `adminUserDisable(...,false)` | ✅ Exists |
| Reset Password (temp, one-time) | `reset_password` (`index.ts:190`, forces change + revokes sessions) | `adminUserReset` (`user-admin.js:56`) | ✅ Exists |
| Force Password Change | `force_change` (`index.ts:206`) | `adminUserForce` (`user-admin.js:48`) | ✅ Exists |
| Unlock Account (clear lockout) | `unlock` (`index.ts:178`) | `adminUserUnlock` (`user-admin.js:40`) | ✅ Exists |
| Transfer / promote admin (succession) | `transfer_admin` (`index.ts:233`) | **not surfaced** | ⚠️ Partial (backend only) |
| Terminate Sessions (manual) | `revoke_user_sessions()` exists (`auth002_final_constitution.sql`) | only **automatic** (on disable/role-change/reset) | ⚠️ Partial (no explicit control) |
| View per-user Activity | — | global audit log only; no per-user filter | ❌ Missing |

Safety features already present: last enabled admin cannot be disabled/demoted/
deleted (edge check **and** DB trigger); disable bans in GoTrue and revokes
sessions immediately; a self-disabled active tab self-terminates on focus
(`user-admin.js:207`); temp passwords are shown once and only hashed at rest.

---

## 5 · Role-change analysis

**Does the architecture already support changing a user's role safely? — Largely yes, with one UI gap.**

What is already safe:
- **Valid-role enforcement** everywhere: `safeRole()` + `VALID_ROLES` in the edge
  `update` (`index.ts:131`) and coercion in the client `changeRole`
  (`app.js:1524`); RLS `WITH CHECK (is_admin())` blocks a non-admin from writing
  any `user_roles` row (no self-escalation).
- **Immediate DB effect**: `is_admin()` / `is_provisioned_user()` read the *live*
  `user_roles` row on every request, so a demotion removes write/read authority
  at the database **immediately**, regardless of the old JWT.
- **Last-admin protection**: `fn_last_admin_guard()` refuses a demote/disable/
  delete that would zero out admins — fires even for `service_role`.
- **Session revocation on the edge path**: `admin-users` `update` calls
  `revoke_user_sessions(uid)` after a role change (`index.ts:149`) so the new
  authority is enforced across devices at once.

The gap:
- The **UI role dropdown** (`window.changeRole`, `app.js:1524`) performs a
  **direct** `SB.from('user_roles').update({role})` — it does **not** go through
  the `admin-users` edge `update`, so it **does not revoke sessions**. Result: a
  demoted admin's **client** keeps its cached `CUR.role='admin'` (stale
  affordances) until they reload or their token refreshes. The **database still
  refuses** their writes (RLS re-reads the live role), so this is a *client
  display / UX-consistency* gap, not a data-integrity hole. Audit is still
  written via `logAction`.

What is missing for a *fully* clean role change from the UI: routing the dropdown
through the edge `update` action (which already revokes sessions) instead of the
direct table write.

---

## 6 · Missing capabilities

1. **UI Edit-User (identity)** — name/email/phone editing exists in the edge
   `update` but is not surfaced in the users list. (Role, disable/enable, reset,
   force-change, unlock are surfaced.)
2. **UI role change does not revoke sessions** — see §5 (edge path does; the
   dropdown path does not).
3. **No per-user activity view** — there is a global audit log but no
   "view this user's activity" filter.
4. **No explicit "terminate sessions" control** — `revoke_user_sessions()` exists
   and is used automatically, but an admin cannot force-logout a user on demand.
5. **Delete-user and transfer-admin are backend-only** — implemented in the edge
   function but not exposed in the UI (may be intentional).
6. **No mid-tier write role** — despite i18n strings for "Accountant — add
   vouchers", there is no role that can create vouchers **without** also having
   full user/settings/period-close authority. Finance write = admin, all or
   nothing.
7. **Legacy `accountant`** — present in i18n, the DB role-domain CHECK, and the
   `is_provisioned_user()` allow-list, but unassignable and undisplayable; latent
   inconsistency.
8. **`is_provisioned_user()` does not check `is_disabled`** — mitigated in
   practice because disabled accounts are GoTrue-banned and cannot obtain a
   session, but it is not defense-in-depth at the predicate level.

---

## 7 · Risks

| # | Risk | Severity | Notes |
|---|---|---|---|
| R1 | UI role dropdown skips session revocation → demoted user keeps stale **client** admin UI until reload | **Low–Med** | DB authority is immediate via live `is_admin()`; impact is UX/perception, not write access |
| R2 | Legacy `accountant` lingers in DB role-domain + `is_provisioned_user()` allow-list | **Low** | If a row were ever set to `accountant` directly in SQL, it could **read** finance and render a broken role label; cannot happen via the app |
| R3 | Single write tier = broad admin authority; no maker-checker / dual control on high-impact ops (period close, write-off, transfer) | **Info / by design** | Last-admin guard prevents lockout; but a single compromised admin has total control |
| R4 | No admin visibility into per-user activity or active sessions, and no manual force-logout | **Low** | Reduces incident response options |
| R5 | `is_provisioned_user()` omits `is_disabled` | **Low** | Compensated by GoTrue ban + login-gate; not layered at the predicate |

No **critical** authorization holes were found: writes are RLS-gated to `is_admin()`,
reads to provisioned users, reservations are correctly isolated, privilege
escalation via `user_roles` is blocked by `WITH CHECK`, and self-lockout is
prevented by the last-admin trigger.

---

## 8 · Recommendations (minimum viable — NOT implemented)

Ordered by value/effort. **No code was written for any of these.**

1. **Route UI role changes through the edge `update`** (already exists and revokes
   sessions) instead of the direct `SB.from('user_roles').update()` in
   `changeRole`. Closes R1 with a one-function swap; keeps audit + last-admin +
   session revocation consistent for every role change.
2. **Resolve the legacy `accountant`** — decide between:
   - **Remove** it from i18n, the `user_roles` role-domain CHECK, and the
     `is_provisioned_user()` allow-list (recommended if no mid-tier is wanted); or
   - **Formalize** it as a real write tier (see #3).
3. **If a mid-tier is desired** (e.g. "Accountant/Treasurer": create vouchers &
   members, but **not** manage users/settings or close periods): define it
   explicitly — its own `can.*` entries, a dedicated RLS write predicate
   (`is_finance_writer()`), and UI affordances — rather than reusing the vestigial
   name. This is the single biggest functional gap if the org wants data-entry
   staff who are not full admins.
4. **Surface Edit-User (name/identity)** in the users list (edge already supports
   `update`), and either expose **Delete** or document it as intentionally
   backend-only.
5. **Add per-user activity + an explicit "terminate sessions" admin action**
   (`revoke_user_sessions()` already exists) for incident response.
6. **Defense-in-depth:** add `and is_disabled = false` to `is_provisioned_user()`.

---

## 9 · Evidence index (primary sources)

- Roles / password / lockout constants: `supabase/functions/_shared/auth-core.mjs`
- Client role map + `can.*`: `public/js/app.js:13`, `public/js/app.js:157`
- Login + fail-closed role gate + viewer lockdown: `public/js/auth.js:48,84,181`
- User-management client: `public/js/user-admin.js`; role dropdown: `public/js/app.js:1524`
- Privileged operations (service-role, admin-JWT gated): `supabase/functions/admin-users/index.ts`
- Login gate + lockout: `supabase/functions/login-gate/index.ts`
- Password change (clears forced-change, revokes sessions): `supabase/functions/change-password/index.ts`
- `is_admin()`: `supabase/migrations/20260725210000_audit_rls_perf_and_hardening.sql:8`
- `is_provisioned_user()`, `can_manage_reservations()`, role-domain CHECK, reservations RLS: `supabase/migrations/20260713120000_create_reservations_module.sql`
- `user_roles` admin write policies (anti-escalation): `supabase/migrations/20260714120000_user_roles_admin_write_policies.sql`
- Identity columns + `is_disabled` + login_attempts: `supabase/migrations/20260723140000_auth001_login_attempts_and_user_identity.sql`
- `auth_state_ok()` write guard, last-admin trigger, `revoke_user_sessions()`: `supabase/migrations/20260725230000_auth002_final_constitution.sql`

*End of audit — report only. No implementation, no PR.*
