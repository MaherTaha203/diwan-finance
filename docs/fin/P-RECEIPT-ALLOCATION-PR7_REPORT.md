# P-RECEIPT-ALLOCATION · PR-7 — Settlement Refund

**A refund reverses exactly the settlement lines being refunded — allocation-aware. Partial reverses only the selected lines; full reverses all. No guessing. No redistribution. No reconstruction. OFF ⇒ byte-identical; legacy refunds unchanged.**

## 1. Implementation Summary
- **`supabase/migrations/…_pralloc_pr7_refund.sql`** (additive):
  - Adds nullable `allocation_records.refunded_at timestamptz` (NULL = active line).
  - Adds **`refund_receipt_settlement(p_receipt_id uuid, p_line_ids uuid[])`** — `SECURITY DEFINER`. Stamps `refunded_at = now()` on the **selected active** lines of one receipt: `p_line_ids` NULL/empty ⇒ **full** refund (all active lines); a list ⇒ **partial** (only those line ids). Reverses only lines with `refunded_at IS NULL AND voided_at IS NULL`. Raises `settlement_refund_none` (P0001) when nothing matches — so **repeated refund is rejected**. It **never** deletes a row, **never** changes `amount_allocated`/`obligation`/`year`, **never** touches voided lines, and **never** writes `paid_amount_ils`/`member_subscriptions`.
  - `revoke all … from public, anon, authenticated` then `grant execute … to authenticated` — the RPC is the only reachable reversal path; being `SECURITY DEFINER` it is the only writer able to update settlement rows at all (PR-4 RLS fence blocks clients).
- **`public/js/receipt-settlement.js`** — `refund(receiptId, lineIds)` becomes the **sole client caller**: `SB.rpc('refund_receipt_settlement', …)`, flag-gated (`lineIds` omitted ⇒ full).
- **`public/js/operations.js`** — `refundReceipt` (BO-11) gains a flag-gated tail: after the existing (legacy) refund money row is written, it calls `ReceiptSettlement.refund(originId, lines)` for an explicit-settlement origin (`manual_allocation`) — **full ⇒ all lines, partial ⇒ the selected `settlementLineIds`**. **No second refund authority**; the money movement is the unchanged legacy refund.
- **`public/js/fin.js`** — the read seam is now allocation-aware for refunds (single read authority, `memberAllocation`):
  - Skips settlement lines with `refunded_at` (like `voided_at`), so a reversed line stops attributing its obligation.
  - Tracks `_explAll` (any receipt carrying a settlement line) and excludes those receipts from the FD-002 pool **entirely**, and **excludes refunds against them from the pool `−refunded` term** — because an explicit refund is reversed by un-attributing its line, and that money was never pooled. Legacy refunds still reduce the pool.
- **`public/js/data.js`** — the gated settlement load now selects `id, refunded_at` too.

**Not changed:** `memberStatement` / `finalBalance` (still recreates debt for **every** refund — the correct total), the debt formula, FD-002 math for legacy, Treasury, Ledger, `paid_amount_ils`, `member_subscriptions`, and the legacy refund path (BO-11 money write). The settlement lines keep their original amounts/years; the original receipt and its refund voucher remain immutable — only the reversal marker is added, once.

## 2. The Single Refund-Reversal Authority (deliverable proof)
`public.refund_receipt_settlement(uuid, uuid[])` is the only code path that writes `allocation_records.refunded_at`, and — as `SECURITY DEFINER` behind the PR-4 RLS fence — the only writer that can update `receipt_settlement` rows at all. Its only client caller is `ReceiptSettlement.refund`; its only runtime invoker is `BusinessOps.refundReceipt` (BO-11). Proven by repository scan: exactly one JS file (`receipt-settlement.js`) references `refund_receipt_settlement`; `operations.js` delegates and never calls the RPC directly. No report, FIN reader, helper, or workspace can reverse a settlement line for a refund.

## 3. Verification Report — Test Matrix
`tests/pralloc-pr7-refund.test.cjs` — **41/41** (real FIN + allocation engine + static scans). Every case also asserts the invariant **`outstanding == memberStatement.finalBalance`**:

| Case | Setup | Expected | Result |
|---|---|---|---|
| **1 Legacy refund** | legacy L=400, refund 200 | pool 400−200 settles only 2026; outstanding 400 (legacy path unchanged) | ✓ |
| **2 Partial refund** | explicit R=400 (2027+2028), refund the 2028 line | reverses only 2028 — 2027 stays settled, 2026+2028 owed (400) | ✓ |
| **3 Full refund** | explicit R=400, both lines refunded | nothing settled, all 600 owed; == the no-receipt baseline | ✓ |
| **4 Repeated refund rejected** | already-refunded line | read-layer idempotent; write-layer `settlement_refund_none` (SQL T3) | ✓ |
| **5 Mixed member** | explicit R (partial 2028 refund) + legacy L=500 | explicit refund reverses only its line; legacy pool intact — all settled, 100 credit; outstanding −100 | ✓ |
| **6 Golden Reference** | legacy receipt + refund, ON vs OFF | `finalBalance` identical; whole allocation byte-identical ON vs OFF | ✓ |

Behavioural DB self-test `tests/pralloc-pr7-refund.sql` (dev/branch DB; rolls back): T1 partial reverses only the selected line · T2 full reverses all remaining, amounts intact · T3 repeated refund rejected · T4 `paid_amount_ils` untouched.

## 4. Legacy Compatibility Proof
Legacy receipts (no `manual_allocation`) never reach the reversal RPC. A refund against a **legacy** origin still reduces the FD-002 pool exactly as before (Case 1, and Case 6 byte-identical ON vs OFF). The legacy BO-11 money write is untouched. An explicit origin with no active settlement lines is a harmless no-op (`settlement_refund_none`, swallowed).

## 5. Golden Reference Comparison
Flag **OFF** ⇒ the reversal step is dead, `_explAll` is empty, and the seam is neutral ⇒ every refund counts in the pool exactly as today (Case 6 proves `finalBalance` and the full `memberAllocation` result are byte-identical ON vs OFF for a legacy scenario). `outstanding` stays `= memberStatement().finalBalance` in every case — including the mixed member (−100) — because the reversal only changes **which** obligation is settled, never a total. Final Balance, Treasury, Ledger, `memberStatement` totals, historical/imported data, `paid_amount_ils` — all unchanged.

## 6. Test Results
PR-7 **41/41**; existing pralloc PR-1..PR-6 all still green (seam refactor is behaviour-identical for their scenarios). Full suite: **78 green / 2 known-red** (`business-operations-slice1`, `constitutional-explicit-q5` — pre-existing). All files parse (`node --check`).

## 7. Files Changed
| File | Change |
|---|---|
| `supabase/migrations/…_pralloc_pr7_refund.sql` | **new** — `refunded_at` column + `refund_receipt_settlement` RPC (single refund-reversal authority) + grants |
| `public/js/receipt-settlement.js` | `refund(receiptId, lineIds)` → the sole client call to the refund RPC; header/version → 7 |
| `public/js/operations.js` | `refundReceipt` (BO-11) flag-gated reversal tail (full=all, partial=`settlementLineIds`); delegates to `ReceiptSettlement.refund` |
| `public/js/fin.js` | seam allocation-aware for refunds: skip `refunded_at`; `_explAll` pool exclusion; legacy-only `−refunded` |
| `public/js/data.js` | gated settlement load also selects `id, refunded_at` |
| `tests/pralloc-pr7-refund.test.cjs` | **new** — 41 assertions (matrix + single-authority + migration + report) |
| `tests/pralloc-pr7-refund.sql` | **new** — behavioural DB self-test (rolls back) |
| `docs/fin/P-RECEIPT-ALLOCATION-PR7_REPORT.md` | this report |

## 8. Rollback Plan
Flag OFF (default) ⇒ instant behavioural revert (reversal tail dead, seam neutral, every refund legacy). Full revert: drop the BO-11 reversal tail, `receipt-settlement.refund` body, the `fin.js` `refunded_at`/`_explAll`/`−refunded` changes, and the `data.js` select additions. The migration is additive (a nullable column + one RPC); `refunded_at` may stay harmlessly, or `drop function refund_receipt_settlement; alter table allocation_records drop column refunded_at;` to fully unwind. No existing data is altered.

## 9. Explicit statement
**There is exactly one authority that reverses settlement lines for refunds.** That authority is `public.refund_receipt_settlement(uuid, uuid[])`: the only writer of `allocation_records.refunded_at`, reachable only through `ReceiptSettlement.refund`, invoked only by `BusinessOps.refundReceipt` (BO-11). No report, FIN reader, helper, or workspace can reverse a settlement line for a refund — proven by repository scan and by the PR-4 RLS fence (clients cannot write settlement rows; only the `SECURITY DEFINER` RPC can).

---
**PR-7 — refunds reverse exactly the settlement lines refunded, through the single refund-reversal authority. OFF = byte-identical; legacy refunds unchanged. Do not start PR-8 without approval.**
