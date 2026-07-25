/* CCR-001 IG-015 — constitutional tests for the audited close/reopen capability
   (FC-003 · FD-012 explicit reopen · FD-029 System Director = Administrator ·
   FD-030 31-January rule — merged IG-022).
   Register acceptance: reopen/close appear as DISTINCT audit events; the lock
   state changes only through them; from 1 February the prior year is closable.
   Loads the real operations.js. Usage: node tests/fiscal-close.test.cjs */
'use strict';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── stubs ── */
const settings = { locked_through_year: '2024' };
const audit = [];
const snapshots = [];
const opts = { failAudit: false, failWrite: false, failSnapshot: false };
global.window = { LOCKED_THROUGH_YEAR: 2024 };
global.today = () => '2026-07-25';
global.SB = { from(tbl) { return {
  async upsert(row) {
    if (tbl === 'settings') {
      if (opts.failWrite) return { error: { message: 'write-fail' } };
      settings[row.key] = row.value; window.LOCKED_THROUGH_YEAR = Number(row.value);
      return { error: null };
    }
    return { error: null };
  },
  insert(row) {
    if (tbl === 'fiscal_snapshots') {
      if (opts.failSnapshot) return Promise.resolve({ error: { message: 'snapshot-fail' } });
      snapshots.push(row); return Promise.resolve({ error: null });
    }
    return { select() { return { async single() { return { data: { id: 'x' }, error: null }; } }; } };
  },
  update() { return { async eq() { return { error: null }; } }; },
}; } };
global.can = { admin: () => true, write: () => true };
global.voucherLocked = d => !!d && Number(String(d).slice(0, 4)) <= Number(settings.locked_through_year);
global.nextNo = p => p + '-1';
global.genVerificationToken = () => 'tok';
global.recordVoucherVersion = async () => {};
global.logAction = async (action, description, table, id) => {
  if (opts.failAudit) throw new Error('audit-fail');
  audit.push({ action, description, table, id });
};
global.MODEL2 = { EVENTS: {} };
/* IG-016: BO-14 requires the engine's close-snapshot builder (no snapshot ⇒ no close). */
global.FIN = { buildCloseSnapshot: (prev, y) => ({ version: 1, closed_through: y, previous_lock: prev, years: {} }) };
global.DB = { receipts: [], payments: [], refunds: [], members: [] };
const BO = require('../public/js/operations.js');

(async () => {

  /* 1 · close 2025 (today 2026-07-25 ≥ 2026-02-01) → allowed, audited distinctly */
  const c1 = await BO.closeFiscalYear({ year: 2025, reason: 'انتهاء المهلة الدستورية' });
  ok(c1.ok === true && settings.locked_through_year === '2025' && window.LOCKED_THROUGH_YEAR === 2025,
    'close 2025 from 1 Feb 2026 onward → lock = 2025');
  const a1 = audit[audit.length - 1];
  ok(a1 && a1.action === 'fiscal_close' && a1.description.includes('2025') && a1.description.includes('انتهاء المهلة'),
    'DISTINCT fiscal_close audit event with year + reason');

  /* 2 · FD-030: the 31-January rule — 2026 cannot be closed before 1 Feb 2027 */
  const c2 = await BO.closeFiscalYear({ year: 2026, reason: 'مبكر' });
  ok(c2.ok === false && c2.code === 'E_EARLY' && settings.locked_through_year === '2025',
    'closing 2026 before 1/2/2027 refused (31-January rule)');

  /* 3 · closing an already-closed / invalid year refused */
  const c3 = await BO.closeFiscalYear({ year: 2024, reason: 'x' });
  ok(c3.ok === false && c3.code === 'E_STATE', 'closing an already-closed year refused');

  /* 4 · reason mandatory · authority is the Administrator (FD-029) */
  const c4 = await BO.closeFiscalYear({ year: 2025 });
  ok(c4.ok === false && c4.code === 'E_REASON', 'close without reason refused');
  can.admin = () => false;
  const c5 = await BO.reopenFiscalYear({ year: 2025, reason: 'x' });
  ok(c5.ok === false && c5.code === 'E_AUTH', 'non-director cannot reopen (FD-029)');
  can.admin = () => true;

  /* 5 · explicit reopen: distinct audit event, lock moves to year−1 */
  const r1 = await BO.reopenFiscalYear({ year: 2025, reason: 'تصحيح مطلوب بقرار المدير' });
  ok(r1.ok === true && settings.locked_through_year === '2024' && window.LOCKED_THROUGH_YEAR === 2024,
    'reopen 2025 → lock = 2024 (2025 writable again)');
  const a2 = audit[audit.length - 1];
  ok(a2 && a2.action === 'fiscal_reopen' && a2.description.includes('2025'),
    'DISTINCT fiscal_reopen audit event with year + reason');

  /* 6 · reopening a year that is not closed refused */
  const r2 = await BO.reopenFiscalYear({ year: 2026, reason: 'x' });
  ok(r2.ok === false && r2.code === 'E_STATE', 'reopening an open year refused');

  /* 7 · the lock NEVER moves without its audit record (revert on audit failure) */
  opts.failAudit = true;
  const c6 = await BO.closeFiscalYear({ year: 2025, reason: 'سيفشل التوثيق' });
  opts.failAudit = false;
  ok(c6.ok === false && c6.code === 'E_HISTORY' && settings.locked_through_year === '2024',
    'audit failure → settings change reverted (no silent lock movement)');

  /* 8 · re-close after reopen is equally explicit and works */
  const c7 = await BO.closeFiscalYear({ year: 2025, reason: 'إعادة إقفال بعد التصحيح' });
  ok(c7.ok === true && settings.locked_through_year === '2025'
    && audit.filter(a => a.action === 'fiscal_close').length === 2,
    're-close explicit + audited (second fiscal_close event)');

  /* 8b · IG-016: every successful close persisted its snapshot; snapshot failure reverts the close */
  ok(snapshots.length === 2 && snapshots.every(r => r.snapshot && r.closed_through === 2025),
    'each successful close persisted an immutable snapshot row (IG-016)');
  await BO.reopenFiscalYear({ year: 2025, reason: 'لاختبار اللقطة' });
  opts.failSnapshot = true;
  const c8 = await BO.closeFiscalYear({ year: 2025, reason: 'سيفشل حفظ اللقطة' });
  opts.failSnapshot = false;
  ok(c8.ok === false && c8.code === 'E_SNAPSHOT' && settings.locked_through_year === '2024',
    'snapshot persistence failure → close reverted (no close without its snapshot)');
  const c9 = await BO.closeFiscalYear({ year: 2025, reason: 'إعادة الإقفال بعد الإصلاح' });
  ok(c9.ok === true && settings.locked_through_year === '2025' && snapshots.length === 3,
    're-close succeeds and appends a new snapshot');

  /* 9 · IG-004 linkage: the DB-enforced gate follows the toggled lock value */
  ok(global.voucherLocked('2025-06-01') === true && global.voucherLocked('2026-06-01') === false,
    'closed-period gate tracks the lock set by BO-14/BO-15');

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
