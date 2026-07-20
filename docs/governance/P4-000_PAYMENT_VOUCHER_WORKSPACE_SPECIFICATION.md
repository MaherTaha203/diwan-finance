<!-- ═══════════════════════════════════════════════════════════════════════════
     P4-000 — Payment Voucher Workspace · Business Module Specification
     Specification phase only. No code, no UI, no Business Operation, no Read
     Model, no Accounting Core / Business Contract / Runtime Guard / GOV change is
     made by this document. It defines the operational environment for money
     leaving the organization and recommends exactly one execution roadmap.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P4-000 · Payment Voucher Workspace — Business Module Specification

**Document ID:** GOV-P4-SPEC-01
**Phase:** P4 · Task P4-000
**Status:** DRAFT — for owner review, approval & freeze (no implementation until then)
**Date:** 2026-07-20
**Predecessors:** P0 (Constitution) · P1 (Business Operations) · P2 (Member Financial Lifecycle → Operational Workspace) · P3 (Collection Operations Workspace) · GOV-WS-01 v1.2 (Rules 1–4) — all frozen.

> **In one line:** the Payment Voucher Workspace is the **outflow mirror** of the Collection
> Operations Workspace (P3). Money leaving the organization is the exact counterpart of money
> coming in, and it reuses the same already-certified voucher Business Operations (BO-01…BO-05)
> and the same certified read models — so it follows the P2/P3 methodology with no new accounting.

---

## 1 · Business Objective

Deliver the operational environment for **money leaving the organization** — the place where an
authorized user creates, reviews, executes, and manages **outgoing payment (disbursement)
vouchers**, entirely by orchestrating certified Business Operations and certified read models,
with no accounting logic, no correction logic, and no second source of truth in the workspace.

It completes the symmetry of the treasury's daily work: **P3 = money in (receipts)**, **P4 = money
out (payments)** — one coherent operational language across both directions.

---

## 2 · Business Scope

- A dedicated **Payment Voucher Workspace** composed under GOV-WS-01 (one dominant Primary
  Business Question; State / History / Capability in separate sections; Intent → Authorization →
  Execution → Result).
- **State** — the current outflow picture: total disbursed, today's disbursements, per-fund
  outflow, and the current certified **fund position (liquidity available to pay)**.
- **History** — the certified **payment ledger** (debit rows) and a payment timeline, including
  voucher versions where a payment was edited / reclassified.
- **Capability** — legitimacy-gated operations, each routing to exactly one certified Business
  Operation via its existing certified flow:
  - Issue a payment → **BO-01** (`savePay → createVoucher{kind:'payment'}`)
  - Edit a payment → **BO-02** (`updatePay → editVoucher{kind:'payment'}`)
  - Cancel a payment → **BO-03** (`deletePay → cancelVoucher{kind:'payment'}`)
  - Correct classification / split a payment → **BO-04 / BO-05** (`openReclassify('payment', id)`)
- Covers both funds (Food, Diwan) and the certified expense classification already modelled.
- The printed payment voucher is reused as-is (`buildPayVoucher`; signatures / QR / A4 intact).

---

## 3 · Out-of-Scope

- **GAP-P1 — Approval workflow** (request → approve/reject → execute). `approved_by` is only a
  free-text field set at creation; there is **no** certified approval Business Operation. Defining
  and gating a real approval lifecycle is a **separate business decision** (§8), not part of this
  module's base roadmap.
- **GAP-P2 — Liquidity / budget guard** (preventing a fund overdraw at disbursement time). No
  certified precondition enforces it today. Documented only; not implemented.
- **BO-06** (historical-deficit settlement) — remains deferred.
- Receipts / collections (owned by P3), member lifecycle (P2), allocation (GAP-1, inflow-side).
- **No new Business Operation, no new Read Model, no Accounting Core / Business Contract / FIN2 /
  Runtime Guard / Constitution change, no second source of truth, no accounting or correction
  logic in the workspace.**

---

## 4 · Business Questions

**Primary Business Question (dominant focal point):**
> *"What must the organization pay, and what payment operation am I legitimately allowed to
> perform next?"*

**Supporting questions (each in its own State / History / Capability section, never mixed):**
- **State:** How much has left each fund, and today? What is the current fund **liquidity** (the
  certified balance available to pay from)?
- **History:** Which payment vouchers exist — to whom, for what expense — and were any edited,
  cancelled, or reclassified (voucher versions)?
- **Capability:** For the selected payment / context, what may I legitimately do now — issue,
  edit, cancel, correct/split — and, if not, **why not**?

---

## 5 · Workspace Responsibilities (State · History · Capability)

| Layer | Responsibility | Certified source / route |
|---|---|---|
| **State** | Payment Summary — total disbursed, today's activity, per-fund outflow, current fund liquidity | `FIN.fundLedger(fund,'','','dr')` (sum of certified debits) · `FIN.foodBalance` / `diwanBalance` |
| **History** | Payment Ledger (certified debit rows, chronological) + Payment Timeline | `FIN.fundLedger(fund,'','','dr')` |
| **Capability** | Operational Actions — issue / edit / cancel / correct-split, legitimacy-gated | BO-01/02/03/04/05 via their existing certified flows |

State and History are **read-only** and carry no execution controls; Capability is the only place
execution is offered (GOV-WS-01 Rule 3). Every capability follows Rule 4: **Intent** (choose the
action / payment) → **Authorization** (`can.write` / `can.admin`; the workspace decides *whether*,
never *how*) → **Execution** (exclusively a certified BO) → **Result** (re-read from certified read
models).

---

## 6 · Candidate Business Operations (all already certified — none invented)

| BO | Name | Role in this module | Authority | Existing certified flow |
|---|---|---|---|---|
| **BO-01** | Create Voucher | Issue a payment voucher | write | `savePay` |
| **BO-02** | Edit Voucher | Correct a payment's editable fields (versioned) | admin | `editPay` → `updatePay` |
| **BO-03** | Cancel Voucher | Cancel a payment (immutable cancellation history) | admin | `deletePay` |
| **BO-04** | Reclassify Voucher | Change a payment's classification only | admin | `openReclassify('payment', id)` |
| **BO-05** | Split / Move Voucher | Partial reclassification (atomic RPC) | admin | `openReclassify('payment', id)` |

No BO is created, modified, or extended by this module. **No BO-06.**

**Genuine gap (not a certified operation today):** a **payment approval** operation — see §8.

---

## 7 · Certified Read Models required (all already frozen — none new)

- `FIN.fundLedger(fund, from, to, 'dr')` — the certified payment (debit) rows and the outflow
  totals (History + State). The sum of debits is the same figure the certified fund statement
  already shows as total expense — never a new accounting rule.
- `FIN.foodBalance()` · `FIN.diwanBalance()` / `FinContract.treasuries` / `FinContract.balances` —
  the current fund position = **liquidity available to pay** (State).
- Voucher version history (already surfaced by the certified editor) for edited/reclassified
  payments (History).

No read model is created or redesigned by this module.

---

## 8 · Gap Analysis (documented, not implemented)

| # | Gap | Impact | Disposition |
|---|---|---|---|
| **GAP-P1** | **Approval workflow.** `approved_by` is a free-text field captured at creation; there is no certified *request → approve/reject → execute* Business Operation, and no state machine (pending / approved / rejected). | The workspace can record who approved, but cannot enforce a controlled approval lifecycle before disbursement. | **Out of scope.** Requires a **new gated Business Operation under a P1-000 Part A amendment** — an owner decision, tracked here only. |
| **GAP-P2** | **Liquidity / budget guard.** No certified precondition prevents disbursing more than a fund holds (overdraw), nor enforces a budget ceiling. | The workspace can *display* liquidity (read model) but must not *enforce* a limit itself (that would be accounting logic). | **Out of scope.** If ever required, a certified guard/BO precondition — owner decision. |
| G-P3 | No certified "beneficiary registry" operation distinct from the receipt payer/contact model. | Minor; beneficiary is captured on the voucher as today. | Not needed for this module. |

Everything the base module needs — create / edit / cancel / reclassify / split, the payment
ledger, fund liquidity, and the printed voucher — is **fully certified and ready**. No accounting
gap blocks Slices 1–3.

---

## 9 · Dependencies

- **Architectural:** GOV-WS-01 v1.2 (Rules 1–4) — layering, one dominant PBQ, State/History/
  Capability, Intent→Authorization→Execution→Result. The P2/P3 workspace pattern (module file +
  page + nav + view-registry entry + conformance tests).
- **Business:** the certified voucher operations BO-01…BO-05 (payment kind) and the certified
  expense classification model (`MODEL2` events, already used by the reclassify flow).
- **Operational:** the existing certified payment flows (`savePay` / `editPay` / `updatePay` /
  `deletePay` / `openReclassify('payment')`) and the printed voucher (`buildPayVoucher`).
- **Frozen & untouched:** Accounting Constitution (P0), Business Contracts / P1-000 Part A, FIN2,
  Runtime Guards, Golden Baseline.
- **Documented, deferred:** GAP-P1 (approval), GAP-P2 (liquidity), BO-06.

---

## 10 · Acceptance Criteria (for the eventual implementation phase)

1. One visually dominant Primary Business Question; other sections are supporting context (Rule 2).
2. State, History, and Capability are **strictly separated** — never mixed in one section (Rule 3).
3. **Every executable action invokes only BO-01/02/03/04/05** via its certified flow; the workspace
   calls no BO directly, holds no accounting/correction logic, and mutates no state.
4. Rule 4 honored: Intent → Authorization → Execution (certified BO) → Result (certified read model).
   Illegitimate operations remain **visible but disabled with a business reason**.
5. **Every displayed value originates from a certified read model** and tracks it (read-through; no
   cached or duplicated computation). Outflow totals equal the certified debit figures.
6. Authority gating: non-`write` cannot issue; non-`admin` cannot edit/cancel/correct.
7. **Golden constitutional baseline 12/12 unchanged**; P0/P1/P2/P3 guarantees and Business
   Contracts remain valid; E2E acceptance remains green.
8. A dedicated conformance test proves 1–7 for each slice (as with P2/P3).

---

## 11 · Implementation Roadmap (proposed future slices — none built under P4-000)

> Each slice is a separate OWNER ENGINEERING ORDER; nothing is implemented by this specification.
> The roadmap mirrors P3 exactly (the proven outflow-symmetric path).

- **P4-S1 · Payment State + History (read-only).** A dedicated workspace: Payment Summary (total
  disbursed, today, per-fund outflow, current liquidity) as **State**, and the certified payment
  ledger + timeline as **History**. Pure read over `FIN.fundLedger(...,'dr')` + balances.
- **P4-S2 · Core Capability.** Issue (BO-01), edit (BO-02), cancel (BO-03) a payment directly from
  the workspace — legitimacy-gated, each routing to its certified flow. Hero elevates the
  operational Primary Business Question.
- **P4-S3 · Advanced corrections.** Reclassify (BO-04) and split/move (BO-05) from the workspace.
  Completes the payment-voucher lifecycle.

**Deferred, gated (NOT in the base roadmap):**
- **P4-Sx · Approval workflow (GAP-P1)** — only if the owner approves a new gated Business
  Operation under a Part A amendment.

---

## 12 · Completion Boundary

The Payment Voucher Workspace is **complete for the current roadmap** when **P4-S1 + P4-S2 + P4-S3**
are delivered and verified:

- the workspace presents Payment State + History and executes **issue / edit / cancel /
  reclassify / split** exclusively through BO-01…BO-05;
- it contains no accounting or correction logic and no second source of truth; every value comes
  from certified read models;
- GOV-WS-01 (Rules 1–4) is fully respected and the Golden Baseline is unchanged.

**Explicitly outside the completion boundary** (each a separate Business Module / Part A decision):
the **approval workflow (GAP-P1)** and the **liquidity/budget guard (GAP-P2)**. Reaching the
completion boundary closes P4; any further capability is a new decision, not a P4 extension.

---

## Recommendation

Proceed with the **Payment Voucher Workspace** as the P4 module, built as the outflow mirror of the
P3 Collection workspace along the roadmap **P4-S1 (visibility) → P4-S2 (capability) → P4-S3
(corrections)**, reusing the already-certified BO-01…BO-05 and the certified debit read model. The
approval workflow and liquidity guard are recorded as genuine gaps for separate, gated decisions.

*Specification only — no implementation begins until P4-000 is reviewed, approved, and frozen.*
