# TRUTH-001 — Implementation Plan (no code)

**Architecture is frozen.** This is the execution plan only — it re-opens no decision and contains no code. Delivery is incremental; every slice is independent, testable, reversible, ends in its own PR, and never breaks the running system.

## Global guardrails (apply to every PR)
- **No PR modifies FIN amount calculations, the Allocation Engine (FD-002), or business rules** — unless a phase says so explicitly. **No phase here does.** (The Materializer *reads* allocation output; it never alters it.)
- **Amounts are invariant** — `due / paid / balance / historical / final` are byte-identical before and after **every** slice; asserted each PR.
- **Runtime read changes are flag-gated**, default **OFF**, flipped on only after that slice's verification (mirrors the existing `REPORT_ENGINE_*` kill-switch pattern).
- **Baseline:** Node suite green except the 2 known pre-existing failures (`business-operations-slice1`, `constitutional-explicit-q5`).
- **One writer rule** (from the frozen design) is enforced from Phase 3 on: only the Status Materializer writes `current_subscription_status`.

---

## Phase 1 — Structure only (inert)
- **Objective:** create the storage + interfaces; wire nothing; zero behavior change.
- **Affected files:** new migration `…_truth001_structure.sql` — `import_batches`, `current_subscription_status`, and provenance columns on `historical_subscription_truth` (`import_batch_id, original_excel_row, original_member_identifier, reason, version`); `data.js` (load the new tables — additive); new `public/js/subscription-status-repository.js` (returns empty), `public/js/status-materializer.js` (defined, **uncalled**).
- **Risks:** schema typo; accidental consumption. Low — nothing calls the new code.
- **Regression tests:** migration up/down clean; grep/test proving no runtime path references the new modules; full suite green; amounts unchanged.
- **Success criteria:** tables + interfaces exist and load; **zero** behavioral or visual change anywhere.
- **Rollback:** migration `down` (drop new tables/columns); delete the two files. Nothing depends on them.

## Phase 2 — Adoption Flow
- **Objective:** an admin-only operation ingests the approved matrix → writes an `import_batch` + enriched `historical_subscription_truth` rows with full provenance; validated, idempotent, audited. No report consumes the new path yet.
- **Affected files:** `operations.js` (new `BusinessOps.adoptTruth`), a minimal admin trigger (gated, admin-only), `data.js` (load provenance).
- **Risks (key):** `historical_subscription_truth` is **already read by legacy `memberDelinquency` as an override** — writing adopted statuses there could shift legacy Delinquent/Dues/Dashboard mid-transition. **Mitigation:** Phase 2 writes provenance + the imported fact **without mutating the legacy `status` value that `memberDelinquency` currently reads** (adopted status flows to the new model via the Materializer in Phase 3, not by overwriting the legacy column). Net: legacy display unchanged.
- **Regression tests:** adoption idempotency; input validation (coverage 100%, status ∈ {paid,partial,unpaid}); provenance completeness; **legacy reports byte-identical after adoption** (the critical guard); amounts unchanged.
- **Success criteria:** approved matrix persisted with batch + row provenance; legacy behavior provably unaffected.
- **Rollback:** delete rows by `import_batch_id`; remove the operation. Legacy never depended on it.

## Phase 3 — Status Materializer (the Single Writer)
- **Objective:** implement the sole writer; populate `current_subscription_status` from (Historical Imported Truth + ERP allocation result) via a one-time backfill + **additive** event hooks. Reports still read legacy.
- **Affected files:** `status-materializer.js` (impl + backfill); **additive** hooks after receipt/adoption/dues-gen/close (`crud.js` / `operations.js`) that *call* the Materializer — no change to receipt or allocation logic.
- **Risks (key):** the receipt hook touches the ERP write path — must be **strictly additive** (never blocks/alters the receipt or FD-002; best-effort, like the existing `MODEL2RecordAllocation` hook). Single-writer must be enforced (DB grant/guard so only the Materializer writes the status table).
- **Regression tests:** Materializer output for all 147 members equals the expected (approved matrix + ERP) — the oracle; single-writer enforcement test (any other write path is rejected); **receipt/allocation behavior + amounts + existing reports byte-identical**; backfill idempotent.
- **Success criteria:** `current_subscription_status` fully populated and kept current by hooks; legacy still authoritative for reports.
- **Rollback:** disable hooks + truncate `current_subscription_status`; remove Materializer calls. Legacy unaffected.

## Phase 4 — Repository (read interface live, unused by reports)
- **Objective:** the Repository serves `current_subscription_status`; expose it to the read layer, but no report consumes it yet.
- **Affected files:** `subscription-status-repository.js` (impl — `get(memberId, year) → {status, provenance}`), a thin accessor (`window.SubscriptionStatus.get`).
- **Risks:** low (read-only, unused).
- **Regression tests:** `get()` matches the Materializer for every member-year; parity with the approved matrix; full suite green; **no report changed**.
- **Success criteria:** Repository verified correct while still unused.
- **Rollback:** remove the accessor; no dependents.

## Phase 5 — Convert reports, one at a time (each its own PR, each flag-gated)
- **Objective:** switch each report's **status source** from the legacy derivation to the Repository. **Amounts untouched.** Order: **① Annual Debt → ② Delinquent → ③ Dues → ④ Dashboard → ⑤ Member Statement.**
- **Affected files per PR (flag per report):**
  - **5a Annual Debt** — `reports.js` (annualDebtModel path), `fin.js` `debtReportRows` (status column reads Repository; **amount columns unchanged**), `report-model.js` `buildAnnualDebtModel`, `report-cutover-debt.js`. Flag `TRUTH001_ANNUAL_DEBT`. *(This is where #273's intent lands — Annual Debt stops deriving status from raw `paid_amount_ils`.)*
  - **5b Delinquent** — `reports.js` (`delinquentRows`/`_delCell`), `report-model.js` `buildDelinquentModel`. Flag `TRUTH001_DELINQUENT`.
  - **5c Dues** — `dues-workspace.js`. Flag `TRUTH001_DUES`.
  - **5d Dashboard** — `app.js` (debts). Flag `TRUTH001_DASHBOARD`.
  - **5e Member Statement** — `report-model.js` / `fin.js` statement status representation (amounts/ledger untouched). Flag `TRUTH001_STATEMENT`.
- **Risks:** a converted report may show a *different* status than before — but that is the intended correction; the oracle (Phase 6 parity + approved matrix) governs. Guardrail: each PR changes **status-sourcing only**, never FIN amount math or FD-002.
- **Regression tests (per PR):** converted report's status == Repository == approved matrix; **amounts byte-identical**; the not-yet-converted reports unchanged; full suite.
- **Success criteria (per PR):** the one report reads the Repository; its status matches the oracle; amounts identical.
- **Rollback (per PR):** flip that report's flag OFF → it reverts to the legacy path instantly; no data change.

## Phase 6 — Parity Verification
- **Objective:** prove every surface shows an identical status for every member × year.
- **Affected files:** new `tests/truth001-parity.test.cjs` — permanent invariant `Statement == Delinquent == Annual Debt == Dues == Repository` for all member-years; a runtime parity harness over the 147 members against the approved matrix.
- **Risks:** surfaces a residual mismatch → must be resolved before Phase 7.
- **Success criteria:** 100% status parity across all surfaces and all member-years; amounts unchanged.
- **Rollback:** verification only; on failure, leave flags as-is / off and fix forward.

## Phase 7 — Remove legacy (last, only after Phase 6 green + soak)
- **Objective:** remove the superseded legacy status derivations and the flags; retire the disposable authoring/import tooling.
- **Affected files:** `fin.js` (remove the legacy raw-`paid_amount_ils` status derivation and the now-redundant override-as-primary path), `reports.js`, `report-model.js`; delete the `TRUTH001_*` flags; retire the Truth Review artifact + import tool (their severability was proven — data + provenance remain).
- **Risks (highest of the plan):** premature removal. **Mitigation:** requires Phase 6 green + a defined soak window; legacy stays fully present until this PR; DB data untouched.
- **Regression tests:** single-path suite green; parity still 100%; amounts unchanged; provenance still queryable after tooling removal (auditor test).
- **Success criteria:** exactly one status path remains (Repository), fed by the single writer; tooling deletable with no effect.
- **Rollback:** this PR is self-contained and revertable; reverting restores the legacy path + flags (which were untouched until now).

---

## PR summary
| PR | Phase | Touches FIN calc / allocation? | Flag | Reversible by |
|---|---|---|---|---|
| 1 | Structure (tables + interfaces, inert) | No | — | migration down + delete files |
| 2 | Adoption Flow | No | admin-gated | delete batch rows |
| 3 | Status Materializer (single writer + hooks) | No (additive read of allocation) | hook flag | disable hooks + truncate |
| 4 | Repository (unused) | No | — | remove accessor |
| 5a | Annual Debt → Repository status | No (status-source only) | `TRUTH001_ANNUAL_DEBT` | flag off |
| 5b | Delinquent → Repository | No | `TRUTH001_DELINQUENT` | flag off |
| 5c | Dues → Repository | No | `TRUTH001_DUES` | flag off |
| 5d | Dashboard → Repository | No | `TRUTH001_DASHBOARD` | flag off |
| 5e | Member Statement → Repository | No | `TRUTH001_STATEMENT` | flag off |
| 6 | Parity verification | No | — | n/a |
| 7 | Remove legacy + retire tooling | Removes legacy report derivation only | remove flags | revert PR |

## Principle
**Architecture frozen · implementation incremental · verification after every slice · amounts never change · FIN/allocation/business-rules untouched.** Existing PR #273 is **superseded by 5a** (Annual Debt joins the canonical status through the Repository) and should be closed when 5a merges, not merged on its own.

---
**Plan only — no code written; no design changed; FIN / allocation / reports / DB untouched at this step; `fin.js` at baseline; #273 held.** Awaiting your go to begin **Phase 1**.
