/* ═══════════════════════════════════════════════════════════════════════════
   CONSTITUTIONAL PROOF  ·  Phase P0 · V6
   Explicit Classification of the ق5 Transfer Event — Law 4 (Explicit Classification)
   ───────────────────────────────────────────────────────────────────────────
   Law 4 · "Never Guess" — every accounting movement must have ONE explicit
   accounting identity; no accounting effect may exist solely as an interpretation
   performed during reading.

   The ق5 transfer (the debt-settled slice of a member's food-display cash donation
   → an internal Food → Historical-Deficit transfer that settles the member's own
   historical debt) was applied inline in the treasury math with no catalogued
   identity — implicit, read-time. V6 promotes it to a FIRST-CLASS accounting event
   (MODEL2 event `q5_debt_settlement_transfer`, mirroring `overflow_transfer`) whose
   amount is still DERIVED from the single-source Item-9 allocation but whose
   accounting IDENTITY (source/destination treasuries, that it is a transfer) is now
   explicit. The promotion is SEMANTIC ONLY — the golden baseline proves zero numeric
   change; this file proves the explicit identity is present and faithful.

   This fixture deliberately EXERCISES a non-zero transfer (a member with historical
   debt makes a food-display cash donation) — the golden fixture does not — so the
   explicit event is proven on a real, non-trivial value.

   Run:  node tests/constitutional-explicit-q5.cjs   ·  exit 0 = Law 4 satisfied.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function loadEngine(DB, openings) {
  const window = { LANG:'ar', FOOD_OPENING:openings.food_deficit, DIWAN_OPENING:openings.diwan,
    TREASURY_OPENINGS:{ food:0, diwan:openings.diwan, historical_deficit:openings.food_deficit } };
  const L = new Proxy({}, { get: () => (() => '') });
  const documentStub = { getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[] };
  const localStorageStub = { getItem:()=>null, setItem:()=>{} };
  const module = { exports:{} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'),
    ';return { FIN:FIN, FIN2:window.FIN2, FinContract:window.FinContract, MODEL2:window.MODEL2 };' ].join('\n');
  return new Function('window','DB','module','L','document','localStorage', code)
    (window, DB, module, L, documentStub, localStorageStub);
}

/* fixture: member M1 owes 200 (historical debt) and makes a 300 food-display cash
   donation → Item-9 settles his debt first: debtSettled = 200 (the ق5 transfer),
   remainder 100 stays as food current support. */
function fixture() {
  return {
    members: [{ id:'M1', name:'Debtor', is_active:true, historical_balance_ils:200, historical_payments_ils:0 }],
    subscriptions: [],
    receipts: [{ id:'r1', no:'REC-Q5', is_deleted:false, fund_type:'donation', member_id:'M1',
      amount:300, amount_ils:300, currency:'ILS', exchange_rate:1, receipt_date:'2026-05-01',
      movement_type:'food_cash_donation', destination_treasury:'food', donation_display_fund:'food',
      food_donation_allocation:'reduce_deficit' }],
    payments: [], contacts:[], annual:[], audit:[], inkind_donations:[],
    openings: { food_deficit:-1000, diwan:0 }
  };
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p=!!cond; if(!p) failures++;
  console.log((p?'PASS':'FAIL')+'  '+id+(detail?'  · '+detail:'')); };

(function main() {
  console.log('═══ Constitutional Proof — V6 · Explicit ق5 Transfer (Law 4) ═══\n');
  const fx = fixture();
  const DB = { members:fx.members, subscriptions:fx.subscriptions, receipts:fx.receipts, payments:fx.payments,
    contacts:fx.contacts, annual:fx.annual, audit:fx.audit, inkind_donations:fx.inkind_donations, _alloc:null };
  const { FIN, FIN2, MODEL2 } = loadEngine(DB, fx.openings);
  DB._alloc = null;

  /* 1 — the transfer has ONE explicit accounting identity in the ratified catalog */
  const ev = MODEL2.EVENTS.q5_debt_settlement_transfer;
  A('Law4 · catalog event exists', !!ev, ev ? ev.key : 'MISSING');
  A('Law4 · identity declared: source=food, dest=historical_deficit, cash, automatic',
     ev && ev.source_treasury==='food' && ev.treasury==='historical_deficit' && ev.cash===true && ev.automatic===true,
     ev ? (ev.source_treasury+'→'+ev.treasury) : '');

  /* 2 — the transfer is a non-trivial, enumerable, self-describing event */
  const transfers = FIN2.q5Transfers();
  const settled = R2(FIN.allocateFoodDonations().debtSettlementTotal);
  A('V6 · transfer exercised (non-zero)', settled > 0, 'debtSettled=' + settled);
  A('V6 · enumerated as explicit event(s)', transfers.length === 1, 'count=' + transfers.length);
  const t = transfers[0] || {};
  A('V6 · event carries explicit identity (not inferred)',
     t.movement_type==='q5_debt_settlement_transfer' && t.source_treasury==='food' && t.destination_treasury==='historical_deficit',
     JSON.stringify({mt:t.movement_type, src:t.source_treasury, dst:t.destination_treasury}));

  /* 3 — the explicit event EQUALS the derived single-source value (faithful, no drift) */
  A('V6 · q5TransferTotal == Item-9 debt-settled slice (single source)',
     R2(FIN2.q5TransferTotal()) === settled && R2(t.amount) === settled, R2(FIN2.q5TransferTotal()) + ' == ' + settled);

  /* 4 — the accounting EFFECT is exactly the declared transfer: leaves food, enters deficit.
     food = opening(0) + raw food(300) − transfer(200) = 100 ; deficit inflow includes the transfer. */
  const comp = FIN2.composed();
  A('V6 · food treasury reflects transfer OUT (300 − 200 = 100)', R2(FIN2.foodTreasury()) === 100, 'food=' + R2(FIN2.foodTreasury()));
  A('V6 · deficit treasury reflects transfer IN (+200 against −1000)', R2(FIN2.historicalDeficitTreasury()) === 200, 'defTreasury=' + R2(FIN2.historicalDeficitTreasury()));
  A('V6 · remaining deficit = −800 (−1000 + 200 in), never a surplus', R2(comp.historical_deficit_remaining) === -800, 'rem=' + R2(comp.historical_deficit_remaining));

  /* 5 — conservation: what left food equals what entered the deficit (transfer, nothing created/lost) */
  A('V6 · conservation (food-out == deficit-in == transfer)',
     R2(t.amount) === settled && settled === 200, 'transfer=' + R2(t.amount));

  console.log('\n═══ Result: ' + (failures===0 ? 'LAW 4 SATISFIED — Q5 EXPLICITLY CLASSIFIED' : (failures+' VIOLATION(S)')) +
    '  ·  ' + (checks-failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures===0 ? 0 : 1);
})();
