-- P-RECEIPT-ALLOCATION · PR-2 — Atomic Posting Engine (RPC body).
-- Implements create_receipt_with_settlement: ONE atomic transaction that inserts
-- the receipt AND its settlement lines, enforcing Σ(lines)=amount server-side.
-- It NEVER writes paid_amount_ils and NEVER touches member_subscriptions.
--
-- STILL DORMANT: the function remains REVOKED from anon/authenticated (no client
-- can call it), the feature flag stays OFF, and no UI/runtime path is wired to
-- it. This PR ships and verifies the engine only. Golden Reference unchanged:
-- nothing calls this function, so no balance/treasury/ledger/report moves.
--
-- Atomicity: a plpgsql function executes in a single transaction context — any
-- RAISE aborts and rolls back every insert it made (all-or-nothing). Mirrors the
-- proven create_member_atomic pattern (jsonb_populate_record + row insert).

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
  -- 0) Receipt basics
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

  -- fiscal lock threshold (same default as the client / trg_closed_period)
  select coalesce(nullif(trim(value), '')::int, extract(year from now())::int - 1)
    into v_locked from public.settings where key = 'locked_through_year';
  if v_locked is null then v_locked := extract(year from now())::int - 1; end if;

  -- 1) Validate every line + accumulate the sum (no write yet)
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

  -- 2) THE INVARIANT — Σ lines must equal the receipt amount, exactly
  if round(v_sum, 2) <> v_amount then
    raise exception 'settlement_sum_mismatch'
      using detail = format('Σ lines %s <> receipt amount %s', round(v_sum,2), v_amount), errcode = 'P0001';
  end if;

  -- 3) Insert the receipt (marked explicitly settled). paid_amount_ils NOT touched.
  v_rec.id              := coalesce(v_rec.id, gen_random_uuid());
  v_rec.manual_allocation := true;
  v_rec.is_deleted      := coalesce(v_rec.is_deleted, false);
  v_rec.version         := coalesce(v_rec.version, 1);
  v_rec.created_at      := coalesce(v_rec.created_at, now());
  insert into public.receipts values (v_rec.*);

  -- 4) Insert settlement lines (source_kind='receipt_settlement'; immutable audit)
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

-- Keep it DORMANT: no client role may call it until the write-activation PR grants execute.
revoke all on function public.create_receipt_with_settlement(jsonb, jsonb) from public, anon, authenticated;

comment on function public.create_receipt_with_settlement(jsonb, jsonb) is
  'P-RECEIPT-ALLOCATION PR-2: atomic settlement-posting engine. One transaction: receipt + settlement lines; enforces Σ lines = amount; never writes paid_amount_ils; rejects closed-year due lines. REVOKED from client roles (dormant) until the write-activation PR.';
