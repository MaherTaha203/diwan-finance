/* F-2 · Food Receipt Wiring — production workflow == decision function == laboratory.
   Loads the REAL production wiring (public/js/receipt-settlement.js) headless and
   drives its Food-Receipt path — ReceiptSettlement.foodDecisionLines() — over EVERY
   approved scenario (every real member × the approved amount strategies). It asserts
   that the SETTLEMENT PAYLOAD the wiring hands to the RPC is the exact allocation the
   laboratory (lab/engine.cjs) approves. The wiring builds the member position from a
   FIN-shaped source, computes the first future ERP year, calls the production
   FoodReceiptDecision.decide() (F-1) and maps its steps onto settlement lines — this
   test proves that whole chain equals the lab, with ZERO allocation logic of its own.
   Read-only. Usage: node tests/food-receipt-wiring.test.cjs  (exit 0 = identical) */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'lab', 'engine.cjs'));
const { strategies } = require(path.join(__dirname, '..', 'lab', 'scenario-runner.cjs'));

/* Load the laboratory over the real snapshot, then expose the member positions it
   reads through a FIN-shaped shim (the exact two reads the production wiring performs:
   memberDelinquency().byYear and memberAllocation().historical.remaining). */
const { members } = E.load();
const posById = {};
members.forEach(m => { posById[m.id] = E.position(m.id); });
const finShim = {
  memberDelinquency(id) {
    const p = posById[id] || { subYears: [], deficit: 0 };
    const byYear = {}; p.subYears.forEach(y => { byYear[y.year] = { remaining: y.remaining }; });
    return { byYear: byYear, historicalRemaining: p.deficit };
  },
  memberAllocation(id) {
    const p = posById[id] || { deficit: 0 };
    return { historical: { remaining: p.deficit } };
  },
};

/* Add the production wiring's dependencies onto the SAME window the laboratory set
   up (engine.cjs made global.window the object its FIN closes over). Mutate it — do
   NOT replace it — or the lab's own FIN would lose MODEL2Allocation/FOOD_OPENING and
   silently degrade. FoodReceiptDecision is the ACTUAL production module (F-1); the
   lab keeps using its own internal FIN (captured at eval), unaffected by window.FIN. */
const subs = (E.SNAP.subscriptions || E.SNAP.member_subscriptions || []);
Object.assign(global.window, {
  RECEIPT_ALLOCATION_ENABLED: true,
  LOCKED_THROUGH_YEAR: E.LOCKED,
  DB: { subscriptions: subs },
  FIN: finShim,
  FoodReceiptDecision: require(path.join(__dirname, '..', 'public', 'js', 'food-receipt-decision.js')),
});
const RS = require(path.join(__dirname, '..', 'public', 'js', 'receipt-settlement.js'));

/* map a decision/lab step onto the exact settlement line the wiring emits */
const lineKey = l => l.obligation_kind + '|' + (l.year == null ? '' : l.year) + '|' + Number(l.amount_allocated).toFixed(2);
const labToLines = steps => steps.map(s => s.kind === 'historical'
  ? { obligation_kind: 'historical', year: null, amount_allocated: s.amount }
  : { obligation_kind: 'due', year: s.year, amount_allocated: s.amount });

/* sanity: the wiring computes the first future ERP year the same way the lab does */
const wiredFuture = RS.firstErpFutureYear();
const futureOK = wiredFuture === E.FIRST_FUTURE;

let total = 0, identical = 0, diff = 0; const diffs = [];
/* checklist evidence */
let saw2025 = 0, saw2026 = 0, sawFuture = 0, sawDeficit = 0, deficitOnlyWhenExplicit = true;

members.forEach(m => {
  const pos = posById[m.id];
  strategies(pos).forEach(sc => {
    total++;
    const lab = E.propose(m.id, sc.amount, { deficitAmount: sc.deficitAmount });
    const fd = RS.foodDecisionLines(m.id, sc.amount, sc.deficitAmount);
    const wired = (fd && fd.lines) || [];
    const expected = labToLines(lab.steps);
    const same = wired.map(lineKey).join(';') === expected.map(lineKey).join(';')
      && !!fd && Math.abs((fd.decision.allocated) - lab.allocated) < 0.005
      && fd.decision.balanced === lab.balanced;
    if (same) identical++; else {
      diff++;
      if (diffs.length < 12) diffs.push({ code: pos.code, tag: sc.tag, amount: sc.amount,
        wired: wired.map(lineKey).join(' ; '), lab: expected.map(lineKey).join(' ; ') });
    }
    /* checklist tallies */
    wired.forEach(l => {
      if (l.obligation_kind === 'due' && l.year === 2025) saw2025++;
      if (l.obligation_kind === 'due' && l.year === 2026) saw2026++;
      if (l.obligation_kind === 'due' && l.year === wiredFuture) sawFuture++;
      if (l.obligation_kind === 'historical') { sawDeficit++; if (!(sc.deficitAmount > 0.005)) deficitOnlyWhenExplicit = false; }
    });
  });
});

console.log('F-2 Food Receipt Wiring — production payload vs laboratory');
console.log('  members: ' + members.length + '  |  scenarios: ' + total + '  |  identical: ' + identical + '  |  diverging: ' + diff);
console.log('  first future ERP year: wiring=' + wiredFuture + '  lab=' + E.FIRST_FUTURE + '  ' + (futureOK ? 'OK' : 'MISMATCH'));
console.log('  checklist — due 2025 lines: ' + saw2025 + '  |  due 2026 lines: ' + saw2026 +
  '  |  future(' + wiredFuture + ') lines: ' + sawFuture + '  |  historical-deficit lines: ' + sawDeficit +
  ' (only-when-explicit: ' + (deficitOnlyWhenExplicit ? 'yes' : 'NO') + ')');
diffs.forEach(d => console.log('  DIFF ' + d.code + ' [' + d.tag + ' ' + d.amount + ']\n     wired: ' + d.wired + '\n     lab  : ' + d.lab));

const pass = diff === 0 && futureOK && deficitOnlyWhenExplicit;
console.log(pass
  ? '\nPASS — Production Workflow == Decision Function == Laboratory (100% identical over every approved scenario)'
  : '\nFAIL — the wiring diverges from the laboratory');
process.exit(pass ? 0 : 1);
