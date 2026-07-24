/* CCR-001 IG-007 — output-identity tests for the FD-013/FD-011 presentation accessors.
   Every accessor must return EXACTLY what the presentation layer previously computed
   inline (the legacy formulas below are copied verbatim from the pre-IG-007 code of
   app.js / print.js / reports.js / treasury-workspace.js). Loads the real fin.js.
   Usage: node tests/presentation-centralization.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000,
  LOCKED_THROUGH_YEAR: 2025,
  FinContract: {           /* stubbed canonical treasury source (FIN delegates) */
    foodBalance: () => 812.34, diwanBalance: () => 402.5,
    foodDeficitRemaining: () => -640.25, foodNetPosition: () => 172.09,
  },
};
global.today = () => '2026-07-24';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => 'مصروف·' + String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

global.DB = {
  members: [
    { id: 'M1', name: 'أ', is_active: true,  historical_balance_ils: 600, historical_payments_ils: 150 },
    { id: 'M2', name: 'ب', is_active: false, historical_balance_ils: 100, historical_payments_ils: 0 },
  ],
  subscriptions: [
    { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 50 },
    { member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
  ],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food',  member_id: 'M1', amount_ils: 120, receipt_date: '2026-03-01', payment_method: 'cash', notes: 'إيصال 55' },
    { id: 'r2', no: '102', is_deleted: false, fund_type: 'diwan', payer_name: 'زائر', amount_ils: 80, receipt_date: '2026-04-02', payment_method: 'cash', notes: '' },
    { id: 'r3', no: '103', is_deleted: true,  fund_type: 'food',  member_id: 'M1', amount_ils: 999, receipt_date: '2026-04-03' },
    /* donations: cash food (designated current) · cash diwan · in-kind · deficit-destined (excluded from register) · member food donation */
    { id: 'd1', no: '201', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food',  member_id: 'M1', amount_ils: 90,  receipt_date: '2026-05-05', food_donation_allocation: 'support_current' },
    { id: 'd2', no: '202', is_deleted: false, fund_type: 'donation', donation_display_fund: 'diwan', payer_name: 'محسن', amount_ils: 70, receipt_date: '2026-05-06' },
    { id: 'd3', no: '203', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food',  payer_name: 'شركة', amount_ils: 500, receipt_date: '2026-05-07', movement_type: 'donation_inkind', register_category: 'أثاث' },
    { id: 'd4', no: '204', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food',  payer_name: 'فاعل', amount_ils: 40, receipt_date: '2026-05-08', destination_treasury: 'historical_deficit' },
    { id: 'd5', no: '205', is_deleted: false, fund_type: 'donation', donation_display_fund: 'food',  member_id: 'M1', amount_ils: 25, receipt_date: '2024-02-02', manual_allocation: true, manual_historical_donation: 25 },
    /* ق4 collection — must NOT appear in memberDonations */
    { id: 'q4', no: '206', is_deleted: false, fund_type: 'donation', member_id: 'M1', amount_ils: 30, receipt_date: '2026-05-09', movement_type: 'historical_debt_collection' },
  ],
  payments: [
    { id: 'p1', no: '301', is_deleted: false, fund_type: 'food',  beneficiary_name: 'مورد', amount_ils: 60, payment_date: '2026-03-15', expense_type: 'food' },
    { id: 'p2', no: '302', is_deleted: false, fund_type: 'diwan', member_id: 'M1', amount_ils: 45, payment_date: '2026-07-24', expense_type: 'maintenance' },
  ],
  member_write_offs: [], refunds: [], _alloc: null,
};
DB.receipts.push({ id: 'rT', no: '107', is_deleted: false, fund_type: 'food', member_id: 'M1', amount_ils: 55, receipt_date: '2026-07-24', payment_method: 'cash', notes: '' });

/* 1 · fundLedgerView ≡ legacy accumulation over FIN.fundLedger (app.js/print.js) */
['food', 'diwan'].forEach(fund => {
  const rows = FIN.fundLedger(fund, '', '', '');
  let bal = 0, totCr = 0, totDr = 0, openBal = 0;
  const legacy = rows.map((r, i) => {
    bal += r.cr - r.dr; totCr += r.cr; totDr += r.dr;
    if (i === 0 && r.type === 'open') openBal = r.cr - r.dr;
    return bal;
  });
  const lv = FIN.fundLedgerView(fund, '', '', '');
  ok(lv.rows.length === rows.length && lv.rows.every((r, i) => eq(r.run, legacy[i])),
    'fundLedgerView(' + fund + '): running balance per row identical');
  ok(eq(lv.totalCr, totCr) && eq(lv.totalDr, totDr) && eq(lv.closing, bal) && eq(lv.opening, openBal),
    'fundLedgerView(' + fund + '): totals/closing/opening identical');
});

/* 2 · memberStatementView ≡ legacy carried/moves/totals (app.js renderMemberStmt) */
(() => {
  const st = FIN.memberStatement('M1', '', '');
  const m = DB.members[0];
  const carried = Number(m.historical_balance_ils || 0) - Number(m.historical_payments_ils || 0);
  const moves = st.rows.filter(r => r.date !== '—');
  let totSub = 0, totPay = 0;
  moves.forEach(r => { totSub += Number(r.dr || 0); totPay += Number(r.cr || 0); });
  const v = FIN.memberStatementView('M1', '', '');
  ok(eq(v.carried, carried) && eq(v.histPaid, m.historical_payments_ils), 'memberStatementView: carried + histPaid identical');
  ok(v.moves.length === moves.length && eq(v.totSub, totSub) && eq(v.totPay, totPay), 'memberStatementView: moves + period totals identical');
  ok(eq(v.finalBalance, st.finalBalance) && eq(v.statement.finalBalance, st.finalBalance), 'memberStatementView: final balance = engine statement');
})();

/* 3 · memberDonations ≡ legacy filter (ق4 excluded; date range honoured) */
(() => {
  const legacy = DB.receipts.filter(r => !r.is_deleted && r.fund_type === 'donation' && r.member_id === 'M1' && r.movement_type !== 'historical_debt_collection');
  const got = FIN.memberDonations('M1');
  ok(got.length === legacy.length && got.every((r, i) => r.id === legacy[i].id), 'memberDonations: identical row set (ق4 excluded)');
  const ranged = FIN.memberDonations('M1', '2026-01-01', '2026-12-31');
  ok(ranged.length === 1 && ranged[0].id === 'd1', 'memberDonations: date range filter identical');
})();

/* 4 · donationRegister ≡ legacy reduces (reports.js prtDonStmt) */
(() => {
  const rows = DB.receipts.filter(r => !r.is_deleted && r.fund_type === 'donation' && r.destination_treasury !== 'historical_deficit');
  const isIK = r => r.movement_type === 'donation_inkind';
  const cashRows = rows.filter(r => !isIK(r));
  const cashTot = cashRows.reduce((s, r) => s + Number(r.amount_ils || r.amount), 0);
  const inkindTot = rows.filter(isIK).reduce((s, r) => s + Number(r.amount_ils || r.amount), 0);
  const toFood = cashRows.filter(r => r.donation_display_fund === 'food').reduce((s, r) => s + Number(r.amount_ils || r.amount), 0);
  const D = FIN.donationRegister();
  ok(D.rows.length === rows.length && D.rows.every((r, i) => r.id === rows[i].id), 'donationRegister: row set identical (deficit-destined excluded)');
  ok(eq(D.cashTot, cashTot) && eq(D.inkindTot, inkindTot) && eq(D.toFood, toFood) && eq(D.toDiwan, cashTot - toFood),
    'donationRegister: cash/in-kind/direction totals identical');
  ok(eq(D.foodDebt, FIN.foodDebtSettlementTotal()) && eq(D.foodDeficit, FIN.foodSettlementReserve()) && eq(D.foodSupport, FIN.foodCurrentSupportTotal()),
    'donationRegister: recognized allocation figures = engine totals');
})();

/* 5 · single predicates (print.js P9 / exporters) */
ok(FIN.isInkindDonation(DB.receipts.find(r => r.id === 'd3')) === true && FIN.isInkindDonation(DB.receipts.find(r => r.id === 'd1')) === false,
  'isInkindDonation: single in-kind predicate');
ok(FIN.foodDonationClass(DB.receipts.find(r => r.id === 'd5')) === 'historical', 'foodDonationClass: manual allocation → historical');
ok(FIN.foodDonationClass({ food_donation_allocation: 'reduce_deficit' }) === 'historical'
  && FIN.foodDonationClass({ food_donation_allocation: 'support_current' }) === 'current',
  'foodDonationClass: designation mapping identical to legacy predicate');

/* 6 · treasuryPosition ≡ legacy workspace position() over the stubbed contract */
(() => {
  const p = FIN.treasuryPosition();
  const food = R2(812.34), diwan = R2(402.5), netFood = R2(172.09);
  ok(eq(p.food, food) && eq(p.diwan, diwan) && eq(p.combined, R2(food + diwan)), 'treasuryPosition: combined = R2(food+diwan)');
  ok(eq(p.netCombined, R2(netFood + diwan)) && eq(p.deficit, R2(-640.25)), 'treasuryPosition: netCombined/deficit identical');
})();

/* 7 · cashMovement ≡ legacy workspace movementState() */
(() => {
  const rows = [];
  ['food', 'diwan'].forEach(f => (FIN.fundLedger(f, '', '') || []).forEach(r => {
    if (r.type === 'cr' || r.type === 'dr') rows.push({ id: r.id, in: Number(r.cr || 0), out: Number(r.dr || 0), date: r.date });
  }));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalIn = R2(rows.reduce((t, r) => t + r.in, 0)), totalOut = R2(rows.reduce((t, r) => t + r.out, 0));
  const m = FIN.cashMovement('', '');
  ok(m.count === rows.length && m.rows.every((r, i) => r.id === rows[i].id), 'cashMovement: row set + ordering identical');
  ok(eq(m.totalIn, totalIn) && eq(m.totalOut, totalOut) && eq(m.net, R2(totalIn - totalOut)), 'cashMovement: totals identical');
})();

/* 8 · dayTotals ≡ legacy dashboard sums (app.js renderDash) */
(() => {
  const t0 = '2026-07-24';
  const rec = DB.receipts.filter(r => !r.is_deleted && r.receipt_date === t0);
  const pay = DB.payments.filter(p => !p.is_deleted && p.payment_date === t0);
  const net = rec.reduce((s, r) => s + Number(r.amount_ils || r.amount), 0) - pay.reduce((s, p) => s + Number(p.amount_ils || p.amount), 0);
  const d = FIN.dayTotals(t0);
  ok(d.count === rec.length + pay.length && eq(d.net, net), 'dayTotals: voucher count + net identical (55 − 45 = ' + net + ')');
})();

/* 9 · voucherExportRows ≡ legacy Excel derivation (app.js exportPageExcel) */
(() => {
  const legacyRec = DB.receipts.filter(r => !r.is_deleted && r.fund_type === 'food');
  const rec = FIN.voucherExportRows('rec', 'food');
  ok(rec.length === legacyRec.length && rec.every((r, i) => r.no === legacyRec[i].no && eq(r.amount, Number(legacyRec[i].amount_ils || legacyRec[i].amount || 0))),
    'voucherExportRows(rec): rows + amounts identical');
  const pay = FIN.voucherExportRows('pay', 'diwan');
  ok(pay.length === 1 && pay[0].no === '302' && eq(pay[0].amount, 45), 'voucherExportRows(pay): rows + amounts identical');
  const don = FIN.voucherExportRows('don');
  const legacyDon = DB.receipts.filter(r => !r.is_deleted && r.fund_type === 'donation');
  ok(don.length === legacyDon.length && don.find(r => r.no === '203').inkind === true && don.find(r => r.no === '201').allocation === 'support_current',
    'voucherExportRows(don): in-kind + designation fields identical');
  const mem = FIN.voucherExportRows('members');
  ok(mem.length === 1 && mem[0].name === 'أ' && eq(mem[0].historical, 600) && eq(mem[0].balance, FIN.memberBalance('M1')),
    'voucherExportRows(members): active filter + engine balance identical');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
