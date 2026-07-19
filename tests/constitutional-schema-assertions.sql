-- ═══════════════════════════════════════════════════════════════════════════
-- CONSTITUTIONAL SCHEMA ASSERTIONS  ·  Phase P0 · V7 (real-schema pillar)
-- ───────────────────────────────────────────────────────────────────────────
-- Database-level guarantees that the accounting constitution requires the
-- SCHEMA itself to enforce — the checks the in-memory suite is blind to.
-- Run against the real database (the same schema production uses):
--
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/constitutional-schema-assertions.sql
--
-- Every block RAISEs on violation, so a clean run (no ERROR) == COMPLIANT.
-- Pure read/inspection + one rolled-back probe; it never mutates data.
--
-- Constitution refs: Law 12 (Identity Uniqueness) · Law 4/10 (Explicit
-- Classification / Allocation Exactness — the food-donation allocation CHECK).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── LAW 12 · Identity Uniqueness — a unique index on `no` on both ledgers ───
DO $$
DECLARE r_uni int; p_uni int;
BEGIN
  SELECT count(*) INTO r_uni FROM pg_indexes
    WHERE schemaname='public' AND tablename='receipts'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%(no)%';
  SELECT count(*) INTO p_uni FROM pg_indexes
    WHERE schemaname='public' AND tablename='payments'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%(no)%';
  IF r_uni < 1 THEN RAISE EXCEPTION 'LAW-12 VIOLATION: receipts.no has no UNIQUE index'; END IF;
  IF p_uni < 1 THEN RAISE EXCEPTION 'LAW-12 VIOLATION: payments.no has no UNIQUE index'; END IF;
  RAISE NOTICE 'LAW-12 PASS · unique index on no present (receipts + payments)';
END $$;

-- ── LAW 12 · no duplicate voucher numbers currently exist ───────────────────
DO $$
DECLARE dups int;
BEGIN
  SELECT count(*) INTO dups FROM (
    SELECT no FROM receipts GROUP BY no HAVING count(*) > 1
    UNION ALL
    SELECT no FROM payments GROUP BY no HAVING count(*) > 1
  ) d;
  IF dups > 0 THEN RAISE EXCEPTION 'LAW-12 VIOLATION: % duplicate voucher number(s) exist', dups; END IF;
  RAISE NOTICE 'LAW-12 PASS · zero duplicate voucher numbers';
END $$;

-- ── LAW 12 · the unique index actually REJECTS a duplicate (rolled-back probe) ─
DO $$
DECLARE blocked boolean := false; sample_no text;
BEGIN
  SELECT no INTO sample_no FROM receipts LIMIT 1;
  IF sample_no IS NULL THEN RAISE NOTICE 'LAW-12 SKIP · no receipts to probe'; RETURN; END IF;
  BEGIN
    INSERT INTO receipts (id, verification_token, no, fund_type, receipt_date, payer_type,
      member_id, contact_id, payer_name, amount, currency, amount_ils, exchange_rate,
      payment_method, description, notes, donation_display_fund, created_by, created_at,
      updated_at, is_deleted, cheque_no, cheque_date, cheque_bank, receipt_sub_type,
      food_donation_allocation, allocation_type, current_addition, version, manual_allocation,
      manual_debt_settlement, manual_historical_donation, manual_current_support,
      movement_type, destination_treasury, source_treasury, movement_reason, register_category)
    SELECT gen_random_uuid(), gen_random_uuid()::text, no, fund_type, receipt_date, payer_type,
      member_id, contact_id, payer_name, amount, currency, amount_ils, exchange_rate,
      payment_method, description, notes, donation_display_fund, created_by, created_at,
      updated_at, is_deleted, cheque_no, cheque_date, cheque_bank, receipt_sub_type,
      food_donation_allocation, allocation_type, current_addition, version, manual_allocation,
      manual_debt_settlement, manual_historical_donation, manual_current_support,
      movement_type, destination_treasury, source_treasury, movement_reason, register_category
    FROM receipts WHERE no = sample_no;
  EXCEPTION WHEN unique_violation THEN
    blocked := true;                         -- sub-transaction rolled back: nothing persists
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'LAW-12 VIOLATION: duplicate receipts.no was accepted'; END IF;
  RAISE NOTICE 'LAW-12 PASS · duplicate no rejected at runtime (nothing persisted)';
END $$;

-- ── LAW 4 / 10 · Explicit food-donation allocation is enforced by CHECK ──────
DO $$
DECLARE req int; vals int;
BEGIN
  SELECT count(*) INTO req FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='receipts' AND c.contype='c'
      AND pg_get_constraintdef(c.oid) ILIKE '%food_donation_allocation%';
  IF req < 1 THEN RAISE EXCEPTION 'LAW-4/10 VIOLATION: food_donation_allocation CHECK missing'; END IF;
  RAISE NOTICE 'LAW-4/10 PASS · food-donation allocation CHECK present';
END $$;

-- A clean run (no ERROR raised above) means: CONSTITUTION COMPLIANT (schema layer).
