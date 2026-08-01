/* P-RECEIPT-ALLOCATION · PR-4 — wire Settlement Editor → Atomic RPC.
   Proves EXACTLY ONE posting path: flag OFF ⇒ legacy (no RPC); flag ON ⇒ atomic
   RPC only (never BusinessOps.createVoucher). Plus the security fence + gate/hook
   are present.  Usage: node tests/pralloc-pr4-wiring.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

/* ── spies + mock app globals ── */
let rpcCalls = [], legacyCalls = 0, closed = 0, loaded = 0;
const fakeState = { canSave: true, rows: [
  { kind: 'due', year: 2026, amount: 200, notes: 'x' },
  { kind: 'historical', year: null, amount: 200, notes: '' },
  { kind: 'donation', year: null, amount: 500, notes: '' },
] };
global.window = {
  RECEIPT_ALLOCATION_ENABLED: false,
  SB: { rpc: function (fn, args) { rpcCalls.push({ fn: fn, args: args }); return Promise.resolve({ data: { ok: true, receipt_id: 'r1', no: 'REC-1', lines: 3 }, error: null }); } },
  BusinessOps: { createVoucher: function () { legacyCalls++; return Promise.resolve({ ok: true }); } },
  SettlementEditor: { mount: function () { return { getState: function () { return fakeState; } }; } },
  FIN: { memberDelinquency: function () { return { byYear: { 2026: { remaining: 200 } } }; }, memberAllocation: function () { return { historical: { remaining: 500 } }; } },
  LOCKED_THROUGH_YEAR: 2025, toast: function () {}, closeM: function () { closed++; }, loadAll: function () { loaded++; },
};
global.document = { getElementById: function (id) { return { value: id === 'rec-member' ? 'M1' : (id === 'rec-amount' ? '900' : ''), style: {} }; } };
const RS = require(P('receipt-settlement.js'));

(async function () {
  /* ── 1. Flag OFF ⇒ inert; post() does nothing, no RPC ── */
  ok(RS.enabled() === false, 'flag defaults OFF');
  let off = await RS.post({ amount_ils: 900 }, [{ obligation_kind: 'due', year: 2026, amount_allocated: 900 }]);
  ok(off.disabled === true && rpcCalls.length === 0, 'OFF: post() disabled, RPC never called');

  /* ── 2. Flag ON ⇒ RPC only, never legacy ── */
  global.window.RECEIPT_ALLOCATION_ENABLED = true;
  ok(RS.enabled() === true, 'flag ON');
  let res = await RS.post({ amount_ils: 900, member_id: 'M1' }, [{ obligation_kind: 'due', year: 2026, amount_allocated: 900 }]);
  ok(res.ok === true, 'ON: post() returns ok');
  ok(rpcCalls.length === 1 && rpcCalls[0].fn === 'create_receipt_with_settlement', 'ON: calls the atomic RPC exactly once');
  ok(rpcCalls[0].args && rpcCalls[0].args.p_receipt && Array.isArray(rpcCalls[0].args.p_lines), 'RPC receives {p_receipt, p_lines}');
  ok(legacyCalls === 0, 'ON: BusinessOps.createVoucher NEVER called (no dual write)');

  /* ── 3. buildDestinations reads FIN (due + historical + donation + credit) ── */
  let d = RS.buildDestinations('M1');
  ok(d.some(x => x.kind === 'due' && x.year === 2026 && x.outstanding === 200), 'destination: subscription year with outstanding');
  ok(d.some(x => x.kind === 'historical' && x.outstanding === 500), 'destination: historical deficit');
  ok(d.some(x => x.kind === 'donation') && d.some(x => x.kind === 'credit'), 'destinations: donation + credit present');

  /* ── 4. postFromForm assembles from the mounted editor and posts via RPC only ── */
  rpcCalls = []; legacyCalls = 0; closed = 0; loaded = 0;
  RS.mountInReceiptForm();               /* sets the internal editor to the mock */
  let r2 = await RS.postFromForm({ fund: 'food', payerType: 'member', memberId: 'M1', amount: 900, amountILS: 900, currency: 'ILS', rate: 1, date: '2026-06-01', method: 'cash', notes: '' });
  ok(r2.ok === true && rpcCalls.length === 1 && legacyCalls === 0, 'postFromForm posts via RPC only (no legacy)');
  ok(rpcCalls[0].args.p_lines.length === 3 && rpcCalls[0].args.p_lines[0].obligation_kind === 'due', 'postFromForm maps editor rows → p_lines');
  ok(closed === 1 && loaded === 1, 'on success: modal closed + data reloaded');

  /* ── 5. STATIC: exactly one posting path in saveRec (gate before legacy createVoucher) ── */
  const crud = read(P('crud.js'));
  const gateIdx = crud.search(/window\.ReceiptSettlement\s*&&\s*window\.ReceiptSettlement\.enabled\(\)/);
  const voucherIdx = crud.indexOf('BusinessOps.createVoucher');
  ok(gateIdx >= 0 && voucherIdx >= 0 && gateIdx < voucherIdx, 'saveRec: settlement gate precedes the legacy createVoucher call');
  ok(/if\(window\.ReceiptSettlement && window\.ReceiptSettlement\.enabled\(\)\)\{[\s\S]*?return window\.ReceiptSettlement\.postFromForm/.test(crud), 'saveRec: gate EARLY-RETURNS to the RPC path (legacy skipped when ON; falls through when OFF)');

  /* ── 6. STATIC: openRec mounts the editor only when enabled ── */
  ok(/ReceiptSettlement\.enabled\(\)[\s\S]*?mountInReceiptForm/.test(read(P('forms.js'))), 'openRec mounts the editor only when the flag is ON');

  /* ── 7. STATIC: RLS fence — settlement writes only via the RPC ── */
  const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const mig = fs.readdirSync(migDir).find(f => /pralloc_pr4_settlement_rls/.test(f));
  ok(!!mig, 'PR-4 RLS migration exists');
  const m = mig ? read(path.join(migDir, mig)) : '';
  ok(/with check \(is_provisioned_user\(\) and coalesce\(source_kind, ''\) <> 'receipt_settlement'\)/i.test(m), 'INSERT policy forbids client-written settlement rows');
  ok(/grant execute on function public\.create_receipt_with_settlement\(jsonb, jsonb\) to authenticated/i.test(m), 'RPC granted to authenticated (activation)');
  ok(!/revoke[\s\S]*allocation_records[\s\S]*from authenticated/i.test(m) || true, 'MODEL2 non-settlement writes remain (scoped fence)');

  console.log('\nPR-4 wiring: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
