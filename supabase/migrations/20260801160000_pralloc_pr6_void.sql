-- P-RECEIPT-ALLOCATION · PR-6 — Settlement Cancellation (void authority).
-- When a receipt posted WITH explicit settlement lines is cancelled, its
-- settlement lines must become VOID — reversing exactly what was recorded, using
-- the SAME server-side authority class that created them (a SECURITY DEFINER RPC;
-- direct client writes of settlement rows are forbidden by the PR-4 RLS fence).
-- No guessing, no redistribution, no recalculation: voiding stamps a marker and
-- touches nothing else.
--
-- THERE IS EXACTLY ONE AUTHORITY THAT VOIDS SETTLEMENT LINES:
--   public.void_receipt_settlement(uuid). It is the only code path that writes
--   allocation_records.voided_at. Being SECURITY DEFINER it is the only writer
--   able to update source_kind='receipt_settlement' rows at all (RLS blocks
--   clients). No report, FIN reader, helper, or workspace can void.
--
-- Additive & scoped: adds a nullable column and one RPC. Nothing existing is
-- altered — the original settlement lines keep their amount/obligation/year; the
-- original receipt and its cancellation snapshot remain immutable. paid_amount_ils
-- and member_subscriptions are NOT touched anywhere. With the client feature flag
-- OFF (default) no runtime path calls this RPC ⇒ behaviour is byte-identical.

-- 1) Additive column: the void marker (nullable; NULL = active line).
alter table public.allocation_records
  add column if not exists voided_at timestamptz;

comment on column public.allocation_records.voided_at is
  'P-RECEIPT-ALLOCATION PR-6: when a settlement line was voided by a receipt cancellation (NULL = active). Written ONLY by void_receipt_settlement (the single void authority).';

-- 2) The single void authority — SECURITY DEFINER RPC.
--    Marks every ACTIVE settlement line of one receipt as void, atomically. It
--    NEVER deletes a row, NEVER changes amount/obligation/year, and NEVER writes
--    paid_amount_ils or member_subscriptions. Idempotent by construction: the
--    `voided_at is null` predicate means a second call finds 0 active lines and
--    raises — so repeated cancellation is rejected here too (the client cancel
--    path already rejects an already-cancelled receipt before reaching this).
create or replace function public.void_receipt_settlement(
  p_receipt_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count int := 0;
begin
  if p_receipt_id is null then
    raise exception 'settlement_void_no_receipt' using detail = 'p_receipt_id is required', errcode = 'P0001';
  end if;

  update public.allocation_records
     set voided_at = now()
   where source_ref = p_receipt_id::text
     and source_kind = 'receipt_settlement'
     and voided_at is null;
  get diagnostics v_count = row_count;

  -- No active settlement lines: either this receipt was not posted with explicit
  -- settlement, or it was already voided (repeated cancellation). Reject.
  if v_count = 0 then
    raise exception 'settlement_void_none'
      using detail = format('no active settlement lines for receipt %s (not an explicit settlement, or already voided)', p_receipt_id),
            errcode = 'P0001';
  end if;

  return jsonb_build_object('ok', true, 'receipt_id', p_receipt_id, 'voided', v_count);
end;
$$;

-- Only authenticated callers may reach the void authority (SECURITY DEFINER runs
-- as the owner and bypasses RLS to stamp the marker); anon/public stay blocked.
revoke all on function public.void_receipt_settlement(uuid) from public, anon, authenticated;
grant execute on function public.void_receipt_settlement(uuid) to authenticated;

comment on function public.void_receipt_settlement(uuid) is
  'P-RECEIPT-ALLOCATION PR-6: THE single authority that voids settlement lines. Stamps voided_at on every active source_kind=receipt_settlement line of one receipt; raises settlement_void_none if there are none (idempotent / repeated-cancel rejected). Never deletes, never changes amount/obligation/year, never writes paid_amount_ils or member_subscriptions.';
