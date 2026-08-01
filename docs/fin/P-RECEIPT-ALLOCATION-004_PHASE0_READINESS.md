# P-RECEIPT-ALLOCATION — Phase 0: Project Readiness Review (read-only)

**Purpose.** Prove the starting point is correct and sufficient before any implementation. **Read-only — nothing modified.** Ends with a readiness verdict. The next phase does not begin until you approve.

**Method.** Static code inspection (file:line) + live read-only production SELECTs against project `ralifvemgapmsgrjgazh` (2026-08-01). No writes, no DDL, no migration.

---

## A. Tables in scope (verified live)

| Table | Rows (live) | Role for this feature |
|---|---|---|
| `members` | 149 | payer identity; `historical_balance_ils` / `historical_payments_ils` / `credit_balance_ils` |
| `member_subscriptions` | 302 | per-(member,year) `due_amount_ils`, `paid_amount_ils`, derived `balance_ils` |
| `receipts` | 66 (28 active, 38 deleted) | the legal document; already carries `movement_type`, `destination_treasury`, `fund_type`, `register_category`, **`manual_allocation`** + `manual_*` split fields |
| `payments` | 29 | outflows (not in receipt-allocation scope) |
| `annual_dues` | 2 (2025, 2026) | the billed years |
| `historical_subscription_truth` | 298 | owner-adopted per-year status (separate; untouched by this feature) |
| **`allocation_records`** | **0 (empty)** | MODEL2 per-`(source→obligation/year, amount)` audit store — **candidate home for settlement lines; empty, so reuse is non-disruptive** |
| `refunds` | 0 | first-class refund movement (FD-009) — reused for refund flow |
| `member_write_offs` | 0 | CA-007 non-cash resolutions |
| `internal_transfers` | 0 | inter-fund vouchers |
| `fiscal_snapshots` | 0 | close snapshots — **none yet; close is enforced via `locked_through_year`** |
| `settings` | 12 | holds `locked_through_year`, treasury openings, rates |
| `audit_log` | 1429 | audit trail |

**Two existing assets make the feature buildable without new structures (to be proven in Phase 2):** the empty **`allocation_records`** table (natural settlement-line home) and the existing **`receipts.manual_allocation`** boolean (natural "this receipt is explicitly settled" flag). Their sufficiency is a Phase-2 decision, not a Phase-0 claim.

## B. Receipt lifecycle (verified)

- **Create:** classification (movement_type / destination_treasury / fund_type / register_category) is built in `crud.js:143-184`, then the certified write goes through **`BusinessOps.createVoucher`** (`crud.js:174`; operation in `operations.js`). This is the single receipt-creation seam.
- **Edit:** admin voucher edit exists with versioning + the year-lock; the existing `manual_allocation` / `manual_debt_settlement` / `manual_historical_donation` / `manual_current_support` fields are already read/written on edit (`crud.js:703-772`) — **precedent that an operator-specified split already coexists with the engine.**
- **Cancellation / reversal:** cancellation and refund (FD-009, first-class `refunds`) paths exist (`operations.js` BO-11).
- **Closed-period guard:** DB trigger `trg_closed_period_member_subscriptions` (BEFORE UPDATE/DELETE) + the client's `locked_through_year` block writes to closed years (`…ig004…sql:61-63`).

## C. Treasury & Funds (verified)

- Fund balances (food / diwan / donation / historical_deficit) have **one canonical source**: FIN2 via **`FinContract`** (`fin-contract.js`), computed from receipts/payments by `fund_type` / `destination_treasury`, plus the treasury openings from `settings`.
- The four funds are the routing targets a settlement line will use — **no new fund concept is required.**

## D. Food receipts (verified)

- A live member **subscription payment is a food receipt** (`fund_type='food'`): `memberStatement` records food receipts as paid credits (`fin.js:65-67`), and `memberAllocation` pools live food (`fin.js:206`). → a subscription-year settlement line routes to the **food** fund.

## E. Historical deficit (verified)

- Member carried debt = `historical_balance_ils − historical_payments_ils` (`fin.js:42-43,204`). Collections against it are **ق4** receipts: `movement_type='historical_debt_collection'`, `destination_treasury='historical_deficit'` (`crud.js:160-161`; statement credit `fin.js:71-73`). → a Historical-Deficit settlement line routes to the **historical_deficit** treasury via this existing movement type.

## F. Allocation records (verified)

- `allocation_records` **exists and is empty (0 rows)**. Schema (from `…model2_v2_activation_tables.sql`): `source_ref`, `source_kind`, `member_id`, `obligation_id`, `obligation_kind`, `year`, `amount_allocated`, `allocated_at`, `immutable`, `created_at`. This is exactly a per-`(receipt → year/obligation, amount)` line shape. Being empty, adopting it introduces **zero disruption** to any current figure.

## G. Read surfaces and where their truth comes from today (verified)

| Surface | Reads today | File |
|---|---|---|
| **Member Statement** | `FIN.memberStatement` / `memberStatementView` | `fin.js:33,367` |
| **Annual Debt** | `FIN.debtReportRows` (IG-006 balance identity) | `fin.js:561-604` |
| **Delinquent** | `FIN.memberDelinquency().byYear` | `fin.js:142`, `reports.js:148` |
| **Dashboard** | `FIN.memberDelinquency` (`unpaidCount`/`isDelinquent`) | `app.js:681` |
| **Dues Workspace** | `FIN.memberDelinquency().byYear` | `dues-workspace.js:77` |
| **Treasury** | `FinContract` fund balances | `fin-contract.js` |
| **Ledger / Journal** | derived from `receipts`/`payments` movements (no separate journal table) | `app.js` |

All financial **totals** derive from movement totals; per-year **attribution** is what this feature will make explicit.

## H. Golden Reference baseline (captured now — must not change)

Live aggregates frozen as the reference for Phase 7/8 (`= these exact figures must be byte-identical after the feature):

| Aggregate | Value (ILS) |
|---|---|
| Active receipts total (`amount_ils`, not deleted) | **16,404.19** |
| Active payments total | **17,880.00** |
| Σ subscriptions `due_amount_ils` | **59,600.00** |
| Σ subscriptions `paid_amount_ils` | **17,862.00** |
| Σ members historical net (`hist_balance − hist_payments`) | **187,441.00** |
| `member_subscriptions` V3 invariant (`balance = due − paid`) violations | **0 / 302** |

Per-member Final Balance is the authoritative Golden Reference; the aggregates above are the anchor totals Phase 7 will reconcile member-by-member.

## I. Constitutional preconditions — confirmed available

1. **Balances derive from totals**, not attribution (`finalBalance = openingDebt + Σdue − Σpaid − …`, `fin.js:115`) ⇒ a settlement whose lines **sum to the receipt amount** cannot move any Final Balance. ✔ feasible.
2. **Fund routing already exists** for every destination type (food / historical_deficit / donation / credit). ✔ no new fund.
3. **Forward-only is natural:** `manual_allocation` already distinguishes explicit-split receipts from legacy ones (`fin.js:266-267`) ⇒ old receipts keep their path. ✔
4. **Empty settlement store** (`allocation_records = 0`) ⇒ adopting it changes nothing today. ✔
5. **Closed-year enforcement** exists at DB + client. ✔
6. **Imported history (`paid_amount_ils`) is write-once, migration-only** (proven in CONSTITUTIONAL-001) ⇒ untouched by a receipt feature. ✔
7. **A single creation seam** (`BusinessOps.createVoucher`) ⇒ one place to add settlement persistence. ✔

## J. Readiness verdict

**READY to proceed to Phase 1 (Functional Model).** The starting point is correct and complete: every destination the feature needs (subscription years, historical deficit, donation, credit) already has a fund and a movement type; the settlement-line store exists and is empty; the "explicitly settled" flag exists; the creation seam is single; closed-year enforcement exists; and the balance math guarantees that a `Σ = amount` settlement preserves every Final Balance.

**No blockers.** Two items to carry into later phases (not blockers):
- **Phase 2 must decide** whether `allocation_records` + `receipts.manual_allocation` suffice (expected: yes → no new table) or a new table is justified (must be proven).
- **Phase 6 must confirm** the one consumer seam that reads settlement lines as authoritative attribution (the same pattern `manual_allocation` already uses), changing attribution sourcing only — no total.

---
**Phase 0 complete — read-only, nothing modified. FIN / FD-002 / accounting / treasury / ledger / balances / imported history untouched. STOP. Awaiting your approval to begin Phase 1 (Functional Model).**
