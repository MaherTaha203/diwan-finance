/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R0 — Unified Financial Reporting Engine · FOUNDATION (skeleton)
   ---------------------------------------------------------------------------
   This is the R0 foundation ONLY. It ships:
     · REPORT_TOKENS      — the single frozen Design-Token source (+ self-hosted
                            @font-face → /fonts/*.woff2). No CDN.
     · ReportRegistry     — every report known by a stable ID (not a function
                            name); each entry declares id/title/icon/category/
                            orientation/defaultColumns/outputs/permission.
     · Report             — the engine: Report.render(modelOrId, target[, opts]).
     · Renderers          — screen/print/pdf/excel/csv, all EMPTY skeletons that
                            share one interface. They render nothing real yet.
     · Report.outputButtons — auto-builds output buttons from a report's declared
                            `outputs` (no developer writes <button>Print</button>).

   NOT in R0: no report is migrated; renderers produce only a skeleton descriptor;
   the engine is loaded but dormant (no production call sites; NO load-time side
   effects — nothing is injected and no font is fetched until a renderer runs).

   Success criterion (R0): Report.render(model,'print' | 'pdf' | 'excel') and the
   id form Report.render('MEMBER_STATEMENT', ...) are callable and return a valid
   skeleton result without throwing. Real output lands in R3 (print) / R4 (pdf) /
   R5 (excel), and the first migrated report (Member Statement) in R6.
   Governed by docs/reporting/REPORT-001_ARCHITECTURE_SPEC.md (§1–§4 immutable).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── §4 Design Tokens — the single source of appearance for every medium.
        Injected by a renderer when it runs (screen once; print/pdf per iframe).
        Namespaced under `rpt-*`; it never touches the legacy .dt/.acct-stmt/.card
        styles. Component styles proper land in R2 — R0 ships tokens + fonts. ── */
  var FONT_DIR = '/fonts/';
  var AR_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF';
  function face(family, weight, file, range) {
    return '@font-face{font-family:"' + family + '";font-style:normal;font-weight:' + weight +
      ';font-display:swap;src:url("' + FONT_DIR + file + '") format("woff2")' +
      (range ? ';unicode-range:' + range : '') + '}';
  }
  var FONT_FACES =
    /* IBM Plex Sans Arabic — arabic + latin subsets, weights 400/500/600/700 */
    face('IBM Plex Sans Arabic', 400, 'ibm-plex-sans-arabic-arabic-400-normal.woff2', AR_RANGE) +
    face('IBM Plex Sans Arabic', 400, 'ibm-plex-sans-arabic-latin-400-normal.woff2') +
    face('IBM Plex Sans Arabic', 500, 'ibm-plex-sans-arabic-arabic-500-normal.woff2', AR_RANGE) +
    face('IBM Plex Sans Arabic', 500, 'ibm-plex-sans-arabic-latin-500-normal.woff2') +
    face('IBM Plex Sans Arabic', 600, 'ibm-plex-sans-arabic-arabic-600-normal.woff2', AR_RANGE) +
    face('IBM Plex Sans Arabic', 600, 'ibm-plex-sans-arabic-latin-600-normal.woff2') +
    face('IBM Plex Sans Arabic', 700, 'ibm-plex-sans-arabic-arabic-700-normal.woff2', AR_RANGE) +
    face('IBM Plex Sans Arabic', 700, 'ibm-plex-sans-arabic-latin-700-normal.woff2') +
    /* IBM Plex Mono — numerals/tabular, weights 400/500/600 (latin) */
    face('IBM Plex Mono', 400, 'ibm-plex-mono-latin-400-normal.woff2') +
    face('IBM Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2') +
    face('IBM Plex Mono', 600, 'ibm-plex-mono-latin-600-normal.woff2');

  var TOKEN_VARS =
    ':root{' +
    '--rpt-ink:#17202E;--rpt-ink2:#57606E;--rpt-muted:#7C8494;--rpt-faint:#AEB6C4;' +
    '--rpt-line:#E5EAF2;--rpt-line2:#C9D2E0;--rpt-hd:#F2F5FA;--rpt-accent:#0F1B33;' +
    '--rpt-pos:#2F6B47;--rpt-neg:#B4552E;' +
    '--rpt-fa:"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;' +
    '--rpt-fe:"IBM Plex Mono",Menlo,monospace;' +
    /* spacing scale (px): 4 6 8 11 14 16 22 30 */
    '--rpt-s1:4px;--rpt-s2:6px;--rpt-s3:8px;--rpt-s4:11px;--rpt-s5:14px;--rpt-s6:16px;--rpt-s7:22px;--rpt-s8:30px' +
    '}';

  /* R0 base: tokens + fonts only. Component classes (.rpt-header/.rpt-table/…)
     are intentionally deferred to R2 (Layout Components). */
  var REPORT_TOKENS = FONT_FACES + TOKEN_VARS;

  /* ── Valid output targets (a report may declare any subset of these) ── */
  var REPORT_TARGETS = ['screen', 'print', 'pdf', 'excel', 'csv'];

  /* Frozen output-control icons (§4.6) — the auto-button builder uses these. */
  var OUTPUT_ICONS = { print: 'ti-printer', pdf: 'ti-file-type-pdf', excel: 'ti-file-spreadsheet', csv: 'ti-file-text', screen: 'ti-eye' };
  var OUTPUT_LABELS = {
    print: { ar: 'طباعة', en: 'Print' }, pdf: { ar: 'تنزيل PDF', en: 'Download PDF' },
    excel: { ar: 'تصدير Excel', en: 'Export Excel' }, csv: { ar: 'تصدير CSV', en: 'Export CSV' },
    screen: { ar: 'عرض', en: 'View' }
  };

  /* ── §2.5 Report Registry — reports known by ID, never by function name.
        R0 declares metadata for every target report (OUTPUT-001 inventory). No
        renderer consumes `defaultColumns` yet; the real column models arrive with
        each report's migration (R6/R7). `permission` ∈ {'print','export'} maps to
        the app's can.print()/can.export(). ── */
  function R(id, title, icon, category, orientation, defaultColumns, outputs, permission) {
    return { id: id, title: title, icon: icon, category: category, orientation: orientation,
             defaultColumns: defaultColumns, outputs: outputs, permission: permission };
  }
  var _defs = [
    R('MEMBER_STATEMENT', { ar: 'كشف الحساب المالي للعضو', en: 'Member Financial Statement' }, 'ti-file-description', 'statement', 'portrait',
      ['date', 'desc', 'year', 'sysNo', 'refNo', 'sub', 'pay', 'balance'], ['screen', 'print', 'pdf', 'excel', 'csv'], 'print'),
    R('FUND_STATEMENT', { ar: 'كشف الصندوق', en: 'Fund Statement' }, 'ti-file-description', 'statement', 'landscape',
      ['date', 'name', 'desc', 'credit', 'debit', 'balance', 'note'], ['screen', 'print', 'pdf', 'excel', 'csv'], 'print'),
    R('ANNUAL_DEBT', { ar: 'تقرير المديونية السنوية', en: 'Annual Debt Report' }, 'ti-report-money', 'report', 'landscape',
      ['code', 'name', 'phone', 'hist', 'histPaid', 'selSub', 'selPaid', 'resolutions', 'current'], ['screen', 'print', 'pdf', 'excel'], 'print'),
    R('DELINQUENT', { ar: 'تقرير الأعضاء المتأخرين', en: 'Delinquent Members' }, 'ti-user-exclamation', 'report', 'landscape',
      ['code', 'name', 'phone', 'years', 'unpaidCount'], ['screen', 'print', 'pdf', 'excel'], 'print'),
    R('DONATION_REPORT', { ar: 'سجل التبرعات', en: 'Donations Register' }, 'ti-heart', 'report', 'landscape',
      ['date', 'ref', 'donor', 'amount', 'currency', 'direction', 'note'], ['screen', 'print', 'pdf', 'excel'], 'print'),
    R('MEMBERS_LIST', { ar: 'قائمة الأعضاء', en: 'Members List' }, 'ti-users', 'list', 'portrait',
      ['idx', 'name', 'phone', 'balance', 'status'], ['screen', 'print', 'pdf', 'excel'], 'print'),
    R('ANNUAL_LOG', { ar: 'سجل الاشتراكات السنوية', en: 'Annual Subscriptions Log' }, 'ti-calendar-stats', 'list', 'portrait',
      ['year', 'amount', 'memberCount', 'appliedAt', 'appliedBy'], ['screen', 'print', 'pdf', 'excel'], 'print'),
    R('RECEIPTS_LIST', { ar: 'قائمة الإيصالات', en: 'Receipts List' }, 'ti-receipt', 'list', 'landscape',
      ['no', 'date', 'party', 'amount', 'method', 'notes'], ['screen', 'print', 'pdf', 'excel'], 'export'),
    R('PAYMENTS_LIST', { ar: 'قائمة المصاريف', en: 'Payments List' }, 'ti-receipt-off', 'list', 'landscape',
      ['no', 'date', 'party', 'amount', 'category', 'notes'], ['screen', 'print', 'pdf', 'excel'], 'export'),
    R('RECEIPT_VOUCHER', { ar: 'سند قبض', en: 'Receipt Voucher' }, 'ti-receipt', 'voucher', 'portrait',
      [], ['print', 'pdf'], 'print'),
    R('PAYMENT_VOUCHER', { ar: 'سند صرف', en: 'Payment Voucher' }, 'ti-receipt-off', 'voucher', 'portrait',
      [], ['print', 'pdf'], 'print'),
    R('TRANSFER_VOUCHER', { ar: 'سند تحويل داخلي', en: 'Internal Transfer Voucher' }, 'ti-transfer', 'voucher', 'portrait',
      [], ['print', 'pdf'], 'print'),
    R('TREASURY_POSITION', { ar: 'المركز المالي للخزينة', en: 'Treasury Position' }, 'ti-building-bank', 'report', 'landscape',
      ['date', 'no', 'fund', 'party', 'desc', 'in', 'out'], ['screen', 'print', 'pdf'], 'print'),
    R('DUES_SNAPSHOT', { ar: 'حالة اشتراكات السنة', en: 'Dues Year Snapshot' }, 'ti-calendar-stats', 'report', 'landscape',
      ['code', 'name', 'phone', 'due', 'paid', 'remaining', 'status'], ['screen', 'print', 'pdf'], 'print'),
    R('AUDIT_LOG', { ar: 'سجل العمليات', en: 'Audit Log' }, 'ti-history', 'report', 'landscape',
      ['date', 'action', 'desc', 'user', 'table'], ['screen', 'print', 'pdf', 'excel'], 'export'),
    R('USERS_LIST', { ar: 'المستخدمون', en: 'Users' }, 'ti-user-cog', 'list', 'portrait',
      ['email', 'role'], ['screen', 'print', 'pdf', 'excel'], 'export'),
    R('CONSISTENCY', { ar: 'تقرير المطابقة الدستورية', en: 'Consistency Report' }, 'ti-scale', 'report', 'portrait',
      [], ['screen', 'print', 'pdf'], 'print')
  ];
  var ReportRegistry = {};
  _defs.forEach(function (d) { ReportRegistry[d.id] = d; });

  /* ── Renderer interface (R0: empty skeletons). Every renderer is
        { target, render(model, ctx) -> { target, status:'skeleton', body:'' } }.
        No side effects, no DOM/browser requirement — real delivery in R3/R4/R5. ── */
  function makeSkeletonRenderer(target) {
    return {
      target: target,
      render: function (model, ctx) {
        return { target: target, status: 'skeleton', empty: true, reportId: (model && model.meta && model.meta.reportId) || (ctx && ctx.reportId) || null, body: '' };
      }
    };
  }
  var _voucherRenderer = null;   /* R7e — set via Report.registerVoucherRenderer */
  var Renderers = {
    screen: makeSkeletonRenderer('screen'),
    print: makeSkeletonRenderer('print'),
    pdf: makeSkeletonRenderer('pdf'),
    excel: makeSkeletonRenderer('excel'),
    csv: makeSkeletonRenderer('csv')
  };

  /* ── The engine. Polymorphic first arg:
          Report.render(model, target[, opts])   — model carries meta.reportId
          Report.render('REPORT_ID', target[, opts{ model }])
        Returns a result object; never throws for well-formed input. ── */
  var Report = {
    version: 0,                 // R0 = foundation skeleton
    TOKENS: REPORT_TOKENS,
    TARGETS: REPORT_TARGETS.slice(),

    list: function () { return Object.keys(ReportRegistry).map(function (k) { return ReportRegistry[k]; }); },
    get: function (id) { return ReportRegistry[id] || null; },

    render: function (modelOrId, target, opts) {
      opts = opts || {};
      var reportId, model;
      if (typeof modelOrId === 'string') { reportId = modelOrId; model = opts.model || null; }
      else { model = modelOrId || null; reportId = (model && model.meta && model.meta.reportId) || null; }

      if (REPORT_TARGETS.indexOf(target) < 0) return { ok: false, reason: 'unknown_target', target: target };
      var def = reportId ? ReportRegistry[reportId] : null;
      if (reportId && !def) return { ok: false, reason: 'unknown_report', reportId: reportId };
      if (def && def.outputs.indexOf(target) < 0) return { ok: false, reason: 'output_not_supported', reportId: reportId, target: target };

      /* R7e — voucher reports are formal single-record documents, not tabular.
         They are served by a dedicated hybrid renderer (registered separately)
         that reuses the certified voucher builders; the tabular renderers and the
         frozen ReportModel are untouched. */
      if (def && def.category === 'voucher') {
        if (!_voucherRenderer) return { ok: false, reason: 'voucher_renderer_unavailable', reportId: reportId, target: target };
        var vout = _voucherRenderer.render(reportId, target, opts);
        return { ok: true, skeleton: !!(vout && vout.empty), reportId: reportId, target: target, definition: def, result: vout };
      }

      var renderer = Renderers[target];
      var out = renderer.render(model, { reportId: reportId, opts: opts });
      /* `skeleton` reflects the renderer: empty skeletons flag empty:true; a real
         renderer (R3+ print, …) reports its own status and is not a skeleton. */
      return { ok: true, skeleton: !!(out && out.empty), reportId: reportId, target: target, definition: def, result: out };
    },

    /* Renderer registration — each renderer phase (R3 print, R4 pdf, R5 excel)
       ships its own module and swaps its empty skeleton for the real one, without
       editing the engine core. */
    registerRenderer: function (target, renderer) {
      if (REPORT_TARGETS.indexOf(target) >= 0 && renderer && typeof renderer.render === 'function') { Renderers[target] = renderer; return true; }
      return false;
    },

    /* R7e — the hybrid voucher renderer (one, shared by all voucher reports).
       Kept separate from the tabular target renderers on purpose. */
    registerVoucherRenderer: function (vr) {
      if (vr && typeof vr.render === 'function') { _voucherRenderer = vr; return true; }
      return false;
    },

    /* §2.6 — the system builds output buttons from the report's declared `outputs`;
       no page hand-writes <button>Print</button>. Permission-gated via ctx.can
       (falls back to a global `can`). R0 provides the builder; it is not yet
       placed on any page (that happens as each report migrates in R6/R7). */
    outputButtons: function (reportId, ctx) {
      ctx = ctx || {};
      var def = ReportRegistry[reportId];
      if (!def) return '';
      var lang = ctx.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
      var canObj = ctx.can || (typeof root !== 'undefined' && root.can) || null;
      var allowed = function (perm) {
        if (!canObj) return true;                         // no gate available → show (tests)
        if (perm === 'export') return !!(canObj.export && canObj.export());
        return !!(canObj.print && canObj.print());
      };
      if (!allowed(def.permission)) return '';
      var outs = def.outputs.filter(function (o) { return o !== 'screen'; }).map(function (o) {
        var lbl = (OUTPUT_LABELS[o] || {})[lang] || o;
        return '<button type="button" class="rpt-out-btn" data-report="' + def.id + '" data-output="' + o + '">' +
          '<i class="ti ' + (OUTPUT_ICONS[o] || 'ti-download') + '"></i><span>' + lbl + '</span></button>';
      }).join('');
      /* OUTPUT-002-C Items 14/15 — copy-link + share, bound to the single deep-link
         source (handled by report-share.js's document delegate; data-action, not
         data-output, so the render handlers ignore them). */
      var copyLbl = lang === 'en' ? 'Copy link' : 'نسخ الرابط';
      var shareLbl = lang === 'en' ? 'Share' : 'مشاركة';
      outs += '<button type="button" class="rpt-out-btn" data-report="' + def.id + '" data-action="link">' +
        '<i class="ti ti-link"></i><span>' + copyLbl + '</span></button>' +
        '<button type="button" class="rpt-out-btn" data-report="' + def.id + '" data-action="share">' +
        '<i class="ti ti-share"></i><span>' + shareLbl + '</span></button>';
      return outs;
    }
  };

  /* Dual export — global for the app (dormant; NO load-time side effects) and
     CommonJS for the node test-suite. */
  if (typeof root !== 'undefined') {
    root.Report = Report;
    root.ReportRegistry = ReportRegistry;
    root.REPORT_TOKENS = REPORT_TOKENS;
    root.REPORT_TARGETS = REPORT_TARGETS.slice();
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Report: Report, ReportRegistry: ReportRegistry, REPORT_TOKENS: REPORT_TOKENS, REPORT_TARGETS: REPORT_TARGETS, Renderers: Renderers };
  }
})(typeof window !== 'undefined' ? window : globalThis);
