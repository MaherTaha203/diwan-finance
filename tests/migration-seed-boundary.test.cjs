/* DEBT-RECON-001 — migration seed source-boundary regression.
   Imported paid_amount_ils excess must not enter the live FD-002 pool. It settles
   historical debt first, then only later annual years, then remains credit. Live
   receipts still use FD-002 (oldest annual year first, historical last). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: 0, LOCKED_THROUGH_YEAR: 2025, RECEIPT_ALLOCATION_ENABLED: false
};
global.today = () => '2026-10-17';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

global.DB = {
  members: [
    { id: 'B', member_code: 'B', name: 'migration-overflow', is_active: true, historical_balance_ils: 2200, historical_payments_ils: 900 },
    { id: 'C', member_code: 'C', name: 'migration-partial', is_active: true, historical_balance_ils: 2200, historical_payments_ils: 2000 },
    { id: 'D', member_code: 'D', name: 'historical-cleared', is_active: true, historical_balance_ils: 200, historical_payments_ils: 200 },
    { id: 'E', member_code: 'E', name: 'migration-credit', is_active: true, historical_balance_ils: 200, historical_payments_ils: 0 },
    { id: 'A', member_code: 'A', name: 'live-receipt', is_active: true, historical_balance_ils: 600, historical_payments_ils: 0 }
  ],
  subscriptions: [
    { member_id: 'B', year: 2025, due_amount_ils: 200, paid_amount_ils: 1110 },
    { member_id: 'B', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'C', year: 2025, due_amount_ils: 200, paid_amount_ils: 435 },
    { member_id: 'C', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'D', year: 2025, due_amount_ils: 200, paid_amount_ils: 500 },
    { member_id: 'D', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'D', year: 2027, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'E', year: 2025, due_amount_ils: 200, paid_amount_ils: 1000 },
    { member_id: 'E', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'A', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'A', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }
  ],
  receipts: [
    { id: 'live-A', no: 'R-A', is_deleted: false, fund_type: 'food', member_id: 'A', amount_ils: 400, receipt_date: '2026-06-18' }
  ],
  payments: [], member_write_offs: [], refunds: [], allocation_records: [],
  historical_subscription_truth: [], annual: [], _alloc: null
};

function assertConservation(id, label) {
  const al = FIN.memberAllocation(id);
  const outstanding = FIN.memberStatement(id).finalBalance;
  const rem = Object.values(al.perYear).reduce((s, y) => s + Number(y.remaining || 0), 0)
    + Number(al.historical.remaining || 0) - Number(al.creditRemaining || 0);
  ok(eq(rem, outstanding), label + ': allocation identity equals memberStatement.finalBalance');
}

/* 1 — migrated 2025 cash above the annual due pays historical debt, not 2026. */
const b = FIN.memberDelinquency('B').byYear;
const bAlloc = FIN.memberAllocation('B');
ok(eq(b[2025].paid, 200) && eq(b[2026].paid, 0) && b[2026].status === 'unpaid',
  '1110 imported 2025 payment → 2025 paid 200, 2026 unpaid');
ok(eq(bAlloc.historical.remaining, 390), 'historical 1300 less 910 imported overflow = 390 remaining');
ok(eq(FIN.debtReportRows({ years: null, filter: 'all' }).rows.find(r => r.id === 'B').selPaid, 200),
  'Annual Debt report uses canonical attributed per-year paid, not raw imported 1110');
assertConservation('B', 'B');

/* 2 — partial owner truth is explained by the remaining 35 after historical debt is cleared. */
const c = FIN.memberDelinquency('C').byYear;
const cAlloc = FIN.memberAllocation('C');
ok(eq(c[2026].paid, 35) && c[2026].status === 'partial' && c[2026].settled === false,
  '435 imported 2025 payment → 200 historical + 35 toward 2026 (partial)');
ok(eq(cAlloc.historical.remaining, 0) && eq(c[2026].remaining, 165),
  'historical debt reaches zero before the remaining 2026 dues');
assertConservation('C', 'C');

/* 3 — once historical debt is zero, imported overflow advances only to later years. */
const d = FIN.memberDelinquency('D').byYear;
ok(eq(d[2025].paid, 200) && eq(d[2026].paid, 200) && eq(d[2027].paid, 100),
  '500 imported 2025 payment after historical clearance → 2026 then 2027');
assertConservation('D', 'D');

/* 4 — overflow beyond historical + later dues remains member credit, not duplicated. */
const e = FIN.memberAllocation('E');
ok(eq(e.creditRemaining, 400) && eq(FIN.memberStatement('E').finalBalance, -400),
  'excess after historical and future dues remains exactly 400 credit');
assertConservation('E', 'E');

/* 5 — live cash still uses the certified FD-002 annual-oldest-first waterfall. */
const a = FIN.memberDelinquency('A').byYear;
const aAlloc = FIN.memberAllocation('A');
ok(eq(a[2025].paid, 200) && eq(a[2026].paid, 200) && eq(aAlloc.historical.remaining, 600),
  'live receipt 400 → 2025 + 2026, historical remains untouched');
assertConservation('A', 'A');

/* 6 — an immutable explicit historical line and migration overflow must not double-settle history. */
window.RECEIPT_ALLOCATION_ENABLED = true;
DB.members.push({ id: 'F', member_code: 'F', name: 'explicit-plus-seed', is_active: true,
  historical_balance_ils: 200, historical_payments_ils: 0 });
DB.subscriptions.push(
  { member_id: 'F', year: 2025, due_amount_ils: 200, paid_amount_ils: 300 },
  { member_id: 'F', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }
);
DB.receipts.push({ id: 'F-explicit', no: 'R-F', is_deleted: false, fund_type: 'food',
  member_id: 'F', amount_ils: 100, receipt_date: '2026-06-19' });
DB.allocation_records.push({ id: 'F-line', source_ref: 'F-explicit', source_kind: 'receipt_settlement',
  member_id: 'F', obligation_kind: 'historical', year: null, amount_allocated: 100,
  voided_at: null, refunded_at: null });
DB._alloc = null;
const f = FIN.memberDelinquency('F').byYear;
const fAlloc = FIN.memberAllocation('F');
ok(eq(f[2025].paid, 200) && eq(f[2026].paid, 0),
  'explicit historical line + imported overflow settle history before 2026');
ok(eq(fAlloc.historical.remaining, 0),
  'explicit history 100 + seed overflow 100 clear historical debt exactly once');
ok(eq(FIN.memberStatement('F').finalBalance, 200),
  'explicit historical line and migration seed preserve final balance');
assertConservation('F', 'F');

/* 7 — exact PR-308 example: 500 with no historical debt pays 2025 + 2026 and leaves 100 credit. */
DB.members.push({ id: 'G', member_code: 'G', name: 'prepaid-100', is_active: true,
  historical_balance_ils: 0, historical_payments_ils: 0 });
DB.subscriptions.push(
  { member_id: 'G', year: 2025, due_amount_ils: 200, paid_amount_ils: 500 },
  { member_id: 'G', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }
);
const g = FIN.memberDelinquency('G').byYear;
const gAlloc = FIN.memberAllocation('G');
ok(eq(g[2025].paid, 200) && eq(g[2026].paid, 200),
  'PR-308 example: 500 with no historical debt settles 2025 and 2026');
ok(eq(gAlloc.creditRemaining, 100) && eq(FIN.memberStatement('G').finalBalance, -100),
  'PR-308 example: remaining 100 is preserved as member prepaid credit');
assertConservation('G', 'G');

/* 8 — exact PR-308 example: 600 with 200 historical debt settles 2025, 2026, and history. */
DB.members.push({ id: 'H', member_code: 'H', name: 'historical-200', is_active: true,
  historical_balance_ils: 200, historical_payments_ils: 0 });
DB.subscriptions.push(
  { member_id: 'H', year: 2025, due_amount_ils: 200, paid_amount_ils: 600 },
  { member_id: 'H', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }
);
const h = FIN.memberDelinquency('H').byYear;
const hAlloc = FIN.memberAllocation('H');
ok(eq(h[2025].paid, 200) && eq(h[2026].paid, 200),
  'PR-308 example: 600 with 200 historical debt settles 2025 and 2026');
ok(eq(hAlloc.historical.remaining, 0) && eq(hAlloc.creditRemaining, 0),
  'PR-308 example: the remaining 200 clears historical debt with no double count');
assertConservation('H', 'H');

console.log('\n' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
