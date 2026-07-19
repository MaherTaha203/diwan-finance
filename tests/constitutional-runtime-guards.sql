-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V9 — Runtime Constitutional Guard tests (closure evidence)
-- Constitution: Laws 1 (Conservation) · 3 (Single Source) · 7 (Atomicity) ·
--               9 (Deficit Bounds) · 10 (Split Exactness)
-- ───────────────────────────────────────────────────────────────────────────
-- Reproducible proof that reclassify_split_atomic's runtime guards obey
-- Detect → Reject: a legitimate split commits (with value conserved), and each
-- constitutional violation is REJECTED with the whole transaction rolled back —
-- never auto-corrected, never partially committed.
--
-- Runs entirely inside one BEGIN … ROLLBACK: nothing persists. Point :parent at
-- any real, non-deleted receipt (its stored amount/amount_ils/exchange_rate are
-- the single source the guards re-verify against). Each scenario runs in its own
-- sub-block whose writes are always rolled back, so the parent stays intact
-- between cases; the legit case is force-undone after asserting acceptance.
--
--   psql "$DATABASE_URL" -v parent="'<receipt-uuid>'" -f tests/constitutional-runtime-guards.sql
--
-- Expected: A ACCEPTED (native+ILS conserved) ; B/C/D/E REJECTED (law named).
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE v9_results(seq int, scenario text, outcome text, detail text) ON COMMIT DROP;

DO $test$
DECLARE
  v_parent uuid := :parent;
  v_base   jsonb;   -- child template built from the real parent row
  v_snap   jsonb;   -- version/original snapshot
  v_res    jsonb;
  v_amt numeric; v_ils numeric; v_rate numeric;
  v_child_amt numeric; v_child_ils numeric; v_remain numeric; v_remain_ils numeric;
BEGIN
  SELECT amount, amount_ils, exchange_rate INTO v_amt, v_ils, v_rate
    FROM public.receipts WHERE id = v_parent;
  IF v_amt IS NULL THEN RAISE EXCEPTION 'test parent % not found / has null amounts', v_parent; END IF;

  -- split the parent in half (native), derive the ILS side from native × rate
  v_child_amt  := round(v_amt / 2, 2);
  v_remain     := round(v_amt - v_child_amt, 2);
  v_child_ils  := round(v_child_amt * v_rate, 2);
  v_remain_ils := round(v_ils - v_child_ils, 2);

  SELECT to_jsonb(r.*) - 'id' - 'no' - 'verification_token' - 'created_at' - 'updated_at'
    INTO v_base FROM public.receipts r WHERE r.id = v_parent;
  SELECT to_jsonb(r.*) INTO v_snap FROM public.receipts r WHERE r.id = v_parent;
  v_base := v_base || jsonb_build_object('no','REC-V9GUARDTEST','verification_token','V9GUARDTESTxx');

  -- A · legitimate split — all of Laws 1/3/9/10 satisfied → ACCEPTED
  BEGIN
    v_res := public.reclassify_split_atomic('receipt', v_parent,
      v_base || jsonb_build_object('amount', v_child_amt, 'amount_ils', v_child_ils),
      v_remain, v_remain_ils, 2, v_snap, 'v9-guard-test', 'tester', v_snap);
    INSERT INTO v9_results VALUES (1, 'A legitimate split (Laws 1/3/9/10 satisfied)', 'ACCEPTED', v_res::text);
    RAISE EXCEPTION 'v9_undo_accept';   -- force-undo so the parent stays intact for B–E
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'v9_undo_accept' THEN
      INSERT INTO v9_results VALUES (1, 'A legitimate split', 'REJECTED (UNEXPECTED)', SQLERRM);
    END IF;
  END;

  -- B · Law 10/1 native conservation broken (child + remaining ≠ parent, native)
  BEGIN
    v_res := public.reclassify_split_atomic('receipt', v_parent,
      v_base || jsonb_build_object('amount', v_child_amt, 'amount_ils', v_child_ils),
      v_remain + 1, v_remain_ils, 2, v_snap, 't', 'tester', v_snap);
    INSERT INTO v9_results VALUES (2, 'B Law10/1 native conservation', 'ACCEPTED (UNEXPECTED)', v_res::text);
  EXCEPTION WHEN OTHERS THEN INSERT INTO v9_results VALUES (2, 'B Law10/1 native conservation', 'REJECTED', SQLERRM); END;

  -- C · Law 10/1 ILS conservation broken (child + remaining ≠ parent, ILS ; native ok)
  BEGIN
    v_res := public.reclassify_split_atomic('receipt', v_parent,
      v_base || jsonb_build_object('amount', v_child_amt, 'amount_ils', v_child_ils),
      v_remain, v_remain_ils + 5, 2, v_snap, 't', 'tester', v_snap);
    INSERT INTO v9_results VALUES (3, 'C Law10/1 ILS conservation', 'ACCEPTED (UNEXPECTED)', v_res::text);
  EXCEPTION WHEN OTHERS THEN INSERT INTO v9_results VALUES (3, 'C Law10/1 ILS conservation', 'REJECTED', SQLERRM); END;

  -- D · Law 3 single-source broken (child_ils ≠ native × rate ; conservation still holds)
  BEGIN
    v_res := public.reclassify_split_atomic('receipt', v_parent,
      v_base || jsonb_build_object('amount', v_child_amt, 'amount_ils', v_child_ils + 10),
      v_remain, v_remain_ils - 10, 2, v_snap, 't', 'tester', v_snap);
    INSERT INTO v9_results VALUES (4, 'D Law3 single-source (ILS <> native × rate)', 'ACCEPTED (UNEXPECTED)', v_res::text);
  EXCEPTION WHEN OTHERS THEN INSERT INTO v9_results VALUES (4, 'D Law3 single-source', 'REJECTED', SQLERRM); END;

  -- E · Law 9 deficit bound broken (deficit-directed child with amount_ils ≤ 0)
  BEGIN
    v_res := public.reclassify_split_atomic('receipt', v_parent,
      v_base || jsonb_build_object('amount', 0, 'amount_ils', 0, 'destination_treasury', 'historical_deficit'),
      v_amt, v_ils, 2, v_snap, 't', 'tester', v_snap);
    INSERT INTO v9_results VALUES (5, 'E Law9 deficit-bound (deficit child ILS <= 0)', 'ACCEPTED (UNEXPECTED)', v_res::text);
  EXCEPTION WHEN OTHERS THEN INSERT INTO v9_results VALUES (5, 'E Law9 deficit-bound', 'REJECTED', SQLERRM); END;
END $test$;

SELECT seq, scenario, outcome, detail FROM v9_results ORDER BY seq;

ROLLBACK;
