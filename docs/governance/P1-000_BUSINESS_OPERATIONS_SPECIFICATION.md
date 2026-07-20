# P1‑000 — Business Operations Specification

**Document ID:** P1‑000
**Phase:** P1 — Business Operations Foundation
**Version:** 0.1 (DRAFT — pending owner approval)
**Status:** AWAITING APPROVAL · no implementation begins until this document is approved
**Built on baseline:** `main` @ `1eca2ce` (first constitutionally‑certified accounting baseline)
**Design constraint:** the frozen Accounting Constitution (GOV‑CONST‑01) — never modified by P1.

> This is the first P1 deliverable. It is a **specification, not code**. It defines the
> formal Business Operations layer over the certified accounting core. Per the P1 order,
> implementation of the first operation begins **only after this document is approved**.

---

## 1 · Purpose

After P0, every **accounting law** is guaranteed by the engine. But the end user does not
operate on laws — they operate on **actions**: create a voucher, edit it, cancel it, move
part of it, reclassify it, settle a deficit. P1 turns the certified engine into a stable,
usable **Business Operations layer** in which every user action:

1. is one **formally defined operation** with a single responsibility;
2. has an explicit **lifecycle**, **preconditions**, and **postconditions**;
3. has an explicit **authority** (who may execute it);
4. routes **entirely through the certified accounting core** — never around it;
5. **cannot bypass any runtime guard** and **cannot violate any of the 12 Laws**.

P1 does **not** improve, redesign, or modify the engine, FIN2, the runtime guards, the
constitution, or the golden baseline. It is a layer **on top of** the certified core.

---

## 2 · Operation Model (common contract)

Every Business Operation obeys the same shape, so the layer is uniform and auditable:

```
Authority gate  →  Preconditions  →  Accounting‑core binding  →  Postconditions  →  Immutable history
   (can.*)          (must all hold)     (RPC / engine path)        (must all hold)     (version + audit)
```

- **Authority gate** — `can.write()` (data entry) or `can.admin()` (governed mutations).
- **Preconditions** — checked *before* any write; if any fails, the operation aborts with an
  explicit reason and **no state changes** (fail‑closed).
- **Accounting‑core binding** — the operation delegates the money‑moving work to the certified
  path (an atomic RPC and/or the frozen engine). It never re‑implements accounting math.
- **Postconditions** — the constitutional invariants that must hold after the operation; the
  runtime guards enforce the money‑critical ones **before commit** (Detect → Reject).
- **Immutable history** — every state transition writes an immutable `voucher_versions`
  snapshot (Law 5/6) and an audit‑log entry (who / when / why).

---

## 3 · Lifecycle Model (voucher)

```
              create (BO‑01)
                   │
                   ▼
              ┌──────────┐   edit (BO‑02)         ┌──────────┐
   (none) ───▶│  ACTIVE  │───────────────────────▶│  ACTIVE' │  (version n+1)
              └──────────┘   reclassify (BO‑04)    └──────────┘
                   │         split/move (BO‑05) ─▶ ACTIVE(reduced) + NEW linked ACTIVE child
                   │ cancel (BO‑03)
                   ▼
              ┌────────────┐
              │ CANCELLED  │  (is_deleted=true, immutable snapshot retained)
              └────────────┘
```

- Every transition **appends** an immutable version snapshot; nothing is rewritten (Law 5).
- A **CANCELLED** voucher is terminal for money purposes (excluded from every calculation) but
  its full history remains reconstructible (Law 6).
- A voucher dated inside a **locked fiscal year** admits **no** transition (Law 11).

---

## 4 · Operation Catalog

### Core voucher operations (the P1 focus)

#### BO‑01 · Create Voucher (Receipt / Payment)
- **Responsibility:** record a new receipt or payment as a fully classified accounting event.
- **Authority:** `can.write()`.
- **Inputs:** amount (native + currency + rate), date, party, **explicit classification**
  (movement_type + destination + reason), notes.
- **Preconditions:** amount > 0; date not in a locked year (Law 11); classification is an
  explicit MODEL2 event with a valid destination (Law 4 — never guessed); voucher number is
  freshly allocated and unique (Law 12).
- **Lifecycle:** (none) → **ACTIVE** (version 1).
- **Postconditions / outputs:** one persisted voucher; the target treasury reflects the new
  movement; the voucher number is unique; conservation holds (Law 1).
- **Engine binding:** `saveRec` / `savePay` → insert; balances read through FIN/FIN2.
- **Constitution:** Laws 1, 4, 8, 11, 12.
- **Acceptance:** created voucher is classified, unique, and conserves value; appears in the
  correct treasury/ledger with no read‑time inference.

#### BO‑02 · Edit Voucher
- **Responsibility:** change the non‑classification fields (amount / notes) of an active voucher.
- **Authority:** `can.admin()`. **Mandatory reason.**
- **Inputs:** voucher id, new amount, new notes, edit reason.
- **Preconditions:** voucher exists and is active; not in a locked year (Law 11); reason present.
- **Lifecycle:** ACTIVE → **ACTIVE′** (version n+1).
- **Postconditions / outputs:** updated voucher; an immutable pre/post snapshot recorded; the
  v1 baseline backfilled on first versioning (Law 5/6).
- **Engine binding:** `updateRec` / `updatePay` → update + `recordVoucherVersion`.
- **Constitution:** Laws 5, 6, 11 (classification fields are **not** editable here — that is BO‑04).
- **Acceptance:** amount change is reflected everywhere it is derived; full history reconstructible.

#### BO‑03 · Cancel Voucher
- **Responsibility:** void an active voucher while preserving its complete history.
- **Authority:** `can.admin()`.
- **Inputs:** voucher id.
- **Preconditions:** voucher exists and is active; not in a locked year (Law 11).
- **Lifecycle:** ACTIVE → **CANCELLED** (`is_deleted=true`, version n+1).
- **Postconditions / outputs:** voucher excluded from all calculations; an immutable cancellation
  snapshot recorded (who/when/why) plus the v1 baseline — the transition is reconstructible (V8).
- **Engine binding:** `deleteRec` / `deletePay` → update + `recordVoucherVersion` (`إلغاء`).
- **Constitution:** Laws 5, 6, 11.
- **Acceptance:** cancellation always yields a version snapshot; balances drop the voucher; history intact.

#### BO‑04 · Reclassify Voucher (full)
- **Responsibility:** correct the **classification** (movement_type / destination / source /
  reason / register) of an active voucher, whole‑amount, without changing the amount.
- **Authority:** `can.admin()`. **Mandatory reason.**
- **Inputs:** voucher id, new classification (validated against MODEL2), reason.
- **Preconditions:** voucher active; not in a locked year (Law 11); new movement_type is a valid
  MODEL2 event; destination valid for that event (Law 4 — fail‑closed if the model is unloaded).
- **Lifecycle:** ACTIVE → **ACTIVE′** (version n+1), classification changed.
- **Postconditions / outputs:** previous and new classification preserved as an immutable snapshot;
  treasuries recomputed from the new classification; no amount change (Law 1 preserved).
- **Engine binding:** `reclassifyVoucher` (full path) / `doReclassify` → update + version snapshot.
- **Constitution:** Laws 1, 4, 5, 6, 8, 11.
- **Acceptance:** reclassification is explicit and audited; conservation unchanged.

#### BO‑05 · Split / Move Voucher (partial reclassification)
- **Responsibility:** move a **portion** of a voucher to a new classification: the original is
  reduced and a NEW linked child voucher carries the moved portion, conserving value in every currency.
- **Authority:** `can.admin()`. **Mandatory reason.**
- **Inputs:** parent voucher id, moved portion (ILS), new classification, reason.
- **Preconditions:** parent active; not in a locked year; 0 < portion < full amount; new
  classification valid (Law 4).
- **Lifecycle:** parent ACTIVE → ACTIVE(reduced) **and** a NEW linked child ACTIVE (version 1),
  all in one atomic transaction.
- **Postconditions / outputs (guarded before commit):** `parent(before) = child + remaining` in
  native **and** ILS (Laws 10, 1); `child_ILS = native × rate` (Law 3); a deficit‑directed child
  is > 0 (Law 9); the parent version snapshot + v1 baseline are recorded (Laws 5, 6). Any breach
  is **rejected with full rollback** (Law 7).
- **Engine binding:** `reclassifyVoucher` (split branch) → **`reclassify_split_atomic`** RPC
  (V1 atomicity + V9 runtime guards).
- **Constitution:** Laws 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12.
- **Acceptance:** split conserves value exactly; a conservation/exactness/derivation/deficit breach
  cannot commit; the child is unique and linked; history reconstructible.

#### BO‑06 · Settle Historical Deficit  *(reserved — defined, not yet implemented)*
- **Responsibility:** record a `historical_deficit_settlement` (cash out of the deficit treasury
  to pay historical creditors), reducing the remaining deficit toward zero.
- **Authority:** `can.admin()` (proposed).
- **Preconditions (proposed):** amount > 0; **may not exceed the remaining deficit** (Law 9 — a
  settlement never creates a surplus).
- **Lifecycle:** (none) → recorded settlement event.
- **Postconditions:** remaining deficit reduced toward zero, never below it (Law 9).
- **Engine binding:** to be defined. **Per the V5 ruling:** when this creation path is built, its
  bound is enforced by an **operation‑level Detect → Reject guard using the client‑derived remaining
  deficit** — **no server‑side re‑derivation of the deficit aggregate** (that would violate Law 3).
- **Constitution:** Laws 1, 4, 7, 8, 9, 11.
- **Status:** no creation path exists today (V5 closed by constitutional proof). This operation is
  specified for a **future** P1 iteration and is **out of the first implementation slice**.

### Supporting operations (member & schedule lifecycle)

#### BO‑07 · Create Member (+ subscription schedule)
- **Responsibility:** create a member and all its subscription rows atomically (no NoSchedule state).
- **Authority:** `can.admin()`.
- **Engine binding:** `saveMember` → **`create_member_atomic`** RPC (V2).
- **Constitution:** Law 7; Law 3 (subscription `paid` single source, V3 constraints active).
- **Acceptance:** member + every schedule row committed together or not at all.

#### BO‑08 · Edit Member / BO‑09 · Cancel Member
- **Responsibility:** amend or deactivate a member record.
- **Authority:** `can.admin()`.
- **Engine binding:** `updateMember` / `deleteMember`.
- **Constitution:** Laws 3, 5, 6 (no second source for subscription paid; changes traceable).

#### BO‑10 · Apply Annual Dues (subscription generation)
- **Responsibility:** bill a year's dues by generating each eligible member's subscription row.
- **Authority:** `can.admin()`.
- **Engine binding:** `applyAnnualDue` (app.js).
- **Constitution:** Law 3 (`balance_ils` DB‑derived, override authority disabled — V3 constraints).
- **Acceptance:** every eligible member gets exactly one schedule row; `balance = due − paid` holds.

---

## 5 · Constitutional Constraint Mapping

Every operation is checked against the frozen constitution **before implementation**. The matrix
below is the non‑conflict check; a "●" means the operation actively upholds that law.

| Op | L1 Cons | L3 SSoT | L4 Class | L5 Immut | L6 Trace | L7 Atom | L8 Cust | L9 Def | L10 Split | L11 Lock | L12 Uniq |
|----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| BO‑01 Create        | ● |   | ● |   |   |   | ● |   |   | ● | ● |
| BO‑02 Edit          | ● |   |   | ● | ● |   |   |   |   | ● |   |
| BO‑03 Cancel        | ● |   |   | ● | ● |   |   |   |   | ● |   |
| BO‑04 Reclassify    | ● |   | ● | ● | ● |   | ● |   |   | ● |   |
| BO‑05 Split/Move    | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| BO‑06 Settle *(rsv)*| ● |   | ● |   |   | ● | ● | ● |   | ● |   |
| BO‑07 Create Member |   | ● |   |   |   | ● |   |   |   |   |   |
| BO‑08/09 Member     |   | ● |   | ● | ● |   |   |   |   |   |   |
| BO‑10 Annual Dues   |   | ● |   |   |   |   |   |   |   |   |   |

No operation weakens a guarantee, bypasses a runtime guard, or reopens a closed register item.

---

## 6 · Phase Acceptance Criteria (P1‑000 approval gate)

P1‑000 is complete when:

1. Every operation has **one** formal definition. ✅
2. Every operation has an explicit **lifecycle**. ✅
3. Every operation has explicit **preconditions and postconditions**. ✅
4. Every operation routes through the **certified accounting core**. ✅ (engine binding named per op)
5. **No operation bypasses a runtime guard.** ✅ (money‑critical ops bind to guarded RPCs)
6. Every operation is mapped against the **12 Laws** and the **guarantees** with no conflict. ✅
7. Implementation acceptance (per‑operation, at build time): golden baseline **unchanged** (or
   formally re‑baselined), compliance tests still pass, runtime guards still reject violations.

---

## 7 · Governance

- This document is the P1 foundation. On approval it becomes **frozen** (like the P0 artifacts);
  a change is issued as a **new version** (P1‑000 v0.2, …), never an in‑place edit.
- **No business‑operation implementation begins until this document is approved.**
- The first implementation slice (proposed): **BO‑01 … BO‑05** (the voucher operations already
  backed by certified mechanisms). **BO‑06 (settlement)** is reserved for a later slice.
- If any operation ever requires touching a frozen artifact, a **new certificate** is issued —
  the frozen document is never edited.

---

*Awaiting owner approval. Upon approval, implementation of the first business operation (BO‑01)
begins under the P1 intake protocol, measured against this specification and the certified baseline.*
