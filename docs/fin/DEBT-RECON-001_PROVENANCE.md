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

## F. Minimal constitutional repair (proposal — NOT implemented)
**Enforce the source boundary in the one shared accessor** `FIN.memberAllocation`, so there remains exactly one canonical annual-settlement truth:
- Build the forward-cascade **pool from LIVE payments only** (food receipts, donations, write-offs, refunds).
- Treat stored `paid_amount_ils` as **seed of its own year, capped at due** (`remaining_seed = max(0, due − paid)`); the excess `paid − due` does **not** enter the annual-cascade pool (it is migration credit / pre-2025 service, per the certified design).

Consequences (all conserving `finalBalance`, which already counts the full stored paid):
- **12 migration members:** 2025 overpayment stops cascading → `byYear[2026].paid = 0` → 2026 unpaid **matches owner truth**; the truth override becomes redundant rather than conflicting.
- **10 live-receipt members:** their receipts are LIVE → still cascade across ERP years (owner rule: pay 400 → 2025+2026 paid) → `byYear` correct.
- **One truth:** Member Statement, Delinquent, Annual Debt, Dues all consume the same corrected `byYear` — no report-specific override.

This touches `FIN.memberAllocation` (the shared waterfall) — a larger, more sensitive change than #273 — so it must be its own reviewed, regression-tested change under the frozen rules. **Not implemented here.**

Optional companion (owner decision): normalize the 12 rows to the certified migration form (cap 2025 `paid` at `due`, move the excess to `credit_balance_ils` / historical), so the stored data matches its own migration contract. Not required if the engine boundary is fixed, and **not done** in this stage.

## G. Disposition of PR #273
**Merge only after the prerequisite `memberAllocation` source-boundary repair** (or fold both into one reviewed change). #273's direction (Annual Debt consumes the certified `byYear`) is correct and still required for the 10 live-receipt cases, but on today's cascading waterfall it would make Annual Debt contradict the owner-approved truth for the 12 migration members. Once `byYear` no longer cascades migration seed, #273 becomes correct for **all** members. Keep #273 open, unmerged, unchanged.

**Read-only. No records, truth overrides, FIN, allocation-engine, #273, or data modified.**
