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
   refund() → SB.rpc('refund_receipt_settlement', …)  — the SOLE client caller of
              THE single refund-reversal authority. It reverses exactly the SELECTED
              settlement lines of the refunded receipt (full = all, partial = the
              chosen lines) and NEVER writes paid_amount_ils / member_subscriptions.
              Invoked by BusinessOps.refundReceipt (BO-11) only.

   Reverting PR-4/PR-6/PR-7 = flag stays OFF (default) ⇒ behaviour is today's.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root) return;

  if (typeof root.RECEIPT_ALLOCATION_ENABLED === 'undefined') {
    root.RECEIPT_ALLOCATION_ENABLED = false;   /* DEFAULT OFF */
  }
  var DISABLED = { ok: false, disabled: true, error: 'receipt_settlement_disabled' };
  function enabled() { return root.RECEIPT_ALLOCATION_ENABLED === true; }

  var _editor = null;      /* the mounted SettlementEditor instance (when ON) */
  var _editorOpts = null;  /* the SAME opts object the editor closes over — mutating
                              opts.receiptAmount is picked up live by the editor's
                              render()/getState() (no editor change needed). */

  /* Keep the editor's receiptAmount in sync with the live receipt-amount field.
     Stable module-scope handler ⇒ remove-before-add guarantees exactly ONE
     listener across dialog reopens. The generic SettlementEditor is untouched:
     the DOM/getILS coupling lives only here, in the integration layer. */
  function _syncEditorAmount() {
    if (!_editorOpts) return;
    _editorOpts.receiptAmount = recAmount();
    if (_editor && typeof _editor.refresh === 'function') _editor.refresh();
  }

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

  /* ── F-2 · Food Receipt wiring — the SINGLE allocation authority ────────────
     A member Food Receipt is allocated EXCLUSIVELY by the Production Decision
     Function FoodReceiptDecision.decide() (F-1), which is the exact translation of
     the frozen laboratory (Logic Freeze v2). No allocation is computed here; this
     layer only reads the member position from FIN (read-only) and maps the returned
     decision steps onto the existing settlement payload. Non-food receipts (and
     non-member food cash-donations) never enter this path. */
  var R2 = function (n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; };

  /* First FUTURE ERP subscription year = (last ERP subscription year)+1, floored at
     the ERP boundary. Mirrors lab/engine.cjs FIRST_FUTURE exactly (real data ⇒ 2027). */
  function firstErpFutureYear() {
    var subs = (root.DB && root.DB.subscriptions) || [];
    var floor = Number(root.LOCKED_THROUGH_YEAR);
    var max = isFinite(floor) ? floor : (new Date().getFullYear() - 1);
    subs.forEach(function (s) { var y = Number(s.year); if (isFinite(y) && y > max) max = y; });
    return max + 1;
  }

  /* The member's REAL position for the Decision Function — the SAME two reads the
     laboratory performs (lab/engine.cjs position()): ERP subscription years with a
     positive remaining, and the legacy historical deficit. Read-only; no mutation. */
  function buildDecisionPosition(memberId) {
    var FIN = root.FIN, subYears = [], deficit = 0;
    if (FIN && memberId) {
      try {
        var dl = FIN.memberDelinquency(memberId) || {};
        var by = dl.byYear || {};
        Object.keys(by).forEach(function (y) {
          var rem = R2(by[y].remaining || 0);
          if (rem > 0.005) subYears.push({ year: Number(y), remaining: rem });
        });
        subYears.sort(function (a, b) { return a.year - b.year; });
        var al = FIN.memberAllocation ? FIN.memberAllocation(memberId) : null;
        deficit = R2((al && al.historical ? Number(al.historical.remaining || 0) : 0) || Number(dl.historicalRemaining || 0) || 0);
      } catch (e) { /* read-only; ignore */ }
    }
    return { subYears: subYears, deficit: deficit };
  }

  /* Call the Decision Function and map its steps onto settlement lines. The ONLY
     producer of Food-Receipt allocation lines. Returns {decision, lines} or null if
     the Decision Function is unavailable. `historical` → a deficit line (no year);
     `due`/`future` → a subscription line for that year (future = first future ERP
     year, a plain `due` line the RPC accepts). */
  function foodDecisionLines(memberId, amountILS, deficitAmount) {
    var FD = root.FoodReceiptDecision;
    if (!FD || typeof FD.decide !== 'function') return null;
    var decision = FD.decide(buildDecisionPosition(memberId), amountILS,
      { deficitAmount: Number(deficitAmount) || 0, firstFutureYear: firstErpFutureYear() });
    var lines = decision.steps.map(function (s) {
      return s.kind === 'historical'
        ? { obligation_kind: 'historical', year: null, amount_allocated: s.amount, notes: '' }
        : { obligation_kind: 'due', year: s.year, amount_allocated: s.amount, notes: '' };
    });
    return { decision: decision, lines: lines };
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
    /* Named opts kept by reference so the amount field can stay in sync without any
       editor/computeState change (render/getState read opts.receiptAmount live). */
    var opts = {
      receiptAmount: recAmount(),
      destinations: buildDestinations(memberId),
      lockedThroughYear: root.LOCKED_THROUGH_YEAR
    };
    _editorOpts = opts;
    _editor = root.SettlementEditor.mount(slot, opts);
    /* Sync opts.receiptAmount with the receipt-amount field on every change.
       remove-before-add with the stable _syncEditorAmount reference guarantees
       exactly ONE listener across reopens (no duplicates, no leak); it coexists
       with the field's inline oninput=calcILS (a separate handler). */
    var amtEl = document.getElementById('rec-amount');
    if (amtEl && typeof amtEl.addEventListener === 'function') {
      if (typeof amtEl.removeEventListener === 'function') amtEl.removeEventListener('input', _syncEditorAmount);
      amtEl.addEventListener('input', _syncEditorAmount);
    }
    _syncEditorAmount();   /* reconcile now (covers an amount typed before mount) */
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
    var toast = root.toast || function () {};
    var isMemberFood = ctx.fund === 'food' && ctx.payerType === 'member';
    var pReceipt = {
      fund_type: ctx.fund, receipt_date: ctx.date,
      movement_type: isMemberFood ? 'subscription_payment' : 'food_cash_donation',
      destination_treasury: 'food', payer_type: ctx.payerType,
      member_id: ctx.memberId || null, payer_name: ctx.payerName || '',
      amount: ctx.amount, amount_ils: ctx.amountILS, currency: ctx.currency,
      exchange_rate: ctx.rate, payment_method: ctx.method || 'cash', notes: ctx.notes || ''
    };
    var pLines;
    if (isMemberFood) {
      /* F-2 — Food Receipt (member): the allocation is produced ONLY by the
         Production Decision Function. The manual editor plays no role here. */
      var fd = foodDecisionLines(ctx.memberId, ctx.amountILS, ctx.deficitAmount);
      if (!fd || !fd.decision.balanced) { toast('التسوية غير مكتملة — راجع الأسطر', 'err'); return Promise.resolve({ ok: false, error: 'invalid_settlement' }); }
      pLines = fd.lines;
    } else {
      /* Every other receipt (non-food, and non-member food cash-donation): the
         existing manual settlement path, byte-identical to before F-2. */
      /* Final safety sync: guarantee the editor's amount equals the live field at the
         moment of Save, even if an input event was missed. Same by-reference opts. */
      if (_editor && _editorOpts) _editorOpts.receiptAmount = recAmount();
      var st = _editor ? _editor.getState() : null;
      if (!st || !st.canSave) { toast('التسوية غير مكتملة — راجع الأسطر', 'err'); return Promise.resolve({ ok: false, error: 'invalid_settlement' }); }
      pLines = st.rows.map(function (r) { return { obligation_kind: r.kind, year: r.year, amount_allocated: r.amount, notes: r.notes }; });
    }
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
  /* THE settlement refund-reversal call — SB.rpc ONLY, the single client caller of
     the sole refund-reversal authority. Reverses exactly the selected settlement
     lines of the refunded receipt: lineIds omitted/empty ⇒ full refund (all active
     lines); a list ⇒ partial refund (only those lines). No guessing, no
     redistribution, no reconstruction. */
  function refund(receiptId, lineIds) {
    if (!enabled()) return Promise.resolve(DISABLED);
    if (!receiptId) return Promise.resolve({ ok: false, error: 'no_receipt' });
    if (typeof root.SB === 'undefined' || !root.SB.rpc) return Promise.resolve({ ok: false, error: 'no_sb' });
    var ids = (lineIds && lineIds.length) ? lineIds : null;
    return root.SB.rpc('refund_receipt_settlement', { p_receipt_id: receiptId, p_line_ids: ids })
      .then(function (r) { return r && r.error ? { ok: false, error: r.error.message } : { ok: true, data: r && r.data }; });
  }

  var ReceiptSettlement = {
    version: 7, enabled: enabled,
    buildDestinations: buildDestinations, mountInReceiptForm: mountInReceiptForm,
    buildDecisionPosition: buildDecisionPosition, firstErpFutureYear: firstErpFutureYear,
    foodDecisionLines: foodDecisionLines,
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
