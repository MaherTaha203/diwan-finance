# REPORT-001 · R2 — Layout Components (delivery record)

> Third phase. Ships the **renderer-agnostic Layout Engine** that turns a frozen
> `ReportModel` (R1) into the ordered layout components of spec §3, as shared HTML +
> the namespaced `rpt-*` component CSS deferred from R0. **No renderer wired, no
> report migrated, no production call site.**

## What R2 ships

| Deliverable | Where |
|---|---|
| Layout Engine `ReportLayout.build(model, {lang}) → {html, css}` | `public/js/report-layout.js` |
| Ordered components (§3): Header · Meta · KPI · Filters · Band · Table · Notes · Signatures · Footer | same |
| Cell formatters (money / date / balance-Dr-Cr / num / text) + i18n `{ar,en}` | same |
| Component CSS `REPORT_COMPONENT_CSS` (namespaced `rpt-*`, uses R0 token vars) | same |
| `balance` column format (signed → abs + Dr/Cr tag) | `report-model.js` (added to `VALID_FORMAT`; applied to ledger `bal` + carried band) |
| Tests | `tests/report-layout.test.cjs` (28 assertions) |
| Visual snapshot | member statement rendered from the model under `@media print` (A4 portrait) |

## Design (held to the immutable principles)

- **One HTML for screen/print/PDF.** `build()` emits the same component markup that the
  Screen (R6), Print (R3) and PDF (R4) renderers all consume — they differ only in
  delivery + page CSS. Excel maps from the model's columns separately (R5).
- **Presentation lives in the layout, not the model.** Formatting (₪ grouping, dd/mm/yyyy,
  Dr/Cr derivation from the signed `balance`) is applied here; the model still carries raw
  values + `{ar,en}` labels only.
- **Namespaced + token-driven.** All classes are `rpt-*` and pull the R0 design tokens
  (`--rpt-*` + self-hosted `@font-face`); the component CSS touches **no** legacy `.dt` /
  `.acct-stmt` / `.card` styles.
- **Print-ready by construction.** The component CSS repeats `<thead>` per page and keeps
  rows / totals / band / signatures atomic (`page-break-inside:avoid`).

## Verification

- `tests/report-layout.test.cjs` (**28/28**): ordered components present; money/date/
  balance formatting correct; totals row shows final balance + status; every certified
  figure present with no `[object Object]` leakage; CSS carries `@font-face` + the
  repeating-header rule; namespaced classes; English variant swaps labels; empty statement
  still builds.
- R1 `report-model.test.cjs` still green after the additive `balance` format.
- **Visual snapshot** (Playwright, `media:'print'`): the member statement renders from the
  model alone as a complete A4 document (brand header, KPI cards, carried band, ledger with
  Dr tags + running balance, totals + status, donations table + footnote, footer; RTL).
- Full `tests/` sweep clean apart from the two pre-existing flag-gated failures.

## Definition of Done (R2)

- [x] Layout Engine builds every §3 component from a model, renderer-agnostic.
- [x] Formatters produce the faithful presentation (money/date/balance/Dr-Cr) in AR + EN.
- [x] Component CSS is namespaced `rpt-*`, token-driven, print-ready (repeating headers).
- [x] Tests green (28/28); R0 + R1 still green.
- [x] Visual snapshot approved (member statement from the model).
- [x] No renderer wired, no report migrated, no production behaviour changed (dormant script).

## Next — R3 (Print Renderer)

Wire `Renderers.print` to `ReportLayout.build(model)` + `openPrintWin(css, html, title)`
(the PRINT-001 iframe), so `Report.render(model, 'print')` produces a real printout for
the pilot — still behind the engine, not yet cut into the live member-statement page
(that is R6). R3 begins only on approval.
