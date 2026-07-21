/* ═══════════════════════════════════════════════════════════════════════════
   P-DUES-S1 · Annual Subscriptions / Dues Workspace — Slice 1 conformance proof
   Read-only State + History (visibility before capability). NO write path.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-1 workspace:
     • is READ-ONLY: exposes NO capability/execution wrapper (no apply-dues, no
       BO-10/BO-07 routing, no admin action); invokes NO Business Operation; the
       module source references no BusinessOps and no write flow; render + all view
       changes (year / filter / search) mutate NO store;
     • presents State (selected year's subscription status) and History (the dues
       schedule) in separate sections — no Capability section, no execution controls
       (GOV-WS-01 v1.5 · Rule 3);
     • is YEAR-ORIENTED and answers the slice's Business Question;
     • sources EVERY displayed value from an EXISTING certified read model / store
       (Rule 6): FIN.subscriptionYears · FIN.memberDelinquency · DB.subscriptions
       (same projection the certified Annual-Debt report uses) · DB.annual;
     • offers year navigation, filtering, searching, and a read-only print/export.

   Run:  node tests/p-dues-workspace-slice1.cjs   exit 0 = OK.
   (Golden Baseline proven separately by constitutional-verification.cjs.)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function load(DB, docEls, extraGlobals) {
  Object.assign(global, extraGlobals);
  const window = { LANG: 'ar', FOOD_OPENING: 0, DIWAN_OPENING: 0, TREASURY_OPENINGS: { food: 0, diwan: 0, historical_deficit: 0 } };
  const L = new Proxy({}, { get: () => (() => '') });
  const document = { getElementById: id => docEls[id] || null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorage = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('dues-workspace.js'),
    ';return { FIN: FIN, DuesWorkspace: window.DuesWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P-DUES-S1 · Annual Dues Workspace — Slice 1 (read-only State + History) conformance ═══\n');

  const DB = {
    members: [
      { id: 'M1', name: 'عضو أول', member_code: 'A-1', phone: '050', is_active: true },
      { id: 'M2', name: 'عضو ثانٍ', member_code: 'A-2', phone: '051', is_active: true }
    ],
    subscriptions: [
      { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 },
      { member_id: 'M2', year: 2025, due_amount_ils: 200, paid_amount_ils: 50, balance_ils: 150 },
      { member_id: 'M1', year: 2024, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 },
      { member_id: 'M2', year: 2024, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 }
    ],
    annual: [
      { year: 2025, amount: 200, member_count: 2, applied_by: 'المدير', applied_at: '2025-01-05T00:00:00Z' },
      { year: 2024, amount: 200, member_count: 2, applied_by: 'المدير', applied_at: '2024-01-03T00:00:00Z' }
    ],
    receipts: [], payments: [], contacts: [], inkind_donations: [], audit: [], _alloc: null
  };
  const dwOut = { innerHTML: '' };
  const docEls = { 'dw-out': dwOut };

  const boCalls = [];
  let printed = 0;
  const extras = {
    can: { write: () => true, admin: () => true, print: () => true },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, DuesWorkspace, window } = load(DB, docEls, extras);
  window.print = () => { printed++; };
  const navCalls = [];
  window.nav = p => navCalls.push(p);
  window.openPersonStmt = () => navCalls.push('stmt');

  // ── the module is version 1 and READ-ONLY in shape ───────────────────────
  A('DuesWorkspace exposed with State/History projections',
    typeof DuesWorkspace.yearState === 'function' && typeof DuesWorkspace.schedule === 'function' && typeof DuesWorkspace.years === 'function');
  A('module version >= 1', DuesWorkspace.version >= 1, 'version=' + DuesWorkspace.version);

  window.renderDuesWorkspace();
  let html = dwOut.innerHTML;
  // State + History live BEFORE the (Slice-2) Capability section; scope the Rule-3
  // "execution-free" checks to that region so this ratified S1 proof stays valid once
  // Slice 2 adds the Capability section to the same shared workspace file.
  const capIdx = html.indexOf('العمليات التشغيلية');
  const colsIdx = html.indexOf('dw-cols');
  // the State + History CARDS only (status · members · schedule) — after the hero
  // (whose dominant next-action CTA is legitimate under Rule 2) and before the
  // Slice-2 Capability card.
  const cards = (colsIdx >= 0 && capIdx > colsIdx) ? html.slice(colsIdx, capIdx) : html;

  // ── year-oriented · defaults to the most recent year · Business Question ──
  A('defaults to most recent membership year (2025)', /dw-tab on"[^>]*setYear\(2025\)/.test(html) && /dw-hero-name">[^<]*2025/.test(html));
  A('a Primary Business Question about the selected year is present', /السنة المحددة/.test(html));
  A('hero shows the selected year outstanding as the state figure; no direct BusinessOps onclick', /dw-hero-bal/.test(html) && !/onclick="[^"]*BusinessOps/.test(html));

  // ── Rule 3 · State + History are separate, execution-free sections ─────────
  A('State · Subscription Status section present', /حالة اشتراك السنة/.test(html));
  A('State · Members-this-year section present', /أعضاء السنة/.test(html));
  A('History · Dues Schedule section present', /تاريخ جدول الاشتراكات/.test(html));
  A('State + History carry no execution controls (Rule 3 — capability stays a separate section)',
    !/dw-cap-bo|dw-op-pri|actionApply|actionOnboard/.test(cards));

  // ── Rule 6 · every State figure equals the certified read model exactly ───
  const s = DuesWorkspace.yearState(2025);
  const delDue = R2(DB.members.reduce((t, m) => t + Number(((FIN.memberDelinquency(m.id).byYear || {})[2025] || {}).due || 0), 0));
  const delPaid = R2(DB.members.reduce((t, m) => t + Number(((FIN.memberDelinquency(m.id).byYear || {})[2025] || {}).paid || 0), 0));
  A('State.due = Σ FIN.memberDelinquency due (certified)', s.due === delDue && s.due === 400, 'due=' + s.due);
  A('State.paid = Σ FIN.memberDelinquency paid (certified)', s.paid === delPaid && s.paid === 250, 'paid=' + s.paid);
  A('State.outstanding = due − paid', s.outstanding === R2(s.due - s.paid) && s.outstanding === 150, 'out=' + s.outstanding);
  A('State.eligible = certified annual member_count', s.eligible === 2, 'eligible=' + s.eligible);
  A('State.perMember = certified annual amount', s.perMember === 200, 'perMember=' + s.perMember);
  A('State.billed reflects the certified annual_dues record', s.billed === true && s.appliedBy === 'المدير' && s.appliedAt === '2025-01-05');
  A('State counts (settled / outstanding) from certified delinquency', s.settledCount === 1 && s.outstandingCount === 1);

  // ── History equals the certified annual_dues store ────────────────────────
  const sch = DuesWorkspace.schedule();
  A('History schedule = DB.annual (2 years, most-recent first)', sch.length === 2 && sch[0].year === 2025 && sch[1].year === 2024);
  A('schedule row equals the certified stored values', sch[0].amount === 200 && sch[0].memberCount === 2 && sch[0].appliedBy === 'المدير');

  // ── the workspace executes NO Business Operation and mutates NO state ─────
  A('render invoked NO Business Operation (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module performs NO accounting and calls NO Business Operation directly',
    !/BusinessOps\s*\.|create_member_atomic|due_amount_ils\s*:/.test(rd('dues-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const subBefore = DB.subscriptions.length, annBefore = DB.annual.length, memBefore = DB.members.length;
  window.renderDuesWorkspace();
  DuesWorkspace.setYear(2024);
  DuesWorkspace.setFilter('outstanding');
  DuesWorkspace.setSearch('عضو');
  DuesWorkspace.setYear(2025);
  A('year / filter / search changes mutate no store (pure read-only view state)',
    DB.subscriptions.length === subBefore && DB.annual.length === annBefore && DB.members.length === memBefore);

  // ── navigation + search/filter + read-only export ─────────────────────────
  A('year navigation present (per-year tabs + schedule year links)', /dw-tab[^>]*onclick="window.DuesWorkspace.setYear\(2024\)/.test(html) && /setYear\(/.test(html));
  A('search + filter controls present (read-only view)', /dw-search/.test(html) && /DuesWorkspace.setFilter/.test(html) && /DuesWorkspace.setSearch/.test(html));
  A('read-only export calls printView (no accounting export engine)', /window.DuesWorkspace.printView\(\)/.test(html));
  DuesWorkspace.printView();
  A('printView is a pure browser print (read-only), mutates nothing', printed === 1 && DB.subscriptions.length === subBefore, 'printed=' + printed);

  console.log('\n═══ Result: ' + (failures === 0 ? 'DUES SLICE 1 (READ-ONLY) CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
