/* PRINT-001 · PR-2 — static regression guard for the S1 blank-native-print fix.
   Pure-node source assertions (no browser). Locks in that the Treasury and Dues
   workspaces print real documents through the shared print engine (not native
   window.print into the old #pra target, which produced a BLANK page — ROOT-1),
   and that the dead #pra blanket-hide + empty div are gone. Live rendering is
   verified separately with Playwright. Usage:
     node tests/print-native-views.test.cjs */
const fs = require('fs');
const path = require('path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const tw = read('public/js/treasury-workspace.js');
const dw = read('public/js/dues-workspace.js');
const css = read('public/css/app.css');
const html = read('public/index.html');

/* Each workspace builds a real print body and routes printing through openPrintWin. */
ok(/function buildPositionBody\(/.test(tw), 'treasury: buildPositionBody() exists');
ok(/window\.openPrintWin\(css, buildPositionBody\(\)\)/.test(tw), 'treasury: printPosition routes through openPrintWin');
ok(/function buildDuesBody\(/.test(dw), 'dues: buildDuesBody() exists');
ok(/window\.openPrintWin\(css, buildDuesBody\(\)\)/.test(dw), 'dues: printView routes through openPrintWin');

/* The bodies use the shared print vocabulary (reportHeader + unified .dt/.cards). */
ok(/reportHeader/.test(tw) && /class="dt"/.test(tw) && /class="cards"/.test(tw), 'treasury body uses reportHeader + .dt + .cards');
ok(/reportHeader/.test(dw) && /class="dt"/.test(dw) && /class="cards"/.test(dw), 'dues body uses reportHeader + .dt + .cards');

/* native window.print() survives ONLY as a guarded fallback, never the primary path. */
ok(/graceful fallback/.test(tw) && /graceful fallback/.test(dw), 'native print kept only as a guarded fallback');

/* ROOT-1 — the blanket hide + empty #pra target are removed. */
ok(!/body>\*:not\(#pra\)/.test(css), 'app.css no longer hides the body for print (#pra blanket-hide gone)');
ok(!/id=["']pra["']/.test(html), 'index.html no longer contains the empty #pra div');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
