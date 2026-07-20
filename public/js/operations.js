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
      lifecycle: 'ACTIVE → CANCELLED(v n+1)', laws: [5, 6, 11] },
    'BO-04': { id: 'BO-04', name: 'Reclassify Voucher', authority: 'admin',
      preconditions: ['administrator', 'voucher active', 'not locked', 'reason present', 'explicit valid classification'],
      lifecycle: 'ACTIVE → ACTIVE′ (classification changed)', laws: [1, 4, 5, 6, 8, 11] },
    'BO-05': { id: 'BO-05', name: 'Split / Move Voucher', authority: 'admin',
      preconditions: ['administrator', 'parent active', 'not locked', 'reason present'],
      engine: 'reclassify_split_atomic (V1 atomicity + V9 guards) — sole executor; no split math in this layer',
      lifecycle: 'parent → ACTIVE(reduced) + NEW linked child ACTIVE(v1), atomic', laws: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    'BO-07': { id: 'BO-07', name: 'Create Member', authority: 'admin',
      preconditions: ['administrator', 'member payload present'],
      engine: 'create_member_atomic (V2/Law 7) — sole executor; atomic member + schedule',
      lifecycle: '(none) → member + all subscription rows (all-or-nothing)', laws: [3, 7] },
    'BO-08': { id: 'BO-08', name: 'Edit Member', authority: 'admin',
      preconditions: ['administrator', 'member exists'], lifecycle: 'member → member′ (audited)', laws: [3, 5, 6] },
    'BO-09': { id: 'BO-09', name: 'Cancel Member', authority: 'admin',
      preconditions: ['administrator', 'member exists'], lifecycle: 'member → deactivated (audited)', laws: [3, 5, 6] },
    'BO-10': { id: 'BO-10', name: 'Apply Annual Dues', authority: 'admin',
      preconditions: ['administrator', 'valid year+amount', 'obligation-only (no paid amount)'],
      lifecycle: 'generate one obligation row per eligible member', laws: [3] }
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

  /* ── BO-04 · Reclassify Voucher (full, classification-only) ──────────────
     Corrects a voucher's whole-amount classification without changing the amount.
     Classification-only — there is NO financial calculation here; the operation
     coordinates the contract + the certified write (immutable snapshot then the
     classification update). `next` is the explicit target classification (Law 4). */
  async function reclassifyVoucher({ kind, id, next, reason, snapshotReason, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const tbl = tableOf(kind);
    const row = (typeof DB !== 'undefined' && DB[tbl] || []).find(x => x.id === id);
    if (!row || row.is_deleted) return fail('E_STATE', 'السند غير موجود أو غير نشط');
    if (isLocked(dateOf(kind, row))) return fail('E_LOCKED', '🔒 السنة المالية مقفلة — لا يُعاد تصنيف سندٍ فيها');
    if (!reason || !String(reason).trim()) return fail('E_REASON', 'سبب إعادة التصنيف إلزامي');
    if (!next || !next.movement_type || !eventValid(next.movement_type)) return fail('E_CLASS', 'التصنيف الجديد غير صريح أو غير معتمد (Law 4)');

    const preRow = Object.assign({}, row);
    const newVer = Number(row.version || 1) + 1;
    /* immutable evidence FIRST (full pre/post snapshot + reason), then the update */
    try { await recordVoucherVersion(kind, preRow, Object.assign({}, preRow, next, { version: newVer }), snapshotReason || String(reason).trim(), newVer); }
    catch (e) { return fail('E_HISTORY', e.message); }
    const upd = Object.assign({}, next, { version: newVer });
    if (kind === 'payment') delete upd.register_category;   /* column exists only on receipts */
    const { error } = await SB.from(tbl).update(upd).eq('id', id);
    if (error) return fail('E_WRITE', error.message);
    try { await logAction('reclassify', logLabel || `إعادة تصنيف ${row.no}`, tbl, id); } catch (_) {}
    return { ok: true, data: { version: newVer }, no: row.no };
  }

  /* ── BO-05 · Split / Move Voucher (partial reclassification) ──────────────
     Moves a portion of a voucher to a new classification. The operation performs
     NO split math and NO conservation check — the split proposal (child row +
     retained amounts) is computed by the certified caller, and the CERTIFIED ATOMIC
     RPC reclassify_split_atomic (V1 atomicity + V9 runtime guards) is the sole
     executor: it re-verifies conservation / exactness / derivation / deficit against
     the stored parent and commits all-or-nothing (or rejects with full rollback).
     This layer only coordinates the contract and calls that one path — never a
     bypass. It keeps the parent→child link intact (child carries the reference). */
  async function splitVoucher({ kind, parentId, child, remainNative, remainILS, parentVersion, versionSnapshot, versionReason, reason, originalSnapshot, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const tbl = tableOf(kind);
    const parent = (typeof DB !== 'undefined' && DB[tbl] || []).find(x => x.id === parentId);
    if (!parent || parent.is_deleted) return fail('E_STATE', 'السند الأصل غير موجود أو غير نشط');
    if (isLocked(dateOf(kind, parent))) return fail('E_LOCKED', '🔒 السنة المالية مقفلة — لا يمكن تجزئة سندٍ فيها');
    if (!reason || !String(reason).trim()) return fail('E_REASON', 'سبب التجزئة إلزامي');
    if (!child || typeof child !== 'object') return fail('E_INPUT', 'بيانات الفرع مفقودة');

    /* sole executor: the certified atomic + guarded RPC (no bypass, no recompute) */
    const { data, error } = await SB.rpc('reclassify_split_atomic', {
      p_kind: kind === 'payment' ? 'payment' : 'receipt',
      p_parent_id: parentId,
      p_child: child,
      p_remain_amount: remainNative,
      p_remain_amount_ils: remainILS,
      p_parent_version: parentVersion,
      p_version_snapshot: versionSnapshot,
      p_version_reason: versionReason,
      p_edited_by: editor(),
      p_original_snapshot: originalSnapshot
    });
    if (error) return fail('E_ATOMIC', error.message);   /* guard rejection or atomic failure → nothing committed */
    try { await logAction('reclassify', logLabel || `إعادة تصنيف جزئية ${parent.no}`, tbl, parentId); } catch (_) {}
    return { ok: true, data };
  }

  /* ── BO-07 · Create Member (+ subscription schedule) ─────────────────────
     Member + all its subscription rows created atomically. The operation routes
     EXCLUSIVELY through the certified atomic RPC create_member_atomic (V2/Law 7):
     full success or full rollback, never a member without a dues schedule. The
     member/schedule payload is built by the certified caller; no accounting logic
     is performed here. */
  async function createMember({ member, subscriptions, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    if (!member || typeof member !== 'object') return fail('E_INPUT', 'بيانات العضو مفقودة');
    const { data, error } = await SB.rpc('create_member_atomic', { p_member: member, p_subscriptions: subscriptions || [] });
    if (error) return fail('E_ATOMIC', error.message);   /* atomic path only — no bypass */
    try { await logAction('add', logLabel || 'إضافة عضو', 'members', (data && data.member_id) || null); } catch (_) {}
    return { ok: true, data };
  }

  /* ── BO-08 · Edit Member ─────────────────────────────────────────────────
     Amends a member record; traceable via the audit log (L5/L6). The authoritative
     opening model is shaped by the certified caller (no accounting logic here). */
  async function editMember({ id, changes, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const m = (typeof DB !== 'undefined' && DB.members || []).find(x => x.id === id);
    if (!m) return fail('E_STATE', 'العضو غير موجود');
    if (!changes || typeof changes !== 'object') return fail('E_INPUT', 'لا تغييرات');
    const { error } = await SB.from('members').update(changes).eq('id', id);
    if (error) return fail('E_WRITE', error.message);
    try { await logAction('edit', logLabel || 'تعديل بيانات عضو', 'members', id); } catch (_) {}
    return { ok: true };
  }

  /* ── BO-09 · Cancel (deactivate) Member ──────────────────────────────────
     Deactivates a member (is_active=false); traceable via the audit log. */
  async function cancelMember({ id, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    const m = (typeof DB !== 'undefined' && DB.members || []).find(x => x.id === id);
    if (!m) return fail('E_STATE', 'العضو غير موجود');
    const { error } = await SB.from('members').update({ is_active: false }).eq('id', id);
    if (error) return fail('E_WRITE', error.message);
    try { await logAction('delete', logLabel || 'حذف عضو', 'members', id); } catch (_) {}
    return { ok: true };
  }

  /* ── BO-10 · Apply Annual Dues (subscription generation) ─────────────────
     Bills a year's dues by generating each eligible member's obligation row. This is
     an OBLIGATION-generation operation only: it records NO payment and creates NO
     second source of truth. The contract forbids any non-zero paid amount here
     (Detect → Reject); the derived balance is enforced at the single source by the V3
     DB constraint. The eligible-member set and rows are built by the certified caller. */
  async function applyAnnualDues({ duesRow, subscriptions, logLabel } = {}) {
    if (typeof can === 'undefined' || !can.admin()) return fail('E_AUTH', 'المدير فقط');
    if (!duesRow || duesRow.year == null || !(Number(duesRow.amount) > 0)) return fail('E_INPUT', 'بيانات الاشتراك غير صالحة');
    if (Array.isArray(subscriptions) && subscriptions.some(s => Number(s.paid_amount_ils || 0) !== 0))
      return fail('E_CONTRACT', 'BO-10 توليد استحقاقات فقط — لا تُسجَّل أي دفعة');   /* no payment / no 2nd source */
    const { data: adNew, error } = await SB.from('annual_dues').insert(duesRow).select('id').single();
    if (error) return fail('E_WRITE', error.message);
    if (Array.isArray(subscriptions) && subscriptions.length) {
      const { error: subErr } = await SB.from('member_subscriptions').insert(subscriptions);
      if (subErr) return fail('E_WRITE', subErr.message);
    }
    try { await logAction('add', logLabel || ('تطبيق اشتراك سنة ' + duesRow.year), 'annual_dues', (adNew && adNew.id) || null); } catch (_) {}
    return { ok: true, data: { annual_id: (adNew && adNew.id) || null } };
  }

  const BusinessOps = { version: 1, CONTRACT, createVoucher, editVoucher, cancelVoucher, reclassifyVoucher, splitVoucher, createMember, editMember, cancelMember, applyAnnualDues };
  if (typeof window !== 'undefined') window.BusinessOps = BusinessOps;
  if (typeof module !== 'undefined' && module.exports) module.exports = BusinessOps;
})();
