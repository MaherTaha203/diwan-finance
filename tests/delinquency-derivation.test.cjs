/* CCR-001 IG-003 — constitutional tests for FD-007/FD-001 delinquency derivation.
   Rule: delinquency = REAL outstanding balance (settled ⇔ outstanding ≤ 0); per-year
   settled status derives from the FD-002 waterfall (IG-001), so payments made as food
   receipts settle years oldest-first, and historical-only debtors ARE delinquent.
   Loads the real fin.js + allocation-engine.js. Usage: node tests/delinquency-derivation.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2024,
};
global.today = () => '2026-07-24';
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

function makeDB(o) {
  return Object.assign({
    members: [{ id: 'M1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
    subscriptions: [], receipts: [], payments: [], member_write_offs: [], refunds: [], _alloc: null,
  }, o);
}
const sub = (y, due, paid) => ({ member_id: 'M1', year: y, due_amount_ils: due, paid_amount_ils: paid || 0 });
const foodRec = (id, amt, date) => ({ id, no: id, is_deleted: false, fund_type: 'food', member_id: 'M1',
  amount: amt, amount_ils: amt, receipt_date: date || '2026-05-01' });

/* 1 · FD-002 golden through delinquency: hist 600, 2025=200, 2026=200, food receipt 400
      → BOTH years settled by the waterfall; historical 600 remains; member IS delinquent. */
(() => {
  global.DB = makeDB({
    members: [{ id: 'M1', name: 'م', is_active: true, historical_balance_ils: 600, historical_payments_ils: 0 }],
    subscriptions: [sub(2025, 200), sub(2026, 200)],
    receipts: [foodRec('r1', 400)],
  });
  const d = FIN.memberDelinquency('M1');
  ok(d.byYear[2025].settled === true && d.byYear[2026].settled === true,
    'T1: food receipt 400 settles 2025 then 2026 (oldest-first waterfall)');
  ok(R2(d.historicalRemaining) === 600, 'T1: historical carried balance untouched (600)');
  ok(d.isDelinquent === true && R2(d.outstanding) === 600, 'T1: still delinquent — real outstanding 600 (FD-007)');
  ok(d.unpaidCount === 0, 'T1: unpaid subscription years = 0 (both covered)');
})();

/* 2 · +100 more → historical 600 → 500 (FD-002 step 2) */
(() => {
  global.DB = makeDB({
    members: [{ id: 'M1', name: 'م', is_active: true, historical_balance_ils: 600, historical_payments_ils: 0 }],
    subscriptions: [sub(2025, 200), sub(2026, 200)],
    receipts: [foodRec('r1', 400), foodRec('r2', 100, '2026-06-01')],
  });
  const d = FIN.memberDelinquency('M1');
  ok(R2(d.historicalRemaining) === 500 && R2(d.outstanding) === 500, 'T2: +100 reduces historical to 500');
})();

/* 3 · Historical-only debtor (no subscriptions) IS delinquent — closes prior gap A-10 */
(() => {
  global.DB = makeDB({
    members: [{ id: 'M1', name: 'م', is_active: true, historical_balance_ils: 350, historical_payments_ils: 0 }],
  });
  const d = FIN.memberDelinquency('M1');
  ok(d.isDelinquent === true && R2(d.outstanding) === 350, 'T3: historical-only debtor is delinquent (FD-007)');
})();

/* 4 · Stored (attributed) subscription payments keep their targets (FD-003) */
(() => {
  global.DB = makeDB({ subscriptions: [sub(2025, 200, 200), sub(2026, 200, 50)] });
  const d = FIN.memberDelinquency('M1');
  ok(d.byYear[2025].settled === true && d.byYear[2026].settled === false && R2(d.byYear[2026].remaining) === 150,
    'T4: stored per-year paid preserved — 2025 settled, 2026 remaining 150');
  ok(d.unpaidCount === 1 && d.isDelinquent === true, 'T4: one unpaid year; delinquent');
})();

/* 5 · Fully settled / credit member is NOT delinquent (FD-001: outstanding ≤ 0) */
(() => {
  global.DB = makeDB({ subscriptions: [sub(2026, 200)], receipts: [foodRec('r1', 300)] });
  const d = FIN.memberDelinquency('M1');
  ok(d.isDelinquent === false && R2(d.outstanding) === -100, 'T5: overpaid member (credit 100) is settled, not delinquent');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
