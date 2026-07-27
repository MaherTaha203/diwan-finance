# REPORT-001 · R8-a — Engine Activation (staged)

> Owner-approved staged R8. **R8-a flips every cut-over flag ON** so the unified
> engine is the LIVE default for all reports, while the legacy builders are
> **retained as a fallback**. Legacy code is removed only later in **R8-b**, after
> a stable soak + regression + owner sign-off (*"verified before removed"*).
> **No `FIN`/DB/accounting change.**

## What R8-a ships

| Deliverable | Where |
|---|---|
| Activation module — flips all 13 flags ON | `public/js/report-activation.js` |
| Script wired (after all report modules) | `public/index.html` (`report-activation.js?v=0.8`) |
| Node tests | `tests/report-r8a-activation.test.cjs` (7) |
| End-to-end browser proof | real load order → flags ON → engine renders |

## How it works

- **One authoritative switch.** `report-activation.js` sets every
  `REPORT_ENGINE_*` flag to `true` at load, overriding the per-module default-OFF
  guards (which only set `false` while the flag is still `undefined`). It loads
  after every report module, so it is the single source of the ON state
  regardless of load order.
- **13 flags → 15 reports** (the three vouchers share `REPORT_ENGINE_VOUCHERS`):
  member statement · fund statements · annual debt · delinquent · donations ·
  members · annual log · users · audit · treasury · dues · consistency · vouchers.
- **Reversible per surface, at runtime.** The flag-gated branches read the flag at
  **call time**, so an emergency rollback needs no redeploy:

  ```js
  window.REPORT_ENGINE_FUND_STATEMENT = false;   // that surface → legacy, immediately
  ```

  A permanent rollback of a surface is a redeploy with its flag forced off.

## Verification

- `tests/report-r8a-activation.test.cjs` (**7/7**): activation **overrides** an
  explicit module default-OFF (`false → true`) regardless of load order; all **13**
  flags are ON; the flag list is exposed on `window.REPORT_ENGINE_FLAGS`; **every**
  registry report (15) is served by an ON flag; and a **runtime override reverts a
  single surface** (fund → legacy) while the rest stay on the engine.
- **End-to-end browser proof (Playwright):** loading the report subsystem in the
  exact `index.html` order — including the modules that set `false`-defaults — then
  `report-activation.js`, yields **all 13 flags ON**, the fund adapter `ready()`,
  and `ReportCutoverFund.renderScreen('food')` renders the **unified engine
  statement** (toolbar + masthead + figure cards + ledger + totals) into the live
  container.
- Full `tests/` sweep: **no regressions** — only the 4 pre-existing legacy/
  flag-gated suites remain non-clean.

## Soak checklist (before R8-b)

Watch during the stable-operation period; any drift is a reason to flip a flag off
and investigate:

- [ ] No figure differs between the engine output and the legacy output on any report.
- [ ] Print / PDF / Excel succeed for every report type.
- [ ] Regression suite stays green.
- [ ] Owner review of live operation results.

Only after all four + owner approval → **R8-b** removes the legacy
`prt*`/`build*`/`exportPage*` builders and the flags, in a separate PR.

## Definition of Done (R8-a)

- [x] All 13 `REPORT_ENGINE_*` flags default-ON via one authoritative module.
- [x] Legacy retained as a fallback; per-surface runtime rollback works.
- [x] Node tests (7) + end-to-end browser proof; no regressions.
- [x] Legacy code untouched — removal deferred to R8-b after the soak.
