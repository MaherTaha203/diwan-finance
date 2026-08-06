/* F-4 · Confirmation Layer — the panel is a pure VIEWER of FoodReceiptDecision.decide().
   Proves that every value shown before Save originates verbatim from the SAME decision
   the posting path produces (ReceiptSettlement.foodDecisionLines), that the panel
   calculates nothing, that Historical Deficit appears only when selected, and that the
   future-subscription / totals / remaining shown equal the decision's, over every
   approved scenario. Read-only. Usage: node tests/food-receipt-confirmation.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const RD = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };

const E = require(path.join(__dirname, '..', 'lab', 'engine.cjs'));
const { strategies } = require(path.join(__dirname, '..', 'lab', 'scenario-runner.cjs'));
const { members } = E.load();

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

/* headless DOM + real production form handlers */
const store = {};
const el = id => (store[id] || (store[id] = { value: '', checked: false, textContent: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} } }));
global.window.getILS = () => Number(el('rec-amount').value) || 0;   /* same source crud.js uses */
global.document = { getElementById: el };
require(path.join(__dirname, '..', 'public', 'js', 'forms.js'));

/* ── A. buildFoodConfirmationRows maps a decision 1:1, computing nothing ── */
(function () {
  const anyDeficit = members.find(m => posById[m.id].deficit > 0.005 && posById[m.id].subYears.length > 0);
  const p = posById[anyDeficit.id];
  const subSum = p.subYears.reduce((a, y) => a + y.remaining, 0);
  const dec = RS.foodDecisionLines(anyDeficit.id, E.R2(p.deficit + subSum + 50), p.deficit).decision;
  const rows = window.buildFoodConfirmationRows(dec);
  const stepRows = rows.filter(r => r.key !== 'total' && r.key !== 'remaining');
  ok(stepRows.length === dec.steps.length, 'A1 one row per decide() step (no invented rows)');
  ok(stepRows.every((r, i) => r.value === dec.steps[i].amount), 'A2 each step row value === decide() step amount (verbatim)');
  const totalRow = rows.find(r => r.key === 'total'); const remRow = rows.find(r => r.key === 'remaining');
  ok(totalRow && totalRow.value === dec.amount, 'A3 total row === decision.amount (not a re-sum)');
  ok(remRow && remRow.value === dec.remaining, 'A4 remaining row === decision.remaining (verbatim)');
  ok(window.buildFoodConfirmationRows(null).length === 0, 'A5 no decision ⇒ no rows');
})();

/* ── B. renderFoodConfirmation shows exactly the decision, only for member-food/ON ── */
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';
const dm = members.find(m => posById[m.id].deficit > 0.005 && posById[m.id].subYears.length > 0);
const dp = posById[dm.id];
el('rec-member').value = dm.id;
el('rec-amount').value = String(E.R2(dp.deficit + dp.subYears.reduce((a, y) => a + y.remaining, 0) + 50));
el('rec-deficit-on').checked = true; el('rec-deficit-amount').value = String(dp.deficit);
window.renderFoodConfirmation();
const panelHtml = el('rec-confirm').innerHTML;
const shownDecision = RS.foodDecisionLines(dm.id, Number(el('rec-amount').value), window.getRecDeficitAmount()).decision;
ok(el('rec-confirm').style.display === '', 'B1 panel shown for member-food + amount');
ok(shownDecision.steps.every(s => panelHtml.indexOf(Number(s.amount).toFixed(2) + ' ₪') >= 0), 'B2 every decision step amount appears in the panel');
ok(panelHtml.indexOf('خصم العجز التاريخي') >= 0, 'B3 Historical Deficit row present when selected');
ok(panelHtml.indexOf(Number(shownDecision.amount).toFixed(2) + ' ₪') >= 0 && panelHtml.indexOf('إجمالي المقبوض') >= 0, 'B4 total received shown from decision.amount');
ok(panelHtml.indexOf(Number(shownDecision.remaining).toFixed(2) + ' ₪') >= 0, 'B5 remaining shown from decision.remaining (=0)');
/* deficit OFF ⇒ the Historical row disappears (only-when-selected) */
el('rec-deficit-on').checked = false; el('rec-deficit-amount').value = '';
window.renderFoodConfirmation();
ok(el('rec-confirm').innerHTML.indexOf('خصم العجز التاريخي') < 0, 'B6 Historical Deficit row ABSENT when not selected');
/* non-member-food ⇒ hidden + emptied */
el('rec-fund').value = 'diwan'; window.renderFoodConfirmation();
ok(el('rec-confirm').style.display === 'none' && el('rec-confirm').innerHTML === '', 'B7 hidden for non-food');
el('rec-fund').value = 'food';

/* ── C. Over EVERY approved scenario: panel values == decide() output, no drift ── */
let total = 0, matched = 0, histWhenSelected = 0, histCases = 0, histWhenNot = 0;
members.forEach(m => {
  el('rec-member').value = m.id;
  const pos = posById[m.id];
  strategies(pos).forEach(sc => {
    total++;
    el('rec-amount').value = String(sc.amount);
    if (sc.deficitAmount > 0.005) { el('rec-deficit-on').checked = true; el('rec-deficit-amount').value = String(sc.deficitAmount); }
    else { el('rec-deficit-on').checked = false; el('rec-deficit-amount').value = ''; }
    window.renderFoodConfirmation();
    const html = el('rec-confirm').innerHTML;
    const dec = RS.foodDecisionLines(m.id, sc.amount, window.getRecDeficitAmount()).decision;
    const rows = window.buildFoodConfirmationRows(dec);
    /* every displayed value must be a decision value; total row must equal decision.amount */
    const allFromDecision = rows.every(r => html.indexOf(Number(r.value).toFixed(2) + ' ₪') >= 0);
    const totalOK = html.indexOf(Number(dec.amount).toFixed(2) + ' ₪') >= 0;
    const remOK = html.indexOf(Number(dec.remaining).toFixed(2) + ' ₪') >= 0 && Math.abs(dec.remaining) < 0.005;
    if (allFromDecision && totalOK && remOK) matched++;
    const hasHist = html.indexOf('خصم العجز التاريخي') >= 0;
    if (sc.deficitAmount > 0.005) { histCases++; if (hasHist) histWhenSelected++; }
    else if (hasHist) histWhenNot++;
  });
});
ok(matched === total, 'C1 panel == decide() over all scenarios (' + matched + '/' + total + ')');
ok(histCases > 0 && histWhenSelected === histCases, 'C2 Historical row shown in every selected case (' + histWhenSelected + '/' + histCases + ')');
ok(histWhenNot === 0, 'C3 Historical row NEVER shown when not selected');

/* ── D. Static: the value builder performs no allocation math ──
   `buildFoodConfirmationRows` is the pure value source (one row per decision field);
   it must contain no re-summing. The renderer only formats (toFixed) and builds
   markup (html string concat) — it does not compute money either. */
const forms = RD('public/js/forms.js');
const bStart = forms.indexOf('window.buildFoodConfirmationRows=function');
const rStart = forms.indexOf('window.renderFoodConfirmation=function');
const builder = forms.slice(bStart, rStart);
const renderer = forms.slice(rStart, forms.indexOf('window.onPayFundChange=function', rStart));
ok(builder.length > 50 && renderer.length > 50, 'D0 confirmation code segments located');
ok(!/\.reduce\(/.test(builder) && !/\+=/.test(builder), 'D1 value builder does no summing (no reduce / no += over money)');
ok(/value\s*:\s*decision\.amount/.test(builder) && /value\s*:\s*decision\.remaining/.test(builder) && /value\s*:\s*s\.amount/.test(builder), 'D2 rows read decision.amount / decision.remaining / step.amount directly');
ok(/RSx\.foodDecisionLines\(mid,\s*amt,/.test(renderer), 'D3 renderer calls the SAME foodDecisionLines as the post path');
ok(!/\.reduce\(/.test(renderer) && /Number\(r\.value\)\.toFixed\(2\)/.test(renderer), 'D4 renderer only formats (toFixed) — no re-summing');
const html = RD('public/index.html');
ok(/id="rec-confirm"/.test(html), 'D5 index.html exposes the confirmation panel');

console.log('F-4 Confirmation Layer');
console.log('  scenarios: ' + total + '  |  panel==decide(): ' + matched);
console.log('  historical shown-when-selected: ' + histWhenSelected + '/' + histCases + '  |  shown-when-not: ' + histWhenNot);
console.log('  checks: ' + pass + ' passed, ' + fail + ' failed');
fails.forEach(f => console.log('    FAIL ' + f));
console.log(fail ? '\nFAIL' : '\nPASS — every displayed value originates directly from FoodReceiptDecision.decide(); the panel calculates nothing');
process.exit(fail ? 1 : 0);
