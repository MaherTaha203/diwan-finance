/* F-5 (trial) · Calmer Food-Receipt input — presentation only, no financial change.
   Proves: (UX-01) the manual Settlement Editor is hidden for a member Food Receipt and
   shown for every other receipt; (UX-03) the Member Position card reflects the SAME FIN
   position decide() consumes; and that these functions touch no allocation/post path.
   Financial identity (787/787) is guaranteed by the untouched F-1..F-4 suites.
   Read-only. Usage: node tests/food-receipt-form-ux.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const RD = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); } };

const E = require(path.join(__dirname, '..', 'lab', 'engine.cjs'));
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
require(path.join(__dirname, '..', 'public', 'js', 'receipt-settlement.js'));

const store = {};
const el = id => (store[id] || (store[id] = { value: '', checked: false, textContent: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} } }));
global.document = { getElementById: el };
require(path.join(__dirname, '..', 'public', 'js', 'forms.js'));

/* ── UX-01: editor visibility gate ── */
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';
window.syncFoodEditorVisibility();
ok(el('rec-settlement').style.display === 'none', 'UX-01 editor hidden for member Food Receipt');
el('rec-fund').value = 'diwan'; window.syncFoodEditorVisibility();
ok(el('rec-settlement').style.display === '', 'UX-01 editor shown for non-food (still the real path)');
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'manual'; window.syncFoodEditorVisibility();
ok(el('rec-settlement').style.display === '', 'UX-01 editor shown for non-member food (cash donation path)');
global.window.RECEIPT_ALLOCATION_ENABLED = false; el('rec-payer-type').value = 'member'; window.syncFoodEditorVisibility();
ok(el('rec-settlement').style.display === 'none', 'UX-01 editor hidden when settlement OFF (legacy path)');
global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ── UX-03: member position card mirrors decide()'s FIN reads ── */
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';
const withSubs = members.find(m => posById[m.id].subYears.length > 0);
const withDef = members.find(m => posById[m.id].deficit > 0.005);
el('rec-member').value = withSubs.id; window.renderMemberPosition();
const cardHtml = el('rec-position').innerHTML;
ok(el('rec-position').style.display === '', 'UX-03 position card shown for member Food Receipt');
const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
ok(posById[withSubs.id].subYears.every(y => cardHtml.indexOf('سنة ' + y.year) >= 0 && cardHtml.indexOf(fmt(y.remaining) + ' ₪') >= 0), 'UX-03 every subscription year + remaining shown from FIN');
el('rec-member').value = withDef.id; window.renderMemberPosition();
ok(el('rec-position').innerHTML.indexOf('عجز تاريخي') >= 0 && el('rec-position').innerHTML.indexOf(fmt(posById[withDef.id].deficit) + ' ₪') >= 0, 'UX-03 historical deficit shown from FIN when present');
el('rec-fund').value = 'diwan'; window.renderMemberPosition();
ok(el('rec-position').style.display === 'none' && el('rec-position').innerHTML === '', 'UX-03 position card hidden for non-food');

/* ── Consistency: the card's years/amounts equal E.position() (decide()'s source) ── */
el('rec-fund').value = 'food'; el('rec-payer-type').value = 'member';
let cardTotal = 0, cardMatch = 0;
members.forEach(m => {
  const p = posById[m.id]; if (!p.subYears.length && p.deficit <= 0.005) return;
  cardTotal++;
  el('rec-member').value = m.id; window.renderMemberPosition();
  const h = el('rec-position').innerHTML;
  const subsOK = p.subYears.every(y => h.indexOf(fmt(y.remaining) + ' ₪') >= 0);
  const defOK = p.deficit > 0.005 ? h.indexOf(fmt(p.deficit) + ' ₪') >= 0 : true;
  if (subsOK && defOK) cardMatch++;
});
ok(cardMatch === cardTotal, 'UX-03 card == E.position() for all members with a position (' + cardMatch + '/' + cardTotal + ')');

/* ── Presentation only: the new functions never allocate or post ── */
const forms = RD('public/js/forms.js');
const segStart = forms.indexOf('window.syncFoodEditorVisibility=function');
const seg = forms.slice(segStart, forms.indexOf('window.onDeficitToggle=function', segStart));
ok(seg.length > 100, 'guard: F-5 segment located');
ok(!/foodDecisionLines|\.decide\(|postFromForm|SB\.rpc|\.post\(/.test(seg), 'F-5 code performs no allocation/posting (presentation only)');
ok(/id="rec-position"/.test(RD('public/index.html')), 'index.html exposes the Member Position card');

console.log('F-5 Food-Receipt input UX (trial)');
console.log('  checks: ' + pass + ' passed, ' + fail + ' failed  |  position-card consistency: ' + cardMatch + '/' + cardTotal);
fails.forEach(f => console.log('    FAIL ' + f));
console.log(fail ? '\nFAIL' : '\nPASS — calmer input is presentation-only; decide() remains the sole allocation authority');
process.exit(fail ? 1 : 0);
