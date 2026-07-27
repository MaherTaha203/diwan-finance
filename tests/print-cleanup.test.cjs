/* PRINT-001 · PR-6 — dead-code retirement guard for the legacy print engine.
   Pure-node source assertions (no browser). Ensures the removed dead code stays
   removed: the unused amount-in-words helpers, the unused firstName helper, and
   the discarded Cairo/Reem-Kufi member-statement htmlDoc builder (ROOT-13).
   Usage: node tests/print-cleanup.test.cjs */
const fs = require('fs');
const path = require('path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const printJs = read('public/js/print.js');
const appJs = read('public/js/app.js');

/* Dead helpers are gone (definitions removed; comments naming them are fine). */
ok(!/function amountToWords\(/.test(printJs), 'amountToWords() definition removed');
ok(!/function amountToWordsAr\(/.test(printJs), 'amountToWordsAr() definition removed');
ok(!/function firstName\(/.test(printJs), 'firstName() definition removed');

/* The English words helper the vouchers actually use is retained. */
ok(/function amountToWordsEn\(/.test(printJs), 'amountToWordsEn() (used by vouchers) retained');

/* ROOT-13 — the dead Cairo/Reem-Kufi member-statement builder is gone. */
ok(!/Reem\+Kufi/.test(appJs), 'no Reem+Kufi font link remains in app.js');
ok(!/family=Cairo/.test(appJs), 'no Cairo font link remains in app.js');
ok(!/\bhtmlDoc\b/.test(appJs.replace(/\/\*[\s\S]*?\*\//g, '')), 'dead htmlDoc builder removed from app.js (code)');

/* The unified redirect that replaced it is intact. */
ok(/if\(format==='html'\|\|format==='pdf'\)\{ return window\.prtMemberStmt\('pdf'\); \}/.test(appJs),
  'HTML/PDF member-statement export still redirects to the unified prtMemberStmt');

/* No raster PDF library survives anywhere (belt-and-suspenders with PR-3 guard). */
const jsDir = path.join(__dirname, '..', 'public', 'js');
let hit = null;
for (const f of fs.readdirSync(jsDir)) {
  if (!f.endsWith('.js')) continue;
  const txt = fs.readFileSync(path.join(jsDir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/html2pdf|html2canvas|jspdf/i.test(txt)) hit = f;
}
ok(hit === null, 'no raster PDF library referenced in public/js (found: ' + (hit || 'none') + ')');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
