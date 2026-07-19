-- ═══════════════════════════════════════════════════════════════════════════
-- P0 · V6 — Explicit Classification of the ق5 Transfer Event   (integration evidence)
-- Constitution: Law 4 (Explicit Classification · "Never Guess")
-- ───────────────────────────────────────────────────────────────────────────
-- Integration check against the REAL production schema proving that promoting the
-- ق5 transfer to a first-class accounting event (movement_type
-- 'q5_debt_settlement_transfer') changed NO historical data and required NO
-- migration: the event is automatic/derived (its amount comes from the single-source
-- Item-9 allocation at read time) and is never persisted on any stored row.
--
-- Read-only. Run:  psql "$DATABASE_URL" -f tests/constitutional-explicit-q5-integration.sql
-- Expected: B/C/D = 0 (no persisted promoted type, no directly-encoded transfer rows).
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  'A · rows the ق5 transfer derives from (member food-display cash donations)' AS check,
  (SELECT count(*) FROM public.receipts
     WHERE NOT is_deleted AND fund_type='donation' AND donation_display_fund='food'
       AND member_id IS NOT NULL AND destination_treasury='food')::text AS value
UNION ALL
SELECT 'B · receipts persisting the promoted movement_type (must be 0 — no migration)',
  (SELECT count(*) FROM public.receipts WHERE movement_type='q5_debt_settlement_transfer')::text
UNION ALL
SELECT 'C · payments persisting the promoted movement_type (must be 0 — no migration)',
  (SELECT count(*) FROM public.payments WHERE movement_type='q5_debt_settlement_transfer')::text
UNION ALL
SELECT 'D · rows encoding the transfer directly on stored data (must be 0 — derived only)',
  (SELECT count(*) FROM public.receipts WHERE source_treasury='food' AND destination_treasury='historical_deficit')::text;
