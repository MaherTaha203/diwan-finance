/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R2 — Layout Components (renderer-agnostic).
   ---------------------------------------------------------------------------
   Turns a frozen ReportModel (R1) into the ordered layout components of spec §3,
   as SHARED HTML that the screen, print and PDF renderers all consume unchanged
   (Excel maps from the model's columns separately). This is the "Layout Engine"
   in Financial Data -> ReportModel -> Layout Engine -> Renderers.

   Pure + string-only: no DOM, no FIN/DB, no side effects. It emits namespaced
   `rpt-*` markup styled by REPORT_COMPONENT_CSS + the R0 REPORT_TOKENS.

   R2 does NOT wire any renderer and migrates NO report. The Print renderer (R3)
   will call ReportLayout.build(model) and hand the result to openPrintWin; the
   Screen renderer likewise. This file only builds the components + their CSS.

   ReportLayout.build(model, {lang}) -> { html, css }
     html = header + meta + kpi + filters + [sections: band|table] + footer
     css  = REPORT_TOKENS (R0) + REPORT_COMPONENT_CSS (this file)
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── escaping + formatters (presentation lives here, never in the model) ── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(v, lang) { return (v && typeof v === 'object' && ('ar' in v || 'en' in v)) ? (lang === 'en' ? (v.en != null ? v.en : v.ar) : (v.ar != null ? v.ar : v.en)) : v; }
  /* OUTPUT-002-C F-2 — currency reads "number then ₪" (Arabic-conventional order),
     e.g. "200 ₪" not "₪ 200". The numeral group stays isolated LTR via .rpt-num. */
  function money(n) { var x = Number(n || 0); return Math.round(x).toLocaleString('en-US') + ' ₪'; }
  function moneyAbs(n) { return Math.abs(Math.round(Number(n || 0))).toLocaleString('en-US') + ' ₪'; }
  function fmtDate(d) { if (!d) return '—'; try { var dt = new Date(d); if (isNaN(dt)) return String(d); var p = function (x) { return String(x).padStart(2, '0'); }; return p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + '/' + dt.getFullYear(); } catch (e) { return String(d); } }

  /* one balance cell: signed → abs + Dr/Cr tag (matches the current statement) */
  function balanceCell(v, lang) {
    var n = Number(v || 0);
    var tag = n > 0 ? '<span class="rpt-tag rpt-dr">' + (lang === 'en' ? 'Dr' : 'مدين') + '</span>'
      : n < 0 ? '<span class="rpt-tag rpt-cr">' + (lang === 'en' ? 'Cr' : 'دائن') + '</span>' : '';
    return '<span class="rpt-num">' + moneyAbs(n) + '</span>' + tag;
  }

  /* render one cell value by its column format */
  function cell(value, format, lang) {
    if (value == null || value === '') return '<span class="rpt-mut">—</span>';
    switch (format) {
      case 'money': return '<span class="rpt-num">' + money(value) + '</span>';
      case 'balance': return balanceCell(value, lang);
      case 'date': return '<span class="rpt-num">' + fmtDate(value) + '</span>';
      case 'int': case 'num': return '<span class="rpt-num">' + esc(value) + '</span>';
      default: return esc(pick(value, lang));
    }
  }

  /* OUTPUT-002-C F-3 — one deterministic alignment policy by column TYPE, applied
     identically to header, body and totals so a column's head/cells/total always
     share an edge. Text and amounts (money/balance) align to the RTL start (right,
     with numerals isolated LTR); identifiers/counts/dates centre. This replaces the
     per-column `c.align` that drifted between reports. */
  function colAlign(c) {
    var f = c && c.format;
    return (f === 'int' || f === 'num' || f === 'date') ? 'rpt-a-center' : 'rpt-a-start';
  }

  /* ── components (each returns an HTML string) ── */
  var DEFAULT_ORG = { name: 'ديوان آل طه', subtitle: 'نظام الإدارة المالية', site: 'diwan-finance.com', logo: '' };
  /* OUTPUT-002-C — the Organization/Output Profile is the single identity source
     for every report; an explicit meta.org still wins, and DEFAULT_ORG is the last
     fallback if the profile module is not loaded (e.g. node unit tests). */
  function orgOf(meta) { return (meta && meta.org) || (root.OutputProfile && root.OutputProfile.org && root.OutputProfile.org()) || DEFAULT_ORG; }

  /* OUTPUT-002-C — the single unified Letterhead (Financial Enterprise). It appears
     ONCE at the top of page 1 and carries every identity element exactly once:
     logo (print/PDF only) + org name + system name — then a ruled title — then ONE
     context line (member/fund/period/filters). The print DATE is NOT here: it lives
     once in the footer. On continuation pages nothing of this repeats; only the
     table's own column headers repeat (table-header-group), which is not duplication. */
  function header(meta, lang, target) {
    var org = orgOf(meta);
    /* OUTPUT-002-C UX Slice 1 — the whole document-brand masthead (logo + org name +
       system name + website) is DOCUMENT identity and belongs to Print/PDF only. On
       SCREEN it is never rendered: the org name and the website are part of the
       document brand just like the logo, and the app shell already carries the
       organisation identity. The screen report shows only its title + context line +
       body. This is the Output Rendering Contract — decided by `target`, not by CSS. */
    if (target === 'screen') {
      return '<div class="rpt-title"><h1>' + esc(pick(meta.title, lang)) + '</h1></div>' + metaLine(meta, lang);
    }
    var printLogo = org.logo
      ? '<div class="rpt-hd-chip"><img src="' + esc(org.logo) + '" alt=""></div>' : '';
    return '<div class="rpt-mast-brand"><header class="rpt-header">' +
      '<div class="rpt-hd-org"><div class="rpt-hd-txt"><div class="rpt-hd-name">' + esc(pick(org.name, lang)) + '</div>' +
      (org.subtitle ? '<div class="rpt-hd-sub">' + esc(pick(org.subtitle, lang)) + (org.site ? ' · ' + esc(org.site) : '') + '</div>' : '') + '</div>' +
      printLogo + '</div>' +
      '</header><div class="rpt-rule"></div></div>' +
      '<div class="rpt-title"><h1>' + esc(pick(meta.title, lang)) + '</h1></div>' +
      metaLine(meta, lang);
  }

  function metaLine(meta, lang) {
    var parts = [];
    if (meta.party) {
      var p = meta.party;
      if (p.name) parts.push((lang === 'en' ? 'Member: ' : 'العضو: ') + '<b>' + esc(p.name) + '</b>');
      if (p.code) parts.push((lang === 'en' ? 'No. ' : 'رقم العضو: ') + '<b class="rpt-num">' + esc(p.code) + '</b>');
      if (p.phone) parts.push('☎ <span class="rpt-num">' + esc(p.phone) + '</span>');
    }
    if (meta.period && (meta.period.from || meta.period.to)) {
      var f = meta.period.from, t = meta.period.to;
      var lbl = f && t ? fmtDate(f) + ' — ' + fmtDate(t) : f ? (lang === 'en' ? 'From ' : 'من ') + fmtDate(f) : (lang === 'en' ? 'To ' : 'حتى ') + fmtDate(t);
      parts.push((lang === 'en' ? 'Period: ' : 'الفترة: ') + lbl);
    }
    if (meta.docNo) parts.push((lang === 'en' ? 'Doc no. ' : 'رقم السند: ') + '<b class="rpt-num">' + esc(meta.docNo) + '</b>');
    /* filters belong to the SAME single context line (not a separate band) so the
       report's identifying data reads once, in one place (dedup mandate). */
    if (meta.filters && meta.filters.length) {
      parts.push((lang === 'en' ? 'Filters: ' : 'الفلتر: ') +
        meta.filters.map(function (f) { return esc(pick(f, lang)); }).join(' · '));
    }
    return parts.length ? '<div class="rpt-meta">' + parts.join(' · ') + '</div>' : '';
  }

  function kpi(summary, lang) {
    if (!summary || !summary.length) return '';
    return '<div class="rpt-cards">' + summary.map(function (s) {
      var tone = s.tone === 'pos' ? ' rpt-pos' : s.tone === 'neg' ? ' rpt-neg' : '';
      /* money must be LTR-isolated (.rpt-num) so the "number ₪" order survives bidi
         in the RTL card; balanceCell already isolates, plain text stays as-is. */
      var val = s.format === 'balance' ? balanceCell(s.value, lang) : s.format === 'money' ? ('<span class="rpt-num">' + money(s.value) + '</span>') : esc(pick(s.value, lang));
      return '<div class="rpt-card"><div class="rpt-card-k">' + esc(pick(s.key, lang)) + '</div><div class="rpt-card-v' + tone + '">' + val + '</div></div>';
    }).join('') + '</div>';
  }

  function band(sec, lang) {
    var val = sec.format === 'balance' ? balanceCell(sec.value, lang) : ('<span class="rpt-num">' + money(sec.value) + '</span>');
    return '<div class="rpt-band"><span>' + esc(pick(sec.key, lang)) + '</span><span>' + val + '</span></div>';
  }

  function table(sec, lang, win) {
    var cols = sec.columns || [];
    var thead = '<thead><tr>' + cols.map(function (c) {
      return '<th class="' + colAlign(c) + '">' + esc(pick(c.header, lang)) + '</th>';
    }).join('') + '</tr></thead>';
    /* SYS-002 — SCREEN-ONLY row windowing. When `win` is supplied (screen renderer
       only; print/pdf/excel never pass it) and a table exceeds the threshold, only
       the first `initial` detail rows are materialised, followed by a "show all"
       control. The `tfoot` totals below come from `sec.totals` (the FULL model), so
       the final balance/totals are ALWAYS correct — windowing hides only detail rows,
       never a figure, and print/PDF/Excel always render every row. */
    var allRows = sec.rows || [];
    var capped = !!(win && win.initial && allRows.length > (win.threshold || win.initial));
    var shown = capped ? allRows.slice(0, win.initial) : allRows;
    var body = shown.map(function (r) {
      return '<tr>' + cols.map(function (c) {
        return '<td class="' + colAlign(c) + '">' + cell(r[c.key], c.format, lang) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    if (capped) {
      body += '<tr class="rpt-more"><td class="rpt-a-start" colspan="' + Math.max(1, cols.length) + '">' +
        '<button type="button" class="rpt-showall" onclick="window.Report&&window.Report.expandReport&&window.Report.expandReport(this)">' +
        (lang === 'en'
          ? ('Showing ' + shown.length + ' of ' + allRows.length + ' rows — show all')
          : ('عرض ' + shown.length + ' من ' + allRows.length + ' صفًّا — عرض الكل')) +
        '</button></td></tr>';
    }
    var tbody = '<tbody>' + body + '</tbody>';
    var tfoot = '';
    if (sec.totals) {
      var tt = sec.totals, cells = tt.cells || {};
      /* label spans the leading columns up to the first totalled column */
      var firstTotalIdx = cols.findIndex(function (c) { return Object.prototype.hasOwnProperty.call(cells, c.key); });
      if (firstTotalIdx < 0) firstTotalIdx = cols.length;
      var labelTxt = esc(pick(tt.label, lang)) + (tt.status ? ' · <span class="rpt-status">' + esc(pick(tt.status, lang)) + '</span>' : '');
      var tds = '<td class="rpt-a-start" colspan="' + Math.max(1, firstTotalIdx) + '">' + labelTxt + '</td>';
      for (var i = Math.max(1, firstTotalIdx); i < cols.length; i++) {
        var c = cols[i];
        tds += '<td class="' + colAlign(c) + '">' + (Object.prototype.hasOwnProperty.call(cells, c.key) ? cell(cells[c.key], c.format, lang) : '') + '</td>';
      }
      tfoot = '<tfoot><tr class="rpt-total">' + tds + '</tr></tfoot>';
    }
    var foot = (sec.footnotes && sec.footnotes.length)
      ? '<div class="rpt-notes">' + sec.footnotes.map(function (n) { return '<div>' + esc(pick(n, lang)) + '</div>'; }).join('') + '</div>' : '';
    return '<div class="rpt-tablewrap"><table class="rpt-table">' + thead + tbody + tfoot + '</table></div>' + foot;
  }

  /* OUTPUT-002-C — reports carry NO signature/QR/stamp sign-off (owner decision):
     the on-document verification QR + signature belong to the certified vouchers
     (print.js), not to tabular reports/statements. Removing the sign-off also fixes
     the multi-page pagination (no orphan sign-off page, no split signature line). */

  /* OUTPUT-002-C — ONE simple footer, the single home of the print date (removed from
     the header). It repeats at the foot of every printed page (the standard place for
     a running date) and reserves a page-number slot. Page numbers: a paged engine fills
     `@bottom-*` counters (see report-render-print pageCss); Chrome's own print chrome
     supplies "page X of Y". No org name / site / time is repeated here. */
  function footer(meta, lang) {
    var date = meta.printDate ? fmtDate(meta.printDate) : fmtDate(new Date().toISOString());
    return '<div class="rpt-footer"><span>' + (lang === 'en' ? 'Printed: ' : 'طُبع: ') +
      '<span class="rpt-num">' + date + '</span></span><span class="rpt-pageno"></span></div>';
  }

  /* ── the ordered assembly (spec §3) ── */
  function build(model, opts) {
    opts = opts || {};
    var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
    var m = model.meta || {};
    var html = '<div class="rpt-doc" dir="rtl">';
    /* OUTPUT-002-C — one Letterhead (once), KPIs once, sections, one footer. No
       fixed running-header band (it duplicated the title/site on page 1); no separate
       filters band (filters now live in the single context line). Continuation pages
       repeat only the table column headers via table-header-group. */
    html += header(m, lang, opts.target || 'print');
    html += kpi(model.summary, lang);
    (model.sections || []).forEach(function (sec) {
      if (sec.type === 'band') html += band(sec, lang);
      else if (sec.type === 'table') html += table(sec, lang, opts.windowRows);
    });
    html += footer(m, lang);
    html += '</div>';
    var css = ((typeof root !== 'undefined' && root.REPORT_TOKENS) || '') + REPORT_COMPONENT_CSS;
    return { html: html, css: css };
  }

  /* ── component CSS (namespaced rpt-*; consumes the R0 token vars). This is the
        R2 delivery of the component classes deferred in R0. ── */
  var REPORT_COMPONENT_CSS =
    '.rpt-doc{font-family:var(--rpt-fa);color:var(--rpt-ink);direction:rtl;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.rpt-doc *{box-sizing:border-box}' +
    '.rpt-num{font-family:var(--rpt-fe);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}' +
    '.rpt-mut{color:var(--rpt-faint)}' +
    '.rpt-header{display:flex;justify-content:space-between;align-items:flex-start}' +
    '.rpt-hd-date{font-size:11px;color:var(--rpt-muted);font-weight:600;padding-top:8px}' +
    '.rpt-hd-org{display:flex;gap:14px;align-items:center}.rpt-hd-txt{text-align:right}' +
    '.rpt-hd-name{font-size:18px;font-weight:700;line-height:1.2;letter-spacing:-.2px}' +
    '.rpt-hd-sub{font-size:10px;color:var(--rpt-muted);margin-top:4px;line-height:1.7}' +
    '.rpt-hd-chip{width:56px;height:56px;flex:none;display:grid;place-items:center}.rpt-hd-chip img{width:100%;height:100%;object-fit:contain}' +
    '.rpt-rule{height:2px;background:var(--rpt-ink);border-radius:2px;margin-top:14px}' +
    '.rpt-title{text-align:center;margin:18px 0 6px}.rpt-title h1,.rpt-title h2{font-size:19px;font-weight:700;display:inline-block;margin:0}' +
    '.rpt-meta{text-align:center;margin:11px 0 18px;font-size:11.5px;color:var(--rpt-muted);font-weight:500;line-height:1.9}.rpt-meta b{color:var(--rpt-ink2);font-weight:600}' +
    /* OUTPUT-002-C — KPIs as a FLAT enterprise stat strip (Swiss), shown once at the
       top. No rounded cards / no big boxes: a single ruled row, cells split by hairlines,
       values right-aligned tabular. */
    '.rpt-cards{display:flex;gap:0;margin:14px 0 6px;border-top:1.5px solid var(--rpt-ink);border-bottom:1px solid var(--rpt-line2)}' +
    '.rpt-card{flex:1;padding:8px 12px;text-align:right;border-inline-start:1px solid var(--rpt-line)}' +
    '.rpt-card:first-child{border-inline-start:0}' +
    '.rpt-card-k{font-size:9px;letter-spacing:.03em;color:var(--rpt-muted);font-weight:600}' +
    '.rpt-card-v{font-size:14px;font-weight:700;margin-top:3px;font-family:var(--rpt-fe);font-variant-numeric:tabular-nums;color:var(--rpt-ink)}' +
    '.rpt-card-v.rpt-pos{color:var(--rpt-pos)}.rpt-card-v.rpt-neg{color:var(--rpt-neg)}' +
    '.rpt-band{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--rpt-line2);border-inline-start:3px solid var(--rpt-accent);border-radius:8px;padding:10px 14px;margin:4px 0 14px;font-size:12px;font-weight:600;color:var(--rpt-ink2)}' +
    '.rpt-tablewrap{overflow-x:auto}' +
    '.rpt-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}' +
    '.rpt-table thead th{background:var(--rpt-hd);color:var(--rpt-ink2);padding:9px 10px;font-weight:600;font-size:10.5px;white-space:nowrap;border-bottom:1px solid var(--rpt-line2)}' +
    '.rpt-table tbody td{padding:9px 10px;border-bottom:1px solid var(--rpt-line);vertical-align:middle}' +
    '.rpt-a-start{text-align:right}.rpt-a-center{text-align:center}.rpt-a-end{text-align:left}' +
    '.rpt-tag{font-family:var(--rpt-fa);font-size:10px;font-weight:600;margin-inline-start:5px}.rpt-tag.rpt-dr{color:var(--rpt-neg)}.rpt-tag.rpt-cr{color:var(--rpt-pos)}' +
    '.rpt-table tr.rpt-total td{border-top:2px solid var(--rpt-accent);font-weight:800;font-size:12px;padding:11px 10px}' +
    '.rpt-status{font-weight:500;color:var(--rpt-ink2)}' +
    '.rpt-notes{font-size:10px;color:var(--rpt-muted);margin:6px 0}' +
    '.rpt-footer{border-top:1px solid var(--rpt-line);margin-top:24px;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:var(--rpt-faint)}' +
    /* R6 output toolbar (screen-only affordance, §4.6): the engine builds these
       buttons from the report's declared outputs — pages never hand-write them. */
    '.rpt-toolbar{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin:0 0 14px}' +
    '.rpt-out-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid var(--rpt-line);border-radius:8px;' +
      'background:#fff;color:var(--rpt-ink);font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .12s,border-color .12s}' +
    '.rpt-out-btn:hover{background:var(--rpt-hd);border-color:var(--rpt-line2)}' +
    '.rpt-out-btn i{font-size:15px;color:var(--rpt-accent)}' +
    '@media print{.rpt-toolbar{display:none}}' +
    /* SYS-002 — screen "show all" row (never printed; print always has every row). */
    '.rpt-more td{text-align:center;padding:6px}' +
    '.rpt-showall{cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:var(--rpt-accent,#2B3A5C);' +
      'background:transparent;border:1px dashed var(--rpt-line2,#ccc);border-radius:7px;padding:6px 14px}' +
    '.rpt-showall:hover{border-style:solid}' +
    '@media print{.rpt-more{display:none}}' +
    '@media print{' +
      /* a scroll wrapper makes no sense in print — let the ledger fragment natively. */
      '.rpt-tablewrap{overflow:visible}' +
      /* Column headers repeat on continuation pages (table-header-group) — the ONLY
         repeated element, and not a duplication of identity. Totals appear once at the
         true end (table-row-group), never as a mid-ledger footer. The Letterhead + KPIs
         stay whole on page 1 (page-break-after:avoid). */
      '.rpt-table thead{display:table-header-group}.rpt-table tfoot{display:table-row-group}' +
      '.rpt-table tr{page-break-inside:avoid}' +
      '.rpt-band,.rpt-total{page-break-inside:avoid}' +
      '.rpt-header,.rpt-rule,.rpt-title,.rpt-meta,.rpt-cards{page-break-after:avoid}' +
      '.rpt-mast-brand{margin-top:0}' +
      /* ONE running footer: the single home of the print date, at the foot of every
         page. Sits inside the @page bottom margin reserved by report-render-print. */
      '.rpt-footer{position:fixed;bottom:0;left:0;right:0;margin:0;padding:1.5mm 0 0;' +
        'border-top:1px solid var(--rpt-line);background:#fff;font-size:8px;color:var(--rpt-faint)}' +
    '}';

  var ReportLayout = { build: build, formatCell: cell, REPORT_COMPONENT_CSS: REPORT_COMPONENT_CSS,
    _fmt: { money: money, moneyAbs: moneyAbs, date: fmtDate, balanceCell: balanceCell } };

  if (typeof root !== 'undefined') { root.ReportLayout = ReportLayout; root.REPORT_COMPONENT_CSS = REPORT_COMPONENT_CSS; }
  if (typeof module !== 'undefined' && module.exports) module.exports = ReportLayout;
})(typeof window !== 'undefined' ? window : globalThis);
