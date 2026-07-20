/* ═══════════════════════════════════════════════════════════════════════════
   P2 · Member Financial Lifecycle — Slice 3 conformance proof
   The first OPERATIONAL Business Workspace — orchestration only.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-3 workspace:
     • extends Slice 1 + Slice 2 without replacing them (initialState /
       initialStateCard / renderWorkspace and all five sections still present);
     • answers ONE dominant Primary Business Question (GOV-WS-01): the hero shows
       the member's financial state AND a single dominant next-action CTA;
     • the operational panel is a LEGITIMACY ENGINE — the set of available
       operations is derived from certified state (authority + standing), each
       affordance carries the certified Business Operation it routes to, and
       illegitimate ones are shown disabled with a reason;
     • every EXECUTABLE action routes ONLY through an existing certified Business
       Operation: edit → BO-08 (window.editMember), annual billing → BO-10
       (certified annual-dues flow), deactivate → BO-09 (BusinessOps.cancelMember).
       No direct DB write, no new operation, no accounting logic in the workspace;
     • authority gating: a non-admin sees the read action only (all write/module
       operations disabled with a reason) — no bypass path exists;
     • every displayed value originates from the certified read model
       (FIN.memberStatement) and tracks it (read-through, no 2nd computation).

   Loads the frozen engine + member-lifecycle.js in one shared scope with a
   minimal DOM stub. Run:  node tests/p2-member-lifecycle-slice3.cjs   exit 0 = OK.
   (The Golden Baseline is proven separately by constitutional-verification.cjs.)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function load(DB, openings, docEls, extraGlobals) {
  Object.assign(global, extraGlobals);   // can / BusinessOps / toast / loadAll / gm (bare-global refs)
  const window = { LANG: 'ar', FOOD_OPENING: openings.food_deficit, DIWAN_OPENING: openings.diwan,
    TREASURY_OPENINGS: { food: 0, diwan: openings.diwan, historical_deficit: openings.food_deficit },
    confirm: () => true };
  const L = new Proxy({}, { get: () => (() => '') });
  const document = { getElementById: id => docEls[id] || null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorage = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('member-lifecycle.js'),
    ';return { FIN: FIN, MemberLifecycle: window.MemberLifecycle, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P2 · Member Financial Lifecycle — Slice 3 operational workspace conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Operational Member', member_code: 'MC1', phone: '059', active_from_year: 2025, is_active: true, historical_balance_ils: 200, historical_payments_ils: 0 }],
    subscriptions: [{ id: 's1', member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }],
    receipts: [], payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const mwOut = { innerHTML: '' };
  const docEls = { 'mw-member': { value: 'M1' }, 'mw-out': mwOut };

  // instrumented certified routes + authority toggle
  let adminFlag = true;
  const cancelCalls = [], editCalls = [], navCalls = [];
  const extras = {
    can: { admin: () => adminFlag },
    BusinessOps: { cancelMember: async a => { cancelCalls.push(a); return { ok: true }; } },
    toast: () => {}, loadAll: async () => {}, gm: id => DB.members.find(m => m.id === id)
  };
  const { FIN, MemberLifecycle, window } = load(DB, { food_deficit: -1000, diwan: 0 }, docEls, extras);
  // certified per-member flows the workspace ORCHESTRATES (never re-implements)
  window.editMember = id => editCalls.push(id);          // BO-08 route
  window.nav = p => navCalls.push(p);                    // BO-10 launcher / navigation
  DB._alloc = null;

  // ── extension (Slice 1 + Slice 2 preserved) ──────────────────────────────
  A('extends Slice 1 (initialState/initialStateCard preserved)', typeof MemberLifecycle.initialState === 'function' && typeof MemberLifecycle.initialStateCard === 'function');
  A('extends Slice 2 (renderWorkspace + entry points preserved)', typeof window.renderMemberWorkspace === 'function' && typeof window.openMemberWorkspace === 'function');
  A('module version advanced to 3', MemberLifecycle.version === 3, 'version=' + MemberLifecycle.version);
  A('legitimacy engine exposed (orchestration surface)', typeof MemberLifecycle.legitimacyOps === 'function' && typeof MemberLifecycle.nextLegitimateAction === 'function');

  window.renderMemberWorkspace();
  let html = mwOut.innerHTML;
  A('renders · Member Summary section', /من هو هذا العضو/.test(html));
  A('renders · Financial Status section', /ما هو الوضع المالي الحالي/.test(html));
  A('renders · Statement section', /كيف وصل العضو/.test(html));
  A('renders · Timeline section', /ماذا حدث عبر الزمن/.test(html));
  A('renders · Available Actions section', /ما الذي يمكن فعله قانونيًا/.test(html));

  // ── GOV-WS-01 · one dominant Primary Business Question ────────────────────
  A('hero states the Primary Business Question', /ما وضع هذا العضو المالي، وما الذي يمكنني فعله قانونيًا الآن/.test(html));
  A('hero shows the financial state (certified balance)', /mw-hero-bal/.test(html) && html.indexOf('₪ ' + '400') !== -1);
  A('hero surfaces ONE dominant next-action CTA', (html.match(/mw-hero-cta/g) || []).length === 1);

  // ── legitimacy engine · certified routing is auditable from the model ─────
  const st = FIN.memberStatement('M1');
  const del = FIN.memberDelinquency('M1');
  const init = MemberLifecycle.initialState('M1');
  const m = st.member || extras.gm('M1');
  const ops = MemberLifecycle.legitimacyOps(m, st, del, init);
  const byKey = k => ops.find(o => o.key === k);
  A('op · full statement routes to the certified READ model', byKey('statement') && byKey('statement').kind === 'read' && byKey('statement').allowed === true);
  A('op · edit member routes to BO-08', byKey('edit') && byKey('edit').bo === 'BO-08' && /actionEdit/.test(byKey('edit').run));
  A('op · annual billing routes to BO-10', byKey('billing') && byKey('billing').bo === 'BO-10' && /actionApplyDues/.test(byKey('billing').run));
  A('op · deactivate routes to BO-09', byKey('deactivate') && byKey('deactivate').bo === 'BO-09' && /actionDeactivate/.test(byKey('deactivate').run));
  A('legitimacy · NO voucher/payment/allocation/correction operation is offered',
    !ops.some(o => /BO-0[1-6]/.test(o.bo)));

  // ── admin sees legitimate write/module ops as ENABLED buttons ─────────────
  A('admin · edit/billing/deactivate render as enabled operations', /class="mw-op mw-op-write"/.test(html) && /class="mw-op mw-op-module"/.test(html) && /class="mw-op mw-op-danger"/.test(html));
  A('admin · every enabled op carries its certified BO tag', /mw-op-bo">BO-08/.test(html) && /mw-op-bo">BO-10/.test(html) && /mw-op-bo">BO-09/.test(html));

  // ── single source · displayed value equals the certified read model ───────
  const fin = R2(st.finalBalance);   // 200 opening + 200 dues = 400
  A('single source · displays certified final balance', fin === 400 && html.indexOf('₪ ' + '400') !== -1, 'fin=' + fin);
  DB.subscriptions.push({ id: 's2', member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 });
  DB._alloc = null;
  window.renderMemberWorkspace();
  const fin2 = R2(FIN.memberStatement('M1').finalBalance);   // now 600
  A('read-through · workspace tracks the certified balance (no 2nd source)', fin2 === 600 && mwOut.innerHTML.indexOf('₪ ' + '600') !== -1, 'fin2=' + fin2);

  // ── rendering is a pure read (no accounting side effect on the store) ─────
  const subsBefore = DB.subscriptions.length, annualBefore = DB.annual.length, auditBefore = DB.audit.length;
  window.renderMemberWorkspace();
  A('workspace render performs NO write (pure read/orchestration)',
    DB.subscriptions.length === subsBefore && DB.annual.length === annualBefore && DB.audit.length === auditBefore);

  // ── executable actions route ONLY through certified Business Operations ────
  await MemberLifecycle.actionEdit('M1');
  A('action · edit invokes the certified BO-08 flow (window.editMember), no direct write',
    editCalls.length === 1 && editCalls[0] === 'M1' && DB.audit.length === auditBefore);
  MemberLifecycle.actionApplyDues();
  A('action · annual billing opens the certified BO-10 flow (no in-workspace obligation generation)',
    navCalls.length === 1 && navCalls[0] === 'annual' && DB.subscriptions.length === subsBefore && DB.annual.length === annualBefore);
  await MemberLifecycle.actionDeactivate('M1');
  A('action · deactivate invokes BusinessOps.cancelMember (BO-09) with the id', cancelCalls.length === 1 && cancelCalls[0].id === 'M1');
  A('action · no write bypass — cancel went through the certified BO exactly once', cancelCalls.length === 1);

  // ── authority gating · non-admin gets the read action only ────────────────
  adminFlag = false;
  window.renderMemberWorkspace();
  const h2 = mwOut.innerHTML;
  const nonAdminOps = MemberLifecycle.legitimacyOps(m, FIN.memberStatement('M1'), FIN.memberDelinquency('M1'), MemberLifecycle.initialState('M1'));
  A('non-admin · write/module operations become illegitimate', nonAdminOps.filter(o => o.key !== 'statement').every(o => o.allowed === false));
  A('non-admin · read (statement) stays legitimate', nonAdminOps.find(o => o.key === 'statement').allowed === true);
  A('non-admin · disabled ops render with a reason, no enabled write button', /mw-op-off/.test(h2) && /mw-op-why/.test(h2) && !/class="mw-op mw-op-write"/.test(h2) && !/class="mw-op mw-op-danger"/.test(h2));

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 3 OPERATIONAL WORKSPACE CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
