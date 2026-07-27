# REPORT-001 · R7a — Fund Statement cut-over (food · diwan)

> First slice of **R7** (remaining reports). Routes the live fund statements
> (food + diwan) through the unified engine for **screen · print · PDF · Excel**
> behind a default-OFF flag, and introduces a **reusable cut-over core** so the
> later R7 slices migrate with a tiny adapter each. **No `FIN`/DB/accounting
> change.**

## R7 slice plan

R7 spans many surfaces, so it ships as focused slices — each its own flag + PR:

| Slice | Surface(s) |
|---|---|
| **R7a (this)** | Fund Statements — food + diwan |
| R7b | Annual Debt + Delinquent reports |
| R7c | Donations register |
| R7d | Lists — members / annual log / users |
| R7e | Vouchers — receipt / payment / transfer |
| R7f | Treasury position + Dues snapshot |
| R7g | Audit log + reconcile |

Legacy removal stays **R8**, only after every surface is on the engine and verified.

## The flag

```js
window.REPORT_ENGINE_FUND_STATEMENT   // default OFF
```

- **OFF (default):** `renderStmt` / `prtStmt` / `downloadFundStatementPDF` run
  **unchanged** — the slice is inert.
- **ON:** both funds render from one `ReportModels.fundStatement(fund,…)` model,
  so **screen == print == PDF == Excel**. `csv` keeps `exportCSV(fund+'-stmt')`.

## What R7a ships

| Deliverable | Where |
|---|---|
| `buildFundStatementModel` + `ReportModels.fundStatement` (pure builder + runtime gatherer) | `public/js/report-model.js` |
| **Cut-over core** — reusable `ReportCutoverCore.make(cfg)` factory | `public/js/report-cutover-core.js` |
| Fund adapter (food/diwan) | `public/js/report-cutover-fund.js` |
| Flag-gated branches in the live builders | `public/js/app.js` (`renderStmt`), `public/js/print.js` (`prtStmt`, `downloadFundStatementPDF`) |
| Node tests | `tests/report-r7a-fund.test.cjs` (20) |
| Screen proof (Playwright) | food statement with all 6 figure cards |
| Dormant scripts wired | `public/index.html` (`?v=0.7`) |

## Design

- **The fund model** maps a `fundLedgerView` (+ a computed figure set) to the
  frozen schema: the 7 declared columns (date · name · desc · credit · debit ·
  balance · note), a totals row (income / expenses / closing), and the figure
  cards — income, expenses, current balance, **plus three food-only extras**
  (remaining historical deficit · reserve + debt settlement · net position). The
  running balance is a plain `money` column (no Dr/Cr tag — matching the legacy
  fund ledger). The runtime gatherer honours the IG-016 close-time snapshot for an
  exact closed-year range (marked `🔒` in `meta.filters`).
- **The cut-over core** generalises the R6 pattern: `ReportCutoverCore.make(cfg)`
  returns a cut-over object that defaults its flag OFF, gathers ONE model, routes
  print/pdf/excel through `Report.render` (csv → a legacy fallback), and — on
  screen — injects the engine-built output toolbar + a single delegated handler.
  Every method takes an optional `key`, so one adapter serves both funds. Future
  R7 slices reuse this core.
- **Legacy files carry only one-line, flag-gated early returns** delegating to the
  adapter; OFF is fully inert.

## Verification

- `tests/report-r7a-fund.test.cjs` (**20/20**): the food model validates against
  the frozen schema, carries the 7 columns in order, preserves credit/debit/
  running-balance numbers, empty cells → null, totals (income/expense/closing),
  and **6 figure cards** (diwan → 3); the layout renders it; the cut-over core
  gathers one model and routes `excel`/`pdf` to the engine and `csv` to legacy,
  injects the toolbar + keyed mount + single handler, and is **inert when the flag
  is OFF**.
- **Screen proof (Playwright):** the food statement renders in the unified design
  — toolbar, masthead, title `كشف الصندوق · صندوق الغداء`, all six figure cards
  (incl. the −800 remaining deficit and 730 net position), the 7-column ledger
  with the opening row, and the totals row.
- Full `tests/` sweep: **no regressions** — R0–R6 + R7a all green; only the 4
  pre-existing legacy/flag-gated suites remain non-clean.

## Definition of Done (R7a)

- [x] `ReportModels.fundStatement` builds one model for food/diwan (food extras included).
- [x] Flag `REPORT_ENGINE_FUND_STATEMENT` (default OFF) routes screen/print/PDF/Excel through the engine; csv → legacy.
- [x] Reusable cut-over core introduced; fund adapter uses it.
- [x] Legacy files carry only one-line flag-gated branches; OFF ⇒ inert.
- [x] Node tests (20) + screen proof; no regressions.

## Next — R7b (Annual Debt + Delinquent)

Add `buildAnnualDebtModel` / `buildDelinquentModel` + adapters using the core,
behind their own flags. Begins on the owner's explicit "أبدا R7b" (or "أبدا").
