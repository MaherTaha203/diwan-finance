-- MODEL2 V2.0 · Slice 7a activation foundations (owner-approved: B1->A1, B2/B3->S2).
-- Three dedicated, additive tables. RLS mirrors the certified receipts/payments posture
-- (is_admin() for writes, is_provisioned_user() for reads, anon blocked). No existing
-- table is altered. Empty on creation => zero behaviour change while the flag is OFF.
-- Applied to project ralifvemgapmsgrjgazh as migration `model2_v2_activation_tables`.

-- 1) allocation_records — MODEL2 ordered-allocation audit (Slice 2 write target, B1->A1).
create table if not exists public.allocation_records (
  id               uuid primary key default gen_random_uuid(),
  source_ref       text,
  source_kind      text,
  member_id        uuid references public.members(id),
  obligation_id    text,
  obligation_kind  text,
  year             integer,
  amount_allocated numeric not null,
  allocated_at     timestamptz,
  immutable        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists allocation_records_member_idx on public.allocation_records(member_id);
create index if not exists allocation_records_source_idx on public.allocation_records(source_ref);
alter table public.allocation_records enable row level security;
create policy allocation_records_read   on public.allocation_records for select to authenticated using (is_provisioned_user());
create policy anon_block                on public.allocation_records for select to anon using (false);
create policy allocation_records_insert on public.allocation_records for insert to authenticated with check (is_provisioned_user());
create policy allocation_records_update on public.allocation_records for update to authenticated using (is_admin());
create policy allocation_records_delete on public.allocation_records for delete to authenticated using (is_admin());

-- 2) refunds — first-class refund movement (CA-005 · BO-11), B2->S2. Dedicated; payments untouched.
create table if not exists public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  no                 text unique,
  movement_type      text not null default 'refund',
  origin_receipt_id  uuid references public.receipts(id),
  origin_receipt_no  text,
  linked_receipt     text,
  member_id          uuid references public.members(id),
  payer_name         text,
  amount             numeric not null check (amount > 0),
  amount_ils         numeric not null check (amount_ils > 0),
  currency           text not null default 'ILS',
  exchange_rate      numeric not null default 1,
  destination_treasury text,
  fund_type          text,
  payment_date       date not null,
  notes              text,
  verification_token text,
  created_by         text,
  is_refund          boolean not null default true,
  is_deleted         boolean not null default false,
  version            integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists refunds_origin_idx on public.refunds(origin_receipt_id);
create index if not exists refunds_member_idx on public.refunds(member_id);
alter table public.refunds enable row level security;
create policy refunds_read         on public.refunds for select to authenticated using (is_provisioned_user());
create policy anon_block           on public.refunds for select to anon using (false);
create policy refunds_admin_insert on public.refunds for insert to authenticated with check (is_admin());
create policy refunds_admin_update on public.refunds for update to authenticated using (is_admin());
create policy refunds_admin_delete on public.refunds for delete to authenticated using (is_admin());

-- 3) member_write_offs — debt/credit write-off at member closure (CA-007 · BO-12/13), B3->S2.
create table if not exists public.member_write_offs (
  id                 uuid primary key default gen_random_uuid(),
  no                 text unique,
  movement_type      text not null check (movement_type in ('debt_write_off','credit_write_off')),
  member_id          uuid not null references public.members(id),
  payer_name         text,
  amount             numeric not null check (amount > 0),
  amount_ils         numeric not null check (amount_ils > 0),
  currency           text not null default 'ILS',
  exchange_rate      numeric not null default 1,
  destination_treasury text,
  fund_type          text,
  is_write_off       boolean not null default true,
  receipt_date       date not null,
  notes              text,
  verification_token text,
  created_by         text,
  is_deleted         boolean not null default false,
  version            integer not null default 1,
  created_at         timestamptz not null default now()
);
create index if not exists member_write_offs_member_idx on public.member_write_offs(member_id);
alter table public.member_write_offs enable row level security;
create policy member_write_offs_read         on public.member_write_offs for select to authenticated using (is_provisioned_user());
create policy anon_block                     on public.member_write_offs for select to anon using (false);
create policy member_write_offs_admin_insert on public.member_write_offs for insert to authenticated with check (is_admin());
create policy member_write_offs_admin_update on public.member_write_offs for update to authenticated using (is_admin());
create policy member_write_offs_admin_delete on public.member_write_offs for delete to authenticated using (is_admin());

comment on table public.allocation_records is 'MODEL2 V2.0: ordered-allocation audit (CA-001 order). Written when MODEL2_ALLOCATION_ENABLED is ON. Immutable audit metadata; balances derive from receipts, not this table.';
comment on table public.refunds is 'MODEL2 V2.0: first-class refund movements (CA-005/BO-11). Outflow linked to an origin receipt, funded from the origin treasury. Dedicated table; payments table untouched.';
comment on table public.member_write_offs is 'MODEL2 V2.0: debt/credit write-offs at member permanent departure (CA-007/BO-12/13). NON-CASH member-ledger events. Dedicated table; receipts table untouched.';
