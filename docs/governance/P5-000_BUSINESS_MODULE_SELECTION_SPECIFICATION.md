<!-- ═══════════════════════════════════════════════════════════════════════════
     P5-000 — Business Module Selection & Architectural Assessment
     Specification / assessment phase only. No code, no UI, no Business Operation,
     no Read Model, no Accounting Core / Business Contract / Runtime Guard / GOV
     change is made by this document. It CLASSIFIES every remaining candidate,
     prioritizes by architectural value, and recommends the next step.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P5-000 · Business Module Selection & Architectural Assessment

**Document ID:** GOV‑P5‑SPEC‑01
**Phase:** P5 · Task P5-000
**Status:** DRAFT — for owner review, approval & freeze (no implementation until then)
**Date:** 2026‑07‑21
**Predecessors (all frozen):** P0 · P1 · P2 (Member Lifecycle) · P3 (Collection) · P4 (Payment Vouchers) · GOV‑WS‑01 v1.4 (Rules 1–6).

> **Assessment up front.** Per the owner's direction, every remaining candidate is
> first **classified**, then prioritized. The single highest‑value architectural
> evolution is the **Treasury · Financial Position view** — but it classifies as an
> **Observability / Reporting Layer, not a Business Module**, so it should not be
> forced into the P5 "Business Module" slot (§4). If P5 proceeds as a Business
> Module, the highest‑priority actual Business Module is **Annual Subscriptions /
> Dues Operations** (§6), whose functional spec is given in §7–§14.

---

## 0 · Method

Three operational **Business Modules** now exist — **P2** (member obligations),
**P3** (receipts / money‑in), **P4** (payments / money‑out). Rather than assume the
next item is a fourth module, each remaining candidate is placed in exactly one of
five architectural categories, then ranked by value while preserving the
methodology (orchestrate the certified surface; no new accounting; GOV‑WS‑01 v1.4).

**Categories**
- **Business Module** — owns a domain workflow; a dedicated workspace that *executes*
  work by orchestrating certified Business Operations.
- **Cross‑cutting Capability** — a control/behaviour that spans multiple modules
  (e.g. an approval lifecycle across voucher types); typically needs a *new* certified
  operation.
- **Business Rule** — a precondition/guard enforced inside the certified core/BO
  layer (not a workspace).
- **Governance Enhancement** — a rule/artifact/tooling change to GOV‑WS‑01 or the
  certification process.
- **Observability / Reporting Layer** — presents certified state for oversight;
  *executes nothing* (Rule 4 does not apply; its "Capability" is read + navigation).

---

## 1 · Classification of every remaining candidate

| Candidate | Category | Notes |
|---|---|---|
| **Treasury / Financial Position** | **Observability / Reporting Layer** | Projects certified balances/positions; executes nothing. |
| **Financial Reports / Statements** | **Observability / Reporting Layer** | Largely delivered (fund/member statements, debt, delinquent). |
| **Audit / Activity log** | **Observability / Reporting Layer** (+ Governance) | Read‑only compliance view; log already exists. |
| **Annual Subscriptions / Dues** | **Business Module** | Operational: BO‑10 (billing) + BO‑07 (onboarding); certified reuse. |
| **Cash Management / Reconciliation** | **Business Module** (low readiness) | Needs a physical‑cash / bank‑reconcile concept not yet modelled. |
| **Reservations (الحجوزات)** | **Business Module** (no certified foundation) | No certified Business Operations or read models exist for it. |
| **Approval Workflow (GAP‑P1)** | **Cross‑cutting Capability** | Request→approve/reject→execute across vouchers; needs a *new* certified BO + Part A amendment. |
| **Liquidity Guard (GAP‑P2)** | **Business Rule** | An overdraw/budget precondition enforced by the core/BO — not a workspace. |
| **Settings / Configuration** | **Cross‑cutting Capability** (config) | Not a Business Workspace. |
| **Further GOV‑WS / certification rules** | **Governance Enhancement** | Rule additions / tooling; not a module. |

---

## 2 · Prioritization by architectural value

| Rank | Item | Category | Value | Risk / cost | Fits methodology as‑is? |
|---|---|---|---|---|---|
| **1** | **Treasury / Financial Position** | Observability Layer | **High** — top‑level oversight over P2/P3/P4 | **Low** — pure read of certified positions | Yes (read‑only) |
| 2 | Approval Workflow (GAP‑P1) | Cross‑cutting Capability | High — adds a real control layer | **High** — needs a new certified BO + Part A amendment | No — extends the certified layer |
| 3 | **Annual Subscriptions / Dues** | **Business Module** | Med — operational but low‑frequency (annual) | Low–Med — certified reuse (BO‑10/07) | **Yes** |
| 4 | Liquidity Guard (GAP‑P2) | Business Rule | Med — safety | High — core precondition change | No — accounting‑core scope |
| 5 | Consolidated Reporting | Observability Layer | Med — mostly delivered | Low | Yes |
| 6 | Cash Management | Business Module | Med | High — new concept | No — low readiness |
| 7 | Reservations | Business Module | Low–Med | High — no certified foundation | No |

---

## 3 · The highest‑priority item

The highest‑value architectural evolution is **#1 — the Treasury · Financial Position
view**: it unifies what P3 feeds in, P4 draws out, and P2 obligates into one certified
position, it is the treasurer's/board's first daily question, it reuses only certified
read models, and it is the lowest‑risk step available. It is the natural **capstone**
over the three flow modules.

## 4 · Why the highest‑priority item should NOT be P5 (as a Business Module)

**Treasury / Financial Position is an Observability / Reporting Layer, not a Business
Module.** By the program's own definitions it fails the Business‑Module test:

- **It executes nothing.** A Business Module *owns a workflow* and changes state by
  orchestrating certified Business Operations. Treasury performs no BO — it only
  presents certified state. GOV‑WS‑01 **Rule 4 (Intent→Authorization→Execution→Result)
  does not even apply**, because there is no execution.
- **Its "Capability" is empty** in the operational sense — only read + navigation to
  the workspaces that *do* own the actions (P2/P3/P4). Forcing it into the
  Business‑Module frame would misrepresent its architecture and dilute the meaning of
  "Business Module" (and of Rules 4/5) established across P2–P4.
- **Different lifecycle.** Observability layers don't need the visibility→capability→
  corrections slice arc; a single read‑only slice fully delivers them.

**Therefore:** pursue Treasury as an **Observability Layer** initiative in its own
right (same GOV‑WS‑01 discipline for Rules 1‑3, 5‑6; Rule 4 N/A), **not** as "P5 — a
Business Module." Recording this distinction *is* the architectural value the owner's
direction asked for: the next step is a **layer**, not a module.

> Recommended program move: authorize a **Treasury Observability Layer** phase
> (e.g. "P5‑OBS" / "P‑Treasury") as the highest‑value evolution — read‑only, certified
> read models only. It is spec‑ready (§ appendix), and is the recommendation of this
> assessment.

## 5 · If P5 must remain a Business Module — the recommendation

Among genuine **Business Modules** on the certified foundation, the ranking is:

1. **Annual Subscriptions / Dues Operations** — the only clean operational module
   available today (BO‑10 billing + BO‑07 onboarding; certified reuse; no new
   accounting). ✔ recommended Business Module.
2. *Cash Management* — needs a new physical‑cash/reconcile concept (low readiness). ✘
3. *Reservations* — has no certified Business Operations (would require inventing
   them; contrary to the orchestration pattern). ✘

So **if P5 is a Business Module, it is Annual Subscriptions / Dues Operations.** Its
functional specification follows (§7–§14).

## 6 · Decision requested

Two viable, methodology‑preserving paths — the owner chooses which becomes P5:

- **Path A (recommended · highest value):** Treasury **Observability Layer** — a new
  *layer* phase, read‑only, certified read models only. Not a Business Module.
- **Path B (if P5 must be a Business Module):** **Annual Subscriptions / Dues
  Operations** — the top operational Business Module. Spec below.

Cross‑cutting **Approval Workflow (GAP‑P1)**, the **Liquidity Guard (GAP‑P2)** business
rule, and further **Governance Enhancements** remain separate, individually‑gated
decisions — none is a Business Module and none is proposed as P5.

---

# Functional Specification — the recommended Business Module (Path B)
## Annual Subscriptions / Dues Operations Workspace

## 7 · Business Objective

An operational workspace for the **annual dues lifecycle**: apply the yearly
subscription obligations to eligible members and see, per year, who is billed and
what remains — orchestrating certified Business Operations only, with no new
accounting.

## 8 · Business Scope (owns)

- **State** — the current dues picture: years billed, per‑year total obligation,
  eligible‑member count, and outstanding balances (from the certified read model).
- **History** — the subscription‑year history (which years were applied, when, at
  what amount).
- **Capability** — **Apply annual dues → BO‑10** (obligation generation only, never a
  payment); onboarding a member into the schedule → **BO‑07**. Legitimacy‑gated
  (admin), Rule 4 (Intent→Authorization→Execution→Result).

## 9 · Out‑of‑Scope (does not own — Rule 5)

- **Payments / collection** (owned by P3), member statements/lifecycle (P2),
  disbursements (P4).
- **Per‑year payment allocation** (GAP‑1, inflow‑side) — deferred.
- **BO‑06**, approval workflow (GAP‑P1), liquidity guard (GAP‑P2).
- No new Business Operation, no new Read Model, no accounting logic, no second source
  of truth.

## 10 · Primary Business Question

> *"For which year must dues be applied, and what dues operation may I legitimately
> perform next?"*

Supporting: State — which years are billed and what is outstanding? History — how did
the dues schedule evolve? Capability — may I apply this year's dues (and to whom)?

## 11 · Candidate Business Operations & Certified Read Models (all certified — none new)

- **BO‑10** Apply Annual Dues (`applyAnnualDues` — obligation generation only).
- **BO‑07** Create Member (+ subscription schedule), where onboarding into a year is needed.
- Read models: `FIN.subscriptionYears()`, `FIN.memberDelinquency` / `annualDebtRows`
  (per‑year outstanding), member subscriptions — all frozen.

## 12 · Gap Analysis

| # | Gap | Disposition |
|---|---|---|
| GAP‑1 | Payment→per‑year allocation (inflow) | Out of scope; deferred gated BO |
| G‑A1 | No certified "reverse a year's dues" operation | Out of scope; corrections stay voucher‑level |

## 13 · Dependencies & Acceptance Criteria

- **Dependencies:** GOV‑WS‑01 v1.4; BO‑10/BO‑07; the annual read models; the existing
  certified annual‑dues flow (`applyAnnualDue`).
- **Acceptance:** one dominant PBQ (Rule 2); State/History/Capability separated
  (Rule 3); every action routes only through BO‑10/BO‑07 (Rule 4), the workspace
  executes no BO itself; every value from certified read models (Rule 6); one source
  of operational truth; **Golden baseline 12/12 unchanged**; P0–P4 guarantees valid; a
  conformance test proves it.

## 14 · Roadmap & Completion Boundary

- **P5‑S1** — read‑only dues State + History.
- **P5‑S2** — capability: apply annual dues (BO‑10) + onboard (BO‑07), gated.
- **Completion boundary:** module complete when State + History + the BO‑10/BO‑07
  capability are delivered, orchestration‑only, GOV‑WS‑01 respected, baseline
  unchanged. GAP‑1 and reversals remain outside.

---

## Appendix · Treasury Observability Layer (Path A) — spec‑ready outline

- **Primary Business Question:** *"What is the organization's overall financial
  position, and is it healthy?"*
- **State:** each fund's balance (`FIN.foodBalance/diwanBalance/donBalance`,
  `FinContract.treasuries/balances`), historical‑deficit remaining, settlement
  reserve, net food position (`FIN.foodDeficitRemaining/NetPosition/SettlementReserve`).
- **History:** cross‑fund movement (`FIN.fundLedger(fund, from, to)`) over a period.
- **Capability:** read/navigation only (export; open P2/P3/P4). **No execution.**
- **Rules:** 1‑3, 5‑6 apply; **Rule 4 N/A** (executes nothing). No new accounting; no
  new BO; certified read models only; one source of operational truth.
- **Roadmap:** a single read‑only slice delivers it.

---

*Specification / assessment only — no implementation begins until P5‑000 is reviewed,
approved, and frozen, and the owner selects Path A or Path B.*
