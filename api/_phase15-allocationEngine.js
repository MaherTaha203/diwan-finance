'use strict';

/**
 * Allocation Engine — Structured Member Accounting
 * --------------------------------------------------
 * Pure, deterministic, side-effect-free. No database, no I/O.
 * Used identically by (a) live payment intake and (b) rebuild replay.
 *
 * Approved allocation order (per payment):
 *   1. Oldest unpaid annual subscription
 *   2. Next annual subscription
 *   3. Historical balance (pre-2025 net arrears — stored input, D-2)
 *   4. Credit balance (overflow)
 *
 * Settled rules:
 *   - D-2: Historical Balance is a stored input. NEVER derived from Active Year.
 *   - Active Year gates subscription DUE only: due(year) = year >= activeYear ? amount : 0.
 *   - Dues table contains 2025/2026/future ONLY. No historical-year rows.
 *   - Manual override fixes a subscription balance; engine does not recompute it,
 *     and rebuild does not regenerate it.
 *   - Exception members (#120/#134/#149) bypass the engine entirely.
 */

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Build the per-year subscription rows for a member at rebuild time.
 * @param {number} activeYear
 * @param {Object<number,number>} duesTable  e.g. { 2025: 200, 2026: 200 }
 * @param {Object<number,{balance:number,reason?:string,by?:string,at?:string}>} overrides
 * @returns {Array<{year:number, due:number, balance:number, overridden:boolean}>}
 */
function buildSubscriptions(activeYear, duesTable, overrides = {}) {
  return Object.keys(duesTable)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const ov = overrides[year];
      if (ov) {
        // Override fixes both due and starting balance; engine won't recompute.
        return { year, due: round2(ov.balance), balance: round2(ov.balance), overridden: true };
      }
      const due = year >= activeYear ? round2(duesTable[year]) : 0;
      return { year, due, balance: due, overridden: false };
    });
}

/**
 * Apply ONE payment to a state. Pure: returns a new state, mutates nothing.
 * @param {{subscriptions:Array, historicalBalance:number, creditBalance:number}} state
 * @param {number} amount
 * @returns {{state:Object, allocations:Array}}
 */
function allocatePayment(state, amount) {
  let remaining = round2(amount);
  if (remaining < 0) throw new RangeError('Payment amount cannot be negative');

  const allocations = [];
  const subs = state.subscriptions.map((s) => ({ ...s }));

  // 1 & 2 — subscriptions, oldest first (array is pre-sorted ascending by year)
  for (const sub of subs) {
    if (remaining <= 0) break;
    if (sub.balance <= 0) continue; // satisfied / exempted (e.g. override -> 0)
    const pay = round2(Math.min(remaining, sub.balance));
    sub.balance = round2(sub.balance - pay);
    remaining = round2(remaining - pay);
    allocations.push({ target_type: 'subscription', year: sub.year, amount: pay });
  }

  // 3 — historical balance
  let historicalBalance = state.historicalBalance;
  if (remaining > 0 && historicalBalance > 0) {
    const pay = round2(Math.min(remaining, historicalBalance));
    historicalBalance = round2(historicalBalance - pay);
    remaining = round2(remaining - pay);
    allocations.push({ target_type: 'historical', year: null, amount: pay });
  }

  // 4 — credit overflow
  let creditBalance = state.creditBalance;
  if (remaining > 0) {
    creditBalance = round2(creditBalance + remaining);
    allocations.push({ target_type: 'credit', year: null, amount: remaining });
    remaining = 0;
  }

  return {
    state: { subscriptions: subs, historicalBalance, creditBalance },
    allocations,
  };
}

/**
 * Rebuild a member: regenerate subscriptions, replay all payments chronologically.
 * Exception members are returned untouched.
 * @returns {{state:Object, allocations:Array}}
 */
function rebuildMember(input) {
  const {
    activeYear,
    duesTable,
    overrides = {},
    historicalBalance,
    creditBalance = 0,
    payments = [],
    isException = false,
    exceptionSnapshot = null,
  } = input;

  if (isException) {
    if (!exceptionSnapshot) throw new Error('Exception member requires an exceptionSnapshot');
    return { state: exceptionSnapshot, allocations: [], exception: true };
  }

  let state = {
    subscriptions: buildSubscriptions(activeYear, duesTable, overrides),
    historicalBalance: round2(historicalBalance),
    creditBalance: round2(creditBalance),
  };

  const sorted = [...payments].sort(
    (a, b) => new Date(a.received_at) - new Date(b.received_at)
  );

  const ledger = [];
  for (const p of sorted) {
    const { state: next, allocations } = allocatePayment(state, p.amount);
    state = next;
    ledger.push({ payment_id: p.id, allocations });
  }

  return { state, allocations: ledger, exception: false };
}

/** Stable fingerprint of post-rebuild balances (idempotency anchor). */
function fingerprint(state) {
  const subs = state.subscriptions
    .map((s) => `${s.year}:${s.balance}:${s.overridden ? 1 : 0}`)
    .join('|');
  return `H${state.historicalBalance}|C${state.creditBalance}|${subs}`;
}

module.exports = {
  round2,
  buildSubscriptions,
  allocatePayment,
  rebuildMember,
  fingerprint,
};
