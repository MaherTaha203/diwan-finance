/* ═══════════════════════════════════════════════════════════════════════════
   BUSINESS OPERATIONS — Slice 1 conformance proof  ·  P1 (BO-01 / BO-02 / BO-03)
   ───────────────────────────────────────────────────────────────────────────
   Proves the formal Business Operations layer (public/js/operations.js) honours
   the P1-000 Part A contract for the voucher lifecycle operations, fail-closed,
   and routes through the certified implementation (Part B) without bypass:

     BO-01 Create : authority · amount>0 · not-locked · explicit valid class (L4)
                    · unique number (L12) · certified insert.
     BO-02 Edit   : administrator · active · not-locked (source & target) · reason
                    · version bump + immutable snapshot (L5/L6).
     BO-03 Cancel : administrator · active · not-locked · is_deleted + version bump
                    + immutable snapshot (L5/L6).

   It loads operations.js in a shared scope with injected stubs for the globals it
   references (the same technique the golden framework uses for the engine), so the
   contract is exercised headlessly. The end-to-end behaviour of these operations
   through the real DOM handlers is separately covered by tests/e2e-acceptance.cjs.

   Run:  node tests/business-operations-slice1.cjs   ·  exit 0 = contract satisfied.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'operations.js'), 'utf8');

/* ── in-memory certified-core stubs (Part B doubles) ── */
function makeEnv(state) {
  const DB = { receipts: [], payments: [], voucher_versions: [] };
  const SB = { from(tbl) {
    let rows = DB[tbl] || (DB[tbl] = []); let inserted = null; let pend = null; let filt = r => true;
    const api = {
      insert(v) { const a = Array.isArray(v) ? v : [v]; a.forEach(x => { if (!x.id) x.id = 'id' + Math.random().toString(36).slice(2); }); rows.push(...a); inserted = a; return api; },
      select() { return api; }, single() { return api; },
      update(v) { pend = v; return api; }, eq(c, val) { filt = r => r[c] === val; return api; },
      then(res, rej) { if (pend) rows.filter(filt).forEach(r => Object.assign(r, pend)); return Promise.resolve({ data: (inserted ? inserted[0] : rows.filter(filt)[0]) || null, error: null }).then(res, rej); }
    };
    return api;
  } };
  const can = { write: () => state.write, admin: () => state.admin };
  const voucherLocked = d => state.lockedDates.includes(d);
  /* faithful V8 double: backfill v1 baseline on first versioning, then the transition */
  async function recordVoucherVersion(kind, preRow, postRow, reason, newVer) {
    const has = DB.voucher_versions.some(v => v.voucher_kind === kind && v.voucher_id === preRow.id);
    if (!has) DB.voucher_versions.push({ voucher_kind: kind, voucher_id: preRow.id, voucher_no: preRow.no, version_no: Number(preRow.version || 1), snapshot: preRow, edit_reason: 'سجل أولي · Initial' });
    DB.voucher_versions.push({ voucher_kind: kind, voucher_id: preRow.id, voucher_no: preRow.no, version_no: newVer, snapshot: postRow, edit_reason: reason });
  }
  const nextNo = (prefix, arr) => prefix + '-' + String((arr ? arr.length : 0) + 1).padStart(5, '0');
  const genVerificationToken = () => 'TOK' + Math.random().toString(36).slice(2, 10);
  const logAction = async () => {};
  const MODEL2 = { EVENTS: { food_expense: {}, diwan_expense: {}, subscription_payment: {}, food_cash_donation: {}, deficit_cash_donation: {} } };
  const CUR = { full_name: 'tester' }; const CU = { email: 't@t' };
  const win = {};
  const module = { exports: {} };
  const runner = new Function('window', 'SB', 'DB', 'can', 'voucherLocked', 'recordVoucherVersion',
    'nextNo', 'genVerificationToken', 'logAction', 'MODEL2', 'CUR', 'CU', 'module', code);
  runner(win, SB, DB, can, voucherLocked, recordVoucherVersion, nextNo, genVerificationToken, logAction, MODEL2, CUR, CU, module);
  return { BO: win.BusinessOps || module.exports, DB, state };
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ Business Operations · Slice 1 conformance (BO-01/02/03) ═══\n');

  /* ---------- BO-01 · Create ---------- */
  {
    const goodPayload = () => ({ fund_type: 'food', receipt_date: '2026-06-01', movement_type: 'food_cash_donation', destination_treasury: 'food', amount: 100, amount_ils: 100, currency: 'ILS', exchange_rate: 1 });
    let e = makeEnv({ write: false, admin: false, lockedDates: [] });
    A('BO-01 reject · unauthorized', (await e.BO.createVoucher({ kind: 'receipt', payload: goodPayload() })).code === 'E_AUTH');

    e = makeEnv({ write: true, admin: false, lockedDates: [] });
    A('BO-01 reject · amount<=0', (await e.BO.createVoucher({ kind: 'receipt', payload: Object.assign(goodPayload(), { amount: 0, amount_ils: 0 }) })).code === 'E_AMOUNT');
    A('BO-01 reject · locked year', (await makeEnv({ write: true, admin: false, lockedDates: ['2026-06-01'] }).BO.createVoucher({ kind: 'receipt', payload: goodPayload() })).code === 'E_LOCKED');
    A('BO-01 reject · non-explicit classification (L4)', (await e.BO.createVoucher({ kind: 'receipt', payload: Object.assign(goodPayload(), { movement_type: 'made_up_type' }) })).code === 'E_CLASS');

    e = makeEnv({ write: true, admin: false, lockedDates: [] });
    const r = await e.BO.createVoucher({ kind: 'receipt', payload: goodPayload() });
    A('BO-01 accept · certified insert', r.ok && e.DB.receipts.length === 1, 'no=' + (r.no || ''));
    A('BO-01 accept · unique number allocated (L12)', !!r.no && !!e.DB.receipts[0].verification_token);
    A('BO-01 accept · created_by stamped', e.DB.receipts[0].created_by === 'tester');
  }

  /* ---------- BO-02 · Edit ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true, lockedDates: [] }); e.DB.receipts.push({ id: 'x1', no: 'REC-1', receipt_date: '2026-06-01', amount_ils: 100, version: 1, is_deleted: false }); return e; };
    let e = seed(); e.state.admin = false;
    A('BO-02 reject · not administrator', (await e.BO.editVoucher({ kind: 'receipt', id: 'x1', changes: { amount_ils: 150 }, reason: 'r' })).code === 'E_AUTH');
    e = seed();
    A('BO-02 reject · missing reason', (await e.BO.editVoucher({ kind: 'receipt', id: 'x1', changes: { amount_ils: 150 }, reason: '' })).code === 'E_REASON');
    A('BO-02 reject · unknown/inactive voucher', (await e.BO.editVoucher({ kind: 'receipt', id: 'nope', changes: { amount_ils: 150 }, reason: 'r' })).code === 'E_STATE');
    e = seed(); e.state.lockedDates = ['2026-06-01'];
    A('BO-02 reject · locked voucher', (await e.BO.editVoucher({ kind: 'receipt', id: 'x1', changes: { amount_ils: 150 }, reason: 'r' })).code === 'E_LOCKED');

    e = seed();
    const res = await e.BO.editVoucher({ kind: 'receipt', id: 'x1', changes: { amount_ils: 150, notes: 'edited' }, reason: 'correction' });
    const row = e.DB.receipts[0];
    A('BO-02 accept · change applied + version bumped', res.ok && row.amount_ils === 150 && row.version === 2, 'v=' + row.version);
    A('BO-02 accept · immutable snapshot recorded (L5/L6)', e.DB.voucher_versions.length === 2 && e.DB.voucher_versions.some(v => v.version_no === 2 && v.edit_reason === 'correction'));
    A('BO-02 accept · v1 baseline preserved (reconstructible)', e.DB.voucher_versions.some(v => v.version_no === 1));
  }

  /* ---------- BO-03 · Cancel ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true, lockedDates: [] }); e.DB.payments.push({ id: 'p1', no: 'PAY-1', payment_date: '2026-06-02', amount_ils: 90, version: 1, is_deleted: false }); return e; };
    let e = seed(); e.state.admin = false;
    A('BO-03 reject · not administrator', (await e.BO.cancelVoucher({ kind: 'payment', id: 'p1' })).code === 'E_AUTH');
    e = seed(); e.state.lockedDates = ['2026-06-02'];
    A('BO-03 reject · locked voucher', (await e.BO.cancelVoucher({ kind: 'payment', id: 'p1' })).code === 'E_LOCKED');

    e = seed();
    const res = await e.BO.cancelVoucher({ kind: 'payment', id: 'p1' });
    const row = e.DB.payments[0];
    A('BO-03 accept · is_deleted set + version bumped', res.ok && row.is_deleted === true && row.version === 2, 'v=' + row.version);
    A('BO-03 accept · cancellation snapshot recorded (V8/L5/L6)', e.DB.voucher_versions.some(v => v.version_no === 2 && v.edit_reason === 'إلغاء · Cancellation'));
    A('BO-03 accept · original ACTIVE state preserved', e.DB.voucher_versions.some(v => v.snapshot && v.snapshot.is_deleted !== true));
    A('BO-03 reject · double cancel', (await e.BO.cancelVoucher({ kind: 'payment', id: 'p1' })).code === 'E_STATE');
  }

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 1 CONTRACT SATISFIED' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
