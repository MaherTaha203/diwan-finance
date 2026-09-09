/* SEC regression · /api/config + client bundle — no service-role reaches the browser.
   Locks in that the browser only ever receives the PUBLIC Supabase config (URL +
   anon key), and that the service-role key exists nowhere in client-shipped code.
   Static source assertions (the config endpoint reads process.env at runtime; the
   invariant we guard is source-level). Read-only.
   Run: node --test tests/api-config-security.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

test('/api/config exposes ONLY SUPABASE_URL + SUPABASE_ANON_KEY', () => {
  const m = server.match(/\/api\/config[\s\S]*?\}\);/);
  assert.ok(m, 'found /api/config handler');
  const h = m[0];
  assert.ok(/process\.env\.SUPABASE_URL/.test(h), 'reads SUPABASE_URL');
  assert.ok(/process\.env\.SUPABASE_ANON_KEY/.test(h), 'reads SUPABASE_ANON_KEY (explicit anon)');
  assert.ok(!/SERVICE_ROLE/i.test(h), '/api/config must never touch a service-role key');
  assert.ok(!/process\.env\.SUPABASE_KEY\b/.test(h), 'no ambiguous SUPABASE_KEY in config');
});

test('client bundle (public/) contains NO service-role key or env reference', () => {
  const files = walk(path.join(ROOT, 'public'), []);
  const offenders = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    // strip line/block comments so documentation that MENTIONS service_role
    // (explaining its absence) is not a false positive
    const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(code)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepEqual(offenders, [], 'no client file may reference a service-role key');
});

test('the client Supabase key is the ANON role (never service_role)', () => {
  const app = fs.readFileSync(path.join(ROOT, 'public', 'js', 'app.js'), 'utf8');
  const m = app.match(/__SB_ANON\s*=\s*['"]([A-Za-z0-9_\-\.]+)['"]/);
  assert.ok(m, 'found the hardcoded client Supabase key');
  const jwt = m[1].split('.');
  assert.equal(jwt.length, 3, 'looks like a JWT');
  const payload = JSON.parse(Buffer.from(jwt[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(payload.role, 'anon', 'client key role MUST be anon');
  assert.notEqual(payload.role, 'service_role');
});
