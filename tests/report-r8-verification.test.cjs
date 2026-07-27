/* REPORT-001 · R8 (pre-activation) — consolidated cross-report VERIFICATION.
   Proves that, through the unified engine, EVERY registry report's declared
   real outputs render (never a skeleton) from one model — the precondition the
   owner requires before activating the engine as the default (R8-a). This does
   NOT activate anything; it is a read-only verification harness.
   Usage: node tests/report-r8-verification.test.cjs */
require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const B = require('../public/js/report-model.js');
require('../public/js/report-render-print.js');
require('../public/js/report-render-pdf.js');
require('../public/js/report-render-excel.js');
require('../public/js/report-render-screen.js');
/* voucher builders (stubbed like the browser globals) + the hybrid renderer */
globalThis.buildRecVoucher = (r) => '<div class="voucher">REC ' + r.no + '</div>';
globalThis.buildPayVoucher = (p) => '<div class="voucher">PAY ' + p.no + '</div>';
globalThis.buildTransferVoucher = (t) => '<div class="voucher">TR ' + t.no + '</div>';
require('../public/js/report-render-voucher.js');
const Report = globalThis.Report;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* one representative model per tabular report (pure builders, synthetic data) */
const models = {
  MEMBER_STATEMENT: B.buildMemberStatementModel({ member: { name: 'x', member_code: 'A-1' }, view: { statement: { finalBalance: 100 }, carried: 50, moves: [{ date: '2025-01-01', no: 'R1', desc: 'd', dr: 0, cr: 100, bal: 50 }] } }),
  FUND_STATEMENT: B.buildFundStatementModel({ fund: 'food', view: { rows: [{ date: '2025-01-01', name: 'x', desc: 'd', cr: 100, dr: 0, run: 100 }], totalCr: 100, totalDr: 0, closing: 100 }, figures: { curBal: 100 } }),
  ANNUAL_DEBT: B.buildAnnualDebtModel({ rows: [{ code: 'A-1', name: 'x', phone: '', hist: 0, histPaid: 0, selSub: 200, selPaid: 100, resolutions: 0, current: 100 }], totals: { hist: 0, histPaid: 0, selSub: 200, selPaid: 100, resolutions: 0 }, totalMembers: 1, shown: 1 }),
  DELINQUENT: B.buildDelinquentModel({ years: [2025], rows: [{ code: 'A-1', name: 'x', phone: '', d: { unpaidCount: 1, byYear: { 2025: { due: 200, paid: 0, remaining: 200, settled: false, status: 'unpaid', authoritative: false } } } }], shown: 1, totalMembers: 1 }),
  DONATION_REPORT: B.buildDonationReportModel({ rows: [{ date: '2025-01-01', ref: '1', donor: 'x', amount: 100, currency: 'ILS', direction: 'صندوق الغداء', note: null }], summary: { count: 1, cashTot: 100, inkindTot: 0, foodDebt: 0, foodDeficit: 0, foodSupport: 100, toDiwan: 0 } }),
  MEMBERS_LIST: B.buildMembersListModel({ rows: [{ idx: 1, name: 'x', phone: '', balance: 100, status: 'مدين' }] }),
  ANNUAL_LOG: B.buildAnnualLogModel({ rows: [{ year: 2025, amount: 200, memberCount: 40, appliedAt: '2025-01-01', appliedBy: 'admin' }] }),
  TREASURY_POSITION: B.buildTreasuryPositionModel({ position: { food: 1, diwan: 1, don: 1, combined: 3 }, movement: { totalIn: 1, totalOut: 0 }, rows: [{ date: '2025-01-01', no: '1', fund: 'x', party: 'y', desc: 'z', in: 1, out: null }] }),
  DUES_SNAPSHOT: B.buildDuesSnapshotModel({ state: { year: 2025, perMember: 200, eligible: 1, due: 200, outstanding: 200 }, statusText: 'مُطبَّقة', rows: [{ code: 'A-1', name: 'x', phone: '', due: 200, paid: 0, remaining: 200, status: 'متبقّي' }], schedule: [] }),
  AUDIT_LOG: B.buildAuditLogModel({ rows: [{ date: '2025-01-01', action: 'create', desc: 'd', user: 'admin', table: 'receipts' }] }),
  USERS_LIST: B.buildUsersListModel({ rows: [{ email: 'a@x.com', role: 'مدير' }] }),
  CONSISTENCY: B.buildConsistencyModel({ verify: { allMatch: true, memberCount: 1, checks: [{ k: 'x', a: 1, b: 1, match: true }], failedMembers: [] } })
};
const VOUCHERS = { RECEIPT_VOUCHER: { no: 1 }, PAYMENT_VOUCHER: { no: 2 }, TRANSFER_VOUCHER: { no: 3 } };

/* every registry report is covered by this harness */
const ids = Report.list().map(d => d.id);
const covered = Object.keys(models).concat(Object.keys(VOUCHERS));
ok(ids.every(id => covered.indexOf(id) >= 0), 'every registry report id is covered by the verification (' + ids.length + ' reports)');

/* for each report, every DECLARED output renders through the engine.
   Real renderers: screen/print/pdf/excel → not a skeleton. csv is a documented
   not-yet-migrated exception (skeleton) and is reported, not failed. */
let realOutputs = 0, csvPending = 0;
Report.list().forEach(def => {
  const id = def.id;
  def.outputs.forEach(target => {
    let r;
    if (def.category === 'voucher') r = Report.render(id, target, { record: VOUCHERS[id] });
    else r = Report.render(models[id], target);
    if (target === 'csv') { csvPending++; ok(r.result && r.result.status === 'skeleton', id + ' · csv is the documented pending exception (skeleton)'); return; }
    realOutputs++;
    ok(r.ok === true && r.skeleton === false, id + ' · ' + target + ' renders through the engine (not a skeleton)');
  });
});

console.log('\nReal outputs verified: ' + realOutputs + ' · csv pending (documented): ' + csvPending);
console.log((fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
