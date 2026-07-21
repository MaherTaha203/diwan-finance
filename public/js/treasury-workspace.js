/* ═══ TREASURY · FINANCIAL POSITION — OBSERVABILITY LAYER · P5-OBS-S1 ══════════
   The first OBSERVABILITY LAYER (P5-OBS-000, approved & frozen). It sits ABOVE the
   operational Business Modules (P2 Member Lifecycle · P3 Collection · P4 Payment)
   and presents ONE unified financial position — sourced EXCLUSIVELY from certified
   Read Models. It is READ-ONLY: it executes NOTHING.

   NATURE (GOV-WS-01):
     • This is an Observability / Reporting LAYER, NOT a Business Module. It owns no
       workflow and changes no state. Because it performs no execution, GOV-WS-01
       Rule 4 (Intent → Authorization → Execution → Result) DOES NOT APPLY. Rules 1,
       2, 3, 5, 6 remain fully in force.

   BUSINESS BOUNDARY (GOV-WS-01 Rule 5):
     • OWNS — presenting the certified financial POSITION (State) and cross-fund
       MOVEMENT (History), plus read-only navigation and a read-only print/export
       affordance.
     • DOES NOT OWN — any state change. No Business Operation (BO-01…BO-10), no
       issue/edit/cancel/reclassify/split, no BO-06 deficit settlement, no approval
       workflow (GAP-P1), no liquidity guard (GAP-P2), no cash reconciliation. All
       actions remain owned by P2/P3/P4 and are reached only by NAVIGATION.

   ORCHESTRATION-FREE, PURE PROJECTION over the certified foundation:
     • DISPLAY — every value originates from a certified Read Model and equals the
       same value shown everywhere else in the app (Rule 6 — one source of
       operational truth):
         · fund positions  → FIN.foodBalance / diwanBalance / donBalance
         · deficit / net   → FIN.foodDeficitRemaining / foodNetPosition
         · reserve/support → FIN.foodSettlementReserve / foodCurrentSupportTotal /
                             foodDebtSettlementTotal
         · movement        → FIN.fundLedger(fund, from, to)  (certified cr/dr rows)
       No figure is recomputed; the combined position is a presentation SUM of the
       two certified cash treasuries (food + diwan) — never a new accounting rule.
     • EXECUTION — NONE. The layer calls no Business Operation, holds no accounting
       or correction logic, and mutates no store. The period control is a read-only
       view filter, not an operation.

   GOV-WS-01 v1.4: Rule 1 (layering — reads the core only THROUGH certified read
   models); Rule 2 (one dominant Primary Business Question); Rule 3 (State / History
   in separate sections — no operational Capability); Rule 5 (Business Boundary);
   Rule 6 (one source of operational truth). Rule 4 — N/A (no execution).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const _en = () => (typeof window !== 'undefined' && window.LANG === 'en');
  const T = (ar, en) => (_en() ? en : ar);
  const E = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = n => (typeof fmt === 'function' ? fmt(n) : String(n));
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const fundLabel = f => f === 'food' ? T('الغداء', 'Food') : f === 'diwan' ? T('الديوان', 'Diwan') : T('التبرعات', 'Donations');

  let _twPeriod = 'all';   // read-only view filter over the movement history — no execution

  /* period presets → [from, to] (inclusive). Pure view filter; computes no accounting. */
  function periodRange(period) {
    const y = new Date().getFullYear();
    if (period === 'ytd') return [y + '-01-01', ''];
    if (period === 'd90') { const d = new Date(); d.setDate(d.getDate() - 90); return [d.toISOString().slice(0, 10), '']; }
    return ['', ''];   // 'all'
  }

  /* the certified financial POSITION — a pure projection over the certified read
     models. Nothing here is computed except the presentation sum of the two
     certified cash treasuries (food + diwan); each figure equals the same certified
     value shown in the fund statements / dashboard (Rule 6). */
  function position() {
    const F = (typeof FIN !== 'undefined') ? FIN : null;
    const g = fn => (F && F[fn]) ? R2(F[fn]()) : 0;
    const food = g('foodBalance'), diwan = g('diwanBalance'), don = g('donBalance');
    const deficit = g('foodDeficitRemaining');       // ≤ 0 · remaining historical deficit
    const netFood = g('foodNetPosition');            // food + deficit
    const reserve = g('foodSettlementReserve');
    const support = g('foodCurrentSupportTotal');
    const debtSettled = g('foodDebtSettlementTotal');
    return {
      food, diwan, don,
      combined: R2(food + diwan),                    // the two certified cash treasuries
      deficit, netFood,
      netCombined: R2(netFood + diwan),              // combined position net of the historical deficit
      reserve, support, debtSettled
    };
  }

  /* the cross-fund MOVEMENT — certified credit (in) / debit (out) rows across the
     two operational cash funds over the selected period. Pure read of
     FIN.fundLedger; no accounting is computed here. */
  function movementRows(period) {
    if (typeof FIN === 'undefined' || !FIN.fundLedger) return [];
    const [from, to] = periodRange(period);
    const rows = [];
    ['food', 'diwan'].forEach(f => (FIN.fundLedger(f, from, to) || []).forEach(r => {
      if (r.type === 'cr' || r.type === 'dr') {
        rows.push({ id: r.id, date: r.date, no: r.no, name: r.name, desc: r.desc, fund: f, in: Number(r.cr || 0), out: Number(r.dr || 0), type: r.type });
      }
    }));
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));   // most recent first
    return rows;
  }

  /* movement State — a pure projection over the certified ledger rows (totals in /
     out / net flow for the period). Never a separate accounting rule. */
  function movementState(period) {
    const rows = movementRows(period);
    const totalIn = R2(rows.reduce((t, r) => t + r.in, 0));
    const totalOut = R2(rows.reduce((t, r) => t + r.out, 0));
    return { period, rows, count: rows.length, totalIn, totalOut, net: R2(totalIn - totalOut) };
  }

  function card(icon, title, question, body, span) {
    return '<section class="tw-card' + (span ? ' tw-span' : '') + '">'
      + '<header class="tw-card-h"><i class="ti ' + icon + '"></i><div><div class="tw-card-t">' + title + '</div>'
      + '<div class="tw-card-q">' + question + '</div></div></header>'
      + '<div class="tw-card-b">' + body + '</div></section>';
  }

  /* SECTION 1 · Financial Position (STATE) — per-fund positions + the combined total */
  function sectionFunds(p) {
    const tile = (kls, k, v, s) => '<div class="tw-tile ' + kls + '"><div class="tw-tile-k">' + k + '</div><div class="tw-tile-v">₪ ' + M(v) + '</div>'
      + (s ? '<div class="tw-tile-s">' + s + '</div>' : '') + '</div>';
    const tiles = [
      tile('food', T('صندوق الغداء', 'Food fund'), p.food, T('تشغيلي · العجز المتبقي ₪' + M(p.deficit), 'operational · deficit ₪' + M(p.deficit))),
      tile('diwan', T('صندوق الديوان', 'Diwan fund'), p.diwan, T('مع الافتتاحي والحركات', 'incl. opening & movements')),
      tile('don', T('إجمالي التبرعات', 'Total donations'), p.don, T('تبرعات مستلمة (مموّلة للغداء)', 'donations received (fund food)')),
      tile('total', T('المركز المجمّع', 'Combined position'), p.combined, T('الغداء + الديوان (سيولة الخزينتين)', 'food + diwan (the two treasuries)'))
    ].join('');
    return card('ti-building-bank', T('المركز المالي', 'Financial Position'),
      T('كم يملك كل صندوق الآن، وما إجمالي المركز؟', 'How much does each fund hold now, and what is the combined position?'),
      '<div class="tw-tiles">' + tiles + '</div>');
  }

  /* SECTION 2 · Position Health (STATE) — net position, deficit, reserve, support */
  function sectionHealth(p) {
    const netOk = p.netCombined >= 0;
    const fig = (kls, k, v) => '<div class="tw-fig ' + kls + '"><div class="tw-fig-k">' + k + '</div><div class="tw-fig-v">₪ ' + M(v) + '</div></div>';
    const figs = [
      fig(netOk ? 'green' : 'red', T('صافي المركز المجمّع', 'Net combined position'), p.netCombined),
      fig(netOk ? 'green' : 'red', T('صافي مركز صندوق الغداء', 'Net Food-fund position'), p.netFood),
      fig(p.deficit < 0 ? 'red' : '', T('العجز التاريخي المتبقي', 'Remaining historical deficit'), p.deficit),
      fig('', T('احتياطي التسوية', 'Settlement reserve'), p.reserve),
      fig('', T('إجمالي الدعم الحالي', 'Current support total'), p.support),
      fig('', T('إجمالي تسوية الذمم', 'Debt-settlement total'), p.debtSettled)
    ].join('');
    const verdict = netOk
      ? '<span class="tw-verdict ok"><i class="ti ti-shield-check"></i>' + T('المركز موجب — سليم', 'position is positive — healthy') + '</span>'
      : '<span class="tw-verdict warn"><i class="ti ti-alert-triangle"></i>' + T('المركز سالب — يتطلب انتباهًا', 'position is negative — needs attention') + '</span>';
    return card('ti-heart-rate-monitor', T('سلامة المركز', 'Position Health'),
      T('هل المركز المالي سليم بعد خصم العجز التاريخي؟', 'Is the position healthy once the historical deficit is netted out?'),
      '<div class="tw-figs">' + figs + '</div><div class="tw-verdict-row">' + verdict + '</div>');
  }

  /* SECTION 3 · Cross-Fund Movement (HISTORY) — certified cr/dr rows over the period */
  function sectionMovement(s) {
    const rows = s.rows.map(r => '<tr>'
      + '<td class="tw-c">' + (r.date === '—' || !r.date ? '—' : E(r.date)) + '</td>'
      + '<td class="tw-ref">' + E(r.no || '—') + '</td>'
      + '<td><span class="tw-fund tw-fund-' + r.fund + '">' + fundLabel(r.fund) + '</span></td>'
      + '<td>' + E(r.name || '—') + '</td>'
      + '<td class="tw-desc">' + E(r.desc || '') + '</td>'
      + '<td class="tw-num tw-in">' + (r.in ? '₪ ' + M(r.in) : '—') + '</td>'
      + '<td class="tw-num tw-out">' + (r.out ? '₪ ' + M(r.out) : '—') + '</td></tr>').join('');
    const body = s.rows.length
      ? '<div class="tw-tablewrap"><table class="tw-table"><thead><tr>'
        + '<th class="tw-c">' + T('التاريخ', 'Date') + '</th><th>' + T('السند', 'Voucher') + '</th>'
        + '<th>' + T('الصندوق', 'Fund') + '</th><th>' + T('الطرف', 'Party') + '</th><th>' + T('البيان', 'Description') + '</th>'
        + '<th class="tw-num">' + T('وارد', 'In') + '</th><th class="tw-num">' + T('صادر', 'Out') + '</th></tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '<tfoot><tr><td colspan="5">' + T('إجمالي الحركة للفترة', 'Movement total for the period') + '</td>'
        + '<td class="tw-num tw-in">₪ ' + M(s.totalIn) + '</td><td class="tw-num tw-out">₪ ' + M(s.totalOut) + '</td></tr></tfoot>'
        + '</table></div>'
      : '<div class="tw-empty"><i class="ti ti-arrows-exchange-off"></i><div>' + T('لا حركة في هذه الفترة', 'No movement in this period') + '</div></div>';
    return card('ti-arrows-exchange', T('حركة الأموال عبر الصناديق', 'Cross-Fund Movement'),
      T('كيف تحرّكت الأموال دخولًا وخروجًا في هذه الفترة؟', 'How did money move in and out over this period?'), body, true);
  }

  /* SECTION 4 · Movement Timeline (HISTORY) — the same certified rows, narrative */
  function sectionTimeline(s) {
    const evs = s.rows.slice(0, 40).map(r => '<li class="tw-tl-i"><span class="tw-tl-dot tw-tl-' + r.type + '"></span>'
      + '<span class="tw-tl-d">' + (r.date === '—' || !r.date ? T('الافتتاح', 'Opening') : E(r.date)) + '</span>'
      + '<span class="tw-tl-t">' + E(r.name || '—') + ' · ' + E(r.desc || '') + ' <span class="tw-mut">(' + fundLabel(r.fund) + ')</span></span>'
      + (r.in ? '<span class="tw-tl-in">+₪ ' + M(r.in) + '</span>' : '<span class="tw-tl-out">−₪ ' + M(r.out) + '</span>') + '</li>').join('');
    return card('ti-timeline', T('الخط الزمني للحركة', 'Movement Timeline'),
      T('كيف وصل المركز إلى حالته الحالية؟', 'How did the position reach its current state?'),
      '<ul class="tw-tl">' + (evs || '<li class="tw-tl-i"><span class="tw-tl-t">' + T('لا أحداث', 'No events') + '</span></li>') + '</ul>'
      + (s.rows.length > 40 ? '<div class="tw-more">' + T('عرض أحدث 40 حركة', 'showing the latest 40 events') + '</div>' : ''), true);
  }

  /* SECTION 5 · Read-only navigation & export. NOT a Capability (no execution);
     kept a separate section (Rule 3). Every action here either NAVIGATES to the
     operational workspace / certified statement that owns the action, or prints the
     current read-only view. No Business Operation, no mutation. */
  function sectionNav() {
    const link = (p, icon, label) => '<button class="tw-nav-lnk" onclick="window.nav&&window.nav(\'' + p + '\')"><i class="ti ' + icon + '"></i>' + label + '</button>';
    const links = [
      link('food-stmt', 'ti-file-description', T('كشف صندوق الغداء', 'Food fund statement')),
      link('diwan-stmt', 'ti-file-description', T('كشف صندوق الديوان', 'Diwan fund statement')),
      link('don', 'ti-heart', T('سجل التبرعات', 'Donations register')),
      link('collection-workspace', 'ti-cash', T('بيئة التحصيل', 'Collection workspace')),
      link('payment-workspace', 'ti-cash-banknote', T('بيئة الصرف', 'Payment workspace'))
    ].join('');
    const exp = '<button class="tw-nav-lnk tw-nav-exp" onclick="window.TreasuryWorkspace.printPosition()"><i class="ti ti-printer"></i>'
      + T('طباعة / تصدير المركز (قراءة فقط)', 'Print / export position (read-only)') + '</button>';
    const note = '<div class="tw-nav-note"><i class="ti ti-eye"></i><span>'
      + T('طبقة رصد فقط — لا تنفّذ أي عملية. كل إجراء فعلي يُنفّذ في بيئة العمل التشغيلية التي تملكه (P2/P3/P4). القاعدة 4 لا تنطبق.',
          'Observability only — it executes nothing. Every real action is performed in the operational workspace that owns it (P2/P3/P4). Rule 4 does not apply.') + '</span></div>';
    return card('ti-compass', T('التنقّل والتصدير', 'Navigation & Export'),
      T('أين أذهب لأتصرّف، وكيف أصدّر ما أراه؟', 'Where do I go to act, and how do I export what I see?'),
      '<div class="tw-nav">' + links + exp + '</div>' + note, true);
  }

  function fillPeriodTabs() {
    return [['all', T('كل الفترات', 'All time')], ['ytd', T('هذه السنة', 'This year')], ['d90', T('آخر ٩٠ يومًا', 'Last 90 days')]]
      .map(t => '<button class="tw-tab' + (_twPeriod === t[0] ? ' on' : '') + '" onclick="window.TreasuryWorkspace.setPeriod(\'' + t[0] + '\')">' + t[1] + '</button>').join('');
  }

  /* the observability layer: the read-only unified financial-position view */
  function renderWorkspace() {
    const out = document.getElementById('tw-out'); if (!out) return;
    if (typeof FIN === 'undefined' || !FIN.fundLedger) { out.innerHTML = ''; return; }
    const p = position();
    const s = movementState(_twPeriod);
    const netOk = p.netCombined >= 0;
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question. As an OBSERVABILITY
    // layer it leads with the position itself (the combined liquidity), with the net
    // position as the supporting health figure. There is NO operational CTA — the
    // layer executes nothing (Rule 4 N/A); the hero carries a read-only marker.
    out.innerHTML = '<div class="tw-shell">'
      + '<div class="tw-hero">'
      +   '<div class="tw-hero-id"><span class="tw-hero-badge">' + T('طبقة الرصد المالي', 'Financial Observability') + '</span>'
      +     '<div class="tw-hero-name">' + T('الخزينة والمركز المالي', 'Treasury & Financial Position') + '</div>'
      +     '<div class="tw-hero-q">' + T('ما المركز المالي الحالي للمؤسسة، وكيف وصل إلى هذه الحالة؟', 'What is the organization’s current financial position, and how did it reach this state?') + '</div>'
      +   '</div>'
      +   '<div class="tw-hero-state">'
      +     '<div class="tw-hero-bal">₪ ' + M(p.combined) + '</div>'
      +     '<div class="tw-hero-sub">' + T('المركز المجمّع · الصافي (بعد العجز): ₪ ' + M(p.netCombined), 'combined position · net (after deficit): ₪ ' + M(p.netCombined)) + '</div>'
      +     '<span class="tw-hero-flag ' + (netOk ? 'ok' : 'warn') + '"><i class="ti ' + (netOk ? 'ti-eye-check' : 'ti-eye-exclamation') + '"></i>'
      +       T('رصد فقط · لا تنفيذ', 'observation only · no execution') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="tw-tabs">' + fillPeriodTabs() + '</div>'
      + '<div class="tw-cols">'
      + sectionFunds(p) + sectionHealth(p) + sectionMovement(s) + sectionTimeline(s) + sectionNav()
      + '</div></div>';
  }

  /* entry points — all read-only; setPeriod is a view filter, not an operation */
  if (typeof window !== 'undefined') {
    window.renderTreasuryWorkspace = renderWorkspace;
    window.openTreasuryWorkspace = function () {
      if (typeof window.nav === 'function') window.nav('treasury-workspace');
      setTimeout(renderWorkspace, 60);
    };
  }

  const TreasuryWorkspace = {
    version: 1, position, movementRows, movementState, periodRange, renderWorkspace,
    setPeriod(pr) { _twPeriod = (pr === 'ytd' || pr === 'd90') ? pr : 'all'; renderWorkspace(); },
    /* read-only export: prints the current view via the browser. No accounting, no
       mutation — a pure read affordance. Certified per-fund Excel/PDF export remains
       available by NAVIGATING to the fund statements. */
    printPosition() { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); }
  };
  if (typeof window !== 'undefined') window.TreasuryWorkspace = TreasuryWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = TreasuryWorkspace;
})();
