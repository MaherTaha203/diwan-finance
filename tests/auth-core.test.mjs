/* AUTH-001 — unit tests for the shared pure auth core.
   Covers identifier resolution, password policy (10/≥2-of-4), generator validity, and the
   full non-cumulative lockout ladder + resets. Usage: node tests/auth-core.test.mjs */
import * as A from '../supabase/functions/_shared/auth-core.mjs';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* identifier resolution (legacy back-compat) */
ok(A.isPhone('0599123456') && !A.isPhone('a@b.com'), 'isPhone detects phone vs email');
ok(A.normalizePhone(' 059-912 3456 ') === '0599123456', 'normalizePhone strips spaces+hyphens (keeps digits)');
ok(A.syntheticEmail('059-912-3456') === '0599123456@diwan-fainance.com', 'syntheticEmail uses UNCHANGED legacy domain');
ok(A.canonicalEmail({ email: 'A@X.com' }) === 'a@x.com', 'canonicalEmail: real email wins, lowercased');
ok(A.canonicalEmail({ phone: '0599123456' }) === '0599123456@diwan-fainance.com', 'canonicalEmail: phone-only → synthetic');
ok(A.resolveLoginEmail('0599 123456') === '0599123456@diwan-fainance.com', 'resolveLoginEmail: phone input → synthetic');
ok(A.resolveLoginEmail('Me@Diwan.com') === 'me@diwan.com', 'resolveLoginEmail: email input → lowercased');

/* password policy: 10 chars AND ≥2 of 4 classes */
ok(A.validatePassword('abcdefghij').valid === false, '10 lowercase = 1 class → invalid (min_classes)');
ok(A.validatePassword('abcdefghij').message === 'min_classes', 'reports min_classes');
ok(A.validatePassword('abc123').valid === false && A.validatePassword('abc123').message === 'min_length', 'short → min_length');
ok(A.validatePassword('abcdefgh12').valid === true, '10 chars + lower+digit (2 classes) → valid');
ok(A.validatePassword('Password12').valid === true, '10 chars + 3 classes → valid');
ok(A.strength('abcdefgh12') === 'weak', 'strength: bare-minimum → weak');
ok(A.strength('Password1234') === 'good', 'strength: 12 + 3 classes → good');
ok(A.strength('Password123!xx') === 'strong', 'strength: 14 + 3+ classes → strong');

/* generator is always policy-valid */
(() => { let allValid = true; for (let i = 0; i < 200; i++) { if (!A.validatePassword(A.generatePassword(16)).valid) allValid = false; } ok(allValid, 'generatePassword: 200/200 satisfy policy'); })();

/* lockout ladder — non-cumulative, fresh 15 per stage */
(() => {
  const now = 1_000_000;
  let row = { attempts_in_stage: 0, escalation_level: 0, locked_until: null, admin_locked: false };
  // 14 fails: no lock
  for (let i = 0; i < 14; i++) { const r = A.onFailure(row, now); row = { ...row, ...r.next }; ok(!r.verdict.locked, 'fail ' + (i + 1) + ' → no lock'); }
  // 15th → 5-minute timed lock, attempts reset, level→1
  let r = A.onFailure(row, now); row = { ...row, ...r.next };
  ok(r.verdict.scope === 'timed' && r.verdict.retryAfterMs === 5 * 60000 && row.escalation_level === 1 && row.attempts_in_stage === 0, '15th → 5m lock, level 1, attempts reset');
  // after 15 more fresh fails → 15-minute lock, level→2
  for (let i = 0; i < 14; i++) { r = A.onFailure(row, now + 6 * 60000); row = { ...row, ...r.next }; }
  r = A.onFailure(row, now + 6 * 60000); row = { ...row, ...r.next };
  ok(r.verdict.retryAfterMs === 15 * 60000 && row.escalation_level === 2, 'stage 2 → 15m lock, level 2');
  // → 1-hour lock, level→3
  for (let i = 0; i < 15; i++) { r = A.onFailure(row, now + 30 * 60000); row = { ...row, ...r.next }; }
  ok(r.verdict.retryAfterMs === 60 * 60000 && row.escalation_level === 3, 'stage 3 → 1h lock, level 3');
  // → administrative lock (terminal)
  for (let i = 0; i < 15; i++) { r = A.onFailure(row, now + 120 * 60000); row = { ...row, ...r.next }; }
  ok(r.verdict.scope === 'admin' && row.admin_locked === true, 'stage 4 → administrative lock (terminal)');
  // admin unlock → initial state
  const u = A.onAdminUnlock();
  ok(u.admin_locked === false && u.escalation_level === 0 && u.attempts_in_stage === 0, 'admin unlock → initial state');
  // success anywhere → full reset
  const s = A.onSuccess({ attempts_in_stage: 9, escalation_level: 2, locked_until: null, admin_locked: false });
  ok(s.escalation_level === 0 && s.attempts_in_stage === 0, 'success → full reset (stage 0)');
})();

/* lockStatus */
ok(A.lockStatus({ admin_locked: true }, 1000).scope === 'admin', 'lockStatus: admin lock');
ok(A.lockStatus({ locked_until: new Date(5000).toISOString() }, 1000).scope === 'timed', 'lockStatus: timed lock active');
ok(A.lockStatus({ locked_until: new Date(500).toISOString() }, 1000).locked === false, 'lockStatus: expired lock → open');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
