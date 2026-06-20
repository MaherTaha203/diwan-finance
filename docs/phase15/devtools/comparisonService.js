'use strict';

/**
 * comparisonService — Phase 15 (Step 4 of the migration sequence)
 * Compares the NEW structured-model balance against the LEGACY fields, per member,
 * so a human can review divergences before activation.
 *
 * IMPORTANT: exact equality is NOT expected — the models differ by design
 * (legacy = opening_balance + prepaid_subscription_ils; structured = spreadsheet).
 * The report SURFACES material deltas for human judgement; it does not auto-pass.
 *
 * Legacy anchor used (read-only, never written):
 *   legacy_reference = opening_balance + prepaid_subscription_ils
 * New figure:
 *   new_total_remaining = historical_balance_ils + Σ subscription.balance
 *
 * Output drives the Comparison Report (deliverable 9). Threshold flags large gaps.
 */

const DEFAULT_THRESHOLD_ILS = 0.01;

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

/**
 * @param {Array} legacyMembers  [{id, member_code, opening_balance, prepaid_subscription_ils, is_migration_exception}]
 * @param {Map}   newByMemberId  Map<member_id, {historical_balance_ils, subBalanceSum}>
 * @param {number} threshold
 */
function buildComparisonReport(legacyMembers, newByMemberId, threshold = DEFAULT_THRESHOLD_ILS) {
  const rows = legacyMembers.map((m) => {
    const nw = newByMemberId.get(m.id) ?? { historical_balance_ils: 0, subBalanceSum: 0 };
    const legacyRef = round2(Number(m.opening_balance || 0) + Number(m.prepaid_subscription_ils || 0));
    const newTotal = round2(Number(nw.historical_balance_ils || 0) + Number(nw.subBalanceSum || 0));
    const delta = round2(newTotal - legacyRef);
    return {
      code: m.member_code,
      exception: !!m.is_migration_exception,
      legacy_opening_balance: round2(Number(m.opening_balance || 0)),
      legacy_prepaid: round2(Number(m.prepaid_subscription_ils || 0)),
      legacy_reference: legacyRef,
      new_total_remaining: newTotal,
      delta,
      flagged: Math.abs(delta) > threshold,
    };
  });

  const flagged = rows.filter((r) => r.flagged && !r.exception);
  return {
    summary: {
      total: rows.length,
      flagged: flagged.length,
      exceptions: rows.filter((r) => r.exception).length,
      max_abs_delta: rows.reduce((mx, r) => Math.max(mx, Math.abs(r.delta)), 0),
      threshold,
      generated_at: new Date().toISOString(),
    },
    rows,
    flagged,
  };
}

module.exports = { buildComparisonReport, DEFAULT_THRESHOLD_ILS };
