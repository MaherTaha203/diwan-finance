/* CCR-001 IG-017 — constitutional tests for the donation receipt voucher (FD-017).
   Rule: a donation receipt explicitly displays donor, amount, number, date,
   DESTINATION FUND, notes. Register acceptance: the printed donation voucher
   shows the destination fund for EVERY donation type.
   Loads the real print.js (voucher builder). Usage: node tests/donation-voucher-dest.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* stubs for print.js load + buildRecVoucher call-time deps */
global.window = {};
global.esc = s => String(s == null ? '' : s);
global.fmt = n => String(n);
global.fmtD = n => String(n);
global.METHOD_LABELS = { cash: 'نقداً' };
global.gmn = () => 'عضو';
global.FIN = { amountOf: r => Number(r.amount_ils || 0) };
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'print.js'), 'utf8'));
const build = r => global.window.buildRecVoucher ? global.window.buildRecVoucher(r) : buildRecVoucher(r);

const base = { no: 'REC-9', receipt_date: '2026-05-01', payer_name: 'متبرع كريم',
  amount: 100, amount_ils: 100, currency: 'ILS', payment_method: 'cash',
  verification_token: 'tok', notes: 'ملاحظة' };

/* 1 · classified cash donation → destination from destination_treasury (every type) */
(() => {
  const food = build(Object.assign({}, base, { fund_type: 'donation', donation_display_fund: 'food', destination_treasury: 'food', movement_type: 'food_cash_donation' }));
  ok(food.includes('الصندوق الوجهة') && food.includes('صندوق الغداء'), 'food-destined donation shows «صندوق الغداء»');
  const diwan = build(Object.assign({}, base, { fund_type: 'donation', donation_display_fund: 'diwan', destination_treasury: 'diwan', movement_type: 'diwan_cash_donation' }));
  ok(diwan.includes('الصندوق الوجهة') && diwan.includes('خزينة الديوان'), 'diwan-destined donation shows «خزينة الديوان»');
  const deficit = build(Object.assign({}, base, { fund_type: 'donation', donation_display_fund: 'food', destination_treasury: 'historical_deficit', movement_type: 'food_cash_donation' }));
  ok(deficit.includes('حساب العجز التاريخي'), 'deficit-directed donation shows «حساب العجز التاريخي» (destination_treasury wins over display fund)');
})();

/* 2 · ق4 collection + in-kind donation types */
(() => {
  const q4 = build(Object.assign({}, base, { fund_type: 'donation', movement_type: 'historical_debt_collection', destination_treasury: 'historical_deficit', member_id: 'M1' }));
  ok(q4.includes('حساب العجز التاريخي'), 'ق4 historical-debt collection shows the deficit destination');
  const inkind = build(Object.assign({}, base, { fund_type: 'donation', movement_type: 'donation_inkind', destination_treasury: null }));
  ok(inkind.includes('عيني/خدمي — توثيقي'), 'in-kind donation shows its documentary (no cash destination) label');
})();

/* 3 · legacy unclassified row → falls back to the stored display fund */
(() => {
  const legacy = build(Object.assign({}, base, { fund_type: 'donation', donation_display_fund: 'food' }));
  ok(legacy.includes('الصندوق الوجهة') && legacy.includes('صندوق الغداء'), 'legacy donation (no destination_treasury) falls back to donation_display_fund');
})();

/* 4 · FD-017 identity fields all present on the donation voucher */
(() => {
  const v = build(Object.assign({}, base, { fund_type: 'donation', donation_display_fund: 'food', destination_treasury: 'food' }));
  ok(v.includes('متبرع كريم') && v.includes('REC-9') && v.includes('₪ 100') && v.includes('01/05/2026') && v.includes('ملاحظة'),
    'donor · number · amount · date · notes all displayed (FD-017)');
})();

/* 5 · non-donation vouchers are untouched (no destination row) */
(() => {
  const foodRec = build(Object.assign({}, base, { fund_type: 'food', member_id: 'M1' }));
  ok(!foodRec.includes('الصندوق الوجهة'), 'food receipt voucher unchanged — destination row is donation-only');
  const diwanRec = build(Object.assign({}, base, { fund_type: 'diwan', movement_type: 'diwan_operational_income' }));
  ok(!diwanRec.includes('الصندوق الوجهة') && diwanRec.includes('إيراد الديوان التشغيلي'), 'diwan receipt voucher unchanged');
})();

/* 6 · unknown stored destination degrades to «—», never crashes or mislabels */
(() => {
  const odd = build(Object.assign({}, base, { fund_type: 'donation', destination_treasury: 'vault' }));
  ok(odd.includes('الصندوق الوجهة') && odd.includes('>—<'), 'unknown destination renders as «—» (fail-safe, no mislabel)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
