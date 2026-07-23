/* MODEL2 V2.0 · Slice 5 — unit tests for the pure Debt Write-off Engine (CA-007).
   Verifies: only a permanently-departed member (is_active=false) with outstanding debt
   can be written off; the write-off resolves the FULL outstanding receivable to zero as a
   NON-CASH member-ledger record (no treasury); the member is never mutated (Law 5).
   Usage: node tests/writeoff-engine.test.cjs */
'use strict';
const WE = require('../public/js/writeoff-engine.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const departed = Object.freeze({ id: 'm1', full_name: 'Member A', is_active: false });
const active = Object.freeze({ id: 'm2', full_name: 'Member B', is_active: true });

/* 1 · departed member with debt → full write-off record (non-cash, resolves to zero) */
(() => {
  const r = WE.computeDebtWriteOff({ member: departed, outstandingDebt: 750 });
  ok(r.ok && r.row.movement_type === 'debt_write_off' && r.row.is_write_off === true, 'departed+debt → debt_write_off record');
  ok(r.row.amount_ils === 750 && r.amount === 750, 'write-off amount = FULL outstanding (750)');
  ok(r.row.destination_treasury === null && r.row.fund_type === 'writeoff', 'NON-CASH: no treasury, neutral fund_type (Law 8 untouched)');
  ok(r.row.member_id === 'm1' && r.row.payer_name === 'Member A', 'record carries the member linkage');
})();

/* 2 · active member → rejected (closure only at permanent departure) */
ok(WE.computeDebtWriteOff({ member: active, outstandingDebt: 500 }).code === 'E_ACTIVE', 'active member → E_ACTIVE');

/* 3 · no outstanding debt → nothing to write off */
ok(WE.computeDebtWriteOff({ member: departed, outstandingDebt: 0 }).code === 'E_NODEBT', 'no debt → E_NODEBT');
ok(WE.computeDebtWriteOff({ member: departed, outstandingDebt: -120 }).code === 'E_NODEBT', 'credit (negative) → E_NODEBT (not a debt)');

/* 4 · missing member → ineligible */
ok(WE.computeDebtWriteOff({ member: null, outstandingDebt: 100 }).code === 'E_INELIGIBLE', 'missing member → E_INELIGIBLE');

/* 5 · immutability (Law 5): member unchanged; row frozen */
(() => {
  const snap = JSON.stringify(departed);
  const r = WE.computeDebtWriteOff({ member: departed, outstandingDebt: 300 });
  ok(JSON.stringify(departed) === snap, 'member row is never mutated (Law 5)');
  let frozen = true; try { r.row.amount_ils = 1; if (r.row.amount_ils === 1) frozen = false; } catch (_) {}
  ok(frozen, 'proposed write-off row is frozen (immutable)');
})();

/* 6 · rounding: fractional debt preserved to 2dp */
ok(WE.computeDebtWriteOff({ member: departed, outstandingDebt: 12.345 }).row.amount_ils === 12.35, 'amount rounded to 2dp (12.345 → 12.35)');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
