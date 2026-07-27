/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R1 — ReportModel (schema freeze) + the first model builder.
   ---------------------------------------------------------------------------
   A ReportModel is the neutral, serializable projection every renderer consumes
   (spec §2.1/§3). It carries DATA + INTENT only — NO styling, NO markup, NO DOM.

   R1 ships:
     · ReportModel.validate(model)        — the frozen schema validator.
     · buildMemberStatementModel(source)  — PURE mapper: certified data → model.
     · ReportModels.memberStatement(id,from,to) — runtime gatherer that reads
       FIN and DB and calls the pure builder. NOT wired to production (no call site).

   R1 does NOT render anything and migrates NO report. The pure builder is unit-
   tested for parity: given a certified statement view, the model reproduces the
   SAME numbers in the SAME slots (no mutation/loss). Live end-to-end parity is
   verified at R6 (the Member-Statement cut-over).

   ── Frozen ReportModel schema ──────────────────────────────────────────────
   ReportModel = {
     meta: {
       reportId,                       // registry ID (e.g. 'MEMBER_STATEMENT')
       title:   {ar,en},
       orientation: 'portrait'|'landscape',
       party?:  {name, code, phone, activeFrom},   // subject (member, …)
       period?: {from, to},
       printDate?, docNo?, verifyToken?, org?, filters?:[], signatures?:[]
     },
     summary: [ { key:{ar,en}, value:Number, format:'money'|'int'|'text', tone?:'pos'|'neg' } ],
     sections: [ Section ]
   }
   Section =
     | { type:'band',  key:{ar,en}, value:Number, format:'money', tone? }
     | { type:'table', id, columns:[Column], rows:[RowByKey], totals?, footnotes?:[{ar,en}] }
   Column = { key, header:{ar,en}, align:'start'|'center'|'end', format:'text'|'num'|'money'|'date'|'tag' }
   RowByKey = { <columnKey>: <rawValue> }      // raw values only; renderer formats
   totals   = { label:{ar,en}, cells:{<columnKey>:value}, status?:{ar,en} }
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var VALID_ORIENT = ['portrait', 'landscape'];
  var VALID_FORMAT = ['text', 'num', 'money', 'date', 'tag', 'int', 'balance'];  /* 'balance' = signed → abs + Dr/Cr tag (R2) */
  var VALID_ALIGN = ['start', 'center', 'end'];

  /* ── Frozen schema validator. Returns {ok, errors:[]}. Pure. ── */
  function validate(model) {
    var e = [];
    if (!model || typeof model !== 'object') return { ok: false, errors: ['model is not an object'] };
    var m = model.meta;
    if (!m || typeof m !== 'object') e.push('meta missing');
    else {
      if (!m.reportId || typeof m.reportId !== 'string') e.push('meta.reportId missing');
      if (VALID_ORIENT.indexOf(m.orientation) < 0) e.push('meta.orientation invalid');
    }
    if (!Array.isArray(model.summary)) e.push('summary must be an array');
    else model.summary.forEach(function (s, i) {
      if (!s.key) e.push('summary[' + i + '].key missing');
      if (typeof s.value === 'undefined') e.push('summary[' + i + '].value missing');
      if (s.format && VALID_FORMAT.indexOf(s.format) < 0) e.push('summary[' + i + '].format invalid');
    });
    if (!Array.isArray(model.sections)) e.push('sections must be an array');
    else model.sections.forEach(function (sec, i) {
      if (sec.type === 'band') {
        if (!sec.key) e.push('sections[' + i + '] band.key missing');
        if (typeof sec.value === 'undefined') e.push('sections[' + i + '] band.value missing');
      } else if (sec.type === 'table') {
        if (!Array.isArray(sec.columns) || !sec.columns.length) e.push('sections[' + i + '] table.columns missing');
        else sec.columns.forEach(function (c, j) {
          if (!c.key) e.push('sections[' + i + '].columns[' + j + '].key missing');
          if (!c.header) e.push('sections[' + i + '].columns[' + j + '].header missing');
          if (c.align && VALID_ALIGN.indexOf(c.align) < 0) e.push('sections[' + i + '].columns[' + j + '].align invalid');
          if (c.format && VALID_FORMAT.indexOf(c.format) < 0) e.push('sections[' + i + '].columns[' + j + '].format invalid');
        });
        if (!Array.isArray(sec.rows)) e.push('sections[' + i + '] table.rows missing');
        else {
          var keys = {}; (sec.columns || []).forEach(function (c) { keys[c.key] = 1; });
          sec.rows.forEach(function (r, k) {
            Object.keys(r).forEach(function (rk) { if (rk.charAt(0) === '_') return; /* auxiliary meta, not a column */ if (!keys[rk]) e.push('sections[' + i + '].rows[' + k + '] uses unknown column "' + rk + '"'); });
          });
          if (sec.totals && sec.totals.cells) Object.keys(sec.totals.cells).forEach(function (tk) { if (!keys[tk]) e.push('sections[' + i + '].totals uses unknown column "' + tk + '"'); });
        }
      } else e.push('sections[' + i + '] unknown type "' + sec.type + '"');
    });
    return { ok: e.length === 0, errors: e };
  }

  /* Reference-number extractor — identical rule to the current statement. Pure. */
  function refFromNotes(txt) {
    if (!txt) return '';
    var s = String(txt);
    var m = s.match(/(?:إيصال|ايصال|سند|receipt|rcpt|ref|مرجع|رقم|no\.?|#)[^\d]{0,24}(\d{1,9})/i);
    if (m) return m[1];
    m = s.match(/^\s*#?\s*(\d{1,9})\s*$/);
    return m ? m[1] : '';
  }

  var T = function (ar, en) { return { ar: ar, en: en }; };

  /* Pure port of print.js donationStmtLabel / donationDestLabelAr (IG-017's single
     destination mapping + IG-019 settlement suffix). Kept language-neutral: returns
     a bilingual T() value the renderer picks by lang — one label rule for every
     surface (screen · print · pdf · Excel). Grouping matches the layout's money(). */
  function _grp(n) { return Math.abs(Math.round(Number(n || 0))).toLocaleString('en-US'); }
  function donationDesc(meta) {
    meta = meta || {};
    var inkind = meta.movementType === 'donation_inkind';
    var d = meta.destination;
    var ar = inkind ? 'عيني/خدمي — توثيقي (بلا وجهة نقدية)' : (d === 'food' ? 'صندوق الغداء' : d === 'diwan' ? 'خزينة الديوان' : d === 'historical_deficit' ? 'حساب العجز التاريخي' : '—');
    var en = inkind ? 'In-kind — documentary (no cash destination)' : (d === 'food' ? 'Food Fund' : d === 'diwan' ? 'Diwan Treasury' : d === 'historical_deficit' ? 'Historical Deficit Account' : '—');
    var arB = 'تبرع — ' + ar, enB = 'Donation — ' + en;
    var s = Number(meta.settled) || 0;
    if (s > 0) { arB += ' · تسوية ذمة ₪' + _grp(s); enB += ' · Debt Settlement ₪' + _grp(s); }
    return T(arB, enB);
  }

  /* ── PURE builder: certified source → ReportModel. No FIN/DB/DOM access. ──
     source = {
       member: {name, member_code, phone, active_from_year},
       view:   FIN.memberStatementView(...) shape
               { statement:{finalBalance}, moves:[{date,no,desc,dr,cr,bal}],
                 carried, histPaid, totSub, totPay },
       donations: [ {receipt_date, no, amount_ils, movement_type,
                     destination_treasury, donation_display_fund, _settled} ],
       from, to, printDate
     }
     Numbers pass through unchanged — this is the parity guarantee. */
  function buildMemberStatementModel(source) {
    source = source || {};
    var member = source.member || {};
    var v = source.view || {};
    var moves = v.moves || [];
    var carried = Number(v.carried || 0);
    var finalBalance = Number((v.statement && v.statement.finalBalance) || v.finalBalance || 0);

    var columns = [
      { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
      { key: 'desc', header: T('البيان', 'Description'), align: 'start', format: 'text' },
      { key: 'year', header: T('السنة', 'Year'), align: 'center', format: 'text' },
      { key: 'sysNo', header: T('رقم النظام', 'System no.'), align: 'center', format: 'text' },
      { key: 'refNo', header: T('الرقم المرجعي', 'Reference no.'), align: 'center', format: 'text' },
      { key: 'sub', header: T('اشتراك (+)', 'Subscription (+)'), align: 'end', format: 'money' },
      { key: 'pay', header: T('سداد (−)', 'Payment (−)'), align: 'end', format: 'money' },
      { key: 'bal', header: T('الرصيد الجاري', 'Running balance'), align: 'end', format: 'balance' }
    ];

    /* leading carried row + one row per certified move (same derivations as the
       current print/screen statement). `bal` stays SIGNED (renderer derives Dr/Cr). */
    var rows = [{ date: null, desc: T('رصيد مُرحّل قبل 31/12/2024', 'Carried balance before 31/12/2024'),
                  year: null, sysNo: null, refNo: null, sub: null, pay: null, bal: carried }];
    moves.forEach(function (r) {
      var isReceipt = r.no && r.no !== '—';
      rows.push({
        date: r.date,
        desc: isReceipt ? T('سداد · مساهمة غذاء', 'Payment · Food contribution') : r.desc,
        year: (r.date && r.date !== '—') ? String(r.date).slice(0, 4) : null,
        sysNo: isReceipt ? r.no : null,
        refNo: isReceipt ? (refFromNotes(r.desc) || null) : null,
        sub: Number(r.dr || 0) > 0 ? Number(r.dr) : null,
        pay: Number(r.cr || 0) > 0 ? Number(r.cr) : null,
        bal: Number(r.bal || 0)
      });
    });

    var finStatus = finalBalance > 0 ? T('على العضو مستحقات', 'Outstanding — member owes')
      : finalBalance < 0 ? T('للعضو رصيد دائن', 'Credit balance — owed to member')
      : T('الحساب مسدد بالكامل', 'Fully settled');

    var donationSection = null;
    if (Array.isArray(source.donations) && source.donations.length) {
      donationSection = {
        type: 'table', id: 'donations',
        columns: [
          { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
          { key: 'ref', header: T('المرجع', 'Ref'), align: 'center', format: 'text' },
          { key: 'desc', header: T('البيان', 'Description'), align: 'start', format: 'text' },
          { key: 'amount', header: T('المبلغ', 'Amount'), align: 'end', format: 'money' }
        ],
        rows: source.donations.map(function (d) {
          var meta = { movementType: d.movement_type, destination: d.destination_treasury || d.donation_display_fund, settled: Number(d._settled || 0) };
          return { date: d.receipt_date, ref: (d.no != null ? String(d.no) : null),
                   /* IG-019 independent-event label — computed from the STORED destination
                      (the same rule as legacy; bilingual so the renderer picks by lang). */
                   desc: donationDesc(meta),
                   amount: Number(d.amount_ils || 0),
                   _meta: meta };
        }),
        footnotes: [T('التبرع حدث مستقل لا يؤثّر على رصيد العضو إلا إذا خُصِّص صراحةً لتسوية الذمة.',
          'A donation is an independent event and does not affect the member balance unless explicitly designated to settle debt.')]
      };
    }

    var sections = [
      { type: 'band', key: T('الرصيد المرحّل قبل 31/12/2024', 'Carried balance before 31/12/2024'), value: carried, format: 'balance' },
      {
        type: 'table', id: 'ledger', columns: columns, rows: rows,
        totals: { label: T('الرصيد النهائي الحالي', 'Current final balance'), status: finStatus, cells: { bal: finalBalance } }
      }
    ];
    if (donationSection) sections.push(donationSection);

    return {
      meta: {
        reportId: 'MEMBER_STATEMENT',
        title: T('كشف الحساب المالي للعضو', 'Member Financial Statement'),
        orientation: 'portrait',
        party: { name: member.name || null, code: member.member_code || null, phone: member.phone || null, activeFrom: member.active_from_year || null },
        period: { from: source.from || null, to: source.to || null },
        printDate: source.printDate || null
      },
      summary: [
        { key: T('مجموع الاشتراكات بعد تشغيل النظام', 'Subscriptions after system launch'), value: Number(v.totSub || 0), format: 'money' },
        { key: T('مجموع السداد بعد تشغيل النظام', 'Payments after system launch'), value: Number(v.totPay || 0), format: 'money' },
        { key: T('مجموع السداد من الرصيد المرحل', 'Payments against carried balance'), value: Number(v.histPaid || 0), format: 'money' }
      ],
      sections: sections
    };
  }

  /* ═══ R7a — Fund Statement (food · diwan) ═══════════════════════════════════
     PURE builder: a fundLedgerView (+ computed figure set) → ReportModel. Same
     ledger the screen/print consume (date · name · desc · credit · debit ·
     balance · note); numbers pass through unchanged (parity). Food carries three
     extra figure cards (remaining deficit · reserve+debt · net position). */
  function buildFundStatementModel(source) {
    source = source || {};
    var fund = source.fund === 'food' ? 'food' : 'diwan';
    var v = source.view || {};
    var f = source.figures || {};
    var rows = (v.rows || []);
    var isFood = fund === 'food';
    var labelAr = isFood ? 'صندوق الغداء' : 'صندوق الديوان';
    var labelEn = isFood ? 'Food Fund' : 'Diwan Fund';

    var columns = [
      { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
      { key: 'name', header: T('الاسم', 'Name'), align: 'start', format: 'text' },
      { key: 'desc', header: T('البيان', 'Description'), align: 'start', format: 'text' },
      { key: 'credit', header: T('دائن (+)', 'Credit (+)'), align: 'end', format: 'money' },
      { key: 'debit', header: T('مدين (−)', 'Debit (−)'), align: 'end', format: 'money' },
      { key: 'balance', header: T('الرصيد', 'Balance'), align: 'end', format: 'money' },
      { key: 'note', header: T('ملاحظات', 'Note'), align: 'start', format: 'text' }
    ];
    var ledgerRows = rows.map(function (r) {
      return { date: r.date, name: r.name || null, desc: r.desc || null,
               credit: Number(r.cr || 0) > 0 ? Number(r.cr) : null,
               debit: Number(r.dr || 0) > 0 ? Number(r.dr) : null,
               balance: Number(r.run || 0), note: r.note || null };
    });

    var summary = [
      { key: T('إجمالي الإيرادات', 'Total income'), value: Number(v.totalCr || 0), format: 'money', tone: 'pos' },
      { key: T('إجمالي المصروفات', 'Total expenses'), value: Number(v.totalDr || 0), format: 'money', tone: 'neg' },
      { key: isFood ? T('رصيد صندوق الغداء الحالي', 'Current Food Fund balance') : T('الرصيد الحالي', 'Current balance'),
        value: Number(f.curBal != null ? f.curBal : v.closing || 0), format: 'money' }
    ];
    if (isFood) {
      summary.push({ key: T('العجز التاريخي المتبقي', 'Remaining historical deficit'), value: Number(f.deficitRemaining || 0), format: 'money', tone: 'neg' });
      summary.push({ key: T('الاحتياطي + تسوية الذمم', 'Reserve + debt settlement'), value: Number(f.reservePlusDebt || 0), format: 'money' });
      summary.push({ key: T('صافي مركز صندوق الغداء', 'Net Food Fund position'), value: Number(f.netPosition || 0), format: 'money', tone: (Number(f.netPosition || 0) >= 0 ? 'pos' : 'neg') });
    }

    return {
      meta: {
        reportId: 'FUND_STATEMENT',
        title: T('كشف الصندوق · ' + labelAr, 'Fund Statement · ' + labelEn),
        orientation: 'landscape',
        period: { from: source.from || null, to: source.to || null },
        printDate: source.printDate || null,
        filters: source.archived ? [T('🔒 لقطة الإقفال الأرشيفية', '🔒 close-time archive')] : []
      },
      summary: summary,
      sections: [
        { type: 'table', id: 'ledger', columns: columns, rows: ledgerRows,
          totals: { label: T('الإجمالي', 'Totals'), cells: { credit: Number(v.totalCr || 0), debit: Number(v.totalDr || 0), balance: Number(v.closing || 0) } } }
      ]
    };
  }

  /* Runtime gatherer for the fund statement (reads FIN/FinContract globals). */
  function fundStatementRuntime(fund, from, to, type) {
    if (typeof root.FIN === 'undefined' || !root.FIN.fundLedgerView) return null;
    var FIN = root.FIN, FC = root.FinContract || {};
    var arch = (!type && FIN.closedYearLedgerSnapshot) ? FIN.closedYearLedgerSnapshot(fund, from, to) : null;
    var view = arch || FIN.fundLedgerView(fund, from, to, type || '');
    var figures = { curBal: (fund === 'food' && FC.foodBalance) ? FC.foodBalance() : view.closing };
    if (fund === 'food') {
      figures.deficitRemaining = FC.foodDeficitRemaining ? FC.foodDeficitRemaining() : 0;
      figures.reservePlusDebt = (FIN._r2 && FIN.foodSettlementReserve && FIN.foodDebtSettlementTotal) ? FIN._r2(FIN.foodSettlementReserve() + FIN.foodDebtSettlementTotal()) : 0;
      figures.netPosition = FC.foodNetPosition ? FC.foodNetPosition() : 0;
    }
    return buildFundStatementModel({ fund: fund, view: view, figures: figures, from: from, to: to, printDate: new Date().toISOString(), archived: !!arch });
  }

  /* ═══ R7b — Annual Debt Report ═════════════════════════════════════════════
     PURE builder over FIN.debtReportRows (the certified IG-006 model). Fixed 9
     columns; `current` is a signed balance (Dr/Cr). Numbers pass through. */
  function buildAnnualDebtModel(source) {
    source = source || {};
    var rows = source.rows || [], t = source.totals || {}, shown = source.shown != null ? source.shown : rows.length;
    var columns = [
      { key: 'code', header: T('رقم العضو', 'Member No.'), align: 'start', format: 'text' },
      { key: 'name', header: T('اسم العضو', 'Member Name'), align: 'start', format: 'text' },
      { key: 'phone', header: T('الهاتف', 'Phone'), align: 'center', format: 'text' },
      { key: 'hist', header: T('الذمم حتى 31/12/2024', 'Debt until 31/12/2024'), align: 'end', format: 'money' },
      { key: 'histPaid', header: T('المسدد حتى 31/12/2024', 'Paid until 31/12/2024'), align: 'end', format: 'money' },
      { key: 'selSub', header: T('اشتراكات السنوات المحددة', 'Selected subscriptions'), align: 'end', format: 'money' },
      { key: 'selPaid', header: T('مدفوعات السنوات المحددة', 'Selected payments'), align: 'end', format: 'money' },
      { key: 'resolutions', header: T('تسويات وشطب', 'Settlements & write-offs'), align: 'end', format: 'money' },
      { key: 'current', header: T('الرصيد النهائي الحالي', 'Current final balance'), align: 'end', format: 'balance' }
    ];
    var ledgerRows = rows.map(function (r) {
      return { code: r.code || '—', name: r.name || null, phone: r.phone || null,
               hist: Number(r.hist || 0), histPaid: Number(r.histPaid || 0),
               selSub: Number(r.selSub || 0), selPaid: Number(r.selPaid || 0),
               resolutions: Number(r.resolutions || 0), current: Number(r.current || 0) };
    });
    var filters = [];
    if (source.filterLabel) filters.push(source.filterLabel);
    filters.push(T('المعروض: ' + shown + ' / ' + (source.totalMembers || shown), 'Shown: ' + shown + ' / ' + (source.totalMembers || shown)));
    return {
      meta: { reportId: 'ANNUAL_DEBT', title: T('تقرير المديونية السنوية', 'Annual Debt Report'), orientation: 'landscape', printDate: source.printDate || null, filters: filters },
      summary: [],
      sections: [{ type: 'table', id: 'debt', columns: columns, rows: ledgerRows,
        totals: { label: T('الإجمالي (' + shown + ')', 'Total (' + shown + ')'),
          cells: { hist: Number(t.hist || 0), histPaid: Number(t.histPaid || 0), selSub: Number(t.selSub || 0), selPaid: Number(t.selPaid || 0), resolutions: Number(t.resolutions || 0) } } }]
    };
  }

  /* ═══ R7b — Delinquent Members Report ═══════════════════════════════════════
     PURE builder with DYNAMIC per-year columns. Year cells carry the same status
     string as legacy _delCell (markers + Owner-approved ● marker); no totals. */
  function delStatus(v) {
    if (!v || Number(v.due || 0) <= 0) return null;   // renderer shows —
    if (v.authoritative) {
      if (v.status === 'paid') return '✓ مسدد ●';
      if (v.status === 'partial') return '◐ جزئي ●';
      return '✗ غير مسدد ●';
    }
    if (Number(v.paid || 0) >= Number(v.due || 0)) return '✓ مسدد';
    return '✗ ' + _grp(v.remaining) + ' ₪';
  }
  function buildDelinquentModel(source) {
    source = source || {};
    var years = (source.years || []).map(Number);
    var rows = source.rows || [];
    var shown = source.shown != null ? source.shown : rows.length;
    var columns = [
      { key: 'code', header: T('رقم العضو', 'Member No.'), align: 'start', format: 'text' },
      { key: 'name', header: T('اسم العضو', 'Member Name'), align: 'start', format: 'text' },
      { key: 'phone', header: T('الهاتف', 'Phone'), align: 'center', format: 'text' }
    ].concat(years.map(function (y) { return { key: 'y' + y, header: T(String(y), String(y)), align: 'center', format: 'text' }; }))
      .concat([{ key: 'unpaidCount', header: T('عدد السنوات غير المسددة', 'Unpaid years'), align: 'center', format: 'int' }]);
    var tableRows = rows.map(function (r) {
      var d = r.d || {}, by = d.byYear || {};
      var o = { code: r.code || '—', name: r.name || null, phone: r.phone || null, unpaidCount: Number(d.unpaidCount || 0) };
      years.forEach(function (y) { o['y' + y] = delStatus(by[y]); });
      return o;
    });
    return {
      meta: { reportId: 'DELINQUENT', title: T('تقرير الأعضاء المتأخرين', 'Delinquent Members Report'), orientation: 'landscape', printDate: source.printDate || null,
        filters: [T('المعروض: ' + shown + ' / ' + (source.totalMembers || shown), 'Shown: ' + shown + ' / ' + (source.totalMembers || shown))] },
      summary: [],
      sections: [{ type: 'table', id: 'delinquent', columns: columns, rows: tableRows }]
    };
  }

  /* Runtime gatherers — read the live view-state-aware globals from reports.js
     (annualDebtModel / delinquentRows honour the current filter/year chips). */
  function annualDebtRuntime() {
    if (typeof root.annualDebtModel !== 'function') return null;
    var m = root.annualDebtModel();
    var fl = { all: T('الكل', 'All'), debtors: T('مدينون', 'Debtors'), creditors: T('دائنون', 'Creditors'), zero: T('رصيد صفر', 'Zero balance') }[m.filter] || null;
    return buildAnnualDebtModel({ rows: m.rows, totals: m.totals, totalMembers: m.totalMembers, shown: m.rows.length, filterLabel: fl, printDate: new Date().toISOString() });
  }
  function delinquentRuntime() {
    if (typeof root.delinquentRows !== 'function') return null;
    var d = root.delinquentRows();
    var total = (root.DB && root.DB.members) ? root.DB.members.filter(function (m) { return m.is_active !== false; }).length : d.rows.length;
    return buildDelinquentModel({ years: d.years, rows: d.rows, shown: d.rows.length, totalMembers: total, printDate: new Date().toISOString() });
  }

  /* ═══ R7c — Donations Register ═════════════════════════════════════════════
     PURE builder. Rows arrive already mapped (the runtime gatherer computes the
     `direction` label via the shared window.donationDirectionLabel, so print and
     engine agree). Cash total caps the amount column; in-kind value is shown
     SEPARATELY (Domain 3 §4.2 — never conflated with cash). */
  function buildDonationReportModel(source) {
    source = source || {};
    var rows = source.rows || [], s = source.summary || {};
    var columns = [
      { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
      { key: 'ref', header: T('المرجع', 'Ref'), align: 'center', format: 'text' },
      { key: 'donor', header: T('المتبرع', 'Donor'), align: 'start', format: 'text' },
      { key: 'amount', header: T('المبلغ', 'Amount'), align: 'end', format: 'money' },
      { key: 'currency', header: T('العملة', 'Currency'), align: 'center', format: 'text' },
      { key: 'direction', header: T('الوجهة', 'Direction'), align: 'start', format: 'text' },
      { key: 'note', header: T('ملاحظات', 'Note'), align: 'start', format: 'text' }
    ];
    return {
      meta: { reportId: 'DONATION_REPORT', title: T('سجل التبرعات', 'Donations Register'), orientation: 'landscape', printDate: source.printDate || null,
        filters: [T('عدد التبرعات: ' + rows.length, 'Donations: ' + rows.length)] },
      summary: [
        { key: T('عدد التبرعات', 'Donation count'), value: Number(s.count || rows.length), format: 'int' },
        { key: T('التبرعات النقدية (الإجمالي)', 'Cash donations (total)'), value: Number(s.cashTot || 0), format: 'money', tone: 'pos' },
        { key: T('عيني/خدمي · قيمة توثيقية (ليست نقداً)', 'In-kind · documentary value (not cash)'), value: Number(s.inkindTot || 0), format: 'money' },
        { key: T('تسوية ذمم', 'Debt settlement'), value: Number(s.foodDebt || 0), format: 'money' },
        { key: T('الغداء — تسوية العجز', 'Food — deficit settlement'), value: Number(s.foodDeficit || 0), format: 'money' },
        { key: T('الغداء — دعم حالي', 'Food — current support'), value: Number(s.foodSupport || 0), format: 'money' },
        { key: T('إلى خزينة الديوان', 'To Diwan treasury'), value: Number(s.toDiwan || 0), format: 'money' }
      ],
      sections: [{ type: 'table', id: 'donations', columns: columns, rows: rows,
        totals: { label: T('الإجمالي النقدي (العيني مستبعَد — §4.2)', 'Cash total (in-kind excluded — §4.2)'),
          status: T('قيمة عينية توثيقية: ₪' + _grp(s.inkindTot || 0), 'in-kind documentary: ₪' + _grp(s.inkindTot || 0)),
          cells: { amount: Number(s.cashTot || 0) } } }]
    };
  }

  /* Runtime gatherer for the donations register (reads FIN + the shared label). */
  function donationReportRuntime() {
    if (typeof root.FIN === 'undefined' || !root.FIN.donationRegister) return null;
    var FIN = root.FIN, en = root.LANG === 'en';
    var D = FIN.donationRegister();
    var gmn = (typeof root.gmn === 'function') ? root.gmn : function () { return null; };
    var dir = (typeof root.donationDirectionLabel === 'function') ? root.donationDirectionLabel : function () { return ''; };
    var rows = (D.rows || []).map(function (r) {
      return { date: r.receipt_date, ref: (r.no != null ? String(r.no) : null),
               donor: r.payer_name || gmn(r.member_id) || '—',
               amount: Number(FIN.amountOf ? FIN.amountOf(r) : (r.amount_ils || 0)),
               currency: (r.currency && r.currency !== 'ILS') ? r.currency : 'ILS',
               direction: dir(r, D.perReceipt, en), note: r.notes || null };
    });
    return buildDonationReportModel({ rows: rows, printDate: new Date().toISOString(),
      summary: { count: (D.rows || []).length, cashTot: D.cashTot, inkindTot: D.inkindTot, foodDebt: D.foodDebt, foodDeficit: D.foodDeficit, foodSupport: D.foodSupport, toDiwan: D.toDiwan } });
  }

  /* ═══ R7d — Lists (Members · Annual log · Users) ══════════════════════════ */
  function buildMembersListModel(source) {
    source = source || {};
    var rows = source.rows || [];
    var columns = [
      { key: 'idx', header: T('#', '#'), align: 'center', format: 'int' },
      { key: 'name', header: T('الاسم', 'Name'), align: 'start', format: 'text' },
      { key: 'phone', header: T('الهاتف', 'Phone'), align: 'center', format: 'text' },
      { key: 'balance', header: T('الرصيد', 'Balance'), align: 'end', format: 'balance' },
      { key: 'status', header: T('الحالة', 'Status'), align: 'center', format: 'text' }
    ];
    return {
      meta: { reportId: 'MEMBERS_LIST', title: T('قائمة أعضاء العائلة', 'Family Members List'), orientation: 'portrait', printDate: source.printDate || null,
        filters: [source.filterLabel || T('العدد: ' + rows.length, 'Count: ' + rows.length)] },
      summary: [], sections: [{ type: 'table', id: 'members', columns: columns, rows: rows }]
    };
  }
  function buildAnnualLogModel(source) {
    source = source || {};
    var columns = [
      { key: 'year', header: T('السنة', 'Year'), align: 'center', format: 'int' },
      { key: 'amount', header: T('المبلغ', 'Amount'), align: 'end', format: 'money' },
      { key: 'memberCount', header: T('عدد الأعضاء', 'Members'), align: 'center', format: 'int' },
      { key: 'appliedAt', header: T('تاريخ التطبيق', 'Applied on'), align: 'center', format: 'date' },
      { key: 'appliedBy', header: T('بواسطة', 'Applied by'), align: 'start', format: 'text' }
    ];
    return {
      meta: { reportId: 'ANNUAL_LOG', title: T('سجل الاشتراكات السنوية', 'Annual Subscriptions Log'), orientation: 'portrait', printDate: source.printDate || null,
        filters: [T('السنوات المطبقة: ' + (source.rows || []).length, 'Applied years: ' + (source.rows || []).length)] },
      summary: [], sections: [{ type: 'table', id: 'annual', columns: columns, rows: source.rows || [] }]
    };
  }
  function buildUsersListModel(source) {
    source = source || {};
    var columns = [
      { key: 'email', header: T('البريد', 'Email'), align: 'start', format: 'text' },
      { key: 'role', header: T('الدور', 'Role'), align: 'center', format: 'text' }
    ];
    return {
      meta: { reportId: 'USERS_LIST', title: T('المستخدمون', 'Users'), orientation: 'portrait', printDate: source.printDate || null,
        filters: [T('العدد: ' + (source.rows || []).length, 'Count: ' + (source.rows || []).length)] },
      summary: [], sections: [{ type: 'table', id: 'users', columns: columns, rows: source.rows || [] }]
    };
  }

  /* Runtime gatherers (read DB/FIN + the live filter inputs, so exports match the
     on-screen list). */
  function membersListRuntime() {
    if (typeof root.DB === 'undefined' || typeof root.FIN === 'undefined') return null;
    var DB = root.DB, FIN = root.FIN, doc = (typeof document !== 'undefined') ? document : null;
    var q = ((doc && doc.getElementById('q-members') || {}).value || '').toLowerCase();
    var st = (doc && doc.getElementById('f-member-status') || {}).value || '';
    var d = (DB.members || []).filter(function (m) { return m.is_active; });
    if (q) d = d.filter(function (m) { return (m.name || '').toLowerCase().indexOf(q) >= 0 || (m.phone || '').indexOf(q) >= 0; });
    d = d.map(function (m) { return { m: m, bal: FIN.memberBalance ? FIN.memberBalance(m.id) : 0 }; });
    if (st === 'paid') d = d.filter(function (x) { return x.bal === 0; });
    else if (st === 'due') d = d.filter(function (x) { return x.bal > 0; });
    else if (st === 'credit') d = d.filter(function (x) { return x.bal < 0; });
    var rows = d.map(function (x, i) { return { idx: i + 1, name: x.m.name, phone: x.m.phone || null, balance: Number(x.bal || 0),
      status: FIN.balanceLabel ? FIN.balanceLabel(x.bal, false) : null }; });
    var fl = T('الفلتر: ' + (st || 'الكل') + (q ? (' · ' + q) : '') + ' · العدد: ' + rows.length, 'Filter: ' + (st || 'All') + (q ? (' · ' + q) : '') + ' · Count: ' + rows.length);
    return buildMembersListModel({ rows: rows, filterLabel: fl, printDate: new Date().toISOString() });
  }
  function annualLogRuntime() {
    if (typeof root.DB === 'undefined') return null;
    var rows = (root.DB.annual || []).map(function (a) { return { year: a.year, amount: Number(a.amount || 0), memberCount: Number(a.member_count || 0),
      appliedAt: a.applied_at ? String(a.applied_at).slice(0, 10) : null, appliedBy: a.applied_by || null }; });
    return buildAnnualLogModel({ rows: rows, printDate: new Date().toISOString() });
  }
  function usersListRuntime() {
    if (typeof root.DB === 'undefined') return null;
    var en = root.LANG === 'en';
    var rows = (root.DB.users || []).map(function (u) { return { email: u.email,
      role: u.role === 'admin' ? (en ? 'Admin' : 'مدير') : (en ? 'Viewer' : 'مشاهد') }; });
    return buildUsersListModel({ rows: rows, printDate: new Date().toISOString() });
  }

  /* ═══ R7f — Treasury Position + Dues Snapshot ══════════════════════════════
     PURE builders. The live workspaces (treasury/dues) hold their current view
     state in scope, map it to the shapes below, and call Report.render(model,
     'print') — so no runtime gatherer is needed here. Multi-section: summary
     cards + a health/schedule table + the main movement/members table. */
  function buildTreasuryPositionModel(source) {
    source = source || {};
    var p = source.position || {}, mv = source.movement || {};
    var moveCols = [
      { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
      { key: 'no', header: T('السند', 'Voucher'), align: 'center', format: 'text' },
      { key: 'fund', header: T('الصندوق', 'Fund'), align: 'center', format: 'text' },
      { key: 'party', header: T('الطرف', 'Party'), align: 'start', format: 'text' },
      { key: 'desc', header: T('البيان', 'Description'), align: 'start', format: 'text' },
      { key: 'in', header: T('وارد', 'In'), align: 'end', format: 'money' },
      { key: 'out', header: T('صادر', 'Out'), align: 'end', format: 'money' }
    ];
    var healthCols = [
      { key: 'metric', header: T('المؤشر', 'Metric'), align: 'start', format: 'text' },
      { key: 'value', header: T('القيمة', 'Value'), align: 'end', format: 'money' }
    ];
    var health = [
      { metric: T('صافي المركز المجمّع', 'Net combined position'), value: Number(p.netCombined || 0) },
      { metric: T('صافي مركز صندوق الغداء', 'Net Food-fund position'), value: Number(p.netFood || 0) },
      { metric: T('العجز التاريخي المتبقي', 'Remaining historical deficit'), value: Number(p.deficit || 0) },
      { metric: T('احتياطي التسوية', 'Settlement reserve'), value: Number(p.reserve || 0) },
      { metric: T('إجمالي الدعم الحالي', 'Current support total'), value: Number(p.support || 0) },
      { metric: T('إجمالي تسوية الذمم', 'Debt-settlement total'), value: Number(p.debtSettled || 0) }
    ];
    return {
      meta: { reportId: 'TREASURY_POSITION', title: T('الخزينة والمركز المالي', 'Treasury & Financial Position'), orientation: 'landscape',
        printDate: source.printDate || null, filters: source.periodLabel ? [source.periodLabel] : [] },
      summary: [
        { key: T('صندوق الغداء', 'Food fund'), value: Number(p.food || 0), format: 'money' },
        { key: T('صندوق الديوان', 'Diwan fund'), value: Number(p.diwan || 0), format: 'money' },
        { key: T('إجمالي التبرعات', 'Total donations'), value: Number(p.don || 0), format: 'money' },
        { key: T('المركز المجمّع', 'Combined position'), value: Number(p.combined || 0), format: 'money', tone: (Number(p.combined || 0) >= 0 ? 'pos' : 'neg') }
      ],
      sections: [
        { type: 'table', id: 'health', columns: healthCols, rows: health },
        { type: 'table', id: 'movement', columns: moveCols, rows: (source.rows || []),
          totals: { label: T('إجمالي الحركة للفترة', 'Movement total for the period'), cells: { in: Number(mv.totalIn || 0), out: Number(mv.totalOut || 0) } } }
      ]
    };
  }

  function buildDuesSnapshotModel(source) {
    source = source || {};
    var s = source.state || {}, rows = source.rows || [], sch = source.schedule || [];
    var memCols = [
      { key: 'code', header: T('رقم', 'No.'), align: 'center', format: 'text' },
      { key: 'name', header: T('العضو', 'Member'), align: 'start', format: 'text' },
      { key: 'phone', header: T('الهاتف', 'Phone'), align: 'center', format: 'text' },
      { key: 'due', header: T('مستحق', 'Due'), align: 'end', format: 'money' },
      { key: 'paid', header: T('مدفوع', 'Paid'), align: 'end', format: 'money' },
      { key: 'remaining', header: T('متبقٍّ', 'Remaining'), align: 'end', format: 'money' },
      { key: 'status', header: T('الحالة', 'Status'), align: 'center', format: 'text' }
    ];
    var schCols = [
      { key: 'year', header: T('السنة', 'Year'), align: 'center', format: 'int' },
      { key: 'amount', header: T('قيمة الاشتراك', 'Amount'), align: 'end', format: 'money' },
      { key: 'memberCount', header: T('عدد الأعضاء', 'Members'), align: 'center', format: 'int' },
      { key: 'total', header: T('إجمالي الالتزام', 'Total'), align: 'end', format: 'money' },
      { key: 'appliedAt', header: T('طُبِّقت', 'Applied'), align: 'center', format: 'text' },
      { key: 'appliedBy', header: T('بواسطة', 'By'), align: 'start', format: 'text' }
    ];
    var totDue = 0, totPaid = 0, totRem = 0;
    rows.forEach(function (r) { totDue += Number(r.due || 0); totPaid += Number(r.paid || 0); totRem += Number(r.remaining || 0); });
    var sections = [{ type: 'table', id: 'members', columns: memCols, rows: rows,
      totals: { label: T('الإجمالي (' + rows.length + ')', 'Total (' + rows.length + ')'), cells: { due: totDue, paid: totPaid, remaining: totRem } } }];
    if (sch.length) sections.push({ type: 'table', id: 'schedule', columns: schCols, rows: sch });
    return {
      meta: { reportId: 'DUES_SNAPSHOT', title: T('اشتراكات سنة ' + (s.year != null ? s.year : ''), 'Annual Subscriptions ' + (s.year != null ? s.year : '')), orientation: 'landscape',
        printDate: source.printDate || null, filters: source.filterLabel ? [source.filterLabel] : [] },
      summary: [
        { key: T('حالة السنة', 'Year status'), value: (source.statusText != null ? source.statusText : ''), format: 'text' },
        { key: T('قيمة الاشتراك السنوي', 'Annual obligation'), value: Number(s.perMember || 0), format: 'money' },
        { key: T('عدد الأعضاء المشمولين', 'Eligible members'), value: Number(s.eligible || 0), format: 'int' },
        { key: T('إجمالي الالتزام', 'Total obligation'), value: Number(s.due || 0), format: 'money' },
        { key: T('المتبقّي على السنة', 'Outstanding'), value: Number(s.outstanding || 0), format: 'money', tone: (Number(s.outstanding || 0) > 0 ? 'neg' : 'pos') }
      ],
      sections: sections
    };
  }

  /* ═══ R7g — Audit Log + Consistency Report ═════════════════════════════════ */
  function buildAuditLogModel(source) {
    source = source || {};
    var rows = source.rows || [];
    var columns = [
      { key: 'date', header: T('التاريخ', 'Date'), align: 'start', format: 'date' },
      { key: 'action', header: T('الإجراء', 'Action'), align: 'center', format: 'text' },
      { key: 'desc', header: T('الوصف', 'Description'), align: 'start', format: 'text' },
      { key: 'user', header: T('المستخدم', 'User'), align: 'center', format: 'text' },
      { key: 'table', header: T('الجدول', 'Table'), align: 'center', format: 'text' }
    ];
    return {
      meta: { reportId: 'AUDIT_LOG', title: T('سجل العمليات', 'Audit Log'), orientation: 'landscape', printDate: source.printDate || null,
        filters: [T('عدد العمليات: ' + rows.length, 'Entries: ' + rows.length)] },
      summary: [], sections: [{ type: 'table', id: 'audit', columns: columns, rows: rows }]
    };
  }

  function buildConsistencyModel(source) {
    source = source || {};
    var v = source.verify || {};
    var checks = (v.checks || []).map(function (c) { return { check: c.k, valueA: Number(c.a || 0), valueB: Number(c.b || 0),
      status: c.match ? T('✓ متطابق', '✓ match') : T('⚠ اختلاف', '⚠ mismatch') }; });
    var verdict = v.allMatch
      ? T('✓ جميع الكشوف متطابقة — لا اختلاف بين أي سطحين', '✓ All statements agree — no divergence between any two surfaces')
      : T('⚠ يوجد اختلاف حقيقي — أي فرق بين سطحين خللٌ دستوري (FD-006)', '⚠ A real divergence exists — any difference between two surfaces is a constitutional defect (FD-006)');
    var sections = [{ type: 'table', id: 'checks',
      columns: [
        { key: 'check', header: T('الفحص', 'Check'), align: 'start', format: 'text' },
        { key: 'valueA', header: T('القيمة أ', 'Value A'), align: 'end', format: 'money' },
        { key: 'valueB', header: T('القيمة ب', 'Value B'), align: 'end', format: 'money' },
        { key: 'status', header: T('الحالة', 'Status'), align: 'center', format: 'text' }
      ], rows: checks }];
    if ((v.failedMembers || []).length) {
      sections.push({ type: 'table', id: 'failed',
        columns: [
          { key: 'member', header: T('العضو', 'Member'), align: 'start', format: 'text' },
          { key: 'fails', header: T('الفحوص المخالفة', 'Failing checks'), align: 'start', format: 'text' }
        ],
        rows: v.failedMembers.slice(0, 25).map(function (f) { return { member: f.name, fails: f.fails }; }) });
    }
    return {
      meta: { reportId: 'CONSISTENCY', title: T('تقرير المطابقة الدستورية', 'Constitutional Consistency'), orientation: 'portrait', printDate: source.printDate || null,
        filters: [T('FD-006 · فُحص ' + (v.memberCount || 0) + ' عضوًا', 'FD-006 · ' + (v.memberCount || 0) + ' members checked')] },
      summary: [
        { key: T('حالة المطابقة', 'Consistency verdict'), value: verdict, format: 'text', tone: (v.allMatch ? 'pos' : 'neg') },
        { key: T('عدد الأعضاء المفحوصين', 'Members checked'), value: Number(v.memberCount || 0), format: 'int' }
      ],
      sections: sections
    };
  }

  /* ── Runtime gatherer (reads FIN/DB globals) — NOT wired to production in R1.
        Provided so R6 can cut the live surface over by calling one function. ── */
  function memberStatementRuntime(memberId, from, to) {
    if (typeof root.FIN === 'undefined' || !root.FIN.memberStatementView) return null;
    var FIN = root.FIN;
    var view = FIN.memberStatementView(memberId, from, to);
    var member = (view.statement && view.statement.member) || (root.gm ? root.gm(memberId) : {}) || {};
    var dons = FIN.memberDonations ? FIN.memberDonations(memberId, from, to) : [];
    var alloc = FIN.allocateFoodDonations ? FIN.allocateFoodDonations() : { perReceipt: {} };
    var donations = (dons || []).map(function (d) {
      return { receipt_date: d.receipt_date, no: d.no, amount_ils: (FIN.amountOf ? FIN.amountOf(d) : d.amount_ils),
               movement_type: d.movement_type, destination_treasury: d.destination_treasury, donation_display_fund: d.donation_display_fund,
               _settled: ((alloc.perReceipt || {})[d.id] || {}).debtSettled || 0 };
    });
    return buildMemberStatementModel({ member: member, view: view, donations: donations, from: from, to: to,
      printDate: new Date().toISOString() });
  }

  var ReportModel = { validate: validate };
  var ReportModels = { memberStatement: memberStatementRuntime, fundStatement: fundStatementRuntime,
    annualDebt: annualDebtRuntime, delinquent: delinquentRuntime, donationReport: donationReportRuntime,
    membersList: membersListRuntime, annualLog: annualLogRuntime, usersList: usersListRuntime };

  if (typeof root !== 'undefined') {
    root.ReportModel = ReportModel;
    root.ReportModels = ReportModels;
    root.buildMemberStatementModel = buildMemberStatementModel;
    root.buildFundStatementModel = buildFundStatementModel;
    root.buildAnnualDebtModel = buildAnnualDebtModel;
    root.buildDelinquentModel = buildDelinquentModel;
    root.buildDonationReportModel = buildDonationReportModel;
    root.buildMembersListModel = buildMembersListModel;
    root.buildAnnualLogModel = buildAnnualLogModel;
    root.buildUsersListModel = buildUsersListModel;
    root.buildTreasuryPositionModel = buildTreasuryPositionModel;
    root.buildDuesSnapshotModel = buildDuesSnapshotModel;
    root.buildAuditLogModel = buildAuditLogModel;
    root.buildConsistencyModel = buildConsistencyModel;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReportModel: ReportModel, ReportModels: ReportModels, buildMemberStatementModel: buildMemberStatementModel, buildFundStatementModel: buildFundStatementModel, buildAnnualDebtModel: buildAnnualDebtModel, buildDelinquentModel: buildDelinquentModel, buildDonationReportModel: buildDonationReportModel, buildMembersListModel: buildMembersListModel, buildAnnualLogModel: buildAnnualLogModel, buildUsersListModel: buildUsersListModel, buildTreasuryPositionModel: buildTreasuryPositionModel, buildDuesSnapshotModel: buildDuesSnapshotModel, buildAuditLogModel: buildAuditLogModel, buildConsistencyModel: buildConsistencyModel, validate: validate, refFromNotes: refFromNotes };
  }
})(typeof window !== 'undefined' ? window : globalThis);
