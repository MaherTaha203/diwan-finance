/* ═══════════════════════════════════════════════════════════════════════════
   OUTPUT-002-C · «الإخراج ▼» — THE single output control used on every page.
   ---------------------------------------------------------------------------
   One dropdown component (reuses the app's global .export-dropdown shell +
   togglePageExport toggler + outside-click close) rendered both by the engine
   report bar (Report.outputButtons) and by the page headers. Standard menu:
     🖨 طباعة · 📄 PDF · 📊 Excel · 🔗 نسخ الرابط · 📤 مشاركة · ⚙ إعدادات الإخراج
   No standalone print/PDF/Excel buttons may live outside this component.

   Item kinds:
     { output:'print'|'pdf'|'excel' }  → engine bar; carries .rpt-out-btn +
                                          data-report/data-output (cutover deliver).
     { action:'link'|'share'|'settings' } → carries .rpt-out-btn + data-action
                                          (report-share.js document delegate).
     { onclick:'…' }                   → page headers; direct handler (engine-routed).
     { admin:true }                    → shown only to admins (settings).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var _seq = 0;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lang() { return (root.LANG === 'en') ? 'en' : 'ar'; }
  function isAdmin() { return !(root.can && root.can.admin) || root.can.admin(); }

  /* the standard trailing items (link / share / settings), shared by every menu. */
  function standardItems() {
    var en = lang() === 'en';
    return [
      { action: 'link', icon: 'ti-link', label: en ? 'Copy link' : 'نسخ الرابط' },
      { action: 'share', icon: 'ti-share', label: en ? 'Share' : 'مشاركة' },
      { action: 'settings', icon: 'ti-adjustments-cog', label: en ? 'Output settings' : 'إعدادات الإخراج', admin: true }
    ];
  }

  function itemHtml(it, report) {
    if (it.admin && !isAdmin()) return '';
    var ico = '<i class="ti ' + (it.icon || 'ti-download') + '"></i><span>' + esc(it.label) + '</span>';
    if (it.output) return '<button type="button" class="export-dropdown-item rpt-out-btn" data-report="' + esc(report || '') + '" data-output="' + esc(it.output) + '">' + ico + '</button>';
    if (it.action) return '<button type="button" class="export-dropdown-item rpt-out-btn" data-action="' + esc(it.action) + '">' + ico + '</button>';
    return '<button type="button" class="export-dropdown-item"' + (it.onclick ? ' onclick="' + it.onclick + '"' : '') + '>' + ico + '</button>';
  }

  /* build the dropdown. opts = { menuId?, report?, items:[…], includeStandard?:true } */
  function build(opts) {
    opts = opts || {};
    var en = lang() === 'en';
    var menuId = opts.menuId || ('outmenu-' + (++_seq));
    var items = (opts.items || []).slice();
    if (opts.includeStandard !== false) items = items.concat(standardItems());
    var body = items.map(function (it) { return itemHtml(it, opts.report); }).join('');
    return '<div class="export-dropdown out-menu">' +
      '<button type="button" class="btn sm export-dropdown-btn out-menu-btn" onclick="togglePageExport(event,\'' + menuId + '\')">' +
      '<i class="ti ti-download"></i><span>' + (en ? 'Output ▾' : 'الإخراج ▼') + '</span></button>' +
      '<div class="export-dropdown-menu" id="' + menuId + '">' + body + '</div></div>';
  }

  root.OutputMenu = { build: build, standardItems: standardItems };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OutputMenu;
})(typeof window !== 'undefined' ? window : this);
