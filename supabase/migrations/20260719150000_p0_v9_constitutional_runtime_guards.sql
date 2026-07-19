-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V9 — Runtime Constitutional Invariant Enforcement
-- Constitution: Laws 1 (Conservation) · 3 (Single Source) · 7 (Atomicity) ·
--               9 (Deficit Bounds) · 10 (Split Exactness) · Guarantees §1/§4/§7/§9
-- ───────────────────────────────────────────────────────────────────────────
-- Constitutional GUARDS — not validation helpers, not logging. They execute
-- around the one critical value-moving accounting operation (the receipt/payment
-- split), BEFORE commit, and obey Detect → Reject only: on any violation they
-- RAISE, which rolls the whole transaction back (Law 7). They NEVER auto-correct,
-- repair, or rewrite an accounting value.
--
-- They re-verify the split independently against the parent's ACTUAL stored
-- value (the single source) — not the caller's claim — so a client bug or
-- tampering that would break conservation/exactness is rejected at the database
-- before any state is committed. The deficit AGGREGATE bound (remaining ≤ 0) is
-- deliberately NOT re-derived here: doing so would create a second source of the
-- deficit computation and violate Law 3. Its runtime bound is enforced locally
-- (a deficit-directed contribution must reduce, never inject a surplus).
--
-- This migration only PREPENDS the guard block to reclassify_split_atomic; every
-- V1 write is preserved byte-for-byte. Member creation moves no money, so it
-- carries no financial guard. Negligible overhead (a few comparisons + the parent
-- read the function already needs).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reclassify_split_atomic(
  p_kind text, p_parent_id uuid, p_child jsonb, p_remain_amount numeric, p_remain_amount_ils numeric,
  p_parent_version integer, p_version_snapshot jsonb, p_version_reason text, p_edited_by text, p_original_snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_child_no  text;
  v_parent_no text;
  v_vkind     text := CASE WHEN p_kind = 'payment' THEN 'payment' ELSE 'receipt' END;
  -- V9 guard locals
  g_parent_amt  numeric;
  g_parent_ils  numeric;
  g_parent_rate numeric;
  g_child_amt   numeric := (p_child->>'amount')::numeric;
  g_child_ils   numeric := (p_child->>'amount_ils')::numeric;
  g_child_rate  numeric;
  g_child_dest  text    := p_child->>'destination_treasury';
BEGIN
  -- ═══ V9 · RUNTIME CONSTITUTIONAL GUARDS (Detect → Reject; before any write) ═══
  IF p_kind = 'payment' THEN
    SELECT amount, amount_ils, exchange_rate INTO g_parent_amt, g_parent_ils, g_parent_rate
      FROM public.payments WHERE id = p_parent_id;
  ELSE
    SELECT amount, amount_ils, exchange_rate INTO g_parent_amt, g_parent_ils, g_parent_rate
      FROM public.receipts WHERE id = p_parent_id;
  END IF;
  IF g_parent_amt IS NULL THEN
    RAISE EXCEPTION 'CONSTITUTION · reclassify_split · parent voucher % not found', p_parent_id
      USING ERRCODE = 'no_data_found';
  END IF;
  g_child_rate := COALESCE((p_child->>'exchange_rate')::numeric, g_parent_rate, 1);

  -- LAW 10 (Split Exactness) + LAW 1 (Conservation) — native currency
  IF round(g_child_amt + p_remain_amount, 2) <> round(g_parent_amt, 2) THEN
    RAISE EXCEPTION 'CONSTITUTION VIOLATED · Law 10 Split-Exactness / Law 1 Conservation · op=reclassify_split · invariant=[parent_native = child + remaining] · reason: % <> % + %',
      g_parent_amt, g_child_amt, p_remain_amount USING ERRCODE = 'check_violation';
  END IF;
  -- LAW 10 + LAW 1 — ILS
  IF round(g_child_ils + p_remain_amount_ils, 2) <> round(g_parent_ils, 2) THEN
    RAISE EXCEPTION 'CONSTITUTION VIOLATED · Law 10 Split-Exactness / Law 1 Conservation · op=reclassify_split · invariant=[parent_ILS = child + remaining] · reason: % <> % + %',
      g_parent_ils, g_child_ils, p_remain_amount_ils USING ERRCODE = 'check_violation';
  END IF;
  -- LAW 3 (Single Source) — the child ILS must be DERIVED (native × rate), never an independent 2nd value
  IF abs(g_child_ils - round(g_child_amt * g_child_rate, 2)) > 0.01 THEN
    RAISE EXCEPTION 'CONSTITUTION VIOLATED · Law 3 Single-Source · op=reclassify_split · invariant=[child_ILS = native × rate] · reason: % <> % × %',
      g_child_ils, g_child_amt, g_child_rate USING ERRCODE = 'check_violation';
  END IF;
  -- LAW 9 (Deficit Bounds) — a deficit-directed contribution must reduce the deficit (be > 0), never inject a surplus
  IF g_child_dest = 'historical_deficit' AND g_child_ils <= 0 THEN
    RAISE EXCEPTION 'CONSTITUTION VIOLATED · Law 9 Deficit-Bounds · op=reclassify_split · invariant=[deficit-directed amount > 0 · reduce toward zero, never surplus] · reason: child_ILS=%',
      g_child_ils USING ERRCODE = 'check_violation';
  END IF;
  -- LAW 7 (Atomicity) — any RAISE above rolls back the whole transaction below; no partial state can commit.
  -- ═══ end guards ═══

  IF p_kind = 'payment' THEN
    DECLARE v_rec public.payments; BEGIN
      v_rec := jsonb_populate_record(NULL::public.payments, p_child);
      v_rec.id := COALESCE(v_rec.id, gen_random_uuid()); v_rec.created_at := COALESCE(v_rec.created_at, now()); v_rec.is_deleted := COALESCE(v_rec.is_deleted, false);
      INSERT INTO public.payments VALUES (v_rec.*) RETURNING no INTO v_child_no;
      UPDATE public.payments SET amount = p_remain_amount, amount_ils = p_remain_amount_ils, version = p_parent_version WHERE id = p_parent_id RETURNING no INTO v_parent_no;
    END;
  ELSE
    DECLARE v_rec public.receipts; BEGIN
      v_rec := jsonb_populate_record(NULL::public.receipts, p_child);
      v_rec.id := COALESCE(v_rec.id, gen_random_uuid()); v_rec.created_at := COALESCE(v_rec.created_at, now()); v_rec.is_deleted := COALESCE(v_rec.is_deleted, false);
      INSERT INTO public.receipts VALUES (v_rec.*) RETURNING no INTO v_child_no;
      UPDATE public.receipts SET amount = p_remain_amount, amount_ils = p_remain_amount_ils, version = p_parent_version WHERE id = p_parent_id RETURNING no INTO v_parent_no;
    END;
  END IF;
  IF v_parent_no IS NULL THEN
    RAISE EXCEPTION 'reclassify_split_atomic: parent voucher % not found', p_parent_id USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.voucher_versions WHERE voucher_kind = v_vkind AND voucher_id = p_parent_id) THEN
    INSERT INTO public.voucher_versions (voucher_kind, voucher_id, voucher_no, version_no, snapshot, edit_reason, edited_by, edited_at)
    VALUES (v_vkind, p_parent_id, v_parent_no, COALESCE((p_original_snapshot->>'version')::int, 1), p_original_snapshot,
            'سجل أولي · Initial', COALESCE(p_original_snapshot->>'created_by', p_edited_by), COALESCE((p_original_snapshot->>'created_at')::timestamptz, now()));
  END IF;
  INSERT INTO public.voucher_versions (voucher_kind, voucher_id, voucher_no, version_no, snapshot, edit_reason, edited_by, edited_at)
  VALUES (v_vkind, p_parent_id, v_parent_no, p_parent_version, p_version_snapshot, p_version_reason, p_edited_by, now());

  RETURN jsonb_build_object('child_no', v_child_no, 'parent_no', v_parent_no, 'version_no', p_parent_version);
END $fn$;

COMMENT ON FUNCTION public.reclassify_split_atomic IS
  'P0/V1+V9 · atomic split (Law 7) with runtime constitutional guards (Laws 1/3/9/10, Detect→Reject before commit). Split math computed by caller; guards re-verify against the stored parent and reject any violation with full rollback.';
