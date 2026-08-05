/* ═══════════════════════════════════════════════════════════════════════════
   P-RECEIPT-ALLOCATION · PR-7A — Refund User Interface (UI ONLY)
   ---------------------------------------------------------------------------
   Exposes the ALREADY-EXISTING refund capability to accountants. This module is
   PRESENTATION ONLY:
     · It performs NO refund logic, NO allocation math, NO DB writes.
     · The ONLY execution path is BusinessOps.refundReceipt({ originId, amountILS,
       reason, settlementLineIds }). Nothing else.
     · Money refunded = the SUM of the settlement lines the accountant selects
       (full = every active line; partial = the chosen ones). The engine
       (RefundEngine/BO-11) validates, caps, and writes — this file never does.

   Gated by window.RECEIPT_ALLOCATION_ENABLED (DEFAULT OFF). OFF ⇒ the Refund
   button never shows and this module is inert ⇒ Golden Reference byte-identical.
   Admin-only (mirrors BO-11's own authority). Reverting = delete this file, its
   <script> include, the #m-refund shell, and the edit-rec button toggle.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root) return;
  var doc = (typeof document !== 'undefined') ? document : null;

  /* Refund is OUTSIDE the Receipt-Allocation production activation scope. The refund
     UI appears ONLY when refund EXECUTION is enabled (MODEL2_ALLOCATION_ENABLED),
     which is independent of the allocation activation flag. So activating Receipt
     Allocation (RECEIPT_ALLOCATION_ENABLED) does NOT surface any refund entry point;
     cancellation remains the only operational reversal path. Both flags default OFF. */
  function enabled() {
    return !!(root.ReceiptSettlement && root.ReceiptSettlement.enabled && root.ReceiptSettlement.enabled())
      && root.MODEL2_ALLOCATION_ENABLED === true;
  }
  function isAdmin() { return !!(root.can && typeof root.can.admin === 'function' && root.can.admin()); }
  function LANG() { return root.LANG === 'en' ? 'en' : 'ar'; }
  function L(ar, en) { return LANG() === 'en' ? en : ar; }
  function money(n) { try { return (typeof root.fmt === 'function') ? root.fmt(n) : (Math.round((Number(n) || 0) * 100) / 100).toString(); } catch (e) { return String(n); } }
  function toast(m, t) { if (typeof root.toast === 'function') root.toast(m, t || 'ok'); }
  var R2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  var EPS = 0.005;

  /* ---- read-only helpers over the loaded state (never mutate) ---- */
  function receiptById(id) { return ((root.DB && root.DB.receipts) || []).find(function (r) { return r.id === id; }) || null; }
  function linesFor(id) {
    return ((root.DB && root.DB.allocation_records) || []).filter(function (a) {
      return a && a.source_kind === 'receipt_settlement' && a.source_ref === id;
    });
  }
  function activeLines(id) { return linesFor(id).filter(function (a) { return !a.voided_at && !a.refunded_at; }); }
  function priorRefunded(id) {
    var RE = root.RefundEngine;
    if (RE && typeof RE.refundedTotal === 'function') return RE.refundedTotal(id, (root.DB && root.DB.refunds) || []);
    return R2(((root.DB && root.DB.refunds) || []).reduce(function (s, r) {
      return s + ((r && !r.is_deleted && r.origin_receipt_id === id) ? (Number(r.amount_ils) || 0) : 0);
    }, 0));
  }
  function memberName(mid) { try { return (typeof root.gmn === 'function' && root.gmn(mid)) || mid || ''; } catch (e) { return mid || ''; } }
  function kindLabel(a) {
    switch (a.obligation_kind) {
      case 'due': return L('اشتراك', 'Subscription') + (a.year != null ? ' ' + a.year : '');
      case 'historical': return L('العجز التاريخي', 'Historical Deficit');
      case 'donation': return L('تبرّع', 'Donation');
      case 'credit': return L('رصيد مستقبلي', 'Future Credit');
      default: return a.obligation_kind || '—';
    }
  }
  function lineStatus(a) {
    if (a.voided_at) return { key: 'voided', label: L('مُلغى', 'Voided') };
    if (a.refunded_at) return { key: 'refunded', label: L('مُسترَد', 'Refunded') };
    return { key: 'active', label: L('نشط', 'Active') };
  }

  /* Eligibility — mirrors requirement 2 (no draft, no cancelled, no fully-refunded,
     admin only). Draft/legacy receipts carry no settlement lines ⇒ excluded. */
  function eligible(r) {
    if (!enabled() || !isAdmin() || !r || r.is_deleted) return false;
    if (typeof root.voucherLocked === 'function' && root.voucherLocked(r.receipt_date)) return false;
    return activeLines(r.id).length > 0;
  }

  /* ---- dialog state ---- */
  var state = null;   /* { id, receipt, lines:[{a, refundable, checked}], mode, reason, step } */

  function shell() { return doc && doc.getElementById('m-refund'); }
  function body() { return doc && doc.getElementById('refund-body'); }

  function open(id) {
    if (!doc) return;
    var r = receiptById(id);
    if (!eligible(r)) { toast(L('هذا السند غير مؤهّل للاسترداد', 'This receipt is not eligible for a refund'), 'err'); return; }
    var lines = linesFor(id).map(function (a) {
      var active = !a.voided_at && !a.refunded_at;
      return { a: a, refundable: active ? R2(Number(a.amount_allocated) || 0) : 0, alreadyRefunded: (a.refunded_at ? R2(Number(a.amount_allocated) || 0) : 0), checked: active };
    });
    state = { id: id, receipt: r, lines: lines, mode: 'full', reason: '', step: 'select' };
    if (typeof root.openM === 'function') root.openM('refund'); else { var sh = shell(); if (sh) sh.style.display = 'block'; }
    render();
    focusFirst();
  }

  function totals() {
    var receiptTotal = R2(Number(state.receipt.amount_ils) || 0);
    var remainingRefundable = R2(receiptTotal - priorRefunded(state.id));
    var selected = R2(state.lines.reduce(function (s, l) { return s + ((l.checked && l.refundable > 0) ? l.refundable : 0); }, 0));
    return { receiptTotal: receiptTotal, remainingRefundable: remainingRefundable, selected: selected };
  }
  function selectedIds() { return state.lines.filter(function (l) { return l.checked && l.refundable > 0; }).map(function (l) { return l.a.id; }); }
  function validity() {
    var t = totals(), ids = selectedIds();
    if (ids.length === 0) return { ok: false, msg: L('اختر سطر تسوية واحدًا على الأقل', 'Select at least one settlement line') };
    if (t.selected <= EPS) return { ok: false, msg: L('المبلغ المحدد صفر', 'Selected amount is zero') };
    if (t.selected > t.remainingRefundable + EPS) return { ok: false, msg: L('المبلغ يتجاوز المتبقّي القابل للاسترداد', 'Amount exceeds remaining refundable') };
    if (!state.reason || !String(state.reason).trim()) return { ok: false, msg: L('سبب الاسترداد إلزامي', 'Refund reason is required') };
    return { ok: true, msg: L('جاهز للاسترداد', 'Ready to refund') };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function render() {
    var b = body(); if (!b) return;
    if (state.step === 'confirm') { renderConfirm(b); return; }
    var r = state.receipt, t = totals(), v = validity();
    var rows = state.lines.map(function (l, i) {
      var st = lineStatus(l.a), active = st.key === 'active';
      return '' +
        '<tr class="rfd-row ' + (active ? '' : 'rfd-disabled') + '">' +
          '<td class="rfd-c">' + (active
            ? '<input type="checkbox" class="rfd-chk" data-i="' + i + '" ' + (l.checked ? 'checked' : '') + ' aria-label="' + esc(kindLabel(l.a)) + '">'
            : '<span class="rfd-lock" title="' + esc(st.label) + '"><i class="ti ti-lock"></i></span>') + '</td>' +
          '<td>' + esc(kindLabel(l.a)) + '</td>' +
          '<td class="rfd-num">' + (l.a.year != null ? esc(l.a.year) : '—') + '</td>' +
          '<td class="rfd-num">' + money(l.a.amount_allocated) + '</td>' +
          '<td class="rfd-num">' + money(l.alreadyRefunded) + '</td>' +
          '<td class="rfd-num">' + money(l.refundable) + '</td>' +
          '<td><span class="rfd-badge rfd-' + st.key + '">' + esc(st.label) + '</span></td>' +
          '<td class="rfd-notes">' + esc(l.a.notes || '') + '</td>' +
        '</tr>';
    }).join('');

    b.innerHTML = '' +
      '<div class="rfd-meta">' +
        '<div><span class="rfd-k">' + L('رقم السند', 'Receipt') + '</span><span class="rfd-v">' + esc(r.no || r.id) + '</span></div>' +
        '<div><span class="rfd-k">' + L('العضو', 'Member') + '</span><span class="rfd-v">' + esc(r.member_id ? memberName(r.member_id) : (r.payer_name || '—')) + '</span></div>' +
        '<div><span class="rfd-k">' + L('التاريخ', 'Date') + '</span><span class="rfd-v">' + esc(r.receipt_date || '—') + '</span></div>' +
        '<div><span class="rfd-k">' + L('قيمة السند', 'Receipt Amount') + '</span><span class="rfd-v">₪' + money(r.amount_ils) + '</span></div>' +
      '</div>' +
      '<div class="rfd-modes" role="radiogroup" aria-label="' + L('نوع الاسترداد', 'Refund mode') + '">' +
        '<button type="button" class="btn sm ' + (state.mode === 'full' ? 'primary' : 'ghost') + '" id="rfd-mode-full" role="radio" aria-checked="' + (state.mode === 'full') + '">' + L('استرداد كامل', 'Full Refund') + '</button>' +
        '<button type="button" class="btn sm ' + (state.mode === 'partial' ? 'primary' : 'ghost') + '" id="rfd-mode-partial" role="radio" aria-checked="' + (state.mode === 'partial') + '">' + L('استرداد جزئي', 'Partial Refund') + '</button>' +
      '</div>' +
      '<div class="rfd-tablewrap"><table class="rfd-table"><thead><tr>' +
        '<th></th><th>' + L('الوجهة', 'Destination') + '</th><th>' + L('السنة', 'Year') + '</th><th>' + L('المبلغ', 'Amount') + '</th>' +
        '<th>' + L('مُسترَد سابقًا', 'Already Refunded') + '</th><th>' + L('المتبقّي', 'Remaining') + '</th><th>' + L('الحالة', 'Status') + '</th><th>' + L('ملاحظات', 'Notes') + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="rfd-reason"><label for="rfd-reason-input">' + L('سبب الاسترداد', 'Refund reason') + ' <span class="req">*</span></label>' +
        '<textarea id="rfd-reason-input" rows="2" placeholder="' + L('إلزامي — يُحفظ في السجل', 'Required — recorded in the audit log') + '">' + esc(state.reason) + '</textarea></div>' +
      '<div class="rfd-summary" aria-live="polite">' +
        '<div><span>' + L('إجمالي السند', 'Receipt Total') + '</span><b>₪' + money(t.receiptTotal) + '</b></div>' +
        '<div><span>' + L('إجمالي الاسترداد المحدد', 'Selected Refund Total') + '</span><b id="rfd-selected">₪' + money(t.selected) + '</b></div>' +
        '<div><span>' + L('المتبقّي القابل للاسترداد', 'Remaining Refundable') + '</span><b>₪' + money(t.remainingRefundable) + '</b></div>' +
        '<div class="rfd-state ' + (v.ok ? 'ok' : 'bad') + '"><span>' + L('الحالة', 'Validation') + '</span><b>' + esc(v.msg) + '</b></div>' +
      '</div>' +
      '<div class="mft rfd-actions">' +
        '<button type="button" class="btn primary" id="rfd-next" ' + (v.ok ? '' : 'disabled') + '><i class="ti ti-arrow-left"></i>' + L('متابعة', 'Continue') + '</button>' +
        '<button type="button" class="btn" id="rfd-cancel">' + L('إلغاء', 'Cancel') + '</button>' +
      '</div>';
    wireSelect();
  }

  function renderConfirm(b) {
    var t = totals(), r = state.receipt;
    var chosen = state.lines.filter(function (l) { return l.checked && l.refundable > 0; });
    var years = chosen.map(function (l) { return kindLabel(l.a); });
    b.innerHTML = '' +
      '<div class="rfd-confirm">' +
        '<div class="ibox warn"><i class="ti ti-alert-triangle"></i>' + L('سيتم عكس أسطر التسوية التالية وإرجاع المبلغ. لا يمكن التراجع إلا باسترداد/إجراء جديد.', 'The following settlement lines will be reversed and the money returned. This can only be undone by a new action.') + '</div>' +
        '<div class="rfd-meta">' +
          '<div><span class="rfd-k">' + L('رقم السند', 'Receipt') + '</span><span class="rfd-v">' + esc(r.no || r.id) + '</span></div>' +
          '<div><span class="rfd-k">' + L('العضو', 'Member') + '</span><span class="rfd-v">' + esc(r.member_id ? memberName(r.member_id) : (r.payer_name || '—')) + '</span></div>' +
        '</div>' +
        '<div class="rfd-confirm-lines"><div class="rfd-k">' + L('السطور التي ستُعكَس', 'Lines to be reversed') + '</div><ul>' +
          chosen.map(function (l) { return '<li>' + esc(kindLabel(l.a)) + ' — ₪' + money(l.refundable) + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="rfd-confirm-total">' + L('إجمالي المبلغ المسترد', 'Total refunded') + ': <b>₪' + money(t.selected) + '</b></div>' +
        '<div class="rfd-confirm-reason"><span class="rfd-k">' + L('السبب', 'Reason') + '</span> ' + esc(state.reason) + '</div>' +
      '</div>' +
      '<div class="mft rfd-actions">' +
        '<button type="button" class="btn danger" id="rfd-execute"><i class="ti ti-arrow-back-up"></i>' + L('تأكيد الاسترداد', 'Confirm Refund') + '</button>' +
        '<button type="button" class="btn" id="rfd-back">' + L('رجوع', 'Back') + '</button>' +
      '</div>';
    var ex = doc.getElementById('rfd-execute'); if (ex) { ex.onclick = execute; ex.focus(); }
    var bk = doc.getElementById('rfd-back'); if (bk) bk.onclick = function () { state.step = 'select'; render(); focusFirst(); };
  }

  function wireSelect() {
    var full = doc.getElementById('rfd-mode-full'), part = doc.getElementById('rfd-mode-partial');
    if (full) full.onclick = function () { state.mode = 'full'; state.lines.forEach(function (l) { if (l.refundable > 0) l.checked = true; }); render(); };
    if (part) part.onclick = function () { state.mode = 'partial'; render(); };
    Array.prototype.forEach.call(doc.querySelectorAll('.rfd-chk'), function (cb) {
      cb.onchange = function () { var i = +cb.getAttribute('data-i'); if (state.lines[i]) state.lines[i].checked = cb.checked; state.mode = 'partial'; render(); };
    });
    var rsn = doc.getElementById('rfd-reason-input');
    if (rsn) rsn.oninput = function () { state.reason = rsn.value; var nx = doc.getElementById('rfd-next'); var v = validity(); if (nx) nx.disabled = !v.ok; var sc = doc.querySelector('.rfd-state'); if (sc) { sc.className = 'rfd-state ' + (v.ok ? 'ok' : 'bad'); var bb = sc.querySelector('b'); if (bb) bb.textContent = v.msg; } };
    var nx = doc.getElementById('rfd-next'); if (nx) nx.onclick = function () { if (!validity().ok) return; state.step = 'confirm'; render(); };
    var cx = doc.getElementById('rfd-cancel'); if (cx) cx.onclick = function () { if (typeof root.closeM === 'function') root.closeM(); };
  }

  var _executing = false;
  function execute() {
    if (_executing) return;                         /* guard double-click */
    var v = validity(); if (!v.ok) { toast(v.msg, 'err'); return; }
    var BO = root.BusinessOps;
    if (!BO || typeof BO.refundReceipt !== 'function') { toast(L('محرّك الاسترداد غير متوفّر', 'Refund engine unavailable'), 'err'); return; }
    _executing = true;
    var ex = doc.getElementById('rfd-execute'); if (ex) { ex.disabled = true; ex.innerHTML = '<i class="ti ti-loader"></i>' + L('جارٍ التنفيذ…', 'Processing…'); }
    var t = totals();
    /* THE ONLY execution path. UI computes nothing beyond the selection sum. */
    Promise.resolve(BO.refundReceipt({
      originId: state.id,
      amountILS: t.selected,
      reason: String(state.reason).trim(),
      settlementLineIds: selectedIds()
    })).then(function (res) {
      _executing = false;
      if (res && res.ok) {
        toast(L('تم الاسترداد بنجاح', 'Refund completed'), 'ok');
        if (typeof root.closeM === 'function') root.closeM();
        if (typeof root.loadAll === 'function') root.loadAll();   /* normal refresh flow — refreshes every screen */
      } else {
        var msg = (res && res.error) ? res.error : L('فشل الاسترداد', 'Refund failed');
        toast(L('فشل الاسترداد: ', 'Refund failed: ') + msg, 'err');
        state.step = 'select'; render(); focusFirst();
      }
    }).catch(function (e) {
      _executing = false;
      toast(L('خطأ غير متوقع أثناء الاسترداد', 'Unexpected error during refund'), 'err');
      state.step = 'select'; render();
    });
  }

  /* minimal focus management + Tab trap within the dialog */
  function focusables() { var sh = shell(); return sh ? Array.prototype.slice.call(sh.querySelectorAll('button,input,textarea,select,[tabindex]:not([tabindex="-1"])')).filter(function (el) { return !el.disabled && el.offsetParent !== null; }) : []; }
  function focusFirst() { var f = focusables(); if (f.length) f[0].focus(); }
  if (doc) {
    doc.addEventListener('keydown', function (e) {
      var sh = shell(); if (!sh || sh.style.display === 'none') return;
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      /* Escape is handled by the app-wide overlay handler (closeM) */
    });
  }

  /* Toggle the Refund button in the edit-rec modal footer (called by editRec). */
  function syncEditButton(r) {
    if (!doc) return;
    var btn = doc.getElementById('edit-rec-refund-btn');
    if (!btn) return;
    btn.style.display = eligible(r) ? '' : 'none';
  }

  root.RefundUI = { version: '7a', enabled: enabled, eligible: eligible, open: open, syncEditButton: syncEditButton, _validity: validity };
  root.openRefund = function (id) { open(id); };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RefundUI;
})(typeof window !== 'undefined' ? window : this);
