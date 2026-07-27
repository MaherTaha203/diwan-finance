/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7c — Donations Register cut-over (outputs only).
   ---------------------------------------------------------------------------
   The donations screen is a paginated table with per-row action buttons, so it
   stays legacy. This slice routes only the shareable OUTPUT documents (print ·
   PDF · Excel) through the unified engine, behind one default-OFF flag:

       window.REPORT_ENGINE_DONATION_REPORT   (default OFF)

   The gatherer reads FIN.donationRegister and the shared donationDirectionLabel,
   so the exported document is byte-identical in figures to the legacy one.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var _c = null;
  function cut() {
    if (!_c && root.ReportCutoverCore && typeof root.ReportCutoverCore.make === 'function') {
      _c = root.ReportCutoverCore.make({
        flag: 'REPORT_ENGINE_DONATION_REPORT', reportId: 'DONATION_REPORT',
        mountId: function () { return null; },
        gather: function () { return root.ReportModels.donationReport(); }
      });
    }
    return _c;
  }

  root.ReportCutoverDonation = {
    ready: function () { var c = cut(); return !!(c && c.ready()); },
    deliver: function (target) { var c = cut(); return c ? c.deliver(undefined, target) : false; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverDonation;
})(typeof window !== 'undefined' ? window : globalThis);
