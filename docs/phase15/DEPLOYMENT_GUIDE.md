# Phase 15 — Deployment Guide

> **Nothing in this package has been executed against production.** This guide is
> for you (or your manual deploy process) to run when you choose. Every SQL step is
> additive and reversible; legacy fields are never modified.

## 0. Prerequisites

- Supabase project `ralifvemgapmsgrjgazh`, run SQL via the SQL editor or `service_role` connection.
- A backup point exists (the script also creates its own snapshot in step 2).
- The approved spreadsheet `قائمة_جديدة.xlsx` is the source the import SQL was generated from.

## 1. Place files

| Package path | Destination in repo |
|---|---|
| `database/migrations/*.sql` | `database/migrations/` |
| `src/services/*.js` | `src/services/` |
| `src/pages/member-account/manageAccount.js` | `src/pages/member-account/` |
| `src/pages/rebuild-account/rebuildAccount.js` | `src/pages/rebuild-account/` |
| `src/components/donation-allocation/donationAllocation.js` | `src/components/donation-allocation/` |
| `src/i18n/translations/*.phase15.json` | merge keys into your existing `i18n` store |

> Frontend files are **reference implementations** matching the `window.t()` convention.
> Wire them to your existing router, API client, and styles. The Express endpoints they
> expect are listed in each file's header.

## 2. Run SQL — exact order

```
1) database/migrations/phase15_0001_additive_schema.sql      -- columns + new tables + switch (legacy)
2) database/migrations/phase15_0002_backup_snapshot.sql      -- members snapshot (before any overwrite)
3) database/migrations/phase15_0003_food_donation_allocation.sql  -- food-fund column (optional; independent)
4) database/migrations/phase15_migration_import.sql          -- import + generate subscriptions + audit
```

Do **not** run `phase15_rollback.sql` unless reverting.

## 3. Expected results

After step 1: 4 new columns on `members`; tables `member_subscriptions`,
`payment_allocations`, `rebuild_runs`; `settings.accounting_model = 'legacy'`.

After step 2: `members_backup_phase15_20260620` with **149** rows.

After step 4 (verification queries are in the import file footer):

| Check | Expected |
|---|---|
| `member_subscriptions` rows | **292** (146 non-exception × 2 years) |
| `members` with `is_migration_exception = true` | **3** (TAHA-0120/0134/0149) |
| `members` with `credit_balance_ils > 0` | **15** |
| `audit_log` new `active_year_change` rows | **149** |

Then open `reports/phase15_migration_reports.xlsx` and confirm the **Validation** sheet
is all PASS and the **Comparison** sheet's flagged rows match your expectations
(30 members change vs current DB — these are the new approved values).

## 4. Application stays on legacy

The app keeps reading legacy balances because `accounting_model = 'legacy'`. New
columns/tables are populated but **not** surfaced. No user-visible change yet.
Proceed to `ACTIVATION_GUIDE.md` only after the reports are approved.

## 5. Rollback procedure (pre-activation, zero data loss)

Run `database/migrations/phase15_rollback.sql`. It:
1. sets `accounting_model = 'legacy'`,
2. restores `active_from_year` from the snapshot,
3. drops `payment_allocations`, `member_subscriptions`, `rebuild_runs`,
4. drops the 4 new `members` columns.

Legacy fields are untouched throughout, so production returns to its exact prior state.
The snapshot table is retained; drop it manually only after rollback is confirmed.
For the food-fund column, the rollback statements are in the footer of `phase15_0003`.
