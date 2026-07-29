/* REPORT-001 · R7b — Annual Debt + Delinquent cut-over tests (pure node).
     A) buildAnnualDebtModel maps FIN.debtReportRows faithfully (signed current);
     B) buildDelinquentModel builds DYNAMIC per-year columns + status cells;
     C) both layouts render; D) the debt cut-over adapters route print/pdf/excel
        through the engine only when their flags are ON (DOM/globals stubbed).
   Usage: node tests/report-r7b-debt.test.cjs */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
const { buildAnnualDebtModel, buildDelinquentModel, ReportModel } = M;
const Report = globalThis.Report, ReportLayout = globalThis.ReportLayout;

/* ── Part A — annual debt model ── */
const debt = {
  rows: [
    { code: 'A-1', name: 'محمد', phone: '0599', hist: 500, histPaid: 200, selSub: 400, selPaid: 300, resolutions: 50, current: 350 },
    { code: 'A-2', name: 'سالم', phone: '', hist: 0, histPaid: 0, selSub: 200, selPaid: 250, resolutions: 0, current: -50 }
  ],
  totals: { hist: 500, histPaid: 200, selSub: 600, selPaid: 550, resolutions: 50, current: 300 }, totalMembers: 2
};
const dm = buildAnnualDebtModel({ rows: debt.rows, totals: debt.totals, totalMembers: 2, shown: 2,
  filterLabel: { ar: 'الكل', en: 'All' }, printDate: '2026-07-27T00:00:00.000Z' });
ok(ReportModel.validate(dm).ok, 'annual-debt model validates');
ok(dm.meta.reportId === 'ANNUAL_DEBT' && dm.meta.orientation === 'landscape', 'meta ANNUAL_DEBT landscape');
const dtab = dm.sections[0];
ok(dtab.columns.map(c => c.key).join(',') === 'code,name,phone,hist,histPaid,selSub,selPaid,resolutions,current', 'the 9 declared columns in order');
ok(dtab.columns[8].format === 'balance', 'current column is a signed balance (Dr/Cr)');
/* Slice 3 — rows are now canonically ordered by Arabic name, so assert by identity,
   not by position: signed `current` is preserved for each member (values untouched). */
ok(dtab.rows.find(r => r.code === 'A-1').current === 350 && dtab.rows.find(r => r.code === 'A-2').current === -50, 'signed current preserved (debtor + creditor)');
/* and the canonical order is applied: «سالم» (س) precedes «محمد» (م). */
ok(dtab.rows[0].name === 'سالم' && dtab.rows[1].name === 'محمد', 'rows are ascending by Arabic name (canonical, shared across surfaces)');
ok(dtab.totals.cells.selSub === 600 && dtab.totals.cells.resolutions === 50 && !('current' in dtab.totals.cells), 'totals carry sums but not current');
ok(dm.meta.filters.some(f => /الكل/.test(f.ar)) && dm.meta.filters.some(f => /2 \/ 2/.test(f.ar)), 'filters carry category + shown/total');

/* ── Part B — delinquent model (dynamic year columns) ── */
const del = {
  years: [2023, 2024, 2025],
  rows: [
    { code: 'A-1', name: 'محمد', phone: '0599', d: { unpaidCount: 1, byYear: {
      2023: { due: 200, paid: 200, remaining: 0, settled: true, status: 'paid', authoritative: false },
      2024: { due: 200, paid: 50, remaining: 150, settled: false, status: 'partial', authoritative: false },
      2025: { due: 0, paid: 0, remaining: 0, settled: true, status: 'paid', authoritative: false } } } },
    { code: 'A-2', name: 'سالم', phone: '', d: { unpaidCount: 0, byYear: {
      2024: { due: 200, paid: 200, remaining: 0, settled: true, status: 'paid', authoritative: true } } } }
  ]
};
const delM = buildDelinquentModel({ years: del.years, rows: del.rows, shown: 2, totalMembers: 5 });
ok(ReportModel.validate(delM).ok, 'delinquent model validates');
const dtab2 = delM.sections[0];
ok(dtab2.columns.map(c => c.key).join(',') === 'code,name,phone,y2023,y2024,y2025,unpaidCount', 'dynamic per-year columns between phone and unpaidCount');
ok(dtab2.rows[0].y2023 === '✓ مسدد' && dtab2.rows[0].y2024 === '✗ 150 ₪', 'year status cells mirror legacy _delCell (paid / remaining)');
ok(dtab2.rows[0].y2025 === null, 'a year with due<=0 → null (renderer shows —)');
ok(dtab2.rows[1].y2024 === '✓ مسدد ●', 'authoritative (owner-approved) cell carries the ● marker');
ok(dtab2.rows[0].unpaidCount === 1, 'unpaidCount preserved');

/* ── Part C — layouts render ── */
ok(/rpt-doc/.test(ReportLayout.build(dm, { lang: 'ar' }).html), 'annual-debt layout renders');
const delHtml = ReportLayout.build(delM, { lang: 'ar' }).html;
ok(/2023/.test(delHtml) && /2024/.test(delHtml) && /مسدد/.test(delHtml), 'delinquent layout renders the dynamic year columns + status');

/* ── Part D — cut-over adapters (globals stubbed) ── */
require('../public/js/report-cutover-core.js');
globalThis.document = { getElementById: () => null };
globalThis.LANG = 'ar';
globalThis.FIN = {};
globalThis.ReportModels = { annualDebt: () => dm, delinquent: () => delM };
const calls = [];
globalThis.Report = { render: (m, t) => { calls.push({ target: t, id: m && m.meta && m.meta.reportId }); return { ok: true }; }, outputButtons: () => '' };
globalThis.can = null;
globalThis.REPORT_ENGINE_ANNUAL_DEBT = true;
globalThis.REPORT_ENGINE_DELINQUENT = true;
const Debt = require('../public/js/report-cutover-debt.js');

ok(Debt.annualDebtReady() === true && Debt.delinquentReady() === true, 'both adapters ready when their flags are ON');
Debt.annualDebt('print'); Debt.annualDebt('excel'); Debt.delinquent('pdf');
ok(calls.length === 3 && calls[0].target === 'print' && calls[0].id === 'ANNUAL_DEBT', "annualDebt('print') routes the ANNUAL_DEBT model to the engine");
ok(calls[1].target === 'excel' && calls[2].target === 'pdf' && calls[2].id === 'DELINQUENT', "excel + delinquent pdf route to the engine");

globalThis.REPORT_ENGINE_ANNUAL_DEBT = false;
const before = calls.length;
ok(Debt.annualDebtReady() === false && Debt.annualDebt('print') === false && calls.length === before, 'annual-debt flag OFF ⇒ inert (delinquent flag independent, still ON)');
ok(Debt.delinquentReady() === true, 'the two flags are independent');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
