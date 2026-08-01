# P-RECEIPT-ALLOCATION · PR-1 — Foundation Layer (implementation report)

**Feature flag OFF by default. Zero behavioural change.** PR-1 only prepares the ground for Explicit Receipt Settlement; nothing reads or writes settlement at runtime.

## 1. Implementation Summary
- **Reused `allocation_records`** as the future settlement store — additive only: a nullable `notes` column and a **settlement-scoped** unique index (`source_ref, obligation_kind, coalesce(year,-1)` `WHERE source_kind='receipt_settlement'`). The dormant MODEL2 audit recorder is untouched (its rows are excluded by the partial predicate).
- **Atomic Posting RPC skeleton** `create_receipt_with_settlement(jsonb,jsonb)` — `SECURITY DEFINER`, **always raises**, writes nothing, and is revoked from `public/anon/authenticated`. No runtime path calls it.
- **BusinessOps interfaces** — new module `receipt-settlement.js` exposes `window.ReceiptSettlement` (`enabled/post/cancel/refund`, all disabled stubs) and **additively** attaches `postReceiptSettlement/cancelReceiptSettlement/refundReceiptSettlement` to the existing `BusinessOps` object **without overwriting any method**.
- **Feature flag** `window.RECEIPT_ALLOCATION_ENABLED`, default **OFF** (same `typeof …==='undefined'` idiom as MODEL2/REPORT_ENGINE). When OFF (always, in PR-1) the system behaves exactly as today.
- **Inert tests** proving *Feature OFF == current system*.

## 2. Verification Report
Objective proof (`tests/pralloc-pr1-foundation-inert.test.cjs`, **16/16 pass**):
- Flag defaults **OFF**; `ReceiptSettlement.enabled()===false`; `post/cancel/refund` return a disabled result and do no work.
- Existing `BusinessOps.createVoucher` is **not overwritten**; settlement stubs are added additively.
- **FIN outputs byte-identical** with the module loaded (flag OFF) vs. the current system — `memberStatement`, `memberAllocation`, `memberDelinquency`, `debtReportRows` snapshot equal.
- Module makes **no** database call and references **no** FIN/DB read-model symbol.
- Migration is **additive-only** (no update/delete/truncate/drop; never touches `paid_amount_ils`); the RPC is an inert skeleton.
- **No runtime file** calls the interface or the RPC.

Full suite: **71 green / 2 red** — the 2 red are the pre-existing `business-operations-slice1` and `constitutional-explicit-q5`, **unchanged from the `main` baseline** (70 green before + 1 new PR-1 test).

## 3. Golden Reference comparison
| Invariant | Result | Basis |
|---|---|---|
| Member Final Balance | **identical** | no balance-computing code path changed (`fin.js` not in diff); inert test asserts `memberStatement` byte-identical |
| Treasury / fund balances | **identical** | `FinContract`/treasury untouched; no new receipt/movement |
| Ledger totals | **identical** | no movement written; migration writes no data |
| Historical balances / `paid_amount_ils` | **identical** | migration never references `paid_amount_ils`; no writer added |
| Existing receipts | **identical** | receipts table + write paths untouched |
| Imported data | **identical** | no migration alters existing data |
| Reports (Statement/Debt/Delinquent/Dues/Dashboard) | **identical** | `reports.js`/`report-model.js`/`dues-workspace.js`/`app.js` not in diff; inert test asserts `debtReportRows`/`memberDelinquency` byte-identical |

*(The migration is additive DDL on an empty settlement class; it is applied by the deploy pipeline on merge, as with prior migrations. Until applied, no runtime path references the new objects.)*

## 4. Files changed
| File | Change |
|---|---|
| `supabase/migrations/20260801130000_pralloc_pr1_foundation.sql` | **new** — additive column + settlement-scoped index + inert RPC skeleton |
| `public/js/receipt-settlement.js` | **new** — flag default OFF + disabled interface stubs (no side effects) |
| `public/index.html` | +1 `<script>` tag (loads the inert module) |
| `tests/pralloc-pr1-foundation-inert.test.cjs` | **new** — 16 inertness assertions |

**Not touched:** `fin.js`, `reports.js`, `report-model.js`, `dues-workspace.js`, `app.js`, `data.js`, `operations.js`, `allocation-engine.js`, `allocation-integration.js`.

## 5. Risk assessment
- **Runtime risk: none.** Flag OFF; module has no load-time side effects beyond defining a flag + namespace; nothing consumes it; `data.js` unchanged so no new query on the login path.
- **DB risk: minimal.** Additive DDL on an empty settlement class; the partial index excludes MODEL2 rows; the RPC is inert and unexposed. No existing policy/column/data changed.
- **Deliberate deviation (disclosed):** the RLS "revoke direct client writes / grant only the RPC" fence (PR-0A §15) is **deferred** to the PR that activates settlement writes — applying it now would change the dormant MODEL2 path's behaviour, which PR-1 forbids. PR-1 therefore changes no existing policy.

## 6. Rollback confirmation
Fully reversible: migration `down` (drop the index, the `notes` column, and the skeleton function) + delete `receipt-settlement.js` and its `<script>` tag. Nothing depends on any of it; no data to unwind.

## 7. Zero behavioural change — explicit statement
**PR-1 introduces ZERO behavioural change.** With the flag OFF (its only state in PR-1), every report, balance, treasury figure, ledger total, receipt, FIN function, and runtime path behaves exactly as on `main`. This is proven by: the inert test's byte-identical FIN snapshot, the unchanged full-suite result, and a diff that touches only `index.html` (one script tag) plus new, unreferenced files.

---
**PR-1 only — foundation, inert, flag OFF. No UI, no settlement grid, no runtime read, no runtime write, no report change, no data migration that alters existing rows.**
