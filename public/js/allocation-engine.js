/* ═══════════════════════════════════════════════════════════════════════════
   MODEL2 V2.0 · SLICE 1 — Stored Ordered Allocation Engine  (INERT · FLAG OFF)
   Implements the frozen constitution:
     · CA-001  allocation order: Current-Year → Historical Debt → Future-Year → Credit
     · CA-002  credit is consumed only at obligation creation (same order); remainder stays credit
     · CA-003  deterministic ordering: earliest-year-first, then creation timestamp, then immutable id
               (never dependent on database/query order); "Current-Year" = org operating year
     · CA-006  continuous running balance ⇒ "Historical Debt" = all debt BEFORE the current
               operating year (opening balance + any prior-year dues), aggregated
   This module is PURE and UN-WIRED: nothing in the app calls it while MODEL2_ALLOCATION_ENABLED
   is OFF (default). It changes no runtime behaviour. Wiring happens in Slice 2 behind the flag.
   Records produced here are IMMUTABLE (Object.freeze). Forward-only: never reallocates history.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;       /* Node/tests */
  if (typeof window !== 'undefined') {                                             /* browser */
    window.MODEL2Allocation = api;
    /* Feature flag — CONSTITUTIONAL CONFORMANCE HOLD (CCR-001 Rev A · IG-000).
       OFF until the flag-gated operations conform to FINANCIAL-CONSTITUTION-003:
       the allocation order must match FD-002 (IG-001) and a refund must recreate
       member debt per FD-009 (IG-012). While OFF, allocation recording, credit
       consumption, refund BO-11 and write-offs BO-12/13 are inert no-ops.
       An explicit prior assignment (settings/localStorage override) still wins. */
    if (typeof window.MODEL2_ALLOCATION_ENABLED === 'undefined') window.MODEL2_ALLOCATION_ENABLED = false;
  }
})(this, function () {
  'use strict';
  var R2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };

  /* Constitutional category rank (CA-001): Current-Year=0 · Historical=1 · Future=2.
     Historical (CA-006) = the opening/pre-system debt AND any prior-year dues (year < currentYear). */
  function categoryRank(ob, currentYear) {
    if (ob.kind === 'historical') return 1;
    var y = Number(ob.year), cy = Number(currentYear);
    if (y === cy) return 0;
    if (y < cy) return 1;
    return 2;
  }

  /* Deterministic ordering (CA-003): category → earliest-year-first → creation timestamp →
     immutable unique id. Never relies on input/storage order. Pure (copies before sorting). */
  function orderObligations(obligations, currentYear) {
    return (obligations || []).slice().sort(function (a, b) {
      var ca = categoryRank(a, currentYear), cb = categoryRank(b, currentYear);
      if (ca !== cb) return ca - cb;
      var ya = a.kind === 'historical' ? -Infinity : Number(a.year);
      var yb = b.kind === 'historical' ? -Infinity : Number(b.year);
      if (ya !== yb) return ya - yb;                                   /* earliest-year-first */
      var ta = new Date(a.createdAt || 0).getTime(), tb = new Date(b.createdAt || 0).getTime();
      if (ta !== tb) return ta - tb;                                   /* creation timestamp */
      var ia = String(a.id), ib = String(b.id);                       /* immutable unique id (Law 12) */
      return ia < ib ? -1 : ia > ib ? 1 : 0;
    });
  }

  /* Compute the ordered allocation of `amount` across `obligations`.
     Returns an IMMUTABLE result: { allocations:[{obligation_id,obligation_kind,year,amount_allocated}],
     creditRemaining, totalAllocated }. Value is conserved (Law 1): totalAllocated + creditRemaining = amount. */
  function computeAllocation(input) {
    var currentYear = input.currentYear;
    var amount = R2(input.amount);
    if (amount <= 0) return Object.freeze({ allocations: Object.freeze([]), creditRemaining: R2(amount < 0 ? 0 : amount), totalAllocated: 0 });
    var ordered = orderObligations(input.obligations, currentYear);
    var remaining = amount, records = [];
    for (var i = 0; i < ordered.length && remaining > 0; i++) {
      var ob = ordered[i];
      var due = R2(ob.remaining);
      if (due <= 0) continue;
      var applied = R2(Math.min(remaining, due));
      if (applied <= 0) continue;
      records.push(Object.freeze({
        obligation_id: ob.id,
        obligation_kind: ob.kind,
        year: ob.kind === 'historical' ? null : Number(ob.year),
        amount_allocated: applied
      }));
      remaining = R2(remaining - applied);
    }
    /* CA-001 step 4: any remainder stays Member Credit (never lost — Law 1). */
    return Object.freeze({
      allocations: Object.freeze(records),
      creditRemaining: R2(remaining),
      totalAllocated: R2(amount - remaining)
    });
  }

  /* Persistence interface (INERT in Slice 1). When the flag is enabled (Slice 2+), the caller records
     these immutable allocation rows atomically alongside the payment/consumption (Laws 4, 6, 7).
     Defined here for a stable contract; NOT invoked while the flag is OFF. */
  function buildAllocationRows(sourceRef, memberId, allocationResult, at) {
    var when = at || new Date().toISOString();
    return (allocationResult.allocations || []).map(function (a) {
      return Object.freeze({
        source_ref: sourceRef, member_id: memberId,
        obligation_id: a.obligation_id, obligation_kind: a.obligation_kind, year: a.year,
        amount_allocated: a.amount_allocated, allocated_at: when, immutable: true
      });
    });
  }

  return {
    version: 'v2.0-slice1',
    computeAllocation: computeAllocation,
    orderObligations: orderObligations,
    buildAllocationRows: buildAllocationRows,
    R2: R2
  };
});
