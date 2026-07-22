# Backup Checklist — v1.0.0

Two independent things are backed up: **code** (git) and **data** (Supabase). Code is
already immutable once tagged; the operational risk lives in the data plane.

> Never place Supabase credentials, connection strings, or keys in the repository or in
> this document. Perform credentialed steps in the Supabase dashboard / a secured shell.

## Code baseline (git)
- [ ] Tag `v1.0.0` exists and is pushed to origin (immutable release pointer).
- [ ] `main` contains the tagged commit; the pre‑V1 tag `baseline-pre-refactor-2026-06-29`
      is retained for history.
- [ ] Release package (`docs/release/v1.0.0/`) committed.

## Data (Supabase) — before go‑live and on a schedule
- [ ] **Point‑in‑Time Recovery / automated daily backups** are enabled on the production
      project (confirm retention window meets policy).
- [ ] A **manual snapshot/export** is taken immediately before promoting v1.0.0 to
      production (a known‑good pre‑release restore point).
- [ ] Export covers all financial tables: members, subscriptions, receipts, payments,
      audit_log, voucher_versions, settings (openings + `locked_through_year`), contacts.
- [ ] The **settings** rows are captured (treasury openings and the year‑end lock define
      the carry‑forward baseline — FOC‑024).
- [ ] Backup artifact stored in a location **separate** from the production project.
- [ ] Backup integrity verified (row counts / checksums recorded in the run log).

## Cadence
- [ ] Automated: daily (managed by Supabase PITR/backups).
- [ ] Manual: before every production promotion and before any schema/RPC change.

## Evidence to retain
- [ ] Timestamp, retention window, row counts, and storage location of the pre‑release
      snapshot (attach to the deployment record).
