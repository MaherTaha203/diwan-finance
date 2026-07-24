/* CCR-001 IG-006 — constitutional tests for the single debt-report row model
   (FC-003 · FD-006 identical figures on every surface · FD-013 no report-side
   derivation · merged IG-021 write-off component). Loads the real fin.js.
   Usage: node tests/debt-report-model.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,
};
global.today = () => '2026-07-24';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

global.DB = {
  members: [
    { id: 'M1', member_code: '11', name: 'مدين', is_active: true,  historical_balance_ils: 600, historical_payments_ils: 150 },
    { id: 'M2', member_code: '22', name: 'دائن', is_active: true,  historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'M3', member_code: '33', name: 'صفر',  is_active: true,  historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'M4', member_code: '44', name: 'مشطوب', is_active: true, historical_balance_ils: 300, historical_payments_ils: 0 },
    { id: 'MX', member_code: '99', name: 'غير نشط', is_active: false, historical_balance_ils: 50, historical_payments_ils: 0 },
  ],
  subscriptions: [
    { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 50 },
    { member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'M2', year: 2026, due_amount_ils: 200, paid_amount_ils: 200 },
    { member_id: 'M3', year: 2026, due_amount_ils: 200, paid_amount_ils: 200 },
  ],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M2', amount_ils: 100, receipt_date: '2026-03-01' }, /* M2 → credit 100 */
  ],
  payments: [],
  member_write_offs: [
    { id: 'w1', no: 'WO1', is_deleted: false, movement_type: 'debt_write_off', member_id: 'M4', amount_ils: 300, receipt_date: '2026-06-01' },
  ],
  refunds: [], _alloc: null,
};

/* 1 · Row identity (incl. write-offs): current = hist + duesAll − paidAll − resolutions */
(() => {
  const model = FIN.debtReportRows({ years: null, filter: 'all' });
  ok(model.rows.length === 4 && !model.rows.find(r => r.id === 'MX'), 'active-member roster only (4 rows, inactive excluded)');
  const allHold = model.rows.every(r => eq(R2(r.hist + r.duesAll - r.paidAll - r.resolutions), R2(r.current)));
  ok(allHold, 'identity holds for every row: hist + duesAll − paidAll − resolutions = current');
})();

/* 2 · Write-off member (IG-021): component visible, balance resolved */
(() => {
  const model = FIN.debtReportRows({ years: null, filter: 'all' });
  const w = model.rows.find(r => r.id === 'M4');
  ok(eq(w.writtenOff, 300) && eq(w.resolutions, 300) && eq(w.current, 0),
    'M4: 300 write-off appears as component; current = 0 (reconciles)');
})();

/* 3 · Engine values match memberStatement (single source, FD-013) */
(() => {
  const model = FIN.debtReportRows({ years: null, filter: 'all' });
  const m1 = model.rows.find(r => r.id === 'M1');
  const st = FIN.memberStatement('M1');
  ok(eq(m1.current, st.finalBalance) && eq(m1.hist, st.openingBalance) && eq(m1.duesAll, st.totalDues),
    'row figures = FIN.memberStatement figures (no report-side derivation)');
})();

/* 4 · Year selection: selSub/selPaid honour the selected-year set */
(() => {
  const model = FIN.debtReportRows({ years: new Set([2025]), filter: 'all' });
  const m1 = model.rows.find(r => r.id === 'M1');
  ok(eq(m1.selSub, 200) && eq(m1.selPaid, 50), 'M1 with {2025}: selSub 200 · selPaid 50');
  const all = FIN.debtReportRows({ years: null, filter: 'all' }).rows.find(r => r.id === 'M1');
  ok(eq(all.selSub, 400) && eq(all.selPaid, 50), 'M1 with all years: selSub 400 · selPaid 50');
  ok(eq(m1.current, all.current), 'year selection never changes the final balance (view filter only)');
})();

/* 5 · Category filters + sorting (same semantics on every surface) */
(() => {
  const debtors = FIN.debtReportRows({ years: null, filter: 'debtors' });
  ok(debtors.rows.every(r => r.current > 0.005) && debtors.totalMembers === 4, 'debtors filter + roster count');
  const creditors = FIN.debtReportRows({ years: null, filter: 'creditors' });
  ok(creditors.rows.length === 1 && creditors.rows[0].id === 'M2', 'creditors: M2 only (credit 100)');
  const zero = FIN.debtReportRows({ years: null, filter: 'zero' });
  ok(zero.rows.length === 2 && zero.rows.find(r => r.id === 'M3') && zero.rows.find(r => r.id === 'M4'),
    'zero balance: M3 + written-off M4');
  const all = FIN.debtReportRows({ years: null, filter: 'all' }).rows;
  ok(all.every((r, i) => i === 0 || all[i - 1].current >= r.current), 'rows sorted by current desc');
})();

/* 6 · FD-006 byte-equality: repeated calls with the same view state are identical
      (screen, print and Excel each call the model with the same state) */
(() => {
  const a = JSON.stringify(FIN.debtReportRows({ years: new Set([2025, 2026]), filter: 'all' }));
  const b = JSON.stringify(FIN.debtReportRows({ years: new Set([2025, 2026]), filter: 'all' }));
  ok(a === b, 'deterministic model: identical JSON for identical view state');
})();

/* 7 · Totals cover exactly the shown rows */
(() => {
  const model = FIN.debtReportRows({ years: null, filter: 'debtors' });
  const t = model.rows.reduce((x, r) => x + r.current, 0);
  ok(eq(model.totals.current, R2(t)), 'totals aggregate the filtered row set');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
