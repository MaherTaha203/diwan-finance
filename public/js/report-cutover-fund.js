/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7a — Fund Statement cut-over (food · diwan).
   ---------------------------------------------------------------------------
   Routes the LIVE fund statements through the unified engine (screen · print ·
   PDF · Excel) behind a single default-OFF flag, using the cut-over core:

       window.REPORT_ENGINE_FUND_STATEMENT   (default OFF)

   OFF → the legacy renderStmt/prtStmt run unchanged (this module is inert).
   ON  → both funds render from one ReportModels.fundStatement model, so
   screen == print == PDF == Excel. csv keeps its legacy exporter. The `key` is
   the fund ('food' | 'diwan'). No FIN/DB/accounting change.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function make() {
    if (!root.ReportCutoverCore || typeof root.ReportCutoverCore.make !== 'function') return null;
    return root.ReportCutoverCore.make({
      flag: 'REPORT_ENGINE_FUND_STATEMENT',
      reportId: 'FUND_STATEMENT',
      mountId: function (fund) { return fund + '-stmt-out'; },
      gather: function (fund) {
        var g = function (id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; };
        var from = (g(fund + '-stmt-from') || {}).value || '';
        var to = (g(fund + '-stmt-to') || {}).value || '';
        var type = (g(fund + '-stmt-type') || {}).value || '';
        return root.ReportModels.fundStatement(fund, from, to, type);
      },
      csv: function (fund) { if (typeof root.exportCSV === 'function') root.exportCSV(fund + '-stmt'); }
    });
  }

  /* lazily-built singleton (ReportCutoverCore loads just before this file). */
  var _cut = null;
  function cut() { if (!_cut) _cut = make(); return _cut; }

  root.ReportCutoverFund = {
    ready: function () { var c = cut(); return !!(c && c.ready()); },
    renderScreen: function (fund) { var c = cut(); return c ? c.renderScreen(fund) : false; },
    deliver: function (fund, target) { var c = cut(); return c ? c.deliver(fund, target) : false; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverFund;
})(typeof window !== 'undefined' ? window : globalThis);
