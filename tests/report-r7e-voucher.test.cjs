/* REPORT-001 · R7e — Voucher Renderer (hybrid) tests (pure node).
     A) the renderer reuses the certified builders + a unified filename;
     B) the engine routes voucher reports (category 'voucher') to it, leaving the
        tabular renderers + frozen schema untouched;
     C) graceful guards (missing record / missing builder / not registered).
   Usage: node tests/report-r7e-voucher.test.cjs */
require('../public/js/report-engine.js');
const Report = globalThis.Report;

/* stub the certified builders (in the browser these come from print.js/app.js) */
let recCalls = 0, payCalls = 0, trCalls = 0;
globalThis.buildRecVoucher = (r) => { recCalls++; return '<div class="voucher">REC ' + r.no + '</div>'; };
globalThis.buildPayVoucher = (p) => { payCalls++; return '<div class="voucher">PAY ' + p.no + '</div>'; };
globalThis.buildTransferVoucher = (t) => { trCalls++; return '<div class="voucher">TR ' + t.no + '</div>'; };
let printWin = null;
globalThis.openPrintWin = (css, html, title) => { printWin = { css, html, title }; };

const VoucherRenderer = require('../public/js/report-render-voucher.js');  // registers itself

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* flag default is OFF */
ok(globalThis.REPORT_ENGINE_VOUCHERS === false, 'flag REPORT_ENGINE_VOUCHERS defaults OFF');

/* ── A — compose reuses the builder + unified filename ── */
const c = VoucherRenderer.compose('RECEIPT_VOUCHER', { no: 1234, receipt_date: '2026-07-27' });
ok(/REC 1234/.test(c.html) && c.orientation === 'portrait', 'compose() reuses buildRecVoucher, portrait');
ok(c.filename === 'RECEIPT_VOUCHER-1234-2026-07-27', 'deterministic unified filename <ID>-<no>-<date>');
ok(VoucherRenderer.compose('TRANSFER_VOUCHER', { no: 9 }).css.indexOf('@page') === 0, 'transfer voucher keeps its own @page css');

/* ── B — the engine routes voucher reports to the hybrid renderer ── */
const r = Report.render('RECEIPT_VOUCHER', 'print', { record: { no: 7, receipt_date: '2026-01-02' } });
ok(r.ok === true && r.skeleton === false && r.reportId === 'RECEIPT_VOUCHER', "Report.render('RECEIPT_VOUCHER','print',{record}) routes to the voucher renderer");
ok(r.result.status === 'delivered' && printWin && /REC 7/.test(printWin.html), 'it delivers the certified voucher via openPrintWin');
ok(printWin.title === 'RECEIPT_VOUCHER-7-2026-01-02', 'openPrintWin receives the unified filename');
ok(recCalls >= 2, 'the certified buildRecVoucher was reused (not re-implemented)');

const p = Report.render('PAYMENT_VOUCHER', 'print', { record: { no: 8, payment_date: '2026-01-03' } });
ok(p.ok && /PAY 8/.test(printWin.html), 'payment voucher routes + delivers');
const t = Report.render('TRANSFER_VOUCHER', 'print', { record: { no: 5, transfer_date: '2026-01-04' } });
ok(t.ok && /TR 5/.test(printWin.html), 'transfer voucher routes + delivers');

/* tabular reports are UNAFFECTED (still go to the tabular renderers) */
const skel = Report.render('MEMBER_STATEMENT', 'print');
ok(skel.reportId === 'MEMBER_STATEMENT' && !('record' in (skel.result || {})), 'tabular reports still use the tabular path (voucher branch not taken)');

/* ── C — guards ── */
ok(Report.render('RECEIPT_VOUCHER', 'print', {}).result.reason === 'record_missing', 'missing record → record_missing (no throw)');
ok(VoucherRenderer.compose('RECEIPT_VOUCHER', { no: 1 }) && recCalls >= 3, 'compose still works for a bare record');
globalThis.buildRecVoucher = undefined;
ok(VoucherRenderer.compose('RECEIPT_VOUCHER', { no: 1 }).error === 'voucher_builder_unavailable', 'missing builder → voucher_builder_unavailable');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
