/* QR regression — transfer voucher must carry a verification QR just like
   receipt/payment vouchers. Static by design: app.js is a browser-global module. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

test('internal transfer QR points to /verify/<verification_token>', () => {
  const start = SRC.indexOf('window.buildTransferVoucher=function(t)');
  const end = SRC.indexOf('window.prtTransfer=function(id)', start);
  assert.ok(start >= 0 && end > start, 'transfer voucher builder exists');
  const builder = SRC.slice(start, end);

  assert.match(builder, /https:\/\/www\.diwan-finance\.com\/verify\/\'+esc\(t\.verification_token\|\|\'\'\)/);
  assert.match(builder, /diwan-finance\.com\/verify<span class="tok">\'+esc\(t\.verification_token\|\|\'\'\)/);
  assert.doesNotMatch(builder, /reportDfoot\(['"]https:\/\/www\.diwan-finance\.com['"]/);
});

test('transfer QR remains presentation-only: no financial write is introduced', () => {
  const start = SRC.indexOf('window.buildTransferVoucher=function(t)');
  const end = SRC.indexOf('window.prtTransfer=function(id)', start);
  const builder = SRC.slice(start, end);
  assert.doesNotMatch(builder, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
