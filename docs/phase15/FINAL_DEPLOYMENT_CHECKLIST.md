# Phase 15 — Final Deployment Checklist

Sequence is fixed (§17): **Schema → Migration → Validation → Comparison → Review → Approval → Activation.**
Activation is a separate explicit step. Nothing here has been run against production.

## A. Pre-flight
- [ ] Confirm `vercel.json` routing (decides whether endpoints live in `api/*.js` or `server.js`).
- [ ] Share `public/` + `public/js/` listing and `i18n.js` to finalize the 3 MODIFY targets.
- [ ] Take/confirm a Supabase backup point.

## B. Schema (Supabase SQL, in order)
- [ ] Run `phase15_0001_additive_schema.sql` → 4 new `members` columns; `member_subscriptions`, `payment_allocations`, `rebuild_runs`; `settings.accounting_model='legacy'`.
- [ ] Run `phase15_0002_backup_snapshot.sql` → `members_backup_phase15_20260620` (149 rows).
- [ ] Run `phase15_0003_food_donation_allocation.sql` → `receipts.food_donation_allocation` + constraint.

## C. Migration (Supabase SQL)
- [ ] Run `phase15_migration_import.sql`.
- [ ] Verify: `member_subscriptions` = **292**; `is_migration_exception=true` = **3**; `credit_balance_ils>0` = **15**; new `audit_log` rows = **149**.

## D. Reports (review before activation, §16)
- [ ] Migration Report — 149 imported, 3 exceptions, 292 subs, 15 credits, 145 Active-Year corrections.
- [ ] Validation Report — 146/146 reconcile to spreadsheet col8 + col9; 0 failures.
- [ ] Comparison Report — 4 net balance changes (historical), 15 credit (net unchanged), 3 exceptions verbatim. Net impact −2,400 ₪.
- [ ] Confirm Historical Balance = `(2024 − ActiveYear + 1) × 200` (D-1) — verified 0 mismatches.

## E. Application code (GitHub)
- [ ] Commit `_phase15-*.js` helpers to `api/`.
- [ ] Add `api/rebuild.js` (+ manage-account endpoints) — PUT recomputes derived Historical Balance and audits.
- [ ] Commit `public/js/phase15-*.js` + `public/css/phase15.css`.
- [ ] Merge i18n keys into `public/js/i18n.js`.
- [ ] Add `public/manage-account.html`, `public/rebuild-account.html`.
- [ ] Insert donation-allocation snippet into the receipt-form HTML.
- [ ] Deploy (Vercel auto-deploy on `main`).

## F. Behaviour checks (still on legacy mode)
- [ ] Manage Account: changing Active Year previews Historical Balance Before→After→Difference (D-1), does not save until confirmed; Historical Payments unchanged.
- [ ] Manual override on a subscription survives a Rebuild.
- [ ] Food donation to Food Fund forces an allocation choice; a `reduce_deficit` donation > remaining deficit routes the excess to current balance (§13), deficit stops at 0.
- [ ] Credit appears in Account Statement, Manage Account, and Rebuild preview.

## G. Approval + Activation (separate explicit step, §17)
- [ ] Reports reviewed and approved.
- [ ] `UPDATE settings SET value='structured' WHERE key='accounting_model';`
- [ ] Spot-check member statements in structured mode.

## Rollback (any time pre-confirmation, zero data loss)
- [ ] `phase15_rollback.sql` — switch back to legacy, restore `active_from_year`, drop new objects. Legacy fields never modified.
