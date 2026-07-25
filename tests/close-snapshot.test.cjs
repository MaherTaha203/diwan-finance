/* CCR-001 IG-016 — constitutional tests for close-time report snapshots (FD-004).
   Register acceptance: a regenerated closed-year report equals its close-time
   snapshot BYTE-FOR-BYTE; closed-year rendering reads the snapshot; a later
   data divergence (simulated guard bypass) is detected, and the archive keeps
   serving the original values. Loads the real fin.js.
   Usage: node tests/close-snapshot.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000, LOCKED_THROUGH_YEAR: 2024,
  FinContract: { foodBalance: () => 100, diwanBalance: () => 50,
    foodDeficitRemaining: () => -10, foodNetPosition: () => 90 },
};
global.today = () => '2026-07-25';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => 'مصروف·' + String(x || '') };
const FIN = vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

global.DB = {
  members: [{ id: 'M1', member_code: '1', name: 'عضو', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 }],
  subscriptions: [{ member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 0 }],
  receipts: [
    { id: 'r1', no: '101', is_deleted: false, fund_type: 'food',  member_id: 'M1', amount_ils: 150, receipt_date: '2025-04-10' },
    { id: 'r2', no: '102', is_deleted: false, fund_type: 'diwan', payer_name: 'زائر', amount_ils: 90, receipt_date: '2025-05-02' },
    { id: 'r3', no: '103', is_deleted: false, fund_type: 'food',  member_id: 'M1', amount_ils: 60, receipt_date: '2026-02-01' },
  ],
  payments: [
    { id: 'p1', no: '301', is_deleted: false, fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 40, payment_date: '2025-06-15', expense_type: 'food' },
  ],
  member_write_offs: [], refunds: [], internal_transfers: [], fiscal_snapshots: [], _alloc: null,
};

/* ── simulate the BO-14 close of 2025: build + persist the snapshot ── */
const payload = FIN.buildCloseSnapshot(2024, 2025);
DB.fiscal_snapshots.push({ id: 's1', closed_through: 2025, previous_lock: 2024,
  snapshot: payload, created_at: '2026-02-01T10:00:00Z' });
window.LOCKED_THROUGH_YEAR = 2025;

/* 1 · the snapshot archives the newly closed year's key models */
(() => {
  ok(!!payload.years[2025] && !!payload.years[2025].food && !!payload.years[2025].diwan
    && !payload.years[2024], 'snapshot covers exactly the newly closed year (2025)');
  ok(eq(payload.years[2025].food.totalCr, 150) && eq(payload.years[2025].food.totalDr, 40)
    && eq(payload.years[2025].diwan.totalCr, 90), 'archived ledgers carry the close-time totals');
  ok(Array.isArray(payload.debt_report.rows) && payload.treasury && payload.consistency
    && payload.consistency.allMatch === true, 'debt report + treasury + consistency verdict archived');
})();

/* 2 · byte-for-byte: regenerated closed-year report equals the archive */
(() => {
  const v = FIN.verifyClosedYearSnapshot(2025);
  ok(v.found === true && v.match === true && v.diffs.length === 0,
    'regenerated 2025 ledgers equal the close-time snapshot byte-for-byte');
})();

/* 3 · closed-year rendering reads the snapshot (exact range only) */
(() => {
  const arch = FIN.closedYearLedgerSnapshot('food', '2025-01-01', '2025-12-31');
  ok(!!arch && JSON.stringify(arch) === JSON.stringify(payload.years[2025].food),
    'exact closed-year range served from the archive');
  ok(FIN.closedYearLedgerSnapshot('food', '2025-02-01', '2025-12-31') === null, 'partial range → live compute (null)');
  ok(FIN.closedYearLedgerSnapshot('food', '2026-01-01', '2026-12-31') === null, 'open year → live compute (null)');
  ok(FIN.closedYearLedgerSnapshot('diwan', '2024-01-01', '2024-12-31') === null, 'closed year WITHOUT a snapshot → live compute (fallback, e.g. 2025-era production)');
})();

/* 4 · divergence detection + archive stability: mutate a closed-year row
      (simulating a guard bypass) — the verifier flags it, the archive still
      serves the ORIGINAL values */
(() => {
  DB.receipts.find(r => r.id === 'r1').amount_ils = 999;
  DB._alloc = null;
  const v = FIN.verifyClosedYearSnapshot(2025);
  ok(v.found === true && v.match === false && v.diffs.includes('food'),
    'post-close data divergence detected (match=false, food flagged)');
  const arch = FIN.closedYearLedgerSnapshot('food', '2025-01-01', '2025-12-31');
  ok(eq(arch.totalCr, 150), 'archive still reproduces the ORIGINAL close-time values (FD-004)');
  DB.receipts.find(r => r.id === 'r1').amount_ils = 150;
  DB._alloc = null;
})();

/* 5 · reopen + re-close appends; the LATEST snapshot for the year wins */
(() => {
  const p2 = FIN.buildCloseSnapshot(2024, 2025);
  p2.years[2025].food.totalCr = p2.years[2025].food.totalCr;     /* identical rebuild */
  DB.fiscal_snapshots.push({ id: 's2', closed_through: 2025, previous_lock: 2024,
    snapshot: p2, created_at: '2026-03-01T10:00:00Z' });
  const arch = FIN.closedYearLedgerSnapshot('food', '2025-01-01', '2025-12-31');
  ok(JSON.stringify(arch) === JSON.stringify(p2.years[2025].food), 'latest snapshot for the year is authoritative');
  DB.fiscal_snapshots.pop();
})();

/* 6 · multi-year close: closing 2023→2025 archives each newly closed year */
(() => {
  const p = FIN.buildCloseSnapshot(2022, 2025);
  ok(!!p.years[2023] && !!p.years[2024] && !!p.years[2025] && !p.years[2022],
    'closing across years archives every newly closed year');
})();

/* 7 · no snapshot table loaded → everything falls back safely */
(() => {
  const saved = DB.fiscal_snapshots; delete DB.fiscal_snapshots;
  ok(FIN.closedYearLedgerSnapshot('food', '2025-01-01', '2025-12-31') === null
    && FIN.verifyClosedYearSnapshot(2025).found === false,
    'missing snapshot data → live compute + found:false (fail-safe)');
  DB.fiscal_snapshots = saved;
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
