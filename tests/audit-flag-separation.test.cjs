/* PROPOSAL-FLAG-SEPARATION-001 (Owner-approved) — truth-table tests for the split
   between the Allocation Audit Log switch (MODEL2_AUDIT_LOG_ENABLED — gates ONLY
   the OD-01/OD-02 metadata recorders) and the operational capabilities switch
   (MODEL2_ALLOCATION_ENABLED — sole gate of BO-11 refund and BO-12/13 write-offs,
   and, for backward compatibility, still implies the audit log when ON).
   Loads the REAL allocation-engine.js, allocation-integration.js, operations.js.
   Usage: node tests/audit-flag-separation.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);

/* ── defaults after the Owner's activation order (2026-07-25): a fresh browser
   context boots with the audit log ON and the operational flag still OFF ── */
(() => {
  const sb = { window: {}, module: undefined };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(P('allocation-engine.js'), 'utf8'), sb);
  ok(sb.window.MODEL2_ALLOCATION_ENABLED === false && sb.window.MODEL2_AUDIT_LOG_ENABLED === true,
    'fresh boot: MODEL2_AUDIT_LOG_ENABLED=true (activated) AND MODEL2_ALLOCATION_ENABLED=false');
  const sb2 = { window: { MODEL2_AUDIT_LOG_ENABLED: false }, module: undefined };
  vm.createContext(sb2);
  vm.runInContext(fs.readFileSync(P('allocation-engine.js'), 'utf8'), sb2);
  ok(sb2.window.MODEL2_AUDIT_LOG_ENABLED === false && sb2.window.MODEL2_ALLOCATION_ENABLED === false,
    'an explicit prior assignment of the audit flag survives boot (override rule)');
})();

/* ── live wiring: real recorders + real BO layer over stub app globals ── */
const inserted = [];
global.window = { MODEL2Allocation: require('../public/js/allocation-engine.js') };
global.window.RefundEngine = require('../public/js/refund-engine.js');
global.window.WriteOffEngine = require('../public/js/writeoff-engine.js');
global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
  subscriptions: [{ member_id: 'M1', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 }],
  receipts: [{ id: 'r1', no: '101', is_deleted: false, fund_type: 'food', member_id: 'M1', amount_ils: 200, receipt_date: '2026-03-01' }],
  payments: [], member_write_offs: [], refunds: [], settings: null, _alloc: null,
};
global.SB = { from: t => ({
  insert: async rows => { inserted.push({ table: t, rows: Array.isArray(rows) ? rows : [rows] }); return { error: null, data: rows }; },
  update() { return { async eq() { return { error: null }; } }; },
}) };
global.can = { admin: () => true, write: () => true };
global.voucherLocked = d => !!d && Number(String(d).slice(0, 4)) <= 2025;
global.nextNo = p => p + '-T1';
global.genVerificationToken = () => 'tok';
global.recordVoucherVersion = async () => {};
global.logAction = async () => {};
global.fmt = n => String(n);
global.MODEL2 = { EVENTS: { refund: {} } };
global.FIN = { memberStatement: () => ({ finalBalance: 0, creditBalance: 100 }) };
require('../public/js/allocation-integration.js');
const BO = require('../public/js/operations.js');

(async () => {
  /* row 1 — both OFF (today's default): recorders inert */
  window.MODEL2_ALLOCATION_ENABLED = false; window.MODEL2_AUDIT_LOG_ENABLED = false;
  const r1 = await window.MODEL2RecordAllocation('M1', '101', 200);
  const c1 = await window.MODEL2RecordCreditConsumption('M1');
  ok(r1 === null && c1 === null && inserted.length === 0, 'both OFF → OD-01 and OD-02 are no-ops (byte-identical to today)');

  /* row 2 — AUDIT only: recorders record… */
  window.MODEL2_AUDIT_LOG_ENABLED = true;
  const r2 = await window.MODEL2RecordAllocation('M1', '101', 200);
  ok(!!r2 && inserted.some(x => x.table === 'allocation_records'),
    'AUDIT only → OD-01 records ordered-allocation metadata into allocation_records');
  const before = inserted.length;
  const c2 = await window.MODEL2RecordCreditConsumption('M1');
  ok(!!c2 && inserted.length > before
    && inserted[inserted.length - 1].rows.every(r => r.source_kind === 'credit_consumption'),
    'AUDIT only → OD-02 records credit-consumption metadata');

  /* …while ALL THREE operational capabilities stay REFUSED (the Owner\'s constraint) */
  const rf = await BO.refundReceipt({ originId: 'r1', amountILS: 50, reason: 'x' });
  ok(rf.ok === false && rf.code === 'E_DISABLED', 'AUDIT only → BO-11 Refund remains E_DISABLED');
  const wd = await BO.writeOffDebt({ memberId: 'M1', reason: 'x' });
  ok(wd.ok === false && wd.code === 'E_DISABLED', 'AUDIT only → BO-12 Debt Write-off remains E_DISABLED');
  const wc = await BO.writeOffCredit({ memberId: 'M1', reason: 'x' });
  ok(wc.ok === false && wc.code === 'E_DISABLED', 'AUDIT only → BO-13 Credit Write-off remains E_DISABLED');

  /* row 3 — full activation still implies the audit log (backward compatibility) */
  window.MODEL2_AUDIT_LOG_ENABLED = false; window.MODEL2_ALLOCATION_ENABLED = true;
  const n3 = inserted.length;
  const r3 = await window.MODEL2RecordAllocation('M1', '101', 200);
  ok(!!r3 && inserted.length > n3, 'ALLOCATION ON (audit flag off) → recorders still record (full activation implies audit)');
  window.MODEL2_ALLOCATION_ENABLED = false;

  /* wiring proof at source level: operational gates untouched, call-sites on the OR-guard */
  const opsSrc = fs.readFileSync(P('operations.js'), 'utf8');
  const crudSrc = fs.readFileSync(P('crud.js'), 'utf8');
  const appSrc = fs.readFileSync(P('app.js'), 'utf8');
  const intSrc = fs.readFileSync(P('allocation-integration.js'), 'utf8');
  ok(!/MODEL2_AUDIT_LOG_ENABLED/.test(opsSrc)
    && (opsSrc.match(/window\.MODEL2_ALLOCATION_ENABLED\)\) return fail\('E_DISABLED'/g) || []).length === 3,
    'operations.js: BO-11/12/13 gates are byte-untouched — no audit flag, 3 E_DISABLED guards on MODEL2_ALLOCATION_ENABLED only');
  ok((intSrc.match(/window\.MODEL2_ALLOCATION_ENABLED \|\| window\.MODEL2_AUDIT_LOG_ENABLED/g) || []).length === 2
    && /MODEL2_ALLOCATION_ENABLED\|\|window\.MODEL2_AUDIT_LOG_ENABLED/.test(crudSrc)
    && /MODEL2_ALLOCATION_ENABLED\|\|window\.MODEL2_AUDIT_LOG_ENABLED/.test(appSrc),
    'recorder entry points + both call-sites guard on the OR of the two flags');

  console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
  process.exit(fail === 0 ? 0 : 1);
})();
