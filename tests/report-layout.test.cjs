/* REPORT-001 · R2 — Layout Components tests (pure node, no browser).
   Feeds the R1 member-statement model through ReportLayout.build and asserts the
   ordered components render faithfully (data present + correctly formatted,
   repeating-header table structure, totals, RTL) — no report migrated, no DOM.
   Usage: node tests/report-layout.test.cjs */
require('../public/js/report-engine.js');           // populates global REPORT_TOKENS
const { buildMemberStatementModel } = require('../public/js/report-model.js');
const ReportLayout = require('../public/js/report-layout.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const model = buildMemberStatementModel({
  member: { name: 'عضو تجريبي', member_code: 'A-12', phone: '0591', active_from_year: 2019 },
  from: '2025-01-01', to: '2025-12-31', printDate: '2026-07-27T00:00:00.000Z',
  view: {
    statement: { finalBalance: 350 }, carried: 1200, histPaid: 800, totSub: 900, totPay: 550,
    moves: [
      { date: '2025-03-01', no: 'REC-1', desc: 'إيصال 4477', dr: 0, cr: 400, bal: 800 },
      { date: '2025-04-01', no: '—', desc: 'اشتراك 2025', dr: 200, cr: 0, bal: 1000 }
    ]
  },
  donations: [{ receipt_date: '2025-06-01', no: 'D-9', amount_ils: 300, movement_type: 'donation', destination_treasury: 'food', _settled: 100 }]
});

const ar = ReportLayout.build(model, { lang: 'ar' });
const en = ReportLayout.build(model, { lang: 'en' });

ok(ar && typeof ar.html === 'string' && typeof ar.css === 'string', 'build() returns { html, css } strings');

/* ordered components present */
ok(/rpt-doc" dir="rtl"/.test(ar.html), 'document root is RTL');
ok(/rpt-header/.test(ar.html) && /عضو تجريبي/.test(ar.html) && /A-12/.test(ar.html), 'header + member meta rendered');
ok(/rpt-cards/.test(ar.html) && (ar.html.match(/rpt-card-k/g) || []).length === 3, 'KPI summary renders the 3 cards');
ok(/rpt-band/.test(ar.html), 'carried-balance band rendered');
ok(/rpt-table/.test(ar.html) && /<thead>/.test(ar.html) && /<tbody>/.test(ar.html) && /rpt-total/.test(ar.html), 'ledger table has thead + tbody + totals row');
ok(/rpt-notes/.test(ar.html), 'donation footnote rendered');
ok(/rpt-footer/.test(ar.html), 'footer rendered');

/* number / date / balance formatting */
ok(ar.html.includes('₪ 1,200'), 'money formatted with grouping (1,200)');
ok(ar.html.includes('₪ 900') && ar.html.includes('₪ 550') && ar.html.includes('₪ 800'), 'KPI values formatted (900/550/800)');
ok(/01\/03\/2025/.test(ar.html), 'date formatted dd/mm/yyyy');
ok(/مدين/.test(ar.html), 'positive balance shows Dr tag (مدين) in AR');
ok(ReportLayout._fmt.balanceCell(-50, 'en').includes('Cr') && ReportLayout._fmt.balanceCell(50, 'en').includes('Dr'), 'balanceCell Dr/Cr by sign');
ok(ReportLayout._fmt.moneyAbs(-350) === '₪ 350', 'balance shows absolute value');

/* totals carry the final balance + status */
ok(/rpt-total/.test(ar.html) && ar.html.includes('على العضو مستحقات'), 'totals row shows final-balance status (AR)');

/* faithfulness: every certified figure present, no object leakage */
ok(!ar.html.includes('[object Object]'), 'no [object Object] leakage (labels resolved)');
['1,200', '900', '550', '800', '350', '300'].forEach(function (n) { ok(ar.html.includes(n), 'figure ' + n + ' present in layout'); });

/* CSS carries tokens (fonts) + repeating-header rule + namespaced classes */
ok(/@font-face/.test(ar.css) && /\/fonts\/ibm-plex-/.test(ar.css), 'css includes self-hosted @font-face (from REPORT_TOKENS)');
ok(/display:table-header-group/.test(ar.css), 'print CSS repeats table headers');
ok(/page-break-inside:avoid/.test(ar.css), 'print CSS keeps rows/totals atomic');
ok(/\.rpt-table/.test(ar.css) && !/\.acct-stmt|\.dt\b/.test(ReportLayout.REPORT_COMPONENT_CSS), 'component CSS is namespaced rpt-* (no legacy .dt/.acct-stmt)');

/* i18n: English variant swaps headers */
ok(/Member:/.test(en.html) && /Running balance/.test(en.html) && /Outstanding/.test(en.html), 'English layout renders English headers/labels');

/* empty statement still builds */
const empty = ReportLayout.build(buildMemberStatementModel({ view: { statement: { finalBalance: 0 }, carried: 0, moves: [] } }), { lang: 'ar' });
ok(/rpt-table/.test(empty.html) && !/rpt-notes/.test(empty.html), 'empty statement still builds a table, no donation notes');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
