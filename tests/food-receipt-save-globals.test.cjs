/* REGRESSION — the receipt-settlement RPC path must reach the Supabase client.
   ------------------------------------------------------------------------------
   Production bug: saving a Food receipt failed with "فشل الحفظ: no_sb". Cause:
   receipt-settlement.js is an IIFE that resolves the client via root.SB
   (= window.SB), but app.js created SB as a module-scope `let SB` and assigned it
   with `SB=createClient(...)` WITHOUT ever exposing window.SB (report-handoff.js
   exposed window.FIN / window.DB but not SB). So root.SB was undefined and post()
   returned {error:'no_sb'} for every settlement receipt. This pins the exposure.
   Source-level guard (the SB client is only created in the browser at login).
   Usage: node tests/food-receipt-save-globals.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const rd = f => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', f), 'utf8');
const app = rd('app.js'), rs = rd('receipt-settlement.js');

/* 1 · app.js exposes the Supabase client on window right after creating it. */
ok(/SB=createClient\([^)]*\);[\s\S]{0,600}?window\.SB=SB/.test(app),
  'app.js exposes window.SB after createClient (settlement RPC path reachable — no_sb fixed)');

/* 2 · receipt-settlement.js resolves the client via root.SB — the coupling that
       makes the window.SB exposure necessary. */
ok(/typeof root\.SB === 'undefined' \|\| !root\.SB\.rpc/.test(rs),
  'receipt-settlement guards on root.SB (=window.SB) — requires the exposure above');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
