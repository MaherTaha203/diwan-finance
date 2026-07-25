/* CCR-001 IG-013 — constitutional tests for the FD-010 probable-duplicate probe.
   Rule: duplicates are PERMITTED but must raise a strong warning at entry.
   The probe (FIN.findProbableDuplicates) is the engine predicate the entry UI
   confirms against: same fund + same payer identity + same ILS accounting
   amount (±0.005) + receipt date within the window (default 7 days).
   Loads the real fin.js. Usage: node tests/duplicate-warning.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000, LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 0, diwanBalance: () => 0, foodDeficitRemaining: () => 0, foodNetPosition: () => 0 },
};
global.today = () => '2026-07-25';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

global.DB = {
  members: [], subscriptions: [], payments: [], member_write_offs: [], refunds: [], _alloc: null,
  receipts: [
    { id: 'a', no: '101', is_deleted: false, fund_type: 'food',  member_id: 'M1', amount_ils: 200, receipt_date: '2026-07-20' },
    { id: 'b', no: '102', is_deleted: false, fund_type: 'food',  payer_name: ' زائر كريم ', amount_ils: 150, receipt_date: '2026-07-22' },
    { id: 'c', no: '103', is_deleted: true,  fund_type: 'food',  member_id: 'M1', amount_ils: 200, receipt_date: '2026-07-20' },
    { id: 'd', no: '104', is_deleted: false, fund_type: 'diwan', member_id: 'M1', amount_ils: 200, receipt_date: '2026-07-20' },
    { id: 'e', no: '105', is_deleted: false, fund_type: 'food',  member_id: 'M1', amount_ils: 200, receipt_date: '2026-07-01' },
  ],
};
const probe = o => FIN.findProbableDuplicates(o);

/* 1 · member duplicate: same fund + member + amount + near date → flagged */
(() => {
  const d = probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-25' });
  ok(d.length === 1 && d[0].no === '101', 'member duplicate within 7 days flagged (exactly the matching voucher)');
})();

/* 2 · deleted rows and other funds never match; far dates never match */
(() => {
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-25' }).every(r => r.no !== '103'),
    'cancelled (is_deleted) voucher never counts as a duplicate');
  ok(probe({ fund: 'diwan', memberId: 'M1', amountILS: 200, date: '2026-07-21' }).length === 1
    && probe({ fund: 'diwan', memberId: 'M1', amountILS: 200, date: '2026-07-21' })[0].no === '104',
    'fund identity respected (diwan probe matches only the diwan voucher)');
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-08' }).some(r => r.no === '105') === true
    && probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-08' }).some(r => r.no === '101') === false,
    'date window: 105 (7 days away) included, 101 (12 days away) excluded');
})();

/* 3 · window boundary: exactly 7 days matches, 8 days does not */
(() => {
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-27' }).length === 1,
    'exactly 7 days apart still flagged');
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-28' }).length === 0,
    '8 days apart not flagged (default window 7)');
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-28', windowDays: 10 }).length === 1,
    'explicit windowDays widens the probe');
})();

/* 4 · amount is the ILS accounting amount with ±0.005 tolerance (FD-021-consistent) */
(() => {
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200.004, date: '2026-07-20' }).length === 1, '±0.004 matches');
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 200.01, date: '2026-07-20' }).length === 0, '±0.01 does not match');
  ok(probe({ fund: 'food', memberId: 'M1', amountILS: 199, date: '2026-07-20' }).length === 0, 'different amount not flagged');
})();

/* 5 · non-member payer identity: trimmed name match; different member ≠ match */
(() => {
  ok(probe({ fund: 'food', payerName: 'زائر كريم', amountILS: 150, date: '2026-07-23' }).length === 1,
    'manual payer matched by trimmed name');
  ok(probe({ fund: 'food', payerName: 'زائر آخر', amountILS: 150, date: '2026-07-23' }).length === 0,
    'different payer name not flagged');
  ok(probe({ fund: 'food', memberId: 'M2', amountILS: 200, date: '2026-07-20' }).length === 0,
    'different member not flagged');
})();

/* 6 · fail-safe inputs: missing fund/amount/date probe nothing (no false warnings, no crash) */
(() => {
  ok(probe({}).length === 0 && probe({ fund: 'food', memberId: 'M1', amountILS: 0, date: '2026-07-20' }).length === 0
    && probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: 'not-a-date' }).length === 0,
    'invalid probe inputs return no matches (warning-only path, fail-safe)');
})();

/* 7 · FD-010: the probe is read-only — duplicates remain permitted (no state change) */
(() => {
  const before = JSON.stringify(DB.receipts);
  probe({ fund: 'food', memberId: 'M1', amountILS: 200, date: '2026-07-25' });
  ok(JSON.stringify(DB.receipts) === before, 'probe mutates nothing — save remains allowed (FD-010)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
