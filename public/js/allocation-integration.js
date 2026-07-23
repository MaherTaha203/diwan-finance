/* ═══════════════════════════════════════════════════════════════════════════
   MODEL2 V2.0 · SLICE 2 — Allocation Integration  (BEHIND FLAG · default OFF)
   Wires the Slice-1 engine (public/js/allocation-engine.js) into the live capture path:
     · OD-01 — a member payment records its ordered allocation across obligations.
     · OD-02 — at new-obligation creation (annual dues), an existing member credit is
               consumed against obligations in the same constitutional order (CA-001/002/003).
   EVERY entry point self-guards on window.MODEL2_ALLOCATION_ENABLED. While the flag is OFF
   (default), all recorders are no-ops and behaviour is byte-identical to today. Recording is
   best-effort metadata (immutable allocation rows); it never alters balances (balances remain
   the certified net) and never blocks the core operation. Forward-only.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;       /* Node/tests */
  if (typeof window !== 'undefined') {
    /* Pure helpers (testable) */
    window.MODEL2_int = api;
    /* Browser wrappers bind the pure helpers to the app globals (DB / SB / FIN). */
    window.MODEL2CurrentOperatingYear = function () {
      var settings = (typeof DB !== 'undefined' && DB.settings) ? DB.settings : null;
      return api.resolveCurrentYear(settings, new Date().getFullYear());
    };
    window.MODEL2BuildObligations = function (memberId) {
      var data = { members: (typeof DB !== 'undefined' ? DB.members : []) || [], subscriptions: (typeof DB !== 'undefined' ? DB.subscriptions : []) || [] };
      return api.buildObligations(data, memberId);
    };
    /* OD-01 — record a payment's ordered allocation. */
    window.MODEL2RecordAllocation = async function (memberId, sourceRef, amount) {
      if (!window.MODEL2_ALLOCATION_ENABLED) return null;                          /* FLAG OFF → no-op */
      if (!window.MODEL2Allocation || !(Number(amount) > 0) || !memberId) return null;
      try {
        var result = window.MODEL2Allocation.computeAllocation({
          currentYear: window.MODEL2CurrentOperatingYear(),
          amount: Number(amount),
          obligations: window.MODEL2BuildObligations(memberId)
        });
        var rows = window.MODEL2Allocation.buildAllocationRows(sourceRef, memberId, result, new Date().toISOString());
        if (rows.length && typeof SB !== 'undefined') await SB.from('allocation_records').insert(rows);
        return result;
      } catch (e) { if (typeof console !== 'undefined') console.warn('MODEL2RecordAllocation skipped:', e && e.message); return null; }
    };
    /* OD-02 — at new-obligation creation, consume an existing credit (metadata record). */
    window.MODEL2RecordCreditConsumption = async function (memberId) {
      if (!window.MODEL2_ALLOCATION_ENABLED) return null;                          /* FLAG OFF → no-op */
      if (!window.MODEL2Allocation || !memberId) return null;
      try {
        var credit = (typeof FIN !== 'undefined' && FIN.memberStatement) ? Number(FIN.memberStatement(memberId).creditBalance || 0) : 0;
        if (!(credit > 0)) return null;
        var result = window.MODEL2Allocation.computeAllocation({
          currentYear: window.MODEL2CurrentOperatingYear(),
          amount: credit,
          obligations: window.MODEL2BuildObligations(memberId)
        });
        var rows = window.MODEL2Allocation.buildAllocationRows('credit:' + memberId, memberId, result, new Date().toISOString());
        if (rows.length && typeof SB !== 'undefined') await SB.from('allocation_records').insert(rows.map(function (r) { return Object.assign({}, r, { source_kind: 'credit_consumption' }); }));
        return result;
      } catch (e) { if (typeof console !== 'undefined') console.warn('MODEL2RecordCreditConsumption skipped:', e && e.message); return null; }
    };
  }
})(this, function () {
  'use strict';
  var num = function (n) { return Number(n) || 0; };

  /* Current-Year (OD-03/CA-003): a business setting independent of period-lock. Read from
     settings.current_operating_year (or a settings.map); default to the given calendar year. */
  function resolveCurrentYear(settings, defaultYear) {
    var v = null;
    if (settings) v = settings.current_operating_year != null ? settings.current_operating_year
      : (settings.map ? settings.map.current_operating_year : null);
    var y = parseInt(v, 10);
    return (y && y >= 2020 && y <= 2100) ? y : defaultYear;
  }

  /* Build a member's outstanding obligations for the engine: the historical opening remainder
     (kind 'historical') + each subscription year's (due − paid) remainder (kind 'due'). Pure. */
  function buildObligations(data, memberId) {
    var obs = [];
    var m = ((data && data.members) || []).find(function (x) { return x.id === memberId; });
    if (!m) return obs;
    var openRemain = num(m.historical_balance_ils) - num(m.historical_payments_ils);
    if (openRemain > 0) obs.push({ id: 'hist:' + memberId, kind: 'historical', remaining: openRemain, createdAt: m.created_at || '2000-01-01' });
    ((data && data.subscriptions) || []).filter(function (s) { return s.member_id === memberId; }).forEach(function (s) {
      var remain = num(s.due_amount_ils) - num(s.paid_amount_ils);
      if (remain > 0) obs.push({ id: 'sub:' + (s.id || (memberId + ':' + s.year)), kind: 'due', year: Number(s.year), remaining: remain, createdAt: s.created_at || (s.year + '-01-01') });
    });
    return obs;
  }

  return { version: 'v2.0-slice2', resolveCurrentYear: resolveCurrentYear, buildObligations: buildObligations };
});
