/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R6 — Member Statement cut-over glue.
   ---------------------------------------------------------------------------
   The pilot cut-over. Routes the LIVE Member Financial Statement — screen +
   print + PDF + Excel — through the unified engine (Report.render), replacing
   the bespoke builders behind a single flag:

       window.REPORT_ENGINE_MEMBER_STATEMENT   (default OFF)

   With the flag OFF (default) every legacy path runs UNCHANGED — this module is
   inert. With it ON, the four surfaces are served by the engine from ONE model
   (ReportModels.memberStatement → FIN.memberStatementView), so screen == print
   == PDF == Excel (spec §7.1). CSV/JSON stay on legacy for now (not in the
   parity gate; they migrate with the csv renderer). No FIN/DB/accounting change.

   The tiny guarded branches added to renderMemberStmt / prtMemberStmt /
   exportMemberStmt delegate here; ALL new behaviour lives in this module so the
   legacy files carry only a one-line, flag-gated early return.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* flag default — OFF. Owner flips it (console / preview) to review parity. */
  if (typeof root.REPORT_ENGINE_MEMBER_STATEMENT === 'undefined') root.REPORT_ENGINE_MEMBER_STATEMENT = false;

  function lang() { return root.LANG === 'en' ? 'en' : 'ar'; }
  function el(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function toastErr(key, fallback) { if (root.toast) root.toast((root.t ? root.t(key) : fallback) || fallback, 'err'); }
  function toastWarn(key, fallback) { if (root.toast) root.toast((root.t ? root.t(key) : fallback) || fallback, 'warn'); }

  /* ready only when every dependency is present (engine + model gatherer + FIN). */
  function ready() {
    return !!(root.REPORT_ENGINE_MEMBER_STATEMENT && root.Report && root.ReportModels &&
      typeof root.ReportModels.memberStatement === 'function' && root.FIN && root.FIN.memberStatementView);
  }

  /* gather the current selection → one canonical ReportModel (single source). */
  function gatherModel() {
    var sel = el('ms-member'); var mid = sel && sel.value;
    if (!mid) return null;
    var from = (el('ms-from') || {}).value || '';
    var to = (el('ms-to') || {}).value || '';
    return root.ReportModels.memberStatement(mid, from, to);
  }

  /* permission parity with the legacy paths. */
  function allow(target) {
    var can = root.can;
    if (!can) return true;
    if (target === 'excel') return !(can.export && !can.export());
    return !(can.print && !can.print());   // print / pdf
  }

  /* deliver an output. print/pdf/excel go through the engine; csv keeps its
     legacy exporter (the csv renderer is not real yet — migrates later) so the
     toolbar's CSV button stays functional. */
  function deliver(target) {
    if (!ready()) return false;
    if (target === 'csv') { if (typeof root.exportMemberStmt === 'function') root.exportMemberStmt('csv'); return true; }
    if (!allow(target)) { toastErr(target === 'excel' ? 'errors.no_permission' : 'errors.no_print', target === 'excel' ? 'لا توجد صلاحية' : 'لا توجد صلاحية طباعة'); return true; }
    var model = gatherModel();
    if (!model) { toastWarn('errors.select_member', 'اختر عضواً'); return true; }
    root.Report.render(model, target, { lang: lang() });
    return true;
  }

  /* render the on-screen statement (unified design) into #ms-out, with the
     engine-built output toolbar above it and one delegated click handler. */
  function renderScreen() {
    if (!ready()) return false;
    var out = el('ms-out'); if (!out) return true;
    var model = gatherModel();
    if (!model) { out.innerHTML = ''; return true; }
    var toolbar = '<div class="rpt-toolbar" id="ms-rpt-toolbar">' +
      root.Report.outputButtons('MEMBER_STATEMENT', { lang: lang(), can: root.can }) + '</div>';
    out.innerHTML = toolbar + '<div id="ms-rpt-mount"></div>';
    root.Report.render(model, 'screen', { mountId: 'ms-rpt-mount', lang: lang() });
    if (!out.__rptWired) { out.addEventListener('click', onOutputClick); out.__rptWired = true; }
    return true;
  }

  function onOutputClick(e) {
    var btn = e.target && e.target.closest && e.target.closest('.rpt-out-btn');
    if (!btn) return;
    var output = btn.getAttribute('data-output');
    if (output) deliver(output);
  }

  root.ReportCutover = {
    ready: ready,
    gatherModel: gatherModel,
    renderMemberScreen: renderScreen,
    deliverMember: deliver
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutover;
})(typeof window !== 'undefined' ? window : globalThis);
