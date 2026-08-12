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
  /* FD-021 (IG-011): the ILS accounting amount ONLY — native `amount` is never
     a fallback (a row without amount_ils contributes 0, fail-safe). */
  function amountOf(r){ return Number(r.amount_ils||0); }

  /* ق5 (2026-07-12) — the debt-settled slice of a member's food-display cash
     donation is DEFICIT money (custody in the food box, earmarked to settle the
     historical deficit) and the voucher is NOT a general donation. The single
     source of truth for "the operation reduces his debt" is the pure Item-9
     allocation (chronological, read-time) consumed via the frozen FIN facade —
     this unifies former engine divergence #2 by owner ruling. Without FIN
     (node unit tests) the behaviour stays neutral, exactly as before. */
  function q5Settled(r){
    /* destination must be food: a reclassified dest=historical_deficit row must
       never debit food for cash that never entered it (Fable 5 note B-1).
       Domain 2 — union by the register property, NOT the literal `donation_cash`
       (FA-01 binding rule): FE-002 `food_cash_donation` carries ق5 exactly like
       the transitional FE-014, so a member's deficit-settling food donation is
       recognised whichever type it was captured as. */
    const _ev=r?eventDef(r.movement_type):null;
    if(!(r&&_ev&&_ev.register==='cash_donation'&&r.destination_treasury==='food'
         &&r.fund_type==='donation'&&r.donation_display_fund==='food'&&r.member_id)) return 0;
    /* FIN is a top-level `const` (global lexical binding, NOT window.FIN) */
    const F=(typeof FIN!=='undefined'&&FIN&&FIN.allocateFoodDonations)?FIN:null;
    if(!F) return 0;
    const sp=F.allocateFoodDonations().perReceipt[r.id];
    return sp?Number(sp.debtSettled||0):0;
  }
  /* V6 · Law 4 — the ق5 transfer's EXPLICIT accounting identity, from the MODEL2
     catalog (event q5_debt_settlement_transfer): source treasury (Food) and
     destination treasury (Historical-Deficit) are declared, not inferred here. */
  function q5Event(){ const m=M(); return (m&&m.EVENTS&&m.EVENTS.q5_debt_settlement_transfer)||null; }
  function q5Source(){ const e=q5Event(); return (e&&e.source_treasury)||'food'; }
  function q5Dest(){ const e=q5Event(); return (e&&e.treasury)||'historical_deficit'; }

  /* ── P-DEFICIT-SPLIT — accountant-designated historical slice of a member Food receipt ──
     A Food receipt may carry an explicit "historical" settlement line (the accountant's
     Historical-Deficit decision). Economically that slice is DEFICIT money: it moves
     Food → Historical-Deficit, exactly like the ق5 donation slice. It is read from the
     SAME active settlement lines the member-debt reader uses (fin.js _explHist:
     source_kind='receipt_settlement', obligation_kind='historical', on a LIVE non-deleted
     receipt, not voided_at / not refunded_at) — so the treasury movement equals the
     historical-debt reduction to the shekel, and a cancel (is_deleted) / void / refund
     reverses BOTH together. The receipt itself stays destination_treasury='food' (its full
     amount is added to Food by the loop above); this only carves the deficit slice back
     out. NEUTRAL when the flag is OFF or no such line exists (returns 0). */
  function settlementDeficitSlice(){
    if(typeof window==='undefined'||window.RECEIPT_ALLOCATION_ENABLED!==true) return 0;
    if(typeof DB==='undefined'||!Array.isArray(DB.allocation_records)) return 0;
    const live={}; (DB.receipts||[]).forEach(r=>{ if(r&&!r.is_deleted) live[r.id]=true; });
    return R2((DB.allocation_records||[]).reduce((s,a)=>{
      if(!a||a.source_kind!=='receipt_settlement'||a.obligation_kind!=='historical') return s;
      if(!live[a.source_ref]||a.voided_at||a.refunded_at) return s;
      return s+Number(a.amount_allocated||0);
    },0));
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
    /* Domain 2 — union predicate for every cash-donation event type (FA-01 binding
       rule: consumers group by the register property, never the literal type). */
    isCashDonation(mt){ const ev=eventDef(mt); return !!(ev&&ev.register==='cash_donation'); },

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
        /* ق5 — the debt-settled slice moves per its EXPLICIT accounting identity
           (V6 · Law 4): out of the source treasury, into the destination treasury.
           Direction is read from the MODEL2 event, not hard-coded here (same values:
           food → historical_deficit). */
        const q5=q5Settled(r);
        if(q5>0){
          if(key===q5Source()) bal -= q5;
          if(key===q5Dest())   bal += q5;
        }
      });
      /* CA-005 refunds live in the dedicated `refunds` table (not payments): each live
         refund is an OUTFLOW from its origin treasury (Law 8). Subtract it here so the
         origin treasury reflects the money leaving. Empty table ⇒ no effect (flag OFF). */
      ((typeof DB!=='undefined'&&DB.refunds)||[]).forEach(rf=>{
        if(!rf.is_deleted && rf.destination_treasury===key) bal -= amountOf(rf);
      });
      /* IG-014 (FD-022…025) — Administrative Internal Transfers live in the dedicated
         `internal_transfers` table: money leaves the source treasury and enters the
         destination treasury. Non-revenue/non-expense redistribution — it never touches
         receipts/payments, so income/expense totals and member liabilities are unchanged.
         Empty table ⇒ no effect. */
      ((typeof DB!=='undefined'&&DB.internal_transfers)||[]).forEach(tr=>{
        if(tr.is_deleted) return;
        if(tr.source_treasury===key)      bal -= amountOf(tr);
        if(tr.destination_treasury===key) bal += amountOf(tr);
      });
      /* P-DEFICIT-SPLIT — carve the accountant-designated historical slice out of Food
         and into Historical-Deficit (see settlementDeficitSlice). Food/deficit only. */
      const _defSlice=settlementDeficitSlice();
      if(_defSlice>0){
        if(key==='food')               bal -= _defSlice;
        if(key==='historical_deficit') bal += _defSlice;
      }
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

    /* ---- Historical Deficit FUNDING (CA-004 R1) ----
       The internal `historical_deficit_settlement` OUTFLOW was retired: the software
       only records historical-deficit funding; external settlements are intentionally
       outside the accounting model. The Historical Deficit Treasury represents the
       total funding accumulated INSIDE the software; payments to historical creditors
       are performed outside it and are intentionally not reflected in this balance —
       so the reported balance is accumulated constitutional funding recorded by the
       system, not the external cash position after manual settlements. "Total
       Historical Funding" is the amount the Allocation Engine has moved into the
       deficit treasury — collections + directed donations + ق5 debt-settled slices
       (== deficitInflows). */
    historicalFundingTotal(){ return FIN2.deficitInflows(); },
    historicalFunding(){ return FIN2.deficitEntries(); },

    /* P-DEFICIT-SPLIT — per-receipt Historical-Deficit slice for one member (PRESENTATION).
       Maps each of the member's live Food receipts (by receipt no) to the active
       "historical" settlement amount recorded against it — the SAME lines the treasury
       movement (settlementDeficitSlice) and the member-debt reader (fin.js _explHist)
       consume. The member statement uses this to split the food-receipt row into its
       Food and Historical-Deficit portions WITHOUT itself reading allocation_records:
       the single treasury read stays in this engine, the single attribution read in
       fin.js. Empty map when the flag is OFF or no such line exists. */
    settlementHistoricalByReceipt(memberId){
      const out={};
      if(typeof window==='undefined'||window.RECEIPT_ALLOCATION_ENABLED!==true) return out;
      if(typeof DB==='undefined'||!Array.isArray(DB.allocation_records)) return out;
      const byId={}; (DB.receipts||[]).forEach(r=>{ if(r&&!r.is_deleted) byId[r.id]=r; });
      (DB.allocation_records||[]).forEach(a=>{
        if(!a||a.source_kind!=='receipt_settlement'||a.obligation_kind!=='historical'||a.voided_at||a.refunded_at) return;
        const r=byId[a.source_ref]; if(!r||r.fund_type!=='food') return;
        if(memberId!=null&&r.member_id!==memberId) return;
        out[r.no]=R2((out[r.no]||0)+Number(a.amount_allocated||0));
      });
      return out;
    },

    /* ---- ق5 transfers as EXPLICIT classified accounting events (V6 · Law 4) ----
       Each member food-display donation whose debt-settled slice > 0 IS a first-class
       transfer event (movement_type q5_debt_settlement_transfer): Food → Historical-
       Deficit. The amount is derived from the single-source Item-9 allocation; the
       accounting identity is explicit (declared in MODEL2), not inferred at read time.
       DISPLAY/audit accessor — the treasury math already applies the same slice, so this
       adds NO numeric effect; it makes the movement enumerable and self-describing. */
    q5Transfers(){
      const ev=q5Event();
      return liveRows().reduce((out,r)=>{
        const q5=q5Settled(r);
        if(q5>0) out.push({
          no:r.no||null, date:r.receipt_date||r.payment_date||null,
          payer:r.payer_name||null, member_id:r.member_id||null,
          amount:R2(q5), movement_type:(ev&&ev.key)||'q5_debt_settlement_transfer',
          source_treasury:q5Source(), destination_treasury:q5Dest(), automatic:true, derived_from:'item9_debt_settlement'
        });
        return out;
      },[]);
    },
    q5TransferTotal(){ return R2(FIN2.q5Transfers().reduce((s,t)=>s+t.amount,0)); },

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
      /* directed donations + ق4 collections + ق5 debt-settled slices + Food-receipt
         historical settlement slices (P-DEFICIT-SPLIT) */
      return R2(classifiedRows()
        .filter(r=>(eventDef(r.movement_type)||{}).cash===true&&!(eventDef(r.movement_type)||{}).outflow)
        .reduce((s,r)=>s+(r.destination_treasury==='historical_deficit'?amountOf(r):0)+q5Settled(r),0)
        +settlementDeficitSlice());
    },
    /* Itemised inflow entries behind deficitInflows() — DISPLAY ONLY (deficit
       ledger for the treasury view). Every cash inflow directed to the deficit
       plus each ق5 debt-settled slice, as a dated line carrying its own receipt
       number. Sums exactly to deficitInflows(); it records money entering the
       deficit only (settlement money leaves directly, off-ledger by owner ruling
       — no synthetic in/out pair). */
    deficitEntries(){
      const out=[];
      classifiedRows().forEach(r=>{
        const ev=eventDef(r.movement_type);
        if(ev&&ev.cash===true&&!ev.outflow&&r.destination_treasury==='historical_deficit'){
          out.push({ no:r.no||null, date:r.receipt_date||r.payment_date||null,
                     payer:r.payer_name||null, member_id:r.member_id||null,
                     amount:amountOf(r), kind:r.movement_type });
        }
        const q5=q5Settled(r);
        if(q5>0){
          out.push({ no:r.no||null, date:r.receipt_date||r.payment_date||null,
                     payer:r.payer_name||null, member_id:r.member_id||null,
                     amount:R2(q5), kind:'q5_debt_settlement' });
        }
      });
      /* P-DEFICIT-SPLIT — itemise each active Food-receipt historical settlement slice
         (sums into deficitInflows alongside the rows above). */
      if(typeof window!=='undefined'&&window.RECEIPT_ALLOCATION_ENABLED===true&&typeof DB!=='undefined'&&Array.isArray(DB.allocation_records)){
        const _byId={}; (DB.receipts||[]).forEach(r=>{ if(r) _byId[r.id]=r; });
        (DB.allocation_records||[]).forEach(a=>{
          if(!a||a.source_kind!=='receipt_settlement'||a.obligation_kind!=='historical'||a.voided_at||a.refunded_at) return;
          const r=_byId[a.source_ref]; if(!r||r.is_deleted) return;
          out.push({ no:r.no||null, date:r.receipt_date||null, payer:r.payer_name||null,
                     member_id:r.member_id||null, amount:R2(Number(a.amount_allocated||0)), kind:'historical_settlement' });
        });
      }
      return out.sort((a,b)=> new Date(a.date||0)-new Date(b.date||0));
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
