/* P-RECEIPT-ALLOCATION · PR-5 — Consumer Seam (single read authority).
   Proves FIN.memberAllocation reads recorded settlement attribution (flag-gated),
   applies explicit-first then legacy-pool-over-residual, leaves legacy byte-
   identical and totals (finalBalance) untouched, and is the SOLE reader of
   allocation_records.  Usage: node tests/pralloc-pr5-consumer-seam.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

global.window = { MODEL2Allocation: require(P('allocation-engine.js')), FOOD_OPENING: 0, LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 0, diwanBalance: () => 0, foodDeficitRemaining: () => 0, foodNetPosition: () => 0 } };
global.today = () => '2026-08-01';
global.fmt = n => String(n); global.gmn = () => 'عضو'; global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(read(P('fin.js')) + ';FIN');
global.FIN = FIN;

/* fixture: member owes 2026, 2027, 2028 (200 each), no historical, no stored paid */
function baseDB(extraReceipts, allocRows) {
  return {
    members: [{ id: 'M', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
    subscriptions: [
      { member_id: 'M', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2027, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2028, due_amount_ils: 200, paid_amount_ils: 0 },
    ],
    receipts: extraReceipts || [], payments: [], refunds: [], member_write_offs: [],
    historical_subscription_truth: [], annual: [], allocation_records: allocRows || [],
  };
}
const foodRcpt = (id, amt) => ({ id: id, member_id: 'M', fund_type: 'food', is_deleted: false, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01' });
const line = (rid, kind, year, amt) => ({ source_ref: rid, source_kind: 'receipt_settlement', member_id: 'M', obligation_kind: kind, year: year, amount_allocated: amt });
const settled = (a, y) => !!(a.perYear[y] && a.perYear[y].settled);

/* ── Case 1: legacy only — a 400 food receipt, oldest-first ── */
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = baseDB([foodRcpt('R0', 400)]);
let legacy = FIN.memberAllocation('M');
ok(settled(legacy, 2026) && settled(legacy, 2027) && !settled(legacy, 2028), 'Case1 legacy OFF: oldest-first settles 2026+2027, not 2028');

/* seam neutral when ON but NO settlement rows ⇒ identical to legacy */
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.DB = baseDB([foodRcpt('R0', 400)]);   /* no allocation_records */
let neutral = FIN.memberAllocation('M');
ok(JSON.stringify(neutral) === JSON.stringify(legacy), 'Case1 ON + no settlement lines: byte-identical to legacy');

/* ── Case 2: explicit only — 400 receipt settles 2027+2028 (NOT oldest-first) ── */
global.DB = baseDB([foodRcpt('R1', 400)], [line('R1', 'due', 2027, 200), line('R1', 'due', 2028, 200)]);
let explicit = FIN.memberAllocation('M');
ok(!settled(explicit, 2026) && settled(explicit, 2027) && settled(explicit, 2028),
   'Case2 explicit: settles exactly the recorded years (2027+2028), 2026 stays unpaid — no guessing');

/* ── Case 3: mixed — explicit R1→2028; legacy R2 pool covers residual oldest-first ── */
global.DB = baseDB([foodRcpt('R1', 200), foodRcpt('R2', 200)], [line('R1', 'due', 2028, 200)]);
let mixed = FIN.memberAllocation('M');
ok(settled(mixed, 2028), 'Case3 mixed: explicit line settles 2028 first');
ok(settled(mixed, 2026) && !settled(mixed, 2027), 'Case3 mixed: legacy pool covers only the residual (2026), not 2027');

/* ── Case 4: cancellation — a deleted explicit receipt is ignored (reverts to legacy) ── */
global.DB = baseDB([Object.assign(foodRcpt('R1', 400), { is_deleted: true })], [line('R1', 'due', 2028, 400)]);
let cancelled = FIN.memberAllocation('M');
ok(!settled(cancelled, 2028) && !settled(cancelled, 2026), 'Case4 cancelled receipt: its settlement lines are ignored (no attribution)');

/* ── Case 7: Golden Reference — outstanding == finalBalance, identical ON vs OFF ── */
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = baseDB([foodRcpt('R1', 400)]);
let offBal = FIN.memberAllocation('M').outstanding, offFinal = FIN.memberStatement('M').finalBalance;
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.DB = baseDB([foodRcpt('R1', 400)], [line('R1', 'due', 2027, 200), line('R1', 'due', 2028, 200)]);
let onBal = FIN.memberAllocation('M').outstanding, onFinal = FIN.memberStatement('M').finalBalance;
ok(offBal === onBal, 'Case7 Golden Reference: outstanding identical regardless of attribution (OFF ' + offBal + ' == ON ' + onBal + ')');
ok(onBal === onFinal && offBal === offFinal, 'Case7: outstanding == memberStatement.finalBalance (totals untouched)');
ok(onFinal === offFinal, 'Case7: finalBalance byte-identical ON vs OFF (memberStatement not modified)');

/* ── Single-ATTRIBUTION-reader proof: fin.js is the sole file that computes
      attribution/balances from DB.allocation_records; data.js only ASSIGNS it
      (loader); refund-ui.js (PR-7A) only PRESENTS rows in the refund dialog and
      computes NO attribution. No other file references it. ── */
const jsDir = path.join(__dirname, '..', 'public', 'js');
const PRESENTATION = ['data.js', 'refund-ui.js'];   /* loader + refund dialog display — non-attribution */
let refs = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))
  .filter(f => /DB\.allocation_records/.test(read(path.join(jsDir, f))));
ok(refs.indexOf('fin.js') >= 0 && refs.every(f => f === 'fin.js' || PRESENTATION.indexOf(f) >= 0),
   'DB.allocation_records read only by fin.js (attribution) + data.js (loader) + refund-ui.js (display) — found: [' + refs.join(', ') + ']');
ok(/\(DB\.allocation_records\|\|\[\]\)\.forEach/.test(read(P('fin.js'))), 'fin.js is the CONSUMER (iterates DB.allocation_records)');
ok(!/perYear|finalBalance|creditRemaining|computeAllocation/.test(read(P('refund-ui.js'))), 'refund-ui.js computes NO attribution/balances (presentation only)');
const dataSrc = read(P('data.js'));
ok(!/DB\.allocation_records\)?\.(forEach|filter|map|reduce|find|some)/.test(dataSrc), 'data.js only ASSIGNS/loads DB.allocation_records (never consumes it)');
/* data.js loads it; allocation-integration.js writes it; neither reads it for attribution */
ok(/SB\.from\('allocation_records'\)\.select/.test(read(P('data.js'))), 'data.js loads settlement rows (data layer, gated)');
ok(!/DB\.allocation_records/.test(read(P('reports.js'))) && !/DB\.allocation_records/.test(read(P('dues-workspace.js'))) && !/DB\.allocation_records/.test(read(P('app.js'))),
   'no report/dues/dashboard reads allocation_records directly');

/* data.js gate: settlement load only when flag ON (OFF ⇒ no query) */
ok(/RECEIPT_ALLOCATION_ENABLED===true[\s\S]*?SB\.from\('allocation_records'\)/.test(read(P('data.js'))), 'settlement load is flag-gated (OFF ⇒ byte-identical login)');

console.log('\nPR-5 consumer seam: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
