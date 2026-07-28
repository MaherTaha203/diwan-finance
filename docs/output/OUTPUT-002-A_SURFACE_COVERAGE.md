# OUTPUT-002-A · Surface Coverage — per page, and per output button

> **Evidence-based.** Output buttons were counted from the **live DOM** of each page in the
> seeded app (post-R9). Columns mirror the owner's coverage table: does each page offer
> Screen / Print / PDF / Excel / Share / Deep-Link, and is it complete?

## Coverage matrix (measured)

| Page | Screen | Print | PDF | Excel | Share | Link | Buttons (live) | Status |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--|
| Member statement | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 5 | **duplicate** (legacy print btn + engine bar) |
| Fund statement — food | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 7 | **duplicate** (3 legacy btns + engine bar) |
| Fund statement — diwan | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 7 | **duplicate** |
| Annual debt | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | 2 | Excel button **missing on screen**; no unified bar |
| Delinquent | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | 2 | Excel button **missing on screen**; no unified bar |
| Donation report | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | 1 | only print button; **PDF/Excel unreachable from UI** |
| Members list | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | 1 | only print button |
| Annual (dues) log | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | 1 | only print button |
| Users list | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | **0** | **no output buttons** |
| Audit log | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | **0** | **no output buttons** (CSV only via generic path) |
| Treasury workspace | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | **0** | **no output buttons** (model ready) |
| Dues workspace | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | **0** | **no output buttons** (model ready) |
| Receipts (food/diwan) | ✅ | ✅ | ✅ | — | ❌ | ❌ | per-row | voucher print only (`prtRec`) |
| Payments (food/diwan) | ✅ | ✅ | ✅ | — | ❌ | ❌ | per-row | voucher print only (`prtPay`) |
| Dashboard | ✅ | — | — | — | ❌ | ❌ | 0 | n/a (no report surface) |
| Settings | ✅ | — | — | — | — | — | 0 | n/a |

⚠️ = the surface **is producible** by the engine model, but there is **no on-screen button**
to reach it (PDF/Excel entry point missing, or the whole page unwired).

## Button-coverage analysis (owner's question set)

**How many output buttons per page? Duplicates? Missing? Do they work?**

- **Duplication (pain #1):** the migrated statements carry **two** output UIs at once — the
  page's legacy toolbar *and* the engine's `rpt-toolbar`. Member statement = 5 buttons
  (`prtMemberStmt` + engine print/pdf/excel/csv); each fund statement = 7 buttons
  (`prtStmt`,`exportPagePDF`,`exportPageExcel` + engine print/pdf/excel/csv). The legacy and
  engine buttons now do the *same* thing (both route through the engine post-R9) → pure
  redundancy.
- **Missing buttons (pain #2):** debt/delinquent expose print+pdf but **no on-screen Excel**
  button (Excel exists via `exportPageExcel`/`exportDelinquentExcel` but is unreachable);
  donation/members/annual expose **print only**; **users/audit/treasury/dues expose nothing**.
- **Inconsistent count:** identical report class, different button sets (statements 5–7,
  debt/delinquent 2, donation/members/annual 1, users/audit/treasury/dues 0).
- **Do they work?** Every wired button works and (post-R9) routes to the engine; CSV buttons
  work via the legacy hand-built path. No dead/broken button was observed — the problem is
  **redundancy + absence + inconsistency**, not breakage.

## Visual-consistency note (see FORENSIC_AUDIT §Visual)
Because screen/print/pdf are one `ReportLayout.build`, **margins, header, footer, page numbers,
alignment, table width and fonts are already identical across every engine report**. Visual
drift exists only (a) between the engine reports and the **legacy transfer voucher**, and
(b) in the **page-chrome toolbars** (scattered vs unified), not in the printed paper itself.

## Coverage headline
- **0 / 13** report surfaces expose Share or Deep-Link.
- **3 / 13** carry the unified bar — all 3 with duplicate legacy buttons.
- **4 / 13** are fully UI-unwired despite a ready engine model.
- **1** unified single-button "الإخراج ▼" bar exists **nowhere** yet.
