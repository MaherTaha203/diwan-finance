/* ═══════════════════════════════════════════════════════════════════════════
   OUTPUT-002-C · Organization + Output Profile — the single source every report
   reads its identity/output settings from.
   ---------------------------------------------------------------------------
   Two blocks:
     • organization — WHO the document belongs to (name, logo, address, stamp,
       signature, signatory…). Seeded from the historical brand so nothing
       regresses; image/contact fields start EMPTY for the owner to fill later
       (an empty field simply renders nothing — never a broken image).
     • output — HOW documents are produced (show logo / QR / signature / stamp,
       footer note, default action). QR encodes the internal deep link (Item 11).

   Persistence: localStorage (device-local), deep-merged over the defaults, so a
   partial saved profile still yields a complete object. One read API —
   OutputProfile.get()/org()/output() — is consumed by report-layout.js (header +
   signatures) and, later, by the print/PDF chrome (QR + stamp + signature). No
   FIN / accounting / DB coupling.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var LS_KEY = 'diwan_output_profile';

  var DEFAULTS = {
    organization: {
      name:           { ar: 'ديوان آل طه', en: 'Diwan Al Taha' },
      subtitle:       { ar: 'نظام الإدارة المالية', en: 'Financial Management System' },
      site:           'diwan-finance.com',
      logo:           '',          /* custom logo (data URI); empty ⇒ the system brand logo */
      address:        { ar: '', en: '' },
      phone:          '',
      email:          '',
      stamp:          '',          /* official stamp image — empty ⇒ not shown           */
      signatureImage: '',          /* signature image — empty ⇒ text line only           */
      signatoryName:  { ar: '', en: '' },
      signatoryTitle: { ar: 'توقيع الديوان', en: 'Authorized Signature' }
    },
    output: {
      showLogo:      true,
      showQR:        true,         /* QR = internal deep link (auth-gated)                */
      showSignature: true,
      showStamp:     false,        /* off until a stamp image exists                      */
      footerNote:    { ar: '', en: '' },
      defaultAction: 'print'       /* preselected item in the «الإخراج ▼» menu            */
    }
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  /* deep-merge `over` onto a clone of `base`; only keys present in base are taken
     (unknown/legacy keys in stored data are ignored — schema stays authoritative). */
  function merge(base, over) {
    var out = clone(base);
    if (!isObj(over)) return out;
    Object.keys(base).forEach(function (k) {
      if (over[k] === undefined) return;
      out[k] = isObj(base[k]) ? merge(base[k], over[k]) : over[k];
    });
    return out;
  }

  var _cache = null;
  function load() {
    var stored = {};
    try { stored = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) || '{}'); } catch (e) { stored = {}; }
    return merge(DEFAULTS, stored);
  }
  function get() { if (!_cache) _cache = load(); return _cache; }
  function set(patch) {
    _cache = merge(get(), patch || {});
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(_cache)); } catch (e) {}
    return _cache;
  }
  function reset() {
    _cache = clone(DEFAULTS);
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY); } catch (e) {}
    return _cache;
  }

  /* ── the unified read shapes ── */

  /* the system's existing brand logo — the DEFAULT shown automatically in every
     report. Sourced from BrandAssets (the app's single branding source, same asset
     the vouchers/prints already use); a static URL is the last-resort fallback. */
  function defaultLogo() {
    return (typeof root !== 'undefined' && root.BrandAssets && typeof root.BrandAssets.getPrintLogo === 'function' && root.BrandAssets.getPrintLogo())
      || '/brand/light/PNG/logo-128.png';
  }
  /* effective logo (ignores the show/hide toggle): a custom-uploaded logo wins,
     otherwise the system brand logo. Used by the settings preview. */
  function logoResolved() { return get().organization.logo || defaultLogo(); }
  function logoIsCustom() { return !!get().organization.logo; }

  /* org identity for report-layout.js header/signatures. The logo defaults to the
     system brand logo (so it appears automatically in every report); a custom upload
     overrides it, and showLogo=false suppresses it everywhere. */
  function org() {
    var o = get().organization, out = get().output;
    return {
      name: o.name, subtitle: o.subtitle, site: o.site,
      logo: out.showLogo ? logoResolved() : '',
      address: o.address, phone: o.phone, email: o.email,
      stamp: o.stamp, signatureImage: o.signatureImage,
      signatoryName: o.signatoryName, signatoryTitle: o.signatoryTitle
    };
  }
  function output() { return get().output; }

  root.OutputProfile = { get: get, set: set, reset: reset, org: org, output: output,
    defaultLogo: defaultLogo, logoResolved: logoResolved, logoIsCustom: logoIsCustom, DEFAULTS: DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OutputProfile;
})(typeof window !== 'undefined' ? window : this);
