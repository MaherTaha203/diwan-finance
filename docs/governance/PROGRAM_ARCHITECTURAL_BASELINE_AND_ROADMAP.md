<!-- ═══════════════════════════════════════════════════════════════════════════
     PROGRAM ARCHITECTURAL BASELINE & ROADMAP.
     A living governance RECORD (not a rule): it states the current architectural
     baseline of the platform and the next planning activity. Updated by appending
     a new dated entry at each phase closeout — never by rewriting history.
     This artifact changes NO governance rule (GOV-WS-01 v1.5 remains untouched).
     ═══════════════════════════════════════════════════════════════════════════ -->

# Program — Architectural Baseline & Roadmap

**Document ID:** GOV‑PROG‑BR‑01
**Status:** ACTIVE (living record)
**Current Architectural Baseline:** `main` @ `cb2ed75` (Wave 1 Pilot operationally validated & frozen · PR #137)
**Last updated:** 2026‑07‑22 — Wave 1 Pilot Baseline Freeze (GOV‑AIENG‑W1‑FREEZE‑01)
**Active governance:** GOV‑WS‑01 v1.5 (Component Taxonomy + Rules 1–6) · GOV‑WS‑02 (Operational Separation Principle).

---

## 1 · Current Architectural Baseline

The platform now consists of a certified foundation, **four** operational Business
Modules, and one Observability Layer above them.

### FOUNDATION
- **Governance** — GOV‑WS‑01 v1.5 (Component Taxonomy + Rules 1–6); the constitutional
  compliance register; the phase specifications and completion reports.
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
| **P‑DUES — Annual Subscriptions / Dues** | Annual dues State/History + apply (BO‑10) & onboard (BO‑07) | **COMPLETE & FROZEN** |

### OBSERVABILITY LAYER
| Layer | Scope | Status |
|---|---|---|
| **P5 — Treasury / Financial Position** | Read‑only unified financial position (State + Movement) above the modules | **COMPLETE & FROZEN** |

Each operational module *executes* its domain by orchestrating certified Business
Operations (GOV‑WS‑01 Rule 4). The Observability Layer *executes nothing* — it
projects certified Read Models (Rule 4 N/A).

### PLATFORM GOVERNANCE
| Artifact | Scope | Status |
|---|---|---|
| **GOV‑WS‑01 v1.5** | Component Taxonomy + Business‑Workspace Design Rules 1–6 | **ACTIVE & FROZEN** |
| **GOV‑WS‑02** | Operational Separation Principle (3 artifacts; 6‑stage operational lifecycle) | **COMPLETE & FROZEN** |

### AI ENGINEERING GOVERNANCE (governance‑only; no runtime)
| Artifact | Scope | Status |
|---|---|---|
| **P‑AIENG‑000 · S1 · S2 · S3** | Organization · operationalization · certified profiles · execution framework | **COMPLETE & FROZEN** |
| **P‑AIENG‑ACT‑001** | Progressive, waved, reversible activation (R00‑final) | **COMPLETE & FROZEN** |
| **P‑AIENG‑W1‑000** | Wave 1 Read‑Only Engineering Activation — program | **COMPLETE & FROZEN** |
| **P‑AIENG‑W1‑ACT‑001** | Wave 1 Controlled Activation — Specification | **COMPLETE & FROZEN** |
| **P‑AIENG‑W1‑PILOT‑001** | Wave 1 Pilot — Execution Order | **COMPLETE & FROZEN** |
| **Wave 1 Pilot** | one supervised read‑only advisory pass (validated · zero delta · Golden 12/12) | **SUCCESSFUL · BASELINE FROZEN** (GOV‑AIENG‑W1‑FREEZE‑01) |

The AI Engineering governance track is **governance‑only** and executes nothing by itself; its
Wave 1 read‑only activation was operationally validated by a single supervised pilot with
**zero repository delta** and **zero governance violations**. **No Wave 2 is authorized.**

## 2 · Phase Ledger

| Phase | Deliverable | Closeout | Baseline |
|---|---|---|---|
| P0 | Accounting Constitution | Constitution + Certificate | — |
| P1 | Certified Business Operations | GOV‑P1‑CR (P1‑000 completion report) | — |
| P2 | Member Financial Lifecycle | (P2 slices merged) | — |
| P3 | Collection Operations · Receipts | (P3 slices merged) | — |
| P4 | Payment Voucher Workspace | **GOV‑P4‑CR‑01** | `7448745` |
| P5‑OBS | Treasury Observability Layer | **GOV‑P5‑OBS‑CR‑01** | `d2a7454` |
| P6‑000 | Architectural Evolution Assessment | **GOV‑P6‑SPEC‑01** (frozen) | `c1f528e` |
| GOV‑WS‑01 v1.5 | Governance Evolution Specification | ratified (PR #123) | `95dd5bb` |
| P‑DUES | Annual Subscriptions / Dues Module | **GOV‑PDUES‑CR‑01** | **`72b46ad`** |
| GOV‑WS‑02 | Operational Separation Principle | ratified (PR #136) | `e056749` |
| P‑AIENG (000→W1‑ACT‑001) | AI Engineering Governance Platform + Wave 1 program | ratified (PRs #129…#137) | `cb2ed75` |
| P‑AIENG‑W1‑PILOT | Wave 1 read‑only pilot — execution & freeze | **GOV‑AIENG‑W1‑FREEZE‑01** | **`cb2ed75`** |
| FOC (Constitutional Certification Campaign) | Constitutional Laboratory + FOC‑001…025 certified/excluded | **CONSTITUTIONAL‑CERTIFICATION‑REPORT** (23/23 in‑scope · 2 owner‑excluded) | `20026b1` |
| GOV‑013 | Autonomous Engineering Pipeline — framework | **GOV‑013** (ratified · PR #150) | `b40ec03` |
| RLS‑001 | V1 Release Candidate Certification & Packaging | **V1_BASELINE_CERTIFICATE** · tag `v1.0.0` | `477a06d` |
| STR‑001 | Strategic Roadmap Constitution | **STR‑001** (governs post‑V1 execution order) | `de704a7` |
| V1.1 · F‑01 | Governance v1.6 → delivered as **ADR‑GOV‑01** (Observability already first‑class in GOV‑WS‑01 v1.5 §2.6; no version bump); ADR register opened | ADR‑GOV‑01 | *(this phase)* |
| V1.1 · F‑02 | Legacy suites quarantined (unrecoverable `roundtrip-seed.json`) — graceful skip + `tests/LEGACY_SUITES.md`; resolves R‑1/TD‑1/TD‑2 | LEGACY_SUITES.md | `4387d79` |
| V1.2 · F‑03/F‑04 | **Architecture Readiness** (owner scope amendment): ADR‑001 Approval + ADR‑002 Liquidity Guard — **design only, inert; zero code; behaves exactly as V1.1**. Activation deferred to V2 (owner business policy + Constitutional Review) | ADR‑001 · ADR‑002 | `17f651e` |
| V2.0‑DIS | **MODEL2 Constitutional Discovery** — discovery only; 8 sections, edge‑case register; **7 open owner decisions (OD‑01…OD‑07)** formulated (10‑part). Readiness certificates PENDING owner decisions. No code. | V2.0‑DIS_MODEL2_CONSTITUTIONAL_DISCOVERY | `7328ad1` |
| CDS · OD‑01…02 | **Constitutional Decision Sessions (frozen)** — OD‑01: MODEL2 approved; explicit **stored** allocation; order **Current→Historical→Future→Credit**; forward‑only; non‑configurable. OD‑02: credit auto‑consumed only at new‑obligation creation, same order, permanent allocation record. Decision‑only (no code). | ADR‑003 · CA‑001 · CA‑002 | `6adb118` |
| CDS · OD‑03…06 | **Constitutional Decision Sessions (frozen)** — OD‑03: deterministic ordering. OD‑04: BO‑06 settlement (aggregate; deficit‑treasury funded; Law 9). OD‑05: refund first‑class (origin‑funded; prohibited after close; ≠ cancellation). OD‑06: continuous lifetime running balance; credit = future purchasing power (never expires, member‑only); cross‑program N/A (single Food‑Fund). Decision‑only (no code). | CA‑003 · ADR‑004/CA‑004 · ADR‑005/CA‑005 · CA‑006 | *(this session)* |

## 3 · Governance Status

- **P0 — CLOSED & FROZEN**
- **P1 — CLOSED & FROZEN**
- **P2 — CLOSED & FROZEN**
- **P3 — CLOSED & FROZEN**
- **P4 — CLOSED & FROZEN**
- **P5‑OBS — COMPLETE & FROZEN** (Treasury Observability Layer)
- **P6‑000 — COMPLETE & FROZEN** (Architectural Evolution Assessment)
- **GOV‑WS‑01 v1.5 — ACTIVE** (the single governance reference after P6)
- **GOV‑WS‑02 — COMPLETE & FROZEN** (Operational Separation Principle)
- **P‑DUES‑000 — APPROVED & FROZEN** · **P‑DUES‑S1 / S2 — COMPLETE & FROZEN**
- **P‑DUES — COMPLETE & FROZEN** (Annual Subscriptions / Dues module)
- **P‑AIENG‑000 / S1 / S2 / S3 — COMPLETE & FROZEN** (AI Engineering Governance Platform)
- **P‑AIENG‑ACT‑001 — COMPLETE & FROZEN** (progressive activation order)
- **P‑AIENG‑W1‑000 / W1‑ACT‑001 / W1‑PILOT‑001 — COMPLETE & FROZEN** (Wave 1)
- **Wave 1 Pilot — SUCCESSFUL · BASELINE FROZEN** (read‑only activation operationally validated;
  zero delta; zero violations; Golden 12/12). **No Wave 2 authorized.**

No further implementation belongs to a completed/frozen module unless a future
architectural or owner decision explicitly reopens it.

## 4 · Roadmap — Next Planning Activity

**Post‑V1, the roadmap is governed by STR‑001 (Strategic Roadmap Constitution).** Execution is
now roadmap‑driven: the GOV‑013 pipeline runs the STR‑001 order (§16) — **V1.1 (F‑01 Governance
v1.6, F‑02 test‑fixture debt) → V1.2 (F‑03 Approval + F‑04 Liquidity, paired) → V2.0 (F‑05 MODEL2
activation → F‑06 BO‑06 → F‑07 Refund → F‑08 re‑certification) → Deferred (F‑09 Cash Management)**.
V1.1 runs autonomously (F‑01's GOV‑WS‑01 v1.6 amendment owner‑ratified at merge); V1.2/V2.0/
Deferred carry explicit owner gates (business policy / constitutional review). See STR‑001 §§3, 14, 18.

The historical rule below is superseded by STR‑001 for post‑V1 work and retained for context:
Any next candidate must be classified before implementation (v1.5 §8) and cleared
through the Governance Decision Matrix (v1.5 §7).

**Known candidates carried forward** (each a separate, individually‑gated decision —
none pre‑selected):
- **Approval Workflow (GAP‑P1)** — Cross‑Cutting Capability; needs an ADR + a new
  certified BO + a Business‑Contract (Part A) amendment.
- **Liquidity Guard (GAP‑P2)** — Cross‑Cutting Capability / financial invariant; pairs
  with GAP‑P1 (a merged pre‑execution control), Constitutional Review required.
- **BO‑06 historical‑deficit settlement** — Deferred (constitutional; blocked on a
  settlement policy).
- **Cash Management / Reconciliation** — Deferred (needs a new cash‑location foundation).
- **Governance Enhancements** —
  - codify "Observability Layer" as a first‑class GOV‑WS‑01 artifact type (candidate v1.6);
  - **GOV‑013 · AI Engineering Team Framework** — a proposed permanent multi‑agent
    engineering governance (Chief Architect · Implementation · QA · Architecture
    Compliance · Business Rules Auditor · Regression · Observability · Data Integrity ·
    UI/UX · Security · Documentation · Release Readiness, under an Engineering
    Coordinator). **→ OPENED as GOV‑013 (Autonomous Engineering Pipeline) by owner order
    2026‑07‑22; DRAFT for review/approval/freeze. No production phase is pre‑selected by it
    — phase selection remains owner‑gated (§4 above / GOV‑013 §9).**
- **Reservations (existing, non‑financial)** — a Governance ruling on its standing
  (per P6‑000), not an implementation.

---

*Living governance record. Append a new dated baseline entry at each phase closeout.*
