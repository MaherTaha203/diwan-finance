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
ok((rfBody.match(/<span>/g) || []).length === 2, 'pgfoot now has exactly 2 spans (brand + printed date, no page span)');

/* ROOT-8 — the member statement uses @page margin only, no body padding. */
const msLine = (printJs.split('\n').find(l => l.includes('@page{size:A4 portrait;margin:9mm}')) || '');
ok(msLine.length > 0, 'member statement @page margin:9mm present');
ok(!/padding:9mm/.test(msLine), 'member statement body no longer adds padding:9mm (no double margin)');

/* No other live print doc double-margins: no "@page{...margin...}...body{...padding: <n>mm}" pairing. */
const doubleMargin = /@page\{[^}]*margin:\s*\d+mm[^}]*\}[^']*body\{[^}]*padding:\s*\d+mm/;
ok(!doubleMargin.test(printJs), 'no @page-margin + body-padding double inset remains in print.js');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
