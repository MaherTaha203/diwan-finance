/* ═══════════════════════════════════════════════════════════════════════════
   P4 · Payment Voucher Workspace — Slice 3 conformance proof
   Advanced corrections (reclassify / split) — orchestration only. COMPLETES the
   payment-voucher module.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-3 workspace:
     • extends Slices 1–2 (read surface, State/History, issue/edit/cancel preserved);
       version → 3;
     • adds ONLY the corrective capability (BO-04 reclassify · BO-05 split) in the
       dedicated Capability section (GOV-WS-01 Rule 3 — State/History stay
       execution-free), answering the corrective Primary Business Question;
     • every corrective action DELEGATES to the existing certified reclassify flow
       (window.openReclassify('payment', id) → doReclassify → reclassifyVoucher →
       BO-04 / BO-05); the workspace calls NO Business Operation, holds NO correction
       logic, and mutates NO state;
     • Authorization: the workspace decides only WHETHER a correction is legitimate
       (can.admin); illegitimate corrections stay VISIBLE but DISABLED with a reason;
     • no BO-06, no approval, no liquidity guard; every displayed value still comes
       from certified read models (one source of operational truth — Rule 6).

   Run:  node tests/p4-payment-workspace-slice3.cjs   exit 0 = OK.
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
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('payment-workspace.js'),
    ';return { FIN: FIN, PaymentWorkspace: window.PaymentWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P4 · Payment Voucher Workspace — Slice 3 (corrections) conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Beneficiary', is_active: true }], subscriptions: [],
    receipts: [], payments: [
      { id: 'p1', no: 'P-001', fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 120, amount: 120, payment_date: '2025-03-10', expense_type: 'food' },
      { id: 'p2', no: 'P-002', fund_type: 'diwan', beneficiary_name: 'صيانة', amount_ils: 80, amount: 80, payment_date: '2025-03-11', expense_type: 'maintenance' }
    ],
    contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const pwOut = { innerHTML: '' };
  const correctSel = { value: 'p1' };
  const docEls = { 'pw-out': pwOut, 'pw-edit-sel': { value: 'p1' }, 'pw-correct-sel': correctSel };

  let adminFlag = true;
  const boCalls = [], reclassCalls = [];
  const extras = {
    can: { write: () => true, admin: () => adminFlag },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, PaymentWorkspace, window } = load(DB, docEls, extras);
  window.openPay = () => {}; window.editPay = () => {};
  window.openReclassify = (kind, id) => reclassCalls.push([kind, id]);   // certified reclassify flow (→ BO-04 / BO-05)

  // ── extends Slices 1–2 ────────────────────────────────────────────────────
  A('extends Slices 1–2 (read surface + issue/edit wrappers preserved)',
    typeof PaymentWorkspace.paymentState === 'function' && typeof PaymentWorkspace.actionIssue === 'function' && typeof PaymentWorkspace.actionEdit === 'function');
  A('module version advanced to 3', PaymentWorkspace.version === 3, 'version=' + PaymentWorkspace.version);
  A('corrective wrapper exposed', typeof PaymentWorkspace.actionCorrect === 'function');

  window.renderPaymentWorkspace();
  let html = pwOut.innerHTML;

  // ── corrective capability present + its Primary Business Question ─────────
  A('corrective PBQ present', /كيف أصحّح عملية صرف قائمة مع الحفاظ على السلامة المحاسبية/.test(html));
  A('corrective affordance tagged BO-04 · BO-05', /pw-cap-bo">BO-04 · BO-05/.test(html) && /pw-correct-sel/.test(html) && /actionCorrect\(\)/.test(html));
  A('prior capabilities preserved (BO-01 issue, BO-02·BO-03 edit)', /pw-cap-bo">BO-01/.test(html) && /pw-cap-bo">BO-02 · BO-03/.test(html));
  A('only BO-04/05 added — BO-06 never an offered operation', !/pw-cap-bo">BO-06/.test(html));

  // ── Rule 3 · State & History still carry no execution controls ────────────
  const ledgerTbl = (html.match(/<table class="pw-table"[\s\S]*?<\/table>/) || [''])[0];
  A('Rule 3 · History (Payment Ledger) still has no execution controls', ledgerTbl.length > 0 && !/onclick/.test(ledgerTbl));

  // ── corrective action delegates ONLY to the certified reclassify flow ─────
  PaymentWorkspace.actionCorrect();
  A('correct → certified reclassify flow window.openReclassify(payment, id) (→ BO-04/BO-05)',
    reclassCalls.length === 1 && reclassCalls[0][0] === 'payment' && reclassCalls[0][1] === 'p1');

  // ── the workspace itself executes NO BO and mutates NO state ──────────────
  A('workspace invokes NO Business Operation directly (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module holds NO correction/accounting logic (no BusinessOps, no reclassify math)',
    !/BusinessOps\s*\.|reclassifyVoucher\s*\(/.test(rd('payment-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderPaymentWorkspace();
  A('render + correct mutate no store (pure orchestration)', DB.payments.length === payBefore && DB.audit.length === audBefore);

  // ── display still sourced from the certified read model (Rule 6) ──────────
  const s = PaymentWorkspace.paymentState('all');
  const dr = R2((FIN.fundLedger('food', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0)
    + (FIN.fundLedger('diwan', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0));
  A('display · total still equals certified ledger debits', s.total === dr && s.total === 200, 'total=' + s.total);

  // ── Authorization · corrective stays VISIBLE but DISABLED for non-admin ───
  adminFlag = false;
  window.renderPaymentWorkspace();
  const h2 = pwOut.innerHTML;
  A('non-admin · corrective is VISIBLE but disabled with a reason (no reclassify routing)',
    /pw-cap-off[\s\S]*?BO-04 · BO-05/.test(h2) && !/actionCorrect\(\)/.test(h2) && !/pw-correct-sel/.test(h2) && /يتطلب صلاحية مدير/.test(h2));
  A('non-admin · corrective PBQ still shown (operation visible, not hidden)', /كيف أصحّح عملية صرف قائمة/.test(h2));

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 3 CORRECTIONS CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
