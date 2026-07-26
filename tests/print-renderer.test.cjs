/* PRINT-001 · PR-1 — static regression guard for the unified print renderer.
   Pure-node source assertions (no browser): locks in the delivery-mechanism
   contract so a future edit cannot silently regress to the popup + fixed-timeout
   approach that caused ROOT-9 (font/QR race) and ROOT-10 (iOS popup block).
   The live browser behaviour (off-screen iframe actually prints, single dialog)
   is verified separately with Playwright print-emulation. Usage:
     node tests/print-renderer.test.cjs */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'print.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* Isolate the renderer, then strip block comments so assertions test real code,
   not the doc-comment prose (which purposely names the anti-patterns to avoid). */
const fnStart = src.indexOf('function openPrintWin(');
ok(fnStart !== -1, 'openPrintWin is defined');
const fnRaw = src.slice(fnStart, src.indexOf('\n}', fnStart) + 2);
const fnBody = fnRaw.replace(/\/\*[\s\S]*?\*\//g, '');

/* ROOT-10 — no popup window: the renderer must not use window.open. */
ok(!/window\.open\s*\(/.test(fnBody), 'renderer does not use window.open (no popup)');

/* Delivery is an off-screen iframe driven via srcdoc. */
ok(/createElement\(['"]iframe['"]\)/.test(fnBody), 'creates an <iframe>');
ok(/\.srcdoc\s*=/.test(fnBody), 'writes the document via srcdoc (not document.write)');
ok(!/document\.write/.test(fnBody), 'does not use document.write');
ok(/left:\s*-9999px/.test(fnBody), 'iframe is positioned off-screen');
ok(!/display:\s*none/.test(fnBody) && !/visibility:\s*hidden/.test(fnBody),
  'iframe is not display:none / visibility:hidden (would suppress printed content)');

/* ROOT-9 — gated print, no blind fixed timer, single-fire guard. */
ok(/document\.fonts(\s|&)/.test(fnBody) && /fonts\.ready/.test(fnBody),
  'print is gated on document.fonts.ready');
ok(!/setTimeout\(function\(\)\{window\.print\(\);\},900\)/.test(fnBody),
  'the fixed 900ms print timer is gone');
ok(/setTimeout\(fire,1200\)/.test(fnBody), 'has an absolute safety cap (prints even if fonts/QR never resolve)');
ok(/var printed=false/.test(fnBody) && /if\(printed\)return/.test(fnBody),
  'single print guard prevents a double dialog');

/* No parser-blocking external stylesheet <link> in the print document markup. */
ok(!/<link[^>]+rel=["']?stylesheet/i.test(fnBody), 'no parser-blocking stylesheet <link> in the markup');
ok(/createElement\(["']link["']\)/.test(fnBody), 'fonts injected asynchronously via a created <link>');

/* Layout is unchanged: still assembles PRINT_TOKENS + the per-call css. */
ok(/PRINT_TOKENS\+css/.test(fnBody), 'still composes PRINT_TOKENS + per-call css (layout unchanged)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
