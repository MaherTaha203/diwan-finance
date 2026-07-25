-- Historical Subscription Truth Layer (Owner-approved business authority).
-- Stores the owner's manually verified historical subscription status per
-- member-year. This layer OVERRIDES derived presentation status wherever a
-- record exists; it never participates in any financial calculation —
-- balances, treasury, ledger, FD-002 allocation mathematics stay algorithmic.
-- Idempotent. Source of the initial rows: the completed Historical
-- Subscription Truth Workbook (owner review, 2026-07-25).

create table if not exists public.historical_subscription_truth (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id),
  year         integer not null,
  status       text not null check (status in ('paid','partial','unpaid','unknown')),
  source       text not null default 'owner_workbook_2026-07-25',
  approved_by  text not null default 'Owner',
  approved_at  timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now(),
  unique (member_id, year)
);
create index if not exists hst_member_idx on public.historical_subscription_truth(member_id);

alter table public.historical_subscription_truth enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='historical_subscription_truth' and policyname='hst_read') then
    create policy hst_read   on public.historical_subscription_truth for select to authenticated using (is_provisioned_user());
  end if;
  if not exists (select 1 from pg_policies where tablename='historical_subscription_truth' and policyname='hst_anon_block') then
    create policy hst_anon_block on public.historical_subscription_truth for select to anon using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='historical_subscription_truth' and policyname='hst_insert') then
    create policy hst_insert on public.historical_subscription_truth for insert to authenticated with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='historical_subscription_truth' and policyname='hst_update') then
    create policy hst_update on public.historical_subscription_truth for update to authenticated using (is_admin());
  end if;
end $$;

comment on table public.historical_subscription_truth is
  'Owner-approved historical subscription status (business authority). Presentation override only: never read by balance, treasury, ledger, or FD-002 allocation. status=unknown means the owner declared the year indeterminate — consumers fall back to derived status.';
