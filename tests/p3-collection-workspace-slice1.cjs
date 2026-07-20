/* ═══════════════════════════════════════════════════════════════════════════
   P3 · Collection Operations Workspace — Slice 1 conformance proof
   The first read-only Collection Operations Workspace (Receipt Vouchers).
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-1 workspace:
     • renders the required sections — Collection Summary (STATE), Receipt Ledger
       and Collection Timeline (HISTORY), Workspace Navigation — and answers ONE
       dominant Primary Business Question (GOV-WS-01 Rule 2);
     • distinguishes State → History with NO Capability section and NO execution
       controls (Rule 3 / Rule 4: capability deferred to P3-S2);
     • sources EVERY displayed value from the certified read model
       (FIN.fundLedger credit rows = certified receipt ledger; FIN.foodBalance /
       diwanBalance = certified fund position) and tracks it (read-through);
     • executes NO Business Operation (no BO-01…06); the module never references
       BusinessOps and no BusinessOps method is invoked;
     • is strictly READ-ONLY: rendering mutates no store, and payments (debits) are
       never counted as collections (credits only).

   Loads the frozen engine + collection-workspace.js in one shared scope with a
   minimal DOM stub. Run:  node tests/p3-collection-workspace-slice1.cjs   exit 0 = OK.
   (The Golden Baseline is proven separately by constitutional-verification.cjs.)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function load(DB, openings, docEls, extraGlobals) {
  Object.assign(global, extraGlobals);
  const window = { LANG: 'ar', FOOD_OPENING: openings.food_deficit, DIWAN_OPENING: openings.diwan,
    TREASURY_OPENINGS: { food: 0, diwan: openings.diwan, historical_deficit: openings.food_deficit } };
  const L = new Proxy({}, { get: () => (() => '') });
  const document = { getElementById: id => docEls[id] || null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorage = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('collection-workspace.js'),
    ';return { FIN: FIN, CollectionWorkspace: window.CollectionWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P3 · Collection Operations Workspace — Slice 1 (read-only) conformance ═══\n');

  const td = new Date().toISOString().slice(0, 10);
  const DB = {
    members: [{ id: 'M1', name: 'Payer One', is_active: true }],
    subscriptions: [],
    receipts: [
      { id: 'r1', no: 'R-001', fund_type: 'food', payer_name: 'محمد', amount_ils: 200, amount: 200, receipt_date: '2025-03-10' },
      { id: 'r2', no: 'R-002', fund_type: 'diwan', payer_name: 'أحمد', amount_ils: 150, amount: 150, receipt_date: td, movement_type: 'diwan_operational_income' }
    ],
    payments: [ { id: 'p1', no: 'P-001', fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 90, amount: 90, payment_date: '2025-03-12', expense_type: 'x' } ],
    contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const cwOut = { innerHTML: '' };
  const docEls = { 'cw-out': cwOut };

  // instrument: any BusinessOps access/call would be a violation
  const boCalls = [];
  const extras = {
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, CollectionWorkspace, window } = load(DB, { food_deficit: 0, diwan: 0 }, docEls, extras);

  // ── surface + entry points ────────────────────────────────────────────────
  A('module present · version 1', CollectionWorkspace && CollectionWorkspace.version === 1);
  A('read surface exposed (collectionState / collectionRows)', typeof CollectionWorkspace.collectionState === 'function' && typeof CollectionWorkspace.collectionRows === 'function');
  A('workspace entry points present', typeof window.renderCollectionWorkspace === 'function' && typeof window.openCollectionWorkspace === 'function');

  window.renderCollectionWorkspace();
  let html = cwOut.innerHTML;

  // ── GOV-WS-01 · one dominant Primary Business Question (Rule 2) ────────────
  A('hero states the Primary Business Question', /ما التحصيلات الموجودة اليوم، وما حالتها الحالية/.test(html));
  A('hero surfaces ONE dominant metric (total collected)', (html.match(/cw-hero-bal/g) || []).length === 1);

  // ── required sections · State → History → Navigation ──────────────────────
  A('renders · Collection Summary (STATE)', /ما إجمالي التحصيلات وحركة اليوم والمركز الحالي/.test(html));
  A('renders · Receipt Ledger (HISTORY)', /ما سندات القبض الموجودة/.test(html));
  A('renders · Collection Timeline (HISTORY)', /ماذا حدث عبر الزمن/.test(html));
  A('renders · Workspace Navigation', /إلى أين أذهب من هنا/.test(html));

  // ── Rule 3 / Rule 4 · NO Capability section, NO execution controls ────────
  A('capability is deferred (P3-S2 note present, no execution)', /P3-S2/.test(html) && /cw-defer/.test(html));

  // ── single source · every value from the certified read model ─────────────
  const foodCr = R2((FIN.fundLedger('food', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0));
  const diwanCr = R2((FIN.fundLedger('diwan', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0));
  const s = CollectionWorkspace.collectionState('all');
  A('single source · total = certified ledger credits (food+diwan)', s.total === R2(foodCr + diwanCr) && s.total === 350, 'total=' + s.total);
  A('single source · displayed total matches certified figure', html.indexOf('₪ ' + '350') !== -1);
  A('position = certified fund balances', s.position.food === R2(FIN.foodBalance()) && s.position.diwan === R2(FIN.diwanBalance()));

  // ── read-only · payments (debits) are NOT collections ─────────────────────
  A('debits excluded · only receipt credits are collected', s.count === 2, 'count=' + s.count);

  // ── read-through · workspace tracks the certified ledger (no 2nd source) ───
  DB.receipts.push({ id: 'r3', no: 'R-003', fund_type: 'food', payer_name: 'سالم', amount_ils: 100, amount: 100, receipt_date: '2025-04-01' });
  window.renderCollectionWorkspace();
  const s2 = CollectionWorkspace.collectionState('all');
  A('read-through · total tracks the certified ledger', s2.total === 450 && cwOut.innerHTML.indexOf('₪ ' + '450') !== -1, 'total=' + s2.total);

  // ── read-only · render mutates no store ───────────────────────────────────
  const recBefore = DB.receipts.length, payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderCollectionWorkspace();
  CollectionWorkspace.setFund('food');
  CollectionWorkspace.setFund('all');
  A('workspace render is a pure read (no store mutation)', DB.receipts.length === recBefore && DB.payments.length === payBefore && DB.audit.length === audBefore);

  // ── no Business Operation executed ────────────────────────────────────────
  A('no Business Operation is executed (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module source references NO BusinessOps (read-only by construction)', !/BusinessOps/.test(rd('collection-workspace.js')));
  A('markup contains no execution routing (create/edit/cancel/reclassify/split)',
    !/BusinessOps|actionEdit|actionDeactivate|saveRec|savePay|updateRec|deleteRec|reclassif|splitVoucher/i.test(cwOut.innerHTML));

  // ── read-only view filter works (not an operation) ────────────────────────
  CollectionWorkspace.setFund('food');
  const sf = CollectionWorkspace.collectionState('food');
  A('fund filter · food view shows only food credits', sf.rows.every(r => r.fund === 'food') && sf.total === R2(foodCr + 100), 'food total=' + sf.total);

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 1 COLLECTION WORKSPACE CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
