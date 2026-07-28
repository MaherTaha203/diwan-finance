# REL-001 — Release Report

> Executive release report for Diwan Finance, commit `4767dee` (main), 2026-07-27.
> Consolidates the release-engineering assessment. Documentation only — REL-001
> changed no production code.

## 1 · What is being released

Diwan Al-Taha's official financial & administrative system: a build-free, RTL/Arabic-
first vanilla-JS SPA on Vercel (static) + Supabase (Postgres, RLS, Edge Functions),
covering members, subscriptions/dues, receipts, payments, donations, treasury, a
unified reporting engine (screen/print/PDF/Excel), audit logging, and role-based user
administration.

## 2 · Engineering trail feeding this release

| Program | Outcome | Reference |
|---|---|---|
| Accounting constitution + governance | Frozen & certified | `docs/governance/` |
| AUTH-001…003 | Accepted | `docs/security/AUTH-003_ACCEPTANCE_CERTIFICATE.md` |
| PRINT-001 | Complete | `docs/printing/` |
| **REPORT-001** | **Complete** — unified engine is the sole path; legacy removed (R8-a/b/c) | `docs/reporting/REPORT-001_R8*` |
| **SYS-001** | Measured performance & architecture baseline | `docs/performance/SYS-001_*` |
| **UX-001** | UX & accessibility forensic baseline | `docs/ux/UX-001_*` |
| v1.0.0 release package | Present (backup/restore/deploy/readiness/snapshots) | `docs/release/v1.0.0/` |

## 3 · Verification results (measured this phase)

| Check | Result |
|---|---|
| Node test suites | **109 pass / 2 fail** (both pre-existing, fixture-missing legacy suites — `tests/LEGACY_SUITES.md`) |
| Constitutional lab | **90 / 90 checks · 23 / 23 certified · exit 0** (FOC-001…025: full member & voucher lifecycle, dues, donations, expenses, allocation, Phase-15, MODEL2) |
| Report engine | 15 reports render through the engine; cross-medium parity (REPORT-001 verification) |
| Startup (shell) | DOMContentLoaded ~212 ms; parallelized data path; heavy libs deferred (SYS-001) |
| Accessibility | RTL/Arabic-first correct; 2 S2 WCAG-AA gaps identified (UX-001) |
| Security | No client secret leak; privileged ops server-side; RLS + security headers |

## 4 · Gate status

**Conditional GO** (see `REL-001_PRODUCTION_READINESS.md`). Technically
production-ready; the open items are operational readiness:

**Must close before GA**
1. End-user guide + admin guide (absent).
2. Execute & record live UAT (`REL-001_UAT_PLAN.md`).
3. Owner decision on the 2 UX-001 S2 accessibility gaps (fix or accept-as-known).

**Post-GA (tracked)**
- SYS-002: large-table windowing.
- UX-002: keyboard operability, light-theme contrast, headings, form labels.
- `.env.example`; confirm external monitoring; ADR index.

## 5 · Known issues (no S1/critical open)

- **Perf (S2):** large statements/lists render without virtualization (SYS-001 S2-2).
- **A11y (S2):** clickable `span`/`div` not keyboard-operable; muted text < AA in light
  themes (UX-001 S2-1/2-2).
- **Tests:** 2 legacy suites skip/fail on a missing, non-committed fixture — coverage
  superseded by the lab (documented).

## 6 · Recommendation

Proceed to GA **once the three "must close" items are done**. All technical release
gates (accounting certification, security, reporting, infrastructure, backup/restore)
are green. The remaining work is documentation, a live UAT run, and an owner decision on
two known accessibility issues — none of which are code defects.

---

*Prepared by REL-001. No production code, accounting, DB, or configuration was modified
in this phase. Implementation of any roadmap item (SYS-002 / UX-002 / guides) awaits
explicit owner approval.*
