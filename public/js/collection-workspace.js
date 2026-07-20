/* ═══ COLLECTION OPERATIONS WORKSPACE — P3 · Slice 1 (read-only) ═══════════════
   The second Business Module surface (P3-000, approved & frozen). The operational
   environment for money collection (Receipt Vouchers). Slice 1 establishes
   VISIBILITY BEFORE CAPABILITY: it presents the collection State and History only.

   ORCHESTRATION ONLY — and, in Slice 1, strictly READ-ONLY:
     • every displayed value originates from a certified Read Model
       (FIN.fundLedger credit rows = the certified receipt ledger; FIN.foodBalance /
       diwanBalance = the certified fund position). Totals shown are the sum of the
       certified ledger credits — the very same figure the certified fund statement
       already presents as total income — never a new accounting rule.
     • NO Business Operation is executed (no BO-01…06), no create/edit/cancel, no
       payment, no allocation, no accounting logic, no second source of truth.

   Architecture:  Workspace → Certified Read Models.  Capability is intentionally
   deferred to P3-S2 (a separate order). GOV-WS-01: State → History (no Capability
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

  let _cwFund = 'all';   // read-only view filter (All / Food / Diwan) — no execution

  /* the certified collection rows: credit (receipt) rows from the certified fund
     ledger, per selected fund. Pure read — no accounting is computed here. */
  function collectionRows(fund) {
    if (typeof FIN === 'undefined' || !FIN.fundLedger) return [];
    const funds = fund === 'food' ? ['food'] : fund === 'diwan' ? ['diwan'] : ['food', 'diwan'];
    const rows = [];
    funds.forEach(f => (FIN.fundLedger(f, '', '', 'cr') || []).forEach(r => {
      rows.push({ date: r.date, no: r.no, name: r.name, desc: r.desc, amount: Number(r.cr || 0), fund: f });
    }));
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));   // most recent first
    return rows;
  }

  /* the collection State — a pure projection over the certified read model. Totals
     are the sum of certified ledger credits (same figure the certified statement
     shows as total income); position is read verbatim from certified balances. */
  function collectionState(fund) {
    const rows = collectionRows(fund);
    const sum = list => R2(list.reduce((t, r) => t + r.amount, 0));
    const td = _today();
    const todays = rows.filter(r => String(r.date || '').slice(0, 10) === td);
    const foodRows = rows.filter(r => r.fund === 'food'), diwanRows = rows.filter(r => r.fund === 'diwan');
    const bal = (fn) => (typeof FIN !== 'undefined' && FIN[fn]) ? FIN[fn]() : 0;
    return {
      fund, rows, count: rows.length, total: sum(rows),
      today: { count: todays.length, total: sum(todays) },
      byFund: { food: { count: foodRows.length, total: sum(foodRows) }, diwan: { count: diwanRows.length, total: sum(diwanRows) } },
      position: { food: R2(bal('foodBalance')), diwan: R2(bal('diwanBalance')) }
    };
  }

  function card(icon, title, question, body) {
    return '<section class="cw-card">'
      + '<header class="cw-card-h"><i class="ti ' + icon + '"></i><div><div class="cw-card-t">' + title + '</div>'
      + '<div class="cw-card-q">' + question + '</div></div></header>'
      + '<div class="cw-card-b">' + body + '</div></section>';
  }

  /* SECTION 1 · Collection Summary (STATE) — "current totals · today · position" */
  function sectionSummary(s) {
    const tiles = [
      [T('إجمالي التحصيلات', 'Total collected'), '₪ ' + M(s.total), T(s.count + ' سند', s.count + ' vouchers')],
      [T('تحصيلات اليوم', 'Collected today'), '₪ ' + M(s.today.total), T(s.today.count + ' سند اليوم', s.today.count + ' today')],
      [T('صندوق الغداء', 'Food fund'), '₪ ' + M(s.byFund.food.total), T(s.byFund.food.count + ' سند · رصيد ₪' + M(s.position.food), s.byFund.food.count + ' · bal ₪' + M(s.position.food))],
      [T('صندوق الديوان', 'Diwan fund'), '₪ ' + M(s.byFund.diwan.total), T(s.byFund.diwan.count + ' سند · رصيد ₪' + M(s.position.diwan), s.byFund.diwan.count + ' · bal ₪' + M(s.position.diwan))]
    ];
    return card('ti-cash', T('ملخص التحصيل', 'Collection Summary'), T('ما إجمالي التحصيلات وحركة اليوم والمركز الحالي؟', 'What are the totals, today’s activity, and current position?'),
      '<div class="cw-tiles">' + tiles.map(t => '<div class="cw-tile"><div class="cw-tile-k">' + t[0] + '</div><div class="cw-tile-v">' + t[1] + '</div><div class="cw-tile-s">' + t[2] + '</div></div>').join('') + '</div>');
  }

  /* SECTION 2 · Receipt Ledger (HISTORY) — certified credit rows, chronological */
  function sectionLedger(s) {
    const rows = s.rows.map(r => '<tr>'
      + '<td class="cw-c">' + (r.date === '—' ? '—' : E(r.date)) + '</td>'
      + '<td class="cw-ref">' + E(r.no || '—') + '</td>'
      + '<td>' + E(r.name || '—') + '</td>'
      + '<td class="cw-desc">' + E(r.desc || '') + '</td>'
      + '<td class="cw-c"><span class="cw-fund cw-fund-' + r.fund + '">' + fundLabel(r.fund) + '</span></td>'
      + '<td class="cw-num cw-cr">₪ ' + M(r.amount) + '</td></tr>').join('');
    const body = s.rows.length
      ? '<div class="cw-tablewrap"><table class="cw-table"><thead><tr>'
        + '<th class="cw-c">' + T('التاريخ', 'Date') + '</th><th>' + T('رقم السند', 'Voucher') + '</th>'
        + '<th>' + T('المُحصّل منه', 'From') + '</th><th>' + T('البيان', 'Description') + '</th>'
        + '<th class="cw-c">' + T('الصندوق', 'Fund') + '</th><th class="cw-num">' + T('المبلغ', 'Amount') + '</th></tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '<tfoot><tr><td colspan="5">' + T('إجمالي التحصيلات', 'Total collected') + '</td><td class="cw-num cw-cr">₪ ' + M(s.total) + '</td></tr></tfoot>'
        + '</table></div>'
      : '<div class="cw-empty"><i class="ti ti-receipt-off"></i><div>' + T('لا توجد سندات قبض في هذا النطاق', 'No receipt vouchers in this scope') + '</div></div>';
    return card('ti-receipt', T('سجل سندات القبض', 'Receipt Ledger'), T('ما سندات القبض الموجودة وحالتها المعتمدة؟', 'Which receipt vouchers exist, and their certified state?'), body);
  }

  /* SECTION 3 · Collection Timeline (HISTORY) — same certified rows, narrative */
  function sectionTimeline(s) {
    const evs = s.rows.slice(0, 40).map(r => '<li class="cw-tl-i"><span class="cw-tl-dot"></span>'
      + '<span class="cw-tl-d">' + (r.date === '—' ? T('الافتتاح', 'Opening') : E(r.date)) + '</span>'
      + '<span class="cw-tl-t">' + E(r.name || '—') + ' · ' + E(r.desc || '') + ' <span class="cw-mut">(' + fundLabel(r.fund) + ')</span></span>'
      + '<span class="cw-tl-cr">+₪ ' + M(r.amount) + '</span></li>').join('');
    return card('ti-timeline', T('الخط الزمني للتحصيل', 'Collection Timeline'), T('ماذا حدث عبر الزمن؟', 'What happened over time?'),
      '<ul class="cw-tl">' + (evs || '<li class="cw-tl-i"><span class="cw-tl-t">' + T('لا أحداث', 'No events') + '</span></li>') + '</ul>'
      + (s.rows.length > 40 ? '<div class="cw-more">' + T('عرض أحدث 40 حركة', 'showing the latest 40 events') + '</div>' : ''));
  }

  /* SECTION 4 · Workspace Navigation — prepares the operational surface with
     READ-ONLY navigation to related certified views. NO capability, NO execution
     controls, NO inactive buttons: operational capability arrives in P3-S2. */
  function sectionNav() {
    const link = (p, icon, label) => '<button class="cw-nav-lnk" onclick="window.nav&&window.nav(\'' + p + '\')"><i class="ti ' + icon + '"></i>' + label + '</button>';
    const links = [
      link('food-stmt', 'ti-file-description', T('كشف صندوق الغداء', 'Food fund statement')),
      link('diwan-stmt', 'ti-file-description', T('كشف صندوق الديوان', 'Diwan fund statement')),
      link('don', 'ti-heart-handshake', T('سجل التبرعات', 'Donations ledger'))
    ].join('');
    const note = '<div class="cw-defer"><i class="ti ti-lock"></i><span>'
      + T('القدرات التشغيلية (إصدار · تعديل · تصحيح سندات القبض) تُضاف في الشريحة الثانية P3-S2 — لا تنفيذ في هذه الشريحة.',
          'Operational capability (issue · edit · correct receipts) arrives in P3-S2 — no execution in this slice.') + '</span></div>';
    return card('ti-compass', T('التنقّل في مساحة العمل', 'Workspace Navigation'), T('إلى أين أذهب من هنا؟ (قراءة فقط)', 'Where to from here? (read-only)'),
      '<div class="cw-nav">' + links + '</div>' + note);
  }

  function fillFundTabs() {
    return [['all', T('الكل', 'All')], ['food', T('الغداء', 'Food')], ['diwan', T('الديوان', 'Diwan')]]
      .map(t => '<button class="cw-tab' + (_cwFund === t[0] ? ' on' : '') + '" onclick="window.CollectionWorkspace.setFund(\'' + t[0] + '\')">' + t[1] + '</button>').join('');
  }

  /* the workspace: the read-only operational environment for money collection */
  function renderWorkspace() {
    const out = document.getElementById('cw-out'); if (!out) return;
    if (typeof FIN === 'undefined' || !FIN.fundLedger) { out.innerHTML = ''; return; }
    const s = collectionState(_cwFund);
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question: the collection state.
    out.innerHTML = '<div class="cw-shell">'
      + '<div class="cw-hero">'
      +   '<div class="cw-hero-id"><span class="cw-hero-badge">' + T('بيئة التحصيل التشغيلية · قراءة فقط', 'Collection Operations · read-only') + '</span>'
      +     '<div class="cw-hero-name">' + T('التحصيلات', 'Collections') + '</div>'
      +     '<div class="cw-hero-q">' + T('ما التحصيلات الموجودة اليوم، وما حالتها الحالية؟', 'What collections exist today, and what is their current state?') + '</div>'
      +   '</div>'
      +   '<div class="cw-hero-state">'
      +     '<div class="cw-hero-bal">₪ ' + M(s.total) + '</div>'
      +     '<div class="cw-hero-sub">' + T(s.count + ' سند · اليوم: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')', s.count + ' vouchers · today: ' + s.today.count + ' (₪ ' + M(s.today.total) + ')') + '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="cw-tabs">' + fillFundTabs() + '</div>'
      + '<div class="cw-cols">'
      + sectionSummary(s) + sectionLedger(s) + sectionTimeline(s) + sectionNav()
      + '</div></div>';
  }

  /* entry points — all read-only; setFund is a view filter, not an operation */
  if (typeof window !== 'undefined') {
    window.renderCollectionWorkspace = renderWorkspace;
    window.openCollectionWorkspace = function () {
      if (typeof window.nav === 'function') window.nav('collection-workspace');
      setTimeout(renderWorkspace, 60);
    };
  }

  const CollectionWorkspace = {
    version: 1, collectionRows, collectionState, renderWorkspace,
    setFund(f) { _cwFund = (f === 'food' || f === 'diwan') ? f : 'all'; renderWorkspace(); }
  };
  if (typeof window !== 'undefined') window.CollectionWorkspace = CollectionWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = CollectionWorkspace;
})();
