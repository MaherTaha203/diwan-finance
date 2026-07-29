/* OUTPUT-002-C UX Slice 2 — print pagination / running-footer reservation.
   Root cause: a `position:fixed` running footer reserves NO flow space, so on a full page
   the last table row (packed to the content-box edge) collided with / printed under the
   footer. Fix: the print/pdf layout wraps the whole flow in a `.rpt-runpage` table whose
   `.rpt-runspacer` tfoot (display:table-footer-group) reserves a real band at the foot of
   EVERY printed page — the paginator now breaks ABOVE that band and the fixed footer paints
   over it. This is a STRUCTURAL reservation, not a bigger bottom margin. Screen keeps the
   flat, unpaginated flow (no wrapper). This test locks that contract.
   Usage: node tests/print-pagination-footer-reserve.test.cjs */
require('../public/js/report-engine.js');            // populates REPORT_TOKENS
const ReportLayout = require('../public/js/report-layout.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

function model() {
  return {
    meta: { title: { ar: 'قائمة', en: 'List' },
      org: { name: { ar: 'ديوان آل طه', en: 'Diwan' }, site: 'diwan-finance.com', logo: '' } },
    sections: [{ type: 'table', id: 't',
      columns: [{ key: 'a', header: { ar: 'أ', en: 'A' }, format: 'text' }],
      rows: [{ a: 'x' }, { a: 'y' }],
      totals: { label: { ar: 'الإجمالي', en: 'Total' }, cells: { a: '' } } }]
  };
}

const prn = ReportLayout.build(model(), { lang: 'ar', target: 'print' });
const scr = ReportLayout.build(model(), { lang: 'ar', target: 'screen' });
const pdf = ReportLayout.build(model(), { lang: 'ar', target: 'pdf' });
const css = prn.css || '';

/* 1 · PRINT wraps the flow in the running-page table with a footer-group spacer. */
ok(/<table class="rpt-runpage">/.test(prn.html), 'PRINT: flow is wrapped in the .rpt-runpage table');
ok(/<tfoot class="rpt-runspacer">/.test(prn.html), 'PRINT: the reservation spacer is a real <tfoot> (repeats every page)');
/* the tfoot precedes the tbody in source (valid HTML) so the reservation is declared. */
ok(prn.html.indexOf('rpt-runspacer') < prn.html.indexOf('<tbody>'), 'PRINT: tfoot spacer declared before tbody (running-foot semantics)');

/* 2 · the running footer (printed date) lives INSIDE the wrapper, so it repeats with it. */
ok(/rpt-runpage[\s\S]*rpt-footer[\s\S]*<\/table>/.test(prn.html), 'PRINT: the .rpt-footer sits inside the running-page table');

/* 3 · the reservation mechanism is table-footer-group (NOT a bigger margin). */
ok(/\.rpt-runspacer\{display:table-footer-group\}/.test(css), 'CSS: .rpt-runspacer uses display:table-footer-group (reserves space each page)');
ok(/\.rpt-runspacer>tr>td\{height:9mm/.test(css), 'CSS: the reserved band has an explicit height (the clearance the fixed footer paints into)');
/* the fixed running footer is still fixed+bottom:0 (pinned to the page bottom every page). */
ok(/\.rpt-footer\{position:fixed;bottom:0;/.test(css), 'CSS: the running footer is still position:fixed;bottom:0 (pinned to every page)');
/* the fix did NOT resort to inflating the @page bottom margin — that is the print renderer's
   job and stays put; assert we did not sneak a giant margin into the component CSS. */
ok(!/margin-bottom:\s*[2-9][0-9]mm/.test(css), 'CSS: the fix is a reservation, not an inflated bottom margin');

/* 4 · SCREEN keeps the flat flow — no running-page wrapper, no reservation spacer. */
ok(!/rpt-runpage/.test(scr.html) && !/rpt-runspacer/.test(scr.html), 'SCREEN: flat flow untouched (no pagination wrapper)');

/* 5 · PDF shares the print reservation (same output-document pagination). */
ok(/<table class="rpt-runpage">/.test(pdf.html) && /rpt-runspacer/.test(pdf.html), 'PDF: same running-footer reservation as print');

/* 6 · continuation-page repeat rules for the data table are intact (headers repeat, totals
   once, rows never split) — unchanged by the wrap. */
ok(/\.rpt-table thead\{display:table-header-group\}/.test(css), 'CSS: column headers still repeat on continuation pages');
ok(/\.rpt-table tfoot\{display:table-row-group\}/.test(css), 'CSS: totals still render once at the true end (not repeated)');
ok(/\.rpt-table tr\{page-break-inside:avoid\}/.test(css), 'CSS: data rows still never split across a page break');

console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
