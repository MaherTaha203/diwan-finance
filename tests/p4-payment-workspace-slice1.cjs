/* ═══════════════════════════════════════════════════════════════════════════
   P4 · Payment Voucher Workspace — Slice 1 conformance proof
   The first read-only Payment Voucher Workspace (Disbursements) — the outflow
   mirror of the P3 Collection workspace.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-1 workspace:
     • renders the required sections — Payment Summary (STATE), Payment Ledger and
       Payment Timeline (HISTORY), Workspace Navigation — and answers ONE dominant
       Primary Business Question (GOV-WS-01 Rule 2);
     • distinguishes State → History with NO Capability section and NO execution
       controls (Rule 3 / Rule 4: capability deferred to P4-S2);
     • sources EVERY displayed value from the certified read model
       (FIN.fundLedger DEBIT rows = certified payment ledger; FIN.foodBalance /
       diwanBalance = certified fund liquidity) and tracks it (read-through);
     • executes NO Business Operation; the module never references BusinessOps and
       no BusinessOps method is invoked;
     • is strictly READ-ONLY: rendering mutates no store, and receipts (credits) are
       never counted as payments (debits only).

   Run:  node tests/p4-payment-workspace-slice1.cjs   exit 0 = OK.
   (The Golden Baseline is proven separately by constitutional-verification.cjs.)
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
  console.log('═══ P4 · Payment Voucher Workspace — Slice 1 (read-only) conformance ═══\n');

  const td = new Date().toISOString().slice(0, 10);
  const DB = {
    members: [{ id: 'M1', name: 'Beneficiary', is_active: true }], subscriptions: [],
    receipts: [ { id: 'r1', no: 'R-001', fund_type: 'food', payer_name: 'محمد', amount_ils: 500, amount: 500, receipt_date: '2025-03-01' } ],
    payments: [
      { id: 'p1', no: 'P-001', fund_type: 'food', beneficiary_name: 'مورد الغداء', amount_ils: 120, amount: 120, payment_date: '2025-03-10', expense_type: 'food' },
      { id: 'p2', no: 'P-002', fund_type: 'diwan', beneficiary_name: 'صيانة', amount_ils: 80, amount: 80, payment_date: td, expense_type: 'maintenance' }
    ],
    contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const pwOut = { innerHTML: '' };
  const docEls = { 'pw-out': pwOut };

  const boCalls = [];
  const extras = {
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, PaymentWorkspace, window } = load(DB, docEls, extras);

  // ── surface + entry points ────────────────────────────────────────────────
  A('module present · version 1', PaymentWorkspace && PaymentWorkspace.version === 1);
  A('read surface exposed (paymentState / paymentRows)', typeof PaymentWorkspace.paymentState === 'function' && typeof PaymentWorkspace.paymentRows === 'function');
  A('workspace entry points present', typeof window.renderPaymentWorkspace === 'function' && typeof window.openPaymentWorkspace === 'function');

  window.renderPaymentWorkspace();
  let html = pwOut.innerHTML;

  // ── GOV-WS-01 · one dominant Primary Business Question (Rule 2) ────────────
  A('hero states the Primary Business Question', /ما المدفوعات القائمة، وما حالتها التشغيلية الحالية/.test(html));
  A('hero surfaces ONE dominant metric (total disbursed)', (html.match(/pw-hero-bal/g) || []).length === 1);

  // ── required sections · State → History → Navigation ──────────────────────
  A('renders · Payment Summary (STATE)', /ما إجمالي المدفوعات وحركة اليوم والسيولة الحالية/.test(html));
  A('renders · Payment Ledger (HISTORY)', /ما سندات الصرف الموجودة/.test(html));
  A('renders · Payment Timeline (HISTORY)', /ماذا حدث عبر الزمن/.test(html));
  A('renders · Workspace Navigation', /إلى أين أذهب من هنا/.test(html));

  // ── Rule 3 / Rule 4 · NO Capability section, NO execution controls ────────
  A('capability is deferred (P4-S2 note present, no execution)', /P4-S2/.test(html) && /pw-defer/.test(html));

  // ── single source · every value from the certified read model ─────────────
  const foodDr = R2((FIN.fundLedger('food', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0));
  const diwanDr = R2((FIN.fundLedger('diwan', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0));
  const s = PaymentWorkspace.paymentState('all');
  A('single source · total = certified ledger debits (food+diwan)', s.total === R2(foodDr + diwanDr) && s.total === 200, 'total=' + s.total);
  A('single source · displayed total matches certified figure', html.indexOf('₪ ' + '200') !== -1);
  A('liquidity = certified fund balances', s.liquidity.food === R2(FIN.foodBalance()) && s.liquidity.diwan === R2(FIN.diwanBalance()));

  // ── read-only · receipts (credits) are NOT payments ───────────────────────
  A('credits excluded · only payment debits are counted', s.count === 2, 'count=' + s.count);

  // ── read-through · workspace tracks the certified ledger (no 2nd source) ───
  DB.payments.push({ id: 'p3', no: 'P-003', fund_type: 'food', beneficiary_name: 'كهرباء', amount_ils: 100, amount: 100, payment_date: '2025-04-01', expense_type: 'utilities' });
  window.renderPaymentWorkspace();
  const s2 = PaymentWorkspace.paymentState('all');
  A('read-through · total tracks the certified ledger', s2.total === 300 && pwOut.innerHTML.indexOf('₪ ' + '300') !== -1, 'total=' + s2.total);

  // ── read-only · render mutates no store ───────────────────────────────────
  const recBefore = DB.receipts.length, payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderPaymentWorkspace();
  PaymentWorkspace.setFund('food');
  PaymentWorkspace.setFund('all');
  A('workspace render is a pure read (no store mutation)', DB.receipts.length === recBefore && DB.payments.length === payBefore && DB.audit.length === audBefore);

  // ── no Business Operation executed ────────────────────────────────────────
  A('no Business Operation is executed (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module source references NO BusinessOps (read-only by construction)',
    !/BusinessOps\s*\./.test(rd('payment-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  A('markup contains no execution routing (create/edit/cancel/reclassify)',
    !/BusinessOps|savePay|updatePay|deletePay|openReclassify|actionIssue|actionEdit/i.test(pwOut.innerHTML));

  // ── read-only view filter works (not an operation) ────────────────────────
  PaymentWorkspace.setFund('food');
  const sf = PaymentWorkspace.paymentState('food');
  A('fund filter · food view shows only food debits', sf.rows.every(r => r.fund === 'food') && sf.total === R2(foodDr + 100), 'food total=' + sf.total);

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 1 PAYMENT WORKSPACE CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
