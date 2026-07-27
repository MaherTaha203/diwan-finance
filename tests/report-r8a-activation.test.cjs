/* REPORT-001 · R8-a — Engine activation tests (pure node).
   Verifies the activation module flips every cut-over flag ON, covers every
   registry report, exposes the flag list, and that a runtime override reverts a
   single surface (the rollback path). Usage: node tests/report-r8a-activation.test.cjs */
require('../public/js/report-engine.js');           // Report registry
const Report = globalThis.Report;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* Simulate the per-module default-OFF guards that run BEFORE activation in the
   load chain (report-cutover.js sets MEMBER_STATEMENT=false, the voucher module
   sets VOUCHERS=false). Activation must override these. */
globalThis.REPORT_ENGINE_MEMBER_STATEMENT = false;
globalThis.REPORT_ENGINE_VOUCHERS = false;
ok(globalThis.REPORT_ENGINE_MEMBER_STATEMENT === false && globalThis.REPORT_ENGINE_VOUCHERS === false, 'per-module default-OFF guards ran first (flags explicitly false)');

const FLAGS = require('../public/js/report-activation.js');   // <-- activation runs here
ok(globalThis.REPORT_ENGINE_MEMBER_STATEMENT === true && globalThis.REPORT_ENGINE_VOUCHERS === true, 'activation OVERRIDES the module default-OFF guards (false → true) regardless of load order');

/* every flag is now ON */
ok(FLAGS.length === 13, 'activation covers 13 flags (3 vouchers share one)');
ok(FLAGS.every(f => globalThis[f] === true), 'every REPORT_ENGINE_* flag is ON after activation');
ok(Array.isArray(globalThis.REPORT_ENGINE_FLAGS) && globalThis.REPORT_ENGINE_FLAGS.length === 13, 'the flag list is exposed on window.REPORT_ENGINE_FLAGS');

/* every registry report maps to an activated flag */
const REPORT_FLAG = {
  MEMBER_STATEMENT: 'REPORT_ENGINE_MEMBER_STATEMENT', FUND_STATEMENT: 'REPORT_ENGINE_FUND_STATEMENT',
  ANNUAL_DEBT: 'REPORT_ENGINE_ANNUAL_DEBT', DELINQUENT: 'REPORT_ENGINE_DELINQUENT', DONATION_REPORT: 'REPORT_ENGINE_DONATION_REPORT',
  MEMBERS_LIST: 'REPORT_ENGINE_MEMBERS_LIST', ANNUAL_LOG: 'REPORT_ENGINE_ANNUAL_LOG', USERS_LIST: 'REPORT_ENGINE_USERS_LIST',
  RECEIPT_VOUCHER: 'REPORT_ENGINE_VOUCHERS', PAYMENT_VOUCHER: 'REPORT_ENGINE_VOUCHERS', TRANSFER_VOUCHER: 'REPORT_ENGINE_VOUCHERS',
  TREASURY_POSITION: 'REPORT_ENGINE_TREASURY_POSITION', DUES_SNAPSHOT: 'REPORT_ENGINE_DUES_SNAPSHOT',
  AUDIT_LOG: 'REPORT_ENGINE_AUDIT_LOG', CONSISTENCY: 'REPORT_ENGINE_CONSISTENCY'
};
const ids = Report.list().map(d => d.id);
ok(ids.every(id => REPORT_FLAG[id] && globalThis[REPORT_FLAG[id]] === true), 'every registry report (' + ids.length + ') is served by an ON flag');

/* runtime rollback of a single surface (the documented emergency revert) */
globalThis.REPORT_ENGINE_FUND_STATEMENT = false;
ok(globalThis.REPORT_ENGINE_FUND_STATEMENT === false && globalThis.REPORT_ENGINE_MEMBER_STATEMENT === true,
  'a runtime override reverts ONE surface (fund→legacy) while the rest stay on the engine');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
