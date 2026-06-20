# Phase 15 — Database Changes Summary

All changes are **additive**. No column is dropped, no type is altered, no existing
balance is modified in place. Legacy fields `members.opening_balance` and
`members.prepaid_subscription_ils` are preserved read-only for verification and rollback.

Applied by, in order:
`phase15_0001_additive_schema.sql` → `phase15_0002_backup_snapshot.sql` →
`phase15_0003_food_donation_allocation.sql` → `phase15_migration_import.sql`.

---

## Table: `members` (existing — extended)

| Change | Detail |
|---|---|
| Columns added | `historical_balance_ils numeric NOT NULL DEFAULT 0`, `historical_payments_ils numeric NOT NULL DEFAULT 0`, `credit_balance_ils numeric NOT NULL DEFAULT 0`, `is_migration_exception boolean NOT NULL DEFAULT false` |
| Reused (not duplicated) | `active_from_year` serves as Active Year |
| Constraints added | none |
| Indexes added | none |
| RLS | unchanged (already enabled) |
| Data writes (import) | `active_from_year` overwritten from spreadsheet; new `*_ils` columns + `is_migration_exception` populated. Legacy columns untouched. |

## Table: `member_subscriptions` (new)

| Change | Detail |
|---|---|
| Columns | `id uuid PK`, `member_id uuid FK→members(id) ON DELETE CASCADE`, `year int FK→annual_dues(year)`, `due_amount_ils`, `paid_amount_ils`, `balance_ils`, `is_overridden bool`, `override_amount_ils`, `override_reason`, `override_by`, `override_at`, `created_at`, `updated_at` |
| Constraints | `UNIQUE(member_id, year)`; CHECK `due/paid ≥ 0`; CHECK override requires `override_amount_ils` |
| Indexes | `idx_member_subscriptions_member`, `idx_member_subscriptions_year` |
| RLS | enabled; `SELECT` for `authenticated`; writes via `service_role` |

## Table: `payment_allocations` (new)

| Change | Detail |
|---|---|
| Columns | `id`, `receipt_id uuid FK→receipts(id)`, `member_id uuid FK→members(id)`, `target_type CHECK(subscription/historical/credit)`, `target_year`, `amount_ils CHECK(>0)`, `rebuild_run_id`, `created_at` |
| Constraints | year-presence CHECK (year set iff target is a subscription) |
| Indexes | `idx_payment_allocations_receipt`, `idx_payment_allocations_member` |
| RLS | enabled; `SELECT` for `authenticated`; writes via `service_role` |
| Note | Source is `receipts` (live payments). The `payments` table is expenses and is never used here. |

## Table: `rebuild_runs` (new)

| Change | Detail |
|---|---|
| Columns | `id`, `triggered_by`, `scope`, `status CHECK(running/completed/failed)`, `members_affected`, `summary_json jsonb`, `reason`, `started_at`, `finished_at` |
| Indexes | `idx_rebuild_runs_started` |
| RLS | enabled; `SELECT` for `authenticated`; writes via `service_role` |

## Table: `receipts` (existing — extended, food-fund feature)

| Change | Detail |
|---|---|
| Column added | `food_donation_allocation text CHECK IN ('support_current','reduce_deficit')` |
| Constraint added | `receipts_food_donation_alloc_required` (NOT VALID) — required when `fund_type='donation' AND donation_display_fund='food'`; existing rows unaffected (none qualify) |
| Index added | `idx_receipts_food_alloc` (partial, non-deleted, allocated) |
| RLS | unchanged |
| Backfill | none required (0 existing food-targeted donations) |

## Table: `annual_dues` (existing — reused)

No change. Authoritative dues source (`2025=200`, `2026=200`). Future years are
inserted here; nothing is hardcoded.

## Table: `audit_log` (existing — reused)

No schema change. New action values written: `active_year_change`,
`historical_balance_change`, `historical_payment_change`, `credit_balance_change`,
`subscription_override`, `allocation_change`, `rebuild_account`. Before/after captured
in `old_data` / `new_data`.

## Table: `settings` (existing — extended)

| Change | Detail |
|---|---|
| Row added | `accounting_model = 'legacy'` (the read selector; flipped to `structured` only on activation) |
| Never mutated | `food_opening_balance = -8689` (deficit constant; deficit reduction is computed additively, not by editing this value) |

## Backup / rollback objects

`members_backup_phase15_20260620` — full pre-import snapshot (RLS on, service_role only),
retained until structured mode is approved and confirmed, then dropped.
