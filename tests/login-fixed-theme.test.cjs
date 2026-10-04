/* The public login/landing screen must retain its approved palette even when
   the authenticated application is in dark mode. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('login palette is not overridden by the application dark-mode class', () => {
  assert.doesNotMatch(SRC, /body:not\(\.light\)\s+#login-screen/);
  assert.match(SRC, /--b-cream:#EDF1F7/);
  assert.match(SRC, /--b-white:#fff/);
  assert.match(SRC, /--b-navy:#0F1B33/);
  assert.match(SRC, /#login-screen \.login-btn-main\{background:var\(--b-gold\);color:#1A2205/);
});

test('authenticated app theme control remains present and independent', () => {
  assert.match(SRC, /id="theme-btn" onclick="window\.toggleTheme\(\)"/);
  assert.match(SRC, /Login\/landing identity is intentionally fixed/);
});
