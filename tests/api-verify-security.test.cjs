/* SEC regression · api/verify.js — public QR verification hardening (PR #299).
   Locks in the security invariants of the public verification endpoint so they
   cannot silently regress: token-only lookup (no voucher-number enumeration),
   minimal public fields, generic errors (no raw DB/internal leakage to the
   client), rate limiting, cancelled→generic, no-store, and no wildcard CORS.
   Static source assertions — dependency-free (verify.js imports the Supabase SDK
   at module load, which is not installed in the test env; the invariants we guard
   are source-level, matching the repo's static-assertion test convention).
   Read-only. Run: node --test tests/api-verify-security.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'api', 'verify.js'), 'utf8');

test('security response headers are set (no-store + nosniff)', () => {
  assert.ok(/setHeader\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]/.test(SRC));
  assert.ok(/setHeader\(\s*['"]X-Content-Type-Options['"]\s*,\s*['"]nosniff['"]/.test(SRC));
});

test('pre-DB guards exist: missing token → 400, malformed → 404, rate limit → 429', () => {
  assert.ok(/if\s*\(\s*!id\s*\)[\s\S]*400/.test(SRC), 'missing token → 400');
  assert.ok(/token\.length\s*<\s*10[\s\S]*404|<\s*10[\s\S]*publicError\([^)]*404/.test(SRC), 'malformed token → 404');
  assert.ok(/rateLimited\(/.test(SRC) && /429/.test(SRC), 'rate limiting → 429');
  assert.ok(/Retry-After/.test(SRC), 'Retry-After header on 429');
});

test('token is sanitized to alphanumerics with a bounded length', () => {
  assert.ok(/replace\(\/\[\^A-Za-z0-9\]\/g/.test(SRC), 'strips non-alphanumerics');
  assert.ok(/length\s*<\s*10\s*\|\|\s*[a-z]+\.length\s*>\s*64/.test(SRC), 'length bounded 10..64');
});

test('no wildcard CORS header is ever set', () => {
  assert.ok(!/Access-Control-Allow-Origin/i.test(SRC), 'verify.js must not set CORS');
});

test('lookup is token-only — never by voucher number (no enumeration)', () => {
  assert.ok(/\.eq\(\s*['"]verification_token['"]/.test(SRC), 'must query verification_token');
  assert.ok(!/\.eq\(\s*['"]no['"]/.test(SRC), 'must NOT query by voucher number "no"');
});

test('public response exposes only minimal fields (no amounts/parties)', () => {
  const selects = [...SRC.matchAll(/\.select\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1].replace(/\s/g, ''));
  assert.deepEqual(selects.sort(), ['no,payment_date,is_deleted', 'no,receipt_date,is_deleted'].sort());
  assert.ok(!/amount|member|payer|beneficiary|donor|notes/i.test(selects.join(',')), 'no sensitive fields selected');
});

test('raw DB errors are logged server-side but NEVER returned to the client', () => {
  assert.ok(/console\.error\(\s*['"]\[verify\]/.test(SRC), 'errors logged server-side');
  // no JSON response body interpolates an error object or a .message
  assert.ok(!/\.json\([^)]*\b(err|recErr|payErr)\b/.test(SRC), 'no error object sent to client');
  assert.ok(!/\.json\([^)]*\.message/.test(SRC), 'no .message sent to client');
  assert.ok(/Verification service unavailable/.test(SRC), 'generic client-facing failure message');
});

test('cancelled document → generic message (no internal detail)', () => {
  assert.ok(/is_deleted === true[\s\S]*Document has been cancelled/.test(SRC));
});

test('service/anon key selection never uses an ambiguous SUPABASE_KEY', () => {
  assert.ok(!/process\.env\.SUPABASE_KEY\b/.test(SRC), 'no ambiguous SUPABASE_KEY');
  assert.ok(/SUPABASE_ANON_KEY/.test(SRC), 'explicit anon key fallback');
});
