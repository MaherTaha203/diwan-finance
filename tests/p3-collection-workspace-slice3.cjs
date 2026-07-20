/* ═══════════════════════════════════════════════════════════════════════════
   P3 · Collection Operations Workspace — Slice 3 conformance proof
   Advanced corrections (reclassify / split) — orchestration only. COMPLETES the
   receipt-voucher module.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-3 workspace:
     • extends Slices 1–2 (read surface, State/History, issue/edit/cancel preserved);
       version → 3;
     • adds ONLY the corrective capability (BO-04 reclassify · BO-05 split) in the
       dedicated Capability section (GOV-WS-01 Rule 3 — State/History stay
       execution-free), answering the corrective Primary Business Question;
     • every corrective action DELEGATES to the existing certified reclassify flow
       (window.openReclassify → doReclassify → reclassifyVoucher → BO-04 / BO-05);
       the workspace calls NO Business Operation, holds NO correction logic, and
       mutates NO state;
     • Authorization: the workspace decides only WHETHER a correction is legitimate
       (can.admin); illegitimate corrections stay VISIBLE but DISABLED with a reason;
     • no BO-06, no allocation, no balance derivation; every displayed value still
       comes from certified read models.

   Run:  node tests/p3-collection-workspace-slice3.cjs   exit 0 = OK.
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
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('collection-workspace.js'),
    ';return { FIN: FIN, CollectionWorkspace: window.CollectionWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P3 · Collection Operations Workspace — Slice 3 (corrections) conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Payer', is_active: true }], subscriptions: [],
    receipts: [
      { id: 'r1', no: 'R-001', fund_type: 'food', payer_name: 'محمد', amount_ils: 200, amount: 200, receipt_date: '2025-03-10', movement_type: 'diwan_operational_income' },
      { id: 'r2', no: 'R-002', fund_type: 'diwan', payer_name: 'أحمد', amount_ils: 150, amount: 150, receipt_date: '2025-03-11' }
    ],
    payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const cwOut = { innerHTML: '' };
  const correctSel = { value: 'r1' };                    // stands in for the rendered #cw-correct-sel
  const docEls = { 'cw-out': cwOut, 'cw-edit-sel': { value: 'r1' }, 'cw-correct-sel': correctSel };

  let adminFlag = true;
  const boCalls = [], reclassCalls = [];
  const extras = {
    can: { write: () => true, admin: () => adminFlag },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, CollectionWorkspace, window } = load(DB, docEls, extras);
  window.openRec = () => {}; window.editRec = () => {};
  window.openReclassify = (kind, id) => reclassCalls.push([kind, id]);   // certified reclassify flow (→ BO-04 / BO-05)

  // ── extends Slices 1–2 ────────────────────────────────────────────────────
  A('extends Slices 1–2 (read surface + issue/edit wrappers preserved)',
    typeof CollectionWorkspace.collectionState === 'function' && typeof CollectionWorkspace.actionIssue === 'function' && typeof CollectionWorkspace.actionEdit === 'function');
  A('module version advanced to 3', CollectionWorkspace.version === 3, 'version=' + CollectionWorkspace.version);
  A('corrective wrapper exposed', typeof CollectionWorkspace.actionCorrect === 'function');

  window.renderCollectionWorkspace();
  let html = cwOut.innerHTML;

  // ── corrective capability present + its Primary Business Question ─────────
  A('corrective PBQ present', /إن احتاج السند إلى تصحيح، ما الإجراء التصحيحي المشروع/.test(html));
  A('corrective affordance tagged BO-04 · BO-05', /cw-cap-bo">BO-04 · BO-05/.test(html) && /cw-correct-sel/.test(html) && /actionCorrect\(\)/.test(html));
  A('prior capabilities preserved (BO-01 issue, BO-02·BO-03 edit)', /cw-cap-bo">BO-01/.test(html) && /cw-cap-bo">BO-02 · BO-03/.test(html));
  A('only BO-04/05 added — BO-06 is never an offered operation (may only be named as out-of-scope)', !/cw-cap-bo">BO-06/.test(html));

  // ── Rule 3 · State & History still carry no execution controls ────────────
  const ledgerTbl = (html.match(/<table class="cw-table"[\s\S]*?<\/table>/) || [''])[0];
  A('Rule 3 · History (Receipt Ledger) still has no execution controls', ledgerTbl.length > 0 && !/onclick/.test(ledgerTbl));

  // ── corrective action delegates ONLY to the certified reclassify flow ─────
  CollectionWorkspace.actionCorrect();
  A('correct → certified reclassify flow window.openReclassify(receipt, id) (→ BO-04/BO-05)',
    reclassCalls.length === 1 && reclassCalls[0][0] === 'receipt' && reclassCalls[0][1] === 'r1');

  // ── the workspace itself executes NO BO and mutates NO state ──────────────
  A('workspace invokes NO Business Operation directly (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module holds NO correction/accounting logic (no BusinessOps, no reclassify math)',
    !/BusinessOps\s*\.|reclassifyVoucher\s*\(/.test(rd('collection-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const recBefore = DB.receipts.length, audBefore = DB.audit.length;
  window.renderCollectionWorkspace();
  A('render + correct mutate no store (pure orchestration)', DB.receipts.length === recBefore && DB.audit.length === audBefore);

  // ── display still sourced from the certified read model ───────────────────
  const s = CollectionWorkspace.collectionState('all');
  const cr = R2((FIN.fundLedger('food', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0)
    + (FIN.fundLedger('diwan', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0));
  A('display · total still equals certified ledger credits', s.total === cr && s.total === 350, 'total=' + s.total);

  // ── Authorization · corrective stays VISIBLE but DISABLED for non-admin ───
  adminFlag = false;
  window.renderCollectionWorkspace();
  const h2 = cwOut.innerHTML;
  A('non-admin · corrective is VISIBLE but disabled with a reason (no reclassify routing)',
    /cw-cap-off[\s\S]*?BO-04 · BO-05/.test(h2) && !/actionCorrect\(\)/.test(h2) && !/cw-correct-sel/.test(h2) && /يتطلب صلاحية مدير/.test(h2));
  A('non-admin · corrective PBQ still shown (operation visible, not hidden)', /إن احتاج السند إلى تصحيح/.test(h2));

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 3 CORRECTIONS CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
