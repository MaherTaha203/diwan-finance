/* MODEL2 V2.0 · Slice 1 — unit tests for the Stored Ordered Allocation Engine.
   Verifies CA-001 (order), CA-002 (credit remainder), CA-003 (determinism), CA-006 (historical
   = all pre-current-year debt). Pure engine; no app boot. Usage: node tests/allocation-engine.test.cjs */
'use strict';
const A = require('../public/js/allocation-engine.js');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }
function eqA(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* 1 · Order Current → Historical → Future; remainder→credit; conservation */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026,
    amount: 500,
    obligations: [
      { id: 'h', kind: 'historical', remaining: 350, createdAt: '2024-01-01' },
      { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' },
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['y26', 200], ['h', 300]]),
    'current(200) then historical(300); future untouched');
  ok(r.creditRemaining === 0, 'no credit remainder (500 fully allocated)');
  ok(r.totalAllocated + r.creditRemaining === 500, 'conservation: allocated + credit = amount');
})();

/* 2 · Overpayment → credit remainder (CA-002 step 4) */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 1000,
    obligations: [
      { id: 'h', kind: 'historical', remaining: 350, createdAt: '2024-01-01' },
      { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' },
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' }
    ]
  });
  ok(r.totalAllocated === 750 && r.creditRemaining === 250, 'overpayment 1000 → 750 allocated, 250 credit');
})();

/* 3 · Future earliest-year-first (CA-003) */
(() => {
  const r = A.computeAllocation({
    currentYear: 2025, amount: 200,
    obligations: [
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' },
      { id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => a.obligation_id), ['y26']), 'earliest future year (2026) first');
})();

/* 4 · Deterministic same-year tie-break: creation timestamp, then immutable id */
(() => {
  const r = A.computeAllocation({
    currentYear: 2026, amount: 150,
    obligations: [
      { id: 'B', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-03-01' },
      { id: 'A', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['A', 100], ['B', 50]]),
    'same year: earlier createdAt (A) first, then B');
  const r2 = A.computeAllocation({
    currentYear: 2026, amount: 150,
    obligations: [
      { id: 'Z', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' },
      { id: 'K', kind: 'due', year: 2026, remaining: 100, createdAt: '2026-01-01' }
    ]
  });
  ok(eqA(r2.allocations.map(a => a.obligation_id), ['K', 'Z']), 'same year & timestamp: immutable id (K<Z) first');
})();

/* 5 · CA-006: historical = opening + prior-year dues; opening earliest within historical */
(() => {
  const r = A.computeAllocation({
    currentYear: 2027, amount: 250,
    obligations: [
      { id: 'op', kind: 'historical', remaining: 100, createdAt: '2020-01-01' },
      { id: 'y25', kind: 'due', year: 2025, remaining: 200, createdAt: '2025-01-01' }, /* prior-year = historical */
      { id: 'y27', kind: 'due', year: 2027, remaining: 200, createdAt: '2027-01-01' }  /* current */
    ]
  });
  ok(eqA(r.allocations.map(a => [a.obligation_id, a.amount_allocated]), [['y27', 200], ['op', 50]]),
    'current(2027=200) then historical opening(50); prior-year 2025 after opening, untouched here');
})();

/* 6 · Immutability of records */
(() => {
  const r = A.computeAllocation({ currentYear: 2026, amount: 100, obligations: [{ id: 'y26', kind: 'due', year: 2026, remaining: 200, createdAt: '2026-01-01' }] });
  let frozen = Object.isFrozen(r) && Object.isFrozen(r.allocations) && Object.isFrozen(r.allocations[0]);
  ok(frozen, 'allocation result and records are immutable (frozen)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
