/* ═══ PAYMENT VOUCHER WORKSPACE — P4 · Slices 1–2 ═════════════════════════════
   The third Business Module surface (P4-000, approved & frozen). The operational
   environment for money LEAVING the organization (Payment / Disbursement
   Vouchers) — the outflow mirror of the P3 Collection Operations Workspace.
     • Slice 1 established VISIBILITY: the payment State and History (read-only).
     • Slice 2 activates CAPABILITY: issue / edit / cancel payment vouchers.

   BUSINESS BOUNDARY (GOV-WS-01 Rule 5):
     • OWNS — presenting the disbursement State/History from certified read models;
       and (P4-S2) issue / edit / cancel payment vouchers via certified BOs.
     • DOES NOT OWN — corrections (BO-04/05, reserved for P4-S3), the approval
       workflow (GAP-P1), the liquidity/budget guard (GAP-P2), BO-06. No receipts
       (P3), no member lifecycle (P2).

   ORCHESTRATION ONLY, on the certified foundation:
     • DISPLAY — every value originates from a certified Read Model (FIN.fundLedger
       debit rows = the certified payment ledger; FIN.foodBalance / diwanBalance =
       fund liquidity). Totals are the sum of certified ledger debits — the same
       figure the certified fund statement shows as expense — never a new accounting
       rule. ONE source of operational truth: hero / Summary / Ledger totals are one
       projection of the same certified state, never separate sums (Rule 6).
     • EXECUTION — the workspace never calls a Business Operation or mutates state
       itself. Each capability DELEGATES to an existing certified flow that routes
       to a certified Business Operation: issue → window.openPay → savePay → BO-01;
       edit → window.editPay → updatePay → BO-02; cancel → deletePay → BO-03. No
       BO-04/05 (P4-S3), no approval, no liquidity guard, no accounting logic.

   GOV-WS-01 v1.4: Rule 2 (one dominant Primary Business Question); Rule 3 (State /
   History / Capability in separate sections); Rule 4 (Intent → Authorization →
   Execution via a certified BO → Result from a certified Read Model).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const _en = () => (typeof window !== 'undefined' && window.LANG === 'en');
  const T = (ar, en) => (_en() ? en : ar);
  const E = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = n => (typeof fmt === 'function' ? fmt(n) : String(n));
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const _today = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
  const fundLabel = f => f === 'food' ? T('الغداء', 'Food') : f === 'diwan' ? T('الديوان', 'Diwan') : T('الكل', 'All');

  let _pwFund = 'all';   // read-only view filter (All / Food / Diwan) — no execution

  /* the certified payment rows: debit (disbursement) rows from the certified fund
     ledger, per selected fund. Pure read — no accounting is computed here. */
  function paymentRows(fund) {
    if (typeof FIN === 'undefined' || !FIN.fundLedger) return [];
    const funds = fund === 'food' ? ['food'] : fund === 'diwan' ? ['diwan'] : ['food', 'diwan'];
    const rows = [];
    funds.forEach(f => (FIN.fundLedger(f, '', '', 'dr') || []).forEach(r => {
      rows.push({ id: r.id, date: r.date, no: r.no, name: r.name, desc: r.desc, amount: Number(r.dr || 0), fund: f });
    }));
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));   // most recent first
    return rows;
  }

  /* the payment State — a pure projection over the certified read model. Totals are
     the sum of certified ledger debits (same figure the certified statement shows as
     total expense); liquidity is read verbatim from certified balances. */
  function paymentState(fund) {
    const rows = paymentRows(fund);
    const sum = list => R2(list.reduce((t, r) => t + r.amount, 0));
    const td = _today();
    const todays = rows.filter(r => String(r.date || '').slice(0, 10) === td);
    const foodRows = rows.filter(r => r.fund === 'food'), diwanRows = rows.filter(r => r.fund === 'diwan');
    const bal = fn => (typeof FIN !== 'undefined' && FIN[fn]) ? FIN[fn]() : 0;
    return {
      fund, rows, count: rows.length, total: sum(rows),
      today: { count: todays.length, total: sum(todays) },
      byFund: { food: { count: foodRows.length, total: sum(foodRows) }, diwan: { count: diwanRows.length, total: sum(diwanRows) } },
      liquidity: { food: R2(bal('foodBalance')), diwan: R2(bal('diwanBalance')) }
    };
  }

  function card(icon, title, question, body) {
    return '<section class="pw-card">'
      + '<header class="pw-card-h"><i class="ti ' + icon + '"></i><div><div class="pw-card-t">' + title + '</div>'
      + '<div class="pw-card-q">' + question + '</div></div></header>'
      + '<div class="pw-card-b">' + body + '</div></section>';
  }

  /* SECTION 1 · Payment Summary (STATE) — "totals · today · fund liquidity" */
  function sectionSummary(s) {
    const tiles = [
      [T('إجمالي المدفوعات', 'Total disbursed'), '₪ ' + M(s.total), T(s.count + ' سند', s.count + ' vouchers')],
      [T('مدفوعات اليوم', 'Disbursed today'), '₪ ' + M(s.today.total), T(s.today.count + ' سند اليوم', s.today.count + ' today')],
      [T('صندوق الغداء', 'Food fund'), '₪ ' + M(s.byFund.food.total), T(s.byFund.food.count + ' سند · سيولة ₪' + M(s.liquidity.food), s.byFund.food.count + ' · liquidity ₪' + M(s.liquidity.food))],
      [T('صندوق الديوان', 'Diwan fund'), '₪ ' + M(s.byFund.diwan.total), T(s.byFund.diwan.count + ' سند · سيولة ₪' + M(s.liquidity.diwan), s.byFund.diwan.count + ' · liquidity ₪' + M(s.liquidity.diwan))]
    ];
    return card('ti-cash-banknote', T('ملخص المدفوعات', 'Payment Summary'), T('ما إجمالي المدفوعات وحركة اليوم والسيولة الحالية؟', 'What are the totals, today’s activity, and current liquidity?'),
      '<div class="pw-tiles">' + tiles.map(t => '<div class="pw-tile"><div class="pw-tile-k">' + t[0] + '</div><div class="pw-tile-v">' + t[1] + '</div><div class="pw-tile-s">' + t[2] + '</div></div>').join('') + '</div>');
  }

  /* SECTION 2 · Payment Ledger (HISTORY) — certified debit rows, chronological */
  function sectionLedger(s) {
    const rows = s.rows.map(r => '<tr>'
      + '<td class="pw-c">' + (r.date === '—' ? '—' : E(r.date)) + '</td>'
      + '<td class="pw-ref">' + E(r.no || '—') + '</td>'
      + '<td>' + E(r.name || '—') + '</td>'
      + '<td class="pw-desc">' + E(r.desc || '') + '</td>'
      + '<td class="pw-c"><span class="pw-fund pw-fund-' + r.fund + '">' + fundLabel(r.fund) + '</span></td>'
      + '<td class="pw-num pw-dr">₪ ' + M(r.amount) + '</td></tr>').join('');
    const body = s.rows.length
      ? '<div class="pw-tablewrap"><table class="pw-table"><thead><tr>'
        + '<th class="pw-c">' + T('التاريخ', 'Date') + '</th><th>' + T('رقم السند', 'Voucher') + '</th>'
        + '<th>' + T('المصروف إليه', 'Beneficiary') + '</th><th>' + T('نوع المصروف', 'Expense') + '</th>'
        + '<th class="pw-c">' + T('الصندوق', 'Fund') + '</th><th class="pw-num">' + T('المبلغ', 'Amount') + '</th></tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '<tfoot><tr><td colspan="5">' + T('إجمالي المدفوعات', 'Total disbursed') + '</td><td class="pw-num pw-dr">₪ ' + M(s.total) + '</td></tr></tfoot>'
        + '</table></div>'
      : '<div class="pw-empty"><i class="ti ti-receipt-off"></i><div>' + T('لا توجد سندات صرف في هذا النطاق', 'No payment vouchers in this scope') + '</div></div>';
    return card('ti-receipt-2', T('سجل سندات الصرف', 'Payment Ledger'), T('ما سندات الصرف الموجودة وحالتها المعتمدة؟', 'Which payment vouchers exist, and their certified state?'), body);
  }

  /* SECTION 3 · Payment Timeline (HISTORY) — same certified rows, narrative */
  function sectionTimeline(s) {
    const evs = s.rows.slice(0, 40).map(r => '<li class="pw-tl-i"><span class="pw-tl-dot"></span>'
      + '<span class="pw-tl-d">' + (r.date === '—' ? T('الافتتاح', 'Opening') : E(r.date)) + '</span>'
      + '<span class="pw-tl-t">' + E(r.name || '—') + ' · ' + E(r.desc || '') + ' <span class="pw-mut">(' + fundLabel(r.fund) + ')</span></span>'
      + '<span class="pw-tl-dr">−₪ ' + M(r.amount) + '</span></li>').join('');
    return card('ti-timeline', T('الخط الزمني للمدفوعات', 'Payment Timeline'), T('ماذا حدث عبر الزمن؟', 'What happened over time?'),
      '<ul class="pw-tl">' + (evs || '<li class="pw-tl-i"><span class="pw-tl-t">' + T('لا أحداث', 'No events') + '</span></li>') + '</ul>'
      + (s.rows.length > 40 ? '<div class="pw-more">' + T('عرض أحدث 40 حركة', 'showing the latest 40 events') + '</div>' : ''));
  }

  /* The single dominant next legitimate operation (the order's Primary Business
     Question: "what payment operation am I legitimately allowed to perform next?").
     Chosen from AUTHORITY only — an orchestration choice, never accounting. Routes
     to the certified create flow (issue → openPay → savePay → BO-01). */
  function nextOperation() {
    const canW = (typeof can !== 'undefined' && can.write && can.write());
    return canW
      ? { enabled: true, label: T('إصدار سند صرف', 'Issue a payment'), run: "window.PaymentWorkspace.actionIssue()" }
      : { enabled: false, label: T('قراءة فقط · لا صلاحية تنفيذ', 'read-only · no execution permission') };
  }

  /* SECTION 4 · Operational Actions (CAPABILITY — activated in P4-S2). GOV-WS-01
     Rule 3 keeps this a DEDICATED Capability section, never mixed into State or
     History (the ledger rows carry no execution controls). Rule 4: Intent (choose
     action / voucher) → Authorization (can.write / can.admin) → Execution
     (EXCLUSIVELY via an existing certified flow that routes to a certified Business
     Operation) → Result (re-read from certified Read Models). The workspace itself
     executes no Business Operation and mutates no state. BO-04/05 remain in P4-S3. */
  function sectionCapability(s) {
    const canW = (typeof can !== 'undefined' && can.write && can.write());
    const canA = (typeof can !== 'undefined' && can.admin && can.admin());
    const why = t => '<span class="pw-cap-why">' + t + '</span>';
    const lbl = (icon, text, bo) => '<span class="pw-cap-l"><i class="ti ' + icon + '"></i>' + text + '<span class="pw-cap-bo">' + bo + '</span></span>';
    // BO-01 · Issue payment → certified new-payment flow (openPay → savePay → BO-01)
    const issue = canW
      ? '<div class="pw-cap-row">' + lbl('ti-plus', T('إصدار سند صرف جديد', 'Issue a new payment'), 'BO-01')
        + '<span class="pw-cap-act">'
        + '<button class="pw-op pw-op-pri" onclick="window.PaymentWorkspace.actionIssue(\'food\')"><i class="ti ti-receipt-2"></i>' + T('غداء', 'Food') + '</button>'
        + '<button class="pw-op pw-op-pri" onclick="window.PaymentWorkspace.actionIssue(\'diwan\')"><i class="ti ti-receipt-2"></i>' + T('ديوان', 'Diwan') + '</button></span></div>'
      : '<div class="pw-cap-row pw-cap-off">' + lbl('ti-plus', T('إصدار سند صرف جديد', 'Issue a new payment'), 'BO-01') + why(T('يتطلب صلاحية كتابة', 'requires write permission')) + '</div>';
    // BO-02 / BO-03 · Edit / cancel a selected payment → certified editor
    const editable = s.rows.filter(r => r.id);
    const opts = editable.map(r => '<option value="' + E(r.id) + '">' + E(r.no || '—') + ' · ' + E(r.name || '—') + ' · ₪' + M(r.amount) + ' (' + fundLabel(r.fund) + ')</option>').join('');
    const edit = !canA
      ? '<div class="pw-cap-row pw-cap-off">' + lbl('ti-edit', T('تعديل / إلغاء سند', 'Edit / cancel a payment'), 'BO-02 · BO-03') + why(T('يتطلب صلاحية مدير', 'requires admin')) + '</div>'
      : editable.length
        ? '<div class="pw-cap-row">' + lbl('ti-edit', T('تعديل / إلغاء سند', 'Edit / cancel a payment'), 'BO-02 · BO-03')
          + '<span class="pw-cap-act"><select id="pw-edit-sel" class="pw-sel">' + opts + '</select>'
          + '<button class="pw-op" onclick="window.PaymentWorkspace.actionEdit()"><i class="ti ti-external-link"></i>' + T('فتح المحرّر المعتمد', 'Open certified editor') + '</button></span></div>'
        : '<div class="pw-cap-row pw-cap-off">' + lbl('ti-edit', T('تعديل / إلغاء سند', 'Edit / cancel a payment'), 'BO-02 · BO-03') + why(T('لا سندات في هذا النطاق', 'no vouchers in scope')) + '</div>';
    const note = '<div class="pw-cap-note"><i class="ti ti-shield-check"></i><span>'
      + T('النية ← الصلاحية ← التنفيذ عبر عملية أعمال معتمدة فقط ← النتيجة من نموذج القراءة المعتمد · لا منطق محاسبي داخل مساحة العمل · التصحيح (BO-04/05) والموافقة (GAP-P1) وحارس السيولة (GAP-P2) خارج نطاق هذه الشريحة.',
          'Intent → Authorization → Execution via a certified Business Operation only → Result from the certified read model · no accounting logic in the workspace · corrections (BO-04/05), approval (GAP-P1) & liquidity guard (GAP-P2) are out of this slice.') + '</span></div>';
    return card('ti-player-play', T('العمليات التشغيلية', 'Operational Actions'), T('ما الذي يمكنني تنفيذه قانونيًا الآن؟', 'What may I legitimately execute now?'), issue + edit + note);
  }

  /* SECTION 5 · Workspace Navigation — READ-ONLY orientation links to related
     certified views. Not capability (no execution); kept separate (Rule 3). */
  function sectionNav() {
    const link = (p, icon, label) => '<button class="pw-nav-lnk" onclick="window.nav&&window.nav(\'' + p + '\')"><i class="ti ' + icon + '"></i>' + label + '</button>';
    const links = [
      link('food-stmt', 'ti-file-description', T('كشف صندوق الغداء', 'Food fund statement')),
      link('diwan-stmt', 'ti-file-description', T('كشف صندوق الديوان', 'Diwan fund statement')),
      link('collection-workspace', 'ti-cash', T('بيئة التحصيل', 'Collection workspace'))
    ].join('');
    return card('ti-compass', T('التنقّل في مساحة العمل', 'Workspace Navigation'), T('إلى أين أذهب من هنا؟', 'Where to from here?'),
      '<div class="pw-nav">' + links + '</div>');
  }

  function fillFundTabs() {
    return [['all', T('الكل', 'All')], ['food', T('الغداء', 'Food')], ['diwan', T('الديوان', 'Diwan')]]
      .map(t => '<button class="pw-tab' + (_pwFund === t[0] ? ' on' : '') + '" onclick="window.PaymentWorkspace.setFund(\'' + t[0] + '\')">' + t[1] + '</button>').join('');
  }

  /* the workspace: the read-only operational environment for money leaving the org */
  function renderWorkspace() {
    const out = document.getElementById('pw-out'); if (!out) return;
    if (typeof FIN === 'undefined' || !FIN.fundLedger) { out.innerHTML = ''; return; }
    const s = paymentState(_pwFund);
    const nxt = nextOperation();
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question. As an Operational
    // Workspace (P4-S2) it leads with the operation the user may legitimately
    // perform next; the disbursed total is the supporting state figure (one
    // projection of the certified debits — Rule 6).
    out.innerHTML = '<div class="pw-shell">'
      + '<div class="pw-hero">'
      +   '<div class="pw-hero-id"><span class="pw-hero-badge">' + T('بيئة الصرف التشغيلية', 'Payment Operations') + '</span>'
      +     '<div class="pw-hero-name">' + T('المدفوعات', 'Payments') + '</div>'
      +     '<div class="pw-hero-q">' + T('ما المدفوعات القائمة، وما العملية التي يُسمح لي بتنفيذها قانونيًا الآن؟', 'What payments exist, and what payment operation am I legitimately allowed to perform next?') + '</div>'
      +   '</div>'
      +   '<div class="pw-hero-state">'
      +     '<div class="pw-hero-bal">₪ ' + M(s.total) + '</div>'
      +     '<div class="pw-hero-sub">' + T(s.count + ' سند · اليوم: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')', s.count + ' vouchers · today: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')') + '</div>'
      +     (nxt.enabled
        ? '<button class="pw-hero-cta" onclick="' + nxt.run + '"><i class="ti ti-minus"></i>' + nxt.label + '</button>'
        : '<span class="pw-hero-cta pw-hero-cta-off">' + nxt.label + '</span>')
      +   '</div>'
      + '</div>'
      + '<div class="pw-tabs">' + fillFundTabs() + '</div>'
      + '<div class="pw-cols">'
      + sectionSummary(s) + sectionLedger(s) + sectionTimeline(s) + sectionCapability(s) + sectionNav()
      + '</div></div>';
  }

  /* entry points — all read-only; setFund is a view filter, not an operation */
  if (typeof window !== 'undefined') {
    window.renderPaymentWorkspace = renderWorkspace;
    window.openPaymentWorkspace = function () {
      if (typeof window.nav === 'function') window.nav('payment-workspace');
      setTimeout(renderWorkspace, 60);
    };
  }

  const PaymentWorkspace = {
    version: 2, paymentRows, paymentState, nextOperation, renderWorkspace,
    setFund(f) { _pwFund = (f === 'food' || f === 'diwan') ? f : 'all'; renderWorkspace(); },
    /* BO-01 · Issue payment — opens the existing certified create flow
       (window.openPay → savePay → BusinessOps.createVoucher{payment}). No BO call here. */
    actionIssue(fund) {
      if (typeof window === 'undefined' || typeof window.openPay !== 'function') return;
      if (fund === 'food' || fund === 'diwan') window.openPay(fund); else window.openPay();   // generic → user picks the fund in the certified form
    },
    /* BO-02 / BO-03 · Edit / cancel — opens the existing certified payment editor
       (window.editPay → updatePay → BO-02 · deletePay → BO-03). No BO call here. */
    actionEdit() {
      const sel = (typeof document !== 'undefined') && document.getElementById('pw-edit-sel');
      const id = sel && sel.value;
      if (id && typeof window !== 'undefined' && typeof window.editPay === 'function') window.editPay(id);
    }
  };
  if (typeof window !== 'undefined') window.PaymentWorkspace = PaymentWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = PaymentWorkspace;
})();
