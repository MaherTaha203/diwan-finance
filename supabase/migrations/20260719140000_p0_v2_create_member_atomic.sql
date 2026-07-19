-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V2 — Atomicity of member creation
-- Constitution: Law 7 (Atomicity) · Guarantee §4
-- ───────────────────────────────────────────────────────────────────────────
-- Creating a member and generating its subscription (dues) rows must be ONE
-- atomic operation. Performed as two separate client writes it could leave a
-- NoSchedule state — a member with no subscription rows, invisible to the dues
-- engine — if the second write fails. This function inserts the member and all
-- its subscription rows in a single transaction: full success (member + every
-- schedule row) or full rollback, never an in-between.
--
-- Faithful to the previous behaviour: the client passes the SAME member object
-- and subscription rows it built before; the function only makes the two writes
-- atomic. NOT-NULL columns that previously relied on DB defaults are coalesced
-- so a full-row insert reproduces the exact prior result. No rule changes.
--
-- SECURITY INVOKER (default) — the caller's RLS/permissions still govern.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_member_atomic(
  p_member        jsonb,   -- the member row the client built (no id needed)
  p_subscriptions jsonb    -- array of subscription rows (member_id assigned here)
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id   uuid;
  v_rec  public.members;
  v_srec public.member_subscriptions;
  sub    jsonb;
BEGIN
  -- 1) the member (coalesce the not-null/default columns the client omits)
  v_rec := jsonb_populate_record(NULL::public.members, p_member);
  v_rec.id                      := COALESCE(v_rec.id, gen_random_uuid());
  v_rec.is_active               := COALESCE(v_rec.is_active, true);
  v_rec.created_at              := COALESCE(v_rec.created_at, now());
  v_rec.updated_at              := COALESCE(v_rec.updated_at, now());
  v_rec.prepaid_subscription_ils := COALESCE(v_rec.prepaid_subscription_ils, 0);
  v_rec.historical_balance_ils  := COALESCE(v_rec.historical_balance_ils, 0);
  v_rec.historical_payments_ils := COALESCE(v_rec.historical_payments_ils, 0);
  v_rec.credit_balance_ils      := COALESCE(v_rec.credit_balance_ils, 0);
  v_rec.is_migration_exception  := COALESCE(v_rec.is_migration_exception, false);
  INSERT INTO public.members VALUES (v_rec.*) RETURNING id INTO v_id;

  -- 2) all subscription rows, bound to the new member (all-or-nothing with the member)
  IF p_subscriptions IS NOT NULL AND jsonb_typeof(p_subscriptions) = 'array' THEN
    FOR sub IN SELECT * FROM jsonb_array_elements(p_subscriptions) LOOP
      v_srec := jsonb_populate_record(NULL::public.member_subscriptions, sub);
      v_srec.id             := COALESCE(v_srec.id, gen_random_uuid());
      v_srec.member_id      := v_id;
      v_srec.due_amount_ils := COALESCE(v_srec.due_amount_ils, 0);
      v_srec.paid_amount_ils := COALESCE(v_srec.paid_amount_ils, 0);
      v_srec.balance_ils    := COALESCE(v_srec.balance_ils, 0);
      v_srec.is_overridden  := COALESCE(v_srec.is_overridden, false);
      v_srec.created_at     := COALESCE(v_srec.created_at, now());
      v_srec.updated_at     := COALESCE(v_srec.updated_at, now());
      INSERT INTO public.member_subscriptions VALUES (v_srec.*);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('member_id', v_id);
END $$;

COMMENT ON FUNCTION public.create_member_atomic IS
  'P0/V2 · Law 7 Atomicity — creates a member and all its subscription rows in one transaction (all-or-nothing). Prevents the NoSchedule state.';
