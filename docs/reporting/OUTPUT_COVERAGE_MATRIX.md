# OUTPUT-001 — Output Coverage Matrix (Phase 9)

> Read-only. Baseline `main` @ `deb910f` (after PRINT-001 PRs #209–#214).
> Status key: **✅ Working** · **⚠️ Partial** · **❌ Missing** · **💀 Dead/Unreachable** · **— N/A**.
> "Print" and "PDF" are the *same* engine (`openPrintWin` iframe → browser print → Save-as-PDF); PDF = choosing "Save as PDF" in that dialog.

## Per-page coverage

| Page | Print | PDF | Excel | CSV | Copy | Share | QR | Overall |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| Dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | No outputs (by design) |
| Food — Receipts | ✅ (per row) | ✅ | ✅ | 💀 | — | ❌ | ✅ (voucher) | Working |
| Food — Expenses | ✅ (per row) | ✅ | ✅ | 💀 | — | ❌ | ✅ (voucher) | Working |
| Food — Fund Statement | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Diwan — Receipts | ✅ (per row) | ✅ | ✅ | 💀 | — | ❌ | ✅ (voucher) | Working |
| Diwan — Expenses | ✅ (per row) | ✅ | ✅ | 💀 | — | ❌ | ✅ (voucher) | Working |
| Diwan — Fund Statement | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Donations Register | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Family Members | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Member Account Statement | ✅ | ✅ | ✅ | 💀 (code only) | — | ❌ | ✅ | Working (CSV/JSON dead) |
| Member Financial Unit | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | Navigates out; no own output |
| Annual Subscriptions | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Annual Debt Report | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Delinquent Members | ✅ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Working |
| Audit Log | ❌ | ✅ | ✅ | 💀 | — | ❌ | ✅ | Partial (no dedicated Print button) |
| User Management | ❌ | ✅ | ✅ | 💀 | ✅ (creds) | ❌ | ✅ | Partial |
| Reservations | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **Missing all outputs** |
| Collection Workspace | ❌ | ❌ | ❌ | ❌ | — | ❌ | — | Navigates out; no own output |
| Payment Workspace | ❌ | ❌ | ❌ | ❌ | — | ❌ | — | Navigates out; no own output |
| Treasury Workspace | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | Working (print position); no Excel |
| Dues Workspace | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | Working (print year); no Excel |
| Settings → Internal Transfers | ✅ (voucher) | ✅ | ❌ | ❌ | — | ❌ | ✅ | Working |
| Backup | — | — | — | — | — | ❌ | — | JSON backup ✅ (own format) |

## Capability totals

| Capability | Working pages | Notes |
|---|---|---|
| **Print** (iframe → dialog) | 15 surfaces | Single unified engine |
| **PDF** (Save-as-PDF) | 15 surfaces | Same engine as Print |
| **Excel** (XLSX) | 13 pages | Separate SheetJS engine; CDN-loaded |
| **CSV** | 0 reachable | 💀 code exists (`exportCSV`, `exportMemberStmt('csv')`) — no button |
| **Copy** | 1 (user credentials) | `navigator.clipboard` |
| **Share** | 0 | Web Share API not implemented |
| **QR** | every printed doc | qrcodejs inside the print iframe |
| **JSON** | 1 (backup) + 1 dead (member-stmt) | backup reachable; member-stmt JSON unreachable |

## Status roll-up

| Status | Count | Items |
|---|---|---|
| ✅ Working | Print/PDF (15), Excel (13), QR (all prints), Copy (1), Backup (1) | Core output health is good |
| ⚠️ Partial | Audit & Users (Export ▼ only, no Print button); Treasury/Dues (no Excel) | Consistency gaps |
| ❌ Missing | Reservations (all), Share (global), member-workspace/collection/payment own-output | Feature gaps |
| 💀 Dead/Unreachable | `exportCSV`, `exportPDF`, `exportMemberStmt` csv/json/html/pdf branches, orphaned `auth.js`/`i18n.js` selectors | Cleanup targets for REPORT-001 |

## Engine attribution (Phase 6 cross-reference)

| Output | Engine | File |
|---|---|---|
| All Print + all "Download PDF" | `openPrintWin` (iframe → native print) | `print.js` |
| Excel (all) | SheetJS `XLSX` + `styleDiwanSheet` | `app.js`, `reports.js` |
| Backup | Blob/JSON | `app.js` (`doBackup`) |
| Copy | `navigator.clipboard` | `user-admin.js` |
| QR | qrcodejs (CDN, in-iframe) | `print.js` |
| CSV/JSON statement | `data:` URIs | `app.js` (unreachable) |
| ~~Raster PDF~~ | ~~html2canvas/jsPDF~~ | **retired (PR-3/6)** |
