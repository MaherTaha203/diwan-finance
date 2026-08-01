/* P-RECEIPT-ALLOCATION · PR-7 — Settlement Refund.
   Proves a refund reverses EXACTLY the settlement lines being refunded
   (allocation-aware: partial reverses the selected lines, full reverses all), that
   the read seam stays consistent (outstanding == memberStatement.finalBalance) in
   every case, that legacy refunds and the Golden Reference are untouched, and that
   there is EXACTLY ONE authority (the refund RPC, reached only via
   ReceiptSettlement.refund) that reverses settlement lines for refunds.
   Usage: node tests/pralloc-pr7-refund.test.cjs */
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

/* member owes 2026, 2027, 2028 (200 each) = 600; no historical, no stored paid */
function baseDB(receipts, allocRows, refunds) {
  return {
    members: [{ id: 'M', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
    subscriptions: [
      { member_id: 'M', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2027, due_amount_ils: 200, paid_amount_ils: 0 },
      { member_id: 'M', year: 2028, due_amount_ils: 200, paid_amount_ils: 0 },
    ],
    receipts: receipts || [], payments: [], refunds: refunds || [], member_write_offs: [],
    historical_subscription_truth: [], annual: [], allocation_records: allocRows || [],
  };
}
const foodRcpt = (id, amt) => ({ id: id, member_id: 'M', fund_type: 'food', is_deleted: false, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01', manual_allocation: true });
const legacyRcpt = (id, amt) => ({ id: id, member_id: 'M', fund_type: 'food', is_deleted: false, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01' });
/* settlement line; opts.refunded / opts.voided set the marker (ISO string) */
const line = (rid, year, amt, opts) => ({ id: (opts && opts.id) || (rid + ':' + year), source_ref: rid, source_kind: 'receipt_settlement', member_id: 'M', obligation_kind: 'due', year: year, amount_allocated: amt, voided_at: (opts && opts.voided) || null, refunded_at: (opts && opts.refunded) || null });
const refundRow = (id, origin, amt) => ({ id: id, member_id: 'M', origin_receipt_id: origin, movement_type: 'refund', amount_ils: amt, amount: amt, currency: 'ILS', payment_date: '2026-06-01', is_deleted: false });
const T = '2026-06-01T00:00:00Z';
const settled = (a, y) => !!(a.perYear[y] && a.perYear[y].settled);
const invariant = tag => { const a = FIN.memberAllocation('M'), s = FIN.memberStatement('M'); ok(a.outstanding === s.finalBalance, tag + ': outstanding == memberStatement.finalBalance (' + a.outstanding + ')'); return a; };

global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ── Case 1: LEGACY refund — a refund against a legacy receipt still reduces the
      FD-002 pool (unchanged behaviour). L=400 pays oldest-first; refund 200. ── */
global.DB = baseDB([legacyRcpt('L', 400)], [], [refundRow('rf1', 'L', 200)]);
let c1 = invariant('Case1 legacy refund');
ok(settled(c1, 2026) && !settled(c1, 2027) && !settled(c1, 2028) && c1.outstanding === 400,
   'Case1 legacy refund: pool 400−200 settles only 2026; outstanding 400 (legacy path unchanged)');

/* ── Case 2: PARTIAL refund — R=400 settled 2027+2028; refund only the 2028 line.
      Reverses ONLY 2028: 2027 stays settled, 2026+2028 owed. ── */
global.DB = baseDB([foodRcpt('R', 400)],
  [line('R', 2027, 200), line('R', 2028, 200, { refunded: T })],
  [refundRow('rf', 'R', 200)]);
let c2 = invariant('Case2 partial refund');
ok(settled(c2, 2027) && !settled(c2, 2026) && !settled(c2, 2028) && c2.outstanding === 400,
   'Case2 partial: reverses only the selected 2028 line — 2027 stays settled, 2026+2028 owed (400)');

/* ── Case 3: FULL refund — both lines reversed; nothing settled, all 600 owed. ── */
global.DB = baseDB([foodRcpt('R', 400)],
  [line('R', 2027, 200, { refunded: T }), line('R', 2028, 200, { refunded: T })],
  [refundRow('rf', 'R', 400)]);
let c3 = invariant('Case3 full refund');
ok(!settled(c3, 2026) && !settled(c3, 2027) && !settled(c3, 2028) && c3.outstanding === 600,
   'Case3 full: all lines reversed — nothing settled, all 600 owed');
/* allocation-aware: a fully-refunded explicit receipt == the receipt never existed */
global.DB = baseDB([], [], []);
ok(FIN.memberAllocation('M').outstanding === c3.outstanding, 'Case3 full refund == no-receipt baseline (money in then fully out)');

/* ── Case 4: REPEATED refund — an already-refunded line stays reversed; recomputing
      is idempotent (write-layer rejection is proven in the SQL self-test). ── */
global.DB = baseDB([foodRcpt('R', 400)],
  [line('R', 2027, 200), line('R', 2028, 200, { refunded: T })],
  [refundRow('rf', 'R', 200)]);
let c4 = FIN.memberAllocation('M');
ok(JSON.stringify(c4.perYear) === JSON.stringify(c2.perYear), 'Case4 repeated: an already-refunded line stays reversed (idempotent at read)');

/* ── Case 5: MIXED member — explicit R (2027+2028) partially refunded (2028) PLUS a
      legacy L=500. The explicit refund must NOT drain the legacy pool: L covers
      2026+2028, 2027 from the surviving explicit line, +100 credit. ── */
global.DB = baseDB([foodRcpt('R', 400), legacyRcpt('L', 500)],
  [line('R', 2027, 200), line('R', 2028, 200, { refunded: T })],
  [refundRow('rf', 'R', 200)]);
let c5 = invariant('Case5 mixed member');
ok(settled(c5, 2026) && settled(c5, 2027) && settled(c5, 2028) && c5.outstanding === -100,
   'Case5 mixed: explicit refund reverses only its line; legacy pool intact — all settled, 100 credit');

/* ── Case 6: GOLDEN REFERENCE — flag OFF is byte-identical; a legacy refund
      scenario computes the same ON vs OFF; memberStatement.finalBalance never moves. ── */
const legacyScenario = () => baseDB([legacyRcpt('L', 400)], [line('R', 2027, 200)], [refundRow('rf1', 'L', 200)]);
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = legacyScenario(); let offA = FIN.memberAllocation('M'), offFinal = FIN.memberStatement('M').finalBalance;
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.DB = legacyScenario(); let onFinal = FIN.memberStatement('M').finalBalance;
/* the 'R' line above belongs to no live receipt of the member here, so ON must be
   identical to OFF for the legacy receipt+refund (no explicit attribution applies) */
ok(offFinal === onFinal, 'Case6 Golden Reference: memberStatement.finalBalance identical ON vs OFF (' + offFinal + ') — totals untouched');
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = baseDB([legacyRcpt('L', 400)], [], [refundRow('rf1', 'L', 200)]); let offB = FIN.memberAllocation('M');
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.DB = baseDB([legacyRcpt('L', 400)], [], [refundRow('rf1', 'L', 200)]); let onB = FIN.memberAllocation('M');
ok(JSON.stringify(offB) === JSON.stringify(onB), 'Case6: a legacy receipt+refund is byte-identical ON vs OFF (no explicit rows ⇒ neutral)');
global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ═══ SINGLE REFUND-REVERSAL AUTHORITY — the deliverable proof ══════════════════ */
const jsDir = path.join(__dirname, '..', 'public', 'js');
let callers = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))
  .filter(f => /refund_receipt_settlement/.test(read(path.join(jsDir, f))));
ok(callers.length === 1 && callers[0] === 'receipt-settlement.js',
   'the refund RPC is called only by receipt-settlement.js — found: [' + callers.join(', ') + ']');
const rs = read(P('receipt-settlement.js'));
ok(/SB\.rpc\('refund_receipt_settlement'/.test(rs), 'receipt-settlement.refund is the sole client caller of the refund-reversal authority');
ok(/RECEIPT_ALLOCATION_ENABLED\s*===\s*'undefined'[\s\S]*=\s*false/.test(rs) || /=\s*false;/.test(rs), 'feature flag still defaults OFF');
const ops = read(P('operations.js'));
ok(/ReceiptSettlement\.refund/.test(ops), 'refundReceipt (BO-11) delegates settlement reversal to ReceiptSettlement.refund');
ok(!/SB\.rpc\('refund_receipt_settlement'/.test(ops), 'operations.js does NOT call the refund RPC directly (no second refund authority)');
ok(/RECEIPT_ALLOCATION_ENABLED === true/.test(ops) && /res\.isFull/.test(ops), 'the reversal step is flag-gated; full=all lines, partial=selected lines');
/* read seam: skips refunded lines, excludes explicit-settlement refunds from the pool, loads the marker */
const finSrc = read(P('fin.js'));
ok(/a\.refunded_at\)\s*return;/.test(finSrc), 'fin.js read seam skips refunded settlement lines (a.refunded_at)');
ok(/_explAll\[r\.origin_receipt_id\]/.test(finSrc), 'fin.js excludes explicit-settlement refunds from the FD-002 pool (allocation-aware)');
ok(/a\.voided_at\)\s*return;/.test(finSrc), 'fin.js still skips voided lines (PR-6 intact)');
ok(/amount_allocated,voided_at,refunded_at/.test(read(P('data.js'))), 'data.js loads refunded_at (and line id) so the seam can honour it');

/* migration */
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migFile = fs.readdirSync(migDir).find(f => /pralloc_pr7_refund/.test(f));
ok(!!migFile, 'PR-7 migration _pralloc_pr7_refund.sql exists');
const mraw = migFile ? read(path.join(migDir, migFile)) : '';
const mcode = mraw.replace(/--[^\n]*/g, '');
ok(/add column if not exists refunded_at timestamptz/i.test(mcode), 'migration adds the refunded_at column (additive)');
ok(/create or replace function public\.refund_receipt_settlement/i.test(mcode) && /security definer/i.test(mcode), 'defines refund_receipt_settlement as SECURITY DEFINER (the refund-reversal authority)');
ok(/p_line_ids/i.test(mcode) && /id = any\s*\(\s*p_line_ids\s*\)/i.test(mcode), 'is line-selectable: partial reverses only the given line ids, full (null) reverses all');
ok(/refunded_at is null/i.test(mcode) && /voided_at is null/i.test(mcode), 'reverses only ACTIVE, non-voided lines (refunded_at IS NULL AND voided_at IS NULL)');
ok(/settlement_refund_none/i.test(mcode), 'raises settlement_refund_none when nothing matches (idempotent / repeated-refund rejected)');
ok(/revoke all on function public\.refund_receipt_settlement\(uuid, uuid\[\]\) from public, anon, authenticated/i.test(mcode), 'refund RPC revoked from public/anon/authenticated first');
ok(/grant execute on function public\.refund_receipt_settlement\(uuid, uuid\[\]\) to authenticated/i.test(mcode), 'refund RPC granted to authenticated (single reachable authority)');
const mIdents = mcode.replace(/'(?:[^']|'')*'/g, "''");
ok(!/paid_amount_ils/i.test(mIdents), 'refund RPC never writes paid_amount_ils');
ok(!/member_subscriptions/i.test(mIdents), 'refund RPC never touches member_subscriptions');
ok(!/\bdelete\s+from\b/i.test(mIdents) && !/amount_allocated\s*=/i.test(mIdents), 'refund RPC never deletes a line nor rewrites amount_allocated (only stamps refunded_at)');

/* behavioural SQL self-test */
const sqlTest = path.join(__dirname, 'pralloc-pr7-refund.sql');
ok(fs.existsSync(sqlTest), 'behavioural SQL self-test pralloc-pr7-refund.sql ships');
const st = fs.existsSync(sqlTest) ? read(sqlTest) : '';
ok(/rollback;/i.test(st), 'SQL self-test rolls back (persists nothing)');
['partial reverses selected','full reverses all','repeated refund rejected','no paid_amount_ils'].forEach(function (c, i) {
  ok(new RegExp('T' + (i + 1) + ' PASSED').test(st), 'SQL self-test covers case ' + (i + 1) + ' (' + c + ')');
});

/* report + explicit statement */
const rep = path.join(__dirname, '..', 'docs', 'fin', 'P-RECEIPT-ALLOCATION-PR7_REPORT.md');
ok(fs.existsSync(rep), 'PR-7 report ships');
ok(fs.existsSync(rep) && /There is exactly one authority that reverses settlement lines for refunds\./.test(read(rep)),
   'report states: “There is exactly one authority that reverses settlement lines for refunds.”');

console.log('\nPR-7 settlement refund: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
