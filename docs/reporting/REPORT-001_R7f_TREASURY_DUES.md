# REPORT-001 · R7f — Treasury Position + Dues Snapshot cut-over (outputs)

> Sixth slice of **R7**. Routes the print output of the Treasury Position and
> Dues Snapshot workspaces through the unified engine, each behind its own
> default-OFF flag. Their interactive workspaces stay legacy. **No `FIN`/DB/
> accounting change.**

## The flags (independent)

```js
window.REPORT_ENGINE_TREASURY_POSITION   // default OFF
window.REPORT_ENGINE_DUES_SNAPSHOT       // default OFF
```

OFF → `TreasuryWorkspace.printPosition()` / `DuesWorkspace.printView()` print via
their bespoke bodies (inert). ON → each builds one engine model from its **current
view state** and calls `Report.render(model,'print')`, so the printed document is
engine-rendered.

## What R7f ships

| Deliverable | Where |
|---|---|
| `buildTreasuryPositionModel` + `buildDuesSnapshotModel` (pure, multi-section) | `public/js/report-model.js` |
| Flag-gated branches in the workspace print methods | `public/js/treasury-workspace.js` (`printPosition`), `public/js/dues-workspace.js` (`printView`) |
| Node tests | `tests/report-r7f-treasury-dues.test.cjs` (15) |
| Render proof (Playwright) | both multi-section landscape reports |

## Design

- **No adapter/gatherer needed.** Each workspace's print method already holds its
  current view state (period / year / filter / search) in scope, so the flag-branch
  maps that state to the model shape and calls `Report.render(model,'print')`
  directly — the (already real) tabular print renderer handles the rest.
- **Treasury Position** → 4 position cards (food · diwan · donations · combined) +
  a **health** table (6 metrics: net combined / net food / remaining deficit /
  reserve / support / debt-settlement) + the **movement** ledger (date · voucher ·
  fund · party · description · in · out) with in/out totals.
- **Dues Snapshot** → 5 cards (year status *text* · annual obligation · eligible
  members · total obligation · outstanding) + the **members** table (code · name ·
  phone · due · paid · remaining · status) with totals + the **schedule** history
  table. Honours the workspace's year / filter / search.
- Both are multi-section (summary + two tables), exercising the model's section
  list; the frozen schema needed no change.

## Verification

- `tests/report-r7f-treasury-dues.test.cjs` (**15/15**): both models validate
  against the frozen schema, carry their cards, health/schedule + main tables with
  the declared columns and summed totals, preserve the signed figures (deficit
  −800; outstanding negative tone); both layouts render; and `Report.render(model,
  'print')` uses the **real** print renderer (not a skeleton) for each.
- **Render proof (Playwright):** both landscape reports in the unified design —
  Treasury (4 cards + 6-metric health + movement ledger with totals) and Dues
  (5 cards + members table with totals + schedule history).
- Full sweep: **no regressions** — R0–R6 + R7a–R7f green; only the 4 pre-existing
  suites remain non-clean.

## Definition of Done (R7f)

- [x] `build{TreasuryPosition,DuesSnapshot}Model` build one multi-section model each.
- [x] Two independent default-OFF flags route the workspace print through the engine.
- [x] Interactive workspaces preserved; legacy inert when OFF; built from current view state.
- [x] Node tests (15) + render proof; no regressions.

## Next — R7g (Audit log + Consistency/reconcile)

The last R7 surfaces — audit log (a table) and the consistency/reconcile report.
Begins on "أبدا R7g". After R7g, **R8** (legacy removal) — only once every surface
is on the engine and verified.
