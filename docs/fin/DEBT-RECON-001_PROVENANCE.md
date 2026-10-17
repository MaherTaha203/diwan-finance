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

## F. Read-time attribution repair under review

The production provenance audit found that the imported `Payments 2025` values were stored verbatim in `paid_amount_ils[2025]`, including cash that serviced pre-2025 arrears. These are not subscription-only payments. Their attribution must follow the owner-approved settlement priority in PR #308, while preserving the original stored values.

- Cap each imported year's seed attribution at that year's annual due.
- Apply the excess from that source year to the remaining pre-2025 historical debt.
- Only after historical debt reaches zero may the excess apply to later annual years in ascending order; any remainder stays as member credit/prepaid value.
- Do not feed migration overflow into the live-receipt pool or count it as a second receipt.
- Live receipts, explicit settlement lines, refunds, write-offs, and directed donation settlements retain their existing paths.
- `FIN.memberStatement().finalBalance` remains the total-balance authority. This is a read-time attribution correction: no stored member/subscription rows are rewritten.
- Annual Debt reads the same per-year attribution as Delinquent/Dues, preventing report-specific contradictions.

The regression suite covers historical-first attribution, later-year spill only after historical debt is cleared, credit remainder, unchanged final balance, and the unchanged live FD-002 waterfall.

## G. Disposition of PR #273

PR #273's report-reader alignment must not be merged separately from the source-boundary correction: the Annual Debt report should consume the same canonical per-year attribution as Delinquent/Dues only after that attribution is corrected. Keep #273 open and unmerged while this replacement change is reviewed; once this change passes the full checks, treat #273 as superseded.

**Implementation status:** review branch only. No production records, schema, migration execution, truth overrides, feature flags, or deployment have been changed.
