/* ═══════════════════════════════════════════════════════════════════════════
   P2 · Member Financial Lifecycle — Slice 1 conformance proof
   Onboarding + Annual Billing + Initial-State view (read-only module)
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-1 module (public/js/member-lifecycle.js) is a faithful,
   read-only projection over the CERTIFIED read model — it introduces no new
   accounting logic and no second source of truth:

     • initialState = opening (certified carried position) + billed dues schedule
       → startingBalance (opening + dues, before any payment).
     • At the initial (pre-payment) state, startingBalance EQUALS the certified
       FIN.memberStatement finalBalance — same inputs, no second computation.
     • It is the INITIAL state: a later payment changes the certified live balance
       but NOT initialState (which is onboarding+billing only) — confirming the
       module does not re-derive live balances or record payments (out of slice).

   Loads the frozen engine + member-lifecycle.js in one shared scope (as the golden
   framework does). Run:  node tests/p2-member-lifecycle-slice1.cjs   exit 0 = OK.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function loadEngine(DB, openings) {
  const window = { LANG: 'ar', FOOD_OPENING: openings.food_deficit, DIWAN_OPENING: openings.diwan,
    TREASURY_OPENINGS: { food: 0, diwan: openings.diwan, historical_deficit: openings.food_deficit } };
  const L = new Proxy({}, { get: () => (() => '') });
  const documentStub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorageStub = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('member-lifecycle.js'),
    ';return { FIN: FIN, MemberLifecycle: window.MemberLifecycle };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, documentStub, localStorageStub);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(function main() {
  console.log('═══ P2 · Member Financial Lifecycle — Slice 1 conformance ═══\n');

  // a member onboarded with opening debt 200, billed for 2025 + 2026 (200 each), no payment yet
  const DB = {
    members: [{ id: 'M1', name: 'Onboarded', is_active: true, historical_balance_ils: 200, historical_payments_ils: 0 }],
    subscriptions: [
      { id: 's1', member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 },
      { id: 's2', member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }
    ],
    receipts: [], payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const { FIN, MemberLifecycle } = loadEngine(DB, { food_deficit: -1000, diwan: 0 });
  DB._alloc = null;

  A('module present', !!MemberLifecycle && typeof MemberLifecycle.initialState === 'function');

  const s = MemberLifecycle.initialState('M1');
  A('initial · opening = certified carried position', s.opening === 200, 'opening=' + s.opening);
  A('initial · dues schedule reflects billing (BO-10)', s.schedule.length === 2 && s.schedule[0].year === 2025 && s.schedule[0].due === 200 && s.schedule[1].due === 200);
  A('initial · total dues', s.totalDues === 400, 'totalDues=' + s.totalDues);
  A('initial · starting balance = opening + dues', s.startingBalance === 600, 'starting=' + s.startingBalance);
  A('initial · stage = billed', s.stage === 'billed', 'stage=' + s.stage);

  // single source: at the initial (no-payment) state, startingBalance == certified finalBalance
  const fin0 = R2(FIN.memberStatement('M1').finalBalance);
  A('single source · startingBalance == certified finalBalance (initial, pre-payment)', s.startingBalance === fin0, s.startingBalance + ' == ' + fin0);

  // INITIAL state is onboarding+billing only: a later payment changes the LIVE certified
  // balance but NOT the initial-state projection (module records no payment, does no live re-derivation)
  DB.receipts.push({ id: 'r1', no: 'REC-1', is_deleted: false, fund_type: 'food', member_id: 'M1',
    amount: 150, amount_ils: 150, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-05-01',
    movement_type: 'subscription_payment', destination_treasury: 'food' });
  DB._alloc = null;
  const finAfter = R2(FIN.memberStatement('M1').finalBalance);
  const sAfter = MemberLifecycle.initialState('M1');
  A('scope · live certified balance changes after a payment', finAfter === R2(600 - 150), 'finAfter=' + finAfter);
  A('scope · initial-state projection unchanged by the payment (no live re-derivation)', sAfter.startingBalance === 600, 'still=' + sAfter.startingBalance);

  // a member onboarded but not yet billed → stage onboarded, starting = opening
  DB.members.push({ id: 'M2', name: 'JustOnboarded', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 });
  const s2 = MemberLifecycle.initialState('M2');
  A('onboarded-only · no dues, stage=onboarded, starting=opening', s2.schedule.length === 0 && s2.stage === 'onboarded' && s2.startingBalance === 0);

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 1 MODULE CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
