-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V3 — Single Source of Truth for Annual Subscription Allocation
-- Constitution: Law 3 (Single Source of Truth) · Guarantee §3   (closure evidence)
-- ───────────────────────────────────────────────────────────────────────────
-- Reproducible proof that member_subscriptions has exactly ONE authoritative
-- origin for annual subscription paid (paid_amount_ils), and that the two former
-- second-truth paths are structurally closed:
--
--   • ms_balance_is_derived            — balance_ils MUST equal due − paid; a
--     divergent or stale balance is rejected (it can only ever be derived).
--   • ms_no_independent_paid_authority — the override columns can never carry a
--     competing amount; any override write is rejected.
--
-- Runs inside one BEGIN … ROLLBACK against the real schema (constraints already
-- applied by 20260719160000_p0_v3_subscription_single_source.sql). Nothing
-- persists. Uses UPDATEs on an existing row to avoid the year-FK / unique noise.
--
--   psql "$DATABASE_URL" -f tests/constitutional-single-source.sql
--
-- Expected: A ACCEPTED (balance re-derived) ; B/C/D/E REJECTED (constraint named).
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE v3_results(seq int, scenario text, outcome text, detail text) ON COMMIT DROP;

DO $test$
DECLARE rid uuid; d numeric; p numeric;
BEGIN
  SELECT id, due_amount_ils, paid_amount_ils INTO rid, d, p
    FROM public.member_subscriptions ORDER BY due_amount_ils DESC LIMIT 1;
  IF rid IS NULL THEN RAISE EXCEPTION 'no member_subscriptions rows to test against'; END IF;

  -- A · legit consistent change: move 50 into paid AND re-derive balance -> ACCEPTED
  BEGIN
    UPDATE public.member_subscriptions SET paid_amount_ils = p + 50, balance_ils = d - (p + 50) WHERE id = rid;
    INSERT INTO v3_results VALUES (1, 'A legit consistent (paid+50, balance re-derived)', 'ACCEPTED', '');
    RAISE EXCEPTION 'v3_undo_accept';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'v3_undo_accept' THEN
      INSERT INTO v3_results VALUES (1, 'A legit consistent', 'REJECTED (UNEXPECTED)', SQLERRM);
    END IF;
  END;

  -- B · independent duplicate truth: balance_ils diverges from due − paid -> REJECTED
  BEGIN
    UPDATE public.member_subscriptions SET balance_ils = balance_ils + 999 WHERE id = rid;
    INSERT INTO v3_results VALUES (2, 'B divergent balance_ils', 'ACCEPTED (UNEXPECTED)', '');
  EXCEPTION WHEN OTHERS THEN INSERT INTO v3_results VALUES (2, 'B divergent balance_ils', 'REJECTED', SQLERRM); END;

  -- C · stale balance: paid changes but balance is not re-derived -> REJECTED (no silent divergence)
  BEGIN
    UPDATE public.member_subscriptions SET paid_amount_ils = p + 50 WHERE id = rid;
    INSERT INTO v3_results VALUES (3, 'C paid changed, balance stale', 'ACCEPTED (UNEXPECTED)', '');
  EXCEPTION WHEN OTHERS THEN INSERT INTO v3_results VALUES (3, 'C paid changed, balance stale', 'REJECTED', SQLERRM); END;

  -- D · override authority (the old permissive path) -> REJECTED
  BEGIN
    UPDATE public.member_subscriptions SET is_overridden = true, override_amount_ils = 175, override_reason = 'x' WHERE id = rid;
    INSERT INTO v3_results VALUES (4, 'D override authority (flag + amount)', 'ACCEPTED (UNEXPECTED)', '');
  EXCEPTION WHEN OTHERS THEN INSERT INTO v3_results VALUES (4, 'D override authority', 'REJECTED', SQLERRM); END;

  -- E · override amount alone -> REJECTED
  BEGIN
    UPDATE public.member_subscriptions SET override_amount_ils = 175 WHERE id = rid;
    INSERT INTO v3_results VALUES (5, 'E override_amount_ils alone', 'ACCEPTED (UNEXPECTED)', '');
  EXCEPTION WHEN OTHERS THEN INSERT INTO v3_results VALUES (5, 'E override_amount_ils alone', 'REJECTED', SQLERRM); END;
END $test$;

SELECT seq, scenario, outcome, detail FROM v3_results ORDER BY seq;

ROLLBACK;
