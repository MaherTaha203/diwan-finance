/* Phase 1A — Rounding boundary vectors (standalone artifact, not production code)
 * Compares the two source implementations; it does not choose an accounting rule.
 * A: allocation-engine.R2 = Math.round(n * 100) / 100
 * B: round2 / fin._r2 = Math.round((n + Number.EPSILON) * 100) / 100
 * Run: node migration/excel/phase-1a/rounding-boundary-vectors.cjs
 */
'use strict';
const A = (n) => Math.round(n * 100) / 100;
const B = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const vectors = [1.005, -1.005, 2.675, -2.675, 0.145, 1.015, 8639.005, -8639.005, 100.005, 0.615];
const expected = new Map([
  [1.005,[1,1.01]],[-1.005,[-1,-1]],[2.675,[2.68,2.68]],[-2.675,[-2.67,-2.67]],
  [0.145,[0.14,0.15]],[1.015,[1.01,1.02]],[8639.005,[8639,8639]],
  [-8639.005,[-8639,-8639]],[100.005,[100.01,100.01]],[0.615,[0.62,0.62]]
]);
let failures = 0;
console.log('value\tR2(no-eps)\tR2(+eps)\tdiffer?\tcheck');
for (const v of vectors) {
  const a=A(v), b=B(v), [ea,eb]=expected.get(v);
  const pass=Object.is(a,ea)&&Object.is(b,eb);
  if (!pass) failures++;
  console.log(`${v}\t${a}\t\t${b}\t\t${a!==b?'YES':''}\t${pass?'PASS':'FAIL'}`);
}
function splitConserve(round, amount, due) {
  const a1=round(Math.min(amount,due));
  const rem=round(amount-a1);
  const a2=round(Math.min(rem,due));
  return {a1,a2,sum:round(a1+a2),credit:round(amount-a1-a2)};
}
const c1=splitConserve(A,100.01,50.005), c2=splitConserve(B,100.01,50.005);
const conservationPass = c1.sum+c1.credit===100.01 && c2.sum+c2.credit===100.01;
if (!conservationPass) failures++;
console.log('\nconservation split amount=100.01 due=50.005 x2:');
console.log('  no-eps:',JSON.stringify(c1));
console.log('  +eps  :',JSON.stringify(c2));
console.log(`\nRESULT: ${failures===0?'PASS':'FAIL'} · ${vectors.length} boundary vectors + 2 conservation paths · failures=${failures}`);
process.exitCode=failures===0?0:1;
