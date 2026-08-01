-- P-RECEIPT-ALLOCATION · PR-1 — Foundation Layer (INERT / additive only).
-- Prepares the system to support Explicit Receipt Settlement WITHOUT any
-- behavioural change. Nothing here is read or written by a runtime path; the
-- feature flag (client-side window.RECEIPT_ALLOCATION_ENABLED) defaults OFF, and
-- no UI or engine calls the RPC below. Idempotent. NO existing data is altered
-- (no UPDATE / DELETE / DROP); no existing column, policy, or trigger is changed.
--
-- Scope decisions (constitutional):
--   * allocation_records is REUSED as the future settlement store. Settlement
--     rows are distinguished by source_kind = 'receipt_settlement'. Every
--     constraint added here is SCOPED to that class via a partial index, so the
--     dormant MODEL2 audit recorder (source_kind 'allocation'/'credit_consumption')
--     is completely unaffected.
--   * The RLS "revoke direct client writes / grant only the RPC" fence
--     (PR-0A §15) is DEFERRED to the PR that activates settlement writes —
--     applying it now would change the dormant MODEL2 path's behaviour, which
--     PR-1 forbids. PR-1 leaves all existing policies untouched.
--   * paid_amount_ils is NOT touched anywhere.

-- 1) Additive column: per-line note (nullable; unused until settlement posts).
alter table public.allocation_records
  add column if not exists notes text;

-- 2) Settlement-scoped uniqueness: at most one settlement line per
--    (receipt, obligation_kind, year) — enforced ONLY for settlement rows.
--    coalesce(year,-1) so historical/donation/credit (year IS NULL) are unique
--    per receipt too. Partial predicate excludes all non-settlement rows, so the
--    MODEL2 audit recorder is not constrained. Empty table => index builds inert.
create unique index if not exists alloc_settlement_uniq
  on public.allocation_records (source_ref, obligation_kind, coalesce(year, -1))
  where source_kind = 'receipt_settlement';

comment on index public.alloc_settlement_uniq is
  'P-RECEIPT-ALLOCATION PR-1: one settlement line per (receipt, obligation_kind, year); scoped to source_kind=receipt_settlement so the MODEL2 audit recorder is unaffected.';
comment on column public.allocation_records.notes is
  'P-RECEIPT-ALLOCATION PR-1: optional per-settlement-line note. Nullable; unused until settlement posting activates.';

-- 3) Atomic Posting RPC — SKELETON ONLY. Defined so later PRs can implement it;
--    NO runtime path calls it. As a safety measure the skeleton writes NOTHING
--    and always raises, so even an accidental call cannot mutate any row.
create or replace function public.create_receipt_with_settlement(
  p_receipt   jsonb default '{}'::jsonb,
  p_lines     jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- PR-1 skeleton: intentionally inert. Real atomic insert (receipt + settlement
  -- lines, Sigma lines = amount, never writes paid_amount_ils) lands in a later PR.
  raise exception 'receipt_settlement_not_enabled'
    using detail = 'P-RECEIPT-ALLOCATION PR-1 skeleton: RPC defined but not yet implemented; no runtime path may call it.',
          errcode = 'P0001';
end;
$$;

-- Do not expose the skeleton to the REST/anon roles (Supabase advisor 0028/0029);
-- it is uncallable from the client and will be granted deliberately when implemented.
revoke all on function public.create_receipt_with_settlement(jsonb, jsonb) from public, anon, authenticated;

comment on function public.create_receipt_with_settlement(jsonb, jsonb) is
  'P-RECEIPT-ALLOCATION PR-1: atomic settlement-posting RPC SKELETON. Inert (always raises, writes nothing); no runtime caller. Implemented in a later PR.';
