/* CCR-001 IG-018 — constitutional tests for FD-019: non-member donations store
   ONLY the donation transaction — no permanent donor profile (contacts row) is
   ever created from donation capture. Non-donation receipts keep the explicit
   save-contact option. Loads the real crud.js (predicate + wiring).
   Usage: node tests/no-donor-profile.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'crud.js'), 'utf8');
global.window = {};
const shouldCreateContact = vm.runInThisContext(src + ';shouldCreateContact');

/* 1 · FD-019: donation capture NEVER creates a donor profile — any UI state */
ok(shouldCreateContact('donation', 'manual', true, 'فاعل خير') === false,
  'donation + manual payer + save-contact checked → NO contacts row (FD-019)');
ok(shouldCreateContact('donation', 'manual', false, 'فاعل خير') === false
  && shouldCreateContact('donation', 'member', true, 'عضو') === false
  && shouldCreateContact('donation', 'contact', true, 'جهة') === false,
  'donation capture creates no profile under any payer type or checkbox state');

/* 2 · non-donation receipts keep the explicit opt-in feature */
ok(shouldCreateContact('food', 'manual', true, 'دافع') === true, 'food receipt + explicit opt-in → contact allowed (unchanged)');
ok(shouldCreateContact('diwan', 'manual', true, 'دافع') === true, 'diwan receipt + explicit opt-in → contact allowed (unchanged)');

/* 3 · opt-in remains strictly explicit for non-donations */
ok(shouldCreateContact('food', 'manual', false, 'دافع') === false, 'unchecked box → no contact');
ok(shouldCreateContact('food', 'member', true, 'عضو') === false, 'member payer → no contact');
ok(shouldCreateContact('food', 'manual', true, '') === false
  && shouldCreateContact('food', 'manual', true, '   ') === false,
  'empty/blank payer name → no contact (fail-safe)');

/* 4 · wiring: the ONLY contacts insert in receipt capture is guarded by the predicate */
(() => {
  const inserts = (src.match(/from\('contacts'\)\.insert/g) || []).length;
  ok(inserts === 1, 'exactly one contacts-insert path exists in receipt capture');
  const guarded = /if\(shouldCreateContact\(fund,payerType,saveContact,payerName\)\)\{\s*\n?\s*const\{data:nc\}=await SB\.from\('contacts'\)\.insert/.test(src);
  ok(guarded, 'the contacts insert is reachable ONLY through shouldCreateContact');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
