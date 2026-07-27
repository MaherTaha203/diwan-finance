# REPORT-001 · R0 — Foundation (delivery record)

> First implementation phase of the Unified Financial Reporting Engine.
> **Bounded by design:** tokens, self-hosted fonts, registry, engine skeleton,
> renderer interfaces, empty renderers, tests, docs. **No report is migrated in R0.**
> Governed by `REPORT-001_ARCHITECTURE_SPEC.md` (incl. the 2026-07-27 owner
> amendments §2.5 Report Registry and §2.6 Output Capability Matrix).

## What R0 ships

| Deliverable | Where |
|---|---|
| Design Tokens (single source; namespaced `--rpt-*`) | `public/js/report-engine.js` → `REPORT_TOKENS` |
| **Self-hosted fonts** (no CDN) | `public/fonts/*.woff2` (11 files) + `@font-face` in `REPORT_TOKENS` |
| Report Registry (15 reports, keyed by ID) | `report-engine.js` → `ReportRegistry` |
| Report Engine skeleton | `report-engine.js` → `Report.render(modelOrId, target[, opts])` |
| Renderer interfaces + **empty** renderers | `report-engine.js` → `Renderers.{screen,print,pdf,excel,csv}` |
| Auto output-button builder | `report-engine.js` → `Report.outputButtons(id, ctx)` |
| Tests | `tests/report-engine.test.cjs` (24 assertions) |
| Docs | this file + spec amendments |

## Success criterion (met)

```js
Report.render(model, "print");   // → { ok:true, skeleton:true, target:"print", result:{ status:"skeleton", body:"" } }
Report.render(model, "pdf");     // → skeleton
Report.render(model, "excel");   // → skeleton
Report.render("MEMBER_STATEMENT", "print");   // id form
```

All four media are callable and return a valid **empty skeleton** without throwing.
The structure is fixed; no real report is produced yet — exactly the R0 goal.

## Intentionally empty / dormant (by design)

- **Renderers render nothing** — each returns `{ status:'skeleton', body:'' }`. Real
  delivery arrives in R3 (print), R4 (pdf), R5 (excel/csv).
- **Engine is loaded but dormant** — `report-engine.js` is included in `index.html` and
  exposes `window.Report`, but **no production code calls it** and it has **no
  load-time side effects** (no style injected, no font fetched until a renderer runs).
- **`defaultColumns` are declared metadata only** — no renderer consumes them until each
  report is migrated (R6/R7).
- **`Report.outputButtons` is not placed on any page yet** — it exists and is tested; it
  gets wired per report during migration.

## Font provenance

`public/fonts/*.woff2` are IBM Plex Sans Arabic (arabic+latin, 400/500/600/700) and
IBM Plex Mono (latin, 400/500/600), extracted from the `@fontsource/ibm-plex-sans-arabic`
and `@fontsource/ibm-plex-mono` npm packages. **License: SIL Open Font License 1.1**
(redistribution/self-hosting permitted). ~320 KB total.

## Definition of Done (R0)

- [x] Design tokens defined as a single source (`REPORT_TOKENS`).
- [x] Fonts self-hosted; `REPORT_TOKENS` references `/fonts/` only (no CDN / external URL).
- [x] `ReportRegistry` holds all 15 target reports, each with the 8 required fields.
- [x] `Report.render(model, target)` + id form callable for screen/print/pdf/excel/csv.
- [x] Renderers share one interface and are empty (no report migrated).
- [x] Unsupported output / unknown report / unknown target rejected cleanly (no throw).
- [x] `Report.outputButtons` builds only declared outputs, permission-gated.
- [x] Tests green (`node tests/report-engine.test.cjs` → 24/24).
- [x] No production behaviour changed (engine dormant; legacy print/Excel untouched).

## Next — R1 (ReportModel)

Freeze the `ReportModel` schema and implement `buildMemberStatementModel()` projecting
`FIN.memberStatementView`, with a parity test asserting the model equals the current
member-statement values. No rendering yet. R1 does not begin until R0 is approved.
