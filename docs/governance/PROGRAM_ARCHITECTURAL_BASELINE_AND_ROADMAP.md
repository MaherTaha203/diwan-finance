<!-- ═══════════════════════════════════════════════════════════════════════════
     PROGRAM ARCHITECTURAL BASELINE & ROADMAP.
     A living governance RECORD (not a rule): it states the current architectural
     baseline of the platform and the next planning activity. Updated by appending
     a new dated entry at each phase closeout — never by rewriting history.
     This artifact changes NO governance rule (GOV-WS-01 remains v1.4, untouched).
     ═══════════════════════════════════════════════════════════════════════════ -->

# Program — Architectural Baseline & Roadmap

**Document ID:** GOV‑PROG‑BR‑01
**Status:** ACTIVE (living record)
**Current Architectural Baseline:** `main` @ `d2a7454` (P5‑OBS‑S1 merged · PR #120)
**Last updated:** 2026‑07‑21 — P5‑OBS closeout (GOV‑P5‑OBS‑CR‑01)
**Active governance:** GOV‑WS‑01 v1.4 (Rules 1–6).

---

## 1 · Current Architectural Baseline

The platform now consists of a certified foundation, three operational Business
Modules, and one Observability Layer above them.

### FOUNDATION
- **Governance** — GOV‑WS‑01 v1.4; the constitutional compliance register; the
  phase specifications and completion reports.
- **Accounting Constitution** (P0) — frozen.
- **Accounting Core** (FIN / FIN2 / FinContract + atomic RPCs) — frozen; the sole
  executor of financial logic.
- **Certified Business Operations** (BO‑01…BO‑10; BO‑06 deferred) — frozen; the only
  way to change state.

### OPERATIONAL BUSINESS MODULES
| Module | Scope | Status |
|---|---|---|
| **P2 — Member Financial Lifecycle** | Member obligations & operational workspace | **COMPLETE & FROZEN** |
| **P3 — Collection Operations** | Receipts / money‑in (BO‑01…BO‑05) | **COMPLETE & FROZEN** |
| **P4 — Payment Voucher Workspace** | Payments / money‑out (BO‑01…BO‑05) | **COMPLETE & FROZEN** |

### OBSERVABILITY LAYER
| Layer | Scope | Status |
|---|---|---|
| **P5 — Treasury / Financial Position** | Read‑only unified financial position (State + Movement) above P2/P3/P4 | **COMPLETE & FROZEN** |

Each operational module *executes* its domain by orchestrating certified Business
Operations (GOV‑WS‑01 Rule 4). The Observability Layer *executes nothing* — it
projects certified Read Models (Rule 4 N/A).

## 2 · Phase Ledger

| Phase | Deliverable | Closeout | Baseline |
|---|---|---|---|
| P0 | Accounting Constitution | Constitution + Certificate | — |
| P1 | Certified Business Operations | GOV‑P1‑CR (P1‑000 completion report) | — |
| P2 | Member Financial Lifecycle | (P2 slices merged) | — |
| P3 | Collection Operations · Receipts | (P3 slices merged) | — |
| P4 | Payment Voucher Workspace | **GOV‑P4‑CR‑01** | `7448745` |
| P5‑OBS | Treasury Observability Layer | **GOV‑P5‑OBS‑CR‑01** | **`d2a7454`** |

## 3 · Governance Status

- **P0 — CLOSED & FROZEN**
- **P1 — CLOSED & FROZEN**
- **P2 — CLOSED & FROZEN**
- **P3 — CLOSED & FROZEN**
- **P4 — CLOSED & FROZEN**
- **P5‑OBS‑000 — FROZEN** (layer specification)
- **P5‑OBS — COMPLETE & FROZEN** (Treasury Observability Layer)
- **GOV‑WS‑01 v1.4 — ACTIVE**

No further implementation belongs to P5‑OBS unless a future architectural or owner
decision explicitly reopens it.

## 4 · Roadmap — Next Planning Activity

### ▶ P6‑000 · Architectural Evolution Assessment — **OPEN (planning only)**

The next planning activity is **P6‑000**, an **Architectural Evolution Assessment**.
Following the P5‑000 method, it shall — before any implementation — determine the
**next highest‑value architectural evolution** now that the three operational
modules and the Treasury Observability Layer are complete. It shall:

- classify every remaining candidate into one architectural category (Business
  Module · Cross‑cutting Capability · Business Rule · Governance Enhancement ·
  Observability / Reporting Layer);
- prioritize by architectural value on the certified foundation (orchestration
  only; no new accounting; GOV‑WS‑01 respected);
- recommend the highest‑value next step and the path(s) to reach it.

**Known open candidates carried forward** (each remains a separate, individually‑gated
decision — none is pre‑selected as P6):
- **Approval Workflow (GAP‑P1)** — cross‑cutting Capability; needs a new certified BO
  + a Business‑Contract (Part A) amendment.
- **Liquidity Guard (GAP‑P2)** — Business Rule; accounting‑core precondition.
- **Annual Subscriptions / Dues Operations** — the top operational Business Module on
  the certified foundation (BO‑10 / BO‑07 reuse).
- **BO‑06 historical‑deficit settlement** — deferred certified operation.
- **Cash Management / Reconciliation** — new physical‑cash/reconcile concept (low
  readiness).
- **Governance Enhancement** — e.g. codifying "Observability Layer" as a first‑class
  GOV‑WS‑01 artifact type.

**No implementation for P6 may begin until the P6‑000 assessment is reviewed,
approved, and frozen.**

---

*Living governance record. Append a new dated baseline entry at each phase closeout.*
