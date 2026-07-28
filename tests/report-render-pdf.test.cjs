/* REPORT-001 · R4 — PDF Renderer tests (pure node; no browser).
   Verifies the engine's pdf renderer is now real: it reuses the print
   renderer's composition (same shared layout + @page + running bands),
   registration swaps the skeleton, and Report.render(model,'pdf') is no
   longer a skeleton. Also asserts the shared layout now emits the running
   header/footer bands. Live iframe delivery is proven with Playwright.
   Usage: node tests/report-render-pdf.test.cjs */
require('../public/js/report-engine.js');            // global.Report (+ registerRenderer)
require('../public/js/report-layout.js');            // global.ReportLayout
const { buildMemberStatementModel } = require('../public/js/report-model.js');
require('../public/js/report-render-print.js');      // print renderer (pdf reuses its compose)
const PdfRenderer = require('../public/js/report-render-pdf.js');  // registers itself
const Report = globalThis.Report;
const ReportLayout = globalThis.ReportLayout;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const model = buildMemberStatementModel({
  member: { name: 'عضو تجريبي', member_code: 'A-12' },
  printDate: '2026-07-27T00:00:00.000Z',
  view: { statement: { finalBalance: 350 }, carried: 1200, histPaid: 800, totSub: 900, totPay: 550,
    moves: [{ date: '2025-03-01', no: 'REC-1', desc: 'إيصال 4477', dr: 0, cr: 400, bal: 800 }] }
});

/* ── the shared layout now carries the running header/footer bands (R4) ── */
const built = ReportLayout.build(model, { lang: 'ar' });
ok(/rpt-runhead/.test(built.html) && /rpt-runfoot/.test(built.html), 'layout html emits the running header + footer bands');
ok(/rpt-mast-brand/.test(built.html), 'layout still emits the in-flow masthead brand (shown on screen)');
ok(/\.rpt-runhead,\.rpt-runfoot\{display:none\}/.test(built.css), 'running bands are hidden by default (screen off)');
ok(/@media print\{[^]*\.rpt-runhead\{display:flex;position:fixed;top:0/.test(built.css), 'in print the running header is fixed to the top of every page');
ok(/\.rpt-runfoot\{display:flex;position:fixed;bottom:0/.test(built.css), 'in print the running footer is fixed to the bottom of every page');
/* OUTPUT-002-C: the masthead is now the page-1 document header in print (carries the
   org logo); only the in-flow footer gives way to the fixed running footer band. */
ok(/\.rpt-footer\{display:none\}/.test(built.css), 'in print the in-flow footer gives way to the fixed running footer');
ok(!/\.rpt-mast-brand,\.rpt-footer\{display:none\}/.test(built.css), 'the masthead is no longer hidden in print (logo lives in the printed header)');

/* ── compose() reuses the print renderer's composition ── */
const c = PdfRenderer.compose(model, { lang: 'ar' });
ok(c && !c.error, 'compose() succeeds');
ok(/rpt-doc/.test(c.html) && c.html.includes('₪ 1,200') && /عضو تجريبي/.test(c.html), 'composed html carries the rendered statement');
ok(/@page\{size:A4 portrait;margin:14mm 9mm 12mm\}/.test(c.css), 'portrait @page reserves running-band margins (same as print)');
ok(c.filename === 'كشف الحساب المالي للعضو - عضو تجريبي - 2026-07-27', 'deterministic unified filename (shared with print)');

/* ── registration: engine's pdf renderer is now REAL (not a skeleton) ── */
const r = Report.render(model, 'pdf');
ok(r.ok === true && r.skeleton === false && r.target === 'pdf', "Report.render(model,'pdf') is no longer a skeleton");
ok(r.result && r.result.status === 'composed' && r.result.empty === false, 'in node (no openPrintWin) it composes rather than delivers, cleanly');
ok(r.result.filename === 'كشف الحساب المالي للعضو - عضو تجريبي - 2026-07-27', 'render result carries the filename');

/* print is still real (unchanged by R4); excel/screen remain skeletons */
ok(Report.render(model, 'print').skeleton === false, 'print renderer stays real after R4');
ok(Report.render(model, 'excel').result.status === 'skeleton', 'excel remains a skeleton after R4');
ok(Report.render(model, 'screen').result.status === 'skeleton', 'screen remains a skeleton after R4');

/* id form still works and is no longer skeleton for pdf */
ok(Report.render('MEMBER_STATEMENT', 'pdf', { model: model }).skeleton === false, "id form Report.render('MEMBER_STATEMENT','pdf',{model}) uses the real renderer");

/* graceful fallback when the print renderer is unavailable */
const savedPrint = globalThis.ReportPrintRenderer; globalThis.ReportPrintRenderer = { compose: null };
const errComposed = PdfRenderer.compose(model, {});
globalThis.ReportPrintRenderer = savedPrint;
ok(errComposed.error === 'print_renderer_unavailable', 'compose() reports print_renderer_unavailable when the print renderer is missing (no throw)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
