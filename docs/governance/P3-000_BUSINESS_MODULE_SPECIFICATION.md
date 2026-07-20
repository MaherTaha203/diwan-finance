<!-- ═══════════════════════════════════════════════════════════════════════════
     P3-000 — Business Module Selection & Functional Specification
     Specification phase only. No code, no UI, no Business Operation, no Read
     Model, no Accounting Core / Business Contract / GOV change is made by this
     document. It evaluates the remaining business domains and recommends ONE
     module as the next architectural priority, with an execution roadmap.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P3-000 · Business Module Selection & Functional Specification

**Document ID:** GOV-P3-SPEC-01
**Phase:** P3 · Task P3-000
**Status:** DRAFT — for owner decision (selection + scope approval)
**Date:** 2026-07-20
**Predecessors:** P0 (Constitution, frozen) · P1 (Business Operations, frozen) · P2 (Member Financial Lifecycle → Operational Workspace, frozen) · GOV-WS-01 v1.1 (Workspace Design Rules).

> **Recommendation up front:** the next Business Module should be the
> **Collection Operations Workspace (Receipt Vouchers · سندات القبض)** — the daily
> money-in operation. It has the highest daily business value, the deepest reuse of
> already-certified Business Operations (BO-01…BO-05), and it is the natural
> *operational* successor to the Member workspace. Full justification below.

---

## 0 · Method

Each remaining domain is scored against the owner's objective criteria
(daily business value · dependency on certified BOs · architectural cohesion ·
user-workflow impact · readiness · risk · future extensibility). "Readiness"
means *how much of the certified foundation already exists* — a high-readiness
module needs **no** new accounting logic, no new BO, and no new read model. The
winner must also be a genuine **Operational Workspace** under GOV-WS-01: it must
have a real **Capability** layer (operations to execute), not only State + History.

---

## 1 · Business Objective

Deliver the second Operational Business Workspace of Diwan: the place where the
treasurer performs the **daily money-in operation** — issuing, correcting, and
reclassifying **receipt vouchers** (member dues payments, cash donations, Diwan
operational income) — entirely by orchestrating the certified Business Operations
and certified read models, with no accounting logic in the workspace.

**Primary Business Question it answers:**
> *"What money has come in, and what may I legitimately record or correct right now?"*

---

## 2 · Why this module should come next

1. **Highest daily business value.** Collecting money is the single most frequent
   operational act in a community fund — receipts are issued far more often than any
   other transaction. This is the treasurer's everyday job.
2. **Deepest reuse of the certified foundation.** The entire voucher-lifecycle BO
   set already exists and is certified: **BO-01 Create · BO-02 Edit · BO-03 Cancel ·
   BO-04 Reclassify · BO-05 Split/Move**. No new BO is required. This gives the
   richest possible **Capability** layer under GOV-WS-01 Rule 3 — a *true*
   operational workspace, not an observation screen.
3. **Architectural continuity.** P2 built the first Operational Workspace on the
   read-heavy Member domain. Receipts is the **write-side counterpart** that
   exercises the BO layer exactly as it was designed to be used, proving the pattern
   generalises from a read-centric to a write-centric module.
4. **Readiness is high.** Receipt list pages, the certified `fundLedger` read model,
   and the printed receipt voucher (`buildRecVoucher`) already exist as plumbing.
   The work is *orchestration and workspace composition*, not new capability.
5. **Low, bounded risk.** Every operation it orchestrates is already certified and
   covered by the golden baseline. The one real dependency (GAP-1, §9) is explicitly
   kept out of scope, exactly as P2 kept payments/allocation out of scope.
6. **It seeds a reusable template.** Once the Receipt workspace exists, the
   **Payment Voucher** workspace is its mirror and can reuse the same pattern — a
   clean, compounding roadmap (§12).

---

## 3 · Comparison with alternative modules

Scored **High / Med / Low** against the owner's criteria. "BO dependency" = how much
it uses the *certified write* layer (higher = more genuinely operational).

| Domain | Daily value | Uses certified BOs | Cohesion | Workflow impact | Readiness | Risk | Extensibility | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Receipt Vouchers (Collection)** | **High** | **High** — BO-01/02/03/04/05 | **High** | **High** — where money-in work is done | **High** | **Low–Med** | **High** — templates Payments | ★ **RECOMMENDED** |
| Payment Vouchers (Disbursement) | Med–High | High — BO-01/02/03 | High | Med — fewer outflows than inflows | High | Low–Med | High | Strong **follow-on** (mirror of Receipts) |
| Treasury / Cash Position | High (most-asked *question*) | **Low** — reads balances; barely writes | High | **Low** — observation, not execution | High | Low | Med | Later **observability** module — thin Capability layer under Rule 3 |
| Cash Management / Reconciliation | Med | Low | Med | Med | **Low** — needs a cash-count/reconcile concept not yet modelled | Med | Med | Premature — depends on Treasury first |
| Financial Reports | Med | Low (read-only) | Med | Low | High (statements already unified) | Low | Low | Largely delivered already; not a new workspace |
| Settings | Low | None | Low | Low | High | Low | Low | Not an operational workspace |
| Audit / Activity | Med (governance) | None (read-only) | Med | Low | High (log exists) | Low | Med | Observability; not daily operational work |

**Why not Treasury (the tempting second place).** Treasury answers arguably the
single most-asked *question* ("how much do we have, and where?"), but it is
**predominantly observation** over already-certified balances — it barely touches
the write-BO layer. Under GOV-WS-01 Rule 3 its **Capability** layer would be nearly
empty, making it a State+History dashboard rather than an Operational Workspace. It
is the right *observability* module for a later phase, not the next *operational* one.

**Why not Payment Vouchers first.** It is an excellent module, but it is the
lower-frequency mirror of Receipts (a fund collects more often than it disburses).
Building Receipts first yields the reusable voucher-workspace pattern that Payments
then inherits at much lower cost.

---

## 4 · Business Scope

- A dedicated **Collection Operations Workspace** for receipt vouchers, composed
  under GOV-WS-01 (one dominant Primary Business Question; State / History /
  Capability strictly separated per Rule 3).
- **State** — the current money-in picture: period collections total, count, split
  by fund and by method; the receipt currently being worked.
- **History** — the certified receipt ledger (credit rows from `FIN.fundLedger`),
  including voucher versions where a receipt was edited/reclassified.
- **Capability** — legitimacy-gated operations, each routing to exactly one
  certified BO:
  - Issue a receipt → **BO-01**
  - Edit a receipt → **BO-02**
  - Cancel a receipt → **BO-03**
  - Reclassify a receipt (classification-only) → **BO-04**
  - Split / move a receipt (partial reclassification) → **BO-05**
- Covers the three certified receipt kinds already modelled: member dues payment,
  cash donation, Diwan operational income.
- Printed receipt voucher reused as-is (`buildRecVoucher`; signatures/QR/A4 intact).

---

## 5 · Out-of-Scope

- **GAP-1** — explicit payment→per-subscription-year allocation (§9). A member
  receipt stays a general BO-01 receipt; the workspace does **not** decide which
  year a payment settles. Documented dependency only; deferred to a future gated BO.
- **BO-06** — historical-deficit settlement. Remains deferred by prior decision.
- **Payment vouchers (disbursement)** — the mirror module; proposed as the P3
  follow-on, not this module.
- **No new Business Operation, no new Read Model, no Accounting Core change, no
  Business Contract change, no FIN2 change, no second source of truth, no accounting
  logic in the workspace.**
- Treasury/cash reconciliation, cross-fund analytics, reporting redesign.

---

## 6 · Business Questions the workspace must answer

**Primary (dominant focal point):**
> *"What money has come in, and what may I legitimately record or correct now?"*

**Supporting (each in its own State / History / Capability section, never mixed):**
- **State:** How much was collected in this period, by fund and by method? What is
  the fund position right after these collections?
- **History:** Which receipts were issued, to/from whom, and were any edited,
  cancelled, or reclassified (voucher versions)?
- **Capability:** For the selected context, what may I legitimately do now — issue,
  edit, cancel, reclassify, or split a receipt — and, if not, why not?

---

## 7 · Candidate Business Operations used (all already certified — none new)

| BO | Name | Role in this module | Authority |
|---|---|---|---|
| **BO-01** | Create Voucher | Issue a new receipt (member payment / cash donation / operational income) | write |
| **BO-02** | Edit Voucher | Correct a receipt's editable fields (version-bumped, immutable history) | admin |
| **BO-03** | Cancel Voucher | Cancel a receipt (immutable cancellation history) | admin |
| **BO-04** | Reclassify Voucher | Change a receipt's classification only (no amount change) | admin |
| **BO-05** | Split / Move Voucher | Partial reclassification (atomic RPC) | admin |

No BO is created, modified, or extended by this module.

---

## 8 · Certified Read Models required (all already frozen — none new)

- `FIN.fundLedger(fund, from, to, type)` — the certified receipt/credit rows and
  running balances (History + collection totals).
- `FIN.foodBalance()` · `FIN.diwanBalance()` · `FIN.donBalance()` /
  `FinContract.treasuries` / `FinContract.balances` — fund position after collections
  (State).
- `FinContract.registers` (`cashDonationRegister`, `inkindRegister`) — donation
  classification context.
- `FIN.memberStatement(id)` / `FIN.balanceLabel` — member context when the receipt is
  a member dues payment (read-only; polarity/label only).

No read model is created or redesigned by this module.

---

## 9 · Gap Analysis

| # | Gap | Impact on this module | Disposition |
|---|---|---|---|
| **GAP-1** | A member dues payment (BO-01 receipt) is **not** explicitly allocated to specific subscription years; the core credits the member's overall balance. | The workspace can record and display collections and the member's overall balance, but **cannot** present "this payment settled year 2024" without a new allocation operation. | **Out of scope.** Operate at the voucher level (exactly as P2 did). Kept as a documented dependency for a future *gated* BO under a Part A amendment — owner decision only. |
| G-2 | No "outstanding-dues picker" at receipt time | Cannot pre-fill which years a payment targets | Follows GAP-1; out of scope |
| G-3 | Cash reconciliation / physical cash count is not modelled | Not needed for receipt issuance | Belongs to a future Treasury/Cash module |

**Everything else the module needs is fully certified and ready:** create / edit /
cancel / reclassify / split, the receipt ledger, fund balances, and the printed
voucher. No accounting gap blocks this module.

---

## 10 · Dependencies

- **Certified:** BO-01…BO-05 (operations.js) · `FIN.fundLedger` and fund-balance read
  models · printed voucher builder `buildRecVoucher` · the audit/immutable-history
  machinery already enforced by the BO layer.
- **Governance:** GOV-WS-01 v1.1 (Rules 1–3) — layering, one dominant Primary
  Business Question, and State/History/Capability separation.
- **Frozen and untouched:** Accounting Constitution (P0), Business Contracts /
  P1-000 Part A, FIN2, Runtime Guards, Golden Baseline.
- **Documented, deferred:** GAP-1, BO-06.

---

## 11 · Acceptance Criteria (for the eventual implementation phase)

1. The workspace presents **one visually dominant Primary Business Question**;
   remaining sections are supporting context (GOV-WS-01 Rule 2).
2. **State, History, and Capability are strictly separated** — never mixed inside a
   single section (Rule 3).
3. **Every action routes through exactly one certified Business Operation** (BO-01…05);
   no direct writes, no new operation, no bypass.
4. **Every displayed value originates from a certified read model** and tracks it
   (read-through; no cached or second computation).
5. **No accounting logic** exists in the workspace; no second source of truth.
6. Authority gating: non-privileged users get read-only; each capability shows a
   legitimacy reason when unavailable.
7. **Golden constitutional baseline 12/12 unchanged**; P1 Business Contracts and P0
   guarantees remain valid; E2E acceptance remains green.
8. A dedicated conformance test proves 1–7 (as with the P2 slice tests).

---

## 12 · Implementation Slice Proposal (for a future, separately-authorised order)

> Each slice is a separate OWNER ENGINEERING ORDER; nothing is built under P3-000.

- **P3-S1 · Collection State + History (read-only projection).** A dedicated
  workspace surface: period collections (total, count, by fund, by method) as
  **State**, and the certified receipt ledger as **History**. Pure orchestration
  over `FIN.fundLedger` + balances. Mirrors P2-S1's read-only start.
- **P3-S2 · Core Capability.** Issue (BO-01), edit (BO-02), cancel (BO-03) a receipt
  directly from the workspace — legitimacy-gated, each routing to its certified BO,
  with in-place refresh. Establishes the Capability layer.
- **P3-S3 · Advanced corrections.** Reclassify (BO-04) and split/move (BO-05) from
  the workspace. Completes the voucher lifecycle; closes the operational surface.
- **Follow-on (P3′ / future phase):** **Payment Voucher (disbursement) workspace** —
  the mirror module, reusing this exact pattern at low cost.

GAP-1 and BO-06 remain explicitly deferred throughout; if a business trigger ever
requires allocation or deficit settlement, each is opened as its own gated decision.

---

## Recommendation (single next module)

**Build the Collection Operations Workspace (Receipt Vouchers) next.** It is the
highest-value daily operation, the deepest reuse of the already-certified BO layer,
the truest *operational* successor to the Member workspace under GOV-WS-01, and the
lowest-risk path that also seeds the reusable voucher-workspace template for
Payments. Treasury is recommended as a *later* observability module; Payment
Vouchers as the immediate follow-on.

*Specification only — awaiting the owner's module selection and scope approval
before any P3 implementation order is issued.*
