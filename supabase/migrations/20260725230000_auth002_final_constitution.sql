-- AUTH-002 · Final Constitution v1.1 — database layer.
-- Implements the frozen decisions that live in Postgres:
--   D4  — RLS refuses financial writes while must_change_password is set (server-enforced,
--         independent of any UI). Reads the app_metadata claim, which the client cannot forge.
--   F-1 — Last-administrator protection: a trigger refuses any UPDATE/DELETE that would leave
--         zero enabled administrators (fires even for service_role — triggers are not bypassed).
--   D5  — revoke_user_sessions(uid): deterministic server-side session revocation used by
--         admin-users on disable / role-change (and available to change-password).
-- Additive only. No existing policy is altered; guards are added as RESTRICTIVE policies
-- (AND-composed with the existing permissive ones) so reads are untouched and writes gain
-- one extra condition. Applied to project ralifvemgapmsgrjgazh.

-- ── D4 · the auth-state predicate ────────────────────────────────────────────
-- TRUE unless the caller's JWT carries app_metadata.must_change_password = true.
-- app_metadata is service-role-only, so a user under the temporary-password lock
-- cannot clear it; every financial mutation is refused until a verified change does.
create or replace function public.auth_state_ok()
  returns boolean language sql stable
  set search_path to 'public'
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb
       -> 'app_metadata' ->> 'must_change_password')::boolean,
    false) is not true;
$$;

comment on function public.auth_state_ok() is
  'AUTH-002 D4: false while the caller must change a temporary password (app_metadata claim). Gated into every financial write as a RESTRICTIVE policy.';

-- Apply the write guard as RESTRICTIVE INSERT/UPDATE/DELETE policies on the core
-- financial + business-state tables. RESTRICTIVE policies are AND-composed with the
-- existing permissive policies, so this only ADDS the must-change condition to writes
-- and never affects SELECT. service_role bypasses RLS entirely (edge functions unaffected).
do $$
declare t text;
begin
  foreach t in array array[
    'receipts','payments','vouchers','voucher_versions','members','annual_dues',
    'member_subscriptions','member_write_offs','refunds','allocation_records',
    'internal_transfers','contacts','attachments','historical_subscription_truth',
    'reservations','fiscal_snapshots','financial_reconciliation_log','settings'
  ]
  loop
    execute format('drop policy if exists auth002_write_guard_ins on public.%I;', t);
    execute format('drop policy if exists auth002_write_guard_upd on public.%I;', t);
    execute format('drop policy if exists auth002_write_guard_del on public.%I;', t);
    execute format('create policy auth002_write_guard_ins on public.%I as restrictive for insert to authenticated with check (public.auth_state_ok());', t);
    execute format('create policy auth002_write_guard_upd on public.%I as restrictive for update to authenticated using (public.auth_state_ok()) with check (public.auth_state_ok());', t);
    execute format('create policy auth002_write_guard_del on public.%I as restrictive for delete to authenticated using (public.auth_state_ok());', t);
  end loop;
end $$;

-- ── F-1 · last-administrator protection ──────────────────────────────────────
-- Authority must never reach zero. Refuse any operation that would remove, disable,
-- or demote the last enabled administrator. Runs for every writer, service_role
-- included (triggers are not bypassed by RLS), so it is the true backstop behind
-- the edge-function check.
create or replace function public.fn_last_admin_guard()
  returns trigger language plpgsql security definer
  set search_path to 'public'
as $$
declare remaining int;
begin
  if (tg_op = 'DELETE') then
    if old.role = 'admin' and old.is_disabled = false then
      select count(*) into remaining from public.user_roles
        where role = 'admin' and is_disabled = false and user_id <> old.user_id;
      if remaining = 0 then
        raise exception 'AUTH-002 F-1: cannot remove the last enabled administrator';
      end if;
    end if;
    return old;
  end if;
  -- UPDATE: block demotion or disable of the last enabled admin.
  if old.role = 'admin' and old.is_disabled = false
     and (new.role <> 'admin' or new.is_disabled = true) then
    select count(*) into remaining from public.user_roles
      where role = 'admin' and is_disabled = false and user_id <> old.user_id;
    if remaining = 0 then
      raise exception 'AUTH-002 F-1: cannot demote or disable the last enabled administrator';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_last_admin_guard on public.user_roles;
create trigger trg_last_admin_guard
  before update or delete on public.user_roles
  for each row execute function public.fn_last_admin_guard();

comment on function public.fn_last_admin_guard() is
  'AUTH-002 F-1: refuses any UPDATE/DELETE that would leave zero enabled administrators. Enforced for all writers including service_role.';

-- ── D5 · deterministic server-side session revocation ────────────────────────
-- Deletes a user's GoTrue sessions (refresh tokens cascade), invalidating every
-- device once the current access token expires. Called by admin-users on disable
-- and role-change. SECURITY DEFINER so it can reach the auth schema; execute is
-- restricted to service_role (edge functions only).
create or replace function public.revoke_user_sessions(uid uuid)
  returns void language plpgsql security definer
  set search_path to 'auth', 'public'
as $$
begin
  delete from auth.sessions where user_id = uid;
end $$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

comment on function public.revoke_user_sessions(uuid) is
  'AUTH-002 D5: revoke all of a user''s sessions (refresh tokens cascade). service_role only.';
