/* REPORT-001 · R5 — Excel Renderer tests (pure node; no browser, no XLSX lib).
   Verifies the engine's excel renderer is now real: compose() maps the neutral
   ReportModel into a spreadsheet description (aoa + styling directives) with the
   numbers preserved, registration swaps the skeleton, and Report.render(model,
   'excel') is no longer a skeleton. The styled .xlsx write itself uses the app's
   runtime xlsx-js-style path (proven in the browser); here we assert the pure
   description that drives it. Usage: node tests/report-render-excel.test.cjs */
require('../public/js/report-engine.js');            // global.Report (+ registerRenderer)
require('../public/js/report-layout.js');            // global.ReportLayout (parity of formatters)
const { buildMemberStatementModel } = require('../public/js/report-model.js');
const ExcelRenderer = require('../public/js/report-render-excel.js');  // registers itself
const Report = globalThis.Report;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const model = buildMemberStatementModel({
  member: { name: 'عضو تجريبي', member_code: 'A-12', phone: '0599' },
  printDate: '2026-07-27T00:00:00.000Z',
  from: '2025-01-01', to: '2025-12-31',
  view: { statement: { finalBalance: 350 }, carried: 1200, histPaid: 800, totSub: 900, totPay: 550,
    moves: [{ date: '2025-03-01', no: 'REC-1', desc: 'إيصال 4477', dr: 0, cr: 400, bal: 800 }] },
  donations: [{ receipt_date: '2025-05-02', no: 77, amount_ils: 250, movement_type: 'food_donation', destination_treasury: 'food' }]
});

/* ── compose() is pure and assembles the spreadsheet description ── */
const c = ExcelRenderer.compose(model, { lang: 'ar' });
ok(c && !c.error, 'compose() succeeds');
ok(Array.isArray(c.aoa) && c.aoa.length > 5, 'aoa is a populated array-of-arrays');
ok(c.filename === 'كشف الحساب المالي للعضو - عضو تجريبي - 2026-07-27', 'deterministic unified filename (matches print/pdf scheme)');
ok(c.rtl === true, 'workbook marked RTL');
ok(typeof c.sheetName === 'string' && c.sheetName.length > 0 && c.sheetName.length <= 31, 'sheet name present and within Excel 31-char limit');

/* title + subtitle carried faithfully */
ok(c.aoa[0][0] === 'كشف الحساب المالي للعضو', 'row 0 is the report title');
ok(/عضو تجريبي/.test(c.aoa[1][0]) && /A-12/.test(c.aoa[1][0]) && /2025-01-01/.test(c.aoa[1][0]), 'subtitle carries party + period');
ok(c.styles.titleRows.includes(0), 'title row flagged for title styling');

/* numbers preserved as NUMBERS (so Excel can sum), not strings */
const flat = c.aoa.flat();
ok(flat.includes(1200) && flat.includes(350), 'carried (1200) and final balance (350) present as raw numbers');
ok(flat.some(v => v === 900) && flat.some(v => v === 800), 'summary figures (totSub 900, histPaid 800) present as numbers');

/* the ledger header row + a data row + the totals row exist and are flagged */
const headerRow = c.styles.headerRows[0];
ok(c.aoa[headerRow].includes('التاريخ') && c.aoa[headerRow].includes('الرصيد الجاري'), 'ledger column headers row present');
ok(c.styles.totalRows.length >= 1, 'at least one totals row flagged (navy)');
const totRow = c.aoa[c.styles.totalRows[0]];
ok(/الرصيد النهائي الحالي/.test(totRow[0]) && /على العضو مستحقات/.test(totRow[0]), 'totals row carries label + status');

/* band (carried) + money-cell directives */
ok(c.styles.bandRows.length >= 1, 'carried band + summary flagged as band rows');
ok(c.styles.moneyCells.length >= 3 && c.styles.moneyCells.every(rc => Array.isArray(rc) && rc.length === 2), 'money cells recorded as [row,col] for ₪ formatting');

/* donations = second table + its footnote */
ok(c.styles.headerRows.length === 2, 'two table header rows (ledger + donations)');
ok(flat.includes(250), 'donation amount (250) present as a number');
ok(c.styles.footRows.length >= 1 && /حدث مستقل/.test(c.aoa[c.styles.footRows[0]][0]), 'donation footnote row present and muted-styled');

/* autofilter/freeze anchor */
ok(c.primaryHeaderRow === headerRow, 'primary header row seeds autofilter + freeze');

/* ── registration: engine's excel renderer is now REAL (not a skeleton) ── */
const r = Report.render(model, 'excel');
ok(r.ok === true && r.skeleton === false && r.target === 'excel', "Report.render(model,'excel') is no longer a skeleton");
ok(r.result && r.result.status === 'composed' && r.result.empty === false, 'in node (no XLSX lib) it composes rather than writes, cleanly');
ok(r.result.filename === 'كشف الحساب المالي للعضو - عضو تجريبي - 2026-07-27', 'render result carries the filename');

/* other targets unaffected: print/pdf stay real, screen/csv stay skeletons */
const PrintRenderer = require('../public/js/report-render-print.js');
require('../public/js/report-render-pdf.js');
ok(Report.render(model, 'print').skeleton === false, 'print stays real after R5');
ok(Report.render(model, 'pdf').skeleton === false, 'pdf stays real after R5');
ok(Report.render(model, 'screen').result.status === 'skeleton', 'screen remains a skeleton after R5');
ok(Report.render(model, 'csv').result.status === 'skeleton', 'csv remains a skeleton after R5');

/* id form still works and is no longer skeleton for excel */
ok(Report.render('MEMBER_STATEMENT', 'excel', { model: model }).skeleton === false, "id form Report.render('MEMBER_STATEMENT','excel',{model}) uses the real renderer");

/* graceful guard for an invalid model */
ok(ExcelRenderer.compose({}, {}).error === 'model_invalid', 'compose() guards a model with no meta (no throw)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
