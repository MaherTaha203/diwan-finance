/* ═══════════════════════════════════════════════════════════════════════════
   P-RECEIPT-ALLOCATION · PR-1 — Foundation interfaces (INERT · flag OFF)
   ---------------------------------------------------------------------------
   Prepares the BusinessOps-level interfaces for Explicit Receipt Settlement
   WITHOUT any behavioural change. Everything here is dormant:

     • window.RECEIPT_ALLOCATION_ENABLED  — the feature flag, DEFAULT OFF (false),
       set via the same `typeof … === 'undefined'` idiom as MODEL2/REPORT_ENGINE.
     • window.ReceiptSettlement           — the interface namespace. Its methods
       (post/cancel/refund) are STUBS: when the flag is OFF they return a disabled
       result and perform NO database work; nothing calls them anyway.
     • BusinessOps.postReceiptSettlement / cancelReceiptSettlement /
       refundReceiptSettlement — the same stubs additively attached to the existing
       BusinessOps object (never overwriting an existing method).

   No load-time side effects beyond defining the flag + namespace. No UI wiring,
   no runtime reader, no runtime writer, no SB call. Loaded AFTER operations.js so
   BusinessOps exists for the additive attach.

   Reverting PR-1 = remove the <script> tag + delete this file + migration down.
   Nothing depends on it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root) return;

  /* Feature flag — DEFAULT OFF. When OFF the system behaves exactly as today. */
  if (typeof root.RECEIPT_ALLOCATION_ENABLED === 'undefined') {
    root.RECEIPT_ALLOCATION_ENABLED = false;
  }

  var DISABLED = { ok: false, disabled: true, error: 'receipt_settlement_disabled' };

  function enabled() { return root.RECEIPT_ALLOCATION_ENABLED === true; }

  /* PR-1 stubs — no SB call, no state change, in any flag state. Real posting,
     cancellation, and refund (via the atomic RPC) arrive in later PRs. */
  function post()   { return DISABLED; }
  function cancel() { return DISABLED; }
  function refund() { return DISABLED; }

  var ReceiptSettlement = {
    version: 1,
    enabled: enabled,
    post: post,
    cancel: cancel,
    refund: refund
  };

  root.ReceiptSettlement = ReceiptSettlement;

  /* Additively expose on BusinessOps (never overwrite an existing method). */
  if (root.BusinessOps && typeof root.BusinessOps === 'object') {
    if (!root.BusinessOps.postReceiptSettlement)   root.BusinessOps.postReceiptSettlement   = post;
    if (!root.BusinessOps.cancelReceiptSettlement) root.BusinessOps.cancelReceiptSettlement = cancel;
    if (!root.BusinessOps.refundReceiptSettlement) root.BusinessOps.refundReceiptSettlement = refund;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ReceiptSettlement;
})(typeof window !== 'undefined' ? window : this);
