/* Historical Subscription Truth Layer — constitutional tests.
   The Owner-approved workbook status OVERRIDES the derived year status on the
   memberDelinquency read model (presentation authority), while every financial
   figure — statement, debt report, allocation, delinquency outstanding — stays
   byte-identical with and without the truth data (accounting protection).
   Loads the real fin.js + allocation-engine.js.
   Usage: node tests/historical-truth.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);

global.window = { MODEL2Allocation: require(P('allocation-engine.js')), FOOD_OPENING: 0, LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 0, diwanBalance: () => 0, foodDeficitRemaining: () => 0, foodNetPosition: () => 0 } };
global.today = () => '2026-07-25';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(fs.readFileSync(P('fin.js'), 'utf8') + ';FIN');
global.FIN = FIN;

/* M1 mirrors the production surplus class: 2025 stored paid 730 > due 200 →
   engine settles 2026 from the surplus; the Owner ruled 2026 UNPAID. */
global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 2200, historical_payments_ils: 0 }],
  subscriptions: [
    { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 730 },
    { member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
  ],
  receipts: [], payments: [], member_write_offs: [], refunds: [], _alloc: null,
  historical_subscription_truth: [],
};

/* 1 · BEFORE truth: derived status (surplus settles 2026) */
const before = { stmt: FIN.memberStatement('M1'), dq: FIN.memberDelinquency('M1'), debt: JSON.stringify(FIN.debtReportRows({})) };
ok(before.dq.byYear[2026].settled === true && before.dq.byYear[2026].authoritative === false,
  'no truth record → derived status (2026 settled by surplus), authoritative=false');

/* 2 · truth loaded: owner override WINS over the derived value */
DB.historical_subscription_truth = [
  { member_id: 'M1', year: 2026, status: 'unpaid', source: 'owner_workbook', approved_by: 'Owner', approved_at: '2026-07-25' },
];
DB._alloc = null;
const dq = FIN.memberDelinquency('M1');
ok(dq.byYear[2026].settled === false && dq.byYear[2026].status === 'unpaid' && dq.byYear[2026].authoritative === true,
  'owner truth (unpaid) OVERRIDES the derived settled status — never replaced by a calculated value');
ok(dq.unpaidCount === before.dq.unpaidCount + 1, 'unpaid-years indicator follows the owner truth');

/* 3 · ACCOUNTING PROTECTION: every financial figure is byte-identical */
const after = { stmt: FIN.memberStatement('M1'), debt: JSON.stringify(FIN.debtReportRows({})) };
ok(JSON.stringify(after.stmt) === JSON.stringify(before.stmt), 'member statement (balances, rows, totals) unchanged by the truth layer');
ok(after.debt === before.debt, 'debt report figures unchanged by the truth layer');
ok(dq.outstanding === before.dq.outstanding && dq.isDelinquent === before.dq.isDelinquent,
  'outstanding and delinquency (financial) remain derived — truth affects year status only');
const al = FIN.memberAllocation('M1');
ok(al.perYear[2026].settled === true, 'FD-002 allocation mathematics untouched (engine still allocates the surplus)');

/* 4 · unknown → fall back to derived; other statuses map directly */
DB.historical_subscription_truth = [{ member_id: 'M1', year: 2026, status: 'unknown' }];
ok(FIN.memberDelinquency('M1').byYear[2026].authoritative === false
  && FIN.memberDelinquency('M1').byYear[2026].settled === true,
  'status=unknown → derived logic continues (backward compatibility)');
DB.historical_subscription_truth = [{ member_id: 'M1', year: 2026, status: 'partial' }];
const dq2 = FIN.memberDelinquency('M1');
ok(dq2.byYear[2026].status === 'partial' && dq2.byYear[2026].settled === false && dq2.byYear[2026].authoritative === true,
  'status=partial → shown as partial, counted as not settled');

/* 5 · isolation: nothing financial reads the truth table (structural) */
(() => {
  const finSrc = fs.readFileSync(P('fin.js'), 'utf8');
  const readers = [];
  for (const f of fs.readdirSync(path.join(__dirname, '..', 'public', 'js')).filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync(P(f), 'utf8');
    if (/historical_subscription_truth/.test(src) && !['fin.js', 'data.js'].includes(f)) readers.push(f);
  }
  ok(readers.length === 0, 'only fin.js (subscriptionTruth) + data.js (loader) touch the truth table');
  const stmtBlock = finSrc.slice(finSrc.indexOf('memberStatement(memberId, from, to){'), finSrc.indexOf('balanceLabel('));
  const allocBlock = finSrc.slice(finSrc.indexOf('memberAllocation(memberId){'), finSrc.indexOf('_memberBaseBalance('));
  ok(!/subscriptionTruth|historical_subscription_truth/.test(stmtBlock) && !/subscriptionTruth|historical_subscription_truth/.test(allocBlock),
    'memberStatement and memberAllocation never consult the truth layer (financial isolation)');
})();

/* 6 · wiring: report cells consume the truth-aware fields */
(() => {
  const rSrc = fs.readFileSync(P('reports.js'), 'utf8');
  ok(/v\.authoritative/.test(rSrc) && /v\.settled \? 'settled' : 'unpaid'/.test(rSrc),
    'delinquent report cells + year filter consume settled/status/authoritative');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
