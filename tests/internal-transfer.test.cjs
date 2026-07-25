/* CCR-001 IG-014 — constitutional tests for Administrative Internal Transfers
   (FC-003 · FD-022 allowed funds · FD-023 director approval · FD-024 voucher
   identity · FD-025 currency identity).
   Register acceptance: transfer creates voucher + audit; fund balances shift;
   member liabilities and revenue/expense totals unchanged.
   Loads the real fin.js / fin2.js / operations.js.
   Usage: node tests/internal-transfer.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

/* MODEL2 stub: one cash inflow event so FIN2 classifies seed rows */
const EVENTS = { subscription_payment: { cash: true, treasury: 'food' },
                 diwan_cash_donation: { cash: true, register: 'cash_donation', treasury: 'diwan' } };
global.window = {
  MODEL2: { EVENTS },
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000, LOCKED_THROUGH_YEAR: 2025,
  TREASURY_OPENINGS: { food: 0, diwan: 0, historical_deficit: -500 },
  FinContract: { foodBalance: () => 0, diwanBalance: () => 0, foodDeficitRemaining: () => 0, foodNetPosition: () => 0 },
};
global.MODEL2 = global.window.MODEL2;
global.today = () => '2026-07-25';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');
global.FIN = FIN;
const FIN2 = require('../public/js/fin2.js');

global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 100, historical_payments_ils: 0 }],
  subscriptions: [],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M1', amount_ils: 300, receipt_date: '2026-03-01',
      movement_type: 'subscription_payment', destination_treasury: 'food' },
    { id: 'r2', no: '102', is_deleted: false, fund_type: 'diwan', payer_name: 'م', amount_ils: 200, receipt_date: '2026-03-02',
      movement_type: 'diwan_cash_donation', destination_treasury: 'diwan' },
  ],
  payments: [], member_write_offs: [], refunds: [], internal_transfers: [], _alloc: null,
};

/* baselines before any transfer */
const food0 = FIN2.foodTreasury(), diwan0 = FIN2.diwanTreasury(), hist0 = FIN2.historicalDeficitTreasury();
const stmt0 = FIN.memberStatement('M1').finalBalance;
const lvF0 = FIN.fundLedgerView('food', '', '', ''), lvD0 = FIN.fundLedgerView('diwan', '', '', '');

/* 1 · engine math: a transfer shifts exactly the two treasuries (conservation) */
(() => {
  DB.internal_transfers.push({ id: 't1', no: 'TRN-1', movement_type: 'internal_transfer',
    source_treasury: 'diwan', destination_treasury: 'food', amount: 80, amount_ils: 80,
    currency: 'ILS', transfer_date: '2026-06-01', reason: 'دعم الغداء', approving_director: 'المدير', is_deleted: false });
  ok(eq(FIN2.diwanTreasury(), diwan0 - 80) && eq(FIN2.foodTreasury(), food0 + 80),
    'transfer diwan→food: source −80, destination +80');
  ok(eq(FIN2.foodTreasury() + FIN2.diwanTreasury() + FIN2.historicalDeficitTreasury(),
        food0 + diwan0 + hist0),
    'conservation: total cash across the three treasuries unchanged');
})();

/* 2 · non-revenue/non-expense: ledger totals and member liabilities unchanged */
(() => {
  const lvF = FIN.fundLedgerView('food', '', '', ''), lvD = FIN.fundLedgerView('diwan', '', '', '');
  ok(eq(lvF.totalCr, lvF0.totalCr) && eq(lvF.totalDr, lvF0.totalDr)
    && eq(lvD.totalCr, lvD0.totalCr) && eq(lvD.totalDr, lvD0.totalDr),
    'revenue/expense totals unchanged (transfer is redistribution, not income/expense)');
  ok(eq(FIN.memberStatement('M1').finalBalance, stmt0), 'member liabilities unchanged');
})();

/* 3 · deficit-directed transfer feeds the deficit through composed() */
(() => {
  DB.internal_transfers.push({ id: 't2', no: 'TRN-2', movement_type: 'internal_transfer',
    source_treasury: 'food', destination_treasury: 'historical_deficit', amount: 120, amount_ils: 120,
    currency: 'ILS', transfer_date: '2026-06-02', reason: 'تمويل العجز', approving_director: 'المدير', is_deleted: false });
  const c = FIN2.composed();
  ok(eq(FIN2.historicalDeficitTreasury(), hist0 + 120), 'transfer into historical_deficit raises deficit funding by 120');
  ok(eq(c.historical_deficit_remaining, Math.min(0, -500 + hist0 + 120)),
    'composed(): remaining deficit reflects the transfer (overflow rule intact)');
  ok(eq(FIN2.foodTreasury(), food0 + 80 - 120), 'source food shifted by both transfers correctly');
})();

/* 4 · deleted transfers have no effect; register lists live rows newest-first */
(() => {
  DB.internal_transfers.push({ id: 't3', no: 'TRN-3', movement_type: 'internal_transfer',
    source_treasury: 'diwan', destination_treasury: 'food', amount: 999, amount_ils: 999,
    currency: 'ILS', transfer_date: '2026-06-03', reason: 'x', approving_director: 'x', is_deleted: true });
  ok(eq(FIN2.diwanTreasury(), diwan0 - 80), 'deleted transfer contributes nothing');
  const reg = FIN.transferRegister();
  ok(reg.length === 2 && reg[0].no === 'TRN-2' && reg[1].no === 'TRN-1', 'transferRegister: live rows only, newest first');
  DB.internal_transfers.pop();
})();

/* ── BO-16 layer (real operations.js with an SB stub) ── */
const writes = [];
global.SB = { from(tbl) { return {
  insert(row) { return { select() { return { async single() {
    const r = Object.assign({ id: 'id' + (writes.length + 1) }, row);
    (DB[tbl] = DB[tbl] || []).push(r); writes.push({ tbl, row });
    return { data: r, error: null };
  } }; } }; },
  update() { return { async eq() { return { error: null }; } }; },
}; } };
global.can = { admin: () => true, write: () => true };
global.voucherLocked = d => !!d && Number(String(d).slice(0, 4)) <= 2025;
global.nextNo = (p, arr) => p + '-' + ((arr || []).length + 1);
global.genVerificationToken = () => 'tok-t';
global.recordVoucherVersion = async () => {};
const audit = [];
global.logAction = async (action, description, table, id) => { audit.push({ action, description, table, id }); };
const BO = require('../public/js/operations.js');

(async () => {
  const n0 = DB.internal_transfers.length;

  /* 5 · valid transfer → immutable voucher with ALL mandated identity fields + distinct audit */
  const res = await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 55.5,
    date: '2026-07-01', reason: 'إعادة توزيع', approvingDirector: 'مدير النظام' });
  const t = DB.internal_transfers[DB.internal_transfers.length - 1];
  ok(res.ok === true && DB.internal_transfers.length === n0 + 1, 'BO-16 creates the transfer voucher');
  ok(!!t.no && t.movement_type === 'internal_transfer' && t.transfer_date === '2026-07-01'
    && t.source_treasury === 'food' && t.destination_treasury === 'diwan'
    && eq(t.amount_ils, 55.5) && t.currency === 'ILS'
    && t.reason === 'إعادة توزيع' && t.approving_director === 'مدير النظام'
    && !!t.created_by && !!t.verification_token,
    'voucher carries number · date · funds · currency identity · reason · operator · approving director (FD-024/FD-025)');
  const a = audit[audit.length - 1];
  ok(a && a.action === 'fund_transfer' && a.table === 'internal_transfers' && a.description.includes(t.no),
    'distinct fund_transfer audit event recorded');

  /* 6 · refusals: authority, pairs, amount, lock, reason, director */
  can.admin = () => false;
  ok((await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 10, date: '2026-07-01', reason: 'x', approvingDirector: 'x' })).code === 'E_AUTH', 'non-director refused (FD-029)');
  can.admin = () => true;
  ok((await BO.transferFunds({ source: 'food', destination: 'food', amountILS: 10, date: '2026-07-01', reason: 'x', approvingDirector: 'x' })).code === 'E_INPUT', 'same-fund transfer refused');
  ok((await BO.transferFunds({ source: 'food', destination: 'vault', amountILS: 10, date: '2026-07-01', reason: 'x', approvingDirector: 'x' })).code === 'E_INPUT', 'unknown fund refused (FD-022)');
  ok((await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 0, date: '2026-07-01', reason: 'x', approvingDirector: 'x' })).code === 'E_AMOUNT', 'zero amount refused (FD-021)');
  ok((await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 10, date: '2025-06-01', reason: 'x', approvingDirector: 'x' })).code === 'E_LOCKED', 'closed-year transfer refused (FD-004)');
  ok((await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 10, date: '2026-07-01', approvingDirector: 'x' })).code === 'E_REASON', 'missing reason refused');
  ok((await BO.transferFunds({ source: 'food', destination: 'diwan', amountILS: 10, date: '2026-07-01', reason: 'x' })).code === 'E_INPUT', 'missing approving director refused (FD-024)');
  ok(DB.internal_transfers.length === n0 + 1, 'no refused call created a row (fail-closed)');

  /* 7 · immutability: no BO mutation path can touch a transfer voucher */
  ok(typeof BO.editVoucher === 'function'
    && (await BO.editVoucher({ kind: 'transfer', id: t.id, changes: { amount_ils: 1 }, reason: 'x' })).ok === false,
    'BO voucher operations cannot address the transfers table (immutable instrument)');

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
