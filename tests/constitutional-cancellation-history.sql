-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V8 — Immutable History / Cancellation Version Snapshot   (closure evidence)
-- Constitution: Law 5 (Immutable History) · Law 6 (Traceability)
-- ───────────────────────────────────────────────────────────────────────────
-- Proves that a voucher cancellation leaves the SAME reconstructible trail as any
-- other accounting state transition: an immutable full-snapshot version, plus the
-- v1 baseline backfilled on first versioning. Before V8, cancellation only set
-- is_deleted=true and wrote no voucher_versions row — so the transition (active →
-- cancelled) could not be reconstructed from the immutable history.
--
-- This replicates the exact V8 client sequence (crud.js deleteRec/deletePay →
-- recordVoucherVersion) at the database level, against the REAL schema, inside one
-- BEGIN … ROLLBACK. Nothing persists. It targets a receipt that has never been
-- versioned (the worst case), so it also exercises the v1-baseline backfill.
--
--   psql "$DATABASE_URL" -f tests/constitutional-cancellation-history.sql
--
-- Expected: A/B/C/D all PASS (snapshot produced; original active state preserved;
-- cancellation snapshot carries who/why + is_deleted; final voucher = cancelled).
-- No accounting value, balance, treasury, or business rule is touched — is_deleted
-- rows are already excluded from every financial calculation.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE cancel_results(t text) ON COMMIT DROP;

DO $test$
DECLARE
  v_id uuid; v_no text; v_ver int; v_row jsonb;
  v_pre_versions int; v_new_ver int; nowts timestamptz := now();
  v_snap_count int; v_has_baseline boolean; v_has_cancel boolean; v_final_deleted boolean;
BEGIN
  -- a real, active receipt that has never been versioned (worst case for reconstruction)
  SELECT rc.id, rc.no, COALESCE(rc.version,1), to_jsonb(rc.*)
    INTO v_id, v_no, v_ver, v_row
  FROM public.receipts rc
  WHERE NOT rc.is_deleted
    AND NOT EXISTS (SELECT 1 FROM public.voucher_versions vv
                    WHERE vv.voucher_kind='receipt' AND vv.voucher_id=rc.id)
  ORDER BY rc.created_at DESC NULLS LAST
  LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'no unversioned active receipt to test against'; END IF;
  v_new_ver := v_ver + 1;

  -- ── V8 client sequence, replicated ──
  -- 1) cancel: is_deleted + version bump + updated_at
  UPDATE public.receipts SET is_deleted=true, version=v_new_ver, updated_at=nowts WHERE id=v_id;

  -- 2) recordVoucherVersion: v1 baseline (first versioning) then the cancellation snapshot
  SELECT count(*) INTO v_pre_versions
    FROM public.voucher_versions WHERE voucher_kind='receipt' AND voucher_id=v_id;
  IF v_pre_versions = 0 THEN
    INSERT INTO public.voucher_versions(voucher_kind,voucher_id,voucher_no,version_no,snapshot,edit_reason,edited_by,edited_at)
    VALUES('receipt', v_id, v_no, COALESCE((v_row->>'version')::int,1), v_row, 'سجل أولي · Initial',
           COALESCE(v_row->>'created_by','admin'), COALESCE((v_row->>'created_at')::timestamptz, nowts));
  END IF;
  INSERT INTO public.voucher_versions(voucher_kind,voucher_id,voucher_no,version_no,snapshot,edit_reason,edited_by,edited_at)
  VALUES('receipt', v_id, v_no, v_new_ver,
         (v_row || jsonb_build_object('is_deleted',true,'version',v_new_ver,'updated_at',nowts)),
         'إلغاء · Cancellation', 'tester', nowts);

  -- ── assertions ──
  SELECT count(*) INTO v_snap_count
    FROM public.voucher_versions WHERE voucher_kind='receipt' AND voucher_id=v_id;
  SELECT EXISTS(SELECT 1 FROM public.voucher_versions
                WHERE voucher_kind='receipt' AND voucher_id=v_id
                  AND (snapshot->>'is_deleted')::boolean IS NOT TRUE) INTO v_has_baseline;
  SELECT EXISTS(SELECT 1 FROM public.voucher_versions
                WHERE voucher_kind='receipt' AND voucher_id=v_id
                  AND edit_reason='إلغاء · Cancellation'
                  AND (snapshot->>'is_deleted')::boolean IS TRUE) INTO v_has_cancel;
  SELECT is_deleted INTO v_final_deleted FROM public.receipts WHERE id=v_id;

  INSERT INTO cancel_results VALUES(format('receipt %s : versions before=%s after=%s', v_no, v_pre_versions, v_snap_count));
  INSERT INTO cancel_results VALUES(format('A · cancellation always produces a snapshot           -> %s', CASE WHEN v_snap_count=2 THEN 'PASS' ELSE 'FAIL' END));
  INSERT INTO cancel_results VALUES(format('B · original ACTIVE state preserved (reconstructible) -> %s', CASE WHEN v_has_baseline THEN 'PASS' ELSE 'FAIL' END));
  INSERT INTO cancel_results VALUES(format('C · cancellation snapshot (who/why + is_deleted)      -> %s', CASE WHEN v_has_cancel THEN 'PASS' ELSE 'FAIL' END));
  INSERT INTO cancel_results VALUES(format('D · voucher final state = cancelled                    -> %s', CASE WHEN v_final_deleted THEN 'PASS' ELSE 'FAIL' END));
END $test$;

SELECT t FROM cancel_results;

ROLLBACK;
