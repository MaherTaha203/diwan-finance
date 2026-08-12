/* P-DEFICIT-SPLIT — a Food receipt's accountant-designated Historical-Deficit slice must
   fund the Historical-Deficit treasury (not stay in Food) AND reduce the member's
   historical debt by the SAME amount; the member statement must show the split.
   Owner accounting decision:
     receipt = food_share + historical_share
     food_share       → Food treasury
     historical_share → Historical-Deficit treasury  AND  historical debt − historical_share
   Invariant: Historical-Deficit treasury movement == historical-debt reduction (exactly).
   Loads the REAL engine (utils→model2→foodDonationAllocation→fin2→fin→fin-contract→report-model).
   Usage: node tests/food-receipt-deficit-split.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

/* load the full engine + report-model in one browser-equivalent scope */
function load(DB) {
  const window = { RECEIPT_ALLOCATION_ENABLED: true, LANG: 'ar',
    FOOD_OPENING: 0, DIWAN_OPENING: 0,
    TREASURY_OPENINGS: { food: 0, diwan: 0, historical_deficit: 0 } };
  const L = new Proxy({}, { get: () => (() => '') });
  const documentStub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorageStub = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [
    rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'), rd('fin.js'),
    'window.FIN = FIN; window.DB = DB;', rd('fin-contract.js'), rd('report-model.js'),
    ';return { FIN: FIN, FIN2: window.FIN2, ReportModels: window.ReportModels };'
  ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, documentStub, localStorageStub);
}

/* fixture: one member (historical debt = histBal), one 2025 subscription (due 200),
   one Food settlement receipt of `amount` with the given settlement lines. */
function build({ amount, lines, deleted = false }) {
  const receipt = { id: 'R1', no: 'REC-1', is_deleted: deleted, fund_type: 'food',
    movement_type: 'subscription_payment', destination_treasury: 'food', member_id: 'M1',
    amount_ils: amount, receipt_date: '2026-08-11' };
  return {
    members: [{ id: 'M1', name: 'عضو', is_active: true, historical_balance_ils: 500, historical_payments_ils: 0 }],
    subscriptions: [{ member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 }],
    receipts: [receipt], payments: [], member_write_offs: [], refunds: [], internal_transfers: [],
    inkind_donations: [], historical_subscription_truth: [], allocation_records: lines, _alloc: null,
  };
}
const L = (kind, amt, extra) => Object.assign({ id: kind + amt, source_ref: 'R1', source_kind: 'receipt_settlement',
  member_id: 'M1', obligation_kind: kind, year: kind === 'due' ? 2025 : null, amount_allocated: amt,
  voided_at: null, refunded_at: null }, extra || {});

const food = e => e.FIN2.foodTreasury();
const deficit = e => e.FIN2.historicalDeficitTreasury();
const histRemain = e => e.FIN.memberAllocation('M1').historical.remaining;   /* 500 − reduction */
const histReduction = e => 500 - histRemain(e);

/* ── A · Food receipt, NO historical slice → all to Food, deficit 0, debt unchanged ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 100)] }));
  ok(eq(food(e), 100), 'A food treasury = 100');
  ok(eq(deficit(e), 0), 'A historical-deficit treasury = 0');
  ok(eq(histReduction(e), 0), 'A historical debt unchanged');
})();

/* ── B · 100 = 70 food + 30 historical → food +70, deficit +30, debt −30 ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 70), L('historical', 30)] }));
  ok(eq(food(e), 70), 'B food treasury = 70');
  ok(eq(deficit(e), 30), 'B historical-deficit treasury = 30');
  ok(eq(histReduction(e), 30), 'B historical debt reduced by 30');
  ok(eq(deficit(e), histReduction(e)), 'B INVARIANT: deficit movement == debt reduction');
  ok(eq(food(e) + deficit(e), 100), 'B food + deficit = receipt amount (no leak, no overshoot)');
  /* statement split */
  const secs = e.ReportModels.memberStatement('M1').sections;
  const ledger = secs.find(s => s.id === 'ledger');
  const dOf = r => (r.desc && r.desc.ar) ? r.desc.ar : String(r.desc || '');
  const histRow = ledger.rows.find(r => dOf(r).indexOf('تسوية عجز') >= 0);
  const foodRow = ledger.rows.find(r => r.pay === 70);
  ok(histRow && eq(histRow.pay, 30), 'B statement shows a Historical-Deficit row = 30');
  ok(!!foodRow, 'B statement shows a Food-contribution row = 70');
})();

/* ── C · Full historical (100) → food 0, deficit 100, debt −100 ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('historical', 100)] }));
  ok(eq(food(e), 0), 'C food treasury = 0');
  ok(eq(deficit(e), 100), 'C historical-deficit treasury = 100');
  ok(eq(histReduction(e), 100), 'C historical debt reduced by 100');
  ok(eq(deficit(e), histReduction(e)), 'C INVARIANT: deficit movement == debt reduction');
})();

/* ── D · No overshoot — food + historical never exceed the receipt amount ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 60), L('historical', 40)] }));
  ok(food(e) + deficit(e) <= 100 + 0.005 && eq(food(e) + deficit(e), 100), 'D food + deficit == amount (≤ amount)');
})();

/* ── E · No historical allocation ⇒ nothing enters the deficit treasury ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 100)] }));
  ok(eq(deficit(e), 0) && eq(histReduction(e), 0), 'E no historical line ⇒ deficit +0, debt unchanged');
})();

/* ── F · Cancel (receipt is_deleted) reverses food, deficit AND debt together ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 70), L('historical', 30)], deleted: true }));
  ok(eq(food(e), 0), 'F cancel: food reversed to 0');
  ok(eq(deficit(e), 0), 'F cancel: deficit reversed to 0');
  ok(eq(histReduction(e), 0), 'F cancel: historical debt restored');
})();

/* ── G · Refund of the historical settlement line reverses deficit + debt ── */
(() => {
  const e = load(build({ amount: 100, lines: [L('due', 70), L('historical', 30, { refunded_at: '2026-08-12T00:00:00Z' })] }));
  ok(eq(deficit(e), 0), 'G refund: deficit slice reversed to 0');
  ok(eq(histReduction(e), 0), 'G refund: historical debt restored');
  ok(eq(deficit(e), histReduction(e)), 'G INVARIANT holds after refund (0 == 0)');
})();

console.log('P-DEFICIT-SPLIT — Food receipt historical slice');
console.log('  checks: ' + pass + ' passed, ' + fail + ' failed');
fails.forEach(f => console.log('    FAIL ' + f));
process.exit(fail ? 1 : 0);
