/* MODEL2 V2.0 · Slice 5–6 — unit tests for the pure Write-off Engine (CA-007).
   Debt Write-off (Slice 5) and Credit Write-off (Slice 6): only a permanently-departed
   member (is_active=false) with an outstanding debt / credit can be written off; each
   resolves the FULL outstanding amount to zero as a NON-CASH member-ledger record (no
   treasury, never a refund); the member is never mutated (Law 5).
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

/* ── CA-007 Slice 6 · Credit Write-off ── */

/* 7 · departed member with credit → full credit write-off record (non-cash, not a refund) */
(() => {
  const r = WE.computeCreditWriteOff({ member: departed, outstandingCredit: 250 });
  ok(r.ok && r.row.movement_type === 'credit_write_off' && r.row.is_write_off === true, 'departed+credit → credit_write_off record');
  ok(r.row.amount_ils === 250 && r.amount === 250, 'credit write-off amount = FULL outstanding credit (250)');
  ok(r.row.destination_treasury === null && r.row.fund_type === 'writeoff', 'NON-CASH: no treasury, no refund (Law 8 untouched)');
})();

/* 8 · active member / no credit → rejected */
ok(WE.computeCreditWriteOff({ member: active, outstandingCredit: 200 }).code === 'E_ACTIVE', 'active member → E_ACTIVE');
ok(WE.computeCreditWriteOff({ member: departed, outstandingCredit: 0 }).code === 'E_NOCREDIT', 'no credit → E_NOCREDIT');
ok(WE.computeCreditWriteOff({ member: null, outstandingCredit: 100 }).code === 'E_INELIGIBLE', 'missing member → E_INELIGIBLE');

/* 9 · immutability (Law 5): member unchanged; row frozen */
(() => {
  const snap = JSON.stringify(departed);
  const r = WE.computeCreditWriteOff({ member: departed, outstandingCredit: 300 });
  ok(JSON.stringify(departed) === snap, 'member row is never mutated (Law 5)');
  let frozen = true; try { r.row.amount_ils = 1; if (r.row.amount_ils === 1) frozen = false; } catch (_) {}
  ok(frozen, 'proposed credit write-off row is frozen (immutable)');
})();

/* 10 · classifiers */
ok(WE.isWriteOff('debt_write_off') && WE.isWriteOff('credit_write_off') && !WE.isWriteOff('refund'), 'isWriteOff covers both write-off types only');

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
