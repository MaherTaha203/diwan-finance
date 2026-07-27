# REPORT-001 · R5 — Excel Renderer (delivery record)

> Sixth phase. Makes the engine's `excel` renderer **real**: it maps the neutral
> ReportModel (R1) into a styled `.xlsx` using the app's existing
> `xlsx-js-style` path, reusing the certified "Diwan sheet" design language.
> **Still behind the engine — no live page is cut over (that is R6+).** Excel is
> the admin-only export path (`can.export()`); gating lives at the call site.

## What R5 ships

| Deliverable | Where |
|---|---|
| Excel renderer (`compose` + `render`) | `public/js/report-render-excel.js` |
| Node tests | `tests/report-render-excel.test.cjs` (28) |
| Real `.xlsx` write proof (xlsx-js-style, read-back + XML inspection) | scratchpad harness |
| Dormant script wired | `public/index.html` (`report-render-excel.js?v=0.5`) |

## Design

- **Same model, different medium.** A spreadsheet is not HTML, so — unlike the
  print/pdf renderers — the Excel renderer does **not** go through the layout
  HTML. It consumes the **same ReportModel**, so every figure is identical by
  construction (single source of truth). Numbers stay **numbers** in the sheet
  (money/balance/num), so Excel can sum/filter; dates become `dd/mm/yyyy`
  strings; text is localized by `lang`.
- **Split for testability** (mirrors print/pdf). `ExcelRenderer.compose(model,
  {lang}) → { aoa, cols, merges, styles, sheetName, filename, rtl }` is **pure**
  (no DOM, no XLSX) — the array-of-arrays plus per-cell styling directives
  (`titleRows / subRows / headerRows / totalRows / bandRows / footRows /
  moneyCells`). `render()` then builds and writes the workbook via the runtime
  `xlsx-js-style` lib; in node (no lib) it returns `status:'composed'` cleanly.
- **Reuses the certified "Diwan sheet" look** — the exact Theme-01 palette from
  `app.js` `styleDiwanSheet`: deep-navy (`0F1B33`) header + totals fill, white
  bold text, ice-paper (`F2F5FA`) zebra, gold-underlined summary/band strips, `₪
  #,##0` number format, RTL workbook, autofilter + frozen header over the primary
  table's header row. No new dependency — the app already loads `xlsx-js-style`.
- **Unified filename** — `<REPORT_ID>-<party.code?>-<YYYY-MM-DD>`, identical to
  the print/pdf renderers (§7 gate). Sheet name = the report title, sanitized to
  Excel's 31-char / no-`[]:*?/\` rule.
- **Generic, not member-specific.** Title → subtitle (party + period) → summary
  strips → each section (band row, or table = header + rows + totals + footnotes).
  Any report whose model exists renders without renderer changes.

## Verification

- `tests/report-render-excel.test.cjs` (**28/28**): `compose()` is pure and
  assembles the description; the title/subtitle/party/period are carried; figures
  are preserved as **raw numbers** (carried 1200, final 350, totSub 900, …);
  ledger header + totals (label + status) + carried band + the donations second
  table + its footnote are all present and correctly flagged; money cells are
  recorded as `[row,col]`; the primary header row seeds autofilter/freeze;
  registration makes `Report.render(model,'excel')` **not a skeleton**; print/pdf
  stay real; screen/csv stay skeletons; invalid-model guard (`model_invalid`).
- **Real `.xlsx` write (xlsx-js-style in node):** a member statement (5 moves +
  donation) writes `MEMBER_STATEMENT-A-102-2026-07-27.xlsx` (`status:'delivered'`,
  range `A1:H19`, 3 merges). Unzipping the file confirms the embedded XML carries
  the **navy fill `0F1B33`**, the **`₪ #,##0` number format**, `rightToLeft="1"`,
  and `<autoFilter ref="A9:H19"/>`. (Freeze pane is best-effort — the community
  lib does not always serialize it, same as the current production export.)
- R0–R4 suites still green.

## Definition of Done (R5)

- [x] `Report.render(model,'excel')` maps the model and writes a styled `.xlsx` via the runtime lib.
- [x] Pure `compose()` description; testable; numbers preserved for spreadsheet math.
- [x] Reuses the certified Diwan-sheet design (navy header/total, ₪ format, RTL, autofilter).
- [x] Deterministic unified filename shared with print/pdf.
- [x] Generic over any ReportModel (title/subtitle/summary/band/table/totals/footnotes).
- [x] Node tests (28/28) + real `.xlsx` write/inspect proof; R0–R4 still green.
- [x] Dormant — registered at load, **no production call site**; live page untouched.

## Next — R6 (Member Statement cut-over — the pilot)

Wire the live Member Financial Statement to `Report.render(...)` for
screen/print/pdf/excel, replacing its legacy builders behind a flag, and prove
end-to-end parity (same numbers, same look) against the certified output. This is
the first real cut-over; it begins only on the owner's explicit "أبدا R6". Legacy
removal remains R8 — only after every replacement is complete and verified.
