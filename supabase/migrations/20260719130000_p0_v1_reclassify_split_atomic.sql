-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V1 — Atomicity of the partial reclassification (split)
-- Constitution: Law 7 (Atomicity) · Guarantee §4 · protects Law 1 (Conservation)
-- ───────────────────────────────────────────────────────────────────────────
-- The partial-reclassification split must be ONE atomic operation: the moved
-- child voucher is created, the original voucher is reduced, and the audit
-- version snapshot is recorded — all together, or nothing at all. Performed as
-- three separate client round-trips it could leave a PartialWrite state (child
-- created, original NOT reduced) on a mid-operation failure — duplicated money.
--
-- This function performs all three writes in a single transaction (a plpgsql
-- function body is atomic: any uncaught error rolls the whole thing back). The
-- split MATH is unchanged — it is computed by the client exactly as before and
-- passed in, so the golden baseline is preserved. This migration ONLY makes the
-- writes atomic; it does not change any amount, rule, or classification.
--
-- SECURITY: SECURITY INVOKER (default) — the caller's RLS/permissions still
-- govern every write, exactly as the direct writes did.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reclassify_split_atomic(
  p_kind             text,        -- 'receipt' | 'payment'
  p_parent_id        uuid,
  p_child            jsonb,        -- the moved child row, fully computed by the client
  p_remain_amount    numeric,      -- original's retained native amount
  p_remain_amount_ils numeric,     -- original's retained ILS amount
  p_parent_version   integer,      -- original's new version number
  p_version_snapshot jsonb,        -- audit snapshot of the reduced original
  p_version_reason   text,
  p_edited_by        text,
  p_original_snapshot jsonb        -- pre-reduction original row (for the v1 baseline backfill)
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_child_no  text;
  v_parent_no text;
  v_vkind     text := CASE WHEN p_kind = 'payment' THEN 'payment' ELSE 'receipt' END;
BEGIN
  IF p_kind = 'payment' THEN
    DECLARE v_rec public.payments;
    BEGIN
      v_rec := jsonb_populate_record(NULL::public.payments, p_child);
      v_rec.id         := COALESCE(v_rec.id, gen_random_uuid());
      v_rec.created_at := COALESCE(v_rec.created_at, now());
      v_rec.is_deleted := COALESCE(v_rec.is_deleted, false);
      INSERT INTO public.payments VALUES (v_rec.*) RETURNING no INTO v_child_no;
      UPDATE public.payments
         SET amount = p_remain_amount, amount_ils = p_remain_amount_ils, version = p_parent_version
       WHERE id = p_parent_id
       RETURNING no INTO v_parent_no;
    END;
  ELSE
    DECLARE v_rec public.receipts;
    BEGIN
      v_rec := jsonb_populate_record(NULL::public.receipts, p_child);
      v_rec.id         := COALESCE(v_rec.id, gen_random_uuid());
      v_rec.created_at := COALESCE(v_rec.created_at, now());
      v_rec.is_deleted := COALESCE(v_rec.is_deleted, false);
      INSERT INTO public.receipts VALUES (v_rec.*) RETURNING no INTO v_child_no;
      UPDATE public.receipts
         SET amount = p_remain_amount, amount_ils = p_remain_amount_ils, version = p_parent_version
       WHERE id = p_parent_id
       RETURNING no INTO v_parent_no;
    END;
  END IF;

  -- the original must exist; if not, raise → the whole function (incl. the child
  -- insert already done above) rolls back. No partial state can survive.
  IF v_parent_no IS NULL THEN
    RAISE EXCEPTION 'reclassify_split_atomic: parent voucher % not found', p_parent_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Audit (Law 5/6): backfill the immutable v1 baseline the first time this
  -- voucher is versioned — identical to the previous client behaviour, now atomic.
  IF NOT EXISTS (SELECT 1 FROM public.voucher_versions
                 WHERE voucher_kind = v_vkind AND voucher_id = p_parent_id) THEN
    INSERT INTO public.voucher_versions
      (voucher_kind, voucher_id, voucher_no, version_no, snapshot, edit_reason, edited_by, edited_at)
    VALUES
      (v_vkind, p_parent_id, v_parent_no,
       COALESCE((p_original_snapshot->>'version')::int, 1), p_original_snapshot,
       'سجل أولي · Initial',
       COALESCE(p_original_snapshot->>'created_by', p_edited_by),
       COALESCE((p_original_snapshot->>'created_at')::timestamptz, now()));
  END IF;

  INSERT INTO public.voucher_versions
    (voucher_kind, voucher_id, voucher_no, version_no, snapshot, edit_reason, edited_by, edited_at)
  VALUES
    (v_vkind, p_parent_id, v_parent_no, p_parent_version, p_version_snapshot, p_version_reason, p_edited_by, now());

  RETURN jsonb_build_object('child_no', v_child_no, 'parent_no', v_parent_no, 'version_no', p_parent_version);
END $$;

COMMENT ON FUNCTION public.reclassify_split_atomic IS
  'P0/V1 · Law 7 Atomicity — performs the partial-reclassification split (child insert + original reduction + version snapshot) as one atomic transaction. Split math is computed by the caller; this only guarantees all-or-nothing writes.';
