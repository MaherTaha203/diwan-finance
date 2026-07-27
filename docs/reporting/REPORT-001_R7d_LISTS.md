# REPORT-001 · R7d — Lists cut-over (Members · Annual log · Users)

> Fourth slice of **R7**. Routes the shareable **output documents** (print · PDF ·
> Excel) of the three lists through the unified engine, each behind its own
> default-OFF flag. Their interactive screens (search/filter, row actions) stay
> legacy. **No DB/accounting change.**

## The flags (independent)

```js
window.REPORT_ENGINE_MEMBERS_LIST   // default OFF
window.REPORT_ENGINE_ANNUAL_LOG     // default OFF
window.REPORT_ENGINE_USERS_LIST     // default OFF
```

OFF → `prtMembersList` / `prtAnnual` / `exportPageExcel` / `exportPagePDF` run
legacy, inert. ON → each list renders from one engine model, so print == PDF ==
Excel per list.

## What R7d ships

| Deliverable | Where |
|---|---|
| `build{Members,AnnualLog,Users}ListModel` + gatherers | `public/js/report-model.js` |
| Three list adapters over the cut-over core | `public/js/report-cutover-lists.js` |
| Flag-gated branches in the live output fns | `public/js/print.js` (`prtMembersList`, `prtAnnual`), `public/js/app.js` (`exportPageExcel`, `exportPagePDF`) |
| Node tests | `tests/report-r7d-lists.test.cjs` (17) |
| Render proof (Playwright) | all three portrait lists |
| Dormant script wired | `public/index.html` (`?v=0.7`) |

## Design

- **Members list** carries the 5 declared columns (# · name · phone · balance ·
  status); `balance` is a signed **Dr/Cr** column and `status` is the
  `FIN.balanceLabel` string. The gatherer replicates the live search + status
  filter (`q-members` / `f-member-status`) and `FIN.memberBalance`, so the export
  matches the on-screen list.
- **Annual log** maps `DB.annual` → year · amount · member count · applied-on ·
  applied-by. **Users** maps `DB.users` → email · role (admin → مدير, else مشاهد),
  matching the legacy export.
- **Outputs-only** (the core's `deliver`): the interactive list screens are
  untouched. Users has no print button (Excel/PDF only), matching its page chrome.

## Verification

- `tests/report-r7d-lists.test.cjs` (**17/17**): the three models validate against
  the frozen schema, keep their columns in order, preserve numbers (members' signed
  Dr/Cr balance, annual amounts, user role labels); the layouts render; and the
  three adapters route print/pdf/excel to the engine only when their **independent**
  flags are ON, inert when OFF.
- **Render proof (Playwright):** the three portrait lists in the unified design —
  members (Dr/Cr balance + status + filter chip), annual log, users.
- Full sweep: **no regressions** — R0–R6 + R7a–R7d green; only the 4 pre-existing
  suites remain non-clean.

## Definition of Done (R7d)

- [x] `ReportModels.membersList` / `.annualLog` / `.usersList` build one model each from live data.
- [x] Three independent default-OFF flags route print/PDF/Excel through the engine.
- [x] Interactive screens preserved (outputs-only); legacy inert when OFF.
- [x] Members export honours the live search + status filter.
- [x] Node tests (17) + render proof; no regressions.

## Next — R7e (Vouchers)

Receipt · Payment · Transfer vouchers — single-document models (`build*VoucherModel`)
+ adapters (print/pdf only). These are a different shape (one document per record,
not a ledger). Begins on "أبدا R7e".
