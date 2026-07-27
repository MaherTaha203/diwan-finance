# REPORT-001 · R7b — Annual Debt + Delinquent cut-over (outputs)

> Second slice of **R7**. Routes the shareable **output documents** (print · PDF
> · Excel) of the Annual Debt and Delinquent reports through the unified engine,
> each behind its own default-OFF flag. Their on-screen views stay legacy on
> purpose (see below). **No `FIN`/DB/accounting change.**

## Scope decision — why outputs only

Unlike the member/fund statements (whose filters live in the page chrome), these
two reports render **interactive filter controls inside the report container**
(category + year chips for debt; category + year `<select>` for delinquent).
Replacing that container with the engine document would break those controls. So
R7b cuts over only the **output documents** — the gatherers read the live
view-state (`annualDebtModel` / `delinquentRows`), so the printed/exported
document matches exactly what is on screen. Full on-screen convergence (relocating
the filters to the page chrome) is a later refinement.

## The flags

```js
window.REPORT_ENGINE_ANNUAL_DEBT   // default OFF
window.REPORT_ENGINE_DELINQUENT    // default OFF   (independent)
```

OFF → `prtAnnualDebt` / `prtDelinquent` / `exportPageExcel` run legacy, inert.
ON → those outputs render from one engine model (`ReportModels.annualDebt` /
`.delinquent`), so print == PDF == Excel for each report.

## What R7b ships

| Deliverable | Where |
|---|---|
| `buildAnnualDebtModel` (fixed 9 cols) + `buildDelinquentModel` (**dynamic per-year cols**) + gatherers | `public/js/report-model.js` |
| Output-only debt adapters over the cut-over core | `public/js/report-cutover-debt.js` |
| View-state fns exposed for the gatherers | `public/js/reports.js` (`window.annualDebtModel`, `window.delinquentRows`) |
| Flag-gated branches in the live output fns | `public/js/reports.js` (`prtAnnualDebt`, `prtDelinquent`), `public/js/app.js` (`exportPageExcel`) |
| Node tests | `tests/report-r7b-debt.test.cjs` (20) |
| Render proof (Playwright) | both landscape reports |
| Dormant scripts wired | `public/index.html` (`?v=0.7`) |

## Design

- **Annual Debt** maps `FIN.debtReportRows` (the certified IG-006 model) to the 9
  declared columns; `current` is a **signed balance** (Dr/Cr), the totals row sums
  everything except `current`, and `meta.filters` carries the category + shown/total
  chips — matching the legacy `_adHead` / `_adCurCell` exactly.
- **Delinquent** builds **dynamic per-year columns** between phone and the unpaid
  count. Each year cell reuses the legacy `_delCell` status string (a pure port):
  `✓ مسدد`, `✗ <remaining> ₪`, `◐ جزئي`, and the Owner-approved `●` marker for
  authoritative years; a year with `due ≤ 0` → `—`.
- **The debt adapters are output-only** — they use the cut-over core's `deliver`
  (no `renderScreen`), so nothing on screen is replaced. The engine's `excel`
  renderer maps the dynamic delinquent columns generically.

## Verification

- `tests/report-r7b-debt.test.cjs` (**20/20**): the annual-debt model validates,
  keeps the 9 columns in order, preserves the signed `current` (debtor + creditor)
  and the totals-minus-current; the delinquent model builds dynamic year columns,
  mirrors `_delCell` (paid / remaining / `●` authoritative / `—`); both layouts
  render; and the adapters route print/pdf/excel to the engine only when their
  (independent) flags are ON, inert when OFF.
- **Render proof (Playwright):** both landscape reports in the unified design —
  Annual Debt with the 9 columns + Dr/Cr `current` + totals, and Delinquent with
  the 2023/2024/2025 dynamic columns + status cells (incl. `✗ 150 ₪` and the `●`).
- Full sweep: **no regressions** — R0–R6 + R7a/R7b green; only the 4 pre-existing
  suites remain non-clean.

## Definition of Done (R7b)

- [x] `ReportModels.annualDebt` / `.delinquent` build one engine model each from live view-state.
- [x] Two independent default-OFF flags route print/PDF/Excel through the engine.
- [x] Interactive screens preserved (outputs-only cut-over); legacy inert when OFF.
- [x] Dynamic per-year delinquent columns + faithful status cells.
- [x] Node tests (20) + render proof; no regressions.

## Next — R7c (Donations register)

`buildDonationReportModel` + an adapter (donations has a screen too; assess
whether its filters allow full screen cut-over or outputs-only). Begins on
"أبدا R7c" (or "أبدا").
