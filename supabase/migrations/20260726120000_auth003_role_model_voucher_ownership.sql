-- ════════════════════════════════════════════════════════════════════════════
-- AUTH-003 · Role model + voucher ownership + audit enrichment (DATABASE layer)
-- Frozen owner decisions (see docs/security/AUTH-003_COMPLETION_REPORT.md):
--   • Exactly THREE roles: admin, accountant, reservation. The legacy "viewer" is
--     removed; the legacy "accountant" value is now a first-class role.
--   • Accountant = operational finance writer: create receipts/payments, edit ONLY
--     own vouchers, print, read finance + reports. No delete/cancel/settings/users/
--     reservations/period-control.
--   • Voucher ownership: owner = creator (created_by_uid). Owner edits only own.
--     Admin edits any; when an admin edits an accountant's voucher the system moves
--     it to Administrator Review and locks it for the accountant (auto + audited).
--     "Return to Accountant" makes it editable again (audited).
--   • Voucher states: editable · admin_review · returned · locked · cancelled.
--   • Audit records carry actor id + role + ip + reason + old/new values.
-- Additive & reversible. RLS SELECT for finance is unchanged except viewer removal.
-- NOTE: authored for review — apply with the Supabase migration tooling after the
-- owner approves (production project ralifvemgapmsgrjgazh).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · ROLE MODEL ──────────────────────────────────────────────────────────
-- Convert any stray legacy 'viewer' rows to the least-surprising safe state:
-- role=accountant but DISABLED, so no silent privilege change — an admin re-enables
-- deliberately. (Production currently has none; this is defensive + idempotent.)
update public.user_roles set role = 'accountant', is_disabled = true
  where role = 'viewer';

-- Drop the 'viewer' default; role must now be set explicitly by the admin flow.
alter table public.user_roles alter column role drop default;

-- Tighten the role domain to exactly the three approved roles.
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role = any (array['admin'::text, 'accountant'::text, 'reservation'::text]));

-- ── 2 · AUTHORIZATION PREDICATES ────────────────────────────────────────────
-- Finance READ: admin or accountant, and not disabled. (Reservation stays finance-
-- blind.) Removes 'viewer'; adds defense-in-depth is_disabled check.
create or replace function public.is_provisioned_user()
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and is_disabled = false
      and role in ('admin','accountant')
  );
$$;

-- Admin: unchanged authority, plus defense-in-depth is_disabled check.
create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and is_disabled = false and role = 'admin'
  );
$$;

-- Accountant: the operational finance writer.
create or replace function public.is_accountant()
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and is_disabled = false and role = 'accountant'
  );
$$;

-- Finance writer = admin OR accountant (used by voucher write policies).
create or replace function public.is_finance_writer()
  returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.is_admin() or public.is_accountant();
$$;

comment on function public.is_accountant() is 'AUTH-003: caller is an enabled accountant.';
comment on function public.is_finance_writer() is 'AUTH-003: caller may create finance vouchers (admin or accountant).';

-- ── 3 · VOUCHER OWNERSHIP COLUMNS (receipts + payments) ─────────────────────
-- created_by_uid: the stable owner (auth.uid()). Historical rows stay NULL =
-- owner-less → admin-only editable. New inserts auto-stamp via the default.
alter table public.receipts add column if not exists created_by_uid uuid default auth.uid();
alter table public.payments add column if not exists created_by_uid uuid default auth.uid();

-- ownership_state: the voucher lifecycle state.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='receipts' and column_name='ownership_state') then
    alter table public.receipts add column ownership_state text not null default 'editable';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='payments' and column_name='ownership_state') then
    alter table public.payments add column ownership_state text not null default 'editable';
  end if;
end $$;

-- Backfill lifecycle state for existing rows: cancelled if soft-deleted, else editable.
update public.receipts set ownership_state = case when is_deleted then 'cancelled' else 'editable' end
  where ownership_state is null or ownership_state = 'editable';
update public.payments set ownership_state = case when is_deleted then 'cancelled' else 'editable' end
  where ownership_state is null or ownership_state = 'editable';

-- Constrain the state domain.
alter table public.receipts drop constraint if exists receipts_ownership_state_check;
alter table public.receipts add constraint receipts_ownership_state_check
  check (ownership_state = any (array['editable','admin_review','returned','locked','cancelled']));
alter table public.payments drop constraint if exists payments_ownership_state_check;
alter table public.payments add constraint payments_ownership_state_check
  check (ownership_state = any (array['editable','admin_review','returned','locked','cancelled']));

-- ── 4 · TIERED WRITE RLS (receipts + payments) ──────────────────────────────
-- Replace the admin-only permissive write policies with an ownership-aware tier.
-- (The auth002 RESTRICTIVE must-change-password guards and anon_block/read policies
-- are left untouched and continue to AND-compose.)
do $$
declare t text;
begin
  foreach t in array array['receipts','payments'] loop
    execute format('drop policy if exists %I_admin_insert on public.%I;', t, t);
    execute format('drop policy if exists %I_admin_update on public.%I;', t, t);
    execute format('drop policy if exists %I_admin_delete on public.%I;', t, t);

    -- INSERT: admin any; accountant only rows stamped as themselves.
    execute format($f$
      create policy %I_finance_insert on public.%I for insert to authenticated
      with check ( public.is_admin()
                   or (public.is_accountant() and created_by_uid = auth.uid()) );
    $f$, t, t);

    -- UPDATE: admin any; accountant only own vouchers in an owner-editable state.
    execute format($f$
      create policy %I_finance_update on public.%I for update to authenticated
      using ( public.is_admin()
              or (public.is_accountant() and created_by_uid = auth.uid()
                  and ownership_state in ('editable','returned')) )
      with check ( public.is_admin()
                   or (public.is_accountant() and created_by_uid = auth.uid()) );
    $f$, t, t);

    -- DELETE (soft-delete/cancel is an UPDATE; hard delete is admin-only).
    execute format('create policy %I_admin_delete on public.%I for delete to authenticated using (public.is_admin());', t, t);
  end loop;
end $$;

-- ── 5 · OWNERSHIP STATE MACHINE + AUTO-TRANSFER TRIGGER ─────────────────────
-- Enforces: (a) non-admins cannot re-stamp ownership or set privileged states;
-- (b) admin editing an accountant's voucher auto-moves it to Administrator Review
--     (locking it for the accountant) unless explicitly Returned — both audited;
-- (c) a soft-delete/cancel sets state 'cancelled'.
create or replace function public.fn_voucher_ownership()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_admin boolean := public.is_admin();
begin
  -- (c) cancel → cancelled
  if new.is_deleted = true and old.is_deleted = false then
    new.ownership_state := 'cancelled';
  end if;

  -- (a) non-admins may not change ownership, nor set privileged states
  if not v_admin then
    if new.created_by_uid is distinct from old.created_by_uid then
      raise exception 'AUTH-003: ownership (created_by_uid) is immutable for non-administrators';
    end if;
    if new.ownership_state not in ('editable','returned') then
      raise exception 'AUTH-003: an accountant cannot set voucher state %', new.ownership_state;
    end if;
  end if;

  -- (b) admin editing someone else's (accountant-owned) voucher
  if v_admin
     and old.created_by_uid is not null
     and old.created_by_uid <> auth.uid()
     and old.ownership_state <> 'cancelled' then
    if new.ownership_state = old.ownership_state then
      new.ownership_state := 'admin_review';       -- auto review-lock
    end if;
    if new.ownership_state is distinct from old.ownership_state then
      insert into public.audit_log
        (action, user_name, actor_user_id, actor_role, table_name, record_id, description, old_data, new_data)
      values (
        case when new.ownership_state = 'returned' then 'return_to_accountant'
             else 'voucher_ownership_transfer' end,
        coalesce((select full_name from public.user_roles where user_id = auth.uid()), auth.uid()::text),
        auth.uid(), 'admin', tg_table_name, old.id,
        format('Voucher %s: ownership %s → %s', old.no, old.ownership_state, new.ownership_state),
        jsonb_build_object('ownership_state', old.ownership_state, 'created_by_uid', old.created_by_uid),
        jsonb_build_object('ownership_state', new.ownership_state)
      );
    end if;
  end if;

  return new;
end $$;

revoke all on function public.fn_voucher_ownership() from public, anon, authenticated;

drop trigger if exists trg_voucher_ownership_receipts on public.receipts;
create trigger trg_voucher_ownership_receipts
  before update on public.receipts
  for each row execute function public.fn_voucher_ownership();

drop trigger if exists trg_voucher_ownership_payments on public.payments;
create trigger trg_voucher_ownership_payments
  before update on public.payments
  for each row execute function public.fn_voucher_ownership();

comment on function public.fn_voucher_ownership() is
  'AUTH-003: voucher ownership state machine — non-admin ownership/state guard, admin auto review-lock + audit, cancel→cancelled.';

-- ── 6 · AUDIT ENRICHMENT ────────────────────────────────────────────────────
-- old_data / new_data (jsonb) already exist. Add the remaining required fields.
alter table public.audit_log add column if not exists actor_user_id uuid;
alter table public.audit_log add column if not exists actor_role text;
alter table public.audit_log add column if not exists ip text;
alter table public.audit_log add column if not exists reason text;

comment on column public.audit_log.actor_user_id is 'AUTH-003: stable id of the acting user.';
comment on column public.audit_log.actor_role  is 'AUTH-003: role of the acting user at action time.';
comment on column public.audit_log.ip          is 'AUTH-003: client IP when available (server-set).';
comment on column public.audit_log.reason      is 'AUTH-003: reason/justification when applicable.';

commit;
