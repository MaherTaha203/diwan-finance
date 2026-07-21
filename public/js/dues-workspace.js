/* ═══ ANNUAL SUBSCRIPTIONS / DUES WORKSPACE — P-DUES · Slices 1–2 ══════════════
   The fourth Operational Business Module surface (P-DUES-000, approved & frozen),
   built under GOV-WS-01 v1.5.
     • Slice 1 established VISIBILITY: the annual-dues State (per selected year:
       billed? · per-member obligation · eligible count · total due / paid /
       outstanding) and History (the dues-schedule evolution), read-only, with year
       navigation, filtering, searching, and a read-only print/export.
     • Slice 2 activates CAPABILITY — and COMPLETES the module: apply annual dues and
       onboard a member into the schedule, orchestrating certified Business Operations
       only, with NO new accounting behaviour.

   PRIMARY BUSINESS QUESTION (S2):
     "For the selected membership year, which certified annual-dues operation is
      currently legitimate, and may it be executed?"

   BUSINESS BOUNDARY (GOV-WS-01 Rule 5):
     • OWNS — presenting the dues State / History (S1), and the capability to apply
       annual dues (BO-10) and onboard a member (BO-07) via certified flows (S2).
     • DOES NOT OWN — payments / collection (P3), member lifecycle (P2), disbursements
       (P4); per-year payment allocation (GAP-1); year reversal; approval (GAP-P1);
       liquidity guard (GAP-P2); BO-06; any recurring-billing engine or background job.

   ORCHESTRATION ONLY, on the certified surface (GOV-WS-01 v1.5):
     • DISPLAY — every value originates from an EXISTING certified read model / store
       (Rule 6): FIN.subscriptionYears · FIN.memberDelinquency(id).byYear[year] · the
       stored member_subscriptions due/paid (the SAME projection the certified
       Annual-Debt report presents) · DB.annual (the certified annual_dues store). No
       new Read Model, no new calculation, no duplicated financial state.
     • EXECUTION — the workspace never calls a Business Operation or mutates state
       itself. Each capability DELEGATES to an EXISTING certified flow that routes to a
       certified Business Operation: apply dues → window.applyAnnualDue → BusinessOps.
       applyAnnualDues (BO-10, obligation only); onboard → window.openM('member') →
       saveMember → BusinessOps.createMember (BO-07). The workspace decides only
       WHETHER an operation is legitimate (admin · valid year · duplicate-year
       protection · members present); the certified caller re-validates and executes.
       No accounting logic, no financial calculation, no second source of truth.

   GOV-WS-01 v1.5: Rule 2 (one dominant Primary Business Question); Rule 3 (State /
   History / Capability in separate sections — State & History stay execution-free);
   Rule 4 (Intent → Authorization → Execution via a certified BO → Result from a
   certified Read Model). Slice 2 completes the Annual Subscriptions / Dues module.
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
  let _dwApplyYear = null; // Capability (S2): the year targeted by Apply Annual Dues
  let _dwApplyAmount = 200;// Capability (S2): per-member amount for Apply Annual Dues

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
    const note = '<div class="dw-nav-note"><i class="ti ti-compass"></i><span>'
      + T('روابط قراءة فقط للانتقال — التنفيذ الفعلي (تطبيق الاشتراك / إضافة عضو) يتم في قسم «العمليات التشغيلية» عبر عملياتٍ معتمدة (BO-10 · BO-07).',
          'Read-only navigation links — actual execution (apply dues / onboard member) happens in “Operational Actions” via certified operations (BO-10 · BO-07).') + '</span></div>';
    return card('ti-compass', T('التنقّل والتصدير', 'Navigation & Export'),
      T('أين أطالع تفاصيل أكثر، وكيف أصدّر ما أراه؟', 'Where can I see more, and how do I export what I see?'),
      '<div class="dw-nav">' + links + exp + '</div>' + note, true);
  }

  /* ── P-DUES-S2 · Capability legitimacy engine ──────────────────────────────
     The workspace decides only WHETHER an annual-dues operation is legitimate
     (GOV-WS-01 Rule 4 · Authorization) — authority + certified preconditions +
     duplicate-year protection. It implements NO accounting rule: it computes no
     obligation, builds no subscription row, and calls no Business Operation. The
     certified caller re-validates and executes (BO decides HOW). */
  function applyLegit() {
    const canA = (typeof can !== 'undefined' && can.admin && can.admin());
    const y = Number(_dwApplyYear);
    const yearValid = Number.isFinite(y) && y >= 2020 && y <= 2040;
    const already = (typeof DB !== 'undefined' ? (DB.annual || []) : []).some(a => Number(a.year) === y);   // duplicate-year protection
    const hasMembers = (typeof DB !== 'undefined' ? (DB.members || []) : []).some(m => m.is_active !== false);
    const legit = canA && yearValid && !already && hasMembers;
    const reason = !canA ? T('يتطلب صلاحية مدير', 'requires admin')
      : !yearValid ? T('سنة غير صالحة (2020–2040)', 'invalid year (2020–2040)')
      : already ? T('اشتراك هذه السنة مُطبَّق سلفًا', 'this year is already applied')
      : !hasMembers ? T('لا أعضاء مستحقون', 'no eligible members') : '';
    return { legit, reason, canA, yearValid, already, hasMembers, year: y };
  }

  /* the single dominant next legitimate operation (Rule 2 · the S2 Primary Business
     Question). An orchestration choice from AUTHORITY + certified preconditions,
     never accounting. Routes to a certified caller only. */
  function nextOperation() {
    const al = applyLegit();
    if (al.legit) return { enabled: true, label: T('تطبيق اشتراك سنة ' + al.year, 'Apply dues for ' + al.year), run: 'window.DuesWorkspace.actionApply()' };
    if (al.canA) return { enabled: true, label: T('إضافة عضو للجدول', 'Onboard a member'), run: 'window.DuesWorkspace.actionOnboard()' };
    return { enabled: false, label: T('قراءة فقط · لا صلاحية تنفيذ', 'read-only · no execution permission') };
  }

  /* SECTION · Operational Actions (CAPABILITY — P-DUES-S2). GOV-WS-01 Rule 3 keeps
     this a DEDICATED Capability section, never mixed into State or History (the
     status / members / schedule sections carry no execution controls). Rule 4:
     Intent (choose year / add member) → Authorization (applyLegit / admin) →
     Execution (EXCLUSIVELY via a certified caller that routes to a certified
     Business Operation) → Result (re-read from the certified read models on reload).
     The workspace itself calls no Business Operation and mutates no state. */
  function sectionCapability() {
    const canA = (typeof can !== 'undefined' && can.admin && can.admin());
    const al = applyLegit();
    const why = t => '<span class="dw-cap-why">' + t + '</span>';
    const lbl = (icon, text, bo) => '<span class="dw-cap-l"><i class="ti ' + icon + '"></i>' + text + '<span class="dw-cap-bo">' + bo + '</span></span>';
    // BO-10 · Apply Annual Dues → certified caller window.applyAnnualDue (obligation only)
    const inputs = '<input class="dw-cap-in" type="number" min="2020" max="2040" id="dw-apply-year" value="' + E(_dwApplyYear) + '" onchange="window.DuesWorkspace.setApplyYear(this.value)" aria-label="' + T('السنة', 'Year') + '">'
      + '<input class="dw-cap-in" type="number" min="1" id="dw-apply-amount" value="' + E(_dwApplyAmount) + '" onchange="window.DuesWorkspace.setApplyAmount(this.value)" aria-label="' + T('المبلغ', 'Amount') + '">';
    const apply = al.legit
      ? '<div class="dw-cap-row">' + lbl('ti-calendar-plus', T('تطبيق الاشتراك السنوي', 'Apply annual dues'), 'BO-10')
        + '<span class="dw-cap-act">' + inputs
        + '<button class="dw-op dw-op-pri" onclick="window.DuesWorkspace.actionApply()"><i class="ti ti-calendar-plus"></i>' + T('تطبيق سنة ' + al.year, 'Apply ' + al.year) + '</button></span></div>'
      : '<div class="dw-cap-row dw-cap-off">' + lbl('ti-calendar-plus', T('تطبيق الاشتراك السنوي', 'Apply annual dues'), 'BO-10')
        + '<span class="dw-cap-act">' + inputs + why(al.reason) + '</span></div>';
    // BO-07 · Onboard member into the annual schedule → certified add-member flow
    const onboard = canA
      ? '<div class="dw-cap-row">' + lbl('ti-user-plus', T('إضافة عضو إلى الجدول', 'Onboard a member'), 'BO-07')
        + '<span class="dw-cap-act"><button class="dw-op" onclick="window.DuesWorkspace.actionOnboard()"><i class="ti ti-external-link"></i>' + T('فتح إضافة عضو المعتمدة', 'Open certified add-member') + '</button></span></div>'
      : '<div class="dw-cap-row dw-cap-off">' + lbl('ti-user-plus', T('إضافة عضو إلى الجدول', 'Onboard a member'), 'BO-07') + why(T('يتطلب صلاحية مدير', 'requires admin')) + '</div>';
    const note = '<div class="dw-cap-note"><i class="ti ti-shield-check"></i><span>'
      + T('النية ← الصلاحية (مدير · سنة صالحة · منع التكرار) ← التنفيذ عبر عملية أعمال معتمدة فقط (BO-10 توليد التزام فقط · BO-07) ← النتيجة من نماذج القراءة المعتمدة · لا منطق محاسبي أو حساب مالي داخل مساحة العمل · لا تخصيص دفعات ولا موافقة ولا حارس سيولة ولا عكس سنة.',
          'Intent → Authorization (admin · valid year · duplicate protection) → Execution via a certified Business Operation only (BO-10 obligation-only · BO-07) → Result from the certified read models · no accounting or financial calculation in the workspace · no payment allocation, approval, liquidity guard, or year reversal.') + '</span></div>';
    return card('ti-player-play', T('العمليات التشغيلية', 'Operational Actions'),
      T('للسنة المحددة، ما عملية الاشتراك المعتمدة المشروعة الآن، وهل يمكن تنفيذها؟', 'For the selected year, which certified dues operation is legitimate now, and may it be executed?'),
      apply + onboard + note, true);
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
    if (_dwApplyYear == null) _dwApplyYear = ys.length ? Math.max.apply(null, ys) + 1 : new Date().getFullYear();
    if (!ys.length) {
      out.innerHTML = '<div class="dw-shell"><div class="dw-empty" style="padding:56px 16px"><i class="ti ti-calendar-off"></i>'
        + '<div>' + T('لا توجد سنوات اشتراك بعد', 'No subscription years yet') + '</div></div></div>';
      return;
    }
    const s = yearState(_dwYear);
    const nxt = nextOperation();
    // GOV-WS-01 Rule 2 — one dominant Primary Business Question. With Capability
    // activated (P-DUES-S2) this is an Operational Workspace: it leads with the
    // certified dues operation the user may legitimately perform next; the selected
    // year's outstanding is the supporting state figure (one projection of the
    // certified surface — Rule 6). State + History (P-DUES-S1) are preserved intact.
    out.innerHTML = '<div class="dw-shell">'
      + '<div class="dw-hero">'
      +   '<div class="dw-hero-id"><span class="dw-hero-badge">' + T('الاشتراكات السنوية', 'Annual Subscriptions') + '</span>'
      +     '<div class="dw-hero-name">' + T('اشتراكات سنة ', 'Membership Year ') + s.year + '</div>'
      +     '<div class="dw-hero-q">' + T('للسنة المحددة، ما عملية الاشتراك السنوي المعتمدة المشروعة الآن، وهل يمكن تنفيذها؟', 'For the selected membership year, which certified annual-dues operation is currently legitimate, and may it be executed?') + '</div>'
      +   '</div>'
      +   '<div class="dw-hero-state">'
      +     '<div class="dw-hero-bal">₪ ' + M(s.outstanding) + '</div>'
      +     '<div class="dw-hero-sub">' + T('المتبقّي على السنة · ' + s.eligible + ' عضو · التزام ₪' + M(s.due), 'outstanding · ' + s.eligible + ' members · obligation ₪' + M(s.due)) + '</div>'
      +     (nxt.enabled
        ? '<button class="dw-hero-cta" onclick="' + nxt.run + '"><i class="ti ti-calendar-plus"></i>' + nxt.label + '</button>'
        : '<span class="dw-hero-cta dw-hero-cta-off">' + nxt.label + '</span>')
      +   '</div>'
      + '</div>'
      + '<div class="dw-tabs">' + fillYearTabs(s.year) + '</div>'
      + '<div class="dw-cols">'
      + sectionStatus(s) + sectionMembers(s) + sectionSchedule(s.year) + sectionCapability() + sectionNav()
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
    version: 2, years, yearState, memberRows, schedule, applyLegit, nextOperation, renderWorkspace,
    setYear(y) { _dwYear = Number(y); renderWorkspace(); },
    setFilter(f) { _dwFilter = (f === 'outstanding' || f === 'settled') ? f : 'all'; renderWorkspace(); },
    setSearch(q) { _dwSearch = String(q == null ? '' : q); renderWorkspace(); },
    setApplyYear(y) { const n = parseInt(y, 10); if (Number.isFinite(n)) _dwApplyYear = n; renderWorkspace(); },
    setApplyAmount(a) { const n = Number(a); if (n > 0) _dwApplyAmount = n; },
    /* BO-10 · Apply Annual Dues — routes EXCLUSIVELY through the existing certified
       caller window.applyAnnualDue (→ BusinessOps.applyAnnualDues). The workspace only
       feeds the certified contract's own inputs (#due-year / #due-amount) with the
       chosen year/amount, then invokes it; the certified caller re-validates (admin /
       year / duplicate / eligibility / confirm) and executes. No BO call, no accounting,
       no subscription-row building here. Gated: only routes when legitimate. */
    actionApply() {
      if (typeof document === 'undefined' || typeof window === 'undefined') return;
      if (!applyLegit().legit) return;                       // defensive — the control is disabled when illegitimate
      const amtEl = document.getElementById('dw-apply-amount'); if (amtEl && Number(amtEl.value) > 0) _dwApplyAmount = Number(amtEl.value);
      const y = document.getElementById('due-year'), a = document.getElementById('due-amount');   // the certified contract's own inputs
      if (y) y.value = _dwApplyYear;
      if (a) a.value = _dwApplyAmount;
      if (typeof window.applyAnnualDue === 'function') window.applyAnnualDue();   // certified caller → BO-10
    },
    /* BO-07 · Onboard member into the annual schedule — routes EXCLUSIVELY through the
       existing certified add-member flow window.openM('member') (→ saveMember →
       BusinessOps.createMember). No BO call and no member/schedule logic here. */
    actionOnboard() {
      const canA = (typeof can !== 'undefined' && can.admin && can.admin());
      if (!canA) return;
      if (typeof window !== 'undefined' && typeof window.openM === 'function') window.openM('member');
    },
    /* read-only export: prints the current view via the browser. No accounting, no
       mutation — a pure read affordance (platform convention, as in P5). */
    printView() { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); }
  };
  if (typeof window !== 'undefined') window.DuesWorkspace = DuesWorkspace;
  if (typeof module !== 'undefined' && module.exports) module.exports = DuesWorkspace;
})();
