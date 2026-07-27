/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7d — Lists cut-over (Members · Annual log · Users, outputs only).
   ---------------------------------------------------------------------------
   These three lists are interactive tables (search/filter, row actions), so
   their screens stay legacy. This slice routes only their OUTPUT documents
   (print · PDF · Excel) through the unified engine, each behind its own
   default-OFF flag:

       window.REPORT_ENGINE_MEMBERS_LIST   (default OFF)
       window.REPORT_ENGINE_ANNUAL_LOG     (default OFF)
       window.REPORT_ENGINE_USERS_LIST     (default OFF)

   The gatherers read the live DB + filter inputs, so the exported document
   matches the on-screen list. No DB/accounting change.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function mk(flag, reportId, gather) {
    if (!root.ReportCutoverCore || typeof root.ReportCutoverCore.make !== 'function') return null;
    return root.ReportCutoverCore.make({ flag: flag, reportId: reportId, mountId: function () { return null; }, gather: gather });
  }

  var _m = null, _a = null, _u = null;
  function m() { if (!_m) _m = mk('REPORT_ENGINE_MEMBERS_LIST', 'MEMBERS_LIST', function () { return root.ReportModels.membersList(); }); return _m; }
  function a() { if (!_a) _a = mk('REPORT_ENGINE_ANNUAL_LOG', 'ANNUAL_LOG', function () { return root.ReportModels.annualLog(); }); return _a; }
  function u() { if (!_u) _u = mk('REPORT_ENGINE_USERS_LIST', 'USERS_LIST', function () { return root.ReportModels.usersList(); }); return _u; }

  root.ReportCutoverLists = {
    membersReady: function () { var c = m(); return !!(c && c.ready()); },
    annualReady: function () { var c = a(); return !!(c && c.ready()); },
    usersReady: function () { var c = u(); return !!(c && c.ready()); },
    members: function (t) { var c = m(); return c ? c.deliver(undefined, t) : false; },
    annual: function (t) { var c = a(); return c ? c.deliver(undefined, t) : false; },
    users: function (t) { var c = u(); return c ? c.deliver(undefined, t) : false; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverLists;
})(typeof window !== 'undefined' ? window : globalThis);
