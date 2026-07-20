<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     Ratified v1.0. Immutable. Never re-edited in place. A future change is issued
     as a NEW version (P1-000 v1.1, …) alongside this one, preserving the chain.
     PART A (Business Contract) is the frozen commitment. PART B (Current Certified
     Implementation) is a dated snapshot of how the contract is met today and may
     change WITHOUT re-freezing PART A — an implementation change that keeps every
     PART A guarantee is not a contract change.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P1‑000 — Business Operations Specification

**Document ID:** P1‑000
**Phase:** P1 — Business Operations Foundation
**Version:** 1.0 (FROZEN)
**Status:** RATIFIED · FROZEN
**Built on baseline:** `main` @ `1eca2ce` (first constitutionally‑certified accounting baseline)
**Design constraint:** the frozen Accounting Constitution (GOV‑CONST‑01) — never modified by P1.

> **Ratification note.** Approved with the two mandatory edits applied: (1) the **Business
> Contract (Part A)** is separated from the **Current Certified Implementation (Part B)**;
> (2) an **Ownership Matrix** (§A.3) is added. BO‑06 remains deferred. Implementation proceeds
> in the approved slices (§C).

---

## Structure & reading rule

- **Part A — Business Contract (frozen).** What each operation *guarantees*: responsibility,
  authority level, inputs/outputs, preconditions/postconditions, lifecycle, ownership, and
  constitutional relationship. This is implementation‑independent and is the ratified commitment.
- **Part B — Current Certified Implementation (dated snapshot, mutable).** *How* the contract is
  met today (the concrete function / RPC / guard), as of baseline `1eca2ce`. Part B may change
  without re‑freezing Part A, **provided every Part A guarantee still holds**.

The reading rule: **if Part A and Part B ever disagree, Part A governs** and Part B is corrected.

---

# PART A — BUSINESS CONTRACT (frozen)

## A.1 · Operation contract shape

Every Business Operation obeys one uniform contract:

```
Authority gate  →  Preconditions  →  Certified accounting core  →  Postconditions  →  Immutable history
 (execution      (all must hold,      (the operation delegates      (constitutional     (version snapshot
  authority)       else fail‑closed)    money work; never re‑        invariants that      + audit: who/when/
                                        implements accounting)        must hold after)     why)
```

- **Fail‑closed:** if any precondition or the classification model is unavailable, the operation
  aborts with an explicit reason and **no state changes**.
- **No bypass:** money‑critical postconditions are enforced by the runtime guards **before commit**
  (Detect → Reject). No operation may reach persistent state through an unguarded path.
- **Immutable history:** every state transition appends a `voucher_versions` snapshot and an audit entry.

## A.2 · Voucher lifecycle model

```
        create ──▶ ACTIVE ──edit──▶ ACTIVE′            (version n+1)
                     │   ──reclassify──▶ ACTIVE′        (classification changed)
                     │   ──split/move──▶ ACTIVE(reduced) + NEW linked ACTIVE child
                     └── cancel ──▶ CANCELLED (terminal for money; history retained)
```

- Every transition **appends**; nothing is rewritten (Law 5). A CANCELLED voucher is excluded from
  all calculations but remains fully reconstructible (Law 6). A voucher in a **locked** fiscal year
  admits **no** transition (Law 11).

## A.3 · Ownership Matrix

Ownership is separated so no single layer owns a concern it should not. For every operation:

| Operation | Business Owner (accountable) | Execution Authority | Accounting‑Correctness Owner | History / Audit Owner |
|-----------|------------------------------|---------------------|------------------------------|-----------------------|
| BO‑01 Create Voucher | Finance Operations | Authorized Operator (write) | Certified Accounting Core | Immutable History |
| BO‑02 Edit Voucher | Finance Administrator | Administrator | Certified Accounting Core | Immutable History |
| BO‑03 Cancel Voucher | Finance Administrator | Administrator | Certified Accounting Core | Immutable History |
| BO‑04 Reclassify (full) | Finance Administrator | Administrator | Certified Accounting Core + Classification Model | Immutable History |
| BO‑05 Split / Move | Finance Administrator | Administrator | Certified Accounting Core + Runtime Guards | Immutable History |
| BO‑06 Settle Deficit *(deferred)* | Finance Administrator | Administrator | Runtime Guard (operation‑level, future) | Immutable History |
| BO‑07 Create Member | Membership Administration | Administrator | Certified Accounting Core | Immutable History |
| BO‑08/09 Edit / Cancel Member | Membership Administration | Administrator | Certified Accounting Core | Immutable History |
| BO‑10 Apply Annual Dues | Finance Administration | Administrator | Certified Accounting Core | Immutable History |

- **Business Owner** — accountable for *whether/why* the operation is performed (org responsibility).
- **Execution Authority** — the permission required to perform it (**Authorized Operator** = data‑entry
  write right; **Administrator** = governed‑mutation right).
- **Accounting‑Correctness Owner** — owns *that the numbers are right*: the certified engine and, where
  money moves under risk, the runtime guards. **Business roles never own accounting correctness.**
- **History / Audit Owner** — owns the immutable record of the transition.

## A.4 · Operation contracts

Each contract below is implementation‑independent. (Concrete bindings: Part B.)

### BO‑01 · Create Voucher (Receipt / Payment)
- **Responsibility:** record a new receipt/payment as a fully classified accounting event.
- **Authority:** Authorized Operator.
- **Inputs:** amount (native + currency + rate), date, party, **explicit classification**
  (movement_type + destination + reason), notes.
- **Preconditions:** amount > 0; date not in a locked year (L11); classification is an explicit,
  valid event with a valid destination — never guessed (L4); a fresh unique voucher number (L12).
- **Lifecycle:** (none) → ACTIVE (v1).
- **Postconditions:** one persisted, classified voucher; target treasury reflects the movement;
  number unique; value conserved (L1).
- **Constitution:** L1, L4, L8, L11, L12.
- **Acceptance:** classified, unique, conserving; appears in the right treasury/ledger; no read‑time inference.

### BO‑02 · Edit Voucher
- **Responsibility:** change non‑classification fields (amount / notes) of an active voucher.
- **Authority:** Administrator. **Mandatory reason.**
- **Preconditions:** active; not locked (L11); reason present.
- **Lifecycle:** ACTIVE → ACTIVE′ (v n+1).
- **Postconditions:** updated voucher; immutable pre/post snapshot; v1 baseline backfilled on first
  versioning (L5/L6). Classification fields are **not** editable here (that is BO‑04).
- **Constitution:** L5, L6, L11.
- **Acceptance:** the change is reflected wherever it is derived; full history reconstructible.

### BO‑03 · Cancel Voucher
- **Responsibility:** void an active voucher while preserving its complete history.
- **Authority:** Administrator.
- **Preconditions:** active; not locked (L11).
- **Lifecycle:** ACTIVE → CANCELLED (v n+1).
- **Postconditions:** excluded from all calculations; immutable cancellation snapshot (who/when/why)
  + v1 baseline — the transition is reconstructible.
- **Constitution:** L5, L6, L11.
- **Acceptance:** cancellation always yields a snapshot; balances drop the voucher; history intact.

### BO‑04 · Reclassify Voucher (full)
- **Responsibility:** correct a voucher's whole‑amount classification without changing the amount.
- **Authority:** Administrator. **Mandatory reason.**
- **Preconditions:** active; not locked (L11); new movement_type is a valid model event; destination
  valid for it (L4 — fail‑closed if the model is unavailable).
- **Lifecycle:** ACTIVE → ACTIVE′ (classification changed).
- **Postconditions:** previous + new classification kept as an immutable snapshot; treasuries recomputed;
  amount unchanged (L1).
- **Constitution:** L1, L4, L5, L6, L8, L11.
- **Acceptance:** explicit, audited reclassification; conservation unchanged.

### BO‑05 · Split / Move Voucher (partial reclassification)
- **Responsibility:** move a portion of a voucher to a new classification; the original is reduced and a
  NEW linked child carries the moved portion, conserving value in every currency.
- **Authority:** Administrator. **Mandatory reason.**
- **Preconditions:** parent active; not locked; 0 < portion < full; new classification valid (L4).
- **Lifecycle:** parent → ACTIVE(reduced) **and** NEW linked child ACTIVE (v1), atomically.
- **Postconditions (guarded before commit):** `parent(before) = child + remaining` in native **and** ILS
  (L10, L1); `child_ILS = native × rate` (L3); a deficit‑directed child is > 0 (L9); parent version
  snapshot + v1 baseline recorded (L5, L6). Any breach is **rejected with full rollback** (L7).
- **Constitution:** L1, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12.
- **Acceptance:** exact conservation; a conservation/exactness/derivation/deficit breach cannot commit;
  child unique and linked; history reconstructible.

### BO‑06 · Settle Historical Deficit  *(DEFERRED — outside the schedule)*
- **Responsibility:** record a settlement (cash out of the deficit treasury to pay historical creditors),
  reducing the remaining deficit toward zero.
- **Authority:** Administrator.
- **Preconditions (contract):** amount > 0; **may not exceed the remaining deficit** (L9 — never a surplus).
- **Postconditions:** remaining deficit reduced toward zero, never below it (L9).
- **Constitution:** L1, L4, L7, L8, L9, L11.
- **Deferral (owner‑approved):** no creation path exists today (V5 closed by constitutional proof). This
  operation stays **off the schedule until a real business trigger requires it**. When built, its bound is
  an **operation‑level Detect → Reject guard using the client‑derived remaining deficit — no server‑side
  aggregate re‑derivation** (V5 ruling).

### BO‑07 · Create Member (+ subscription schedule)
- **Responsibility:** create a member and all its subscription rows atomically (no NoSchedule state).
- **Authority:** Administrator.
- **Postconditions:** member + every schedule row committed together or not at all (L7); subscription
  `paid` keeps its single source and `balance = due − paid` (L3).
- **Constitution:** L3, L7.
- **Acceptance:** all‑or‑nothing creation; schedule consistent.

### BO‑08 · Edit Member / BO‑09 · Cancel Member
- **Responsibility:** amend or deactivate a member record.
- **Authority:** Administrator.
- **Postconditions:** change is traceable; no second source for subscription paid (L3, L5, L6).
- **Constitution:** L3, L5, L6.

### BO‑10 · Apply Annual Dues (subscription generation)
- **Responsibility:** bill a year's dues by generating each eligible member's subscription row.
- **Authority:** Administrator.
- **Postconditions:** each eligible member gets exactly one schedule row; `balance = due − paid` holds
  and the override authority stays disabled (L3).
- **Constitution:** L3.
- **Acceptance:** one row per eligible member; derived balance holds.

## A.5 · Constitutional non‑conflict matrix

"●" = the operation actively upholds that law. No operation weakens a guarantee, bypasses a guard, or
reopens a closed register item.

| Op | L1 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 | L11 | L12 |
|----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| BO‑01 Create        | ● |   | ● |   |   |   | ● |   |   | ● | ● |
| BO‑02 Edit          | ● |   |   | ● | ● |   |   |   |   | ● |   |
| BO‑03 Cancel        | ● |   |   | ● | ● |   |   |   |   | ● |   |
| BO‑04 Reclassify    | ● |   | ● | ● | ● |   | ● |   |   | ● |   |
| BO‑05 Split/Move    | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| BO‑06 Settle *(def)*| ● |   | ● |   |   | ● | ● | ● |   | ● |   |
| BO‑07 Create Member |   | ● |   |   |   | ● |   |   |   |   |   |
| BO‑08/09 Member     |   | ● |   | ● | ● |   |   |   |   |   |   |
| BO‑10 Annual Dues   |   | ● |   |   |   |   |   |   |   |   |   |

*(L2 Derivation is a system‑wide invariant of the certified core, upheld under every operation by the
golden master; it is not owned by any single operation.)*

---

# PART B — CURRENT CERTIFIED IMPLEMENTATION (snapshot @ `1eca2ce`, mutable)

How each contract is met **today**. This table may change without re‑freezing Part A, as long as every
Part A guarantee still holds and the compliance suite stays green.

| Operation | Current binding | Certified mechanism |
|-----------|-----------------|---------------------|
| BO‑01 Create | `saveRec` / `savePay` (insert) · `can.write()` | classification + uniqueness (V4) |
| BO‑02 Edit | `updateRec` / `updatePay` + `recordVoucherVersion` · `can.admin()` | versioning (V8 pattern) |
| BO‑03 Cancel | `deleteRec` / `deletePay` + `recordVoucherVersion` · `can.admin()` | cancellation snapshot (V8) |
| BO‑04 Reclassify | `reclassifyVoucher` (full) / `doReclassify` · `can.admin()` | classification model (V6/MODEL2) |
| BO‑05 Split/Move | `reclassifyVoucher` (split) → **`reclassify_split_atomic`** · `can.admin()` | atomicity (V1) + runtime guards (V9) |
| BO‑06 Settle *(deferred)* | — none — | (future operation‑level guard; V5 ruling) |
| BO‑07 Create Member | `saveMember` → **`create_member_atomic`** · `can.admin()` | atomicity (V2), single source (V3) |
| BO‑08/09 Member | `updateMember` / `deleteMember` · `can.admin()` | single source (V3) |
| BO‑10 Annual Dues | `applyAnnualDue` · `can.admin()` | derived balance constraints (V3) |

---

# PART C — IMPLEMENTATION SCHEDULE (owner‑approved slices)

Each slice is independently approvable and testable, and delivers complete operational value on top of the
certified baseline.

| Slice | Operations | Theme |
|-------|-----------|-------|
| **Slice 1** | BO‑01, BO‑02, BO‑03 | Core voucher lifecycle (create · edit · cancel) |
| **Slice 2** | BO‑04, BO‑05 | Reclassification & split / move |
| **Slice 3** | BO‑07, BO‑08, BO‑09, BO‑10 | Member & annual‑dues lifecycle |
| **(off‑schedule)** | BO‑06 | Deferred until a real business trigger requires it |

Per‑slice acceptance (build time): golden baseline **unchanged** (or formally re‑baselined); every
compliance test still passes; runtime guards still reject violations; each operation matches its Part A contract.

---

## Governance

- **Part A is frozen at v1.0.** A change to a contract issues a **new version** (P1‑000 v1.1, …); it is never
  edited in place. Part B evolves freely as long as Part A holds.
- **Implementation begins with Slice 1 (BO‑01, BO‑02, BO‑03)** under the P1 intake protocol, only on the
  owner's order.
- If any operation ever requires touching a **frozen P0 artifact**, a **new certificate** is issued — the
  frozen document is never edited.

---

*Ratified v1.0. Part A is the standing business contract over the certified accounting baseline.*
