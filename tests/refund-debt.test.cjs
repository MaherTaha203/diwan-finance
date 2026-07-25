/* CCR-001 IG-012 — constitutional tests for FD-009 refund → member-debt recreation
   (+ FD-032: no donation-refund event exists).
   Register acceptance: refund ₪X → member outstanding +X on the refund date across
   statement / debt report; donation refund impossible.
   Loads the real fin.js and operations.js. Usage: node tests/refund-debt.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  RefundEngine: require('../public/js/refund-engine.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 812.34, diwanBalance: () => 402.5,
    foodDeficitRemaining: () => -640.25, foodNetPosition: () => 172.09 },
};
global.today = () => '2026-07-24';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

/* M1: 2026 dues 200, fully paid by a food receipt 200 → settled …then refunded 200. */
global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
  subscriptions: [{ member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M1', amount_ils: 200, receipt_date: '2026-03-01' },
    { id: 'dn1', no: '201', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food', payer_name: 'فاعل', amount_ils: 50, receipt_date: '2026-05-01', food_donation_allocation: 'support_current' },
  ],
  payments: [], member_write_offs: [], refunds: [], _alloc: null,
};

/* 1 · baseline: fully settled */
(() => {
  const st = FIN.memberStatement('M1');
  ok(eq(st.finalBalance, 0) && FIN.memberDelinquency('M1').isDelinquent === false, 'baseline: paid member settled (0)');
})();

/* 2 · FD-009: refund ₪200 → outstanding +200 on the refund date, everywhere */
(() => {
  DB.refunds.push({ id: 'rf1', no: 'RFND-1', movement_type: 'refund', origin_receipt_id: 'r1',
    member_id: 'M1', amount: 200, amount_ils: 200, currency: 'ILS',
    destination_treasury: 'food', payment_date: '2026-06-10', is_deleted: false });
  DB._alloc = null;
  const st = FIN.memberStatement('M1');
  ok(eq(st.finalBalance, 200) && eq(st.refunded, 200), 'statement: refund recreates debt (+200)');
  const row = st.rows.find(r => r.cls === 'refund');
  ok(!!row && row.date === '2026-06-10' && row.no === 'RFND-1' && eq(row.dr, 200),
    'statement shows a debit row on the REFUND date carrying the refund number');
  const d = FIN.memberDelinquency('M1');
  ok(d.isDelinquent === true && eq(d.outstanding, 200), 'delinquency: member delinquent again (FD-007)');
  const al = FIN.memberAllocation('M1');
  const wf = Object.values(al.perYear).reduce((s, y) => s + y.remaining, 0)
    + al.historical.remaining - al.creditRemaining;
  ok(eq(R2(wf), 200), 'waterfall conservation holds with the refund (pool debited)');
  const model = FIN.debtReportRows({ years: null, filter: 'all' });
  ok(eq(model.rows[0].current, 200) && eq(model.rows[0].refunded, 200), 'debt report row: current 200 · refunded component exposed');
  const v = FIN.verifyConsistency();
  ok(v.allMatch === true, 'IG-008 verifier: all identities hold with refunds present');
})();

/* 3 · range filter honours the refund (payment) date */
(() => {
  const st = FIN.memberStatement('M1', '2026-01-01', '2026-05-31');
  ok(eq(st.refunded, 0) && !st.rows.find(r => r.cls === 'refund'), 'refund outside the range is excluded');
})();

/* 4 · deleted refunds and non-member refunds have no ledger effect */
(() => {
  DB.refunds.push({ id: 'rf2', no: 'RFND-2', movement_type: 'refund', origin_receipt_id: 'r1',
    member_id: 'M1', amount_ils: 999, payment_date: '2026-06-11', is_deleted: true });
  DB.refunds.push({ id: 'rf3', no: 'RFND-3', movement_type: 'refund', origin_receipt_id: 'x',
    member_id: null, amount_ils: 50, payment_date: '2026-06-12', is_deleted: false });
  DB._alloc = null;
  ok(eq(FIN.memberStatement('M1').finalBalance, 200), 'deleted / non-member refunds do not touch the member ledger');
  DB.refunds.length = 1;   /* keep only rf1 */
})();

/* ── BO-11 layer (FD-032 + gates) — real operations.js with an SB stub ── */
global.SB = { from(tbl) { return {
  insert(row) { return { select() { return { async single() {
    const r = Object.assign({ id: 'new1' }, row); (DB[tbl] = DB[tbl] || []).push(r); return { data: r, error: null };
  } }; } }; },
  update() { return { async eq() { return { error: null }; } }; },
}; } };
global.can = { admin: () => true, write: () => true };
global.voucherLocked = d => !!d && Number(String(d).slice(0, 4)) <= 2025;
global.nextNo = p => p + '-T1';
global.genVerificationToken = () => 'tok';
global.recordVoucherVersion = async () => {};
global.logAction = async () => {};
global.MODEL2 = { EVENTS: { refund: {} } };
global.FIN = FIN;
const BO = require('../public/js/operations.js');

(async () => {
  /* 5 · flag OFF (constitutional hold): refund creation refused */
  window.MODEL2_ALLOCATION_ENABLED = false;
  const off = await BO.refundReceipt({ originId: 'r1', amountILS: 50, reason: 'x' });
  ok(off.ok === false && off.code === 'E_DISABLED', 'flag OFF → refund creation refused (IG-000 hold)');

  /* 6 · FD-032: donation-origin refund impossible even with the flag ON */
  window.MODEL2_ALLOCATION_ENABLED = true;
  const don = await BO.refundReceipt({ originId: 'dn1', amountILS: 10, reason: 'x' });
  ok(don.ok === false && don.code === 'E_FORBIDDEN' && String(don.error).includes('FD-032'),
    'donation refund refused — no donation-refund event exists (FD-032)');

  /* 7 · payment refund path creates the member-linked refund row (cap respected) */
  const r = await BO.refundReceipt({ originId: 'r1', amountILS: 999, reason: 'تجاوز' });
  ok(r.ok === false && r.code === 'E_INELIGIBLE', 'fully-refunded origin refuses further refunds (CA-005)');
  DB.refunds.length = 0; DB._alloc = null;                       /* fresh origin: nothing refunded yet */
  const over = await BO.refundReceipt({ originId: 'r1', amountILS: 999, reason: 'تجاوز' });
  ok(over.ok === false && over.code === 'E_EXCEEDS', 'refund above the remaining refundable refused (CA-005)');
  const good = await BO.refundReceipt({ originId: 'r1', amountILS: 75, reason: 'استرداد جزئي' });
  ok(good.ok === true && DB.refunds.length === 1 && DB.refunds[0].member_id === 'M1'
    && eq(DB.refunds[0].amount_ils, 75), 'valid partial refund creates a member-linked refund row');
  DB._alloc = null;
  ok(eq(FIN.memberStatement('M1').finalBalance, 75), 'created refund immediately recreates ₪75 member debt (FD-009)');
  window.MODEL2_ALLOCATION_ENABLED = false;

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
