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
      .forEach(r => rows.push({date:r.receipt_date, no:r.no, desc:r.notes||'مساهمة', cr:FIN.amountOf(r), dr:0, cls:'paid'}));

    /* ق4 — member-linked deficit collections reduce the member's OWN historical
       debt: a paid (credit) row in his statement for the full amount. */
    DB.receipts
      .filter(r => !r.is_deleted && r.movement_type==='historical_debt_collection' && r.member_id===memberId && inRange(r.receipt_date))
      .forEach(r => rows.push({date:r.receipt_date, no:r.no, desc:'تحصيل ذمة تاريخية · Historical Debt Collection', cr:FIN.amountOf(r), dr:0, cls:'paid'}));

    /* CA-007 — Debt Write-off (member permanent departure/death): a NON-CASH member-
       ledger credit that resolves the member's outstanding receivable. Preserves
       immutable history (a NEW record, never a silent deletion). Zero rows today ⇒
       byte-identical until MODEL2 V2.0 activation. */
    const debtWrittenOff = ((typeof DB!=='undefined'&&DB.member_write_offs)||[])
      .filter(r => !r.is_deleted && r.movement_type==='debt_write_off' && r.member_id===memberId && inRange(r.receipt_date))
      .reduce((s,r) => { rows.push({date:r.receipt_date, no:r.no, desc:'شطب ذمة · Debt Write-off', cr:FIN.amountOf(r), dr:0, cls:'writeoff'}); return s + FIN.amountOf(r); }, 0);

    /* CA-007 — Credit Write-off (member permanent departure/death): a NON-CASH member-
       ledger DEBIT that resolves the member's outstanding CREDIT (never refunded, never a
       perpetual liability). A NEW record, immutable history preserved. Zero rows today ⇒
       byte-identical until MODEL2 V2.0 activation. */
    const creditWrittenOff = ((typeof DB!=='undefined'&&DB.member_write_offs)||[])
      .filter(r => !r.is_deleted && r.movement_type==='credit_write_off' && r.member_id===memberId && inRange(r.receipt_date))
      .reduce((s,r) => { rows.push({date:r.receipt_date, no:r.no, desc:'شطب رصيد دائن · Credit Write-off', cr:0, dr:FIN.amountOf(r), cls:'creditwriteoff'}); return s + FIN.amountOf(r); }, 0);

    /* ITEM 9 — Debt Settlement from the member's food donations (debt-priority). */
    const debtSettled = Number(FIN.allocateFoodDonations().perMember[memberId] || 0);
    if(debtSettled > 0){
      const donDates = DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund==='food'&&r.member_id===memberId&&inRange(r.receipt_date)).map(r=>r.receipt_date).filter(Boolean).sort();
      rows.push({date:donDates.length?donDates[donDates.length-1]:today(), no:'—', desc:'تسوية ذمة من تبرع · Debt Settlement (from donation)', cr:debtSettled, dr:0, cls:'debtsettle'});
    }

    /* ═══ CCR-001 · IG-012 — FC-003 · FD-009 ═══
       A payment refund RECREATES member debt by the refunded amount, on the
       refund date: a member-linked refund is a DEBIT row in his ledger. (Donation
       refunds do not exist — FD-032 — and BO-11 refuses to create them.) */
    const refunded = ((typeof DB!=='undefined'&&DB.refunds)||[])
      .filter(r => !r.is_deleted && r.member_id===memberId && inRange(r.payment_date))
      .reduce((s,r) => { const a=FIN.amountOf(r);
        rows.push({date:r.payment_date, no:r.no||'—', desc:'استرداد دفعة · Payment Refund (FD-009)', cr:0, dr:a, cls:'refund'});
        return s+a; }, 0);

    rows.sort((a,b)=> a.date==='—' ? -1 : b.date==='—' ? 1 : new Date(a.date)-new Date(b.date));

    let bal = 0;
    rows.forEach(r => { bal += r.dr - r.cr; r.bal = bal; });

    const totalDues = rows.filter(r=>r.cls==='due').reduce((s,r)=>s+r.dr,0);
    const totalPaid = rows.filter(r=>r.cls==='paid').reduce((s,r)=>s+r.cr,0);
    const finalBalance = openingDebt + totalDues - totalPaid - debtSettled - debtWrittenOff + creditWrittenOff + refunded;   /* >0 owed · <0 credit · CA-007 write-offs resolve toward zero · FD-009 refunds recreate debt */
    const creditBalance = finalBalance < 0 ? -finalBalance : 0;

    return {member, rows, openingBalance:openingDebt, totalDues, totalPaid, debtSettled, debtWrittenOff, creditWrittenOff, refunded, prepaidEffective:0, finalBalance, creditBalance};
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
    /* ═══ CCR-001 · IG-003 — FC-003 · FD-007 / FD-001 ═══
       Delinquency is determined by the REAL outstanding balance (FD-001:
       settled ⇔ outstanding ≤ 0), and per-year settled status derives from the
       constitutional FD-002 allocation (IG-001 accessor) — never from stored
       subscription rows alone. A member whose payments arrived as food receipts
       shows the years the waterfall covers; a member current on subscriptions
       but carrying historical debt IS delinquent. byYear keeps its legacy shape
       {due, paid, remaining, settled} so every consumer (delinquent report,
       dues workspace, dashboard debts, member lifecycle) conforms through this
       single accessor (FD-011). */
    const alloc=FIN.memberAllocation(memberId);
    /* Historical Subscription Truth (Owner-approved) — BUSINESS AUTHORITY for the
       year's displayed status. Where a truth record exists (status ≠ unknown) it
       OVERRIDES the derived settled/status; financial fields (due/paid/remaining,
       outstanding, isDelinquent) stay purely derived — the truth layer never
       enters any balance, treasury, ledger, or FD-002 computation. */
    const truth=FIN.subscriptionTruth(memberId);
    const byYear={}; let unpaidCount=0;
    Object.keys(alloc.perYear).forEach(y=>{
      const p=alloc.perYear[y];
      const remaining=FIN._r2(p.remaining);
      const derivedSettled=(p.due<=0)||p.settled;
      const t=truth[Number(y)]||null;
      const settled=t ? t==='paid' : derivedSettled;
      byYear[Number(y)]={ due:p.due, paid:FIN._r2(p.due-remaining), remaining, settled,
        status:t || (derivedSettled?'paid':((p.due-remaining)>0.005?'partial':'unpaid')),
        authoritative:!!t };
      if(p.due>0 && !settled) unpaidCount++;
    });
    const outstanding=FIN._r2(alloc.outstanding);
    return { byYear, unpaidCount, outstanding,
      historicalRemaining:alloc.historical.remaining,
      isDelinquent: outstanding>0.005 };
  },
  /* ═══ CCR-001 · IG-001 — Constitutional payment allocation (FC-003 · FD-002) ═══
     Read-time derivation of the constitutional waterfall: outstanding annual
     subscriptions (OLDEST unpaid first) → then the historical carried balance.
     Attributed history is preserved (FD-003): stored per-year paid and pre-system
     historical payments keep their recorded targets, and ق4 historical-debt
     collections reduce the historical balance per their constitutional meaning
     (FC-003 Ch. 3.4). The UNATTRIBUTED credit pool — live member food receipts,
     Item-9 donation debt settlements, and any per-target overpayment excess — is
     walked by the SINGLE ordered engine (MODEL2Allocation; one ordering source,
     FD-011). The TOTAL outstanding is always memberStatement().finalBalance
     (order-invariant; single source — FD-006): this accessor only distributes it
     across obligations for settled/delinquency derivation (consumed by IG-003). */
  memberAllocation(memberId){
    const m=DB.members.find(x=>x.id===memberId);
    const r2=FIN._r2;
    if(!m) return {perYear:{}, historical:{seed:0,allocated:0,remaining:0}, pool:0, creditRemaining:0, outstanding:0};
    let pool=0;
    const perYear={};
    (DB.subscriptions||[]).filter(s=>s.member_id===memberId).forEach(s=>{
      const y=Number(s.year), due=Number(s.due_amount_ils||0), paid=Number(s.paid_amount_ils||0);
      pool=r2(pool+Math.max(0,paid-due));                         /* overpaid excess → unattributed pool */
      if(!perYear[y]) perYear[y]={due:0,remaining_seed:0,allocated:0,remaining:0,settled:false};
      perYear[y].due=r2(perYear[y].due+due);
      perYear[y].remaining_seed=r2(perYear[y].remaining_seed+Math.max(0,due-paid));
    });
    /* ═══ P-RECEIPT-ALLOCATION · PR-5 — Consumer Seam (single read authority) ═══
       memberAllocation is the ONLY reader of recorded settlement attribution
       (DB.allocation_records, source_kind='receipt_settlement'). Flag-gated and
       per-receipt-exclusive: a receipt WITH settlement lines is attributed by
       those lines (and excluded from the legacy pool); legacy receipts keep the
       oldest-first FD-002 waterfall. Only non-deleted receipts' ACTIVE (non-
       voided) lines count — cancellation-aware in two ways: a cancelled receipt
       drops out of _liveIds, AND a line the void authority (PR-6) marked
       voided_at is skipped regardless. NEUTRAL / byte-identical when the flag is
       OFF or no settlement rows exist. Does NOT touch totals, finalBalance,
       FD-002 math, paid_amount_ils, or member_subscriptions. */
    const _rsOn=(typeof window!=='undefined'&&window.RECEIPT_ALLOCATION_ENABLED===true);
    /* _explAll: every receipt that carries ANY settlement line (active, voided, or
       refunded) — an explicit-settlement receipt whose money is described SOLELY by
       its lines, so it is excluded from the FD-002 pool entirely and its refunds are
       reversed by un-attributing its lines (PR-7), never by the pool. _explYear/
       _explHist accumulate only ACTIVE lines' attribution. */
    const _explAll={}, _explYear={}; let _explHist=0;
    if(_rsOn){
      const _liveIds={}; DB.receipts.forEach(r=>{ if(!r.is_deleted&&r.member_id===memberId) _liveIds[r.id]=true; });
      (DB.allocation_records||[]).forEach(a=>{
        if(!a||a.source_kind!=='receipt_settlement'||a.member_id!==memberId||!_liveIds[a.source_ref]) return;
        _explAll[a.source_ref]=true;                 /* explicit-settlement receipt (any line) */
        if(a.voided_at) return;                       /* PR-6: cancelled receipt ⇒ line voided */
        if(a.refunded_at) return;                     /* PR-7: refunded ⇒ line reversed (attribution un-done) */
        const amt=r2(Number(a.amount_allocated||0));
        if(a.obligation_kind==='due'&&a.year!=null&&perYear[Number(a.year)]) _explYear[Number(a.year)]=r2((_explYear[Number(a.year)]||0)+amt);
        else if(a.obligation_kind==='historical') _explHist=r2(_explHist+amt);
      });
    }
    const q4=DB.receipts.filter(r=>!r.is_deleted&&r.movement_type==='historical_debt_collection'&&r.member_id===memberId)
      .reduce((s,r)=>s+FIN.amountOf(r),0);
    let histSeed=r2(Number(m.historical_balance_ils||0)-Number(m.historical_payments_ils||0)-q4);
    if(histSeed<0){ pool=r2(pool-histSeed); histSeed=0; }          /* over-collected history → pool */
    const liveFood=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===memberId&&!_explAll[r.id])
      .reduce((s,r)=>s+FIN.amountOf(r),0);   /* PR-5/PR-7: explicitly-settled receipts are attributed by their lines, never pooled */
    const donSettled=Number(FIN.allocateFoodDonations().perMember[memberId]||0);
    /* CA-007 write-offs (IG-008 conformance): a debt write-off resolves the
       receivable exactly like a non-cash credit (enters the FD-002 pool), and a
       credit write-off resolves outstanding credit (leaves the pool) — keeping
       this waterfall's remaining identical to memberStatement().finalBalance. */
    const wos=((typeof DB!=='undefined'&&DB.member_write_offs)||[]).filter(r=>!r.is_deleted&&r.member_id===memberId);
    const debtWO=wos.filter(r=>r.movement_type==='debt_write_off').reduce((s,r)=>s+FIN.amountOf(r),0);
    const creditWO=wos.filter(r=>r.movement_type==='credit_write_off').reduce((s,r)=>s+FIN.amountOf(r),0);
    /* FD-009 (IG-012): a member-linked refund takes paid money back — it leaves
       the credit pool, recreating debt through the same FD-002 waterfall.
       PR-7 (allocation-aware): a refund AGAINST an explicit-settlement receipt is
       reversed by un-attributing its refunded settlement lines (above), so it must
       NOT also leave the pool — that money was never pooled. Only LEGACY refunds
       (origin not an explicit receipt) reduce the pool. Flag OFF ⇒ _explAll empty
       ⇒ every refund counts, byte-identical to today. memberStatement is untouched:
       its finalBalance still recreates debt for EVERY refund (the correct total). */
    const refunded=((typeof DB!=='undefined'&&DB.refunds)||[]).filter(r=>!r.is_deleted&&r.member_id===memberId
        &&!(_rsOn&&r.origin_receipt_id&&_explAll[r.origin_receipt_id]))
      .reduce((s,r)=>s+FIN.amountOf(r),0);
    pool=r2(pool+liveFood+donSettled+debtWO-creditWO-refunded);
    /* PR-5 — apply explicit settlement FIRST: pre-seed per-year allocated + hist,
       and let the legacy pool cover only the RESIDUAL obligation. Neutral when OFF
       (all explicit values are 0 ⇒ byte-identical to the legacy computation). */
    Object.keys(perYear).forEach(y=>{ perYear[y].allocated=r2(_explYear[y]||0); });
    const obligations=Object.keys(perYear).map(y=>({id:'sub:'+y,kind:'due',year:Number(y),remaining:Math.max(r2(perYear[y].remaining_seed-(perYear[y].allocated||0)),0),createdAt:y+'-01-01'}));
    const _histResidual=Math.max(r2(histSeed-_explHist),0);
    if(_histResidual>0) obligations.push({id:'hist',kind:'historical',remaining:_histResidual,createdAt:'2000-01-01'});
    const eng=(typeof window!=='undefined'&&window.MODEL2Allocation)||null;
    let creditRemaining=pool, histAllocated=r2(_explHist);
    if(eng&&pool>0&&obligations.length){
      const res=eng.computeAllocation({currentYear:new Date().getFullYear(),amount:pool,obligations});
      res.allocations.forEach(a=>{
        if(a.obligation_kind==='historical') histAllocated=r2(histAllocated+a.amount_allocated);
        else if(perYear[a.year]) perYear[a.year].allocated=r2(perYear[a.year].allocated+a.amount_allocated);
      });
      creditRemaining=res.creditRemaining;
    }
    Object.keys(perYear).forEach(y=>{
      const p=perYear[y];
      p.remaining=r2(p.remaining_seed-p.allocated);
      p.settled=(p.due<=0)||(p.remaining<=0.005);
    });
    return { perYear,
      historical:{seed:histSeed,allocated:r2(histAllocated),remaining:r2(histSeed-histAllocated)},
      pool:r2(pool), creditRemaining:r2(creditRemaining),
      outstanding:FIN.memberStatement(memberId).finalBalance };
  },
  /* Item 9 — member base (pre-donation) debt = opening + dues − payments. */
  _memberBaseBalance(memberId){
    const m=DB.members.find(x=>x.id===memberId); if(!m) return 0;
    const subs=(DB.subscriptions||[]).filter(s=>s.member_id===memberId);
    const subsDue=subs.reduce((s,x)=>s+Number(x.due_amount_ils||0),0);
    const subsPaid=subs.reduce((s,x)=>s+Number(x.paid_amount_ils||0),0);
    const liveFood=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===memberId).reduce((s,r)=>s+FIN.amountOf(r),0);
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
    /* CCR-001 IG-002 — FC-003 · FD-008: only a donation EXPLICITLY designated to settle
       debt reduces member debt; a GENERAL donation never does. Explicit designation is the
       manual allocation split (manual_debt_settlement > 0, handled below as manualRows).
       AUTO rows therefore carry NO debt-settlement eligibility in OPEN fiscal years.
       Donations dated in CLOSED years (≤ locked year) keep their recognized historical
       effect unchanged — FD-004: closed-period history is immutable (CCR-001 Rev A §B-5). */
    const _lockY=(typeof lockedThroughYear==='function')?lockedThroughYear()
      :(typeof window!=='undefined'&&Number.isFinite(window.LOCKED_THROUGH_YEAR))?window.LOCKED_THROUGH_YEAR
      :(new Date().getFullYear()-1);
    const _inClosedYear=r=>{ const y=new Date(r.receipt_date).getFullYear(); return Number.isFinite(y)&&y<=_lockY; };
    const donations=autoRows.map(r=>({id:r.id,memberId:_inClosedYear(r)?(r.member_id||null):null,amount:FIN.amountOf(r),allocation:r.food_donation_allocation}));
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
  _histCollections(){ return FIN._r2(DB.receipts.filter(r=>!r.is_deleted&&r.movement_type==='historical_debt_collection').reduce((s,r)=>s+FIN.amountOf(r),0)); },
  /* Foundation-B — delegates to the single canonical source (FIN2 via FinContract). */
  foodDeficitRemaining(){ return window.FinContract.foodDeficitRemaining(); },
  foodNetPosition(){ return window.FinContract.foodNetPosition(); },
  foodHistorical(){ return Number(window.FOOD_OPENING||0); },  /* original deficit constant (reference) */
  /* Foundation-B — delegates to the single canonical source (FIN2 via FinContract). */
  diwanBalance(){ return window.FinContract.diwanBalance(); },
  donBalance(){
    return DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation').reduce((s,r)=>s+FIN.amountOf(r),0);
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
        .forEach(r=>rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:_dtag(r.movement_type)+(r.notes||'إيصال قبض'),cr:FIN.amountOf(r),dr:0,type:'cr',id:r.id,no:r.no}));
    }
    if(!typeFilter||typeFilter==='dr'){
      DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund&&inRange(p.payment_date))
        .forEach(p=>rows.push({date:p.payment_date,name:p.beneficiary_name||gmn(p.member_id),desc:L.expense(p.expense_type),cr:0,dr:FIN.amountOf(p),type:'dr',id:p.id,no:p.no}));
    }
    if(!typeFilter||typeFilter==='don'){
      /* ق5 — a member donation that settles his debt is named for what it is:
         «تبرع سداد عجز تاريخي» (cash in the food box, earmarked for the deficit). */
      const perRec=fund==='food'?FIN.allocateFoodDonations().perReceipt:{};
      DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund===fund&&inRange(r.receipt_date))
        .forEach(r=>{
          const q5=(perRec[r.id]||{}).debtSettled>0;
          rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:q5?'تبرع سداد عجز تاريخي':'تبرع',cr:0,dr:0,type:'don',id:r.id,no:r.no,note:`تبرع ₪${fmt(FIN.amountOf(r))} — ${r.notes||''}`});
        });
    }
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    return rows;
  },

  /* ═══ CCR-001 · IG-007 — FC-003 · FD-013 / FD-011 ═══
     Presentation accessors: every figure a report/screen/print/export shows is
     produced HERE, from the same engine outputs, so no formula lives in
     presentation code. Pure projections — no new accounting rule, values are
     byte-identical to the sums the presentation layer previously computed. */

  /* Fund statement view: ledger rows + running balance + totals (screen & print). */
  fundLedgerView(fund,from,to,typeFilter){
    const rows=FIN.fundLedger(fund,from,to,typeFilter);
    let bal=0,totalCr=0,totalDr=0,opening=0;
    const view=rows.map((r,i)=>{
      bal+=r.cr-r.dr; totalCr+=r.cr; totalDr+=r.dr;
      if(i===0&&r.type==='open') opening=r.cr-r.dr;
      return Object.assign({},r,{run:bal});
    });
    return {rows:view,opening,totalCr,totalDr,closing:bal};
  },

  /* Member statement view: carried balance + movement rows + period totals
     (screen & print consume this; they format only). */
  memberStatementView(memberId,from,to){
    const st=FIN.memberStatement(memberId,from,to);
    const m=st.member||{};
    const histDue=Number(m.historical_balance_ils||0);
    const histPaid=Number(m.historical_payments_ils||0);
    const moves=st.rows.filter(r=>r.date!=='—');
    let totSub=0,totPay=0;
    moves.forEach(r=>{ totSub+=Number(r.dr||0); totPay+=Number(r.cr||0); });
    return {statement:st,moves,carried:histDue-histPaid,histDue,histPaid,totSub,totPay,finalBalance:st.finalBalance};
  },

  /* Member donation movements (transparency list on the member statement; ق4
     collections excluded — they live in the main ledger). */
  memberDonations(memberId,from,to){
    const fd=from?new Date(from):null, td=to?new Date(to):null;
    const inRange=d=>{ if(!d||d==='—') return true; const dt=new Date(d); if(fd&&dt<fd) return false; if(td&&dt>td) return false; return true; };
    return DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.member_id===memberId&&r.movement_type!=='historical_debt_collection'&&inRange(r.receipt_date));
  },

  /* ═══ Historical Subscription Truth Layer (Owner-approved, 2026-07-25) ═══
     The completed owner review workbook is the constitutional BUSINESS source of
     truth for historical subscription status (stored per member-year in
     historical_subscription_truth). PRESENTATION AUTHORITY ONLY: consumed solely
     by memberDelinquency's byYear status; never by memberStatement, treasury,
     ledger, debt report figures, or FD-002 allocation mathematics.
     status='unknown' means the Owner declared the year indeterminate → callers
     fall back to the derived status (record excluded here by design). */
  subscriptionTruth(memberId){
    const out={};
    ((typeof DB!=='undefined'&&DB.historical_subscription_truth)||[]).forEach(r=>{
      if(r && r.member_id===memberId && r.status && r.status!=='unknown') out[Number(r.year)]=r.status;
    });
    return out;
  },

  /* Canonical accounting read (FD-021 · IG-011): the ILS accounting amount ONLY.
     Native `amount` is never a fallback — a row without amount_ils contributes 0
     (fail-safe) instead of silently mixing currency units. */
  amountOf(r){ return Number(r.amount_ils||0); },

  /* ═══ CCR-001 · IG-013 — FC-003 · FD-010 ═══
     Probable-duplicate probe for receipt ENTRY: same fund + same payer identity
     (member_id, or trimmed payer name for non-members) + same ILS accounting
     amount (±0.005) + receipt date within `windowDays`. Read-only predicate —
     duplicates remain PERMITTED (FD-010); the caller raises the strong warning.
     `windowDays` is an operational sensitivity parameter of the warning only
     (default 7); it affects no figure and blocks nothing. */
  findProbableDuplicates({fund, memberId, payerName, amountILS, date, windowDays}={}){
    const amt=Number(amountILS)||0, t=new Date(date).getTime();
    if(!fund||!(amt>0)||!Number.isFinite(t)) return [];
    const win=(Number(windowDays)>0?Number(windowDays):7)*86400000;
    const name=(payerName||'').trim();
    return DB.receipts.filter(r=>{
      if(r.is_deleted||r.fund_type!==fund) return false;
      if(Math.abs(FIN.amountOf(r)-amt)>=0.005) return false;
      const rt=new Date(r.receipt_date).getTime();
      if(!Number.isFinite(rt)||Math.abs(rt-t)>win) return false;
      if(memberId) return r.member_id===memberId;
      return !!name && (r.payer_name||'').trim()===name;
    });
  },

  /* ═══ CCR-001 · IG-014 — FC-003 · FD-022…FD-025 ═══
     Read-only register of live Internal Transfer Vouchers (newest first).
     Presentation source for the transfers list/print (FD-013). */
  transferRegister(){
    return ((typeof DB!=='undefined'&&DB.internal_transfers)||[])
      .filter(t=>!t.is_deleted)
      .slice().sort((a,b)=>new Date(b.transfer_date)-new Date(a.transfer_date));
  },

  /* ═══ CCR-001 · IG-016 — FC-003 · FD-004 ═══
     Close-time report snapshots: a closed year's report must always reproduce
     its original values. buildCloseSnapshot archives the key engine models for
     every newly closed year at the moment of closing (consumed by BO-14, which
     refuses to close without it); closedYearLedgerSnapshot serves the stored
     view to exact closed-year fund-statement renders; verifyClosedYearSnapshot
     proves byte-for-byte equality between the archive and a regeneration. */
  buildCloseSnapshot(prevLock, year){
    const years={};
    for(let y=Number(prevLock)+1; y<=Number(year); y++){
      years[y]={ food:  FIN.fundLedgerView('food',  y+'-01-01', y+'-12-31',''),
                 diwan: FIN.fundLedgerView('diwan', y+'-01-01', y+'-12-31','') };
    }
    const v=FIN.verifyConsistency();
    return { version:1, closed_through:Number(year), previous_lock:Number(prevLock), years,
      debt_report:FIN.debtReportRows({years:null,filter:'all'}),
      treasury:FIN.treasuryPosition(),
      consistency:{ allMatch:v.allMatch, memberCount:v.memberCount, failedMembers:v.failedMembers.length } };
  },
  _yearSnapshots(y){
    return ((typeof DB!=='undefined'&&DB.fiscal_snapshots)||[])
      .filter(s=>s&&s.snapshot&&s.snapshot.years&&s.snapshot.years[y])
      .slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  },
  /* Stored close-time ledger view for an EXACT closed-year range (else null →
     caller recomputes live). Latest snapshot covering the year wins (a reopen +
     re-close appends a new one; history is never overwritten). */
  closedYearLedgerSnapshot(fund, from, to){
    const m=/^(\d{4})-01-01$/.exec(from||''), n=/^(\d{4})-12-31$/.exec(to||'');
    if(!m||!n||m[1]!==n[1]) return null;
    const y=Number(m[1]);
    const lock=(typeof window!=='undefined'&&Number.isFinite(window.LOCKED_THROUGH_YEAR))?window.LOCKED_THROUGH_YEAR:null;
    if(lock===null||y>lock) return null;
    const snaps=FIN._yearSnapshots(y);
    return (snaps.length&&snaps[0].snapshot.years[y][fund])?snaps[0].snapshot.years[y][fund]:null;
  },
  /* FD-004 verification: regenerated closed-year ledgers must equal the
     close-time archive byte-for-byte (canonical JSON of the same model). */
  verifyClosedYearSnapshot(year){
    const y=Number(year);
    const snaps=FIN._yearSnapshots(y);
    if(!snaps.length) return {found:false, match:null, diffs:[]};
    const stored=snaps[0].snapshot.years[y];
    const diffs=[];
    ['food','diwan'].forEach(f=>{
      if(!stored[f]) return;
      const regen=FIN.fundLedgerView(f, y+'-01-01', y+'-12-31','');
      if(JSON.stringify(regen)!==JSON.stringify(stored[f])) diffs.push(f);
    });
    return {found:true, match:diffs.length===0, diffs, snapshotAt:snaps[0].created_at};
  },

  /* Single in-kind predicate (FE-008 documentary donations). */
  isInkindDonation(r){ return r.movement_type==='donation_inkind'; },

  /* Single historical-vs-current classification for a food-display donation
     (manual-allocation aware — the one authoritative predicate). */
  foodDonationClass(r){
    const hist=r.manual_allocation?(Number(r.manual_historical_donation||0)>0):(r.food_donation_allocation==='reduce_deficit');
    return hist?'historical':'current';
  },

  /* Donation register model (donations statement/report): rows + cash/in-kind
     split + fund direction totals + recognized allocation figures. */
  donationRegister(){
    const rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.destination_treasury!=='historical_deficit');
    const cashRows=rows.filter(r=>!FIN.isInkindDonation(r));
    const inkindRows=rows.filter(r=>FIN.isInkindDonation(r));
    const cashTot=cashRows.reduce((s,r)=>s+FIN.amountOf(r),0);
    const inkindTot=inkindRows.reduce((s,r)=>s+FIN.amountOf(r),0);
    const toFood=cashRows.filter(r=>r.donation_display_fund==='food').reduce((s,r)=>s+FIN.amountOf(r),0);
    return {rows,cashRows,inkindRows,cashTot,inkindTot,toFood,toDiwan:cashTot-toFood,
      foodDebt:FIN.foodDebtSettlementTotal(),foodDeficit:FIN.foodSettlementReserve(),foodSupport:FIN.foodCurrentSupportTotal(),
      perReceipt:FIN.allocateFoodDonations().perReceipt};
  },

  /* Certified treasury position (dashboard + treasury workspace). */
  treasuryPosition(){
    const r2=FIN._r2;
    const food=r2(FIN.foodBalance()), diwan=r2(FIN.diwanBalance()), don=r2(FIN.donBalance());
    const deficit=r2(FIN.foodDeficitRemaining()), netFood=r2(FIN.foodNetPosition());
    return {food,diwan,don,combined:r2(food+diwan),deficit,netFood,netCombined:r2(netFood+diwan),
      reserve:r2(FIN.foodSettlementReserve()),support:r2(FIN.foodCurrentSupportTotal()),debtSettled:r2(FIN.foodDebtSettlementTotal())};
  },

  /* Cross-fund cash movement (food + diwan credit/debit rows) with period totals. */
  cashMovement(from,to){
    const rows=[];
    ['food','diwan'].forEach(f=>(FIN.fundLedger(f,from,to)||[]).forEach(r=>{
      if(r.type==='cr'||r.type==='dr')
        rows.push({id:r.id,date:r.date,no:r.no,name:r.name,desc:r.desc,fund:f,in:Number(r.cr||0),out:Number(r.dr||0),type:r.type});
    }));
    rows.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const totalIn=FIN._r2(rows.reduce((t,r)=>t+r.in,0));
    const totalOut=FIN._r2(rows.reduce((t,r)=>t+r.out,0));
    return {rows,count:rows.length,totalIn,totalOut,net:FIN._r2(totalIn-totalOut)};
  },

  /* Day totals (dashboard hero): vouchers and net cash flow of one date. */
  dayTotals(dateStr){
    const rec=DB.receipts.filter(r=>!r.is_deleted&&r.receipt_date===dateStr);
    const pay=DB.payments.filter(p=>!p.is_deleted&&p.payment_date===dateStr);
    const recTotal=rec.reduce((s,r)=>s+FIN.amountOf(r),0);
    const payTotal=pay.reduce((s,p)=>s+FIN.amountOf(p),0);
    return {recCount:rec.length,payCount:pay.length,count:rec.length+pay.length,recTotal,payTotal,net:recTotal-payTotal};
  },

  /* Row models for the universal Excel exporters — presentation maps these to
     localized cells; no financial field is read or coalesced in app code. */
  voucherExportRows(kind,fund){
    if(kind==='rec') return DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund)
      .map(r=>({no:r.no,date:r.receipt_date,member_id:r.member_id,payer_name:r.payer_name,amount:FIN.amountOf(r),payment_method:r.payment_method,notes:r.notes||''}));
    if(kind==='pay') return DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund)
      .map(p=>({no:p.no,date:p.payment_date,member_id:p.member_id,beneficiary_name:p.beneficiary_name,amount:FIN.amountOf(p),expense_type:p.expense_type,notes:p.notes||''}));
    if(kind==='don') return DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation')
      .map(r=>({no:r.no,date:r.receipt_date,member_id:r.member_id,payer_name:r.payer_name,amount:FIN.amountOf(r),
        inkind:FIN.isInkindDonation(r),register_category:r.register_category||'',
        display_fund:r.donation_display_fund||'',allocation:r.food_donation_allocation||'',notes:r.notes||''}));
    if(kind==='members') return DB.members.filter(m=>m.is_active!==false)
      .map(m=>({name:m.name,phone:m.phone||'',historical:Number(m.historical_balance_ils||0),balance:FIN.memberBalance(m.id)}));
    return [];
  },

  /* ═══ CCR-001 · IG-006 — FC-003 · FD-006 / FD-013 (incl. merged IG-021) ═══
     THE single debt-report row model. Screen, print and Excel all consume THIS
     model with the same view state (selected years + category filter), so every
     surface shows byte-identical figures (FD-006) and no surface derives its
     own (FD-013). Non-cash resolutions (donation debt settlement ق5 + CA-007
     write-offs) are explicit components, so the report reconciles even when
     member_write_offs carries rows (former IG-021):
       current = hist + duesAll − paidAll − resolutions
       where paidAll = totalPaid (historical + stored subscription + live food
       + ق4) and resolutions = debtSettled + writtenOff − creditWrittenOff. */
  debtReportRows(opts){
    const o=opts||{};
    const years=o.years?new Set(Array.from(o.years).map(Number)):null;   /* null ⇒ all years */
    const r2=FIN._r2;
    const all=DB.members.filter(m=>m.is_active!==false).map(m=>{
      const st=FIN.memberStatement(m.id);
      const subs=(DB.subscriptions||[]).filter(s=>s.member_id===m.id);
      /* ═══ P-DEBT-REPORT-ALIGNMENT-001 — per-year "paid" reader alignment ═══
         POST-LAUNCH receipt members (NO stored subscription seed) read the SAME
         certified live allocation every other surface already shows — FIN.member
         Delinquency().byYear[y].paid, the FD-002 attribution of live receipts — so
         Annual Debt agrees with Delinquent / Dues / Dashboard / Member Statement
         for live receipts. MIGRATION members (ANY stored paid_amount_ils) are
         FROZEN: they keep the stored per-year figure byte-identical (owner
         constitutional decision — the historical migration dataset is never
         reinterpreted). READ-ONLY presentation alignment: it consults the existing
         certified accessor and changes no engine, allocation, statement, stored
         value, or finalBalance (`current` below still comes from memberStatement). */
      const _storedPaidAll=subs.reduce((a,x)=>a+Number(x.paid_amount_ils||0),0);
      const _liveByYear=(_storedPaidAll===0 && typeof FIN.memberDelinquency==='function')
        ? ((FIN.memberDelinquency(m.id)||{}).byYear||{}) : null;
      let selSub=0,selPaid=0;
      subs.forEach(s=>{
        if(!years||years.has(Number(s.year))){
          selSub+=Number(s.due_amount_ils||0);
          selPaid+= _liveByYear ? Number((_liveByYear[Number(s.year)]||{}).paid||0) : Number(s.paid_amount_ils||0);
        }
      });
      const debtSettled=Number(st.debtSettled||0);
      const writtenOff=Number(st.debtWrittenOff||0);
      const creditWrittenOff=Number(st.creditWrittenOff||0);
      const refunded=Number(st.refunded||0);   /* FD-009 (IG-012): refunds recreate debt */
      return { id:m.id, code:m.member_code||'—', name:m.name, phone:m.phone||'',
        hist:st.openingBalance, histPaid:Number(m.historical_payments_ils||0),
        selSub:r2(selSub), selPaid:r2(selPaid),
        duesAll:st.totalDues, paidAll:st.totalPaid,
        debtSettled, writtenOff, creditWrittenOff, refunded,
        resolutions:r2(debtSettled+writtenOff-creditWrittenOff),
        current:st.finalBalance };
    });
    const f=o.filter||'all';
    let rows=all;
    if(f==='debtors')        rows=rows.filter(r=>r.current>0.005);
    else if(f==='creditors') rows=rows.filter(r=>r.current<-0.005);
    else if(f==='zero')      rows=rows.filter(r=>Math.abs(r.current)<=0.005);
    rows=rows.slice().sort((a,b)=>b.current-a.current);
    const totals=rows.reduce((t,r)=>({hist:t.hist+r.hist,histPaid:t.histPaid+r.histPaid,
      selSub:t.selSub+r.selSub,selPaid:t.selPaid+r.selPaid,
      resolutions:t.resolutions+r.resolutions,current:t.current+r.current}),
      {hist:0,histPaid:0,selSub:0,selPaid:0,resolutions:0,current:0});
    Object.keys(totals).forEach(k=>totals[k]=r2(totals[k]));
    return { rows, totals, totalMembers:all.length, filter:f };
  },

  /* ═══ CCR-001 · IG-008 — FC-003 · FD-006 ═══
     GENUINE consistency verifier. The former reconciliation compared FIN's
     treasury delegates to FIN2 — a source to itself, structurally unable to
     fail. This verifier compares figures that are computed along DIFFERENT
     paths, so any drift between surfaces or engine paths is a reported defect:
       · member layer (5 identities per member): ledger components vs stored
         final balance; last running-balance row; FD-002 waterfall conservation
         (Σ remaining − credit); delinquency outstanding; debt-report row.
       · aggregate: Σ member balances (statement path) vs debt-report totals.
       · treasury: net food position vs (food balance + remaining deficit);
         fund-ledger closing vs Σcredit − Σdebit, per fund.
       · item-9 conservation: per-receipt splits vs the stored receipt amount,
         and the three totals vs Σ per-receipt splits. */
  verifyConsistency(){
    const r2=FIN._r2, T=0.005, checks=[];
    const add=(k,a,b)=>{ checks.push({k,a:r2(a),b:r2(b),match:Math.abs(Number(a)-Number(b))<T}); };
    /* — member layer — */
    const members=DB.members.filter(m=>m.is_active!==false);
    const model=FIN.debtReportRows({years:null,filter:'all'});
    const failed=[]; let sumSt=0;
    members.forEach(m=>{
      const st=FIN.memberStatement(m.id);
      const al=FIN.memberAllocation(m.id)||{perYear:{},historical:{},creditRemaining:0,outstanding:st.finalBalance};
      const dl=FIN.memberDelinquency(m.id);
      const row=model.rows.find(r=>r.id===m.id);
      sumSt+=st.finalBalance;
      const ident=st.openingBalance+st.totalDues-st.totalPaid-(st.debtSettled||0)-(st.debtWrittenOff||0)+(st.creditWrittenOff||0)+(st.refunded||0);   /* FD-009 */
      const lastBal=st.rows.length?Number(st.rows[st.rows.length-1].bal||0):0;
      const wf=Object.values(al.perYear||{}).reduce((s,y)=>s+Number(y.remaining||0),0)
        +Number((al.historical||{}).remaining||0)-Number(al.creditRemaining||0);
      const bad=[];
      if(Math.abs(ident-st.finalBalance)>=T)            bad.push('identity');
      if(Math.abs(lastBal-st.finalBalance)>=T)          bad.push('ledger');
      if(Math.abs(wf-st.finalBalance)>=T)               bad.push('waterfall');
      if(Math.abs(Number(dl.outstanding)-st.finalBalance)>=T) bad.push('delinquency');
      if(!row||Math.abs(Number(row.current)-st.finalBalance)>=T) bad.push('debt-report');
      if(bad.length) failed.push({id:m.id,name:m.name,fails:bad.join('+')});
    });
    checks.push({k:'حسابات الأعضاء — 5 مطابقات لكل عضو ('+members.length+' عضوًا)',
      a:members.length*5-failed.length, b:members.length*5, match:failed.length===0});
    add('مجموع أرصدة الأعضاء: كشف العضو ↔ تقرير المديونية', sumSt, model.totals.current);
    /* — treasury identities — */
    add('صافي مركز الغداء ↔ رصيد الغداء + العجز المتبقي',
      FIN.foodNetPosition(), Number(FIN.foodBalance())+Number(FIN.foodDeficitRemaining()));
    const lf=FIN.fundLedgerView('food','','',''), ld=FIN.fundLedgerView('diwan','','','');
    add('كشف الغداء: الرصيد الختامي ↔ دائن − مدين', lf.closing, lf.totalCr-lf.totalDr);
    add('كشف الديوان: الرصيد الختامي ↔ دائن − مدين', ld.closing, ld.totalCr-ld.totalDr);
    /* — item-9 allocation conservation — */
    const a=FIN.allocateFoodDonations();
    let splitSum=0, perRecOk=true;
    Object.keys(a.perReceipt||{}).forEach(id=>{
      const sp=a.perReceipt[id];
      const s=Number(sp.debtSettled||0)+Number(sp.toDeficit||0)+Number(sp.toCurrent||0);
      splitSum+=s;
      const rec=DB.receipts.find(r=>r.id===id);
      if(rec&&Math.abs(s-FIN.amountOf(rec))>=T) perRecOk=false;
    });
    checks.push({k:'قانون الحفظ (بند ٩): تقسيمات كل إيصال ↔ مبلغه المخزّن',
      a:perRecOk?1:0, b:1, match:perRecOk});
    add('قانون الحفظ (بند ٩): مجاميع التقسيم الثلاثة ↔ مجموع التقسيمات',
      Number(a.debtSettlementTotal||0)+Number(a.reserveTotal||0)+Number(a.currentSupportTotal||0), splitSum);
    return { checks, memberCount:members.length, failedMembers:failed,
      allMatch:checks.every(c=>c.match) };
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
