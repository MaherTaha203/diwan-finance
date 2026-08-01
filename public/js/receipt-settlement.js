/* ═══════════════════════════════════════════════════════════════════════════
   P-RECEIPT-ALLOCATION · Receipt Settlement wiring
   PR-1 (foundation) + PR-4 (wire → Atomic Posting RPC) + PR-6 (cancellation).
   ---------------------------------------------------------------------------
   ONE posting path AND one void path for explicit settlement, gated by the flag:

     window.RECEIPT_ALLOCATION_ENABLED  — DEFAULT OFF. OFF ⇒ this module is inert
       and the legacy receipt flow (saveRec → BusinessOps.createVoucher) runs
       exactly as today. ON ⇒ the Settlement Editor's Save posts through the
       atomic RPC ONLY; the legacy path never executes (saveRec early-returns).

   post()   → SB.rpc('create_receipt_with_settlement', …)  — the SOLE settlement
              writer. It NEVER calls BusinessOps.createVoucher (no dual write),
              NEVER writes allocation_records from the client (RLS forbids it),
              NEVER writes paid_amount_ils. The RPC commits everything or nothing.
   cancel() → SB.rpc('void_receipt_settlement', …)  — the SOLE client caller of
              THE single void authority. It voids exactly the recorded lines of a
              cancelled receipt (no guessing, no redistribution, no recalculation)
              and NEVER writes paid_amount_ils / member_subscriptions. Invoked by
              BusinessOps.cancelVoucher (BO-03) only, after the receipt is soft-
              deleted, and only for a receipt that carries explicit settlement.
   refund() remains a disabled stub (later PR).

   Reverting PR-4/PR-6 = flag stays OFF (already default) ⇒ behaviour is today's.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root) return;

  if (typeof root.RECEIPT_ALLOCATION_ENABLED === 'undefined') {
    root.RECEIPT_ALLOCATION_ENABLED = false;   /* DEFAULT OFF */
  }
  var DISABLED = { ok: false, disabled: true, error: 'receipt_settlement_disabled' };
  function enabled() { return root.RECEIPT_ALLOCATION_ENABLED === true; }

  var _editor = null;   /* the mounted SettlementEditor instance (when ON) */

  /* Build the member's settlement destinations from FIN (read-only): each open
     subscription year (outstanding = remaining), the historical deficit, plus
     Donation and Future-Credit. Reads FIN; never mutates it. */
  function buildDestinations(memberId) {
    var out = [];
    var FIN = root.FIN;
    if (!FIN || !memberId) { out.push({ kind: 'donation', outstanding: null, label: 'تبرع' }); out.push({ kind: 'credit', outstanding: null, label: 'رصيد مستقبلي' }); return out; }
    try {
      var by = (FIN.memberDelinquency(memberId) || {}).byYear || {};
      Object.keys(by).forEach(function (y) {
        var rem = Number(by[y].remaining || 0);
        if (rem > 0.005) out.push({ kind: 'due', year: Number(y), outstanding: rem, label: 'اشتراك ' + y });
      });
      var al = FIN.memberAllocation ? FIN.memberAllocation(memberId) : null;
      var hist = al && al.historical ? Number(al.historical.remaining || 0) : 0;
      if (hist > 0.005) out.push({ kind: 'historical', outstanding: hist, label: 'العجز التاريخي' });
    } catch (e) { /* read-only; ignore */ }
    out.push({ kind: 'donation', outstanding: null, label: 'تبرع' });
    out.push({ kind: 'credit', outstanding: null, label: 'رصيد مستقبلي' });
    return out;
  }

  function recAmount() {
    if (typeof document === 'undefined') return 0;
    if (typeof root.getILS === 'function') { try { return Number(root.getILS('rec')) || 0; } catch (e) {} }
    var el = document.getElementById('rec-amount');
    return el ? Number(el.value) || 0 : 0;
  }

  /* Mount the editor into the receipt modal. Called by openRec ONLY when ON. */
  function mountInReceiptForm() {
    if (!enabled() || typeof document === 'undefined' || !root.SettlementEditor) return null;
    var slot = document.getElementById('rec-settlement');
    if (!slot) return null;
    var memberId = (document.getElementById('rec-member') || {}).value || null;
    slot.style.display = '';
    _editor = root.SettlementEditor.mount(slot, {
      receiptAmount: recAmount(),
      destinations: buildDestinations(memberId),
      lockedThroughYear: root.LOCKED_THROUGH_YEAR
    });
    return _editor;
  }

  /* THE settlement posting call — SB.rpc ONLY. Never touches BusinessOps. */
  function post(pReceipt, pLines) {
    if (!enabled()) return Promise.resolve(DISABLED);
    if (typeof root.SB === 'undefined' || !root.SB.rpc) return Promise.resolve({ ok: false, error: 'no_sb' });
    return root.SB.rpc('create_receipt_with_settlement', { p_receipt: pReceipt, p_lines: pLines })
      .then(function (r) { return r && r.error ? { ok: false, error: r.error.message } : { ok: true, data: r && r.data }; });
  }

  /* Assemble payload from the receipt form + the editor state, then post().
     Invoked by saveRec's early-return gate when the flag is ON. */
  function postFromForm(ctx) {
    ctx = ctx || {};
    if (!enabled()) return Promise.resolve(DISABLED);
    var st = _editor ? _editor.getState() : null;
    var toast = root.toast || function () {};
    if (!st || !st.canSave) { toast('التسوية غير مكتملة — راجع الأسطر', 'err'); return Promise.resolve({ ok: false, error: 'invalid_settlement' }); }
    var isMemberFood = ctx.fund === 'food' && ctx.payerType === 'member';
    var pReceipt = {
      fund_type: ctx.fund, receipt_date: ctx.date,
      movement_type: isMemberFood ? 'subscription_payment' : 'food_cash_donation',
      destination_treasury: 'food', payer_type: ctx.payerType,
      member_id: ctx.memberId || null, payer_name: ctx.payerName || '',
      amount: ctx.amount, amount_ils: ctx.amountILS, currency: ctx.currency,
      exchange_rate: ctx.rate, payment_method: ctx.method || 'cash', notes: ctx.notes || ''
    };
    var pLines = st.rows.map(function (r) { return { obligation_kind: r.kind, year: r.year, amount_allocated: r.amount, notes: r.notes }; });
    return post(pReceipt, pLines).then(function (res) {
      if (res && res.ok) { toast('تم حفظ التسوية', 'ok'); if (root.closeM) root.closeM(); if (typeof root.loadAll === 'function') root.loadAll(); }
      else if (res && !res.disabled) { toast('فشل الحفظ: ' + (res.error || ''), 'err'); }
      return res;
    });
  }

  /* THE settlement void call — SB.rpc ONLY, the single client caller of the sole
     void authority. Voids exactly the recorded lines of the cancelled receipt. */
  function cancel(receiptId) {
    if (!enabled()) return Promise.resolve(DISABLED);
    if (!receiptId) return Promise.resolve({ ok: false, error: 'no_receipt' });
    if (typeof root.SB === 'undefined' || !root.SB.rpc) return Promise.resolve({ ok: false, error: 'no_sb' });
    return root.SB.rpc('void_receipt_settlement', { p_receipt_id: receiptId })
      .then(function (r) { return r && r.error ? { ok: false, error: r.error.message } : { ok: true, data: r && r.data }; });
  }
  function refund() { return Promise.resolve(DISABLED); }  /* later PR */

  var ReceiptSettlement = {
    version: 6, enabled: enabled,
    buildDestinations: buildDestinations, mountInReceiptForm: mountInReceiptForm,
    post: post, postFromForm: postFromForm, cancel: cancel, refund: refund
  };
  root.ReceiptSettlement = ReceiptSettlement;

  if (root.BusinessOps && typeof root.BusinessOps === 'object') {
    if (!root.BusinessOps.postReceiptSettlement)   root.BusinessOps.postReceiptSettlement   = post;
    if (!root.BusinessOps.cancelReceiptSettlement) root.BusinessOps.cancelReceiptSettlement = cancel;
    if (!root.BusinessOps.refundReceiptSettlement) root.BusinessOps.refundReceiptSettlement = refund;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = ReceiptSettlement;
})(typeof window !== 'undefined' ? window : this);
