/* OUTPUT-002-C Item 13 — deep-link builder/parser unit tests (pure, node-safe).
   The browser-only router/resume paths are covered by the Playwright harness. */
'use strict';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('FAIL ' + m); } }

/* provide a minimal location so base() works under node require */
global.location = { origin: 'https://app.example', pathname: '/index.html', hash: '' };
const DL = require('../public/js/report-deeplink.js');

/* ── builder: the single link source ── */
ok(DL.build('member-stmt', { m: 'A-1' }) === 'https://app.example/index.html#/member-stmt?m=A-1', 'build member-stmt with param');
ok(DL.build('food-stmt', {}) === 'https://app.example/index.html#/food-stmt', 'build with no params → no query');
ok(DL.build('member-stmt', { m: '', x: null }) === 'https://app.example/index.html#/member-stmt', 'empty/null params are dropped');
ok(DL.build('x', { a: 'b c', d: 'e/f' }).indexOf('a=b%20c') >= 0, 'params are URI-encoded');

/* ── parse: round-trips the builder ── */
const p1 = DL.parse('#/member-stmt?m=A-1');
ok(p1 && p1.page === 'member-stmt' && p1.params.m === 'A-1', 'parse page + single param');
const p2 = DL.parse('#/annual-debt?years=2025,2026&cat=all');
ok(p2 && p2.page === 'annual-debt' && p2.params.years === '2025,2026' && p2.params.cat === 'all', 'parse multiple params');
ok(DL.parse('#/dash') && DL.parse('#/dash').page === 'dash', 'parse bare page');
ok(DL.parse('') === null, 'empty hash → null');
ok(DL.parse('#not-a-route') === null, 'non "#/" hash → null');
ok(DL.parse('#/') === null, 'empty page → null');
ok(DL.parse(DL.build('member-stmt', { m: 'A-1' }).replace(/^[^#]*/, '')).params.m === 'A-1', 'build→parse round-trip');

console.log((fail === 0 ? 'PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
