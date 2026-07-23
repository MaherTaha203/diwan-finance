/* AUTH-001 · shared pure core (no Deno/Node-specific deps).
   Imported by the Edge Functions (Deno) AND the Node unit tests. Pure functions only:
   identifier normalization, canonical-email resolution, password policy (10 / ≥2-of-4),
   strength label, a policy-compliant generator, and the progressive-lockout transition.
   Uses the Web Crypto global (present in Deno and Node ≥18). No I/O, no globals mutated. */

export const SYNTHETIC_DOMAIN = 'diwan-fainance.com';   // UNCHANGED — legacy phone accounts depend on it.

/* Phone detection mirrors the legacy client exactly: digits/+/space/- , 7–15 chars. */
export function isPhone(input) {
  return /^[0-9+\s\-]{7,15}$/.test(String(input || '').replace(/\s/g, ''));
}

/* Normalize a phone to its canonical stored form: strip spaces and hyphens only
   (keep leading + and digits) — byte-identical to the legacy `replace(/[\s\-]/g,'')`. */
export function normalizePhone(raw) {
  return String(raw || '').replace(/[\s\-]/g, '');
}

/* The synthetic email a phone maps to (legacy scheme, domain unchanged). */
export function syntheticEmail(phone) {
  return normalizePhone(phone) + '@' + SYNTHETIC_DOMAIN;
}

/* Canonical GoTrue email for an identity: a real email wins; else the phone synthetic. */
export function canonicalEmail({ email, phone } = {}) {
  const e = String(email || '').trim().toLowerCase();
  if (e) return e;
  const p = normalizePhone(phone);
  return p ? syntheticEmail(p) : '';
}

/* Given whatever the user typed at login, produce the canonical email to grant against. */
export function resolveLoginEmail(input) {
  const s = String(input || '').trim();
  if (isPhone(s)) return syntheticEmail(s);
  return s.toLowerCase();
}

/* ── Password policy (FINAL, owner-ratified): ≥10 chars AND ≥2 of {upper,lower,digit,symbol}. ── */
export function passwordClasses(pw) {
  const s = String(pw || '');
  return {
    upper: /[A-Z]/.test(s), lower: /[a-z]/.test(s),
    digit: /[0-9]/.test(s), symbol: /[^A-Za-z0-9]/.test(s)
  };
}
export function classCount(pw) {
  const c = passwordClasses(pw); return (c.upper ? 1 : 0) + (c.lower ? 1 : 0) + (c.digit ? 1 : 0) + (c.symbol ? 1 : 0);
}
/* validatePassword → {valid, message} — one message at a time (length first, then classes). */
export function validatePassword(pw) {
  const s = String(pw || '');
  if (s.length < 10) return { valid: false, message: 'min_length' };      // "at least 10 characters"
  if (classCount(s) < 2) return { valid: false, message: 'min_classes' }; // "at least two character types"
  return { valid: true, message: null };
}
/* strength → 'weak' | 'good' | 'strong' (display only; only meaningful once valid). */
export function strength(pw) {
  const s = String(pw || ''); const n = classCount(s);
  if (!validatePassword(s).valid) return 'weak';
  if (s.length >= 14 && n >= 3) return 'strong';
  if (s.length >= 12 && n >= 3) return 'good';
  return 'weak';
}

/* Policy-compliant, unambiguous generator (all four classes → always ≥2). */
export function generatePassword(len = 16) {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!@#$%&*+-=?';
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const all = U + L + D + S, out = [U, L, D, S].map((set) => set[rnd(set.length)]);
  while (out.length < len) out.push(all[rnd(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1), t = out[i]; out[i] = out[j]; out[j] = t; }
  return out.join('');
}

/* ── Progressive lockout (non-cumulative): fresh 15 per stage → 5m → 15m → 1h → admin. ──
   Pure transition over the stored row. Given the current row and the credential outcome,
   returns the next row fields + the verdict. Time is injected (now) for testability. */
export const MAX_ATTEMPTS = 15;
export const LOCK_MS = [5 * 60000, 15 * 60000, 60 * 60000]; // level 0→1 (5m), 1→2 (15m), 2→3 (1h)

/* Is the row currently locked at `now`? → {locked, scope:'admin'|'timed'|null, retryAfterMs} */
export function lockStatus(row, now) {
  if (row && row.admin_locked) return { locked: true, scope: 'admin', retryAfterMs: null };
  if (row && row.locked_until && new Date(row.locked_until).getTime() > now) {
    return { locked: true, scope: 'timed', retryAfterMs: new Date(row.locked_until).getTime() - now };
  }
  return { locked: false, scope: null, retryAfterMs: 0 };
}

/* Apply a SUCCESS → full reset to initial state. */
export function onSuccess(row) {
  return { attempts_in_stage: 0, escalation_level: 0, locked_until: null, admin_locked: false };
}

/* Apply a FAILURE → increment; on the 15th of a stage escalate (timed lock or admin lock).
   Returns {next, verdict} where verdict.scope ∈ {null,'timed','admin'}. */
export function onFailure(row, now) {
  const level = (row && row.escalation_level) || 0;
  const attempts = ((row && row.attempts_in_stage) || 0) + 1;
  if (attempts < MAX_ATTEMPTS) {
    return { next: { attempts_in_stage: attempts, escalation_level: level, locked_until: (row && row.locked_until) || null, admin_locked: false },
             verdict: { locked: false, scope: null, retryAfterMs: 0 } };
  }
  // 15th failure of this stage → escalate; fresh allowance next stage.
  if (level < LOCK_MS.length) {
    const until = new Date(now + LOCK_MS[level]).toISOString();
    return { next: { attempts_in_stage: 0, escalation_level: level + 1, locked_until: until, admin_locked: false },
             verdict: { locked: true, scope: 'timed', retryAfterMs: LOCK_MS[level] } };
  }
  // level === 3 → terminal administrative lock.
  return { next: { attempts_in_stage: 0, escalation_level: level, locked_until: null, admin_locked: true },
           verdict: { locked: true, scope: 'admin', retryAfterMs: null } };
}

/* Admin unlock → back to initial state (owner decision 3). */
export function onAdminUnlock() {
  return { attempts_in_stage: 0, escalation_level: 0, locked_until: null, admin_locked: false };
}

export const VALID_ROLES = ['admin', 'viewer', 'reservation'];
export function safeRole(r) { return VALID_ROLES.indexOf(r) >= 0 ? r : 'viewer'; }
