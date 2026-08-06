/* F-3 · Explicit Historical Deficit Selection — the UI collects `deficitAmount` ONLY.
   Proves (a) the accountant control is the SOLE source of deficitAmount, (b) it makes
   NO allocation decision, (c) feeding its value into the production wiring reproduces
   the laboratory exactly over every approved scenario, and (d) the two frozen rules:
     rule 6 — Historical Deficit OFF ⇒ deficitAmount = 0 ⇒ no historical allocation.
     rule 5 — Historical Deficit ON ⇒ the amount is deducted FIRST, remainder from 2025.
   Read-only. Usage: node tests/food-receipt-deficit-ui.test.cjs  (exit 0 = all pass) */
'use strict';
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };

const E = require(path.join(__dirname, '..', 'lab', 'engine.cjs'));
const { strategies } = require(path.join(__dirname, '..', 'lab', 'scenario-runner.cjs'));
const { members } = E.load();
const R2 = E.R2;

/* member positions + the FIN-shaped shim the production wiring reads (read-only) */
const posById = {}; members.forEach(m => { posById[m.id] = E.position(m.id); });
const finShim = {
  memberDelinquency(id) { const p = posById[id] || { subYears: [], deficit: 0 }; const byYear = {}; p.subYears.forEach(y => { byYear[y.year] = { remaining: y.remaining }; }); return { byYear: byYear, historicalRemaining: p.deficit }; },
  memberAllocation(id) { const p = posById[id] || { deficit: 0 }; return { historical: { remaining: p.deficit } }; },
};
const subs = (E.SNAP.subscriptions || E.SNAP.member_subscriptions || []);
Object.assign(global.window, {
  RECEIPT_ALLOCATION_ENABLED: true, LOCKED_THROUGH_YEAR: E.LOCKED,
  DB: { subscriptions: subs }, FIN: finShim,
  FoodReceiptDecision: require(path.join(__dirname, '..', 'public', 'js', 'food-receipt-decision.js')),
});
const RS = require(path.join(__dirname, '..', 'public', 'js', 'receipt-settlement.js'));

/* headless DOM + the REAL production form handlers (forms.js) */
const store = {};
const el = id => (store[id] || (store[id] = { value: '', checked: false, textContent: '', style: {}, classList: { add() {}, remove() {} } }));
global.document = { getElementById: el };
require(path.join(__dirname, '..', 'public', 'js', 'forms.js'));
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';

/* ── A. The reader is the SOLE, purely-collecting source of deficitAmount ── */
el('rec-deficit-on').checked = false; el('rec-deficit-amount').value = '999';
ok(window.getRecDeficitAmount() === 0, 'A1 unchecked ⇒ 0 (amount ignored)');
el('rec-deficit-on').checked = true; el('rec-deficit-amount').value = '150';
ok(window.getRecDeficitAmount() === 150, 'A2 checked + 150 ⇒ 150');
el('rec-deficit-amount').value = '';
ok(window.getRecDeficitAmount() === 0, 'A3 checked + empty ⇒ 0');
el('rec-deficit-amount').value = '-5';
ok(window.getRecDeficitAmount() === 0, 'A4 checked + negative ⇒ 0');
el('rec-deficit-amount').value = '0';
ok(window.getRecDeficitAmount() === 0, 'A5 checked + 0 ⇒ 0');

/* ── B. Visibility: only a member Food Receipt while settlement is ON ── */
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member'; window.syncDeficitControl();
ok(el('rec-deficit-wrap').style.display === '', 'B1 food+member+ON ⇒ shown');
el('rec-deficit-on').checked = true; el('rec-deficit-amount').value = '50';
el('rec-fund').value = 'diwan'; window.syncDeficitControl();
ok(el('rec-deficit-wrap').style.display === 'none' && el('rec-deficit-on').checked === false && el('rec-deficit-amount').value === '', 'B2 non-food ⇒ hidden + reset to 0');
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'manual'; window.syncDeficitControl();
ok(el('rec-deficit-wrap').style.display === 'none', 'B3 food + non-member ⇒ hidden');
global.window.RECEIPT_ALLOCATION_ENABLED = false; el('rec-payer-type').value = 'member'; window.syncDeficitControl();
ok(el('rec-deficit-wrap').style.display === 'none', 'B4 flag OFF ⇒ hidden');
global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ── C. Full chain over EVERY approved scenario: UI reader → decide() → lab ──
   The scenario's deficitAmount is entered through the REAL control; the wiring is
   fed ONLY window.getRecDeficitAmount(); the result must equal the laboratory. */
const lineKey = l => l.obligation_kind + '|' + (l.year == null ? '' : l.year) + '|' + Number(l.amount_allocated).toFixed(2);
const labToLines = steps => steps.map(s => s.kind === 'historical'
  ? { obligation_kind: 'historical', year: null, amount_allocated: s.amount }
  : { obligation_kind: 'due', year: s.year, amount_allocated: s.amount });

let total = 0, identical = 0, offNoHist = 0, offHistViolations = 0, onDeficitFirst = 0, onDeficitCases = 0;
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';
members.forEach(m => {
  const pos = posById[m.id];
  strategies(pos).forEach(sc => {
    total++;
    if (sc.deficitAmount > 0.005) { el('rec-deficit-on').checked = true; el('rec-deficit-amount').value = String(sc.deficitAmount); }
    else { el('rec-deficit-on').checked = false; el('rec-deficit-amount').value = ''; }
    const uiDeficit = window.getRecDeficitAmount();
    const fd = RS.foodDecisionLines(m.id, sc.amount, uiDeficit);
    const lab = E.propose(m.id, sc.amount, { deficitAmount: sc.deficitAmount });
    const wired = (fd && fd.lines) || [];
    if (wired.map(lineKey).join(';') === labToLines(lab.steps).map(lineKey).join(';')) identical++;
    /* rule 6 — OFF ⇒ no historical line at all */
    if (!(sc.deficitAmount > 0.005)) {
      if (uiDeficit !== 0) offHistViolations++;
      if (wired.every(l => l.obligation_kind !== 'historical')) offNoHist++; else offHistViolations++;
    } else {
      /* rule 5 — ON ⇒ historical is deducted FIRST (bounded by the real deficit) */
      onDeficitCases++;
      const first = fd.decision.steps[0];
      if (first && first.kind === 'historical' && first.amount <= R2(Math.min(sc.deficitAmount, pos.deficit)) + 0.005) onDeficitFirst++;
    }
  });
});
ok(identical === total, 'C1 UI→decide→lab identical over all scenarios (' + identical + '/' + total + ')');
ok(offHistViolations === 0, 'C2 rule 6: Historical Deficit OFF ⇒ 0 and NO historical allocation (' + offNoHist + ' off-scenarios clean)');
ok(onDeficitCases > 0 && onDeficitFirst === onDeficitCases, 'C3 rule 5: Historical Deficit ON ⇒ deducted FIRST & bounded (' + onDeficitFirst + '/' + onDeficitCases + ')');

/* ── D. Static plumbing evidence (single source; no UI calculation) ── */
ok(/deficitAmount:\s*\(window\.getRecDeficitAmount\s*\?\s*window\.getRecDeficitAmount\(\)\s*:\s*0\)/.test(R('public/js/crud.js')), 'D1 crud.js forwards getRecDeficitAmount() as ctx.deficitAmount');
ok(/foodDecisionLines\(ctx\.memberId,\s*ctx\.amountILS,\s*ctx\.deficitAmount\)/.test(R('public/js/receipt-settlement.js')), 'D2 wiring passes ctx.deficitAmount straight into the Decision Function');
const html = R('public/index.html');
ok(/id="rec-deficit-wrap"/.test(html) && /id="rec-deficit-on"/.test(html) && /id="rec-deficit-amount"/.test(html), 'D3 index.html exposes the deficit control');
ok(/onchange="window\.syncDeficitControl/.test(html), 'D4 member select refreshes the control');
ok(/window\.getRecDeficitAmount=function/.test(R('public/js/forms.js')), 'D5 the reader lives in forms.js (no allocation math)');

console.log('F-3 Explicit Historical Deficit Selection');
console.log('  scenarios: ' + total + '  |  UI→decide→lab identical: ' + identical);
console.log('  rule 6 (OFF⇒0, no historical): ' + offNoHist + ' clean, ' + offHistViolations + ' violations');
console.log('  rule 5 (ON⇒deducted first): ' + onDeficitFirst + '/' + onDeficitCases);
console.log('  checks: ' + pass + ' passed, ' + fail + ' failed');
fails.forEach(f => console.log('    FAIL ' + f));
console.log(fail ? '\nFAIL' : '\nPASS — Historical Deficit is controlled ONLY by explicit accountant input; decide() remains the sole authority');
process.exit(fail ? 1 : 0);
