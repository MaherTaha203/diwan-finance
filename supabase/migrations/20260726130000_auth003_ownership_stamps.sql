-- ════════════════════════════════════════════════════════════════════════════
-- AUTH-003 (addendum) · Ownership + timestamp stamps on ALL financial documents
-- Owner requirement: every financial record must carry created_by / created_at /
-- updated_by / updated_at — not only receipts & payments.
-- Additive & idempotent. `reservations` already has all four; `voucher_versions`
-- is an append-only snapshot log (its own edited_by/edited_at) and is excluded.
-- Authored for review — apply with the owner's authorization.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- Generic "touch on update" trigger: stamps updated_at + updated_by (the acting
-- user's stable id). The inner guard keeps it safe if a table's updated_by is not a
-- uuid. SECURITY DEFINER + not REST-callable (advisor 0028/0029).
create or replace function public.set_row_updated()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  new.updated_at := now();
  begin new.updated_by := auth.uid(); exception when others then null; end;
  return new;
end $$;
revoke all on function public.set_row_updated() from public, anon, authenticated;
comment on function public.set_row_updated() is 'AUTH-003: stamps updated_at + updated_by (auth.uid()) on every financial-table UPDATE.';

do $$
declare
  t text;
  targets text[] := array[
    'receipts','payments','members','annual_dues','member_subscriptions',
    'member_write_offs','refunds','allocation_records','internal_transfers',
    'contacts','fiscal_snapshots'
  ];
begin
  foreach t in array targets loop
    -- ensure the four (+ owner uid) columns exist
    execute format('alter table public.%I add column if not exists created_by_uid uuid default auth.uid();', t);
    execute format('alter table public.%I add column if not exists created_by text;', t);
    execute format('alter table public.%I add column if not exists created_at timestamptz default now();', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz default now();', t);
    execute format('alter table public.%I add column if not exists updated_by uuid;', t);
    -- attach the touch-on-update trigger (fires alongside any existing BEFORE UPDATE trigger)
    execute format('drop trigger if exists trg_set_updated on public.%I;', t);
    execute format('create trigger trg_set_updated before update on public.%I for each row execute function public.set_row_updated();', t);
  end loop;
end $$;

commit;
