/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7b — Annual Debt + Delinquent cut-over.
   ---------------------------------------------------------------------------
   These two reports have INTERACTIVE in-container filters (category + year
   chips). Their shareable OUTPUT documents (print · PDF · Excel) route through
   the unified engine, each behind its own flag:

       window.REPORT_ENGINE_ANNUAL_DEBT   (default OFF)
       window.REPORT_ENGINE_DELINQUENT    (default OFF)

   OUTPUT-002-C UX Slice 1 — the ON-SCREEN report BODY now renders through the
   unified engine too (into `annual-debt-engine` / `delinquent-engine`), so the
   Output Rendering Contract holds on screen: target='screen' never renders the
   document logo (report-layout header()), while print/PDF honour showLogo. The
   legacy `.acct-stmt` document header + `.as-brand` emblem are gone; the filter
   chips stay above the engine mount as screen controls (reports.js). The
   gatherers read the live view-state, so screen == print == PDF == Excel.
   No FIN/DB/sort change.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function mk(flag, reportId, mountId, gather) {
    if (!root.ReportCutoverCore || typeof root.ReportCutoverCore.make !== 'function') return null;
    /* screenToolbar:false — the debt report PAGES already own the unified «الإخراج ▼»
       output menu, so the engine must not add a second one on screen (dedup). */
    return root.ReportCutoverCore.make({ flag: flag, reportId: reportId, mountId: function () { return mountId; }, gather: gather, screenToolbar: false });
  }

  var _ad = null, _dl = null;
  function ad() { if (!_ad) _ad = mk('REPORT_ENGINE_ANNUAL_DEBT', 'ANNUAL_DEBT', 'annual-debt-engine', function () { return root.ReportModels.annualDebt(); }); return _ad; }
  function dl() { if (!_dl) _dl = mk('REPORT_ENGINE_DELINQUENT', 'DELINQUENT', 'delinquent-engine', function () { return root.ReportModels.delinquent(); }); return _dl; }

  root.ReportCutoverDebt = {
    annualDebtReady: function () { var c = ad(); return !!(c && c.ready()); },
    delinquentReady: function () { var c = dl(); return !!(c && c.ready()); },
    annualDebt: function (target) { var c = ad(); return c ? c.deliver(undefined, target) : false; },
    delinquent: function (target) { var c = dl(); return c ? c.deliver(undefined, target) : false; },
    /* Slice 1 — render the on-screen report body via the engine (no document logo). */
    annualDebtScreen: function () { var c = ad(); return c ? c.renderScreen() : false; },
    delinquentScreen: function () { var c = dl(); return c ? c.renderScreen() : false; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverDebt;
})(typeof window !== 'undefined' ? window : globalThis);
