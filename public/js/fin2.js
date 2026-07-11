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
      });
      return R2(bal);
    },
    foodTreasury(){          return FIN2.treasuryBalance('food'); },
    diwanTreasury(){         return FIN2.treasuryBalance('diwan'); },
    historicalDeficitTreasury(){ return FIN2.treasuryBalance('historical_deficit'); },

    /* ---- registers: references only, NEVER a cash balance ---- */
    cashDonationRegister(){
      return classifiedRows()
        .filter(r=>{ const ev=eventDef(r.movement_type); return ev&&ev.register==='cash_donation'; })
        .map(r=>({ reference_no:r.no||null, date:r.receipt_date||r.payment_date||null,
                   donor:r.payer_name||null, amount:amountOf(r),
                   destination_treasury:r.destination_treasury||null,
                   linked_receipt:r.no||null, status:r.is_deleted?'void':'active' }));
    },
    inkindRegister(){
      /* dedicated table added in P2-C; empty until then. Never holds cash. */
      return (typeof DB!=='undefined'&&Array.isArray(DB.inkind_donations)) ? DB.inkind_donations.slice() : [];
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
    allocationOrder(){ const m=M(); return m?m.ALLOCATION_ORDER.map(s=>s.key):[]; }
  };

  if(typeof window!=='undefined') window.FIN2 = FIN2;
  if(typeof module!=='undefined' && module.exports) module.exports = FIN2;   /* for node unit tests */
})();
