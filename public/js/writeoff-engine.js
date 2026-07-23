/* ═══════════════════════════════════════════════════════════════════════════
   MODEL2 V2.0 · SLICE 5 — Debt Write-off Engine  (PURE · UN-WIRED)
   Implements the frozen CA-007 Debt Write-off (member permanent departure/death):
     · Resolves the member's OUTSTANDING RECEIVABLE to zero via an explicit, audited,
       NON-CASH member-ledger event — never a silent deletion (Law 1/5/6).
     · Precondition: the member is permanently departed (is_active === false); an active
       member is never written off (closure is an explicit, deliberate act).
     · Amount = the FULL current outstanding debt (finalBalance > 0). A member with no
       outstanding debt has nothing to write off.
   PURE: no globals, no DB, no mutation of the member. Returns a frozen proposed
   `debt_write_off` record; the certified write + audit live in the BO layer
   (operations.js · BO-12), which also self-guards on the MODEL2 V2.0 activation flag.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;       /* Node/tests */
  if (typeof window !== 'undefined') window.WriteOffEngine = api;                    /* browser */
})(this, function () {
  'use strict';
  var R2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  var EPS = 0.005;

  /* Compute a proposed Debt Write-off. Inputs:
       member          — the member row (must exist and be permanently departed)
       outstandingDebt — the member's current outstanding receivable (finalBalance, > 0)
     Returns {ok:false, code, error} on rejection, or {ok:true, row, amount} where `row`
     is a FROZEN proposed debt_write_off record. */
  function computeDebtWriteOff(opts) {
    opts = opts || {};
    var member = opts.member;
    var debt = R2(opts.outstandingDebt);

    if (!member) return { ok: false, code: 'E_INELIGIBLE', error: 'العضو غير موجود' };
    if (member.is_active !== false) return { ok: false, code: 'E_ACTIVE', error: 'العضو ما زال نشطًا — الشطب يكون عند المغادرة الدائمة أو الوفاة فقط' };
    if (!(debt > EPS)) return { ok: false, code: 'E_NODEBT', error: 'لا توجد ذمّة مستحقّة قابلة للشطب' };

    var row = Object.freeze({
      movement_type: 'debt_write_off',
      member_id: member.id != null ? member.id : null,
      payer_name: member.full_name || member.name || null,
      amount: debt,
      amount_ils: debt,
      currency: 'ILS',
      exchange_rate: 1,
      destination_treasury: null,           /* NON-CASH — no treasury movement (Law 8 untouched) */
      fund_type: 'writeoff',                /* neutral — excluded from food/diwan/donation cash views */
      is_write_off: true
    });

    return { ok: true, row: row, amount: debt };
  }

  /* Compute a proposed Credit Write-off (CA-007 · Slice 6). Inputs:
       member           — the member row (must exist and be permanently departed)
       outstandingCredit — the member's current outstanding CREDIT (creditBalance, > 0)
     Member credit is NEVER auto-refunded and must NOT remain a perpetual liability
     (OD-06/OD-07): on permanent departure it is resolved to zero by this explicit,
     audited, NON-CASH member-ledger event. Returns {ok:false,...} or {ok:true,row,amount}
     with a FROZEN proposed credit_write_off record; the member is never mutated (Law 5). */
  function computeCreditWriteOff(opts) {
    opts = opts || {};
    var member = opts.member;
    var credit = R2(opts.outstandingCredit);

    if (!member) return { ok: false, code: 'E_INELIGIBLE', error: 'العضو غير موجود' };
    if (member.is_active !== false) return { ok: false, code: 'E_ACTIVE', error: 'العضو ما زال نشطًا — الشطب يكون عند المغادرة الدائمة أو الوفاة فقط' };
    if (!(credit > EPS)) return { ok: false, code: 'E_NOCREDIT', error: 'لا يوجد رصيد دائن قابل للشطب' };

    var row = Object.freeze({
      movement_type: 'credit_write_off',
      member_id: member.id != null ? member.id : null,
      payer_name: member.full_name || member.name || null,
      amount: credit,
      amount_ils: credit,
      currency: 'ILS',
      exchange_rate: 1,
      destination_treasury: null,           /* NON-CASH — no treasury movement, no refund (Law 8 untouched) */
      fund_type: 'writeoff',                /* neutral — excluded from food/diwan/donation cash views */
      is_write_off: true
    });

    return { ok: true, row: row, amount: credit };
  }

  function isDebtWriteOff(mt) { return mt === 'debt_write_off'; }
  function isCreditWriteOff(mt) { return mt === 'credit_write_off'; }
  function isWriteOff(mt) { return mt === 'debt_write_off' || mt === 'credit_write_off'; }

  return { version: 'v2.0-slice6', computeDebtWriteOff: computeDebtWriteOff, computeCreditWriteOff: computeCreditWriteOff,
    isDebtWriteOff: isDebtWriteOff, isCreditWriteOff: isCreditWriteOff, isWriteOff: isWriteOff, R2: R2 };
});
