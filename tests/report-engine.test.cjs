/* REPORT-001 · R0 — foundation tests (pure node, no browser).
   Proves the R0 success criterion and the frozen Registry / Output-Matrix
   contract. No report is migrated in R0, so renderers must return an empty
   skeleton — never real output. Usage: node tests/report-engine.test.cjs */
const { Report, ReportRegistry, REPORT_TOKENS, REPORT_TARGETS, Renderers } = require('../public/js/report-engine.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── Success criterion: Report.render(model, <target>) is callable for the four
     media and returns a valid skeleton result without throwing. ── */
const model = { meta: { reportId: 'MEMBER_STATEMENT', title: 'x' }, sections: [] };
['screen', 'print', 'pdf', 'excel'].forEach(t => {
  let r; try { r = Report.render(model, t); } catch (e) { r = { threw: e.message }; }
  ok(r && r.ok === true && r.skeleton === true && r.target === t && r.result && r.result.status === 'skeleton',
    `Report.render(model, '${t}') → valid empty skeleton`);
});

/* id form: Report.render('MEMBER_STATEMENT', 'print') */
const byId = Report.render('MEMBER_STATEMENT', 'print');
ok(byId.ok && byId.reportId === 'MEMBER_STATEMENT' && byId.target === 'print', "id form Report.render('MEMBER_STATEMENT','print') works");

/* renderers are EMPTY (no report migrated in R0) */
ok(Report.render(model, 'print').result.body === '', 'print renderer body is empty (no report migrated in R0)');
ok(Object.keys(Renderers).sort().join(',') === 'excel,pdf,print,screen', 'four renderer skeletons present (csv removed)');

/* ── Registry contract ── */
const REQUIRED_IDS = ['MEMBER_STATEMENT', 'FUND_STATEMENT', 'ANNUAL_DEBT', 'DELINQUENT', 'DONATION_REPORT',
  'MEMBERS_LIST', 'RECEIPTS_LIST', 'PAYMENTS_LIST', 'ANNUAL_LOG', 'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'TRANSFER_VOUCHER',
  'TREASURY_POSITION', 'DUES_SNAPSHOT', 'AUDIT_LOG', 'USERS_LIST', 'CONSISTENCY'];
ok(REQUIRED_IDS.every(id => ReportRegistry[id]), 'registry contains all target-report IDs');
ok(Report.list().length === REQUIRED_IDS.length, 'registry has exactly the declared reports (' + REQUIRED_IDS.length + ')');

const FIELDS = ['id', 'title', 'icon', 'category', 'orientation', 'defaultColumns', 'outputs', 'permission'];
let shapeOk = true, outOk = true, permOk = true, oriOk = true;
Report.list().forEach(d => {
  FIELDS.forEach(f => { if (!(f in d)) shapeOk = false; });
  if (!Array.isArray(d.outputs) || !d.outputs.every(o => REPORT_TARGETS.includes(o))) outOk = false;
  if (!['print', 'export'].includes(d.permission)) permOk = false;
  if (!['portrait', 'landscape'].includes(d.orientation)) oriOk = false;
});
ok(shapeOk, 'every report defines id/title/icon/category/orientation/defaultColumns/outputs/permission');
ok(outOk, 'every report’s outputs are a subset of the valid targets');
ok(permOk, "every report’s permission ∈ {print, export}");
ok(oriOk, "every report’s orientation ∈ {portrait, landscape}");

/* Member statement (pilot) declares all four outputs (csv removed) */
ok(['screen', 'print', 'pdf', 'excel'].every(o => ReportRegistry.MEMBER_STATEMENT.outputs.includes(o)),
  'MEMBER_STATEMENT (pilot) supports screen/print/pdf/excel');
ok(!ReportRegistry.MEMBER_STATEMENT.outputs.includes('csv'), 'MEMBER_STATEMENT no longer declares csv');

/* unsupported output is rejected cleanly (vouchers have no excel) */
const bad = Report.render('RECEIPT_VOUCHER', 'excel');
ok(bad.ok === false && bad.reason === 'output_not_supported', 'unsupported output rejected (no throw)');
ok(Report.render('NOPE', 'print').reason === 'unknown_report', 'unknown report id rejected');
ok(Report.render(model, 'fax').reason === 'unknown_target', 'unknown target rejected');

/* ── §2.6 auto-built output buttons from the registry (no hand-written buttons) ── */
const btns = Report.outputButtons('FUND_STATEMENT', { lang: 'en', can: { print: () => true, export: () => true } });
ok(/data-output="print"/.test(btns) && /data-output="pdf"/.test(btns) && /data-output="excel"/.test(btns),
  'outputButtons builds exactly the declared outputs (print/pdf/excel, no screen)');
ok(!/data-output="csv"/.test(btns), 'csv is not an output (removed in OUTPUT-002-C)');
ok(!/data-output="screen"/.test(btns), 'screen is not rendered as an output button');
const gated = Report.outputButtons('AUDIT_LOG', { lang: 'en', can: { print: () => true, export: () => false } });
ok(gated === '', 'export-permission report yields no buttons when can.export() is false');

/* ── Tokens: self-hosted fonts, no CDN ── */
ok(/@font-face/.test(REPORT_TOKENS) && /\/fonts\/ibm-plex-/.test(REPORT_TOKENS), 'REPORT_TOKENS self-hosts fonts from /fonts/');
ok(!/googleapis|cdnjs|http/i.test(REPORT_TOKENS), 'REPORT_TOKENS references no CDN / external URL');
ok(/--rpt-ink:#17202E/.test(REPORT_TOKENS) && /--rpt-fa:/.test(REPORT_TOKENS), 'design tokens (color + font vars) present');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
