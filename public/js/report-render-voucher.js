/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R7e — Voucher Renderer (hybrid).
   ---------------------------------------------------------------------------
   Vouchers (receipt · payment · internal transfer) are formal SINGLE-RECORD
   documents — watermark, key/value field grid, big amount box + amount-in-words,
   QR verification token, signature — not tabular reports. Forcing them into the
   frozen ReportModel would risk regressing a QR-verified legal artifact, so this
   renderer is a HYBRID: it gives the unified engine entry point
   `Report.render('RECEIPT_VOUCHER', 'print', { record })` while REUSING the
   certified voucher builders (buildRecVoucher / buildPayVoucher /
   buildTransferVoucher) verbatim and delivering through the same PRINT-001
   `openPrintWin` primitive (QR + token intact). Output is byte-identical to the
   legacy voucher print; the engine only adds a unified filename + one entry point.

   Registered via Report.registerVoucherRenderer (NOT a tabular target renderer).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* flag default — OFF. Owner flips it to route vouchers through the engine. */
  if (typeof root.REPORT_ENGINE_VOUCHERS === 'undefined') root.REPORT_ENGINE_VOUCHERS = false;

  /* per-voucher builder + the exact CSS its legacy print call used (parity). */
  function build(reportId, record) {
    if (reportId === 'RECEIPT_VOUCHER' && typeof root.buildRecVoucher === 'function') return { html: root.buildRecVoucher(record), css: '' };
    if (reportId === 'PAYMENT_VOUCHER' && typeof root.buildPayVoucher === 'function') return { html: root.buildPayVoucher(record), css: '' };
    if (reportId === 'TRANSFER_VOUCHER' && typeof root.buildTransferVoucher === 'function') return { html: root.buildTransferVoucher(record), css: '@page{size:A4;margin:14mm}body{font-family:var(--fa);direction:rtl;background:#fff}' };
    return { error: 'voucher_builder_unavailable' };
  }

  /* unified filename: <REPORT_ID>-<no?>-<YYYY-MM-DD> (same scheme as the reports). */
  function filenameFor(reportId, record) {
    var parts = [reportId];
    record = record || {};
    if (record.no != null) parts.push(String(record.no));
    var d = record.receipt_date || record.payment_date || record.transfer_date || null;
    var dt = d ? new Date(d) : new Date();
    if (!isNaN(dt)) parts.push(dt.toISOString().slice(0, 10));
    return parts.join('-').replace(/[^A-Za-z0-9_\-]+/g, '_');
  }

  var VoucherRenderer = {
    /* PURE-ish: composes the voucher HTML/CSS (reuses the certified builders). */
    compose: function (reportId, record) {
      var b = build(reportId, record);
      if (b.error) return b;
      return { html: b.html, css: b.css, filename: filenameFor(reportId, record), orientation: 'portrait' };
    },

    render: function (reportId, target, opts) {
      opts = opts || {};
      var record = opts.record;
      if (!record) return { target: target, status: 'error', reason: 'record_missing', empty: true };
      var c = this.compose(reportId, record);
      if (c.error) return { target: target, status: 'error', reason: c.error, empty: true };
      var delivered = false;
      if (typeof root !== 'undefined' && typeof root.openPrintWin === 'function') {
        try { root.openPrintWin(c.css, c.html, c.filename); delivered = true; } catch (e) { delivered = false; }
      }
      return { target: target, status: delivered ? 'delivered' : 'composed', empty: false, filename: c.filename, orientation: c.orientation };
    }
  };

  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerVoucherRenderer === 'function') {
    root.Report.registerVoucherRenderer(VoucherRenderer);
  }
  if (typeof root !== 'undefined') root.ReportVoucherRenderer = VoucherRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = VoucherRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
