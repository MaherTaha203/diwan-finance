# REPORT-001 · R6 — Member Financial Statement cut-over (delivery record)

> Seventh phase, and the **first live cut-over**. Routes the pilot report — the
> Member Financial Statement — through the unified engine for **all four media
> (screen · print · PDF · Excel)** from **one model**, behind a single
> default-OFF flag. Also makes the `screen` renderer **real** (its skeleton was
> the last one standing for this surface). **No `FIN`/DB/accounting change.**

## The flag

```js
window.REPORT_ENGINE_MEMBER_STATEMENT   // default OFF
```

- **OFF (default):** every legacy path (`renderMemberStmt`, `prtMemberStmt`,
  `exportMemberStmt`) runs **unchanged** — the whole cut-over is inert.
- **ON:** the four surfaces are served by `Report.render(...)` from one
  `ReportModels.memberStatement(...)` model, so **screen == print == PDF ==
  Excel** (spec §7.1). The owner flips it (console / preview) to review parity,
  then it ships on when satisfied.

## What R6 ships

| Deliverable | Where |
|---|---|
| Screen renderer (`compose` + `render`) — the on-screen half of the pipeline | `public/js/report-render-screen.js` |
| Cut-over glue (flag default, model gather, output routing, toolbar handler) | `public/js/report-cutover.js` |
| Faithful donation label ported **purely** into the model (bilingual `desc`) | `public/js/report-model.js` |
| Output-toolbar styling (screen-only, §4.6) | `public/js/report-layout.js` |
| Three one-line flag-gated branches in the live builders | `public/js/app.js`, `public/js/print.js` |
| Node tests | `tests/report-r6-cutover.test.cjs` (21) |
| Screen proof (Playwright, light + dark) | model → engine → layout → DOM mount |
| Dormant scripts wired | `public/index.html` (`?v=0.6`) |

## Design

- **The screen renderer** builds the shared layout (R2) and mounts it into a page
  element (`ctx.opts.mountId`/`mount`), injecting the engine stylesheet **once**
  (`<style id="rpt-engine-css">`). Same model + same layout as print/pdf, so the
  three media are identical by construction. In node (no DOM) it composes cleanly.
- **The cut-over glue is the only new behaviour.** The legacy files carry just a
  one-line, flag-gated early return that delegates here; everything else — gather
  one model, gate permissions (print/pdf = `can.print()`, Excel = `can.export()`),
  route to `Report.render`, build the output toolbar, wire one delegated click
  handler — lives in `report-cutover.js`. Dependency-gated (`ready()`), so a
  missing engine/model/FIN silently falls back to legacy.
- **Auto-built output affordances (§2.6/§4.6).** The on-screen toolbar is
  generated from the report's declared `outputs` via `Report.outputButtons` — no
  page hand-writes `<button>Print</button>`. Clicks are handled by one delegated
  listener. `csv` keeps its legacy exporter (its renderer isn't real yet), so the
  CSV button stays functional; `print`/`pdf`/`excel` go through the engine.
- **Donation-label parity.** `donationStmtLabel`/`donationDestLabelAr` (print.js)
  were ported **purely** into the model as a bilingual `desc` column, so the
  engine's donation table shows the exact legacy label
  (`تبرع — صندوق الغداء · تسوية ذمة ₪100`, in-kind → documentary, settlement
  suffix only when debt was settled). One rule, every surface.
- **The statement is a "paper" document** — light in both app themes (matching
  the printout), which is what preserves true screen/print/PDF parity.

## Verification

- `tests/report-r6-cutover.test.cjs` (**21/21**): screen `compose`/`render` +
  registration (`Report.render(model,'screen')` no longer a skeleton); donation
  label parity (cash+settlement and in-kind); cut-over `ready()` gating, one-model
  gather, routing of `excel`/`pdf` to the engine and `csv` to legacy, toolbar +
  mount injection, single delegated handler; and **flag OFF ⇒ glue inert**
  (`ready()===false`, `deliver()` a no-op).
- **Screen proof (Playwright, light + dark):** the unified statement renders with
  the auto-built toolbar, masthead, title, subtitle, KPI cards, carried band,
  ledger (Dr/Cr tags), totals-with-status, and the donations table with the
  parity label — consistent paper document in both themes.
- Print/PDF (R3/R4) and Excel (R5) render this exact model already
  (multi-page + `.xlsx` proofs in their records), so all four media agree.
- Full `tests/` sweep: **no regressions** — only the 4 pre-existing legacy/
  flag-gated suites remain non-clean; every report suite (R0–R6) is green.

## Definition of Done (R6)

- [x] Screen renderer real; `Report.render(model,'screen')` mounts the unified statement.
- [x] Flag `REPORT_ENGINE_MEMBER_STATEMENT` (default OFF) routes screen/print/PDF/Excel through the engine.
- [x] One model → all media; donation label parity with legacy.
- [x] Output toolbar auto-built from declared outputs; single delegated handler; CSV falls back to legacy.
- [x] Legacy files carry only a one-line flag-gated branch; OFF ⇒ fully inert.
- [x] Node tests (21) + light/dark screen proof; no regressions across the suite.

## Next — R7 (Voucher & remaining reports)

Migrate the remaining surfaces (fund statements, debt/delinquent/donations, lists,
receipt/payment/transfer vouchers, treasury/dues, audit/users) each behind its own
flag, cut over + verified. Legacy removal stays **R8** — only after every surface
is on the engine and verified. Begins on the owner's explicit "أبدا R7".
