/* Lab · Scenario Discovery — ADDITIVE. Reads the real snapshot, computes a PATTERN
   signature for every real member (via the real engine position), clusters them,
   and reports the patterns actually present in production — plus which patterns the
   existing fixed lab cases (4 seed members) do NOT cover. Read-only.
   Usage: node lab/scenario-discovery.cjs   (writes lab/results/patterns.json) */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./engine.cjs');

function signature(p) {
  const subN = p.subYears.length >= 2 ? '2+' : String(p.subYears.length);
  return [
    'subs:' + subN,
    'deficit:' + (p.deficit > 0.005 ? 'y' : 'n'),
    'credit:' + (p.credit > 0.005 ? 'y' : 'n'),
    'status:' + (p.outstanding > 0.005 ? 'owing' : 'clear'),
  ].join(' | ');
}

function discover(snapshotPath) {
  const { members } = E.load(snapshotPath);
  const groups = {};
  members.forEach(m => {
    const p = E.position(m.id); const sig = signature(p);
    (groups[sig] = groups[sig] || { count: 0, examples: [] });
    groups[sig].count++;
    if (groups[sig].examples.length < 3) groups[sig].examples.push({ code: p.code, name: p.name, out: p.outstanding });
  });
  return { total: members.length, groups };
}

if (require.main === module) {
  const res = discover();
  const sigs = Object.keys(res.groups).sort((a, b) => res.groups[b].count - res.groups[a].count);
  console.log('\n══ الأنماط المكتشفة في بيانات الإنتاج الحقيقية ══');
  console.log('إجمالي الأعضاء: ' + res.total + '  |  عدد الأنماط: ' + sigs.length + '\n');
  sigs.forEach(s => { const g = res.groups[s];
    console.log('• [' + String(g.count).padStart(3) + '] ' + s);
    console.log('        مثال: ' + g.examples.map(e => e.code).join('، '));
  });
  // patterns covered by the existing fixed seed (constitution-seed 4 members)
  let seedSigs = new Set();
  try {
    const seedPath = path.join(__dirname, 'seed', 'constitution-seed.json');
    const seedGroups = discover(seedPath);
    seedSigs = new Set(Object.keys(seedGroups.groups));
    console.log('\n── الأنماط التي يغطّيها البذرة الثابتة الحالية (4 أعضاء) ──');
    Array.from(seedSigs).forEach(s => console.log('   ✓ ' + s));
  } catch (e) { console.log('\n(تعذّر تحميل البذرة الثابتة للمقارنة: ' + e.message + ')'); }
  const uncovered = sigs.filter(s => !seedSigs.has(s));
  console.log('\n── أنماط حقيقية غير مغطّاة بالحالات الثابتة الحالية (' + uncovered.length + ') ──');
  uncovered.forEach(s => console.log('   ✗ [' + res.groups[s].count + '] ' + s));

  const out = path.join(__dirname, 'results'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'patterns.json'),
    JSON.stringify({ total: res.total, patterns: sigs.map(s => ({ signature: s, count: res.groups[s].count, examples: res.groups[s].examples })), seedCovered: Array.from(seedSigs), uncovered }, null, 2));
  console.log('\nكُتب: lab/results/patterns.json');
}
module.exports = { discover, signature };
