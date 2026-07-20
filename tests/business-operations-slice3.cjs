/* ═══════════════════════════════════════════════════════════════════════════
   BUSINESS OPERATIONS — Slice 3 conformance proof  ·  P1 (BO-07/08/09/10)
   ───────────────────────────────────────────────────────────────────────────
   Proves the Business Operations layer (public/js/operations.js) honours the
   P1-000 Part A contract for the member lifecycle and annual-dues generation,
   fail-closed, contains NO accounting logic, routes through the certified path,
   and creates NO second source of truth:

     BO-07 Create Member : administrator · payload present · SOLE executor =
                           create_member_atomic (V2); no direct member insert (no bypass).
     BO-08 Edit Member   : administrator · member exists · certified update; audited.
     BO-09 Cancel Member : administrator · member exists · is_active=false; audited.
     BO-10 Apply Dues    : administrator · valid year+amount · OBLIGATION-ONLY —
                           rejects any non-zero paid amount (no payment / no 2nd source);
                           generates the annual_dues row + member_subscription obligations.

   Loads operations.js in a shared scope with injected stubs (incl. SB.rpc). End-to-end
   member creation through the real DOM is covered by tests/e2e-acceptance.cjs.

   Run:  node tests/business-operations-slice3.cjs   ·  exit 0 = contract satisfied.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'operations.js'), 'utf8');

function makeEnv(state) {
  const DB = { receipts: [], payments: [], members: [], member_subscriptions: [], annual_dues: [], voucher_versions: [] };
  const rpcCalls = []; const directInserts = [];
  const SB = {
    from(tbl) {
      let rows = DB[tbl] || (DB[tbl] = []); let inserted = null; let pend = null; let filt = () => true;
      const api = {
        insert(v) { directInserts.push({ tbl, v }); const a = Array.isArray(v) ? v : [v]; a.forEach(x => { if (!x.id) x.id = 'id' + Math.random().toString(36).slice(2); }); rows.push(...a); inserted = a; return api; },
        select() { return api; }, single() { return api; },
        update(v) { pend = v; return api; }, eq(c, val) { filt = r => r[c] === val; return api; },
        then(res, rej) { if (pend) rows.filter(filt).forEach(r => Object.assign(r, pend)); return Promise.resolve({ data: (inserted ? inserted[0] : rows.filter(filt)[0]) || null, error: null }).then(res, rej); }
      };
      return api;
    },
    async rpc(name, args) { rpcCalls.push({ name, args }); return state.rpcError ? { data: null, error: { message: state.rpcError } } : { data: { member_id: 'M-NEW' }, error: null }; }
  };
  const can = { write: () => state.write, admin: () => state.admin };
  const voucherLocked = () => false;
  async function recordVoucherVersion() {}
  const nextNo = (p, a) => p + '-' + ((a ? a.length : 0) + 1);
  const genVerificationToken = () => 'TOK';
  const logAction = async () => {};
  const MODEL2 = { EVENTS: {} };
  const CUR = { full_name: 'tester' }; const CU = { email: 't@t' };
  const win = {}; const module = { exports: {} };
  new Function('window', 'SB', 'DB', 'can', 'voucherLocked', 'recordVoucherVersion', 'nextNo', 'genVerificationToken', 'logAction', 'MODEL2', 'CUR', 'CU', 'module', code)
    (win, SB, DB, can, voucherLocked, recordVoucherVersion, nextNo, genVerificationToken, logAction, MODEL2, CUR, CU, module);
  return { BO: win.BusinessOps || module.exports, DB, rpcCalls, directInserts, state };
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ Business Operations · Slice 3 conformance (BO-07/08/09/10) ═══\n');

  /* ---------- BO-07 · Create Member ---------- */
  {
    const member = { name: 'New Member', historical_balance_ils: 0 };
    const subs = [{ year: 2026, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }];
    let e = makeEnv({ write: true, admin: false });
    A('BO-07 reject · not administrator', (await e.BO.createMember({ member, subscriptions: subs })).code === 'E_AUTH');
    e = makeEnv({ write: true, admin: true });
    A('BO-07 reject · missing payload', (await e.BO.createMember({})).code === 'E_INPUT');
    e = makeEnv({ write: true, admin: true });
    const res = await e.BO.createMember({ member, subscriptions: subs });
    A('BO-07 accept · succeeds', res.ok && res.data && res.data.member_id === 'M-NEW');
    A('BO-07 · SOLE executor = create_member_atomic (V2)', e.rpcCalls.length === 1 && e.rpcCalls[0].name === 'create_member_atomic');
    A('BO-07 · payload forwarded (member + schedule)', e.rpcCalls[0].args.p_member === member && e.rpcCalls[0].args.p_subscriptions === subs);
    A('BO-07 · NO bypass (no direct members insert)', !e.directInserts.some(d => d.tbl === 'members'));
  }

  /* ---------- BO-08 · Edit Member ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true }); e.DB.members.push({ id: 'm1', name: 'A', is_active: true }); return e; };
    let e = seed(); e.state.admin = false;
    A('BO-08 reject · not administrator', (await e.BO.editMember({ id: 'm1', changes: { name: 'B' } })).code === 'E_AUTH');
    e = seed();
    A('BO-08 reject · member not found', (await e.BO.editMember({ id: 'nope', changes: { name: 'B' } })).code === 'E_STATE');
    e = seed();
    const res = await e.BO.editMember({ id: 'm1', changes: { name: 'B', phone: '9' } });
    A('BO-08 accept · member updated', res.ok && e.DB.members[0].name === 'B' && e.DB.members[0].phone === '9');
  }

  /* ---------- BO-09 · Cancel Member ---------- */
  {
    const seed = () => { const e = makeEnv({ write: true, admin: true }); e.DB.members.push({ id: 'm1', name: 'A', is_active: true }); return e; };
    let e = seed(); e.state.admin = false;
    A('BO-09 reject · not administrator', (await e.BO.cancelMember({ id: 'm1' })).code === 'E_AUTH');
    e = seed();
    A('BO-09 reject · member not found', (await e.BO.cancelMember({ id: 'nope' })).code === 'E_STATE');
    e = seed();
    const res = await e.BO.cancelMember({ id: 'm1' });
    A('BO-09 accept · deactivated', res.ok && e.DB.members[0].is_active === false);
  }

  /* ---------- BO-10 · Apply Annual Dues ---------- */
  {
    const dues = { year: 2027, amount: 200, member_count: 2 };
    const obligations = [
      { member_id: 'm1', year: 2027, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 },
      { member_id: 'm2', year: 2027, due_amount_ils: 200, paid_amount_ils: 0, balance_ils: 200 }
    ];
    let e = makeEnv({ write: true, admin: false });
    A('BO-10 reject · not administrator', (await e.BO.applyAnnualDues({ duesRow: dues, subscriptions: obligations })).code === 'E_AUTH');
    e = makeEnv({ write: true, admin: true });
    A('BO-10 reject · invalid year/amount', (await e.BO.applyAnnualDues({ duesRow: { year: 2027, amount: 0 }, subscriptions: [] })).code === 'E_INPUT');
    e = makeEnv({ write: true, admin: true });
    const withPaid = obligations.map((o, i) => i === 0 ? Object.assign({}, o, { paid_amount_ils: 50 }) : o);
    A('BO-10 reject · records a payment (no 2nd source)', (await e.BO.applyAnnualDues({ duesRow: dues, subscriptions: withPaid })).code === 'E_CONTRACT');

    e = makeEnv({ write: true, admin: true });
    const res = await e.BO.applyAnnualDues({ duesRow: dues, subscriptions: obligations });
    A('BO-10 accept · succeeds', res.ok);
    A('BO-10 · dues row + obligations generated', e.DB.annual_dues.length === 1 && e.DB.member_subscriptions.length === 2);
    A('BO-10 · obligation-only (every paid = 0)', e.DB.member_subscriptions.every(s => Number(s.paid_amount_ils) === 0));
    A('BO-10 · no payment path invoked (no rpc)', e.rpcCalls.length === 0);
  }

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 3 CONTRACT SATISFIED' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
