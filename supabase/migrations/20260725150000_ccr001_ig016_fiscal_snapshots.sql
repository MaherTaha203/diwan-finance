-- ═══ CCR-001 · IG-016 — FC-003 · FD-004 (reinforced by FD-021/FD-026) ═══
-- Immutable close-time report snapshots. At every fiscal close (BO-14) the
-- engine's key report models for the newly closed year(s) — fund ledgers,
-- debt-report model, treasury position, consistency verdict — are archived
-- here. A closed year's report must always reproduce its original values:
-- closed-year rendering reads the snapshot, and the stored payload is the
-- byte-for-byte reference for verification.
-- Immutability is DB-enforced: RLS grants INSERT (admin) and SELECT
-- (provisioned) ONLY — no UPDATE/DELETE policy exists for app roles.
-- A reopen + re-close appends a NEW snapshot (history is never overwritten);
-- readers use the latest snapshot covering the year.
-- Idempotent DDL (Engineering Standards §5).

create table if not exists public.fiscal_snapshots (
  id             uuid primary key default gen_random_uuid(),
  closed_through integer not null,
  previous_lock  integer,
  snapshot       jsonb not null,
  created_by     text,
  created_at     timestamptz not null default now(),
  constraint fs_year_sane check (closed_through between 2000 and 2100)
);

alter table public.fiscal_snapshots enable row level security;

drop policy if exists fiscal_snapshots_admin_insert on public.fiscal_snapshots;
create policy fiscal_snapshots_admin_insert on public.fiscal_snapshots
  for insert to authenticated with check (is_admin());

drop policy if exists fiscal_snapshots_read on public.fiscal_snapshots;
create policy fiscal_snapshots_read on public.fiscal_snapshots
  for select to authenticated using (is_provisioned_user());

drop policy if exists anon_block on public.fiscal_snapshots;
create policy anon_block on public.fiscal_snapshots
  for select to anon using (false);

-- NO update/delete policies: close-time snapshots are immutable for app roles.
-- NO period-guard trigger: the snapshot is the close's own record and must be
-- writable at the moment of closing (it is not a financial transaction row).
