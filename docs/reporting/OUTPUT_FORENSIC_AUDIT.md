# OUTPUT-001 — Complete Output & Reporting Forensic Audit

> **Type:** Read-only engineering audit. **No code was changed, refactored, or committed.**
> **Scope:** Every page, output action, button, print/PDF/Excel/CSV/copy/share/QR path in the Diwan Finance client (`public/`).
> **Baseline:** `main` @ `deb910f` — **after** the PRINT-001 remediation (PRs #209–#214). The findings describe the engine as it stands *today*, not the pre-remediation state.
> **Companion files:** `OUTPUT_COVERAGE_MATRIX.md`, `OUTPUT_REPAIR_ROADMAP.md`.
> **Date:** 2026-07-27

---

## 0 · Executive Summary

The system has **one healthy print/PDF path** and **one healthy Excel path**, plus several **orphaned / unreachable** output routes left over from earlier iterations.

- **Print + PDF** are unified: every printer routes through `openPrintWin` (off-screen `<iframe>` → the browser's native print dialog → "Save as PDF"). The html2canvas/jsPDF raster pipeline was retired in PR-3; `savePrintPDF` is now a thin wrapper over `openPrintWin`. This layer is in good health.
- **Excel** is a second, independent engine (SheetJS/XLSX, lazy-loaded via `loadStyledXLSX` + `styleDiwanSheet`). It works but is a separate design system from print.
- **CSV is effectively dead**: `exportCSV()` and the `csv` branch of `exportMemberStmt()` exist and function, but **no button anywhere calls them**. Residual references survive in `auth.js`, `i18n.js`, and the seal lists.
- **`exportPDF(type)`** is a legacy dispatcher with **no caller** — superseded by `exportPagePDF` + the `prt*` family.
- **Share** does not exist. **Copy** exists in exactly one place (user credentials). **QR** exists only on printed vouchers/reports (drawn inside the print iframe).
- **Two design systems** produce customer-facing output (print `PRINT_TOKENS` vs Excel `styleDiwanSheet`), and the **on-screen** ledger (`.acct-stmt` in `app.css`) is a *third* that never reaches either. This is the core motivation for REPORT-001.

**Overall health:** print/PDF **GOOD** · Excel **GOOD (siloed)** · CSV **DEAD** · legacy dispatchers **UNREACHABLE** · Share **MISSING** · UX consistency **PARTIAL**.

---

## Phase 1 — Complete Page Inventory

Routes are the `nav('<route>')` keys; page containers are `#pg-<route>` in `public/index.html`.
Role access is enforced by `ui-nav.js` (`ADMIN_PAGES`, reservation single-page bounce) and `auth.js` (`applyPerms`). Roles: **admin**, **accountant**, **reservation** (AUTH-003 baseline).

| # | Page | Route | Primary JS module | Template | Roles |
|---|------|-------|-------------------|----------|-------|
| 1 | Dashboard | `dash` | `app.js` | `#pg-dash` | admin, accountant |
| 2 | Food — Receipts | `food-rec` | `app.js` (`crud.js`) | `#pg-food-rec` | admin, accountant |
| 3 | Food — Expenses | `food-pay` | `app.js` (`crud.js`) | `#pg-food-pay` | admin, accountant |
| 4 | Food — Fund Statement | `food-stmt` | `app.js` + `print.js` | `#pg-food-stmt` | admin, accountant |
| 5 | Diwan — Receipts | `diwan-rec` | `app.js` (`crud.js`) | `#pg-diwan-rec` | admin, accountant |
| 6 | Diwan — Expenses | `diwan-pay` | `app.js` (`crud.js`) | `#pg-diwan-pay` | admin, accountant |
| 7 | Diwan — Fund Statement | `diwan-stmt` | `app.js` + `print.js` | `#pg-diwan-stmt` | admin, accountant |
| 8 | Donations Register | `don` | `reports.js` + `print.js` | `#pg-don` | admin, accountant |
| 9 | Family Members | `members` | `app.js` + `print.js` | `#pg-members` | admin, accountant |
| 10 | Member Account Statement | `member-stmt` | `app.js` + `print.js` | `#pg-member-stmt` | admin, accountant |
| 11 | Member Financial Unit | `member-workspace` | `member-lifecycle.js` | `#pg-member-workspace` | **admin only** |
| 12 | Annual Subscriptions | `annual` | `app.js` + `print.js` | `#pg-annual` | **admin only** |
| 13 | Annual Debt Report | `annual-debt` | `reports.js` + `print.js` | `#pg-annual-debt` | admin, accountant |
| 14 | Delinquent Members | `delinquent` | `reports.js` + `print.js` | `#pg-delinquent` | admin, accountant |
| 15 | Audit Log | `audit` | `app.js` | `#pg-audit` | **admin only** |
| 16 | User Management | `users` | `user-admin.js` | `#pg-users` | **admin only** |
| 17 | Reservations | `reservations` | `reservations.js` | `#pg-reservations` | admin, **reservation** |
| 18 | Collection Workspace | `collection-workspace` | `collection-workspace.js` | `#pg-collection-workspace` | **admin only** |
| 19 | Payment Workspace | `payment-workspace` | `payment-workspace.js` | `#pg-payment-workspace` | **admin only** |
| 20 | Treasury Workspace | `treasury-workspace` | `treasury-workspace.js` + `print.js` | `#pg-treasury-workspace` | **admin only** |
| 21 | Dues Workspace | `dues-workspace` | `dues-workspace.js` + `print.js` | `#pg-dues-workspace` | **admin only** |
| 22 | Settings (incl. Internal Transfers) | `settings` | `app.js` + `print.js` | `#pg-settings` | **admin only** |
| 23 | Backup | `bk` | `app.js` | `#pg-bk` | **admin only** |

> Reservation-role users are bounced to `reservations` and can reach nothing else (`ui-nav.js:37`).

---

## Phase 2 — Output Inventory

Every distinct output capability in the codebase:

| Capability | Mechanism | Entry function(s) | Reachable? |
|---|---|---|---|
| Voucher print (receipt/payment) | iframe print | `prtRec` / `prtPay` → `openPrintWin` | ✅ per-row buttons |
| Fund statement print | iframe print | `prtStmt('food'|'diwan')` | ✅ |
| Member statement print | iframe print | `prtMemberStmt('print'|'pdf'|'pdf-print')` | ✅ |
| Annual-debt / Delinquent / Donations report print | iframe print | `prtAnnualDebt` / `prtDelinquent` / `prtDonStmt` | ✅ |
| Members list print | iframe print | `prtMembersList` | ✅ |
| Annual subscriptions log print | iframe print | `prtAnnual` | ✅ |
| Internal transfer voucher print | iframe print | `prtTransfer` | ✅ (Settings → transfers list) |
| Consistency/reconcile report print | iframe print | `reconcileReport` (`reports.js`) | ✅ (member-stmt page) |
| "Download PDF" (all pages) | **native Save-as-PDF** via iframe | `exportPagePDF` / `downloadFundStatementPDF` / `prt*('pdf')` → `savePrintPDF` → `openPrintWin` | ✅ |
| Excel export (lists/statements/reports) | SheetJS XLSX | `exportPageExcel`, `exportDelinquentExcel`, `exportMemberStmt('excel')` | ✅ |
| CSV export | `data:text/csv` download | `exportCSV(type)`, `exportMemberStmt('csv')` | ❌ **no button (unreachable)** |
| JSON export (member statement) | `data:application/json` | `exportMemberStmt('json')` | ❌ no button |
| JSON backup | Blob download | `doBackup` | ✅ (topbar/Settings, admin) |
| Backup **restore** | — | *disabled by design (P0 safety)* | ⛔ intentionally removed |
| Copy (login credentials) | `navigator.clipboard` | `user-admin.js:196` | ✅ (create-user flow) |
| Attachment download | Supabase storage link | `downloadAttach` | ✅ (attachment viewer) |
| QR code | qrcodejs inside print iframe | `reportDfoot` `data-qr-url` → `openPrintWin` bootstrap | ✅ (on every printed doc) |
| Share (Web Share API) | — | **none** | ❌ not implemented |
| Legacy generic PDF dispatcher | — | `exportPDF(type)` | ❌ **no caller (dead)** |

---

## Phase 3 — Button Inventory (output buttons)

Legend: **role** — who sees it (gated in the template/renderer by `can.print()` = admin\|accountant, `can.export()` = admin-only). All print/PDF land in `openPrintWin`.

| Page | Button | Icon | Label (AR) | Role | Enabled when | JS function | File:line |
|---|---|---|---|---|---|---|---|
| food/diwan-rec (per row) | Print | `ti-printer` | — | print | always | `prtRec(id)` | `app.js:299/352/435` |
| food/diwan-pay (per row) | Print | `ti-printer` | — | print | always | `prtPay(id)` | `app.js:325/381` |
| food/diwan-rec, -pay | Export ▼ → Excel | `ti-file-spreadsheet` | Excel | export | always | `exportPageExcel('<type>')` | `index.html` (page headers) |
| food/diwan-rec, -pay | Export ▼ → PDF | `ti-file-type-pdf` | PDF | export | always | `exportPagePDF('<type>')` | `index.html` |
| food/diwan-stmt | Print | `ti-printer` | طباعة | print | always | `prtStmt(fund)` | `app.js:955` |
| food/diwan-stmt | Export ▼ Excel/PDF | … | Excel/PDF | export | always | `exportPageExcel/PDF('*-stmt')` | `index.html` |
| member-stmt | Print ▼ (split): Print statement | `ti-file-description` | طباعة كشف الحساب | print | member selected | `prtMemberStmt('print')` | `app.js:1131` |
| member-stmt | Print ▼: Download PDF | `ti-file-type-pdf` | تنزيل PDF | print | member selected | `prtMemberStmt('pdf')` | `app.js:1132` |
| member-stmt | Print ▼: Export Excel | `ti-file-spreadsheet` | تصدير Excel | export | member selected | `exportMemberStmt('excel')` | `app.js:1133` |
| member-stmt | Print ▼: Print PDF | `ti-printer` | طباعة PDF | print | member selected | `prtMemberStmt('pdf-print')` | `app.js:1134` |
| member-stmt (static header) | Print personal statement | `ti-printer` | طباعة الكشف الشخصي | print | member selected | `prtMemberStmt('print')` | `index.html:610` |
| members | Print | `ti-printer` | طباعة | print | always | `prtMembersList()` | `index.html:603` |
| members | Export ▼ Excel/PDF | … | Excel/PDF | export | always | `exportPageExcel/PDF('members')` | `index.html:603` |
| annual | Print | `ti-printer` | طباعة | admin | always | `prtAnnual()` | `index.html:643` |
| annual | Export ▼ Excel/PDF | … | Excel/PDF | admin | always | `exportPageExcel/PDF('annual')` | `index.html:643` |
| annual-debt | Print | `ti-printer` | طباعة | print | always | `prtAnnualDebt()` | `index.html:635`, `reports.js:101` |
| annual-debt | Export ▼ Excel/PDF | … | Excel/PDF | export | always | `exportPageExcel/PDF('annual-debt')` | `index.html:635` |
| delinquent | Print | `ti-printer` | طباعة | print | always | `prtDelinquent()` | `reports.js:208` |
| delinquent | Export ▼ Excel/PDF | … | Excel/PDF | export | always | `exportPageExcel/PDF('delinquent')` | `index.html` |
| don | Print | `ti-printer` | طباعة | print | always | `prtDonStmt()` | `index.html` |
| don | Export ▼ Excel/PDF | … | Excel/PDF | export | always | `exportPageExcel/PDF('don')` | `index.html` |
| audit | Export ▼ Excel/PDF | … | Excel/PDF | admin | always | `exportPageExcel/PDF('audit')` | `index.html` |
| users | Export ▼ Excel/PDF | … | Excel/PDF | admin | always | `exportPageExcel/PDF('users')` | `index.html` |
| users (create-user modal) | Copy credentials | — | نسخ | admin | after create | `navigator.clipboard` | `user-admin.js:196` |
| settings (transfers list) | Print transfer voucher | `ti-printer` | — | print | rows exist | `prtTransfer(id)` | `app.js:2346` |
| topbar / bk | Backup (JSON) | — | نسخة احتياطية | admin | always | `doBackup()` | `app.js:1808` |
| attachment viewer | Download | — | تنزيل | write | attachment exists | `downloadAttach(path,name)` | `app.js:1363` |

### DEAD BUTTON
- **None found.** Every button in the templates resolves to an implemented function.

### UNREACHABLE FEATURE (JS exists, no button)
- **`exportPDF(type)`** (`app.js:1788`) — a generic PDF dispatcher (food-stmt/diwan-stmt/member/don → `prt*`). No `onclick` anywhere. Superseded by `exportPagePDF` + `prt*`. Still referenced by `auth.js` permission selectors (`:214/287`) and the seal list `PRINT_FNS` (`app.js:2454`).
- **`exportCSV(type)`** (`app.js:1850`) — full CSV builder for statements. **No `onclick` anywhere.** Still referenced by `auth.js:214/288`, `i18n.js:1031` (a `querySelectorAll('[onclick*="exportCSV"]')` that now matches nothing), and the seal list `EXPORT_FNS` (`app.js:2455`).
- **`exportMemberStmt('csv'|'json'|'html'|'pdf')`** — only the `'excel'` branch has a button; `csv`/`json` are unreachable, and `html`/`pdf` immediately redirect to `prtMemberStmt('pdf')` (so their bespoke code is inert).

---

## Phase 4 — Execution Verification

Verified by source path (no live cross-browser lab was run; browser-specific rows are behavioural analysis, flagged as such).

| Question | Result |
|---|---|
| Does Print open the print dialog? | **Yes.** `openPrintWin` builds an off-screen `<iframe srcdoc>`, injects fonts/QR async, and calls `iframe.contentWindow.print()` gated on `document.fonts.ready` + a 1200 ms cap (`print.js`). |
| Does "Download PDF" produce a PDF? | **Yes, via the browser's Save-as-PDF** in that same dialog (PR-3). `savePrintPDF` → `openPrintWin(css, body, filename)`; the `<title>` seeds the suggested file name. There is no longer a one-click file write. |
| Does Excel produce a valid XLSX? | **Yes**, when SheetJS loads. `loadStyledXLSX` lazy-loads the CDN lib, then `XLSX.writeFile(wb, name+'.xlsx')` with RTL + `styleDiwanSheet`. **If the CDN is unreachable, it toasts and aborts** (external dependency). |
| Does CSV download? | **Unreachable** — code works (`data:text/csv;charset=utf-8` + `﻿` BOM) but no button invokes it. |
| Does Copy work? | **Yes**, one site (`navigator.clipboard.writeText` for login credentials, with a toast + catch). |
| Does Share work? | **No** — `navigator.share` is not used anywhere. |
| Does QR generate? | **Yes**, inside the print iframe (qrcodejs from CDN, drawn on load; **silently omitted if the CDN is blocked** — degradation, not failure). |
| Does Receipt/Statement print? | **Yes** (see above). |
| Does the browser block it? | **Popups no longer a risk** — the iframe path replaced `window.open` (PR-1), so pop-up blockers and iOS Safari suppression no longer apply. |
| Mobile / iOS Safari? | **Improved** by the iframe path; the remaining mobile risk is memory/really-long tables and the user having to pick "Save as PDF" manually. |
| Safari desktop? | Native print is reliable; `@page size:landscape` + the watermark `transform` are the least-portable CSS used (cosmetic drift only). |

---

## Phase 5 — Output Quality

| Attribute | Print / PDF (iframe) | Excel (XLSX) | Backup (JSON) |
|---|---|---|---|
| Filename | Statement/report `<title>` seeds Save-as-PDF (e.g. `Food-Statement-<date>`); vouchers untitled | `diwan-<type>-<date>.xlsx` / `member-stmt_<date>.xlsx` | `diwan_backup_<date>.json` |
| Extension / MIME | Browser PDF (`application/pdf`) | `.xlsx` (SheetJS writes correct OOXML) | `application/json` |
| Encoding | UTF-8 (iframe doc) | XLSX handles Unicode; sheets set `!rtl` | UTF-8, pretty-printed |
| Orientation | Per-doc `@page` (portrait vouchers/member-stmt; landscape fund/reports) | N/A | N/A |
| Margins | `@page` margin (PR-4 fixed the member-statement double-margin) | N/A | N/A |
| Page size | A4 (all docs) | N/A | N/A |
| Fonts | IBM Plex Sans Arabic/Mono (async-injected; falls back cleanly if CDN blocked) | Excel default; `styleDiwanSheet` sets widths/number formats | N/A |
| Pagination | Native browser paginator; table `<thead>` repeats per page | Excel native | N/A |
| Repeated headers | Column `<thead>` repeats; **brand header does not** (flow content) | Header row styled; not frozen-panes | N/A |
| Totals | From the certified engine (`FIN.*`); `tr.final` / totals rows | Totals rows appended | full row dump |
| Footer | `reportFooter` brand line (page number removed in PR-4 — browser chrome supplies it) | none | none |
| QR | Present on every printed doc via `reportDfoot` | none | none |
| Metadata | none embedded in the PDF (browser-generated) | `_meta`-style header rows only in backup | `_meta{app,schema,exported_at,by,tables}` |

**Quality gaps:** brand header not repeated on multi-page docs (by decision — ROOT-7); no true "Page X of Y"; Excel and print are visually unrelated; no PDF document metadata (title/author) beyond the `<title>`.

---

## Phase 6 — Report Consistency (engines)

| Output family | Engine | Notes |
|---|---|---|
| All vouchers, statements, reports (print **and** "Download PDF") | **`openPrintWin` — off-screen iframe → browser print** | Single source. `savePrintPDF` is a wrapper over it (PR-3). |
| In-iframe print bootstrap | `window.print()` inside the srcdoc | The only live `window.print()` calls besides two guarded fallbacks in the workspaces. |
| Excel | **SheetJS / XLSX** via `loadStyledXLSX` + `styleDiwanSheet` | Separate engine, separate styling, CDN-loaded. |
| CSV / JSON (statement) | hand-built `data:` URIs | CSV unreachable; JSON member-stmt unreachable. |
| Backup | Blob + object URL | JSON only. |
| **Retired** | `html2canvas` / `jsPDF` / `html2pdf` | **Removed in PR-3/PR-6** — no reference remains in `public/js`. |
| **Retired** | `#pra` in-page print target + `@media print` body-hide | **Removed in PR-2.** |

**Verdict:** print/PDF is now single-engine (good). Excel is a **second** engine. The on-screen `.acct-stmt` ledger (in `app.css`) is a **third** presentation that neither print nor Excel shares. Three visual languages for the same financial data → the central argument for a unified REPORT-001.

---

## Phase 7 — Dead / Orphaned Code

| Item | Location | Status |
|---|---|---|
| `exportPDF(type)` | `app.js:1788` | **Dead dispatcher** — no caller; superseded. |
| `exportCSV(type)` | `app.js:1850` | **Dead** — no button; full CSV builder unused. |
| `exportMemberStmt` `csv`/`json` branches | `app.js:1928-1941` | **Unreachable** — only `excel` is wired. |
| `exportMemberStmt` `html`/`pdf` branches | `app.js:1974-1976` | Inert — immediately redirect to `prtMemberStmt('pdf')`. |
| Orphaned permission selectors | `auth.js:214,287,288` | Reference `exportPDF`/`exportCSV`/`doBackup` buttons; the first two match nothing now. |
| Orphaned i18n hook | `i18n.js:1031` | `querySelectorAll('.btn.sm[onclick*="exportCSV"]')` matches nothing. |
| Seal lists | `app.js:2454-2455` | `PRINT_FNS` includes `exportPDF`; `EXPORT_FNS` includes `exportCSV` — sealing dead fns. |
| Backup **restore** | `app.js` (below `doBackup`) | Intentionally disabled (P0 safety) — *not* dead, deliberately removed. |
| **CSS / templates / icons** | — | No dead print CSS found (PR-2/PR-6 cleaned `#pra`, Cairo/Reem-Kufi, `.pdfroot`). No obviously-orphaned output icons. |

> Note: this is **discovery only**. Removing the above is a REPORT-001 migration decision, not part of this audit.

---

## Phase 8 — UX Consistency

Observed patterns across pages:

- **Three different output affordances coexist:**
  1. *Standalone Print button + separate Export ▼ (Excel/PDF)* — most list/report pages (members, annual, annual-debt, delinquent, don, fund statements).
  2. *Split "Print ▼" dropdown* (Print / Download PDF / Export Excel / Print PDF) — member statement only.
  3. *Export ▼ only, no Print* — audit, users.
- **Order not identical:** some pages put Print first then Export ▼; others only Export ▼; the member statement inverts this into one split control.
- **Icons inconsistent:** print `ti-printer`; PDF `ti-file-type-pdf`; Excel `ti-file-spreadsheet` — mostly consistent, but the member-statement "Print PDF" reuses `ti-printer` for a PDF action.
- **Labels inconsistent:** "طباعة" vs "طباعة كشف الحساب" vs "طباعة الكشف الشخصي" (member-stmt has **two** print entry points — static header button *and* the dropdown).
- **CSV advertised nowhere** despite working code — and **Excel present on most data pages but not vouchers** (expected).
- **Reservations page has zero output** — no way to print/export a reservations list or a booking confirmation.
- **Dashboard has no output** (acceptable).
- **QR** appears only on printed documents; there is no on-screen QR/share affordance.

---

## Phase 10 — Root Cause Analysis (broken / degraded outputs)

Severity: **S1** critical · **S2** major · **S3** minor. Confidence: **Confirmed** (from source) · **High**.

### OUT-1 — CSV export is unreachable
- **Observed:** No CSV anywhere in the UI. **Expected:** either working CSV buttons or no CSV code.
- **Root cause:** `exportCSV()` + `exportMemberStmt('csv')` lost their buttons in an earlier redesign; the functions + `auth.js`/`i18n.js` references were left behind.
- **Files/fns:** `app.js:1850` (`exportCSV`), `app.js:1928` (`exportMemberStmt` csv), `auth.js:214/288`, `i18n.js:1031`.
- **Severity S2 (feature gap) · Confidence Confirmed.**

### OUT-2 — `exportPDF(type)` dead dispatcher
- **Observed:** Never invoked. **Root cause:** superseded by `exportPagePDF` + `prt*`; kept for compatibility in seal/permission lists.
- **Files/fns:** `app.js:1788`, `app.js:2454`, `auth.js:214/287`.
- **Severity S3 · Confidence Confirmed.**

### OUT-3 — Excel depends on a live CDN (SheetJS)
- **Observed:** Excel export fails (toast) if the SheetJS CDN is unreachable. **Root cause:** `loadStyledXLSX` lazy-loads XLSX from CDN at click time with no offline/self-hosted fallback (same class of risk the print fonts/QR had before PR-1's resilience work).
- **Files/fns:** `app.js:1746` (`loadStyledXLSX`).
- **Severity S2 (availability) · Confidence High.**

### OUT-4 — Brand header not repeated on multi-page docs; no real page numbers
- **Observed:** On a long report, the brand block prints once and there is no "Page X of Y". **Root cause:** `reportHeader` is flow content (only table `<thead>` repeats); true running headers need `position:fixed` and real page numbers need a pagination polyfill. **Left open by explicit owner decision in PRINT-001.**
- **Files/fns:** `print.js` `reportHeader`/`reportFooter`.
- **Severity S3 · Confidence Confirmed.**

### OUT-5 — Two/three visual systems for the same data
- **Observed:** Print, Excel, and on-screen ledgers look different. **Root cause:** `PRINT_TOKENS` (print), `styleDiwanSheet` (Excel), and `.acct-stmt` (screen) are independent. **Not a bug** — the architectural driver for REPORT-001.
- **Severity S2 (consistency) · Confidence Confirmed.**

### OUT-6 — Reservations has no output path
- **Observed:** Cannot print/export reservations. **Root cause:** `reservations.js` implements no output action. **Severity S3 (gap) · Confidence Confirmed.**

### OUT-7 — QR / fonts still CDN-dependent inside the print doc
- **Observed:** QR omitted and fonts fall back if `cdnjs`/Google Fonts are blocked. **Root cause:** async CDN injection (resilient — never hangs — but not self-hosted). **Severity S3 · Confidence High.**

> **No S1 output defects remain post-PRINT-001.** The former S1 (blank native print) was fixed in PR-2; the raster-PDF defects (faded text, sliced rows) were fixed in PR-3.

---

*Phases 9 (coverage matrix) and 11 (redesign recommendation) are delivered in the
companion files `OUTPUT_COVERAGE_MATRIX.md` and `OUTPUT_REPAIR_ROADMAP.md`.*

*End of forensic audit. No source files were modified; no commit was created by the audit itself.*
