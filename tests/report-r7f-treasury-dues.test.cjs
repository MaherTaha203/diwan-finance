/* REPORT-001 · R7f — Treasury Position + Dues Snapshot tests (pure node).
     A) buildTreasuryPositionModel maps position cards + health + movement;
     B) buildDuesSnapshotModel maps cards + members + schedule;
     C) both validate + render + are delivered by the real print renderer.
   Usage: node tests/report-r7f-treasury-dues.test.cjs */
require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
require('../public/js/report-render-print.js');   // makes 'print' a real renderer
const { buildTreasuryPositionModel, buildDuesSnapshotModel, ReportModel } = M;
const Report = globalThis.Report, ReportLayout = globalThis.ReportLayout;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── A — treasury position ── */
const tp = buildTreasuryPositionModel({
  position: { food: 1000, diwan: 2000, don: 300, combined: 3000, netCombined: 2500, netFood: 500, deficit: -800, reserve: 150, support: 600, debtSettled: 100 },
  movement: { totalIn: 900, totalOut: 400 },
  rows: [{ date: '2025-03-01', no: 'REC-1', fund: 'صندوق الغداء', party: 'محمد', desc: 'اشتراك', in: 200, out: null },
         { date: '2025-03-05', no: 'PAY-1', fund: 'صندوق الديوان', party: 'مورد', desc: 'مصروف', in: null, out: 400 }],
  periodLabel: 'كل الفترات', printDate: '2026-07-27T00:00:00.000Z'
});
ok(ReportModel.validate(tp).ok, 'treasury model validates');
ok(tp.meta.reportId === 'TREASURY_POSITION' && tp.meta.orientation === 'landscape', 'meta TREASURY_POSITION landscape');
ok(tp.summary.length === 4 && tp.summary[3].value === 3000, 'four position cards (combined = 3000)');
const health = tp.sections.find(s => s.id === 'health'), move = tp.sections.find(s => s.id === 'movement');
ok(health && health.rows.length === 6 && health.rows[2].value === -800, 'health table has 6 metrics (deficit -800)');
ok(move && move.columns.map(c => c.key).join(',') === 'date,no,fund,party,desc,in,out', 'movement columns date,no,fund,party,desc,in,out');
ok(move.rows[0].in === 200 && move.rows[1].out === 400 && move.totals.cells.in === 900 && move.totals.cells.out === 400, 'movement rows + totals preserved');

/* ── B — dues snapshot ── */
const dz = buildDuesSnapshotModel({
  state: { year: 2025, perMember: 200, eligible: 40, due: 8000, outstanding: 1500, billed: true },
  statusText: 'مُطبَّقة',
  rows: [{ code: 'A-1', name: 'محمد', phone: '0599', due: 200, paid: 50, remaining: 150, status: 'متبقّي' },
         { code: 'A-2', name: 'سالم', phone: '', due: 200, paid: 200, remaining: 0, status: 'مسدَّد' }],
  schedule: [{ year: 2024, amount: 200, memberCount: 38, total: 7600, appliedAt: '2024-01-05', appliedBy: 'admin' }],
  filterLabel: 'سنة الاشتراك 2025 · الفلتر: الكل', printDate: '2026-07-27T00:00:00.000Z'
});
ok(ReportModel.validate(dz).ok, 'dues model validates');
ok(dz.meta.reportId === 'DUES_SNAPSHOT' && /2025/.test(dz.meta.title.ar), 'meta DUES_SNAPSHOT with year in title');
ok(dz.summary.length === 5 && dz.summary[0].value === 'مُطبَّقة' && dz.summary[4].tone === 'neg', 'five cards (year status text; outstanding negative tone)');
const mem = dz.sections.find(s => s.id === 'members'), sch = dz.sections.find(s => s.id === 'schedule');
ok(mem.columns.map(c => c.key).join(',') === 'code,name,phone,due,paid,remaining,status', 'members columns code,name,phone,due,paid,remaining,status');
ok(mem.totals.cells.due === 400 && mem.totals.cells.paid === 250 && mem.totals.cells.remaining === 150, 'members totals summed');
ok(sch && sch.rows[0].total === 7600, 'schedule table present with totals');

/* ── C — both render + are delivered by the real print renderer ── */
ok(/rpt-doc/.test(ReportLayout.build(tp, { lang: 'ar' }).html) && /الخزينة/.test(ReportLayout.build(tp, { lang: 'ar' }).html), 'treasury layout renders');
ok(/rpt-doc/.test(ReportLayout.build(dz, { lang: 'ar' }).html) && /2025/.test(ReportLayout.build(dz, { lang: 'ar' }).html), 'dues layout renders');
ok(Report.render(tp, 'print').skeleton === false && Report.render(dz, 'print').skeleton === false, "Report.render(model,'print') uses the real renderer for both (not a skeleton)");

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
