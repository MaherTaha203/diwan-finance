/* ═══════════════════════════════════════════════════════════════════════════
   F-1 · Food Receipt — Production Decision Function.
   EXACT translation of the frozen laboratory reference lab/engine.cjs (Logic
   Freeze v2). This is the production reference for Food-Receipt allocation. It is
   PURE (no DOM, no DB, no FIN, no network): given a member position + a payment
   amount (+ an optional explicit Historical-Deficit amount) it returns the
   step-by-step allocation. No wiring, no side effects.

   Rules (each maps 1:1 to lab/engine.cjs propose()):
     • Historical Deficit is explicit only and is DEDUCTED FIRST.        (D6/D7/D8)
     • The remainder is auto-allocated over ERP subscription years,
       OLDEST-FIRST, starting from the first ERP year (2025).            (D2/D3)
     • When all ERP years are settled, the surplus creates the FIRST
       FUTURE ERP subscription year — never a generic credit.            (D9)
     • Legacy (pre-ERP) balances are untouched (the deficit = legacy).   (D10)
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var R2 = function (n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; };

  /* position = { subYears:[{year,remaining}], deficit }  (ERP subscription years
     with remaining, and the legacy historical deficit — exactly as the lab reads
     from FIN.memberDelinquency/memberAllocation). */
  function decide(position, amount, opts) {
    opts = opts || {};
    var deficitAmount = R2(opts.deficitAmount || 0);
    var firstFuture = Number(opts.firstFutureYear);
    var subYears = ((position && position.subYears) || []).slice().sort(function (a, b) { return a.year - b.year; });
    var deficit = R2((position && position.deficit) || 0);
    var steps = [];
    var rem = R2(amount);

    /* (D8) explicit Historical Deficit — deducted FIRST */
    if (deficitAmount > 0.005 && deficit > 0.005) {
      var d = R2(Math.min(deficitAmount, deficit, rem));
      if (d > 0.005) { steps.push({ target: 'historical', kind: 'historical', amount: d }); rem = R2(rem - d); }
    }
    /* (D2/D3) automatic allocation over ERP subscription years, oldest-first */
    subYears.forEach(function (y) {
      if (rem <= 0.005) return;
      var take = R2(Math.min(rem, y.remaining));
      if (take > 0.005) { steps.push({ target: 'due:' + y.year, kind: 'due', year: y.year, amount: take }); rem = R2(rem - take); }
    });
    /* (D9) surplus → first FUTURE subscription year (never generic credit) */
    if (rem > 0.005) { steps.push({ target: 'due:' + firstFuture, kind: 'future', year: firstFuture, amount: rem }); rem = 0; }

    var toObligations = R2(steps.filter(function (s) { return s.kind === 'due' || s.kind === 'historical'; }).reduce(function (a, s) { return a + s.amount; }, 0));
    var toFuture = R2(steps.filter(function (s) { return s.kind === 'future'; }).reduce(function (a, s) { return a + s.amount; }, 0));
    var allocated = R2(toObligations + toFuture);
    return {
      steps: steps, toObligations: toObligations, toFuture: toFuture, allocated: allocated,
      remaining: R2(R2(amount) - allocated),
      balanced: Math.abs(R2(amount) - allocated) < 0.005 && amount > 0.005,
    };
  }

  var FoodReceiptDecision = { version: 1, decide: decide };
  root.FoodReceiptDecision = FoodReceiptDecision;
  if (typeof module !== 'undefined' && module.exports) module.exports = FoodReceiptDecision;
})(typeof window !== 'undefined' ? window : this);
