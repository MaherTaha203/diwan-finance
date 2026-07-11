-- P2-C: additive classification layer + owner-approved reclassification data
-- (FMD-01 / Execution Order V2.0 / ق1(أ) / ق2 / ق3).
-- Applied to production 2026-07-11 via MCP (migration name: p2c_classification_layer)
-- and the guarded data block below. Recorded here as the permanent repo copy.
--
-- GUARANTEES (owner, 2026-07-11):
--   * History untouched: only NEW nullable columns are added; no existing column
--     or row value is modified. Verified post-write: original-column md5s
--     byte-identical (202018d9 / ab74ce2a / 527e80a7 / e3013fa4).
--   * Idempotent: every UPDATE is guarded WHERE movement_type IS NULL; re-running
--     the whole block changes nothing (classification-state md5 4f21d0c7… stable).
--   * Ledger of record: docs/evidence/APPENDIX_A_RECLASSIFICATION_LEDGER.md.

-- ── DDL: classification layer (additive, nullable) ──────────────────────────
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS movement_type        text,
  ADD COLUMN IF NOT EXISTS destination_treasury text,
  ADD COLUMN IF NOT EXISTS source_treasury      text,
  ADD COLUMN IF NOT EXISTS movement_reason      text,
  ADD COLUMN IF NOT EXISTS register_category    text;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS movement_type        text,
  ADD COLUMN IF NOT EXISTS destination_treasury text,
  ADD COLUMN IF NOT EXISTS source_treasury      text,
  ADD COLUMN IF NOT EXISTS movement_reason      text;

-- ── DATA: guarded, idempotent classification (matches MIGRATE2 + Appendix A) ─
-- ق2: member food receipts = Member Payment -> Food treasury
UPDATE receipts SET movement_type='subscription_payment', destination_treasury='food', movement_reason='member_food_payment'
WHERE movement_type IS NULL AND fund_type='food' AND payer_type='member';

UPDATE receipts SET movement_type='donation_cash', destination_treasury='food', movement_reason='nonmember_food_donation'
WHERE movement_type IS NULL AND fund_type='food' AND (payer_type IS DISTINCT FROM 'member');

UPDATE receipts SET movement_type='donation_cash', destination_treasury='diwan', movement_reason='diwan_donation'
WHERE movement_type IS NULL AND fund_type='diwan';

-- Appendix A (owner-approved, per voucher):
UPDATE receipts SET movement_type='donation_cash', destination_treasury='historical_deficit', movement_reason='owner_ledger_cash'
WHERE movement_type IS NULL AND no='REC-00058';

UPDATE receipts SET movement_type='donation_inkind', destination_treasury=NULL, movement_reason='owner_ledger_inkind', register_category='other'
WHERE movement_type IS NULL AND no IN ('REC-00004','REC-00007');

UPDATE receipts SET movement_type='donation_inkind', destination_treasury=NULL, movement_reason='owner_ledger_service', register_category='maintenance'
WHERE movement_type IS NULL AND no IN ('REC-00026','REC-00003','REC-00025');

UPDATE receipts SET movement_type='donation_inkind', destination_treasury=NULL, movement_reason='owner_ledger_service', register_category='professional_services'
WHERE movement_type IS NULL AND no IN ('REC-00031','REC-00009');

-- deleted & unresolved donation vouchers: inert non-cash marker (م.7)
UPDATE receipts SET movement_type='reclassification', destination_treasury=NULL, movement_reason='deleted_unresolved'
WHERE movement_type IS NULL AND fund_type='donation' AND is_deleted IS TRUE;

UPDATE payments SET movement_type='food_expense', destination_treasury='food', movement_reason='food_expense'
WHERE movement_type IS NULL AND fund_type='food';

UPDATE payments SET movement_type='diwan_expense', destination_treasury='diwan', movement_reason='diwan_expense'
WHERE movement_type IS NULL AND fund_type='diwan';
