/* PRINT-001 · PR-5 — static regression guard for the layout-polish fixes.
   Pure-node source assertions (no browser).
     · ROOT-11 — the KPI card row wraps (many-card reports no longer cram one line).
     · ROOT-5  — .cards is no longer in the page-break-inside:avoid list (a tall
       card row that doesn't fit breaks between cards instead of leaving a big gap),
       while genuinely atomic units still stay together.
   Usage: node tests/print-layout-polish.test.cjs */
const fs = require('fs');
const path = require('path');
const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'print.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ROOT-11 — wrapping card row with a legibility floor. */
ok(/\.cards\{[^}]*display:flex[^}]*flex-wrap:wrap/.test(printJs), '.cards uses flex-wrap:wrap');
ok(/\.card\{flex:1 1 \d+px/.test(printJs), '.card has a flex-basis floor (no bare flex:1 squish)');

/* ROOT-5 — the print @media avoid list no longer contains .cards, but keeps the
   small atomic units + the signature block. */
const media = (printJs.match(/@media print\{[\s\S]*?\}\}/) || [''])[0];
ok(media.length > 0, 'found the @media print rule');
ok(!/\.cards,/.test(media) && !/,\.cards/.test(media), '.cards removed from page-break-inside:avoid');
ok(/\.dfoot,\.amount,table\.dt tr\.final\{page-break-inside:avoid\}/.test(media), 'signature + amount + final-row still avoid breaking');
ok(/tr\{page-break-inside:avoid\}/.test(media), 'table rows still atomic');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
