-- P-RECEIPT-ALLOCATION · PR-4 — Settlement write authority (RLS) + RPC activation.
-- Implements the deferred PR-0A security fence: the atomic RPC becomes the ONLY
-- writer of settlement rows (source_kind = 'receipt_settlement'); direct client
-- writes of settlement rows are rejected by RLS. Scoped by source_kind so the
-- dormant MODEL2 audit recorder (source_kind 'allocation'/'credit_consumption')
-- is UNAFFECTED — its client-side best-effort inserts keep working exactly as
-- today, and non-settlement admin update/delete is unchanged.
--
-- The RPC is SECURITY DEFINER (runs as the function owner) and therefore bypasses
-- RLS to write settlement rows; the client can only reach settlement writes
-- THROUGH the RPC. paid_amount_ils is not touched anywhere. No existing data is
-- altered. With the client feature flag OFF (default) nothing calls the RPC, so
-- runtime behaviour is byte-identical.

-- 1) INSERT: clients may NOT insert settlement rows (only the definer RPC may).
--    Non-settlement rows (MODEL2 audit) remain insertable exactly as before.
drop policy if exists allocation_records_insert on public.allocation_records;
create policy allocation_records_insert on public.allocation_records
  for insert to authenticated
  with check (is_provisioned_user() and coalesce(source_kind, '') <> 'receipt_settlement');

-- 2) UPDATE: settlement rows are immutable to clients; non-settlement unchanged (admin).
drop policy if exists allocation_records_update on public.allocation_records;
create policy allocation_records_update on public.allocation_records
  for update to authenticated
  using (is_admin() and coalesce(source_kind, '') <> 'receipt_settlement')
  with check (coalesce(source_kind, '') <> 'receipt_settlement');

-- 3) DELETE: clients may not delete settlement rows; non-settlement unchanged (admin).
drop policy if exists allocation_records_delete on public.allocation_records;
create policy allocation_records_delete on public.allocation_records
  for delete to authenticated
  using (is_admin() and coalesce(source_kind, '') <> 'receipt_settlement');

-- 4) Activate the atomic RPC for authenticated callers (it validates everything
--    server-side and, as SECURITY DEFINER, is the sole path that can write
--    settlement rows). anon stays blocked.
grant execute on function public.create_receipt_with_settlement(jsonb, jsonb) to authenticated;

comment on policy allocation_records_insert on public.allocation_records is
  'P-RECEIPT-ALLOCATION PR-4: clients cannot insert source_kind=receipt_settlement rows; only the SECURITY DEFINER RPC writes settlement. MODEL2 audit rows unaffected.';
