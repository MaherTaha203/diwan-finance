/* ═══ FIN v2 — NEW-MODEL ENGINE EXTENSION (P2-B) ═════════════════════════════
   Additive companion to the FROZEN fin.js. Teaches the engine to READ the new
   financial model (MODEL2): the three cash treasuries incl. Historical Deficit,
   the two donation registers, deficit settlement, and the classification layer.

   It reads a per-row classification that P2-C will persist on receipt/payment
   rows: `movement_type`, `destination_treasury`, and (for transfers) `source_treasury`.
   Until P2-C writes those fields, NO row is classified, so every function here
   returns a NEUTRAL value (0 / empty). Therefore:
     • no existing balance, report, statement, print or export changes;
     • fin.js is untouched (its fingerprint stays identical);
     • nothing in the UI reads FIN2 yet (wiring displays is P2-D).
   Reverting P2-B = delete this file and its <script> tag. Correctness of the
   new-model math is proven by api-style unit tests on synthetic classified rows. */
(function(){
  'use strict';
  const R2 = n => Math.round((Number(n)||0)*100)/100;
  const M  = () => (typeof window!=='undefined' && window.MODEL2) || null;

  /* live, non-deleted receipt+payment rows (the only cash-bearing sources today) */
  function liveRows(){
    const rec=(typeof DB!=='undefined'&&DB.receipts)?DB.receipts.filter(r=>!r.is_deleted):[];
    const pay=(typeof DB!=='undefined'&&DB.payments)?DB.payments.filter(p=>!p.is_deleted):[];
    return rec.concat(pay);
  }
  /* a row is "classified" only when it carries the new movement_type + destination */
  function classifiedRows(){
    return liveRows().filter(r=>r&&r.movement_type&&r.destination_treasury);
  }
  function eventDef(type){ const m=M(); return m&&m.EVENTS?m.EVENTS[type]:null; }
  function amountOf(r){ return Number(r.amount_ils||r.amount||0); }

  /* ق5 (2026-07-12) — the debt-settled slice of a member's food-display cash
     donation is DEFICIT money (custody in the food box, earmarked to settle the
     historical deficit) and the voucher is NOT a general donation. The single
     source of truth for "the operation reduces his debt" is the pure Item-9
     allocation (chronological, read-time) consumed via the frozen FIN facade —
     this unifies former engine divergence #2 by owner ruling. Without FIN
     (node unit tests) the behaviour stays neutral, exactly as before. */
  function q5Settled(r){
    if(!(r&&r.movement_type==='donation_cash'&&r.fund_type==='donation'
         &&r.donation_display_fund==='food'&&r.member_id)) return 0;
    /* FIN is a top-level `const` (global lexical binding, NOT window.FIN) */
    const F=(typeof FIN!=='undefined'&&FIN&&FIN.allocateFoodDonations)?FIN:null;
    if(!F) return 0;
    const sp=F.allocateFoodDonations().perReceipt[r.id];
    return sp?Number(sp.debtSettled||0):0;
  }

  const FIN2 = {
    version: 2,
    /* ---- classification read (never inferred here; P2-C persists it) ---- */
    classify(row){
      if(!row||!row.movement_type) return null;
      return { type:row.movement_type,
               destination:row.destination_treasury||null,
               source:row.source_treasury||null,
               reason:row.movement_reason||null };
    },
    isClassified(){ return classifiedRows().length>0; },
    classifiedCount(){ return classifiedRows().length; },

    /* ---- cash treasuries (three) ----
       balance = Σ cash inflows to this treasury − Σ cash outflows.
       Outflow is either an event flagged outflow:true whose destination IS this
       treasury, or a transfer whose source IS this treasury (money leaving it). */
    treasuryBalance(key){
      let bal=0;
      classifiedRows().forEach(r=>{
        const ev=eventDef(r.movement_type);
        if(!ev||ev.cash!==true) return;              /* registers/in-kind never move cash */
        const amt=amountOf(r);
        if(r.destination_treasury===key) bal += ev.outflow ? -amt : amt;
        if(r.source_treasury===key)      bal -= amt; /* transfer leaves the source treasury */
        /* ق5 — move the debt-settled slice: food → historical_deficit */
        const q5=q5Settled(r);
        if(q5>0){
          if(key==='food')               bal -= q5;
          if(key==='historical_deficit') bal += q5;
        }
      });
      return R2(bal);
    },
    foodTreasury(){          return FIN2.treasuryBalance('food'); },
    diwanTreasury(){         return FIN2.treasuryBalance('diwan'); },
    historicalDeficitTreasury(){ return FIN2.treasuryBalance('historical_deficit'); },

    /* ---- registers: references only, NEVER a cash balance ----
       Lists LIVE cash-donation references. Whether a voided donation should remain
       visible as status:'void' (FAS-01 م.7 — records are permanent) is a display
       decision deferred to P2-D; today the register is empty on production data. */
    cashDonationRegister(){
      /* ق5 — a member donation that settles his own debt is NOT a general
         donation: it stays visible in the donations section, member statement,
         food statement and deficit statement, but never in this register. */
      return classifiedRows()
        .filter(r=>{ const ev=eventDef(r.movement_type); return ev&&ev.register==='cash_donation'&&!(q5Settled(r)>0); })
        .map(r=>({ reference_no:r.no||null, date:r.receipt_date||r.payment_date||null,
                   donor:r.payer_name||null, amount:amountOf(r),
                   destination_treasury:r.destination_treasury||null,
                   linked_receipt:r.no||null, status:r.is_deleted?'void':'active' }));
    },
    inkindRegister(){
      /* In-Kind & Services Register: dedicated table (P2-C, for new entries) PLUS
         historical vouchers reclassified as donation_inkind (ق3). Estimated value
         is DOCUMENTATION only — these rows never touch any cash treasury. */
      const table=(typeof DB!=='undefined'&&Array.isArray(DB.inkind_donations)) ? DB.inkind_donations.slice() : [];
      /* donation_inkind rows have destination_treasury=null BY DESIGN (no cash
         destination), so filter liveRows by movement_type directly. */
      const legacy=liveRows().filter(r=>r.movement_type==='donation_inkind')
        .map(r=>({ reference_no:r.no||null, date:r.receipt_date||null, donor:r.payer_name||null,
                   category:r.register_category||'other', estimated_value:amountOf(r),
                   description:r.notes||'', status:'active' }));
      return table.concat(legacy);
    },

    /* ---- deficit settlement events (cash OUT of the deficit treasury) ---- */
    deficitSettlements(){
      return classifiedRows().filter(r=>r.movement_type==='historical_deficit_settlement');
    },
    deficitSettlementTotal(){
      return R2(FIN2.deficitSettlements().reduce((s,r)=>s+amountOf(r),0));
    },

    /* ---- overflow rule (deficit → food when remaining deficit hits zero) ----
       Pure helper describing the ratified rule; no automatic side effect here. */
    overflowDue(remainingDeficit, incoming){
      const rem=Number(remainingDeficit)||0, inc=Number(incoming)||0;
      if(rem<=0) return R2(inc);                 /* deficit already cleared → all overflows */
      return inc>rem ? R2(inc-rem) : 0;          /* only the part beyond the remaining deficit */
    },

    /* ---- allocation order (member payments): strict, from MODEL2 ---- */
    allocationOrder(){ const m=M(); return m?m.ALLOCATION_ORDER.map(s=>s.key):[]; },

    /* ---- composed treasury view (P2-D): openings + movements + overflow rule.
       Overflow is a READ-TIME rule (no rows written): once the deficit reaches
       zero, any excess automatically counts in the Food treasury. Openings come
       from window.TREASURY_OPENINGS — the single formal mapping. ---- */
    deficitInflows(){
      /* directed donations + ق4 collections + ق5 debt-settled slices */
      return R2(classifiedRows()
        .filter(r=>(eventDef(r.movement_type)||{}).cash===true&&!(eventDef(r.movement_type)||{}).outflow)
        .reduce((s,r)=>s+(r.destination_treasury==='historical_deficit'?amountOf(r):0)+q5Settled(r),0));
    },
    composed(){
      const OP=(typeof window!=='undefined'&&window.TREASURY_OPENINGS)||{food:0,diwan:0,historical_deficit:0};
      const rem=R2(Number(OP.historical_deficit||0)+FIN2.historicalDeficitTreasury());
      const overflow=Math.max(0,rem);
      return {
        food: R2(Number(OP.food||0)+FIN2.foodTreasury()+overflow),
        diwan: R2(Number(OP.diwan||0)+FIN2.diwanTreasury()),
        historical_deficit_remaining: R2(Math.min(0,rem)),
        overflow_to_food: R2(overflow)
      };
    }
  };

  if(typeof window!=='undefined') window.FIN2 = FIN2;
  if(typeof module!=='undefined' && module.exports) module.exports = FIN2;   /* for node unit tests */
})();
