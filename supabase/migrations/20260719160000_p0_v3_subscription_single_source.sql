-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V3 — Single Source of Truth for Annual Subscription Allocation
-- Constitution: Law 3 (Single Source of Truth) · Guarantee §3
-- ───────────────────────────────────────────────────────────────────────────
-- OWNER DECISION (FROZEN): there shall be exactly ONE accounting source of truth
-- for an annual subscription. Derived values are allowed; independent duplicate
-- truths are forbidden. Reports may read derived/materialized values, but those
-- values are never authoritative.
--
-- The authoritative origin of "annual subscription paid" is member_subscriptions
-- .paid_amount_ils (the single stored figure the engine reads). Two schema paths
-- previously allowed a SECOND, competing truth for the same quantity:
--
--   1. member_subscriptions_override_chk — CHECK ((is_overridden = false)
--      OR (override_amount_ils IS NOT NULL)). This PERMITTED an operator to set
--      an independent override amount that would compete with paid_amount_ils.
--      It is the literal "second source of truth" path. (0 rows ever used it.)
--
--   2. balance_ils — a stored materialization of (due_amount_ils − paid_amount_ils).
--      Nothing kept it in sync with its inputs, so it could silently diverge and
--      be mistaken for an authoritative balance. (All 302 rows currently agree,
--      but only by convention, not by construction.)
--
-- This migration removes both paths WITHOUT touching any frozen function (V1/V2/
-- V9) and WITHOUT changing a single accounting value:
--
--   • DROP the permissive override CHECK and replace it with a constitutional
--     prohibition: overrides can never carry authority again (Detect → Reject,
--     the V9 stance). paid_amount_ils is left as the sole authoritative origin.
--
--   • ADD a CHECK that makes balance_ils EXPLICITLY DERIVED: it must equal
--     due_amount_ils − paid_amount_ils on every write. It can therefore never
--     hold an independent value — any divergent or stale write is rejected, so a
--     paid change that does not re-derive the balance cannot commit.
--
-- No business rule changes, no data changes, no subscription/report redesign.
-- Every existing row and every existing write path (member creation, annual-dues
-- application — both insert balance = due, paid = 0) already satisfy both checks.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Close the override second-truth path (replace permissive CHECK with prohibition)
ALTER TABLE public.member_subscriptions
  DROP CONSTRAINT IF EXISTS member_subscriptions_override_chk;

ALTER TABLE public.member_subscriptions
  ADD CONSTRAINT ms_no_independent_paid_authority
  CHECK (is_overridden = false
     AND override_amount_ils IS NULL
     AND override_reason   IS NULL
     AND override_by       IS NULL
     AND override_at       IS NULL);

-- 2) Make balance_ils explicitly derived (never an independent duplicate truth)
ALTER TABLE public.member_subscriptions
  ADD CONSTRAINT ms_balance_is_derived
  CHECK (balance_ils = due_amount_ils - paid_amount_ils);

COMMENT ON CONSTRAINT ms_no_independent_paid_authority ON public.member_subscriptions IS
  'P0/V3 · Law 3 — annual subscription paid has ONE authoritative origin (paid_amount_ils). The override columns can never carry a competing truth.';
COMMENT ON CONSTRAINT ms_balance_is_derived ON public.member_subscriptions IS
  'P0/V3 · Law 3 — balance_ils is explicitly derived (= due_amount_ils − paid_amount_ils) and can never diverge from its single source.';
