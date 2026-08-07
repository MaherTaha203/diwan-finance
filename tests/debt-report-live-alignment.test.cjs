/* P-DEBT-REPORT-ALIGNMENT-001 — Annual Debt per-year "paid" reader alignment.
   Proves the isolated report-reader correction:
     (A) a POST-LAUNCH receipt member (no stored subscription seed) shows the SAME
         live allocation the other surfaces already show — FIN.memberDelinquency
         .byYear[y].paid (FD-002 attribution of live receipts); and
     (B) a MIGRATION member (any stored paid_amount_ils) is FROZEN — selPaid stays
         the stored figure byte-identical (the historical dataset is never
         reinterpreted).
   Also asserts Final Balance (`current`) is untouched on both paths.
   Loads the real fin.js. Usage: node tests/debt-report-live-alignment.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000, LOCKED_THROUGH_YEAR: 2025, RECEIPT_ALLOCATION_ENABLED: true,
};
global.today = () => '2026-08-07';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

/* A = live-receipt member (إيهاب-shaped): stored paid 0, one 400 food receipt →
       FD-002 cascades 200/200 across 2025/2026.
   B = migration overpay member: stored paid 1110 on 2025 (frozen), no receipts. */
global.DB = {
  members: [
    { id: 'A', member_code: 'A', name: 'live', is_active: true, historical_balance_ils: 2200, historical_payments_ils: 600 },
    { id: 'B', member_code: 'B', name: 'migration', is_active: true, historical_balance_ils: 2200, historical_payments_ils: 900 },
  ],
  subscriptions: [
    { member_id: 'A', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'A', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'B', year: 2025, due_amount_ils: 200, paid_amount_ils: 1110 },
    { member_id: 'B', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
  ],
  receipts: [
    { id: 'rA', no: 'R-A', is_deleted: false, fund_type: 'food', member_id: 'A', amount_ils: 400, receipt_date: '2026-06-18' },
  ],
  payments: [], member_write_offs: [], refunds: [], allocation_records: [], historical_subscription_truth: [], _alloc: null,
};

const model = FIN.debtReportRows({ years: null, filter: 'all' });
const A = model.rows.find(r => r.id === 'A');
const B = model.rows.find(r => r.id === 'B');
const dA = FIN.memberDelinquency('A').byYear;

/* A — post-launch receipts: selPaid == the live allocation shown by Delinquent/Dues */
ok(eq(A.selPaid, 400), 'A live-receipt member: Annual Debt selPaid = 400 (was 0 before alignment)');
ok(eq(A.selPaid, Number((dA[2025] || {}).paid || 0) + Number((dA[2026] || {}).paid || 0)),
  'A selPaid == byYear.paid sum (same certified source as Delinquent / Dues)');
ok(eq(A.current, FIN.memberStatement('A').finalBalance), 'A current unchanged = memberStatement.finalBalance (Final Balance untouched)');

/* B — migration member: FROZEN, selPaid == stored paid_amount_ils, byte-identical */
ok(eq(B.selPaid, 1110), 'B migration member: selPaid = stored 1110 (FROZEN — not reinterpreted)');
ok(eq(B.current, FIN.memberStatement('B').finalBalance), 'B current = memberStatement.finalBalance (unchanged)');

/* Year filter still honoured on the live path (2025 only) */
const A25 = FIN.debtReportRows({ years: new Set([2025]), filter: 'all' }).rows.find(r => r.id === 'A');
ok(eq(A25.selPaid, 200), 'A with {2025}: selPaid = 200 (year filter honoured on the live path)');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
