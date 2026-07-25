/* CCR-001 IG-008 — tests for the GENUINE consistency verifier (FC-003 · FD-006).
   The register's acceptance criterion: the verifier must PASS on a conformant
   build and FAIL when a surface is deliberately perturbed — proving it compares
   independently computed paths, unlike the old FIN↔FIN2 self-comparison.
   Loads the real fin.js. Usage: node tests/consistency-verifier.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,
  FinContract: {           /* consistent stub: net = food + deficit (identity holds) */
    foodBalance: () => 812.34, diwanBalance: () => 402.5,
    foodDeficitRemaining: () => -640.25, foodNetPosition: () => 172.09,
  },
};
global.today = () => '2026-07-24';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

/* Rich conformant envelope: debtor with waterfall settlements, credit member,
   historical-only debtor, write-off member, member food donation (ق5 split),
   closed-year auto-designated donation. */
global.DB = {
  members: [
    { id: 'M1', member_code: '1', name: 'مدين متدرّج', is_active: true, historical_balance_ils: 600, historical_payments_ils: 0 },
    { id: 'M2', member_code: '2', name: 'دائن',        is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'M3', member_code: '3', name: 'تاريخي فقط',  is_active: true, historical_balance_ils: 350, historical_payments_ils: 100 },
    { id: 'M4', member_code: '4', name: 'مشطوب',       is_active: true, historical_balance_ils: 300, historical_payments_ils: 0 },
  ],
  subscriptions: [
    { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'M2', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
  ],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M1', amount_ils: 400, receipt_date: '2026-03-01' },
    { id: 'r2', no: '102', is_deleted: false, fund_type: 'food', member_id: 'M2', amount_ils: 300, receipt_date: '2026-03-02' },
    { id: 'p0', no: '103', is_deleted: false, fund_type: 'diwan', payer_name: 'زائر', amount_ils: 80, receipt_date: '2026-04-01' },
    /* ق5: member food-display donation in a CLOSED year (auto member designation preserved) */
    { id: 'd1', no: '201', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food', member_id: 'M3', amount_ils: 150, receipt_date: '2024-06-01' },
    /* open-year non-member food donation (current support) */
    { id: 'd2', no: '202', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food', payer_name: 'فاعل', amount_ils: 90, receipt_date: '2026-05-05', food_donation_allocation: 'support_current' },
  ],
  payments: [
    { id: 'q1', no: '301', is_deleted: false, fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 60, payment_date: '2026-03-15', expense_type: 'food' },
  ],
  member_write_offs: [
    { id: 'w1', no: 'WO1', is_deleted: false, movement_type: 'debt_write_off', member_id: 'M4', amount_ils: 300, receipt_date: '2026-06-01' },
  ],
  refunds: [], _alloc: null,
};

/* 1 · Conformant build → verifier passes (every check true) */
(() => {
  const v = FIN.verifyConsistency();
  ok(v.allMatch === true, 'conformant build: allMatch = true');
  ok(v.failedMembers.length === 0 && v.memberCount === 4, 'conformant build: 4 members × 5 identities, zero failures');
  ok(v.checks.length >= 7 && v.checks.every(c => c.match), 'conformant build: all ' + v.checks.length + ' checks match');
})();

/* 2 · Perturb the debt-report surface (row drifted) → verifier FAILS */
(() => {
  const orig = FIN.debtReportRows;
  FIN.debtReportRows = function (o) {
    const m = orig.call(FIN, o);
    const r = m.rows.find(x => x.id === 'M1'); if (r) r.current = r.current + 7;
    return m;
  };
  const v = FIN.verifyConsistency();
  FIN.debtReportRows = orig;
  ok(v.allMatch === false, 'perturbed debt-report row → allMatch = false');
  ok(v.failedMembers.some(f => f.id === 'M1' && f.fails.includes('debt-report')), 'M1 flagged with debt-report mismatch');
})();

/* 3 · Perturb the delinquency surface → verifier FAILS */
(() => {
  const orig = FIN.memberDelinquency;
  FIN.memberDelinquency = function (id) { const d = orig.call(FIN, id); d.outstanding = Number(d.outstanding) + 3; return d; };
  const v = FIN.verifyConsistency();
  FIN.memberDelinquency = orig;
  ok(v.allMatch === false && v.failedMembers.length === 4, 'perturbed delinquency → every member flagged');
})();

/* 4 · Perturb the waterfall (allocation remaining drifted) → verifier FAILS */
(() => {
  const orig = FIN.memberAllocation;
  FIN.memberAllocation = function (id) {
    const a = orig.call(FIN, id);
    if (id === 'M3' && a && a.historical) a.historical.remaining = Number(a.historical.remaining) + 10;
    return a;
  };
  const v = FIN.verifyConsistency();
  FIN.memberAllocation = orig;
  ok(v.allMatch === false && v.failedMembers.some(f => f.id === 'M3' && f.fails.includes('waterfall')),
    'perturbed waterfall remaining → M3 flagged with waterfall mismatch');
})();

/* 5 · Perturb a treasury identity (net position drifted) → verifier FAILS */
(() => {
  const orig = FIN.foodNetPosition;
  FIN.foodNetPosition = () => 172.09 + 5;
  const v = FIN.verifyConsistency();
  FIN.foodNetPosition = orig;
  ok(v.allMatch === false && v.checks.some(c => c.k.includes('صافي مركز') && !c.match),
    'perturbed net food position → treasury identity check fails');
})();

/* 6 · Perturb item-9 conservation (split leaks value) → verifier FAILS */
(() => {
  const orig = FIN.allocateFoodDonations;
  FIN.allocateFoodDonations = function () {
    const a = orig.call(FIN);
    const copy = JSON.parse(JSON.stringify(a));       /* never mutate the engine's memo */
    const id = Object.keys(copy.perReceipt)[0];
    if (id) copy.perReceipt[id].toCurrent = Number(copy.perReceipt[id].toCurrent || 0) + 2;
    return copy;
  };
  const v = FIN.verifyConsistency();
  FIN.allocateFoodDonations = orig;
  ok(v.allMatch === false && v.checks.some(c => c.k.includes('قانون الحفظ') && !c.match),
    'perturbed receipt split → conservation check fails');
})();

/* 7 · Verifier restored → passes again (perturbations were test-local) */
(() => {
  const v = FIN.verifyConsistency();
  ok(v.allMatch === true, 'after restoring: conformant again (verifier is read-only)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
