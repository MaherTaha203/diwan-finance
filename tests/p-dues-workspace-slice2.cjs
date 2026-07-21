/* ═══════════════════════════════════════════════════════════════════════════
   P-DUES-S2 · Annual Subscriptions / Dues Workspace — Slice 2 conformance proof
   Capability (apply annual dues · onboard member) — orchestration only. COMPLETES
   the Annual Subscriptions / Dues Operational Business Module.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-2 workspace:
     • extends Slice 1 (State + History preserved; read projections intact); version → 2;
     • adds ONLY the certified capability (apply dues · onboard) in a DEDICATED
       Capability section (GOV-WS-01 v1.5 Rule 3 — State/History stay execution-free),
       answering the S2 Primary Business Question;
     • every execution DELEGATES to an EXISTING certified flow — apply dues →
       window.applyAnnualDue (→ BusinessOps.applyAnnualDues, BO-10, obligation only);
       onboard → window.openM('member') (→ saveMember → BusinessOps.createMember,
       BO-07). The workspace calls NO Business Operation, builds NO subscription row,
       holds NO accounting/financial calculation, and mutates NO state;
     • Authorization (Rule 4): the workspace decides only WHETHER an operation is
       legitimate — admin · valid year · DUPLICATE-YEAR protection · members present;
       illegitimate operations stay VISIBLE but DISABLED with a reason and route nothing
       (duplicate execution prevented, unauthorized blocked, invalid year blocked);
     • State + History change only through certified Business Operations; no payment
       allocation, approval, liquidity guard, year reversal, or recurring engine.

   Run:  node tests/p-dues-workspace-slice2.cjs   exit 0 = OK.
   (Golden Baseline proven separately by constitutional-verification.cjs.)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public', 'js');
const rd = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;

function load(DB, docEls, extraGlobals) {
  Object.assign(global, extraGlobals);
  const window = { LANG: 'ar', FOOD_OPENING: 0, DIWAN_OPENING: 0, TREASURY_OPENINGS: { food: 0, diwan: 0, historical_deficit: 0 } };
  const L = new Proxy({}, { get: () => (() => '') });
  const document = { getElementById: id => docEls[id] || null, querySelector: () => null, querySelectorAll: () => [] };
  const localStorage = { getItem: () => null, setItem: () => {} };
  const module = { exports: {} };
  const code = [ rd('utils.js'), rd('model2.js'), rd('foodDonationAllocation.js'), rd('fin2.js'),
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('dues-workspace.js'),
    ';return { FIN: FIN, DuesWorkspace: window.DuesWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };

(async function main() {
  console.log('═══ P-DUES-S2 · Annual Dues Workspace — Slice 2 (capability) conformance ═══\n');

  const DB = {
    members: [
      { id: 'M1', name: 'عضو أول', member_code: 'A-1', is_active: true },
      { id: 'M2', name: 'عضو ثانٍ', member_code: 'A-2', is_active: true }
    ],
    subscriptions: [
      { member_id: 'M1', year: 2025, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 },
      { member_id: 'M2', year: 2025, due_amount_ils: 200, paid_amount_ils: 50, balance_ils: 150 },
      { member_id: 'M1', year: 2024, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 },
      { member_id: 'M2', year: 2024, due_amount_ils: 200, paid_amount_ils: 200, balance_ils: 0 }
    ],
    annual: [
      { year: 2025, amount: 200, member_count: 2, applied_by: 'المدير', applied_at: '2025-01-05T00:00:00Z' },
      { year: 2024, amount: 200, member_count: 2, applied_by: 'المدير', applied_at: '2024-01-03T00:00:00Z' }
    ],
    receipts: [], payments: [], contacts: [], inkind_donations: [], audit: [], _alloc: null
  };
  const dwOut = { innerHTML: '' };
  // the certified apply-dues contract's own inputs (static on the annual page)
  const dueYear = { value: '' }, dueAmount = { value: '' };
  const docEls = { 'dw-out': dwOut, 'due-year': dueYear, 'due-amount': dueAmount };

  let adminFlag = true;
  const boCalls = [];
  const extras = {
    can: { write: () => true, admin: () => adminFlag, print: () => true },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, DuesWorkspace, window } = load(DB, docEls, extras);
  window.print = () => {};
  window.nav = () => {}; window.openPersonStmt = () => {};
  let applyCalls = 0; window.applyAnnualDue = () => { applyCalls++; };                 // certified caller → BO-10
  const openMCalls = []; window.openM = k => openMCalls.push(k);                        // certified add-member → BO-07

  // ── extends Slice 1 ───────────────────────────────────────────────────────
  A('extends Slice 1 (State/History projections preserved)',
    typeof DuesWorkspace.yearState === 'function' && typeof DuesWorkspace.schedule === 'function' && typeof DuesWorkspace.memberRows === 'function');
  A('module version advanced to 2', DuesWorkspace.version === 2, 'version=' + DuesWorkspace.version);
  A('capability wrappers exposed', typeof DuesWorkspace.actionApply === 'function' && typeof DuesWorkspace.actionOnboard === 'function' && typeof DuesWorkspace.applyLegit === 'function');

  window.renderDuesWorkspace();   // admin, default apply-year = max(2024,2025)+1 = 2026 (new → legitimate)
  let html = dwOut.innerHTML;

  // ── Capability section + the S2 Primary Business Question ──────────────────
  A('S2 Primary Business Question present', /عملية الاشتراك السنوي المعتمدة المشروعة الآن، وهل يمكن تنفيذها/.test(html));
  A('apply-dues affordance tagged BO-10 (obligation only)', /dw-cap-bo">BO-10/.test(html) && /actionApply\(\)/.test(html));
  A('onboard affordance tagged BO-07', /dw-cap-bo">BO-07/.test(html) && /actionOnboard\(\)/.test(html));

  // ── Rule 3 · State & History carry no execution controls ──────────────────
  const capIdx = html.indexOf('العمليات التشغيلية'), colsIdx = html.indexOf('dw-cols');
  const cards = html.slice(colsIdx, capIdx);
  A('Rule 3 · State + History (status · members · schedule) carry no execution controls',
    cards.length > 0 && !/dw-cap-bo|dw-op-pri|actionApply|actionOnboard/.test(cards));

  // ── successful path · apply dues delegates ONLY to the certified caller ────
  A('apply is legitimate for the default new year 2026', DuesWorkspace.applyLegit().legit === true && DuesWorkspace.applyLegit().year === 2026);
  DuesWorkspace.actionApply();
  A('apply → certified caller window.applyAnnualDue (→ BO-10); feeds the certified #due-year',
    applyCalls === 1 && Number(dueYear.value) === 2026 && Number(dueAmount.value) === 200);
  A('workspace invoked NO Business Operation directly (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);

  // ── successful path · onboard delegates ONLY to the certified add-member ───
  DuesWorkspace.actionOnboard();
  A('onboard → certified add-member window.openM(\'member\') (→ BO-07)', openMCalls.length === 1 && openMCalls[0] === 'member');
  A('still 0 direct BusinessOps calls after onboard', boCalls.length === 0, 'calls=' + boCalls.length);

  // ── blocked path · DUPLICATE-YEAR protection (prevents duplicate execution) ─
  DuesWorkspace.setApplyYear(2025);   // already present in DB.annual
  const hDup = dwOut.innerHTML;
  A('duplicate year → apply BLOCKED: visible, disabled, reason shown', /dw-cap-off[\s\S]*?BO-10/.test(hDup) && /مُطبَّق سلفًا/.test(hDup));
  A('duplicate year → NO apply routing control rendered', !/actionApply\(\)/.test(hDup));
  const beforeDup = applyCalls;
  DuesWorkspace.actionApply();
  A('duplicate year → actionApply is a no-op (defensive; no certified routing)', applyCalls === beforeDup, 'calls=' + applyCalls);

  // ── blocked path · unauthorized (non-admin) blocks BOTH operations ────────
  adminFlag = false;
  DuesWorkspace.setApplyYear(2026);   // a legitimate year, but no admin authority
  const hNo = dwOut.innerHTML;
  A('non-admin → apply + onboard BOTH blocked with reason, no routing controls',
    /dw-cap-off[\s\S]*?BO-10/.test(hNo) && /dw-cap-off[\s\S]*?BO-07/.test(hNo) && /يتطلب صلاحية مدير/.test(hNo) && !/actionApply\(\)/.test(hNo) && !/actionOnboard\(\)/.test(hNo));
  const a0 = applyCalls, o0 = openMCalls.length;
  DuesWorkspace.actionApply(); DuesWorkspace.actionOnboard();
  A('non-admin → both executions blocked (no-ops)', applyCalls === a0 && openMCalls.length === o0);
  adminFlag = true;

  // ── blocked path · invalid year ───────────────────────────────────────────
  DuesWorkspace.setApplyYear(1999);
  A('invalid year → apply blocked (legitimacy false, reason shown)', DuesWorkspace.applyLegit().legit === false && /سنة غير صالحة/.test(dwOut.innerHTML));
  DuesWorkspace.setApplyYear(2026);

  // ── State + History change ONLY through certified BOs — no local mutation ──
  const subBefore = DB.subscriptions.length, annBefore = DB.annual.length, memBefore = DB.members.length, audBefore = DB.audit.length;
  window.renderDuesWorkspace();
  DuesWorkspace.setApplyYear(2027); DuesWorkspace.setApplyAmount(250); DuesWorkspace.setYear(2024); DuesWorkspace.setYear(2025);
  A('render + capability gating mutate no store (State/History change only via certified BO)',
    DB.subscriptions.length === subBefore && DB.annual.length === annBefore && DB.members.length === memBefore && DB.audit.length === audBefore);

  // ── the module holds NO accounting logic and calls NO BO directly ─────────
  const src = rd('dues-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  A('module source: NO direct BusinessOps, NO atomic RPC, NO subscription-row building',
    !/BusinessOps\s*\.|create_member_atomic|due_amount_ils\s*:/.test(src));
  A('module source delegates to the certified callers only (applyAnnualDue · openM)',
    /window\.applyAnnualDue\b/.test(src) && /window\.openM\(/.test(src));

  // ── State (Slice 1) preserved exactly — one source of truth (Rule 6) ──────
  const s = DuesWorkspace.yearState(2025);
  const delDue = R2(DB.members.reduce((t, m) => t + Number(((FIN.memberDelinquency(m.id).byYear || {})[2025] || {}).due || 0), 0));
  A('State preserved: yearState(2025) equals certified delinquency', s.due === delDue && s.due === 400 && s.paid === 250 && s.outstanding === 150, 'due=' + s.due);

  console.log('\n═══ Result: ' + (failures === 0 ? 'DUES SLICE 2 CAPABILITY CONFORMANT — MODULE COMPLETE' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
