-- ═══ CCR-001 · IG-014 — FC-003 · FD-022/FD-023/FD-024/FD-025 ═══
-- Administrative Internal Transfers among the three constitutional funds
-- (Diwan · Food · Historical Food/Deficit). Each transfer is an IMMUTABLE
-- Internal Transfer Voucher carrying: number, date, funds, currency identity,
-- reason, operator (created_by) and approving director.
-- Immutability is DB-enforced: RLS grants INSERT (admin) and SELECT
-- (provisioned) ONLY — no UPDATE/DELETE policy exists for app roles.
-- The IG-004 closed-period guard covers transfer_date (FD-004/FD-030).
-- Idempotent DDL (Engineering Standards §5).

create table if not exists public.internal_transfers (
  id                  uuid primary key default gen_random_uuid(),
  no                  text not null unique,
  movement_type       text not null default 'internal_transfer',
  source_treasury     text not null,
  destination_treasury text not null,
  amount              numeric not null,
  amount_ils          numeric not null,
  currency            text not null default 'ILS',
  exchange_rate       numeric not null default 1,
  transfer_date       date not null,
  reason              text not null,
  approving_director  text not null,
  verification_token  text not null,
  created_by          text,
  created_at          timestamptz not null default now(),
  is_deleted          boolean not null default false,
  -- FD-022/FD-023: allowed funds only, never self-transfer; FD-021: valid ILS amount
  constraint it_source_allowed      check (source_treasury      in ('diwan','food','historical_deficit')),
  constraint it_destination_allowed check (destination_treasury in ('diwan','food','historical_deficit')),
  constraint it_distinct_funds      check (source_treasury <> destination_treasury),
  constraint it_amount_positive     check (amount_ils > 0)
);

alter table public.internal_transfers enable row level security;

drop policy if exists internal_transfers_admin_insert on public.internal_transfers;
create policy internal_transfers_admin_insert on public.internal_transfers
  for insert to authenticated with check (is_admin());

drop policy if exists internal_transfers_read on public.internal_transfers;
create policy internal_transfers_read on public.internal_transfers
  for select to authenticated using (is_provisioned_user());

drop policy if exists anon_block on public.internal_transfers;
create policy anon_block on public.internal_transfers
  for select to anon using (false);

-- NO update/delete policies: the voucher is immutable for application roles.

-- FD-004/FD-030 — closed-period immutability applies to transfers too (IG-004 guard).
drop trigger if exists trg_closed_period_internal_transfers on public.internal_transfers;
create trigger trg_closed_period_internal_transfers
  before insert or update or delete on public.internal_transfers
  for each row execute function public.fn_closed_period_guard('transfer_date','date');
