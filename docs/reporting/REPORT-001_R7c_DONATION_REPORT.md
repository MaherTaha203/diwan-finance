# REPORT-001 · R7c — Donations Register cut-over (outputs)

> Third slice of **R7**. Routes the shareable **output documents** (print · PDF ·
> Excel) of the Donations Register through the unified engine, behind one
> default-OFF flag. Its on-screen paginated table (with per-row actions) stays
> legacy. **No `FIN`/DB/accounting change.**

## The flag

```js
window.REPORT_ENGINE_DONATION_REPORT   // default OFF
```

OFF → `prtDonStmt` / `exportPagePDF('don')` / `exportPageExcel('don')` run legacy,
inert. ON → those outputs render from one `ReportModels.donationReport()` model,
so print == PDF == Excel.

## What R7c ships

| Deliverable | Where |
|---|---|
| `buildDonationReportModel` + `ReportModels.donationReport` | `public/js/report-model.js` |
| Reusable `window.donationDirectionLabel` (shared by print + the gatherer) | `public/js/reports.js` |
| Output-only donation adapter over the cut-over core | `public/js/report-cutover-donation.js` |
| Flag-gated branches in the live output fns | `public/js/reports.js` (`prtDonStmt`), `public/js/app.js` (`exportPagePDF`, `exportPageExcel`) |
| Node tests | `tests/report-r7c-donation.test.cjs` (13) |
| Render proof (Playwright) | the register with its 7 figure cards |
| Dormant script wired | `public/index.html` (`?v=0.7`) |

## Design

- **The register model** carries the 7 declared columns (date · ref · donor ·
  amount · currency · direction · note), seven figure cards (count, cash total,
  in-kind documentary value, debt settlement, food deficit, food current support,
  to-Diwan), and a totals row that **caps the amount column at the CASH total**
  with the in-kind documentary value shown **separately** in the status — the
  Domain 3 §4.2 rule (in-kind is never conflated with cash).
- **One direction rule.** `donDir` — the per-row "direction" label (in-kind →
  documentary; food-directed shows the allocation splits `debt/deficit/current`)
  — was extracted into a reusable `window.donationDirectionLabel(r, perReceipt,
  en)` used by BOTH the legacy print and the engine gatherer, so the exported
  document is identical in wording to the legacy one.
- **Outputs-only** (the core's `deliver`, no `renderScreen`): the interactive
  paginated donations table is untouched.

## Verification

- `tests/report-r7c-donation.test.cjs` (**13/13**): the model validates, keeps the
  7 columns in order, preserves amount/currency, carries the in-kind direction
  label, exposes 7 summary cards (cash total tagged positive), **caps totals at the
  cash total** with the in-kind value in the status; the layout renders it; and the
  adapter routes print/pdf/excel to the engine only when the flag is ON, inert when OFF.
- **Render proof (Playwright):** the register in the unified design — title, the
  seven figure cards, the 7-column table with the shared direction labels
  (`صندوق الغداء · دعم حالي`, `خزينة الديوان`, `عيني/خدمي · توثيقي`), and the
  `الإجمالي النقدي (العيني مستبعَد — §4.2)` totals row.
- Full sweep: **no regressions** — R0–R6 + R7a/R7b/R7c green.

## Definition of Done (R7c)

- [x] `ReportModels.donationReport` builds one model from `FIN.donationRegister`.
- [x] Default-OFF flag routes print/PDF/Excel through the engine; legacy inert when OFF.
- [x] Shared direction label (print == engine); cash/in-kind split preserved (§4.2).
- [x] Interactive paginated screen untouched (outputs-only).
- [x] Node tests (13) + render proof; no regressions.

## Next — R7d (Lists)

Members list · Annual subscriptions log · Users — `build*Model` + adapters (some
have screens; assess screen vs outputs-only per surface). Begins on "أبدا R7d".
