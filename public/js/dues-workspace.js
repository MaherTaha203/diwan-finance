/* ═══ ANNUAL SUBSCRIPTIONS / DUES WORKSPACE — P-DUES · Slice 1 (READ-ONLY) ═════
   The fourth Operational Business Module surface (P-DUES-000, approved & frozen),
   built under GOV-WS-01 v1.5. This is the FIRST slice: VISIBILITY BEFORE
   CAPABILITY — it presents the annual-dues State and History and executes NOTHING.
   The write path (apply dues → BO-10, onboard → BO-07) belongs EXCLUSIVELY to
   P-DUES-S2 and is NOT present here.

   BUSINESS QUESTION (this slice):
     "What is the subscription status for the selected membership year, and what
      historical dues information is available?"

   BUSINESS BOUNDARY (GOV-WS-01 Rule 5):
     • OWNS (this slice) — presenting the annual-dues State (per selected year:
       billed? · per-member obligation · eligible member count · total due / paid /
       outstanding) and History (the dues-schedule evolution), read-only, with year
       navigation, filtering, searching, and a read-only print/export.
     • DOES NOT OWN — any write path. NO apply-dues, NO BO-10 / BO-07 execution, NO
       admin action, NO year creation / schedule modification / reversal / allocation,
       NO payment, NO approval, NO liquidity control. Capability is P-DUES-S2's alone.

   READ-ONLY PROJECTION over the certified financial surface (GOV-WS-01 v1.5):
     • Every displayed value originates from an EXISTING certified read model / store:
         · year set        → FIN.subscriptionYears()
         · per-member/year  → FIN.memberDelinquency(memberId).byYear[year] (due/paid/
                              remaining/settled)
         · per-year totals  → the SAME projection the certified Annual-Debt report
                              presents: sum of the stored due_amount_ils / paid_amount_ils
                              over that year's member_subscriptions (DB.subscriptions)
         · schedule history → DB.annual (year · amount · member_count · applied_by ·
                              applied_at) — the certified annual_dues store
       No new Read Model, no new Business Operation, no accounting logic, no new
       calculation, no duplicated financial state, no second source of operational
       truth. Rendering mutates NO store.
     • This is an Observability-style read-only slice of an Operational Module: it
       remains year-oriented, owns no accounting logic and no financial state, and
       ORCHESTRATES NOTHING. (Rule 4 has no execution to govern in this slice.)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const _en = () => (typeof window !== 'undefined' && window.LANG === 'en');
  const T = (ar, en) => (_en() ? en : ar);
  const E = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = n => (typeof fmt === 'function' ? fmt(n) : String(n));
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

  let _dwYear = null;      // selected membership year (read-only view state)
  let _dwFilter = 'all';   // member-list filter: all | outstanding | settled (read-only)
  let _dwSearch = '';      // member-list search text (read-only)

  /* the certified set of membership years (billed / scheduled) */
  function years() {
    if (typeof FIN !== 'undefined' && FIN.subscriptionYears) return (FIN.subscriptionYears() || []).slice();
    const ys = new Set();
    (typeof DB !== 'undefined' ? (DB.subscriptions || []) : []).forEach(s => { if (s.year != null) ys.add(Number(s.year)); });
    return Array.from(ys).sort((a, b) => a - b);
  }

  function _defaultYear() {
    const ys = years();
    return ys.length ? ys[ys.length - 1] : null;   // most recent year
  }

  /* per-member rows for a year — from the certified FIN.memberDelinquency read model.
     Pure read; no accounting is computed here. */
  function memberRows(year) {
    if (typeof DB === 'undefined' || typeof FIN === 'undefined' || !FIN.memberDelinquency) return [];
    const rows = [];
    (DB.members || []).filter(m => m.is_active !== false).forEach(m => {
      const by = (FIN.memberDelinquency(m.id) || {}).byYear || {};
      const cell = by[year];
      if (!cell) return;   // member not scheduled that year
      rows.push({
        id: m.id, code: m.member_code || '—', name: m.name || '—', phone: m.phone || '',
        due: R2(cell.due), paid: R2(cell.paid), remaining: R2(cell.remaining), settled: !!cell.settled
      });
    });
    return rows.sort((a, b) => b.remaining - a.remaining);
  }

  /* the annual-dues STATE for a year — a pure projection over the certified surface.
     Per-year totals are the SAME summation the certified Annual-Debt report presents
     (sum of stored due/paid), never a new accounting rule. */
  function yearState(year) {
    const rows = memberRows(year);
    const due = R2(rows.reduce((t, r) => t + r.due, 0));
    const paid = R2(rows.reduce((t, r) => t + r.paid, 0));
    const outstanding = R2(due - paid);
    const rec = (typeof DB !== 'undefined' ? (DB.annual || []) : []).find(a => Number(a.year) === Number(year)) || null;
    const eligible = rec && rec.member_count != null ? Number(rec.member_count) : rows.length;
    const perMember = rec && rec.amount != null ? R2(rec.amount) : (rows.length ? R2(rows[0].due) : 0);
    return {
      year, rows, billed: !!rec, perMember, eligible, due, paid, outstanding,
      settledCount: rows.filter(r => r.settled).length,
      outstandingCount: rows.filter(r => !r.settled).length,
      appliedAt: rec ? (rec.applied_at ? String(rec.applied_at).slice(0, 10) : '—') : '—',
      appliedBy: rec ? (rec.applied_by || '—') : '—'
    };
  }

  /* the dues-schedule HISTORY — the certified annual_dues store, chronological */
  function schedule() {
    const arr = (typeof DB !== 'undefined' ? (DB.annual || []) : []).slice();
    return arr.map(a => ({
      year: Number(a.year), amount: R2(a.amount), memberCount: a.member_count != null ? Number(a.member_count) : null,
      appliedBy: a.applied_by || '—', appliedAt: a.applied_at ? String(a.applied_at).slice(0, 10) : '—',
      total: R2(Number(a.amount || 0) * Number(a.member_count || 0))
    })).sort((a, b) => b.year - a.year);
  }

  function card(icon, title, question, body, span) {
    return '<section class="dw-card' + (span ? ' dw-span' : '') + '">'
      + '<header class="dw-card-h"><i class="ti ' + icon + '"></i><div><div class="dw-card-t">' + title + '</div>'
      + '<div class="dw-card-q">' + question + '</div></div></header>'
      + '<div class="dw-card-b">' + body + '</div></section>';
  }

  /* SECTION 1 · Subscription Status (STATE) — the selected year at a glance */
  function sectionStatus(s) {
    const badge = s.billed
      ? '<span class="dw-badge on"><i class="ti ti-check"></i>' + T('مُطبَّقة', 'Billed') + '</span>'
      : '<span class="dw-badge off"><i class="ti ti-minus"></i>' + T('غير مُطبَّقة', 'Not billed') + '</span>';
    const tiles = [
      [T('حالة السنة', 'Year status'), badge, s.billed ? T('طُبِّقت ' + s.appliedAt + ' · ' + s.appliedBy, 'applied ' + s.appliedAt + ' · ' + s.appliedBy) : T('لم تُطبَّق بعد', 'not applied yet')],
      [T('قيمة الاشتراك السنوي', 'Annual obligation'), '₪ ' + M(s.perMember), T('للعضو الواحد', 'per member')],
      [T('عدد الأعضاء المشمولين', 'Eligible members'), String(s.eligible), T(s.outstandingCount + ' متبقّي · ' + s.settledCount + ' مسدَّد', s.outstandingCount + ' outstanding · ' + s.settledCount + ' settled')],
      [T('إجمالي الالتزام', 'Total obligation'), '₪ ' + M(s.due), T('مدفوع ₪' + M(s.paid), 'paid ₪' + M(s.paid))],
      [T('المتبقّي على السنة', 'Outstanding'), '₪ ' + M(s.outstanding), T('التزام − مدفوع', 'obligation − paid')]
    ];
    return card('ti-calendar-stats', T('حالة اشتراك السنة', 'Subscription Status'),
      T('ما حالة اشتراك السنة المحددة الآن؟', 'What is the subscription status for the selected year?'),
      '<div class="dw-tiles">' + tiles.map(t => '<div class="dw-tile"><div class="dw-tile-k">' + t[0] + '</div><div class="dw-tile-v">' + t[1] + '</div><div class="dw-tile-s">' + t[2] + '</div></div>').join('') + '</div>');
  }

  /* SECTION 2 · Members this year (STATE) — read-only per-member table + search/filter.
     NO execution controls: names link to the certified member statement (navigation). */
  function sectionMembers(s) {
    let rows = s.rows;
    if (_dwFilter === 'outstanding') rows = rows.filter(r => !r.settled);
    else if (_dwFilter === 'settled') rows = rows.filter(r => r.settled);
    const q = _dwSearch.trim().toLowerCase();
    if (q) rows = rows.filter(r => (r.name + ' ' + r.code + ' ' + r.phone).toLowerCase().includes(q));
    const chips = [['all', T('الكل', 'All')], ['outstanding', T('متبقّي', 'Outstanding')], ['settled', T('مسدَّد', 'Settled')]]
      .map(c => '<button class="dw-chip' + (_dwFilter === c[0] ? ' on' : '') + '" onclick="window.DuesWorkspace.setFilter(\'' + c[0] + '\')">' + c[1] + '</button>').join('');
    const search = '<input class="dw-search" type="search" placeholder="' + T('بحث بالاسم / الرقم / الهاتف', 'search name / code / phone') + '" '
      + 'value="' + E(_dwSearch) + '" oninput="window.DuesWorkspace.setSearch(this.value)">';
    const body = rows.length
      ? '<div class="dw-tablewrap"><table class="dw-table"><thead><tr>'
        + '<th>' + T('رقم', 'No.') + '</th><th>' + T('العضو', 'Member') + '</th>'
        + '<th class="dw-num">' + T('مستحق', 'Due') + '</th><th class="dw-num">' + T('مدفوع', 'Paid') + '</th>'
        + '<th class="dw-num">' + T('متبقٍّ', 'Remaining') + '</th><th class="dw-c">' + T('الحالة', 'Status') + '</th></tr></thead><tbody>'
        + rows.map(r => '<tr>'
          + '<td class="dw-c">' + E(r.code) + '</td>'
          + '<td><span class="dw-lnk" onclick="window.nav&&window.openPersonStmt&&window.openPersonStmt(\'' + E(r.id) + '\')">' + E(r.name) + '</span>' + (r.phone ? ' <span class="dw-mut">· ' + E(r.phone) + '</span>' : '') + '</td>'
          + '<td class="dw-num">₪ ' + M(r.due) + '</td><td class="dw-num dw-paid">₪ ' + M(r.paid) + '</td>'
          + '<td class="dw-num ' + (r.remaining > 0.005 ? 'dw-rem' : '') + '">₪ ' + M(r.remaining) + '</td>'
          + '<td class="dw-c">' + (r.settled ? '<span class="dw-st ok">' + T('مسدَّد', 'settled') + '</span>' : '<span class="dw-st due">' + T('متبقّي', 'outstanding') + '</span>') + '</td></tr>').join('')
        + '</tbody><tfoot><tr><td colspan="2">' + T('الإجمالي (' + rows.length + ')', 'Total (' + rows.length + ')') + '</td>'
        + '<td class="dw-num">₪ ' + M(R2(rows.reduce((t, r) => t + r.due, 0))) + '</td><td class="dw-num dw-paid">₪ ' + M(R2(rows.reduce((t, r) => t + r.paid, 0))) + '</td>'
        + '<td class="dw-num dw-rem">₪ ' + M(R2(rows.reduce((t, r) => t + r.remaining, 0))) + '</td><td></td></tr></tfoot></table></div>'
      : '<div class="dw-empty"><i class="ti ti-user-off"></i><div>' + T('لا أعضاء مطابقون في هذه السنة', 'No matching members for this year') + '</div></div>';
    return card('ti-users', T('أعضاء السنة', 'Members this Year'),
      T('من المشمول بالسنة المحددة، وما المتبقّي على كل عضو؟', 'Who is included this year, and what remains per member?'),
      '<div class="dw-toolbar">' + search + '<div class="dw-chips">' + chips + '</div></div>' + body, true);
  }

  /* SECTION 3 · Dues Schedule (HISTORY) — the certified annual_dues store */
  function sectionSchedule(sel) {
    const sch = schedule();
    const body = sch.length
      ? '<div class="dw-tablewrap"><table class="dw-table"><thead><tr>'
        + '<th class="dw-c">' + T('السنة', 'Year') + '</th><th class="dw-num">' + T('قيمة الاشتراك', 'Amount') + '</th>'
        + '<th class="dw-num">' + T('عدد الأعضاء', 'Members') + '</th><th class="dw-num">' + T('إجمالي الالتزام', 'Total') + '</th>'
        + '<th>' + T('طُبِّقت', 'Applied') + '</th><th>' + T('بواسطة', 'By') + '</th></tr></thead><tbody>'
        + sch.map(a => '<tr' + (Number(a.year) === Number(sel) ? ' class="dw-sel"' : '') + '>'
          + '<td class="dw-c"><button class="dw-yearlnk" onclick="window.DuesWorkspace.setYear(' + a.year + ')">' + a.year + '</button></td>'
          + '<td class="dw-num">₪ ' + M(a.amount) + '</td>'
          + '<td class="dw-num">' + (a.memberCount == null ? '—' : a.memberCount) + '</td>'
          + '<td class="dw-num">₪ ' + M(a.total) + '</td>'
          + '<td>' + E(a.appliedAt) + '</td><td>' + E(a.appliedBy) + '</td></tr>').join('')
        + '</tbody></table></div>'
      : '<div class="dw-empty"><i class="ti ti-calendar-off"></i><div>' + T('لم تُطبَّق أي سنة اشتراك بعد', 'No subscription year has been applied yet') + '</div></div>';
    return card('ti-history', T('تاريخ جدول الاشتراكات', 'Dues Schedule History'),
      T('كيف تطوّر جدول الاشتراكات عبر السنوات؟', 'How did the dues schedule evolve over the years?'), body, true);
  }

  /* SECTION 4 · read-only navigation & export. NOT capability (no execution, Rule 3). */
  function sectionNav() {
    const link = (p, icon, label) => '<button class="dw-nav-lnk" onclick="window.nav&&window.nav(\'' + p + '\')"><i class="ti ' + icon + '"></i>' + label + '</button>';
    const links = [
      link('annual-debt', 'ti-report-money', T('تقرير المديونية السنوية', 'Annual debt report')),
      link('delinquent', 'ti-user-exclamation', T('الأعضاء المتأخرون', 'Delinquent members')),
      link('members', 'ti-users', T('أعضاء العائلة', 'Family members'))
    ].join('');
    const exp = '<button class="dw-nav-lnk dw-nav-exp" onclick="window.DuesWorkspace.printView()"><i class="ti ti-printer"></i>'
      + T('طباعة / تصدير (قراءة فقط)', 'Print / export (read-only)') + '</button>';
    const note = '<div class="dw-nav-note"><i class="ti ti-eye"></i><span>'
      + T('عرض للقراءة فقط — لا تُنفَّذ أي عملية. تطبيق الاشتراك السنوي وإضافة عضو (القدرة) يخصّان الشريحة التالية P-DUES-S2 حصريًا.',
          'Read-only view — no operation is executed. Applying annual dues and onboarding a member (Capability) belong exclusively to the next slice, P-DUES-S2.') + '</span></div>';
    return card('ti-compass', T('التنقّل والتصدير', 'Navigation & Export'),
      T('أين أطالع تفاصيل أكثر، وكيف أصدّر ما أراه؟', 'Where can I see more, and how do I export what I see?'),
      '<div class="dw-nav">' + links + exp + '</div>' + note, true);
  }

  function fillYearTabs(sel) {
    const ys = years();
    if (!ys.length) return '<span class="dw-mut">' + T('لا سنوات اشتراك', 'no subscription years') + '</span>';
    return ys.slice().sort((a, b) => b - a)
      .map(y => '<button class="dw-tab' + (Number(y) === Number(sel) ? ' on' : '') + '" onclick="window.DuesWorkspace.setYear(' + y + ')">' + y + '</button>').join('');
  }

  /* the workspace: the read-only annual-dues State + History environment */
  function renderWorkspace() {
    const out = document.getElementById('dw-out'); if (!out) return;
    if (typeof FIN === 'undefined' || !FIN.subscriptionYears) { out.innerHTML = ''; return; }
    if (_dwYear == null) _dwYear = _defaultYear();
    const ys = years();
    if (!ys.length) {
      out.innerHTML = '<div class="dw-shell"><div class="dw-empty" style="padding:56px 16px"><i class="ti ti-calendar-off"></i>'
        + '<div>' + T('لا توجد سنوات اشتراك بعد', 'No subscription years yet') + '</div></div></div>';
      return;
    }
    const s = yearState(_dwYear);
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question. As a READ-ONLY slice
    // it leads with the selected year's subscription status (the outstanding as the
    // dominant state figure — one projection of the certified surface, Rule 6). There
    // is NO execution CTA (Capability is P-DUES-S2); the hero carries a read-only marker.
    out.innerHTML = '<div class="dw-shell">'
      + '<div class="dw-hero">'
      +   '<div class="dw-hero-id"><span class="dw-hero-badge">' + T('الاشتراكات السنوية', 'Annual Subscriptions') + '</span>'
      +     '<div class="dw-hero-name">' + T('اشتراكات سنة ', 'Membership Year ') + s.year + '</div>'
      +     '<div class="dw-hero-q">' + T('ما حالة اشتراك السنة المحددة، وما معلومات الاشتراكات التاريخية المتاحة؟', 'What is the subscription status for the selected membership year, and what historical dues information is available?') + '</div>'
      +   '</div>'
      +   '<div class="dw-hero-state">'
      +     '<div class="dw-hero-bal">₪ ' + M(s.outstanding) + '</div>'
      +     '<div class="dw-hero-sub">' + T('المتبقّي على السنة · ' + s.eligible + ' عضو · التزام ₪' + M(s.due), 'outstanding · ' + s.eligible + ' members · obligation ₪' + M(s.due)) + '</div>'
      +     '<span class="dw-hero-flag"><i class="ti ti-eye-check"></i>' + T('عرض فقط · لا تنفيذ', 'read-only · no execution') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="dw-tabs">' + fillYearTabs(s.year) + '</div>'
      + '<div class="dw-cols">'
      + sectionStatus(s) + sectionMembers(s) + sectionSchedule(s.year) + sectionNav()
      + '</div></div>';
  }

  /* entry points — all read-only; setYear/setFilter/setSearch are view state, not operations */
  if (typeof window !== 'undefined') {
    window.renderDuesWorkspace = renderWorkspace;
    window.openDuesWorkspace = function () {
      if (typeof window.nav === 'function') window.nav('dues-workspace');
      setTimeout(renderWorkspace, 60);
    };
  }

  const DuesWorkspace = {
    version: 1, years, yearState, memberRows, schedule, renderWorkspace,
    setYear(y) { _dwYear = Number(y); renderWorkspace(); },
    setFilter(f) { _dwFilter = (f === 'outstanding' || f === 'settled') ? f : 'all'; renderWorkspace(); },
    setSearch(q) { _dwSearch = String(q == null ? '' : q); renderWorkspace(); },
    /* read-only export: prints the current view via the browser. No accounting, no
       mutation — a pure read affordance (platform convention, as in P5). */
    printView() { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); }
  };
  if (typeof window !== 'undefined') window.DuesWorkspace = DuesWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = DuesWorkspace;
})();
