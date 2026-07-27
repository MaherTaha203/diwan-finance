/* REPORT-001 · R7d — Lists cut-over tests (pure node).
     A) build{Members,AnnualLog,Users}ListModel map faithfully;
     B) the layouts render; C) the three list adapters route print/pdf/excel
        through the engine only when their (independent) flags are ON.
   Usage: node tests/report-r7d-lists.test.cjs */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
const { buildMembersListModel, buildAnnualLogModel, buildUsersListModel, ReportModel } = M;
const Report = globalThis.Report, ReportLayout = globalThis.ReportLayout;

/* ── Part A — the three pure list models ── */
const mem = buildMembersListModel({ rows: [
  { idx: 1, name: 'محمد', phone: '0599', balance: 350, status: 'مدين' },
  { idx: 2, name: 'سالم', phone: null, balance: -50, status: 'دائن' },
  { idx: 3, name: 'خالد', phone: '0597', balance: 0, status: 'مسدد' }
], filterLabel: { ar: 'الفلتر: الكل · العدد: 3', en: 'Filter: All · Count: 3' } });
ok(ReportModel.validate(mem).ok, 'members model validates');
ok(mem.meta.reportId === 'MEMBERS_LIST' && mem.meta.orientation === 'portrait', 'members meta portrait');
const mt = mem.sections[0];
ok(mt.columns.map(c => c.key).join(',') === 'idx,name,phone,balance,status', 'members columns idx,name,phone,balance,status');
ok(mt.columns[3].format === 'balance' && mt.rows[0].balance === 350 && mt.rows[1].balance === -50, 'balance is a signed Dr/Cr column');

const ann = buildAnnualLogModel({ rows: [
  { year: 2024, amount: 200, memberCount: 40, appliedAt: '2024-01-05', appliedBy: 'admin' },
  { year: 2025, amount: 200, memberCount: 42, appliedAt: '2025-01-03', appliedBy: 'admin' }
] });
ok(ReportModel.validate(ann).ok && ann.meta.reportId === 'ANNUAL_LOG', 'annual-log model validates (ANNUAL_LOG)');
ok(ann.sections[0].columns.map(c => c.key).join(',') === 'year,amount,memberCount,appliedAt,appliedBy', 'annual columns in order');
ok(ann.sections[0].rows[0].amount === 200 && ann.sections[0].rows[0].memberCount === 40, 'annual numbers preserved');

const usr = buildUsersListModel({ rows: [{ email: 'a@x.com', role: 'مدير' }, { email: 'b@x.com', role: 'مشاهد' }] });
ok(ReportModel.validate(usr).ok && usr.meta.reportId === 'USERS_LIST', 'users model validates (USERS_LIST)');
ok(usr.sections[0].columns.map(c => c.key).join(',') === 'email,role' && usr.sections[0].rows[1].role === 'مشاهد', 'users columns email,role with role label');

/* ── Part B — layouts render ── */
ok(/rpt-doc/.test(ReportLayout.build(mem, { lang: 'ar' }).html) && /مدين/.test(ReportLayout.build(mem, { lang: 'ar' }).html), 'members layout renders (Dr/Cr)');
ok(/2024/.test(ReportLayout.build(ann, { lang: 'ar' }).html), 'annual layout renders');
ok(/a@x\.com/.test(ReportLayout.build(usr, { lang: 'ar' }).html), 'users layout renders');

/* ── Part C — three independent adapters (globals stubbed) ── */
require('../public/js/report-cutover-core.js');
globalThis.document = { getElementById: () => null };
globalThis.LANG = 'ar';
globalThis.FIN = {};
globalThis.DB = { members: [], annual: [], users: [] };
globalThis.ReportModels = { membersList: () => mem, annualLog: () => ann, usersList: () => usr };
const calls = [];
globalThis.Report = { render: (m, t) => { calls.push({ target: t, id: m && m.meta && m.meta.reportId }); return { ok: true }; }, outputButtons: () => '' };
globalThis.can = null;
globalThis.REPORT_ENGINE_MEMBERS_LIST = true;
globalThis.REPORT_ENGINE_ANNUAL_LOG = true;
globalThis.REPORT_ENGINE_USERS_LIST = true;
const L = require('../public/js/report-cutover-lists.js');

ok(L.membersReady() && L.annualReady() && L.usersReady(), 'all three adapters ready when their flags are ON');
L.members('print'); L.annual('excel'); L.users('pdf');
ok(calls.length === 3 && calls[0].id === 'MEMBERS_LIST' && calls[1].id === 'ANNUAL_LOG' && calls[2].id === 'USERS_LIST', 'each adapter routes its own model to the engine');
ok(calls[0].target === 'print' && calls[1].target === 'excel' && calls[2].target === 'pdf', 'each output routed to the matching renderer');

globalThis.REPORT_ENGINE_MEMBERS_LIST = false;
const before = calls.length;
ok(L.membersReady() === false && L.members('print') === false && calls.length === before, 'members flag OFF ⇒ inert');
ok(L.annualReady() === true && L.usersReady() === true, 'the three flags are independent');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
