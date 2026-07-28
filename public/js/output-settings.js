/* ═══════════════════════════════════════════════════════════════════════════
   OUTPUT-002-C · «إعدادات الإخراج» — the settings screen that edits the
   Organization/Output Profile (output-profile.js). Opened from the «الإخراج ▼»
   menu. Admin-only (org identity is organisation-wide config). Persists via
   OutputProfile.set() → localStorage. Reuses the app's modal shell (#ov / .modal /
   .mhd / .mbd / .fi / .btn) so it looks native. No FIN / DB coupling.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var MODAL_ID = 'm-output-settings';
  /* working copies of the three images (data URIs) while the dialog is open */
  var _img = { logo: '', stamp: '', signatureImage: '' };

  function t(ar, en) { return (root.LANG === 'en') ? en : ar; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isAdmin() { return !(root.can && root.can.admin) || root.can.admin(); }

  function fieldRow(label, inner) {
    return '<div class="fi full"><label>' + esc(label) + '</label>' + inner + '</div>';
  }
  function textPair(idBase, labelAr, labelEn) {
    return '<div class="fi"><label>' + esc(labelAr) + ' (ع)</label><input type="text" id="' + idBase + '-ar"></div>' +
           '<div class="fi"><label>' + esc(labelEn) + ' (EN)</label><input type="text" id="' + idBase + '-en"></div>';
  }
  function textOne(id, label) {
    return '<div class="fi"><label>' + esc(label) + '</label><input type="text" id="' + id + '"></div>';
  }
  function imageRow(key, label) {
    return '<div class="fi full"><label>' + esc(label) + '</label>' +
      '<div class="os-img" data-key="' + key + '">' +
      '<input type="file" accept="image/png,image/jpeg,image/svg+xml" onchange="window.__osImg(event,\'' + key + '\')">' +
      '<div class="os-img-prev" id="os-prev-' + key + '"></div>' +
      '<button type="button" class="btn ghost sm" onclick="window.__osImgClear(\'' + key + '\')"><i class="ti ti-trash"></i>' + t('مسح', 'Clear') + '</button>' +
      '</div></div>';
  }
  function checkRow(id, label) {
    return '<label class="os-check"><input type="checkbox" id="' + id + '"><span>' + esc(label) + '</span></label>';
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    if (!document.getElementById('os-style')) {
      var st = document.createElement('style');
      st.id = 'os-style';
      st.textContent =
        '#' + MODAL_ID + ' .mbd{max-height:72vh;overflow:auto}' +
        '#' + MODAL_ID + ' .os-grp{border:1px solid var(--bd2,#e5e7eb);border-radius:10px;padding:12px;margin:0 0 14px}' +
        '#' + MODAL_ID + ' .os-grp>h4{margin:0 0 10px;font-size:13px;font-weight:800;color:var(--tx,inherit);display:flex;gap:6px;align-items:center}' +
        '#' + MODAL_ID + ' .os-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
        '#' + MODAL_ID + ' .os-img{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
        '#' + MODAL_ID + ' .os-img-prev{min-width:52px;min-height:40px;display:flex;align-items:center}' +
        '#' + MODAL_ID + ' .os-img-prev img{max-height:44px;max-width:120px;border:1px solid var(--bd2,#e5e7eb);border-radius:6px;background:#fff;padding:2px}' +
        '#' + MODAL_ID + ' .os-check{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0;cursor:pointer}' +
        '#' + MODAL_ID + ' .os-hint{font-size:11px;color:var(--tx3,#94a3b8);margin:2px 0 0}';
      document.head.appendChild(st);
    }
    var cont = document.getElementById('ov') || document.body;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal editor" id="' + MODAL_ID + '" style="display:none;max-width:640px">' +
        '<div class="mhd"><span class="mtt"><span class="mico"><i class="ti ti-adjustments-cog"></i></span><span>' + t('إعدادات الإخراج', 'Output settings') + '</span></span>' +
          '<button class="btn ghost" onclick="window.closeM()" aria-label="' + t('إغلاق', 'Close') + '"><i class="ti ti-x"></i></button></div>' +
        '<div class="mbd">' +
          /* Organization */
          '<div class="os-grp"><h4><i class="ti ti-building"></i>' + t('بيانات المؤسسة', 'Organization') + '</h4>' +
            '<div class="os-2">' + textPair('os-name', t('الاسم', 'Name'), t('الاسم', 'Name')) + '</div>' +
            '<div class="os-2">' + textPair('os-subtitle', t('الوصف', 'Subtitle'), t('الوصف', 'Subtitle')) + '</div>' +
            '<div class="os-2">' + textOne('os-site', t('الموقع الإلكتروني', 'Website')) + textOne('os-phone', t('الهاتف', 'Phone')) + '</div>' +
            '<div class="os-2">' + textOne('os-email', t('البريد', 'Email')) + '</div>' +
            '<div class="os-2">' + textPair('os-address', t('العنوان', 'Address'), t('العنوان', 'Address')) + '</div>' +
            imageRow('logo', t('الشعار', 'Logo')) +
            imageRow('stamp', t('الختم', 'Stamp')) +
            imageRow('signatureImage', t('صورة التوقيع', 'Signature image')) +
            '<div class="os-2">' + textPair('os-signatory-name', t('اسم الموقّع', 'Signatory name'), t('اسم الموقّع', 'Signatory name')) + '</div>' +
            '<div class="os-2">' + textPair('os-signatory-title', t('صفة الموقّع', 'Signatory title'), t('صفة الموقّع', 'Signatory title')) + '</div>' +
            '<p class="os-hint">' + t('اترك أي حقل فارغًا فلا يظهر على المستند. الصور تُحفظ على هذا الجهاز.', 'Leave any field empty and it will not appear on the document. Images are stored on this device.') + '</p>' +
          '</div>' +
          /* Output options */
          '<div class="os-grp"><h4><i class="ti ti-printer"></i>' + t('خيارات الإخراج', 'Output options') + '</h4>' +
            checkRow('os-show-logo', t('إظهار الشعار', 'Show logo')) +
            checkRow('os-show-qr', t('إظهار رمز QR (رابط التقرير)', 'Show QR (report link)')) +
            checkRow('os-show-signature', t('إظهار التوقيع', 'Show signature')) +
            checkRow('os-show-stamp', t('إظهار الختم', 'Show stamp')) +
            '<div class="os-2" style="margin-top:8px">' + textPair('os-footer', t('تذييل', 'Footer note'), t('تذييل', 'Footer note')) + '</div>' +
            '<div class="fi full"><label>' + t('الإجراء الافتراضي في قائمة الإخراج', 'Default action in output menu') + '</label>' +
              '<select id="os-default-action"><option value="print">' + t('طباعة', 'Print') + '</option><option value="pdf">PDF</option><option value="excel">Excel</option></select></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">' +
            '<button class="btn ghost" onclick="window.resetOutputSettings()"><i class="ti ti-rotate"></i>' + t('استعادة الافتراضي', 'Reset') + '</button>' +
            '<button class="btn primary" onclick="window.saveOutputSettings()"><i class="ti ti-device-floppy"></i>' + t('حفظ', 'Save') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    cont.appendChild(wrap);
  }

  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? '' : v; }
  function setChk(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }
  function getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function getChk(id) { var el = document.getElementById(id); return el ? !!el.checked : false; }

  function preview(key) {
    var box = document.getElementById('os-prev-' + key);
    if (box) box.innerHTML = _img[key] ? '<img src="' + esc(_img[key]) + '" alt="">' : '<span class="os-hint">' + t('لا توجد صورة', 'none') + '</span>';
  }

  function populate() {
    var p = root.OutputProfile.get(), o = p.organization, out = p.output;
    setVal('os-name-ar', o.name.ar); setVal('os-name-en', o.name.en);
    setVal('os-subtitle-ar', o.subtitle.ar); setVal('os-subtitle-en', o.subtitle.en);
    setVal('os-site', o.site); setVal('os-phone', o.phone); setVal('os-email', o.email);
    setVal('os-address-ar', o.address.ar); setVal('os-address-en', o.address.en);
    setVal('os-signatory-name-ar', o.signatoryName.ar); setVal('os-signatory-name-en', o.signatoryName.en);
    setVal('os-signatory-title-ar', o.signatoryTitle.ar); setVal('os-signatory-title-en', o.signatoryTitle.en);
    _img.logo = o.logo || ''; _img.stamp = o.stamp || ''; _img.signatureImage = o.signatureImage || '';
    preview('logo'); preview('stamp'); preview('signatureImage');
    setChk('os-show-logo', out.showLogo); setChk('os-show-qr', out.showQR);
    setChk('os-show-signature', out.showSignature); setChk('os-show-stamp', out.showStamp);
    setVal('os-footer-ar', out.footerNote.ar); setVal('os-footer-en', out.footerNote.en);
    setVal('os-default-action', out.defaultAction);
  }

  function collect() {
    return {
      organization: {
        name: { ar: getVal('os-name-ar'), en: getVal('os-name-en') },
        subtitle: { ar: getVal('os-subtitle-ar'), en: getVal('os-subtitle-en') },
        site: getVal('os-site'), phone: getVal('os-phone'), email: getVal('os-email'),
        address: { ar: getVal('os-address-ar'), en: getVal('os-address-en') },
        logo: _img.logo, stamp: _img.stamp, signatureImage: _img.signatureImage,
        signatoryName: { ar: getVal('os-signatory-name-ar'), en: getVal('os-signatory-name-en') },
        signatoryTitle: { ar: getVal('os-signatory-title-ar'), en: getVal('os-signatory-title-en') }
      },
      output: {
        showLogo: getChk('os-show-logo'), showQR: getChk('os-show-qr'),
        showSignature: getChk('os-show-signature'), showStamp: getChk('os-show-stamp'),
        footerNote: { ar: getVal('os-footer-ar'), en: getVal('os-footer-en') },
        defaultAction: getVal('os-default-action') || 'print'
      }
    };
  }

  /* ── image handlers (file → data URI, capped) ── */
  root.__osImg = function (ev, key) {
    var f = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { if (root.toast) root.toast(t('حجم الصورة كبير (الحد 2MB)', 'Image too large (max 2MB)'), 'err'); ev.target.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () { _img[key] = String(rd.result || ''); preview(key); };
    rd.readAsDataURL(f);
  };
  root.__osImgClear = function (key) { _img[key] = ''; var inp = document.querySelector('#' + MODAL_ID + ' .os-img[data-key="' + key + '"] input[type=file]'); if (inp) inp.value = ''; preview(key); };

  root.openOutputSettings = function () {
    if (!isAdmin()) { if (root.toast) root.toast(t('هذا الإعداد للمشرف فقط', 'Admins only'), 'err'); return; }
    ensureModal();
    document.getElementById('ov').classList.add('on');
    document.querySelectorAll('.modal').forEach(function (m) { m.style.display = 'none'; });
    document.getElementById(MODAL_ID).style.display = 'block';
    populate();
  };
  root.saveOutputSettings = function () {
    if (!isAdmin()) { if (root.toast) root.toast(t('هذا الإعداد للمشرف فقط', 'Admins only'), 'err'); return; }
    root.OutputProfile.set(collect());
    if (root.toast) root.toast(t('تم حفظ إعدادات الإخراج', 'Output settings saved'), 'ok');
    if (typeof root.closeM === 'function') root.closeM();
  };
  root.resetOutputSettings = function () {
    if (!isAdmin()) return;
    root.OutputProfile.reset();
    populate();
    if (root.toast) root.toast(t('تمت الاستعادة للإعدادات الافتراضية', 'Restored defaults'), 'ok');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { open: function () { return root.openOutputSettings && root.openOutputSettings(); } };
})(typeof window !== 'undefined' ? window : this);
