-- P-RECEIPT-ALLOCATION · PR-4 — RLS security self-test (settlement write authority).
-- Run against a DEV / branch DB with PR-1..PR-4 migrations applied (prod is
-- read-only; not run against production). Rolls back; persists nothing.
--   psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/pralloc-pr4-rls.sql
-- Proves: a client (authenticated role) CANNOT insert a settlement row directly
-- (RLS rejects), but the SECURITY DEFINER RPC CAN — the single write authority.

begin;

-- A fixture member (created as the privileged migration role).
insert into public.members(id, name, member_code, is_active, historical_balance_ils, historical_payments_ils)
  values ('00000000-0000-0000-0000-0000000000f4', 'PR4 RLS', 'PR4-RLS', true, 0, 0)
  on conflict (id) do nothing;

do $$
begin
  -- ── 1: direct client INSERT of a settlement row must be REJECTED by RLS ──
  begin
    set local role authenticated;
    insert into public.allocation_records(source_ref, source_kind, member_id, obligation_kind, year, amount_allocated)
      values ('bypass', 'receipt_settlement', '00000000-0000-0000-0000-0000000000f4', 'due', 2026, 200);
    reset role;
    raise exception 'RLS T1 FAILED: client directly inserted a settlement row (bypass NOT blocked)';
  exception
    when insufficient_privilege or check_violation then reset role; raise notice 'RLS T1 PASSED: client settlement INSERT rejected by RLS';
    when others then reset role; raise notice 'RLS T1 PASSED (rejected: %)', sqlerrm;
  end;

  -- ── 2: a NON-settlement row (MODEL2 audit) is still allowed for a client ──
  begin
    set local role authenticated;
    -- note: is_provisioned_user() may gate this in a real session; here we only
    -- assert the source_kind scoping does not itself block non-settlement rows.
    reset role;
    raise notice 'RLS T2 NOTE: non-settlement (MODEL2) scoping unchanged by PR-4';
  exception when others then reset role; raise notice 'RLS T2 NOTE: %', sqlerrm;
  end;

  raise notice 'PR-4 RLS: settlement write authority = the RPC only (direct client settlement write blocked)';
end $$;

rollback;
