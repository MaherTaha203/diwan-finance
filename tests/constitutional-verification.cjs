/* ═══════════════════════════════════════════════════════════════════════════
   CONSTITUTIONAL VERIFICATION FRAMEWORK  ·  Phase P0 · V7
   ───────────────────────────────────────────────────────────────────────────
   The measurement foundation of P0. It loads the FROZEN accounting engine
   (utils · model2 · foodDonationAllocation · fin2 · fin · fin-contract) in a
   single shared scope — exactly as the browser concatenates the classic
   scripts — and, over a synthetic PII-free fixture:

     1. asserts the COMPUTATIONAL constitutional invariants that must always
        hold (Accounting Laws 1, 2, 3, 9, 10 + Guarantees §1/§7/§9), and
     2. captures a canonical snapshot of every authoritative balance and
        compares it against the committed GOLDEN baseline — any drift fails.

   This is pure addition: it touches no production logic. It is the baseline
   against which every later P0 fix (V1, V2, …) is measured.

   Run:            node tests/constitutional-verification.cjs
   Re-baseline:    node tests/constitutional-verification.cjs --update
   Exit code 0 = COMPLIANT · non-zero = a constitutional invariant or the
   golden baseline was violated.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const BASELINE = path.join(__dirname, 'constitutional-baseline.json');
const UPDATE = process.argv.includes('--update');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

/* ── load the frozen engine in ONE shared lexical scope (browser-equivalent) ── */
function loadEngine(DB, openings) {
  const window = {
    LANG: 'ar',
    FOOD_OPENING: openings.food_deficit,
    DIWAN_OPENING: openings.diwan,
    TREASURY_OPENINGS: { food: 0, diwan: openings.diwan, historical_deficit: openings.food_deficit }
  };
  const L = new Proxy({}, { get: () => (() => '') });          // label stub — never affects numbers
  const documentStub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorageStub = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [
    rd('utils.js'),
    rd('model2.js'),
    rd('foodDonationAllocation.js'),
    rd('fin2.js'),
    rd('fin.js'),
    'window.FIN = FIN;',                                        // FinContract reads window.FIN
    rd('fin-contract.js'),
    ';return { FIN: FIN, FIN2: window.FIN2, FinContract: window.FinContract, MODEL2: window.MODEL2 };'
  ].join('\n');
  const run = new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code);
  return run(window, DB, module, L, documentStub, localStorageStub);
}

/* ── synthetic, deterministic, PII-free fixture covering every event class ── */
function buildFixture() {
  const members = [
    { id: 'M1', name: 'Member One', is_active: true, historical_balance_ils: 400, historical_payments_ils: 0 },
    { id: 'M2', name: 'Member Two', is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 }
  ];
  const subscriptions = [
    { id: 's1', member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 },
    { id: 's2', member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 },
    { id: 's3', member_id: 'M2', year: 2025, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }
  ];
  const receipts = [
    /* food subscription payment (Law 1: enters food, reduces member balance) */
    { id: 'r1', no: 'REC-00001', is_deleted: false, fund_type: 'food', member_id: 'M1',
      amount: 300, amount_ils: 300, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-01-05',
      movement_type: 'subscription_payment', destination_treasury: 'food' },
    /* food cash donation by a member (Item-9 allocation slices must sum to amount) */
    { id: 'r2', no: 'REC-00002', is_deleted: false, fund_type: 'donation', member_id: 'M2',
      amount: 250, amount_ils: 250, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-02-10',
      movement_type: 'food_cash_donation', destination_treasury: 'food', donation_display_fund: 'food',
      food_donation_allocation: 'support_current' },
    /* historical debt collection (Law: deficit inflow, reduces member's own debt) */
    { id: 'r3', no: 'REC-00003', is_deleted: false, fund_type: 'donation', member_id: 'M1',
      amount: 197, amount_ils: 197, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-03-01',
      movement_type: 'historical_debt_collection', destination_treasury: 'historical_deficit',
      donation_display_fund: 'food', food_donation_allocation: 'reduce_deficit' },
    /* directed deficit donation (non-member) */
    { id: 'r4', no: 'REC-00004', is_deleted: false, fund_type: 'donation', payer_name: 'External Donor',
      amount: 100, amount_ils: 100, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-03-15',
      movement_type: 'deficit_cash_donation', destination_treasury: 'historical_deficit',
      donation_display_fund: 'food', food_donation_allocation: 'reduce_deficit' },
    /* diwan cash donation */
    { id: 'r5', no: 'REC-00005', is_deleted: false, fund_type: 'diwan', payer_name: 'External Donor',
      amount: 120, amount_ils: 120, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-04-01',
      movement_type: 'diwan_cash_donation', destination_treasury: 'diwan' },
    /* in-kind (never touches cash) */
    { id: 'r6', no: 'REC-00006', is_deleted: false, fund_type: 'donation', payer_name: 'External Donor',
      amount: 500, amount_ils: 500, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-04-10',
      movement_type: 'donation_inkind', destination_treasury: null }
  ];
  const payments = [
    /* food expense (outflow) */
    { id: 'p1', no: 'PAY-00001', is_deleted: false, fund_type: 'food', beneficiary_name: 'Supplier',
      amount: 90, amount_ils: 90, currency: 'ILS', exchange_rate: 1, payment_date: '2026-05-01',
      movement_type: 'food_expense', destination_treasury: 'food', expense_type: 'food' },
    /* diwan expense (outflow) */
    { id: 'p2', no: 'PAY-00002', is_deleted: false, fund_type: 'diwan', beneficiary_name: 'Supplier',
      amount: 40, amount_ils: 40, currency: 'ILS', exchange_rate: 1, payment_date: '2026-05-05',
      movement_type: 'diwan_expense', destination_treasury: 'diwan', expense_type: 'other' }
  ];
  return {
    members, subscriptions, receipts, payments,
    contacts: [], annual: [], audit: [], inkind_donations: [],
    openings: { food_deficit: -1000, diwan: 500 }
  };
}

/* ── assertion harness ── */
let failures = 0, checks = 0;
const law = (id, cond, detail) => {
  checks++;
  const pass = !!cond;
  if (!pass) failures++;
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : ''));
};

/* ── main ── */
(function main() {
  const fx = buildFixture();
  const DB = {
    members: fx.members, subscriptions: fx.subscriptions, receipts: fx.receipts,
    payments: fx.payments, contacts: fx.contacts, annual: fx.annual, audit: fx.audit,
    inkind_donations: fx.inkind_donations, _alloc: null
  };
  const { FIN, FIN2, FinContract, MODEL2 } = loadEngine(DB, fx.openings);
  DB._alloc = null;

  console.log('═══ Constitutional Verification Framework (P0 · V7) ═══\n');

  // ---- independent re-derivation of treasury balances (does NOT reuse FIN2 sums) ----
  const eventOf = mt => (MODEL2.EVENTS || {})[mt] || {};
  const cashRows = [...DB.receipts, ...DB.payments].filter(r => !r.is_deleted);
  function independentTreasury(key) {
    let bal = (key === 'historical_deficit') ? fx.openings.food_deficit
            : (key === 'diwan') ? fx.openings.diwan : 0;
    cashRows.forEach(r => {
      const ev = eventOf(r.movement_type);
      if (!ev || ev.cash !== true) return;
      const amt = Number(r.amount_ils || r.amount || 0);
      if (r.destination_treasury === key) bal += ev.outflow ? -amt : amt;
      if (r.source_treasury === key)      bal -= amt;
    });
    return R2(bal);
  }

  /* LAW 2 · Derivation — the food treasury is re-computable from movements alone:
     raw food (Σ inflows − outflows, recomputed independently) minus the ق5
     debt-settled slice (which transfers food→deficit) equals the engine's food
     treasury exactly. Nothing is created or lost — only the accounted transfer. */
  const q5Food = R2(FIN.allocateFoodDonations().debtSettlementTotal);
  law('LAW-2  Derivation · food re-derivable (raw − ق5 == engine)',
      Math.abs((independentTreasury('food') - q5Food) - FIN2.foodTreasury()) < 0.005,
      'raw=' + independentTreasury('food') + ' − ق5=' + q5Food + ' == engine=' + R2(FIN2.foodTreasury()));

  /* LAW 3 · Single Source — every treasury balance has ONE authoritative value:
     FIN2 (via composed) === FinContract, for every consumer. */
  const comp = FIN2.composed();
  law('LAW-3  Single Source · food  (FIN2 == FinContract)',
      R2(comp.food) === R2(FinContract.foodBalance()),
      R2(comp.food) + ' == ' + R2(FinContract.foodBalance()));
  law('LAW-3  Single Source · diwan (FIN2 == FinContract)',
      R2(comp.diwan) === R2(FinContract.diwanBalance()),
      R2(comp.diwan) + ' == ' + R2(FinContract.diwanBalance()));
  law('LAW-3  Single Source · deficit (FIN2 == FinContract)',
      R2(comp.historical_deficit_remaining) === R2(FinContract.foodDeficitRemaining()),
      R2(comp.historical_deficit_remaining) + ' == ' + R2(FinContract.foodDeficitRemaining()));

  /* LAW 9 · Deficit Bounds — remaining ≤ 0, overflow ≥ 0, never a surplus in place. */
  law('LAW-9  Deficit Bounds · remaining ≤ 0',
      R2(comp.historical_deficit_remaining) <= 0, 'remaining=' + R2(comp.historical_deficit_remaining));
  law('LAW-9  Deficit Bounds · overflow ≥ 0',
      R2(comp.overflow_to_food) >= 0, 'overflow=' + R2(comp.overflow_to_food));

  /* LAW 1 · Conservation — the whole system reconciles: the three treasury
     positions equal openings + Σ signed cash movements (recomputed independently). */
  const sysIndependent = R2(independentTreasury('food') + independentTreasury('diwan') + independentTreasury('historical_deficit'));
  const rawEngine = R2(FIN2.foodTreasury() + FIN2.diwanTreasury() + FIN2.historicalDeficitTreasury()
                       + fx.openings.diwan + fx.openings.food_deficit);
  law('LAW-1  Conservation · Σ treasuries = openings + Σ movements',
      Math.abs(sysIndependent - rawEngine) < 0.005,
      'independent=' + sysIndependent + ' engine=' + rawEngine);

  /* LAW 10 · Split / Allocation Exactness — every food-donation's Item-9 slices
     sum EXACTLY to the voucher amount (in ILS). */
  const alloc = FIN.allocateFoodDonations();
  DB.receipts.filter(r => !r.is_deleted && r.fund_type === 'donation'
      && r.donation_display_fund === 'food' && r.movement_type !== 'historical_debt_collection')
    .forEach(r => {
      const sp = alloc.perReceipt[r.id] || { debtSettled: 0, toDeficit: 0, toCurrent: 0 };
      const sum = R2(Number(sp.debtSettled || 0) + Number(sp.toDeficit || 0) + Number(sp.toCurrent || 0));
      law('LAW-10 Allocation Exactness · ' + r.no,
          sum === R2(r.amount_ils), 'Σslices=' + sum + ' amount=' + R2(r.amount_ils));
    });

  /* GUARANTEE §9 / LAW 3 · no second source for a member balance — memberBalance
     delegates to memberStatement (identical value, not an independent number). */
  DB.members.forEach(m => {
    law('LAW-3  Member balance single source · ' + m.id,
        R2(FIN.memberBalance(m.id)) === R2(FIN.memberStatement(m.id).finalBalance));
  });

  /* ---- canonical GOLDEN snapshot of every authoritative balance ---- */
  const snapshot = {
    treasuries: {
      food: R2(comp.food), diwan: R2(comp.diwan),
      historical_deficit_remaining: R2(comp.historical_deficit_remaining),
      overflow_to_food: R2(comp.overflow_to_food)
    },
    fin: {
      foodBalance: R2(FIN.foodBalance()), diwanBalance: R2(FIN.diwanBalance()),
      foodDeficitRemaining: R2(FIN.foodDeficitRemaining()), foodNetPosition: R2(FIN.foodNetPosition()),
      debtSettlementTotal: R2(FIN.foodDebtSettlementTotal()),
      currentSupportTotal: R2(FIN.foodCurrentSupportTotal()),
      settlementReserve: R2(FIN.foodSettlementReserve())
    },
    members: DB.members.map(m => ({ id: m.id, finalBalance: R2(FIN.memberStatement(m.id).finalBalance) })),
    ledgers: {
      food: (function () { const rows = FIN.fundLedger('food') || []; return { rows: rows.length, cr: R2(rows.reduce((s, r) => s + Number(r.cr || 0), 0)), dr: R2(rows.reduce((s, r) => s + Number(r.dr || 0), 0)) }; })(),
      diwan: (function () { const rows = FIN.fundLedger('diwan') || []; return { rows: rows.length, cr: R2(rows.reduce((s, r) => s + Number(r.cr || 0), 0)), dr: R2(rows.reduce((s, r) => s + Number(r.dr || 0), 0)) }; })()
    }
  };

  console.log('\n─── Golden snapshot ───');
  console.log(JSON.stringify(snapshot, null, 2));

  let goldenOk = true;
  if (UPDATE || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify(snapshot, null, 2) + '\n');
    console.log('\n' + (UPDATE ? '✎ baseline re-written (--update)' : '✎ baseline created (first run)') + ': ' + path.basename(BASELINE));
  } else {
    const prev = fs.readFileSync(BASELINE, 'utf8').trim();
    goldenOk = (prev === JSON.stringify(snapshot, null, 2));
    law('GOLDEN Baseline unchanged', goldenOk, goldenOk ? '' : 'snapshot drifted from committed baseline');
  }

  console.log('\n═══ Result: ' + (failures === 0 ? 'CONSTITUTION COMPLIANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' checks passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
