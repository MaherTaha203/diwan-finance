'use strict';

/**
 * foodFundDonationService — Phase 15 (Food Fund Donation Allocation)
 * ------------------------------------------------------------------
 * Forward-only feature. Triggers ONLY when a receipt is:
 *     fund_type = 'donation'  AND  donation_display_fund = 'food'
 * For those receipts the donor (admin) must choose an allocation:
 *     'support_current' -> adds to the current operational food balance
 *     'reduce_deficit'  -> applies against the historical food deficit (-8689)
 *
 * The historical deficit constant (settings.food_opening_balance) is NEVER mutated.
 * Both buckets are COMPUTED from receipts so they always reconcile and survive rebuild.
 * External-donor and all non-(donation+food) workflows are unchanged.
 */

const { AUDIT_ACTIONS, writeAudit } = require('./auditService');

const ALLOCATION = Object.freeze({ SUPPORT_CURRENT: 'support_current', REDUCE_DEFICIT: 'reduce_deficit' });

/** True when the allocation field is required for this receipt shape. */
function requiresAllocation(receipt) {
  return receipt.fund_type === 'donation' && receipt.donation_display_fund === 'food';
}

/**
 * Validate a receipt write. Returns {ok, error}. App layer + DB CHECK both enforce.
 */
function validateReceipt(receipt) {
  if (!requiresAllocation(receipt)) {
    // Field must be absent for non-qualifying receipts (keep external workflow clean).
    if (receipt.food_donation_allocation != null) {
      return { ok: false, error: 'food_donation_allocation must be empty unless donation targets the food fund' };
    }
    return { ok: true };
  }
  if (!Object.values(ALLOCATION).includes(receipt.food_donation_allocation)) {
    return { ok: false, error: 'Donation Allocation is required: choose support_current or reduce_deficit' };
  }
  return { ok: true };
}

/**
 * Compute the two food-fund figures (kept separate, never merged).
 * @param {object} supabase service_role client
 * @param {function} computeOperationalFoodBalance  app's existing current-food query
 *        (injected so 'support_current' donations plug into the SAME calculation).
 * @returns {{current_food_balance, historical_deficit_remaining, deficit_constant}}
 */
async function computeFoodFundFigures(supabase, computeOperationalFoodBalance) {
  const { data: setting, error: sErr } = await supabase
    .from('settings').select('value').eq('key', 'food_opening_balance').single();
  if (sErr) throw new Error(`load deficit constant: ${sErr.message}`);
  const deficitConstant = Number(setting.value); // -8689, never mutated

  const { data: donations, error: dErr } = await supabase
    .from('receipts')
    .select('amount_ils, food_donation_allocation')
    .eq('fund_type', 'donation').eq('donation_display_fund', 'food').eq('is_deleted', false);
  if (dErr) throw new Error(`load food donations: ${dErr.message}`);

  const sumBy = (kind) => donations
    .filter((d) => d.food_donation_allocation === kind)
    .reduce((s, d) => s + Number(d.amount_ils), 0);

  const supportCurrent = round2(sumBy(ALLOCATION.SUPPORT_CURRENT));
  const reduceDeficit  = round2(sumBy(ALLOCATION.REDUCE_DEFICIT));

  const operational = round2(await computeOperationalFoodBalance()); // existing app calculation

  // §13 (FINAL): reduce deficit toward zero; any EXCESS auto-routes to current balance.
  // Constant never mutated. No flagging, no pending, no suspended amount.
  const deficitMagnitude = Math.abs(deficitConstant);                  // 8689
  const appliedToDeficit = Math.min(reduceDeficit, deficitMagnitude);  // up to 8689
  const excessToCurrent  = round2(reduceDeficit - appliedToDeficit);   // surplus auto-routed
  const deficitRemaining = round2(deficitConstant + appliedToDeficit); // <= 0, reaches 0 then stops
  const currentBalance   = round2(operational + supportCurrent + excessToCurrent);

  return {
    current_food_balance: currentBalance,
    historical_deficit_remaining: deficitRemaining,    // 0 once fully covered
    deficit_constant: deficitConstant,
    support_current_total: supportCurrent,
    reduce_deficit_total: reduceDeficit,
    deficit_excess_routed_to_current: excessToCurrent, // transparency; already in currentBalance
  };
}

/**
 * Audit an allocation choice (on create or on A<->B change). Reuses audit_log.
 */
async function auditAllocation(supabase, { receiptId, userName, amountIls, oldAllocation, newAllocation }) {
  await writeAudit(supabase, {
    userName,
    action: AUDIT_ACTIONS.ALLOCATION_CHANGE,
    tableName: 'receipts',
    recordId: receiptId,
    description: `Food donation allocation: ${oldAllocation ?? '(none)'} -> ${newAllocation}`,
    oldData: oldAllocation ? { food_donation_allocation: oldAllocation, amount_ils: amountIls } : null,
    newData: { food_donation_allocation: newAllocation, amount_ils: amountIls },
  });
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

module.exports = { ALLOCATION, requiresAllocation, validateReceipt, computeFoodFundFigures, auditAllocation };
