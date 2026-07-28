/* ═══════════════════════════════════════════════════════════════════════════
   OUTPUT-002-C · Item 13 — Internal deep links (auth-gated), the SINGLE source
   of the shareable link.
   ---------------------------------------------------------------------------
   QR (Item 11), «copy link» (Item 14) and «share» (Item 15) all consume
   reportDeepLink()/ReportDeepLink.current() so there is ONE link definition in
   the system. A deep link is purely internal — `#/<page>?<params>` — and carries
   NO public token or grant: opening one always goes through window.nav(), which
   enforces the very same role gates as any in-app navigation, and an
   unauthenticated hit is stashed and replayed ONLY AFTER a successful login
   (login-return). Public links / access tokens / share permissions are OUT of
   scope here and remain deferred to OUTPUT-003.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var RETURN_KEY = 'diwan_deeplink_return';

  /* Parameterised pages: describe() reads the current on-screen state → params;
     apply(params) restores that state right after nav(). Names are short + stable
     so the emitted links stay compact and human. Pages absent here simply nav(). */
  var ROUTES = {
    'member-stmt': {
      describe: function () { var s = document.getElementById('ms-member'); return (s && s.value) ? { m: s.value } : {}; },
      apply: function (p) {
        if (!p.m) return;
        var s = document.getElementById('ms-member');
        if (s) { s.value = p.m; if (typeof root.renderMemberStmt === 'function') root.renderMemberStmt(); }
      }
    },
    'food-stmt':  { describe: function () { return {}; }, apply: function () { if (typeof root.renderStmt === 'function') root.renderStmt('food'); } },
    'diwan-stmt': { describe: function () { return {}; }, apply: function () { if (typeof root.renderStmt === 'function') root.renderStmt('diwan'); } },
    /* Item 16 — filtered reports carry their view state (category + selected years /
       primary + year) so a copied/shared link reopens the exact same filtered view. */
    'annual-debt': {
      describe: function () {
        if (typeof root.adFilterState !== 'function') return {};
        var s = root.adFilterState(), o = {};
        if (s.cat && s.cat !== 'all') o.cat = s.cat;
        if (s.years && s.years.length) o.years = s.years.join(',');
        return o;
      },
      apply: function (p) {
        if (typeof root.adApplyState !== 'function') return;
        root.adApplyState({ cat: p.cat || 'all', years: p.years ? p.years.split(',') : null });
      }
    },
    'delinquent': {
      describe: function () {
        if (typeof root.delFilterState !== 'function') return {};
        var s = root.delFilterState(), o = {};
        if (s.primary && s.primary !== 'all') o.primary = s.primary;
        if (s.year && s.year !== 'all') o.year = s.year;
        return o;
      },
      apply: function (p) {
        if (typeof root.delApplyState !== 'function') return;
        root.delApplyState({ primary: p.primary || 'all', year: p.year || 'all' });
      }
    }
  };

  function authed() {
    if (typeof document === 'undefined') return false;
    var app = document.getElementById('app');
    return !!(app && getComputedStyle(app).display !== 'none');
  }
  function base() { return location.origin + location.pathname; }

  /* ── THE single link builder (pure) ── */
  function build(page, params) {
    var qs = '';
    if (params) qs = Object.keys(params)
      .filter(function (k) { return params[k] != null && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return base() + '#/' + page + (qs ? ('?' + qs) : '');
  }

  /* parse a hash into { page, params } or null (pure). */
  function parse(hash) {
    hash = (hash != null ? hash : (typeof location !== 'undefined' ? location.hash : '')) || '';
    if (hash.slice(0, 2) !== '#/') return null;
    var body = hash.slice(2), qi = body.indexOf('?');
    var page = qi >= 0 ? body.slice(0, qi) : body;
    if (!page) return null;
    var params = {};
    if (qi >= 0) body.slice(qi + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent(i >= 0 ? kv.slice(0, i) : kv);
      var v = i >= 0 ? decodeURIComponent(kv.slice(i + 1)) : '';
      if (k) params[k] = v;
    });
    return { page: page, params: params };
  }

  function currentPage() {
    var el = document.querySelector('.pg.on');
    return el && el.id ? el.id.replace(/^pg-/, '') : null;
  }

  /* the deep link for the report currently on screen (single source for QR/copy/share). */
  function current() {
    var page = currentPage();
    if (!page) return base();
    var r = ROUTES[page];
    return build(page, (r && r.describe) ? (r.describe() || {}) : {});
  }

  /* route NOW (caller ensures authed). nav() enforces role gates; if it bounced,
     the page never switched and apply() is a harmless no-op. */
  function applyRoute(page, params) {
    if (typeof root.nav !== 'function') return;
    root.nav(page);
    var r = ROUTES[page];
    if (r && r.apply) setTimeout(function () { try { r.apply(params || {}); } catch (e) {} }, 80);
  }

  /* entry for a live hash change / incoming link. Unauthed → stash + bounce. */
  function route(hash) {
    var m = parse(hash);
    if (!m) return false;
    if (!authed()) { try { sessionStorage.setItem(RETURN_KEY, hash || location.hash); } catch (e) {} return false; }
    applyRoute(m.page, m.params);
    return true;
  }

  /* post-login replay: a stashed deep link, or the current hash if it is one.
     Returns true when it navigated somewhere (so callers can skip their default). */
  function resume() {
    var stashed = null;
    try { stashed = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch (e) {}
    var m = parse(stashed || (typeof location !== 'undefined' ? location.hash : ''));
    if (!m) return false;
    applyRoute(m.page, m.params);
    return true;
  }

  /* ── browser-only wiring (kept out of the node/require path) ── */
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.addEventListener) {
    window.addEventListener('hashchange', function () { if (authed()) route(location.hash); });
    /* cold load with a deep link but no session yet → stash for post-login replay. */
    if (parse(location.hash) && !authed()) { try { sessionStorage.setItem(RETURN_KEY, location.hash); } catch (e) {} }
  }

  root.ReportDeepLink = { build: build, current: current, route: route, resume: resume, parse: parse, ROUTES: ROUTES };
  root.reportDeepLink = build;   /* the single builder, also exposed directly */
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ReportDeepLink;
})(typeof window !== 'undefined' ? window : this);
