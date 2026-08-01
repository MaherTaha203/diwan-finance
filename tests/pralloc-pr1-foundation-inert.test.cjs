/* P-RECEIPT-ALLOCATION · PR-1 — Foundation inertness tests.
   Proves the foundation is INERT: the feature flag defaults OFF; the interface
   stubs perform no work; the module does not overwrite any BusinessOps method or
   touch FIN; FIN's outputs are byte-identical with the module loaded (flag OFF)
   vs. without it; the migration is additive-only (no data mutation) and its RPC
   is an inert skeleton; and no runtime path calls the new interface or RPC.
   Usage: node tests/pralloc-pr1-foundation-inert.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

/* ── Load FIN with a realistic fixture (mirrors historical-truth harness) ── */
global.window = {
  MODEL2Allocation: require(P('allocation-engine.js')),
  FOOD_OPENING: 0, LOCKED_THROUGH_YEAR: 2025,
  FinContract: { foodBalance: () => 0, diwanBalance: () => 0, foodDeficitRemaining: () => 0, foodNetPosition: () => 0 },
  BusinessOps: { version: 1, createVoucher: function () { return 'ORIGINAL'; } }  /* pre-existing method to guard */
};
global.today = () => '2026-08-01';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(read(P('fin.js')) + ';FIN');
global.FIN = FIN;
global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 500, historical_payments_ils: 0 }],
  subscriptions: [
    { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
  ],
  receipts: [{ id: 'R1', member_id: 'M1', fund_type: 'food', is_deleted: false, movement_type: 'food_contribution', amount_ils: 250, amount: 250, currency: 'ILS', receipt_date: '2026-03-01' }],
  payments: [], refunds: [], member_write_offs: [], historical_subscription_truth: [], annual: [],
};
global.FIN.amountOf = FIN.amountOf; /* ensure amountOf available */

const snap = () => JSON.stringify({
  statement: FIN.memberStatement('M1'),
  allocation: FIN.memberAllocation('M1'),
  delinquency: FIN.memberDelinquency('M1'),
  debt: FIN.debtReportRows({ years: null, filter: 'all' }),
});

/* ── 1. Capture the "current system" snapshot BEFORE the module loads ── */
const before = snap();
ok(before.length > 2, 'FIN produces a baseline snapshot (current system)');

/* ── 2. Load the foundation module (flag defaults OFF) ── */
const RS = require(P('receipt-settlement.js'));

ok(global.window.RECEIPT_ALLOCATION_ENABLED === false, 'Feature flag defaults OFF');
ok(RS && RS.enabled() === false, 'ReceiptSettlement.enabled() === false');
ok(typeof RS.post === 'function' && typeof RS.cancel === 'function' && typeof RS.refund === 'function',
   'post/cancel/refund are defined');

/* ── 3. Additive, non-overwriting BusinessOps integration ── */
ok(global.window.BusinessOps.createVoucher() === 'ORIGINAL', 'existing BusinessOps.createVoucher is NOT overwritten');
ok(typeof global.window.BusinessOps.postReceiptSettlement === 'function', 'BusinessOps gains settlement methods (additive)');

/* ── 4. FIN is byte-identical AFTER the module loads (flag OFF == current) ── */
const after = snap();
ok(after === before, 'FIN outputs byte-identical with the module loaded (OFF) vs current system');

/* ── 5. All activation is keyed on the OFF-by-default flag (PR-4 wiring is flag-gated) ── */
const src = read(P('receipt-settlement.js'));
ok(/function enabled\(\)\s*\{\s*return root\.RECEIPT_ALLOCATION_ENABLED === true/.test(src), 'module keys all activation on the OFF-by-default flag');

/* ── 6. Migration is additive-only and its RPC is an inert skeleton ── */
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
const mig = fs.readdirSync(migDir).find(f => /pralloc_pr1_foundation/.test(f));
ok(!!mig, 'migration _pralloc_pr1_foundation.sql exists');
const mRaw = mig ? read(path.join(migDir, mig)) : '';
const m = mRaw;
const mCode = mRaw.replace(/--[^\n]*/g, '');   /* SQL with -- comments stripped, for code-only checks */
ok(/add column if not exists\s+notes text/i.test(m), 'migration adds notes column (additive)');
ok(/create unique index if not exists\s+alloc_settlement_uniq[\s\S]*where source_kind = 'receipt_settlement'/i.test(m),
   'settlement uniqueness is SCOPED to source_kind=receipt_settlement (MODEL2 unaffected)');
ok(/create or replace function public\.create_receipt_with_settlement/i.test(m) && /raise exception 'receipt_settlement_not_enabled'/i.test(m),
   'RPC is an inert skeleton that always raises (writes nothing)');
ok(!/\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b|\bdrop\s+table\b|\bdrop\s+column\b|\bdrop\s+policy\b/i.test(mCode),
   'migration alters NO existing data / column / policy (no update/delete/truncate/drop)');
ok(!/paid_amount_ils/i.test(mCode), 'migration never touches paid_amount_ils (code)');

/* ── 7. No runtime path calls the new interface or the RPC ── */
const jsDir = path.join(__dirname, '..', 'public', 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'receipt-settlement.js');
let callers = [];
for (const f of files) {
  const s = read(path.join(jsDir, f));
  if (/ReceiptSettlement\.(post|cancel|refund)\s*\(|postReceiptSettlement\s*\(|cancelReceiptSettlement\s*\(|refundReceiptSettlement\s*\(|create_receipt_with_settlement/.test(s)) callers.push(f);
}
ok(callers.length === 0, 'no runtime file calls the settlement interface directly (post/cancel/refund) — found: [' + callers.join(', ') + ']');

/* ── 8. Behavioural OFF-inertness: flag OFF ⇒ post() calls no RPC and resolves disabled ── */
(async function () {
  global.window.RECEIPT_ALLOCATION_ENABLED = false;
  let rpc = 0; global.window.SB = { rpc: function () { rpc++; return Promise.resolve({ data: {}, error: null }); } };
  const r = await RS.post({ amount_ils: 100 }, [{ obligation_kind: 'due', year: 2026, amount_allocated: 100 }]);
  ok(rpc === 0, 'flag OFF: post() calls no RPC (inert)');
  ok(r && r.disabled === true, 'flag OFF: post() resolves disabled');
  console.log('\nPR-1 foundation inertness: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
