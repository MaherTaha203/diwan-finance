/* PRINT-001 · PR-3 — static regression guard for retiring the raster PDF path.
   Pure-node source assertions (no browser). Locks in that "Download PDF" routes
   through the unified print engine (native Save-as-PDF) instead of the
   html2canvas/jsPDF raster pipeline that caused faded text (ROOT-4), sliced rows
   / non-repeating headers (ROOT-6), and print≠PDF geometry (ROOT-3). Live
   behaviour verified separately with Playwright. Usage:
     node tests/print-pdf-native.test.cjs */
const fs = require('fs');
const path = require('path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const printJs = read('public/js/print.js');

/* Isolate savePrintPDF, strip comments (they name the retired libs on purpose). */
const s = printJs.indexOf('function savePrintPDF(');
ok(s !== -1, 'savePrintPDF is defined');
const fnRaw = printJs.slice(s, printJs.indexOf('\n}', s) + 2);
const fnBody = fnRaw.replace(/\/\*[\s\S]*?\*\//g, '');

ok(/openPrintWin\(css, body, filename\)/.test(fnBody), 'savePrintPDF routes through openPrintWin (native print → Save as PDF)');
ok(!/html2pdf/i.test(fnBody) && !/html2canvas/i.test(fnBody) && !/jspdf/i.test(fnBody), 'savePrintPDF no longer references the raster libraries');
ok(!/document\.createElement\(['"]script['"]\)/.test(fnBody), 'savePrintPDF no longer injects a CDN <script>');

/* openPrintWin supports an optional title (drives the Save-as-PDF file name). */
ok(/function openPrintWin\(css,body,title\)/.test(printJs), 'openPrintWin accepts an optional title');
ok(/<title>/.test(printJs), 'openPrintWin embeds a <title> when provided');

/* Nowhere in the client scripts do the raster libraries survive (comments aside). */
const jsDir = path.join(__dirname, '..', 'public', 'js');
let libHit = null;
for (const f of fs.readdirSync(jsDir)) {
  if (!f.endsWith('.js')) continue;
  const txt = fs.readFileSync(path.join(jsDir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/html2pdf|html2canvas|jspdf/i.test(txt)) libHit = f;
}
ok(libHit === null, 'no raster PDF library referenced anywhere in public/js (found: ' + (libHit || 'none') + ')');

/* index.html doesn't ship a raster-lib <script>. */
ok(!/html2pdf|html2canvas|jspdf/i.test(read('public/index.html')), 'index.html loads no raster PDF library');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
