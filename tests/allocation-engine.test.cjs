/* CCR-001 IG-001 — unit tests for the Stored Ordered Allocation Engine under
   FINANCIAL-CONSTITUTION-003 · FD-002: outstanding annual subscriptions (OLDEST
   unpaid first) → then the historical carried balance; remainder stays Member
   Credit. Determinism (CA-003) and record immutability retained.
   Includes the constitutional golden tests T-WF-1…T-WF-5 (owner example).
   Pure engine; no app boot. Usage: node tests/allocation-engine.test.cjs */
'use strict';
const A = require('../public/js/allocation-engine.js');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }
function eqA(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* T-WF-1 · FD-002 owner golden example:
   historical=600 · 2025 sub=200 · 2026 sub=200 · payment 400
   → 2025 settled, 2026 settled, historical UNCHANGED (600). */
(() => {
  const obligations = [
    { id: 'hist', kind: 'historical', remaining: 600, createdAt: '2000-01-01' },
    { id: 'y25', kind: 'due', year: 2025, remaining: 200, createdAt: '2025-01-01' },
    { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' }
  ];
  const r = A.computeAllocation({ currentYear: 2026, amount: 400, obligations });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['y25', 200], ['y26', 200]]),
    'T-WF-1a: 400 → 2025(200) then 2026(200); historical untouched');
  ok(r.creditRemaining === 0 && r.totalAllocated === 400, 'T-WF-1a: fully allocated, no credit');
  /* additional payment 100 over the REMAINING obligations → historical 600→500 */
  const r2 = A.computeAllocation({
    currentYear: 2026, amount: 100,
    obligations: [{ id: 'hist', kind: 'historical', remaining: 600, createdAt: '2000-01-01' }]
  });
  ok(eqA(r2.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['hist', 100]]),
    'T-WF-1b: +100 reduces historical 600 → 500');
})();

/* T-WF-2 · historical only: pay 400 → historical 600→200 */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 400,
    obligations: [{ id: 'hist', kind: 'historical', remaining: 600, createdAt: '2000-01-01' }]
  });
  ok(r.allocations[0].amount_allocated === 400 && r.creditRemaining === 0, 'T-WF-2: 400 → historical (remaining 200)');
})();

/* T-WF-3 · hist 600 + 2025 sub 200, pay 500 → 2025 settled then historical 300 */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 500,
    obligations: [
      { id: 'hist', kind: 'historical', remaining: 600, createdAt: '2000-01-01' },
      { id: 'y25', kind: 'due', year: 2025, remaining: 200, createdAt: '2025-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['y25', 200], ['hist', 300]]),
    'T-WF-3: subscription first (200), remainder to historical (300)');
})();

/* T-WF-4 · ALL subscription years precede historical — including years after the
   operating year (FD-002 has no current/future split; oldest-first across all). */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 500,
    obligations: [
      { id: 'hist', kind: 'historical', remaining: 350, createdAt: '2024-01-01' },
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' },
      { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['y26', 200], ['y27', 200], ['hist', 100]]),
    'T-WF-4: 2026 → 2027 → historical last');
})();

/* T-WF-5 · conservation + overpayment → Member Credit (Law 1 / FD-002 remainder) */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 1000,
    obligations: [
      { id: 'hist', kind: 'historical', remaining: 350, createdAt: '2024-01-01' },
      { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' },
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' }
    ]
  });
  ok(r.totalAllocated === 750 && r.creditRemaining === 250, 'T-WF-5: 1000 → 750 allocated, 250 credit');
  ok(r.totalAllocated + r.creditRemaining === 1000, 'T-WF-5: conservation (allocated + credit = amount)');
})();

/* Determinism · same-year tie-break: creation timestamp, then immutable id (CA-003) */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 150,
    obligations: [
      { id: 'B', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-03-01' },
      { id: 'A', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['A', 100], ['B', 50]]),
    'determinism: earlier createdAt (A) first, then B');
  const r2 = A.computeAllocation({
    currentYear: 2026, amount: 150,
    obligations: [
      { id: 'Z', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' },
      { id: 'K', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r2.allocations.map(a => a.obligation_id), ['K', 'Z']), 'determinism: same year & timestamp → id (K<Z) first');
})();

/* Order independence from input order (never storage-order dependent) */
(() => {
  const base = [
    { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' },
    { id: 'hist', kind: 'historical', remaining: 600, createdAt: '2000-01-01' },
    { id: 'y25', kind: 'due', year: 2025, remaining: 200, createdAt: '2025-01-01' }
  ];
  const a1 = A.computeAllocation({ currentYear: 2026, amount: 500, obligations: base });
  const a2 = A.computeAllocation({ currentYear: 2026, amount: 500, obligations: base.slice().reverse() });
  ok(eqA(a1.allocations, a2.allocations), 'input order never affects the constitutional order');
})();

/* Immutability of records */
(() => {
  const r = A.computeAllocation({ currentYear: 2026, amount: 100, obligations: [{ id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' }] });
  const frozen = Object.isFrozen(r) && Object.isFrozen(r.allocations) && Object.isFrozen(r.allocations[0]);
  ok(frozen, 'allocation result and records are immutable (frozen)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
