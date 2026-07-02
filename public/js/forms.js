/* ═══ DIALOGS & FORMS (Module 6 — extracted from app.js, Phase B) ═══
   Modal open/close + form reset, receipt/payment modal openers and their
   fund/payer/beneficiary/donation change handlers, cheque-method pills,
   member/contact dropdown fillers, the hybrid searchable member combo
   (Note 6), and the vf() form validator. Pure dialog/form UI — no FIN,
   no SQL, no Supabase writes (openRec/openPay only gate on can.write()
   and prefill fields; the save* functions stay in app.js). Verbatim move;
   all bindings are global declarations / window.* assignments in a classic
   script, visible to app.js, auth.js and inline handlers exactly as
   before. No load-time side effects. Runtime deps (DB, can, toast, esc,
   today, window.t, setupAllForms) resolve at call time. */

/* ═══ FORM VALIDATION ═══ */
function vf(inputId,validatorFn,errorId){
  const el=document.getElementById(inputId);
  const errEl=document.getElementById(errorId);
  const val=el?el.value:'';
  const ok=validatorFn(val);
  if(el){if(ok)el.classList.remove('err');else el.classList.add('err');}
  if(errEl){if(ok)errEl.classList.remove('on');else errEl.classList.add('on');}
  return ok;
}

/* ═══ MODAL ═══ */
window.openM=function(type){
  setTimeout(setupAllForms,100);
  document.getElementById('ov').classList.add('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.getElementById('m-'+type).style.display='block';
  if(type==='member'){
    const fy=document.getElementById('mem-from-year');
    if(fy && !fy.value) fy.value=new Date().getFullYear();
  }
};
window.closeM=function(){
  document.getElementById('ov').classList.remove('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  resetForms();
};
function resetForms(){
  document.querySelectorAll('.modal input[type="text"],.modal input[type="number"],.modal input[type="email"],.modal textarea').forEach(el=>{
    if(!el.id?.startsWith('edit-')&&!el.id?.startsWith('inv-')) el.value='';
  });
  document.querySelectorAll('.modal input[type="date"]').forEach(el=>el.value='');
  document.querySelectorAll('.ferr').forEach(e=>e.classList.remove('on'));
  document.querySelectorAll('.modal input').forEach(e=>e.classList.remove('err'));
  document.querySelectorAll('.pill.on').forEach(p=>{p.classList.remove('on');});
  document.querySelectorAll('.pills .pill:first-child').forEach(p=>p.classList.add('on'));
  document.querySelectorAll('input[type="hidden"][id$="-method"]').forEach(el=>el.value='cash');
  document.querySelectorAll('select[id$="-currency"]').forEach(el=>{el.value='ILS';});
  document.querySelectorAll('[id$="-ils-row"]').forEach(el=>el.style.display='none');
}

window.openRec=function(fund='food'){
  if(!can.write()){toast(window.t('errors.no_permission_add'),'err');return;}
  fillMemberDropdowns();
  window.openM('rec');
  const funSel=document.getElementById('rec-fund');
  if(funSel){funSel.value=fund;window.onRecFundChange();}
  document.getElementById('rec-date').value=today();
};
window.openPay=function(fund='food'){
  if(!can.write()){toast(window.t('errors.no_permission_add'),'err');return;}
  fillMemberDropdowns();
  window.openM('pay');
  const funSel=document.getElementById('pay-fund');
  if(funSel){funSel.value=fund;window.onPayFundChange();}
  document.getElementById('pay-date').value=today();
};

window.onRecFundChange=function(){
  const fund=document.getElementById('rec-fund').value;
  const mico=document.getElementById('rec-mico');
  const title=document.getElementById('rec-mtitle');
  const donWrap=document.getElementById('rec-don-fund-wrap');
  const ptSel=document.getElementById('rec-payer-type');
  const optContact=document.getElementById('opt-contact');
  const optManual=document.getElementById('opt-manual');
  if(fund==='food'){
    if(mico){mico.className='mico food';} if(title)title.textContent=window.t('receipts.modal_food');
    if(donWrap)donWrap.style.display='none';
    if(optContact)optContact.style.display='none';
    if(optManual)optManual.style.display='';
  } else if(fund==='diwan'){
    if(mico){mico.className='mico diwan';} if(title)title.textContent=window.t('receipts.modal_diwan');
    if(donWrap)donWrap.style.display='none';
    if(optContact)optContact.style.display='';
    if(optManual)optManual.style.display='';
  } else if(fund==='donation'){
    if(mico){mico.className='mico don';} if(title)title.textContent=window.t('dashboard.new_donation');
    if(donWrap)donWrap.style.display='';
    if(optContact)optContact.style.display='none';
    if(optManual)optManual.style.display='none';
    if(ptSel)ptSel.value='member';
    window.onDonDisplayChange();
  }
  window.onPayerTypeChange();
};
/* Show/hide allocation_type selector based on donation target fund */
window.onDonDisplayChange=function(){
  const display=document.getElementById('rec-don-display')?.value;
  const allocWrap=document.getElementById('rec-don-alloc-wrap');
  if(allocWrap) allocWrap.style.display=display==='food'?'':'none';
  /* Reset allocation to default when switching away from food */
  if(display!=='food'){
    const allocSel=document.getElementById('rec-don-alloc-type');
    if(allocSel) allocSel.value='support_current';
  }
};
window.onPayerTypeChange=function(){
  const t=document.getElementById('rec-payer-type').value;
  document.getElementById('rec-member-wrap').style.display=t==='member'?'':'none';
  document.getElementById('rec-contact-wrap').style.display=t==='contact'?'':'none';
  document.getElementById('rec-manual-wrap').style.display=t==='manual'?'':'none';
};
window.onPayFundChange=function(){
  const fund=document.getElementById('pay-fund').value;
  const expSel=document.getElementById('pay-expense');
  const benTypeSel=document.getElementById('pay-beneficiary-type');
  if(fund==='food'){
    expSel.innerHTML='<option value="food_expense">مصاريف إطعام عزاء</option>';
    if(benTypeSel){
      benTypeSel.innerHTML='<option value="manual">إدخال يدوي</option>';
      benTypeSel.value='manual';
    }
    document.getElementById('pay-member-wrap').style.display='none';
    document.getElementById('pay-manual-wrap').style.display='';
  } else {
    expSel.innerHTML=`
      <option value="electricity">كهرباء</option>
      <option value="water">ماء</option>
      <option value="cleaning">تنظيف</option>
      <option value="maintenance">صيانة</option>
      <option value="other">أخرى</option>`;
    if(benTypeSel){
      benTypeSel.innerHTML=`<option value="member">عضو من العائلة</option><option value="manual">إدخال يدوي</option>`;
    }
  }
  document.getElementById('pay-mtitle').textContent=fund==='food'?window.t('payments.modal_food'):window.t('payments.modal_diwan');
};

window.onPayBenChange=function(){
  const t=document.getElementById('pay-beneficiary-type').value;
  document.getElementById('pay-member-wrap').style.display=t==='member'?'':'none';
  document.getElementById('pay-manual-wrap').style.display=t==='manual'?'':'none';
};

/* ═══ CHEQUE FIELDS ═══ */
window.onMethodChange=function(prefix){
  const method=document.getElementById(prefix+'-method')?.value||'';
  const chequeWrap=document.getElementById(prefix+'-cheque-wrap');
  if(chequeWrap) chequeWrap.style.display=method==='check'?'':'none';
};
window.setPill=function(prefix,el){
  document.getElementById(prefix+'-pills')?.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  const val=el.dataset.val;
  const hiddenInput=document.getElementById(prefix+'-method');
  if(hiddenInput)hiddenInput.value=val;
  window.onMethodChange(prefix);
};

/* ═══ DROPDOWNS ═══ */
function fillMemberDropdowns(){
  const opts='<option value="">-- اختر عضواً --</option>'+DB.members.filter(m=>m.is_active).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  ['rec-member','pay-member','don-mem-sel','edit-rec-member'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
  ['rec-member','pay-member'].forEach(id=>{ if(document.getElementById(id)){ enhanceMemberSelect(id); syncComboInput(id); } });
}
function fillContactDropdown(){
  const opts='<option value="">-- اختر --</option>'+DB.contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const el=document.getElementById('rec-contact');if(el)el.innerHTML=opts;
}

/* ═══ Note 6 — Hybrid searchable member select ═══
   يُبقي <select> الأصلي مصدراً للقيمة (لا يكسر منطق الحفظ)،
   ويضيف فوقه حقل بحث: قائمة منسدلة عادية، وتتحوّل لفلترة فور الكتابة. */
function enhanceMemberSelect(selectId){
  const sel=document.getElementById(selectId);
  if(!sel || sel.dataset.enhanced==='1') { if(sel) syncComboInput(selectId); return; }
  sel.dataset.enhanced='1';
  sel.style.display='none';
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative';
  const input=document.createElement('input');
  input.type='text';
  input.id=selectId+'-combo';
  input.autocomplete='off';
  input.placeholder='اكتب للبحث أو اختر عضواً...';
  input.setAttribute('role','combobox');
  const list=document.createElement('div');
  list.id=selectId+'-combo-list';
  list.className='combo-list';
  list.style.display='none';
  sel.parentNode.insertBefore(wrap,sel);
  wrap.appendChild(sel);
  wrap.appendChild(input);
  wrap.appendChild(list);

  const buildList=(filter)=>{
    const f=(filter||'').toLowerCase().trim();
    const opts=Array.from(sel.options).filter(o=>o.value);
    const matched=opts.filter(o=>!f || o.text.toLowerCase().includes(f));
    if(!matched.length){ list.innerHTML='<div class="combo-empty">لا نتائج</div>'; return; }
    list.innerHTML=matched.map(o=>{
      const t=esc(o.text);
      const hl=f? t.replace(new RegExp('('+f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>') : t;
      return `<div class="combo-item" data-val="${o.value}">${hl}</div>`;
    }).join('');
  };
  const open=()=>{ buildList(input.value && input.value!==selectedText()?input.value:''); list.style.display='block'; };
  const close=()=>{ setTimeout(()=>{ list.style.display='none'; }, 150); };
  function selectedText(){ const o=sel.options[sel.selectedIndex]; return o&&o.value?o.text:''; }

  input.addEventListener('focus',open);
  input.addEventListener('blur',close);
  input.addEventListener('input',()=>{ buildList(input.value); list.style.display='block'; });
  list.addEventListener('mousedown',(e)=>{
    const item=e.target.closest('.combo-item'); if(!item) return;
    sel.value=item.dataset.val;
    input.value=sel.options[sel.selectedIndex].text;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    list.style.display='none';
  });
  syncComboInput(selectId);
}
function syncComboInput(selectId){
  const sel=document.getElementById(selectId);
  const input=document.getElementById(selectId+'-combo');
  if(sel&&input){ const o=sel.options[sel.selectedIndex]; input.value=(o&&o.value)?o.text:''; }
}
function enhanceAllMemberSelects(){ ['rec-member','pay-member','ms-member'].forEach(enhanceMemberSelect); }
