# P-RECEIPT-ALLOCATION-003 — Receipt Allocation Functional Specification
### (Last design before implementation · implementation contract · NO CODE / NO MIGRATION)

**Scope of behavior.** When an operator creates a receipt for a member, they explicitly distribute the receipt amount across destinations (subscription years, Historical Deficit, Donation, Future year, Credit). The distribution (the **Settlement Table**) is part of the receipt. `Σ settlement lines = receipt amount` is a hard save gate. The system never allocates, reallocates, or interprets the payment afterward. **Only new receipts carry explicit settlement; existing receipts, balances, treasury, ledger, totals, and imported history are untouched; no migration.**

**Fund routing reference (existing classifications the lines reuse — not new concepts):**
- Subscription-year line → **food** fund (a member subscription payment is a food receipt today).
- Historical Deficit line → **historical_deficit** treasury (movement `historical_debt_collection`).
- Donation line → **donation** fund (per existing donation types).
- Credit / Prepayment line → member **credit** (parked, not applied to any obligation).

`Σ lines = amount` ⇒ the receipt's total movement across funds equals the receipt amount, so no money is created or lost.

---

## SECTION 1 — User Story (every click, field, validation)

1. Cashier opens **New Receipt** (member context).
2. Selects **Payer = Member**, picks the member. → The Settlement Table loads the member's **open destinations**: each scheduled subscription year with its outstanding due, the Historical Deficit with its outstanding, plus selectable Donation / Future year / Credit.
3. Enters **Amount** and **Currency**; if non-ILS, the **rate** applies and the **settled ILS amount** becomes the control total.
4. Selects **Payment Method** and enters **Reference** and optional **Notes**.
5. **Fills the Settlement Table**: adds one row per destination and types the amount for each (e.g. 2025 → 200, 2026 → 200, Historical → 300, Donation → 100).
6. The **live totals bar** shows `Allocated / Amount / Remaining`. Remaining must reach **0**.
7. **Validation** runs continuously (Section 4). Every failing rule shows an inline message; **Save is disabled** while any rule fails.
8. When `Remaining = 0` and all rules pass, the cashier clicks **Save**. The receipt posts atomically (Section 5) and becomes an official, immutable, fully-attributed document.

The cashier can never post a receipt whose settlement is incomplete, over-allocated, or invalid.

---

## SECTION 2 — Receipt Screen

**Header block**
| Field | Behavior |
|---|---|
| Payer / Member | required; drives available destinations |
| Amount | required, > 0; the control total |
| Currency | ILS default; USD/JOD apply a rate |
| Exchange Rate | shown when currency ≠ ILS; yields the settled ILS amount |
| Payment Method | required (cash / bank / …) |
| Reference | optional external reference |
| Date | defaults today; subject to fiscal-lock rules |
| Notes | optional free text (header-level) |

**Settlement Table** (Section 3) — the distribution grid.

**Totals bar** — `Amount: 800 · Allocated: 800 · Remaining: 0` (Remaining turns green at 0, red otherwise).

**Buttons** — `Add Row`, `Remove Row` (per row), `Save` (disabled until valid), `Cancel` (discard draft).

**Validation messages area** — lists each active failure by rule (Section 4), e.g. "Allocated 700 ≠ Amount 800 — 100 unallocated."

---

## SECTION 3 — Settlement Table

**Columns**
| Column | Meaning |
|---|---|
| **Destination** | the target: a subscription **Year** (2025, 2026, …), **Historical Deficit**, **Donation**, **Future Year**, or **Credit / Prepayment** |
| **Amount** | the shekels allocated to this destination (> 0) |
| **Due / Outstanding** | (guidance, read-only) the destination's current outstanding — the year's due, or the remaining historical deficit; blank for Donation/Credit |
| **Status** | derived per row: **Paid** (Amount ≥ Due), **Partial** (0 < Amount < Due), **Reduces Deficit** (historical), **Donation**, **Prepayment** (Credit / Future) |
| **Remaining** | (read-only) the destination's outstanding **after** this line = `max(Due − Amount, 0)`; blank for Donation/Credit |
| **Notes** | optional per-line note |

**Behaviors**
- **Adding rows:** operator picks a destination from the member's open list (or Donation/Future/Credit). Each destination may appear **once**.
- **Removing rows:** allowed freely before Save; Remaining recomputes.
- **Editing rows:** amount editable before Save; Status/Remaining recompute live.
- **Ordering rows:** display order is operator convenience only; it carries **no allocation meaning** (there is no oldest-first rule — every target is explicit).
- **Future years:** selectable only if that year's dues exist; treated as **Prepayment** if the year is not yet due-scheduled → routed to Credit.
- **Historical Deficit:** at most one row; Amount may not exceed the member's outstanding historical deficit.
- **Donation:** at most one row; routes to the donation fund; not tied to any obligation.
- **Credit / Prepayment:** explicit parking of money not applied to any current obligation (this is how overpayment is handled — never auto-cascaded).

---

## SECTION 4 — Validation Rules (all)

| ID | Rule |
|---|---|
| V1 | **`Σ line amounts = receipt amount_ils`** (exact). Save impossible otherwise. |
| V2 | Every line amount **> 0** (zero rows are removed, never stored). |
| V3 | **No duplicate destination** (each year once; Historical once; Donation once). |
| V4 | A subscription-year line **may not exceed that year's due**; excess must go to a Future/Credit row (a year is never over-paid in place). |
| V5 | Historical Deficit line **may not exceed** the member's outstanding historical deficit. |
| V6 | **Closed fiscal year:** no line may target a year `≤ locked_through_year`. |
| V7 | **Destination eligibility:** subscription-year rows only for years the member is scheduled for; Historical only if a historical balance exists. |
| V8 | **Donation rules:** a Donation row is allowed for any receipt; it routes to the donation fund and is never a subscription/historical settlement. |
| V9 | **Partial payment:** a line below its due is valid → that year is **Partial**; the receipt total must still be fully allocated across all rows. |
| V10 | **Future year / overpayment:** any amount beyond current obligations must sit in an explicit **Future Year** or **Credit** row; the system never spills surplus automatically. |
| V11 | **Currency/amount coherence:** the ILS control total (post-rate) is the figure the lines must sum to. |
| V12 | **Save gate:** the receipt cannot be persisted unless V1–V11 all pass. |

---

## SECTION 5 — Posting Workflow (after Save)

1. **Final validation** — V1–V12 re-checked server-side; reject if any fails.
2. **Voucher assigned** — the receipt receives its unique voucher number.
3. **Atomic post** — the receipt header **and all settlement lines** are written as **one indivisible transaction**: all commit, or none do. A posted receipt without complete settlement is impossible.
4. **Fund routing** — each settlement line moves its amount into its destination's fund (subscription→food, historical→historical_deficit, donation→donation, credit→member credit). Because `Σ lines = amount`, total treasury movement equals the receipt amount.
5. **Receipt flagged as explicitly-allocated** — so the system knows this receipt's settlement is authoritative and must **never** be re-derived.
6. **Transaction complete** — the receipt is official, immutable, and fully attributed. No later step allocates, reallocates, or interprets it.

---

## SECTION 6 — Cancellation Workflow

1. Operator cancels a posted receipt (with authority; subject to fiscal lock).
2. The system creates an **immutable reversing document** for the **entire** receipt — header and **every** settlement line together (the receipt is one atomic document).
3. Each line is reversed **to its exact destination and fund**: the 2025 line returns 200 to 2025, the historical line returns 300 to the historical deficit, the donation line returns 100 to the donation fund, etc.
4. The **original is never deleted**; the pair (original + reversal) nets to zero.
5. **Balances remain identical** because the reversal is the exact negative of the recorded lines — precision in guarantees precision out; nothing is guessed on reversal.

---

## SECTION 7 — Correction Workflow

**Posted receipts are never edited in place.** A posted receipt is a legal, immutable record of what was decided at a moment in time; editing it would erase history and re-open ambiguity.

```
Reverse the wrong receipt   (Section 6 — full reversal, audited)
        ↓
Create a New Receipt        (correct amount + correct settlement)
        ↓
Post                         (Section 5 — atomic, validated)
```

The reverse + new pair is the correct, auditable narrative: it shows the error, its reversal, and the correction as three distinct facts.

---

## SECTION 8 — Member Statement (after posting)

The statement shows the receipt as **one document with its settlement lines** listed beneath it. Example — Receipt #541 = 800:

```
Receipt #541 …………………………………………… 800
   ├─ 2025               settlement   200   Receipt #541
   ├─ 2026               settlement   200   Receipt #541
   ├─ Historical Deficit settlement   300   Receipt #541
   └─ Donation           settlement   100   Receipt #541
```
- Each subscription year shows the **explicitly allocated** amount against it.
- Historical Deficit shows the amount that reduced it.
- Donation shows as a donation line.
- The member's **final balance** moves by exactly 800 — identical to any 800 payment; only the attribution is explicit.

---

## SECTION 9 — Annual Debt (after posting)

- The year's paid figure for 2025 and 2026 increases by the **allocated** amount (200 each) — because the operator said so, not by any oldest-first inference.
- The historical portion reduces the member's carried debt by 300.
- The member's **signed balance** decreases by the receipt total (800) — the same total effect any 800 payment produces; the difference is that each year's share is exact and deterministic.

---

## SECTION 10 — Delinquent view (after posting)

- 2025 → **settled** (allocated ≥ due); 2026 → **settled**.
- A year receives settled/partial status **only** if a settlement line targeted it. A surplus is **never** applied to a later year automatically, so an unpaid later year stays overdue unless explicitly settled.

---

## SECTION 11 — Subscription Workspace (after posting)

For each subscription year, using the settlement lines allocated to it (across all of that member's receipts):
- **Paid** — total allocated to the year **≥** its due.
- **Partial** — `0 < total allocated < due`.
- **Unpaid** — no settlement line ever targeted the year (and no legacy settlement did).

Legacy years settled before this feature keep their existing status (Section 14).

---

## SECTION 12 — Historical Deficit (after posting)

A Historical-Deficit settlement line of amount D:
- **Member Statement:** a line "Historical Deficit — settlement — D — Receipt #NNN" reducing the carried historical balance by D.
- **Debt:** the member's historical/carried debt column decreases by exactly D.
- **History:** the historical deficit outstanding for the member decreases by D; if D would exceed the outstanding, V5 blocks it at entry (the excess must be placed elsewhere by the operator).

---

## SECTION 13 — Real Example (complete system after Save)

**Member owes:** 2025 = 200, 2026 = 200, Historical Deficit = 500. **Receipt #612 = 900**, allocated `2025 = 200, 2026 = 200, Historical = 500`.

- **Receipt #612:** header 900; lines 2025→200 (Paid), 2026→200 (Paid), Historical→500 (Reduces Deficit); `Σ = 900` ✓.
- **Member Statement:** Receipt #612 = 900 with the three lines; 2025 paid 200, 2026 paid 200, Historical reduced 500→0. **Final balance: 900 owed → 0.**
- **Annual Debt:** 2025 paid 200, 2026 paid 200, historical debt −500; signed balance → 0.
- **Delinquent:** 2025 ✓, 2026 ✓, no overdue years remain.
- **Subscriptions:** 2025 Paid, 2026 Paid.
- **Dashboard:** member's delinquency/unpaid count → 0. Totals otherwise unchanged in structure.
- **Treasury:** food +400 (2025+2026), historical_deficit +500; grand total +900 — exactly a 900 receipt routed by its lines.
- **Ledger:** one document, #612, amount 900 (optionally shown with its three settlement sub-lines); posted total +900.
- **Final Balance:** member = 0; every treasury/ledger grand total moves by exactly 900.

---

## SECTION 14 — Backward Compatibility

- **Old receipts are untouched and behave exactly as before.** A receipt without explicit settlement keeps its current single-classification behavior; nothing about it is re-read or re-attributed.
- **Coexistence:** explicit-settlement receipts and legacy receipts live side by side; the explicit flag marks which receipts carry authoritative per-line settlement.
- **No migration required** — the feature is **forward-only**; no historical receipt, balance, treasury figure, ledger entry, or imported `paid_amount_ils` is rewritten.
- **Imported history unchanged** — never touched or reinterpreted.

---

## SECTION 15 — Acceptance Criteria (objectively testable)

- ✓ Receipt **cannot save** when `Σ settlement ≠ amount`.
- ✓ Receipt **cannot save** with a negative or zero line.
- ✓ Receipt **cannot save** with a duplicate destination.
- ✓ Receipt **cannot save** with a line targeting a **closed fiscal year**.
- ✓ A subscription-year line **cannot exceed** that year's due (excess forced to Future/Credit).
- ✓ A Historical-Deficit line **cannot exceed** the member's outstanding deficit.
- ✓ Overpayment **only** posts via an explicit Future/Credit row (no auto-cascade).
- ✓ On post: 2025 marked **Paid**, 2026 marked **Paid** when allocated to full due.
- ✓ Historical Deficit reduced by exactly the allocated amount and shown on the statement.
- ✓ **Final Balance unchanged** for a given total (moves by exactly the receipt amount).
- ✓ **Treasury unchanged** in totals (moves by exactly the receipt amount, routed by lines).
- ✓ **Ledger unchanged** in totals (one document, posted amount = receipt amount).
- ✓ **Existing receipts unchanged** (no legacy receipt altered or re-attributed).
- ✓ **Imported history unchanged** (`paid_amount_ils` never modified or reinterpreted).
- ✓ **No migration** is run.
- ✓ Cancellation reverses **every** line to its exact destination; balances return identical.
- ✓ Correction is **reverse + recreate**; no posted receipt is edited in place.
- ✓ A posted receipt's settlement is **never re-derived** by any later process.
- ✓ Every surface shows the **same explicit settlement attribution**; all financial **totals** identical.

---
**Functional specification only — no code, no database migration, no implementation, no PR. This document is the implementation contract. STOP and await approval.**
