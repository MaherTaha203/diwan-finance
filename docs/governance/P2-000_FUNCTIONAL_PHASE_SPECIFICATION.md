<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     Ratified v1.0. Immutable; never re-edited in place. A future change is issued as
     a NEW version (P2-000 v1.1, …). Implementation slices are gated separately by
     owner order and measured against this specification.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P2‑000 — Functional Phase Specification

**Document ID:** P2‑000
**Phase:** P2 — First Business Module (Member Financial Lifecycle)
**Version:** 1.0 (FROZEN)
**Status:** RATIFIED · APPROVED — implementation proceeds by slice under owner order
**Built on:** the Operational Baseline `d35b2c5` (P1 Business Operations) over the certified
constitutional baseline `1eca2ce` (P0).
**Design constraints (frozen, not modified by P2):** Accounting Constitution, Certified
Accounting Core, Runtime Guards, Business Contracts (P1‑000 Part A), Business Operations.

> **Owner decisions (ratified).** P2‑000 approved. First business module = **Member Financial
> Lifecycle**. **BO‑06** remains deferred. **GAP‑1** is **out of P2 scope — documented only**
> (§6). Implementation opens at **P2‑S1**, confined to the narrow scope in §9.

> This is a **specification, not code**. P2 is a new phase — not a continuation of P1. Its
> purpose is to design the first complete **Business Module** built on the certified Business
> Operations layer. Each implementation slice is gated by a separate owner order.

---

## 0 · Module Selection Analysis (decision, not assumption)

The candidate module (Member Financial Lifecycle) is **not assumed correct**. It is chosen by
comparison against the realistic alternatives, on two axes the owner named — **user impact**
(does it deliver a complete business outcome?) and **cohesion** (does it build directly on
what P0/P1 certified?) — plus a P2‑specific axis: **does it exercise the Business Operations
layer** (P2's whole premise is building functional modules *on* that layer, not beside it).

| Candidate | Complete user outcome? | Cohesion with P0/P1 | Exercises BO layer | Standalone value | New gaps |
|-----------|:----------------------:|:-------------------:|:------------------:|:----------------:|:--------:|
| **Member Financial Lifecycle** | **High** — the diwan's core job: onboard → bill → collect → see balance → delinquency | **Highest** — direct consumer of V2 (member creation), V3 (subscription single source), BO‑07/08/09/10 **and** the certified member‑statement read model | **High** — composes BO‑07/08/09/10 + BO‑01/02/03 + reads | **Complete** | one, well‑bounded |
| Receipt Voucher Cycle | Medium — a *means*, not an outcome (a voucher serves dues/donations) | High (BO‑01…BO‑05) | High | Partial — plumbing | none |
| Treasury / Fund View | Medium — mostly **observation** of already‑certified balances | Medium — reads FIN2; barely uses the *write* BO layer | **Low** | Reporting only | none |
| Subscription Management | Medium — a **subset** of the member lifecycle (billing without collection/statement) | High (BO‑10 + reads) | Medium | Partial | shares the same gap |

**Conclusion — Member Financial Lifecycle is the correct first P2 module.** Reasoning:

1. **User impact.** The system exists to track each family member's financial standing with the
   fund. This module is the actual job‑to‑be‑done for the treasurer (onboard, bill, collect, see
   who owes) — the highest‑value complete outcome available.
2. **Cohesion.** It is the direct consumer of exactly what P0/P1 invested in: atomic member +
   schedule creation (V2), single‑source subscription paid/derived balance (V3), the member‑
   lifecycle operations (BO‑07…BO‑10), and the certified member‑statement read model (the single
   source for a member's balance). It *activates* that investment rather than opening new ground.
3. **It exercises the BO layer** more completely than any alternative, and it **subsumes** the
   Receipt Voucher Cycle as an internal capability (collecting a member payment *is* BO‑01 within
   the journey), so choosing it does not forgo the voucher work — it uses it in context.
4. **The alternatives are weaker *first* choices:** the Voucher Cycle is horizontal plumbing with
   lower standalone value; Treasury is predominantly read/reporting over already‑certified numbers
   and under‑exercises the write BO layer; Subscription Management is a proper subset that would
   ship a partial journey. Each is a good *later* module, not the first complete one.
5. It **productively surfaces exactly one bounded gap** (see §6) — the right outcome for a phase
   spec — without requiring it to be designed now.

---

## 1 · Business Objective

**Value:** give the treasurer one coherent place to manage a family member's entire financial
relationship with the fund — enroll the member with an opening position, bill the annual dues,
record and correct the member's payments, and see an accurate, reconstructible account statement
and delinquency status at any time.

**Why next:** P0 proved the numbers are correct; P1 made the operations safe and formal. P2 turns
that foundation into the **first end‑to‑end business capability** — and it is the capability the
organization uses every day. It builds strictly on certified operations and the certified read
model, so it delivers user‑facing value with the lowest architectural risk.

---

## 2 · Scope

**In scope (P2):**
- Member onboarding with an opening financial position and an automatically generated dues schedule.
- Annual dues billing (obligation generation) for a year.
- Recording a member's payment toward the fund, and correcting/cancelling a mis‑recorded payment.
- Viewing the member's account statement (opening, dues, payments, running and final balance) and
  the member's delinquency status — served by the **certified read model** (single source).
- Member data correction and deactivation.

**Explicitly out of scope (P2):**
- Non‑member and general donation lifecycle (food/deficit/diwan donations) — a later module.
- Treasury / fund‑balance module and cross‑fund reporting — a later observability module.
- Expense / payment‑out (disbursement) lifecycle — a later module.
- Historical‑deficit **settlement** (BO‑06) — remains deferred by prior decision.
- Reservations, user/role administration, backup/export — out.
- **Any new accounting logic or any new/modified Business Operation** — P2 is specification‑only;
  gaps are *identified*, never designed or built here.
- Any change to the constitution, FIN2, runtime guards, Part A, or frozen governance artifacts.

---

## 3 · User Journey (no implementation)

1. **Enroll.** The treasurer adds a new family member, entering the member's opening balance
   (a net owed amount, or a credit) and the year from which the member becomes active. The system
   presents the member with a dues schedule for the active years.
2. **Bill.** At the start of a subscription year, the treasurer applies that year's dues; every
   eligible member now shows the year's obligation on their account.
3. **Collect.** When a member pays, the treasurer records the payment against the member. The
   member's account immediately reflects the payment and a reduced outstanding balance.
4. **Observe.** At any time the treasurer opens a member's account and sees the opening position,
   each year's dues, each payment, the running balance, and the final balance — with a printable
   statement. Across members, the treasurer sees who is delinquent and by how much.
5. **Correct.** If a payment was entered wrongly, the treasurer edits or cancels it with a reason;
   the account and history update, and the prior state remains reconstructible.
6. **Maintain.** The treasurer corrects a member's details, or deactivates a member who has left —
   without losing the member's history.

---

## 4 · Use Cases

**Primary**
- UC‑1 Enroll a member (with opening position + dues schedule).
- UC‑2 Apply a year's annual dues to all eligible members.
- UC‑3 Record a member's payment.
- UC‑4 View a member's account statement.
- UC‑5 View delinquency / debtors across members.

**Alternative**
- UC‑6 Enroll a member with an opening **credit** (net negative opening).
- UC‑7 Record a payment that settles more than one year (allocation across obligations).
- UC‑8 Edit a member's details (name / phone / opening position / active‑from year).
- UC‑9 Deactivate a member who has left.
- UC‑10 Print / export a member's statement.

**Exceptional**
- UC‑11 Correct a mis‑entered payment amount (edit with reason).
- UC‑12 Cancel a payment recorded in error (with reason; history preserved).
- UC‑13 Correct a payment recorded under the wrong classification (reclassify).
- UC‑14 Move part of a payment to a different classification (split/move).
- UC‑15 Attempt an action in a locked fiscal year → refused.
- UC‑16 Attempt a duplicate member / an invalid amount / an unclassified payment → refused.

---

## 5 · Business Operations Mapping

*No new accounting logic. Certified Business Operations are used for every state change; the
certified read model (member statement / delinquency) serves every observation.*

| Use case | Business Operation(s) / certified capability |
|----------|----------------------------------------------|
| UC‑1 Enroll member | **BO‑07 Create Member** (member + dues schedule, atomic) |
| UC‑2 Apply annual dues | **BO‑10 Apply Annual Dues** (obligation‑only) |
| UC‑3 Record payment | **BO‑01 Create Voucher** (member receipt) *(see Gap §6 for explicit per‑year allocation)* |
| UC‑4 View statement | Certified **read model** (member statement) — single source; not a write op |
| UC‑5 View delinquency | Certified **read model** (delinquency/debtors) |
| UC‑6 Opening credit | **BO‑07** (opening position shaped by the certified caller) |
| UC‑7 Multi‑year payment | **BO‑01** + certified allocation in the accounting core *(see Gap §6)* |
| UC‑8 Edit member | **BO‑08 Edit Member** |
| UC‑9 Deactivate member | **BO‑09 Cancel Member** |
| UC‑10 Print/export statement | Read model + existing presentation (no BO) |
| UC‑11 Correct payment amount | **BO‑02 Edit Voucher** |
| UC‑12 Cancel payment | **BO‑03 Cancel Voucher** |
| UC‑13 Reclassify payment | **BO‑04 Reclassify Voucher** |
| UC‑14 Split/move payment | **BO‑05 Split / Move Voucher** (atomic, guarded) |
| UC‑15 Locked‑year refusal | Enforced inside every BO (precondition) |
| UC‑16 Duplicate/invalid/unclassified refusal | Enforced inside BO‑07 / BO‑01 (preconditions) |

---

## 6 · Gap Analysis (identify only — do NOT design or implement)

**GAP‑1 · Explicit “Record Member Payment allocated to obligations.”**
Today a member payment is recorded as a general member receipt (BO‑01); the accounting core credits
it to the member and the allocation across specific subscription years is a certified read‑time
derivation, while `paid_amount_ils` is the frozen migration snapshot governed as a single source by
V3. There is **no first‑class Business Operation that records a member payment and explicitly
associates it with the specific obligation year(s) it settles** as an event. UC‑3 and UC‑7 function
on existing operations, but an explicit allocation operation would make the payment→obligation link
a first‑class event rather than a derivation.

**Constraint on any future fill of GAP‑1 (identification only):** per the V3/V5 decisions, such an
operation must keep subscription *paid* **derived from events** — it must not create a second source
of truth, and it must not re‑derive aggregates server‑side in a way that violates Law 3. It is **not
designed here.** If the owner wants it, it is proposed as a new Business Operation under a P1‑000
Part A amendment (new version) and gated separately — never by modifying a frozen artifact.

No other gap is required for P2: onboarding (BO‑07), billing (BO‑10), correction (BO‑02/03/04/05),
maintenance (BO‑08/09), and all observation (read model) are already covered by certified capabilities.

---

## 7 · Acceptance Criteria (objective, measurable)

P2 is complete when:
1. Every primary use case (UC‑1…UC‑5) is executable end‑to‑end through certified Business Operations
   and the certified read model, with no new accounting logic introduced.
2. Every state‑changing use case routes through a Business Operation (no direct writes, no bypass of
   the operations layer or the runtime guards).
3. Member account statement and delinquency values equal the certified read model exactly (single
   source; no second computation introduced by P2).
4. Every exceptional case (UC‑11…UC‑16) behaves per the Business Operation contracts (fail‑closed:
   locked‑year / duplicate / invalid / unclassified are refused; corrections preserve history).
5. The **golden baseline remains unchanged** (or is re‑approved by explicit decision if a change is
   ever intended).
6. All P0 compliance tests and P1 slice‑conformance tests still pass; no P0/P1 register item reopened.
7. GAP‑1 is either (a) explicitly left to a future phase, or (b) filled only via an approved new
   Business Operation under a Part A amendment — never by touching a frozen artifact.

---

## 8 · Constitutional Review

- **Does not violate the Accounting Constitution.** P2 introduces no accounting rule or calculation;
  it composes certified operations (each already upholding the 12 Laws) and reads the single‑source
  member statement. Conservation, single‑source, explicit classification, immutable history,
  atomicity, locked‑period sanctity and identity uniqueness are all enforced by the operations/engine
  it reuses, unchanged.
- **Does not weaken Runtime Guards.** No guard is modified or bypassed; money‑critical actions
  (payment correction, split/move) run through the guarded operations (BO‑02/03/04/05, the atomic RPC
  under BO‑05), which continue to Detect → Reject.
- **Does not bypass Business Operations.** Every state change in P2 is a Business Operation call; the
  read model is used only for observation and creates no second source of truth (Law 3 preserved,
  V3 constraints intact).
- **Does not modify frozen governance artifacts.** The constitution, certificate, register, P1‑000
  Part A, and the completion report are untouched. GAP‑1, if ever filled, is a *new versioned* Part A
  amendment plus a new Business Operation — additive, never an in‑place edit of a frozen document.
- **BO‑06 remains deferred**; P2 does not activate historical‑deficit settlement.

---

## 9 · Phase Slicing (each slice delivers usable business value)

| Slice | Delivers | Uses | Standalone value |
|-------|----------|------|------------------|
| **P2‑S1 · Onboarding & Billing** *(scope confirmed narrow by owner)* | Enroll members (incl. opening credit), bill a year's dues, and view the member's **initial state** (opening + schedule). **Explicitly excludes** payment recording, corrections, and allocation. | BO‑07, BO‑10 + schedule/initial‑state read | The treasurer can enroll members and issue a year's obligations, and see the member's starting position |
| **P2‑S2 · Account & Delinquency** | The member account statement (print/export) and cross‑member delinquency/debtor view | Certified read model + existing presentation | The treasurer can see every member's balance and who owes — the daily reporting need |
| **P2‑S3 · Payment Recording & Corrections** | Record member payments and correct/cancel/reclassify/split them | BO‑01, BO‑02, BO‑03, BO‑04, BO‑05 | The treasurer can collect and correct payments end‑to‑end (with existing operations; GAP‑1 is a later refinement, not a blocker) |
| **(later, gated)** | Explicit payment→obligation allocation operation | *new BO under a Part A amendment* | Deferred — only if the owner approves filling GAP‑1 |

Each slice is independently approvable and testable and adds complete operational value on top of the
Operational Baseline. P2‑S3's value is deliverable with existing operations; GAP‑1 is explicitly a
future, separately‑gated refinement.

---

*Awaiting owner approval. On approval, implementation begins with P2‑S1 under the same intake
discipline used in P1 (contract‑first, certified‑path‑only, golden baseline unchanged), and any move
to fill GAP‑1 is raised separately as a new Business Operation — never as a change to a frozen artifact.*
