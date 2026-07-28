/* ═══════════════════════════════════════════════════════════════════════════
   OUTPUT-002-C · Items 14/15 — «copy link» + «share», both bound to the SINGLE
   deep-link source (ReportDeepLink.current()).
   ---------------------------------------------------------------------------
   These sit in the same engine output bar as print/PDF/Excel (Report.outputButtons
   appends them as .rpt-out-btn[data-action]). A single document-level delegate wires
   every report's bar at once; the per-cutover handlers only act on [data-output], so
   there is no conflict. The link is internal + auth-gated (see report-deeplink.js) —
   NO public link or token is produced here (that stays in OUTPUT-003).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function t(ar, en) { return (root.LANG === 'en') ? en : ar; }
  function link() { return (root.ReportDeepLink && root.ReportDeepLink.current) ? root.ReportDeepLink.current() : (typeof location !== 'undefined' ? location.href : ''); }
  function notify(msg) { if (typeof root.toast === 'function') root.toast(msg, 'ok'); }

  /* last-resort clipboard for browsers/contexts without navigator.clipboard. */
  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var okc = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      if (okc) done();
    } catch (e) { /* silent — nothing more we can do */ }
  }

  function copyLink() {
    var url = link();
    var done = function () { notify(t('تم نسخ الرابط', 'Link copied')); };
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(function () { legacyCopy(url, done); });
    } else {
      legacyCopy(url, done);
    }
  }

  function share() {
    var url = link();
    var titleEl = document.querySelector('.pg.on .rpt-title, .pg.on h1, .pg.on h2');
    var title = (titleEl && titleEl.textContent && titleEl.textContent.trim()) || document.title || t('تقرير', 'Report');
    if (root.navigator && navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () { /* user-cancelled or unsupported payload — no-op */ });
    } else {
      copyLink();   /* graceful fallback: put the link on the clipboard */
    }
  }

  /* one delegate for every current + future engine output bar. */
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.rpt-out-btn[data-action]');
      if (!btn) return;
      var a = btn.getAttribute('data-action');
      if (a === 'link') copyLink();
      else if (a === 'share') share();
    });
  }

  root.ReportShare = { copyLink: copyLink, share: share, link: link };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportShare;
})(typeof window !== 'undefined' ? window : this);
