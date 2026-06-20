'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSubscriptions,
  allocatePayment,
  rebuildMember,
  fingerprint,
} = require('./allocationEngine');

const DUES = { 2025: 200, 2026: 200 };

function freshState({ activeYear = 2014, overrides = {}, historical = 1000, credit = 0 } = {}) {
  return {
    subscriptions: buildSubscriptions(activeYear, DUES, overrides),
    historicalBalance: historical,
    creditBalance: credit,
  };
}

test('canonical case: 600 -> 200 / 200 / 200 / 0', () => {
  const { state, allocations } = allocatePayment(freshState({ historical: 1000 }), 600);
  assert.deepEqual(allocations, [
    { target_type: 'subscription', year: 2025, amount: 200 },
    { target_type: 'subscription', year: 2026, amount: 200 },
    { target_type: 'historical', year: null, amount: 200 },
  ]);
  assert.equal(state.subscriptions.find((s) => s.year === 2025).balance, 0);
  assert.equal(state.subscriptions.find((s) => s.year === 2026).balance, 0);
  assert.equal(state.historicalBalance, 800);
  assert.equal(state.creditBalance, 0);
});

test('overpayment flows to credit after subs + historical are cleared', () => {
  // subs 200+200=400, historical 100 -> 500 owed; pay 750 -> 250 credit
  const { state, allocations } = allocatePayment(freshState({ historical: 100 }), 750);
  assert.equal(state.creditBalance, 250);
  assert.equal(allocations.at(-1).target_type, 'credit');
  assert.equal(allocations.at(-1).amount, 250);
});

test('partial payment fills oldest subscription first', () => {
  const { state, allocations } = allocatePayment(freshState({ historical: 1000 }), 120);
  assert.deepEqual(allocations, [
    { target_type: 'subscription', year: 2025, amount: 120 },
  ]);
  assert.equal(state.subscriptions.find((s) => s.year === 2025).balance, 80);
  assert.equal(state.subscriptions.find((s) => s.year === 2026).balance, 200);
});

test('Active Year 2026 -> 2025 subscription due is 0', () => {
  const subs = buildSubscriptions(2026, DUES, {});
  assert.equal(subs.find((s) => s.year === 2025).due, 0);
  assert.equal(subs.find((s) => s.year === 2026).due, 200);
});

test('override 2025=0 (committee exemption): skipped, payment goes to 2026 then historical', () => {
  const overrides = { 2025: { balance: 0, reason: 'Committee approved exemption' } };
  const { state, allocations } = allocatePayment(
    freshState({ overrides, historical: 1000 }),
    300
  );
  assert.deepEqual(allocations, [
    { target_type: 'subscription', year: 2026, amount: 200 },
    { target_type: 'historical', year: null, amount: 100 },
  ]);
  assert.equal(state.subscriptions.find((s) => s.year === 2025).balance, 0);
  assert.ok(state.subscriptions.find((s) => s.year === 2025).overridden);
});

test('exception member (#120/#134/#149): snapshot returned unchanged', () => {
  const snapshot = { frozen: true, raw: 'imported-verbatim' };
  const out = rebuildMember({
    isException: true,
    exceptionSnapshot: snapshot,
    activeYear: 2014,
    duesTable: DUES,
    historicalBalance: 9999,
  });
  assert.equal(out.exception, true);
  assert.deepEqual(out.state, snapshot);
  assert.deepEqual(out.allocations, []);
});

test('rebuild is idempotent: two runs produce identical fingerprint', () => {
  const input = {
    activeYear: 2014,
    duesTable: DUES,
    historicalBalance: 1000,
    payments: [
      { id: 'p1', amount: 250, received_at: '2025-03-01' },
      { id: 'p2', amount: 350, received_at: '2025-06-01' },
    ],
  };
  const a = rebuildMember(input);
  const b = rebuildMember(input);
  assert.equal(fingerprint(a.state), fingerprint(b.state));
  // 600 total -> same end state as canonical case
  assert.equal(a.state.historicalBalance, 800);
});

test('chronological replay: out-of-order payments sorted before applying', () => {
  const input = {
    activeYear: 2014,
    duesTable: DUES,
    historicalBalance: 1000,
    payments: [
      { id: 'late', amount: 100, received_at: '2026-01-01' },
      { id: 'early', amount: 300, received_at: '2025-01-01' },
    ],
  };
  const out = rebuildMember(input);
  // early(300): 2025=200, 2026=100 ; late(100): 2026=100 -> 2026 cleared
  assert.equal(out.allocations[0].payment_id, 'early');
  assert.equal(out.state.subscriptions.find((s) => s.year === 2026).balance, 0);
});

test('zero payment is a no-op', () => {
  const before = freshState();
  const { state, allocations } = allocatePayment(before, 0);
  assert.deepEqual(allocations, []);
  assert.equal(state.historicalBalance, before.historicalBalance);
});

test('negative payment throws', () => {
  assert.throws(() => allocatePayment(freshState(), -10), RangeError);
});

test('decimal safety: 0.1 + 0.2 style amounts do not drift', () => {
  // historical 0.30 owed, pay 0.10 then 0.20 -> exactly 0, no float dust
  let s = { subscriptions: [], historicalBalance: 0.3, creditBalance: 0 };
  s = allocatePayment(s, 0.1).state;
  s = allocatePayment(s, 0.2).state;
  assert.equal(s.historicalBalance, 0);
  assert.equal(s.creditBalance, 0);
});

// ---- Manual Override Clarification: non-zero overrides are real payable balances ----

test('non-zero override is payable: 2025=100 override, pay 100 -> 0, flag preserved', () => {
  const overrides = { 2025: { balance: 100, reason: 'Partial committee adjustment' } };
  const { state, allocations } = allocatePayment(
    freshState({ overrides, historical: 1000 }),
    100
  );
  const sub2025 = state.subscriptions.find((s) => s.year === 2025);
  assert.equal(sub2025.balance, 0);          // fully paid down
  assert.equal(sub2025.overridden, true);    // override SOURCE preserved
  assert.deepEqual(allocations, [
    { target_type: 'subscription', year: 2025, amount: 100 },
  ]);
});

test('partial payment against non-zero override leaves remainder, flag intact', () => {
  const overrides = { 2025: { balance: 100, reason: 'adj' } };
  const { state } = allocatePayment(freshState({ overrides, historical: 1000 }), 60);
  const sub2025 = state.subscriptions.find((s) => s.year === 2025);
  assert.equal(sub2025.balance, 40);
  assert.equal(sub2025.overridden, true);
});

test('rebuild with non-zero override: regenerates 100, replays payment, idempotent', () => {
  const input = {
    activeYear: 2014,
    duesTable: DUES,
    overrides: { 2025: { balance: 100, reason: 'adj' } },
    historicalBalance: 1000,
    payments: [{ id: 'p1', amount: 100, received_at: '2025-04-01' }],
  };
  const a = rebuildMember(input);
  const b = rebuildMember(input);
  const sub2025 = a.state.subscriptions.find((s) => s.year === 2025);
  assert.equal(sub2025.balance, 0);          // override 100 - payment 100
  assert.equal(sub2025.overridden, true);    // flag survives rebuild
  assert.equal(fingerprint(a.state), fingerprint(b.state)); // idempotent w/ override
});
