# REPORT-001 · R8-b — Legacy Removal (conservative scope)

> Owner-authorized removal after the R8-a soak (*"verified before removed"*). Scope
> chosen by the owner: **remove the dead legacy `prt*`/`build*` string-builders, but
> KEEP `report-activation.js` and every flag-gated branch as a kill-switch.** The
> unified engine stays the sole real path per surface; a surface can still be flipped
> off — it just **no-ops** now instead of falling back to a legacy builder. **No
> `FIN`/DB/accounting/SQL change.**

## What R8-b removes

Each legacy string-builder below was dead under R8-a (the engine flag is ON, so the
builder never ran). R8-b deletes the builder body and leaves the flag-gated engine
branch in place as the kill-switch.

| Surface | File | Removed | Kept (kill-switch + reuse) |
|---|---|---|---|
| Treasury position (print) | `treasury-workspace.js` | `buildPositionBody()` + `openPrintWin` fallback | `printPosition()` → `REPORT_ENGINE_TREASURY_POSITION` engine branch |
| Dues snapshot (print) | `dues-workspace.js` | `buildDuesBody()` + `openPrintWin` fallback | `printView()` → `REPORT_ENGINE_DUES_SNAPSHOT` engine branch; `printableRows` (shared) |
| Annual-debt / Delinquent / Donations / Consistency (print+PDF) | `reports.js` | legacy bodies of `prtAnnualDebt`/`prtDelinquent`/`prtDonStmt`/`reconcileReport` | engine branches; `annualDebtModel`/`delinquentRows`/`donationDirectionLabel`/`_adHead`/`_adCurCell` (engine-reused + live screens); `exportDelinquentExcel` (not migrated) |
| Fund statement (print+PDF) | `print.js` | `buildFundStatementHTML()` + both fallbacks | `prtStmt`/`downloadFundStatementPDF` engine branches |
| Member statement (print+PDF) | `print.js` | `prtMemberStmt` legacy A4 template | engine branch; `donationStmtLabel` rule (consumed by live screen + Excel) |
| Members / Annual-log lists (print) | `print.js` | `prtMembersList`/`prtAnnual` legacy bodies | engine branches |
| Fund statement (screen) | `app.js` | `renderStmt` legacy screen body | `REPORT_ENGINE_FUND_STATEMENT` → `ReportCutoverFund.renderScreen` |

Every emptied entrypoint degrades gracefully: with its flag off it shows a short
"unavailable" toast / empty-state instead of throwing.

## What R8-b deliberately KEEPS

- **`report-activation.js` + all flag-gated branches** — the kill-switch (owner's
  chosen scope). Runtime rollback of one surface still works: `window.REPORT_ENGINE_X
  = false`. It just no-ops that surface rather than serving legacy.
- **Hybrid voucher builders** — `buildRecVoucher`/`buildPayVoucher` (`print.js`) and
  `buildTransferVoucher` (`app.js`) are **not dead**: the engine's voucher renderer
  reuses them (byte-identical legal artifact). Their `prtRec`/`prtPay`/`prtTransfer`
  paths are untouched.
- **Live legacy screens (R7b–g were outputs-only cut-overs)** — `renderAnnualDebt`,
  `renderDelinquent`, the donations/lists screens, and the treasury/dues/member
  workspaces keep their interactive in-container UIs; only their print/PDF/Excel
  **outputs** route through the engine.
- **Universal list exporters** — `exportPageExcel`/`exportPagePDF` stay intact: they
  still serve the **non-migrated** receipts/expenses list pages and fund-statement
  exports (explicitly out of scope per the R8 verification). Their migrated-type
  early-returns are the kill-switch branches.
- **CSV/JSON** — `exportMemberStmt` CSV/JSON paths stay legacy (the engine's CSV
  renderer is intentionally not migrated); the toolbar CSV button remains functional.
- **Engine-reused read helpers** — `annualDebtModel`, `delinquentRows`,
  `donationDirectionLabel`, `donationStmtLabel`, `FIN.donationRegister`, `reportHeader`
  /`reportFooter`/`reportDfoot`, `openPrintWin` — all retained (used by the engine
  and/or live screens).

## ⚠ One surface deferred — Member Statement **screen** (owner decision needed)

The member-statement **print/PDF/Excel** engine paths are complete 1:1 replacements,
so their legacy builders were removed. The member-statement **screen** is the one
surface where the engine is **not** yet a 1:1 replacement:

- The legacy `renderMemberStmt` screen injected an **additive `MemberLifecycle`
  initial-state card** (P2·S1) after the opening bar (`app.js`).
- The engine screen path (`ReportCutover.renderMemberScreen`) does **not** render that
  card, and the member-statement model does not carry it.
- This is already the live behavior since R8-a (flag ON), so R8-b changes nothing at
  runtime — but removing the legacy `renderMemberStmt` body would make the card's only
  renderer disappear, which the standing rule (*"no legacy removed until the
  replacement is complete and verified"*) forbids.

**Mitigation:** the full Member Financial lifecycle unit remains available on its own
admin page (`member-workspace` / `member-lifecycle.js`); only the additive card on the
statement screen is absent from the engine path.

**Kept in this PR:** `renderMemberStmt`'s legacy screen body and the
`exportMemberStmt` Excel body (the member-statement legacy cluster) are retained,
pending an owner decision:

1. **Port** the `MemberLifecycle` initial-state card into the engine member screen,
   then remove the legacy cluster (recommended — restores 1:1 parity first).
2. **Accept** the card's absence on the statement screen (it lives on its own page) and
   remove the cluster as-is in a follow-up.

## Verification

- **Parse** — `node --check` passes for every `public/js/*.js`.
- **No dangling references** — no call site to `buildFundStatementHTML`/
  `buildPositionBody`/`buildDuesBody` remains; all engine-reused helpers still present.
- **Regression** — full `tests/` sweep: **107 pass, 2 fail**; the two failures
  (`business-operations-slice1`, `constitutional-explicit-q5`) are **pre-existing**,
  accounting/fixture-dependent, and unrelated to reporting (documented in the R8-a set).
- **Updated suites** — five suites that asserted the *removed* legacy behavior were
  rewritten to assert the R8-b reality (engine-only routing + kill-switch):
  `print-native-views`, `print-page-model`, `p5-obs-treasury-workspace-slice1`,
  `p-dues-workspace-slice1`, `donation-statement-display`.
- **Engine coverage unchanged** — `report-r8-verification` still renders all **15**
  reports through the engine.
- **Browser smoke (Playwright)** — the report subsystem loaded in the real index.html
  order (through `report-activation.js`) yields **13/13 flags ON**, **15 reports**
  registered, a successful engine screen render, and **zero page/console errors**.

## Definition of Done (R8-b)

- [x] Dead legacy `prt*`/`build*` statement/report/workspace builders removed.
- [x] `report-activation.js` + every flag-gated branch kept as the kill-switch.
- [x] Hybrid voucher builders, live legacy screens, CSV/JSON, and universal list
      exporters preserved.
- [x] Graceful degradation (toast / empty-state) on every emptied entrypoint.
- [x] Parse + no-dangling-refs + regression + browser smoke all green.
- [ ] **Owner decision** on the deferred Member-Statement screen `MemberLifecycle`
      card (port vs. accept) → final removal of the member-statement legacy cluster.
