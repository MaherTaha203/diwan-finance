/* OUTPUT-002-C UX Slice 1 — Output Rendering Contract (screen vs print document logo).
   Owner rule: inside the system, every Report/Statement view on SCREEN carries NO
   document logo — ALWAYS. The logo belongs to Print/PDF only, and there only when
   Show Logo is enabled. This is enforced in the engine header() by `target`, NOT by
   CSS hiding — so it holds for EVERY report the unified engine renders (member/fund
   statements, annual-debt, delinquent, lists, …). This test locks that contract.
   Usage: node tests/screen-print-logo-contract.test.cjs */
require('../public/js/report-engine.js');            // populates REPORT_TOKENS
const ReportLayout = require('../public/js/report-layout.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

function model(logo) {
  return {
    meta: { title: { ar: 'تقرير', en: 'Report' },
      org: { name: { ar: 'ديوان آل طه', en: 'Diwan' }, subtitle: { ar: 'نظام', en: 'Sys' }, site: 'diwan-finance.com', logo: logo } },
    sections: [{ type: 'table', id: 't', columns: [{ key: 'a', header: { ar: 'أ', en: 'A' }, format: 'text' }], rows: [{ a: 'x' }] }]
  };
}
const LOGO = 'data:image/png;base64,iVBORw0KGgo=';

/* 1 · SCREEN — the document logo is NEVER rendered, even when a logo is configured. */
const scr = ReportLayout.build(model(LOGO), { lang: 'ar', target: 'screen' });
ok(!/rpt-hd-chip/.test(scr.html) && !/<img/.test(scr.html),
  'SCREEN: document logo is never rendered (contract), even with a logo configured');

/* 2 · PRINT — the logo IS rendered when Show Logo is on (org.logo present). */
const prn = ReportLayout.build(model(LOGO), { lang: 'ar', target: 'print' });
ok(/rpt-hd-chip/.test(prn.html) && /<img/.test(prn.html),
  'PRINT: document logo IS rendered when Show Logo is enabled (org.logo present)');

/* 3 · PDF path uses the same target !== screen branch → logo present. */
const pdf = ReportLayout.build(model(LOGO), { lang: 'ar', target: 'pdf' });
ok(/rpt-hd-chip/.test(pdf.html), 'PDF: document logo IS rendered (same contract as print)');

/* 4 · PRINT with Show Logo OFF — OutputProfile.org() returns logo:'' → no logo. */
const off = ReportLayout.build(model(''), { lang: 'ar', target: 'print' });
ok(!/rpt-hd-chip/.test(off.html) && !/<img/.test(off.html),
  'PRINT: no document logo when Show Logo is disabled (org.logo empty)');

/* 5 · the contract lives in the render decision, not a CSS display:none hack. */
ok(!/rpt-hd-chip[^{]*\{[^}]*display\s*:\s*none/.test(scr.css || ''),
  'contract is enforced by the renderer (target), not by CSS-hiding the logo');

console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
