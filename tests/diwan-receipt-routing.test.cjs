/* REGRESSION — Diwan/Donation receipts must NOT enter the food settlement path.
   ------------------------------------------------------------------------------
   Production bug: with RECEIPT_ALLOCATION_ENABLED ON, a Diwan operational-income
   receipt was routed through ReceiptSettlement.postFromForm, which (a) validated it
   as a food settlement — blocking Save with "التسوية غير مكتملة — راجع الأسطر" — and
   (b) hardcodes destination_treasury:'food', which would misfile it into the FOOD
   treasury as a food cash donation. The settlement path is FOOD-only; every other
   fund must keep the legacy BusinessOps.createVoucher path (its sole correct
   classifier). This test pins the gates that enforce that.
   Usage: node tests/diwan-receipt-routing.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', f), 'utf8');

const crud = P('crud.js');
const forms = P('forms.js');
const rs = P('receipt-settlement.js');

/* 1 · saveRec routing gate is FOOD-only (Diwan/Donation fall through to legacy). */
ok(/window\.ReceiptSettlement\.enabled\(\) && fund==='food'\)\{[\s\S]*?return window\.ReceiptSettlement\.postFromForm/.test(crud),
  "saveRec: settlement gate requires fund==='food' before postFromForm");

/* 2 · The legacy path (BusinessOps.createVoucher) still exists AFTER the gate — the
       path a Diwan/Donation receipt now takes. */
ok(crud.indexOf('BusinessOps.createVoucher') > crud.search(/enabled\(\) && fund==='food'/),
  'saveRec: legacy createVoucher path remains for non-food funds');

/* 3 · openRec mounts the Settlement Editor only for a FOOD receipt. */
ok(/ReceiptSettlement\.enabled\(\) && \(document\.getElementById\('rec-fund'\)\|\|\{\}\)\.value==='food'\)\{[\s\S]*?mountInReceiptForm/.test(forms),
  "openRec: editor mounts only when fund==='food'");

/* 4 · onRecFundChange hides the food-only editor slot for any non-food fund
       (covers an in-modal fund switch after a Food receipt mounted it). */
ok(/fund!=='food'\)\{[\s\S]*?getElementById\('rec-settlement'\)[\s\S]*?display='none'/.test(forms),
  "onRecFundChange: settlement slot hidden when fund!=='food'");

/* 5 · WHY the gate matters — postFromForm still files every line into the FOOD
       treasury; proves a non-food receipt would be misclassified if it entered. */
ok(/destination_treasury:\s*'food'/.test(rs),
  "postFromForm posts destination_treasury:'food' (food-only path, by design)");

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
