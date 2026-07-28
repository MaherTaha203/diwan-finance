# REL-001 — Release Checklist

> Release-engineering readiness assessment as of commit `4767dee` (main, after
> REPORT-001, SYS-001, UX-001). **Documentation/verification only** — no production
> code changed. This **re-certifies** the existing `docs/release/v1.0.0/` package
> against the work merged since it was written, and records the current gate status.
>
> Legend: ✅ met · ⚠️ met with a caveat / needs attention · ❌ gap (pre-GA action).

## A · Architecture

| Item | Status | Evidence |
|---|---|---|
| Accounting constitution frozen | ✅ | `docs/governance/ACCOUNTING_CONSTITUTION.md` (+ certificate) |
| Constitutional compliance register | ✅ | `docs/governance/CONSTITUTIONAL_COMPLIANCE_REGISTER.md` |
| Governance specs complete | ✅ | `docs/governance/` (GOV-WS-01/02, business-ops spec, workspace rules) |
| Architecture snapshot (v1.0.0) | ✅ | `docs/release/v1.0.0/FINAL_ARCHITECTURE_SNAPSHOT.md` |
| Reporting architecture | ✅ | `docs/reporting/REPORT-001_ARCHITECTURE_SPEC.md` |
| Formal ADRs | ⚠️ | Only `docs/decisions/DD-01`; decisions are recorded as **constitutions/specs** instead. An ADR index would consolidate them |

## B · Security

| Item | Status | Evidence |
|---|---|---|
| AUTH reviewed & accepted | ✅ | `docs/security/AUTH-003_ACCEPTANCE_CERTIFICATE.md`, completion report |
| Privileged ops server-side only | ✅ | `service_role` confined to Edge Functions (`admin-users`, `change-password`, `login-gate`); client comments confirm |
| Client uses anon key only | ✅ | `createClient(window.__SB_URL, window.__SB_ANON)` (app.js:2234) — no secret in client |
| Secrets via env, not hardcoded | ✅ | `server.js` reads `process.env.SUPABASE_URL/KEY`; `.env` git-ignored |
| RLS / DB hardening | ✅ | migrations incl. `audit_rls_perf_and_hardening`, constitutional runtime guards |
| HTTP security headers | ✅ | `vercel.json`: `nosniff`, `SAMEORIGIN`, `Referrer-Policy`, HSTS preload |
| Audit log | ✅ | `audit_log` table + capped read; audit RLS migration |
| `.env.example` for onboarding | ⚠️ | absent — env var names documented only in README/deploy checklist |

## C · Reporting & Print

| Item | Status | Evidence |
|---|---|---|
| REPORT-001 complete | ✅ | R8-a/b/c merged; `REPORT-001_R8_VERIFICATION.md` (15 reports through the engine) |
| Unified engine sole path | ✅ | legacy builders removed (R8-b/c); kill-switch flags retained |
| Print identity / minimal print | ✅ | `docs/printing/PRINT_FORENSIC_AUDIT.md`, EB-07 |
| Cross-medium parity | ✅ | screen == print == PDF == Excel (REPORT-001) |

## D · Testing

| Item | Status | Evidence |
|---|---|---|
| Node test suites | ✅ | **109 pass / 2 fail** — the 2 are pre-existing fixture-missing legacy suites (`business-operations-slice1`, `constitutional-explicit-q5`), documented in `tests/LEGACY_SUITES.md` |
| Constitutional lab (FOC cases) | ✅ | all financial-operation cases green (`node lab/run.cjs`) — see RELEASE_REPORT for the tally |
| Browser (Playwright) | ✅ | REPORT-001 + SYS-001 + UX-001 harnesses ran clean (engine render, startup, a11y) |
| Performance baseline | ✅ | `docs/performance/SYS-001_*` (measured) |
| UX / accessibility baseline | ✅ | `docs/ux/UX-001_*` (measured) |
| Full UAT (live flow) | ⚠️ | plan authored (`REL-001_UAT_PLAN.md`); **owner must execute** against the authenticated environment (prod auth not available to automation) |

## E · Documentation

| Guide | Status | Location |
|---|---|---|
| Architecture | ✅ | reporting arch spec + v1.0.0 snapshot |
| Deployment | ✅ | `docs/release/v1.0.0/DEPLOYMENT_CHECKLIST.md`, `phase15/FINAL_DEPLOYMENT_CHECKLIST.md` |
| Backup | ✅ | `docs/release/v1.0.0/BACKUP_CHECKLIST.md` |
| Recovery / Restore | ✅ | `docs/release/v1.0.0/RESTORE_CHECKLIST.md` |
| Operations | ✅ | `docs/governance/P1-000_BUSINESS_OPERATIONS_SPECIFICATION.md` |
| Release notes / changelog / manifest | ✅ | `docs/release/v1.0.0/` |
| **End-user guide** | ❌ | **absent** — pre-GA deliverable |
| **Admin guide** | ❌ | **absent** — pre-GA deliverable |

## F · Production

| Item | Status | Evidence |
|---|---|---|
| Static build config | ✅ | `vercel.json` (`outputDirectory: public`, no build step) |
| Verify route rewrite | ✅ | `/verify/:id → /verify.html` |
| Supabase migrations tracked | ✅ | `supabase/migrations/` (constitutional + auth + ccr series) |
| Edge Functions deployed | ✅ | `supabase/functions/{admin-users,change-password,login-gate,_shared}` |
| Env configuration | ⚠️ | required vars: `SUPABASE_URL`, `SUPABASE_(ANON_)KEY`, `PORT` — no `.env.example` |
| Logging / monitoring | ⚠️ | app-level audit log ✅; no evidence of external error/uptime monitoring — confirm Vercel/Supabase dashboards suffice |
| Preview deploys green | ✅ | Vercel preview Ready on recent PRs |

## Pre-GA action items (from the gaps above)

**Blocking (owner decision):**
1. ❌ Author the **end-user guide** and **admin guide** (E).
2. ⚠️ Execute the **live UAT** (`REL-001_UAT_PLAN.md`) and record results (D).

**Recommended before GA (non-blocking, tracked in SYS/UX roadmaps):**
3. UX-001 S2-1 (keyboard operability) + S2-2 (light-theme contrast) — WCAG AA.
4. SYS-001 S2-2 (large-table windowing).
5. Add `.env.example`; confirm monitoring ownership; add an ADR index.

**Not blocking:** the 2 pre-existing legacy test suites (fixture-missing, documented).

*Gate recommendation is in `REL-001_PRODUCTION_READINESS.md`.*
