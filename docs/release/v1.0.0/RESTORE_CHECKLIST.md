# Restore Checklist — v1.0.0

Restoring is the inverse of `BACKUP_CHECKLIST.md`: bring **code** back to the tagged
baseline and/or **data** back to a known‑good snapshot. Financial data is the sensitive
half — treat every restore as an accounting event.

> All credentialed steps run in the Supabase dashboard / a secured shell. No secrets in
> the repository.

## Decision — what actually needs restoring?
- [ ] Code‑only issue (bad deploy) → **re‑promote previous Vercel deployment** or redeploy
      the `v1.0.0` tag; **no data restore needed**.
- [ ] Data issue (corruption / bad bulk change) → proceed to data restore below.

## Code restore
- [ ] `git fetch --tags && git checkout v1.0.0` (or redeploy the tag in Vercel).
- [ ] Confirm the pre‑deployment gate in `DEPLOYMENT_CHECKLIST.md` before promoting.

## Data restore (Supabase)
- [ ] **Announce a maintenance window**; stop write traffic (the app must not accept new
      receipts/payments during restore).
- [ ] Identify the target restore point (PITR timestamp or the pre‑release manual snapshot).
- [ ] Take a **fresh backup of the current (damaged) state first** — never overwrite the
      only copy of what went wrong.
- [ ] Restore into a **staging project** first; verify before touching production.
- [ ] Restore financial tables **together and atomically** (members, subscriptions,
      receipts, payments, audit_log, voucher_versions, settings, contacts) — partial
      restores break conservation and the carry‑forward baseline.
- [ ] Re‑confirm `settings` (treasury openings + `locked_through_year`) match the intended
      baseline.

## Post‑restore verification (must pass before reopening writes)
- [ ] Treasury position reconciles (food / diwan / historical‑deficit) to the restore point.
- [ ] Spot‑check member statements (opening → dues → paid → final balance / credit).
- [ ] Audit log continuity intact; no orphaned voucher versions.
- [ ] Reopen write traffic; monitor the first transactions.

## Evidence to retain
- [ ] Restore point, who authorized it, before/after row counts, and the reconciliation
      result (attach to the incident record).
