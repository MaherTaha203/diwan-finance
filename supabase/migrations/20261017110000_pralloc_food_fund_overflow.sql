-- P-RECEIPT-ALLOCATION · Food overflow attribution.
-- Additive only: allows a settlement line to identify the part of a specifically
-- historical-deficit receipt that remains in the current food fund. The guarded
-- posting function keeps the existing role check, atomicity, sum invariant, numbering,
-- and explicit-column insert. No rows are rewritten and no migration is applied here.

create or replace function public.create_receipt_with_settlement(
  p_receipt jsonb default '{}'::jsonb,
  p_lines   jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rec     public.receipts;
  v_amount  numeric;
  v_sum     numeric := 0;
  v_locked  int;
  v_count   int := 0;
  v_line    jsonb;
  v_kind    text;
  v_year    int;
  v_lamt    numeric;
  v_has_food boolean := false;
  v_has_historical boolean := false;
begin
  -- Authorization only: no financial logic or data transformation changed.
  if auth.uid() is null or not public.is_finance_writer() then
    raise exception 'settlement_forbidden'
      using detail = 'An enabled admin or accountant account is required',
            errcode = '42501';
  end if;

  v_rec := jsonb_populate_record(NULL::public.receipts, p_receipt);
  v_amount := round(coalesce(v_rec.amount_ils, 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'settlement_bad_amount' using detail = 'amount_ils must be > 0 (FD-021)', errcode = 'P0001';
  end if;
  if v_rec.member_id is null then
    raise exception 'settlement_no_member' using detail = 'member_id is required for explicit settlement', errcode = 'P0001';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'settlement_no_lines' using detail = 'at least one settlement line is required', errcode = 'P0001';
  end if;

  select coalesce(nullif(trim(value), '')::int, extract(year from now())::int - 1)
    into v_locked from public.settings where key = 'locked_through_year';
  if v_locked is null then v_locked := extract(year from now())::int - 1; end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_kind := v_line ->> 'obligation_kind';
    v_lamt := round(coalesce((v_line ->> 'amount_allocated')::numeric, 0), 2);
    v_year := nullif(v_line ->> 'year', '')::int;

    if v_kind is null or v_kind not in ('due','historical','donation','credit','food') then
      raise exception 'settlement_bad_kind' using detail = format('obligation_kind must be due|historical|donation|credit|food (got %L)', v_kind), errcode = 'P0001';
    end if;
    if v_lamt <= 0 then
      raise exception 'settlement_bad_line_amount' using detail = 'each line amount_allocated must be > 0', errcode = 'P0001';
    end if;
    if v_kind = 'due' then
      if v_year is null then
        raise exception 'settlement_due_needs_year' using detail = 'a due line requires a year', errcode = 'P0001';
      end if;
      if v_year < v_locked then
        raise exception 'settlement_closed_year' using detail = format('year %s is before the first ERP year (locked through %s)', v_year, v_locked), errcode = 'P0004';
      end if;
    else
      if v_year is not null then
        raise exception 'settlement_year_not_allowed' using detail = format('%s lines carry no year', v_kind), errcode = 'P0001';
      end if;
    end if;
    if v_kind = 'food' then v_has_food := true; end if;
    if v_kind = 'historical' then v_has_historical := true; end if;
    v_sum := v_sum + v_lamt;
  end loop;

  if v_has_food and v_rec.fund_type is distinct from 'food' then
    raise exception 'settlement_food_requires_food_fund'
      using detail = 'food allocation lines are only valid for receipts assigned to the food fund', errcode = 'P0001';
  end if;
  if v_has_food and not v_has_historical then
    raise exception 'settlement_food_requires_historical_line'
      using detail = 'food overflow must accompany a historical-deficit allocation', errcode = 'P0001';
  end if;

  if round(v_sum, 2) <> v_amount then
    raise exception 'settlement_sum_mismatch'
      using detail = format('Σ lines %s <> receipt amount %s', round(v_sum,2), v_amount), errcode = 'P0001';
  end if;

  v_rec.id              := coalesce(v_rec.id, gen_random_uuid());
  if v_rec.no is null then
    v_rec.no := public.next_voucher_no('REC', 'public.receipts');
  end if;
  v_rec.manual_allocation := true;
  v_rec.is_deleted      := coalesce(v_rec.is_deleted, false);
  v_rec.version         := coalesce(v_rec.version, 1);
  v_rec.created_at      := coalesce(v_rec.created_at, now());

  insert into public.receipts
    (id, no, fund_type, receipt_date, payer_type, member_id, payer_name,
     amount, currency, amount_ils, exchange_rate, payment_method, notes,
     movement_type, destination_treasury, is_deleted, version, manual_allocation, created_at)
  values
    (v_rec.id, v_rec.no, v_rec.fund_type, v_rec.receipt_date, v_rec.payer_type, v_rec.member_id, v_rec.payer_name,
     v_rec.amount, v_rec.currency, v_rec.amount_ils, v_rec.exchange_rate, v_rec.payment_method, v_rec.notes,
     v_rec.movement_type, v_rec.destination_treasury, v_rec.is_deleted, v_rec.version, v_rec.manual_allocation, v_rec.created_at);

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.allocation_records
      (source_ref, source_kind, member_id, obligation_kind, obligation_id, year, amount_allocated, notes, allocated_at, immutable)
    values (
      v_rec.id::text, 'receipt_settlement', v_rec.member_id,
      v_line ->> 'obligation_kind',
      v_line ->> 'obligation_id',
      nullif(v_line ->> 'year','')::int,
      round((v_line ->> 'amount_allocated')::numeric, 2),
      v_line ->> 'notes',
      now(), true
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'receipt_id', v_rec.id, 'no', v_rec.no, 'lines', v_count);
end;
$function$;

comment on function public.create_receipt_with_settlement(jsonb, jsonb) is
  'Adds food allocation lines for explicit historical-deficit receipt overflow. Preserves finance-role authorization, atomic receipt/line writes, sum invariant, and existing cancellation/refund semantics.';
