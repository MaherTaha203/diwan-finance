-- P-RECEIPT-ALLOCATION · PR-2 — Atomic Posting Engine · behavioral self-test.
-- Run against a DEV / branch database that has the PR-1 + PR-2 migrations applied
-- (prod is read-only; this script is NOT run against production). It exercises
-- the RPC and ROLLS BACK everything at the end, persisting nothing.
--   psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/pralloc-pr2-atomic-rpc.sql
-- Every check RAISEs on failure; a clean run prints "PR-2 RPC: ALL CHECKS PASSED".

begin;

-- Fixture: one member; open year threshold = 2025 (so 2026/2027 are open).
insert into public.settings(key, value) values ('locked_through_year','2025')
  on conflict (key) do update set value = excluded.value;

do $$
declare
  v_member uuid := gen_random_uuid();
  v_res    jsonb;
  v_no     text := 'TEST-PR2-1';
  v_recs   int;
  v_lines  int;
  v_paidsum numeric;
begin
  insert into public.members(id, name, member_code, is_active, historical_balance_ils, historical_payments_ils)
    values (v_member, 'PR2 Test', 'PR2-TST', true, 400, 0);

  -- ── Test 1: valid post (Σ = amount) ────────────────────────────────────────
  v_res := public.create_receipt_with_settlement(
    jsonb_build_object('no', v_no, 'member_id', v_member, 'fund_type','food',
                       'movement_type','food_contribution', 'receipt_date','2026-06-01',
                       'amount', 900, 'amount_ils', 900, 'currency','ILS', 'exchange_rate',1),
    jsonb_build_array(
      jsonb_build_object('obligation_kind','due','year',2026,'amount_allocated',300),
      jsonb_build_object('obligation_kind','historical','amount_allocated',400),
      jsonb_build_object('obligation_kind','donation','amount_allocated',200)
    ));
  if (v_res->>'ok') <> 'true' then raise exception 'T1 FAILED: rpc did not return ok'; end if;

  select count(*) into v_recs  from public.receipts where no = v_no and not is_deleted;
  select count(*) into v_lines from public.allocation_records where source_ref = (v_res->>'receipt_id') and source_kind='receipt_settlement';
  if v_recs <> 1 then raise exception 'T1 FAILED: expected 1 receipt, got %', v_recs; end if;
  if v_lines <> 3 then raise exception 'T1 FAILED: expected 3 settlement lines, got %', v_lines; end if;

  -- paid_amount_ils must be untouched (this member has no subscription rows → 0)
  select coalesce(sum(paid_amount_ils),0) into v_paidsum from public.member_subscriptions where member_id = v_member;
  if v_paidsum <> 0 then raise exception 'T1 FAILED: paid_amount_ils was written (%).', v_paidsum; end if;
  raise notice 'T1 PASSED: valid post inserted receipt + 3 lines; paid_amount_ils untouched';

  -- ── Test 2: Σ mismatch is rejected ─────────────────────────────────────────
  begin
    perform public.create_receipt_with_settlement(
      jsonb_build_object('no','TEST-PR2-2','member_id',v_member,'fund_type','food',
                         'movement_type','food_contribution','receipt_date','2026-06-01',
                         'amount',900,'amount_ils',900,'currency','ILS','exchange_rate',1),
      jsonb_build_array(jsonb_build_object('obligation_kind','due','year',2026,'amount_allocated',800)));
    raise exception 'T2 FAILED: Σ mismatch was NOT rejected';
  exception when sqlstate 'P0001' then raise notice 'T2 PASSED: Σ mismatch rejected';
  end;

  -- ── Test 3: closed-year due line is rejected ───────────────────────────────
  begin
    perform public.create_receipt_with_settlement(
      jsonb_build_object('no','TEST-PR2-3','member_id',v_member,'fund_type','food',
                         'movement_type','food_contribution','receipt_date','2026-06-01',
                         'amount',200,'amount_ils',200,'currency','ILS','exchange_rate',1),
      jsonb_build_array(jsonb_build_object('obligation_kind','due','year',2025,'amount_allocated',200)));
    raise exception 'T3 FAILED: closed-year line was NOT rejected';
  exception when sqlstate 'P0004' then raise notice 'T3 PASSED: closed-year line rejected';
  end;

  -- ── Test 4: bad obligation_kind is rejected ────────────────────────────────
  begin
    perform public.create_receipt_with_settlement(
      jsonb_build_object('no','TEST-PR2-4','member_id',v_member,'fund_type','food',
                         'movement_type','food_contribution','receipt_date','2026-06-01',
                         'amount',100,'amount_ils',100,'currency','ILS','exchange_rate',1),
      jsonb_build_array(jsonb_build_object('obligation_kind','mystery','amount_allocated',100)));
    raise exception 'T4 FAILED: bad kind was NOT rejected';
  exception when sqlstate 'P0001' then raise notice 'T4 PASSED: bad obligation_kind rejected';
  end;

  -- ── Test 5: ATOMIC rollback — duplicate line aborts the whole post ─────────
  begin
    perform public.create_receipt_with_settlement(
      jsonb_build_object('no','TEST-PR2-5','member_id',v_member,'fund_type','food',
                         'movement_type','food_contribution','receipt_date','2026-06-01',
                         'amount',400,'amount_ils',400,'currency','ILS','exchange_rate',1),
      jsonb_build_array(
        jsonb_build_object('obligation_kind','due','year',2026,'amount_allocated',200),
        jsonb_build_object('obligation_kind','due','year',2026,'amount_allocated',200)  -- duplicate → unique index
      ));
    raise exception 'T5 FAILED: duplicate settlement line was NOT rejected';
  exception when unique_violation then
    -- the receipt insert from step 3 must have rolled back with the failed lines
    if exists (select 1 from public.receipts where no = 'TEST-PR2-5') then
      raise exception 'T5 FAILED: receipt persisted despite line failure (NOT atomic)';
    end if;
    raise notice 'T5 PASSED: duplicate line aborted the entire post (atomic rollback)';
  end;

  raise notice 'PR-2 RPC: ALL CHECKS PASSED';
end $$;

rollback;  -- persist nothing
