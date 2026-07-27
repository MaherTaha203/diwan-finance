/* REPORT-001 · R6 — Member Statement cut-over tests (pure node).
   Three concerns:
     A) the screen renderer is real (compose/render/registration);
     B) the engine model reproduces the legacy donation label (parity);
     C) the cut-over glue routes screen/print/pdf/excel through the engine ONLY
        when the flag is ON, gathering one model, with DOM stubs.
   Usage: node tests/report-r6-cutover.test.cjs */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ───────────────────────── Part A — screen renderer (real engine) ───────────────────────── */
require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const { buildMemberStatementModel } = require('../public/js/report-model.js');
const ScreenRenderer = require('../public/js/report-render-screen.js');
const Report = globalThis.Report;

const model = buildMemberStatementModel({
  member: { name: 'عضو تجريبي', member_code: 'A-12', phone: '0599', active_from_year: 2019 },
  printDate: '2026-07-27T00:00:00.000Z', from: '2025-01-01', to: '2025-12-31',
  view: { statement: { finalBalance: 350 }, carried: 1200, histPaid: 800, totSub: 900, totPay: 550,
    moves: [{ date: '2025-03-01', no: 'REC-1', desc: 'إيصال 4477', dr: 0, cr: 400, bal: 800 }] },
  donations: [{ receipt_date: '2025-05-02', no: 77, amount_ils: 250, movement_type: 'donation_cash', destination_treasury: 'food', _settled: 100 }]
});

const c = ScreenRenderer.compose(model, { lang: 'ar' });
ok(c && !c.error, 'screen compose() succeeds');
ok(/rpt-doc/.test(c.html) && /عضو تجريبي/.test(c.html) && c.html.includes('₪ 1,200'), 'screen html carries the rendered statement');
ok(/@font-face/.test(c.css) && /rpt-toolbar/.test(c.css), 'screen css carries tokens + the output-toolbar rules');

const r = Report.render(model, 'screen');
ok(r.ok === true && r.skeleton === false && r.target === 'screen', "Report.render(model,'screen') is no longer a skeleton");
ok(r.result && r.result.status === 'composed', 'in node (no DOM) screen composes rather than mounts, cleanly');

/* other targets still behave (print/pdf/excel real once required; csv skeleton) */
require('../public/js/report-render-print.js');
require('../public/js/report-render-pdf.js');
require('../public/js/report-render-excel.js');
ok(Report.render(model, 'print').skeleton === false && Report.render(model, 'excel').skeleton === false, 'print + excel stay real alongside screen');
ok(Report.render(model, 'csv').result.status === 'skeleton', 'csv remains a skeleton');

/* ───────────────────────── Part B — donation-label parity ───────────────────────── */
/* the donations table now carries a bilingual desc that mirrors legacy donationStmtLabel */
const donSec = model.sections.find(s => s.id === 'donations');
ok(donSec && donSec.columns.some(col => col.key === 'desc'), 'donations table has a desc column');
const donRow = donSec.rows[0];
ok(donRow.desc && donRow.desc.ar === 'تبرع — صندوق الغداء · تسوية ذمة ₪100', 'AR donation label matches legacy (destination + settlement suffix)');
ok(donRow.desc.en === 'Donation — Food Fund · Debt Settlement ₪100', 'EN donation label matches legacy');
/* an in-kind, unsettled donation → documentary label, no suffix */
const m2 = buildMemberStatementModel({ member: { name: 'x' }, view: { statement: { finalBalance: 0 }, carried: 0, moves: [] },
  donations: [{ receipt_date: '2025-01-01', no: 5, amount_ils: 0, movement_type: 'donation_inkind', _settled: 0 }] });
const ik = m2.sections.find(s => s.id === 'donations').rows[0];
ok(ik.desc.ar === 'تبرع — عيني/خدمي — توثيقي (بلا وجهة نقدية)', 'in-kind donation → documentary label, no settlement suffix');

/* ───────────────────────── Part C — cut-over routing (DOM stubs) ───────────────────────── */
const els = {
  'ms-member': { value: 'M1' }, 'ms-from': { value: '2025-01-01' }, 'ms-to': { value: '' },
  'ms-out': { innerHTML: '', __wired: 0, addEventListener() { this.__wired++; } }
};
globalThis.document = { getElementById: id => els[id] || null };
globalThis.LANG = 'ar';
globalThis.FIN = { memberStatementView: () => ({}) };
let gathered = null;
globalThis.ReportModels = { memberStatement: (mid, from, to) => { gathered = { mid, from, to }; return { meta: { reportId: 'MEMBER_STATEMENT' }, _mid: mid }; } };
const calls = [];
globalThis.Report = { render: (m, target, opts) => { calls.push({ target, opts, mid: m && m._mid }); return { ok: true }; },
  outputButtons: () => '<button class="rpt-out-btn" data-output="print"></button>' };
globalThis.can = null;                       // no gate → all allowed
globalThis.REPORT_ENGINE_MEMBER_STATEMENT = true;   // set before require so the default doesn't override

const Cutover = require('../public/js/report-cutover.js');
ok(Cutover.ready() === true, 'ready() true when flag ON + engine + model gatherer + FIN present');

const gm = Cutover.gatherModel();
ok(gm && gm.meta.reportId === 'MEMBER_STATEMENT' && gathered.mid === 'M1' && gathered.from === '2025-01-01', 'gatherModel() reads the selection and builds one model via ReportModels.memberStatement');

Cutover.deliverMember('excel');
ok(calls.length === 1 && calls[0].target === 'excel', "deliverMember('excel') routes to Report.render(model,'excel')");
Cutover.deliverMember('pdf');
ok(calls[1] && calls[1].target === 'pdf', "deliverMember('pdf') routes to Report.render(model,'pdf')");
/* csv falls back to the legacy exporter (csv renderer not real yet) — no engine call */
let csvLegacy = 0; globalThis.exportMemberStmt = (fmt) => { if (fmt === 'csv') csvLegacy++; };
const csvBefore = calls.length;
Cutover.deliverMember('csv');
ok(csvLegacy === 1 && calls.length === csvBefore, "deliverMember('csv') falls back to legacy exportMemberStmt('csv'), not the engine");

els['ms-out'].innerHTML = '';
Cutover.renderMemberScreen();
ok(/rpt-toolbar/.test(els['ms-out'].innerHTML) && /ms-rpt-mount/.test(els['ms-out'].innerHTML), 'renderMemberScreen() injects the output toolbar + a mount node');
const screenCall = calls.find(x => x.target === 'screen');
ok(screenCall && screenCall.opts.mountId === 'ms-rpt-mount', "renderMemberScreen() calls Report.render(model,'screen',{mountId})");
ok(els['ms-out'].__wired === 1, 'a single delegated output-click handler is wired');

/* flag OFF → glue is inert (ready() false; deliver returns false, no engine call) */
globalThis.REPORT_ENGINE_MEMBER_STATEMENT = false;
const before = calls.length;
ok(Cutover.ready() === false, 'ready() false when the flag is OFF (legacy paths run unchanged)');
ok(Cutover.deliverMember('excel') === false && calls.length === before, 'deliver() is a no-op when the flag is OFF');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
