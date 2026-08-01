-- TRUTH-001 · Phase 1 — Structure only (inert).
-- Creates the storage + provenance foundations for the Canonical Subscription
-- Status model. NOTHING reads or writes these objects at runtime yet: the two
-- new tables are empty on creation, the provenance columns are nullable and
-- unpopulated, and no application code path consumes them. Zero behaviour
-- change while every later phase stays OFF.
--
-- RLS mirrors the certified historical_subscription_truth / MODEL2 posture:
-- is_provisioned_user() for reads, is_admin() for writes, anon blocked. The
-- single-writer enforcement for current_subscription_status (only the Status
-- Materializer may write) is deliberately deferred to Phase 3, where the
-- Materializer identity/guard is introduced; until then the table is empty and
-- unused. Idempotent. No existing table is dropped or rewritten.

-- 1) import_batches — one row per import run (batch registry / legal origin).
create table if not exists public.import_batches (
  id            uuid primary key default gen_random_uuid(),
  import_source text,                 -- file name of origin
  content_hash  text,                 -- hash of the exact source file
  checksum      text,                 -- row-content checksum (integrity)
  row_count     integer,
  imported_by   text,
  imported_at   timestamptz not null default now(),
  notes         text,
  created_at    timestamptz not null default now()
);
alter table public.import_batches enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_read') then
    create policy import_batches_read   on public.import_batches for select to authenticated using (is_provisioned_user());
  end if;
  if not exists (select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_anon_block') then
    create policy import_batches_anon_block on public.import_batches for select to anon using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_insert') then
    create policy import_batches_insert on public.import_batches for insert to authenticated with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_update') then
    create policy import_batches_update on public.import_batches for update to authenticated using (is_admin());
  end if;
end $$;

-- 2) current_subscription_status — the materialized read model (Repository's
--    backing store). Populated ONLY by the Status Materializer starting Phase 3;
--    empty and unread today. One row per (member, year).
create table if not exists public.current_subscription_status (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id),
  year         integer not null,
  status       text not null check (status in ('paid','partial','unpaid','unknown')),
  source       text,                  -- which source last determined it (imported | erp)
  provenance   jsonb,                 -- audit chain the Materializer projected from
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (member_id, year)
);
create index if not exists css_member_idx on public.current_subscription_status(member_id);
alter table public.current_subscription_status enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='current_subscription_status' and policyname='css_read') then
    create policy css_read   on public.current_subscription_status for select to authenticated using (is_provisioned_user());
  end if;
  if not exists (select 1 from pg_policies where tablename='current_subscription_status' and policyname='css_anon_block') then
    create policy css_anon_block on public.current_subscription_status for select to anon using (false);
  end if;
  -- Interim write policy (admin). Phase 3 tightens this to the single Materializer identity.
  if not exists (select 1 from pg_policies where tablename='current_subscription_status' and policyname='css_insert') then
    create policy css_insert on public.current_subscription_status for insert to authenticated with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='current_subscription_status' and policyname='css_update') then
    create policy css_update on public.current_subscription_status for update to authenticated using (is_admin());
  end if;
end $$;

-- 3) Provenance columns on historical_subscription_truth (additive, nullable).
--    They ENRICH the audit record; the existing status/source columns and every
--    reader (memberDelinquency override) are untouched. Nothing populates these
--    columns until Phase 2 (adoption), so legacy behaviour is unchanged.
alter table public.historical_subscription_truth
  add column if not exists import_batch_id           uuid references public.import_batches(id),
  add column if not exists original_excel_row        integer,
  add column if not exists original_member_identifier text,
  add column if not exists reason                     text,
  add column if not exists version                    integer not null default 1,
  add column if not exists superseded_by              uuid;

comment on table public.import_batches is
  'TRUTH-001: batch registry — one row per import run (source file, hash, checksum, who/when). Legal origin of adopted historical truth. Written only by the Phase-2 adoption operation; empty and unread until then.';
comment on table public.current_subscription_status is
  'TRUTH-001: materialized read model of the canonical per-(member,year) status. Written ONLY by the Status Materializer (single writer, Phase 3+); read via the Subscription Status Repository. A derivative of the two authoritative sources (Historical Imported Truth + ERP operational result); never a third source of truth. Empty and unread until Phase 3.';
comment on column public.historical_subscription_truth.import_batch_id is
  'TRUTH-001: FK to the import batch that created this row (provenance). Nullable; populated by Phase-2 adoption only.';
