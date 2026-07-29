/* OUTPUT-002-C Slice 4 — voucher document identity is Profile-backed.
   The certified voucher builders (buildRecVoucher / buildPayVoucher, reused verbatim by
   the engine VoucherRenderer) must read their organisation identity from the single
   Output/Organization Profile — NOT from local BRAND_* constants — and must honour the
   Show-Logo contract (logo in print/PDF only, controlled by the profile). This locks that.
   Usage: node tests/voucher-profile-identity.test.cjs */
'use strict';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* minimal ambient globals the voucher builders reference (print.js is a browser global
   script; these are the externs it expects at runtime). */
global.window = global;
global.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
global.FIN = { amountOf: function (r) { return Number((r && r.amount) || 0); } };
global.gmn = function () { return ''; };
global.fmt = function (n) { return String(Math.round(Number(n || 0))); };
global.fmtD = function (n) { return String(Number(n || 0)); };
global.METHOD_LABELS = { cash: 'نقد' };
global.L = { expense: function (x) { return x; }, method: function (x) { return x; } };

const OP = require('../public/js/output-profile.js');   /* attaches window.OutputProfile */
require('../public/js/print.js');                        /* defines window.buildRecVoucher / buildPayVoucher */

const REC = { no: 'R-1', verification_token: 'T', payment_method: 'cash', currency: 'ILS', notes: '', version: 1, receipt_date: '2025-06-01', fund_type: 'diwan', payer_name: 'محمد', amount: 250 };
const PAY = { no: 'P-1', verification_token: 'T', payment_method: 'cash', currency: 'ILS', notes: '', version: 1, payment_date: '2025-06-02', fund_type: 'diwan', beneficiary_name: 'مورد', expense_type: 'x', amount: 480 };
const rec = () => window.buildRecVoucher(REC);
const pay = () => window.buildPayVoucher(PAY);
const hasLogo = (s) => /class="chip"/.test(s) && /<img/.test(s);

/* 1 · default identity comes from the Profile (seeded from brand). */
OP.reset();
ok(/ديوان آل طه/.test(rec()), 'voucher shows the Profile org name by default');
ok(/diwan-finance\.com/.test(rec()), 'voucher shows the Profile site by default');
ok(hasLogo(rec()), 'voucher shows the logo by default (Show Logo ON)');
ok(/توقيع الديوان/.test(rec()), 'voucher signature label comes from Profile signatoryTitle');

/* 2 · a real identity change PROPAGATES to both vouchers (single source of truth). */
OP.set({ organization: { name: { ar: 'مؤسسة الاختبار', en: 'Test Org' }, site: 'test.example' } });
ok(/مؤسسة الاختبار/.test(rec()) && /test\.example/.test(rec()), 'changed org name + site propagate to the receipt voucher');
ok(/مؤسسة الاختبار/.test(pay()), 'the payment voucher reads the same changed Profile identity');
ok(!/ديوان آل طه/.test(rec().split('سند قبض')[0]), 'the old hard-coded name is gone from the masthead (no second source)');

/* 3 · Show Logo OFF hides the logo in print/PDF but keeps it stored; ON returns it. */
OP.set({ organization: { logo: 'data:img-custom' }, output: { showLogo: false } });
ok(!hasLogo(rec()), 'Show Logo OFF ⇒ no logo in the voucher (print/PDF)');
ok(OP.get().organization.logo === 'data:img-custom', 'the stored logo is kept while hidden');
OP.set({ output: { showLogo: true } });
ok(hasLogo(rec()) && /data:img-custom/.test(rec()), 'Show Logo ON ⇒ the same stored (custom) logo returns');

/* 4 · signatory title is Profile-driven (already-displayed field, now single-sourced). */
OP.set({ organization: { signatoryTitle: { ar: 'اعتماد المدير', en: 'Director' } } });
ok(/اعتماد المدير/.test(rec()), 'signature label follows the Profile signatoryTitle');

/* 5 · the org identity appears ONCE (no duplication) in the masthead. */
OP.reset();
const body = rec();
ok((body.match(/class="osub"/g) || []).length === 1, 'the org subtitle/site line appears exactly once (no duplicate identity band)');

OP.reset();
console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
