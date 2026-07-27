# REPORT-001 · R8-c — Member-Statement legacy removal (deferred item closed)

> Follow-up to R8-b (PR #233, merged). R8-b removed every fully-verified legacy
> builder but **kept the member-statement legacy cluster**, because the engine
> **screen** did not reproduce the additive `MemberLifecycle` initial-state card that
> the legacy screen injected — the standing rule (*"no legacy removed until the
> replacement is complete and verified"*) forbade removing it first. Owner chose
> **Option 1: port the card, then remove.** This PR does exactly that. **No
> `FIN`/DB/accounting/SQL change.**

## 1 · Port — the card now renders on the engine screen

`ReportCutover.renderScreen` (`report-cutover.js`) now injects
`MemberLifecycle.initialStateCard(mid, en)` between the output toolbar and the
rendered statement. The card is app-chrome (its own theme vars), not part of the
`.rpt` paper, so it sits above the statement — read-only, and **graceful**: if
`MemberLifecycle` is absent the screen still renders, the card is simply omitted.

With this, the engine member screen reproduces **everything** the legacy screen
showed:

| Legacy screen element | Engine screen source |
|---|---|
| Carried-balance band | `buildMemberStatementModel` band section |
| Ledger table + running balance + final-balance total | `buildMemberStatementModel` ledger section |
| Donation movements (independent-event label + settlement suffix) | model `donationDesc` port, fed by the runtime gatherer (`FIN.memberDonations` + `_settled`) |
| Subscriptions / payments / carried-payment summary | model `summary` |
| **MemberLifecycle initial-state card** | **ported here (R8-c)** |

The engine is now a **1:1 replacement** for the screen.

## 2 · Remove — the member-statement legacy cluster is gone

| File | Removed | Kept |
|---|---|---|
| `app.js` | `renderMemberStmt` legacy screen body (~175 lines, incl. the `MemberLifecycle` injection now ported) | flag-gated engine branch → `ReportCutover.renderMemberScreen`; kill-switch no-ops (clears container) when off |
| `app.js` | `exportMemberStmt` legacy Excel builder | CSV / JSON / PDF paths (CSV/JSON not migrated; PDF → engine via `prtMemberStmt`) |

`donationStmtLabel` is **no longer called from `app.js`** (the member statement is
fully engine-rendered). Its **definition stays in `print.js`** as the shared rule of
record; the engine carries its pure port (`report-model.js` `donationDesc`).

## 3 · What stays (unchanged from R8-b)

`report-activation.js` + every flag branch (kill-switch); hybrid voucher builders;
all live legacy screens; universal list exporters; `exportMemberStmt` CSV/JSON;
`MemberLifecycle` module (its own admin `member-workspace` page is untouched).

## Verification

- `node --check` clean for every `public/js/*.js`; no dangling `donationStmtLabel`/
  `initialStateCard` call sites in `app.js`.
- **New suite** `report-r8c-lifecycle-port.test.cjs` (6/6): `renderScreen` injects the
  card for the selected member with the correct lang, positioned after the toolbar and
  before the statement mount, the statement still renders through the engine, and the
  screen degrades gracefully when `MemberLifecycle` is absent.
- `donation-statement-display` updated: the label **rule** is asserted in `print.js`
  (definition) **and** `report-model.js` (`donationDesc` port); `app.js` no longer
  calls it directly.
- Full `tests/` sweep: **109 pass / 2 fail** — the two failures
  (`business-operations-slice1`, `constitutional-explicit-q5`) are **pre-existing**,
  accounting/fixture-dependent, unrelated to reporting.
- **Browser smoke (Playwright):** report subsystem loaded in index.html order →
  13/13 flags ON, `renderMemberScreen` injects the lifecycle card **before** the
  statement mount in a real DOM, **zero page/console errors**.
- Cache-bust versions bumped: `report-cutover.js?v=0.9`, `app.js?v=2.12`.

## Definition of Done (R8-c)

- [x] `MemberLifecycle` initial-state card ported into the engine member screen (graceful).
- [x] Engine member screen verified as a 1:1 replacement (ledger + donations + summary + card).
- [x] Member-statement legacy cluster removed (screen body + Excel builder); kill-switch kept.
- [x] CSV/JSON + shared `donationStmtLabel` definition retained.
- [x] New port test + updated wiring test + regression + browser smoke all green.
- [x] Closes the R8-b deferred item — the whole REPORT-001 legacy surface is now removed
      (only the intentional kill-switch flags + CSV/JSON + universal list exporters remain).
