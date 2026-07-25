/* CCR-001 IG-009 — constitutional tests for the FD-034 correction model.
   Rule: approved transactions are NEVER edited; a correction = void the
   incorrect voucher + create a NEW correct voucher that references it.
   Reclassification (BO-04) remains a distinct permitted event (CN-4 · A).
   Register acceptance: an "edit" produces a voided original + new referencing
   voucher; NO UPDATE of financial fields on approved rows.
   Loads the real operations.js. Usage: node tests/void-replace.test.cjs */
'use strict';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── in-memory Supabase stub (records every write) ── */
const tables = { receipts: [], payments: [], voucher_versions: [] };
let seq = 100;
const writes = [];            /* {tbl, op, payload, id} */
const opts = { failVoidId: null };
global.window = {};
global.SB = {
  from(tbl) {
    return {
      insert(row) {
        return { select() { return { async single() {
          const r = Object.assign({ id: 'id' + (++seq) }, row);
          tables[tbl].push(r); writes.push({ tbl, op: 'insert', payload: row, id: r.id });
          return { data: r, error: null };
        } }; } };
      },
      update(upd) {
        return { async eq(col, val) {
          writes.push({ tbl, op: 'update', payload: upd, id: val });
          if (opts.failVoidId && val === opts.failVoidId) return { error: { message: 'void-fail' } };
          const r = tables[tbl].find(x => x[col] === val);
          if (r) Object.assign(r, upd);
          return { error: null };
        } };
      },
    };
  },
};
global.can = { admin: () => true, write: () => true };
global.voucherLocked = d => !!d && Number(String(d).slice(0, 4)) <= 2025;   /* locked through 2025 */
global.nextNo = prefix => prefix + '-NEW-' + (++seq);
global.genVerificationToken = () => 'tok' + seq;
const versions = [];
global.recordVoucherVersion = async (kind, pre, post, reason, ver) => { versions.push({ kind, pre, post, reason, ver }); };
global.logAction = async () => {};
global.MODEL2 = { EVENTS: { subscription_payment: {}, diwan_cash_donation: {} } };
const BO = require('../public/js/operations.js');
global.DB = { receipts: tables.receipts, payments: tables.payments };

const mkRec = (over) => Object.assign({
  id: 'orig' + (++seq), no: 'REC-' + seq, fund_type: 'food', receipt_date: '2026-03-01',
  payer_type: 'member', member_id: 'M1', amount: 100, amount_ils: 100, currency: 'ILS',
  notes: 'أصل', movement_type: 'subscription_payment', is_deleted: false, version: 1,
  verification_token: 'tokX', created_by: 'x', created_at: '2026-03-01T00:00:00Z',
}, over || {});

(async () => {

  /* 1 · correction = voided original + NEW referencing voucher */
  const r1 = mkRec(); tables.receipts.push(r1);
  const res1 = await BO.editVoucher({ kind: 'receipt', id: r1.id, changes: { amount_ils: 150, notes: 'مصحّح' }, reason: 'مبلغ خاطئ' });
  ok(res1.ok === true && res1.no && res1.no !== r1.no, 'correction succeeds and returns a NEW voucher number (' + res1.no + ')');
  const repl1 = tables.receipts.find(x => x.no === res1.no);
  ok(!!repl1 && repl1.amount_ils === 150 && repl1.is_deleted !== true, 'replacement voucher active with the corrected amount');
  ok(String(repl1.notes).includes('تصحيح للسند ' + r1.no), 'replacement references the voided voucher (FD-034)');
  ok(r1.is_deleted === true, 'original voucher voided');
  ok(r1.amount_ils === 100 && r1.amount === 100 && r1.member_id === 'M1', 'original financial fields UNTOUCHED');
  ok(repl1.id !== r1.id && repl1.verification_token !== 'tokX', 'replacement has its own identity (id + token)');

  /* 2 · no UPDATE of financial fields on the approved row (register criterion) */
  const updOrig = writes.filter(w => w.op === 'update' && w.id === r1.id);
  ok(updOrig.length === 1 && Object.keys(updOrig[0].payload).sort().join(',') === 'is_deleted,updated_at,version',
    'the only UPDATE on the approved row is the void marker (is_deleted/version/updated_at)');

  /* 3 · immutable snapshot records the void + forward reference */
  const v1 = versions[versions.length - 1];
  ok(v1 && v1.post.is_deleted === true && v1.reason.includes(res1.no) && v1.reason.includes('FD-034'),
    'version snapshot carries the void + reference to the replacement');

  /* 4 · closed-year voucher cannot be corrected (FD-004 gate intact) */
  const r2 = mkRec({ receipt_date: '2025-06-01' }); tables.receipts.push(r2);
  const res2 = await BO.editVoucher({ kind: 'receipt', id: r2.id, changes: { amount_ils: 999 }, reason: 'x' });
  ok(res2.ok === false && res2.code === 'E_LOCKED' && r2.is_deleted === false, 'locked-year correction refused, nothing changed');

  /* 5 · reason mandatory */
  const r3 = mkRec(); tables.receipts.push(r3);
  const res3 = await BO.editVoucher({ kind: 'receipt', id: r3.id, changes: { amount_ils: 120 } });
  ok(res3.ok === false && res3.code === 'E_REASON' && r3.is_deleted === false, 'correction without reason refused');

  /* 6 · void failure → replacement compensated, no net change */
  const r4 = mkRec(); tables.receipts.push(r4);
  opts.failVoidId = r4.id;
  const res4 = await BO.editVoucher({ kind: 'receipt', id: r4.id, changes: { amount_ils: 300 }, reason: 'x' });
  opts.failVoidId = null;
  const repl4 = tables.receipts.filter(x => String(x.notes || '').includes('تصحيح للسند ' + r4.no))[0];
  ok(res4.ok === false && r4.is_deleted === false, 'void failure → operation fails, original stays active');
  ok(!!repl4 && repl4.is_deleted === true, 'void failure → replacement withdrawn (compensated)');

  /* 7 · reclassification stays a distinct in-place event (CN-4 · A exemption) */
  const r5 = mkRec(); tables.receipts.push(r5);
  const before = tables.receipts.length;
  const res5 = await BO.reclassifyVoucher({ kind: 'receipt', id: r5.id,
    next: { movement_type: 'diwan_cash_donation', destination_treasury: 'diwan' }, reason: 'تصنيف' });
  ok(res5.ok === true && r5.is_deleted === false && r5.movement_type === 'diwan_cash_donation'
    && tables.receipts.length === before, 'reclassify updates classification in place — no void, no new voucher');

  /* 8 · cancel (BO-03) unchanged: terminal void without replacement */
  const r6 = mkRec(); tables.receipts.push(r6);
  const cnt = tables.receipts.length;
  const res6 = await BO.cancelVoucher({ kind: 'receipt', id: r6.id });
  ok(res6.ok === true && r6.is_deleted === true && tables.receipts.length === cnt, 'cancel voids without creating a voucher');

  /* 9 · payment correction follows the same model */
  const p1 = Object.assign(mkRec(), { payment_date: '2026-04-01', beneficiary_name: 'مورد' });
  delete p1.receipt_date; tables.payments.push(p1);
  const res7 = await BO.editVoucher({ kind: 'payment', id: p1.id, changes: { amount_ils: 80 }, reason: 'سبب' });
  const repl7 = tables.payments.find(x => x.no === res7.no);
  ok(res7.ok === true && p1.is_deleted === true && !!repl7 && repl7.amount_ils === 80
    && String(repl7.notes).includes(p1.no), 'payment: voided original + referencing replacement');

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
