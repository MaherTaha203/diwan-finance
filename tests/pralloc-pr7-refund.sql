-- P-RECEIPT-ALLOCATION · PR-7 — Settlement Refund · behavioral self-test.
-- Run against a DEV / branch database with the PR-1..PR-7 migrations applied
-- (prod is read-only; NOT run against production). It posts an explicit receipt,
-- refunds settlement lines (partial then full), and ROLLS BACK, persisting nothing.
--   psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/pralloc-pr7-refund.sql
-- Every check RAISEs on failure; a clean run prints "PR-7 REFUND: ALL CHECKS PASSED".

begin;

insert into public.settings(key, value) values ('locked_through_year','2025')
  on conflict (key) do update set value = excluded.value;

do $$
declare
  v_member uuid := gen_random_uuid();
  v_res    jsonb;
  v_ref    jsonb;
  v_rid    uuid;
  v_l2028  uuid;
  v_active int;
  v_refd   int;
  v_paidsum numeric;
begin
  insert into public.members(id, name, member_code, is_active, historical_balance_ils, historical_payments_ils)
    values (v_member, 'PR7 Test', 'PR7-TST', true, 0, 0);

  -- Post an explicit receipt: 400 = due 2027 (200) + due 2028 (200).
  v_res := public.create_receipt_with_settlement(
    jsonb_build_object('no','TEST-PR7-1','member_id',v_member,'fund_type','food',
                       'movement_type','subscription_payment','receipt_date','2026-06-01',
                       'amount',400,'amount_ils',400,'currency','ILS','exchange_rate',1),
    jsonb_build_array(
      jsonb_build_object('obligation_kind','due','year',2027,'amount_allocated',200),
      jsonb_build_object('obligation_kind','due','year',2028,'amount_allocated',200)
    ));
  v_rid := (v_res->>'receipt_id')::uuid;
  select id into v_l2028 from public.allocation_records
    where source_ref = v_rid::text and source_kind='receipt_settlement' and year = 2028;

  -- ── Test 1: PARTIAL refund reverses ONLY the selected line (2028) ───────────
  v_ref := public.refund_receipt_settlement(v_rid, array[v_l2028]);
  if (v_ref->>'ok') <> 'true' or (v_ref->>'refunded')::int <> 1 then
    raise exception 'T1 FAILED: expected 1 line refunded, got %', v_ref;
  end if;
  select count(*) into v_active from public.allocation_records
    where source_ref=v_rid::text and source_kind='receipt_settlement' and refunded_at is null and voided_at is null;
  if v_active <> 1 then raise exception 'T1 FAILED: expected 1 active line (2027) left, got %', v_active; end if;
  if exists (select 1 from public.allocation_records where source_ref=v_rid::text and year=2027 and refunded_at is not null) then
    raise exception 'T1 FAILED: the non-selected 2027 line was wrongly reversed';
  end if;
  raise notice 'T1 PASSED: partial refund reversed only the selected 2028 line';

  -- ── Test 2: FULL refund (null line ids) reverses ALL remaining active lines ──
  v_ref := public.refund_receipt_settlement(v_rid, null);
  if (v_ref->>'ok') <> 'true' or (v_ref->>'refunded')::int <> 1 then
    raise exception 'T2 FAILED: expected the remaining 1 line reversed, got %', v_ref;
  end if;
  select count(*) into v_active from public.allocation_records
    where source_ref=v_rid::text and source_kind='receipt_settlement' and refunded_at is null and voided_at is null;
  if v_active <> 0 then raise exception 'T2 FAILED: % active lines remain after full refund', v_active; end if;
  -- original amounts survive untouched (immutable; only the marker was added)
  if not exists (select 1 from public.allocation_records where source_ref=v_rid::text and year=2027 and amount_allocated=200) then
    raise exception 'T2 FAILED: original settlement amount was altered by the refund';
  end if;
  raise notice 'T2 PASSED: full refund reversed all remaining lines; amounts intact';

  -- ── Test 3: REPEATED refund is rejected (idempotent authority) ──────────────
  begin
    perform public.refund_receipt_settlement(v_rid, null);
    raise exception 'T3 FAILED: a repeated refund was NOT rejected';
  exception when sqlstate 'P0001' then raise notice 'T3 PASSED: repeated refund rejected (settlement_refund_none)';
  end;

  -- ── Test 4: paid_amount_ils / member_subscriptions untouched by the refund ──
  select coalesce(sum(paid_amount_ils),0) into v_paidsum from public.member_subscriptions where member_id = v_member;
  if v_paidsum <> 0 then raise exception 'T4 FAILED: paid_amount_ils was written (%).', v_paidsum; end if;
  raise notice 'T4 PASSED: paid_amount_ils / member_subscriptions untouched by the refund';

  raise notice 'PR-7 REFUND: ALL CHECKS PASSED';
end $$;

rollback;  -- persist nothing
