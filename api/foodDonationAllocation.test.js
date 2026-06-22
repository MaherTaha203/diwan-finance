'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { allocate } = require('../public/js/foodDonationAllocation.js');

const BIG = 8639; // plenty of remaining deficit

test('Scenario 1: debt 1600, donation 3000 (reduce_deficit) -> 1600 / 1400 / 0', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 3000, allocation: 'reduce_deficit' }],
    { m: 1600 }, BIG
  );
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 1600, toDeficit: 1400, toCurrent: 0 });
  assert.equal(out.debtSettlementTotal, 1600);
  assert.equal(out.reserveTotal, 1400);
  assert.equal(out.currentSupportTotal, 0);
});

test('Scenario 2: debt 1600, donation 12000, remaining deficit 500 -> 1600 / 500 / 9900', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 12000, allocation: 'reduce_deficit' }],
    { m: 1600 }, 500
  );
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 1600, toDeficit: 500, toCurrent: 9900 });
  assert.equal(out.debtSettlementTotal, 1600);
  assert.equal(out.reserveTotal, 500);
  assert.equal(out.currentSupportTotal, 9900);
});

test('Scenario 3: debt 5000, donation 2000 -> all 2000 to debt, nothing to donation', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 2000, allocation: 'reduce_deficit' }],
    { m: 5000 }, BIG
  );
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 2000, toDeficit: 0, toCurrent: 0 });
  assert.equal(out.debtSettlementTotal, 2000);
  assert.equal(out.reserveTotal, 0);
});

test('Scenario 4: member with zero debt -> full amount is the donation', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 1000, allocation: 'reduce_deficit' }],
    { m: 0 }, BIG
  );
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 0, toDeficit: 1000, toCurrent: 0 });
});

test('Scenario 4b: member with credit (negative base debt) -> no settlement', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 1000, allocation: 'reduce_deficit' }],
    { m: -300 }, BIG
  );
  assert.equal(out.perReceipt.d1.debtSettled, 0);
  assert.equal(out.perReceipt.d1.toDeficit, 1000);
});

test('Scenario 5: non-member donor (memberId null) -> no settlement', () => {
  const out = allocate(
    [{ id: 'd1', memberId: null, amount: 1000, allocation: 'reduce_deficit' }],
    {}, BIG
  );
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 0, toDeficit: 1000, toCurrent: 0 });
  assert.equal(out.debtSettlementTotal, 0);
});

test('support_current donation increases current, never the deficit', () => {
  const out = allocate(
    [{ id: 'd1', memberId: 'm', amount: 1000, allocation: 'support_current' }],
    { m: 400 }, BIG
  );
  // 400 settles debt, 600 -> current support, 0 -> deficit
  assert.deepEqual(out.perReceipt.d1, { debtSettled: 400, toDeficit: 0, toCurrent: 600 });
  assert.equal(out.reserveTotal, 0);
});

test('Multiple donations by one member settle debt monotonically', () => {
  const out = allocate([
    { id: 'a', memberId: 'm', amount: 1000, allocation: 'reduce_deficit' },
    { id: 'b', memberId: 'm', amount: 1000, allocation: 'reduce_deficit' },
  ], { m: 1600 }, BIG);
  // a: 1000 debt; b: 600 debt + 400 deficit
  assert.equal(out.perReceipt.a.debtSettled, 1000);
  assert.equal(out.perReceipt.b.debtSettled, 600);
  assert.equal(out.perMember.m, 1600);
  assert.equal(out.debtSettlementTotal, 1600);
  assert.equal(out.reserveTotal, 400);
});

test('Deficit shared across members in chronological order', () => {
  const out = allocate([
    { id: 'a', memberId: null, amount: 8000, allocation: 'reduce_deficit' },
    { id: 'b', memberId: null, amount: 2000, allocation: 'reduce_deficit' },
  ], {}, BIG);
  // a fills 8000 of 8639 deficit; b fills remaining 639, 1361 overflow -> current
  assert.equal(out.perReceipt.a.toDeficit, 8000);
  assert.equal(out.perReceipt.b.toDeficit, 639);
  assert.equal(out.perReceipt.b.toCurrent, 1361);
  assert.equal(out.reserveTotal, 8639);
  assert.equal(out.currentSupportTotal, 1361);
});
