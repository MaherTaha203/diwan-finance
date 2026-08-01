# P-RECEIPT-ALLOCATION · PR-2 — Atomic Posting Engine (implementation report)

**The engine only. Feature flag OFF; RPC revoked/unexposed; no UI or runtime path wired. Zero behavioural change.**

## 1. Implementation Summary
Implemented the body of `create_receipt_with_settlement(jsonb, jsonb)` (replacing the PR-1 skeleton via `CREATE OR REPLACE`). In **one atomic transaction** it:
- Validates the receipt (`amount_ils > 0`, `member_id` present, ≥1 line).
- Validates **every** line (`obligation_kind ∈ {due,historical,donation,credit}`, `amount_allocated > 0`, `year` present iff `due`, and **rejects due lines targeting a closed year** via `locked_through_year`).
- Enforces the invariant **`Σ lines = amount_ils`** (raises `settlement_sum_mismatch` otherwise).
- Inserts the receipt (`manual_allocation = true`) **then** the settlement lines (`source_kind = 'receipt_settlement'`, `immutable`).
- **Never writes `paid_amount_ils`; never touches `member_subscriptions`.**
- Returns `{ ok, receipt_id, no, lines }`.

Atomicity is structural: a plpgsql function runs in one transaction, so any `RAISE` (or a constraint violation such as the settlement unique index) rolls back **all** its inserts — receipt included.

**Still dormant:** the function is `REVOKE`d from `public/anon/authenticated`, the flag `RECEIPT_ALLOCATION_ENABLED` stays OFF, and **no runtime path calls it**.

## 2. Verification Report
- **Static + inertness (`tests/pralloc-pr2-atomic-engine.test.cjs`, 21/21):** defines the RPC as `SECURITY DEFINER` plpgsql; enforces `Σ = amount`; rejects closed-year lines; validates `obligation_kind`; inserts receipt + `receipt_settlement` lines; sets `manual_allocation=true`; **never references `paid_amount_ils` or `member_subscriptions` as identifiers**; is `REVOKE`d from client roles; **no runtime JS calls it**; flag still OFF; and the behavioural SQL self-test ships covering all 5 cases.
- **Behavioural (`tests/pralloc-pr2-atomic-rpc.sql`):** a runnable, self-rolling-back script proving, on a dev/branch DB — ① valid post inserts receipt + 3 lines with `paid_amount_ils` untouched; ② Σ mismatch rejected; ③ closed-year line rejected; ④ bad `obligation_kind` rejected; ⑤ a duplicate line **aborts the entire post** (atomic rollback — no orphan receipt). *(Runs against a dev DB with PR-1+PR-2 applied; prod is read-only and this PR does not apply the migration.)*
- **Full suite: 72 green / 2 red** — the 2 red are the pre-existing `business-operations-slice1` and `constitutional-explicit-q5`, unchanged from the `main` baseline (70 + PR-1's test + this PR's test).

## 3. Golden Reference comparison
**Byte-identical.** No runtime code changed (the diff is a DB function + two test files); nothing calls the RPC; the flag is OFF. Balances, treasury, ledger, historical/`paid_amount_ils`, existing receipts, imported data, and every report are unchanged — the engine exists but is inert.

## 4. Files changed
| File | Change |
|---|---|
| `supabase/migrations/20260801140000_pralloc_pr2_atomic_engine.sql` | **new** — atomic RPC body (replaces the PR-1 skeleton); still revoked from client roles |
| `tests/pralloc-pr2-atomic-engine.test.cjs` | **new** — 21 static + inertness assertions |
| `tests/pralloc-pr2-atomic-rpc.sql` | **new** — behavioural self-test (valid / Σ mismatch / closed-year / bad-kind / atomic rollback) |

**Not touched:** every runtime JS file (`fin.js`, `reports.js`, `report-model.js`, `dues-workspace.js`, `app.js`, `data.js`, `operations.js`, `receipt-settlement.js`), `index.html`, and all other tables/policies.

## 5. Risk assessment
- **Runtime risk: none.** The RPC has no caller; it is revoked from client roles; the flag is OFF; no JS changed.
- **DB risk: minimal.** `CREATE OR REPLACE` of a function that is unreachable from the client; no table/policy/data change. If ever called, it can only write a fully-validated, sum-balanced receipt + settlement lines and never `paid_amount_ils`.
- **Verification boundary (disclosed):** the live behavioural proof runs on a dev/branch DB via the SQL self-test; this PR does not apply the migration to production (read-only), consistent with PR-1.

## 6. Rollback confirmation
Reversible: restore the PR-1 skeleton (or `DROP FUNCTION`) and delete the two test files. Nothing depends on the function; no data to unwind.

## 7. Zero behavioural change — explicit statement
**PR-2 introduces ZERO behavioural change.** The engine is implemented but dormant: revoked, flag OFF, uncalled. Every report, balance, treasury figure, ledger total, receipt, FIN function, and runtime path behaves exactly as on `main`. Proven by the unchanged full-suite result and a diff that touches no runtime code.

---
**PR-2 only — atomic engine, dormant. No UI, no wiring, no runtime read/write of settlement. Next (on approval): PR-3.**
