/* ═══ FINANCIAL ENGINE — FIN (Module 10 — extracted from app.js, Phase B) ═══
   ⚠️ FROZEN FINANCIAL CODE — the single source of truth for every balance,
   statement, ledger, allocation and delinquency figure in the system.
   This file is a byte-identical verbatim move of the FINANCIAL ENGINE
   section of app.js: the FIN object (memberBalance/memberStatement/
   fundLedger/allocateFoodDonations/foodBalance/diwanBalance/
   memberDelinquency/subscriptionYears/balanceLabel/…), the canonical
   movement-class labels (mcLabel), the Phase 15 FINAL-LOCK historical
   balance formula (calcHistoricalFromYear) and its form handler
   (onMemberFromYearChange). NO formula, rounding, rule or constant was
   changed — regression-proven by a full-output fingerprint (every member
   statement row, both fund ledgers, the donation allocation map, all
   delinquency flags) hashed before and after the move.
   Loaded via <script defer> BEFORE app.js; FIN is a top-level const in
   the shared global lexical environment, visible to data.js, crud.js,
   print.js, reports.js and app.js exactly as before. Runtime deps
   (DB, window.LANG/t, fmt) resolve at call time. */

/* ═══ FINANCIAL ENGINE ═══ */
const FIN={

  /* ── SINGLE SOURCE OF TRUTH for member balances (Phase 11.5) ──
     memberBalance delegates to memberStatement; no balance formula is duplicated. */
  memberBalance(memberId){
    return FIN.memberStatement(memberId).finalBalance;
  },

  /* Authoritative member ledger. Returns the ledger rows AND the final balance.
     prepaid_subscription_ils is represented as a capped credit row:
     covers 2025/2026 only, never 2027+, never carried forward, never a standalone
     credit (capped by eligible 2025/2026 dues). Sign convention unchanged:
     positive = على العضو مستحقات. */
  memberStatement(memberId, from, to){
    const member = DB.members.find(m => m.id === memberId);
    if(!member) return {member:null, rows:[], openingBalance:0, totalDues:0, totalPaid:0, prepaidEffective:0, finalBalance:0, creditBalance:0};

    /* PHASE 1 — Authoritative member model (Excel migration, Phase 0).
       Opening debt source = historical_balance_ils (NEVER opening_balance).
       Dues + pre-system payments come from member_subscriptions + historical_payments_ils.
       New (post-migration) payments are live food receipts.
       Legacy opening_balance and prepaid_subscription_ils are NOT used (no double counting). */
    const openingDebt    = Number(member.historical_balance_ils || 0);
    const historicalPaid = Number(member.historical_payments_ils || 0);
    const fd = from ? new Date(from) : null;
    const td = to   ? new Date(to)   : null;
    const inRange = d => { if(!d || d==='—') return true; const dt=new Date(d); if(fd&&dt<fd) return false; if(td&&dt>td) return false; return true; };

    const subs = (DB.subscriptions||[])
      .filter(s => s.member_id === memberId)
      .sort((a,b)=>Number(a.year)-Number(b.year));

    const rows = [];
    if(openingDebt !== 0)
      rows.push({date:'—', no:'—', desc:'ذمة تاريخية قبل 2025 · Historical Opening', cr:0, dr:openingDebt, cls:'opening'});
    if(historicalPaid !== 0)
      rows.push({date:'—', no:'—', desc:'مدفوعات قبل 2025 · Payments before 2025', cr:historicalPaid, dr:0, cls:'paid'});

    subs.forEach(s => {
      const due  = Number(s.due_amount_ils  || 0);
      const paid = Number(s.paid_amount_ils || 0);
      if(due  > 0) rows.push({date:s.year+'-01-01', no:'—', desc:`اشتراك سنة ${s.year}`, cr:0, dr:due, cls:'due'});
      if(paid > 0) rows.push({date:s.year+'-12-31', no:'—', desc:`دفعات اشتراك ${s.year}`, cr:paid, dr:0, cls:'paid'});
    });

    DB.receipts
      .filter(r => !r.is_deleted && r.fund_type==='food' && r.member_id===memberId && inRange(r.receipt_date))
      .forEach(r => rows.push({date:r.receipt_date, no:r.no, desc:r.notes||'مساهمة', cr:Number(r.amount_ils||r.amount||0), dr:0, cls:'paid'}));

    /* ق4 — member-linked deficit collections reduce the member's OWN historical
       debt: a paid (credit) row in his statement for the full amount. */
    DB.receipts
      .filter(r => !r.is_deleted && r.movement_type==='historical_debt_collection' && r.member_id===memberId && inRange(r.receipt_date))
      .forEach(r => rows.push({date:r.receipt_date, no:r.no, desc:'تحصيل ذمة تاريخية · Historical Debt Collection', cr:Number(r.amount_ils||r.amount||0), dr:0, cls:'paid'}));

    /* CA-007 — Debt Write-off (member permanent departure/death): a NON-CASH member-
       ledger credit that resolves the member's outstanding receivable. Preserves
       immutable history (a NEW record, never a silent deletion). Zero rows today ⇒
       byte-identical until MODEL2 V2.0 activation. */
    const debtWrittenOff = (DB.receipts||[])
      .filter(r => !r.is_deleted && r.movement_type==='debt_write_off' && r.member_id===memberId && inRange(r.receipt_date))
      .reduce((s,r) => { rows.push({date:r.receipt_date, no:r.no, desc:'شطب ذمة · Debt Write-off', cr:Number(r.amount_ils||r.amount||0), dr:0, cls:'writeoff'}); return s + Number(r.amount_ils||r.amount||0); }, 0);

    /* CA-007 — Credit Write-off (member permanent departure/death): a NON-CASH member-
       ledger DEBIT that resolves the member's outstanding CREDIT (never refunded, never a
       perpetual liability). A NEW record, immutable history preserved. Zero rows today ⇒
       byte-identical until MODEL2 V2.0 activation. */
    const creditWrittenOff = (DB.receipts||[])
      .filter(r => !r.is_deleted && r.movement_type==='credit_write_off' && r.member_id===memberId && inRange(r.receipt_date))
      .reduce((s,r) => { rows.push({date:r.receipt_date, no:r.no, desc:'شطب رصيد دائن · Credit Write-off', cr:0, dr:Number(r.amount_ils||r.amount||0), cls:'creditwriteoff'}); return s + Number(r.amount_ils||r.amount||0); }, 0);

    /* ITEM 9 — Debt Settlement from the member's food donations (debt-priority). */
    const debtSettled = Number(FIN.allocateFoodDonations().perMember[memberId] || 0);
    if(debtSettled > 0){
      const donDates = DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund==='food'&&r.member_id===memberId&&inRange(r.receipt_date)).map(r=>r.receipt_date).filter(Boolean).sort();
      rows.push({date:donDates.length?donDates[donDates.length-1]:today(), no:'—', desc:'تسوية ذمة من تبرع · Debt Settlement (from donation)', cr:debtSettled, dr:0, cls:'debtsettle'});
    }

    rows.sort((a,b)=> a.date==='—' ? -1 : b.date==='—' ? 1 : new Date(a.date)-new Date(b.date));

    let bal = 0;
    rows.forEach(r => { bal += r.dr - r.cr; r.bal = bal; });

    const totalDues = rows.filter(r=>r.cls==='due').reduce((s,r)=>s+r.dr,0);
    const totalPaid = rows.filter(r=>r.cls==='paid').reduce((s,r)=>s+r.cr,0);
    const finalBalance = openingDebt + totalDues - totalPaid - debtSettled - debtWrittenOff + creditWrittenOff;   /* >0 owed · <0 credit · CA-007 write-offs resolve debt (−) and credit (+) toward zero */
    const creditBalance = finalBalance < 0 ? -finalBalance : 0;

    return {member, rows, openingBalance:openingDebt, totalDues, totalPaid, debtSettled, debtWrittenOff, creditWrittenOff, prepaidEffective:0, finalBalance, creditBalance};
  },

  /* Approved balance terminology (Phase 11.5). Sign unchanged. */
  balanceLabel(bal, withAmount=true){
    bal = Number(bal)||0;
    const amt = withAmount ? ' ₪ '+fmt(Math.abs(bal)) : '';
    if(bal > 0) return 'على العضو مستحقات'+amt;
    if(bal < 0) return 'للعضو رصيد'+amt;
    return 'الحساب مسدد بالكامل';
  },

  /* Foundation-B — treasury balances have ONE canonical source (FIN2 via
     FinContract). The former independent computation is removed; this is now a
     thin delegate kept for FIN-internal callers (foodNetPosition) and the
     reconciliation guard. Byte-identical (proven in Domain 4 + FB verification). */
  foodBalance(){ return window.FinContract.foodBalance(); },
  _r2(n){ return Math.round((Number(n||0)+Number.EPSILON)*100)/100; },
  /* A3 — read-only subscription projections (no accounting; same source as memberStatement). */
  subscriptionYears(){
    const ys=new Set();
    (DB.subscriptions||[]).forEach(s=>{ if(s.year!=null) ys.add(Number(s.year)); });
    return Array.from(ys).sort((a,b)=>a-b);
  },
  memberDelinquency(memberId){
    const byYear={}; let unpaidCount=0;
    (DB.subscriptions||[]).filter(s=>s.member_id===memberId).forEach(s=>{
      const due=Number(s.due_amount_ils||0), paid=Number(s.paid_amount_ils||0);
      byYear[Number(s.year)]={ due, paid, remaining:FIN._r2(Math.max(0,due-paid)), settled:(due<=0)||(paid>=due) };
      if(due>0 && paid<due) unpaidCount++;
    });
    return { byYear, isDelinquent:unpaidCount>0, unpaidCount };
  },
  /* Item 9 — member base (pre-donation) debt = opening + dues − payments. */
  _memberBaseBalance(memberId){
    const m=DB.members.find(x=>x.id===memberId); if(!m) return 0;
    const subs=(DB.subscriptions||[]).filter(s=>s.member_id===memberId);
    const subsDue=subs.reduce((s,x)=>s+Number(x.due_amount_ils||0),0);
    const subsPaid=subs.reduce((s,x)=>s+Number(x.paid_amount_ils||0),0);
    const liveFood=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===memberId).reduce((s,r)=>s+Number(r.amount_ils||r.amount||0),0);
    return FIN._r2(Number(m.historical_balance_ils||0)+subsDue-Number(m.historical_payments_ils||0)-subsPaid-liveFood);
  },
  /* Item 9 — chronological debt-priority allocation of all food donations (memoized per load). */
  allocateFoodDonations(){
    if(DB._alloc) return DB._alloc;
    const eng=(typeof window!=='undefined'&&window.FoodDonationAllocation);
    /* P7 — manual override layer (ADDITIVE, wrapper-only). The pure Item 9 engine
       (foodDonationAllocation.js) is untouched and runs UNCHANGED on the automatic
       subset only. Manual-allocated vouchers are carved out; their stored split
       (debt/historical/current) is the accounting source for those vouchers. When no
       manual vouchers exist the result is value-identical to the previous behaviour. */
    /* ق4 (2026-07-11) — member-linked deficit COLLECTIONS are not donations for the
       Item-9 allocator: they settle the member's own historical debt in his
       statement instead (no double-count through debt-priority here). */
    const foodDon=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund==='food'&&r.movement_type!=='historical_debt_collection')
      .slice().sort((a,b)=>(new Date(a.receipt_date)-new Date(b.receipt_date))||String(a.id).localeCompare(String(b.id)));
    const autoRows=foodDon.filter(r=>r.manual_allocation!==true);
    const manualRows=foodDon.filter(r=>r.manual_allocation===true);
    const donations=autoRows.map(r=>({id:r.id,memberId:r.member_id||null,amount:Number(r.amount_ils||r.amount||0),allocation:r.food_donation_allocation}));
    const baseDebt={};
    donations.forEach(d=>{ if(d.memberId!=null&&baseDebt[d.memberId]===undefined) baseDebt[d.memberId]=FIN._memberBaseBalance(d.memberId); });
    const magnitude=Math.abs(Number(window.FOOD_OPENING||0));
    const autoRes = eng ? eng.allocate(donations,baseDebt,magnitude)
                        : {perReceipt:{},perMember:{},debtSettlementTotal:0,reserveTotal:0,currentSupportTotal:0};
    const perReceipt=Object.assign({},autoRes.perReceipt);
    const perMember=Object.assign({},autoRes.perMember);
    let dT=autoRes.debtSettlementTotal, rT=autoRes.reserveTotal, cT=autoRes.currentSupportTotal;
    manualRows.forEach(r=>{
      const debt=Number(r.manual_debt_settlement||0), hist=Number(r.manual_historical_donation||0), cur=Number(r.manual_current_support||0);
      perReceipt[r.id]={debtSettled:FIN._r2(debt),toDeficit:FIN._r2(hist),toCurrent:FIN._r2(cur)};
      if(r.member_id!=null) perMember[r.member_id]=FIN._r2((perMember[r.member_id]||0)+debt);
      dT=FIN._r2(dT+debt); rT=FIN._r2(rT+hist); cT=FIN._r2(cT+cur);
    });
    DB._alloc={perReceipt,perMember,debtSettlementTotal:FIN._r2(dT),reserveTotal:FIN._r2(rT),currentSupportTotal:FIN._r2(cT)};
    return DB._alloc;
  },
  foodDebtSettlementTotal(){ return FIN._r2(FIN.allocateFoodDonations().debtSettlementTotal); },
  foodCurrentSupportTotal(){ return FIN._r2(FIN.allocateFoodDonations().currentSupportTotal); },
  foodSettlementReserve(){ return FIN._r2(FIN.allocateFoodDonations().reserveTotal); },
  /* ق4 — historical debt collections feed the deficit alongside directed donations,
     keeping this legacy figure unified with the new deficit-treasury tab.
     ق5 — the debt-settled slice of member food donations also feeds the deficit
     (it left foodBalance; see foodBalance note — net position unchanged). */
  _histCollections(){ return FIN._r2(DB.receipts.filter(r=>!r.is_deleted&&r.movement_type==='historical_debt_collection').reduce((s,r)=>s+Number(r.amount_ils||r.amount||0),0)); },
  /* Foundation-B — delegates to the single canonical source (FIN2 via FinContract). */
  foodDeficitRemaining(){ return window.FinContract.foodDeficitRemaining(); },
  foodNetPosition(){ return window.FinContract.foodNetPosition(); },
  foodHistorical(){ return Number(window.FOOD_OPENING||0); },  /* original deficit constant (reference) */
  /* Foundation-B — delegates to the single canonical source (FIN2 via FinContract). */
  diwanBalance(){ return window.FinContract.diwanBalance(); },
  donBalance(){
    return DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  },
  fundLedger(fund,from,to,typeFilter){
    const rows=[];
    const fd=from?new Date(from):null;
    const td=to?new Date(to):null;
    const inRange=d=>{
      const dt=new Date(d);
      if(fd&&dt<fd) return false;
      if(td&&dt>td) return false;
      return true;
    };
    if(!typeFilter||typeFilter==='cr'){
      /* Domain 1 — label the two new Diwan events; legacy receipts unchanged (byte-identical). */
      const _dtag=mt=>mt==='diwan_operational_income'?'إيراد تشغيلي · ':mt==='diwan_cash_donation'?'تبرع نقدي · ':'';
      DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund&&inRange(r.receipt_date))
        .forEach(r=>rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:_dtag(r.movement_type)+(r.notes||'إيصال قبض'),cr:Number(r.amount_ils||r.amount),dr:0,type:'cr',id:r.id,no:r.no}));
    }
    if(!typeFilter||typeFilter==='dr'){
      DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund&&inRange(p.payment_date))
        .forEach(p=>rows.push({date:p.payment_date,name:p.beneficiary_name||gmn(p.member_id),desc:L.expense(p.expense_type),cr:0,dr:Number(p.amount_ils||p.amount),type:'dr',id:p.id,no:p.no}));
    }
    if(!typeFilter||typeFilter==='don'){
      /* ق5 — a member donation that settles his debt is named for what it is:
         «تبرع سداد عجز تاريخي» (cash in the food box, earmarked for the deficit). */
      const perRec=fund==='food'?FIN.allocateFoodDonations().perReceipt:{};
      DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund===fund&&inRange(r.receipt_date))
        .forEach(r=>{
          const q5=(perRec[r.id]||{}).debtSettled>0;
          rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:q5?'تبرع سداد عجز تاريخي':'تبرع',cr:0,dr:0,type:'don',id:r.id,no:r.no,note:`تبرع ₪${fmt(r.amount_ils||r.amount)} — ${r.notes||''}`});
        });
    }
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    return rows;
  },
};

/* Canonical bilingual labels for the three Food Fund movement classes (presentation only). */
function mcLabel(k){
  const en=window.LANG==='en';
  return ({
    debt:        en?'Debt Settlement':'تسوية ذمة',
    deficit:     en?'Historical Deficit Donation':'تبرع عجز تاريخي',
    current:     en?'Current Support Donation':'تبرع دعم حالي',
    reserve:     en?'Historical Deficit Donations (Reserve)':'تبرعات العجز التاريخي (احتياطي)',
    operational: en?'Operational':'تشغيلي'
  })[k]||k;
}

/* ═══ HISTORICAL BALANCE FORMULA (Phase 15 FINAL LOCK) ═══
   Historical Balance = years from active_from_year through 2024 × 200.
   Years 2025+ are tracked by the active annual-dues system (DB.annual).
   Returns 0 for any year > 2024 (member joined in the current era). */
function calcHistoricalFromYear(year){
  const y=parseInt(year,10);
  if(!y||isNaN(y)||y>2024) return 0;
  return Math.max(0,2024-y+1)*200;
}

window.onMemberFromYearChange=function(mode){
  const prefix=mode==='edit'?'edit-mem':'mem';
  const yearEl=document.getElementById(prefix+(mode==='edit'?'-from-year':'-from-year'));
  const balEl=document.getElementById(prefix+(mode==='edit'?'-balance':'-balance'));
  if(!yearEl||!balEl) return;
  const year=parseInt(yearEl.value,10);
  if(!year||isNaN(year)) return;
  const suggested=calcHistoricalFromYear(year);
  balEl.value=suggested;
  /* Show visual hint */
  const hint=document.getElementById(prefix+'-hist-hint');
  if(hint) hint.textContent=suggested>0
    ?`محسوب تلقائياً: ${2024}-${year}+1 = ${2024-year+1} سنة × 200 ₪ = ${suggested.toLocaleString()} ₪`
    :'لا توجد سنوات تاريخية (السنة > 2024)';
};
