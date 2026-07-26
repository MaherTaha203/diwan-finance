# AUTH-003 — Acceptance Certificate

> Final sign-off record for the AUTH-003 milestone (User Management, Authorization
> & Audit Hardening). Companion to `AUTH-003_COMPLETION_REPORT.md` and the approved
> `USER_ROLES_AND_PERMISSIONS_AUDIT.md`.
>
> **Branch:** `claude/new-session-51j8hh-auth003` · **PR:** #206 (merged)
> **Roles (frozen):** Administrator · Accountant · Reservations Manager
> **Status:** **Production Deployed — 2026-07-26** (after backup + verification).

### Milestone timeline

| Event | Date | Reference |
|---|---|---|
| Architecture accepted (Baseline v1.0) | 2026-07-26 | owner decision (§ Sign-off) |
| Merged to `main` | 2026-07-26 | PR **#206** |
| **Deployed to Production** | **2026-07-26** | migrations + Edge Functions (see Completion Report § Production Deployment Record) |

---

## 1 · Final Authorization Matrix

✅ allowed · ❌ denied. "Enforced by" names the **authoritative** layer (database
unless noted); UI/nav gating is defense-in-depth on top of it.

| Capability | Administrator | Accountant | Reservations Mgr | Enforced by |
|---|:---:|:---:|:---:|---|
| Log in | ✅ | ✅ | ✅ | `login-gate` + fail-closed role gate |
| See Dashboard | ✅ | ✅ | ❌ | nav gate (reservation → calendar only) |
| View members / receipts / payments / reports / search | ✅ | ✅ | ❌ | RLS `is_provisioned_user()` |
| **Create** receipt / payment voucher | ✅ | ✅ | ❌ | RLS `*_finance_insert` (owner-stamped) |
| **Edit own** voucher — Draft (editable/returned) | ✅ | ✅ | ❌ | RLS `*_finance_update` + ownership trigger |
| Edit **another user's** voucher | ✅ | ❌ | ❌ | RLS ownership qual |
| Edit a **reviewed / posted / locked** voucher | ✅ (via void+replace) | ❌ | ❌ | RLS state qual + BO-02 authority |
| Print | ✅ | ✅ | ❌ | `can.print` |
| Export / Backup | ✅ | ❌ | ❌ | `can.export` |
| Delete / Cancel voucher | ✅ | ❌ | ❌ | RLS delete = admin; BO-03 admin |
| Correct voucher (Void & Replace) | ✅ | ❌ | ❌ | BO-02 authority = admin |
| Apply annual dues / refund / write-off / internal transfer | ✅ | ❌ | ❌ | RLS `is_admin()` |
| Close / Reopen fiscal period | ✅ | ❌ | ❌ | RLS `is_admin()` |
| Reservations (full) | ✅ | ❌ | ✅ | RLS `can_manage_reservations()` |
| Manage users (create/disable/reset/sign-out/delete) | ✅ | ❌ | ❌ | `admin-users` Edge (admin JWT) |
| Change roles | ✅ | ❌ | ❌ | Edge `update` (+ `user_roles` RLS + last-admin trigger) |
| Settings | ✅ | ❌ | ❌ | RLS write = admin |
| View audit log | ✅ | ❌ | ❌ | UI nav (admin only) |

---

## 2 · Voucher Lifecycle Diagram

```
                         create (accountant / admin)
                                    │
                                    ▼
                              ┌───────────┐
                              │   DRAFT   │  ◄── ownership_state = editable
                              │ (editable)│
                              └─────┬─────┘
                 accountant edits   │   in place (own voucher only;
                 own Draft ◄────────┤   same id/number + version snapshot + audit)
                                    │
                        admin "Mark reviewed (lock)"
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │ ADMINISTRATOR REVIEW │  ◄── locked for the accountant
                        │   (admin_review)     │
                        └──────────┬───────────┘
                     ┌─────────────┴──────────────┐
                     │                            │
        admin "Return to Accountant"      Final approval / posting
                     │                            │
                     ▼                            ▼
              ┌───────────┐              ┌──────────────────────┐
              │ RETURNED  │              │  VOID & REPLACE ONLY  │
              │ (= Draft, │              │  (BO-02, admin only;  │
              │ editable) │              │  original → cancelled,│
              └─────┬─────┘              │  replacement issued)  │
                    │                    └──────────────────────┘
        accountant edits again
                    │
                    ▼  (admin soft-delete/cancel → CANCELLED at any point)
```

**States:** `editable` (Draft) · `admin_review` · `returned` · `locked` · `cancelled`.
After review/posting, the **only** correction is **Void & Replace** (admin) — the
accounting constitution (IG-009 / FD-034) is preserved. There is **no orphaned lock**:
opening a voucher writes nothing; locking is explicit; *Return to Accountant* always
recovers a Draft.

---

## 3 · Audit Coverage Matrix

Every `audit_log` row carries: **actor_user_id, actor_role, ip, old_data, new_data,
reason, created_at**.

| Operation | Logged? | Where (source) | action |
|---|:---:|---|---|
| Login | ✅ | client / login-gate | `login` |
| Logout | ✅ | client (`auth.js`) | `logout` |
| Session expiry (idle) | ✅ | client (`ui-infra.js`) | `session_expired` |
| Failed login | ✅ | login-gate | `login_failed` |
| Account lockout | ✅ | login-gate | `account_locked` |
| Account unlock | ✅ | admin-users | `account_unlocked` |
| Password reset (admin) | ✅ | admin-users | `password_reset` |
| Password change (self) | ✅ | change-password | `password_change` |
| Force password change | ✅ | admin-users | `force_password_change` |
| Create user | ✅ | admin-users | `user_created` |
| Delete user | ✅ | admin-users | `user_deleted` |
| Disable user | ✅ | admin-users | `account_disabled` |
| Enable user | ✅ | admin-users | `account_enabled` |
| **Role change (old→new)** | ✅ | admin-users | `role_change` |
| Session revocation / Sign out all | ✅ | admin-users | `session_revocation` |
| Receipt / Payment created | ✅ | client (crud) | `add` |
| Voucher edited (Draft amend) | ✅ | client (crud) | `receipt_edited` / `payment_edited` |
| Voucher corrected (void+replace) | ✅ | BusinessOps | `edit` / `reclassify` |
| Voucher cancelled | ✅ | client (crud) | `cancel` |
| **Voucher → Administrator Review** | ✅ | DB ownership trigger | `voucher_ownership_transfer` |
| **Return to Accountant** | ✅ | DB ownership trigger | `return_to_accountant` |
| Member create / edit / delete | ✅ | client (crud) | `add` / `edit` / `delete` |
| Settings changes | ✅ | client | `edit` / `opening_balance_change` |
| Close / Reopen fiscal period | ✅ | client | `fiscal_close` / `fiscal_reopen` |
| Internal fund transfer | ✅ | client | `fund_transfer` |
| Reservation create / edit / cancel | ✅ | client (reservations) | `add` / `edit` / `cancel` |
| **Unauthorized access / direct URL** | ✅ | client (`ui-nav`, `crud`) | `permission_violation` |
| Credentials copied | ✅ | client (user-admin) | `credentials_copied` |
| Open Settings page (view) | ⚪ optional | — | not logged (per policy) |

Per-user activity is viewable from each user card (**View Activity**).

---

## 4 · Security Checklist

- ✅ **Direct role update impossible from the UI** — role changes go only through the
  `admin-users` Edge Function (validate → audit → revoke sessions → apply immediately);
  `user_roles` writes require `is_admin()` with `WITH CHECK` (no self-escalation).
- ✅ **RLS blocks ownership spoofing** — accountant cannot change `created_by_uid` or
  `ownership_state`, nor insert a voucher stamped as another owner (trigger + RLS;
  proven by DB-level impersonation test).
- ✅ **Sessions revoked** — on role change, disable, password reset, and explicit
  "Sign out all sessions" (`revoke_user_sessions`, service_role only).
- ✅ **Accountant isolated** — can create + edit **own** Draft vouchers only; cannot
  touch admin/other-accountant vouchers, delete, cancel, or reach admin pages /
  workspaces (RLS + nav gate; verified via REST-level test).
- ✅ **Reservations isolated** — reservation role is finance-blind (excluded from
  `is_provisioned_user()`); accountants cannot read/write reservations.
- ✅ **Audit carries who/when/where/what** — actor id + role + IP + old/new + reason;
  ownership transitions audited by the database trigger (server-side, unforgeable).
- ✅ **Last-admin protected** — `fn_last_admin_guard()` refuses any demote/disable/
  delete that would leave zero enabled administrators (fires even for `service_role`).
- ✅ **Temporary-password lock** — RLS refuses financial writes while
  `must_change_password` is set (`auth_state_ok()`), independent of the UI.
- ✅ **Every financial document is owner-stamped** — `created_by_uid` + `created_by` +
  `created_at` + `updated_by` + `updated_at` on all financial tables; `set_row_updated`
  trigger stamps updates.
- ✅ **Optimistic concurrency (no silent overwrite)** — the accountant Draft amend
  writes only if the row is still at the loaded `version` (`update … eq(id).eq(version)`);
  a losing concurrent save is **rejected with a "reload and retry" message**, never
  overwritten. Admin corrections use **void+replace** (a new row; the original is never
  edited in place), so there is no in-place overwrite there either.

### Audit integrity — server-enforced, not bypassable (owner point #3)

Critical state/authority transitions are written **server-side / in the database**, so
they cannot be skipped by tampering with the UI or calling REST directly:

| Critical operation | Audited by | Bypass-proof? |
|---|---|---|
| Voucher → Administrator Review | **DB trigger** `fn_voucher_ownership` | ✅ fires on any UPDATE, incl. REST |
| Return to Accountant | **DB trigger** `fn_voucher_ownership` | ✅ |
| Ownership change attempt (non-admin) | **DB trigger** (raises + blocks) | ✅ |
| Role change (old→new) | **Edge Function** `admin-users` | ✅ service-role, admin-JWT gated |
| Session revocation / disable / reset | **Edge Function** `admin-users` | ✅ |
| Login / failed login / lockout | **Edge Function** `login-gate` | ✅ |
| Password change | **Edge Function** `change-password` | ✅ |

The client `logAction()` adds convenience/context entries **on top of** these, but is
**not the sole source** for any of the above.

*Verification evidence: rolled-back RLS/trigger impersonation tests (Completion Report
§10.3), migration validation against the live schema, `node --check` on all scripts,
and `auth-core.test.mjs` (43 checks). No production data was mutated.*

---

## 5 · Known Limitations (intentional — out of scope for this release)

These are deliberate scope boundaries, **not defects**:

- **No Maker/Checker (dual-control) workflow** — a second, independent approver is not
  required for high-impact operations. Authority is single-tier per role; the
  Administrator acts alone (bounded by the audit trail + last-admin protection).
- **No electronic / cryptographic signature** — vouchers are not digitally signed;
  authenticity rests on the audit trail, ownership stamps, and immutable
  `voucher_versions` snapshots, not on PKI signatures.
- **No multi-stage / multi-level approval** — the voucher lifecycle is single-stage
  (Draft → Administrator Review → posted/void+replace); there is no chain of successive
  approvers or budget-threshold escalation.
- **No self-service role/permission editor (RBAC editor)** — roles are fixed (three,
  frozen); there is no UI to define custom roles or per-permission grants.
- **"Open Settings page" view events are not audited** — treated as optional per system
  policy; mutations to settings **are** audited.
- **Accountant edit is in-place on Draft only** — by owner decision; it is not a
  correction workflow. All corrections after review/posting remain Void & Replace.

### Planned near-term enhancement — AUTH-004: forensic audit fields (owner point #1)

Owner-recommended, **not required for this release** (deferred to avoid schema churn on
the approved baseline). The current audit already records actor id + role + IP +
old/new + reason, and `table_name`≈**Entity Type** and `record_id`≈**Entity ID**.
AUTH-004 will add, as first-class columns populated end-to-end (client + all Edge
Functions + DB triggers):

- **entity_type** (explicit) and **entity_id** as the human voucher/entity code
  (e.g. `REC-2026-001245`) in addition to the uuid,
- **session_id** (from the GoTrue session claim),
- **correlation_id** (a per-request id to stitch multi-step operations), and
- **client_version** (app build) — so an incident months later can be traced to an
  exact release.

This is a purely additive migration + audit-writer update; it does not change any
authorization behavior established here.

---

### Sign-off

| | |
|---|---|
| Milestone | AUTH-003 — User Management, Authorization & Audit Hardening |
| Implementation | Complete on `claude/new-session-51j8hh-auth003` (PR #206) |
| Verification | DB-level RLS + ownership state-machine proven (rolled back); syntax + unit checks green; **post-deploy live DB verification passed** |
| Production deployment | ☑ **Deployed to Production — 2026-07-26** (after backup + documented verification steps) |
| Owner acceptance | ☑ **Approved — 2026-07-26** |

> **Owner decision (2026-07-26):** "AUTH-003 is accepted as the **Baseline Authorization
> & User Management Architecture v1.0** for Diwan Finance. The implementation,
> authorization model, audit model, voucher ownership workflow, and verification
> evidence have been reviewed and accepted. Future enhancements (including AUTH-004)
> shall build upon this baseline **without altering its constitutional principles unless
> explicitly approved by the system owner**."

**This document is now the official reference (Baseline v1.0)** for users, roles,
authorization, voucher ownership, and audit in Diwan Finance. Any change to these
principles requires explicit owner approval.
