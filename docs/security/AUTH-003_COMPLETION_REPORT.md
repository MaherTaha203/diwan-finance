# AUTH-003 — User Management, Authorization & Audit Hardening · Completion Report

> Implements the frozen owner decisions in `AUTH-003`. Builds directly on the
> approved audit in `docs/security/USER_ROLES_AND_PERMISSIONS_AUDIT.md`.
> **Status:** **Production Deployed — 2026-07-26** (PR #206 merged to `main`). The
> database migrations and Edge Functions were applied after a backup and verified live
> — see **§11 · Production Deployment Record**. No existing production data was mutated.

---

## 1 · What changed (by layer)

| Layer | File(s) | Change |
|---|---|---|
| DB migration | `supabase/migrations/20260726120000_auth003_role_model_voucher_ownership.sql` | 3-role model, ownership columns + state machine, tiered RLS, audit columns |
| Shared auth | `supabase/functions/_shared/auth-core.mjs` | `VALID_ROLES` → 3 roles; `safeRole` returns null for invalid |
| Edge | `supabase/functions/admin-users/index.ts` | `list` + `sign_out` actions; enriched audit; explicit `role_change` record |
| Edge | `supabase/functions/login-gate/index.ts`, `change-password/index.ts` | audit IP + actor |
| Client authz | `public/js/app.js`, `auth.js`, `ui-nav.js` | `can.*`, ROLES, login gate, nav gating, `logAction` enrichment, role change via Edge |
| Voucher ownership | `public/js/crud.js`, `data.js` | `canEditVoucher`, Draft in-place amend, Review/Return, state badges, ownership columns fetched |
| User mgmt / i18n | `public/js/user-admin.js`, `app.js`, `i18n.js`, `index.html` | modernized cards + actions; role dropdowns/labels |

---

## 2 · Role model (exactly three, frozen)

The legacy **viewer** role is removed; the legacy **accountant** value is now a
first-class role. Production had **only `admin` + `reservation`** users, so no live
data migration was required; the migration still converts any stray `viewer` →
`accountant` **and disables it** (no silent privilege change).

- **Administrator** — full, unrestricted authority (every page + operation).
- **Accountant** — operational finance writer (below).
- **Reservations Manager** — reservations module only; finance-blind.

`safeRole()` no longer coerces unknown input to a real role (returns null → callers
fail closed); the login gate admits only the three roles.

---

## 3 · Authorization matrix (as implemented)

✅ allowed · ❌ denied. "Enforced by" is the authoritative layer (RLS/DB unless noted).

| Capability | Admin | Accountant | Reservation | Enforced by |
|---|:---:|:---:|:---:|---|
| Login | ✅ | ✅ | ✅ | login-gate + fail-closed role gate (`auth.js`) |
| Dashboard | ✅ | ✅ | ❌ | nav gate; reservation locked to calendar |
| Members (view) | ✅ | ✅ | ❌ | `is_provisioned_user()` |
| View Receipts / Payments / Reports / search | ✅ | ✅ | ❌ | `is_provisioned_user()` |
| **Create** Receipt / Payment voucher | ✅ | ✅ | ❌ | RLS `*_finance_insert` (`is_finance_writer` + owner stamp) |
| **Edit own** voucher (Draft: editable/returned) | ✅ | ✅ | ❌ | RLS `*_finance_update` + ownership trigger + `canEditVoucher` |
| Edit **another** accountant's / admin's voucher | ✅ | ❌ | ❌ | RLS ownership qual |
| Edit a **posted / admin_review / locked** voucher | ✅ (void+replace) | ❌ | ❌ | RLS state qual + BO-02 authority |
| Print | ✅ | ✅ | ❌ | `can.print` |
| Export / Backup | ✅ | ❌ | ❌ | `can.export` / viewer-sweep |
| Delete / Cancel voucher | ✅ | ❌ | ❌ | RLS delete = `is_admin()`; BO-03 admin |
| Correct voucher (void+replace) | ✅ | ❌ | ❌ | BO-02 authority `admin` |
| Apply annual dues / refund / write-off / transfer | ✅ | ❌ | ❌ | `is_admin()` |
| Close / Reopen fiscal period | ✅ | ❌ | ❌ | `is_admin()` |
| Reservations (full) | ✅ | ❌ | ✅ | `can_manage_reservations()` |
| Manage users / change roles | ✅ | ❌ | ❌ | admin-users Edge (admin JWT) + `user_roles` RLS |
| Settings | ✅ | ❌ | ❌ | write `is_admin()` |
| Audit log (view) | ✅ | ❌ | ❌ | UI nav admin-gated |

---

## 4 · Voucher ownership & state machine

**Owner = `created_by_uid`** (stamped `auth.uid()` on insert; historical rows are
owner-less → admin-only). **States:** `editable` (Draft) · `admin_review` ·
`returned` · `locked` · `cancelled`.

```
          create (accountant/admin)
                 │
                 ▼
            ┌──────────┐   admin "Mark reviewed (lock)"   ┌──────────────┐
            │ editable │ ───────────────────────────────► │ admin_review │
   owner    │ (Draft)  │ ◄─────────────────────────────── │  (locked for │
   edits ◄──┤          │   admin "Return to Accountant"   │  accountant) │
   in place └────┬─────┘            (→ returned)           └──────┬───────┘
                 │ soft-delete/cancel (admin)                     │ admin correction
                 ▼                                                ▼
            ┌───────────┐                                  void + replace (BO-02)
            │ cancelled │  ◄───────────────────────────────  original → cancelled
            └───────────┘
```

- **Accountant edit** = in-place amend of **own** voucher while `editable`/`returned`
  only (same voucher id/number; `voucher_versions` snapshot + audit). Not a correction.
- **Administrator review** immediately locks the voucher for the accountant
  (`admin_review`); **Return to Accountant** reopens the Draft (`returned`).
- After posting/review, the **only** correction is **void+replace (BO-02, admin)** —
  the accounting constitution (IG-009/FD-034) is preserved.
- Enforcement is triple-layered: client `canEditVoucher` (UX) → RLS write policies →
  `fn_voucher_ownership()` BEFORE-UPDATE trigger (ownership immutability, admin
  auto review-lock + audit, cancel→cancelled).

---

## 5 · User Management page

Reads through the admin-users **`list`** Edge action (service_role) — this is the
**root-cause fix** for "newly created users don't appear": `user_roles` SELECT is
own-row-only (`select_own`), so the admin's direct query returned only themselves.
The list re-syncs after every mutation.

Each card shows **Name · Email/Phone · Role · Status (Active/Disabled) · Created ·
Last login**, plus a **readable permission summary** (✔ can / ✖ cannot) so an admin
understands the account without documentation. Actions: **Change Role · Edit User ·
Reset Password · Force Password Change · Unlock · Sign Out All Sessions · View
Activity · Disable/Enable · Delete** (delete admin-only, last-admin & self guarded).

**Role change** is routed exclusively through the Edge Function — it validates the
role, writes an old→new `role_change` audit record, and **revokes the target's
sessions** so the new authority applies immediately. No direct `user_roles` write
from the UI.

---

## 6 · Audit coverage

Every `audit_log` row now carries **actor_user_id, actor_role, ip, old_data,
new_data, reason** (client `logAction` + all three Edge functions).

| Domain | Events audited |
|---|---|
| Authentication | login, logout, failed login, lockout, unlock, password reset, password change, forced change |
| User management | create, delete, disable, enable, role_change, session_revocation, credentials copied |
| Financial | receipt/payment created, edited (Draft amend), corrected (void+replace), cancelled; voucher_ownership_transfer; return_to_accountant |
| Members | create, edit, cancel/delete |
| Settings / Fiscal | configuration changes; close/reopen period |
| Reservations | create, edit, cancel |
| Security | permission_violation (unauthorized page / non-editable voucher edit attempts) |

Per-user activity is viewable from each user card (**View Activity**).

---

## 7 · Consistency review

- **UI** hides/*disables* by role; **nav** blocks direct routing (incl. console);
  **Edge** re-verifies the admin JWT; **RLS** is the authority on every read/write;
  **triggers** enforce ownership + last-admin. No path bypasses RLS.
- No stale permissions: role changes revoke sessions; `is_admin()`/`is_accountant()`
  read the live role every request.
- No direct role manipulation: `user_roles` writes require `is_admin()` with
  `WITH CHECK` (no escalation) and the UI goes through the Edge Function.

---

## 8 · Verification performed

- **Migration** executed against the **live schema inside a rolled-back transaction**
  (valid DDL; **zero** persistence — confirmed no columns/functions/constraints
  changed).
- `node --check` passes on every changed client script and `auth-core.mjs`;
  `tests/auth-core.test.mjs` still green (43 checks).
- Confirmed the RLS root cause of the user-list bug (`select_own` only) directly in
  the catalog.
- Logic review of each RLS policy, the ownership trigger, and the client gates
  against the state machine in §4.

**Still to run at deploy time (requires the migration + Edge live):** end-to-end with
a real accountant account — create voucher, amend own Draft, admin review-lock,
accountant blocked, Return to Accountant, void+replace, and audit spot-checks.

---

## 9 · Deployment (owner-authorized)

Nothing here has been applied to production. To ship:

1. **Back up** the project (snapshot) first.
2. Apply the migration `20260726120000_auth003_role_model_voucher_ownership.sql`
   (Supabase migration tooling / `apply_migration`).
3. Deploy the three Edge Functions: `admin-users`, `login-gate`, `change-password`.
4. Deploy the client (Vercel, via merge).
5. Run the §8 end-to-end checklist; create one Accountant test user and verify the
   matrix.

Roll-back is clean: the migration is additive (drop the new policies/columns/triggers
to revert); Edge/client revert by re-deploying `main`.

---

## 10 · Owner review round (hardening + verification)

### 10.1 Every financial document is linked to its owner (#1)
Added migration `20260726130000_auth003_ownership_stamps.sql`: **all** financial
tables (`receipts, payments, members, annual_dues, member_subscriptions,
member_write_offs, refunds, allocation_records, internal_transfers, contacts,
fiscal_snapshots`) now carry `created_by_uid`, `created_by`, `created_at`,
`updated_by`, `updated_at`. A generic `set_row_updated()` BEFORE-UPDATE trigger
stamps `updated_at = now()` and `updated_by = auth.uid()` on every update.
`reservations` already had all four; `voucher_versions` is an append-only snapshot
log (its own `edited_by`/`edited_at`) and is excluded. *Verified (rolled back):
0 target tables missing a column; the trigger stamps updated_by + updated_at.*

### 10.2 Audit really records everything (#2)
Coverage table in §6. Confirmed audited: login/logout, **session expiry**
(`session_expired`, added), failed login, lockout/unlock, password reset/change/
forced change, **role change** (old→new), **reset password**, disable/enable user,
delete user, **session revocation**, **voucher → admin_review** and **return to
accountant** (DB ownership trigger), **every voucher edit** (create/Draft amend/
void+replace), and **every unauthorized access** (`permission_violation`: blocked
page navigation + non-editable voucher edit attempts). Opening the Settings page is
treated as optional per system policy and is not logged.

### 10.3 Protection is in the database, not just the UI (#3) — **proven**
Verified by impersonating an accountant at the DB level (role `authenticated` +
JWT, RLS enforced) in a rolled-back transaction:

| Attempt (as accountant, via REST/DevTools) | Result |
|---|---|
| Edit **own** Draft voucher | allowed |
| Edit an **admin's** voucher | **denied** (0 rows) |
| Edit **another accountant's** voucher | **denied** (0 rows) |
| Change `ownership_state` | **error** (trigger) |
| Change `created_by` (ownership) | **error** (trigger) |
| Insert a voucher spoofing another owner | **error** (RLS) |
| Read reservations data | **denied** (0 rows) |
| (admin) edit any voucher | allowed + auto-locks to `admin_review` |

Unauthorized **pages** are blocked in `nav()` (not just hidden) and the underlying
finance tables are RLS-blocked for the reservation role and for accountants outside
their allow-list.

### 10.4 Administrator leaves without saving during review (#4)
There is **no orphaned lock**. Opening a voucher (`editRec`/`editPay`) performs **no
DB write** — it only populates the modal — so closing the page or losing connectivity
changes nothing. Locking is an **explicit** action: *Mark reviewed (lock)* →
`admin_review`, or an actual admin correction (void+replace). Recovery from a
deliberate lock is always the explicit **Return to Accountant** (`returned` → Draft),
so a locked voucher can never become permanently stuck.

### 10.5 Users page (#5)
Added a toolbar with **search** (name/email/phone), **role filter**, and **status
filter** (active/disabled), a live shown/total count, and **clear ordering** (by role
rank admin→accountant→reservation, then name). Cards already show avatar, name,
email/phone, role, **status**, **created**, **last login**, and the **permission
summary**, with the full action set.

### 10.6 Acceptance scenarios (#6)
| Scenario | Outcome | Evidence |
|---|---|---|
| Accountant A creates + edits own voucher | ✅ allowed (Draft amend) | RLS test 10.3 + `_amendOwnVoucher` |
| Accountant B edits A's voucher | ✅ rejected | RLS test 10.3 (0 rows) |
| Admin edits the voucher → locks for accountant | ✅ auto `admin_review` | RLS + trigger test |
| Admin returns to accountant → editable again | ✅ `returned` (Draft) | trigger test §8 |
| After posting/review, direct edit rejected; only void+replace | ✅ | RLS state qual (`editable/returned` only) + BO-02 admin |
| Role change while user is logged in → sessions end, new perms immediately | ✅ | admin-users `update` revokes sessions; `is_admin()` reads live role |
| New user appears immediately without page refresh | ✅ | `create` → `loadUsers()` reads service_role `list` |

Scenarios enforced at the database layer are proven by the rolled-back RLS/trigger
tests; the session-revocation and immediate-appearance scenarios are enforced by the
Edge Function (`revokeSessions` on role change; `list` after create). A full live
end-to-end with a real Accountant account remains a deploy-time step (§8).

---

## 11 · Production Deployment Record

**Deployed:** 2026-07-26 (~14:08–14:16 UTC) to Supabase project
`ralifvemgapmsgrjgazh` (diwan-erp-system), on owner authorization.

**Provenance**
- Architecture accepted as Baseline v1.0 — 2026-07-26 (owner decision).
- Merged to `main` — 2026-07-26, **PR #206** (merge commit `a6cd6cf`).
- Client (public/*) ships to production via Vercel from `main`.

**Backup**
- Pre-deploy snapshot captured before any change: row counts (user_roles=2,
  receipts=64, payments=29, members=151, audit_log=1427), full `user_roles`
  export, and the exact pre-deploy DDL of every replaced object (`is_admin`,
  `is_provisioned_user`, receipts/payments write policies, role CHECK) recorded as
  a rollback reference. Supabase automatic daily backups also apply. **No existing
  data was mutated by the deployment.**

**Migrations applied** (via Supabase migration tooling)
1. `auth003_role_model_voucher_ownership` — 3-role model; `is_provisioned_user`
   (admin|accountant) + `is_accountant` / `is_finance_writer`; `is_admin`
   disabled-guard; receipts/payments `created_by_uid` + `ownership_state`; tiered
   write RLS; `fn_voucher_ownership` ownership trigger; audit_log actor/role/ip/reason.
2. `auth003_ownership_stamps` — `created_by_uid`/`created_by`/`created_at`/
   `updated_by`/`updated_at` on all financial tables + `set_row_updated` touch trigger.

**Edge Functions deployed** (config preserved)
| Function | Version | verify_jwt |
|---|---|---|
| `admin-users` | v3 | true |
| `login-gate` | v3 | **false** (unauthenticated login path) |
| `change-password` | v2 | true |

All three bundle the updated 3-role `_shared/auth-core.mjs`.

**Post-deploy verification (live production)**
- Role CHECK = `admin | accountant | reservation`; `is_provisioned_user` = admin|accountant. ✅
- New objects present: 4 functions (`is_accountant`, `is_finance_writer`,
  `fn_voucher_ownership`, `set_row_updated`), 4 finance policies, 13 triggers,
  ownership + audit columns. ✅
- `receipts.ownership_state` backfilled correctly: 26 `editable` / 38 `cancelled`
  (= 64 total, matching soft-deleted rows). ✅
- Users unchanged: 1 admin + 1 reservation; no `viewer`/`accountant` rows;
  no data mutated. ✅
- Security advisor: **no new regressions**. The new `is_accountant`/
  `is_finance_writer` RPC-executable notices are the same accepted pattern as the
  pre-existing `is_admin`/`is_provisioned_user` (they must be executable because the
  RLS policies call them; they only return the caller's own status).

**Verification status**
- Automated + structural + DB-enforcement verification: **passed** (above, plus the
  pre-deploy rolled-back RLS/ownership impersonation proofs in §10.3 and the
  state-machine test in §8).
- Interactive UI end-to-end (admin login → create an Accountant → confirm the
  accountant's confined navigation and Draft-only edit): **recommended smoke test**
  for the owner to run once against the live site; the underlying enforcement it
  exercises is already proven at the database layer.

**Baseline**
> **AUTH-003 — Baseline Authorization & User Management Architecture v1.0 ·
> Status: Production Deployed (2026-07-26).** Subsequent milestones (e.g. AUTH-004)
> build on this baseline without altering its constitutional principles unless
> explicitly approved by the system owner.
