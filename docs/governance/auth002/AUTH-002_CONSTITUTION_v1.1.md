# AUTH-002 — Authentication Constitution · v1.1 (FINAL)

> **Status:** `APPROVED` · `ARCHITECTURE FROZEN` · `IMPLEMENTATION AUTHORIZED`
> **Project:** diwan-erp-system (`ralifvemgapmsgrjgazh`) · **Ratified:** 2026-07-25
> **Supersedes:** AUTH-002 v1.0 (draft) after the Architecture Review Board verdict
> *APPROVE WITH REQUIRED CHANGES*. This document merges every required change; it is the
> permanent constitutional reference for the Authentication subsystem.

The generating article, from which every rule below follows:

> **A security decision may depend only on data its subject cannot modify.**

---

## 0 · How to read this document

The constitution separates two kinds of rule, and every decision in the Registry (§9) is
tagged as one:

- **Frozen Architecture** — structural invariants. Changing one requires a *proven
  architectural defect* and a constitutional amendment (§10). These do not drift.
- **Operational Configuration** — tunable values and procedures (lock durations, token TTLs,
  alert thresholds). The administrator may change these without an amendment, within the
  bounds the frozen rules set.

Frozen is *what* the system guarantees; configurable is *how much*.

---

## 1 · Data-ownership model (Frozen)

Four stores hold all authentication state; their boundaries are the backbone.

| Data | Store | Sole writer | Readers | Class |
|---|---|---|---|---|
| Password hash, email, sessions, refresh tokens, ban, **app_metadata** | `auth.users` (GoTrue) | Supabase Auth / Admin API (edge fns) | GoTrue | Frozen |
| Role, `is_disabled`, identity (email/phone), full name | `public.user_roles` | `admin-users` edge fn (service_role) | RLS predicates; client (cosmetic) | Frozen |
| Lockout ladder | `public.login_attempts` | `login-gate` / `admin-users` (service_role) | Edge fns only (RLS: zero policies) | Frozen |
| `must_change_password`, `pw_history` | `app_metadata` on `auth.users` | Edge fns (service_role) | RLS via JWT claim; client (read-only) | Frozen |
| Audit trail | `public.audit_log` | Append-only (authenticated + service_role INSERT) | Admin (read) | Frozen |

**Load-bearing distinction:** `user_metadata` is user-writable; `app_metadata` is
service-role-only and arrives as an un-forgeable JWT claim. Every security flag lives on the
second side of that line.

---

## 2 · The frozen decisions (D1–D10) — preserved from v1.0

D1–D10 are unchanged. They are the trust model the Review Board upheld without revision.

| # | Decision |
|---|---|
| **D1** | Two authorities, never merged: GoTrue owns credentials/sessions; `user_roles` owns authorization. A valid credential with no role row is denied entry. |
| **D2** | Security flags (`must_change_password`, `pw_history`) live in `app_metadata`, never user-writable `user_metadata`. *(closes A-1)* |
| **D3** | One login door: all authentication goes through `login-gate`; the direct-sign-in fallback is removed; unavailability fails closed. *(closes A-2)* |
| **D4** | Forced change is server-enforced: the `change-password` edge function verifies current password, checks reuse, sets the new one, clears the flag, and revokes other sessions. RLS independently blocks financial writes while the flag is set. *(closes A-1)* |
| **D5** | State change revokes sessions: password change revokes others; disable signs out all immediately; role change forces re-auth. *(closes A-3)* |
| **D6** | RLS is the sole authorization authority; the client UI lockdown is cosmetic, never a security boundary. |
| **D7** | Provisioning is fail-closed: no self-signup; only `admin-users` creates accounts; no role row ⇒ no entry and no grants. |
| **D8** | Audit is append-only: every security-sensitive act writes one immutable row; no principal (admin included) may update or delete it. |
| **D9** | Two recovery paths, both forcing a change: self-service reset and admin-issued temporary password. |
| **D10** | Clean environment, then rebuild the roster: reduce to the administrator after a verified backup; recreate operational users through the new flow. |

---

## 3 · Administrator safety & recovery (Frozen — Review Board F-1…F-4)

The v1.0 blocker cluster. These are the invariants that make the single-admin end-state of
D10 survivable.

- **D11 · Last-administrator protection (F-1).** No operation may leave zero *enabled*
  administrators. Enforced in two places: the `admin-users` edge function (clean error) **and**
  a database trigger `fn_last_admin_guard` on `user_roles` that fires for every writer —
  service_role included — so even a direct or cascade delete cannot remove the last admin.
- **D12 · Administrator self-lockout protection (F-2).** Administrator accounts are exempt
  from the *terminal* admin-lock. Their final lock stage re-issues a self-expiring 1-hour
  timed lock indefinitely — brute force is still throttled, but a sole admin can always
  recover unaided. Non-admin accounts keep the terminal lock unchanged.
- **D13 · Break-glass recovery (F-3).** Ultimate backstop: recover an administrator via the
  Supabase dashboard / service-role (re-enable, reset password, or promote). Rare, sealed,
  and audited after the fact. This is a *procedure*, not an app feature.
- **D14 · Administrator succession & two-admin minimum (F-4).** The single-admin state of D10
  is **transitional**. Steady state requires **≥2 administrators**. Succession is the
  `transfer_admin` action (promote a successor); it never reduces admin count, so it is always
  safe. Demotion of a former admin is a separate `update`, guarded by D11.

---

## 4 · Lifecycles (Frozen)

Sixteen deterministic lifecycles. Ownership is inherited from §1.

**Authentication · Login · Logout · Session · Refresh · Account · Lockout · Unlock ·
Password · Forced-change · Password-reset · User-creation · User-disable/enable** — as
defined in v1.0 (§1.2). Additions in v1.1:

- **Authorization (split from Permission).** Evaluated per request by RLS on every query; the
  role is read from `user_roles`, never trusted from a JWT claim. Client permissions are
  cosmetic (D6).
- **Audit (split from Permission).** One immutable append per security-sensitive act (D8).
- **User-modification (F-6).** Deterministic side effects:
  - *Email change* → re-confirm + **revoke sessions** (a new login credential).
  - *Phone change* → uniqueness re-check.
  - *Role change* → **revoke sessions** (D5) so new authority applies at once.
- **User-deletion & restoration (F-5).**
  - **Disable is the default retirement** — reversible, preserves all history and attribution.
  - **Hard-delete is reserved.** Audit rows are denormalized (`user_name` text) and **survive**
    deletion; financial attribution is preserved; no cascade touches ledgers. Guarded by D11.
  - **Restore = re-enable a disabled user.** There is no undelete of a hard-delete (that is
    what the backup and break-glass paths are for).

---

## 5 · Password policy (Frozen rule / Configurable values)

- **Complexity (Frozen rule):** ≥10 characters AND ≥2 of {upper, lower, digit, symbol}.
  *(Configurable: the exact minimum length and class count.)*
- **Temporary passwords:** generated ≥16 chars, all four classes; always carry
  `must_change_password` (D2/D4).
- **Reuse / history:** last **5** salted fingerprints (`app_metadata.pw_history`), server-checked.
- **Rotation / expiration (F-9 — stated position):** **No forced periodic expiry** for
  user-chosen passwords (NIST 800-63B). Rotation is event-driven: reset, or suspected
  compromise. Temporary passwords are the only ones that *must* be changed.
- **Administrative reset & forced change (D9):** admin reset issues a temporary password,
  sets the forced-change flag, and revokes sessions.
- **Recovery:** self-service (neutral, anti-enumeration email) or admin reset.

---

## 6 · Session policy (Frozen rules / Configurable values)

- **Multiple simultaneous sessions:** allowed.
- **Revocation (Frozen):** password change → others; disable → all immediately; role change →
  all. Implemented via `revoke_user_sessions()` and GoTrue `signOut(scope:'others')`.
- **Lifetime (Configurable):** access-token TTL **1h**; refresh-token TTL and absolute session
  cap per GoTrue configuration; idle timeout enforced by the SPA session-timeout.
- **Remember-Me (stated position):** bounded by the refresh-token TTL above; no unbounded
  persistent session.
- **Global sign-out:** available. **Per-device logout, trusted devices, device history
  (F-8):** *deferred* — see §11. Global sign-out is the only revocation granularity in v1.1.

---

## 7 · Security policy (Frozen — Review Board F-10…F-12)

- **JWT validation & function auth.** `login-gate` is unauthenticated by design
  (`verify_jwt=false`) and issues sessions only on valid credentials. `admin-users` requires
  a verified **admin** JWT. `change-password` requires a valid **user** JWT (re-verified in-
  function via `getUser`). service_role keys never leave the edge runtime.
- **XSS (primary token-theft threat).** Output escaping is mandatory on every user-controlled
  string (the codebase's `esc()` covers `<>&"'`); a Content-Security-Policy posture is
  maintained. Rationale: an XSS hole that exfiltrates a token defeats every revocation control,
  so escaping discipline is a *security* control, not cosmetics.
- **CSRF.** The bearer-token model (Authorization header, not ambient cookies) is structurally
  immune to classic CSRF; no state-changing endpoint relies on a cookie.
- **Session fixation.** Covered by refresh-token rotation; sessions are server-issued, never
  client-fixated.
- **Brute-force / replay.** Progressive lockout (server-only) + single-use rotating refresh
  tokens + append-only audit.
- **Secret management (F-12).** `service_role` exists **only** in edge-function environment
  variables — never client-side, never committed. The browser holds the anon key only. Key
  rotation is a defined operational procedure.

---

## 8 · Operational readiness (Configurable procedures — Review Board F-14)

Because D3 makes the gate load-bearing (a gate outage = a full login outage), operations are
constitutional in *requirement*, tunable in *value*.

- **Backup & restore.** Standing rule: auth state (`auth.users`, `user_roles`,
  `login_attempts`) is included in routine backups; a timestamped snapshot precedes any
  destructive change (D10). Restores are verified before being relied upon.
- **Migration & rollback.** Auth migrations are additive-only; each carries a rollback path.
- **Disaster recovery.** Points to break-glass (D13) for administrator recovery.
- **Monitoring & alerting.** Alert on: `login-gate` error rate (outage), `account_locked` /
  admin-lock events, and login-failure storms. Audit-log growth has a retention rule.
- **Logging.** Every auth event is audited (D8); logs are immutable.

---

## 9 · Constitution Registry

Every decision, classified. `Amendment?` = does changing it require a constitutional amendment.

| ID | Name | Category | Class | Change authority | Amendment? |
|---|---|---|---|---|---|
| D1 | Two authorities separated | Identity | Frozen | Review Board | Yes |
| D2 | Security flags in app_metadata | Security | Frozen | Review Board | Yes |
| D3 | Single login door (no fallback) | Authentication | Frozen | Review Board | Yes |
| D4 | Server-enforced forced change | Password | Frozen | Review Board | Yes |
| D5 | State change revokes sessions | Session | Frozen | Review Board | Yes |
| D6 | RLS sole authority; UI cosmetic | Authorization | Frozen | Review Board | Yes |
| D7 | Fail-closed provisioning | User mgmt | Frozen | Review Board | Yes |
| D8 | Append-only audit | Audit | Frozen | Review Board | Yes |
| D9 | Two forcing recovery paths | Password | Frozen | Review Board | Yes |
| D10 | Clean environment + rebuild | Admin ops | Frozen | Owner + Board | Yes |
| D11 | Last-admin protection | Admin safety | Frozen | Review Board | Yes |
| D12 | Admin self-lockout exemption | Admin safety | Frozen | Review Board | Yes |
| D13 | Break-glass recovery | Admin safety | Frozen (procedure) | Owner | Yes |
| D14 | Succession / ≥2 admins | Admin safety | Frozen (policy) | Owner + Board | Yes |
| P-COMPLEX | Password complexity ≥10/≥2 | Password | **Frozen rule / Config values** | Owner | Rule: yes · values: no |
| P-HIST | Reuse history depth (5) | Password | Configurable | Owner | No |
| P-EXPIRY | No periodic expiry | Password | Frozen position | Review Board | Yes |
| L-LADDER | 15 → 5m/15m/1h → admin | Lockout | **Frozen shape / Config durations** | Owner | Shape: yes · durations: no |
| S-TTL | Access 1h / refresh / idle | Session | Configurable | Owner | No |
| S-REMEMBER | Remember-Me bounded | Session | Configurable | Owner | No |
| SEC-JWT | Per-function verify_jwt posture | Security | Frozen | Review Board | Yes |
| SEC-SECRET | service_role edge-only | Security | Frozen | Review Board | Yes |
| OPS-* | Backup/DR/monitor/alert/retention | Operations | Configurable | Owner | No |

---

## 10 · Evolution policy — growth without redesign

The architecture is designed so future capabilities attach at defined seams and require **no
structural change**. These are *architectural reservations only — not implemented.*

| Future capability | How it attaches without redesign |
|---|---|
| **MFA** | GoTrue supports factors natively; the single-door gate (D3) and `app_metadata` model already carry the enrollment state. Add a factor step after credential validation. |
| **Passkeys / WebAuthn** | A GoTrue WebAuthn factor behind the same gate; no change to authorization (D1/D6). |
| **OAuth / SSO** | GoTrue OAuth providers issue the same JWT; the `user_roles` authority (D1) and RLS (D6) are provider-agnostic. A social login still needs a role row (D7) to enter. |
| **Active Directory / LDAP** | Via an OAuth/SAML bridge into GoTrue; authorization stays in `user_roles`. |
| **API keys / Service accounts** | A service account is a `user_roles` row with a scoped role; keys are minted through an edge function holding service_role — same ownership model. |
| **Mobile / Desktop apps** | Same gate + bearer-token model; no cookie assumptions (CSRF-immune, §7). |
| **Multi-tenant (if ever required)** | Add a `tenant_id` to `user_roles` and to RLS predicates; the two-authority split (D1) already localizes the change to one table + policies. |

**Amendment procedure (§10 rule):** a Frozen decision changes only on a *proven architectural
defect*, recorded as a dated amendment referencing the defect — mirroring the project's
accounting-constitution discipline. No blanket redesign. No AUTH-002 v1.2 unless a critical
architectural defect is discovered.

---

## 11 · In-scope / out-of-scope register

Deliberately excluded from v1.1 — **decided, not forgotten:**

- **Deferred (reserved for a future amendment):** MFA, passkeys/WebAuthn, OAuth/SSO,
  LDAP/AD, per-device session management, trusted devices, device history, API keys /
  service accounts, multi-tenancy.
- **Permanently excluded:** self-registration / public signup (violates D7); client-side
  authorization decisions (violates D6); security flags in `user_metadata` (violates D2).

---

## 12 · Ratification

- Verdict merged: Architecture Review Board — *APPROVE WITH REQUIRED CHANGES* → all required
  changes incorporated (F-1…F-16).
- D1–D10 preserved exactly; F-items added as extensions (D11–D14) and chapters (§4–§8).

**`APPROVED` · `ARCHITECTURE FROZEN` · `IMPLEMENTATION AUTHORIZED`**

*This is the permanent constitutional document of the Diwan Authentication subsystem.*
