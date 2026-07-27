# REPORT-001 · R7g — Audit Log + Consistency report cut-over

> **Final R7 slice.** Routes the Audit Log export and the Constitutional
> Consistency report through the unified engine, each behind its own default-OFF
> flag. With R7g merged, **every registry surface is engine-capable** — R7 is
> complete and R8 (legacy removal) becomes eligible. **No `FIN`/DB/accounting
> change.**

## The flags (independent)

```js
window.REPORT_ENGINE_AUDIT_LOG    // default OFF
window.REPORT_ENGINE_CONSISTENCY  // default OFF
```

OFF → `exportPageExcel('audit')` / `exportPagePDF('audit')` and `reconcileReport()`
run legacy (inert). ON → each builds one engine model and calls `Report.render(...)`.

## What R7g ships

| Deliverable | Where |
|---|---|
| `buildAuditLogModel` + `buildConsistencyModel` (pure) | `public/js/report-model.js` |
| Flag-gated branches in the live output fns | `public/js/app.js` (`exportPageExcel`/`exportPagePDF` for `audit`), `public/js/reports.js` (`reconcileReport`) |
| Node tests | `tests/report-r7g-audit-consistency.test.cjs` (16) |
| Render proof (Playwright) | both reports |

## Design

- **Audit Log** → a 5-column table (date · action · description · user · table)
  from `DB.audit`, landscape, with the entry-count filter. It is the **export**
  permission surface: the Excel branch sits **after** the `can.export()` gate and
  the PDF branch re-checks `can.export()`, so the cut-over never widens access.
- **Consistency** → the verifier verdict (`FIN.verifyConsistency`) as two summary
  cards (a **pos/neg verdict** + members-checked count), a **checks** table
  (check · value A · value B · status ✓/⚠), and — only when there is drift — a
  **failed-members** table. Portrait, matching the legacy reconcile report.
- **No adapters/gatherers** — both flag-branches build the model from data already
  in scope (`DB.audit` / the verifier result) and call `Report.render(model, …)`.

## Verification

- `tests/report-r7g-audit-consistency.test.cjs` (**16/16**): the audit model
  validates + keeps its 5 columns and rows + entry-count filter; the consistency
  model validates in both all-match (positive verdict, no failed table) and
  mismatch (negative verdict + failed-members table) states, with the checks
  table columns/labels correct; both layouts render; and `Report.render` uses the
  real engine renderers (audit excel + print; consistency print) — not skeletons.
- **Render proof (Playwright):** the audit log (5-column table + filter) and the
  consistency report (verdict cards + checks table with ✓/⚠ + failed-members table).
- Full sweep: **no regressions** — R0–R6 + R7a–R7g green; only the 4 pre-existing
  suites remain non-clean.

## Definition of Done (R7g)

- [x] `build{AuditLog,Consistency}Model` build one model each.
- [x] Two independent default-OFF flags route the outputs through the engine.
- [x] Audit export stays `can.export()`-gated; consistency stays `can.print()`-gated.
- [x] Node tests (16) + render proof; no regressions.

## R7 complete → R8 (Legacy Removal) is now eligible

Every registry report now has an engine path behind a default-OFF flag:

| Surface | Slice |
|---|---|
| Member statement (screen+outputs) | R6 |
| Fund statements | R7a |
| Annual debt · Delinquent | R7b |
| Donations register | R7c |
| Members · Annual log · Users | R7d |
| Receipt · Payment · Transfer vouchers | R7e |
| Treasury position · Dues snapshot | R7f |
| Audit log · Consistency | R7g |

**R8** removes the legacy `prt*`/`build*`/`exportPage*` string-builders and the
cut-over flags **only after** the owner has flipped each flag on, reviewed parity,
and confirmed every surface — per the standing rule *"no legacy engine is removed
until the replacement is complete and verified."* It begins on the owner's
explicit go.
