/* MODEL2 V2.0 · Slice 2 — unit tests for Allocation Integration (pure parts + end-to-end).
   Verifies buildObligations (member opening + per-year due−paid), resolveCurrentYear, and the
   OD-01 / OD-02 computed allocations via the Slice-1 engine. Usage: node tests/allocation-integration.test.cjs */
'use strict';
const I = require('../public/js/allocation-integration.js');
const A = require('../public/js/allocation-engine.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eqA = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* fixture: LAB-like member with historical opening 350 and unpaid 2025/2026 dues */
const data = {
  members: [{ id: 'm1', historical_balance_ils: 350, historical_payments_ils: 0, created_at: '2019-01-01' }],
  subscriptions: [
    { id: 's25', member_id: 'm1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, created_at: '2025-01-01' },
    { id: 's26', member_id: 'm1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0, created_at: '2026-01-01' }
  ]
};

/* 1 · resolveCurrentYear: setting wins; default fallback */
ok(I.resolveCurrentYear({ current_operating_year: '2026' }, 2030) === 2026, 'current year from setting');
ok(I.resolveCurrentYear(null, 2030) === 2030, 'current year default when unset');
ok(I.resolveCurrentYear({ current_operating_year: 'x' }, 2030) === 2030, 'current year default on invalid');

/* 2 · buildObligations: opening + per-year remainders (due − paid), skip settled/zero */
(() => {
  const obs = I.buildObligations(data, 'm1');
  ok(eqA(obs.map(o => [o.kind, o.year || 'hist', o.remaining]), [['historical', 'hist', 350], ['due', 2025, 200], ['due', 2026, 200]]),
    'obligations = opening(350) + 2025(200) + 2026(200)');
  const partial = I.buildObligations({ members: data.members, subscriptions: [{ member_id: 'm1', year: 2025, due_amount_ils: 200, paid_amount_ils: 150 }] }, 'm1');
  ok(partial.some(o => o.year === 2025 && o.remaining === 50), 'partial-paid year → remaining 50');
})();

/* 3 · OD-01 end-to-end under FC-003 · FD-002 (CCR-001 IG-001): pay 500 →
   subscriptions OLDEST first — 2025(200) then 2026(200) — then historical(100). */
(() => {
  const obs = I.buildObligations(data, 'm1');
  const r = A.computeAllocation({ currentYear: 2026, amount: 500, obligations: obs });
  ok(eqA(r.allocations.map(a => [a.obligation_kind, a.year, a.amount_allocated]),
    [['due', 2025, 200], ['due', 2026, 200], ['historical', null, 100]]),
    'OD-01 (FD-002): 2025(200) → 2026(200) → historical(100)');
  ok(r.creditRemaining === 0, 'OD-01: no credit remainder');
})();

/* 4 · OD-02 credit consumption under FD-002: a 250 credit at obligation creation
   → consumes 2025(200) then 2026(50) — historical last, untouched here. */
(() => {
  const obs = I.buildObligations(data, 'm1');
  const r = A.computeAllocation({ currentYear: 2026, amount: 250, obligations: obs });
  ok(eqA(r.allocations.map(a => [a.obligation_kind, a.year, a.amount_allocated]),
    [['due', 2025, 200], ['due', 2026, 50]]),
    'OD-02 (FD-002): credit 250 consumed 2025(200) then 2026(50)');
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
