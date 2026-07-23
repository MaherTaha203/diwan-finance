/* ═══════════════════════════════════════════════════════════════════════════
   CONSTITUTIONAL REGRESSION PROOF  ·  Phase P0 · V5
   Historical-Deficit Settlement Bounds — Law 9 (Deficit Bounds)
   ───────────────────────────────────────────────────────────────────────────
   OWNER ARCHITECTURAL RULING (V5): the constitutional requirement —
   "historical_deficit_settlement reduces the remaining deficit toward zero
   only, never creates a surplus" — is ALREADY enforced by the frozen
   architecture (the FIN2 composed calculation's read-time clamp, the Item-9
   allocation engine, and the V9 runtime guards). Since no settlement-creation
   operation exists, no new runtime/DB enforcement is added (a DB guard would
   re-derive the deficit aggregate and violate Law 3 — Single Source of Truth).
   V5 is therefore closed by CONSTITUTIONAL PROOF, and this test permanently
   proves the invariant:

       historical_deficit_remaining <= 0   (a surplus can never form in place;
                                             any excess overflows to Food)

   Unlike the single-fixture check in constitutional-verification.cjs, this
   proof is ADVERSARIAL: it drives deficit inflows from BELOW to FAR ABOVE the
   opening deficit magnitude — exactly the region where, without the read-time
   clamp, `remaining` would turn positive (a surplus). It asserts, for every
   point in the sweep, that the frozen engine still reports remaining <= 0 and
   routes the entire excess to overflow_to_food with value conserved. It fails
   loudly if the `Math.min(0, rem)` clamp is ever weakened or removed.

   CA-004 R1 (2026-07-23): the internal `historical_deficit_settlement` OUTFLOW
   was RETIRED — the software only records historical-deficit funding; external
   settlements are intentionally outside the accounting model, so no settlement-
   creation operation will ever exist. The Historical Deficit Treasury represents
   the total funding accumulated inside the software; payments to historical
   creditors are performed outside it and are intentionally not reflected in this
   balance (the reported balance is accumulated constitutional funding recorded by
   the system, not the external cash position after manual settlements). This proof
   — which drives funding inflows across the boundary — is therefore the complete and
   permanent Law-9 bound; the earlier "if a settlement op is introduced" note is moot.

   Run:  node tests/constitutional-deficit-bound.cjs
   Exit 0 = invariant holds at every swept point · non-zero = a violation.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

/* load the frozen engine in ONE shared lexical scope (browser-equivalent) */
function loadEngine(DB, openings) {
  const window = {
    LANG: 'ar',
    FOOD_OPENING: openings.food_deficit,
    DIWAN_OPENING: openings.diwan,
    TREASURY_OPENINGS: { food: 0, diwan: openings.diwan, historical_deficit: openings.food_deficit }
  };
  const L = new Proxy({}, { get: () => (() => '') });
  const documentStub = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorageStub = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [
    rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'),
    rd('fin2.js'), rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'),
    ';return { FIN: FIN, FIN2: window.FIN2, FinContract: window.FinContract, MODEL2: window.MODEL2 };'
  ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, documentStub, localStorageStub);
}

/* a minimal PII-free world: one external deficit-directed donation of `inflow`
   ILS against an opening deficit of `openingDeficit` (negative). No members,
   no other cash — isolates the deficit bound cleanly. */
function world(openingDeficit, inflow) {
  const receipts = inflow > 0 ? [{
    id: 'd1', no: 'REC-D1', is_deleted: false, fund_type: 'donation', payer_name: 'External Donor',
    amount: inflow, amount_ils: inflow, currency: 'ILS', exchange_rate: 1, receipt_date: '2026-06-01',
    movement_type: 'deficit_cash_donation', destination_treasury: 'historical_deficit',
    donation_display_fund: 'food', food_donation_allocation: 'reduce_deficit'
  }] : [];
  const DB = { members: [], subscriptions: [], receipts, payments: [], contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null };
  const eng = loadEngine(DB, { food_deficit: openingDeficit, diwan: 0 });
  DB._alloc = null;
  return eng;
}

/* ── assertion harness ── */
let failures = 0, checks = 0;
const assert = (id, cond, detail) => {
  checks++; const pass = !!cond; if (!pass) failures++;
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : ''));
};

(function main() {
  console.log('═══ Constitutional Regression Proof — V5 · Deficit Bounds (Law 9) ═══\n');

  const OPENING = -1000;                       // |deficit| = 1000
  // sweep inflow from far below to far above the deficit magnitude,
  // straddling the boundary (1000) where an unclamped remaining turns positive.
  const inflows = [0, 250, 999, 1000, 1001, 1500, 5000];

  inflows.forEach(inf => {
    const { FIN2, FinContract } = world(OPENING, inf);
    const comp = FIN2.composed();
    const remClamped = R2(comp.historical_deficit_remaining);
    const overflow  = R2(comp.overflow_to_food);
    // the un-clamped position the clamp is protecting against:
    const remRaw = R2(OPENING + FIN2.historicalDeficitTreasury());
    const tag = 'inflow=' + inf + ' (raw rem=' + remRaw + ')';

    // 1) THE INVARIANT — remaining is never a surplus, at every swept point.
    assert('V5 · remaining <= 0 · ' + tag, remClamped <= 0, 'remaining=' + remClamped);
    // 2) the clamp is EXACTLY min(0, raw) — proves the read-time rule is in force.
    assert('V5 · remaining == min(0, raw) · ' + tag, remClamped === R2(Math.min(0, remRaw)), 'got=' + remClamped);
    // 3) the entire excess is routed to overflow_to_food (>= 0), nothing lost.
    assert('V5 · overflow == max(0, raw) >= 0 · ' + tag,
      overflow === R2(Math.max(0, remRaw)) && overflow >= 0, 'overflow=' + overflow);
    // 4) CONSERVATION — clamped remaining + overflow reconstruct the raw position exactly.
    assert('V5 · conservation (remaining + overflow == raw) · ' + tag,
      R2(remClamped + overflow) === remRaw, remClamped + '+' + overflow + '==' + remRaw);
    // 5) SINGLE SOURCE — FinContract sees the same clamped remaining (no 2nd derivation).
    assert('V5 · single source (FinContract == composed) · ' + tag,
      R2(FinContract.foodDeficitRemaining()) === remClamped, R2(FinContract.foodDeficitRemaining()) + '==' + remClamped);
  });

  console.log('\n═══ Result: ' + (failures === 0 ? 'DEFICIT BOUND PROVEN' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
