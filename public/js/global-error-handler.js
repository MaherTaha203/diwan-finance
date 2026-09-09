/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL RUNTIME ERROR HANDLER — defensive hardening only (no business behaviour).
   ---------------------------------------------------------------------------
   Catches otherwise-unhandled window errors and promise rejections so the app
   fails gracefully instead of dying silently or leaking internals:

     • Logs ONE concise entry to the console (developer/internal only) — the
       error's own name/message/stack. It never interpolates app payloads, so no
       passwords/tokens/secrets are added by this handler.
     • Shows the user ONE generic Arabic message — never a stack trace, never a
       raw/internal detail, never secrets.
     • De-duplicates (same signature within a short window) so a repeated error
       does not spam the log or the toast.
     • Stays SILENT (logs once, no toast) for known-benign noise and for resource
       load errors, so expected/handled errors are not turned into alarms.

   Loaded FIRST (before the app scripts) so its listeners are registered early.
   Inert if the page has no `toast` (it simply logs). No dependency, no new lib.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root || root.__gehInstalled) return;
  root.__gehInstalled = true;

  var GENERIC_AR = 'حدث خطأ غير متوقع. يرجى إعادة المحاولة، وإذا تكرّر فأبلغ مسؤول النظام.';
  var lastSig = '', lastAt = 0;
  var DEDUPE_MS = 4000;

  /* benign/expected noise — logged once, but must NOT alarm the operator */
  function isBenign(msg) {
    return /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|operation was aborted|Load failed|NetworkError when attempting|ChunkLoadError/i.test(String(msg || ''));
  }

  function briefMessage(e) {
    if (e == null) return '';
    if (typeof e === 'string') return e;
    if (e.message) return String(e.message);
    try { return String(e); } catch (_) { return 'unknown error'; }
  }

  function handle(kind, errLike, where) {
    var msg = briefMessage(errLike);
    var sig = kind + '|' + msg;
    var now = Date.now();
    if (sig === lastSig && (now - lastAt) < DEDUPE_MS) return;   /* no duplicate log/toast */
    lastSig = sig; lastAt = now;

    /* internal log ONLY — error's own name/message/stack; never app payloads */
    try {
      var name = (errLike && errLike.name) ? errLike.name : kind;
      console.error('[global-error] ' + name + ': ' + msg + (where ? ' @ ' + where : ''),
        (errLike && errLike.stack) ? errLike.stack : '');
    } catch (_) {}

    if (isBenign(msg)) return;   /* logged above; do not turn expected noise into an alarm */

    /* user sees ONE generic Arabic message — no stack, no internal detail */
    try { if (typeof root.toast === 'function') root.toast(GENERIC_AR, 'err'); } catch (_) {}
  }

  /* window errors (use capture so we see them before they bubble away). Resource
     load failures (img/script/link) fire an 'error' event whose target is the
     element, not the window — those are benign and ignored here. */
  root.addEventListener('error', function (ev) {
    if (ev && ev.target && ev.target !== root && ev.target.tagName) return;
    var where = (ev && ev.filename) ? (ev.filename + ':' + (ev.lineno || 0)) : '';
    handle('error', (ev && ev.error) || (ev && ev.message) || ev, where);
  }, true);

  /* unhandled promise rejections */
  root.addEventListener('unhandledrejection', function (ev) {
    handle('unhandledrejection', ev && (('reason' in ev) ? ev.reason : ev), '');
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handle: handle, isBenign: isBenign, GENERIC_AR: GENERIC_AR };
  }
})(typeof window !== 'undefined' ? window : this);
