/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R3 — Print Renderer.
   ---------------------------------------------------------------------------
   Swaps the engine's empty `print` skeleton for the real one: it builds the
   shared layout (R2 ReportLayout.build) and delivers it through the PRINT-001
   iframe primitive `openPrintWin(css, html, title)` — reusing that proven,
   resilient path (off-screen iframe, fonts.ready-gated print, no popup, QR).

   `Report.render(model, 'print')` now produces a real printout for any report
   whose model exists (the pilot: MEMBER_STATEMENT). It is STILL behind the
   engine — the live member-statement page is NOT cut over to it until R6.

   Split for testability:
     PrintRenderer.compose(model, opts) -> { html, css, filename, orientation }  (PURE)
     PrintRenderer.render(model, ctx)   -> composes, then delivers via openPrintWin
                                           if present; returns a status descriptor.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function pick(v, lang) { return (v && typeof v === 'object' && ('ar' in v || 'en' in v)) ? (lang === 'en' ? (v.en != null ? v.en : v.ar) : (v.ar != null ? v.ar : v.en)) : v; }

  /* deterministic, unified filename: <REPORT_ID>-<party?>-<YYYY-MM-DD> */
  function filenameFor(model) {
    var m = model.meta || {};
    var parts = [m.reportId || 'REPORT'];
    if (m.party && m.party.code) parts.push(String(m.party.code));
    var d = m.printDate ? new Date(m.printDate) : new Date();
    if (!isNaN(d)) parts.push(d.toISOString().slice(0, 10));
    return parts.join('-').replace(/[^A-Za-z0-9_\-]+/g, '_');
  }

  /* @page margins reserve room for the fixed running header (top) and footer
     (bottom) that the layout repeats on every printed page (R4): band heights
     are 9mm/7mm — the margins add a gap so body content never overlaps them. */
  function pageCss(orientation) {
    var o = orientation === 'landscape' ? 'landscape' : 'portrait';
    var side = o === 'landscape' ? '10mm' : '9mm';
    return '@page{size:A4 ' + o + ';margin:14mm ' + side + ' 12mm}body{margin:0;background:#fff}';
  }

  var PrintRenderer = {
    target: 'print',

    /* PURE — no DOM, no openPrintWin. Assembles the deliverable. */
    compose: function (model, opts) {
      opts = opts || {};
      var RL = (typeof root !== 'undefined' && root.ReportLayout) || null;
      if (!RL) return { error: 'layout_unavailable' };
      var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
      var built = RL.build(model, { lang: lang });
      var orientation = (model.meta && model.meta.orientation) || 'portrait';
      return {
        html: built.html,
        css: built.css + pageCss(orientation),
        filename: filenameFor(model),
        orientation: orientation
      };
    },

    /* Composes, then delivers via the PRINT-001 iframe when available. */
    render: function (model, ctx) {
      var opts = (ctx && ctx.opts) || {};
      var c = this.compose(model, opts);
      if (c.error) return { target: 'print', status: 'error', reason: c.error, empty: true };
      var delivered = false;
      if (typeof root !== 'undefined' && typeof root.openPrintWin === 'function') {
        try { root.openPrintWin(c.css, c.html, c.filename); delivered = true; } catch (e) { delivered = false; }
      }
      return { target: 'print', status: delivered ? 'delivered' : 'composed', empty: false,
               filename: c.filename, orientation: c.orientation };
    }
  };

  /* Register with the engine (swap the empty print skeleton). */
  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerRenderer === 'function') {
    root.Report.registerRenderer('print', PrintRenderer);
  }
  if (typeof root !== 'undefined') root.ReportPrintRenderer = PrintRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = PrintRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
