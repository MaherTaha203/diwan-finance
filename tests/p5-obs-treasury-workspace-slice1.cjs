/* ═══════════════════════════════════════════════════════════════════════════
   P5-OBS-S1 · Treasury / Financial Position — Observability Layer conformance proof
   The single slice that COMPLETES the read-only observability layer.
   ───────────────────────────────────────────────────────────────────────────
   Proves the observability layer:
     • is READ-ONLY: it invokes NO Business Operation, holds NO accounting/correction
       logic, and mutates NO store (render + period change touch no DB row);
     • presents the certified financial POSITION (State) and cross-fund MOVEMENT
       (History) in separate sections — no operational Capability, no execution
       controls anywhere (GOV-WS-01 Rule 3; Rule 4 N/A);
     • sources EVERY displayed value from a certified Read Model and equals it exactly
       (Rule 6 — one source of operational truth):
         · position → FIN.foodBalance / diwanBalance / donBalance / foodDeficitRemaining
                      / foodNetPosition / foodSettlementReserve / foodCurrentSupportTotal
                      / foodDebtSettlementTotal;
         · movement → FIN.fundLedger(fund, from, to) credit/debit rows;
       the combined position is exactly food + diwan (the two certified treasuries);
     • answers the dominant Primary Observability Question in its hero and carries a
       read-only marker instead of any execution CTA;
     • offers read-only navigation + a read-only print/export affordance only.

   Run:  node tests/p5-obs-treasury-workspace-slice1.cjs   exit 0 = OK.
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
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('treasury-workspace.js'),
    ';return { FIN: FIN, TreasuryWorkspace: window.TreasuryWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P5-OBS-S1 · Treasury / Financial Position — Observability Layer conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Member', is_active: true }], subscriptions: [],
    receipts: [
      { id: 'r1', no: 'R-001', fund_type: 'food', payer_name: 'دافع', amount_ils: 300, amount: 300, receipt_date: '2025-03-01', notes: 'قبض غداء' },
      { id: 'r2', no: 'R-002', fund_type: 'diwan', payer_name: 'دافع٢', amount_ils: 150, amount: 150, receipt_date: '2025-03-02', notes: 'قبض ديوان' }
    ],
    payments: [
      { id: 'p1', no: 'P-001', fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 120, amount: 120, payment_date: '2025-03-10', expense_type: 'food' },
      { id: 'p2', no: 'P-002', fund_type: 'diwan', beneficiary_name: 'صيانة', amount_ils: 80, amount: 80, payment_date: '2025-03-11', expense_type: 'maintenance' }
    ],
    contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const twOut = { innerHTML: '' };
  const docEls = { 'tw-out': twOut };

  const boCalls = [];
  let printed = 0;
  const extras = {
    can: { write: () => true, admin: () => true },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, TreasuryWorkspace, window } = load(DB, docEls, extras);
  window.print = () => { printed++; };
  const navCalls = [];
  window.nav = p => navCalls.push(p);

  // ── the layer exists and is version 1, read-only shape ────────────────────
  A('TreasuryWorkspace exposed with position + movement projections',
    typeof TreasuryWorkspace.position === 'function' && typeof TreasuryWorkspace.movementState === 'function' && typeof TreasuryWorkspace.movementRows === 'function');
  A('module version = 1 (single slice completes the layer)', TreasuryWorkspace.version === 1, 'version=' + TreasuryWorkspace.version);
  A('NO execution wrappers exist (no actionIssue/actionEdit/actionCorrect)',
    typeof TreasuryWorkspace.actionIssue === 'undefined' && typeof TreasuryWorkspace.actionEdit === 'undefined' && typeof TreasuryWorkspace.actionCorrect === 'undefined');

  window.renderTreasuryWorkspace();
  let html = twOut.innerHTML;

  // ── Rule 2 · one dominant Primary Observability Question in the hero ──────
  A('Primary Observability Question present in hero', /ما المركز المالي الحالي للمؤسسة، وكيف وصل إلى هذه الحالة/.test(html));
  A('hero carries a READ-ONLY marker, not an execution CTA', /رصد فقط · لا تنفيذ/.test(html) && !/onclick="[^"]*BusinessOps/.test(html));

  // ── Rule 3 · State + History as separate sections; no Capability/BO tags ──
  A('State · Financial Position section present', /المركز المالي/.test(html) && /المركز المجمّع/.test(html));
  A('State · Position Health section present', /سلامة المركز/.test(html));
  A('History · Cross-Fund Movement section present', /حركة الأموال عبر الصناديق/.test(html));
  A('History · Movement Timeline section present', /الخط الزمني للحركة/.test(html));
  A('NO Business-Operation capability tags anywhere (BO-xx never offered)', !/BO-\d/.test(html));
  A('NO execution controls (no onclick invoking a BusinessOp / issue / edit / reclassify)',
    !/actionIssue|actionEdit|actionCorrect|openPay|openRec|openReclassify/.test(html));

  // ── Rule 6 · every position figure equals the certified Read Model exactly ─
  const p = TreasuryWorkspace.position();
  A('position.food = FIN.foodBalance()', p.food === R2(FIN.foodBalance()), 'food=' + p.food);
  A('position.diwan = FIN.diwanBalance()', p.diwan === R2(FIN.diwanBalance()), 'diwan=' + p.diwan);
  A('position.don = FIN.donBalance()', p.don === R2(FIN.donBalance()), 'don=' + p.don);
  A('position.deficit = FIN.foodDeficitRemaining()', p.deficit === R2(FIN.foodDeficitRemaining()), 'deficit=' + p.deficit);
  A('position.netFood = FIN.foodNetPosition()', p.netFood === R2(FIN.foodNetPosition()), 'netFood=' + p.netFood);
  A('position.reserve = FIN.foodSettlementReserve()', p.reserve === R2(FIN.foodSettlementReserve()));
  A('position.support = FIN.foodCurrentSupportTotal()', p.support === R2(FIN.foodCurrentSupportTotal()));
  A('position.debtSettled = FIN.foodDebtSettlementTotal()', p.debtSettled === R2(FIN.foodDebtSettlementTotal()));
  A('combined = food + diwan (the two certified treasuries; no invented total)',
    p.combined === R2(p.food + p.diwan) && p.combined === R2(FIN.foodBalance() + FIN.diwanBalance()), 'combined=' + p.combined);
  A('netCombined = netFood + diwan', p.netCombined === R2(p.netFood + p.diwan), 'netCombined=' + p.netCombined);

  // ── History equals the certified ledger credit/debit rows exactly ─────────
  const s = TreasuryWorkspace.movementState('all');
  const crIn = R2((FIN.fundLedger('food', '', '') || []).filter(r => r.type === 'cr').reduce((t, r) => t + Number(r.cr || 0), 0)
    + (FIN.fundLedger('diwan', '', '') || []).filter(r => r.type === 'cr').reduce((t, r) => t + Number(r.cr || 0), 0));
  const drOut = R2((FIN.fundLedger('food', '', '') || []).filter(r => r.type === 'dr').reduce((t, r) => t + Number(r.dr || 0), 0)
    + (FIN.fundLedger('diwan', '', '') || []).filter(r => r.type === 'dr').reduce((t, r) => t + Number(r.dr || 0), 0));
  A('movement totalIn = certified ledger credits (food+diwan)', s.totalIn === crIn && s.totalIn === 450, 'totalIn=' + s.totalIn);
  A('movement totalOut = certified ledger debits (food+diwan)', s.totalOut === drOut && s.totalOut === 200, 'totalOut=' + s.totalOut);
  A('movement net = in − out', s.net === R2(s.totalIn - s.totalOut) && s.net === 250, 'net=' + s.net);

  // ── the layer executes NO Business Operation and mutates NO state ─────────
  A('render invoked NO Business Operation (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module source references NO BusinessOps and NO mutating flow (pure projection)',
    !/BusinessOps\s*\.|reclassifyVoucher\s*\(|savePay\s*\(|saveRec\s*\(|applyAnnualDue/.test(rd('treasury-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const recBefore = DB.receipts.length, payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderTreasuryWorkspace();
  TreasuryWorkspace.setPeriod('ytd');
  TreasuryWorkspace.setPeriod('all');
  A('render + period changes mutate no store (pure observation)',
    DB.receipts.length === recBefore && DB.payments.length === payBefore && DB.audit.length === audBefore && DB._alloc !== undefined);

  // ── period control is a read-only view filter, not an operation ───────────
  A('setPeriod filters the movement window (read-only view filter)',
    (function () { const a = TreasuryWorkspace.periodRange('all'), y = TreasuryWorkspace.periodRange('ytd'); return a[0] === '' && /^\d{4}-01-01$/.test(y[0]); })());

  // ── read-only navigation + export only ────────────────────────────────────
  A('navigation links present (read-only orientation to owning workspaces)',
    /window.nav&&window.nav\('food-stmt'\)/.test(html) && /window.nav&&window.nav\('payment-workspace'\)/.test(html) && /window.nav&&window.nav\('collection-workspace'\)/.test(html));
  A('read-only export affordance calls printPosition (no accounting export engine)', /window.TreasuryWorkspace.printPosition\(\)/.test(html));
  TreasuryWorkspace.printPosition();
  A('printPosition is a pure browser print (read-only), mutates nothing', printed === 1 && DB.receipts.length === recBefore, 'printed=' + printed);

  // ── explicit boundary note: observability only, Rule 4 N/A ────────────────
  A('layer states it is observability-only (executes nothing; Rule 4 N/A)', /القاعدة 4 لا تنطبق/.test(html) && /لا تنفّذ أي عملية/.test(html));

  console.log('\n═══ Result: ' + (failures === 0 ? 'OBSERVABILITY LAYER CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
