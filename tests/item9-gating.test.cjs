/* CCR-001 IG-002 — constitutional tests for FD-008 designation gating (FC-003).
   Rule: only a donation EXPLICITLY designated to settle debt (manual allocation
   split) reduces member debt; a GENERAL donation never does. Scope (Rev A §B-5):
   applies to OPEN fiscal years; donations dated in CLOSED years (≤ locked year)
   keep their recognized historical effect unchanged (FD-004).
   Loads the real fin.js + foodDonationAllocation.js. Usage: node tests/item9-gating.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* environment fin.js expects at call time */
global.window = {
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,          /* 2025 and earlier = CLOSED · 2026+ = OPEN */
};
global.today = () => '2026-07-24';

const finSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8');
const FIN = vm.runInThisContext(finSrc + ';FIN');

/* fixture: one member with a 400 historical debt; fresh DB per scenario (memoized _alloc) */
function makeDB(receipts) {
  return {
    members: [{ id: 'M1', name: 'عضو', is_active: true, historical_balance_ils: 400, historical_payments_ils: 0 }],
    subscriptions: [], payments: [], member_write_offs: [], refunds: [],
    receipts,
    _alloc: null,
  };
}
const don = (id, date, extra) => Object.assign({
  id, receipt_date: date, fund_type: 'donation', donation_display_fund: 'food',
  member_id: 'M1', amount_ils: 500, amount: 500, food_donation_allocation: 'support_current',
}, extra || {});

/* 1 · CLOSED-year general donation → historical effect PRESERVED (FD-004) */
(() => {
  global.DB = makeDB([don('d1', '2025-06-01')]);
  const a = FIN.allocateFoodDonations();
  ok(a.perReceipt.d1.debtSettled === 400 && a.perReceipt.d1.toCurrent === 100,
    'closed year (2025): auto donation keeps recognized debt settlement (400) + current (100)');
  ok(R2(FIN.memberStatement('M1').finalBalance) === 0, 'closed year: member balance 400 → 0 (preserved)');
})();

/* 2 · OPEN-year GENERAL donation → NEVER settles debt (FD-008) */
(() => {
  global.DB = makeDB([don('d2', '2026-06-01')]);
  const a = FIN.allocateFoodDonations();
  ok(a.perReceipt.d2.debtSettled === 0 && a.perReceipt.d2.toCurrent === 500,
    'open year (2026): general donation settles NOTHING — full 500 to current support');
  ok(R2(FIN.memberStatement('M1').finalBalance) === 400, 'open year: member debt unchanged (400)');
})();

/* 3 · OPEN-year donation with EXPLICIT designation (manual split) → settles per designation */
(() => {
  global.DB = makeDB([don('d3', '2026-06-01', {
    manual_allocation: true, manual_debt_settlement: 150, manual_historical_donation: 0, manual_current_support: 350,
  })]);
  const a = FIN.allocateFoodDonations();
  ok(a.perReceipt.d3.debtSettled === 150 && a.perReceipt.d3.toCurrent === 350,
    'open year: EXPLICITLY designated slice settles exactly 150; 350 stays donation');
  ok(R2(FIN.memberStatement('M1').finalBalance) === 250, 'open year designated: member debt 400 → 250');
})();

/* 4 · reduce_deficit general donation in an open year: no debt slice; full amount to deficit */
(() => {
  global.DB = makeDB([don('d4', '2026-06-01', { food_donation_allocation: 'reduce_deficit' })]);
  const a = FIN.allocateFoodDonations();
  ok(a.perReceipt.d4.debtSettled === 0 && a.perReceipt.d4.toDeficit === 500,
    'open year: general deficit-directed donation → 0 debt, 500 to deficit reserve');
})();

/* 5 · conservation: slices always sum to the donation amount */
(() => {
  global.DB = makeDB([don('d5', '2025-03-01'), don('d6', '2026-03-01'),
    don('d7', '2026-04-01', { manual_allocation: true, manual_debt_settlement: 100, manual_historical_donation: 200, manual_current_support: 200 })]);
  const a = FIN.allocateFoodDonations();
  ['d5', 'd6', 'd7'].forEach(id => {
    const s = a.perReceipt[id];
    ok(R2(s.debtSettled + s.toDeficit + s.toCurrent) === 500, 'conservation: ' + id + ' slices sum to 500');
  });
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
