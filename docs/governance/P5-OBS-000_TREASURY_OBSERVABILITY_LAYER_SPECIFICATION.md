<!-- ═══════════════════════════════════════════════════════════════════════════
     P5-OBS-000 — Treasury / Financial Position Observability Layer · Specification
     Specification phase only. No code, no UI, no Business Operation, no Read Model,
     no Accounting Core / Business Contract / Runtime Guard / Constitution / GOV
     change is made by this document. It specifies a READ-ONLY observability layer.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P5-OBS-000 · Treasury / Financial Position — Observability Layer Specification

**Document ID:** GOV‑P5‑OBS‑01
**Phase:** P5 · Path A (owner decision) · Task P5‑OBS‑000
**Status:** DRAFT — for owner review, approval & freeze (no implementation until then)
**Date:** 2026‑07‑21
**Predecessors (all frozen):** P0 · P1 · P2 (Member Lifecycle) · P3 (Collection) · P4 (Payment Vouchers) · GOV‑WS‑01 v1.4 · P5‑000 (selection & architectural assessment).

> **Nature.** This is an **Observability / Reporting Layer**, **not a Business
> Module**. It sits **above** the operational Business Modules (P2/P3/P4), presents a
> unified financial position **exclusively from certified Read Models**, and
> **executes nothing** — no Business Operation, no accounting logic, no mutation. It
> does not replace or extend any operational module.

---

## 1 · Objective

Provide a single, certified **financial‑position view** across the organization —
what each fund holds, the historical‑deficit standing, the reserve, the net
position, the combined total, and how the funds moved over a period — so the
treasurer and the board can answer *"what is our overall financial position, and is
it healthy?"* at a glance. The layer **projects** certified state; it computes no new
accounting and holds no second source of truth.

## 2 · Architectural position (a layer, not a module)

```
                 ┌─────────────────────────────────────────────┐
                 │  Treasury / Financial Position (OBSERVABILITY)│  ← reads only; executes nothing
                 └───────────────▲─────────────▲────────────────┘
                                 │             │   (navigates to, never bypasses)
   ┌───────────────┐   ┌─────────┴──┐   ┌──────┴───────┐
   │ P2 Member     │   │ P3 Collection│   │ P4 Payment   │   ← the operational Business Modules
   │ Lifecycle     │   │ (money‑in)   │   │ (money‑out)  │     own all state change (via BOs)
   └───────┬───────┘   └──────┬───────┘   └──────┬───────┘
           └──────────────────┼──────────────────┘
                              ▼
              Certified Business Operations → Certified Accounting Core → Certified Read Models
```

The layer reads the **same certified Read Models** the operational modules read, so
every figure it shows is, by construction, the *same* certified value shown
elsewhere (GOV‑WS‑01 Rule 6 — one source of operational truth). It never reaches the
Accounting Core except *through* those certified Read Models, and it triggers no
Business Operation.

## 3 · Business Scope (what this layer OWNS)

- A dedicated **Treasury Observability Workspace** composed under GOV‑WS‑01 v1.4.
- **State — the current position:**
  - each fund's balance — **Food**, **Diwan**, **Donations**;
  - the **historical‑deficit remaining**, the **settlement reserve**, the **current
    support total**, the **debt‑settlement total**, and the **net Food‑fund position**;
  - the **combined organizational position** (a presentation total of the certified
    fund balances — the same summation the fund statements already present).
- **History — the movement:** the cross‑fund **movement ledger** (certified credits
  in / debits out) over a selectable period, and how the position evolved.
- **Read affordances (no execution):** export/print the position via the existing
  certified export path, and **navigate** to the operational workspaces (P2/P3/P4)
  where any action is actually performed.

## 4 · Out‑of‑Scope (what this layer explicitly DOES NOT OWN — GOV‑WS‑01 Rule 5)

- **Any state change.** No Business Operation (BO‑01…BO‑10), no issue/edit/cancel/
  reclassify/split/settle, no billing. All actions remain owned by P2/P3/P4.
- **BO‑06** — the layer *displays* the historical deficit but never **settles** it.
- **GAP‑P1 (approval workflow)** and **GAP‑P2 (liquidity guard)** — the layer
  *displays* liquidity but enforces no guard and runs no approval.
- **Cash reconciliation / physical‑cash split** — a later, separate module.
- No new Business Operation, no new Read Model, no Accounting Core / Business
  Contract / FIN2 / Runtime Guard / Constitution change, no second source of truth,
  no accounting logic, no mutation of any store.

## 5 · Business Questions

**Primary Business Question (dominant focal point):**
> *"What is the organization's overall financial position, and is it healthy?"*

**Supporting questions (State / History only — there is no operational Capability):**
- **State:** How much does each fund hold now? What is the remaining historical
  deficit, the reserve, and the net Food‑fund position? What is the combined total?
- **History:** How did each fund move over the period (money in vs. money out), and
  how did the position get here?
- **Read/navigation:** What can I look at or export, and which operational workspace
  do I open to act?

## 6 · Layer Responsibilities (State · History · read affordances)

| Layer | Responsibility | Certified source |
|---|---|---|
| **State** | Per‑fund balances, deficit/reserve/support/net, combined position | `FIN.foodBalance` · `FIN.diwanBalance` · `FIN.donBalance` · `FinContract.treasuries` / `balances` · `FIN.foodDeficitRemaining` · `FIN.foodNetPosition` · `FIN.foodSettlementReserve` · `FIN.foodCurrentSupportTotal` · `FIN.foodDebtSettlementTotal` |
| **History** | Cross‑fund movement over a period; position evolution | `FIN.fundLedger(fund, from, to)` |
| **Read affordances** | Export/print; navigate to P2/P3/P4 | existing certified export/print; `window.nav` |

State and History are read‑only projections. **There is no operational Capability
section** — this is an observability layer, so **GOV‑WS‑01 Rule 4 (Intent →
Authorization → Execution → Result) does not apply** (nothing is executed).

## 7 · Business Operations used

**None.** The layer invokes **no** Business Operation. Any action is reached only by
*navigation* to the operational Business Module that owns it (P2/P3/P4).

## 8 · Certified Read Models required (all already frozen — none new)

- `FIN.foodBalance()` · `FIN.diwanBalance()` · `FIN.donBalance()`
- `FinContract.treasuries` · `FinContract.balances` (the composed position)
- `FIN.foodDeficitRemaining()` · `FIN.foodNetPosition()` · `FIN.foodSettlementReserve()`
  · `FIN.foodCurrentSupportTotal()` · `FIN.foodDebtSettlementTotal()`
- `FIN.fundLedger(fund, from, to)` (movement history)

No Read Model is created, modified, or redesigned by this layer.

## 9 · Gap Analysis (documented, not implemented)

| # | Gap | Impact | Disposition |
|---|---|---|---|
| G‑T1 | No certified cash‑vs‑bank / physical‑cash split | The layer shows fund *balances*, not a cash‑location breakdown | Out of scope → future Cash‑Management module |
| G‑T2 | No stored period‑over‑period snapshot | Position "history" is projected over the certified ledger for the period, not read from stored snapshots | Acceptable — projection over the certified ledger; introduces no new state |
| — | (Inherited) GAP‑P1, GAP‑P2, BO‑06 | Displayed only; never enforced/executed here | Remain separate gated decisions |

No accounting gap blocks a read‑only observability layer.

## 10 · Dependencies

- **Architectural:** GOV‑WS‑01 v1.4 (Rules 1–3, 5–6; Rule 4 N/A); the P2/P3/P4
  workspace pattern (module file + page + nav + view‑registry entry + conformance test).
- **Business / Operational:** the certified position Read Models (FIN / FinContract);
  navigation into P2/P3/P4; the existing certified export/print path.
- **Frozen & untouched:** Constitution (P0), Business Contracts / P1‑000 Part A, FIN2,
  Runtime Guards, Business Operations, Golden Baseline.

## 11 · GOV‑WS‑01 v1.4 conformance

| Rule | Held by |
|---|---|
| 1 · Layering | Layer → **Certified Read Models** (reads only; reaches the core only through them) |
| 2 · One dominant Primary Business Question | the overall‑position question in the hero |
| 3 · State / History / (Capability) | State + History as separate sections; no operational Capability (read/navigation only) |
| 4 · Intent → Authorization → Execution → Result | **N/A** — the layer executes nothing |
| 5 · Business Boundary | §3 (owns the position view) / §4 (owns no execution) |
| 6 · One source of operational truth | every figure is one projection of the certified state; equals the same value shown in P2/P3/P4 |

*(Recognizing an "Observability Layer" as a first‑class artifact type — distinct from
a Business Module — is a candidate Governance Enhancement; if the owner wants it
codified in GOV‑WS‑01, it would be a separate, individually‑gated governance change.
This spec does not modify any frozen artifact.)*

## 12 · Acceptance Criteria (for the eventual implementation phase)

1. One dominant Primary Business Question (Rule 2); other sections are supporting context.
2. **State and History are separate sections** (Rule 3); **no operational Capability /
   execution controls** anywhere in the layer.
3. **Every displayed value originates from a certified Read Model** and tracks it
   (read‑through); positions equal the certified balances/positions exactly.
4. **One source of operational truth** (Rule 6): each fund figure equals the same
   fund's figure everywhere else in the app.
5. **No Business Operation executed, no accounting logic, no mutation, no second
   source of truth** (assert: the module references no `BusinessOps`; rendering
   mutates no store).
6. Business Boundary (Rule 5) stated in the layer: owns the position view; owns no
   execution.
7. **Golden constitutional baseline 12/12 unchanged**; P0–P4 guarantees valid; E2E green.
8. A dedicated conformance test proves 1–7.

## 13 · Implementation Roadmap (proposed future slices — none built under P5‑OBS‑000)

> Each slice is a separate OWNER ENGINEERING ORDER; nothing is implemented here.

- **P5‑OBS‑S1 · Financial Position + Movement (read‑only).** The full observability
  workspace: fund positions + deficit/reserve/support/net + combined total as
  **State**, and the cross‑fund movement ledger over a period as **History**;
  read/export/navigation affordances only. *Because the layer is read‑only, one slice
  fully delivers it.*
- **P5‑OBS‑S2 (optional) · Period analytics & export polish** — richer period
  comparison / export, still read‑only, still certified Read Models only.

There is **no operational‑capability slice** — by design (§4).

## 14 · Completion Boundary

The Treasury Observability Layer is **complete** when it presents the certified
financial **Position (State) + Movement (History)** with read/export/navigation
affordances only, sourced entirely from certified Read Models, GOV‑WS‑01 v1.4
respected (Rule 4 N/A), and the Golden Baseline unchanged.

**Explicitly outside the boundary** (each a separate future decision): cash
reconciliation, the approval workflow (GAP‑P1), the liquidity **guard/enforcement**
(GAP‑P2), and BO‑06 settlement. Reaching the boundary closes the P5 Observability
Layer; anything beyond is a new decision, not an extension.

---

*Specification only — no implementation begins until P5‑OBS‑000 is reviewed,
approved, and frozen.*
