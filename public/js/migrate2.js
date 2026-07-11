/* ═══ MIGRATE v2 — LEGACY → NEW-MODEL CLASSIFIER (P2-C, pure/inert) ══════════
   The deterministic, side-effect-free mapping from a legacy receipt/payment row
   to its new-model classification (movement_type / destination_treasury /
   source_treasury / reason). Used by the P2-C0 dry run (read-only) and later by
   the guarded P2-C write. It is INERT on its own: it defines window.MIGRATE2 and
   runs nothing — no DB, no FIN, no DOM. Nothing calls it automatically.

   Ratified owner decisions (2026-07-11):
     ق1(أ): every food donation directed to the deficit stays a deficit donation
            (destination historical_deficit); it is NOT re-read as debt settlement.
            Settlement is a separate later event (paying beneficiaries).
     ق2   : every member food receipt is a Member Payment into the Food treasury;
            its split across 2025/2026/historical/future stays with the allocation
            engine at member-statement read time (not a treasury concern).
     ق3 (P2-C0 rejection, 2026-07-11): a monetary value recorded for DOCUMENTATION
            does NOT create cash. Diwan-display "donations" are NOT assumed cash:
            each voucher is classified ONLY by the owner-approved per-voucher
            ledger below (evidence: the voucher's own notes + the physical diwan
            cash count matching 3,481 WITHOUT them). Any live voucher of this
            shape not in the ledger → null → the migration STOPS and asks.

   Idempotent by construction: a pure function of the row. The actual write (P2-C)
   applies it only WHERE movement_type IS NULL, so re-runs never re-classify. ─── */
(function(){
  'use strict';

  /* ق3 — OWNER-DECISION LEDGER for donation-display vouchers (Appendix A).
     kind: 'inkind' (donated asset/materials) | 'service' (donated work/services)
           | 'cash' (money physically entered a treasury).
     Non-cash entries have ZERO treasury effect: they become donation_inkind
     records whose value is documentation only (In-Kind & Services Register).
     PENDING OWNER APPROVAL of Appendix A before any actual write. */
  const DONATION_LEDGER = {
    /* live rows — the former +1,863.72 (evidence: notes say «مقابل أعمال/فاتورة/شراء») */
    'REC-00026': {kind:'service', category:'maintenance',            evidence:'مقابل أعمال شبك ماتور كهرباء'},
    'REC-00003': {kind:'service', category:'maintenance',            evidence:'مقابل أعمال صيانة مواسير ونقل خزانات'},
    'REC-00004': {kind:'inkind',  category:'other',                  evidence:'مقابل فاتورة مواد وأدوات تنظيف'},
    'REC-00031': {kind:'service', category:'professional_services',  evidence:'شراء domain + تصميم وإنشاء النظام'},
    /* the one live cash donation (paper voucher 00115) — directed to the deficit */
    'REC-00058': {kind:'cash', destination:'historical_deficit',     evidence:'سند قبض يدوي رقم 00115'},
    /* deleted rows — financially inert; categorized for completeness only */
    'REC-00025': {kind:'service', category:'maintenance', deleted:true},
    'REC-00007': {kind:'inkind',  category:'other',       deleted:true},
    'REC-00009': {kind:'service', category:'professional_services', deleted:true},
    'REC-00012': {kind:'unknown', deleted:true},
    'REC-00023': {kind:'unknown', deleted:true},
    'REC-00037': {kind:'unknown', deleted:true},
    'REC-00039': {kind:'unknown', deleted:true},
    'REC-00040': {kind:'unknown', deleted:true},
    'REC-00042': {kind:'unknown', deleted:true},
    'REC-00043': {kind:'unknown', deleted:true},
    'REC-00044': {kind:'unknown', deleted:true}
  };

  function classifyReceipt(r){
    const f=r.fund_type;
    if(f==='food'){
      return r.payer_type==='member'
        ? {movement_type:'subscription_payment', destination_treasury:'food', source_treasury:null, reason:'member_food_payment'}
        : {movement_type:'donation_cash',        destination_treasury:'food', source_treasury:null, reason:'nonmember_food_donation'};
    }
    if(f==='diwan'){
      /* counted in the reconciled physical diwan balance (3,481) → real cash */
      return {movement_type:'donation_cash', destination_treasury:'diwan', source_treasury:null, reason:'diwan_donation'};
    }
    if(f==='donation'){
      /* ق3 — never guess: donation-display vouchers classify ONLY via the ledger */
      const led=DONATION_LEDGER[r.no];
      if(!led || led.kind==='unknown'){
        return r.is_deleted
          ? {movement_type:'reclassification', destination_treasury:null, source_treasury:null, reason:'deleted_unresolved'}
          : null;   /* live + undecided → STOP and ask the owner */
      }
      if(led.kind==='cash'){
        return {movement_type:'donation_cash', destination_treasury:led.destination, source_treasury:null, reason:'owner_ledger_cash'};
      }
      /* inkind/service: documentation value only — ZERO treasury effect */
      return {movement_type:'donation_inkind', destination_treasury:null, source_treasury:null,
              reason:'owner_ledger_'+led.kind, register_category:led.category||'other'};
    }
    return null;   /* unknown shape → caller must STOP and ask the owner (FMD-01) */
  }

  function classifyPayment(p){
    const f=p.fund_type;
    if(f==='food')  return {movement_type:'food_expense',  destination_treasury:'food',  source_treasury:null, reason:'food_expense'};
    if(f==='diwan') return {movement_type:'diwan_expense', destination_treasury:'diwan', source_treasury:null, reason:'diwan_expense'};
    return null;
  }

  /* human-readable legacy label, for the dry-run diff report only */
  function legacyLabel(row, kind){
    if(kind==='payment') return 'مصروف '+(row.fund_type||'?')+(row.expense_type?(' · '+row.expense_type):'');
    const f=row.fund_type;
    if(f==='donation') return 'تبرع (عرض='+(row.donation_display_fund||'?')+(row.food_donation_allocation?(' · '+row.food_donation_allocation):'')+')';
    return 'إيصال '+(f||'?')+' · '+(row.payer_type||'?');
  }

  const MIGRATE2 = {
    version: 2,
    decisions: { q1:'A_deficit_donations_stay_deficit', q2:'member_food_receipt_is_member_payment' },
    classifyReceipt, classifyPayment, legacyLabel,
    classify(row, kind){ return kind==='payment' ? classifyPayment(row) : classifyReceipt(row); }
  };
  if(typeof window!=='undefined') window.MIGRATE2 = MIGRATE2;
  if(typeof module!=='undefined' && module.exports) module.exports = MIGRATE2;
})();
