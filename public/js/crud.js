/* ═══ CRUD — RECEIPTS · PAYMENTS · MEMBERS (Module 7 — extracted from app.js, Phase B) ═══
   saveRec/savePay/saveMember (+ genVerificationToken), the admin edit
   suite editRec/updateRec/deleteRec, editPay/updatePay/deletePay,
   editMember/updateMember/deleteMember, voucher versioning
   (recordVoucherVersion/fetchVoucherHistory/showVoucherHistory),
   year-end lock helpers (lockedThroughYear/voucherLocked), manual
   allocation validation + edit-modal alloc handlers. Verbatim move —
   no query, table, column, rule or financial behavior changed. FIN,
   logAction, annual dues, users admin and attachments stay in app.js.
   Loaded via <script defer> BEFORE app.js, so app.js's security seal
   (sealRestrictedFunctions) still wraps these window.* functions after
   definition, exactly as before. No load-time side effects. Runtime
   deps (SB, DB, CUR/CU, can, guardSave, toast, vf, esc, fmt, today,
   nextNo, getILS/getRate, loadAll, logAction, window.t, closeM,
   fillMemberDropdowns, FIN, buildRecVoucher/openPrintWin) are shared
   globals resolved at call time. */

/* ═══ SAVE RECEIPT ═══ */
/* ═══ QR verification token — cryptographically secure, non-sequential, base62 (16 chars).
   Uniqueness is enforced by the DB unique index on verification_token. ═══ */
function genVerificationToken(len){
  len=len||16;
  const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const rng=(typeof crypto!=='undefined'&&crypto.getRandomValues)?crypto:(window.crypto||window.msCrypto);
  const out=[]; const buf=new Uint8Array(len*2);
  while(out.length<len){
    rng.getRandomValues(buf);
    for(let i=0;i<buf.length&&out.length<len;i++){ if(buf[i]<248) out.push(A[buf[i]%62]); } /* 248=4*62 → modulo-unbiased */
  }
  return out.join('');
}
window.saveRec=async function(print=false){
  if(!guardSave('saveRec')){return;}
  if(!can.write()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية','err');return;}
  const fund=document.getElementById('rec-fund').value;
  const payerType=document.getElementById('rec-payer-type').value;
  const memberId=document.getElementById('rec-member')?.value||null;
  const contactId=document.getElementById('rec-contact')?.value||null;
  const payerNameInput=document.getElementById('rec-payer-name')?.value||'';
  const currency=document.getElementById('rec-currency').value;
  const amount=parseFloat(document.getElementById('rec-amount')?.value)||0;
  const amountILS=getILS('rec');
  const rate=getRate('rec');
  const date=document.getElementById('rec-date').value;
  const method=document.getElementById('rec-method').value||'cash';
  const notes=document.getElementById('rec-notes').value;
  const donDisplay=document.getElementById('rec-don-display')?.value||null;
  const allocationType=document.getElementById('rec-don-alloc-type')?.value||'support_current';
  const donKind=document.getElementById('rec-don-kind')?.value||'cash';   /* P2-D: cash | inkind */
  const saveContact=document.getElementById('rec-save-contact')?.checked||false;

  const v1=fund==='donation'?vf('rec-member',v=>!!v,'e-rec-member'):
    payerType==='member'?vf('rec-member',v=>!!v,'e-rec-member'):
    payerType==='manual'?vf('rec-payer-name',v=>v.trim().length>0,'e-rec-member'):true;
  const v2=vf('rec-amount',v=>parseFloat(v)>0,'e-rec-amount');
  const v3=vf('rec-date',v=>!!v,'e-rec-date');
  if(!v1||!v2||!v3)return;
  /* P0 — year-end lock also restricts CREATE (mirrors the edit/cancel guards). */
  if(voucherLocked(date)){ toast('🔒 السنة المالية مقفلة — لا يمكن إنشاء سند بتاريخ ضمن سنة مقفلة','err'); return; }

  let payerName='';
  if(payerType==='member') payerName=gmn(memberId);
  else if(payerType==='contact') payerName=DB.contacts.find(c=>c.id===contactId)?.name||'';
  else payerName=payerNameInput;

  let finalContactId=contactId;
  if(payerType==='manual'&&saveContact&&payerName){
    const{data:nc}=await SB.from('contacts').insert({name:payerName}).select().single();
    if(nc) finalContactId=nc.id;
    await loadAll();
  }

  /* ITEM 9 — Food Fund Donation: member debt priority allocation + confirmation.
     ق3: NEVER for in-kind — a documentation value must not settle real debt nor
     enter the legacy cash allocator. */
  let finalAllocType=null;
  /* ق4 — member-linked deficit-directed cash donation = historical debt COLLECTION:
     skip the Item-9 debt-settlement preview (it no longer applies to this case). */
  const isQ4Collection = fund==='donation'&&donKind!=='inkind'&&donDisplay==='food'
                         &&allocationType==='reduce_deficit'&&payerType==='member'&&!!memberId;
  if(fund==='donation'&&donDisplay==='food'&&donKind!=='inkind'&&!isQ4Collection){
    finalAllocType=allocationType||'support_current';
    const memberDebtNow=(payerType==='member'&&memberId)?Math.max(0,FIN.memberStatement(memberId).finalBalance):0;
    const debtSettled=Math.min(memberDebtNow,amountILS);
    const remainder=FIN._r2(amountILS-debtSettled);
    const remDeficit=Math.max(0,-FIN.foodDeficitRemaining());
    let toDeficit=0,toCurrent=0;
    if(finalAllocType==='reduce_deficit'){ toDeficit=Math.min(remainder,remDeficit); toCurrent=FIN._r2(remainder-toDeficit); }
    else { toCurrent=remainder; }
    if(debtSettled>0 || (finalAllocType==='reduce_deficit'&&toCurrent>0)){
      const _en=window.LANG==='en';
      const lines=[];
      if(debtSettled>0) lines.push((_en?'Debt Settlement':'تسوية ذمة')+': ₪'+fmt(debtSettled));
      if(toDeficit>0)   lines.push((_en?'Historical Deficit Donation':'تبرع عجز تاريخي')+': ₪'+fmt(toDeficit));
      if(toCurrent>0)   lines.push((_en?'Current Support Donation':'تبرع دعم حالي')+': ₪'+fmt(toCurrent));
      const msg=(_en?'This donation will be allocated as follows:':'سيتم توزيع هذا التبرع كالتالي:')+'\n\n'+lines.join('\n')+'\n\n'+(_en?'Approve and save?':'هل توافق على الحفظ؟');
      if(!window.confirm(msg)) return;
    }
  }
  /* P2-D — classification AT CAPTURE (closes the unclassified-voucher window).
     The system never guesses: donation kind/destination come from explicit form
     fields; food/diwan shapes are deterministic per the ratified ق2/model. */
  let cls;
  if(fund==='food'){
    cls = payerType==='member'
      ? {movement_type:'subscription_payment',destination_treasury:'food',movement_reason:'member_food_payment'}
      : {movement_type:'donation_cash',destination_treasury:'food',movement_reason:'nonmember_food_donation'};
  } else if(fund==='diwan'){
    /* Domain 1 (FA-01 FE-004/FE-005) — two distinct primary events, both to the diwan
       treasury. Operational income (exchange) is excluded from the cash-donation
       register (no register property); cash donation (contribution) carries it. */
    const diwanType=document.getElementById('rec-diwan-type')?.value||'donation';
    cls = diwanType==='operational'
      ? {movement_type:'diwan_operational_income',destination_treasury:'diwan',movement_reason:'diwan_operational_income'}
      : {movement_type:'diwan_cash_donation',   destination_treasury:'diwan',movement_reason:'diwan_cash_donation'};
  } else if(donKind==='inkind'){
    cls = {movement_type:'donation_inkind',destination_treasury:null,movement_reason:'inkind_at_capture',
           register_category:document.getElementById('rec-don-category')?.value||'other'};
  } else {
    const dest = donDisplay==='diwan' ? 'diwan' : (allocationType==='reduce_deficit' ? 'historical_deficit' : 'food');
    cls = isQ4Collection
      ? {movement_type:'historical_debt_collection',destination_treasury:'historical_deficit',movement_reason:'q4_member_deficit_collection'}
      : {movement_type:'donation_cash',destination_treasury:dest,movement_reason:'donation_at_capture'};
    /* overflow rule: money beyond the remaining deficit flows to Food automatically (read-time rule) */
    if(dest==='historical_deficit'&&window.FIN2){
      const rem=Math.abs(Math.min(0,(window.TREASURY_OPENINGS?.historical_deficit||0)+FIN2.historicalDeficitTreasury()));
      const over=FIN2.overflowDue(rem,amountILS);
      if(over>0&&!window.confirm('العجز المتبقي ₪'+fmt(rem)+' أقل من التبرع. الفائض ₪'+fmt(over)+' سيتحوّل تلقائياً لخزينة الغداء. متابعة؟')) return;
    }
  }
  const no=nextNo('REC',DB.receipts);
  const{data,error}=await SB.from('receipts').insert({
    no,verification_token:genVerificationToken(),fund_type:fund,receipt_date:date,
    movement_type:cls.movement_type,destination_treasury:cls.destination_treasury,
    movement_reason:cls.movement_reason,register_category:cls.register_category||null,
    payer_type:payerType,
    member_id:payerType==='member'?memberId:null,
    contact_id:finalContactId,
    payer_name:payerName,
    amount,currency,amount_ils:amountILS,exchange_rate:rate,
    payment_method:method,notes,
    donation_display_fund:(fund==='donation'&&donKind!=='inkind')?donDisplay:null,   /* ق3: in-kind never enters legacy display/allocator */
    food_donation_allocation:finalAllocType,
    current_addition:null,
    created_by:CUR?.full_name||CU?.email,
  }).select().single();
  if(error){toast(window.t('errors.save_error')+': '+error.message,'err');return;}
  await logAction('add',`إضافة إيصال ${no} — ${payerName} — ₪${fmt(amountILS)}${currency!=='ILS'?` (${fmtD(amount)} ${currency})`:''}`, 'receipts', data.id);
  window.closeM();
  await loadAll();
  toast(window.t('messages.receipt_saved')+' '+no,'ok');
  await SB.from('vouchers').upsert({id:no,type:fund==='food'?'Receipt Voucher — Food Fund':fund==='diwan'?'Receipt Voucher — Diwan Fund':'Donation Voucher',fund:fund==='food'?'Food Fund':fund==='diwan'?'Diwan Fund':'Food Fund',date:fmtDate2(date),amount:fmtD(amountILS)+' ILS',description:notes||'Receipt Voucher',prepared_by:CUR?.full_name||CU?.email});
  if(print) setTimeout(()=>window.prtRec(data.id),300);
};

/* ═══ SAVE PAYMENT ═══ */
window.savePay=async function(print=false){
  if(!guardSave('savePay')){return;}
  if(!can.write()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية','err');return;}
  const fund=document.getElementById('pay-fund').value;
  const benType=document.getElementById('pay-beneficiary-type').value;
  const memberId=document.getElementById('pay-member')?.value||null;
  const benNameInput=document.getElementById('pay-ben-name')?.value||'';
  const currency=document.getElementById('pay-currency').value;
  const amount=parseFloat(document.getElementById('pay-amount')?.value)||0;
  const amountILS=getILS('pay');
  const rate=getRate('pay');
  const date=document.getElementById('pay-date').value;
  const method=document.getElementById('pay-method').value||'cash';
  const expense=document.getElementById('pay-expense').value;
  const notes=document.getElementById('pay-notes').value;
  const approved=document.getElementById('pay-approved')?.value||'';

  const v1=benType==='member'?true:vf('pay-ben-name',v=>v.trim().length>0,'e-pay-ben');
  const v2=vf('pay-amount',v=>parseFloat(v)>0,'e-pay-amount');
  const v3=vf('pay-date',v=>!!v,'e-pay-date');
  if(!v1||!v2||!v3)return;
  /* P0 — year-end lock also restricts CREATE (mirrors the edit/cancel guards). */
  if(voucherLocked(date)){ toast('🔒 السنة المالية مقفلة — لا يمكن إنشاء سند بتاريخ ضمن سنة مقفلة','err'); return; }

  const benName=benType==='member'?gmn(memberId):benNameInput;
  const no=nextNo('PAY',DB.payments);
  const{data,error}=await SB.from('payments').insert({
    no,verification_token:genVerificationToken(),fund_type:fund,payment_date:date,
    /* P2-D — classification at capture: an expense of its treasury */
    movement_type:fund==='food'?'food_expense':'diwan_expense',
    destination_treasury:fund==='food'?'food':'diwan',
    movement_reason:fund==='food'?'food_expense':'diwan_expense',
    beneficiary_type:benType,
    member_id:benType==='member'?memberId:null,
    beneficiary_name:benName,
    amount,currency,amount_ils:amountILS,exchange_rate:rate,
    expense_type:expense,payment_method:method,notes,
    approved_by:approved,
    created_by:CUR?.full_name||CU?.email,
  }).select().single();
  if(error){toast(window.t('errors.save_error')+': '+error.message,'err');return;}
  await logAction('add',`إضافة سند ${no} — ${benName} — ₪${fmt(amountILS)}`,'payments',data.id);
  window.closeM();
  await loadAll();
  toast(window.t('messages.payment_saved')+' '+no,'ok');
  await SB.from('vouchers').upsert({id:no,type:fund==='food'?'Payment Voucher — Food Fund':'Payment Voucher — Diwan Fund',fund:fund==='food'?'Food Fund':'Diwan Fund',date:fmtDate2(date),amount:fmtD(amountILS)+' ILS',description:notes||L.expense(expense),prepared_by:CUR?.full_name||CU?.email});
  if(print) setTimeout(()=>window.prtPay(data.id),300);
};

/* ═══ SAVE MEMBER ═══ */
window.saveMember=async function(){
  if(!guardSave('saveMember')){return;}
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية','err');return;}
  const name=document.getElementById('mem-name').value.trim();
  if(!vf('mem-name',v=>v.trim().length>1,'e-mem-name'))return;
  if(DB.members.find(m=>m.name.trim()===name)){toast(window.t('errors.duplicate_member'),'warn');return;}
  const bal=parseFloat(document.getElementById('mem-balance').value)||0;
  const phone=document.getElementById('mem-phone').value;
  const notes=document.getElementById('mem-notes').value;
  const fromYearRaw=document.getElementById('mem-from-year')?.value;
  const fromYear=fromYearRaw?parseInt(fromYearRaw,10):new Date().getFullYear();
  /* R1 — write the AUTHORITATIVE model. The opening field is a signed net:
     >=0 = opening debt (historical_balance_ils); <0 = opening credit (an opening
     payment + credit snapshot). opening_balance is kept legacy-only (never used
     in any financial calculation). */
  const auth = bal>=0
    ? {historical_balance_ils:bal, historical_payments_ils:0, credit_balance_ils:0}
    : {historical_balance_ils:0, historical_payments_ils:-bal, credit_balance_ils:-bal};
  const{data:mNew,error}=await SB.from('members').insert({name,phone,notes,opening_balance:bal,active_from_year:fromYear,...auth}).select('id').single();
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  /* R1 — seed authoritative subscription rows so the new member carries dues. */
  const subRows=DB.annual.map(a=>({member_id:mNew.id,year:a.year,due_amount_ils:(fromYear<=a.year?Number(a.amount||0):0),paid_amount_ils:0,balance_ils:(fromYear<=a.year?Number(a.amount||0):0)}));
  if(subRows.length){await SB.from('member_subscriptions').insert(subRows);}
  await logAction('add',`إضافة عضو: ${name}`,'members',mNew?.id||null);
  window.closeM();await loadAll();toast(window.t('messages.member_added')+' '+name,'ok');
};

/* ═══ EDIT RECORDS (admin only) ═══ */
/* ═══ VOUCHER VERSIONING · EDIT REASON · YEAR-END LOCK (Phases 2/3/5/7/10/11/12) ═══
   The live receipt/payment row is the single source; FIN.* rebuilds every balance from
   source on loadAll(), so the Universal Rebuild rule (reverse → recompute → reapply) is
   satisfied automatically — no deltas, no partial adjustments. Voucher numbers (`no`)
   are never changed by any edit. */
function lockedThroughYear(){
  return Number.isFinite(window.LOCKED_THROUGH_YEAR)?window.LOCKED_THROUGH_YEAR:(new Date().getFullYear()-1);
}
function voucherLocked(dateStr){
  if(!dateStr) return false;
  const y=new Date(dateStr).getFullYear();
  return Number.isFinite(y)&&y<=lockedThroughYear();
}
/* Phase 7 — manual food-donation allocation must sum EXACTLY to the voucher amount. */
function validateManualAllocation(amount,debt,historical,current){
  const sum=FIN._r2(Number(debt||0)+Number(historical||0)+Number(current||0));
  return FIN._r2(sum)===FIN._r2(Number(amount||0));
}
/* Phase 2/12 — append immutable full-snapshot versions. Backfills the v1 baseline from the
   pre-edit state the first time a voucher is edited. preRow/postRow are complete row objects. */
async function recordVoucherVersion(kind,preRow,postRow,reason,newVer){
  const editor=CUR?.full_name||CU?.email||'admin';
  const nowIso=new Date().toISOString();
  const{data:hist}=await SB.from('voucher_versions').select('version_no')
    .eq('voucher_kind',kind).eq('voucher_id',preRow.id).limit(1);
  if(!hist||!hist.length){
    const{error:bErr}=await SB.from('voucher_versions').insert({
      voucher_kind:kind,voucher_id:preRow.id,voucher_no:preRow.no,version_no:Number(preRow.version||1),
      snapshot:preRow,edit_reason:'سجل أولي · Initial',
      edited_by:preRow.created_by||editor,edited_at:preRow.created_at||nowIso});
    if(bErr) throw new Error(bErr.message);
  }
  const{error:nErr}=await SB.from('voucher_versions').insert({
    voucher_kind:kind,voucher_id:preRow.id,voucher_no:preRow.no,version_no:newVer,
    snapshot:postRow,edit_reason:reason,edited_by:editor,edited_at:nowIso});
  if(nErr) throw new Error(nErr.message);
}
/* ═══ P2-C — CLASSIFICATION LOCK ═══════════════════════════════════════════
   After the migration, a voucher's financial classification (movement_type /
   destination_treasury / source_treasury / movement_reason / register_category)
   is part of financial history. NO normal edit path touches these fields —
   saveRec/savePay/saveEditRec/saveEditPay never read or write them. The ONE
   sanctioned exception is this admin-only function: explicit reason required,
   previous AND new classification preserved as an immutable voucher_versions
   snapshot, and a mandatory audit-log entry (date + user + reason). Nothing is
   overwritten silently. (No UI calls this yet; exposing it is a P2-D decision.) */
window.reclassifyVoucher=async function(kind,voucherId,newClass,reason){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return false;}
  if(!reason||!String(reason).trim()){toast('سبب إعادة التصنيف إلزامي','err');return false;}
  if(!newClass||!newClass.movement_type){toast('تصنيف جديد غير صالح','err');return false;}
  /* P2-D — validate against the ratified model: movement_type must be a MODEL2
     event; a cash donation may only target an approved destination; non-cash
     events must NOT carry a cash destination. The system never guesses. */
  const M2=window.MODEL2;
  if(!M2){toast('نموذج التصنيف غير مُحمَّل — أُلغيت العملية','err');return false;}   /* fail-closed */
  {
    const ev=M2.EVENTS[newClass.movement_type];
    if(!ev){toast('نوع الحركة ليس من أحداث النموذج المعتمد','err');return false;}
    if(newClass.movement_type==='donation_cash'&&!M2.DONATION_DESTINATIONS.includes(newClass.destination_treasury)){
      toast('وجهة التبرع النقدي يجب أن تكون إحدى الخزائن الثلاث','err');return false;}
    if(ev.cash===false&&newClass.destination_treasury){
      toast('حدث غير نقدي لا يحمل وجهة خزينة','err');return false;}
  }
  const table=kind==='payment'?'payments':'receipts';
  const{data:row,error:rErr}=await SB.from(table).select('*').eq('id',voucherId).single();
  if(rErr||!row){toast('السند غير موجود','err');return false;}
  const prev={movement_type:row.movement_type||null,destination_treasury:row.destination_treasury||null,
              source_treasury:row.source_treasury||null,movement_reason:row.movement_reason||null,
              register_category:row.register_category||null};
  const next={movement_type:newClass.movement_type,
              destination_treasury:newClass.destination_treasury??null,
              source_treasury:newClass.source_treasury??null,
              movement_reason:newClass.reason||newClass.movement_reason||null,
              register_category:newClass.register_category??null};
  const editor=CUR?.full_name||CU?.email||'admin';
  const newVer=Number(row.version||1)+1;
  /* immutable evidence FIRST: full pre/post snapshot + the reason */
  await recordVoucherVersion(kind==='payment'?'payment':'receipt',row,
    Object.assign({},row,next,{version:newVer}),
    'إعادة تصنيف استثنائية · Reclassification — '+String(reason).trim(),newVer);
  const{error:uErr}=await SB.from(table).update(Object.assign({},next,{version:newVer})).eq('id',voucherId);
  if(uErr){toast('فشل التحديث: '+uErr.message,'err');return false;}
  await logAction('reclassify',
    `إعادة تصنيف ${row.no}: ${prev.movement_type||'—'}→${next.movement_type}`+
    ` · ${prev.destination_treasury||'—'}→${next.destination_treasury||'—'} · السبب: ${String(reason).trim()}`,
    table,voucherId);
  await loadAll();
  toast('✓ أُعيد التصنيف مع حفظ الأثر الكامل','ok');
  return true;
};
async function fetchVoucherHistory(kind,voucherId){
  const{data}=await SB.from('voucher_versions').select('*')
    .eq('voucher_kind',kind).eq('voucher_id',voucherId).order('version_no',{ascending:true});
  return data||[];
}
window.showVoucherHistory=async function(kind,voucherId){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const vers=await fetchVoucherHistory(kind,voucherId);
  const box=document.getElementById('vhist-body');
  if(!box){toast('عدد النسخ: '+vers.length,'info');return;}
  box.innerHTML=(!vers.length)?'<div class="empty"><div class="empty-t">لا توجد نسخ سابقة</div></div>'
    :vers.map(v=>{const s=v.snapshot||{};const amt=s.amount_ils!=null?('₪ '+fmt(s.amount_ils)):'';
      const dt=s.receipt_date||s.payment_date||'';const who=s.payer_name||s.beneficiary_name||(s.member_id?gmn(s.member_id):'—');
      return '<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-weight:700">'
        +'<span>نسخة رقم '+v.version_no+'</span><span style="color:var(--tx3);font-size:11px">'+esc((v.edited_at||'').slice(0,10))+'</span></div>'
        +'<div style="font-size:12px;margin-top:4px">'+esc(String(who))+' · '+amt+' · '+esc(dt)+'</div>'
        +'<div style="font-size:11px;color:var(--tx3);margin-top:3px">المستخدم: '+esc(v.edited_by||'—')+'</div>'
        +'<div style="font-size:11px;color:var(--warn);margin-top:3px">السبب: '+esc(v.edit_reason||'—')+'</div></div>';}).join('');
  window.openM('vhist');
};
/* P7 — manual allocation UI helpers (edit modal). */
window.onEditAllocModeChange=function(){
  const mode=document.getElementById('edit-rec-alloc-mode')?.value;
  const mw=document.getElementById('edit-rec-manual-wrap');
  if(mw) mw.style.display=(mode==='manual')?'':'none';
  window.onEditManualInput();
};
window.onEditManualInput=function(){
  const amount=parseFloat(document.getElementById('edit-rec-amount')?.value)||0;
  const debt=parseFloat(document.getElementById('edit-rec-m-debt')?.value)||0;
  const hist=parseFloat(document.getElementById('edit-rec-m-hist')?.value)||0;
  const cur=parseFloat(document.getElementById('edit-rec-m-current')?.value)||0;
  const sum=Math.round((debt+hist+cur)*100)/100;
  const box=document.getElementById('edit-rec-manual-sum');
  if(box){ const ok=sum===Math.round(amount*100)/100;
    box.textContent='المجموع: ₪'+fmt(sum)+' / ₪'+fmt(amount)+(ok?'  ✓':'  ✗ يجب أن يتساوى');
    box.className='ibox'+(ok?'':' warn'); }
};
window.editRec=function(id){
  if(!can.admin()){
    toast(window.t ? window.t('errors.no_permission') : 'المدير فقط','err');
    return;
  }

  const r = DB.receipts.find(x=>x.id===id);
  if(!r) return;
  /* Phase 10 — Year-End Lock (no override): closed-year vouchers are read-only. */
  if(voucherLocked(r.receipt_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن تعديل هذا السند','err'); return; }

  document.getElementById('edit-rec-id').value = id;
  document.getElementById('edit-rec-amount').value = r.amount_ils || r.amount;
  document.getElementById('edit-rec-notes').value = r.notes || '';
  const rsn=document.getElementById('edit-rec-reason'); if(rsn) rsn.value='';

  /* BUG 2 FIX: قراءة receipt_date وليس r.date */
  const dateEl = document.getElementById('edit-rec-date');
  if(dateEl){
    dateEl.value = r.receipt_date || '';
  }

  /* P4/P6 — member reassignment (member-type receipts only; type/domain immutable). */
  const mWrap=document.getElementById('edit-rec-member-wrap');
  const mSel=document.getElementById('edit-rec-member');
  if(mWrap&&mSel){
    if(r.payer_type==='member'){ mWrap.style.display=''; mSel.value=r.member_id||''; }
    else { mWrap.style.display='none'; }
  }
  const pWrap=document.getElementById('edit-rec-payer-wrap');
  const pInput=document.getElementById('edit-rec-payer-name');
  if(pWrap&&pInput){
    if(r.payer_type==='manual'){ pWrap.style.display=''; pInput.value=r.payer_name||''; }
    else { pWrap.style.display='none'; }
  }
  /* P4/P7 — food-donation allocation mode + manual split (food domain only). */
  const fWrap=document.getElementById('edit-rec-food-wrap');
  if(fWrap){
    const isFoodDon=r.fund_type==='donation'&&r.donation_display_fund==='food';
    fWrap.style.display=isFoodDon?'':'none';
    if(isFoodDon){
      const at=document.getElementById('edit-rec-alloc-type'); if(at) at.value=r.food_donation_allocation||'support_current';
      const am=document.getElementById('edit-rec-alloc-mode'); if(am) am.value=r.manual_allocation?'manual':'auto';
      const md=document.getElementById('edit-rec-m-debt'); if(md) md.value=(r.manual_debt_settlement!=null?r.manual_debt_settlement:'');
      const mh=document.getElementById('edit-rec-m-hist'); if(mh) mh.value=(r.manual_historical_donation!=null?r.manual_historical_donation:'');
      const mc=document.getElementById('edit-rec-m-current'); if(mc) mc.value=(r.manual_current_support!=null?r.manual_current_support:'');
      window.onEditAllocModeChange();
    }
  }

  window.openM('edit-rec');
};
window.updateRec = async function () {

if (!can.admin()) {
  toast(window.t ? window.t('errors.no_permission') : 'المدير فقط','err');
  return;
}

const id = document.getElementById('edit-rec-id').value;
const r = DB.receipts.find(x=>x.id===id);
if(!r){ toast('السند غير موجود','err'); return; }
/* Phase 10 — Year-End Lock (no override). */
if(voucherLocked(r.receipt_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن تعديل هذا السند','err'); return; }
const amount = parseFloat(document.getElementById('edit-rec-amount').value) || 0;
const date = document.getElementById('edit-rec-date')?.value || null;
const notes = document.getElementById('edit-rec-notes').value || '';
const reason = (document.getElementById('edit-rec-reason')?.value || '').trim();

if (amount <= 0) {
  toast(window.t('errors.invalid_amount'),'warn');
  return;
}
/* Phase 3 — editing requires a reason; saving without one is impossible. */
if(!reason){ toast('✋ سبب التعديل إلزامي','warn'); return; }
/* Phase 10 — cannot move a voucher INTO a locked (closed) year. */
if(voucherLocked(date)){ toast('🔒 لا يمكن نقل السند إلى سنة مقفلة','err'); return; }

/* P4/P6/P7 — build the full edit set. Voucher number, fund_type and the donation
   domain (food/diwan) are NEVER changed. FIN rebuilds every balance on loadAll(). */
const upd={ amount_ils:amount, receipt_date:date, notes:notes };
/* P6 — member reassignment (member-type receipts). */
if(r.payer_type==='member'){
  const newMid=document.getElementById('edit-rec-member')?.value||r.member_id;
  if(!newMid){ toast('✋ اختر العضو','warn'); return; }
  upd.member_id=newMid; upd.payer_name=gmn(newMid);
} else if(r.payer_type==='manual'){
  const pn=(document.getElementById('edit-rec-payer-name')?.value||'').trim();
  if(pn) upd.payer_name=pn;
}
/* P7 — food-donation allocation: automatic (Item 9) or manual per-voucher override. */
if(r.fund_type==='donation' && r.donation_display_fund==='food'){
  upd.food_donation_allocation=document.getElementById('edit-rec-alloc-type')?.value||r.food_donation_allocation||'support_current';
  const mode=document.getElementById('edit-rec-alloc-mode')?.value||'auto';
  if(mode==='manual'){
    const debt=parseFloat(document.getElementById('edit-rec-m-debt')?.value)||0;
    const hist=parseFloat(document.getElementById('edit-rec-m-hist')?.value)||0;
    const cur=parseFloat(document.getElementById('edit-rec-m-current')?.value)||0;
    if(!validateManualAllocation(amount,debt,hist,cur)){ toast('✋ مجموع التوزيع اليدوي يجب أن يساوي مبلغ السند (₪'+fmt(amount)+')','err'); return; }
    upd.manual_allocation=true; upd.manual_debt_settlement=debt; upd.manual_historical_donation=hist; upd.manual_current_support=cur;
  } else {
    upd.manual_allocation=false; upd.manual_debt_settlement=null; upd.manual_historical_donation=null; upd.manual_current_support=null;
  }
}
const nowIso = new Date().toISOString();
const newVer = Number(r.version||1)+1;
upd.version=newVer; upd.updated_at=nowIso;
const { error } = await SB.from('receipts').update(upd).eq('id', id);

if (error) {
  toast(window.t('errors.generic_error')+': '+error.message,'err');
  return;
}
/* Phase 2/3 — immutable full snapshot + reason for this version (and v1 baseline). */
try{
  await recordVoucherVersion('receipt', r, { ...r, ...upd }, reason, newVer);
}catch(e){ toast('⚠️ تعذّر حفظ نسخة السجل: '+e.message,'warn'); }

await logAction('edit',`تعديل إيصال ${r.no} (نسخة ${newVer}) — ₪${fmt(amount)} | السبب: ${reason}`, 'receipts', id);
window.closeM();
await loadAll();
toast(window.t('messages.updated'),'ok');

};
window.deleteRec=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-rec-id').value;
  const _dr=DB.receipts.find(x=>x.id===id);
  if(_dr&&voucherLocked(_dr.receipt_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن إلغاء هذا السند','err'); return; }
  if(!confirm('إلغاء هذا السند نهائياً؟'))return;
  await SB.from('receipts').update({is_deleted:true}).eq('id',id);
  await logAction('delete','إلغاء إيصال','receipts',id);
  window.closeM();await loadAll();toast(window.t('messages.cancelled'),'warn');
};
window.editPay=function(id){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  if(voucherLocked(p.payment_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن تعديل هذا السند','err'); return; }
  document.getElementById('edit-pay-id').value=id;
  document.getElementById('edit-pay-amount').value=p.amount_ils||p.amount;
  document.getElementById('edit-pay-notes').value=p.notes||'';
  const rsn=document.getElementById('edit-pay-reason'); if(rsn) rsn.value='';
  window.openM('edit-pay');
};
window.updatePay=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-pay-id').value;
  const p=DB.payments.find(x=>x.id===id);
  if(!p){toast('السند غير موجود','err');return;}
  if(voucherLocked(p.payment_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن تعديل هذا السند','err'); return; }
  const amount=parseFloat(document.getElementById('edit-pay-amount').value)||0;
  const notes=document.getElementById('edit-pay-notes').value;
  const reason=(document.getElementById('edit-pay-reason')?.value||'').trim();
  if(amount<=0){toast(window.t('errors.invalid_amount'),'warn');return;}
  if(!reason){ toast('✋ سبب التعديل إلزامي','warn'); return; }
  const nowIso=new Date().toISOString();
  const newVer=Number(p.version||1)+1;
  const{error}=await SB.from('payments').update({amount_ils:amount,notes,version:newVer,updated_at:nowIso}).eq('id',id);
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  try{
    await recordVoucherVersion('payment', p,
      {...p, amount_ils:amount, notes:notes, version:newVer, updated_at:nowIso}, reason, newVer);
  }catch(e){ toast('⚠️ تعذّر حفظ نسخة السجل: '+e.message,'warn'); }
  await logAction('edit',`تعديل سند صرف ${p.no} (نسخة ${newVer}) — ₪${fmt(amount)} | السبب: ${reason}`,'payments',id);
  window.closeM();await loadAll();toast(window.t('messages.updated'),'ok');
};
window.deletePay=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-pay-id').value;
  const _dp=DB.payments.find(x=>x.id===id);
  if(_dp&&voucherLocked(_dp.payment_date)){ toast('🔒 السنة المالية مقفلة — لا يمكن إلغاء هذا السند','err'); return; }
  if(!confirm('إلغاء هذا السند نهائياً؟'))return;
  await SB.from('payments').update({is_deleted:true}).eq('id',id);
  await logAction('delete','إلغاء سند صرف','payments',id);
  window.closeM();await loadAll();toast(window.t('messages.cancelled'),'warn');
};
window.editMember=function(id){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const m=gm(id);if(!m)return;
  document.getElementById('edit-mem-id').value=id;
  document.getElementById('edit-mem-name').value=m.name;
  document.getElementById('edit-mem-phone').value=m.phone||'';
  /* R1 — read the AUTHORITATIVE net opening (historical_balance_ils − historical_payments_ils),
     not the legacy opening_balance. */
  document.getElementById('edit-mem-balance').value=Math.round((Number(m.historical_balance_ils||0)-Number(m.historical_payments_ils||0))*100)/100;
  document.getElementById('edit-mem-notes').value=m.notes||'';
  const efy=document.getElementById('edit-mem-from-year');
  if(efy) efy.value=m.active_from_year||'';
  window.openM('edit-member');
};
window.updateMember=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-mem-id').value;
  const name=document.getElementById('edit-mem-name').value.trim();
  if(!name){toast(window.t('errors.name_required'),'warn');return;}
  const phone=document.getElementById('edit-mem-phone').value;
  const bal=parseFloat(document.getElementById('edit-mem-balance').value)||0;
  const notes=document.getElementById('edit-mem-notes').value;
  const efyRaw=document.getElementById('edit-mem-from-year')?.value;
  const efy=efyRaw?parseInt(efyRaw,10):null;
  /* R1 — keep the AUTHORITATIVE model in sync. Only rewrite the authoritative
     opening fields when the net opening balance actually changed, so migrated
     gross-debt / pre-2025-payment detail is preserved when untouched. */
  const _m=gm(id);
  const oldNet=Math.round((Number(_m?.historical_balance_ils||0)-Number(_m?.historical_payments_ils||0))*100)/100;
  const upd={name,phone,opening_balance:bal,notes,active_from_year:efy,updated_at:new Date().toISOString()};
  if(Math.round(bal*100)/100!==oldNet){
    Object.assign(upd, bal>=0
      ? {historical_balance_ils:bal, historical_payments_ils:0, credit_balance_ils:0}
      : {historical_balance_ils:0, historical_payments_ils:-bal, credit_balance_ils:-bal});
  }
  const{error}=await SB.from('members').update(upd).eq('id',id);
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  await logAction('edit',`تعديل بيانات عضو: ${name}`,'members',id);
  window.closeM();await loadAll();toast(window.t('messages.updated'),'ok');
};
window.deleteMember=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-mem-id').value;
  const m=gm(id);
  if(!confirm(`حذف العضو ${m?.name}؟ لا يمكن التراجع.`))return;
  await SB.from('members').update({is_active:false}).eq('id',id);
  await logAction('delete',`حذف عضو: ${m?.name}`,'members',id);
  window.closeM();await loadAll();toast(window.t('messages.deleted'),'warn');
};

