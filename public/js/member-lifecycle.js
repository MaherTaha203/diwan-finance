/* ═══ MEMBER FINANCIAL LIFECYCLE — P2 · Slice 1 (read-only module) ═══════════
   The first Business Module surface (P2-000). It ORCHESTRATES the certified
   Business Operations and the certified read model into the member's financial
   lifecycle; it performs NO accounting logic of its own.

   Slice 1 scope (owner-narrowed): Onboarding (BO-07) + Annual Billing (BO-10) +
   the member's INITIAL-STATE view. Onboarding and billing are already provided by
   the certified operations (window.BusinessOps.createMember / applyAnnualDues);
   this module adds only the read-only initial-state projection and its view.

   `initialState` is a pure projection over the certified read model:
     opening position (the member's carried opening) + the generated dues schedule
     (member_subscriptions) → the member's STARTING balance (opening + dues, before
     any payment). It introduces no second source of truth and no new calculation:
     opening and dues are read verbatim from the certified inputs; startingBalance
     is their sum, i.e. the member's balance at the initial (pre-payment) state.

   NOT in this slice: payment recording, corrections, allocation (deferred).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const money = n => (typeof fmt === 'function' ? fmt(n) : String(n));

  /* the member's lifecycle starting point, derived from the certified read model */
  function initialState(memberId) {
    const members = (typeof DB !== 'undefined' && DB.members) || [];
    const subs = (typeof DB !== 'undefined' && DB.subscriptions) || [];
    const m = members.find(x => x.id === memberId);
    if (!m) return null;
    // opening = the member's carried net position (same inputs the engine reads)
    const opening = R2(Number(m.historical_balance_ils || 0) - Number(m.historical_payments_ils || 0));
    const schedule = subs
      .filter(s => s.member_id === memberId)
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map(s => ({ year: Number(s.year), due: R2(Number(s.due_amount_ils || 0)) }));
    const totalDues = R2(schedule.reduce((t, r) => t + r.due, 0));
    const startingBalance = R2(opening + totalDues);      // opening + billed dues, before any payment
    const stage = schedule.length ? 'billed' : (m ? 'onboarded' : 'none');
    return { memberId, opening, schedule, totalDues, startingBalance, stage };
  }

  /* read-only initial-state card (presentation only; theme-aware via app CSS vars) */
  function initialStateCard(memberId, en) {
    const s = initialState(memberId);
    if (!s) return '';
    const T = (ar, e) => (en ? e : ar);
    const pol = v => v > 0 ? T('مدين', 'Dr') : v < 0 ? T('دائن', 'Cr') : '';
    const chips = s.schedule.length
      ? s.schedule.map(r => '<span style="display:inline-block;padding:3px 9px;margin:2px;border:1px solid var(--bd);border-radius:999px;font-size:12px;background:var(--bg2)">'
          + r.year + ': ₪ ' + money(r.due) + '</span>').join('')
      : '<span style="color:var(--tx3);font-size:12px">' + T('لا توجد استحقاقات بعد', 'no dues billed yet') + '</span>';
    return '<div class="mlc-initial" style="margin:12px 0;border:1px solid var(--bd);border-radius:12px;overflow:hidden">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--bd)">'
      +   '<strong style="font-size:13px">' + T('الحالة الأولية للعضو', 'Member Initial State') + '</strong>'
      +   '<span style="font-size:11px;color:var(--tx3)">' + T('مشتقّة من المحرك المعتمد', 'derived from the certified engine') + '</span>'
      + '</div>'
      + '<div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;font-size:13px">'
      +   '<div><span style="color:var(--tx3)">' + T('الرصيد الافتتاحي', 'Opening') + '</span> · <strong>₪ ' + money(Math.abs(s.opening)) + (pol(s.opening) ? ' ' + pol(s.opening) : '') + '</strong></div>'
      +   '<div style="flex:1;min-width:180px"><span style="color:var(--tx3)">' + T('جدول الاستحقاقات', 'Dues schedule') + '</span><div style="margin-top:4px">' + chips + '</div></div>'
      +   '<div><span style="color:var(--tx3)">' + T('الرصيد الابتدائي', 'Starting balance') + '</span> · <strong>₪ ' + money(Math.abs(s.startingBalance)) + (pol(s.startingBalance) ? ' ' + pol(s.startingBalance) : '') + '</strong></div>'
      + '</div>'
      + '</div>';
  }

  /* ═══ P2 · Slice 2 — MEMBER FINANCIAL LIFECYCLE WORKSPACE ══════════════════
     Extends Slice 1 (never replaces it). A dedicated, task-oriented workspace that
     represents ONE member's financial unit. Every section answers one business
     question and is ORCHESTRATION ONLY: all data comes from certified read models
     (FIN.memberStatement / memberDelinquency / MemberLifecycle.initialState) and
     every action invokes an existing certified Business Operation. No accounting
     logic, no new calculation, no second source of truth. */
  const _en = () => (typeof window !== 'undefined' && window.LANG === 'en');
  const T = (ar, en) => (_en() ? en : ar);
  const E = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = n => (typeof fmt === 'function' ? fmt(n) : String(n));
  const polTag = v => v > 0 ? '<span class="as-pol as-pol-dr">' + T('على العضو', 'owes') + '</span>'
    : v < 0 ? '<span class="as-pol as-pol-cr">' + T('له رصيد', 'credit') + '</span>' : '';

  function fillWorkspaceSelect() {
    const sel = document.getElementById('mw-member'); if (!sel) return;
    const cur = sel.value;
    const list = ((typeof DB !== 'undefined' && DB.members) || []).filter(m => m.is_active !== false);
    sel.innerHTML = '<option value="">' + T('— اختر عضواً —', '— choose a member —') + '</option>'
      + list.map(m => '<option value="' + m.id + '">' + E(m.name) + '</option>').join('');
    if (cur) sel.value = cur;
  }

  /* SECTION 1 · Member Summary — "Who is this member?" */
  function sectionSummary(m) {
    const rows = [
      [T('الاسم', 'Name'), E(m.name)],
      [T('رقم العضو', 'Member no.'), E(m.member_code || '—')],
      [T('الهاتف', 'Phone'), E(m.phone || '—')],
      [T('عضو منذ سنة', 'Active from'), E(m.active_from_year || '—')],
      [T('الحالة', 'Status'), m.is_active === false ? '<span class="badge red">' + T('غير نشط', 'Inactive') + '</span>' : '<span class="badge green">' + T('نشط', 'Active') + '</span>']
    ];
    return card('ti-user', T('بطاقة العضو', 'Member Summary'), T('من هو هذا العضو؟', 'Who is this member?'),
      '<div class="mw-grid">' + rows.map(r => '<div class="mw-kv"><span class="mw-k">' + r[0] + '</span><span class="mw-v">' + r[1] + '</span></div>').join('')
      + (m.notes ? '<div class="mw-kv mw-kv-wide"><span class="mw-k">' + T('ملاحظات', 'Notes') + '</span><span class="mw-v">' + E(m.notes) + '</span></div>' : '') + '</div>');
  }

  /* SECTION 2 · Financial Status — "What is the current financial state?" */
  function sectionStatus(st, del, init) {
    const bal = st.finalBalance;
    const delTxt = del.isDelinquent
      ? '<span class="badge red">' + T('متأخر · ' + del.unpaidCount + ' سنة', del.unpaidCount + ' unpaid year(s)') + '</span>'
      : '<span class="badge green">' + T('منتظم', 'Up to date') + '</span>';
    const tiles = [
      [T('الرصيد الحالي', 'Current balance'), '₪ ' + M(Math.abs(bal)) + ' ' + polTag(bal)],
      [T('الحالة', 'Standing'), delTxt],
      [T('الرصيد الابتدائي (بعد التسجيل والفوترة)', 'Initial balance (after onboarding + billing)'), init ? '₪ ' + M(Math.abs(init.startingBalance)) + ' ' + polTag(init.startingBalance) : '—'],
      [T('رصيد دائن', 'Credit balance'), '₪ ' + M(st.creditBalance || 0)]
    ];
    return card('ti-gauge', T('الحالة المالية', 'Financial Status'), T('ما هو الوضع المالي الحالي؟', 'What is the current financial state?'),
      '<div class="mw-tiles">' + tiles.map(t => '<div class="mw-tile"><div class="mw-tile-k">' + t[0] + '</div><div class="mw-tile-v">' + t[1] + '</div></div>').join('') + '</div>');
  }

  /* SECTION 3 · Statement — "How did the member reach this state?" (certified rows) */
  function sectionStatement(st) {
    const rows = (st.rows || []).map(r => '<tr>'
      + '<td class="mw-c">' + (r.date === '—' ? '—' : E(r.date)) + '</td>'
      + '<td>' + E(r.desc || '') + '</td>'
      + '<td class="mw-num">' + (r.cr ? '₪ ' + M(r.cr) : '') + '</td>'
      + '<td class="mw-num">' + (r.dr ? '₪ ' + M(r.dr) : '') + '</td>'
      + '<td class="mw-num mw-bal">₪ ' + M(Math.abs(r.bal || 0)) + '</td></tr>').join('');
    const body = '<div class="mw-tablewrap"><table class="mw-table"><thead><tr>'
      + '<th class="mw-c">' + T('التاريخ', 'Date') + '</th><th>' + T('البيان', 'Description') + '</th>'
      + '<th class="mw-num">' + T('دائن', 'Credit') + '</th><th class="mw-num">' + T('مدين', 'Debit') + '</th>'
      + '<th class="mw-num mw-bal">' + T('الرصيد', 'Balance') + '</th></tr></thead><tbody>' + (rows || '') + '</tbody>'
      + '<tfoot><tr><td colspan="4">' + T('الرصيد النهائي', 'Final balance') + '</td><td class="mw-num mw-bal">₪ ' + M(Math.abs(st.finalBalance)) + ' ' + polTag(st.finalBalance) + '</td></tr></tfoot></table></div>';
    return card('ti-file-description', T('كشف الحساب', 'Statement'), T('كيف وصل العضو إلى هذه الحالة؟', 'How did the member reach this state?'), body);
  }

  /* SECTION 4 · Timeline — "What happened over time?" (same certified rows, narrative) */
  function sectionTimeline(st) {
    const evs = (st.rows || []).slice().map(r => {
      const amt = r.cr ? '<span class="mw-tl-cr">+₪ ' + M(r.cr) + '</span>' : r.dr ? '<span class="mw-tl-dr">−₪ ' + M(r.dr) + '</span>' : '';
      return '<li class="mw-tl-i"><span class="mw-tl-dot"></span>'
        + '<span class="mw-tl-d">' + (r.date === '—' ? T('الافتتاح', 'Opening') : E(r.date)) + '</span>'
        + '<span class="mw-tl-t">' + E(r.desc || '') + '</span>' + amt + '</li>';
    }).join('');
    return card('ti-timeline', T('الخط الزمني', 'Timeline'), T('ماذا حدث عبر الزمن؟', 'What happened over time?'),
      '<ul class="mw-tl">' + (evs || '<li class="mw-tl-i"><span class="mw-tl-t">' + T('لا أحداث', 'No events') + '</span></li>') + '</ul>');
  }

  /* SECTION 5 · Available Actions — "What can I legally do next?" (certified BOs only) */
  function sectionActions(m) {
    const admin = (typeof can !== 'undefined' && can.admin && can.admin());
    const btns = [];
    // read action (always): the full certified statement
    btns.push('<button class="btn ghost" onclick="window.openMemberStatementFromWorkspace(\'' + m.id + '\')"><i class="ti ti-file-description"></i>' + T('كشف الحساب الكامل', 'Full statement') + '</button>');
    if (admin) {
      // BO-08 · Edit Member (existing certified flow)
      btns.push('<button class="btn ghost" onclick="window.editMember(\'' + m.id + '\')"><i class="ti ti-edit"></i>' + T('تعديل بيانات العضو', 'Edit member') + '</button>');
      // BO-09 · Cancel (deactivate) Member — invokes the certified operation directly
      if (m.is_active !== false)
        btns.push('<button class="btn ghost" style="color:var(--warn)" onclick="window.MemberLifecycle.actionDeactivate(\'' + m.id + '\')"><i class="ti ti-user-off"></i>' + T('تعطيل العضو', 'Deactivate member') + '</button>');
    }
    const note = '<div class="mw-actions-note">' + T('التسجيل والفوترة عمليتان على مستوى الوحدة · الدفعات والتصحيحات ضمن شريحة لاحقة',
      'Onboarding & billing are module-level · payments & corrections are a later slice') + '</div>';
    return card('ti-player-play', T('الإجراءات المتاحة', 'Available Actions'), T('ما الذي يمكن فعله قانونيًا الآن؟', 'What can I legally do next?'),
      '<div class="mw-actions">' + btns.join('') + '</div>' + note);
  }

  function card(icon, title, question, body) {
    return '<section class="mw-card">'
      + '<header class="mw-card-h"><i class="ti ' + icon + '"></i><div><div class="mw-card-t">' + title + '</div>'
      + '<div class="mw-card-q">' + question + '</div></div></header>'
      + '<div class="mw-card-b">' + body + '</div></section>';
  }

  /* the workspace: one coherent financial unit for one member */
  function renderWorkspace() {
    const out = document.getElementById('mw-out'); if (!out) return;
    fillWorkspaceSelect();
    const sel = document.getElementById('mw-member');
    const mid = sel && sel.value;
    if (!mid) { out.innerHTML = '<div class="mw-empty"><i class="ti ti-user-search"></i><div>' + T('اختر عضوًا لعرض وحدته المالية', 'Choose a member to open their financial unit') + '</div></div>'; return; }
    if (typeof FIN === 'undefined' || !FIN.memberStatement) { out.innerHTML = ''; return; }
    const st = FIN.memberStatement(mid);
    const m = st.member || (typeof gm === 'function' ? gm(mid) : null);
    if (!m) { out.innerHTML = ''; return; }
    const del = (typeof FIN.memberDelinquency === 'function') ? FIN.memberDelinquency(mid) : { unpaidCount: 0, isDelinquent: false };
    const init = initialState(mid);
    // hierarchy: who → current position → how we got here → what next
    out.innerHTML = '<div class="mw-shell">'
      + '<div class="mw-hero"><div class="mw-hero-id"><span class="mw-hero-badge">' + T('وحدة العضو المالية', 'Member Financial Lifecycle') + '</span>'
      + '<div class="mw-hero-name">' + E(m.name) + '</div></div>'
      + '<div class="mw-hero-bal">₪ ' + M(Math.abs(st.finalBalance)) + ' ' + polTag(st.finalBalance) + '</div></div>'
      + '<div class="mw-cols">'
      + sectionSummary(m) + sectionStatus(st, del, init) + sectionStatement(st) + sectionTimeline(st) + sectionActions(m)
      + '</div></div>';
  }

  /* entry points + one certified action wrapper (invokes BO-09 only) */
  if (typeof window !== 'undefined') {
    window.renderMemberWorkspace = renderWorkspace;
    window.openMemberWorkspace = function (id) {
      if (typeof window.nav === 'function') window.nav('member-workspace');
      setTimeout(() => { const s = document.getElementById('mw-member'); if (s) s.value = id; renderWorkspace(); }, 60);
    };
    window.openMemberStatementFromWorkspace = function (id) {
      if (typeof window.nav === 'function') window.nav('member-stmt');
      setTimeout(() => { const s = document.getElementById('ms-member'); if (s) { s.value = id; if (typeof window.renderMemberStmt === 'function') window.renderMemberStmt(); } }, 60);
    };
  }

  const MemberLifecycle = {
    version: 2, initialState, initialStateCard, renderWorkspace,
    /* BO-09 · Cancel (deactivate) Member — invokes the certified operation only */
    async actionDeactivate(id) {
      const m = (typeof DB !== 'undefined' && DB.members || []).find(x => x.id === id);
      if (typeof window !== 'undefined' && typeof window.confirm === 'function'
        && !window.confirm(T('تعطيل العضو ' + ((m && m.name) || '') + '؟', 'Deactivate member ' + ((m && m.name) || '') + '?'))) return;
      if (typeof BusinessOps === 'undefined' || !BusinessOps.cancelMember) return;
      const r = await BusinessOps.cancelMember({ id, logLabel: 'تعطيل عضو من وحدة العضو المالية: ' + ((m && m.name) || id) });
      if (!r.ok) { if (typeof toast === 'function') toast((typeof window !== 'undefined' && window.t ? window.t('errors.generic_error') : 'خطأ') + ': ' + r.error, 'err'); return; }
      if (typeof loadAll === 'function') await loadAll();
      renderWorkspace();
      if (typeof toast === 'function') toast(T('تم تعطيل العضو', 'Member deactivated'), 'warn');
    }
  };
  if (typeof window !== 'undefined') window.MemberLifecycle = MemberLifecycle;
  if (typeof module !== 'undefined' && module.exports) module.exports = MemberLifecycle;
})();
