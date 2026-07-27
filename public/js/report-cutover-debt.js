/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7b — Annual Debt + Delinquent cut-over (outputs only).
   ---------------------------------------------------------------------------
   These two reports have INTERACTIVE in-container filters (category + year
   chips), so their on-screen views stay legacy. This slice routes only their
   shareable OUTPUT documents (print · PDF · Excel) through the unified engine,
   each behind its own default-OFF flag:

       window.REPORT_ENGINE_ANNUAL_DEBT   (default OFF)
       window.REPORT_ENGINE_DELINQUENT    (default OFF)

   The gatherers read the live view-state (annualDebtModel / delinquentRows), so
   the exported document matches exactly what is on screen. No FIN/DB change.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function mk(flag, reportId, gather) {
    if (!root.ReportCutoverCore || typeof root.ReportCutoverCore.make !== 'function') return null;
    return root.ReportCutoverCore.make({ flag: flag, reportId: reportId, mountId: function () { return null; }, gather: gather });
  }

  var _ad = null, _dl = null;
  function ad() { if (!_ad) _ad = mk('REPORT_ENGINE_ANNUAL_DEBT', 'ANNUAL_DEBT', function () { return root.ReportModels.annualDebt(); }); return _ad; }
  function dl() { if (!_dl) _dl = mk('REPORT_ENGINE_DELINQUENT', 'DELINQUENT', function () { return root.ReportModels.delinquent(); }); return _dl; }

  root.ReportCutoverDebt = {
    annualDebtReady: function () { var c = ad(); return !!(c && c.ready()); },
    delinquentReady: function () { var c = dl(); return !!(c && c.ready()); },
    annualDebt: function (target) { var c = ad(); return c ? c.deliver(undefined, target) : false; },
    delinquent: function (target) { var c = dl(); return c ? c.deliver(undefined, target) : false; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverDebt;
})(typeof window !== 'undefined' ? window : globalThis);
