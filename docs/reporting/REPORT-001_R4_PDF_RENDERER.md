# REPORT-001 · R4 — PDF Renderer + running header/footer (delivery record)

> Fifth phase. Makes the engine's `pdf` renderer **real** and adds the
> **running brand header/footer** that repeats on every printed page — the
> deferred PRINT-001 ROOT-7. Per the certified PRINT-001 decision, a "PDF" is a
> native Save-as-PDF (no html2canvas/jsPDF): it reuses the SAME shared layout
> (R2) and the SAME iframe primitive (`openPrintWin`) as the print renderer.
> **Still behind the engine — no live page is cut over (that is R6+).**

## What R4 ships

| Deliverable | Where |
|---|---|
| PDF renderer (`compose` + `render`), reuses the print composition | `public/js/report-render-pdf.js` |
| Running header/footer bands (print-only, repeat every page) | `public/js/report-layout.js` (`runningHeader` / `runningFooter` + CSS) |
| `@page` margins reserved for the running bands | `public/js/report-render-print.js` (`pageCss`) |
| Totals row appears **once** at the ledger's true end | `public/js/report-layout.js` (`tfoot{display:table-row-group}`) |
| Node tests | `tests/report-render-pdf.test.cjs` (18) |
| Multi-page proof (Playwright → real A4 PDF, 3 pages) | model → engine → layout → `page.pdf()` |
| Dormant script wired | `public/index.html` (`report-render-pdf.js?v=0.4`) |

## Design

- **PDF = native print.** `PdfRenderer.render` calls the same `openPrintWin(css,
  html, title)` iframe the print renderer uses; the browser's Save-as-PDF backend
  produces the file, seeded with the unified filename. No new PDF machinery.
- **One composition, two targets.** `PdfRenderer.compose` delegates to
  `ReportPrintRenderer.compose` (resolved at call time so a missing print module
  degrades to `print_renderer_unavailable` instead of throwing). Print and PDF are
  therefore pixel-identical by construction — the only difference is user intent.
- **Running brand header/footer** live in the shared layout as two print-only
  bands (`.rpt-runhead` top, `.rpt-runfoot` bottom), `display:none` on screen and
  `position:fixed` in `@media print` so they repeat on **every** page. The in-flow
  masthead (`.rpt-mast-brand`) and in-flow footer are hidden in print so the brand
  is carried once per page by the running bands, not duplicated.
- **Reserved page margins.** `pageCss` now uses `@page{margin:14mm <side> 12mm}`
  (was a uniform 9/10 mm) so the fixed bands (9 mm top / 7 mm bottom) never overlap
  body content across page breaks.
- **Page numbers stay native.** Per the owner's "Native + running header/footer"
  decision, "Page X of Y" comes from the browser's own print / Save-as-PDF chrome
  — no in-document counter, no paged.js dependency.

## Chromium trade-off (documented, deliberate)

Chromium repeats **either** a `position:fixed` running band **or** a
`table-header-group` `<thead>` across pages — **not both** (they contend for the
same print mechanism; verified empirically — column headers repeat only when the
running bands are removed). Getting both would require paged.js, which PRINT-001
rejected. Per the owner's running-header decision we repeat the **brand band** on
every page; the table's **column headers** head the ledger on page 1. The totals
`<tfoot>` is pinned to `table-row-group` so the final balance appears **once** at
the true end — never as a misleading mid-ledger footer on each page.

## Verification

- `tests/report-render-pdf.test.cjs` (**18/18**): the shared layout emits the
  running bands (off on screen; fixed top/bottom in print; masthead+footer hidden
  in print); `compose()` reuses the print composition (same `@page`
  `14mm/side/12mm`, same deterministic filename `MEMBER_STATEMENT-A-12-…`);
  registration makes `Report.render(model,'pdf')` **not a skeleton**; print stays
  real; excel/screen stay skeletons; graceful `print_renderer_unavailable` fallback.
- **Multi-page (Playwright → real A4 PDF):** a 70-row member statement renders to a
  **3-page** PDF. The running brand header (`ديوان آل طه — diwan-finance.com`) and
  footer (`طُبع: …`) repeat on **all three** pages with **no content overlap**;
  the final-balance totals row appears **once** (page 3) with the signatures; the
  filename seed is `MEMBER_STATEMENT-A-102-2026-07-27`.
- R0 + R1 + R2 + R3 suites still green; the earlier `@page` margin (9/10 mm) test
  assertions were updated to the reserved `14mm <side> 12mm` values.

## Definition of Done (R4)

- [x] `Report.render(model,'pdf')` builds the shared layout and delivers via `openPrintWin`.
- [x] Pure `compose()` reused from print; deterministic filename; orientation-aware `@page`.
- [x] Running brand header/footer repeat on every printed page; body never overlaps them.
- [x] Totals row appears once at the true end (no per-page repetition).
- [x] Native page numbers (browser chrome); no paged.js.
- [x] Node tests (18/18) + multi-page Playwright PDF proof; R0–R3 still green.
- [x] Dormant — registered at load, **no production call site**; live page untouched.

## Next — R5 (Excel Renderer)

Add the `excel` target: map the model's columns/rows to a spreadsheet export
(the `can.export()` = admin-only path). Begins only on the owner's explicit
"أبدا R5".
