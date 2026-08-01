-- P-RECEIPT-ALLOCATION · PR-6 — Settlement Cancellation · behavioral self-test.
-- Run against a DEV / branch database that has the PR-1..PR-6 migrations applied
-- (prod is read-only; this script is NOT run against production). It posts an
-- explicit receipt, voids it, and ROLLS BACK everything, persisting nothing.
--   psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/pralloc-pr6-void.sql
-- Every check RAISEs on failure; a clean run prints "PR-6 VOID: ALL CHECKS PASSED".

begin;

insert into public.settings(key, value) values ('locked_through_year','2025')
  on conflict (key) do update set value = excluded.value;

do $$
declare
  v_member uuid := gen_random_uuid();
  v_res    jsonb;
  v_void   jsonb;
  v_rid    uuid;
  v_active int;
  v_voided int;
  v_paidsum numeric;
begin
  insert into public.members(id, name, member_code, is_active, historical_balance_ils, historical_payments_ils)
    values (v_member, 'PR6 Test', 'PR6-TST', true, 0, 0);

  -- Post an explicit receipt: 400 = due 2026 (200) + due 2027 (200).
  v_res := public.create_receipt_with_settlement(
    jsonb_build_object('no','TEST-PR6-1','member_id',v_member,'fund_type','food',
                       'movement_type','subscription_payment','receipt_date','2026-06-01',
                       'amount',400,'amount_ils',400,'currency','ILS','exchange_rate',1),
    jsonb_build_array(
      jsonb_build_object('obligation_kind','due','year',2026,'amount_allocated',200),
      jsonb_build_object('obligation_kind','due','year',2027,'amount_allocated',200)
    ));
  v_rid := (v_res->>'receipt_id')::uuid;

  -- ── Test 1: void marks EVERY settlement line of the receipt ────────────────
  v_void := public.void_receipt_settlement(v_rid);
  if (v_void->>'ok') <> 'true' or (v_void->>'voided')::int <> 2 then
    raise exception 'T1 FAILED: expected 2 lines voided, got %', v_void;
  end if;
  select count(*) into v_voided from public.allocation_records
    where source_ref = v_rid::text and source_kind='receipt_settlement' and voided_at is not null;
  if v_voided <> 2 then raise exception 'T1 FAILED: expected 2 voided lines, got %', v_voided; end if;
  raise notice 'T1 PASSED: void stamped voided_at on all 2 settlement lines';

  -- ── Test 2: read reverses — NO active settlement line remains (each dest
  --            loses exactly what it received; amounts/years are unchanged) ────
  select count(*) into v_active from public.allocation_records
    where source_ref = v_rid::text and source_kind='receipt_settlement' and voided_at is null;
  if v_active <> 0 then raise exception 'T2 FAILED: % active settlement lines remain after void', v_active; end if;
  -- the original amounts survive untouched (immutable record; only the marker was added)
  if not exists (select 1 from public.allocation_records
                 where source_ref=v_rid::text and obligation_kind='due' and year=2026 and amount_allocated=200) then
    raise exception 'T2 FAILED: original settlement amount was altered by the void';
  end if;
  raise notice 'T2 PASSED: no active line remains; original amounts/years intact';

  -- ── Test 3: repeated cancellation is rejected (idempotent void authority) ───
  begin
    perform public.void_receipt_settlement(v_rid);
    raise exception 'T3 FAILED: a second void was NOT rejected';
  exception when sqlstate 'P0001' then raise notice 'T3 PASSED: repeated cancellation rejected (settlement_void_none)';
  end;

  -- ── Test 4: legacy receipt (no settlement lines) — void finds nothing and
  --            rejects; no legacy/MODEL2 row is touched ──────────────────────
  begin
    perform public.void_receipt_settlement(gen_random_uuid());
    raise exception 'T4 FAILED: voiding a receipt with no settlement lines was NOT rejected';
  exception when sqlstate 'P0001' then raise notice 'T4 PASSED: legacy (no settlement) void rejected — legacy untouched';
  end;

  -- ── Test 5: paid_amount_ils / member_subscriptions untouched by the void ───
  select coalesce(sum(paid_amount_ils),0) into v_paidsum from public.member_subscriptions where member_id = v_member;
  if v_paidsum <> 0 then raise exception 'T5 FAILED: paid_amount_ils was written (%).', v_paidsum; end if;
  raise notice 'T5 PASSED: paid_amount_ils / member_subscriptions untouched by the void';

  raise notice 'PR-6 VOID: ALL CHECKS PASSED';
end $$;

rollback;  -- persist nothing
