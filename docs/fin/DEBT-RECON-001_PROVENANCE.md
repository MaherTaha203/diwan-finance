# DEBT-REPORT-RECON-001 — `paid_amount_ils` Provenance Audit (read-only)

**No data/code/#273 changed.** Evidence from the repo + read-only production queries.

## A. `paid_amount_ils` provenance
- **Field authority** (`supabase/migrations/20260719160000_p0_v3_subscription_single_source.sql`): `member_subscriptions.paid_amount_ils` is the *single authoritative origin* of "annual subscription paid." Every **live** write path (member creation, Apply-Annual-Dues) inserts `paid = 0`; a DB CHECK forbids any independent override, and `balance_ils` must equal `due − paid`.
- **Migration authority** (`docs/phase15/devtools/migrationService.js`, header lines 4-8): *"Option 1: spreadsheet is authoritative… NO receipt replay. NO allocation engine. Direct per-year assignment. **The allocation engine governs only LIVE payments entered after activation.**"*
- So `paid_amount_ils` is a **migration seed of already-settled state**; the FD-002 allocation engine is constitutionally scoped to **live payments only**.

## B. Exact migration code path that created the values
`runMigration` → `planMemberImport` (line 82) → `buildMigratedSubscriptions(activeYear, duesByYear, {2025: Payments2025, 2026: Payments2026})` (line 60). Certified logic:
```
pool = Payments2025 + Payments2026
for each year: paid = min(pool, due); pool -= paid        // capped at due
credit = leftover  → members.credit_balance_ils           // overflow NEVER stored on the row
```
**The certified path can never write `paid_amount_ils > due`**, and routes overflow to member *credit*.

**Production contradicts this.** The 12 rows hold `paid > due` with **negative `balance_ils`**, `is_overridden=false`, `created_by=null`, imported 2026-06-20 — i.e., the actual import stored the spreadsheet's raw **"Payments during 2025"** verbatim on `paid_amount_ils[2025]` (matching the header's "direct per-year assignment"), **not** the capped/credit form the function produces. The stored figure is *cash received in 2025* (which includes servicing of pre-2025 arrears), **not** "amount paid toward the 2025 subscription."

## C. Frozen authority governing imported values
1. `migrationService.js` header — migration = direct seed; **engine governs live payments only**.
2. `p0_v3` migration — `paid_amount_ils` is the one authoritative origin; live writes are always `0`.
3. `historical_balance_ils` / `historical_payments_ils` are the **dedicated** pre-2025 fields (member table) — pre-2025 money has its own home and must not be represented as a future-year subscription payment.

## D. The 12 members (production values)
All: 2025 `due=200`, 2026 `due=200 paid=0`, `is_overridden=false`, `created_by=null`, imported 2026-06-20. `truth` = owner-approved `historical_subscription_truth`.

| Member | 2025 paid | 2025 bal | hist_balance | hist_pay | truth 2025 | truth 2026 | waterfall now | constitutionally supported? |
|---|--:|--:|--:|--:|---|---|---|---|
| TAHA-0025 | 1110 | −910 | 2200 | 900 | paid | unpaid | 2026←cascade 200 | **No** |
| TAHA-0039 | 730 | −530 | 2200 | 600 | paid | unpaid | 2026←200 | No |
| TAHA-0045 | 660 | −460 | 2200 | 1000 | paid | unpaid | 2026←200 | No |
| TAHA-0048 | 730 | −530 | 2200 | 600 | paid | unpaid | 2026←200 | No |
| TAHA-0054 | 400 | −200 | 2200 | 2000 | paid | unpaid | 2026←200 | No |
| TAHA-0064 | 600 | −400 | 2200 | 1450 | paid | unpaid | 2026←200 | No |
| TAHA-0069 | 480 | −280 | 2200 | 1600 | paid | unpaid | 2026←200 | No |
| TAHA-0070 | 730 | −530 | 1800 | 200 | paid | unpaid | 2026←200 | No |
| TAHA-0076 | 400 | −200 | 2200 | 2000 | paid | unpaid | 2026←200 | No |
| TAHA-0089 | 827 | −627 | 2200 | 600 | paid | unpaid | 2026←200 | No |
| TAHA-0104 | 730 | −530 | 2200 | 600 | paid | unpaid | 2026←200 | No |
| TAHA-0106 | 435 | −235 | 2200 | 2000 | paid | partial | 2026←200 | No |

Every one carries a large pre-2025 historical balance — consistent with the excess-over-200 being **2025 cash that serviced pre-2025 arrears**, mis-stored as subscription overpayment.

## E. Defect classification
**Combination of (1) and (2); truth is NOT stale.**
1. **Misplaced migrated data** — the full "Payments during 2025" (which includes pre-2025 arrears service) was written to `member_subscriptions[2025].paid_amount_ils` uncapped, instead of the certified capped-at-due form with overflow → `credit_balance_ils`.
2. **Allocation-engine source-boundary defect** — `FIN.memberAllocation` (`public/js/fin.js:196-197`) folds stored-row overpayment `max(0, paid − due)` into the same fungible pool as live receipts and cascades it oldest-first into 2026, **violating the frozen boundary** that the engine governs live payments only.
3. **Stale truth?** — **No.** The owner-approved truth (2026 unpaid) is *correct*; the member did not prepay 2026. The derived cascade is what's wrong.

The cascade is currently **latent**: the Delinquent report and Dues workspace display the truth-overridden status, so 2026 shows "unpaid" there. #273 would make the Annual Debt report display `byYear.paid` (the derived cascade) → surfacing the conflict.

## F. Implemented repair under review — PR #310

The source-boundary correction is implemented in the current review branch, without rewriting any production rows.

- **Stored migration seed is not live cash.** The amount recorded on each subscription year first covers that year's due, capped at the due.
- **Seed overflow follows its historical source:** it reduces the remaining pre-2025 historical debt first; only after historical debt reaches zero may the overflow cover later annual years in ascending order; any remainder stays member credit.
- **Historical over-collection credit** retains the existing oldest-annual-year-first behavior, while live receipts, directed donation settlements, write-offs, and refunds continue through the existing FD-002 live pool.
- **Annual Debt** now reads each year's paid amount from FIN.memberDelinquency().byYear, the same canonical attribution used by Delinquent/Dues. No report-only status override is introduced.
- **No production data rewrite, schema migration, truth-table change, or feature-flag activation** is included.

This explicitly covers the edge case raised in review: for the member whose 2025 imported amount is ₪435 and whose remaining historical debt is ₪200, ₪200 settles historical debt and the remaining ₪35 applies to 2026, leaving ₪165 unpaid. For the other audited migration examples, the overage reduces historical debt and does not incorrectly settle 2026.

The regression suite in tests/migration-seed-boundary.test.cjs checks historical-first attribution, later-year spill only after historical clearance, credit remainder, unchanged memberStatement().finalBalance, and the unchanged live FD-002 waterfall. The existing historical-truth test continues to verify that the truth table is presentation authority only and is not read by financial calculations.

Optional companion normalization of the stored rows remains **not done**; the repair is read-time only.

## G. Disposition of PR #273

PR #273's report-reader direction is now incorporated in PR #310, with the migration source boundary corrected at the same time. Do **not** merge #273 separately: after PR #310 is reviewed and merged, close #273 as superseded. Until then, leave #273 open and unmerged so the current branch remains the single reviewable implementation.

**Implementation status:** code and regression tests are in PR #310. No production records, truth overrides, schema, or feature flags have been changed.
