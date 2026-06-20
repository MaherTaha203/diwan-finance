# Phase 15 — Activation Guide

Activation is a **single switch**. It is fully reversible and changes no data.

## What the switch does

`settings.accounting_model` selects which model the application reads:

- `legacy` (default) — app reads `opening_balance` / `prepaid_subscription_ils`.
- `structured` — app reads `historical_balance_ils`, `historical_payments_ils`,
  `member_subscriptions`, `credit_balance_ils`, and `payment_allocations`.

The new fields are already populated (deployment step 4), so flipping the switch is the
only remaining action. The application code must branch on this value when computing and
displaying member balances (read selector).

## Switch to structured mode

Pre-conditions: deployment completed, Validation sheet all PASS, Comparison reviewed and
approved.

```sql
UPDATE public.settings SET value = 'structured' WHERE key = 'accounting_model';
```

Then confirm in the UI that member statements show structured balances and that the three
new screens (Manage Account, Rebuild Account, food-fund donation field) behave as expected.

## Return to legacy mode

At any time, instantly and without data loss:

```sql
UPDATE public.settings SET value = 'legacy' WHERE key = 'accounting_model';
```

Because legacy fields were never modified, the app returns to its exact prior behaviour.

## After activation is confirmed stable

- Keep legacy fields and the `members_backup_phase15_20260620` snapshot for the audit
  window you require.
- Only after that window: optionally drop the snapshot table. Legacy columns may be kept
  indefinitely for historical audit (recommended) — they cost nothing and preserve the
  pre-migration reference.

## Notes

- The food-fund donation feature (`0003`) is **independent** of the accounting-model
  switch; it is live as soon as its column + UI are deployed and does not require
  structured mode.
- Manual overrides set via Manage Account survive every subsequent Rebuild Account run.
