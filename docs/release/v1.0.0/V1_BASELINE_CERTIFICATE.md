# V1 Baseline Certificate

> **This certifies the official V1 production baseline of the Diwan Financial System.**

**Release name:** Diwan Financial System — Constitutional Baseline V1
**Version tag:** `v1.0.0`
**Baseline commit:** `main` @ `b40ec03` + the RLS‑001 packaging commit (the commit `v1.0.0` marks)
**Certified:** 2026‑07‑22 · **Phase:** RLS‑001 · **Pipeline:** GOV‑013 (A→B→C→PASS)
**Predecessor reference tag:** `baseline-pre-refactor-2026-06-29` (historical only)

## The V1 baseline is
- **Functionally frozen** — no feature may enter without a new owner‑gated phase.
- **Constitutionally certified** — 23/23 in‑scope FOC chapters, 90/90 lab checks, 0 failed,
  2 owner‑excluded (FOC‑012 BO‑06 · FOC‑013 Refund).
- **Regression‑green** — GOLDEN unchanged; core engine + constitution suites pass.
- **Independently audited** — Agent B PASS across 14 release categories.

## What this baseline freezes
Accounting Constitution (12 Laws) · Accounting Core (FIN/FIN2/FinContract + atomic RPCs) ·
Certified Business Operations BO‑01…BO‑10 (BO‑06 deferred) · Read Models · modules P2/P3/P4/
P‑DUES/P5‑OBS · governance GOV‑WS‑01 v1.5 / GOV‑WS‑02 / P‑AIENG / GOV‑013 · the Constitutional
Laboratory and its certification corpus.

## Explicitly not in V1 (owner‑gated)
- **MODEL2** — inert (`DEFINED_INERT_P2A`); not activated.
- **BO‑06** deficit settlement — deferred. **Refund** — reserved.
- Feature phases (Approval Workflow · Liquidity Guard · Governance v1.6) — gated behind V1.

## Change control after V1
Any modification to a frozen artifact re‑opens certification and requires an explicit owner
decision (GOV‑013 §9 / GOV‑PROG‑BR‑01 §4). This baseline is the reference against which all
future V1.x work is measured.

**Status: CERTIFIED — V1 BASELINE ESTABLISHED.**
