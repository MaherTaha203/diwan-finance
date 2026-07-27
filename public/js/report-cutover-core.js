/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7 — Cut-over core (reusable factory).
   ---------------------------------------------------------------------------
   Generalises the R6 pattern so each remaining report migrates with a tiny
   adapter instead of copied glue. `ReportCutoverCore.make(cfg)` returns a
   cut-over object that: defaults its flag OFF, gathers ONE model, routes
   screen/print/pdf/excel through Report.render (csv falls back to a legacy
   exporter), and — on screen — injects the engine-built output toolbar plus a
   single delegated click handler.

   cfg = {
     flag:      'REPORT_ENGINE_<X>',          // window flag name (default OFF)
     reportId:  'FUND_STATEMENT',             // registry id (for outputButtons)
     gather:    function(key){ return model|null },   // key = optional variant (e.g. fund)
     mountId:   function(key){ return '<container id>' },
     csv:       function(key){ ... },          // optional legacy csv fallback
     permission:function(target){ return bool } // optional; default print/export via can
   }
   Every method takes an optional `key` so one adapter can serve variants
   (food/diwan) that share a report id.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function lang() { return root.LANG === 'en' ? 'en' : 'ar'; }
  function toast(kind, key, fallback) { if (root.toast) root.toast((root.t ? root.t(key) : fallback) || fallback, kind); }

  function make(cfg) {
    cfg = cfg || {};
    if (cfg.flag && typeof root[cfg.flag] === 'undefined') root[cfg.flag] = false;

    function ready() {
      return !!(cfg.flag && root[cfg.flag] && root.Report && root.ReportModels && root.FIN);
    }

    function allow(target) {
      if (typeof cfg.permission === 'function') return cfg.permission(target);
      var can = root.can; if (!can) return true;
      if (target === 'excel') return !(can.export && !can.export());
      return !(can.print && !can.print());     // print / pdf
    }

    function deliver(key, target) {
      if (!ready()) return false;
      if (target === 'csv') { if (typeof cfg.csv === 'function') cfg.csv(key); return true; }
      if (!allow(target)) { toast('err', target === 'excel' ? 'errors.no_permission' : 'errors.no_print', 'لا توجد صلاحية'); return true; }
      var model = cfg.gather(key);
      if (!model) { toast('warn', 'errors.select_member', 'لا توجد بيانات'); return true; }
      root.Report.render(model, target, { lang: lang() });
      return true;
    }

    function renderScreen(key) {
      if (!ready()) return false;
      var id = cfg.mountId(key);
      var out = (typeof document !== 'undefined') ? document.getElementById(id) : null;
      if (!out) return true;
      var model = cfg.gather(key);
      if (!model) { out.innerHTML = ''; return true; }
      var mountId = id + '-rpt-mount';
      out.innerHTML = '<div class="rpt-toolbar">' +
        root.Report.outputButtons(cfg.reportId, { lang: lang(), can: root.can }) +
        '</div><div id="' + mountId + '"></div>';
      root.Report.render(model, 'screen', { mountId: mountId, lang: lang() });
      if (!out.__rptWired) {
        out.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest && e.target.closest('.rpt-out-btn');
          if (btn && btn.getAttribute('data-output')) deliver(key, btn.getAttribute('data-output'));
        });
        out.__rptWired = true;
      }
      return true;
    }

    return { ready: ready, deliver: deliver, renderScreen: renderScreen, gather: function (key) { return cfg.gather(key); } };
  }

  root.ReportCutoverCore = { make: make };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportCutoverCore;
})(typeof window !== 'undefined' ? window : globalThis);
