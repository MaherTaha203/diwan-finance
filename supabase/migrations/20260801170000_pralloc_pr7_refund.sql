-- P-RECEIPT-ALLOCATION · PR-7 — Settlement Refund (refund-reversal authority).
-- A refund reverses EXACTLY the settlement lines being refunded — allocation-aware,
-- no guessing, no redistribution, no reconstruction. A partial refund reverses only
-- the SELECTED settlement lines; a full refund reverses all of them. The refund
-- authority reads and writes ONLY settlement lines: it never inspects FD-002, never
-- inspects paid_amount_ils, never rebuilds allocation.
--
-- THERE IS EXACTLY ONE AUTHORITY THAT REVERSES SETTLEMENT LINES FOR REFUNDS:
--   public.refund_receipt_settlement(uuid, uuid[]). It is the only code path that
--   writes allocation_records.refunded_at. Being SECURITY DEFINER it is the only
--   writer able to update source_kind='receipt_settlement' rows at all (the PR-4
--   RLS fence blocks clients). No report, FIN reader, helper, or workspace can
--   reverse a settlement line for a refund.
--
-- Additive & scoped: adds a nullable column and one RPC. Nothing existing is
-- altered — the settlement lines keep their amount/obligation/year; the original
-- receipt and its refund voucher remain immutable. paid_amount_ils and
-- member_subscriptions are NOT touched anywhere. With the client feature flag OFF
-- (default) no runtime path calls this RPC ⇒ behaviour is byte-identical. Legacy
-- refunds (BO-11, refunds table) are untouched.

-- 1) Additive column: the refund-reversal marker (nullable; NULL = active line).
alter table public.allocation_records
  add column if not exists refunded_at timestamptz;

comment on column public.allocation_records.refunded_at is
  'P-RECEIPT-ALLOCATION PR-7: when a settlement line was reversed by a refund (NULL = active). Written ONLY by refund_receipt_settlement (the single refund-reversal authority).';

-- 2) The single refund-reversal authority — SECURITY DEFINER RPC.
--    Marks the SELECTED active settlement lines of one receipt as refunded. When
--    p_line_ids is NULL/empty it reverses ALL active lines (full refund); otherwise
--    only the listed line ids (partial refund) — exactly the lines being refunded,
--    no guessing. It NEVER deletes a row, NEVER changes amount/obligation/year, and
--    NEVER writes paid_amount_ils / member_subscriptions. It refuses to touch a line
--    already voided (cancelled receipt) or already refunded. Idempotent by
--    construction: the `refunded_at is null` predicate means a second reversal of the
--    same lines finds nothing and raises — repeated refund is rejected here too.
create or replace function public.refund_receipt_settlement(
  p_receipt_id uuid,
  p_line_ids   uuid[] default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count int := 0;
begin
  if p_receipt_id is null then
    raise exception 'settlement_refund_no_receipt' using detail = 'p_receipt_id is required', errcode = 'P0001';
  end if;

  update public.allocation_records
     set refunded_at = now()
   where source_ref = p_receipt_id::text
     and source_kind = 'receipt_settlement'
     and refunded_at is null
     and voided_at is null
     and (p_line_ids is null or array_length(p_line_ids, 1) is null or id = any (p_line_ids));
  get diagnostics v_count = row_count;

  -- No active settlement lines matched: not an explicit settlement, the selected
  -- lines were already refunded/voided, or the ids don't belong to this receipt.
  if v_count = 0 then
    raise exception 'settlement_refund_none'
      using detail = format('no active settlement lines to refund for receipt %s (already refunded/voided, or none selected match)', p_receipt_id),
            errcode = 'P0001';
  end if;

  return jsonb_build_object('ok', true, 'receipt_id', p_receipt_id, 'refunded', v_count);
end;
$$;

-- Only authenticated callers may reach the refund-reversal authority (SECURITY
-- DEFINER runs as the owner and bypasses RLS to stamp the marker); anon/public stay blocked.
revoke all on function public.refund_receipt_settlement(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.refund_receipt_settlement(uuid, uuid[]) to authenticated;

comment on function public.refund_receipt_settlement(uuid, uuid[]) is
  'P-RECEIPT-ALLOCATION PR-7: THE single authority that reverses settlement lines for refunds. Stamps refunded_at on the selected active source_kind=receipt_settlement lines of one receipt (NULL/empty p_line_ids = full refund = all active lines; a list = partial = only those lines); raises settlement_refund_none if none match (idempotent / repeated-refund rejected). Never deletes, never changes amount/obligation/year, never touches voided lines, never writes paid_amount_ils or member_subscriptions.';
