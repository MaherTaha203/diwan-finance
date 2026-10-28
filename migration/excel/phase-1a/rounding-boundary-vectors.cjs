/* ───────────────────────────────────────────────────────────────────────────
   Phase 1A — Rounding boundary vectors (STANDALONE ARTIFACT · NOT production code)
   Purpose: make the C4 rounding discrepancy reproducible with source-derived
   vectors. It compares the TWO rounding implementations that actually coexist in
   the frozen engine, WITHOUT importing or modifying any production module:
     A) allocation-engine.R2 : Math.round(n*100)/100                 (no EPSILON)
        (public/js/allocation-engine.js:36)
     B) round2 / fin._r2     : Math.round((n + Number.EPSILON)*100)/100  (+EPSILON)
        (public/js/foodDonationAllocation.js:22 ; public/js/fin.js:135 ;
         public/js/food-receipt-decision.js:18)
   Run:  node migration/excel/phase-1a/rounding-boundary-vectors.cjs
   This artifact establishes NO accounting rule; the unified Excel/VBA rounding
   rule is an owner decision (C4) and remains blocked until approved.
   ─────────────────────────────────────────────────────────────────────────── */
'use strict';

const A = (n) => Math.round(n * 100) / 100;                    // no EPSILON
const B = (n) => Math.round((n + Number.EPSILON) * 100) / 100; // +EPSILON

// Half-way and near-half-way vectors, positive and negative, incl. the deficit magnitude region.
const vectors = [1.005, -1.005, 2.675, -2.675, 0.145, 1.015, 8639.005, -8639.005, 100.005, 0.615];

const rows = vectors.map((v) => {
  const a = A(v), b = B(v);
  return { value: v, R2_no_eps: a, R2_plus_eps: b, differ: a !== b };
});

// Conservation probe: split amount across two equal obligations, remainder = credit.
function splitConserve(round, amount, due) {
  const a1 = round(Math.min(amount, due));
  const rem = round(amount - a1);
  const a2 = round(Math.min(rem, due));
  return { a1, a2, sum: round(a1 + a2), credit: round(amount - a1 - a2) };
}

if (require.main === module) {
  console.log('value\tR2(no-eps)\tR2(+eps)\tdiffer?');
  rows.forEach((r) => console.log(`${r.value}\t${r.R2_no_eps}\t\t${r.R2_plus_eps}\t\t${r.differ ? 'YES' : ''}`));
  const c1 = splitConserve(A, 100.01, 50.005);
  const c2 = splitConserve(B, 100.01, 50.005);
  console.log('\nconservation split amt=100.01 due=50.005 x2:');
  console.log('  no-eps:', JSON.stringify(c1));
  console.log('  +eps  :', JSON.stringify(c2));
}

module.exports = { A, B, vectors, rows, splitConserve };
