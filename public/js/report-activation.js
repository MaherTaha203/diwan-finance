/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R8-a — Engine Activation.
   ---------------------------------------------------------------------------
   Flips every cut-over flag ON so the unified report engine (REPORT-001) is the
   LIVE DEFAULT for all reports — screen, print, PDF and Excel now flow through
   Report.render(...) instead of the legacy string-builders.

   STAGED, REVERSIBLE. The legacy builders are RETAINED as a fallback: setting
   any flag back to `false` at runtime immediately reverts that single surface to
   its legacy path (the flag-gated branches read the flag at call time). Nothing
   about FIN / DB / accounting changes.

       // emergency rollback of one surface (browser console), no redeploy:
       window.REPORT_ENGINE_FUND_STATEMENT = false;

   This is the activation half of R8. Legacy code is REMOVED only later in R8-b,
   after a stable soak + regression + owner sign-off ("verified before removed").

   Load order: this runs at load and sets each flag authoritatively, overriding
   the per-module default-OFF guards — so it is the single source of the ON state.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* one flag per report family (the three vouchers share REPORT_ENGINE_VOUCHERS). */
  var FLAGS = [
    'REPORT_ENGINE_MEMBER_STATEMENT',
    'REPORT_ENGINE_FUND_STATEMENT',
    'REPORT_ENGINE_ANNUAL_DEBT',
    'REPORT_ENGINE_DELINQUENT',
    'REPORT_ENGINE_DONATION_REPORT',
    'REPORT_ENGINE_MEMBERS_LIST',
    'REPORT_ENGINE_RECEIPTS_LIST',
    'REPORT_ENGINE_PAYMENTS_LIST',
    'REPORT_ENGINE_ANNUAL_LOG',
    'REPORT_ENGINE_USERS_LIST',
    'REPORT_ENGINE_AUDIT_LOG',
    'REPORT_ENGINE_TREASURY_POSITION',
    'REPORT_ENGINE_DUES_SNAPSHOT',
    'REPORT_ENGINE_CONSISTENCY',
    'REPORT_ENGINE_VOUCHERS'
  ];

  /* Activate every surface. This overrides the per-module default-OFF guards (the
     modules only set false when the flag is still `undefined`, so this file is the
     authoritative ON switch regardless of load order). Rollback is a RUNTIME
     override — `window.REPORT_ENGINE_X = false` in the console runs after load and
     wins, because the flag-gated branches read the flag at call time. */
  FLAGS.forEach(function (f) { root[f] = true; });

  if (typeof root !== 'undefined') root.REPORT_ENGINE_FLAGS = FLAGS.slice();
  if (typeof module !== 'undefined' && module.exports) module.exports = FLAGS;
})(typeof window !== 'undefined' ? window : globalThis);
