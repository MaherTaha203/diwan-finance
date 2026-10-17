/* QR regression — internal transfer vouchers must print the same token-verification URL. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

test('internal transfer voucher footer points to /verify/<verification_token>', () => {
  const start = SRC.indexOf('window.buildTransferVoucher=function(t)');
  const end = SRC.indexOf('window.prtTransfer=function(id)', start);
  assert.ok(start >= 0 && end > start, 'transfer voucher builder exists');
  const builder = SRC.slice(start, end);
  assert.ok(builder.includes("https://www.diwan-finance.com/verify/"),
    'QR URL uses the verification route');
  assert.ok(builder.includes('t.verification_token||'),
    'QR URL is bound to the stored verification token');
  assert.ok(builder.includes('diwan-finance.com/verify<span class="tok">'),
    'printed QR caption identifies the verification route');
  assert.ok(!builder.includes("reportDfoot('https://www.diwan-finance.com','diwan-finance.com')"),
    'transfer voucher no longer prints the site homepage as its QR target');
});
