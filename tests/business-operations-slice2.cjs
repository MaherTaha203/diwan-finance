/* ═══════════════════════════════════════════════════════════════════════════
   BUSINESS OPERATIONS — Slice 2 conformance proof  ·  P1 (BO-04 / BO-05)
   ───────────────────────────────────────────────────────────────────────────
   Proves the Business Operations layer (public/js/operations.js) honours the
   P1-000 Part A contract for classification change and partial move, fail-closed,
   and — critically for Slice 2 — that it contains NO accounting logic and routes
   EXCLUSIVELY through the certified path:

     BO-04 Reclassify : administrator · active · not-locked · reason mandatory ·
                        explicit valid MODEL2 classification (L4) · classification
                        update + immutable snapshot (L5/L6). No amount change.
     BO-05 Split/Move : administrator · active · not-locked · reason mandatory ·
                        SOLE executor = the atomic guarded RPC reclassify_split_atomic
                        (V1/V9). The layer performs NO split math and NO conservation
                        check, forwards the caller's proposal verbatim (no recompute),
                        does NOT write rows directly (no bypass), and keeps the
                        parent→child link intact.

   Loads operations.js in a shared scope with injected stubs (incl. SB.rpc). The
   end-to-end behaviour through the real DOM is covered by tests/e2e-acceptance.cjs.

   Run:  node tests/business-operations-slice2.cjs   ·  exit 0 = contract satisfied.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'operations.js'), 'utf8');

function makeEnv(state) {
  const DB = { receipts: [], payments: [], voucher_versions: [] };
  const rpcCalls = [];
  const directInserts = [];
  const SB = {
    from(tbl) {
      let rows = DB[tbl] || (DB[tbl] = []); let inserted = null; let pend = null; let filt = () => true;
      const api = {
        insert(v) { directInserts.push({ tbl, v }); const a = Array.isArray(v) ? v : [v]; a.forEach(x => { if (!x.id) x.id = 'id' + Math.random().toString(36).slice(2); }); rows.push(...a); inserted = a; return api; },
        select() { return api; }, single() { return api; },
        update(v) { pend = v; return api; }, eq(c, val) { filt = r => r[c] === val; return api; },
        then(res, rej) { if (pend) rows.filter(filt).forEach(r => Object.assign(r, pend)); return Promise.resolve({ data: (inserted ? inserted[0] : rows.filter(filt)[0]) || null, error: null }).then(res, rej); }
      };
      return api;
    },
    async rpc(name, args) { rpcCalls.push({ name, args }); return state.rpcError ? { data: null, error: { message: state.rpcError } } : { data: { child_no: 'REC-CHILD', parent_no: 'REC-PARENT' }, error: null }; }
  };
  const can = { write: () => state.write, admin: () => state.admin };
  const voucherLocked = d => state.lockedDates.includes(d);
  async function recordVoucherVersion(kind, preRow, postRow, reason, newVer) {
    const has = DB.voucher_versions.some(v => v.voucher_kind === kind && v.voucher_id === preRow.id);
    if (!has) DB.voucher_versions.push({ voucher_kind: kind, voucher_id: preRow.id, version_no: Number(preRow.version || 1), snapshot: preRow, edit_reason: 'سجل أولي · Initial' });
    DB.voucher_versions.push({ voucher_kind: kind, voucher_id: preRow.id, version_no: newVer, snapshot: postRow, edit_reason: reason });
  }
  const nextNo = (p, a) => p + '-' + String((a ? a.length : 0) + 1).padStart(5, '0');
  const genVerificationToken = () => 'TOK' + Math.random().toString(36).slice(2, 8);
  const logAction = async () => {};
  const MODEL2 = { EVENTS: { food_cash_donation: {}, deficit_cash_donation: {}, subscription_payment: {}, historical_debt_collection: {}, food_expense: {}, diwan_expense: {} } };
  const CUR = { full_name: 'tester' }; const CU = { email: 't@t' };
  const win = {}; const module = { exports: {} };
  new Function('window', 'SB', 'DB', 'can', 'voucherLocked', 'recordVoucherVersion', 'nextNo', 'genVerificationToken', 'logAction', 'MODEL2', 'CUR', 'CU', 'module', code)
    (win, SB, DB, can, voucherLocked, recordVoucherVersion, nextNo, genVerificationToken, logAction, MODEL2, CUR, CU, module);
  return { BO: win.BusinessOps || module.exports, DB, rpcCalls, directInserts, state };
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ Business Operations · Slice 2 conformance (BO-04/05) ═══\n');

  /* ---------- BO-04 · Reclassify (full) ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true, lockedDates: [] }); e.DB.receipts.push({ id: 'r1', no: 'REC-1', receipt_date: '2026-06-01', movement_type: 'food_cash_donation', destination_treasury: 'food', amount_ils: 100, version: 1, is_deleted: false }); return e; };
    const good = { movement_type: 'deficit_cash_donation', destination_treasury: 'historical_deficit', movement_reason: 'x' };
    let e = seed(); e.state.admin = false;
    A('BO-04 reject · not administrator', (await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'r1', next: good, reason: 'r' })).code === 'E_AUTH');
    e = seed();
    A('BO-04 reject · missing reason', (await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'r1', next: good, reason: '' })).code === 'E_REASON');
    A('BO-04 reject · inactive/unknown', (await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'nope', next: good, reason: 'r' })).code === 'E_STATE');
    e = seed(); e.state.lockedDates = ['2026-06-01'];
    A('BO-04 reject · locked period', (await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'r1', next: good, reason: 'r' })).code === 'E_LOCKED');
    e = seed();
    A('BO-04 reject · non-explicit classification (Law 4)', (await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'r1', next: { movement_type: 'made_up' }, reason: 'r' })).code === 'E_CLASS');

    e = seed();
    const res = await e.BO.reclassifyVoucher({ kind: 'receipt', id: 'r1', next: good, reason: 'correction' });
    const row = e.DB.receipts[0];
    A('BO-04 accept · classification updated + version bumped', res.ok && row.movement_type === 'deficit_cash_donation' && row.destination_treasury === 'historical_deficit' && row.version === 2);
    A('BO-04 accept · amount unchanged (classification-only)', row.amount_ils === 100);
    A('BO-04 accept · immutable snapshot recorded (L5/L6)', e.DB.voucher_versions.some(v => v.version_no === 2) && e.DB.voucher_versions.some(v => v.version_no === 1));
  }

  /* ---------- BO-05 · Split / Move ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true, lockedDates: [] }); e.DB.receipts.push({ id: 'p0', no: 'REC-P', receipt_date: '2026-06-01', amount: 597, amount_ils: 597, version: 1, is_deleted: false }); return e; };
    const child = { no: 'REC-NEW', amount: 400, amount_ils: 400, movement_type: 'deficit_cash_donation', destination_treasury: 'historical_deficit', parent_ref: 'REC-P' };
    const call = (e, over) => e.BO.splitVoucher(Object.assign({ kind: 'receipt', parentId: 'p0', child, remainNative: 197, remainILS: 197, parentVersion: 2, versionSnapshot: {}, reason: 'move', originalSnapshot: {} }, over));

    let e = seed(); e.state.admin = false;
    A('BO-05 reject · not administrator', (await call(e)).code === 'E_AUTH');
    e = seed();
    A('BO-05 reject · missing reason', (await call(e, { reason: '' })).code === 'E_REASON');
    A('BO-05 reject · parent inactive/unknown', (await call(e, { parentId: 'nope' })).code === 'E_STATE');
    e = seed(); e.state.lockedDates = ['2026-06-01'];
    A('BO-05 reject · locked period', (await call(e)).code === 'E_LOCKED');

    e = seed();
    const res = await call(e);
    A('BO-05 accept · succeeds via certified path', res.ok);
    A('BO-05 · SOLE executor = atomic RPC reclassify_split_atomic', e.rpcCalls.length === 1 && e.rpcCalls[0].name === 'reclassify_split_atomic');
    A('BO-05 · NO bypass (layer wrote no rows directly)', e.directInserts.length === 0);
    const a = e.rpcCalls[0].args;
    A('BO-05 · NO recompute — child forwarded verbatim', a.p_child === child && a.p_child.amount_ils === 400);
    A('BO-05 · NO recompute — retained amounts forwarded verbatim', a.p_remain_amount === 197 && a.p_remain_amount_ils === 197);
    A('BO-05 · parent→child link preserved', a.p_parent_id === 'p0' && a.p_child.parent_ref === 'REC-P');

    /* a guard/atomic rejection surfaces as a failed operation with nothing committed */
    e = seed(); e.state.rpcError = 'CONSTITUTION VIOLATED · Law 10';
    const rej = await call(e);
    A('BO-05 · atomic/guard rejection → operation fails (all-or-nothing)', !rej.ok && rej.code === 'E_ATOMIC');
  }

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 2 CONTRACT SATISFIED' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
