/* ═══════════════════════════════════════════════════════════════════════════
   REPORT-001 · R5 — Excel Renderer.
   ---------------------------------------------------------------------------
   Swaps the engine's empty `excel` skeleton for the real one: it maps the
   neutral ReportModel (R1) into a spreadsheet and writes a styled .xlsx using
   the app's existing xlsx-js-style path — reusing the certified "Diwan sheet"
   design language (deep-navy header/total fill, ice-paper zebra, ₪ number
   format, RTL, autofilter, frozen header).

   Unlike the print/pdf renderers it does NOT go through the layout HTML — a
   spreadsheet is a different medium. It consumes the SAME ReportModel, so the
   numbers are identical by construction (single source of truth). Excel is the
   admin-only export path (can.export()); gating lives at the call site, not here
   (R5 is dormant — no production call site until R6+).

   Split for testability (mirrors print/pdf):
     ExcelRenderer.compose(model, opts) -> { aoa, cols, merges, styles, sheetName,
                                             filename, rtl }               (PURE)
     ExcelRenderer.render(model, ctx)   -> composes, then builds+writes the .xlsx
                                           via window.XLSX when available; else
                                           returns a status descriptor (clean node).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── shared, medium-neutral helpers (kept in sync with report-layout.js) ── */
  function pick(v, lang) { return (v && typeof v === 'object' && ('ar' in v || 'en' in v)) ? (lang === 'en' ? (v.en != null ? v.en : v.ar) : (v.ar != null ? v.ar : v.en)) : v; }
  function fmtDate(d) {
    if (!d) return '';
    try { var dt = new Date(d); if (isNaN(dt)) return String(d); var p = function (x) { return String(x).padStart(2, '0'); };
      return p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + '/' + dt.getFullYear(); } catch (e) { return String(d); }
  }
  function isMoney(fmt) { return fmt === 'money' || fmt === 'balance'; }

  /* one raw cell value by column format: money/balance/num stay NUMBERS (so Excel
     can sum), dates become dd/mm/yyyy strings, everything else a localized string. */
  function cellValue(raw, fmt, lang) {
    if (raw == null || raw === '') return '';
    switch (fmt) {
      case 'money': case 'balance': case 'num': case 'int': return Number(raw);
      case 'date': return fmtDate(raw);
      default: return pick(raw, lang);
    }
  }

  /* deterministic, unified filename — identical scheme to the print/pdf renderer:
     <REPORT_ID>-<party.code?>-<YYYY-MM-DD> (satisfies the §7 unified-filenames gate). */
  function filenameFor(model) {
    var m = model.meta || {};
    var parts = [m.reportId || 'REPORT'];
    if (m.party && m.party.code) parts.push(String(m.party.code));
    var d = m.printDate ? new Date(m.printDate) : new Date();
    if (!isNaN(d)) parts.push(d.toISOString().slice(0, 10));
    return parts.join('-').replace(/[^A-Za-z0-9_\-]+/g, '_');
  }

  /* Excel sheet-name rules: <=31 chars, none of []:*?/\ */
  function sheetNameFor(model, lang) {
    var t = pick((model.meta || {}).title, lang) || (model.meta || {}).reportId || 'Report';
    return String(t).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Report';
  }

  function subtitle(meta, lang) {
    var bits = [];
    var p = meta.party;
    if (p && (p.name || p.code)) {
      var who = (lang === 'en' ? 'Subject: ' : 'الجهة: ') + (p.name || '');
      if (p.code) who += ' · ' + p.code;
      if (p.phone) who += ' · ☎ ' + p.phone;
      bits.push(who.trim());
    }
    var per = meta.period;
    if (per && (per.from || per.to)) {
      var lbl = (lang === 'en' ? 'Period: ' : 'الفترة: ');
      lbl += per.from && per.to ? (per.from + ' → ' + per.to) : per.from ? ((lang === 'en' ? 'from ' : 'من ') + per.from) : ((lang === 'en' ? 'until ' : 'حتى ') + per.to);
      bits.push(lbl);
    } else if (per) {
      bits.push(lang === 'en' ? 'Period: all' : 'الفترة: كل الفترات');
    }
    return bits.join('   |   ');
  }

  /* column widths by format (chars) */
  function widthFor(fmt) { return fmt === 'text' ? 30 : isMoney(fmt) ? 16 : fmt === 'date' ? 12 : 14; }

  /* ── PURE: ReportModel -> spreadsheet description. No DOM, no XLSX. ── */
  function compose(model, opts) {
    opts = opts || {};
    if (!model || !model.meta) return { error: 'model_invalid' };
    var lang = opts.lang || (typeof root !== 'undefined' && root.LANG) || 'ar';
    var meta = model.meta;

    var aoa = [];
    var merges = [];
    var styles = { titleRows: [], subRows: [], headerRows: [], totalRows: [], bandRows: [], moneyCells: [], footRows: [] };

    /* the sheet is as wide as the widest table (min 2 for label/value rows) */
    var maxCols = 2;
    (model.sections || []).forEach(function (s) { if (s.type === 'table') maxCols = Math.max(maxCols, (s.columns || []).length); });
    (model.summary || []).length && (maxCols = Math.max(maxCols, 2));
    var lastCol = maxCols - 1;

    function pushRow(cells) { aoa.push(cells); return aoa.length - 1; }
    function fullMerge(r) { if (lastCol > 0) merges.push({ s: { r: r, c: 0 }, e: { r: r, c: lastCol } }); }

    /* title + subtitle */
    var tr = pushRow([pick(meta.title, lang) || meta.reportId]); styles.titleRows.push(tr); fullMerge(tr);
    var sub = subtitle(meta, lang);
    if (sub) { var sr = pushRow([sub]); styles.subRows.push(sr); fullMerge(sr); }
    pushRow([]);

    /* summary block (label · value), value money-formatted */
    (model.summary || []).forEach(function (s) {
      var r = pushRow([pick(s.key, lang), Number(s.value || 0)]);
      styles.bandRows.push(r);
      if (isMoney(s.format) || s.format === 'money') styles.moneyCells.push([r, 1]);
    });
    if ((model.summary || []).length) pushRow([]);

    /* sections */
    (model.sections || []).forEach(function (sec) {
      if (sec.type === 'band') {
        var r = pushRow([pick(sec.key, lang), Number(sec.value || 0)]);
        styles.bandRows.push(r);
        styles.moneyCells.push([r, 1]);
        return;
      }
      if (sec.type === 'table') {
        var cols = sec.columns || [];
        /* header */
        var hr = pushRow(cols.map(function (c) { return pick(c.header, lang); }));
        styles.headerRows.push(hr);
        /* data */
        (sec.rows || []).forEach(function (row) {
          var line = cols.map(function (c) { return cellValue(row[c.key], c.format, lang); });
          var ri = pushRow(line);
          cols.forEach(function (c, ci) { if (isMoney(c.format) && typeof line[ci] === 'number') styles.moneyCells.push([ri, ci]); });
        });
        /* totals */
        if (sec.totals) {
          var t = sec.totals;
          var line = new Array(cols.length).fill('');
          var label = pick(t.label, lang);
          if (t.status) label += ' · ' + pick(t.status, lang);
          line[0] = label;
          if (t.cells) cols.forEach(function (c, ci) {
            if (Object.prototype.hasOwnProperty.call(t.cells, c.key)) { line[ci] = Number(t.cells[c.key] || 0); if (isMoney(c.format)) styles.moneyCells.push([aoa.length, ci]); }
          });
          var tri = pushRow(line); styles.totalRows.push(tri);
        }
        /* footnotes */
        (sec.footnotes || []).forEach(function (f) { var fr = pushRow([pick(f, lang)]); styles.footRows.push(fr); fullMerge(fr); });
      }
    });

    /* widths from the widest table (fallback: label/value) */
    var widthTable = (model.sections || []).filter(function (s) { return s.type === 'table'; }).sort(function (a, b) { return (b.columns || []).length - (a.columns || []).length; })[0];
    var cols;
    if (widthTable) cols = widthTable.columns.map(function (c) { return { wch: widthFor(c.format) }; });
    else cols = [{ wch: 32 }, { wch: 16 }];
    while (cols.length < maxCols) cols.push({ wch: 14 });

    return {
      sheetName: sheetNameFor(model, lang),
      filename: filenameFor(model),
      rtl: true,
      aoa: aoa,
      cols: cols,
      merges: merges,
      styles: styles,
      /* first table header row seeds autofilter + freeze */
      primaryHeaderRow: styles.headerRows.length ? styles.headerRows[0] : null
    };
  }

  /* palette — identical to app.js styleDiwanSheet (Theme-01) */
  var NAVY = '0F1B33', WHITE = 'FFFFFF', BG = 'F2F5FA', GOLD = 'B99A47', LINE = 'E2E8F0';
  var MONEY_Z = '₪ #,##0';

  /* build a styled worksheet from the composed description using an XLSX instance. */
  function buildSheet(XLSX, c) {
    var ws = XLSX.utils.aoa_to_sheet(c.aoa);
    ws['!cols'] = c.cols;
    ws['!rtl'] = true;
    if (c.merges && c.merges.length) ws['!merges'] = c.merges;

    var thin = { style: 'thin', color: { rgb: LINE } };
    var border = { top: thin, bottom: thin, left: thin, right: thin };
    var range = XLSX.utils.decode_range(ws['!ref']);
    var inSet = function (arr, r) { return arr.indexOf(r) >= 0; };

    for (var R = range.s.r; R <= range.e.r; R++) {
      for (var C = range.s.c; C <= range.e.c; C++) {
        var ref = XLSX.utils.encode_cell({ r: R, c: C });
        var cell = ws[ref]; if (!cell) continue;
        cell.s = cell.s || {};
        cell.s.border = border;
        cell.s.alignment = { horizontal: 'center', vertical: 'center', readingOrder: 2, wrapText: false };
        if (inSet(c.styles.titleRows, R)) { cell.s.font = { color: { rgb: NAVY }, bold: true, sz: 15 }; cell.s.border = {}; }
        else if (inSet(c.styles.subRows, R)) { cell.s.font = { color: { rgb: '64748B' }, sz: 10 }; cell.s.border = {}; }
        else if (inSet(c.styles.headerRows, R)) { cell.s.fill = { fgColor: { rgb: NAVY } }; cell.s.font = { color: { rgb: WHITE }, bold: true, sz: 11 }; }
        else if (inSet(c.styles.totalRows, R)) { cell.s.fill = { fgColor: { rgb: NAVY } }; cell.s.font = { color: { rgb: WHITE }, bold: true }; }
        else if (inSet(c.styles.bandRows, R)) { cell.s.fill = { fgColor: { rgb: BG } }; cell.s.font = { color: { rgb: NAVY }, bold: true }; cell.s.border = { bottom: { style: 'medium', color: { rgb: GOLD } } }; }
        else if (inSet(c.styles.footRows, R)) { cell.s.font = { color: { rgb: '94A3B8' }, italic: true, sz: 9 }; cell.s.border = {}; }
        else if (R % 2 === 0) { cell.s.fill = { fgColor: { rgb: BG } }; }
      }
    }
    /* ₪ number format on money cells */
    (c.styles.moneyCells || []).forEach(function (rc) {
      var ref = XLSX.utils.encode_cell({ r: rc[0], c: rc[1] });
      if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = MONEY_Z;
    });
    /* autofilter + freeze over the primary header row */
    if (c.primaryHeaderRow != null) {
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: c.primaryHeaderRow, c: 0 }, e: { r: c.primaryHeaderRow, c: range.e.c } }) };
      ws['!freeze'] = { xSplit: 0, ySplit: c.primaryHeaderRow + 1, topLeftCell: XLSX.utils.encode_cell({ r: c.primaryHeaderRow + 1, c: 0 }), activePane: 'bottomLeft', state: 'frozen' };
    }
    return ws;
  }

  function writeWorkbook(XLSX, c) {
    var ws = buildSheet(XLSX, c);
    var wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, c.sheetName);
    XLSX.writeFile(wb, c.filename + '.xlsx');
  }

  var ExcelRenderer = {
    target: 'excel',
    compose: compose,

    render: function (model, ctx) {
      var opts = (ctx && ctx.opts) || {};
      var c = this.compose(model, opts);
      if (c.error) return { target: 'excel', status: 'error', reason: c.error, empty: true };

      var XLSX = (typeof root !== 'undefined' && root.XLSX) || null;
      if (XLSX && XLSX.__styled) {
        try { writeWorkbook(XLSX, c); return { target: 'excel', status: 'delivered', empty: false, filename: c.filename, sheetName: c.sheetName }; }
        catch (e) { return { target: 'excel', status: 'error', reason: 'write_failed', empty: true }; }
      }
      /* styled XLSX not present yet — use the app's loader if available (async). */
      if (typeof root !== 'undefined' && typeof root.loadStyledXLSX === 'function') {
        root.loadStyledXLSX(function () { try { writeWorkbook(root.XLSX, c); } catch (e) { /* toast handled by loader/app */ } });
        return { target: 'excel', status: 'delivering', empty: false, filename: c.filename, sheetName: c.sheetName };
      }
      /* node / no XLSX: composed cleanly (the description is the testable artifact). */
      return { target: 'excel', status: 'composed', empty: false, filename: c.filename, sheetName: c.sheetName };
    }
  };

  if (typeof root !== 'undefined' && root.Report && typeof root.Report.registerRenderer === 'function') {
    root.Report.registerRenderer('excel', ExcelRenderer);
  }
  if (typeof root !== 'undefined') root.ReportExcelRenderer = ExcelRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = ExcelRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
