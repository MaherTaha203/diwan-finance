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

   Idempotent by construction: a pure function of the row. The actual write (P2-C)
   applies it only WHERE movement_type IS NULL, so re-runs never re-classify. ─── */
(function(){
  'use strict';

  function classifyReceipt(r){
    const f=r.fund_type;
    if(f==='food'){
      return r.payer_type==='member'
        ? {movement_type:'subscription_payment', destination_treasury:'food', source_treasury:null, reason:'member_food_payment'}
        : {movement_type:'donation_cash',        destination_treasury:'food', source_treasury:null, reason:'nonmember_food_donation'};
    }
    if(f==='diwan'){
      return {movement_type:'donation_cash', destination_treasury:'diwan', source_treasury:null, reason:'diwan_donation'};
    }
    if(f==='donation'){
      const d=r.donation_display_fund;
      if(d==='diwan') return {movement_type:'donation_cash', destination_treasury:'diwan', source_treasury:null, reason:'diwan_directed_donation'};
      if(d==='food'){
        /* ق1(أ): reduce_deficit (and default) → historical_deficit; only an
           explicit support_current donation lands in the food treasury. */
        if(r.food_donation_allocation==='support_current')
          return {movement_type:'donation_cash', destination_treasury:'food', source_treasury:null, reason:'current_support_donation'};
        return {movement_type:'donation_cash', destination_treasury:'historical_deficit', source_treasury:null, reason:'deficit_directed_donation'};
      }
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
