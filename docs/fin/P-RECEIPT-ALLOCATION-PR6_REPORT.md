# P-RECEIPT-ALLOCATION · PR-6 — Settlement Cancellation

**When a receipt with explicit settlement lines is cancelled, those lines become VOID — reversing exactly what was recorded, through the same server-side authority class that created them. No guessing. No redistribution. No recalculation. OFF ⇒ byte-identical.**

## 1. Implementation Summary
- **`supabase/migrations/…_pralloc_pr6_void.sql`** (additive):
  - Adds nullable `allocation_records.voided_at timestamptz` (NULL = active line).
  - Adds **`void_receipt_settlement(p_receipt_id uuid)`** — `SECURITY DEFINER`. Stamps `voided_at = now()` on **every active** (`voided_at IS NULL`) `source_kind='receipt_settlement'` line of one receipt, atomically. It **never** deletes a row, **never** changes `amount_allocated`/`obligation`/`year`, and **never** writes `paid_amount_ils`/`member_subscriptions`. If there are no active lines it raises `settlement_void_none` (P0001) — so **repeated cancellation is rejected** at the write layer too.
  - `revoke all … from public, anon, authenticated` then `grant execute … to authenticated` — the RPC is the only reachable void path; being `SECURITY DEFINER` it is also the only writer able to update settlement rows at all (the PR-4 RLS fence blocks clients).
- **`public/js/receipt-settlement.js`** — `cancel(receiptId)` becomes the **sole client caller** of the void authority: `SB.rpc('void_receipt_settlement', { p_receipt_id })`, flag-gated. It never writes `allocation_records` directly and never touches `paid_amount_ils`.
- **`public/js/operations.js`** — `cancelVoucher` (BO-03) gains a flag-gated tail step: after the receipt is soft-deleted + version-snapshotted + audited exactly as today, it calls `ReceiptSettlement.cancel(id)` **only for a receipt carrying `manual_allocation`** (the marker the atomic posting RPC sets). **No second cancellation path** — the money cancellation is unchanged; this only voids the recorded settlement lines. The gate reads the **receipt row**, never `DB.allocation_records`, so `memberAllocation` stays the single settlement reader.
- **`public/js/fin.js`** — the PR-5 read seam now also skips `a.voided_at` lines (`… || a.voided_at) return;`). A cancelled receipt is thus reversed two ways: it drops out of `_liveIds` (soft-deleted) **and** its lines are marked void.
- **`public/js/data.js`** — the gated settlement load now also selects `voided_at` so the seam can honour it (still flag-gated: OFF ⇒ no query).

**Not changed:** `memberStatement` / `finalBalance`, the debt formula, FD-002 math, Treasury, Ledger, `paid_amount_ils`, `member_subscriptions`, reports. The original receipt and its cancellation snapshot remain immutable; the settlement lines keep their original amounts/years — only the void marker is added, exactly once.

## 2. The Single Void Authority (deliverable proof)
`public.void_receipt_settlement(uuid)` is the only code path that writes `allocation_records.voided_at`, and — as `SECURITY DEFINER` behind the PR-4 RLS fence — the only writer that can update `receipt_settlement` rows at all. Its only client caller is `ReceiptSettlement.cancel`; its only runtime invoker is `BusinessOps.cancelVoucher` (BO-03). Proven by repository scan (test §"single void authority"): exactly one JS file (`receipt-settlement.js`) references `void_receipt_settlement`; `operations.js` delegates to `ReceiptSettlement.cancel` and never calls the RPC directly. No report, FIN reader, helper, or workspace can void.

## 3. Verification Report — Test Matrix
`tests/pralloc-pr6-cancellation.test.cjs` — **38/38** (real FIN + allocation engine + static scans):

| Case | Setup | Expected | Result |
|---|---|---|---|
| **1 Legacy cancellation** | legacy 400 food receipt, no lines, `is_deleted` | attribution reverses exactly as before PR-6 | ✓ |
| **2 Explicit cancellation** | receipt `is_deleted` + its lines `voided_at` | voided lines settle nothing; each destination loses exactly what it received | ✓ |
| **3 Mixed member** | one active explicit (→2028) + one cancelled explicit (voided) | active line still settles 2028; cancelled line contributes nothing | ✓ |
| **4 Repeated cancellation rejected** | already-voided lines | read-layer idempotent; write-layer `settlement_void_none` (SQL T3) | ✓ |
| **5 No residual attribution** | cancelled explicit receipt | `outstanding` == the no-settlement baseline | ✓ |
| **6 Golden Reference** | same money, ON vs OFF | `outstanding` identical; `== finalBalance`; `finalBalance` identical ON/OFF | ✓ |

Behavioural DB self-test `tests/pralloc-pr6-void.sql` (dev/branch DB; rolls back): T1 void marks all lines · T2 no active line remains, original amounts intact · T3 repeated cancel rejected · T4 legacy (no lines) rejected · T5 `paid_amount_ils` untouched.

## 4. Golden Reference Comparison
With the flag **OFF** (default) the `cancelVoucher` void step is dead code and the `fin.js`/`data.js` seams are neutral ⇒ cancellation behaves byte-for-byte as today. With the flag ON, a fully-cancelled explicit receipt yields the **same** `outstanding` as the equivalent legacy receipt of the same amount (Case 6), and `outstanding` remains `= memberStatement().finalBalance` — because voiding only removes *which* year a receipt settled, never a total. Final Balance, Treasury, Ledger, `memberStatement` totals, historical/imported data, `paid_amount_ils` — all unchanged.

## 5. Backward Compatibility
Legacy receipts (no `manual_allocation`) never reach the void RPC; a `manual_allocation` receipt with no active settlement lines is a harmless no-op (`settlement_void_none`, swallowed). Only receipts posted via the PR-4 atomic RPC carry settlement lines and are voided on cancellation.

## 6. Test Results
PR-6 **38/38**; PR-1 inertness updated (cancel now a flag-gated wiring point) **18/18**; PR-5 single-reader **15/15** (operations.js does **not** read `DB.allocation_records`). Full suite: **77 green / 2 known-red** (`business-operations-slice1`, `constitutional-explicit-q5` — pre-existing). All files parse (`node --check`).

## 7. Files Changed
| File | Change |
|---|---|
| `supabase/migrations/…_pralloc_pr6_void.sql` | **new** — `voided_at` column + `void_receipt_settlement` RPC (single void authority) + grants |
| `public/js/receipt-settlement.js` | `cancel()` → `SB.rpc('void_receipt_settlement')` (sole client caller); header/version → 6 |
| `public/js/operations.js` | `cancelVoucher` flag-gated void tail (receipt + `manual_allocation`); delegates to `ReceiptSettlement.cancel` |
| `public/js/fin.js` | read seam also skips `a.voided_at` lines |
| `public/js/data.js` | gated settlement load also selects `voided_at` |
| `tests/pralloc-pr6-cancellation.test.cjs` | **new** — 38 assertions (matrix + single-authority + migration + report) |
| `tests/pralloc-pr6-void.sql` | **new** — behavioural DB self-test (rolls back) |
| `tests/pralloc-pr1-foundation-inert.test.cjs` | step 7 acknowledges the flag-gated PR-6 cancel wiring |
| `docs/fin/P-RECEIPT-ALLOCATION-PR6_REPORT.md` | this report |

## 8. Rollback Plan
Flag OFF (default) ⇒ instant behavioural revert (void step dead, seams neutral). Full revert: drop the `cancelVoucher` void tail, `receipt-settlement.cancel` body, the `fin.js` `a.voided_at` skip, and the `data.js` `voided_at` select. The migration is additive (a nullable column + one RPC); `voided_at` may stay harmlessly, or `drop function void_receipt_settlement; alter table allocation_records drop column voided_at;` to fully unwind. No existing data is altered.

## 9. Explicit statement
**There is exactly one authority that voids settlement lines.** That authority is `public.void_receipt_settlement(uuid)`: the only writer of `allocation_records.voided_at`, reachable only through `ReceiptSettlement.cancel`, invoked only by `BusinessOps.cancelVoucher` (BO-03). No report, FIN reader, helper, or workspace can void — proven by repository scan and by the PR-4 RLS fence (clients cannot write settlement rows; only the `SECURITY DEFINER` RPC can).

---
**PR-6 — cancellation voids settlement lines through the single void authority. OFF = byte-identical. Do not start PR-7 without approval.**
