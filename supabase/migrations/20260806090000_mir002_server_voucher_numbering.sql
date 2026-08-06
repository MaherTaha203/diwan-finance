-- MIR-002 · Server Numbering Authority (Settlement path only)
-- Architectural Direction: the server becomes the sole numbering authority for all
-- voucher types. THIS migration introduces the shared authority and wires ONLY the
-- Settlement RPC (create_receipt_with_settlement) as its first consumer. The other
-- voucher types (PAY/RFND/WO/CWO/TRN) migrate later via MIR-014..MIR-018 and are NOT
-- touched here. No business rule, workflow, UI, validation, RLS, editor, allocation,
-- or financial logic is changed. With the feature flag OFF the RPC is never called,
-- so runtime behaviour is byte-identical (Golden Reference preserved).

-- 1) THE shared server numbering authority — generic, reusable, prefix-based.
--    Transaction-safe + concurrency-safe: a per-prefix advisory XACT lock serialises
--    concurrent allocations within the calling transaction; the number is MAX(suffix)+1
--    read from the live target table, so it coexists correctly with the legacy client
--    numbering during the migration window (the UNIQUE(no) constraints remain the final
--    backstop). Format: PREFIX-##### (5-digit zero-pad), matching existing identifiers.
--    Internal helper: callable only by SECURITY DEFINER writers (revoked from clients).
create or replace function public.next_voucher_no(
  p_prefix text,
  p_table  regclass,
  p_col    text default 'no'
) returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_max int;
  v_sql text;
begin
  if p_prefix is null or btrim(p_prefix) = '' then
    raise exception 'voucher_no_bad_prefix' using detail = 'prefix is required', errcode = 'P0001';
  end if;
  -- serialise allocation for this prefix until the calling transaction ends
  perform pg_advisory_xact_lock(hashtext('voucher_no:' || p_prefix));
  v_sql := format(
    'select coalesce(max((substring(%I from %L))::int), 0) from %s where %I like %L',
    p_col, '[0-9]+$', p_table, p_col, p_prefix || '-%'
  );
  execute v_sql into v_max;
  return p_prefix || '-' || lpad((coalesce(v_max, 0) + 1)::text, 5, '0');
end;
$$;

revoke all on function public.next_voucher_no(text, regclass, text) from public, anon, authenticated;

comment on function public.next_voucher_no(text, regclass, text) is
  'MIR-002: shared server voucher-numbering authority. Generic/reusable/prefix-based; advisory-xact-lock + MAX(suffix)+1 over the target table (transaction- & concurrency-safe; coexists with legacy client numbering, guarded by UNIQUE(no)). Internal use by SECURITY DEFINER writers only (revoked from client roles).';

-- 2) Wire the Settlement RPC as the FIRST (and only, for now) consumer.
--    Identical to pralloc_pr2 EXCEPT: allocate receipts.no server-side via
--    next_voucher_no('REC', 'public.receipts') when the caller did not supply one.
create or replace function public.create_receipt_with_settlement(
  p_receipt jsonb default '{}'::jsonb,
  p_lines   jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
begin
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

    if v_kind is null or v_kind not in ('due','historical','donation','credit') then
      raise exception 'settlement_bad_kind' using detail = format('obligation_kind must be due|historical|donation|credit (got %L)', v_kind), errcode = 'P0001';
    end if;
    if v_lamt <= 0 then
      raise exception 'settlement_bad_line_amount' using detail = 'each line amount_allocated must be > 0', errcode = 'P0001';
    end if;
    if v_kind = 'due' then
      if v_year is null then
        raise exception 'settlement_due_needs_year' using detail = 'a due line requires a year', errcode = 'P0001';
      end if;
      if v_year <= v_locked then
        raise exception 'settlement_closed_year' using detail = format('year %s is closed (locked through %s)', v_year, v_locked), errcode = 'P0004';
      end if;
    else
      if v_year is not null then
        raise exception 'settlement_year_not_allowed' using detail = format('%s lines carry no year', v_kind), errcode = 'P0001';
      end if;
    end if;
    v_sum := v_sum + v_lamt;
  end loop;

  if round(v_sum, 2) <> v_amount then
    raise exception 'settlement_sum_mismatch'
      using detail = format('Σ lines %s <> receipt amount %s', round(v_sum,2), v_amount), errcode = 'P0001';
  end if;

  v_rec.id              := coalesce(v_rec.id, gen_random_uuid());
  -- MIR-002: server is the numbering authority for the settlement receipt.
  if v_rec.no is null then
    v_rec.no := public.next_voucher_no('REC', 'public.receipts');
  end if;
  v_rec.manual_allocation := true;
  v_rec.is_deleted      := coalesce(v_rec.is_deleted, false);
  v_rec.version         := coalesce(v_rec.version, 1);
  v_rec.created_at      := coalesce(v_rec.created_at, now());
  insert into public.receipts values (v_rec.*);

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
$$;

comment on function public.create_receipt_with_settlement(jsonb, jsonb) is
  'P-RECEIPT-ALLOCATION PR-2 + MIR-002: atomic settlement-posting engine. One transaction: receipt + settlement lines; enforces Σ lines = amount; rejects closed-year due lines; never writes paid_amount_ils. MIR-002: allocates receipts.no server-side via next_voucher_no(''REC'',''public.receipts'') when not supplied. Granted to authenticated (activation, PR-4).';
