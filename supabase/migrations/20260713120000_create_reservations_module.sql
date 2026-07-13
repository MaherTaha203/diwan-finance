-- ═══ Diwan Reservation Calendar — M1 (approved Design Review v1) ═══
-- Applied to the live project via MCP on 2026-07-13; kept here as the
-- versioned source of truth. One-purpose module: is the Diwan free?

create table public.reservations (
  id            uuid primary key default gen_random_uuid(),
  res_date      date        not null,
  customer_name text        not null,
  phone         text        not null,
  res_type      text        not null check (res_type in (
    'wedding','engagement','henna','wedding_lunch','evening_party',
    'talbeh','small_party','large_party_two_floors','birthday',
    'graduation','lecture','general')),
  notes         text,
  is_deleted    boolean     not null default false,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_by    text,
  updated_at    timestamptz,
  deleted_by    text,
  deleted_at    timestamptz
);

create unique index uq_reservations_active_date
  on public.reservations (res_date) where (not is_deleted);

create index ix_reservations_active_range
  on public.reservations (res_date) where (not is_deleted);

alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role = any (array['admin'::text,'accountant'::text,'viewer'::text,'reservation'::text]));

-- Finance roles only: excludes 'reservation' from every finance policy.
create or replace function public.is_provisioned_user()
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','accountant','viewer')
  );
$$;

create or replace function public.can_manage_reservations()
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','reservation')
  );
$$;

alter table public.reservations enable row level security;

create policy anon_block on public.reservations
  for select to anon using (false);
create policy reservations_read on public.reservations
  for select to authenticated using (can_manage_reservations());
create policy reservations_insert on public.reservations
  for insert to authenticated with check (can_manage_reservations());
create policy reservations_update on public.reservations
  for update to authenticated
  using (can_manage_reservations()) with check (can_manage_reservations());
-- no DELETE policy on purpose: cancellation is a soft delete

drop policy audit_log_auth_insert on public.audit_log;
create policy audit_log_auth_insert on public.audit_log
  for insert to authenticated
  with check (is_provisioned_user() or can_manage_reservations());
