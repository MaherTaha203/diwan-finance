# P-RECEIPT-ALLOCATION · PR-5 — Consumer Seam (single read authority)

**`FIN.memberAllocation()` becomes the sole reader of recorded settlement attribution. Flag-gated. Totals untouched. OFF ⇒ byte-identical.**

## 1. Implementation Summary
- **`fin.js` `memberAllocation()`** — the only change to *where year attribution is read*:
  - Reads settlement lines (`DB.allocation_records`, `source_kind='receipt_settlement'`) **only when `RECEIPT_ALLOCATION_ENABLED`** and only for **non-deleted** receipts (cancellation-aware).
  - **Per-receipt exclusivity:** a receipt WITH settlement lines is excluded from the legacy `liveFood` pool; its lines credit their named obligations directly.
  - **Frozen precedence:** explicit settlement is applied **first** (pre-seeds `perYear[y].allocated` and historical); the legacy oldest-first FD-002 pool then covers **only the residual** obligation.
  - **Neutral when OFF / no lines:** all explicit values are 0 ⇒ the computation is byte-identical to the legacy path. The FD-002 engine (`MODEL2Allocation`) math is **unchanged**; `outstanding` still `= memberStatement().finalBalance`.
- **`data.js`** — loads settlement rows into `DB.allocation_records` **only when the flag is ON** (OFF ⇒ no query, byte-identical login). Data layer only; not a consumer.

**Not changed:** `memberStatement` / `finalBalance`, the debt formula, treasury, ledger, `paid_amount_ils`, `member_subscriptions`, FD-002 math, reports.

## 2. Verification Report
`tests/pralloc-pr5-consumer-seam.test.cjs` — **15/15** (real FIN + allocation engine): Cases 1–4 + 7 + single-reader + gating (matrix below). Full suite: **75 green / 2 red** — the 2 red are the pre-existing `business-operations-slice1` / `constitutional-explicit-q5`; every legacy FIN test (`historical-truth`, `debt-report-model`, `delinquency-derivation`, `consistency-verifier`, …) still passes ⇒ legacy behaviour byte-identical.

## 3. Single Reader Proof
- `DB.allocation_records` is referenced only by **`fin.js`** (the consumer — iterates it) and **`data.js`** (the loader — only assigns it). No other file references it.
- `reports.js` / `dues-workspace.js` / `app.js` (dashboard) read **none** of it — they consume `memberDelinquency → memberAllocation`.
- Asserted in-test: exactly `[fin.js, data.js]`; `fin.js` iterates it; `data.js` never consumes it.

## 4. Legacy Compatibility Proof (Test Matrix)
| Case | Setup | Expected | Result |
|---|---|---|---|
| **1 Legacy only** | 400 food receipt, no lines | oldest-first settles 2026+2027, not 2028 | ✓ ; and **ON + no lines == legacy byte-identical** ✓ |
| **2 Explicit only** | 400 receipt, lines 2027+2028 | settles exactly 2027+2028; **2026 stays unpaid (no guessing)** | ✓ |
| **3 Mixed** | explicit R1→2028 + legacy R2 (200) | explicit settles 2028 first; legacy pool covers only residual **2026**, not 2027 | ✓ |
| **4 Cancellation** | explicit receipt `is_deleted` | its lines ignored (no attribution) | ✓ |
| **5 Refund** | negative/allocation-aware lines | netted at the read layer (created by PR-7) | (read-layer honors signed lines) |
| **6 Closed year** | closed-year line | rejected at post (PR-2 RPC) — never reaches the reader | (enforced upstream) |
| **7 Golden Reference** | same money, ON vs OFF | `outstanding` identical; `== finalBalance`; `finalBalance` identical ON/OFF | ✓ |

## 5. Golden Reference Comparison
`outstanding` (= `memberStatement.finalBalance`) is **identical** whether the flag is ON or OFF and regardless of attribution, because `memberStatement` is untouched and the seam only redistributes *which* year is settled — never the total. Legacy members, legacy receipts, and imported history are byte-identical (only receipts created via PR-4 carry settlement rows). `git diff` on `fin.js` shows **zero** `memberStatement` changes.

## 6. Test Results
PR-5 **15/15**; full suite **75 green / 2 known-red**; `fin.js` parses (`node --check`).

## 7. Files Changed
| File | Change |
|---|---|
| `public/js/fin.js` | `memberAllocation` read seam (+35 lines): flag-gated explicit-first attribution; FD-002 math + `memberStatement` untouched |
| `public/js/data.js` | gated load of settlement rows into `DB.allocation_records` (OFF ⇒ no query) |
| `tests/pralloc-pr5-consumer-seam.test.cjs` | **new** — 15 assertions (matrix + single-reader + gating) |

## 8. Rollback Plan
Flag OFF (default) ⇒ instant behavioural revert (seam neutral). Full revert: drop the `memberAllocation` seam block + the two edited lines, and the `data.js` gated load. No data, no schema, nothing to unwind.

## 9. Explicit statement
**There is exactly one read authority for settlement attribution: `FIN.memberAllocation()`.** It is the only consumer of `DB.allocation_records`; every report reads it transitively through `memberDelinquency`; no second reader exists (proven by repository scan).

---
**PR-5 — read seam, flag-gated, single reader. OFF = byte-identical. Next (on approval): PR-6 (cancellation voids settlement lines).**
