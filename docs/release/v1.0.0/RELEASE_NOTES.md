# Release Notes — Diwan Financial System · Constitutional Baseline V1

**Version:** v1.0.0
**Release name:** Diwan Financial System — Constitutional Baseline V1
**Date:** 2026‑07‑22
**Baseline:** `main` @ `b40ec03` + the RLS‑001 packaging commit (the commit the `v1.0.0` tag marks).
**Phase:** RLS‑001 — V1 Release Candidate Certification & Packaging (no new functionality).

---

## What this release is

The **first officially certified production baseline** of the Diwan Al‑Taha finance
system: a vanilla‑JS single‑page application over Supabase, deployed on Vercel. This
release **introduces no new functionality**. It freezes the already‑certified system as
the official V1 reference and packages it for release.

## What is included (all pre‑existing, certified, and frozen)

- **Accounting foundation (frozen):** the Accounting Constitution (P0), the Accounting
  Core (`fin.js` / `fin2.js` / `fin-contract.js` + atomic RPCs), and the Certified
  Business Operations **BO‑01…BO‑10** (BO‑06 deferred; not implemented).
- **Operational modules (frozen):** P2 Member Financial Lifecycle · P3 Collection
  Operations (receipts) · P4 Payment Voucher Workspace · P‑DUES Annual Subscriptions.
- **Observability (frozen):** P5 Treasury / Financial Position (read‑only).
- **Platform governance (frozen/active):** GOV‑WS‑01 v1.5 · GOV‑WS‑02 · the P‑AIENG
  engineering‑governance track · **GOV‑013** Autonomous Engineering Pipeline.
- **Constitutional assurance:** the permanent **Constitutional Laboratory** (`lab/`) and
  the **Constitutional Certification Campaign** — 23/23 in‑scope chapters certified, 2
  owner‑excluded (FOC‑012 BO‑06, FOC‑013 Refund), 0 failed.

## Certification status at release

| Gate | Result |
|---|---|
| Constitutional Laboratory | **90/90 checks · 23/23 certified · 0 failures** |
| Constitution compliance (`constitutional-verification.cjs`) | **12/12 · GOLDEN baseline unchanged** |
| Core engine unit tests (`fin2.test.cjs`) | **ALL PASS** |
| Build health (`node --check`, all app JS) | **clean (28/28 modules)** |

## Not in this release (owner‑gated / deferred)

- **BO‑06** historical‑deficit settlement — deferred (no settlement policy).
- **Refund** — reserved for future implementation.
- **MODEL2** — defined but **inert** (`DEFINED_INERT_P2A`); not activated.
- Feature phases (Approval Workflow, Liquidity Guard, Governance v1.6) — gated behind V1.

## Known issues

See `OUTSTANDING_RISKS_REPORT.md`. Summary: two **legacy** test suites
(`e2e-acceptance.cjs`, `q5-evidence.cjs`) require an uncommitted fixture
(`tests/roundtrip-seed.json`) and cannot run from a clean checkout; their coverage is
superseded by the runnable Constitutional Laboratory. No runtime defect.

## Upgrade / migration

None. This is the initial baseline release; no data migration is required.
