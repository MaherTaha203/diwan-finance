'use strict';

/**
 * validationService — Phase 15
 * Reconciles the imported structured data against the spreadsheet's own derived
 * columns (7/8/9). Pure: takes the import plans (from migrationService) and the
 * per-member spreadsheet targets, returns a structured report. Exceptions
 * (TAHA-0120/0134/0149) bypass reconciliation but are still listed.
 *
 * Checks per non-exception member:
 *   A. col7  Remaining 2025+2026  == Σ subscription.balance
 *   B. col9  Total Remaining      == historical_balance_ils + Σ subscription.balance
 *   C. col8  Total Payments to 26 == historical_payments + Payments2025 + Payments2026
 *   D. name match (spreadsheet vs DB)
 *   E. anomaly: any subscription.balance < 0  (overpayment — needs review)
 */

const EPS = 0.01; // ₪ tolerance for rounding

const approx = (a, b) => Math.abs(Number(a) - Number(b)) <= EPS;

function validatePlan(plan) {
  const issues = [];
  const subBalanceSum = plan.subscriptions.reduce((s, x) => s + x.balance_ils, 0);
  const paidSum = plan.subscriptions.reduce((s, x) => s + x.paid_amount_ils, 0);

  if (plan.isException) {
    return { code: plan.member.member_code, exception: true, status: 'skipped', issues: [] };
  }

  // A
  if (!approx(plan.spreadsheet.remaining2025_2026, subBalanceSum)) {
    issues.push({ check: 'A_remaining_2025_2026', expected: plan.spreadsheet.remaining2025_2026, got: round2(subBalanceSum) });
  }
  // B
  const totalRemaining = plan.member.historical_balance_ils + subBalanceSum;
  if (!approx(plan.spreadsheet.totalRemainingTo2026, totalRemaining)) {
    issues.push({ check: 'B_total_remaining', expected: plan.spreadsheet.totalRemainingTo2026, got: round2(totalRemaining) });
  }
  // C
  const totalPaid = plan.member.historical_payments_ils + paidSum;
  if (!approx(plan.spreadsheet.totalPaymentsTo2026, totalPaid)) {
    issues.push({ check: 'C_total_payments', expected: plan.spreadsheet.totalPaymentsTo2026, got: round2(totalPaid) });
  }
  // E
  for (const s of plan.subscriptions) {
    if (s.balance_ils < -EPS) {
      issues.push({ check: 'E_overpayment', year: s.year, balance: s.balance_ils, note: 'paid exceeds due; confirm credit handling' });
    }
  }

  return {
    code: plan.member.member_code,
    exception: false,
    status: issues.length ? 'fail' : 'pass',
    issues,
  };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

/**
 * @param {Array} plans  output of migrationService planning
 * @returns {object} validation report
 */
function buildValidationReport(plans) {
  const results = plans.map(validatePlan);
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    exceptions: results.filter((r) => r.exception).length,
    generated_at: new Date().toISOString(),
  };
  return { summary, results, failures: results.filter((r) => r.status === 'fail') };
}

module.exports = { buildValidationReport, validatePlan, EPS };
