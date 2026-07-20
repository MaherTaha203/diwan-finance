/* ═══════════════════════════════════════════════════════════════════════════
   P3 · Collection Operations Workspace — Slice 2 conformance proof
   Activates CAPABILITY (issue / edit / cancel receipts) — orchestration only.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-2 workspace:
     • extends Slice 1 (read surface + State/History preserved); version → 2;
     • adds a DEDICATED Capability section (GOV-WS-01 Rule 3): State (Summary) and
       History (Ledger/Timeline) carry NO execution controls; execution lives only
       in the Operational Actions section;
     • follows Rule 4 (Intent → Authorization → Execution → Result): each capability
       is authority-gated and DELEGATES to an existing certified flow that routes to
       a certified Business Operation — issue → window.openRec (→ saveRec → BO-01);
       edit/cancel → window.editRec (→ updateRec → BO-02 · deleteRec → BO-03);
     • the workspace itself invokes NO Business Operation and mutates NO state
       (0 BusinessOps calls, no DB write) — orchestration only;
     • authority gating: non-write cannot issue, non-admin cannot edit (disabled with
       a reason); every displayed value still comes from the certified read model.

   Run:  node tests/p3-collection-workspace-slice2.cjs   exit 0 = OK.
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
const between = (html, startRe, endRe) => { const s = html.search(startRe); if (s < 0) return ''; const rest = html.slice(s); const e = rest.search(endRe); return e < 0 ? rest : rest.slice(0, e); };

(async function main() {
  console.log('═══ P3 · Collection Operations Workspace — Slice 2 (capability) conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Payer', is_active: true }], subscriptions: [],
    receipts: [
      { id: 'r1', no: 'R-001', fund_type: 'food', payer_name: 'محمد', amount_ils: 200, amount: 200, receipt_date: '2025-03-10' },
      { id: 'r2', no: 'R-002', fund_type: 'diwan', payer_name: 'أحمد', amount_ils: 150, amount: 150, receipt_date: '2025-03-11' }
    ],
    payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const cwOut = { innerHTML: '' };
  const editSel = { value: 'r1' };                       // stands in for the rendered #cw-edit-sel
  const docEls = { 'cw-out': cwOut, 'cw-edit-sel': editSel };

  let writeFlag = true, adminFlag = true;
  const boCalls = [], recCalls = [], editCalls = [];
  const extras = {
    can: { write: () => writeFlag, admin: () => adminFlag },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, CollectionWorkspace, window } = load(DB, docEls, extras);
  window.openRec = fund => recCalls.push(fund);          // certified create flow (→ BO-01)
  window.editRec = id => editCalls.push(id);             // certified editor (→ BO-02 / BO-03)

  // ── extends Slice 1 ───────────────────────────────────────────────────────
  A('extends Slice 1 (read surface preserved)', typeof CollectionWorkspace.collectionState === 'function' && typeof CollectionWorkspace.collectionRows === 'function');
  A('module version advanced to 2', CollectionWorkspace.version === 2, 'version=' + CollectionWorkspace.version);
  A('capability wrappers exposed', typeof CollectionWorkspace.actionIssue === 'function' && typeof CollectionWorkspace.actionEdit === 'function');

  window.renderCollectionWorkspace();
  let html = cwOut.innerHTML;

  // ── State/History preserved + one dominant Primary Business Question ──────
  A('State (Collection Summary) still renders', /ما إجمالي التحصيلات وحركة اليوم والمركز الحالي/.test(html));
  A('History (Receipt Ledger) still renders', /ما سندات القبض الموجودة/.test(html));
  A('hero keeps the one dominant Primary Business Question', /ما التحصيلات الموجودة اليوم، وما حالتها الحالية/.test(html) && (html.match(/cw-hero-bal/g) || []).length === 1);

  // ── Capability section present + Rule 4 structure ─────────────────────────
  A('Capability section renders (Operational Actions)', /ما الذي يمكنني تنفيذه قانونيًا الآن/.test(html));
  A('capability · issue affordance tagged BO-01', /cw-cap-bo">BO-01/.test(html) && /actionIssue\('food'\)/.test(html) && /actionIssue\('diwan'\)/.test(html));
  A('capability · edit/cancel affordance tagged BO-02 · BO-03', /cw-cap-bo">BO-02 · BO-03/.test(html) && /cw-edit-sel/.test(html) && /actionEdit\(\)/.test(html));
  A('Rule 4 · Intent → Authorization → Execution → Result note present', /النية ← الصلاحية ← التنفيذ عبر عملية أعمال معتمدة فقط ← النتيجة/.test(html));

  // ── Rule 3 · State & History sections carry NO execution controls ─────────
  const ledgerTbl = (html.match(/<table class="cw-table"[\s\S]*?<\/table>/) || [''])[0];
  const summary = between(html, /ملخص التحصيل/, /سجل سندات القبض/);
  A('Rule 3 · History (Receipt Ledger) has no execution controls', ledgerTbl.length > 0 && !/onclick/.test(ledgerTbl));
  A('Rule 3 · State (Summary) has no execution controls', summary.length > 0 && !/onclick/.test(summary));

  // ── Execution delegates ONLY to certified flows (→ certified BOs) ─────────
  CollectionWorkspace.actionIssue('food');
  CollectionWorkspace.actionIssue('diwan');
  A('issue → certified create flow window.openRec (→ BO-01), food+diwan', recCalls.length === 2 && recCalls[0] === 'food' && recCalls[1] === 'diwan');
  CollectionWorkspace.actionEdit();
  A('edit/cancel → certified editor window.editRec (→ BO-02/BO-03) for the selected receipt', editCalls.length === 1 && editCalls[0] === 'r1');

  // ── the workspace itself executes NO BO and mutates NO state ──────────────
  A('workspace invokes NO Business Operation directly (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module invokes NO BusinessOps in code (delegates to certified flows)',
    !/BusinessOps\s*\./.test(rd('collection-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const recBefore = DB.receipts.length, payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderCollectionWorkspace();
  A('render + actions mutate no store (pure orchestration)', DB.receipts.length === recBefore && DB.payments.length === payBefore && DB.audit.length === audBefore);

  // ── display still sourced from the certified read model ───────────────────
  const s = CollectionWorkspace.collectionState('all');
  const cr = R2((FIN.fundLedger('food', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0)
    + (FIN.fundLedger('diwan', '', '', 'cr') || []).reduce((t, r) => t + Number(r.cr || 0), 0));
  A('display · total still equals certified ledger credits', s.total === cr && s.total === 350, 'total=' + s.total);

  // ── Authorization gating (Rule 4) ─────────────────────────────────────────
  writeFlag = false;
  window.renderCollectionWorkspace();
  const h2 = cwOut.innerHTML;
  A('non-write · issue is disabled with a reason (no create routing)', /cw-cap-off[\s\S]*?BO-01/.test(h2) && !/actionIssue/.test(h2) && /يتطلب صلاحية كتابة/.test(h2));
  writeFlag = true; adminFlag = false;
  window.renderCollectionWorkspace();
  const h3 = cwOut.innerHTML;
  A('non-admin · edit/cancel is disabled with a reason (no editor routing)', /cw-cap-off[\s\S]*?BO-02 · BO-03/.test(h3) && !/actionEdit\(\)/.test(h3) && !/cw-edit-sel/.test(h3) && /يتطلب صلاحية مدير/.test(h3));

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 2 CAPABILITY CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
