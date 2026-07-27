/* CCR-001 IG-019 — constitutional tests for FD-018: a member's donation appears
   on his statement as an INDEPENDENT event in the form «تبرع — [الصندوق الوجهة]»
   read from the STORED destination fields, with a settlement suffix ONLY when
   the allocation engine actually settled debt from that donation. Loads the
   real print.js (label rule + wiring across screen · print · Excel surfaces).
   Usage: node tests/donation-statement-display.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const printSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'print.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
global.window = {};
global.fmt = n => { const v = Number(n) || 0; return v.toLocaleString('en-US', { maximumFractionDigits: 2 }); };
const label = vm.runInThisContext(printSrc + ';donationStmtLabel');

/* 1 · FD-018 form: «تبرع — [الصندوق الوجهة]» from the STORED destination */
ok(label({ movement_type: 'donation_cash', destination_treasury: 'food' }) === 'تبرع — صندوق الغداء',
  'cash donation to food → «تبرع — صندوق الغداء» (FD-018 independent-event form)');
ok(label({ movement_type: 'deficit_cash_donation', destination_treasury: 'historical_deficit' }) === 'تبرع — حساب العجز التاريخي',
  'deficit-directed donation → «تبرع — حساب العجز التاريخي»');
ok(label({ movement_type: 'donation_cash', destination_treasury: 'diwan' }) === 'تبرع — خزينة الديوان',
  'diwan-directed donation → «تبرع — خزينة الديوان»');

/* 2 · legacy fallback: donation_display_fund when destination_treasury is null (IG-017 mapping) */
ok(label({ movement_type: 'donation_cash', destination_treasury: null, donation_display_fund: 'food' }) === 'تبرع — صندوق الغداء',
  'legacy row falls back to donation_display_fund');
ok(label({ movement_type: 'donation_inkind', destination_treasury: null, donation_display_fund: 'diwan' }) === 'تبرع — عيني/خدمي — توثيقي (بلا وجهة نقدية)',
  'in-kind donation → documentary label (no cash destination, IG-017 rule)');

/* 3 · settlement suffix ONLY when debt was actually settled (FD-008 designation via IG-002 gate) */
ok(label({ movement_type: 'donation_cash', destination_treasury: 'food' }, 150) === 'تبرع — صندوق الغداء · تسوية ذمة ₪150',
  'settled donation carries the settlement suffix with the settled amount');
ok(label({ movement_type: 'donation_cash', destination_treasury: 'food' }, 0) === 'تبرع — صندوق الغداء'
  && label({ movement_type: 'donation_cash', destination_treasury: 'food' }, undefined) === 'تبرع — صندوق الغداء',
  'undesignated donation shows NO settlement line (zero/absent settled)');

/* 4 · bilingual: English mode mirrors the same rule */
ok(label({ movement_type: 'donation_cash', destination_treasury: 'food' }, 0, true) === 'Donation — Food Fund'
  && label({ movement_type: 'donation_cash', destination_treasury: 'historical_deficit' }, 75, true) === 'Donation — Historical Deficit Account · Debt Settlement ₪75',
  'English mode: same form, same settlement rule');

/* 5 · wiring: the single label RULE lives in print.js and the live screen + Excel
   surfaces (app.js) render donation rows through it. REPORT-001 · R8-b: the member
   statement PRINT/PDF moved to the unified engine (report-model.js carries a pure
   port of the same rule), so print.js no longer wires it into a print builder — it
   DEFINES the shared rule the other surfaces call. Old split labels stay removed. */
ok(/function donationStmtLabel\(/.test(printSrc),
  'print.js defines the single donationStmtLabel rule (consumed by screen + Excel; engine ports it)');
ok((appSrc.match(/donationStmtLabel\(d,\(_alloc\.perReceipt\[d\.id\]\|\|\{\}\)\.debtSettled/g) || []).length === 2,
  'screen + Excel surfaces both render rows through donationStmtLabel');
ok(!/donSplit/.test(printSrc) && !/donSplit/.test(appSrc),
  'legacy allocation-split display (donSplit) removed from all statement surfaces');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
