/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R6 — Screen Renderer.
   ---------------------------------------------------------------------------
   Swaps the engine's empty `screen` skeleton for the real one: it builds the
   shared layout (R2 ReportLayout.build) and mounts it into a page element,
   injecting the engine stylesheet (design tokens + components) ONCE. This is
   the on-screen half of the unified pipeline — the SAME model + SAME layout the
   print/pdf renderers use, so screen == print == PDF (spec §7.1 cross-medium
   parity). The running header/footer bands stay hidden on screen (they are
   print-only) — the in-flow masthead carries the brand once.

   Split for testability (mirrors print/pdf/excel):
     ScreenRenderer.compose(model, opts) -> { html, css }                 (PURE)
     ScreenRenderer.render(model, ctx)   -> composes, injects css once, and sets
                                            the mount's innerHTML; returns status.
   The mount is taken from ctx.opts.mount (an element) or ctx.opts.mountId (an id).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var STYLE_ID = 'rpt-engine-css';
  /* SYS-002 — SCREEN-ONLY row windowing default. Large detail tables render the first
     `initial` rows + a "show all" control; totals still come from the full model, and
     print/PDF/Excel never window. The threshold is high enough that ordinary
     statements/reports are unaffected. Pass `windowRows: null` to disable (expand). */
  var DEFAULT_WINDOW = { threshold: 300, initial: 200 };

  /* PURE — no DOM. Assembles the on-screen markup + the engine stylesheet. */
  function compose(model, opts) {
    opts = opts || {};
    var RL = (typeof root !== 'undefined' && root.ReportLayout) || null;
    if (!RL) return { error: 'layout_unavailable' };
    var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
    var win = (opts.windowRows !== undefined) ? opts.windowRows : DEFAULT_WINDOW;
    var built = RL.build(model, { lang: lang, windowRows: win, target: 'screen' });
    return { html: built.html, css: built.css };
  }

  /* inject the engine stylesheet once (tokens + components are identical across
     reports, so a single <style> serves every on-screen render). */
  function ensureStyle(css) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById(STYLE_ID);
    if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
    if (el.textContent !== css) el.textContent = css;
  }

  function resolveMount(ctx) {
    var opts = (ctx && ctx.opts) || {};
    if (opts.mount && typeof opts.mount === 'object') return opts.mount;
    if (opts.mountId && typeof document !== 'undefined') return document.getElementById(opts.mountId);
    return null;
  }

  var ScreenRenderer = {
    target: 'screen',
    compose: compose,

    render: function (model, ctx) {
      var opts = (ctx && ctx.opts) || {};
      var c = compose(model, opts);
      if (c.error) return { target: 'screen', status: 'error', reason: c.error, empty: true };
      if (typeof document === 'undefined') {
        /* node: no DOM to mount into — composed cleanly (the html/css is the artifact). */
        return { target: 'screen', status: 'composed', empty: false };
      }
      ensureStyle(c.css);
      var mount = resolveMount(ctx);
      if (!mount) return { target: 'screen', status: 'error', reason: 'mount_missing', empty: true };
      mount.innerHTML = c.html;
      /* SYS-002 — stash the FULL model on the mount so the "show all" control can
         re-render every row without windowing (see expandReport). */
      mount.__rptFullModel = model;
      mount.__rptLang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
      return { target: 'screen', status: 'rendered', empty: false };
    }
  };

  /* SYS-002 — "show all": re-render the stashed full model with windowing OFF.
     Walks up from the clicked button to its mount; safe no-op if not found. */
  function expandReport(btn) {
    if (!btn || typeof document === 'undefined') return;
    var el = btn;
    while (el && !el.__rptFullModel) el = el.parentElement;
    if (!el || !el.__rptFullModel) return;
    var c = compose(el.__rptFullModel, { lang: el.__rptLang, windowRows: null });
    if (c.error) return;
    ensureStyle(c.css);
    el.innerHTML = c.html;   /* __rptFullModel/__rptLang persist on `el` */
  }

  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerRenderer === 'function') {
    root.Report.registerRenderer('screen', ScreenRenderer);
    root.Report.expandReport = expandReport;   /* SYS-002 — used by the "show all" control */
  }
  if (typeof root !== 'undefined') root.ReportScreenRenderer = ScreenRenderer;
  ScreenRenderer.expandReport = expandReport;
  if (typeof module !== 'undefined' && module.exports) module.exports = ScreenRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
