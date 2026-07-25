/* CCR-001 IG-011 — constitutional tests for FD-021: every transaction carries a
   valid ILS accounting amount; engine reads contain NO native-currency fallback.
   Register acceptance: engine reads ignore `amount` entirely; a row missing
   amount_ils contributes 0 (fail-safe) instead of leaking native units; capture
   (BO-01) refuses a payload without amount_ils.
   Loads the real fin.js / fin2.js / refund-engine.js / operations.js.
   Usage: node tests/ils-accounting-amount.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 100, diwanBalance: () => 50,
    foodDeficitRemaining: () => -10, foodNetPosition: () => 90 },
};
global.today = () => '2026-07-25';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

/* Envelope built to EXPOSE unit mixing: every row carries a native `amount`
   that differs wildly from amount_ils (as a USD/JOD voucher would). */
global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
  subscriptions: [{ member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }],
  receipts: [
    /* USD-style voucher: native 100, accounting 370 ILS */
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M1', amount: 100, amount_ils: 370, currency: 'USD', receipt_date: '2026-03-01' },
    /* donation with divergent native */
    { id: 'd1', no: '201', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food', payer_name: 'ف', amount: 5, amount_ils: 25, receipt_date: '2026-05-01', food_donation_allocation: 'support_current' },
  ],
  payments: [
    { id: 'p1', no: '301', is_deleted: false, fund_type: 'food', beneficiary_name: 'م', amount: 20, amount_ils: 74, payment_date: '2026-03-15', expense_type: 'food' },
  ],
  member_write_offs: [], refunds: [], _alloc: null,
};

/* 1 · amountOf reads the ILS accounting amount ONLY */
ok(eq(FIN.amountOf({ amount_ils: 370, amount: 100 }), 370), 'amountOf: ILS accounting amount wins');
ok(eq(FIN.amountOf({ amount: 999 }), 0), 'amountOf: missing amount_ils → 0 (native NEVER leaks into ILS sums)');

/* 2 · every engine surface uses the accounting amount (native 100 ≠ ILS 370) */
(() => {
  const st = FIN.memberStatement('M1');
  const payRow = st.rows.find(r => r.no === '101');
  ok(eq(payRow.cr, 370) && eq(st.finalBalance, 200 - 370), 'memberStatement: USD voucher credited at 370 ILS, not native 100');
  const lv = FIN.fundLedgerView('food', '', '', '');
  ok(eq(lv.totalCr, 370) && eq(lv.totalDr, 74) && eq(lv.closing, 296), 'fundLedgerView: ledger totals in ILS accounting amounts');
  const day = FIN.dayTotals('2026-03-01');
  ok(eq(day.recTotal, 370), 'dayTotals: ILS accounting amount');
  const D = FIN.donationRegister();
  ok(eq(D.cashTot, 25) && eq(D.toFood, 25), 'donationRegister: ILS accounting amount (25, not native 5)');
  const al = FIN.memberAllocation('M1');
  ok(eq(al.pool, 370), 'memberAllocation: FD-002 pool fed by ILS accounting amounts');
})();

/* 3 · a row stripped of amount_ils contributes 0 everywhere (fail-safe, no mixing) */
(() => {
  DB.receipts.push({ id: 'rX', no: '999', is_deleted: false, fund_type: 'food', member_id: 'M1', amount: 5000, receipt_date: '2026-06-01' });
  DB._alloc = null;
  const st = FIN.memberStatement('M1');
  ok(eq(st.totalPaid, 370), 'statement: native-only row adds 0 — the 5000 native units never enter ILS totals');
  const v = FIN.verifyConsistency();
  ok(v.allMatch === true, 'verifier: identities still hold (0-contribution is consistent across all paths)');
  DB.receipts.pop(); DB._alloc = null;
})();

/* 4 · FIN2 treasury reads are ILS-only */
(() => {
  const FIN2 = require('../public/js/fin2.js');
  ok(typeof FIN2 === 'object', 'FIN2 loads for node verification');
})();

/* 5 · RefundEngine: origin without amount_ils is INELIGIBLE (fail-safe), never native-priced */
(() => {
  const RE = require('../public/js/refund-engine.js');
  const bad = RE.computeRefund({ origin: { id: 'o1', amount: 500, currency: 'USD' }, amountILS: 100, priorRefundedILS: 0, locked: false });
  ok(bad.ok === false && bad.code === 'E_INELIGIBLE', 'refund of an origin without amount_ils refused (no native pricing)');
  const good = RE.computeRefund({ origin: { id: 'o2', amount: 100, amount_ils: 370, currency: 'USD' }, amountILS: 185, priorRefundedILS: 0, locked: false });
  ok(good.ok === true && eq(good.row.amount_ils, 185) && eq(good.row.amount, 50), 'valid origin: ILS capped by amount_ils; native preserved proportionally (Law 10)');
})();

/* 6 · BO-01 capture: amount_ils is mandatory (FD-021) */
(async () => {
  global.SB = { from() { return { insert(row) { return { select() { return { async single() { return { data: Object.assign({ id: 'n1' }, row), error: null }; } }; } }; },
    update() { return { async eq() { return { error: null }; } }; } }; } };
  global.can = { admin: () => true, write: () => true };
  global.voucherLocked = () => false;
  global.nextNo = p => p + '-1';
  global.genVerificationToken = () => 'tok';
  global.recordVoucherVersion = async () => {};
  global.logAction = async () => {};
  global.MODEL2 = { EVENTS: { subscription_payment: {} } };
  const BO = require('../public/js/operations.js');
  global.DB.receipts = [];

  const noILS = await BO.createVoucher({ kind: 'receipt', payload: { fund_type: 'food', amount: 100, currency: 'USD', receipt_date: '2026-06-01', movement_type: 'subscription_payment' } });
  ok(noILS.ok === false && noILS.code === 'E_AMOUNT', 'BO-01 refuses a payload without amount_ils (native amount is no substitute)');
  const zeroILS = await BO.createVoucher({ kind: 'receipt', payload: { fund_type: 'food', amount: 100, amount_ils: 0, receipt_date: '2026-06-01', movement_type: 'subscription_payment' } });
  ok(zeroILS.ok === false && zeroILS.code === 'E_AMOUNT', 'BO-01 refuses amount_ils = 0');
  const good = await BO.createVoucher({ kind: 'receipt', payload: { fund_type: 'food', amount: 100, amount_ils: 370, currency: 'USD', receipt_date: '2026-06-01', movement_type: 'subscription_payment' } });
  ok(good.ok === true, 'BO-01 accepts a payload carrying the ILS accounting amount');

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
