/* ═══ PAYMENT VOUCHER WORKSPACE — P4 · Slice 1 (read-only) ═════════════════════
   The third Business Module surface (P4-000, approved & frozen). The operational
   environment for money LEAVING the organization (Payment / Disbursement
   Vouchers) — the outflow mirror of the P3 Collection Operations Workspace.
   Slice 1 establishes VISIBILITY BEFORE CAPABILITY: the payment State and History.

   BUSINESS BOUNDARY (GOV-WS-01 Rule 5):
     • OWNS — presenting the disbursement State and History from certified read
       models; (from P4-S2) issue / edit / cancel / correct payment vouchers via
       certified Business Operations.
     • DOES NOT OWN — the approval workflow (GAP-P1) and the liquidity/budget guard
       (GAP-P2); both are separate gated business decisions. No receipts (P3), no
       member lifecycle (P2), no BO-06.

   ORCHESTRATION ONLY — and, in Slice 1, strictly READ-ONLY:
     • every displayed value originates from a certified Read Model
       (FIN.fundLedger debit rows = the certified payment ledger; FIN.foodBalance /
       diwanBalance = the certified fund position = liquidity available to pay).
       Totals are the sum of certified ledger debits — the same figure the certified
       fund statement shows as total expense — never a new accounting rule.
     • NO Business Operation is executed, no create/edit/cancel, no approval, no
       accounting logic, no second source of truth.

   Architecture: Workspace → Certified Read Models. Capability is intentionally
   deferred to P4-S2 (a separate order). GOV-WS-01: State → History (no Capability
   section, no execution controls); Rule 2 (one dominant Primary Business Question).
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

  /* SECTION 4 · Workspace Navigation — READ-ONLY orientation links to related
     certified views. NO capability, NO execution controls, NO inactive buttons:
     operational capability arrives in P4-S2. */
  function sectionNav() {
    const link = (p, icon, label) => '<button class="pw-nav-lnk" onclick="window.nav&&window.nav(\'' + p + '\')"><i class="ti ' + icon + '"></i>' + label + '</button>';
    const links = [
      link('food-stmt', 'ti-file-description', T('كشف صندوق الغداء', 'Food fund statement')),
      link('diwan-stmt', 'ti-file-description', T('كشف صندوق الديوان', 'Diwan fund statement')),
      link('collection-workspace', 'ti-cash', T('بيئة التحصيل', 'Collection workspace'))
    ].join('');
    const note = '<div class="pw-defer"><i class="ti ti-lock"></i><span>'
      + T('القدرات التشغيلية (إصدار · تعديل · إلغاء · تصحيح سندات الصرف) تُضاف في الشريحة الثانية P4-S2 — لا تنفيذ في هذه الشريحة.',
          'Operational capability (issue · edit · cancel · correct payments) arrives in P4-S2 — no execution in this slice.') + '</span></div>';
    return card('ti-compass', T('التنقّل في مساحة العمل', 'Workspace Navigation'), T('إلى أين أذهب من هنا؟ (قراءة فقط)', 'Where to from here? (read-only)'),
      '<div class="pw-nav">' + links + '</div>' + note);
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
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question: the payment state.
    out.innerHTML = '<div class="pw-shell">'
      + '<div class="pw-hero">'
      +   '<div class="pw-hero-id"><span class="pw-hero-badge">' + T('بيئة الصرف التشغيلية · قراءة فقط', 'Payment Operations · read-only') + '</span>'
      +     '<div class="pw-hero-name">' + T('المدفوعات', 'Payments') + '</div>'
      +     '<div class="pw-hero-q">' + T('ما المدفوعات القائمة الآن، وما حالتها الحالية؟', 'What payments exist now, and what is their current state?') + '</div>'
      +   '</div>'
      +   '<div class="pw-hero-state">'
      +     '<div class="pw-hero-bal">₪ ' + M(s.total) + '</div>'
      +     '<div class="pw-hero-sub">' + T(s.count + ' سند · اليوم: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')', s.count + ' vouchers · today: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')') + '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="pw-tabs">' + fillFundTabs() + '</div>'
      + '<div class="pw-cols">'
      + sectionSummary(s) + sectionLedger(s) + sectionTimeline(s) + sectionNav()
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
    version: 1, paymentRows, paymentState, renderWorkspace,
    setFund(f) { _pwFund = (f === 'food' || f === 'diwan') ? f : 'all'; renderWorkspace(); }
  };
  if (typeof window !== 'undefined') window.PaymentWorkspace = PaymentWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = PaymentWorkspace;
})();
