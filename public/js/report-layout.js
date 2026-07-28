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
  function money(n) { var x = Number(n || 0); return '₪ ' + Math.round(x).toLocaleString('en-US'); }
  function moneyAbs(n) { return '₪ ' + Math.abs(Math.round(Number(n || 0))).toLocaleString('en-US'); }
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

  var ALIGN = { start: 'rpt-a-start', center: 'rpt-a-center', end: 'rpt-a-end' };

  /* ── components (each returns an HTML string) ── */
  var DEFAULT_ORG = { name: 'ديوان آل طه', subtitle: 'نظام الإدارة المالية', site: 'diwan-finance.com', logo: '' };
  /* OUTPUT-002-C — the Organization/Output Profile is the single identity source
     for every report; an explicit meta.org still wins, and DEFAULT_ORG is the last
     fallback if the profile module is not loaded (e.g. node unit tests). */
  function orgOf(meta) { return (meta && meta.org) || (root.OutputProfile && root.OutputProfile.org && root.OutputProfile.org()) || DEFAULT_ORG; }

  function header(meta, lang, target) {
    var org = orgOf(meta);
    var date = meta.printDate ? fmtDate(meta.printDate) : fmtDate(new Date().toISOString());
    /* Logo separates system UI from official documents: it belongs to the PRINTED
       Report Header only. On screen (in-app view) the masthead carries no logo; on
       print/PDF the org logo sits in the masthead beside the name. The masthead is the
       page-1 document header in print; the running header (R4) repeats the brand text
       on continuation pages. Title + meta always stay in the flow (once). */
    var printLogo = (target !== 'screen') && org.logo
      ? '<div class="rpt-hd-chip"><img src="' + esc(org.logo) + '" alt=""></div>' : '';
    return '<div class="rpt-mast-brand"><header class="rpt-header">' +
      '<div class="rpt-hd-org"><div class="rpt-hd-txt"><div class="rpt-hd-name">' + esc(pick(org.name, lang)) + '</div>' +
      (org.subtitle ? '<div class="rpt-hd-sub">' + esc(pick(org.subtitle, lang)) + (org.site ? ' · ' + esc(org.site) : '') + '</div>' : '') + '</div>' +
      printLogo + '</div>' +
      '<div class="rpt-hd-date">' + (lang === 'en' ? 'Printed: ' : 'تاريخ الطباعة: ') + '<span class="rpt-num">' + date + '</span></div>' +
      '</header><div class="rpt-rule"></div></div>' +
      '<div class="rpt-title"><h1>' + esc(pick(meta.title, lang)) + '</h1></div>' +
      metaLine(meta, lang);
  }

  /* R4 — running header/footer: repeat on every printed page via position:fixed
     (@media print only; hidden on screen). Page numbers come from the browser's
     own print / Save-as-PDF chrome (no in-document counter). */
  function runningHeader(meta, lang) {
    var org = orgOf(meta);
    return '<div class="rpt-runhead"><span>' + esc(pick(org.name, lang)) + (org.site ? ' — ' + esc(org.site) : '') + '</span></div>';
  }
  function runningFooter(meta, lang) {
    var org = orgOf(meta);
    var date = meta.printDate ? fmtDate(meta.printDate) : fmtDate(new Date().toISOString());
    return '<div class="rpt-runfoot"><span>' + esc(pick(org.name, lang)) + ' — ' + esc(org.site || '') + '</span>' +
      '<span>' + (lang === 'en' ? 'Printed: ' : 'طُبع: ') + '<span class="rpt-num">' + date + '</span></span></div>';
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
    return parts.length ? '<div class="rpt-meta">' + parts.join(' · ') + '</div>' : '';
  }

  function kpi(summary, lang) {
    if (!summary || !summary.length) return '';
    return '<div class="rpt-cards">' + summary.map(function (s) {
      var tone = s.tone === 'pos' ? ' rpt-pos' : s.tone === 'neg' ? ' rpt-neg' : '';
      var val = s.format === 'balance' ? balanceCell(s.value, lang) : s.format === 'money' ? money(s.value) : esc(pick(s.value, lang));
      return '<div class="rpt-card"><div class="rpt-card-k">' + esc(pick(s.key, lang)) + '</div><div class="rpt-card-v' + tone + '">' + val + '</div></div>';
    }).join('') + '</div>';
  }

  function filters(meta, lang) {
    if (!meta.filters || !meta.filters.length) return '';
    return '<div class="rpt-filters">' + (lang === 'en' ? 'Filters: ' : 'الفلتر: ') +
      meta.filters.map(function (f) { return '<span class="rpt-chip">' + esc(pick(f, lang)) + '</span>'; }).join(' ') + '</div>';
  }

  function band(sec, lang) {
    var val = sec.format === 'balance' ? balanceCell(sec.value, lang) : money(sec.value);
    return '<div class="rpt-band"><span>' + esc(pick(sec.key, lang)) + '</span><span>' + val + '</span></div>';
  }

  function table(sec, lang, win) {
    var cols = sec.columns || [];
    var thead = '<thead><tr>' + cols.map(function (c) {
      return '<th class="' + (ALIGN[c.align] || 'rpt-a-start') + '">' + esc(pick(c.header, lang)) + '</th>';
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
        return '<td class="' + (ALIGN[c.align] || 'rpt-a-start') + '">' + cell(r[c.key], c.format, lang) + '</td>';
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
        tds += '<td class="' + (ALIGN[c.align] || 'rpt-a-end') + '">' + (Object.prototype.hasOwnProperty.call(cells, c.key) ? cell(cells[c.key], c.format, lang) : '') + '</td>';
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

  function footer(meta, lang) {
    var org = meta.org || { name: 'ديوان آل طه', site: 'diwan-finance.com' };
    var date = meta.printDate ? fmtDate(meta.printDate) : fmtDate(new Date().toISOString());
    return '<div class="rpt-footer"><span>' + esc(pick(org.name, lang)) + ' — ' + esc(org.site || '') + '</span>' +
      '<span>' + (lang === 'en' ? 'Printed: ' : 'طُبع: ') + '<span class="rpt-num">' + date + '</span></span></div>';
  }

  /* ── the ordered assembly (spec §3) ── */
  function build(model, opts) {
    opts = opts || {};
    var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
    var m = model.meta || {};
    var html = '<div class="rpt-doc" dir="rtl">';
    html += runningHeader(m, lang);   /* print-only, position:fixed; every page */
    html += runningFooter(m, lang);   /* print-only, position:fixed; every page */
    html += header(m, lang, opts.target || 'print');
    html += kpi(model.summary, lang);
    html += filters(m, lang);
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
    '.rpt-cards{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0 4px}' +
    '.rpt-card{flex:1 1 130px;background:#fff;border:1px solid var(--rpt-line);border-top:2px solid var(--rpt-line2);border-radius:9px;padding:11px 13px;text-align:center}' +
    '.rpt-card-k{font-size:9.5px;color:var(--rpt-muted);font-weight:600}.rpt-card-v{font-size:14px;font-weight:700;margin-top:5px;font-family:var(--rpt-fe);font-variant-numeric:tabular-nums}' +
    '.rpt-card-v.rpt-pos{color:var(--rpt-pos)}.rpt-card-v.rpt-neg{color:var(--rpt-neg)}' +
    '.rpt-filters{margin:8px 0;font-size:11px;color:var(--rpt-muted)}.rpt-chip{display:inline-block;border:1px solid var(--rpt-line2);border-radius:20px;padding:1px 9px;margin-inline-start:4px}' +
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
    /* R4 running header/footer: off on screen; repeated on every printed page. */
    '.rpt-runhead,.rpt-runfoot{display:none}' +
    '@media print{' +
      /* a scroll wrapper makes no sense in print — let the ledger fragment natively. */
      '.rpt-tablewrap{overflow:visible}' +
      /* the totals row appears ONCE at the true end of the ledger (table-row-group),
         never as a misleading mid-ledger footer at the bottom of every page. NOTE:
         Chromium repeats EITHER a position:fixed running band OR a table-header-group
         across pages, not both; per the owner's running-header decision the brand band
         (below) repeats every page and the column headers head the ledger on page 1. */
      '.rpt-table thead{display:table-header-group}.rpt-table tfoot{display:table-row-group}' +
      '.rpt-table tr{page-break-inside:avoid}' +
      '.rpt-band,.rpt-total{page-break-inside:avoid}' +
      '.rpt-header,.rpt-rule,.rpt-title,.rpt-meta{page-break-after:avoid}' +
      /* the masthead IS the page-1 document header in print (logo lives here); only the
         in-flow footer gives way to the fixed running footer band. */
      '.rpt-footer{display:none}' +
      '.rpt-mast-brand{margin-top:1mm}' +
      '.rpt-runhead{display:flex;position:fixed;top:0;left:0;right:0;height:9mm;align-items:center;justify-content:flex-start;' +
        'border-bottom:1px solid var(--rpt-line2);font-size:9px;color:var(--rpt-muted);font-weight:600;background:#fff}' +
      '.rpt-runfoot{display:flex;position:fixed;bottom:0;left:0;right:0;height:7mm;align-items:center;justify-content:space-between;' +
        'border-top:1px solid var(--rpt-line);font-size:8px;color:var(--rpt-faint);background:#fff}' +
    '}';

  var ReportLayout = { build: build, formatCell: cell, REPORT_COMPONENT_CSS: REPORT_COMPONENT_CSS,
    _fmt: { money: money, moneyAbs: moneyAbs, date: fmtDate, balanceCell: balanceCell } };

  if (typeof root !== 'undefined') { root.ReportLayout = ReportLayout; root.REPORT_COMPONENT_CSS = REPORT_COMPONENT_CSS; }
  if (typeof module !== 'undefined' && module.exports) module.exports = ReportLayout;
})(typeof window !== 'undefined' ? window : globalThis);
