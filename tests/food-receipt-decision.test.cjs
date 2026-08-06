/* F-1 · Food Receipt Decision Function — production == laboratory proof.
   Runs the PRODUCTION decision function (public/js/food-receipt-decision.js) against
   the frozen laboratory (lab/engine.cjs) on EVERY approved scenario (every real
   member × the approved amount strategies) and asserts the decisions are IDENTICAL.
   Read-only. Usage: node tests/food-receipt-decision.test.cjs  (exit 0 = identical) */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'lab', 'engine.cjs'));
const { strategies } = require(path.join(__dirname, '..', 'lab', 'scenario-runner.cjs'));
const PROD = require(path.join(__dirname, '..', 'public', 'js', 'food-receipt-decision.js'));

const { members } = E.load();
const stepKey = s => s.kind + '|' + (s.year || '') + '|' + s.amount + '|' + s.target;
let total = 0, identical = 0, diff = 0; const diffs = [];

members.forEach(m => {
  const pos = E.position(m.id);
  strategies(pos).forEach(sc => {
    total++;
    const lab = E.propose(m.id, sc.amount, { deficitAmount: sc.deficitAmount });
    const prod = PROD.decide({ subYears: pos.subYears, deficit: pos.deficit }, sc.amount,
      { deficitAmount: sc.deficitAmount, firstFutureYear: E.FIRST_FUTURE });
    const stepsSame = lab.steps.map(stepKey).join(';') === prod.steps.map(stepKey).join(';');
    const totalsSame = Math.abs(lab.toObligations - prod.toObligations) < 0.005
      && Math.abs(lab.toFuture - prod.toFuture) < 0.005
      && Math.abs(lab.remaining - prod.remaining) < 0.005
      && lab.balanced === prod.balanced;
    if (stepsSame && totalsSame) identical++;
    else { diff++; if (diffs.length < 12) diffs.push({ code: pos.code, tag: sc.tag, amount: sc.amount,
      lab: lab.steps.map(stepKey).join(' ; '), prod: prod.steps.map(stepKey).join(' ; ') }); }
  });
});

console.log('F-1 Production Decision Function vs Laboratory');
console.log('  members: ' + members.length + '  |  scenarios: ' + total + '  |  identical: ' + identical + '  |  diverging: ' + diff);
diffs.forEach(d => console.log('  DIFF ' + d.code + ' [' + d.tag + ' ' + d.amount + ']\n     lab : ' + d.lab + '\n     prod: ' + d.prod));
console.log(diff === 0 ? '\nPASS — Production == Laboratory (100% identical over every approved scenario)'
                       : '\nFAIL — ' + diff + ' divergences (production is wrong; the lab is correct)');
process.exit(diff ? 1 : 0);
