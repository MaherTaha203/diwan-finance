/* Lab · Scenario Runner — ADDITIVE. Generates MANY scenarios from the real data
   (every real member × amount strategies derived from that member's own position),
   runs the food-receipt DECISION engine, and asserts the reference invariants for
   each. Not a fixed count — it scales with the data and the discovered patterns.
   Read-only. Usage: node lab/scenario-runner.cjs  (writes lab/results/decision-coverage.json + REPORT) */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./engine.cjs');
const { signature } = require('./scenario-discovery.cjs');
const R2 = E.R2;

/* amount strategies from a member's real position */
function strategies(p) {
  const s = [];
  const openSum = R2(p.openYears.reduce((a, y) => a + y.remaining, 0));
  s.push({ tag: 'tiny', amount: 1, def: false });
  if (p.openYears.length) {
    const y0 = p.openYears[0].remaining;
    s.push({ tag: 'partial-oldest', amount: R2(Math.max(1, Math.floor(y0 / 2))), def: false });
    s.push({ tag: 'exact-oldest', amount: y0, def: false });
    if (p.openYears.length > 1) s.push({ tag: 'clear-open', amount: openSum, def: false });
  }
  if (p.deficit > 0.005) s.push({ tag: 'open+deficit', amount: R2(openSum + p.deficit), def: true });
  if (p.outstanding > 0.005) s.push({ tag: 'overpay', amount: R2(p.outstanding + 100), def: true });
  if (!p.openYears.length && p.deficit <= 0.005) s.push({ tag: 'credit-only', amount: 100, def: false });
  return s;
}

/* the reference invariants the decision must satisfy for real data */
function check(p, sc, d) {
  const errs = [];
  const stepSum = R2(d.steps.reduce((a, x) => a + x.amount, 0));
  if (Math.abs(stepSum - d.amount) > 0.005) errs.push('steps_sum!=amount(' + stepSum + '/' + d.amount + ')');
  if (!d.balanced) errs.push('not_balanced');
  if (d.remaining > 0.005 || d.remaining < -0.005) errs.push('remaining!=0(' + d.remaining + ')');
  const lockedYears = new Set(p.lockedDebt.map(y => y.year));
  const openMap = {}; p.openYears.forEach(y => openMap[y.year] = y.remaining);
  d.steps.forEach(st => {
    if (st.kind === 'due') {
      if (st.year <= E.LOCKED) errs.push('due_on_locked_year(' + st.year + ')');
      if (lockedYears.has(st.year)) errs.push('due_targets_locked(' + st.year + ')');
      if (st.amount > (openMap[st.year] || 0) + 0.005) errs.push('due_exceeds_outstanding(' + st.year + ')');
    }
    if (st.kind === 'historical' && st.amount > p.deficit + 0.005) errs.push('deficit_overrun');
  });
  // A member holding credit has NEGATIVE outstanding; obligations can only consume
  // the positive debt, and balanceAfter may legitimately stay negative (still in credit).
  const positiveDebt = Math.max(0, p.outstanding);
  if (d.toObligations > positiveDebt + 0.005) errs.push('obligations_exceed_debt');
  return errs;
}

function run(snapshotPath) {
  const { members } = E.load(snapshotPath);
  const perPattern = {}; let total = 0, passed = 0; const failures = [];
  members.forEach(m => {
    const p = E.position(m.id); const sig = signature(p);
    perPattern[sig] = perPattern[sig] || { members: 0, scenarios: 0, passed: 0, failed: 0 };
    perPattern[sig].members++;
    strategies(p).forEach(sc => {
      const d = E.propose(m.id, sc.amount, { includeDeficit: sc.def });
      const errs = check(p, sc, d);
      total++; perPattern[sig].scenarios++;
      if (errs.length === 0) { passed++; perPattern[sig].passed++; }
      else { perPattern[sig].failed++; failures.push({ code: p.code, sig, tag: sc.tag, amount: sc.amount, errs }); }
    });
  });
  return { members: members.length, total, passed, failed: total - passed, perPattern, failures };
}

if (require.main === module) {
  const r = run();
  const pats = Object.keys(r.perPattern).sort((a, b) => r.perPattern[b].scenarios - r.perPattern[a].scenarios);
  const patternsCovered = pats.filter(s => r.perPattern[s].passed > 0).length;
  const patternsAllPass = pats.filter(s => r.perPattern[s].failed === 0).length;
  console.log('\n══ تشغيل السيناريوهات على البيانات الحقيقية ══');
  console.log('أعضاء: ' + r.members + '  |  سيناريوهات: ' + r.total + '  |  ناجحة: ' + r.passed + '  |  فاشلة: ' + r.failed);
  console.log('أنماط: ' + pats.length + '  |  أنماط كل سيناريوهاتها ناجحة: ' + patternsAllPass + '/' + pats.length + '\n');
  pats.forEach(s => { const g = r.perPattern[s];
    console.log((g.failed === 0 ? '✓' : '✗') + ' [' + g.members + ' عضو · ' + g.scenarios + ' سيناريو · نجح ' + g.passed + '] ' + s);
  });
  if (r.failures.length) {
    console.log('\n── فشل (' + r.failures.length + ') ──');
    r.failures.slice(0, 20).forEach(f => console.log('   ✗ ' + f.code + ' [' + f.tag + ' ' + f.amount + '] ' + f.errs.join(', ')));
  }
  const covPct = Math.round(patternsAllPass / pats.length * 1000) / 10;
  const scnPct = Math.round(r.passed / r.total * 1000) / 10;
  console.log('\nتغطية الأنماط (كلها ناجحة): ' + covPct + '%  |  نجاح السيناريوهات: ' + scnPct + '%');
  const out = path.join(__dirname, 'results'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'decision-coverage.json'), JSON.stringify({
    members: r.members, scenarios: r.total, passed: r.passed, failed: r.failed,
    patterns: pats.length, patternsAllPass, patternCoveragePct: covPct, scenarioPassPct: scnPct,
    perPattern: r.perPattern, failures: r.failures,
  }, null, 2));
  console.log('كُتب: lab/results/decision-coverage.json');
  process.exit(r.failed ? 1 : 0);
}
module.exports = { run, strategies, check };
