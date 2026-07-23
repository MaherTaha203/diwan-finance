/* ═══════════════════════════════════════════════════════════════════════════
   MODEL2 V2.0 · SLICE 4 — Refund Engine  (PURE · UN-WIRED)
   Implements the frozen CA-005 / ADR-005 / OD-05 refund policy as a pure function:
     · Refund is a FIRST-CLASS movement recorded as a NEW voucher — NOT a cancellation.
     · Eligibility: origin still reversible, no irreversible consequences, not locked.
     · Amount: FULL or PARTIAL, currency-preserving (Law 10), capped at the remaining
       refundable (origin.amount_ils − already-refunded).
     · Funding: ALWAYS the Origin Treasury (FROM_LINKED_ORIGIN resolved to the origin's
       destination_treasury) — Law 8 (Custody).
     · Closed period: a refund whose origin lies in a locked year is PROHIBITED (Law 11);
       corrections go forward as a new transaction (handled by the caller, not here).
   PURE: it never reads globals, never touches the DB, and never mutates the origin
   (Law 5). It returns a frozen proposed refund row; the certified write + audit live in
   the BO layer (operations.js · BO-11), which additionally self-guards on the MODEL2 V2.0
   activation flag so nothing is created until Slice 7.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;       /* Node/tests */
  if (typeof window !== 'undefined') window.RefundEngine = api;                      /* browser */
})(this, function () {
  'use strict';
  var R2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  var EPS = 0.005;

  /* Sum of live refunds already linked to an origin receipt (by id). Pure over the
     given payment rows; the caller passes its live payments list. */
  function refundedTotal(originId, payments) {
    return R2((payments || []).reduce(function (s, p) {
      return s + ((p && !p.is_deleted && p.movement_type === 'refund' &&
        (p.origin_receipt_id === originId)) ? (Number(p.amount_ils) || 0) : 0);
    }, 0));
  }

  /* Compute a proposed refund. Inputs:
       origin           — the origin receipt row (unchanged; Law 5)
       amountILS        — requested refund amount in ILS (full or partial)
       priorRefundedILS — already-refunded ILS against this origin (default 0)
       locked           — true if the origin's period is closed (Law 11)
     Returns {ok:false, code, error} on rejection, or {ok:true, row, remainingAfter, isFull}
     where `row` is a FROZEN proposed refund voucher (movement_type 'refund'). */
  function computeRefund(opts) {
    opts = opts || {};
    var origin = opts.origin;
    var amountILS = Number(opts.amountILS);
    var prior = R2(opts.priorRefundedILS);

    if (!origin || origin.is_deleted) return { ok: false, code: 'E_INELIGIBLE', error: 'السند الأصلي غير موجود أو غير قابل للاسترداد' };
    if (opts.locked === true) return { ok: false, code: 'E_LOCKED', error: '🔒 السنة المالية مقفلة — لا يجوز الاسترداد بعد الإقفال؛ التصحيح يكون بحركة جديدة في فترة مفتوحة' };
    if (!(amountILS > 0)) return { ok: false, code: 'E_AMOUNT', error: 'مبلغ الاسترداد يجب أن يكون أكبر من صفر' };

    var originILS = R2(origin.amount_ils != null ? origin.amount_ils : origin.amount);
    var remaining = R2(originILS - prior);
    if (remaining <= EPS) return { ok: false, code: 'E_INELIGIBLE', error: 'السند مُسترَدٌّ بالكامل — لا يوجد مبلغٌ قابلٌ للاسترداد' };
    if (amountILS > remaining + EPS) return { ok: false, code: 'E_EXCEEDS', error: 'مبلغ الاسترداد يتجاوز المتبقّي القابل للاسترداد (' + remaining + ')' };

    /* currency-preserving (Law 10): native amount refunded in the SAME proportion */
    var proportion = originILS > 0 ? (amountILS / originILS) : 1;
    var originNative = Number(origin.amount != null ? origin.amount : origin.amount_ils) || 0;
    var nativeRefund = R2(originNative * proportion);

    var row = Object.freeze({
      movement_type: 'refund',
      amount: nativeRefund,
      amount_ils: R2(amountILS),
      currency: origin.currency || 'ILS',
      exchange_rate: origin.exchange_rate != null ? origin.exchange_rate : 1,
      destination_treasury: origin.destination_treasury || null,   /* FROM_LINKED_ORIGIN resolved (Law 8) */
      origin_receipt_id: origin.id != null ? origin.id : null,
      origin_receipt_no: origin.no || null,
      linked_receipt: origin.no || null,
      payer_name: origin.payer_name || null,
      member_id: origin.member_id != null ? origin.member_id : null,
      is_refund: true
    });

    return {
      ok: true,
      row: row,
      remainingAfter: R2(remaining - amountILS),
      isFull: Math.abs(amountILS - remaining) <= EPS
    };
  }

  function isRefund(mt) { return mt === 'refund'; }

  return { version: 'v2.0-slice4', computeRefund: computeRefund, refundedTotal: refundedTotal, isRefund: isRefund, R2: R2 };
});
