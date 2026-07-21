/* ═══════════════════════════════════════════════════════════════════════════
   P4 · Payment Voucher Workspace — Slice 2 conformance proof
   Activates CAPABILITY (issue / edit / cancel payment vouchers) — orchestration only.
   ───────────────────────────────────────────────────────────────────────────
   Proves the Slice-2 workspace:
     • extends Slice 1 (read surface + State/History preserved); version → 2;
     • adds a DEDICATED Capability section (GOV-WS-01 Rule 3): State (Summary) and
       History (Ledger/Timeline) carry NO execution controls; execution lives only
       in the Operational Actions section;
     • follows Rule 4 (Intent → Authorization → Execution → Result): each capability
       is authority-gated and DELEGATES to an existing certified flow that routes to
       a certified Business Operation — issue → window.openPay (→ savePay → BO-01);
       edit/cancel → window.editPay (→ updatePay → BO-02 · deletePay → BO-03);
     • the workspace itself invokes NO Business Operation and mutates NO state
       (0 BusinessOps calls, no DB write) — orchestration only;
     • BO-04/05 are NOT offered (reserved for P4-S3); no approval, no liquidity guard;
     • authority gating: non-write cannot issue, non-admin cannot edit (disabled with
       a reason); every displayed value still comes from the certified read model
       (one source of operational truth — Rule 6).

   Run:  node tests/p4-payment-workspace-slice2.cjs   exit 0 = OK.
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
    rd('fin.js'), 'window.FIN = FIN;', rd('fin-contract.js'), rd('payment-workspace.js'),
    ';return { FIN: FIN, PaymentWorkspace: window.PaymentWorkspace, window: window };' ].join('\n');
  return new Function('window', 'DB', 'module', 'L', 'document', 'localStorage', code)
    (window, DB, module, L, document, localStorage);
}

let failures = 0, checks = 0;
const A = (id, cond, detail) => { checks++; const p = !!cond; if (!p) failures++; console.log((p ? 'PASS' : 'FAIL') + '  ' + id + (detail ? '  · ' + detail : '')); };
const between = (html, startRe, endRe) => { const s = html.search(startRe); if (s < 0) return ''; const rest = html.slice(s); const e = rest.search(endRe); return e < 0 ? rest : rest.slice(0, e); };

(async function main() {
  console.log('═══ P4 · Payment Voucher Workspace — Slice 2 (capability) conformance ═══\n');

  const DB = {
    members: [{ id: 'M1', name: 'Beneficiary', is_active: true }], subscriptions: [],
    receipts: [], payments: [
      { id: 'p1', no: 'P-001', fund_type: 'food', beneficiary_name: 'مورد', amount_ils: 120, amount: 120, payment_date: '2025-03-10', expense_type: 'food' },
      { id: 'p2', no: 'P-002', fund_type: 'diwan', beneficiary_name: 'صيانة', amount_ils: 80, amount: 80, payment_date: '2025-03-11', expense_type: 'maintenance' }
    ],
    contacts: [], annual: [], audit: [], inkind_donations: [], _alloc: null
  };
  const pwOut = { innerHTML: '' };
  const editSel = { value: 'p1' };
  const docEls = { 'pw-out': pwOut, 'pw-edit-sel': editSel };

  let writeFlag = true, adminFlag = true;
  const boCalls = [], payCalls = [], editCalls = [];
  const extras = {
    can: { write: () => writeFlag, admin: () => adminFlag },
    BusinessOps: new Proxy({}, { get: () => ((...a) => { boCalls.push(a); return { ok: true }; }) }),
    toast: () => {}, gmn: id => (DB.members.find(m => m.id === id) || {}).name || '—'
  };
  const { FIN, PaymentWorkspace, window } = load(DB, docEls, extras);
  window.openPay = fund => payCalls.push(fund);           // certified create flow (→ BO-01)
  window.editPay = id => editCalls.push(id);              // certified editor (→ BO-02 / BO-03)

  // ── extends Slice 1 ───────────────────────────────────────────────────────
  A('extends Slice 1 (read surface preserved)', typeof PaymentWorkspace.paymentState === 'function' && typeof PaymentWorkspace.paymentRows === 'function');
  A('module version advanced (>= 2)', PaymentWorkspace.version >= 2, 'version=' + PaymentWorkspace.version);
  A('capability wrappers exposed', typeof PaymentWorkspace.actionIssue === 'function' && typeof PaymentWorkspace.actionEdit === 'function');

  window.renderPaymentWorkspace();
  let html = pwOut.innerHTML;

  // ── State/History preserved + one dominant Primary Business Question ──────
  A('State (Payment Summary) still renders', /ما إجمالي المدفوعات وحركة اليوم والسيولة الحالية/.test(html));
  A('History (Payment Ledger) still renders', /ما سندات الصرف الموجودة/.test(html));
  A('hero leads with the operational Primary Business Question', /العملية التي يُسمح لي بتنفيذها قانونيًا/.test(html) && (html.match(/pw-hero-bal/g) || []).length === 1);
  A('hero surfaces the dominant next legitimate operation (Issue payment CTA → BO-01 flow)', typeof PaymentWorkspace.nextOperation === 'function' && /pw-hero-cta[^>]*onclick="window\.PaymentWorkspace\.actionIssue\(\)"/.test(html));

  // ── Capability section present + Rule 4 structure ─────────────────────────
  A('Capability section renders (Operational Actions)', /ما الذي يمكنني تنفيذه قانونيًا الآن/.test(html));
  A('capability · issue affordance tagged BO-01', /pw-cap-bo">BO-01/.test(html) && /actionIssue\('food'\)/.test(html) && /actionIssue\('diwan'\)/.test(html));
  A('capability · edit/cancel affordance tagged BO-02 · BO-03', /pw-cap-bo">BO-02 · BO-03/.test(html) && /pw-edit-sel/.test(html) && /actionEdit\(\)/.test(html));
  A('BO-04/05 are NOT offered (reserved for P4-S3)', !/pw-cap-bo">BO-04/.test(html) && !/pw-cap-bo">BO-05/.test(html));
  A('Rule 4 · Intent → Authorization → Execution → Result note present', /النية ← الصلاحية ← التنفيذ عبر عملية أعمال معتمدة فقط ← النتيجة/.test(html));

  // ── Rule 3 · State & History sections carry NO execution controls ─────────
  const ledgerTbl = (html.match(/<table class="pw-table"[\s\S]*?<\/table>/) || [''])[0];
  const summary = between(html, /ملخص المدفوعات/, /سجل سندات الصرف/);
  A('Rule 3 · History (Payment Ledger) has no execution controls', ledgerTbl.length > 0 && !/onclick/.test(ledgerTbl));
  A('Rule 3 · State (Summary) has no execution controls', summary.length > 0 && !/onclick/.test(summary));

  // ── Execution delegates ONLY to certified flows (→ certified BOs) ─────────
  PaymentWorkspace.actionIssue('food');
  PaymentWorkspace.actionIssue('diwan');
  A('issue → certified create flow window.openPay (→ BO-01), food+diwan', payCalls.length === 2 && payCalls[0] === 'food' && payCalls[1] === 'diwan');
  PaymentWorkspace.actionIssue();
  A('issue (hero, generic) → certified create flow with no preset fund', payCalls.length === 3 && payCalls[2] === undefined);
  PaymentWorkspace.actionEdit();
  A('edit/cancel → certified editor window.editPay (→ BO-02/BO-03) for the selected voucher', editCalls.length === 1 && editCalls[0] === 'p1');

  // ── the workspace itself executes NO BO and mutates NO state ──────────────
  A('workspace invokes NO Business Operation directly (0 BusinessOps calls)', boCalls.length === 0, 'calls=' + boCalls.length);
  A('module invokes NO BusinessOps in code (delegates to certified flows)',
    !/BusinessOps\s*\./.test(rd('payment-workspace.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  const payBefore = DB.payments.length, audBefore = DB.audit.length;
  window.renderPaymentWorkspace();
  A('render + actions mutate no store (pure orchestration)', DB.payments.length === payBefore && DB.audit.length === audBefore);

  // ── display still sourced from the certified read model (Rule 6) ──────────
  const s = PaymentWorkspace.paymentState('all');
  const dr = R2((FIN.fundLedger('food', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0)
    + (FIN.fundLedger('diwan', '', '', 'dr') || []).reduce((t, r) => t + Number(r.dr || 0), 0));
  A('display · total still equals certified ledger debits', s.total === dr && s.total === 200, 'total=' + s.total);

  // ── Authorization gating (Rule 4) ─────────────────────────────────────────
  writeFlag = false;
  window.renderPaymentWorkspace();
  const h2 = pwOut.innerHTML;
  A('non-write · issue is disabled with a reason (no create routing)', /pw-cap-off[\s\S]*?BO-01/.test(h2) && !/actionIssue/.test(h2) && /يتطلب صلاحية كتابة/.test(h2));
  writeFlag = true; adminFlag = false;
  window.renderPaymentWorkspace();
  const h3 = pwOut.innerHTML;
  A('non-admin · edit/cancel is disabled with a reason (no editor routing)', /pw-cap-off[\s\S]*?BO-02 · BO-03/.test(h3) && !/actionEdit\(\)/.test(h3) && !/pw-edit-sel/.test(h3) && /يتطلب صلاحية مدير/.test(h3));

  console.log('\n═══ Result: ' + (failures === 0 ? 'SLICE 2 CAPABILITY CONFORMANT' : (failures + ' VIOLATION(S)')) +
    '  ·  ' + (checks - failures) + '/' + checks + ' assertions passed ═══');
  process.exit(failures === 0 ? 0 : 1);
})();
