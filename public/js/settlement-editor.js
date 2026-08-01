/* ═══════════════════════════════════════════════════════════════════════════
   P-RECEIPT-ALLOCATION · PR-3 — Settlement Editor (UI only · INERT · flag OFF)
   ---------------------------------------------------------------------------
   The operator-facing grid for entering EXPLICIT settlement lines on a receipt.
   The operator defines where every shekel goes; the editor never guesses, never
   auto-distributes, never reallocates. It computes totals + validation LIVE and
   gates the Save button — but it PERSISTS NOTHING, calls NO RPC, touches NO FIN /
   report / balance. It is not wired into any live flow; with the feature flag OFF
   (default) it never renders. Pure UI + validation.

   Two layers:
     • SettlementEditor.computeState(input)  — PURE. No DOM. Unit-testable. Given
       the receipt amount, the current lines, the available destinations (with
       outstanding), and the fiscal lock, it returns per-row status/remaining/
       errors, the running totals, and canSave.
     • SettlementEditor.mount(container, opts) — thin DOM layer over computeState:
       renders the grid + live summary bar, wires input/keyboard, toggles Save.
       readOnly:true renders a static (posted/cancelled/refunded) view.

   Destinations (spec-approved only): 'due' (subscription year), 'historical'
   (Historical Deficit), 'credit' (Future Credit / prepayment), 'donation'.

   Reverting PR-3 = remove the <script> tag + delete this file. Nothing depends
   on it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root) return;

  var KINDS = ['due', 'historical', 'credit', 'donation'];
  var CAPPED = { due: true, historical: true, credit: false, donation: false }; /* which kinds cap at outstanding */
  var r2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };

  function destKey(kind, year) { return kind === 'due' ? ('due:' + year) : kind; }

  function statusOf(kind, amount, outstanding) {
    if (kind === 'due') {
      if (amount >= outstanding && outstanding > 0) return 'paid';
      return amount > 0 ? 'partial' : 'empty';
    }
    if (kind === 'historical') return 'reduces_deficit';
    if (kind === 'donation') return 'donation';
    if (kind === 'credit') return 'prepayment';
    return 'invalid';
  }

  /* ── PURE: compute the full editor state from plain data ── */
  function computeState(input) {
    input = input || {};
    var amount = r2(input.receiptAmount);
    var lines = Array.isArray(input.lines) ? input.lines : [];
    var dests = Array.isArray(input.destinations) ? input.destinations : [];
    var locked = Number(input.lockedThroughYear);
    if (!isFinite(locked)) locked = new Date().getFullYear() - 1;

    var byKey = {};
    dests.forEach(function (d) { byKey[destKey(d.kind, d.year)] = d; });

    var seen = {};           /* duplicate detection */
    var allocByKey = {};      /* running per-destination allocation */
    var allocated = 0;
    var rows = lines.map(function (ln) {
      var errs = [];
      var kind = ln.kind;
      var year = (kind === 'due') ? Number(ln.year) : null;
      var amt = ln.amount === '' || ln.amount == null ? null : r2(ln.amount);
      var key = kind ? destKey(kind, year) : null;
      var dest = key ? byKey[key] : null;
      var outstanding = dest ? r2(dest.outstanding) : null;

      /* destination validity */
      if (!kind) errs.push('empty_destination');
      else if (KINDS.indexOf(kind) < 0) errs.push('invalid_destination');
      else if (kind === 'due' && !isFinite(year)) errs.push('empty_destination');
      else if (!dest) errs.push('invalid_destination');

      /* amount validity */
      if (amt == null) errs.push('empty_amount');
      else if (amt <= 0) errs.push('non_positive_amount');
      else if (CAPPED[kind] && outstanding != null && amt > outstanding) errs.push('exceeds_outstanding');

      /* closed fiscal year (due only) */
      if (kind === 'due' && isFinite(year) && year <= locked) errs.push('closed_year');

      /* duplicate destination */
      if (key && !errs.length) { if (seen[key]) errs.push('duplicate_destination'); seen[key] = true; }
      else if (key && errs.indexOf('duplicate_destination') < 0 && seen[key]) errs.push('duplicate_destination');

      /* orphan row (neither destination nor amount) */
      if (!kind && amt == null) { errs = ['orphan_row']; }

      if (amt != null && amt > 0) { allocated = r2(allocated + amt); if (key) allocByKey[key] = r2((allocByKey[key] || 0) + amt); }

      var remaining = (outstanding != null && CAPPED[kind]) ? Math.max(r2(outstanding - (amt || 0)), 0) : null;
      return {
        kind: kind || null, year: year, amount: amt, notes: ln.notes || '',
        outstanding: outstanding, remaining: remaining,
        status: errs.length ? 'invalid' : statusOf(kind, amt || 0, outstanding || 0),
        errors: errs
      };
    });

    var remaining = r2(amount - allocated);
    var globalErrors = [];
    if (amount <= 0) globalErrors.push('bad_receipt_amount');
    if (!rows.length) globalErrors.push('no_lines');
    if (remaining !== 0) globalErrors.push('sum_mismatch');
    var anyRowError = rows.some(function (rr) { return rr.errors.length; });

    var valid = !globalErrors.length && !anyRowError;
    return {
      rows: rows, receiptAmount: amount, allocated: allocated, remaining: remaining,
      errors: globalErrors, valid: valid, canSave: valid  /* Save enabled iff fully valid & remaining==0 */
    };
  }

  /* ── error → message (caller may override via opts.labels.errors) ── */
  var DEFAULT_ERR = {
    empty_destination: 'اختر وجهة', invalid_destination: 'وجهة غير صالحة',
    empty_amount: 'أدخل مبلغاً', non_positive_amount: 'المبلغ يجب أن يكون أكبر من صفر',
    exceeds_outstanding: 'المبلغ أكبر من المتبقي', closed_year: 'سنة مالية مقفلة',
    duplicate_destination: 'وجهة مكررة', orphan_row: 'صف فارغ',
    sum_mismatch: 'مجموع التوزيع لا يساوي مبلغ السند', no_lines: 'أضف سطر تسوية واحداً على الأقل',
    bad_receipt_amount: 'مبلغ السند غير صالح'
  };

  /* ── self-contained styles (injected once, only when the editor is mounted;
        never injected at load, so nothing changes while the flag is OFF) ── */
  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('se-styles')) return;
    var css =
      '.settlement-editor{font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#16202f}'
      + '.se-table{width:100%;border-collapse:collapse;margin-bottom:12px}'
      + '.se-table th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#7c8aa1;text-align:right;padding:8px 10px;border-bottom:1px solid rgba(20,29,43,.14)}'
      + '.se-table td{padding:7px 10px;border-bottom:1px solid rgba(20,29,43,.07);text-align:right;font-variant-numeric:tabular-nums}'
      + '.se-row.se-err td{background:rgba(176,80,58,.06)}'
      + '.se-msg{color:#b0503a;font-size:12px;text-align:right}'
      + '.se-amt-in,.se-notes-in,.se-dest-in{width:100%;padding:6px 8px;border:1px solid rgba(20,29,43,.22);border-radius:6px;font:inherit;text-align:right}'
      + '.se-amt-in:focus,.se-notes-in:focus,.se-dest-in:focus{outline:2px solid #b07d1e;outline-offset:1px}'
      + '.se-status{font-size:12px;font-weight:600}.se-st-paid{color:#1f8a72}.se-st-partial{color:#b07d1e}.se-st-invalid{color:#b0503a}'
      + '.se-del-btn{border:none;background:none;color:#b0503a;cursor:pointer;font-size:15px}'
      + '.se-add{border:1px dashed rgba(20,29,43,.3);background:none;border-radius:8px;padding:7px 14px;cursor:pointer;font:inherit}'
      + '.se-bar{display:flex;flex-wrap:wrap;gap:8px 18px;padding:11px 14px;border-radius:8px;margin:12px 0;font-variant-numeric:tabular-nums}'
      + '.se-bar.se-ok{background:rgba(31,138,114,.10);color:#166b58}.se-bar.se-bad{background:rgba(176,80,58,.09);color:#8f4230}'
      + '.se-vstate{margin-inline-start:auto;font-weight:600}'
      + '.se-save{width:100%;padding:11px;border:none;border-radius:9px;background:#1f8a72;color:#fff;font:inherit;font-weight:600;cursor:pointer}'
      + '.se-save[disabled]{background:rgba(20,29,43,.18);color:rgba(20,29,43,.5);cursor:not-allowed}'
      + '.se-empty{color:#7c8aa1;text-align:center;padding:16px}';
    var el = document.createElement('style'); el.id = 'se-styles'; el.textContent = css; document.head.appendChild(el);
  }

  /* ── DOM layer (thin; delegates all truth to computeState) ── */
  function mount(container, opts) {
    if (!container || typeof document === 'undefined') return null;
    ensureStyles();
    opts = opts || {};
    var state = { lines: (opts.lines ? opts.lines.slice() : []), readOnly: !!opts.readOnly };
    var labels = opts.labels || {};
    var errMsg = Object.assign({}, DEFAULT_ERR, labels.errors || {});
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    function fire() { if (typeof opts.onChange === 'function') opts.onChange(computeState({ receiptAmount: opts.receiptAmount, lines: state.lines, destinations: opts.destinations, lockedThroughYear: opts.lockedThroughYear })); }

    function render() {
      var st = computeState({ receiptAmount: opts.receiptAmount, lines: state.lines, destinations: opts.destinations, lockedThroughYear: opts.lockedThroughYear });
      var ro = state.readOnly;
      var rowsHtml = st.rows.map(function (rr, i) {
        var errTxt = rr.errors.map(function (e) { return errMsg[e] || e; }).join(' · ');
        return '<tr class="se-row' + (rr.errors.length ? ' se-err' : '') + '" data-i="' + i + '">'
          + '<td class="se-dest">' + (ro ? esc(rr.kind === 'due' ? ('اشتراك ' + rr.year) : rr.kind) : destSelect(rr, i)) + '</td>'
          + '<td class="se-out">' + (rr.outstanding == null ? '—' : esc(rr.outstanding)) + '</td>'
          + '<td class="se-amt">' + (ro ? esc(rr.amount) : '<input type="number" min="0" step="0.01" class="se-amt-in" data-i="' + i + '" value="' + (rr.amount == null ? '' : esc(rr.amount)) + '" aria-label="المبلغ">') + '</td>'
          + '<td class="se-rem">' + (rr.remaining == null ? '—' : esc(rr.remaining)) + '</td>'
          + '<td class="se-status se-st-' + rr.status + '">' + esc(rr.status) + '</td>'
          + '<td class="se-notes">' + (ro ? esc(rr.notes) : '<input type="text" class="se-notes-in" data-i="' + i + '" value="' + esc(rr.notes) + '" aria-label="ملاحظات">') + '</td>'
          + (ro ? '' : '<td class="se-del"><button type="button" class="se-del-btn" data-i="' + i + '" aria-label="حذف الصف">✕</button></td>')
          + (rr.errors.length ? '<td class="se-msg" colspan="' + (ro ? 6 : 7) + '">' + esc(errTxt) + '</td>' : '')
          + '</tr>';
      }).join('');

      var bar = '<div class="se-bar' + (st.valid ? ' se-ok' : ' se-bad') + '" role="status">'
        + '<span>مبلغ السند: <b>' + esc(st.receiptAmount) + '</b></span>'
        + '<span>الموزّع: <b>' + esc(st.allocated) + '</b></span>'
        + '<span>المتبقي: <b class="se-remaining">' + esc(st.remaining) + '</b></span>'
        + '<span class="se-vstate">' + (st.valid ? '✓ جاهز للحفظ' : '⚠ ' + (st.errors.map(function (e) { return errMsg[e] || e; })[0] || 'غير مكتمل')) + '</span>'
        + '</div>';

      container.innerHTML =
        '<div class="settlement-editor" dir="rtl">'
        + '<table class="se-table"><thead><tr>'
        + '<th>الوجهة</th><th>المتبقي على العضو</th><th>المبلغ الموزّع</th><th>المتبقي بعد الدفع</th><th>الحالة</th><th>ملاحظات</th>' + (ro ? '' : '<th></th>')
        + '</tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="7" class="se-empty">لا توجد أسطر بعد</td></tr>') + '</tbody></table>'
        + (ro ? '' : '<div class="se-actions"><button type="button" class="se-add">+ إضافة سطر</button></div>')
        + bar
        + (ro ? '' : '<button type="button" class="se-save" ' + (st.canSave ? '' : 'disabled') + '>حفظ التسوية</button>')
        + '</div>';
      if (!ro) wire();
      fire();
    }

    function destSelect(rr, i) {
      var opts2 = (opts.destinations || []).map(function (d) {
        var k = destKey(d.kind, d.year);
        var sel = (rr.kind && destKey(rr.kind, rr.year) === k) ? ' selected' : '';
        return '<option value="' + esc(k) + '"' + sel + '>' + esc(d.label || k) + '</option>';
      }).join('');
      return '<select class="se-dest-in" data-i="' + i + '" aria-label="الوجهة"><option value="">—</option>' + opts2 + '</select>';
    }

    function setLine(i, patch) { state.lines[i] = Object.assign({}, state.lines[i], patch); }
    function parseKey(k) { if (!k) return { kind: null }; if (k.indexOf('due:') === 0) return { kind: 'due', year: Number(k.slice(4)) }; return { kind: k }; }

    function wire() {
      container.querySelectorAll('.se-amt-in').forEach(function (el) {
        el.addEventListener('input', function () { setLine(+el.dataset.i, { amount: el.value }); renderKeepFocus(el); });
      });
      container.querySelectorAll('.se-dest-in').forEach(function (el) {
        el.addEventListener('change', function () { setLine(+el.dataset.i, parseKey(el.value)); render(); });
      });
      container.querySelectorAll('.se-notes-in').forEach(function (el) {
        el.addEventListener('input', function () { setLine(+el.dataset.i, { notes: el.value }); });
      });
      container.querySelectorAll('.se-del-btn').forEach(function (el) {
        el.addEventListener('click', function () { state.lines.splice(+el.dataset.i, 1); render(); });
      });
      var add = container.querySelector('.se-add');
      if (add) add.addEventListener('click', function () { state.lines.push({ kind: null, amount: '' }); render(); });
      /* keyboard: Enter=add row, Alt+Delete=remove focused row, arrows move between amount cells */
      container.addEventListener('keydown', function (e) {
        var inp = e.target;
        if (e.key === 'Enter' && !state.readOnly) { e.preventDefault(); state.lines.push({ kind: null, amount: '' }); render(); }
        else if (e.altKey && e.key === 'Delete' && inp && inp.dataset && inp.dataset.i != null) { e.preventDefault(); state.lines.splice(+inp.dataset.i, 1); render(); }
        else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && inp && inp.classList && inp.classList.contains('se-amt-in')) {
          e.preventDefault(); var i = +inp.dataset.i + (e.key === 'ArrowDown' ? 1 : -1);
          var next = container.querySelector('.se-amt-in[data-i="' + i + '"]'); if (next) next.focus();
        }
      });
      var save = container.querySelector('.se-save');
      if (save) save.addEventListener('click', function () {
        /* PR-3: NO persistence, NO RPC. Hand the validated state to the caller only. */
        var st = computeState({ receiptAmount: opts.receiptAmount, lines: state.lines, destinations: opts.destinations, lockedThroughYear: opts.lockedThroughYear });
        if (st.canSave && typeof opts.onSaveIntent === 'function') opts.onSaveIntent(st);
      });
    }

    function renderKeepFocus(prevEl) {
      var i = prevEl && prevEl.dataset ? prevEl.dataset.i : null, pos = prevEl ? prevEl.selectionStart : null;
      render();
      if (i != null) { var again = container.querySelector('.se-amt-in[data-i="' + i + '"]'); if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} } }
    }

    render();
    return { getState: function () { return computeState({ receiptAmount: opts.receiptAmount, lines: state.lines, destinations: opts.destinations, lockedThroughYear: opts.lockedThroughYear }); }, refresh: render };
  }

  root.SettlementEditor = { version: 1, KINDS: KINDS, computeState: computeState, mount: mount, destKey: destKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SettlementEditor;
})(typeof window !== 'undefined' ? window : this);
