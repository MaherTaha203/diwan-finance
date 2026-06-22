'use strict';
/**
 * Item 9 — Member Debt Priority Allocation (pure, deterministic, side-effect free).
 *
 * For every Food Fund donation, in chronological order:
 *   1. Settle the donor-member's outstanding Food Fund debt first (Debt Settlement
 *      movement — increases the Food Fund, NOT a donation).
 *   2. The remaining amount is the donation, allocated by destination:
 *        - reduce_deficit : up to the remaining Historical Deficit -> Reserve
 *                           (Historical Deficit Donation); any surplus overflows
 *                           to Current Support.
 *        - support_current: the whole remainder -> Current Support Donation.
 *
 * Non-member donors and members with no debt skip step 1.
 *
 * @param {Array<{id, memberId:?, amount:number, allocation:'reduce_deficit'|'support_current'}>} donations
 *        Chronologically ordered (caller sorts).
 * @param {Object<string,number>} baseDebt  member_id -> pre-donation debt (negatives = credit, treated as 0).
 * @param {number} deficitMagnitude  |historical deficit| available to settle (e.g. 8639).
 * @returns {{perReceipt:Object, perMember:Object, debtSettlementTotal:number, reserveTotal:number, currentSupportTotal:number}}
 */
function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

function allocate(donations, baseDebt, deficitMagnitude) {
  const debtLeft = {};
  Object.keys(baseDebt || {}).forEach((k) => { debtLeft[k] = Math.max(0, Number(baseDebt[k]) || 0); });
  let deficitLeft = Math.max(0, Number(deficitMagnitude) || 0);

  const perReceipt = {};
  const perMember = {};
  let dTotal = 0, rTotal = 0, cTotal = 0;

  for (const d of (donations || [])) {
    const amt = Number(d.amount) || 0;

    // Step 1 — settle member debt first.
    let debtSettled = 0;
    if (d.memberId != null) {
      const left = debtLeft[d.memberId] !== undefined ? debtLeft[d.memberId] : 0;
      debtSettled = Math.min(left, amt);
      debtLeft[d.memberId] = round2(left - debtSettled);
      perMember[d.memberId] = round2((perMember[d.memberId] || 0) + debtSettled);
    }

    // Step 2 — allocate the remaining donation by destination.
    const remainder = round2(amt - debtSettled);
    let toDeficit = 0, toCurrent = 0;
    if (d.allocation === 'reduce_deficit') {
      toDeficit = Math.min(remainder, deficitLeft);
      deficitLeft = round2(deficitLeft - toDeficit);
      toCurrent = round2(remainder - toDeficit); // over-settlement overflow -> current support
    } else {
      toCurrent = remainder; // support_current
    }

    perReceipt[d.id] = { debtSettled: round2(debtSettled), toDeficit: round2(toDeficit), toCurrent: round2(toCurrent) };
    dTotal = round2(dTotal + debtSettled);
    rTotal = round2(rTotal + toDeficit);
    cTotal = round2(cTotal + toCurrent);
  }

  return {
    perReceipt,
    perMember,
    debtSettlementTotal: dTotal,
    reserveTotal: rTotal,
    currentSupportTotal: cTotal,
  };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { allocate, round2 }; }
if (typeof window !== 'undefined') { window.FoodDonationAllocation = { allocate, round2 }; }
