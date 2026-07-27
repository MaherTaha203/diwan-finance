# REPORT-001 · R3 — Print Renderer (delivery record)

> Fourth phase. Makes the engine's `print` renderer **real**: it builds the shared
> layout (R2) and delivers it through the PRINT-001 iframe (`openPrintWin`), so
> `Report.render(model, 'print')` produces an actual printout. **Still behind the
> engine — the live member-statement page is NOT cut over (that is R6).**

## What R3 ships

| Deliverable | Where |
|---|---|
| `Report.registerRenderer(target, renderer)` — pluggable renderers | `public/js/report-engine.js` (additive) |
| Print renderer (`compose` + `render`) | `public/js/report-render-print.js` |
| Node tests | `tests/report-render-print.test.cjs` (13) |
| End-to-end proof (Playwright) | model → engine → layout → `openPrintWin` iframe |

## Design

- **Reuses the proven PRINT-001 path.** `PrintRenderer.render` calls
  `openPrintWin(css, html, title)` — the off-screen iframe with `fonts.ready`-gated
  printing, no popup, QR support. No new print machinery.
- **Split for testability.** `PrintRenderer.compose(model, {lang}) → {html, css,
  filename, orientation}` is **pure** (no DOM); `render()` composes then delivers via
  `openPrintWin` when present, else returns `status:'composed'` (clean in node).
- **Orientation from the model.** `@page` size/margin derive from `meta.orientation`
  (portrait 9 mm / landscape 10 mm).
- **Deterministic unified filename** — `<REPORT_ID>-<party?>-<YYYY-MM-DD>` (seeds the
  browser's Save-as-PDF name; satisfies the §7 "unified filenames" gate).
- **Pluggable.** The engine now swaps renderers via `registerRenderer`, so R4 (pdf) and
  R5 (excel) add their own modules without editing the engine core. `print` is the only
  target wired in R3; `screen`/`pdf`/`excel`/`csv` remain skeletons.

## Verification

- `tests/report-render-print.test.cjs` (**13/13**): `compose()` assembles the layout +
  `@page` (portrait 9 mm; landscape 10 mm), fonts + repeating-header rule present,
  deterministic filename; registration makes `Report.render(model,'print')` **not a
  skeleton**; other targets stay skeletons; graceful `layout_unavailable` fallback.
- **End-to-end (Playwright):** `Report.render(model,'print')` creates the
  `#diwan-print-frame` iframe whose `srcdoc` carries the rendered statement (`rpt-doc`,
  member name, `₪ 1,200`, portrait `@page`), fires `print()` exactly once, and **never
  calls `window.open`**. Filename `MEMBER_STATEMENT-A-102-2026-07-27`.
- R0 + R1 + R2 suites still green; full `tests/` sweep clean apart from the two
  pre-existing flag-gated failures.

## Definition of Done (R3)

- [x] Engine gains `registerRenderer`; print renderer swaps its skeleton.
- [x] `Report.render(model,'print')` builds the layout and delivers via `openPrintWin`.
- [x] Pure `compose()` + testable delivery; deterministic filename; orientation-aware `@page`.
- [x] Node tests (13/13) + Playwright e2e green; R0–R2 still green.
- [x] Dormant — registered at load, **no production call site**; live page untouched.

## Next — R4 (PDF Renderer)

Add the `pdf` renderer: same layout + `openPrintWin` path (native Save-as-PDF), seeding
PDF document title/filename from `meta`, and — decided once, centrally — the running
header/footer + real "Page X of Y" (the deferred PRINT-001 ROOT-7). Begins only on approval.
