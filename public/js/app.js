'use strict';
/* ═══ STATE ═══ */
let SB=null,CU=null,CUR=null;
const DB={receipts:[],payments:[],members:[],contacts:[],annual:[],audit:[],subscriptions:[]};
const RATES={ILS:1,USD:3.7,JOD:5.0};
window.FOOD_OPENING=0;
window.DIWAN_OPENING=0;
window.FOOD_OPENING_USD=0;window.FOOD_OPENING_JOD=0;
window.DIWAN_OPENING_USD=0;window.DIWAN_OPENING_JOD=0;
const PSZ=20,PS={};

/* ── ROLE MODEL: admin | viewer ONLY ── */
const ROLES={admin:'مدير',viewer:'عارض',reservation:'مدير الحجوزات'};

const EXPENSE_TYPES={food_expense:'مصاريف إطعام',electricity:'كهرباء',water:'ماء',cleaning:'تنظيف',maintenance:'صيانة',other:'أخرى'};
const METHOD_LABELS={cash:'نقد',check:'شيك',transfer:'تحويل بنكي',online:'أونلاين'};
const CURR_SYMS={ILS:'₪',USD:'$',JOD:'د.أ'};

/* ═══ MEMBER STATUS HELPERS ═══ */

function getMemberStatus(balance){

  if(balance > 0){
    return {
      text: L.late(),
      cls : 'red',
      color : 'var(--danger)'
    };
  }

  if(balance < 0){
    return {
      text: L.credit(),
      cls : 'blue',
      color : 'var(--diwan)'
    };
  }

  return {
    text: L.paid(),
    cls : 'green',
    color : 'var(--pos)'
  };
}

function formatBalance(balance){

  if(balance < 0){
    return `${L.credit()} ₪ ${fmt(Math.abs(balance))}`;
  }

  return `₪ ${fmt(balance)}`;
}


/* ═══ TRANSLATION HELPER FOR RENDER FUNCTIONS ═══ */
const L = {

  fundLabel: f => {
    if (f === 'food')
      return window.LANG === 'en' ? 'Food Fund' : 'صندوق الغداء';

    if (f === 'diwan')
      return window.LANG === 'en' ? 'Diwan Fund' : 'صندوق الديوان';

    return window.LANG === 'en'
      ? 'Donations Fund'
      : 'صندوق التبرعات';
  },

  method: m => {
    const map = {
      cash:     { ar:'نقد',     en:'Cash' },
      check:    { ar:'شيك',     en:'Cheque' },
      transfer: { ar:'تحويل',   en:'Transfer' },
      online:   { ar:'أونلاين', en:'Online' }
    };

    return (map[m] || { ar:m, en:m })[
      window.LANG === 'en' ? 'en' : 'ar'
    ];
  },

  expense: e => {
    const map = {
      food_expense:{ ar:'مصاريف إطعام عزاء', en:'Funeral Food Expenses' },
      electricity:{ ar:'كهرباء', en:'Electricity' },
      water:{ ar:'ماء', en:'Water' },
      cleaning:{ ar:'تنظيف', en:'Cleaning' },
      maintenance:{ ar:'صيانة', en:'Maintenance' },
      other:{ ar:'أخرى', en:'Other' }
    };

    return (map[e] || { ar:e, en:e })[
      window.LANG === 'en' ? 'en' : 'ar'
    ];
  },

  paid: () =>
    window.LANG === 'en'
      ? 'Paid'
      : 'مسدد',

  late: () =>
    window.LANG === 'en'
      ? 'Overdue'
      : 'متأخر',

  credit: () =>
    window.LANG === 'en'
      ? 'Credit Balance'
      : 'رصيد دائن',

  showing: (shown,total) =>
    window.LANG === 'en'
      ? `Showing ${shown} of ${total}`
      : `عرض ${shown} من ${total}`,

  noData: k => window.LANG === 'en'
    ? ({
        receipts:'No receipts found',
        expenses:'No expenses found',
        donations:'No donations found',
        s:'No s found',
        ops:'No transactions found',
        annual:'No dues applied yet',
        audit:'Log is empty'
      }[k] || 'No data')
    : ({
        receipts:'لا توجد إيصالات',
        expenses:'لا توجد مصاريف',
        donations:'لا توجد تبرعات',
        s:'لا يوجد أعضاء',
        ops:'لا توجد حركات',
        annual:'لا توجد اشتراكات مطبقة',
        audit:'السجل فارغ'
      }[k] || 'لا توجد بيانات'),

  month: m => {
    const ar = [
      'يناير','فبراير','مارس','أبريل',
      'مايو','يونيو','يوليو','أغسطس',
      'سبتمبر','أكتوبر','نوفمبر','ديسمبر'
    ];

    const en = [
      'Jan','Feb','Mar','Apr',
      'May','Jun','Jul','Aug',
      'Sep','Oct','Nov','Dec'
    ];

    return window.LANG === 'en'
      ? en[m]
      : ar[m];
  }
};
/* ═══ PERMISSIONS — admin | viewer ONLY ═══ */
const can={
  write:()=>CUR?.role==='admin',
  admin:()=>CUR?.role==='admin',
  print:()=>CUR?.role==='admin',
  export:()=>CUR?.role==='admin'
};

/* ═══ FINANCIAL ENGINE · mcLabel · HISTORICAL BALANCE FORMULA (Phase 15 FINAL LOCK) ═══
   (extracted VERBATIM to /js/fin.js — Phase B Module 10 · FROZEN financial code) */

/* ═══ UTILS ═══ (extracted to /js/utils.js — Phase B Module 1) */

/* ═══ FORM VALIDATION ═══ vf() — extracted to /js/forms.js (Phase B Module 6) */


/* ═══ EXCHANGE RATES ═══ */
/* fetchRates() + updateRateDisplay() — extracted to /js/data.js (Phase B Module 4) */
window.calcILS=function(prefix){
  const cur=document.getElementById(prefix+'-currency')?.value||'ILS';
  const amt=parseFloat(document.getElementById(prefix+'-amount')?.value)||0;
  const ilsRow=document.getElementById(prefix+'-ils-row');
  const ilsVal=document.getElementById(prefix+'-ils-val');
  const rateLabel=document.getElementById(prefix+'-rate-label');
  const symEl=document.getElementById(prefix+'-currency-sym');
  if(symEl) symEl.textContent=CURR_SYMS[cur]||'₪';
  if(cur==='ILS'){
    if(ilsRow) ilsRow.style.display='none';
    return;
  }
  if(ilsRow) ilsRow.style.display='';
  const rate=RATES[cur]||1;
  const ils=amt*rate;
  if(ilsVal) ilsVal.textContent='₪ '+fmtD(ils);
  if(rateLabel) rateLabel.textContent=`(1 ${cur} = ₪${rate.toFixed(2)})`;
};
window.onCurrencyChange=function(prefix){window.calcILS(prefix);};
function getILS(prefix){
  const cur=document.getElementById(prefix+'-currency')?.value||'ILS';
  const amt=parseFloat(document.getElementById(prefix+'-amount')?.value)||0;
  if(cur==='ILS') return amt;
  return amt*(RATES[cur]||1);
}
function getRate(prefix){
  const cur=document.getElementById(prefix+'-currency')?.value||'ILS';
  return RATES[cur]||1;
}

const TICONS={
  ok:'ti-circle-check',
  err:'ti-circle-x',
  warn:'ti-alert-triangle',
  info:'ti-info-circle'
};

function toast(msg,type='ok'){

  const c=document.getElementById('tc');

  if(!c){
    console.warn('Toast container not found');
    return;
  }

  const icon=TICONS[type]||TICONS.info;

  const el=document.createElement('div');

  el.className=`toast ${type}`;

  el.innerHTML=`
    <i class="ti ${icon}"></i>
    <span>${esc(String(msg||''))}</span>
  `;

  c.appendChild(el);

  setTimeout(()=>{
    el.classList.add('out');

    setTimeout(()=>{
      el.remove();
    },280);

  },3500);
}
/* ═══ PAGINATION · NAVIGATION · THEME ═══ (extracted to /js/ui-nav.js — Phase B Module 2) */

/* ═══ AUTH ═══ (login/logout/afterLogin/applyPerms/_sweepRestrictedElements/checkSession
   extracted to /js/auth.js — Phase B Module 5) */

/* ═══ DATA LOADING ═══ */
/* loadAll() — extracted to /js/data.js (Phase B Module 4) */

function renderAll(){
  renderDash();
  /* Cache the live active-member count so the pre-auth login screen can show
     the real figure (updates on every add/delete, which re-run loadAll→renderAll).
     A count only — no member data — and never blocks rendering. */
  try{ localStorage.setItem('diwan_member_count', String(DB.members.filter(m=>m.is_active).length)); }catch(e){}
  const active=document.querySelector('.pg.on')?.id?.replace('pg-','');
  if(active&&D[active]) D[active].render();
  if(active==='bk') renderSysInfo();   /* P0 — the backup panel isn't in D{}; refresh it after every load so it never stays on stale/pre-load zeros */
  if(active==='settings'){loadSettings().then(renderSettingsSummary);}
  fillMemberSelect();fillMemberDropdowns();fillContactDropdown();
  /* Re-sweep after every render so dynamically injected buttons are hidden for viewers */
  _sweepRestrictedElements(can.admin());
}

/* ═══ TABLE RENDERERS ═══ */
const D={
  'food-rec':{render(){
    const q=(document.getElementById('q-food-rec')?.value||'').toLowerCase();
    let d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food');
    if(q)d=d.filter(r=>(r.no+(r.payer_name||gmn(r.member_id))+(r.notes||'')).toLowerCase().includes(q));
    const tot=d.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const sub=document.getElementById('food-rec-sub');
    if(sub)sub.innerHTML=`<span class="stc">${d.length} إيصال</span><span class="stc navy">₪ ${fmt(tot)}</span>`;
    if(!PS['food-rec'])PS['food-rec']=1;
    mkPag('food-rec',d.length);
    const page=d.slice((PS['food-rec']-1)*PSZ,PS['food-rec']*PSZ);
    const body=document.getElementById('food-rec-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(7,'receipts');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td class="c-no"><span class="doc">${esc(r.no)}</span></td>
      <td class="c-date">${fdate(r.receipt_date)}</td>
      <td class="c-name">${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num pos-amt c-amt">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge green">${L.method(r.payment_method)}</span></td>
      <td class="c-notes">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
        ${can.print()?`<button class="btn ghost sm ic-print" onclick="window.prtRec('${r.id}')" title="${window.t('common.print')}"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editRec('${r.id}')" title="${window.t('common.edit')}"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'food-pay':{render(){
    const q=(document.getElementById('q-food-pay')?.value||'').toLowerCase();
    let d=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food');
   if(q)d=d.filter(p=>(p.no+(p.beneficiary_name||gmn(p.member_id))+(p.notes||'')).toLowerCase().includes(q));
    const tot=d.reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    const sub=document.getElementById('food-pay-sub');
    if(sub)sub.innerHTML=`<span class="stc">${d.length} سند</span><span class="stc navy">₪ ${fmt(tot)}</span>`;
    if(!PS['food-pay'])PS['food-pay']=1;
    mkPag('food-pay',d.length);
    const page=d.slice((PS['food-pay']-1)*PSZ,PS['food-pay']*PSZ);
    const body=document.getElementById('food-pay-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(7,'expenses');return;}
    body.innerHTML=page.map(p=>`<tr>
      <td class="c-no"><span class="doc">${esc(p.no)}</span></td>
      <td class="c-date">${fdate(p.payment_date)}</td>
      <td class="c-name">${esc(p.beneficiary_name||gmn(p.member_id))}</td>
      <td class="num neg-amt c-amt">₪ ${fmt(p.amount_ils||p.amount)}</td>
      <td><span class="badge gray">${L.method(p.payment_method)}</span></td>
      <td class="c-notes">${esc(p.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('payment',p.id,p.no,p.fund_type)}
        ${can.print()?`<button class="btn ghost sm ic-print" onclick="window.prtPay('${p.id}')" title="${window.t('common.print')}"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editPay('${p.id}')" title="${window.t('common.edit')}"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'diwan-rec':{render(){
    const q=(document.getElementById('q-diwan-rec')?.value||'').toLowerCase();
    let d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan');
    if(q)d=d.filter(r=>(r.no+(r.payer_name||gmn(r.member_id))+(r.notes||'')).toLowerCase().includes(q));
    const tot=d.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const sub=document.getElementById('diwan-rec-sub');
    if(sub)sub.innerHTML=`<span class="stc">${d.length} إيصال</span><span class="stc navy">₪ ${fmt(tot)}</span>`;
    if(!PS['diwan-rec'])PS['diwan-rec']=1;
    mkPag('diwan-rec',d.length);
    const page=d.slice((PS['diwan-rec']-1)*PSZ,PS['diwan-rec']*PSZ);
    const body=document.getElementById('diwan-rec-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(8,'receipts');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td class="c-no"><span class="doc">${esc(r.no)}</span></td>
      <td class="c-date">${fdate(r.receipt_date)}</td>
      <td class="c-name">${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num pos-amt c-amt">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge ${r.currency==='ILS'?'gray':'diwan'}">${r.currency}</span></td>
      <td><span class="badge green">${L.method(r.payment_method)}</span></td>
      <td class="c-notes">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
        ${can.print()?`<button class="btn ghost sm ic-print" onclick="window.prtRec('${r.id}')"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editRec('${r.id}')"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'diwan-pay':{render(){
    const q=(document.getElementById('q-diwan-pay')?.value||'').toLowerCase();
    const ft=document.getElementById('f-diwan-pay-type')?.value||'';
    let d=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='diwan');
    if(q)d=d.filter(p=>(p.no+(p.beneficiary_name||gmn(p.member_id))+(p.notes||'')).toLowerCase().includes(q));
    if(ft)d=d.filter(p=>p.expense_type===ft);
    const tot=d.reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    const sub=document.getElementById('diwan-pay-sub');
    if(sub)sub.innerHTML=`<span class="stc">${d.length} سند</span><span class="stc navy">₪ ${fmt(tot)}</span>`;
    if(!PS['diwan-pay'])PS['diwan-pay']=1;
    mkPag('diwan-pay',d.length);
    const page=d.slice((PS['diwan-pay']-1)*PSZ,PS['diwan-pay']*PSZ);
    const body=document.getElementById('diwan-pay-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(8,'expenses');return;}
    body.innerHTML=page.map(p=>`<tr>
      <td class="c-no"><span class="doc">${esc(p.no)}</span></td>
      <td class="c-date">${fdate(p.payment_date)}</td>
      <td class="c-name">${esc(p.beneficiary_name||gmn(p.member_id))}</td>
      <td class="num neg-amt c-amt">₪ ${fmt(p.amount_ils||p.amount)}</td>
      <td><span class="badge diwan">${L.expense(p.expense_type)}</span></td>
      <td><span class="badge gray">${L.method(p.payment_method)}</span></td>
      <td class="c-notes">${esc(p.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('payment',p.id,p.no,p.fund_type)}
        ${can.print()?`<button class="btn ghost sm ic-print" onclick="window.prtPay('${p.id}')"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editPay('${p.id}')"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'don':{render(){
    const q=(document.getElementById('q-don')?.value||'').toLowerCase();
    let d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
    if(q)d=d.filter(r=>(r.payer_name||gmn(r.member_id)||'').toLowerCase().includes(q));
    /* Domain 3 — filter by donation category/destination (search ownership). */
    const _ft=document.getElementById('f-don-type')?.value||'';
    if(_ft==='inkind') d=d.filter(r=>r.movement_type==='donation_inkind');
    else if(_ft==='cash') d=d.filter(r=>FIN2.isCashDonation(r.movement_type));
    else if(_ft==='cash-food') d=d.filter(r=>FIN2.isCashDonation(r.movement_type)&&r.destination_treasury==='food');
    else if(_ft==='cash-diwan') d=d.filter(r=>FIN2.isCashDonation(r.movement_type)&&r.destination_treasury==='diwan');
    else if(_ft==='cash-deficit') d=d.filter(r=>FIN2.isCashDonation(r.movement_type)&&r.destination_treasury==='historical_deficit');
    const _cash=d.filter(r=>FIN2.isCashDonation(r.movement_type)).reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const _doc=d.filter(r=>r.movement_type==='donation_inkind').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const sub=document.getElementById('don-sub');
    if(sub)sub.innerHTML=`<span class="stc">${d.length} تبرع</span><span class="stc navy">نقدي ₪ ${fmt(_cash)}</span><span class="stc">توثيقي ₪ ${fmt(_doc)}</span>`;
    if(!PS['don'])PS['don']=1;
    mkPag('don',d.length);
    const page=d.slice((PS['don']-1)*PSZ,PS['don']*PSZ);
    const body=document.getElementById('don-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(8,'donations');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td class="c-no"><span class="doc">${esc(r.no)}</span></td>
      <td class="c-date">${fdate(r.receipt_date)}</td>
      <td class="c-name">${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num c-amt don-amt">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge ${r.currency==='ILS'?'gray':'don'}">${r.currency}</span></td>
      <td>${(function(){
        /* P2-D — the authoritative classification (owner-approved layer). */
        const en=window.LANG==='en';
        const dl={food:en?'Food':'الغداء',diwan:en?'Diwan':'الديوان',historical_deficit:en?'Hist. Deficit':'العجز التاريخي'};
        if(r.movement_type==='historical_debt_collection')
          return `<span class="badge wr">${en?'Debt Collection':'تحصيل ذمة تاريخية'} ← ${dl.historical_deficit}</span>`;
        if(FIN2.isCashDonation(r.movement_type)){
          /* ق5 — a donation whose Item-9 slice settles the donor-member's debt */
          const sp=(FIN.allocateFoodDonations().perReceipt[r.id]||{});
          if(r.donation_display_fund==='food'&&r.member_id&&sp.debtSettled>0)
            return `<span class="badge wr">${en?'Deficit-Settling Donation':'تبرع سداد عجز تاريخي'}</span>`;
          return `<span class="badge ${r.destination_treasury==='food'?'food':r.destination_treasury==='diwan'?'diwan':'wr'}">${en?'Cash':'نقدي'} ← ${dl[r.destination_treasury]||'—'}</span>`;
        }
        if(r.movement_type==='donation_inkind')
          return `<span class="badge gray">${en?'In-kind / Service (record only)':'عيني/خدمي — توثيقي'}</span>`;
        return `<span class="badge gray">${en?'Unclassified':'غير مُصنَّف'}</span>`;
      })()}</td>
      <td class="c-notes">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
        ${can.print()?`<button class="btn ghost sm ic-print" onclick="window.prtRec('${r.id}')"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editRec('${r.id}')"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'members':{render(){
    const q=(document.getElementById('q-members')?.value||'').toLowerCase();
    const st=document.getElementById('f-member-status')?.value||'';
    let d=DB.members.filter(m=>m.is_active);
    if(q)d=d.filter(m=>m.name.toLowerCase().includes(q)||(m.phone||'').includes(q));
    d=d.map(m=>({...m,bal:FIN.memberBalance(m.id)}));
    if(st==='paid')
  d=d.filter(m=>m.bal===0);

else if(st==='due')
  d=d.filter(m=>m.bal>0);

else if(st==='credit')
  d=d.filter(m=>m.bal<0);
    const sub=document.getElementById('members-sub');
    if(sub)sub.innerHTML=`<span class="stc navy">${d.length} ${window.t('members.count')}</span>`;
    if(!PS['members'])PS['members']=1;
    mkPag('members',d.length);
    const page=d.slice((PS['members']-1)*PSZ,PS['members']*PSZ);
    const body=document.getElementById('members-body');
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(6,'members');return;}
    body.innerHTML=page.map((m,i)=>{
      let cls = m.bal > 0 ? 'red' : m.bal < 0 ? 'blue' : 'green';
      const lbl = FIN.balanceLabel(m.bal, false);
      return`<tr>
        <td class="c-idx">${(PS['members']-1)*PSZ+i+1}</td>
        <td class="c-name">${esc(m.name)}</td>
        <td class="c-date">${esc(m.phone||'—')}</td>
        <td class="num c-amt ${m.bal>0?'neg-amt':m.bal<0?'crd-amt':'pos-amt'}">₪ ${fmt(Math.abs(m.bal))}</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
        <td class="tda">
          <button class="btn ghost sm ic-print" onclick="window.nav('member-stmt');setTimeout(()=>{document.getElementById('ms-member').value='${m.id}';window.renderMemberStmt();},80)" title="${window.t('members.member_stmt')}"><i class="ti ti-file-description"></i></button>
          ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editMember('${m.id}')" title="${window.t('common.edit')}"><i class="ti ti-edit"></i></button>`:''}
        </td></tr>`;
    }).join('');
  }},
};
function emptyRow(cols,msgKey){const msg=L.noData(msgKey)||msgKey;return`<tr><td colspan="${cols}"><div class="empty"><i class="ti ti-inbox"></i><div class="empty-t">${msg}</div></div></td></tr>`;}

/* ═══ DASHBOARD ═══ */

/* ═══ TREASURY OVERVIEW PANEL ═══ */
let TP_FUND='diwan';
let TP_CUR_OPEN=false; /* currency panel default collapsed (Section 2) */
window.selectTreasuryFund=function(f){TP_FUND=f;renderTreasuryTabs();renderTreasuryPanel();};
function tpCurrency(fund){
  /* native currency holdings = opening(native, display-only per option A) + receipts - payments.
     Food ILS holding excludes the historical reference (reference-only, never a holding). */
  const out={ILS:0,USD:0,JOD:0};
  if(fund==='diwan'){ out.ILS+=Number(window.DIWAN_OPENING||0); out.USD+=Number(window.DIWAN_OPENING_USD||0); out.JOD+=Number(window.DIWAN_OPENING_JOD||0); }
  else if(fund==='food'){ out.USD+=Number(window.FOOD_OPENING_USD||0); out.JOD+=Number(window.FOOD_OPENING_JOD||0); }
  DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund).forEach(r=>{out[r.currency||'ILS']+=Number(r.amount);});
  DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund).forEach(p=>{out[p.currency||'ILS']-=Number(p.amount);});
  return out;
}
function tpFmtCur(sym,cur){return (cur==='ILS'?'₪ ':cur==='USD'?'$ ':'JD ')+fmt(Math.round(sym*100)/100);}
function renderTreasuryTabs(){
  const el=document.getElementById('treasury-tabs');if(!el)return;
  /* P2-D — the new model: three CASH treasuries + the donation REGISTERS view.
     The old "donation treasury" tab no longer exists (it was never cash). */
  const tabs=[['diwan','خزينة الديوان'],['food','خزينة الغداء'],['deficit','حساب تسوية العجز التاريخي'],['registers','سجلّ التبرعات']];
  /* DX-14: build once per language; on switches only toggle classes so the ink pill
     can travel between tabs (same approved language as the sidebar ink). */
  if(!el.querySelector('.tp-tab')||el.dataset.lang!==String(window.LANG||'ar')){
    el.dataset.lang=String(window.LANG||'ar');
    el.innerHTML=tabs.map(([k,l])=>`<div class="tp-tab ${TP_FUND===k?'on':''}" data-k="${k}" onclick="window.selectTreasuryFund('${k}')">${l}</div>`).join('')
      +'<div class="tp-ink" aria-hidden="true"></div>';
    el.classList.add('has-ink');
  } else {
    el.querySelectorAll('.tp-tab').forEach(t=>t.classList.toggle('on',t.getAttribute('data-k')===TP_FUND));
  }
  placeTpInk();
}
function placeTpInk(){
  const el=document.getElementById('treasury-tabs');if(!el)return;
  const ink=el.querySelector('.tp-ink'), on=el.querySelector('.tp-tab.on');
  /* if the dashboard is hidden the tab can't be measured — fall back to the
     solid active style until the page is shown again (nav re-places the ink). */
  if(!ink||!on||!on.offsetWidth){ if(ink)ink.style.opacity='0'; el.classList.remove('has-ink'); return; }
  el.classList.add('has-ink');
  ink.style.opacity='1';
  ink.style.width=on.offsetWidth+'px';
  ink.style.height=on.offsetHeight+'px';
  ink.style.transform='translate('+on.offsetLeft+'px,'+on.offsetTop+'px)';
}
window.placeTpInk=placeTpInk;
window.addEventListener('resize',()=>{ if(window.__tpInkT)clearTimeout(window.__tpInkT);
  window.__tpInkT=setTimeout(placeTpInk,80); });
window.toggleTreasuryCurrency=function(){
  TP_CUR_OPEN=!TP_CUR_OPEN;
  const cs=document.querySelector('#treasury-panel .tp-cs');
  if(cs){cs.classList.toggle('open',TP_CUR_OPEN);const a=cs.querySelector('.tp-cs-ar');if(a)a.textContent=TP_CUR_OPEN?'▲':'▼';}
};
function tpCurrencyRows(fund,nat){
  const rows=[['ILS','₪','شيكل',1],['USD','$','دولار',RATES.USD],['JOD','JD','دينار',RATES.JOD]];
  let sumToday=0;
  const body=rows.map(([cur,sy,nm,rate])=>{
    const bal=nat[cur]||0; const eqv=cur==='ILS'?bal:bal*rate; sumToday+=eqv;
    const mut=Math.abs(bal)<0.005?'mut':''; const z=Math.abs(eqv)<0.005?'z':'';
    const eqTxt=cur==='ILS'?'':'≈ ₪ '+fmt(Math.round(eqv*100)/100);
    return `<div class="tp-cr"><div class="lf"><span class="sy">${sy}</span><span class="nm">${nm}<small>${cur}</small></span></div>`
      +`<div class="bl ${mut}">${tpFmtCur(bal,cur)}</div><div class="eq ${z}">${eqTxt}</div></div>`;
  }).join('');
  return body+`<div class="tp-cr-sum"><span>≈ المجموع بأسعار اليوم (تقديري)</span><span>₪ ${fmt(Math.round(sumToday*100)/100)}</span></div>`;
}
function renderTreasuryPanel(){
  const el=document.getElementById('treasury-panel');if(!el)return;
  const fund=TP_FUND;
  const fundName=fund==='food'?'خزينة الغداء':fund==='diwan'?'خزينة الديوان':fund==='deficit'?'حساب تسوية العجز التاريخي':'سجلّ التبرعات';
  const nat=tpCurrency(fund==='deficit'||fund==='registers'?'diwan':fund);
  const upd='محدث وفق أسعار الصرف اليومية';
  const ratesLine=`USD ${RATES.USD.toFixed(3)} · JOD ${RATES.JOD.toFixed(3)} · ${today()}`;
  let middle='', total=0, neg=false, cap='الرصيد الإجمالي الكلي', rule='';

  if(fund==='diwan'){
    const opening=Number(window.DIWAN_OPENING||0);
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='diwan').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    /* P1 — the authoritative total comes from FIN (single source); income/expense
       remain only to render the flow breakdown below. Value-identical to opening+income-expense. */
    total=FinContract.diwanBalance(); neg=total<0;
    rule='القاعدة: الكلي = الرصيد الأولي السابق + إجمالي المقبوضات − إجمالي المصروفات';
    middle=`<div class="tp-flow">
      <div class="nd prev"><div class="t">الرصيد الأولي السابق</div><div class="v">₪ ${fmt(opening)}</div><div class="s">يشارك في الحساب</div></div>
      <div class="ar"><div class="op up">+ إجمالي المقبوضات ₪ ${fmt(income)}</div><div class="ln"></div><div class="op dn">− إجمالي المصروفات ₪ ${fmt(expense)}</div></div>
      <div class="nd cur"><div class="t">رصيد الصندوق الحالي = الكلي</div><div class="v${neg?' neg':''}">₪ ${fmt(total)}</div><div class="s">محسوب تلقائياً</div></div>
    </div>`;
  } else if(fund==='food'){
    const remDeficit=FinContract.foodDeficitRemaining();
    const reserve=FIN.foodSettlementReserve();
    const a=FIN.allocateFoodDonations();
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    const operational=FIN._r2(income-expense);
    total=FinContract.foodBalance(); neg=total<0;
    cap='رصيد صندوق الغداء الحالي';
    /* ق5 — تسوية الذمم من التبرعات نقدٌ مخصص للعجز (حيازته هنا): تُعرض ضمن جانب العجز لا ضمن الرصيد الحالي */
    rule='القاعدة: الرصيد الحالي = تشغيلي + الدعم الحالي · تسوية الذمم من التبرعات تُخصَّص للعجز التاريخي (ق5) · العجز يُعرض منفصلاً ولا يُجمع';
    middle=`<div class="tp-food">
      <div class="tp-prev"><div class="t">العجز التاريخي المتبقي · Remaining Historical Deficit</div><div class="v${remDeficit<0?' neg':''}">₪ ${fmt(remDeficit)}</div><div class="ro">${mcLabel('reserve')}: ₪${fmt(reserve)} · ${mcLabel('debt')} من التبرعات (ق5): ₪${fmt(a.debtSettlementTotal)} · يُعرض منفصلاً ولا يدخل في الرصيد الحالي</div></div>
      <div class="tp-op"><div class="t">رصيد الصندوق الحالي</div>
        <div class="of"><div class="sg"><div class="l">${mcLabel('operational')}</div><div class="n">₪ ${fmt(operational)}</div></div><span class="x">+</span>
        <div class="sg"><div class="l">${mcLabel('current')}</div><div class="n up">₪ ${fmt(a.currentSupportTotal)}</div></div></div>
        <div class="rs"><div class="l">رصيد الصندوق الحالي = الإجمالي</div><div class="n">₪ ${fmt(total)}</div></div></div>
    </div>`;
  } else if(fund==='deficit'){
    /* P2-D — the Historical Deficit is a REAL cash treasury (new model).
       Composition reads TREASURY_OPENINGS (the single formal mapping); the value
       is identical to the legacy FinContract.foodDeficitRemaining() figure. */
    const op=Number((window.TREASURY_OPENINGS||{}).historical_deficit||0);
    const comp=FIN2.composed();
    const inflow=FIN2.deficitInflows();            /* gross: collections + directed donations */
    const settled=FIN2.deficitSettlementTotal();
    total=comp.historical_deficit_remaining; neg=total<0;
    cap='المتبقّي من العجز التاريخي';
    rule='القاعدة: العجز الأصلي + تحصيل الذمم والتبرعات الموجَّهة وتسويات الذمم من التبرعات (ق5) − تسويات العجز · عند بلوغ الصفر يتحوّل الفائض لخزينة الغداء';
    middle=`<div class="tp-flow">
      <div class="nd prev"><div class="t">العجز الأصلي (الافتتاحي)</div><div class="v neg">₪ ${fmt(op)}</div><div class="s">قبل 2025</div></div>
      <div class="ar"><div class="op up">+ تحصيل وتبرعات موجَّهة وتسويات ذمم ₪ ${fmt(inflow)}</div><div class="ln"></div><div class="op dn">− تسويات العجز ₪ ${fmt(settled)}${comp.overflow_to_food>0?` · فائض محوَّل للغداء ₪ ${fmt(comp.overflow_to_food)}`:''}</div></div>
      <div class="nd cur"><div class="t">المتبقّي من العجز</div><div class="v${neg?' neg':''}">₪ ${fmt(total)}</div><div class="s">محسوب تلقائياً</div></div>
    </div>`;
  } else {
    /* P2-D — the donation REGISTERS: references only, never cash, no balance. */
    const cash=FIN2.cashDonationRegister();
    const cashSum=FIN._r2(cash.reduce((s,x)=>s+Number(x.amount||0),0));
    const ink=FIN2.inkindRegister();
    const inkSum=FIN._r2(ink.reduce((s,x)=>s+Number(x.estimated_value||0),0));
    total=0; neg=false; cap='سجلّات مرجعية — لا تمثّل نقداً';
    rule='القاعدة: التبرع النقدي حركة في خزينته + قيد مرجعي هنا · العيني/الخدمي قيمة توثيقية بلا أثر نقدي';
    const dl={food:'الغداء',diwan:'الديوان',historical_deficit:'العجز التاريخي'};
    const byDest={}; cash.forEach(x=>{byDest[x.destination_treasury]=FIN._r2((byDest[x.destination_treasury]||0)+Number(x.amount||0));});
    middle=`<div class="tp-flow" style="flex-wrap:wrap">
      <div class="nd cur" style="flex:1;min-width:180px"><div class="t">سجلّ التبرعات النقدية</div><div class="v">₪ ${fmt(cashSum)}</div>
        <div class="s">${cash.length} قيدًا · ${Object.keys(byDest).map(k=>dl[k]+' ₪'+fmt(byDest[k])).join(' · ')||'—'}</div></div>
      <div class="nd prev" style="flex:1;min-width:180px"><div class="t">السجلّ العيني والخدمي (توثيقي)</div><div class="v">₪ ${fmt(inkSum)}</div>
        <div class="s">${ink.length} قيود · لا يدخل أي خزينة</div></div>
    </div>`;
  }

  el.innerHTML=`<div class="tp">
    <div class="tp-hero"><div class="tp-top"><div class="tp-ttl">لوحة الخزينة · Treasury</div><div class="tp-tag">${fundName}</div></div>
      <div class="tp-cap">${cap}</div><div class="tp-total${neg?' neg':''}">₪ ${fmt(total)}</div>
      <div class="tp-rule">${rule}</div><div class="tp-upd">${upd}</div></div>
    ${middle}
    ${(fund==='deficit'||fund==='registers')?'':`<div class="tp-cs${TP_CUR_OPEN?' open':''}">
      <div class="tp-cs-h" onclick="window.toggleTreasuryCurrency()"><div class="ht">أرصدة العملات</div><div class="tp-cs-ar">${TP_CUR_OPEN?'▲':'▼'}</div></div>
      <div class="tp-cs-body"><div class="tp-cs-rates">${ratesLine}</div>${tpCurrencyRows(fund,nat)}</div>
    </div>`}
    <div class="tp-ft"><span>ديوان آل طه — diwan-finance.com</span><span>الأسعار من إعدادات النظام (يدوية)</span></div>
  </div>`;
  animateTpTotal(total);
}
/* DX-14: إجمالي الخزينة يعدّ من قيمته المعروضة السابقة عند التنقّل بين
   التبويبات أو تحديث البيانات — أول ظهورٍ يستقرّ فورًا بلا عدّ. */
function animateTpTotal(target){
  const el=document.querySelector('#treasury-panel .tp-total'); if(!el) return;
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const had=Object.prototype.hasOwnProperty.call(window,'__tpPrevTotal');
  const from=had?window.__tpPrevTotal:target;
  window.__tpPrevTotal=target;
  if(reduce||!window.requestAnimationFrame||Math.abs(from-target)<0.005) return; /* النص النهائي مرسوم أصلًا */
  const dur=420, t0=performance.now(), delta=target-from;
  const step=t=>{ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent='₪ '+fmt(Math.round((from+delta*e)*100)/100);
    if(p<1) requestAnimationFrame(step); else el.textContent='₪ '+fmt(target); };
  requestAnimationFrame(step);
}
/* Count-up for the fund cards — animates each value from 0 to target so the
   figures feel alive on render. Honours reduced-motion (settles immediately). */
/* ═══ Theme-01 dashboard master-detail: «الذمم المستحقّة» ═══
   Read-only over the existing engines (FIN.memberStatement / memberDelinquency):
   top outstanding member balances as a master list + an in-place inspector with
   real figures and two actions (statement / collect). No engine change. */
function renderDashDebts(){
  const el=document.getElementById('dash-md'); if(!el) return;
  const en=window.LANG==='en';
  let rows=[];
  try{
    rows=DB.members.filter(m=>m.is_active!==false).map(m=>{
      const st=FIN.memberStatement(m.id);
      const d=(typeof FIN.memberDelinquency==='function')?FIN.memberDelinquency(m.id):{unpaidCount:0};
      return {id:m.id,name:m.name||'—',
        due:Math.round((st.finalBalance||0)*100)/100,
        base:Math.round(((st.openingBalance||0)+(st.totalDues||0))*100)/100,
        paid:Math.round(((st.totalPaid||0)+(st.debtSettled||0))*100)/100,
        yrs:(d&&d.unpaidCount)||0};
    }).filter(r=>r.due>0).sort((a,b)=>b.due-a.due).slice(0,6);
  }catch(e){ rows=[]; }
  if(!rows.some(r=>r.id===window.__dmdSel)) window.__dmdSel=rows[0]&&rows[0].id;
  const sel=rows.find(r=>r.id===window.__dmdSel);
  el.innerHTML=`<div class="dmd">
    <div class="dmd-list">
      <div class="dmd-h"><span>${en?'Top balances':'أعلى الذمم'}</span><button class="btn ghost sm" onclick="window.nav('annual-debt')">${en?'Full report':'التقرير الكامل'}</button></div>
      ${rows.length?rows.map(r=>`<div class="dmd-row${r.id===window.__dmdSel?' sel':''}" role="button" tabindex="0" onclick="window.dashSelDebt('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.dashSelDebt('${r.id}')}">
        <span class="av">${esc(String(r.name).trim().charAt(0)||'؟')}</span>
        <span class="nm"><b>${esc(r.name)}</b><small>${r.yrs>0?(en?r.yrs+' unpaid years':r.yrs+' سنوات غير مسدّدة'):(en?'running balance':'ذمّة جارية')}</small></span>
        <b class="amt mono">₪ ${fmt(r.due)}</b></div>`).join('')
      :`<div class="empty" style="padding:18px"><div class="empty-t">${en?'No outstanding balances':'لا ذمم مستحقّة'}</div></div>`}
    </div>
    ${sel?`<div class="dmd-insp">
      <div class="ih"><b>${esc(sel.name)}</b><span class="tag">${en?'Owing':'مدين'}</span></div>
      <div class="cells">
        <div class="cell"><div class="l">${en?'Total accrued':'إجماليّ الاستحقاق'}</div><div class="v mono">₪ ${fmt(sel.base)}</div></div>
        <div class="cell"><div class="l">${en?'Paid':'سُدّد منه'}</div><div class="v mono">₪ ${fmt(sel.paid)}</div></div>
        <div class="cell"><div class="l">${en?'Remaining':'المتبقّي'}</div><div class="v mono">₪ ${fmt(sel.due)}</div></div>
      </div>
      <div class="sum"><span>${en?'Balance due':'الرصيد المستحقّ'} · <b class="mono">₪ ${fmt(sel.due)}</b></span>
        <span class="acts"><button class="btn sm" onclick="window.dashDebtStmt('${sel.id}')">${en?'Statement':'كشف الحساب'}</button>${can.write()?`<button class="btn sm primary" onclick="window.dashDebtCollect('${sel.id}')">${en?'Collect now':'تحصيل الآن'}</button>`:''}</span></div>
    </div>`:''}
  </div>`;
}
window.dashSelDebt=function(id){ window.__dmdSel=id; renderDashDebts(); };
window.dashDebtStmt=function(id){
  window.nav('member-stmt');
  const s=document.getElementById('ms-member');
  if(s){ s.value=id; if(typeof window.renderMemberStmt==='function') window.renderMemberStmt(); }
};
window.dashDebtCollect=function(id){
  window.openRec('food');
  setTimeout(()=>{ const s=document.getElementById('rec-member');
    if(s){ s.value=id; s.dispatchEvent(new Event('change')); } },150);
};
function countUpKpis(){
  /* DX-14 «نبضة التحديث الحيّ»: أول ظهورٍ يعدّ من الصفر؛ وبعدها يعدّ كل مربّعٍ
     من قيمته السابقة إلى الجديدة مع غسلة ليمونية — ولا حركة إن لم تتغيّر القيمة. */
  const els=document.querySelectorAll('#dash-kpis .v[data-val]');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const prevMap=window.__kpiPrev=window.__kpiPrev||{};
  els.forEach(el=>{
    const target=Number(el.getAttribute('data-val'))||0;
    const key=el.getAttribute('data-k')||'';
    const known=key&&Object.prototype.hasOwnProperty.call(prevMap,key);
    const from=known?prevMap[key]:0;
    const changed=known&&Math.abs(from-target)>0.005;
    if(key) prevMap[key]=target;
    const show=v=>{el.textContent='₪ '+(v<0?'−':'')+fmt(Math.abs(Math.round(v*100)/100));};
    const settle=()=>show(target);
    if(known&&!changed){ settle(); return; }          /* لا تغيير → سكون */
    if(changed){
      const card=el.closest('.kp');
      if(card&&!reduce){ card.classList.remove('live'); void card.offsetWidth;
        card.classList.add('live'); setTimeout(()=>card.classList.remove('live'),950); }
    }
    if(reduce||!window.requestAnimationFrame){ settle(); return; }
    const dur=650, t0=performance.now(), delta=target-from;
    const step=t=>{ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      show(from+delta*e);
      if(p<1) requestAnimationFrame(step); else settle(); };
    requestAnimationFrame(step);
  });
}
function renderDash(){
  const fb=FinContract.foodBalance(),rd=FinContract.foodDeficitRemaining(),np=FinContract.foodNetPosition(),db=FinContract.diwanBalance();
  const dd=document.getElementById('dash-date');
  if(dd)dd.textContent=new Date().toLocaleDateString('en-CA');

  const _isEn=window.LANG==='en';
  /* ── Approved hybrid: hero band (greeting · status · today stats · action) ──
     Presentation only: today figures are display sums over already-loaded DB rows. */
  const _t0=today();
  const _recToday=DB.receipts.filter(r=>!r.is_deleted&&r.receipt_date===_t0);
  const _payToday=DB.payments.filter(p=>!p.is_deleted&&p.payment_date===_t0);
  const _netToday=_recToday.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0)-_payToday.reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
  const _hr=new Date().getHours();
  const _greet=_isEn?(_hr<12?'Good morning':'Good evening'):(_hr<12?'صباح الخير':'مساء الخير');
  const _uname=(CUR?.full_name||CU?.email||'').split(' ')[0]||'';
  const _hero=document.getElementById('dash-hero');
  /* Freshness stamp — data was just loaded; surface "as of HH:MM" (perceived-performance signal). */
  const _asOf=new Date().toLocaleTimeString(_isEn?'en-GB':'en-GB',{hour:'2-digit',minute:'2-digit'});
  const _canW=can.write();
  /* Compact hero: primary سند قبض stays one tap; the rest fold into إجراء جديد ▾ (all names preserved). */
  const _heroActs=_canW?`
      <button class="pri" onclick="window.openRec()"><i class="ti ti-plus"></i>${_isEn?'Receipt Voucher':'سند قبض'}</button>
      <div class="export-dropdown hmenu">
        <button class="menu" onclick="togglePageExport(event,'dash-new-menu')">${_isEn?'New action':'إجراء جديد'} <i class="ti ti-chevron-down"></i></button>
        <div class="export-dropdown-menu" id="dash-new-menu">
          <button class="export-dropdown-item" onclick="window.openPay()"><i class="ti ti-minus"></i>${_isEn?'Payment Voucher':'سند صرف'}</button>
          <button class="export-dropdown-item" onclick="window.openRec('diwan')"><i class="ti ti-receipt"></i>${_isEn?'Diwan Receipt':'إيصال ديوان'}</button>
          <button class="export-dropdown-item" onclick="window.openRec('food')"><i class="ti ti-receipt"></i>${_isEn?'Food Receipt':'إيصال غداء'}</button>
          <button class="export-dropdown-item" onclick="window.openM('member')"><i class="ti ti-user-plus"></i>${_isEn?'New Member':'عضو جديد'}</button>
          <button class="export-dropdown-item" onclick="window.openStmtSelector()"><i class="ti ti-file-description"></i>${_isEn?'Account Statement':'كشف حساب'}</button>
        </div>
      </div>`
    :`<button class="pri" onclick="window.openStmtSelector()"><i class="ti ti-file-description"></i>${_isEn?'Account Statement':'كشف حساب'}</button>`;
  if(_hero)_hero.innerHTML=`
    <span class="lg">دط</span><b>${_greet}${_uname?'، '+esc(_uname):''}</b>
    <span class="st"><i></i>${_isEn?'Data up to date':'البيانات محدّثة'} · <span class="mono">${new Date().toLocaleDateString('en-CA')}</span></span>
    <div class="hstat">
      <div><div class="k">${_isEn?'Net today':'صافي اليوم'}</div><div class="v ${_netToday>=0?'up':''} mono">${_netToday>=0?'+':'−'} ₪ ${fmt(Math.abs(_netToday))}</div></div>
      <div><div class="k">${_isEn?"Today's vouchers":'سندات اليوم'}</div><div class="v mono">${_recToday.length+_payToday.length}</div></div>
      <div><div class="k">${_isEn?'Active members':'أعضاء نشطون'}</div><div class="v mono">${DB.members.filter(m=>m.is_active).length}</div></div>
    </div>
    <span class="sp"></span>
    <span class="stale mono">${_isEn?'as of':'محدّث حتى'} ${_asOf}</span>
    ${_heroActs}`;
  /* ── Fund cards — the four treasury figures (fb/rd/np/db). Clean balance tiles
     brought to life: staggered entrance (CSS) + count-up value (JS). The old
     %-bars / collection ring / trend chart were removed by request. ── */
  /* Theme-01 approved band: three floating light panels + the deep-navy diwan
     panel carrying the live day-figures. Same four canonical treasury numbers
     (fb/rd/np/db) — presentation only, engines untouched. */
  const _kpis=document.getElementById('dash-kpis');
  if(_kpis){
    const lightKp=(t,v,i,k)=>`<div class="kp" style="animation-delay:${i*70}ms"><div class="l">${t}</div>
      <div class="v mono ${v<0?'neg-t':''}" data-val="${v}" data-k="${k}">₪ ${v<0?'−':''}${fmt(Math.abs(v))}</div></div>`;
    const avail=Math.round((db+fb)*100)/100;
    _kpis.innerHTML=
      lightKp(_isEn?'Food Treasury':'خزينة الغداء',fb,0,'fb')
      +lightKp(_isEn?'Historical Deficit Settlement':'حساب تسوية العجز التاريخي',rd,1,'rd')
      +lightKp(_isEn?'Net Food Position':'صافي مركز الغداء',np,2,'np')
      +`<div class="kp kpd" style="animation-delay:210ms"><div><div class="l">${_isEn?'Diwan Treasury':'خزينة الديوان'}</div>
        <div class="v mono ${db<0?'neg-t':''}" data-val="${db}" data-k="db">₪ ${db<0?'−':''}${fmt(Math.abs(db))}</div></div>
        <div class="mini">
          <div class="mc">${_isEn?'Available':'المتاح · الخزينتان'}<b class="mono">₪ ${fmt(Math.abs(avail))}</b></div>
          <div class="mc hot">${_isEn?'Net today':'صافي اليوم'}<b class="mono">${_netToday>=0?'+':'−'}₪ ${fmt(Math.abs(_netToday))}</b></div>
          <div class="mc">${_isEn?"Today's vouchers":'سندات اليوم'}<b class="mono">${_recToday.length+_payToday.length}</b></div>
        </div></div>`;
    countUpKpis();
  }
  renderDashDebts();
  /* sidebar member counter (approved design) — target the real group item,
     never a favorites clone (which is rebuilt and would drop the badge). */
  const _nbM=document.querySelector('.nbg-body:not(#sb-favs-body) .nb[data-p="members"]')||document.querySelector('.nb[data-p="members"]');
  if(_nbM){let k=_nbM.querySelector('.k');if(!k){k=document.createElement('span');k.className='k';_nbM.appendChild(k);}k.textContent=DB.members.filter(m=>m.is_active).length;}
  renderTreasuryTabs();renderTreasuryPanel();



  const allOps=[
    ...DB.receipts.filter(r=>!r.is_deleted).slice(0,5).map(r=>({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),amt:r.amount_ils||r.amount,type:'rec',fund:r.fund_type,no:r.no})),
    ...DB.payments.filter(p=>!p.is_deleted).slice(0,5).map(p=>({date:p.payment_date,name:p.beneficiary_name||gmn(p.member_id),amt:p.amount_ils||p.amount,type:'pay',fund:p.fund_type,no:p.no})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  document.getElementById('recent-ops').innerHTML=allOps.length?allOps.map(op=>`
    <div class="mv">
      <span class="ic2 ${op.type==='rec'?'g':'r'}"><i class="ti ${op.type==='rec'?'ti-arrow-up':'ti-arrow-down'}"></i></span>
      <div><b>${esc(op.name)}</b> — ${op.fund==='food'?'غداء':op.fund==='diwan'?'ديوان':'تبرع'}
        <div class="dt mono">${op.no?esc(op.no)+' · ':''}${fdate(op.date)}</div></div>
      <span class="amt ${op.type==='rec'?'pos-t':'neg-t'} mono">${op.type==='rec'?'+':'−'}${fmt(op.amt)}</span>
    </div>`).join('')
    :`<div class="empty" style="padding:14px"><div class="empty-t">${L.noData('ops')}</div></div>`;
  /* ── Right column: today's work · alerts · collection ring ──
     All read-only over already-loaded data / existing report engines. */
  try{
    const _dl=(typeof delinquentRows==='function')?delinquentRows():{rows:[]};
    const _late3=_dl.rows.filter(r=>r.d&&r.d.unpaidCount>=3).length;
    const _lateAll=_dl.rows.filter(r=>r.d&&r.d.isDelinquent).length;
    const tasks=[];
    if(_recToday.length+_payToday.length>0) tasks.push({t:`مراجعة سندات اليوم (${_recToday.length+_payToday.length})`,go:()=>"window.nav('diwan-rec')"});
    if(_lateAll>0) tasks.push({t:`متابعة ${_lateAll} أعضاء متأخرين`,go:()=>"window.nav('delinquent')"});
    tasks.push({t:'كشوف الأعضاء المدينين',go:()=>"window.nav('annual-debt')"});
    tasks.push({t:'طباعة كشف صندوق',go:()=>"window.nav('food-stmt')"});
    const _tk=document.getElementById('dash-tasks');
    if(_tk){_tk.innerHTML=tasks.map(x=>`<div class="tsk"><span class="tt">${x.t}</span><button class="go" onclick="${x.go()}">فتح ›</button></div>`).join('');
      const n=document.getElementById('dash-tasks-n'); if(n)n.textContent=tasks.length;}
    const _al=document.getElementById('dash-alerts');
    if(_al){
      const alerts=[];
      if(_late3>0) alerts.push(`<div class="alr"><div><b>${_late3} أعضاء</b> تجاوز تأخّرهم ٣ سنوات</div></div>`);
      if(typeof window.LOCKED_THROUGH_YEAR==='number') alerts.push(`<div class="alr n"><div>السنة المالية مقفلة حتى <b class="mono">${window.LOCKED_THROUGH_YEAR}</b></div></div>`);
      if(!alerts.length) alerts.push('<div class="alr n"><div>لا تنبيهات حالية</div></div>');
      _al.innerHTML=alerts.join('');
      const n=document.getElementById('dash-alerts-n'); if(n)n.textContent=String(_late3>0?(1+(typeof window.LOCKED_THROUGH_YEAR==='number'?1:0)):alerts.length);
    }
  }catch(e){console.warn('dash side column',e);}
  /* Quick actions now live in the compact hero (primary سند قبض + إجراء جديد ▾ menu). */
}

/* Account Statement selector (visual nav only — opens existing statement pages) */
window.openStmtSelector=function(){
  let ov=document.getElementById('stmt-sel-ov');
  if(!ov){
    ov=document.createElement('div'); ov.id='stmt-sel-ov'; ov.className='ov';
    const en=window.LANG==='en';
    const opt=(p,ar,eng,ic)=>`<button class="ssel-item" onclick="window.closeStmtSelector();window.nav('${p}')"><i class="ti ${ic}"></i><span>${en?eng:ar}</span></button>`;
    ov.innerHTML=`<div class="modal ssel" style="max-width:460px">
      <div class="mhd"><span class="mtt"><span class="mico diwan"><i class="ti ti-file-description"></i></span>${en?'Account Statement':'اختر نوع الكشف'}</span><button class="btn ghost" onclick="window.closeStmtSelector()" aria-label="إغلاق"><i class="ti ti-x"></i></button></div>
      <div class="ssel-grid">
        ${opt('member-stmt','كشف حساب عضو','Member Statement','ti-user')}
        ${opt('diwan-stmt','كشف صندوق الديوان','Diwan Fund Statement','ti-building-bank')}
        ${opt('food-stmt','كشف صندوق الغداء','Food Fund Statement','ti-tools-kitchen-2')}
        ${opt('don','كشف التبرعات','Donations Statement','ti-heart')}
        ${opt('diwan-rec','كشف المقبوضات','Receipts Statement','ti-circle-arrow-down')}
        ${opt('diwan-pay','كشف المصروفات','Payments Statement','ti-circle-arrow-up')}
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) window.closeStmtSelector(); });
  } else { ov.querySelectorAll('.ssel-item span').forEach(()=>{}); }
  ov.style.display='flex';
};
window.closeStmtSelector=function(){ const ov=document.getElementById('stmt-sel-ov'); if(ov) ov.style.display='none'; };

/* ═══ STATEMENTS ═══ */
window.renderStmt=function(fund){
  const from=document.getElementById(fund+'-stmt-from')?.value||'';
  const to=document.getElementById(fund+'-stmt-to')?.value||'';
  const type=document.getElementById(fund+'-stmt-type')?.value||'';
  const out=document.getElementById(fund+'-stmt-out');
  const rows=FIN.fundLedger(fund,from,to,type);   /* FIN logic unchanged */
  const _en=window.LANG==='en';
  const isFood=fund==='food';
  const fundLabel=isFood?(_en?'Food Fund':'صندوق الغداء'):(_en?'Diwan Fund':'صندوق الديوان');
  const periodTxt=from&&to?`${fdate(from)} — ${fdate(to)}`:from?`${window.t('stmt.date_from')} ${fdate(from)}`:to?`${window.t('stmt.date_to')} ${fdate(to)}`:window.t('stmt.all_periods');
  const printDate=new Date().toLocaleDateString('en-GB');
  const actions=can.print()?('<div class="as-actions"><button class="as-btn as-btn-pri" onclick="window.prtStmt(\''+fund+'\')"><i class="ti ti-printer"></i>'+window.t('common.print')+'</button></div>'):'';
  const head='<div class="as-top"><div class="as-title"><span class="as-brand"></span><div>'
    +'<div class="as-h">'+(_en?'Fund Statement':'كشف حساب الصندوق')+' · '+fundLabel+'</div>'
    +'<div class="as-sub">'+(_en?'Finance ‹ Funds ‹ Statement':'المالية ‹ الصناديق ‹ كشف الصندوق')+'</div>'
    +'</div></div>'+actions+'</div>'
    +'<div class="as-meta">'
      +'<div class="as-m"><div class="as-k">'+(_en?'Fund':'الصندوق')+'</div><div class="as-v">'+fundLabel+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+(_en?'Period':'الفترة')+'</div><div class="as-v">'+periodTxt+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+(_en?'Transactions':'عدد الحركات')+'</div><div class="as-v">'+rows.length+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+(_en?'Print date':'تاريخ الطباعة')+'</div><div class="as-v">'+printDate+'</div></div>'
    +'</div>';
  if(!rows.length){
    out.innerHTML='<div class="acct-stmt">'+head+'<div class="as-empty">'+L.noData('ops')+'</div></div>';
    return;
  }
  let bal=0,totalCr=0,totalDr=0;
  const body=rows.map(r=>{
    bal+=r.cr-r.dr;totalCr+=r.cr;totalDr+=r.dr;
    return '<tr>'
      +'<td class="as-c">'+fdate(r.date)+'</td>'
      +'<td class="as-desc">'+esc(r.name||'—')+'</td>'
      +'<td class="as-desc">'+esc(r.desc)+'</td>'
      +'<td class="as-num as-cr">'+(r.cr>0?'₪ '+fmt(r.cr):(r.type==='don'?'<span style="color:var(--don);font-size:11px">'+(_en?'Donation':'تبرع')+'</span>':'—'))+'</td>'
      +'<td class="as-num as-dr">'+(r.dr>0?'₪ '+fmt(r.dr):'—')+'</td>'
      +'<td class="as-num as-bal">₪ '+fmt(bal)+'</td>'
      +'<td class="as-note">'+esc(r.note||'')+'</td>'
      +'</tr>';
  }).join('');
  const curBal=isFood?FinContract.foodBalance():bal;
  const curLbl=isFood?(_en?'Current Food Fund Balance':'رصيد صندوق الغداء الحالي'):window.t('stmt.current_bal');
  let figs='<div class="as-figs">'
    +'<div class="as-fig green"><div class="k">'+window.t('stmt.total_income')+'</div><div class="v">₪ '+fmt(totalCr)+'</div></div>'
    +'<div class="as-fig red"><div class="k">'+window.t('stmt.total_expenses')+'</div><div class="v">₪ '+fmt(totalDr)+'</div></div>'
    +'<div class="as-fig '+(curBal>=0?'teal':'red')+'"><div class="k">'+curLbl+'</div><div class="v">₪ '+fmt(curBal)+'</div>'
      +(isFood?'<div class="s">'+(_en?'Operational':'تشغيلي')+' ₪'+fmt(bal)+' + '+(_en?'Support':'دعم')+' ₪'+fmt(FIN.foodCurrentSupportTotal())+' · '+(_en?'Debt Settle → Deficit (Q5)':'تسوية الذمم ← العجز (ق5)')+' ₪'+fmt(FIN.foodDebtSettlementTotal())+'</div>':'')
    +'</div>';
  if(isFood){
    figs+='<div class="as-fig'+(FinContract.foodDeficitRemaining()<0?' red':'')+'"><div class="k">'+(_en?'Remaining Historical Deficit':'العجز التاريخي المتبقي')+'</div><div class="v">₪ '+fmt(FinContract.foodDeficitRemaining())+'</div></div>'
      +'<div class="as-fig"><div class="k">'+mcLabel('reserve')+' + '+mcLabel('debt')+'</div><div class="v">₪ '+fmt(FIN._r2(FIN.foodSettlementReserve()+FIN.foodDebtSettlementTotal()))+'</div></div>'
      +'<div class="as-fig '+(FinContract.foodNetPosition()>=0?'green':'red')+'"><div class="k">'+(_en?'Net Food Fund Position':'صافي مركز صندوق الغداء')+'</div><div class="v">₪ '+fmt(FinContract.foodNetPosition())+'</div></div>';
  }
  figs+='</div>';
  const tbl='<div class="as-tablewrap"><table class="as-table"><thead><tr>'
    +'<th class="as-c">'+window.t('common.date')+'</th>'
    +'<th>'+window.t('stmt.donor_name')+'</th>'
    +'<th>'+window.t('stmt.desc')+'</th>'
    +'<th class="as-num">'+window.t('stmt.credit')+' (+)</th>'
    +'<th class="as-num">'+window.t('stmt.debit')+' (−)</th>'
    +'<th class="as-num as-bal">'+window.t('stmt.balance')+'</th>'
    +'<th>'+window.t('stmt.note')+'</th>'
    +'</tr></thead><tbody>'+body+'</tbody>'
    +'<tfoot><tr><td colspan="3">'+(_en?'Totals':'الإجمالي')+'</td><td class="as-num">₪ '+fmt(totalCr)+'</td><td class="as-num">₪ '+fmt(totalDr)+'</td><td class="as-num as-bal">₪ '+fmt(bal)+'</td><td></td></tr></tfoot>'
    +'</table></div>';
  out.innerHTML='<div class="acct-stmt">'+head+figs+tbl
    +'<div class="as-foot"><span>'+(_en?'Transactions':'عدد الحركات')+': '+rows.length+' · '+(_en?'Currency':'العملة')+': ₪</span>'
    +'<span>'+(_en?'Auto-generated statement — Diwan Al-Taha Finance':'كُشف حساب مُولّد آليًا — ديوان آل طه')+'</span></div>'
    +'</div>';
};

/* ═══ MEMBER STATEMENT ═══ */
function fillMemberSelect(){
  const sel=document.getElementById('ms-member');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=`<option value="">${window.t('members.choose')}</option>`+DB.members.filter(m=>m.is_active).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  if(cur)sel.value=cur;
  enhanceMemberSelect('ms-member'); syncComboInput('ms-member');
}
window.renderMemberStmt=function(){

  /* ─── ACCOUNT STATEMENT — approved "Concept 2" ledger (presentation only).
     NO accounting change: rows, running balances and the final balance come
     verbatim from FIN.memberStatement(); only the layout/markup is new.        */
  const mid=document.getElementById('ms-member')?.value;
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';
  const out=document.getElementById('ms-out');
  if(!out) return;
  if(!mid){ out.innerHTML=''; return; }

  const member=gm(mid);
  if(!member){ out.innerHTML=''; return; }

  const _en=window.LANG==='en';
  const T=(ar,en)=>_en?en:ar;
  const printDate=new Date().toLocaleDateString('en-GB');

  const st=FIN.memberStatement(mid,from,to);
  const _alloc=FIN.allocateFoodDonations();

  /* Carried balance before 31/12/2024 — same inputs the engine reads. */
  const histDue=Number(member.historical_balance_ils||0);
  const histPaid=Number(member.historical_payments_ils||0);
  const carried=histDue-histPaid;

  /* Manual receipt no. lives inside the payment voucher Notes; surface ONLY the
     number (never the raw notes text). Tune the keywords if your notes differ. */
  const refFromNotes=txt=>{
    if(!txt) return '';
    const s=String(txt);
    let m=s.match(/(?:إيصال|ايصال|سند|receipt|rcpt|ref|مرجع|رقم|no\.?|#)[^\d]{0,24}(\d{1,9})/i);
    if(m) return m[1];
    m=s.match(/^\s*#?\s*(\d{1,9})\s*$/);
    return m?m[1]:'';
  };

  /* Movement rows = engine rows minus the two folded historical (date '—') rows,
     whose net is already represented by `carried`. Running balances are unchanged. */
  const moves=st.rows.filter(r=>r.date!=='—');
  let totSub=0, totPay=0;
  const bodyRows=[];
  /* Explicit, symmetric balance-polarity marker (DDL-02 B-3): every balance cell
     shows دائن/مدين for BOTH polarities — never credit-labelled / debit-by-absence. */
  const polM=v=>v>0?' <span class="as-pol as-pol-dr">'+T('مدين','Dr')+'</span>'
               :v<0?' <span class="as-pol as-pol-cr">'+T('دائن','Cr')+'</span>':'';

  bodyRows.push(
    '<tr class="as-open">'
    +'<td class="as-c">—</td>'
    +'<td class="as-desc">'+T('رصيد مُرحّل قبل 31/12/2024','Carried balance before 31/12/2024')+'</td>'
    +'<td class="as-c as-mut">—</td>'
    +'<td class="as-c as-mut">—</td>'
    +'<td class="as-c as-mut">—</td>'
    +'<td class="as-num as-mut">—</td>'
    +'<td class="as-num as-mut">—</td>'
    +'<td class="as-num as-bal">₪ '+fmt(Math.abs(carried))+polM(carried)+'</td>'
    +'</tr>'
  );

  moves.forEach(r=>{
    totSub+=Number(r.dr||0);
    totPay+=Number(r.cr||0);
    const isReceipt = r.no && r.no!=='—';
    const year = (r.date && r.date!=='—') ? String(r.date).slice(0,4) : '—';
    const sysNo = isReceipt ? esc(r.no) : '—';
    const refNo = isReceipt ? (refFromNotes(r.desc)||'—') : '—';
    const desc  = isReceipt ? T('سداد · مساهمة غذاء','Payment · Food contribution') : esc(r.desc);
    const bal   = Number(r.bal||0);
    bodyRows.push(
      '<tr>'
      +'<td class="as-c">'+fdate(r.date)+'</td>'
      +'<td class="as-desc">'+desc+'</td>'
      +'<td class="as-c">'+year+'</td>'
      +'<td class="as-c">'+sysNo+'</td>'
      +'<td class="as-c '+(refNo==='—'?'as-mut':'as-ref')+'">'+refNo+'</td>'
      +'<td class="as-num">'+(r.dr>0?'₪ '+fmt(r.dr):'<span class="as-mut">—</span>')+'</td>'
      +'<td class="as-num">'+(r.cr>0?'₪ '+fmt(r.cr):'<span class="as-mut">—</span>')+'</td>'
      +'<td class="as-num as-bal">₪ '+fmt(Math.abs(bal))+polM(bal)+'</td>'
      +'</tr>'
    );
  });

  const finBal=Number(st.finalBalance||0);
  const finStatus = finBal>0?T('على العضو مستحقات','Outstanding — member owes')
                  : finBal<0?T('للعضو رصيد دائن','Credit balance — owed to member')
                  : T('الحساب مسدد بالكامل','Fully settled');

  /* Donation transparency (do NOT affect the balance) — retained for auditors. */
  const dons=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.member_id===mid&&r.movement_type!=='historical_debt_collection'); /* ق4: collections live in the main ledger */
  const donSplit=d=>{
    const sp=_alloc.perReceipt[d.id]||{debtSettled:0,toDeficit:0,toCurrent:0};
    if(d.donation_display_fund!=='food') return T('تبرع ديوان','Diwan Donation')+' ₪'+fmt(d.amount_ils||d.amount);
    const p=[];
    if(sp.debtSettled>0) p.push(T('تسوية ذمة','Debt Settlement')+' ₪'+fmt(sp.debtSettled));
    if(sp.toDeficit>0)   p.push(T('تبرع عجز تاريخي','Historical Deficit')+' ₪'+fmt(sp.toDeficit));
    if(sp.toCurrent>0)   p.push(T('دعم حالي','Current Support')+' ₪'+fmt(sp.toCurrent));
    return p.length?p.join(' · '):T('تبرع غداء','Food Donation');
  };
  const donHTML = dons.length ? (
    '<div class="as-don"><div class="as-don-h">'
    +T('حركات التبرعات (للشفافية — لا تؤثّر على الرصيد)','Donation movements (transparency — do not affect the balance)')
    +'</div>'
    +dons.map(d=>'<div class="as-don-r"><span>'+fdate(d.receipt_date)+' — '+donSplit(d)+'</span><span class="as-don-v">₪ '+fmt(d.amount_ils||d.amount)+'</span></div>').join('')
    +'</div>'
  ) : '';

  /* Print ▼ split button — all PDF/print paths use the official print template
     (prtMemberStmt), never the on-screen layout. Excel uses the data exporter. */
  const canPrint  = (typeof can!=='undefined' && can.print  && can.print());
  const canExport = (typeof can!=='undefined' && can.export && can.export());
  const actions = (canPrint || canExport) ? (
    '<div class="as-actions"><div class="export-dropdown">'
    +'<button class="as-btn as-btn-pri as-split" onclick="togglePageExport(event,\'ms-print-menu\')">'
      +'<i class="ti ti-printer"></i><span>'+T('طباعة','Print')+'</span><i class="ti ti-chevron-down as-split-ar"></i>'
    +'</button>'
    +'<div class="export-dropdown-menu" id="ms-print-menu">'
      +(canPrint?'<button class="export-dropdown-item" onclick="window.prtMemberStmt(\'print\')"><i class="ti ti-file-description"></i>'+T('طباعة كشف الحساب','Print statement')+'</button>':'')
      +(canPrint?'<button class="export-dropdown-item" onclick="window.prtMemberStmt(\'pdf\')"><i class="ti ti-file-type-pdf"></i>'+T('تنزيل PDF','Download PDF')+'</button>':'')
      +(canExport?'<button class="export-dropdown-item" onclick="window.exportMemberStmt(\'excel\')"><i class="ti ti-file-spreadsheet"></i>'+T('تصدير Excel','Export Excel')+'</button>':'')
      +(canPrint?'<button class="export-dropdown-item" onclick="window.prtMemberStmt(\'pdf-print\')"><i class="ti ti-printer"></i>'+T('طباعة PDF','Print PDF')+'</button>':'')
    +'</div>'
    +'</div></div>'
  ) : '';

  out.innerHTML =
  '<div class="acct-stmt">'
    +'<div class="as-top">'
      +'<div class="as-title"><span class="as-brand">م</span><div>'
        +'<div class="as-h">'+T('كشف حساب العضو','Member Account Statement')+'</div>'
        +'<div class="as-sub">'+T('المالية ‹ الأعضاء ‹ كشف الحساب','Finance ‹ Members ‹ Account statement')+'</div>'
      +'</div></div>'
      +actions
    +'</div>'

    +'<div class="as-meta">'
      +'<div class="as-m"><div class="as-k">'+T('اسم العضو','Member name')+'</div><div class="as-v">'+esc(member.name)+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+T('رقم العضو','Member no.')+'</div><div class="as-v">'+esc(member.member_code||'—')+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+T('تاريخ التسجيل','Registration')+'</div><div class="as-v">'+(member.active_from_year||'—')+'</div></div>'
      +'<div class="as-m"><div class="as-k">'+T('تاريخ الطباعة','Print date')+'</div><div class="as-v">'+printDate+'</div></div>'
    +'</div>'

    +'<div class="as-openbar">'
      +'<span class="as-openbar-k">'+T('الرصيد المرحّل قبل 31/12/2024','Carried balance before 31/12/2024')+'</span>'
      +'<span class="as-openbar-v">₪ '+fmt(Math.abs(carried))+polM(carried)+'</span>'
    +'</div>'

    +'<div class="as-tablewrap"><table class="as-table"><thead><tr>'
      +'<th class="as-c">'+T('التاريخ','Date')+'</th>'
      +'<th>'+T('البيان','Description')+'</th>'
      +'<th class="as-c">'+T('السنة','Year')+'</th>'
      +'<th class="as-c">'+T('رقم النظام','System no.')+'</th>'
      +'<th class="as-c">'+T('الرقم المرجعي','Reference no.')+'</th>'
      +'<th class="as-num">'+T('اشتراك (+)','Subscription (+)')+'</th>'
      +'<th class="as-num">'+T('سداد (−)','Payment (−)')+'</th>'
      +'<th class="as-num as-bal">'+T('الرصيد الجاري','Running balance')+'</th>'
    +'</tr></thead><tbody>'+bodyRows.join('')+'</tbody>'
    /* final balance CAPS the running-balance column (mirrors the official print) */
    +'<tfoot><tr class="as-ffinal"><td colspan="7">'+T('الرصيد النهائي الحالي','Current final balance')+' · <span class="as-ffs">'+finStatus+'</span></td>'
    +'<td class="as-num as-bal">₪ '+fmt(Math.abs(finBal))+polM(finBal)+'</td></tr></tfoot>'
    +'</table></div>'

    /* Dynamic accounting summaries (presentation only — all values from the
       existing engine; future subscription years are included automatically). */
    +'<div class="as-summary">'
      +'<div class="as-totals">'
        +'<div class="as-t"><div class="as-k">'+T('مجموع الاشتراكات بعد تشغيل النظام','Subscriptions after system launch')+'</div><div class="as-tv">₪ '+fmt(totSub)+'</div></div>'
        +'<div class="as-t"><div class="as-k">'+T('مجموع السداد بعد تشغيل النظام','Payments after system launch')+'</div><div class="as-tv">₪ '+fmt(totPay)+'</div></div>'
        +'<div class="as-t"><div class="as-k">'+T('مجموع السداد من الرصيد المرحل','Payments against carried balance')+'</div><div class="as-tv">₪ '+fmt(histPaid)+'</div></div>'
      +'</div>'
    +'</div>'

    +donHTML

    +'<div class="as-foot">'
      +'<span>'+T('عدد الحركات','Transactions')+': '+moves.length+' · '+T('العملة','Currency')+': ₪</span>'
      +'<span>'+T('كُشف حساب مُولّد آليًا من النظام المالي — ديوان آل طه','Auto-generated statement — Diwan Al-Taha Finance')+'</span>'
    +'</div>'
  +'</div>';
};


/* ═══ MODAL · CHEQUE FIELDS · DROPDOWNS · SEARCHABLE MEMBER COMBO ═══
   (extracted to /js/forms.js — Phase B Module 6) */


/* ════════════════════════════════════════════════════════════════
   ATTACHMENTS SYSTEM  (receipts + payments only)
   Depends on app.js scope: SB, CUR, CU, can, toast, logAction, esc, fmt
   ════════════════════════════════════════════════════════════════ */
const ATTACH_BUCKET='attachments';
const ATTACH_MAX=10, ATTACH_IMG_MAX=5*1024*1024, ATTACH_PDF_MAX=10*1024*1024;
const ATTACH_MIME=['image/jpeg','image/png','application/pdf'];
const ATTACH_COUNTS={receipt:{},payment:{}};
const ATTACH_CATS={
  receipt:{bank_receipt:'إيصال بنكي',bank_transfer:'إيصال تحويل بنكي',cheque:'صورة شيك',donation_proof:'إثبات تبرع',other:'أخرى'},
  payment:{invoice:'فاتورة',quotation:'عرض سعر',execution_contract:'عقد تنفيذ',delivery_receipt:'محضر استلام',cheque:'صورة شيك',other:'أخرى'}
};
let ATTACH_CTX=null; // {type:'receipt'|'payment', id, no, fund}

/* Load counts for all current vouchers (one query per type, counts only) */
/* loadAttachCounts() — extracted to /js/data.js (Phase B Module 4) */
function attachCount(type,id){return ATTACH_COUNTS[type]?.[id]||0;}

/* Row button (paperclip + count) — visible to all roles */
window.attachBtn=function(type,id,no,fund){
  const n=attachCount(type,id);
  const badge=n>0?`<span style="background:var(--pos,#46604E);color:var(--card,#fff);border-radius:9px;padding:0 5px;font-size:9px;margin-inline-start:3px;font-weight:700">${n}</span>`:'';
  return `<button class="btn ghost sm ic-attach" onclick="window.openAttach('${type}','${id}','${esc(no||'')}','${fund||''}')" title="${window.t('common.attachments')}"><i class="ti ti-paperclip"></i>${badge}</button>`;
};

/* Open attachments modal for a voucher */
function attachRefreshTab(){const a=document.querySelector('.pg.on')?.id?.replace('pg-','');if(a&&typeof D!=='undefined'&&D[a])D[a].render();}
window.openAttach=async function(type,id,no,fund){
  ATTACH_CTX={type,id,no,fund};
  ensureAttachModals();
  // populate categories for this owner type
  const sel=document.getElementById('attach-cat');
  sel.innerHTML='<option value="">— اختر —</option>'+Object.entries(ATTACH_CATS[type]).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  document.getElementById('ov').classList.add('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.getElementById('m-attach').style.display='block';
  document.getElementById('attach-title').textContent=`المرفقات — ${no}`;
  document.getElementById('attach-upload-wrap').style.display=can.admin()?'block':'none';
  await renderAttachList();
};

async function renderAttachList(){
  const box=document.getElementById('attach-list');
  box.innerHTML='<div style="text-align:center;padding:18px;color:var(--tx3)"><div class="spin"></div></div>';
  const col=ATTACH_CTX.type==='receipt'?'receipt_id':'payment_id';
  const{data,error}=await SB.from('attachments').select('*').eq(col,ATTACH_CTX.id).order('created_at',{ascending:false});
  if(error){box.innerHTML=`<div style="color:var(--danger);padding:12px">خطأ في التحميل: ${esc(error.message)}</div>`;return;}
  if(!data?.length){box.innerHTML='<div style="text-align:center;padding:18px;color:var(--tx3)">لا توجد مرفقات</div>';return;}
  const cats=ATTACH_CATS[ATTACH_CTX.type];
  box.innerHTML=data.map(a=>{
    const isImg=a.mime_type.startsWith('image/');
    const icon=isImg?'ti-photo':'ti-file-type-pdf';
    const kb=a.size_bytes<1048576?Math.round(a.size_bytes/1024)+' KB':(a.size_bytes/1048576).toFixed(1)+' MB';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--bd);border-radius:7px;margin-bottom:8px;background:var(--bg2)">
      <i class="ti ${icon}" style="font-size:22px;color:#0F2B5B"></i>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.file_name)}</div>
        <div style="font-size:10.5px;color:var(--tx3)">${esc(cats[a.doc_category]||a.doc_category)} · ${kb} · ${(a.created_at||'').slice(0,10)}</div>
      </div>
      <button class="btn ghost sm" onclick="window.previewAttach('${a.id}','${esc(a.storage_path)}','${a.mime_type}','${esc(a.file_name)}')" title="${window.t('common.preview')}"><i class="ti ti-eye"></i></button>
      <button class="btn ghost sm" onclick="window.downloadAttach('${esc(a.storage_path)}','${esc(a.file_name)}')" title="${window.t('common.download')}"><i class="ti ti-download"></i></button>
      ${can.admin()?`<button class="btn ghost sm" style="color:var(--danger)" onclick="window.deleteAttach('${a.id}','${esc(a.storage_path)}','${esc(a.file_name)}')" title="${window.t('common.delete')}"><i class="ti ti-trash"></i></button>`:''}
    </div>`;
  }).join('');
}

/* Image compression (canvas, max 1600px, q0.8) */
function compressImage(file){
  return new Promise((resolve)=>{
    if(!file.type.startsWith('image/'))return resolve(file);
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      let{width:w,height:h}=img; const max=1600;
      if(w>max||h>max){const s=Math.min(max/w,max/h);w=Math.round(w*s);h=Math.round(h*s);}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      cv.toBlob(b=>resolve(b&&b.size<file.size?new File([b],file.name,{type:'image/jpeg'}):file),'image/jpeg',0.8);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
    img.src=url;
  });
}

function sanitizeName(n){return (n||'file').replace(/[^\w.\-]+/g,'_').slice(-80);}

/* Upload handler */
window.uploadAttach=async function(){
  if(!can.admin()){toast(window.t('errors.admin_only'),'err');return;}
  const cat=document.getElementById('attach-cat').value;
  const fileInput=document.getElementById('attach-file');
  const file=fileInput.files[0];
  const errBox=document.getElementById('attach-err');
  errBox.style.display='none';errBox.innerHTML='';
  const fail=(m)=>{errBox.style.display='block';errBox.innerHTML=esc(m);};
  if(!cat){return fail('اختر نوع المستند');}
  if(!file){return fail('اختر ملفاً');}
  if(!ATTACH_MIME.includes(file.type)){return fail('نوع غير مدعوم — JPG أو PNG أو PDF فقط');}
  const isImg=file.type.startsWith('image/');
  if(isImg&&file.size>ATTACH_IMG_MAX){return fail('حجم الصورة يتجاوز 5MB');}
  if(!isImg&&file.size>ATTACH_PDF_MAX){return fail('حجم الـ PDF يتجاوز 10MB');}
  if(attachCount(ATTACH_CTX.type,ATTACH_CTX.id)>=ATTACH_MAX){return fail(`الحد الأقصى ${ATTACH_MAX} مرفقات لكل سند`);}

  const btn=document.getElementById('attach-upload-btn');
  btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  try{
    const finalFile=isImg?await compressImage(file):file;
    const path=`${ATTACH_CTX.type}/${ATTACH_CTX.id}/${crypto.randomUUID()}_${sanitizeName(file.name)}`;
    const{error:upErr}=await SB.storage.from(ATTACH_BUCKET).upload(path,finalFile,{contentType:finalFile.type,upsert:false});
    if(upErr)throw upErr;
    const row={
      [ATTACH_CTX.type==='receipt'?'receipt_id':'payment_id']:ATTACH_CTX.id,
      owner_no:ATTACH_CTX.no, fund_type:ATTACH_CTX.fund, doc_category:cat,
      file_name:file.name, storage_path:path, mime_type:finalFile.type,
      size_bytes:finalFile.size, uploaded_by:CUR?.full_name||CU?.email
    };
    const{data:ins,error:insErr}=await SB.from('attachments').insert(row).select('id').single();
    if(insErr){await SB.storage.from(ATTACH_BUCKET).remove([path]);throw insErr;}
    await logAction('add',`إضافة مرفق (${ATTACH_CATS[ATTACH_CTX.type][cat]||cat}) إلى ${ATTACH_CTX.no}: ${file.name}`,'attachments',ins?.id||null);
    ATTACH_COUNTS[ATTACH_CTX.type][ATTACH_CTX.id]=attachCount(ATTACH_CTX.type,ATTACH_CTX.id)+1;
    fileInput.value='';document.getElementById('attach-cat').value='';
    toast(window.t('messages.attach_uploaded'),'ok');
    await renderAttachList();
    attachRefreshTab();
  }catch(e){fail('فشل الرفع: '+(e.message||e));}
  finally{btn.disabled=false;btn.innerHTML='<i class="ti ti-upload"></i>رفع المرفق';}
};

/* Signed URL helper */
async function attachSignedUrl(path){
  const{data,error}=await SB.storage.from(ATTACH_BUCKET).createSignedUrl(path,300);
  if(error)throw error;return data.signedUrl;
}

window.previewAttach=async function(id,path,mime,name){
  try{
    const url=await attachSignedUrl(path);
    ensureAttachModals();
    document.getElementById('ov').classList.add('on');
    document.getElementById('m-attach-view').style.display='block';
    document.getElementById('attach-view-title').textContent=name;
    const body=document.getElementById('attach-view-body');
    body.innerHTML=mime==='application/pdf'
      ? `<iframe src="${url}" style="width:100%;height:60vh;border:none;border-radius:7px"></iframe>`
      : `<img src="${url}" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:7px">`;
    document.getElementById('attach-view-dl').onclick=()=>window.downloadAttach(path,name);
  }catch(e){toast(window.t('errors.preview_failed')+': '+(e.message||e),'err');}
};

window.downloadAttach=async function(path,name){
  try{
    const url=await attachSignedUrl(path);
    const a=document.createElement('a');a.href=url;a.download=name||'attachment';
    document.body.appendChild(a);a.click();a.remove();
  }catch(e){toast(window.t('errors.download_failed')+': '+(e.message||e),'err');}
};

/* Hard delete: storage file + row + audit */
window.deleteAttach=async function(id,path,name){
  if(!can.admin()){toast(window.t('errors.admin_only'),'err');return;}
  if(!confirm(`حذف المرفق "${name}" نهائياً؟ لا يمكن التراجع.`))return;
  try{
    const{error:rmErr}=await SB.storage.from(ATTACH_BUCKET).remove([path]);
    if(rmErr)throw rmErr;
    const{error:delErr}=await SB.from('attachments').delete().eq('id',id);
    if(delErr)throw delErr;
    await logAction('delete',`حذف مرفق من ${ATTACH_CTX.no}: ${name}`,'attachments',id);
    if(ATTACH_CTX)ATTACH_COUNTS[ATTACH_CTX.type][ATTACH_CTX.id]=Math.max(0,attachCount(ATTACH_CTX.type,ATTACH_CTX.id)-1);
    toast(window.t('messages.attach_deleted'),'ok');
    await renderAttachList();
    attachRefreshTab();
  }catch(e){toast(window.t('errors.delete_failed')+': '+(e.message||e),'err');}
};

window.closeAttach=function(){
  ['m-attach','m-attach-view'].forEach(idv=>{const el=document.getElementById(idv);if(el)el.style.display='none';});
  document.getElementById('ov').classList.remove('on');
};
window.closeAttachView=function(){
  document.getElementById('m-attach-view').style.display='none';
  document.getElementById('m-attach').style.display='block'; // back to list
};

/* Build modals once (no index.html edits needed) */
function ensureAttachModals(){
  if(document.getElementById('m-attach'))return;
  const cont=document.getElementById('ov')||document.body;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
  <div class="modal" id="m-attach" style="display:none;max-width:520px">
    <div class="mhd"><span class="mtt"><span class="mico green"><i class="ti ti-paperclip"></i></span><span id="attach-title">المرفقات</span></span><button class="btn ghost" onclick="window.closeAttach()" aria-label="إغلاق"><i class="ti ti-x"></i></button></div>
    <div class="mbd">
      <div id="attach-upload-wrap" style="border:1px dashed var(--bd2);border-radius:9px;padding:12px;margin-bottom:12px">
        <div class="fi full"><label>نوع المستند <span class="req">*</span></label>
          <select id="attach-cat"><option value="">— اختر —</option></select></div>
        <div class="fi full" style="margin-top:8px"><label>الملف (JPG · PNG · PDF) <span class="req">*</span></label>
          <input type="file" id="attach-file" accept="image/jpeg,image/png,application/pdf"></div>
        <div id="attach-err" style="display:none;color:var(--danger);font-size:12px;margin:8px 0;padding:6px 8px;background:rgba(220,38,38,.08);border-radius:6px"></div>
        <button class="btn primary" id="attach-upload-btn" style="width:100%;margin-top:8px" onclick="window.uploadAttach()"><i class="ti ti-upload"></i>رفع المرفق</button>
        <div style="font-size:10.5px;color:var(--tx3);margin-top:6px">الحد الأقصى: 10 مرفقات · صور 5MB · PDF 10MB</div>
      </div>
      <div id="attach-list"></div>
    </div>
  </div>
  <div class="modal" id="m-attach-view" style="display:none;max-width:640px">
    <div class="mhd"><span class="mtt"><span class="mico green"><i class="ti ti-eye"></i></span><span id="attach-view-title">معاينة</span></span><button class="btn ghost" onclick="window.closeAttachView()" aria-label="إغلاق"><i class="ti ti-x"></i></button></div>
    <div class="mbd"><div id="attach-view-body"></div>
      <div style="text-align:center;margin-top:10px"><button class="btn primary" id="attach-view-dl"><i class="ti ti-download"></i>تنزيل</button></div>
    </div>
  </div>`;
  cont.appendChild(wrap);
}
/* ═══ END ATTACHMENTS SYSTEM ═══ */

/* ═══ AUDIT LOG ═══ */
async function logAction(action,desc,tableN,recordId){
  await SB.from('audit_log').insert({user_name:CUR?.full_name||CU?.email,action,description:desc,table_name:tableN,record_id:recordId});
}

/* ═══ SAVE RECEIPT · SAVE PAYMENT · SAVE MEMBER · EDIT RECORDS · VOUCHER VERSIONING · YEAR-END LOCK ═══
   (extracted to /js/crud.js — Phase B Module 7) */
/* ═══ ANNUAL DUES ═══ */
window.applyAnnualDue=async function(){
  if(!guardSave('applyDue')){return;}
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const year=parseInt(document.getElementById('due-year').value);
  const amount=parseFloat(document.getElementById('due-amount').value)||200;
  if(!year||year<2020||year>2040){toast(window.t('errors.invalid_year'),'warn');return;}
  if(DB.annual.find(a=>a.year===year)){toast(window.t('errors.duplicate_year'),'warn');return;}
 const members=DB.members.filter(m =>
  m.is_active &&
  (!m.active_from_year || m.active_from_year <= year)
);
  if(!members.length){toast(window.t('errors.no_members'),'warn');return;}
  if(!confirm(
  `سيُضاف ${fmt(amount)} ₪ كاشتراك سنة ${year} على ${members.length} عضو مستحق. هل تريد المتابعة؟`
)) return;
  const btn=document.getElementById('btn-apply-due');
if(!btn)return;
btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  const{data:adNew,error}=await SB.from('annual_dues').insert({year,amount,applied_by:CUR?.full_name||CU?.email,member_count:members.length}).select('id').single();
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-plus"></i>تطبيق الاشتراك السنوي';return;}
  /* H1 FIX — generate the per-member subscription obligations for this year so the dues are
     actually billed. FIN.memberStatement / A2 / A3 / member statements all read
     member_subscriptions; without these rows the year is invisible to the accounting engine.
     Every active member gets a row; due = amount when eligible (active_from_year<=year), else 0. */
  const subRows=DB.members.filter(m=>m.is_active!==false).map(m=>{
    const due=(!m.active_from_year||m.active_from_year<=year)?Number(amount):0;
    return {member_id:m.id,year,due_amount_ils:due,paid_amount_ils:0,balance_ils:due};
  });
  if(subRows.length){
    const{error:subErr}=await SB.from('member_subscriptions').insert(subRows);
    if(subErr){toast(window.t('errors.generic_error')+': '+subErr.message,'err');btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-plus"></i>تطبيق الاشتراك السنوي';return;}
  }
  await logAction('add',`تطبيق اشتراك سنة ${year} — ${members.length} عضو — ₪${fmt(amount)} لكل عضو`,'annual_dues',adNew?.id||null);
  await loadAll();
  btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-plus"></i>تطبيق الاشتراك السنوي';
  toast(`✓ ${window.t('messages.annual_applied')} — ${year}`,'ok');
};
function renderAnnual(){
  const list=document.getElementById('annual-list');if(!list)return;
  if(!DB.annual.length){list.innerHTML=`<div class="empty"><i class="ti ti-calendar-off"></i><div class="empty-t">${L.noData('annual')}</div></div>`;return;}
  list.innerHTML=DB.annual.map(a=>`
    <div class="sr">
      <span class="sr-l" style="font-size:15px;font-weight:700">سنة ${a.year}</span>
      <span class="sr-v">₪ ${fmt(a.amount)} × ${a.member_count} عضو</span>
      <span style="font-size:11px;color:var(--tx3)">${window.LANG==='en'?'Applied':'طُبِّق'}: ${fdate(a.applied_at?.slice(0,10))} ${window.LANG==='en'?'by':'بواسطة'} ${esc(a.applied_by||'—')}</span>
    </div>`).join('');
}

/* ═══ USERS (admin only) ═══ */
async function loadUsers(){
  if(!can.admin())return;
  const{data}=await SB.from('user_roles').select('*').order('created_at');
  const list=document.getElementById('users-list');if(!list)return;
  if(!data?.length){list.innerHTML='<div class="empty"><div class="empty-t">لا يوجد مستخدمون</div></div>';return;}
  /* muted DDL role colours — same solids as the top-bar avatar (.uav) and role tags */
  const BG={admin:'#5E5578',viewer:'#3E5A78',reservation:'#3E6659'};
  list.innerHTML=data.map(u=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px;border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;background:var(--bg2)">
      <div style="width:36px;height:36px;border-radius:50%;background:${BG[u.role]||'#5C5F65'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff">${(u.full_name||'م').charAt(0).toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:500;font-size:13px">${esc(u.full_name||'—')}</div><div style="font-size:10px;color:var(--tx3)">${u.user_id}</div></div>
      <span class="role-tag ${u.role}">${ROLES[u.role]||u.role}</span>
      ${u.user_id!==CU?.id?`<select onchange="window.changeRole('${u.user_id}',this.value)" style="padding:4px 8px;border-radius:var(--r);border:1px solid var(--bd2);background:var(--bg2);color:var(--tx);font-size:11.5px;font-family:var(--fn)">
        <option value="viewer" ${u.role==='viewer'?'selected':''}>عارض</option>
        <option value="reservation" ${u.role==='reservation'?'selected':''}>مدير الحجوزات</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>مدير</option>
      </select>`:'<span style="font-size:11px;color:var(--tx3)">(أنت)</span>'}
    </div>`).join('');
}
window.changeRole=async(uid,role)=>{
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  /* Enforce valid roles only */
  const safeRole=(role==='admin')?'admin':(role==='reservation')?'reservation':'viewer';
  const{data:prevRole}=await SB.from('user_roles').select('role,full_name').eq('user_id',uid).maybeSingle();
  const{error:updErr}=await SB.from('user_roles').update({role:safeRole}).eq('user_id',uid);
  if(updErr){toast('فشل تغيير الدور: '+updErr.message,'err');loadUsers();return;}
  await logAction('edit',`تغيير دور ${prevRole?.full_name||uid}: من ${ROLES[prevRole?.role]||prevRole?.role||'—'} إلى ${ROLES[safeRole]}`,'user_roles',uid);
  toast(window.t('messages.role_changed')+': '+ROLES[safeRole],'ok');loadUsers();
};
window.inviteUser=async()=>{
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const email=document.getElementById('inv-email').value.trim().toLowerCase();
  const pass=document.getElementById('inv-pass').value;
  const roleRaw=document.getElementById('inv-role').value;
  const safeRole=(roleRaw==='admin')?'admin':(roleRaw==='reservation')?'reservation':'viewer';
  const name=document.getElementById('inv-name').value.trim();

  /* ── Real, specific validation messages (no more generic "خطأ") ── */
  if(!email||!pass){toast(window.t('errors.required'),'warn');return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('بريد إلكتروني غير صالح: '+email,'err');return;}
  /* EB-08 — temp passwords obey the same AuthDS policy (12+ chars, mixed classes, not common) */
  const _pol=window.AuthDS?window.AuthDS.checkPassword(pass,{email:email,username:name}):null;
  if(_pol&&!_pol.valid){toast('كلمة المرور المؤقتة لا تحقق السياسة — 12 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز، وألا تكون شائعة. استخدم زر «توليد».','err');return;}
  if(!_pol&&pass.length<12){toast('كلمة المرور قصيرة جداً — 12 حرفاً على الأقل','err');return;}

  const btn=document.getElementById('inv-submit'); if(btn){btn.disabled=true;}
  try{
    /* Create the auth user on an ISOLATED client so the admin's own
       session is never swapped out (signUp() would otherwise sign the
       admin in as the brand-new user). persistSession:false keeps it out
       of localStorage entirely, leaving SB (the admin) untouched. */
    const tmp=supabase.createClient(window.__SB_URL,window.__SB_ANON,{
      auth:{persistSession:false,autoRefreshToken:false,storageKey:'sb-provision-tmp'}
    });
    const{data,error}=await tmp.auth.signUp({
      email,password:pass,
      options:{data:{full_name:name||email,must_change_password:true}}
    });

    /* Surface the ACTUAL error verbatim — do not hide it. */
    if(error){
      toast('فشل إنشاء الحساب: '+error.message+(error.status?` (${error.status})`:''),'err');
      return;
    }
    /* GoTrue returns a user with an EMPTY identities array when the email
       is already registered (anti-enumeration). Treat that as a real error. */
    if(!data||!data.user){toast('فشل إنشاء الحساب: لم يُرجع الخادم مستخدماً','err');return;}
    if(Array.isArray(data.user.identities)&&data.user.identities.length===0){
      toast('هذا البريد مُسجَّل مسبقاً: '+email,'err');return;
    }
    const newId=data.user.id;

    /* Assign the role via the MAIN client (still the admin), and CHECK the
       error — the old code swallowed it, so RLS denials were invisible. */
    const{error:roleErr}=await SB.from('user_roles')
      .upsert({user_id:newId,role:safeRole,full_name:name||email},{onConflict:'user_id'});
    if(roleErr){
      toast('أُنشئ الحساب لكن فشل تعيين الدور: '+roleErr.message,'err');
      return;
    }
    await logAction('add',`إنشاء مستخدم: ${email} — دور: ${ROLES[safeRole]}`,'user_roles',newId);
    window.closeM();
    /* If email confirmation is required the user has no session yet. */
    const needsConfirm=!data.session;
    toast(window.t('messages.account_created')+': '+email+(needsConfirm?' — يتطلب تأكيد البريد':''),'ok');
    loadUsers();
  }catch(e){
    toast('فشل إنشاء الحساب: '+(e&&e.message?e.message:String(e)),'err');
  }finally{
    if(btn){btn.disabled=false;}
  }
};

/* ═══ AUDIT — Data Grid (Note 9) ═══ */
window.AUDIT_FILTER={q:'',action:'',page:1,pageSize:25};
function auditActionLabel(a){return a==='add'?window.t('audit.act_add'):a==='delete'?window.t('audit.act_delete'):a==='edit'?window.t('audit.act_edit'):a||'—';}
window.onAuditFilter=function(){
  AUDIT_FILTER.q=(document.getElementById('audit-q')?.value||'').toLowerCase();
  AUDIT_FILTER.action=document.getElementById('audit-action')?.value||'';
  AUDIT_FILTER.page=1;
  renderAuditGrid();
};
window.auditPage=function(dir){
  AUDIT_FILTER.page=Math.max(1,AUDIT_FILTER.page+dir);
  renderAuditGrid();
};
function renderAudit(){
  const list=document.getElementById('audit-list');if(!list)return;
  list.innerHTML=`
    <div class="tb" style="margin-bottom:10px">
      <div class="sw"><i class="ti ti-search"></i><input class="si" id="audit-q" placeholder="بحث في الوصف أو المستخدم..." oninput="window.onAuditFilter()"></div>
      <select class="fs" id="audit-action" onchange="window.onAuditFilter()">
        <option value="">كل الأنواع</option>
        <option value="add">إضافة</option>
        <option value="edit">تعديل</option>
        <option value="delete">حذف</option>
      </select>
    </div>
    <div class="tw"><table class="dt"><thead><tr>
      <th style="width:95px">التاريخ</th><th style="width:75px">النوع</th><th>الوصف</th><th style="width:120px">المستخدم</th><th style="width:90px">الجدول</th>
    </tr></thead><tbody id="audit-grid-body"></tbody></table></div>
    <div id="audit-pager" style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:10px"></div>`;
  renderAuditGrid();
}
function renderAuditGrid(){
  const body=document.getElementById('audit-grid-body');if(!body)return;
  const f=AUDIT_FILTER;
  let rows=DB.audit.slice();
  if(f.action) rows=rows.filter(a=>a.action===f.action);
  if(f.q) rows=rows.filter(a=>((a.description||'')+' '+(a.user_name||'')).toLowerCase().includes(f.q));
  const total=rows.length;
  if(!total){ body.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:18px">لا توجد عمليات مطابقة</td></tr>'; const pg=document.getElementById('audit-pager'); if(pg)pg.innerHTML=''; return; }
  const pages=Math.ceil(total/f.pageSize);
  if(f.page>pages) f.page=pages;
  const start=(f.page-1)*f.pageSize;
  const page=rows.slice(start,start+f.pageSize);
  const badge=a=>{const c=a==='add'?'green':a==='delete'?'red':'blue';return `<span class="badge ${c}" style="font-size:10px">${auditActionLabel(a)}</span>`;};
  body.innerHTML=page.map(a=>`<tr>
    <td style="white-space:nowrap;color:var(--tx3);font-size:11px">${fdate(a.created_at?.slice(0,10))}</td>
    <td>${badge(a.action)}</td>
    <td style="font-size:12px">${esc(a.description||'—')}</td>
    <td style="font-size:11px;color:var(--tx2)">${esc(a.user_name||'—')}</td>
    <td style="font-size:11px;color:var(--tx3)">${esc(a.table_name||'—')}</td>
  </tr>`).join('');
  const pg=document.getElementById('audit-pager');
  if(pg) pg.innerHTML=`
    <button class="btn ghost sm" ${f.page<=1?'disabled':''} onclick="window.auditPage(-1)"><i class="ti ti-chevron-right"></i></button>
    <span style="font-size:12px;color:var(--tx2)">صفحة ${f.page} من ${pages} · ${total} عملية</span>
    <button class="btn ghost sm" ${f.page>=pages?'disabled':''} onclick="window.auditPage(1)"><i class="ti ti-chevron-left"></i></button>`;
}
function renderSysInfo(){
  const el=document.getElementById('sys-info');if(!el)return;
  /* P0 — never render an unloaded database as real zeros. Before the first
     successful loadAll, DB is empty while opening balances may already be set,
     which printed "0 members / 0 receipts" next to a live treasury figure.
     Show a neutral loading state instead; renderAll re-invokes this once data
     arrives. A genuinely empty (but loaded) database still shows real zeros. */
  if(!DB._loaded){
    el.innerHTML='<div class="sr"><span class="sr-l">جارٍ تحميل بيانات النظام…</span><span class="sr-v">—</span></div>';
    return;
  }
  const totRec=DB.receipts.filter(r=>!r.is_deleted).length;
  const totPay=DB.payments.filter(p=>!p.is_deleted).length;
  el.innerHTML=`
    <div class="sr"><span class="sr-l">عدد الأعضاء</span><span class="sr-v">${DB.members.filter(m=>m.is_active).length}</span></div>
    <div class="sr"><span class="sr-l">عدد الإيصالات</span><span class="sr-v">${totRec}</span></div>
    <div class="sr"><span class="sr-l">عدد سندات الصرف</span><span class="sr-v">${totPay}</span></div>
    <div class="sr"><span class="sr-l">رصيد صندوق الغداء</span><span class="sr-v" style="color:var(--food)">₪ ${fmt(FinContract.foodBalance())}</span></div>
    <div class="sr"><span class="sr-l">رصيد صندوق الديوان</span><span class="sr-v" style="color:var(--diwan)">₪ ${fmt(FinContract.diwanBalance())}</span></div>
    <div class="sr"><span class="sr-l">سعر الدولار</span><span class="sr-v">₪ ${RATES.USD.toFixed(2)}</span></div>
    <div class="sr"><span class="sr-l">سعر الدينار الأردني</span><span class="sr-v">₪ ${RATES.JOD.toFixed(2)}</span></div>
  `;
}

/* ═══ PRINT ENGINE · PRINT_TOKENS · BRANDING · VOUCHER BUILDERS · STATEMENT PRINTERS ═══
   (extracted to /js/print.js — Phase B Module 9) */

/* ═══ VIS-7: UNIFIED EXCEL STYLING (xlsx-js-style) ═══ */
const XLSX_STYLE_CDN='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
function loadStyledXLSX(cb){
  if(window.XLSX&&window.XLSX.__styled){cb();return;}
  const s=document.createElement('script');s.src=XLSX_STYLE_CDN;
  s.onload=function(){if(window.XLSX)window.XLSX.__styled=true;cb();};
  s.onerror=function(){toast(window.t('errors.excel_load_failed'),'err');};
  document.head.appendChild(s);
}
/* Apply the Diwan design standard to a worksheet.
   opts: {headerRow:int (0-based), money:[colIdx...], totalRows:[rowIdx...], cols:int} */
function styleDiwanSheet(XLSX, ws, opts){
  opts=opts||{};
  const range=XLSX.utils.decode_range(ws['!ref']);
  const NAVY='0F1B33', WHITE='FFFFFF', BG='F2F5FA';  /* Theme-01: deep-navy header/total fill · ice paper tint */
  const thin={style:'thin',color:{rgb:'E2E8F0'}};
  const border={top:thin,bottom:thin,left:thin,right:thin};
  const hr=(opts.headerRow!=null)?opts.headerRow:0;
  const money=opts.money||[];
  const totals=opts.totalRows||[];
  for(let R=range.s.r;R<=range.e.r;R++){
    for(let C=range.s.c;C<=range.e.c;C++){
      const ref=XLSX.utils.encode_cell({r:R,c:C});
      const cell=ws[ref]; if(!cell)continue;
      cell.s=cell.s||{};
      cell.s.border=border;
      cell.s.alignment={horizontal:'center',vertical:'center',readingOrder:2};
      if(R===hr){
        cell.s.fill={fgColor:{rgb:NAVY}}; cell.s.font={color:{rgb:WHITE},bold:true,sz:11};
      }else if(totals.indexOf(R)>=0){
        cell.s.fill={fgColor:{rgb:NAVY}}; cell.s.font={color:{rgb:WHITE},bold:true};
      }else if((R-hr)%2===0){
        cell.s.fill={fgColor:{rgb:BG}};
      }
      if(money.indexOf(C)>=0 && typeof cell.v==='number'){ cell.z='₪#,##0.00'; }
    }
  }
  // autofilter over header row
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:hr,c:range.s.c},e:{r:hr,c:range.e.c}})};
  // freeze panes below header (best-effort)
  ws['!freeze']={xSplit:0,ySplit:hr+1,topLeftCell:XLSX.utils.encode_cell({r:hr+1,c:0}),activePane:'bottomLeft',state:'frozen'};
}

/* ═══ PDF & EXPORT ═══ */
window.exportPDF=function(type){
  if(!can.print()){toast(window.t?window.t('errors.no_print'):'لا توجد صلاحية','err');return;}
  if(type==='food-stmt')  window.prtStmt('food');
  else if(type==='diwan-stmt') window.prtStmt('diwan');
  else if(type==='member') window.prtMemberStmt();
  else if(type==='don')    window.prtDonStmt();
};

/* ═══ A2 ANNUAL DEBT · A3 DELINQUENT · DONATION STATEMENT PRINT ═══
   (extracted to /js/reports.js — Phase B Module 8) */
/* ═══ EXPORT CSV / BACKUP ═══ */
/* P0 — a backup must be a COMPLETE, lossless snapshot. The old export dumped the
   partial in-memory DB (7 tables, audit capped at 50 rows, and NO settings — so
   opening balances, rates and the year-lock were silently lost, which made the
   restored Diwan balance and historical deficit wrong). This fetches every table
   fresh with full rows. Financial-critical tables must all succeed or the backup
   aborts (no silent partial); supporting tables are best-effort and any that fail
   are listed in _meta.incomplete. */
window.BACKUP_TABLES_CRITICAL=['members','receipts','payments','member_subscriptions','annual_dues','settings','contacts'];
window.BACKUP_TABLES_SUPPORTING=['attachments','vouchers','voucher_versions','user_roles','audit_log'];
window.doBackup=async function(){
  if(!can.export()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية التصدير','err');return;}
  const payload={_meta:{app:'diwan-finance',schema:2,exported_at:new Date().toISOString(),
                        by:CUR?.full_name||CU?.email||null,
                        tables:[...window.BACKUP_TABLES_CRITICAL,...window.BACKUP_TABLES_SUPPORTING],incomplete:[]}};
  try{
    for(const t of window.BACKUP_TABLES_CRITICAL){
      const {data,error}=await SB.from(t).select('*');
      if(error) throw new Error(t+': '+error.message);
      payload[t]=data||[];
    }
  }catch(e){ toast((window.t?window.t('errors.save_error'):'خطأ في التصدير')+': '+e.message,'err'); return; }
  for(const t of window.BACKUP_TABLES_SUPPORTING){
    try{ const {data,error}=await SB.from(t).select('*'); if(error) throw error; payload[t]=data||[]; }
    catch(e){ payload[t]=[]; payload._meta.incomplete.push(t); }
  }
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='diwan_backup_'+today()+'.json';a.click();
  if(payload._meta.incomplete.length)
    toast((window.t?window.t('messages.exported'):'تم التصدير')+' — جداول مساعدة تعذّرت: '+payload._meta.incomplete.join(', '),'warn');
  else toast(window.t('messages.exported'),'ok');
};
/* ═══ BACKUP RESTORE ═══ */
/* P0 — SAFETY: the in-browser restore was disabled.
   The previous implementation deleted every row of members/receipts/payments/
   contacts and then re-inserted from the file, with NO transaction and NO abort
   on error: any failed insert (schema drift, RLS, FK, a truncated file) left the
   live database permanently wiped, reported only as a "partial" toast. That is an
   unacceptable data-loss and history-rewrite path for a production financial
   ledger. Backup EXPORT (doBackup) is unaffected. A safe restore — transactional,
   server-side, history-preserving — is scoped for a later phase. */
window.doRestore=async function(){
  if(!can.admin()){toast(window.t('errors.admin_only'),'err');return;}
  const msg='🔒 الاستعادة داخل المتصفح معطّلة لحماية البيانات.\n\n'
    +'كانت العملية تحذف كل السجلات ثم تعيد إدخالها دون معاملة واحدة، وأي فشل يترك '
    +'قاعدة البيانات فارغة نهائيًا. النسخ الاحتياطي (تصدير) ما زال يعمل.\n\n'
    +'للاستعادة الآمنة يرجى الرجوع إلى مسؤول النظام.';
  alert(msg);
  await logAction('restore','محاولة استعادة — العملية معطّلة لأسباب أمنية (P0)','system',null);
};


window.exportCSV=function(type){
  if(!can.export()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية التصدير','err');return;}
  let h,rows;
  if(type==='food-stmt'){
    const from=document.getElementById('food-stmt-from')?.value||'';
    const to=document.getElementById('food-stmt-to')?.value||'';
    const stmtRows=FIN.fundLedger('food',from,to,'');
    let bal=0;
    h=['التاريخ','الاسم','البيان','دائن ₪','مدين ₪','الرصيد ₪','ملاحظات'];
    const _en=window.LANG==='en';
    const summary=[
      [(_en?'Current Food Fund Balance':'رصيد صندوق الغداء الحالي'),'','',FinContract.foodBalance(),'','',''],
      [(_en?'Remaining Historical Deficit':'العجز التاريخي المتبقي'),'','',FinContract.foodDeficitRemaining(),'','',''],
      [mcLabel('reserve'),'','',FIN.foodSettlementReserve(),'','',''],
      [(_en?'Debt Settlement → Deficit (Q5)':'تسوية ذمم من تبرعات ← العجز (ق5)'),'','',FIN.foodDebtSettlementTotal(),'','',''],
      [(_en?'Net Food Fund Position':'صافي مركز صندوق الغداء'),'','',FinContract.foodNetPosition(),'','',''],
      ['','','','','','','']
    ];
    rows=[...summary,...stmtRows.map(r=>{bal+=r.cr-r.dr;return[fmtDate2(r.date),r.name,r.desc,r.cr||'',r.dr||'',bal,r.note||''];})];
  }else if(type==='diwan-stmt'){
    const from=document.getElementById('diwan-stmt-from')?.value||'';
    const to=document.getElementById('diwan-stmt-to')?.value||'';
    const stmtRows=FIN.fundLedger('diwan',from,to,'');
    let bal=0;
    h=['التاريخ','الاسم','البيان','دائن ₪','مدين ₪','الرصيد ₪','ملاحظات'];
    rows=stmtRows.map(r=>{bal+=r.cr-r.dr;return[fmtDate2(r.date),r.name,r.desc,r.cr||'',r.dr||'',bal,r.note||''];});
  }else if(type==='member-stmt'){
    /* V-01 FIX: use canonical FIN.memberStatement() — single source of truth (Phase 15) */
    const mid=document.getElementById('ms-member')?.value;
    const member=gm(mid);
    if(!member){toast(window.t('errors.select_member'),'warn');return;}
    h=['التاريخ','رقم السند','البيان','دائن ₪','مدين ₪','الرصيد ₪'];
    const st=FIN.memberStatement(mid);
    rows=st.rows.map(r=>[
      r.date==='—'?'—':r.date, r.no, r.desc,
      r.cr>0?r.cr:'', r.dr>0?r.dr:'', r.bal
    ]);
  }else if(type==='food-rec'){
    h=['رقم','التاريخ','الدافع','المبلغ ₪','العملة','طريقة الدفع','ملاحظات'];
    rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').map(r=>[r.no,r.receipt_date,r.payer_name||gmn(r.member_id),r.amount_ils||r.amount,r.currency,r.payment_method,r.notes]);
  }else if(type==='food-pay'){
    h=['رقم','التاريخ','المستفيد','المبلغ ₪','طريقة الصرف','ملاحظات'];
    rows=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').map(p=>[p.no,p.payment_date,p.beneficiary_name||gmn(p.member_id),p.amount_ils||p.amount,p.payment_method,p.notes]);
  }else if(type==='diwan-rec'){
    /* Domain 1 — surface the FE-004/FE-005 split on the diwan export too (additive column). */
    const _det=mt=>mt==='diwan_operational_income'?'إيراد تشغيلي':mt==='diwan_cash_donation'?'تبرع نقدي':'—';
    h=['رقم','التاريخ','نوع الحدث','الدافع','المبلغ ₪','العملة','طريقة الدفع','ملاحظات'];
    rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').map(r=>[r.no,r.receipt_date,_det(r.movement_type),r.payer_name||gmn(r.member_id),r.amount_ils||r.amount,r.currency,r.payment_method,r.notes]);
  }else if(type==='diwan-pay'){
    h=['رقم','التاريخ','المستفيد','المبلغ ₪','الفئة','ملاحظات'];
    rows=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='diwan').map(p=>[p.no,p.payment_date,p.beneficiary_name||gmn(p.member_id),p.amount_ils||p.amount,L.expense(p.expense_type),p.notes]);
  }else{
    h=['العملية','الوصف','المستخدم','التاريخ'];
    rows=DB.audit.map(a=>[a.action,a.description,a.user_name,a.created_at]);
  }
  const csv='\uFEFF'+[h,...rows].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=type+'_'+today()+'.csv';a.click();
  toast(window.t('messages.exported'),'ok');
};

/* ═══ MEMBER STATEMENT EXPORTS ═══ */
window.exportMemberStmt=function(format){
  if(!can.export()&&format!=='pdf'){toast(window.t?window.t('errors.no_permission'):'لا توجد صلاحية','err');return;}
  const mid=document.getElementById('ms-member')?.value;
  const member=gm(mid);
  if(!member){toast(window.t('errors.select_member'),'warn');return;}
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';
  const fd=from?new Date(from):null;
  const td=to?new Date(to):null;
  const inRange=d=>{if(!d||d==='—')return true;const dt=new Date(d);if(fd&&dt<fd)return false;if(td&&dt>td)return false;return true;};
  /* PHASE 11.5 — single balance engine (incl. capped prepaid credit row) */
  const _st=FIN.memberStatement(mid,from,to);
  const computed=_st.rows;
  const openBal=_st.openingBalance, totalDues=_st.totalDues, totalPaid=_st.totalPaid, finalBal=_st.finalBalance;
  const periodLabel=from&&to?`${from} - ${to}`:from?`\u0645\u0646 ${from}`:to?`\u062d\u062a\u0649 ${to}`:'\u0643\u0644 \u0627\u0644\u0641\u062a\u0631\u0627\u062a';
  const printDate=new Date().toLocaleDateString('en-GB');
  const fname=`member-stmt_${today()}`;

  /* CSV */
  if(format==='csv'){
    const h=['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062f','\u0627\u0644\u0628\u064a\u0627\u0646','\u062f\u0627\u0626\u0646 \u20aa','\u0645\u062f\u064a\u0646 \u20aa','\u0627\u0644\u0631\u0635\u064a\u062f \u20aa'];
    const body=computed.map(r=>[r.date==='—'?'—':r.date,r.no,r.desc,r.cr>0?r.cr:'',r.dr>0?r.dr:'',r.bal]);
    const csv='\uFEFF'+[h,...body].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=fname+'.csv';a.click();
    toast('\u2713 CSV exported','ok');return;
  }

  /* JSON */
  if(format==='json'){
    const payload={generated_at:new Date().toISOString(),member:{id:member.id,name:member.name,active_from_year:member.active_from_year},period:{from,to},summary:{opening_balance:openBal,total_dues:totalDues,total_paid:totalPaid,final_balance:finalBal},rows:computed.map(r=>({date:r.date,voucher_no:r.no,description:r.desc,credit:r.cr,debit:r.dr,running_balance:r.bal}))};
    const a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(payload,null,2));a.download=fname+'.json';a.click();
    toast('\u2713 JSON exported','ok');return;
  }

  /* EXCEL */
  if(format==='excel'){
    const _dons=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.member_id===mid&&r.movement_type!=='historical_debt_collection'&&inRange(r.receipt_date)); /* ق4 */
    const _alloc=FIN.allocateFoodDonations();
    const _donRows=[];
    if(_dons.length){
      _donRows.push([],['حركات التبرعات · Donation movements'],['التاريخ','رقم السند','تفصيل الحركة','المبلغ ₪']);
      _dons.forEach(d=>{
        let label;
        if(d.donation_display_fund==='food'){
          const sp=_alloc.perReceipt[d.id]||{debtSettled:0,toDeficit:0,toCurrent:0};
          const parts=[];
          if(sp.debtSettled>0) parts.push(mcLabel('debt')+' ₪'+fmt(sp.debtSettled));
          if(sp.toDeficit>0)   parts.push(mcLabel('deficit')+' ₪'+fmt(sp.toDeficit));
          if(sp.toCurrent>0)   parts.push(mcLabel('current')+' ₪'+fmt(sp.toCurrent));
          label=parts.join(' · ')||'تبرع';
        } else label='تبرع ديوان';
        _donRows.push([d.receipt_date,d.no,label,Number(d.amount_ils||d.amount||0)]);
      });
      _donRows.push(['تسوية الذمة تخفّض رصيد العضو · التبرعات الأخرى للشفافية فقط ولا تؤثّر على الرصيد']);
    }
    const doExcel=()=>{
      const XLSX=window.XLSX;if(!XLSX){toast('\u062c\u0627\u0631\u064f \u062a\u062d\u0645\u064a\u0644 \u0645\u0643\u062a\u0628\u0629 Excel...','info');return;}
      const wsData=[['\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 \u2014 \u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0636\u0648'],[`\u0627\u0644\u0639\u0636\u0648: ${member.name}${member.phone?'  |  \u260e '+member.phone:''}  |  \u0627\u0644\u0641\u062a\u0631\u0629: ${periodLabel}`],[],['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062f','\u0627\u0644\u0628\u064a\u0627\u0646','\u062f\u0627\u0626\u0646 \u20aa','\u0645\u062f\u064a\u0646 \u20aa','\u0627\u0644\u0631\u0635\u064a\u062f \u20aa'],...computed.map(r=>[r.date==='—'?'—':r.date,r.no,r.desc,r.cr>0?r.cr:'',r.dr>0?r.dr:'',r.bal]),[],['\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a','','',openBal,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a','','',totalDues,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a','','','',totalPaid,''],['\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a','','','','',finalBal],..._donRows];
      const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!cols']=[{wch:12},{wch:14},{wch:30},{wch:14},{wch:14},{wch:16}];ws['!rtl']=true;styleDiwanSheet(XLSX,ws,{headerRow:3,money:[3,4,5]});
      const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,'\u0643\u0634\u0641 \u0627\u0644\u062d\u0633\u0627\u0628');XLSX.writeFile(wb,fname+'.xlsx');
      toast('\u2713 Excel exported','ok');
    };
    loadStyledXLSX(doExcel);
    return;
  }

  /* Shared HTML template */
  const rowsHtml=computed.map(r=>{const balTxt='\u20aa '+fmt(Math.abs(r.bal))+(r.bal>0?' (\u0645\u062f\u064a\u0646)':r.bal<0?' (\u062f\u0627\u0626\u0646)':'');return '<tr><td>'+(r.date==='\u2014'?'\u2014':r.date)+'</td><td>'+esc(r.no)+'</td><td>'+esc(r.desc)+'</td>'+'<td>'+(r.dr>0?'<span class="dr">\u20aa '+fmt(r.dr)+'</span>':'\u2014')+'</td>'+'<td>'+(r.cr>0?'<span class="cr">\u20aa '+fmt(r.cr)+'</span>':'\u2014')+'</td>'+'<td class="bal">'+balTxt+'</td></tr>';}).join('');
  const finalTxt=FIN.balanceLabel(finalBal,true);
  const balCls=finalBal<=0?'pos':'neg';
  const htmlDoc='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'+'<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Reem+Kufi:wght@400;500;700&display=swap" rel="stylesheet">'+'<style>'+PRINT_TOKENS+'@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff;padding:10mm}</style></head><body>'+reportHeader('\u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0636\u0648',{sub:'\u0627\u0644\u0639\u0636\u0648: '+esc(member.name)})+'<div class="period">\u0627\u0644\u0641\u062a\u0631\u0629: '+periodLabel+' \u00b7 \u0646\u0627\u0634\u0637 \u0645\u0646 \u0633\u0646\u0629 '+(member.active_from_year||'\u2014')+'</div>'+'<div class="cards"><div class="card"><div class="k">\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a</div><div class="v">\u20aa '+fmt(openBal)+'</div></div>'+'<div class="card"><div class="k">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062d\u0642</div><div class="v neg">\u20aa '+fmt(totalDues)+'</div></div>'+'<div class="card"><div class="k">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639</div><div class="v pos">\u20aa '+fmt(totalPaid)+'</div></div>'+'<div class="card"><div class="k">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a</div><div class="v '+balCls+'">'+finalTxt+'</div></div></div>'+'<table class="dt"><thead><tr><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0645\u0631\u062c\u0639</th><th>\u0627\u0644\u0628\u064a\u0627\u0646</th><th>\u0645\u0633\u062a\u062d\u0642 (\u0645\u062f\u064a\u0646)</th><th>\u0645\u062f\u0641\u0648\u0639 (\u062f\u0627\u0626\u0646)</th><th>\u0627\u0644\u0631\u0635\u064a\u062f</th></tr></thead><tbody>'+rowsHtml+'<tr class="final"><td colspan="5">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u00b7 Final Balance</td><td class="'+balCls+'">'+finalTxt+'</td></tr></tbody></table>'+reportDfoot(null,'diwan-finance.com')+reportFooter({date:printDate,page:'\u0635\u0641\u062d\u0629 1 / 1'})+'</body></html>';

  /* HTML/PDF member-statement download now uses the SAME official print
     template as prtMemberStmt (unified \u2014 one layout, real file download). */
  if(format==='html'||format==='pdf'){ return window.prtMemberStmt('pdf'); }
};


/* ═══ UNIVERSAL PDF + EXCEL EXPORT ═══ */
window.exportPagePDF=function(type){
  if(type==='annual-debt') return window.prtAnnualDebt('pdf');
  if(type==='delinquent') return window.prtDelinquent('pdf');
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}'
  const printDate=new Date().toLocaleDateString('en-GB');
  const titles={
    'food-rec':['\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u063a\u062f\u0627\u0621','Food Fund Receipts'],
    'food-pay':['\u0645\u0635\u0627\u0631\u064a\u0641 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u063a\u062f\u0627\u0621','Food Fund Expenses'],
    'food-stmt':['\u0643\u0634\u0641 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u063a\u062f\u0627\u0621','Food Fund Statement'],
    'diwan-rec':['\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u062f\u064a\u0648\u0627\u0646','Diwan Fund Receipts'],
    'diwan-pay':['\u0645\u0635\u0627\u0631\u064a\u0641 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u062f\u064a\u0648\u0627\u0646','Diwan Fund Expenses'],
    'diwan-stmt':['\u0643\u0634\u0641 \u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u062f\u064a\u0648\u0627\u0646','Diwan Fund Statement'],
    'don':['\u0633\u062c\u0644 \u0627\u0644\u062a\u0628\u0631\u0639\u0627\u062a','Donations Registry'],
    'members':['\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0639\u0636\u0627\u0621','Members List'],
    'annual':['\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0633\u0646\u0648\u064a\u0629','Annual Subscriptions'],
    'users':['\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646','Users'],
    'audit':['\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a','Audit Log']
  };
  const t=titles[type]||[type,type];
  let tableHTML='';
  const fund=type.startsWith('food')?'food':'diwan';

  if(type==='food-rec'||type==='diwan-rec'){
    const d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund);
    let total=0;
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0631\u0642\u0645</th><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u062f\u0627\u0641\u0639</th><th>\u0627\u0644\u0645\u0628\u0644\u063a \u20aa</th><th>\u0627\u0644\u0637\u0631\u064a\u0642\u0629</th><th>\u0645\u0644\u0627\u062d\u0638\u0627\u062a</th></tr></thead><tbody>';
    d.sort((a,b)=>new Date(a.receipt_date)-new Date(b.receipt_date)).forEach(r=>{
      const amt=Number(r.amount_ils||r.amount||0);total+=amt;
      tableHTML+=`<tr><td>${esc(r.no)}</td><td>${r.receipt_date}</td><td>${esc(r.member_id?gmn(r.member_id):r.payer_name||'')}</td><td>\u20aa ${fmt(amt)}</td><td>${L.method(r.payment_method)}</td><td>${esc(r.notes||'')}</td></tr>`;
    });
    tableHTML+=`<tr class="final"><td colspan="3">\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a (${d.length} \u0625\u064a\u0635\u0627\u0644)</td><td>\u20aa ${fmt(total)}</td><td></td><td></td></tr></tbody></table>`;
  }
  else if(type==='food-pay'||type==='diwan-pay'){
    const d=DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund);
    let total=0;
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0631\u0642\u0645</th><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f</th><th>\u0627\u0644\u0645\u0628\u0644\u063a \u20aa</th><th>\u0627\u0644\u0641\u0626\u0629</th><th>\u0645\u0644\u0627\u062d\u0638\u0627\u062a</th></tr></thead><tbody>';
    d.sort((a,b)=>new Date(a.payment_date)-new Date(b.payment_date)).forEach(p=>{
      const amt=Number(p.amount_ils||p.amount||0);total+=amt;
      tableHTML+=`<tr><td>${esc(p.no)}</td><td>${p.payment_date}</td><td>${esc(p.beneficiary_name||gmn(p.member_id)||'')}</td><td>\u20aa ${fmt(amt)}</td><td>${L.expense(p.expense_type)}</td><td>${esc(p.notes||'')}</td></tr>`;
    });
    tableHTML+=`<tr class="final"><td colspan="3">\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a (${d.length} \u0633\u0646\u062f)</td><td>\u20aa ${fmt(total)}</td><td></td><td></td></tr></tbody></table>`;
  }
  else if(type==='food-stmt'||type==='diwan-stmt'){
    return window.downloadFundStatementPDF(fund);
  }
  else if(type==='don'){
    /* Domain 3 (\u00a74.2) \u2014 mirror prtDonStmt: the printed CASH total must never
       conflate the in-kind documentary value. Cash = non-in-kind; in-kind is
       summed and shown SEPARATELY, its rows labelled documentary. */
    const d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
    const _ink=r=>r.movement_type==='donation_inkind';
    let cashTot=0,inkTot=0;
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0631\u0642\u0645</th><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0645\u062a\u0628\u0631\u0639</th><th>\u0627\u0644\u0645\u0628\u0644\u063a \u20aa</th><th>\u064a\u0638\u0647\u0631 \u0641\u064a</th><th>\u0645\u0644\u0627\u062d\u0638\u0627\u062a</th></tr></thead><tbody>';
    d.forEach(r=>{
      const amt=Number(r.amount_ils||r.amount||0); if(_ink(r))inkTot+=amt; else cashTot+=amt;
      const dir=_ink(r)
        ? (window.LANG==='en'?'In-kind/Service \u00b7 documentary':'\u0639\u064a\u0646\u064a/\u062e\u062f\u0645\u064a \u00b7 \u062a\u0648\u062b\u064a\u0642\u064a')+(r.register_category?' ('+esc(r.register_category)+')':'')
        : (r.donation_display_fund||'')+(r.donation_display_fund==='food'?(r.food_donation_allocation==='reduce_deficit'?' \u00b7 '+(window.LANG==='en'?'Deficit Settlement':'\u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u0639\u062c\u0632'):r.food_donation_allocation==='support_current'?' \u00b7 '+(window.LANG==='en'?'Current Support':'\u062f\u0639\u0645 \u062d\u0627\u0644\u064a'):''):'');
      tableHTML+=`<tr><td>${esc(r.no)}</td><td>${r.receipt_date}</td><td>${esc(r.payer_name||gmn(r.member_id)||'')}</td><td>\u20aa ${fmt(amt)}</td><td>${dir}</td><td>${esc(r.notes||'')}</td></tr>`;
    });
    tableHTML+=`<tr class="final"><td colspan="3">${window.LANG==='en'?'Cash Total (in-kind excluded \u2014 \u00a74.2)':'\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0646\u0642\u062f\u064a (\u0627\u0644\u0639\u064a\u0646\u064a \u0645\u0633\u062a\u0628\u0639\u064e\u062f \u2014 \u00a74.2)'}</td><td>\u20aa ${fmt(cashTot)}</td><td>${window.LANG==='en'?'in-kind: \u20aa':'\u0639\u064a\u0646\u064a \u062a\u0648\u062b\u064a\u0642\u064a: \u20aa'} ${fmt(inkTot)}</td><td></td></tr></tbody></table>`;
  }
  else if(type==='members'){
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0627\u0633\u0645</th><th>\u0627\u0644\u0647\u0627\u062a\u0641</th><th>\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0638\u0627\u0645</th><th>\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a</th></tr></thead><tbody>';
    DB.members.filter(m=>m.is_active!==false).forEach(m=>{
      const bal=FIN.memberBalance(m.id);
      tableHTML+=`<tr><td>${esc(m.name)}</td><td>${m.phone||''}</td><td>\u20aa ${fmt(m.historical_balance_ils||0)}</td><td class="bal">\u20aa ${fmt(bal)}</td></tr>`;
    });
    tableHTML+='</tbody></table>';
  }
  else if(type==='annual'){
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0633\u0646\u0629</th><th>\u0627\u0644\u0645\u0628\u0644\u063a</th><th>\u0639\u062f\u062f \u0627\u0644\u0623\u0639\u0636\u0627\u0621</th><th>\u0637\u064f\u0628\u0642 \u0628\u0648\u0627\u0633\u0637\u0629</th><th>\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0637\u0628\u064a\u0642</th></tr></thead><tbody>';
    DB.annual.forEach(a=>{
      tableHTML+=`<tr><td>${a.year}</td><td>\u20aa ${fmt(a.amount)}</td><td>${a.member_count}</td><td>${esc(a.applied_by||'')}</td><td>${a.applied_at?.slice(0,10)||''}</td></tr>`;
    });
    tableHTML+='</tbody></table>';
  }
  else if(type==='audit'){
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0625\u062c\u0631\u0627\u0621</th><th>\u0627\u0644\u0648\u0635\u0641</th><th>\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645</th><th>\u0627\u0644\u062c\u062f\u0648\u0644</th></tr></thead><tbody>';
    DB.audit.slice(0,200).forEach(a=>{
      tableHTML+=`<tr><td style="white-space:nowrap">${a.created_at?.slice(0,10)||''}</td><td>${esc(a.action)}</td><td>${esc(a.description||'')}</td><td>${esc(a.user_name||'')}</td><td>${esc(a.table_name||'')}</td></tr>`;
    });
    tableHTML+='</tbody></table>';
  }
  else if(type==='users'){
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0628\u0631\u064a\u062f</th><th>\u0627\u0644\u062f\u0648\u0631</th></tr></thead><tbody>';
    (DB.users||[]).forEach(u=>{
      tableHTML+=`<tr><td>${esc(u.email)}</td><td>${u.role==='admin'?'\u0645\u062f\u064a\u0631':'\u0645\u0634\u0627\u0647\u062f'}</td></tr>`;
    });
    tableHTML+='</tbody></table>';
  }

  const body=reportHeader(t[0],{sub:t[1]})+'<div class="period">\u0637\u064f\u0628\u0639: '+printDate+'</div>'+tableHTML+reportDfoot('https://www.diwan-finance.com','diwan-finance.com')+reportFooter({date:printDate});
  savePrintPDF(css, body, (type||'export')+'-'+today(), 'landscape');
};

/* Universal Excel Export */
window.exportPageExcel=function(type){
  if(!can.export()){toast('\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0629','err');return;}
  if(type==='delinquent') return window.exportDelinquentExcel();
  const fund=type.startsWith('food')?'food':'diwan';
  let wsData=[];
  const fname='diwan-'+type+'-'+today();

  if(type==='food-rec'||type==='diwan-rec'){
    const d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund);
    wsData=[['#','\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0627\u0644\u062f\u0627\u0641\u0639','\u0627\u0644\u0645\u0628\u0644\u063a','\u0627\u0644\u0637\u0631\u064a\u0642\u0629','\u0645\u0644\u0627\u062d\u0638\u0627\u062a']];
    d.forEach(r=>wsData.push([r.no,r.receipt_date,r.member_id?gmn(r.member_id):r.payer_name||'',Number(r.amount_ils||r.amount||0),L.method(r.payment_method),r.notes||'']));
  }
  else if(type==='food-pay'||type==='diwan-pay'){
    const d=DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund);
    wsData=[['#','\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f','\u0627\u0644\u0645\u0628\u0644\u063a','\u0627\u0644\u0641\u0626\u0629','\u0645\u0644\u0627\u062d\u0638\u0627\u062a']];
    d.forEach(p=>wsData.push([p.no,p.payment_date,p.beneficiary_name||gmn(p.member_id)||'',Number(p.amount_ils||p.amount||0),L.expense(p.expense_type),p.notes||'']));
  }
  else if(type==='don'){
    const d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
    wsData=[['#','\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0627\u0644\u0645\u062a\u0628\u0631\u0639','\u0627\u0644\u0645\u0628\u0644\u063a','\u064a\u0638\u0647\u0631 \u0641\u064a','\u0645\u0644\u0627\u062d\u0638\u0627\u062a']];
    /* Domain 3 (Display Principle) — mark in-kind rows as documentary, never blank/cash. */
    d.forEach(r=>wsData.push([r.no,r.receipt_date,r.payer_name||gmn(r.member_id)||'',Number(r.amount_ils||r.amount||0),
      r.movement_type==='donation_inkind'
        ? (window.LANG==='en'?'In-kind/Service · documentary':'عيني/خدمي · توثيقي')+(r.register_category?' ('+r.register_category+')':'')
        : (r.donation_display_fund||'')+(r.donation_display_fund==='food'?(r.food_donation_allocation==='reduce_deficit'?' · '+(window.LANG==='en'?'Deficit Settlement':'تسوية العجز'):r.food_donation_allocation==='support_current'?' · '+(window.LANG==='en'?'Current Support':'دعم حالي'):''):''),
      r.notes||'']));
  }
  else if(type==='members'){
    wsData=[['\u0627\u0644\u0627\u0633\u0645','\u0627\u0644\u0647\u0627\u062a\u0641','\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0638\u0627\u0645','\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a']];
    DB.members.filter(m=>m.is_active!==false).forEach(m=>wsData.push([m.name,m.phone||'',Number(m.historical_balance_ils||0),FIN.memberBalance(m.id)]));
  }
  else if(type==='annual'){
    wsData=[['\u0627\u0644\u0633\u0646\u0629','\u0627\u0644\u0645\u0628\u0644\u063a','\u0639\u062f\u062f \u0627\u0644\u0623\u0639\u0636\u0627\u0621','\u0637\u064f\u0628\u0642 \u0628\u0648\u0627\u0633\u0637\u0629','\u0627\u0644\u062a\u0627\u0631\u064a\u062e']];
    DB.annual.forEach(a=>wsData.push([a.year,a.amount,a.member_count,a.applied_by||'',a.applied_at?.slice(0,10)||'']));
  }
  else if(type==='annual-debt'){
    wsData=[_adHead()];
    annualDebtRows().forEach(r=>wsData.push([r.code,r.name,r.phone||'',Number(r.opening||0),Number(r.dues||0),Number(r.paid||0),Number(r.current||0)]));
  }
  else if(type==='audit'){
    wsData=[['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0627\u0644\u0625\u062c\u0631\u0627\u0621','\u0627\u0644\u0648\u0635\u0641','\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645','\u0627\u0644\u062c\u062f\u0648\u0644']];
    DB.audit.forEach(a=>wsData.push([a.created_at?.slice(0,10)||'',a.action,a.description||'',a.user_name||'',a.table_name||'']));
  }

  const doExcel=()=>{
    const XLSX=window.XLSX;if(!XLSX){toast('\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644...','info');return;}
    const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!rtl']=true;
    const moneyMap={receipts:[3],payments:[3],donation:[3],'food-rec':[3],'diwan-rec':[3],'food-pay':[3],'diwan-pay':[3],don:[3],members:[3,4],annual:[1],'annual-debt':[3,4,5,6],audit:[],users:[]};
    const colW={receipts:[10,12,26,14,16,24],payments:[10,12,26,14,16,24],donation:[10,12,26,14,16,24],'food-rec':[10,12,26,14,16,24],'diwan-rec':[10,12,26,14,16,24],'food-pay':[10,12,26,14,16,24],'diwan-pay':[10,12,26,14,16,24],don:[10,12,26,14,16,24],members:[26,16,12,14,16],annual:[10,14,16,18,14],'annual-debt':[14,28,14,14,16,14,18],audit:[14,12,30,18,14],users:[26,14,14]};
    if(colW[type])ws['!cols']=colW[type].map(w=>({wch:w}));
    styleDiwanSheet(XLSX,ws,{headerRow:0,money:(moneyMap[type]||[])});
    const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,'\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a');
    XLSX.writeFile(wb,fname+'.xlsx');
    toast('\u2713 Excel','ok');
  };
  loadStyledXLSX(doExcel);
};

/* Toggle export dropdown */
window.togglePageExport=function(e,menuId){
  e.stopPropagation();
  document.querySelectorAll('.export-dropdown-menu').forEach(m=>{if(m.id!==menuId)m.classList.remove('show');});
  var m=document.getElementById(menuId);if(m)m.classList.toggle('show');
};
document.addEventListener('click',function(){document.querySelectorAll('.export-dropdown-menu').forEach(m=>m.classList.remove('show'));});



/* ═══ SESSION TIMEOUT · DOUBLE SUBMISSION GUARD · CLOCK · ENTER KEY NAVIGATION ═══
   (extracted to /js/ui-infra.js — Phase B Module 3) */

/* ═══ FORGOT PASSWORD ═══ (extracted to /js/auth.js — Phase B Module 5) */

/* ═══ TOPBAR STYLE FIXES ═══
 * - System title: white/green color to match dark navbar background
 * - Email cell: wider to fit full email without truncation
 * - Clock: always English digits, larger font
 * - Rate display: always English digits
 * ═══════════════════════════════════════════════════════════ */
function applyTopbarStyles(){
  /* ── System title color ── */
  const titleEl=document.getElementById('app-title')||document.querySelector('.app-title,.sys-title,.brand-title,[id*="title"],[class*="brand"]');
  if(titleEl){
    titleEl.style.color='';
    titleEl.style.textShadow='';
  }
  /* Fallback: target any element whose text contains the app name */
  document.querySelectorAll('.navbar *,.topbar *,.header *,.top-bar *').forEach(el=>{
    if(el.children.length===0 && el.textContent.includes('نظام الإدارة المالية')){
      el.style.color='';
      el.style.fontWeight='600';
    }
  });

  /* ── Email/name cell: wider + no truncation ── */
  const unameEl=document.getElementById('uname');
  if(unameEl){
    unameEl.style.maxWidth='none';
    unameEl.style.overflow='visible';
    unameEl.style.whiteSpace='nowrap';
    unameEl.style.minWidth='180px';
    /* Parent cell */
    const parent=unameEl.closest('.user-info,.uinfo,[class*="user"]');
    if(parent){
      parent.style.minWidth='200px';
      parent.style.maxWidth='300px';
      parent.style.overflow='visible';
    }
  }

  /* ── Clock: always English, bigger ── */
  const clockEl=document.getElementById('clock');
  if(clockEl){
    clockEl.style.fontSize='14px';
    clockEl.style.fontWeight='600';
    clockEl.style.letterSpacing='0.5px';
    clockEl.style.fontVariantNumeric='tabular-nums';
    clockEl.style.fontFamily='var(--fmono)';
  }

  /* ── Rate display: enforce en-US numerals ── */
  const rateEl=document.getElementById('rate-txt');
  if(rateEl){
    rateEl.style.fontFamily='var(--fmono)';
    rateEl.style.fontVariantNumeric='tabular-nums';
  }
}

/* ── LOGIN PAGE TRANSLATION ── */
function applyLoginLang(){
  const isEn = window.LANG==='en';
  const ids = {
    'lbl-email': isEn?'Phone Number or Email Address':'رقم الهاتف أو البريد الإلكتروني',
    'lbl-pass': isEn?'Password':'كلمة المرور',
    'lbl-remember': isEn?'Remember me':'تذكرني',
    'btn-forgot': isEn?'Forgot password?':'نسيت كلمة المرور؟',
    'btn-login-txt': isEn?'Sign In':'تسجيل الدخول',
    'login-lang-txt': isEn?'AR':'EN',
  };
  Object.entries(ids).forEach(([id,txt])=>{
    const el=document.getElementById(id);
    if(el)el.textContent=txt;
  });
  const lEmail=document.getElementById('l-email');
  if(lEmail)lEmail.placeholder=isEn?'Enter your phone number or email address':'أدخل رقم الهاتف أو البريد الإلكتروني';
  const lPass=document.getElementById('l-pass');
  if(lPass)lPass.placeholder=isEn?'••••••••':'••••••••';
  const loginBtn=document.getElementById('login-btn');
  if(loginBtn)loginBtn.innerHTML=`<i class="ti ti-login"></i><span id="btn-login-txt">${isEn?'Sign In':'تسجيل الدخول'}</span>`;
}

/* ═══ CHANGE PASSWORD ═══ (extracted to /js/auth.js — Phase B Module 5) */

/* ═══ MOBILE NAVIGATION ═══ (extracted to /js/ui-infra.js — Phase B Module 3) */

/* ═══ SETTINGS & OPENING BALANCES ═══ */
/* loadSettings() — extracted to /js/data.js (Phase B Module 4) */

window.saveSettings = async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط يمكنه تعديل الإعدادات','err');return;}
  const foodOpening  = parseFloat(document.getElementById('set-food-opening')?.value)  || 0;
  const diwanOpening = parseFloat(document.getElementById('set-diwan-opening')?.value) || 0;
  const usdRate      = parseFloat(document.getElementById('set-usd-rate')?.value)      || 3.70;
  const jodRate      = parseFloat(document.getElementById('set-jod-rate')?.value)      || 5.00;
  const fOpUsd=parseFloat(document.getElementById('set-food-opening-usd')?.value)||0;
  const fOpJod=parseFloat(document.getElementById('set-food-opening-jod')?.value)||0;
  const dOpUsd=parseFloat(document.getElementById('set-diwan-opening-usd')?.value)||0;
  const dOpJod=parseFloat(document.getElementById('set-diwan-opening-jod')?.value)||0;
  const updates = [
    {key:'food_opening_balance',  value: String(foodOpening)},
    {key:'diwan_opening_balance', value: String(diwanOpening)},
    {key:'food_opening_usd', value: String(fOpUsd)},
    {key:'food_opening_jod', value: String(fOpJod)},
    {key:'diwan_opening_usd', value: String(dOpUsd)},
    {key:'diwan_opening_jod', value: String(dOpJod)},
    {key:'usd_rate',  value: String(usdRate)},
    {key:'jod_rate',  value: String(jodRate)},
  ];
  for(const u of updates){
    await SB.from('settings').upsert({key:u.key, value:u.value, updated_at:new Date().toISOString()});
  }
  window.FOOD_OPENING  = foodOpening;
  window.DIWAN_OPENING = diwanOpening;
  window.FOOD_OPENING_USD=fOpUsd;window.FOOD_OPENING_JOD=fOpJod;
  window.DIWAN_OPENING_USD=dOpUsd;window.DIWAN_OPENING_JOD=dOpJod;
  RATES.USD = usdRate;
  RATES.JOD = jodRate;
  await logAction('edit',`تحديث الإعدادات — رصيد الغداء: ₪${fmt(foodOpening)} | رصيد الديوان: ₪${fmt(diwanOpening)}`,'settings',null);
  /* P0 — opening balances feed the allocation kernel; drop the memoized result
     so FIN.allocateFoodDonations() recomputes against the new openings. */
  DB._alloc=null;
  renderSettingsSummary();
  updateRateDisplay();
  renderDash();
  toast('✓ '+window.t('messages.settings_saved'),'ok');
};

function renderSettingsSummary(){
  const summaryCard = document.getElementById('settings-summary');
  const summaryEl   = document.getElementById('settings-bal-summary');
  if(!summaryCard||!summaryEl) return;
  summaryCard.style.display = '';
  const foodOp = FinContract.foodBalance();          /* operational only */
  const foodRemDeficit = FinContract.foodDeficitRemaining();  /* live remaining deficit, shown separately */
  const diwanBal = FinContract.diwanBalance();        /* unchanged: opening + movements */
  summaryEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
      <div class="kpi food" style="padding:14px">
        <div class="kpi-lbl">صندوق الغداء (تشغيلي)</div>
        <div class="kpi-val">₪ ${fmt(foodOp)}</div>
        <div class="kpi-sub">العجز التاريخي المتبقي: ₪${fmt(foodRemDeficit)}</div>
      </div>
      <div class="kpi diwan" style="padding:14px">
        <div class="kpi-lbl">صندوق الديوان (مع الافتتاحي)</div>
        <div class="kpi-val">₪ ${fmt(diwanBal)}</div>
        <div class="kpi-sub">افتتاحي ₪${fmt(window.DIWAN_OPENING||0)} + حركات (مشمول في الرصيد)</div>
      </div>
    </div>
  `;
}

/* ═══ DATA PROTECTION ═══ */
let _dataProtectionWired=false;
function applyDataProtection(){
  const role=CUR?.role||'viewer';
  if(role==='viewer'){
    /* Leak fix: runs on every viewer login — attach the protection listeners
       once per page lifetime instead of stacking 4 more each login.
       (As before, they stay active until reload once a viewer has logged in.) */
    if(_dataProtectionWired) return;
    _dataProtectionWired=true;
    document.addEventListener('contextmenu',e=>e.preventDefault());
    document.addEventListener('copy',e=>{e.preventDefault();toast(window.t?window.t('errors.no_permission'):'غير مسموح بالنسخ','warn');});
    document.addEventListener('cut',e=>e.preventDefault());
    document.addEventListener('selectstart',e=>{
      if(!['INPUT','TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
    });
    /* Watermark removed — viewer sees clean UI */
  }
}
function addWatermark(){
  const wm=document.createElement('div');
  wm.id='watermark';
  const name=CUR?.full_name||CU?.email||'viewer';
  const now=new Date();
  const dt=now.toLocaleDateString('en-US')+' '+now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  wm.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:9998;display:flex;align-items:center;justify-content:center;overflow:hidden`;
  wm.innerHTML=`<div style="transform:rotate(-35deg);font-size:24px;font-weight:700;color:rgba(0,0,0,.04);white-space:nowrap;user-select:none;letter-spacing:.1em;text-align:center;line-height:3">${esc(name)}<br>${esc(dt)}<br>${esc(name)}<br>${esc(dt)}</div>`;
  document.body.appendChild(wm);
}

/* ═══ INIT ═══ */
(function(){
  const ls=document.getElementById('login-screen');
  if(ls) ls.setAttribute('data-force-light','1');
})();

async function init(){
  const{createClient}=supabase;
  window.__SB_URL='https://ralifvemgapmsgrjgazh.supabase.co';
  window.__SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4';
  SB=createClient(window.__SB_URL,window.__SB_ANON);
  document.getElementById('app').style.display='none';
  await checkSession();
}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&document.getElementById('ov')?.classList.contains('on')){
    window.closeM();
  }
});

init();

/* ═══════════════════════════════════════════════════════════════
 * SECURITY SEAL — Wrap all restricted functions so that even a
 * viewer who calls them from the browser DevTools console gets
 * blocked with a toast and no action is taken.
 * Runs after init() so the functions are already defined.
 * ═══════════════════════════════════════════════════════════════ */
(function sealRestrictedFunctions(){
  const PRINT_FNS =['prtRec','prtPay','prtStmt','prtMemberStmt','prtDonStmt','exportPDF'];
  const EXPORT_FNS=['exportCSV','doBackup'];
  const WRITE_FNS =['saveRec','savePay','saveMember','updateRec','updatePay',
                    'deleteRec','deletePay','updateMember','deleteMember',
                    'applyAnnualDue','saveSettings','inviteUser','changeRole',
                    'uploadAttach','deleteAttach'];

  function seal(name, checkFn, labelAr, labelEn){
    const orig = window[name];
    if(typeof orig !== 'function') return;
    window[name] = function(...args){
      if(!checkFn()){
        toast(window.LANG==='ar'? labelAr : labelEn, 'err');
        console.warn('[SECURITY] Blocked call to '+name+' — insufficient role.');
        return;
      }
      return orig.apply(this, args);
    };
  }

  PRINT_FNS.forEach(fn => seal(fn,
    can.print,
    'ليس لديك صلاحية الطباعة',
    'No print permission'));

  EXPORT_FNS.forEach(fn => seal(fn,
    can.export,
    'ليس لديك صلاحية التصدير',
    'No export permission'));

WRITE_FNS.forEach(fn => seal(fn,
    can.write,
    'ليس لديك صلاحية',
    'No permission'));
})();
