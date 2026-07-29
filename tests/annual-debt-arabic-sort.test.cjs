/* OUTPUT-002-C UX Slice 3 — canonical ascending Arabic ordering for the Annual Debt
   report. The sort lives ONCE in the shared model (buildAnnualDebtModel), so screen ·
   print · PDF · Excel all consume the same `sections[].rows` order. Ordering only —
   values/debt figures never change. Uses real Arabic names that expose naive sorts
   (ألف/همزة variants, «عبد الله», duplicates, embedded digits).
   Usage: node tests/annual-debt-arabic-sort.test.cjs */
require('../public/js/report-engine.js');
const RM = require('../public/js/report-model.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const src = {
  rows: [
    { code: 'A-05', name: 'محمد آل طه', current: 100, hist: 300 },
    { code: 'A-02', name: 'أحمد آل طه', current: 50 },
    { code: 'A-09', name: 'إبراهيم آل طه', current: 0 },
    { code: 'A-01', name: 'عبد الله آل طه', current: -20 },
    { code: 'A-07', name: 'آدم آل طه', current: 0 },
    { code: 'A-03', name: 'أحمد آل طه', current: 20 },   /* duplicate name → code tiebreak */
    { code: 'A-10', name: 'سعيد آل طه', current: 0 },
    { code: 'A-11', name: 'زياد آل طه', current: 0 }
  ],
  totals: {}, totalMembers: 8
};
const model = RM.buildAnnualDebtModel(JSON.parse(JSON.stringify(src)));
const names = model.sections[0].rows.map(r => r.name);

/* 1 · order matches an Arabic collator (and is NOT the source order). */
const coll = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
const expected = src.rows.slice().sort((a, b) => {
  const c = coll.compare(a.name, b.name); return c !== 0 ? c : a.code.localeCompare(b.code);
}).map(r => r.name);
ok(JSON.stringify(names) === JSON.stringify(expected), 'rows are ascending by Arabic collation');
ok(JSON.stringify(names) !== JSON.stringify(src.rows.map(r => r.name)), 'order actually changed from the source order');

/* 2 · human-sane checks: «محمد» (م) sorts after «سعيد» (س) after «زياد» (ز). */
ok(names.indexOf('محمد آل طه') > names.indexOf('سعيد آل طه'), '«محمد» (م) comes after «سعيد» (س)');
ok(names.indexOf('سعيد آل طه') > names.indexOf('زياد آل طه'), '«سعيد» (س) comes after «زياد» (ز)');
ok(names[names.length - 1] === 'محمد آل طه', '«محمد» is last (latest letter present)');

/* 3 · duplicate names are deterministic by member code (A-02 before A-03). */
const dup = model.sections[0].rows.filter(r => r.name === 'أحمد آل طه').map(r => r.code);
ok(JSON.stringify(dup) === JSON.stringify(['A-02', 'A-03']), 'equal names broken deterministically by member code');

/* 4 · values are untouched — ordering only, no FIN/figure change. */
const mo = model.sections[0].rows.find(r => r.name === 'محمد آل طه');
ok(mo && mo.current === 100 && mo.hist === 300, 'row values unchanged (ordering only, not FIN)');
ok(model.sections[0].rows.length === src.rows.length, 'no rows added or dropped');

console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
