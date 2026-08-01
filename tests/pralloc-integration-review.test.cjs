/* P-RECEIPT-ALLOCATION · INTEGRATION REVIEW — the whole pipeline (PR-1..PR-7).
   Not a per-PR unit test: this drives ONE member through the FULL settlement
   lifecycle — post (explicit attribution) → read → cancel (void) → refund
   (partial then full) — through the REAL single read authority (FIN.memberAllocation),
   asserting the composition invariant `outstanding == memberStatement.finalBalance`
   at EVERY step, and that the Golden Reference (flag OFF) is byte-identical. It also
   proves, by repository scan, that each capability has EXACTLY ONE authority and that
   the settlement pipeline never writes paid_amount_ils / member_subscriptions.
   Usage: node tests/pralloc-integration-review.test.cjs */
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
const T = '2026-06-01T00:00:00Z';

/* member owes 2026,2027,2028 (200 each) = 600 */
function DB(receipts, alloc, refunds) {
  return {
    members: [{ id: 'M', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
    subscriptions: [
      { member_id: 'M', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2027, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2028, due_amount_ils: 200, paid_amount_ils: 0 },
    ],
    receipts: receipts || [], payments: [], refunds: refunds || [], member_write_offs: [],
    historical_subscription_truth: [], annual: [], allocation_records: alloc || [],
  };
}
const rcpt = (id, amt, del) => ({ id, member_id: 'M', fund_type: 'food', is_deleted: !!del, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01', manual_allocation: true });
const legacy = (id, amt) => ({ id, member_id: 'M', fund_type: 'food', is_deleted: false, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01' });
const ln = (rid, year, amt, o) => ({ id: rid + ':' + year, source_ref: rid, source_kind: 'receipt_settlement', member_id: 'M', obligation_kind: 'due', year, amount_allocated: amt, voided_at: (o && o.voided) || null, refunded_at: (o && o.refunded) || null });
const rf = (id, origin, amt) => ({ id, member_id: 'M', origin_receipt_id: origin, movement_type: 'refund', amount_ils: amt, amount: amt, currency: 'ILS', payment_date: '2026-06-01', is_deleted: false });
const settled = (a, y) => !!(a.perYear[y] && a.perYear[y].settled);
/* the composition invariant that ties the whole system together */
const step = (label, expOutstanding, checkFn) => {
  const a = FIN.memberAllocation('M'), s = FIN.memberStatement('M');
  ok(a.outstanding === s.finalBalance, label + ' · invariant outstanding(' + a.outstanding + ') == finalBalance(' + s.finalBalance + ')');
  ok(a.outstanding === expOutstanding, label + ' · outstanding == ' + expOutstanding);
  if (checkFn) ok(checkFn(a), label + ' · attribution correct');
  return a;
};

global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ── Lifecycle, one member, through all four authorities ─────────────────────── */
/* S1 · POST explicit R1=400 settling 2027+2028 (create authority result) */
global.DB = DB([rcpt('R1', 400)], [ln('R1', 2027, 200), ln('R1', 2028, 200)]);
step('S1 post R1→2027+2028', 200, a => settled(a, 2027) && settled(a, 2028) && !settled(a, 2026));

/* S2 · POST explicit R2=200 settling 2026 → fully settled */
global.DB = DB([rcpt('R1', 400), rcpt('R2', 200)], [ln('R1', 2027, 200), ln('R1', 2028, 200), ln('R2', 2026, 200)]);
step('S2 post R2→2026', 0, a => settled(a, 2026) && settled(a, 2027) && settled(a, 2028));

/* S3 · CANCEL R2 (void authority: receipt is_deleted + its line voided) → 2026 back */
global.DB = DB([rcpt('R1', 400), rcpt('R2', 200, true)], [ln('R1', 2027, 200), ln('R1', 2028, 200), ln('R2', 2026, 200, { voided: T })]);
step('S3 cancel R2 (void)', 200, a => !settled(a, 2026) && settled(a, 2027) && settled(a, 2028));

/* S4 · PARTIAL REFUND of R1 (refund authority reverses ONLY the 2028 line) */
global.DB = DB([rcpt('R1', 400), rcpt('R2', 200, true)],
  [ln('R1', 2027, 200), ln('R1', 2028, 200, { refunded: T }), ln('R2', 2026, 200, { voided: T })],
  [rf('rfA', 'R1', 200)]);
step('S4 partial refund R1 (2028)', 400, a => settled(a, 2027) && !settled(a, 2028) && !settled(a, 2026));

/* S5 · FULL REFUND of R1 (remaining 2027 line reversed) → nothing settled */
global.DB = DB([rcpt('R1', 400), rcpt('R2', 200, true)],
  [ln('R1', 2027, 200, { refunded: T }), ln('R1', 2028, 200, { refunded: T }), ln('R2', 2026, 200, { voided: T })],
  [rf('rfA', 'R1', 200), rf('rfB', 'R1', 200)]);
step('S5 full refund R1', 600, a => !settled(a, 2026) && !settled(a, 2027) && !settled(a, 2028));

/* ── Golden Reference: the SAME net money via LEGACY receipts, and flag OFF ───── */
/* legacy equivalent of "R1=400 fully refunded, R2=200 cancelled" = no live money */
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = DB([rcpt('R1', 400), rcpt('R2', 200, true)],
  [ln('R1', 2027, 200, { refunded: T }), ln('R1', 2028, 200, { refunded: T }), ln('R2', 2026, 200, { voided: T })],
  [rf('rfA', 'R1', 200), rf('rfB', 'R1', 200)]);
let off = FIN.memberAllocation('M'), offFinal = FIN.memberStatement('M').finalBalance;
global.window.RECEIPT_ALLOCATION_ENABLED = true;
let on = FIN.memberAllocation('M'), onFinal = FIN.memberStatement('M').finalBalance;
ok(off.outstanding === on.outstanding && off.outstanding === 600, 'Golden Reference: fully-reversed lifecycle == 600 owed, identical ON vs OFF');
ok(offFinal === onFinal, 'Golden Reference: memberStatement.finalBalance identical ON vs OFF (totals untouched)');
/* a purely-legacy member is byte-identical ON vs OFF */
global.window.RECEIPT_ALLOCATION_ENABLED = false; global.DB = DB([legacy('L', 400)], [], [rf('r', 'L', 200)]); let lOff = FIN.memberAllocation('M');
global.window.RECEIPT_ALLOCATION_ENABLED = true; global.DB = DB([legacy('L', 400)], [], [rf('r', 'L', 200)]); let lOn = FIN.memberAllocation('M');
ok(JSON.stringify(lOff) === JSON.stringify(lOn), 'Golden Reference: a purely-legacy member is byte-identical ON vs OFF');

/* ═══ ONE AUTHORITY PER CAPABILITY (repository scan) ═══════════════════════════ */
const jsDir = path.join(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const callersOf = re => jsFiles.filter(f => re.test(read(path.join(jsDir, f))));

const readers = jsFiles.filter(f => /DB\.allocation_records/.test(read(path.join(jsDir, f))));
ok(readers.length === 2 && readers.includes('fin.js') && readers.includes('data.js'),
   'ONE read authority: DB.allocation_records only in fin.js (reader) + data.js (loader) — [' + readers.join(', ') + ']');
ok(/\(DB\.allocation_records\|\|\[\]\)\.forEach/.test(read(P('fin.js'))), '  …fin.js is the consumer (memberAllocation)');

const writeCallers = callersOf(/create_receipt_with_settlement/);
ok(writeCallers.length === 1 && writeCallers[0] === 'receipt-settlement.js', 'ONE write authority: create RPC called only by receipt-settlement.js — [' + writeCallers.join(', ') + ']');
const voidCallers = callersOf(/void_receipt_settlement/);
ok(voidCallers.length === 1 && voidCallers[0] === 'receipt-settlement.js', 'ONE void authority: void RPC called only by receipt-settlement.js — [' + voidCallers.join(', ') + ']');
const refundCallers = callersOf(/refund_receipt_settlement/);
ok(refundCallers.length === 1 && refundCallers[0] === 'receipt-settlement.js', 'ONE refund authority: refund RPC called only by receipt-settlement.js — [' + refundCallers.join(', ') + ']');

/* runtime invokers: cancel via BO-03, refund via BO-11 — delegated, never direct RPC */
const ops = read(P('operations.js'));
ok(/ReceiptSettlement\.cancel/.test(ops) && !/SB\.rpc\('void_receipt_settlement'/.test(ops), 'cancelVoucher (BO-03) delegates void; no direct RPC');
ok(/ReceiptSettlement\.refund/.test(ops) && !/SB\.rpc\('refund_receipt_settlement'/.test(ops), 'refundReceipt (BO-11) delegates refund; no direct RPC');

/* the settlement pipeline never writes the forbidden second-source columns */
const pipeline = ['receipt-settlement.js'];
pipeline.forEach(f => {
  const src = read(P(f)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!/paid_amount_ils/.test(src), f + ' never references paid_amount_ils (code)');
  ok(!/member_subscriptions/.test(src), f + ' never references member_subscriptions (code)');
});
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
['pralloc_pr2_atomic_engine', 'pralloc_pr6_void', 'pralloc_pr7_refund'].forEach(tag => {
  const f = fs.readdirSync(migDir).find(x => x.includes(tag));
  const code = read(path.join(migDir, f)).replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''");
  ok(!/paid_amount_ils/i.test(code), tag + ' RPC never writes paid_amount_ils');
  ok(!/member_subscriptions/i.test(code), tag + ' RPC never writes member_subscriptions');
});

/* feature flag defaults OFF everywhere it gates */
ok(/RECEIPT_ALLOCATION_ENABLED\s*===\s*'undefined'[\s\S]*=\s*false/.test(read(P('receipt-settlement.js'))), 'feature flag defaults OFF (receipt-settlement.js)');
ok(/RECEIPT_ALLOCATION_ENABLED===true[\s\S]*?SB\.from\('allocation_records'\)/.test(read(P('data.js'))), 'data.js settlement load is flag-gated (OFF ⇒ no query)');

console.log('\nPR integration review: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
