/* REPORT-001 · R7g — Audit Log + Consistency report tests (pure node).
     A) buildAuditLogModel maps DB.audit rows;
     B) buildConsistencyModel maps the verifier verdict + checks + failed members;
     C) both validate + render + are delivered by the real print renderer.
   Usage: node tests/report-r7g-audit-consistency.test.cjs */
require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
require('../public/js/report-render-print.js');
const { buildAuditLogModel, buildConsistencyModel, ReportModel } = M;
const Report = globalThis.Report, ReportLayout = globalThis.ReportLayout;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── A — audit log ── */
const al = buildAuditLogModel({ rows: [
  { date: '2026-07-27', action: 'create', desc: 'إنشاء إيصال', user: 'admin', table: 'receipts' },
  { date: '2026-07-26', action: 'login_success', desc: 'دخول', user: 'acc', table: null }
], printDate: '2026-07-27T00:00:00.000Z' });
ok(ReportModel.validate(al).ok, 'audit model validates');
ok(al.meta.reportId === 'AUDIT_LOG' && al.meta.orientation === 'landscape', 'meta AUDIT_LOG landscape');
ok(al.sections[0].columns.map(c => c.key).join(',') === 'date,action,desc,user,table', 'audit columns date,action,desc,user,table');
ok(al.sections[0].rows.length === 2 && al.sections[0].rows[0].action === 'create', 'audit rows preserved');
ok(al.meta.filters.some(f => /2/.test(f.ar)), 'audit filter carries the entry count');

/* ── B — consistency ── */
const okv = buildConsistencyModel({ verify: { allMatch: true, memberCount: 42,
  checks: [{ k: 'Σ member balances vs debt totals', a: 3500, b: 3500, match: true }], failedMembers: [] } });
ok(ReportModel.validate(okv).ok && okv.meta.reportId === 'CONSISTENCY' && okv.meta.orientation === 'portrait', 'consistency (all-match) validates, CONSISTENCY portrait');
ok(/جميع الكشوف متطابقة/.test(okv.summary[0].value.ar) && okv.summary[0].tone === 'pos', 'all-match verdict is positive');
ok(okv.summary[1].value === 42, 'members-checked count preserved');
const ck = okv.sections.find(s => s.id === 'checks');
ok(ck.columns.map(c => c.key).join(',') === 'check,valueA,valueB,status' && ck.rows[0].valueA === 3500 && /متطابق/.test(ck.rows[0].status.ar), 'checks table: check/valueA/valueB/status with match label');
ok(!okv.sections.find(s => s.id === 'failed'), 'no failed-members table when all match');

const badv = buildConsistencyModel({ verify: { allMatch: false, memberCount: 40,
  checks: [{ k: 'x', a: 100, b: 90, match: false }], failedMembers: [{ name: 'محمد', fails: 'ledger vs stored' }] } });
ok(badv.summary[0].tone === 'neg' && /اختلاف/.test(badv.summary[0].value.ar), 'mismatch verdict is negative');
const failed = badv.sections.find(s => s.id === 'failed');
ok(failed && failed.rows[0].member === 'محمد' && /ledger/.test(failed.rows[0].fails), 'failed-members table present with the failing member');

/* ── C — both render + real print renderer ── */
ok(/rpt-doc/.test(ReportLayout.build(al, { lang: 'ar' }).html) && /سجل العمليات/.test(ReportLayout.build(al, { lang: 'ar' }).html), 'audit layout renders');
ok(/rpt-doc/.test(ReportLayout.build(okv, { lang: 'ar' }).html) && /المطابقة/.test(ReportLayout.build(okv, { lang: 'ar' }).html), 'consistency layout renders');
ok(Report.render(al, 'excel') && Report.render(al, 'print').skeleton === false, 'audit renders via the engine (print not a skeleton)');
ok(Report.render(okv, 'print').skeleton === false, 'consistency renders via the real print renderer');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
