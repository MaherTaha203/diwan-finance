/* Lab · Decision Runner (CLI) — ADDITIVE. Shows the food-receipt decision for one
   real member + amount, step by step, with the reason for each step. Read-only.
   Usage: node lab/decision-runner.cjs <memberCodeOrId> <amount> [deficitAmount]  */
'use strict';
const E = require('./engine.cjs');
const { members, byId } = E.load();
const arg = process.argv.slice(2);
const key = arg[0], amount = Number(arg[1] || 0), deficitAmount = Number(arg[2] || 0);
if (!key || !amount) { console.log('usage: node lab/decision-runner.cjs <memberCodeOrId> <amount> [deficitAmount]'); process.exit(1); }
const m = byId[key] || members.find(x => (x.member_code || '').toLowerCase() === String(key).toLowerCase())
       || members.find(x => (x.name || '').includes(key));
if (!m) { console.log('member not found:', key); process.exit(1); }

const p = E.position(m.id);
const d = E.propose(m.id, amount, { deficitAmount: deficitAmount });
const f = n => (Math.round(n * 100) / 100).toLocaleString('en-US') + ' ₪';

console.log('\n══ العضو: ' + p.name + ' (' + p.code + ') ══');
console.log(' الوضع الحالي:');
console.log('   اشتراكات ERP:  ' + (p.subYears.map(y => y.year + '=' + f(y.remaining)).join('، ') || '—'));
console.log('   العجز التاريخي: ' + f(p.deficit) + '  (إرث قبل ERP — لا يدخل التلقائي)  |  رصيد: ' + f(p.credit));
console.log('   إجمالي المستحق: ' + f(p.outstanding) + '  |  أول سنة مستقبلية: ' + E.FIRST_FUTURE);
console.log('\n القرار للمبلغ ' + f(amount) + (deficitAmount > 0 ? '  (منها ' + f(deficitAmount) + ' للعجز التاريخي)' : '') + ':');
d.steps.forEach((s, i) => console.log('   ' + (i + 1) + ') ' + f(s.amount) + '  →  ' + s.target + '\n        السبب: ' + s.reason));
console.log('\n المُوزَّع على الالتزامات: ' + f(d.toObligations) + '  |  اشتراك مستقبلي: ' + f(d.toFuture));
console.log(' متوازن: ' + (d.balanced ? 'نعم ✓' : 'لا ✗') + '  |  رصيد العضو بعد الدفع: ' + (d.balanceAfter <= 0.005 ? 'مسدَّد' : f(d.balanceAfter)));
console.log('');
