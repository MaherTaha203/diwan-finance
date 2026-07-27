/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R4 — PDF Renderer.
   ---------------------------------------------------------------------------
   Swaps the engine's empty `pdf` skeleton for the real one. Per the certified
   PRINT-001 decision (native Save-as-PDF, no html2canvas/jsPDF), a "PDF" is a
   print to the browser's own PDF backend: it reuses the SAME shared layout (R2)
   and the SAME iframe primitive `openPrintWin(css, html, title)` as the print
   renderer — the only difference is intent (the user saves rather than prints)
   and the document title we seed for the Save-as-PDF filename.

   The running header/footer (brand every page) + native "Page X of Y" from the
   browser print chrome — the deferred PRINT-001 ROOT-7 — are delivered centrally
   by the shared layout (R4 running bands) and the reserved `@page` margins, so
   both `print` and `pdf` inherit them for free.

   Split for testability (mirrors the print renderer):
     PdfRenderer.compose(model, opts) -> { html, css, filename, orientation }  (PURE)
     PdfRenderer.render(model, ctx)   -> composes, then delivers via openPrintWin
                                         if present; returns a status descriptor.

   It is STILL behind the engine — no live page is cut over to it (that is R6+).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* resolve the print renderer at call time (so a missing/failed print module
     degrades gracefully rather than throwing at load). */
  function printRenderer() {
    return (typeof root !== 'undefined' && root.ReportPrintRenderer) ||
      (typeof require === 'function' ? (function () { try { return require('./report-render-print.js'); } catch (e) { return null; } })() : null);
  }

  var PdfRenderer = {
    target: 'pdf',

    /* PURE — identical composition to print (same layout, same @page + running
       bands). Kept as its own method so the pdf target is self-describing and
       can diverge later (e.g. embedded metadata) without touching print. */
    compose: function (model, opts) {
      var Print = printRenderer();
      if (!Print || typeof Print.compose !== 'function') return { error: 'print_renderer_unavailable' };
      return Print.compose(model, opts);
    },

    /* Composes, then delivers via the PRINT-001 iframe when available. */
    render: function (model, ctx) {
      var opts = (ctx && ctx.opts) || {};
      var c = this.compose(model, opts);
      if (c.error) return { target: 'pdf', status: 'error', reason: c.error, empty: true };
      var delivered = false;
      if (typeof root !== 'undefined' && typeof root.openPrintWin === 'function') {
        try { root.openPrintWin(c.css, c.html, c.filename); delivered = true; } catch (e) { delivered = false; }
      }
      return { target: 'pdf', status: delivered ? 'delivered' : 'composed', empty: false,
               filename: c.filename, orientation: c.orientation };
    }
  };

  /* Register with the engine (swap the empty pdf skeleton). */
  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerRenderer === 'function') {
    root.Report.registerRenderer('pdf', PdfRenderer);
  }
  if (typeof root !== 'undefined') root.ReportPdfRenderer = PdfRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = PdfRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
