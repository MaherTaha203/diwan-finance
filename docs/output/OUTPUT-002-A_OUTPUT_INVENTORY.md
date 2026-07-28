# OUTPUT-002-A · Output Inventory — every output operation in the system

> **Read-only, evidence-based.** Enumerates every output path in the app (not only reports),
> classifies each as **engine** (REPORT-001 unified) or **legacy/standalone**, and records
> live availability measured against the seeded app *after* the R9 handoff fix (so the
> engine cutovers are active). Buttons are counted from the live DOM; surfaces from the
> renderers' pure `compose()`. This is the master reference for OUTPUT-002-B/C.

## Legend
`✅` present & working · `⚠️` present but incomplete · `❌` absent · **Engine** = REPORT-001 ·
**Legacy** = hand-built path · **Model-only** = engine model exists but no on-screen output button.

## A. Report surfaces

| Surface | Screen | Print | PDF | Excel | CSV | Share | Deep-Link | Engine? | On-screen buttons (live) | Status |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--|:--|:--|
| Member statement | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | **Engine** (print/pdf/excel) · CSV legacy | **5** (`prtMemberStmt` + engine bar ×4) | **Duplicate toolbar** |
| Fund statement — food | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | **Engine** · CSV legacy | **7** (`prtStmt`,`exportPagePDF`,`exportPageExcel` + engine bar ×4) | **Duplicate toolbar** |
| Fund statement — diwan | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | **Engine** · CSV legacy | **7** (same) | **Duplicate toolbar** |
| Annual debt | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Engine** | **2** (`prtAnnualDebt` print+pdf) | No unified bar · Excel button missing on screen |
| Delinquent | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Engine** (Excel via `exportDelinquentExcel`) | **2** (`prtDelinquent` print+pdf) | No unified bar · Excel button missing on screen |
| Donation report | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Engine** | **1** (`prtDonStmt` print) | PDF/Excel entry points missing on screen |
| Members list | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Engine** | **1** (`prtMembersList` print) | PDF/Excel entry points missing on screen |
| Annual (dues) log | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | **Engine** | **1** (`prtAnnual` print) | Excel near-empty (len 169) · PDF/Excel missing on screen |
| Users list | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | **Engine** (model) | **0** | **No output buttons** · Excel stub (len 38) |
| Audit log | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | **Model-only** · CSV legacy | **0** | **No output buttons** (CSV only via generic `exportCSV`) |
| Treasury position | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Model-only** | **0** | **No output buttons** (model exists, unwired) |
| Dues snapshot | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **Model-only** | **0** | **No output buttons** (model exists, unwired) |
| Consistency report | ✅ | ✅ | — | — | ❌ | ❌ | ❌ | **Engine** (`reconcileReport`) | n/a | Print via engine; no toolbar |

## B. Voucher surfaces (per-row)

| Surface | Print | PDF | Engine? | Buttons | Status |
|---|:--:|:--:|:--|:--|:--|
| Receipt voucher | ✅ | ✅ | **Engine** hybrid (`RECEIPT_VOUCHER`) · legacy `buildRecVoucher` = dead fallback | per-row `prtRec` | OK |
| Payment voucher | ✅ | ✅ | **Engine** hybrid (`PAYMENT_VOUCHER`) · legacy `buildPayVoucher` = dead fallback | per-row `prtPay` | OK |
| Internal-transfer voucher | ✅ | — | Legacy (`prtTransfer` → `openPrintWin`) | per-row `prtTransfer` | **Not migrated** |

## C. Bulk / list CSV exports (all legacy, hand-built — no engine CSV renderer exists)

`exportCSV(type)` covers: `food-stmt`, `diwan-stmt`, `member-stmt`, `food-rec`, `food-pay`,
`diwan-rec`, `diwan-pay`, `audit`. `exportMemberStmt('csv'|'json')` adds member CSV/JSON.
All build strings directly from `FIN`/`DB` — **not** through the unified model.

## D. Non-report outputs (standalone — out of OUTPUT-002 scope, listed for completeness)

| Operation | Purpose | Keep? |
|---|---|---|
| `doBackup` | full JSON backup snapshot | Keep as-is (not a report surface) |
| `doRestore` | disabled (P0 safety) | Keep disabled |

## E. Pages with **zero** output (gaps)
`dashboard`, `treasury-workspace`, `dues-workspace`, `audit`, `users`, `settings` — of these,
**treasury / dues / audit / users have engine models ready** but no UI button to reach them.

## Headline counts (measured)
- **13** report surfaces; **3** already carry the unified engine bar (member + 2 fund) — but
  **all 3 with duplicate legacy buttons alongside it**.
- **5** report surfaces render only a single legacy **print** button (no PDF/Excel entry): donation, members, annual, + debt/delinquent lack an on-screen Excel button.
- **4** surfaces are **model-ready but UI-unwired** (users, audit, treasury, dues).
- **CSV = 100% legacy**; **1** voucher type (transfer) unmigrated.
- **Share = 0**, **Deep-Link = 0** across the entire app.
