/* REPORT-001 · R7c — Donations Register cut-over tests (pure node).
     A) buildDonationReportModel maps rows + the cash/in-kind split faithfully;
     B) the layout renders it; C) the outputs-only adapter routes print/pdf/excel
        through the engine only when the flag is ON (globals stubbed).
   Usage: node tests/report-r7c-donation.test.cjs */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
const { buildDonationReportModel, ReportModel } = M;
const Report = globalThis.Report, ReportLayout = globalThis.ReportLayout;

/* ── Part A — the pure donation model ── */
const rows = [
  { date: '2025-04-04', ref: '4403', donor: 'متبرع كريم', amount: 600, currency: 'ILS', direction: 'صندوق الغداء · دعم حالي ₪600', note: null },
  { date: '2025-05-02', ref: '77', donor: 'محمد آل طه', amount: 250, currency: 'USD', direction: 'خزينة الديوان', note: 'تحويل' },
  { date: '2025-06-01', ref: '80', donor: 'فاعل خير', amount: 0, currency: 'ILS', direction: 'عيني/خدمي · توثيقي (أرز)', note: null }
];
const summary = { count: 3, cashTot: 850, inkindTot: 400, foodDebt: 100, foodDeficit: 50, foodSupport: 600, toDiwan: 250 };
const dm = buildDonationReportModel({ rows: rows, summary: summary, printDate: '2026-07-27T00:00:00.000Z' });

ok(ReportModel.validate(dm).ok, 'donation model validates against the frozen schema');
ok(dm.meta.reportId === 'DONATION_REPORT' && dm.meta.orientation === 'landscape', 'meta DONATION_REPORT landscape');
const tab = dm.sections[0];
ok(tab.columns.map(c => c.key).join(',') === 'date,ref,donor,amount,currency,direction,note', 'the 7 declared columns in order');
ok(tab.rows.length === 3 && tab.rows[0].amount === 600 && tab.rows[1].currency === 'USD', 'rows preserve amount + currency');
ok(/عيني/.test(tab.rows[2].direction), 'in-kind direction label carried through');
ok(dm.summary.length === 7 && dm.summary[1].value === 850 && dm.summary[1].tone === 'pos', 'summary: 7 cards, cash total tagged positive');
ok(tab.totals.cells.amount === 850, 'totals cap the amount column at the CASH total (in-kind excluded)');
ok(/توثيقية: ₪400/.test(tab.totals.status.ar), 'totals status shows the separate in-kind documentary value');

/* ── Part B — layout renders it ── */
const html = ReportLayout.build(dm, { lang: 'ar' }).html;
ok(/rpt-doc/.test(html) && html.includes('₪ 850') && /سجل التبرعات/.test(html), 'layout renders the register (cash total + title)');

/* ── Part C — outputs-only adapter (globals stubbed) ── */
require('../public/js/report-cutover-core.js');
globalThis.document = { getElementById: () => null };
globalThis.LANG = 'ar';
globalThis.FIN = { donationRegister: () => ({}) };
globalThis.ReportModels = { donationReport: () => dm };
const calls = [];
globalThis.Report = { render: (m, t) => { calls.push({ target: t, id: m && m.meta && m.meta.reportId }); return { ok: true }; }, outputButtons: () => '' };
globalThis.can = null;
globalThis.REPORT_ENGINE_DONATION_REPORT = true;
const Don = require('../public/js/report-cutover-donation.js');

ok(Don.ready() === true, 'adapter ready when flag ON + engine + gatherer + FIN present');
Don.deliver('print'); Don.deliver('pdf'); Don.deliver('excel');
ok(calls.length === 3 && calls.every(c => c.id === 'DONATION_REPORT'), 'print/pdf/excel all route the DONATION_REPORT model to the engine');
ok(calls[0].target === 'print' && calls[1].target === 'pdf' && calls[2].target === 'excel', 'each output routed to the matching renderer');

globalThis.REPORT_ENGINE_DONATION_REPORT = false;
const before = calls.length;
ok(Don.ready() === false && Don.deliver('print') === false && calls.length === before, 'flag OFF ⇒ adapter inert (legacy path runs)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
