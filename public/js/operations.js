/* ═══ BUSINESS OPERATIONS LAYER — P1 · Slice 1 (BO-01/02/03) ═════════════════
   The formal Business Operations layer specified by P1-000 (Part A) over the
   certified P0 accounting core. It makes the voucher lifecycle operations —
   Create (BO-01), Edit (BO-02), Cancel (BO-03) — first-class: each enforces its
   Part A contract (authority → preconditions → certified write → immutable
   history), fail-closed, and routes through the CURRENT certified implementation
   (Part B) without bypassing the contract.

   It does NOT re-implement any accounting math: the money-critical work stays in
   the certified core (the same table writes, the same recordVoucherVersion audit
   trail — V8 — the same uniqueness — V4 — and, for split/move which is NOT in this
   slice, the guarded RPC — V1/V9). Form reading, classification-at-capture and UX
   confirmations remain in the thin UI adapters (crud.js); this layer owns the
   operation contract and the certified write only.

   Classic script — shares the global scope with the rest of the engine (SB, DB,
   can, recordVoucherVersion, nextNo, genVerificationToken, voucherLocked,
   logAction, MODEL2, CUR/CU), exactly as crud.js references FIN.

   Every method returns a structured result: {ok:true, data} | {ok:false, code, error}.
   A false result means the contract rejected the operation and NO state changed. */
(function () {
  'use strict';

  const now = () => new Date().toISOString();
  const tableOf = k => (k === 'payment' ? 'payments' : 'receipts');
  const dateOf = (k, row) => (k === 'payment' ? row.payment_date : row.receipt_date);
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const fail = (code, msg) => ({ ok: false, code, error: msg });
  const editor = () => (typeof CUR !== 'undefined' && CUR && CUR.full_name)
    || (typeof CU !== 'undefined' && CU && CU.email) || 'admin';
  const isLocked = d => (typeof voucherLocked === 'function' ? voucherLocked(d) : false);
  const eventValid = mt => {
    const M = (typeof MODEL2 !== 'undefined' && MODEL2) || (typeof window !== 'undefined' && window.MODEL2);
    return !!(M && M.EVENTS && M.EVENTS[mt]);   /* Law 4 — classification must be an explicit model event */
  };

  /* ── Part A contract metadata (declarative; the single formal definition) ── */
  const CONTRACT = {
    'BO-01': { id: 'BO-01', name: 'Create Voucher', authority: 'write',
      preconditions: ['authorized', 'amount>0', 'date not in locked year', 'explicit valid classification', 'unique number'],
      lifecycle: '(none) → ACTIVE(v1)', laws: [1, 4, 8, 11, 12] },
    'BO-02': { id: 'BO-02', name: 'Edit Voucher', authority: 'admin',
      preconditions: ['administrator', 'voucher active', 'not locked (source & target date)', 'reason present', 'amount>0'],
      lifecycle: 'ACTIVE → ACTIVE′(v n+1)', laws: [5, 6, 11] },
    'BO-03': { id: 'BO-03', name: 'Cancel Voucher', authority: 'admin',
      preconditions: ['administrator', 'voucher active', 'not locked'],
      lifecycle: 'ACTIVE → CANCELLED(v n+1)', laws: [5, 6, 11] }
  };

  /* ── BO-01 · Create Voucher ──────────────────────────────────────────────
     payload: the fully-built column object (classification included), WITHOUT
     no / verification_token / created_by — the operation owns those (Law 12/4). */
  async function createVoucher({ kind, payload, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.write()) return fail('E_AUTH', 'ليس لديك صلاحية');
    if (!payload || typeof payload !== 'object') return fail('E_INPUT', 'بيانات السند مفقودة');
    const amt = Number(payload.amount_ils != null ? payload.amount_ils : payload.amount) || 0;
    if (!(amt > 0)) return fail('E_AMOUNT', 'المبلغ يجب أن يكون أكبر من صفر');
    if (isLocked(dateOf(kind, payload))) return fail('E_LOCKED', '🔒 السنة المالية مقفلة — لا يمكن إنشاء سند بتاريخ ضمن سنة مقفلة');
    if (!payload.movement_type || !eventValid(payload.movement_type)) return fail('E_CLASS', 'التصنيف غير صريح أو غير معتمد (Law 4)');

    const tbl = tableOf(kind);
    const arr = (typeof DB !== 'undefined' && DB[tbl]) || [];
    const no = nextNo(kind === 'payment' ? 'PAY' : 'REC', arr);          /* Law 12 — unique identity */
    const row = Object.assign({}, payload, {
      no, verification_token: genVerificationToken(), created_by: editor()
    });
    const { data, error } = await SB.from(tbl).insert(row).select().single();
    if (error) return fail('E_WRITE', error.message);
    const lbl = (typeof logLabel === 'function') ? logLabel(no) : (logLabel || `إضافة سند ${no}`);
    try { await logAction('add', lbl, tbl, data && data.id); } catch (_) {}
    return { ok: true, data, no };
  }

  /* ── BO-02 · Edit Voucher ────────────────────────────────────────────────
     changes: the pre-built edit set (amount_ils / notes / member / allocation …),
     WITHOUT version / updated_at — the operation bumps the version and records the
     immutable snapshot (V8/Law 5/6). Classification fields must not be edited here. */
  async function editVoucher({ kind, id, changes, reason, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const tbl = tableOf(kind);
    const row = (typeof DB !== 'undefined' && DB[tbl] || []).find(x => x.id === id);
    if (!row || row.is_deleted) return fail('E_STATE', 'السند غير موجود أو غير نشط');
    if (isLocked(dateOf(kind, row))) return fail('E_LOCKED', '🔒 السنة المالية مقفلة — لا يمكن تعديل هذا السند');
    if (!reason || !String(reason).trim()) return fail('E_REASON', '✋ سبب التعديل إلزامي');
    if (changes && changes.amount_ils != null && !(Number(changes.amount_ils) > 0)) return fail('E_AMOUNT', 'مبلغ غير صالح');
    const tgtDate = changes && (kind === 'payment' ? changes.payment_date : changes.receipt_date);
    if (tgtDate && isLocked(tgtDate)) return fail('E_LOCKED', '🔒 لا يمكن نقل السند إلى سنة مقفلة');

    const preRow = Object.assign({}, row);               /* immutable pre-state (Law 5 baseline) */
    const newVer = Number(row.version || 1) + 1;
    const upd = Object.assign({}, changes, { version: newVer, updated_at: now() });
    const { error } = await SB.from(tbl).update(upd).eq('id', id);
    if (error) return fail('E_WRITE', error.message);
    try { await recordVoucherVersion(kind, preRow, Object.assign({}, preRow, upd), String(reason).trim(), newVer); }
    catch (e) { return fail('E_HISTORY', e.message); }   /* history is part of the contract — fail if it can't be recorded */
    try { await logAction('edit', logLabel || `تعديل سند ${row.no} (نسخة ${newVer})`, tbl, id); } catch (_) {}
    return { ok: true, data: { version: newVer }, no: row.no };
  }

  /* ── BO-03 · Cancel Voucher ──────────────────────────────────────────────
     Terminal for money; the full pre-cancel state and the cancellation are kept as
     an immutable version snapshot (V8/Law 5/6). is_deleted excludes it everywhere. */
  async function cancelVoucher({ kind, id, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const tbl = tableOf(kind);
    const row = (typeof DB !== 'undefined' && DB[tbl] || []).find(x => x.id === id);
    if (!row || row.is_deleted) return fail('E_STATE', 'السند غير موجود أو أُلغي مسبقاً');
    if (isLocked(dateOf(kind, row))) return fail('E_LOCKED', '🔒 السنة المالية مقفلة — لا يمكن إلغاء هذا السند');

    const preRow = Object.assign({}, row);               /* immutable pre-state (Law 5 baseline) */
    const newVer = Number(row.version || 1) + 1;
    const upd = { is_deleted: true, version: newVer, updated_at: now() };
    const { error } = await SB.from(tbl).update(upd).eq('id', id);
    if (error) return fail('E_WRITE', error.message);
    try { await recordVoucherVersion(kind, preRow, Object.assign({}, preRow, upd), 'إلغاء · Cancellation', newVer); }
    catch (e) { return fail('E_HISTORY', e.message); }
    try { await logAction('delete', logLabel || `إلغاء سند ${row.no} (نسخة ${newVer})`, tbl, id); } catch (_) {}
    return { ok: true, data: { version: newVer }, no: row.no };
  }

  const BusinessOps = { version: 1, CONTRACT, createVoucher, editVoucher, cancelVoucher };
  if (typeof window !== 'undefined') window.BusinessOps = BusinessOps;
  if (typeof module !== 'undefined' && module.exports) module.exports = BusinessOps;
})();
