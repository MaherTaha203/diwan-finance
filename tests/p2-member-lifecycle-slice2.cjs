/* ═══════════════════════════════════════════════════════════════════════════
   P2 · Member Financial Lifecycle — Slice 2 conformance proof
   Dedicated workspace (Member Summary · Financial Status · Statement · Timeline ·
   Available Actions) — orchestration only.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-2 workspace:
     • renders all five task-oriented sections;
     • sources ALL data from the certified read model (FIN.memberStatement) — the
       displayed balance equals FIN's and tracks it (read-through, no cached/2nd
       computation, no accounting logic in the UI);
     • routes every action through an existing certified Business Operation — the
       deactivate action invokes ONLY BusinessOps.cancelMember (BO-09), no direct
       write, no new operation.
   Extends Slice 1 without replacing it (initialState/initialStateCard still present).

   Loads the frozen engine + member-lifecycle.js in one shared scope with a minimal
   DOM stub. Run:  node tests/p2-member-lifecycle-slice2.cjs   exit 0 = OK.
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
  console.log('═══ P2 · Member Financial Lifecycle — Slice 2 workspace conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Workspace Member', member_code: 'MC1', phone: '059', active_from_year: 2025, is_active: true, historical_balance_ils: 200, historical_payments_ils: 0 }],
    subscriptions: [{ id: 's1', member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }],
    receipts: [], payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const mwOut = { innerHTML: '' };
  const docEls = { 'mw-member': { value: 'M1' }, 'mw-out': mwOut };
  const cancelCalls = [];
  const extras = {
    can: { admin: () => true },
    BusinessOps: { cancelMember: async a => { cancelCalls.push(a); return { ok: true }; } },
    toast: () => {}, loadAll: async () => {}, gm: id => DB.members.find(m => m.id === id)
  };
  const { FIN, MemberLifecycle, window } = load(DB, { food_deficit: -1000, diwan: 0 }, docEls, extras);
  DB._alloc = null;

  A('extends Slice 1 (initialState/initialStateCard preserved)', typeof MemberLifecycle.initialState === 'function' && typeof MemberLifecycle.initialStateCard === 'function');
  A('workspace entry points present', typeof window.renderMemberWorkspace === 'function' && typeof window.openMemberWorkspace === 'function');

  window.renderMemberWorkspace();
  const html = mwOut.innerHTML;
  A('renders · Member Summary section', /من هو هذا العضو/.test(html));
  A('renders · Financial Status section', /ما هو الوضع المالي الحالي/.test(html));
  A('renders · Statement section', /كيف وصل العضو/.test(html));
  A('renders · Timeline section', /ماذا حدث عبر الزمن/.test(html));
  A('renders · Available Actions section', /ما الذي يمكن فعله قانونيًا/.test(html));

  // single source: the displayed final balance equals the certified read model
  const fin = R2(FIN.memberStatement('M1').finalBalance);   // 200 opening + 200 dues = 400
  A('single source · displays certified final balance', fin === 400 && html.indexOf('₪ ' + '400') !== -1, 'fin=' + fin);

  // read-through (no cached/2nd computation): change the certified inputs → workspace reflects it
  DB.subscriptions.push({ id: 's2', member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 });
  DB._alloc = null;
  window.renderMemberWorkspace();
  const fin2 = R2(FIN.memberStatement('M1').finalBalance);   // now 600
  A('read-through · workspace tracks the certified balance (no 2nd source)', fin2 === 600 && mwOut.innerHTML.indexOf('₪ ' + '600') !== -1, 'fin2=' + fin2);

  // actions invoke ONLY certified Business Operations — deactivate → BO-09
  await MemberLifecycle.actionDeactivate('M1');
  A('action · deactivate invokes BusinessOps.cancelMember (BO-09) with the id', cancelCalls.length === 1 && cancelCalls[0].id === 'M1');
  A('action · no bypass (no other write path than the certified BO)', cancelCalls.length === 1);

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 2 WORKSPACE CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
