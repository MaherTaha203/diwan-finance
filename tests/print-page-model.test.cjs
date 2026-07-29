/* PRINT-001 · PR-4 — static regression guard for the page-model corrections.
   Pure-node source assertions (no browser).
     · ROOT-8 — the member statement no longer double-insets (body padding on top
       of the @page margin).
     · ROOT-7 — the footer no longer prints a hard-coded (wrong) page number.
   Usage: node tests/print-page-model.test.cjs */
const fs = require('fs');
const path = require('path');
const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'print.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ROOT-7 — reportFooter drops the page span; no hard-coded page label remains. */
const rf = printJs.slice(printJs.indexOf('function reportFooter('), printJs.indexOf('function reportFooter(') + 900);
const rfBody = rf.replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/صفحة 1/.test(rfBody), 'reportFooter no longer hard-codes a page number');
ok((rfBody.match(/<span>/g) || []).length === 1, 'pgfoot has exactly 1 bare span — the print date only (brand line removed for dedup, OUTPUT-002-C)');

/* ROOT-8 → REPORT-001 · R8-b — the member-statement print builder was removed from
   print.js; the unified engine now renders it (its @page comes from the shared
   print/pdf renderer). So print.js no longer carries the legacy 9mm member-statement
   page CSS, and the ROOT-8 no-double-inset invariant is enforced generally below. */
ok(!printJs.includes('@page{size:A4 portrait;margin:9mm}'), 'legacy member-statement @page CSS removed from print.js (now engine-rendered) — R8-b');

/* No other live print doc double-margins: no "@page{...margin...}...body{...padding: <n>mm}" pairing. */
const doubleMargin = /@page\{[^}]*margin:\s*\d+mm[^}]*\}[^']*body\{[^}]*padding:\s*\d+mm/;
ok(!doubleMargin.test(printJs), 'no @page-margin + body-padding double inset remains in print.js');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
