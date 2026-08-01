/* P-RECEIPT-ALLOCATION · PR-6 — Settlement Cancellation.
   Proves that cancelling a receipt with explicit settlement lines VOIDS exactly
   those lines (voided_at), so the read seam stops attributing them — no guessing,
   no redistribution, no recalculation — while legacy receipts and the Golden
   Reference (finalBalance / OFF-identical) are untouched; and that there is
   EXACTLY ONE authority (the void RPC, reached only via ReceiptSettlement.cancel)
   that voids settlement lines.  Usage: node tests/pralloc-pr6-cancellation.test.cjs */
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
const foodRcpt = (id, amt, del) => ({ id: id, member_id: 'M', fund_type: 'food', is_deleted: !!del, movement_type: 'subscription_payment', amount_ils: amt, amount: amt, currency: 'ILS', receipt_date: '2026-05-01', manual_allocation: true });
/* a settlement line; voidedAt !== undefined ⇒ the line was voided by cancellation */
const line = (rid, kind, year, amt, voidedAt) => ({ source_ref: rid, source_kind: 'receipt_settlement', member_id: 'M', obligation_kind: kind, year: year, amount_allocated: amt, voided_at: voidedAt || null });
const settled = (a, y) => !!(a.perYear[y] && a.perYear[y].settled);

global.window.RECEIPT_ALLOCATION_ENABLED = true;

/* ── Case 1: legacy receipt cancellation — a cancelled (is_deleted) legacy food
      receipt (NO settlement lines) contributes nothing; its years revert. ── */
global.DB = baseDB([foodRcpt('L0', 400, false)]);   /* active legacy 400 → 2026+2027 */
let legacyOn = FIN.memberAllocation('M');
ok(settled(legacyOn, 2026) && settled(legacyOn, 2027), 'Case1 legacy active: 400 settles 2026+2027 (oldest-first)');
global.DB = baseDB([foodRcpt('L0', 400, true)]);    /* same receipt cancelled */
let legacyCancelled = FIN.memberAllocation('M');
ok(!settled(legacyCancelled, 2026) && !settled(legacyCancelled, 2027), 'Case1 legacy cancelled: attribution reverses (behaves as before PR-6)');

/* ── Case 2: explicit receipt cancellation — the receipt is soft-deleted AND its
      lines are voided_at; the seam attributes nothing (exact reversal). ── */
global.DB = baseDB([foodRcpt('R1', 400, false)], [line('R1', 'due', 2027, 200), line('R1', 'due', 2028, 200)]);
let explActive = FIN.memberAllocation('M');
ok(settled(explActive, 2027) && settled(explActive, 2028) && !settled(explActive, 2026), 'Case2 explicit active: settles exactly 2027+2028');
global.DB = baseDB([foodRcpt('R1', 400, true)], [line('R1', 'due', 2027, 200, '2026-08-01T00:00:00Z'), line('R1', 'due', 2028, 200, '2026-08-01T00:00:00Z')]);
let explCancelled = FIN.memberAllocation('M');
ok(!settled(explCancelled, 2027) && !settled(explCancelled, 2028), 'Case2 explicit cancelled: voided lines settle nothing — each destination loses exactly what it received');

/* ── Case 3: mixed member — one ACTIVE explicit receipt (settles 2028) plus one
      CANCELLED explicit receipt (voided → ignored); only the active one counts. ── */
global.DB = baseDB(
  [foodRcpt('RA', 200, false), foodRcpt('RB', 200, true)],
  [line('RA', 'due', 2028, 200), line('RB', 'due', 2026, 200, '2026-08-01T00:00:00Z')]);
let mixed = FIN.memberAllocation('M');
ok(settled(mixed, 2028), 'Case3 mixed: the active explicit line still settles 2028');
ok(!settled(mixed, 2026) && !settled(mixed, 2027), 'Case3 mixed: the cancelled receipt’s voided line contributes nothing');

/* ── Case 4: repeated cancellation — voiding is idempotent at the read layer: an
      already-voided line stays ignored no matter how many times it is voided.
      (The write-layer rejection of a second cancel is proven in the SQL test.) ── */
global.DB = baseDB([foodRcpt('R1', 400, true)], [line('R1', 'due', 2027, 200, '2026-08-01T00:00:00Z'), line('R1', 'due', 2028, 200, '2026-08-01T00:00:00Z')]);
let repeat = FIN.memberAllocation('M');
ok(JSON.stringify(repeat.perYear) === JSON.stringify(explCancelled.perYear), 'Case4 repeated: an already-voided line stays ignored (idempotent at read)');

/* ── Case 5: a cancelled receipt no longer contributes settlement attribution —
      outstanding after cancellation == outstanding with no explicit lines at all. ── */
global.DB = baseDB([], []);   /* no receipts at all ⇒ nothing settled (all three years owed) */
let noExplicit = FIN.memberAllocation('M');
ok(explCancelled.outstanding === noExplicit.outstanding,
   'Case5 cancelled receipt contributes no attribution: outstanding == the no-settlement baseline (' + explCancelled.outstanding + ')');

/* ── Case 6: Golden Reference — OFF byte-identical; voided rows never move a
      balance; outstanding == memberStatement.finalBalance. ── */
global.window.RECEIPT_ALLOCATION_ENABLED = false;
global.DB = baseDB([foodRcpt('R1', 400, false)]);
let offBal = FIN.memberAllocation('M'), offFinal = FIN.memberStatement('M').finalBalance;
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.DB = baseDB([foodRcpt('R1', 400, false)], [line('R1', 'due', 2027, 200, '2026-08-01T00:00:00Z'), line('R1', 'due', 2028, 200, '2026-08-01T00:00:00Z')]);
let onBalCancelled = FIN.memberAllocation('M'), onFinal = FIN.memberStatement('M').finalBalance;
ok(offBal.outstanding === onBalCancelled.outstanding, 'Case6 Golden Reference: a fully-voided explicit receipt == the legacy same-amount receipt (outstanding ' + offBal.outstanding + ')');
ok(onBalCancelled.outstanding === onFinal && offBal.outstanding === offFinal, 'Case6: outstanding == memberStatement.finalBalance (totals untouched)');
ok(onFinal === offFinal, 'Case6: finalBalance byte-identical ON vs OFF (memberStatement not modified)');

/* ═══ SINGLE VOID AUTHORITY — the deliverable proof ════════════════════════════ */
const jsDir = path.join(__dirname, '..', 'public', 'js');
/* (a) exactly one JS file calls the void RPC, and it is the settlement module */
let voidCallers = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))
  .filter(f => /void_receipt_settlement/.test(read(path.join(jsDir, f))));
ok(voidCallers.length === 1 && voidCallers[0] === 'receipt-settlement.js',
   'the void RPC is called only by receipt-settlement.js — found: [' + voidCallers.join(', ') + ']');
const rs = read(P('receipt-settlement.js'));
ok(/SB\.rpc\('void_receipt_settlement'/.test(rs), 'receipt-settlement.cancel is the sole client caller of the void authority');
ok(/RECEIPT_ALLOCATION_ENABLED\s*===\s*'undefined'[\s\S]*=\s*false/.test(rs) || /=\s*false;/.test(rs), 'feature flag still defaults OFF');
/* (b) operations.js DELEGATES to ReceiptSettlement.cancel (does not call SB.rpc void directly) */
const ops = read(P('operations.js'));
ok(/ReceiptSettlement\.cancel/.test(ops), 'cancelVoucher (BO-03) delegates settlement voiding to ReceiptSettlement.cancel');
ok(!/SB\.rpc\('void_receipt_settlement'/.test(ops), 'operations.js does NOT call the void RPC directly (no second void path)');
ok(/RECEIPT_ALLOCATION_ENABLED === true/.test(ops) && /kind === 'receipt'/.test(ops), 'the void step is flag-gated and receipt-only');
/* (c) the read seam skips voided lines; data.js loads the marker */
ok(/\|\|a\.voided_at\) return;/.test(read(P('fin.js'))) || /a\.voided_at\)\s*return;/.test(read(P('fin.js'))), 'fin.js read seam skips voided settlement lines (a.voided_at)');
ok(/amount_allocated,voided_at/.test(read(P('data.js'))), 'data.js loads voided_at so the seam can honour it');

/* ── the void migration + its behavioural self-test ── */
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migFile = fs.readdirSync(migDir).find(f => /pralloc_pr6_void/.test(f));
ok(!!migFile, 'PR-6 migration _pralloc_pr6_void.sql exists');
const mraw = migFile ? read(path.join(migDir, migFile)) : '';
const mcode = mraw.replace(/--[^\n]*/g, '');   /* -- comments stripped; string literals kept for structural checks */
ok(/add column if not exists voided_at timestamptz/i.test(mcode), 'migration adds the voided_at column (additive)');
ok(/create or replace function public\.void_receipt_settlement/i.test(mcode) && /security definer/i.test(mcode), 'defines void_receipt_settlement as SECURITY DEFINER (the void authority)');
ok(/source_kind\s*=\s*'receipt_settlement'/i.test(mcode) && /voided_at is null/i.test(mcode), 'voids only active settlement rows (source_kind=receipt_settlement AND voided_at IS NULL)');
ok(/settlement_void_none/i.test(mcode), 'raises settlement_void_none when there is nothing to void (idempotent / repeated-cancel rejected)');
ok(/revoke all on function public\.void_receipt_settlement\(uuid\) from public, anon, authenticated/i.test(mcode), 'void RPC revoked from public/anon/authenticated first');
ok(/grant execute on function public\.void_receipt_settlement\(uuid\) to authenticated/i.test(mcode), 'void RPC granted to authenticated (single reachable authority)');
/* the sacred prohibitions — identifiers only (blank ALL string literals) */
const mIdents = mcode.replace(/'(?:[^']|'')*'/g, "''");
ok(!/paid_amount_ils/i.test(mIdents), 'void RPC never writes paid_amount_ils');
ok(!/member_subscriptions/i.test(mIdents), 'void RPC never touches member_subscriptions');
ok(!/\bdelete\s+from\b/i.test(mIdents) && !/amount_allocated\s*=/i.test(mIdents), 'void RPC never deletes a line nor rewrites amount_allocated (only stamps voided_at)');

const sqlTest = path.join(__dirname, 'pralloc-pr6-void.sql');
ok(fs.existsSync(sqlTest), 'behavioural SQL self-test pralloc-pr6-void.sql ships');
const st = fs.existsSync(sqlTest) ? read(sqlTest) : '';
ok(/rollback;/i.test(st), 'SQL self-test rolls back (persists nothing)');
['void marks lines','read reverses','repeated cancel rejected','legacy untouched','no paid_amount_ils'].forEach(function (c, i) {
  ok(new RegExp('T' + (i + 1) + ' PASSED').test(st), 'SQL self-test covers case ' + (i + 1) + ' (' + c + ')');
});

/* ── the report states the single-authority guarantee verbatim ── */
const rep = path.join(__dirname, '..', 'docs', 'fin', 'P-RECEIPT-ALLOCATION-PR6_REPORT.md');
ok(fs.existsSync(rep), 'PR-6 report ships');
ok(fs.existsSync(rep) && /There is exactly one authority that voids settlement lines\./.test(read(rep)),
   'report states: “There is exactly one authority that voids settlement lines.”');

console.log('\nPR-6 settlement cancellation: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
