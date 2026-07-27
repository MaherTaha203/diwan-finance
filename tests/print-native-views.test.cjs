/* PRINT-001 · PR-2 → REPORT-001 · R8-b — static regression guard.
   Pure-node source assertions (no browser). Originally locked in that the Treasury
   and Dues workspaces print real documents (not native window.print into the old
   #pra target, which produced a BLANK page — ROOT-1). R8-b removed the legacy
   buildPositionBody/buildDuesBody string-builders: the workspaces now print SOLELY
   through the unified report engine (Report.render), flag-gated as a kill-switch.
   This suite now asserts that R8-b end state. The dead #pra blanket-hide + empty
   div stay gone. Live rendering is verified separately with Playwright. Usage:
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

/* R8-b — the legacy string-builders are GONE (no buildPositionBody/buildDuesBody,
   no openPrintWin call from these workspaces). */
ok(!/function buildPositionBody\(/.test(tw), 'treasury: legacy buildPositionBody() removed (R8-b)');
ok(!/openPrintWin\(/.test(tw), 'treasury: no legacy openPrintWin path remains');
ok(!/function buildDuesBody\(/.test(dw), 'dues: legacy buildDuesBody() removed (R8-b)');
ok(!/openPrintWin\(/.test(dw), 'dues: no legacy openPrintWin path remains');

/* Printing now routes SOLELY through the unified engine (build*Model → Report.render). */
ok(/buildTreasuryPositionModel/.test(tw) && /Report\.render\(model, ?'print'\)/.test(tw), 'treasury: printPosition routes through the unified engine');
ok(/buildDuesSnapshotModel/.test(dw) && /Report\.render\(model, ?'print'\)/.test(dw), 'dues: printView routes through the unified engine');

/* The engine path is flag-gated as a kill-switch (a surface can be flipped off). */
ok(/REPORT_ENGINE_TREASURY_POSITION/.test(tw), 'treasury: engine path is flag-gated (kill-switch)');
ok(/REPORT_ENGINE_DUES_SNAPSHOT/.test(dw), 'dues: engine path is flag-gated (kill-switch)');

/* ROOT-1 — the blanket hide + empty #pra target are removed. */
ok(!/body>\*:not\(#pra\)/.test(css), 'app.css no longer hides the body for print (#pra blanket-hide gone)');
ok(!/id=["']pra["']/.test(html), 'index.html no longer contains the empty #pra div');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
