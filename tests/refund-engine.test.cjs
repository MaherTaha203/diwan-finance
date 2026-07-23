/* MODEL2 V2.0 · Slice 4 — unit tests for the pure Refund Engine (CA-005 / ADR-005 / OD-05).
   Verifies first-class refund: eligibility, full/partial, currency-preserving (Law 10),
   origin-treasury funding (Law 8), remaining cap, closed-period bar (Law 11), and that the
   origin is never mutated (Law 5). Usage: node tests/refund-engine.test.cjs */
'use strict';
const RE = require('../public/js/refund-engine.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* an origin ILS receipt of 500 into the food treasury */
const origin = Object.freeze({ id: 'r1', no: 'REC-1', is_deleted: false, amount: 500, amount_ils: 500,
  currency: 'ILS', exchange_rate: 1, destination_treasury: 'food', payer_name: 'Member A', member_id: 'm1', receipt_date: '2026-05-01' });

/* 1 · full refund → new voucher, origin treasury, full amount, remaining 0 */
(() => {
  const r = RE.computeRefund({ origin, amountILS: 500, priorRefundedILS: 0, locked: false });
  ok(r.ok && r.row.movement_type === 'refund' && r.row.is_refund === true, 'full: is a first-class refund voucher');
  ok(r.row.destination_treasury === 'food', 'full: funded from the ORIGIN treasury (Law 8)');
  ok(r.row.amount_ils === 500 && r.row.origin_receipt_id === 'r1' && r.row.linked_receipt === 'REC-1', 'full: amount 500 linked to origin');
  ok(r.remainingAfter === 0 && r.isFull === true, 'full: remaining 0 · isFull');
})();

/* 2 · partial refund → remaining tracked */
(() => {
  const r = RE.computeRefund({ origin, amountILS: 200, priorRefundedILS: 0, locked: false });
  ok(r.ok && r.row.amount_ils === 200 && r.remainingAfter === 300 && r.isFull === false, 'partial 200 → remaining 300');
})();

/* 3 · second partial capped at remaining (Law 1/10) */
(() => {
  const r = RE.computeRefund({ origin, amountILS: 350, priorRefundedILS: 200, locked: false });
  ok(!r.ok && r.code === 'E_EXCEEDS', 'exceeds remaining (500-200=300 < 350) → E_EXCEEDS');
  const r2 = RE.computeRefund({ origin, amountILS: 300, priorRefundedILS: 200, locked: false });
  ok(r2.ok && r2.remainingAfter === 0 && r2.isFull === true, 'exact remaining 300 → allowed, remaining 0');
})();

/* 4 · fully refunded already → ineligible */
ok(RE.computeRefund({ origin, amountILS: 10, priorRefundedILS: 500, locked: false }).code === 'E_INELIGIBLE', 'already fully refunded → E_INELIGIBLE');

/* 5 · closed period → prohibited (Law 11) */
ok(RE.computeRefund({ origin, amountILS: 100, priorRefundedILS: 0, locked: true }).code === 'E_LOCKED', 'locked origin period → E_LOCKED');

/* 6 · non-positive / deleted origin */
ok(RE.computeRefund({ origin, amountILS: 0, priorRefundedILS: 0, locked: false }).code === 'E_AMOUNT', 'amount 0 → E_AMOUNT');
ok(RE.computeRefund({ origin: Object.assign({}, origin, { is_deleted: true }), amountILS: 100 }).code === 'E_INELIGIBLE', 'deleted origin → E_INELIGIBLE');

/* 7 · currency-preserving (Law 10): 30 USD @3.7 = 111 ILS; refund 55.5 ILS → 15 USD */
(() => {
  const fx = Object.assign({}, origin, { amount: 30, amount_ils: 111, currency: 'USD', exchange_rate: 3.7 });
  const r = RE.computeRefund({ origin: fx, amountILS: 55.5, priorRefundedILS: 0, locked: false });
  ok(r.ok && r.row.currency === 'USD' && r.row.exchange_rate === 3.7 && r.row.amount === 15 && r.row.amount_ils === 55.5,
    'currency-preserving: 55.5 ILS → 15 USD (proportional native, same currency/rate)');
})();

/* 8 · immutability (Law 5): origin unchanged; row frozen */
(() => {
  const snap = JSON.stringify(origin);
  const r = RE.computeRefund({ origin, amountILS: 100, priorRefundedILS: 0, locked: false });
  ok(JSON.stringify(origin) === snap, 'origin receipt is never mutated (Law 5)');
  let frozen = true; try { r.row.amount_ils = 999; if (r.row.amount_ils === 999) frozen = false; } catch (_) {}
  ok(frozen, 'proposed refund row is frozen (immutable)');
})();

/* 9 · refundedTotal helper sums only live refunds linked to the origin */
(() => {
  const pays = [
    { movement_type: 'refund', origin_receipt_id: 'r1', amount_ils: 100, is_deleted: false },
    { movement_type: 'refund', origin_receipt_id: 'r1', amount_ils: 50, is_deleted: true },   /* voided → excluded */
    { movement_type: 'refund', origin_receipt_id: 'r9', amount_ils: 70, is_deleted: false },  /* other origin */
    { movement_type: 'food_expense', origin_receipt_id: 'r1', amount_ils: 30, is_deleted: false }
  ];
  ok(RE.refundedTotal('r1', pays) === 100, 'refundedTotal r1 = 100 (live refunds only)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
