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
  var ReportModels = { memberStatement: memberStatementRuntime, fundStatement: fundStatementRuntime };

  if (typeof root !== 'undefined') {
    root.ReportModel = ReportModel;
    root.ReportModels = ReportModels;
    root.buildMemberStatementModel = buildMemberStatementModel;
    root.buildFundStatementModel = buildFundStatementModel;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReportModel: ReportModel, ReportModels: ReportModels, buildMemberStatementModel: buildMemberStatementModel, buildFundStatementModel: buildFundStatementModel, validate: validate, refFromNotes: refFromNotes };
  }
})(typeof window !== 'undefined' ? window : globalThis);
