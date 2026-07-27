/* REPORT-001 · R3 — Print Renderer tests (pure node; no browser).
   Verifies the engine's print renderer is now real: compose() assembles the
   shared layout + @page, registration swaps the skeleton, and Report.render(
   model,'print') is no longer a skeleton. Live iframe delivery is proven
   separately with Playwright. Usage: node tests/report-render-print.test.cjs */
require('../public/js/report-engine.js');            // global.Report (+ registerRenderer)
require('../public/js/report-layout.js');            // global.ReportLayout
const { buildMemberStatementModel } = require('../public/js/report-model.js');
const PrintRenderer = require('../public/js/report-render-print.js');  // registers itself
const Report = globalThis.Report;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const model = buildMemberStatementModel({
  member: { name: 'عضو تجريبي', member_code: 'A-12' },
  printDate: '2026-07-27T00:00:00.000Z',
  view: { statement: { finalBalance: 350 }, carried: 1200, histPaid: 800, totSub: 900, totPay: 550,
    moves: [{ date: '2025-03-01', no: 'REC-1', desc: 'إيصال 4477', dr: 0, cr: 400, bal: 800 }] }
});

/* ── compose() is pure and assembles the deliverable ── */
const c = PrintRenderer.compose(model, { lang: 'ar' });
ok(c && !c.error, 'compose() succeeds');
ok(/rpt-doc/.test(c.html) && c.html.includes('₪ 1,200') && /عضو تجريبي/.test(c.html), 'composed html carries the rendered statement');
ok(/@page\{size:A4 portrait;margin:9mm\}/.test(c.css), 'portrait @page (9mm) appended for a portrait report');
ok(/@font-face/.test(c.css) && /display:table-header-group/.test(c.css), 'css carries fonts + repeating-header rule');
ok(c.filename === 'MEMBER_STATEMENT-A-12-2026-07-27', 'deterministic unified filename');

/* landscape orientation → landscape @page */
const land = PrintRenderer.compose({ meta: { reportId: 'X', orientation: 'landscape' }, summary: [], sections: [] }, {});
ok(/@page\{size:A4 landscape;margin:10mm\}/.test(land.css), 'landscape report → landscape @page (10mm)');

/* ── registration: engine's print renderer is now REAL (not a skeleton) ── */
const r = Report.render(model, 'print');
ok(r.ok === true && r.skeleton === false && r.target === 'print', "Report.render(model,'print') is no longer a skeleton");
ok(r.result && r.result.status === 'composed' && r.result.empty === false, 'in node (no openPrintWin) it composes rather than delivers, cleanly');
ok(r.result.filename === 'MEMBER_STATEMENT-A-12-2026-07-27', 'render result carries the filename');

/* other targets remain skeletons after R3 (only print is wired) */
ok(Report.render(model, 'excel').result.status === 'skeleton', 'excel remains a skeleton after R3');
ok(Report.render(model, 'screen').result.status === 'skeleton', 'screen remains a skeleton after R3');

/* id form still works and is no longer skeleton for print */
ok(Report.render('MEMBER_STATEMENT', 'print', { model: model }).skeleton === false, "id form Report.render('MEMBER_STATEMENT','print',{model}) uses the real renderer");

/* graceful fallback when the layout is unavailable */
const savedRL = globalThis.ReportLayout; globalThis.ReportLayout = undefined;
const errComposed = PrintRenderer.compose(model, {});
globalThis.ReportLayout = savedRL;
ok(errComposed.error === 'layout_unavailable', 'compose() reports layout_unavailable when ReportLayout is missing (no throw)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
