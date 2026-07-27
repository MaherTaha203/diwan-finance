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

  /* PURE — no DOM. Assembles the on-screen markup + the engine stylesheet. */
  function compose(model, opts) {
    opts = opts || {};
    var RL = (typeof root !== 'undefined' && root.ReportLayout) || null;
    if (!RL) return { error: 'layout_unavailable' };
    var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
    var built = RL.build(model, { lang: lang });
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
      return { target: 'screen', status: 'rendered', empty: false };
    }
  };

  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerRenderer === 'function') {
    root.Report.registerRenderer('screen', ScreenRenderer);
  }
  if (typeof root !== 'undefined') root.ReportScreenRenderer = ScreenRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = ScreenRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
