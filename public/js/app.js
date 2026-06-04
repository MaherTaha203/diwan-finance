'use strict';
/* ═══ STATE ═══ */
let SB=null,CU=null,CUR=null;
const DB={receipts:[],payments:[],members:[],contacts:[],annual:[],audit:[]};
const RATES={ILS:1,USD:3.7,JOD:5.0};
window.FOOD_OPENING=0;
window.DIWAN_OPENING=0;
const PSZ=20,PS={};

/* ── ROLE MODEL: admin | viewer ONLY ── */
const ROLES={admin:'مدير',viewer:'عارض'};

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
      color : '#2563EB'
    };
  }

  return {
    text: L.paid(),
    cls : 'green',
    color : '#00C896'
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

/* ═══ FINANCIAL ENGINE ═══ */
const FIN={

  memberBalance(memberId){

    const member = DB.members.find(m => m.id === memberId);

    if(!member) return 0;

    const openingBalance = Number(member.opening_balance || 0);

    const paid = DB.receipts
      .filter(r =>
        !r.is_deleted &&
        r.fund_type === 'food' &&
        r.member_id === memberId
      )
      .reduce((s,r)=>s + Number(r.amount_ils || r.amount || 0),0);

    const dues = DB.annual
      .filter(a =>
        !member.active_from_year ||
        a.year >= member.active_from_year
      )
      .reduce((s,a)=>s + Number(a.amount || 0),0);

    return openingBalance + dues - paid;
  },

  foodBalance(){
    const opening=Number(window.FOOD_OPENING||0);
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    return opening+income-expense;
  },
  diwanBalance(){
    const opening=Number(window.DIWAN_OPENING||0);
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='diwan').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    return opening+income-expense;
  },
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
      DB.receipts.filter(r=>!r.is_deleted&&r.fund_type===fund&&inRange(r.receipt_date))
        .forEach(r=>rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:r.notes||'إيصال قبض',cr:Number(r.amount_ils||r.amount),dr:0,type:'cr',id:r.id,no:r.no}));
    }
    if(!typeFilter||typeFilter==='dr'){
      DB.payments.filter(p=>!p.is_deleted&&p.fund_type===fund&&inRange(p.payment_date))
        .forEach(p=>rows.push({date:p.payment_date,name:p.beneficiary_name||gmn(p.member_id),desc:L.expense(p.expense_type),cr:0,dr:Number(p.amount_ils||p.amount),type:'dr',id:p.id,no:p.no}));
    }
    if(!typeFilter||typeFilter==='don'){
      DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.donation_display_fund===fund&&inRange(r.receipt_date))
        .forEach(r=>rows.push({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),desc:'تبرع',cr:0,dr:0,type:'don',id:r.id,no:r.no,note:`تبرع ₪${fmt(r.amount_ils||r.amount)} — ${r.notes||''}`}));
    }
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    return rows;
  },
};

/* ═══ UTILS ═══ */
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Math.round(Number(n||0)).toLocaleString('en-US');
const fmtEN=n=>Math.round(Number(n||0)).toLocaleString('en-US');
const fmtDEN=n=>Number(n||0).toFixed(2);
const fmtD=n=>Number(n||0).toFixed(2);
const fdate=d=>{if(!d)return'—';try{const dt=new Date(d);return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();}catch(e){return d;}};
const gm=id=>DB.members.find(m=>m.id===id);
const gmn=id=>gm(id)?.name||'—';
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nextNo=(prefix,arr)=>prefix+'-'+String(arr.filter(x=>x.no?.startsWith(prefix)).length+1).padStart(5,'0');

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


/* ═══ EXCHANGE RATES ═══ */
async function fetchRates(){
  try{
    // استدعاء Edge Function لتحديث الأسعار
    await fetch(
      'https://ralifvemgapmsgrjgazh.supabase.co/functions/v1/super-function',
      {
        method:'POST',
        headers:{
          'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4',
          'Content-Type':'application/json'
        }
      }
    );
  }catch(e){console.warn('Edge function failed',e);}

  // اقرأ الأسعار المحدّثة من Supabase
  try{
    const{data}=await SB.from('settings').select('key,value')
      .in('key',['usd_rate','jod_rate']);
    if(data){
      data.forEach(s=>{
        if(s.key==='usd_rate'&&parseFloat(s.value)>0)RATES.USD=parseFloat(s.value);
        if(s.key==='jod_rate'&&parseFloat(s.value)>0)RATES.JOD=parseFloat(s.value);
      });
    }
  }catch(e){console.warn('fetchRates error',e);}

  updateRateDisplay();
}
function updateRateDisplay(){
  const el=document.getElementById('rate-txt');
  if(el) el.textContent='$'+RATES.USD.toFixed(2)+' | JOD '+RATES.JOD.toFixed(2);
}
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
/* ═══ PAGINATION ═══ */
function mkPag(key,total){
  if(!PS[key]) PS[key]=1;
  const pages=Math.max(1,Math.ceil(total/PSZ));
  PS[key]=Math.min(PS[key],pages);
  const cur=PS[key];
  const el=document.getElementById(key+'-pag');
  if(!el) return;
  const shown=Math.min(PSZ,total-(cur-1)*PSZ);
  let h=`<span class="pi">${L.showing(shown,total)}</span>`;
  h+=`<button class="pb" onclick="gp('${key}',${cur-1})" ${cur<=1?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
  for(let i=Math.max(1,cur-2);i<=Math.min(pages,cur+2);i++)
    h+=`<button class="pb${i===cur?' on':''}" onclick="gp('${key}',${i})">${i}</button>`;
  h+=`<button class="pb" onclick="gp('${key}',${cur+1})" ${cur>=pages?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
  el.innerHTML=h;
}
window.gp=(k,p)=>{PS[k]=p;D[k]?.render();};

/* ═══ NAVIGATION ═══ */
window.nav=function(p){
  /* Block viewer from accessing restricted pages — even via DevTools console */
  const ADMIN_PAGES=['audit','bk','users','settings','annual'];
  if(ADMIN_PAGES.includes(p)&&!can.admin()){
    toast(window.LANG==='ar'?'ليس لديك صلاحية الوصول لهذه الصفحة':'Access denied','err');
    return;
  }
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+p)?.classList.add('on');
  document.querySelector(`.nb[data-p="${p}"]`)?.classList.add('on');
  document.querySelector('.main')?.scrollTo(0,0);
  if(p==='audit') renderAudit();
  if(p==='users') loadUsers();
  if(p==='bk') renderSysInfo();
  if(p==='annual') renderAnnual();
  if(p==='member-stmt') fillMemberSelect();
  D[p]?.render();
};
document.querySelectorAll('.nb[data-p]').forEach(el=>el.addEventListener('click',()=>window.nav(el.dataset.p)));

/* ═══ THEME ═══ */
window.toggleTheme=function(){
  document.body.classList.toggle('light');
  const isLight=document.body.classList.contains('light');
  const b=document.getElementById('theme-btn');
  if(b){
    const lbl=isLight?(window.LANG==='en'?'Dark':'داكن'):(window.LANG==='en'?'Light':'فاتح');
    const ico=isLight?'ti-moon':'ti-sun';
    b.innerHTML=`<i class="ti ${ico}"></i>${lbl}`;
  }
  localStorage.setItem('diwan_theme',isLight?'light':'dark');
};

/* ═══ AUTH ═══ */
window.login=async function(){
  let input=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  const btn=document.getElementById('login-btn');
  const err=document.getElementById('login-err');
  if(!input||!pass){
    showLoginErr(window.LANG==='en'?'Please enter your phone/email and password':'يرجى إدخال رقم الهاتف أو البريد وكلمة المرور');
    return;
  }
  const isPhone=/^[0-9+\s\-]{7,15}$/.test(input.replace(/\s/g,''));
  if(isPhone){
    const phone=input.replace(/[\s\-]/g,'');
    input=phone+'@diwan-fainance.com';
  }
  btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  err.classList.remove('show');
  const{data,error}=await SB.auth.signInWithPassword({email:input,password:pass});
  if(error){showLoginErr(window.t?window.t('login.wrong_credentials'):'بريد إلكتروني أو كلمة مرور غير صحيحة');btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>تسجيل الدخول';return;}
  CU=data.user;
  await afterLogin();
};
function showLoginErr(msg){const el=document.getElementById('login-err');el.textContent=msg;el.classList.add('show');}

async function afterLogin(){
  const{data:role}=await SB.from('user_roles').select('*').eq('user_id',CU.id).single();
  /* Enforce two-role model: any unrecognised role defaults to viewer */
  const rawRole=role?.role;
  const safeRole=(rawRole==='admin')?'admin':'viewer';
  CUR={...(role||{}),role:safeRole,full_name:role?.full_name||CU.email};

  const ini=(CUR.full_name||CU.email).charAt(0).toUpperCase();
  document.getElementById('uav').textContent=ini;
  document.getElementById('uav').className='uav '+CUR.role;
  document.getElementById('uname').textContent=CUR.full_name||CU.email;
  document.getElementById('urole').textContent=ROLES[CUR.role]||CUR.role;
  applyPerms();
  applyTopbarStyles();
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  const savedTheme=localStorage.getItem('diwan_theme')||'light';
  if(savedTheme==='light'){
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
  window.LANG = localStorage.getItem('diwan_lang')||'ar';
if(typeof window.applyLang === 'function'){
  window.applyLang();
}else{
  console.warn('applyLang not ready yet');
}
  await loadSettings();
  await fetchRates();
  await loadAll();
  startClock();
  initMobile();
  applyDataProtection();
  applyLoginLang();
}

window.logout=async function(){
  await SB.auth.signOut();CU=null;CUR=null;
  Object.keys(DB).forEach(k=>DB[k]=[]);
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('l-pass').value='';
  document.getElementById('l-email').value='';
  const btn=document.getElementById('login-btn');
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>تسجيل الدخول';}
  toast(window.t?window.t('messages.logged_out'):'تم تسجيل الخروج','info');
};

function applyPerms(){
  const w=can.write(),a=can.admin();

  /* ══════════════════════════════════════════════════
   * VIEWER LOCKDOWN — inject a global CSS rule that
   * hides every print / export / import element whose
   * id or class contains a known keyword.
   * This runs before any dynamic render so no button
   * can flash visible even for a frame.
   * ══════════════════════════════════════════════════ */
  if(!a){
    if(!document.getElementById('__viewer-style')){
      const s=document.createElement('style');
      s.id='__viewer-style';
      /* Hide by id-fragment, class-fragment, or data-attribute */
      s.textContent=`
        /* Print buttons */
        [id*="btn-prt"],[id*="prt-btn"],[id*="print"],
        [class*="btn-print"],[class*="print-btn"],
        button[onclick*="prt"],[data-requires-print],
        /* Export / CSV / PDF / Excel / Backup buttons */
        [id*="export"],[id*="csv"],[id*="excel"],[id*="backup"],
        [id*="download"],[id*="pdf-btn"],
        [class*="btn-export"],[class*="export-btn"],
        button[onclick*="export"],[data-requires-export],
        button[onclick*="exportCSV"],button[onclick*="exportPDF"],
        button[onclick*="doBackup"],
        /* Import buttons */
        [id*="import"],[class*="btn-import"],
        button[onclick*="import"] {
          display: none !important;
        }
      `;
      document.head.appendChild(s);
    }
  } else {
    /* Remove restriction style if admin is logged in */
    document.getElementById('__viewer-style')?.remove();
  }

  /* ── Write-gated buttons (desktop) ── */
  ['btn-food-rec','btn-diwan-rec','btn-don','btn-food-pay','btn-diwan-pay','btn-add-member',
   'dash-btn-rec','dash-btn-pay'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=w?'':'none';
  });

  /* ── Admin-only nav items (desktop + mobile) ── */
  /* Users, Settings, Annual Dues, Audit Log, Backup — admin only */
  ['nb-users','nb-settings','nb-audit','nb-bk'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=a?'':'none';
  });
  ['mnb-users-mob','mnb-settings','mnb-audit','mnb-bk'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=a?'':'none';
  });
  /* Also hide by data-p selectors for any nav buttons using those pages */
  ['audit','bk'].forEach(p=>{
    document.querySelectorAll(`.nb[data-p="${p}"],.mnb[data-p="${p}"]`).forEach(el=>el.style.display=a?'':'none');
  });

  /* ── Annual dues nav (admin only) ── */
  const na=document.querySelector('.nb[data-p="annual"]');if(na)na.style.display=a?'':'none';
  const naMob=document.getElementById('mnb-annual');if(naMob)naMob.style.display=a?'':'none';

  /* ── If viewer is currently on a restricted page, redirect to dash ── */
  if(!a){
    const curPage=document.querySelector('.pg.on')?.id?.replace('pg-','');
    if(['audit','bk','users','settings','annual'].includes(curPage)){
      window.nav('dash');
    }
  }

  /* ── Sweep every static print/export/import element in the DOM ── */
  _sweepRestrictedElements(a);
}

/**
 * DOM sweep — called once at login and re-called after every renderAll()
 * so that dynamically injected elements are also caught.
 * For viewer: force display:none on anything print/export/import related.
 */
function _sweepRestrictedElements(isAdmin){
  /* Selector list covers static HTML buttons added by the author */
  const SELECTORS=[
    /* data-attribute guards (used on dynamically rendered buttons) */
    '[data-requires-print]',
    '[data-requires-export]',
    '[data-requires-import]',
    /* onclick-based selectors for buttons already in static HTML */
    'button[onclick*="prtRec"]',
    'button[onclick*="prtPay"]',
    'button[onclick*="prtStmt"]',
    'button[onclick*="prtMember"]',
    'button[onclick*="prtDon"]',
    'button[onclick*="exportPDF"]',
    'button[onclick*="exportCSV"]',
    'button[onclick*="doBackup"]',
    /* id-based selectors for any static export/print/import buttons */
    '#btn-export-food-rec','#btn-export-food-pay',
    '#btn-export-diwan-rec','#btn-export-diwan-pay',
    '#btn-export-don','#btn-export-members',
    '#btn-export-audit','#btn-export-stmt',
    '#btn-backup','#btn-import',
    '[id^="btn-print"]','[id^="btn-prt"]',
    '[id^="btn-export"]','[id^="btn-csv"]',
    '[id^="btn-pdf"]','[id^="btn-excel"]',
    '[id^="btn-download"]','[id^="btn-import"]',
  ].join(',');

  document.querySelectorAll(SELECTORS).forEach(el=>{
    el.style.display=isAdmin?'':'none';
  });
}

async function checkSession(){
  const{data:{session}}=await SB.auth.getSession();
  if(session){CU=session.user;await afterLogin();}
}

/* ═══ DATA LOADING ═══ */
async function loadAll(){
  try{
    const[r1,r2,r3,r4,r5,r6]=await Promise.all([
      SB.from('receipts').select('id,no,fund_type,receipt_date,payer_type,member_id,contact_id,payer_name,amount,currency,amount_ils,exchange_rate,payment_method,description,notes,donation_display_fund,created_by,created_at,is_deleted').order('receipt_date',{ascending:false}),
      SB.from('payments').select('id,no,fund_type,payment_date,beneficiary_type,member_id,beneficiary_name,amount,currency,amount_ils,exchange_rate,expense_type,payment_method,description,notes,approved_by,created_by,created_at,is_deleted').order('payment_date',{ascending:false}),
      SB.from('members').select(
'id,name,phone,notes,opening_balance,is_active,created_at,active_from_year'
).order('name'),
      SB.from('contacts').select('*').order('name'),
      SB.from('annual_dues').select('*').order('year',{ascending:false}),
      SB.from('audit_log').select('id,action,description,user_name,created_at').order('created_at',{ascending:false}).limit(50),
    ]);
    DB.receipts=r1.data||[];DB.payments=r2.data||[];DB.members=r3.data||[];
    DB.contacts=r4.data||[];DB.annual=r5.data||[];DB.audit=r6.data||[];
    renderAll();
  }catch(e){toast(window.t?window.t('errors.load_error'):'خطأ في تحميل البيانات','err');console.error(e);}
}
window.loadAll=loadAll;

function renderAll(){
  renderDash();
  const active=document.querySelector('.pg.on')?.id?.replace('pg-','');
  if(active&&D[active]) D[active].render();
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
    if(sub)sub.textContent=`${d.length} إيصال — ₪ ${fmt(tot)}`;
    if(!PS['food-rec'])PS['food-rec']=1;
    mkPag('food-rec',d.length);
    const page=d.slice((PS['food-rec']-1)*PSZ,PS['food-rec']*PSZ);
    const body=document.getElementById('food-rec-body');
    if(!page.length){body.innerHTML=emptyRow(7,'receipts');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td><b style="font-size:11px">${esc(r.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(r.receipt_date)}</td>
      <td>${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num" style="color:#00C896">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge green">${L.method(r.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtRec('${r.id}')" title="طباعة"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editRec('${r.id}')" title="تعديل"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'food-pay':{render(){
    const q=(document.getElementById('q-food-pay')?.value||'').toLowerCase();
    let d=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food');
   if(q)d=d.filter(p=>(p.no+(p.beneficiary_name||gmn(p.member_id))+(p.notes||'')).toLowerCase().includes(q));
    const tot=d.reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    const sub=document.getElementById('food-pay-sub');
    if(sub)sub.textContent=`${d.length} سند — ₪ ${fmt(tot)}`;
    if(!PS['food-pay'])PS['food-pay']=1;
    mkPag('food-pay',d.length);
    const page=d.slice((PS['food-pay']-1)*PSZ,PS['food-pay']*PSZ);
    const body=document.getElementById('food-pay-body');
    if(!page.length){body.innerHTML=emptyRow(7,'expenses');return;}
    body.innerHTML=page.map(p=>`<tr>
      <td><b style="font-size:11px">${esc(p.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(p.payment_date)}</td>
      <td>${esc(p.beneficiary_name||gmn(p.member_id))}</td>
      <td class="num" style="color:var(--danger)">₪ ${fmt(p.amount_ils||p.amount)}</td>
      <td><span class="badge gray">${L.method(p.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px">${esc(p.notes||'—')}</td>
      <td class="tda">
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtPay('${p.id}')" title="طباعة"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editPay('${p.id}')" title="تعديل"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'diwan-rec':{render(){
    const q=(document.getElementById('q-diwan-rec')?.value||'').toLowerCase();
    let d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan');
    if(q)d=d.filter(r=>(r.no+(r.payer_name||gmn(r.member_id))+(r.notes||'')).toLowerCase().includes(q));
    const tot=d.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const sub=document.getElementById('diwan-rec-sub');
    if(sub)sub.textContent=`${d.length} إيصال — ₪ ${fmt(tot)}`;
    if(!PS['diwan-rec'])PS['diwan-rec']=1;
    mkPag('diwan-rec',d.length);
    const page=d.slice((PS['diwan-rec']-1)*PSZ,PS['diwan-rec']*PSZ);
    const body=document.getElementById('diwan-rec-body');
    if(!page.length){body.innerHTML=emptyRow(8,'receipts');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td><b style="font-size:11px">${esc(r.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(r.receipt_date)}</td>
      <td>${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num" style="color:#00C896">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge ${r.currency==='ILS'?'gray':'diwan'}">${r.currency}</span></td>
      <td><span class="badge green">${L.method(r.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtRec('${r.id}')"><i class="ti ti-printer"></i></button>`:''}
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
    if(sub)sub.textContent=`${d.length} سند — ₪ ${fmt(tot)}`;
    if(!PS['diwan-pay'])PS['diwan-pay']=1;
    mkPag('diwan-pay',d.length);
    const page=d.slice((PS['diwan-pay']-1)*PSZ,PS['diwan-pay']*PSZ);
    const body=document.getElementById('diwan-pay-body');
    if(!page.length){body.innerHTML=emptyRow(8,'expenses');return;}
    body.innerHTML=page.map(p=>`<tr>
      <td><b style="font-size:11px">${esc(p.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(p.payment_date)}</td>
      <td>${esc(p.beneficiary_name||gmn(p.member_id))}</td>
      <td class="num" style="color:var(--danger)">₪ ${fmt(p.amount_ils||p.amount)}</td>
      <td><span class="badge diwan">${L.expense(p.expense_type)}</span></td>
      <td><span class="badge gray">${L.method(p.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px">${esc(p.notes||'—')}</td>
      <td class="tda">
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtPay('${p.id}')"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editPay('${p.id}')"><i class="ti ti-edit"></i></button>`:''}
      </td></tr>`).join('');
  }},
  'don':{render(){
    const q=(document.getElementById('q-don')?.value||'').toLowerCase();
    let d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
    if(q)d=d.filter(r=>(r.payer_name||gmn(r.member_id)||'').toLowerCase().includes(q));
    const tot=d.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const sub=document.getElementById('don-sub');
    if(sub)sub.textContent=`${d.length} تبرع — ₪ ${fmt(tot)}`;
    if(!PS['don'])PS['don']=1;
    mkPag('don',d.length);
    const page=d.slice((PS['don']-1)*PSZ,PS['don']*PSZ);
    const body=document.getElementById('don-body');
    if(!page.length){body.innerHTML=emptyRow(8,'donations');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td><b style="font-size:11px">${esc(r.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(r.receipt_date)}</td>
      <td>${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num" style="color:var(--don)">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge ${r.currency==='ILS'?'gray':'don'}">${r.currency}</span></td>
      <td><span class="badge ${r.donation_display_fund==='food'?'food':'diwan'}">${r.donation_display_fund==='food'?L.fundLabel('food'):L.fundLabel('diwan')}</span></td>
      <td style="color:var(--tx3);font-size:11px">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtRec('${r.id}')"><i class="ti ti-printer"></i></button>`:''}
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
    if(sub)sub.textContent=`${d.length} عضو`;
    if(!PS['members'])PS['members']=1;
    mkPag('members',d.length);
    const page=d.slice((PS['members']-1)*PSZ,PS['members']*PSZ);
    const body=document.getElementById('members-body');
    if(!page.length){body.innerHTML=emptyRow(6,'members');return;}
    body.innerHTML=page.map((m,i)=>{
      let cls='green';
let lbl='مسدد';

if(m.bal > 0){
  cls='red';
  lbl='متأخر';
}
else if(m.bal < 0){
  cls='blue';
  lbl='رصيد دائن';
}
      return`<tr>
        <td style="color:var(--tx3)">${(PS['members']-1)*PSZ+i+1}</td>
        <td><b>${esc(m.name)}</b></td>
        <td style="color:var(--tx2)">${esc(m.phone||'—')}</td>
       <td class="num" style="color:${
  m.bal > 0 ? 'var(--danger)' :
  m.bal < 0 ? '#2563EB' :
  '#00C896'
}">
${
  m.bal < 0
    ? `رصيد دائن ₪ ${fmt(Math.abs(m.bal))}`
    : `₪ ${fmt(m.bal)}`
}
</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
        <td class="tda">
          <button class="btn ghost sm" style="color:#60A5FA" onclick="window.nav('member-stmt');setTimeout(()=>{document.getElementById('ms-member').value='${m.id}';window.renderMemberStmt();},80)" title="كشف الحساب"><i class="ti ti-file-description"></i></button>
          ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editMember('${m.id}')" title="تعديل"><i class="ti ti-edit"></i></button>`:''}
        </td></tr>`;
    }).join('');
  }},
};
function emptyRow(cols,msgKey){const msg=L.noData(msgKey)||msgKey;return`<tr><td colspan="${cols}"><div class="empty"><i class="ti ti-inbox"></i><div class="empty-t">${msg}</div></div></td></tr>`;}

/* ═══ DASHBOARD ═══ */
function renderDash(){
  const fb=FIN.foodBalance(),db=FIN.diwanBalance(),donb=FIN.donBalance();
  const dd=document.getElementById('dash-date');
  if(dd)dd.textContent=new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const recLbl=window.LANG==='en'?'Receipt':'إيصال';const donLbl=window.LANG==='en'?'Donation':'تبرع';
  document.getElementById('fund-cards').innerHTML=`
    <div class="fund-card food"><div class="fund-label">${L.fundLabel('food')}</div><div class="fund-balance">₪ ${fmt(fb)}</div><div class="fund-sub">${DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').length} ${recLbl}</div></div>
    <div class="fund-card diwan"><div class="fund-label">${L.fundLabel('diwan')}</div><div class="fund-balance">₪ ${fmt(db)}</div><div class="fund-sub">${DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').length} ${recLbl}</div></div>
    <div class="fund-card don"><div class="fund-label">${L.fundLabel('donation')}</div><div class="fund-balance">₪ ${fmt(donb)}</div><div class="fund-sub">${DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation').length} ${donLbl}</div></div>
  `;

 const lateMembers=DB.members
 .filter(m=>m.is_active)
 .map(m=>({...m,bal:FIN.memberBalance(m.id)}))
 .filter(m=>m.bal>0);
  const isEn=window.LANG==='en';
  document.getElementById('kpis').innerHTML=`
    <div class="kpi food"><i class="ti ti-users kpi-ico"></i><div class="kpi-lbl">${isEn?'Family Members':'أعضاء العائلة'}</div><div class="kpi-val">${DB.members.filter(m=>m.is_active).length}</div></div>
    <div class="kpi red"><i class="ti ti-clock kpi-ico"></i><div class="kpi-lbl">${isEn?'Late Members':'متأخرون'}</div><div class="kpi-val">${lateMembers.length}</div><div class="kpi-sub">${isEn?'Unpaid':'لم يسددوا'}</div></div>
    <div class="kpi green"><i class="ti ti-trending-up kpi-ico"></i><div class="kpi-lbl">${isEn?'Total Receipts':'إجمالي الإيصالات'}</div><div class="kpi-val">₪ ${fmt(DB.receipts.filter(r=>!r.is_deleted&&r.fund_type!=='donation').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0))}</div></div>
    <div class="kpi red"><i class="ti ti-trending-down kpi-ico"></i><div class="kpi-lbl">${isEn?'Total Expenses':'إجمالي المصاريف'}</div><div class="kpi-val">₪ ${fmt(DB.payments.filter(p=>!p.is_deleted).reduce((s,p)=>s+Number(p.amount_ils||p.amount),0))}</div></div>
  `;

  const now=new Date();const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const food=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.receipt_date?.startsWith(k)).reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const diwan=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan'&&r.receipt_date?.startsWith(k)).reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    months.push({lbl:L.month(d.getMonth()),food,diwan});
  }
  const maxV=Math.max(...months.map(m=>m.food+m.diwan),1);
  document.getElementById('month-chart').innerHTML=months.map(m=>`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
      <div style="font-size:9px;color:var(--tx3)">${m.food+m.diwan?'₪'+fmt(m.food+m.diwan):''}</div>
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:110px;gap:1px">
        <div style="width:100%;height:${Math.max(3,Math.round(m.food/maxV*90))}px;background:var(--food);border-radius:3px 3px 0 0;opacity:.8"></div>
        <div style="width:100%;height:${Math.max(3,Math.round(m.diwan/maxV*90))}px;background:var(--diwan);border-radius:3px 3px 0 0;opacity:.8"></div>
      </div>
      <div style="font-size:9.5px;color:var(--tx3)">${m.lbl}</div>
    </div>`).join('');

  const allOps=[
    ...DB.receipts.filter(r=>!r.is_deleted).slice(0,5).map(r=>({date:r.receipt_date,name:r.payer_name||gmn(r.member_id),amt:r.amount_ils||r.amount,type:'rec',fund:r.fund_type})),
    ...DB.payments.filter(p=>!p.is_deleted).slice(0,5).map(p=>({date:p.payment_date,name:p.beneficiary_name||gmn(p.member_id),amt:p.amount_ils||p.amount,type:'pay',fund:p.fund_type})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  document.getElementById('recent-ops').innerHTML=allOps.length?allOps.map(op=>`
    <div class="sr">
      <span class="sr-l">${esc(op.name)}<br><small style="color:var(--tx3);font-size:10px">${fdate(op.date)} · <span class="badge ${op.fund}" style="font-size:9px;padding:1px 5px">${op.fund==='food'?'غداء':op.fund==='diwan'?'ديوان':'تبرع'}</span></small></span>
      <span class="sr-v" style="color:${op.type==='rec'?'#00C896':'var(--danger)'}">₪ ${fmt(op.amt)}</span>
    </div>`).join('')
    :`<div class="empty" style="padding:14px"><div class="empty-t">${L.noData('ops')}</div></div>`;

  document.getElementById('late-members').innerHTML=lateMembers.slice(0,6).length?lateMembers.slice(0,6).map(m=>`
    <div class="sr">
      <span class="sr-l">${esc(m.name)}</span>
      <span class="sr-v" style="color:var(--danger)">₪ ${fmt(m.bal)}</span>
    </div>`).join('')
    :`<div style="text-align:center;padding:12px;color:var(--tx3);font-size:12px">${window.LANG==='en'?'✅ All members are up to date':'✅ كل الأعضاء ملتزمون'}</div>`;

  const _en=window.LANG==='en';
  document.getElementById('quick-actions').innerHTML=`
    ${can.write()?`<button class="btn food" style="width:100%;margin-bottom:6px" onclick="window.openRec('food')"><i class="ti ti-receipt"></i>${_en?'Food Receipt':'إيصال غداء'}</button>`:''}
    ${can.write()?`<button class="btn diwan" style="width:100%;margin-bottom:6px" onclick="window.openRec('diwan')"><i class="ti ti-receipt"></i>${_en?'Diwan Receipt':'إيصال ديوان'}</button>`:''}
    ${can.write()?`<button class="btn don" style="width:100%;margin-bottom:6px" onclick="window.openRec('donation')"><i class="ti ti-heart"></i>${_en?'New Donation':'تسجيل تبرع'}</button>`:''}
    <button class="btn" style="width:100%;margin-bottom:6px" onclick="window.nav('food-stmt')"><i class="ti ti-file-description"></i>${_en?'Food Statement':'كشف الغداء'}</button>
    <button class="btn" style="width:100%" onclick="window.nav('diwan-stmt')"><i class="ti ti-file-description"></i>${_en?'Diwan Statement':'كشف الديوان'}</button>
  `;
}

/* ═══ STATEMENTS ═══ */
window.renderStmt=function(fund){
  const from=document.getElementById(fund+'-stmt-from')?.value||'';
  const to=document.getElementById(fund+'-stmt-to')?.value||'';
  const type=document.getElementById(fund+'-stmt-type')?.value||'';
  const out=document.getElementById(fund+'-stmt-out');
  const rows=FIN.fundLedger(fund,from,to,type);
  if(!rows.length){out.innerHTML=`<div class="empty"><i class="ti ti-inbox"></i><div class="empty-t">${L.noData('ops')}</div></div>`;return;}
  let bal=0,totalCr=0,totalDr=0;
  const rowsHTML=rows.map(r=>{
    bal+=r.cr-r.dr;totalCr+=r.cr;totalDr+=r.dr;
    const balColor=bal>=0?'#00C896':'var(--danger)';
    return`<div class="lr">
      <span class="lr-date">${fdate(r.date)}</span>
      <span class="lr-name">${esc(r.name)}</span>
      <span class="lr-desc">${esc(r.desc)}</span>
      <span class="lr-cr">${r.cr>0?'₪ '+fmt(r.cr):'—'}</span>
      <span class="lr-dr">${r.dr>0?'₪ '+fmt(r.dr):r.type==='don'?'<span style="color:var(--don);font-size:10px">تبرع</span>':'—'}</span>
      <span class="lr-bal" style="color:${balColor}">₪ ${fmt(bal)}</span>
      <span class="lr-note">${esc(r.note||'')}</span>
    </div>`;
  }).join('');

  const fundLabel=fund==='food'?'صندوق الغداء':'صندوق الديوان';
  out.innerHTML=`
    <div class="card">
      <div style="background:${fund==='food'?'var(--food)':'var(--diwan)'};color:#fff;padding:12px 16px;border-radius:var(--r);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:15px;font-weight:700">${fundLabel}</div>
        <div style="font-size:12px;opacity:.8">${from&&to?`${fdate(from)} — ${fdate(to)}`:from?`من ${fdate(from)}`:to?`حتى ${fdate(to)}`:'كل الفترات'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kpi green" style="padding:12px"><div class="kpi-lbl">${window.LANG==='en'?'Total Income':'إجمالي الإيرادات'}</div><div class="kpi-val" style="font-size:16px">₪ ${fmt(totalCr)}</div></div>
        <div class="kpi red" style="padding:12px"><div class="kpi-lbl">${window.LANG==='en'?'Total Expenses':'إجمالي المصاريف'}</div><div class="kpi-val" style="font-size:16px">₪ ${fmt(totalDr)}</div></div>
        <div class="kpi ${bal>=0?'green':'red'}" style="padding:12px"><div class="kpi-lbl">${window.LANG==='en'?'Closing Balance':'الرصيد الختامي'}</div><div class="kpi-val" style="font-size:16px">₪ ${fmt(bal)}</div></div>
      </div>
      <div class="ledger-hdr">
        <span style="flex:0 0 85px">${window.LANG==='en'?'Date':'التاريخ'}</span>
        <span style="flex:0 0 120px">${window.LANG==='en'?'Name':'الاسم'}</span>
        <span style="flex:1">${window.LANG==='en'?'Description':'البيان'}</span>
        <span style="flex:0 0 80px;text-align:left">${window.LANG==='en'?'Credit ₪':'دائن ₪'}</span>
        <span style="flex:0 0 80px;text-align:left">${window.LANG==='en'?'Debit ₪':'مدين ₪'}</span>
        <span style="flex:0 0 85px;text-align:left">${window.LANG==='en'?'Balance ₪':'الرصيد ₪'}</span>
        <span style="flex:0 0 110px">${window.LANG==='en'?'Notes':'ملاحظات'}</span>
      </div>
      <div class="scroll">${rowsHTML}</div>
      ${can.print()?`<div style="margin-top:12px;text-align:left"><button class="btn ghost sm" onclick="window.prtStmt('${fund}')" data-requires-print="1"><i class="ti ti-printer"></i> طباعة</button></div>`:''}
    </div>`;
};

/* ═══ MEMBER STATEMENT ═══ */
function fillMemberSelect(){
  const sel=document.getElementById('ms-member');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">-- اختر عضواً --</option>'+DB.members.filter(m=>m.is_active).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  if(cur)sel.value=cur;
}
window.renderMemberStmt=function(){

  const mid=document.getElementById('ms-member')?.value;
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';
  const out=document.getElementById('ms-out');

  if(!mid){
    out.innerHTML='';
    return;
  }

  const member=gm(mid);

  if(!member){
    out.innerHTML='';
    return;
  }

  const fd=from?new Date(from):null;
  const td=to?new Date(to):null;

  const inRange=d=>{
    const dt=new Date(d);
    if(fd && dt<fd) return false;
    if(td && dt>td) return false;
    return true;
  };

  const recs=DB.receipts.filter(r=>
    !r.is_deleted &&
    r.fund_type==='food' &&
    r.member_id===mid &&
    inRange(r.receipt_date)
  );

  const dues=DB.annual
    .filter(d =>
      !member.active_from_year ||
      d.year >= member.active_from_year
    );

  const dons=DB.receipts.filter(r=>
    !r.is_deleted &&
    r.fund_type==='donation' &&
    r.member_id===mid &&
    inRange(r.receipt_date)
  );

  const rows=[];

  const openBal=Number(member.opening_balance||0);

  if(openBal!==0){
    rows.push({
      date:'1900-01-01',
      desc:'رصيد افتتاحي',
      cr:0,
      dr:openBal,
      type:'opening'
    });
  }

  dues.forEach(d=>{
    rows.push({
      date:d.applied_at?.slice(0,10) || `${d.year}-01-01`,
      desc:`اشتراك سنة ${d.year}`,
      cr:0,
      dr:Number(d.amount||0),
      type:'due'
    });
  });

  recs.forEach(r=>{
    rows.push({
      date:r.receipt_date,
      desc:r.notes || 'دفعة مساهمة',
      cr:Number(r.amount_ils||r.amount||0),
      dr:0,
      type:'receipt',
      no:r.no
    });
  });

  rows.sort((a,b)=>new Date(a.date)-new Date(b.date));

  let bal=0;

  const rowsHTML=rows.map(r=>{

    bal += r.dr - r.cr;

    let balColor='#00C896';

    if(bal>0){
      balColor='var(--danger)';
    }else if(bal<0){
      balColor='#2563EB';
    }

    return `
      <div class="lr">
        <span class="lr-date">
          ${r.type==='opening'?'—':fdate(r.date)}
        </span>
        <span class="lr-name">
          ${r.no?esc(r.no):'—'}
        </span>
        <span class="lr-desc">
          ${esc(r.desc)}
        </span>
        <span class="lr-cr">
          ${r.cr>0 ? '₪ '+fmt(r.cr) : '—'}
        </span>
        <span class="lr-dr">
          ${r.dr>0 ? '₪ '+fmt(r.dr) : '—'}
        </span>
        <span class="lr-bal" style="color:${balColor}">
          ${
            bal<0
              ? `رصيد دائن ₪ ${fmt(Math.abs(bal))}`
              : `₪ ${fmt(bal)}`
          }
        </span>
        <span class="lr-note"></span>
      </div>
    `;
  }).join('');

  const donsHTML=dons.length ? `
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)">
      <div style="font-size:11px;font-weight:600;color:var(--don);margin-bottom:8px">
        التبرعات (لا تؤثر على الرصيد)
      </div>
      ${dons.map(d=>`
        <div class="sr">
          <span class="sr-l">
            ${fdate(d.receipt_date)} — ${esc(d.notes||'تبرع')}
          </span>
          <span class="sr-v" style="color:var(--don)">
            ₪ ${fmt(d.amount_ils||d.amount)}
          </span>
        </div>
      `).join('')}
    </div>
  ` : '';

  out.innerHTML=`
    <div class="card">
      <div style="margin-bottom:12px">
        <div style="font-size:18px;font-weight:700">
          ${esc(member.name)}
        </div>
      </div>
      <div class="ledger-hdr">
        <span style="flex:0 0 90px">التاريخ</span>
        <span style="flex:0 0 120px">المرجع</span>
        <span style="flex:1">البيان</span>
        <span style="flex:0 0 90px">دائن</span>
        <span style="flex:0 0 90px">مدين</span>
        <span style="flex:0 0 120px">الرصيد</span>
        <span style="flex:0 0 80px"></span>
      </div>
      <div class="scroll">
        ${rowsHTML}
      </div>
      ${donsHTML}
    </div>
  `;
};


/* ═══ MODAL ═══ */
window.openM=function(type){
  setTimeout(setupAllForms,100);
  document.getElementById('ov').classList.add('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.getElementById('m-'+type).style.display='block';
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
  if(!can.write()){toast(window.LANG==='en'?'No permission to add':'ليس لديك صلاحية الإضافة','err');return;}
  fillMemberDropdowns();
  window.openM('rec');
  const funSel=document.getElementById('rec-fund');
  if(funSel){funSel.value=fund;window.onRecFundChange();}
  document.getElementById('rec-date').value=today();
};
window.openPay=function(fund='food'){
  if(!can.write()){toast(window.LANG==='en'?'No permission to add':'ليس لديك صلاحية الإضافة','err');return;}
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
    if(mico){mico.className='mico food';} if(title)title.textContent='إيصال صندوق الغداء';
    if(donWrap)donWrap.style.display='none';
    if(optContact)optContact.style.display='none';
    if(optManual)optManual.style.display='none';
    if(ptSel)ptSel.value='member';
  } else if(fund==='diwan'){
    if(mico){mico.className='mico diwan';} if(title)title.textContent='إيصال صندوق الديوان';
    if(donWrap)donWrap.style.display='none';
    if(optContact)optContact.style.display='';
    if(optManual)optManual.style.display='';
  } else if(fund==='donation'){
    if(mico){mico.className='mico don';} if(title)title.textContent='تسجيل تبرع';
    if(donWrap)donWrap.style.display='';
    if(optContact)optContact.style.display='none';
    if(optManual)optManual.style.display='none';
    if(ptSel)ptSel.value='member';
  }
  window.onPayerTypeChange();
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
  document.getElementById('pay-mtitle').textContent=fund==='food'?'سند صرف الغداء':'سند صرف الديوان';
};

window.onDonPayerChange=function(){
  const t=document.getElementById('don-payer-type')?.value||'member';
  const memWrap=document.getElementById('don-member-wrap');
  const otherWrap=document.getElementById('don-other-wrap');
  if(memWrap) memWrap.style.display=t==='member'?'':'none';
  if(otherWrap) otherWrap.style.display=t==='other'?'':'none';
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
  ['rec-member','pay-member','don-mem-sel'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
}
function fillContactDropdown(){
  const opts='<option value="">-- اختر --</option>'+DB.contacts.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const el=document.getElementById('rec-contact');if(el)el.innerHTML=opts;
}

/* ═══ AUDIT LOG ═══ */
async function logAction(action,desc,tableN,recordId){
  await SB.from('audit_log').insert({user_name:CUR?.full_name||CU?.email,action,description:desc,table_name:tableN,record_id:recordId});
}

/* ═══ SAVE RECEIPT ═══ */
window.saveRec=async function(print=false){
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
  const saveContact=document.getElementById('rec-save-contact')?.checked||false;

  const v1=fund==='food'||fund==='donation'?vf('rec-member',v=>!!v,'e-rec-member'):
    payerType==='manual'?vf('rec-payer-name',v=>v.trim().length>0,'e-rec-member'):true;
  const v2=vf('rec-amount',v=>parseFloat(v)>0,'e-rec-amount');
  const v3=vf('rec-date',v=>!!v,'e-rec-date');
  if(!v1||!v2||!v3)return;

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

  const no=nextNo('REC',DB.receipts);
  const{data,error}=await SB.from('receipts').insert({
    no,fund_type:fund,receipt_date:date,
    payer_type:payerType,
    member_id:payerType==='member'?memberId:null,
    contact_id:finalContactId,
    payer_name:payerName,
    amount,currency,amount_ils:amountILS,exchange_rate:rate,
    payment_method:method,notes,
    donation_display_fund:fund==='donation'?donDisplay:null,
    created_by:CUR?.full_name||CU?.email,
  }).select().single();
  if(error){toast('خطأ في الحفظ: '+error.message,'err');return;}
  await logAction('add',`إضافة إيصال ${no} — ${payerName} — ₪${fmt(amountILS)}${currency!=='ILS'?` (${fmtD(amount)} ${currency})`:''}`, 'receipts', data.id);
  window.closeM();
  await loadAll();
  toast(`✓ تم حفظ ${no}`,'ok');
  await SB.from('vouchers').upsert({id:no,type:fund==='food'?'Receipt Voucher — Food Fund':fund==='diwan'?'Receipt Voucher — Diwan Fund':'Donation Voucher',fund:fund==='food'?'Food Fund':fund==='diwan'?'Diwan Fund':'Food Fund',date:fmtDate2(date),amount:fmtD(amountILS)+' ILS',description:notes||'Receipt Voucher',prepared_by:CUR?.full_name||CU?.email});
  if(print) setTimeout(()=>window.prtRec(data.id),300);
};

/* ═══ SAVE PAYMENT ═══ */
window.savePay=async function(print=false){
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

  const benName=benType==='member'?gmn(memberId):benNameInput;
  const no=nextNo('PAY',DB.payments);
  const{data,error}=await SB.from('payments').insert({
    no,fund_type:fund,payment_date:date,
    beneficiary_type:benType,
    member_id:benType==='member'?memberId:null,
    beneficiary_name:benName,
    amount,currency,amount_ils:amountILS,exchange_rate:rate,
    expense_type:expense,payment_method:method,notes,
    approved_by:approved,
    created_by:CUR?.full_name||CU?.email,
  }).select().single();
  if(error){toast('خطأ في الحفظ: '+error.message,'err');return;}
  await logAction('add',`إضافة سند ${no} — ${benName} — ₪${fmt(amountILS)}`,'payments',data.id);
  window.closeM();
  await loadAll();
  toast(`✓ تم حفظ ${no}`,'ok');
  await SB.from('vouchers').upsert({id:no,type:fund==='food'?'Payment Voucher — Food Fund':'Payment Voucher — Diwan Fund',fund:fund==='food'?'Food Fund':'Diwan Fund',date:fmtDate2(date),amount:fmtD(amountILS)+' ILS',description:notes||L.expense(expense),prepared_by:CUR?.full_name||CU?.email});
  if(print) setTimeout(()=>window.prtPay(data.id),300);
};

/* ═══ SAVE MEMBER ═══ */
window.saveMember=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية','err');return;}
  const name=document.getElementById('mem-name').value.trim();
  if(!vf('mem-name',v=>v.trim().length>1,'e-mem-name'))return;
  if(DB.members.find(m=>m.name.trim()===name)){toast('يوجد عضو بنفس الاسم','warn');return;}
  const bal=parseFloat(document.getElementById('mem-balance').value)||0;
  const phone=document.getElementById('mem-phone').value;
  const notes=document.getElementById('mem-notes').value;
  const{error}=await SB.from('members').insert({name,phone,notes,opening_balance:bal});
  if(error){toast('خطأ: '+error.message,'err');return;}
  await logAction('add',`إضافة عضو: ${name}`,'members',null);
  window.closeM();await loadAll();toast(`✓ تمت إضافة ${name}`,'ok');
};

/* ═══ EDIT RECORDS (admin only) ═══ */
window.editRec=function(id){
  if(!can.admin()){
    toast(window.t ? window.t('errors.no_permission') : 'المدير فقط','err');
    return;
  }

  const r = DB.receipts.find(x=>x.id===id);
  if(!r) return;

  document.getElementById('edit-rec-id').value = id;
  document.getElementById('edit-rec-amount').value = r.amount_ils || r.amount;
  document.getElementById('edit-rec-notes').value = r.notes || '';

  /* BUG 2 FIX: قراءة receipt_date وليس r.date */
  const dateEl = document.getElementById('edit-rec-date');
  if(dateEl){
    dateEl.value = r.receipt_date || '';
  }

  window.openM('edit-rec');
};
window.updateRec = async function () {

if (!can.admin()) {
  toast(window.t ? window.t('errors.no_permission') : 'المدير فقط','err');
  return;
}

const id = document.getElementById('edit-rec-id').value;
const amount = parseFloat(document.getElementById('edit-rec-amount').value) || 0;
const date = document.getElementById('edit-rec-date')?.value || null;
const notes = document.getElementById('edit-rec-notes').value || '';

if (amount <= 0) {
  toast('أدخل مبلغاً صحيحاً', 'warn');
  return;
}

/* BUG 3 FIX: حفظ receipt_date وليس date
   BUG 4 FIX: لا نغير amount الأصلي — فقط amount_ils
   نحافظ على: amount (العملة الأصلية), currency, exchange_rate */
const { error } = await SB
  .from('receipts')
  .update({
    amount_ils: amount,
    receipt_date: date,
    notes: notes,
    updated_at: new Date().toISOString()
  })
  .eq('id', id);

if (error) {
  toast('خطأ: ' + error.message, 'err');
  return;
}

await logAction('edit',`تعديل إيصال — ₪${fmt(amount)} | تاريخ: ${date||'—'}`, 'receipts', id);
window.closeM();
await loadAll();
toast('✓ تم التعديل', 'ok');

};
window.deleteRec=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-rec-id').value;
  if(!confirm('إلغاء هذا السند نهائياً؟'))return;
  await SB.from('receipts').update({is_deleted:true}).eq('id',id);
  await logAction('delete','إلغاء إيصال','receipts',id);
  window.closeM();await loadAll();toast(window.t('messages.cancelled'),'warn');
};
window.editPay=function(id){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  document.getElementById('edit-pay-id').value=id;
  document.getElementById('edit-pay-amount').value=p.amount_ils||p.amount;
  document.getElementById('edit-pay-notes').value=p.notes||'';
  window.openM('edit-pay');
};
window.updatePay=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-pay-id').value;
  const amount=parseFloat(document.getElementById('edit-pay-amount').value)||0;
  const notes=document.getElementById('edit-pay-notes').value;
  if(amount<=0){toast('أدخل مبلغاً صحيحاً','warn');return;}
  const{error}=await SB.from('payments').update({amount_ils:amount,amount,notes,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('خطأ: '+error.message,'err');return;}
  await logAction('edit',`تعديل سند صرف — ₪${fmt(amount)}`,'payments',id);
  window.closeM();await loadAll();toast('✓ تم التعديل','ok');
};
window.deletePay=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-pay-id').value;
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
  document.getElementById('edit-mem-balance').value=m.opening_balance||0;
  document.getElementById('edit-mem-notes').value=m.notes||'';
  window.openM('edit-member');
};
window.updateMember=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-mem-id').value;
  const name=document.getElementById('edit-mem-name').value.trim();
  if(!name){toast('الاسم مطلوب','warn');return;}
  const phone=document.getElementById('edit-mem-phone').value;
  const bal=parseFloat(document.getElementById('edit-mem-balance').value)||0;
  const notes=document.getElementById('edit-mem-notes').value;
  const{error}=await SB.from('members').update({name,phone,opening_balance:bal,notes,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('خطأ: '+error.message,'err');return;}
  await logAction('edit',`تعديل بيانات عضو: ${name}`,'members',id);
  window.closeM();await loadAll();toast('✓ تم التعديل','ok');
};
window.deleteMember=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const id=document.getElementById('edit-mem-id').value;
  const m=gm(id);
  if(!confirm(`حذف العضو ${m?.name}؟ لا يمكن التراجع.`))return;
  await SB.from('members').update({is_active:false}).eq('id',id);
  await logAction('delete',`حذف عضو: ${m?.name}`,'members',id);
  window.closeM();await loadAll();toast('تم الحذف','warn');
};

/* ═══ ANNUAL DUES ═══ */
window.applyAnnualDue=async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const year=parseInt(document.getElementById('due-year').value);
  const amount=parseFloat(document.getElementById('due-amount').value)||200;
  if(!year||year<2020||year>2040){toast(window.t('errors.invalid_year'),'warn');return;}
  if(DB.annual.find(a=>a.year===year)){toast(`تم تطبيق اشتراك ${year} مسبقاً`,'warn');return;}
 const members=DB.members.filter(m =>
  m.is_active &&
  (!m.active_from_year || m.active_from_year <= year)
);
  if(!members.length){toast('لا يوجد أعضاء','warn');return;}
  if(!confirm(
  `سيُضاف ${fmt(amount)} ₪ كاشتراك سنة ${year} على ${members.length} عضو مستحق. هل تريد المتابعة؟`
)) return;
  const btn=document.getElementById('btn-apply-due');
if(!btn)return;
btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  const{error}=await SB.from('annual_dues').insert({year,amount,applied_by:CUR?.full_name||CU?.email,member_count:members.length});
  if(error){toast('خطأ: '+error.message,'err');btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-plus"></i>تطبيق الاشتراك السنوي';return;}
  await logAction('add',`تطبيق اشتراك سنة ${year} — ${members.length} عضو — ₪${fmt(amount)} لكل عضو`,'annual_dues',null);
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
  const BG={admin:'linear-gradient(135deg,#6D28D9,#4F46E5)',viewer:'linear-gradient(135deg,#1B6CA8,#0284C7)'};
  list.innerHTML=data.map(u=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px;border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;background:var(--bg2)">
      <div style="width:36px;height:36px;border-radius:50%;background:${BG[u.role]||'#475569'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff">${(u.full_name||'م').charAt(0).toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:500;font-size:13px">${esc(u.full_name||'—')}</div><div style="font-size:10px;color:var(--tx3)">${u.user_id}</div></div>
      <span class="role-tag ${u.role}">${ROLES[u.role]||u.role}</span>
      ${u.user_id!==CU?.id?`<select onchange="window.changeRole('${u.user_id}',this.value)" style="padding:4px 8px;border-radius:var(--r);border:1px solid var(--bd2);background:var(--bg2);color:var(--tx);font-size:11.5px;font-family:var(--fn)">
        <option value="viewer" ${u.role==='viewer'?'selected':''}>عارض</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>مدير</option>
      </select>`:'<span style="font-size:11px;color:var(--tx3)">(أنت)</span>'}
    </div>`).join('');
}
window.changeRole=async(uid,role)=>{
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  /* Enforce valid roles only */
  const safeRole=(role==='admin')?'admin':'viewer';
  await SB.from('user_roles').update({role:safeRole}).eq('user_id',uid);
  toast(`تم تغيير الدور إلى ${ROLES[safeRole]}`,'ok');loadUsers();
};
window.inviteUser=async()=>{
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط','err');return;}
  const email=document.getElementById('inv-email').value.trim();
  const pass=document.getElementById('inv-pass').value;
  const roleRaw=document.getElementById('inv-role').value;
  const safeRole=(roleRaw==='admin')?'admin':'viewer';
  const name=document.getElementById('inv-name').value.trim();
  if(!email||!pass){toast(window.t('errors.required'),'warn');return;}
  const{data,error}=await SB.auth.signUp({email,password:pass});
  if(error){toast('خطأ: '+error.message,'err');return;}
  await SB.from('user_roles').upsert({user_id:data.user.id,role:safeRole,full_name:name||email});
  window.closeM();toast(`تم إنشاء حساب ${email}`,'ok');loadUsers();
};

/* ═══ AUDIT ═══ */
function renderAudit(){
  const list=document.getElementById('audit-list');if(!list)return;
  if(!DB.audit.length){list.innerHTML='<div class="empty"><i class="ti ti-clipboard-list"></i><div class="empty-t">السجل فارغ</div></div>';return;}
  list.innerHTML=DB.audit.map(a=>`
    <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)">
      <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;background:rgba(${a.action==='add'?'0,200,150':a.action==='delete'?'220,38,38':'27,108,168'},.12);color:${a.action==='add'?'#00C896':a.action==='delete'?'var(--danger)':'#60A5FA'}"><i class="ti ti-${a.action==='add'?'plus':a.action==='delete'?'trash':'edit'}"></i></div>
      <div style="flex:1"><div style="font-size:12.5px;font-weight:500">${esc(a.description)}</div><div style="font-size:10.5px;color:var(--tx3);margin-top:2px">${esc(a.user_name||'—')} · ${fdate(a.created_at?.slice(0,10))}</div></div>
    </div>`).join('');
}
function renderSysInfo(){
  const el=document.getElementById('sys-info');if(!el)return;
  const totRec=DB.receipts.filter(r=>!r.is_deleted).length;
  const totPay=DB.payments.filter(p=>!p.is_deleted).length;
  el.innerHTML=`
    <div class="sr"><span class="sr-l">عدد الأعضاء</span><span class="sr-v">${DB.members.filter(m=>m.is_active).length}</span></div>
    <div class="sr"><span class="sr-l">عدد الإيصالات</span><span class="sr-v">${totRec}</span></div>
    <div class="sr"><span class="sr-l">عدد سندات الصرف</span><span class="sr-v">${totPay}</span></div>
    <div class="sr"><span class="sr-l">رصيد صندوق الغداء</span><span class="sr-v" style="color:var(--food)">₪ ${fmt(FIN.foodBalance())}</span></div>
    <div class="sr"><span class="sr-l">رصيد صندوق الديوان</span><span class="sr-v" style="color:var(--diwan)">₪ ${fmt(FIN.diwanBalance())}</span></div>
    <div class="sr"><span class="sr-l">سعر الدولار</span><span class="sr-v">₪ ${RATES.USD.toFixed(2)}</span></div>
    <div class="sr"><span class="sr-l">سعر الدينار الأردني</span><span class="sr-v">₪ ${RATES.JOD.toFixed(2)}</span></div>
  `;
}

/* ═══ PRINT ENGINE ═══ */
function fmtDate2(d){if(!d)return'—';try{const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,'0');const mm=String(dt.getMonth()+1).padStart(2,'0');const yy=dt.getFullYear();return dd+'/'+mm+'/'+yy;}catch{return d;}}
function firstName(n){if(!n)return'—';return n.trim().split(' ')[0];}
function amountToWords(n){
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!n||n===0)return'Zero New Israeli Shekels Only';
  n=Math.round(Number(n));
  function h(x){if(x===0)return'';if(x<20)return ones[x]+' ';if(x<100)return tens[Math.floor(x/10)]+' '+(x%10?ones[x%10]+' ':'');return ones[Math.floor(x/100)]+' Hundred '+(x%100?h(x%100):'');}
  let s='';if(n>=1000){s+=h(Math.floor(n/1000))+'Thousand ';n=n%1000;}if(n>0)s+=h(n);
  return s.trim()+' New Israeli Shekels Only';
}

function openPrintWin(css,body){
  const html='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">'
    +'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    +'<style>'+css+'</style></head><body>'+body
    +'<script>window.onload=function(){'
    +'document.querySelectorAll("[data-qr-url]").forEach(function(el){'
    +'new QRCode(el,{text:el.getAttribute("data-qr-url"),width:52,height:52,colorDark:"#1B3A6B",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});'
    +'});'
    +'setTimeout(function(){window.print();},900);'
    +'};<\/script></body></html>';
  const win=window.open('','_blank','width=850,height=950');
  if(win){win.document.write(html);win.document.close();}
  else toast(window.t?window.t('errors.no_print'):'يرجى السماح بالنوافذ المنبثقة','warn');
}

const REC_CSS='@page{size:A4 portrait;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Cairo",Arial,sans-serif;direction:rtl;background:#fff;width:210mm}'
+'.half{width:210mm;height:148.5mm;padding:7mm 12mm;display:flex;flex-direction:column;justify-content:space-between;position:relative}'
+'.half:first-child{border-bottom:2px dashed #ccc}'
+'.cut{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);background:#fff;padding:0 8px;font-size:8pt;color:#aaa;white-space:nowrap}'
+'.hdr{background:#1B3A6B;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:4px 4px 0 0}'
+'.org-ar{font-size:15pt;font-weight:700;color:#fff;display:block}'
+'.org-en{font-size:10pt;color:rgba(255,255,255,.7);display:block}'
+'.ttl-ar{font-size:13pt;font-weight:700;color:#00C896;display:block;text-align:center}'
+'.ttl-en{font-size:13pt;font-weight:700;color:rgba(255,255,255,.8);display:block;text-align:center}'
+'.verified-badge{display:inline-flex;align-items:center;gap:3px;background:rgba(0,200,150,.15);border:1px solid rgba(0,200,150,.5);border-radius:8px;padding:2px 7px;margin-top:4px}'
+'.verified-badge span{font-size:7.5pt;color:#00C896;font-weight:600}'
+'.no-l{font-size:9pt;color:rgba(255,255,255,.5);text-align:left}'
+'.no-v{font-size:14pt;font-weight:700;color:#fff;display:block;text-align:left;letter-spacing:.5px}'
+'.strip{height:2.5px;background:linear-gradient(90deg,#00C896,#059669,#1B6CA8)}'
+'.meta{display:grid;grid-template-columns:1fr 1fr;border-bottom:.5pt solid #e2e8f0}'
+'.mi{padding:5px 12px}'
+'.mi:first-child{border-left:.5pt solid #e2e8f0}'
+'.ml{font-size:7pt;color:#94a3b8;font-weight:600;text-transform:uppercase;display:block;margin-bottom:2px}'
+'.mv{font-size:10.5pt;font-weight:700;color:#0A1628;display:block}'
+'.rows{flex:1}'
+'.row{display:flex;padding:4px 12px;border-bottom:.5pt solid #f1f5f9;font-size:9pt}'
+'.row:last-child{border-bottom:none}'
+'.rk{color:#64748b;flex:0 0 130px}'
+'.rv{font-weight:600;color:#0A1628;flex:1;text-align:right}'
+'.amt{background:#1B3A6B;padding:10px 14px 10px 80px;text-align:center;position:relative;min-height:85px;display:flex;flex-direction:column;justify-content:center}'
+'.al{font-size:7.5pt;color:rgba(255,255,255,.5);text-transform:uppercase;display:block;margin-bottom:2px}'
+'.an{font-size:24pt;font-weight:700;color:#00C896;display:block;letter-spacing:-1px}'
+'.aw-ar{font-size:9pt;color:rgba(255,255,255,.65);display:block;direction:rtl;margin-top:3px}'
+'.aw{font-size:8pt;color:rgba(255,255,255,.5);font-style:italic;display:block;margin-top:2px}'
+'.au{font-size:8.5pt;color:rgba(255,255,255,.6);display:block;margin-top:2px}'
+'.qr-area{position:absolute;left:8px;top:8px;display:flex;flex-direction:column;align-items:center;gap:2px;width:65px}'
+'.qr-area>div:first-child{background:#fff;border-radius:3px;padding:3px}'
+'.qr-area img,.qr-area canvas{width:52px!important;height:52px!important}'
+'.qr-cap{font-size:5.5pt;color:rgba(255,255,255,.5);text-align:center;line-height:1.3}'
+'.qr-url{font-size:5pt;color:rgba(255,255,255,.35);text-align:center;max-width:65px;word-break:break-all;line-height:1.3}'
+'.info{padding:4px 12px;background:#f8fafc;border-top:.5pt solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:7.5pt;color:#64748b}'
+'.badge-orig{border:1.5px solid #15803d;color:#15803d;border-radius:3px;padding:1px 7px;font-size:7.5pt;font-weight:700;letter-spacing:.8px}'
+'.badge-copy{border:1.5px solid #b45309;color:#b45309;border-radius:3px;padding:1px 7px;font-size:7.5pt;font-weight:700;letter-spacing:.8px}'
+'.sig{padding:8px 12px 6px;border-top:.5pt solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end}'
+'.sig-block{text-align:center;min-width:120px}'
+'.sig-lbl{font-size:8pt;color:#64748b}'
+'.sig-lbl-ar{font-size:7pt;color:#94a3b8;display:block;margin-top:1px}'
+'.sig-line{border-top:.5pt solid #94a3b8;padding-top:16px;margin-bottom:3px;width:140px}'
+'.stamp-circle{margin:0 auto;margin-top:2px}'
+'.footer{background:#1B3A6B;padding:4px 12px;text-align:center;font-size:7pt;color:rgba(255,255,255,.4);border-radius:0 0 4px 4px}'
+'.bb{padding:1px 6px;border-radius:7px;font-size:8pt;font-weight:600}'
+'.b-food{background:#FFFBEB;color:#B45309}'
+'.b-diwan{background:#EFF6FF;color:#1D4ED8}'
+'.b-don{background:#F5F3FF;color:#6D28D9}'
+'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
/* PAY_CSS: Navy professional (not purple) with red accent for payment distinction */
const PAY_CSS=REC_CSS
  .replace(/background:#1B3A6B/g,'background:#111827')
  .replace(/.hdr\{background:#1B3A6B/g,'.hdr{background:#111827')
  .replace(/color:#00C896/g,'color:#F87171')
  .replace(/background:linear-gradient\(90deg,#00C896,#059669,#1B6CA8\)/,'background:linear-gradient(90deg,#F87171,#DC2626,#111827)')
  .replace(/border:1px solid rgba\(0,200,150,.5\)/g,'border:1px solid rgba(248,113,113,.5)')
  .replace(/background:rgba\(0,200,150,.15\)/g,'background:rgba(248,113,113,.12)')
  .replace(/#1B3A6B/g,'#111827');
function buildRecVoucher(r,label){
  const fundLabel=r.fund_type==='food'?'صندوق الغداء':r.fund_type==='donation'?'تبرع':'صندوق الديوان';
  const fundClass=r.fund_type==='food'?'b-food':r.fund_type==='donation'?'b-don':'b-diwan';
  const now=new Date();
  const pt=fmtDate2(now.toISOString())+' '+now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
  const meth=r.payment_method||'cash';
  const methAr=METHOD_LABELS[meth]||meth;
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(r.no);
  const stampType='receipt';
 
  return '<div class="half">'
    +'<div>'
 
    /* ── HEADER ── */
    +'<div class="hdr">'
      +'<div><span class="org-ar">ديوان آل طه</span><span class="org-en">Diwan Al-Taha Family</span></div>'
      +'<div style="text-align:center">'
        +'<span class="ttl-ar">سند قبض</span>'
        +'<span class="ttl-en">Receipt Voucher</span>'
        +'<div class="verified-badge"><span style="font-size:9pt;color:#00C896">✓</span><span>معتمد إلكترونياً · Verified</span></div>'
      +'</div>'
      +'<div><span class="no-l">Voucher No.</span><span class="no-v">'+esc(r.no)+'</span></div>'
    +'</div>'
 
    /* ── STRIP ── */
    +'<div class="strip"></div>'
 
    /* ── META ── */
    +'<div class="meta">'
      +'<div class="mi"><span class="ml">DATE / التاريخ</span><span class="mv">'+fmtDate2(r.receipt_date)+'</span></div>'
      +'<div class="mi"><span class="ml">PAYER / الدافع</span><span class="mv">'+esc(r.payer_name||gmn(r.member_id))+'</span></div>'
    +'</div>'
 
    /* ── FIELDS ── */
    +'<div class="rows">'
      +'<div class="row"><span class="rk">Fund / الصندوق</span><span class="rv"><span class="bb '+fundClass+'">'+fundLabel+'</span></span></div>'
      +'<div class="row"><span class="rk">Method / طريقة الدفع</span><span class="rv">'+methAr+'</span></div>'
      +(r.currency!=='ILS'?'<div class="row"><span class="rk">Currency / العملة</span><span class="rv">'+fmtD(r.amount)+' '+r.currency+' × ₪'+Number(r.exchange_rate||1).toFixed(2)+'</span></div>':'')
      +(r.notes?'<div class="row"><span class="rk">Notes / ملاحظات</span><span class="rv">'+esc(r.notes)+'</span></div>':'')
    +'</div>'
 
    +'</div>'
 
    /* ── BOTTOM SECTION ── */
    +'<div>'
 
    /* ── AMOUNT + QR ── */
    +'<div class="amt">'
      +'<div class="qr-area"><div data-qr-url="'+verifyUrl+'"></div>'
      +'<span class="qr-cap">Scan To Verify<br>امسح للتحقق</span>'
      +'<span class="qr-url">diwan-finance.com/verify/'+esc(r.no)+'</span></div>'
      +'<span class="al">AMOUNT / المبلغ</span>'
      +'<span class="an">₪ '+fmt(r.amount_ils||r.amount)+'</span>'
      +'<span class="aw-ar">'+amountToWordsAr(r.amount_ils||r.amount)+'</span>'
      +'<span class="aw">'+amountToWords(r.amount_ils||r.amount)+'</span>'
    +'</div>'
 
    /* ── INFO BAR ── */
    +'<div class="info">'
      +'<span>Created By: '+firstName(r.created_by)+' · '+pt+'</span>'
      +'<span class="'+( label==='ORIGINAL'?'badge-orig':'badge-copy')+'">'+label+'</span>'
    +'</div>'
 
    /* ── SIGNATURES + STAMP ── */
    +'<div class="sig">'
      +'<div class="sig-block"><div class="sig-lbl">Prepared By · أعدّه</div>'
        +'<svg class="stamp-circle" width="70" height="70" viewBox="0 0 70 70">'
          +'<circle cx="35" cy="35" r="33" fill="none" stroke="#1B3A6B" stroke-width="1.5"/>'
          +'<circle cx="35" cy="35" r="26" fill="none" stroke="#1B3A6B" stroke-width="0.6" stroke-dasharray="2,2"/>'
          +'<path id="rtop'+r.no+'" d="M12,35 a23,23 0 0,1 46,0" fill="none"/>'
          +'<text font-size="5" font-weight="700" fill="#1B3A6B" font-family="Cairo,Arial"><textPath href="#rtop'+r.no+'" startOffset="50%" text-anchor="middle">DIWAN AL TAHA</textPath></text>'
          +'<text x="35" y="31" text-anchor="middle" font-size="3.8" fill="#1B3A6B" font-family="Cairo,Arial" opacity="0.7">التوقيع · Signature</text>'
          +'<line x1="20" y1="36" x2="50" y2="36" stroke="#1B3A6B" stroke-width="0.6"/>'
          +'<path id="rbot'+r.no+'" d="M12,35 a23,23 0 0,0 46,0" fill="none"/>'
          +'<text font-size="4.5" fill="#1B3A6B" font-family="Arial"><textPath href="#rbot'+r.no+'" startOffset="50%" text-anchor="middle">diwan-finance.com / receipt</textPath></text>'
        +'</svg>'
      +'</div>'
      +'<div class="sig-block">'
        +'<div class="sig-lbl">Receiver Signature</div>'
        +'<div class="sig-lbl-ar">توقيع المستلم</div>'
        +'<div class="sig-line"></div>'
      +'</div>'
    +'</div>'
 
    /* ── FOOTER ── */
    +'<div class="footer">جميع الحقوق محفوظة © 2026 | ديوان آل طه | All rights reserved | diwan-finance.com</div>'
 
    +'</div>'
    +(label==='ORIGINAL'?'<div class="cut">✂  قص هنا — Cut Here  ✂</div>':'')
    +'</div>';
}
function buildPayVoucher(p,label){
  const expLabel=L.expense(p.expense_type);
  const fundLabel=p.fund_type==='food'?'صندوق الغداء':'صندوق الديوان';
  const now=new Date();
  const pt=fmtDate2(now.toISOString())+' '+now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(p.no);
 
  return '<div class="half">'
    +'<div>'
 
    /* ── HEADER ── */
    +'<div class="hdr">'
      +'<div><span class="org-ar">ديوان آل طه</span><span class="org-en">Diwan Al-Taha Family</span></div>'
      +'<div style="text-align:center">'
        +'<span class="ttl-ar">سند صرف</span>'
        +'<span class="ttl-en">Payment Voucher</span>'
        +'<div class="verified-badge"><span style="font-size:9pt;color:#FCA5A5">✓</span><span>معتمد إلكترونياً · Verified</span></div>'
      +'</div>'
      +'<div><span class="no-l">Voucher No.</span><span class="no-v">'+esc(p.no)+'</span></div>'
    +'</div>'
 
    /* ── STRIP ── */
    +'<div class="strip"></div>'
 
    /* ── META ── */
    +'<div class="meta">'
      +'<div class="mi"><span class="ml">DATE / التاريخ</span><span class="mv">'+fmtDate2(p.payment_date)+'</span></div>'
      +'<div class="mi"><span class="ml">BENEFICIARY / المستفيد</span><span class="mv">'+esc(p.beneficiary_name||gmn(p.member_id))+'</span></div>'
    +'</div>'
 
    /* ── FIELDS ── */
    +'<div class="rows">'
      +'<div class="row"><span class="rk">Fund / الصندوق</span><span class="rv">'+fundLabel+'</span></div>'
      +'<div class="row"><span class="rk">Category / الفئة</span><span class="rv">'+expLabel+'</span></div>'
      +'<div class="row"><span class="rk">Method / طريقة الصرف</span><span class="rv">'+(L.method(p.payment_method))+'</span></div>'
      +(p.currency!=='ILS'?'<div class="row"><span class="rk">Currency / العملة</span><span class="rv">'+fmtD(p.amount)+' '+p.currency+' × ₪'+Number(p.exchange_rate||1).toFixed(2)+'</span></div>':'')
      +(p.notes?'<div class="row"><span class="rk">Notes / ملاحظات</span><span class="rv">'+esc(p.notes)+'</span></div>':'')
      +(p.approved_by?'<div class="row"><span class="rk">Approved / معتمد</span><span class="rv">'+esc(p.approved_by)+'</span></div>':'')
    +'</div>'
 
    +'</div>'
 
    /* ── BOTTOM SECTION ── */
    +'<div>'
 
    /* ── AMOUNT + QR ── */
    +'<div class="amt">'
      +'<div class="qr-area"><div data-qr-url="'+verifyUrl+'"></div>'
      +'<span class="qr-cap">Scan To Verify<br>امسح للتحقق</span>'
      +'<span class="qr-url">diwan-finance.com/verify/'+esc(p.no)+'</span></div>'
      +'<span class="al">AMOUNT / المبلغ</span>'
      +'<span class="an">₪ '+fmt(p.amount_ils||p.amount)+'</span>'
      +'<span class="aw-ar">'+amountToWordsAr(p.amount_ils||p.amount)+'</span>'
      +'<span class="aw">'+amountToWords(p.amount_ils||p.amount)+'</span>'
    +'</div>'
 
    /* ── INFO BAR ── */
    +'<div class="info">'
      +'<span>Created By: '+firstName(p.created_by)+' · '+pt+'</span>'
      +'<span class="'+( label==='ORIGINAL'?'badge-orig':'badge-copy')+'">'+label+'</span>'
    +'</div>'
 
    /* ── SIGNATURES + STAMP ── */
    +'<div class="sig">'
      +'<div class="sig-block"><div class="sig-lbl">Prepared By · أعدّه</div>'
        +'<svg class="stamp-circle" width="70" height="70" viewBox="0 0 70 70">'
          +'<circle cx="35" cy="35" r="33" fill="none" stroke="#2d1b69" stroke-width="1.5"/>'
          +'<circle cx="35" cy="35" r="26" fill="none" stroke="#2d1b69" stroke-width="0.6" stroke-dasharray="2,2"/>'
          +'<path id="ptop'+p.no+'" d="M12,35 a23,23 0 0,1 46,0" fill="none"/>'
          +'<text font-size="5" font-weight="700" fill="#2d1b69" font-family="Cairo,Arial"><textPath href="#ptop'+p.no+'" startOffset="50%" text-anchor="middle">DIWAN AL TAHA</textPath></text>'
          +'<text x="35" y="31" text-anchor="middle" font-size="3.8" fill="#2d1b69" font-family="Cairo,Arial" opacity="0.7">التوقيع · Signature</text>'
          +'<line x1="20" y1="36" x2="50" y2="36" stroke="#2d1b69" stroke-width="0.6"/>'
          +'<path id="pbot'+p.no+'" d="M12,35 a23,23 0 0,0 46,0" fill="none"/>'
          +'<text font-size="4.5" fill="#2d1b69" font-family="Arial"><textPath href="#pbot'+p.no+'" startOffset="50%" text-anchor="middle">diwan-finance.com / payment</textPath></text>'
        +'</svg>'
      +'</div>'
      +'<div class="sig-block">'
        +'<div class="sig-lbl">Payer Signature</div>'
        +'<div class="sig-lbl-ar">توقيع الدافع</div>'
        +'<div class="sig-line"></div>'
      +'</div>'
    +'</div>'
 
    /* ── FOOTER ── */
    +'<div class="footer">جميع الحقوق محفوظة © 2026 | ديوان آل طه | All rights reserved | diwan-finance.com</div>'
 
    +'</div>'
    +(label==='ORIGINAL'?'<div class="cut">✂  قص هنا — Cut Here  ✂</div>':'')
    +'</div>';
}

/* ── Print functions: all guarded by can.print() ── */
window.prtRec=function(id){
  if(!can.print()){toast(window.LANG==='ar'?'ليس لديك صلاحية الطباعة':'No print permission','err');return;}
  const r=DB.receipts.find(x=>x.id===id);if(!r)return;
  openPrintWin(REC_CSS,buildRecVoucher(r,'ORIGINAL')+buildRecVoucher(r,'COPY'));
};
window.prtPay=function(id){
  if(!can.print()){toast(window.LANG==='ar'?'ليس لديك صلاحية الطباعة':'No print permission','err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  openPrintWin(PAY_CSS,buildPayVoucher(p,'ORIGINAL')+buildPayVoucher(p,'COPY'));
};
function amountToWordsAr(n){
  n=Math.round(Number(n||0));
  if(n===0) return 'صفر شيكل فقط لا غير';
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
    'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hundreds=['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
  let parts=[];
  if(n>=1000){
    const t=Math.floor(n/1000);
    if(t===1) parts.push('ألف');
    else if(t===2) parts.push('ألفان');
    else if(t<=10) parts.push(ones[t]+' آلاف');
    else parts.push(t+' ألف');
    n=n%1000;
  }
  if(n>=100){
    parts.push(hundreds[Math.floor(n/100)]);
    n=n%100;
  }
  if(n>=20){
    const u=n%10;
    if(u>0) parts.push(ones[u]+' و'+tens[Math.floor(n/10)]);
    else parts.push(tens[Math.floor(n/10)]);
  } else if(n>0){
    parts.push(ones[n]);
  }
  return parts.join(' و')+' شيكل فقط لا غير';
}
/* ═══ PRINT STATEMENTS ═══ */
window.prtStmt=function(fund){
  if(!can.print()){toast(window.LANG==='ar'?'ليس لديك صلاحية الطباعة':'No print permission','err');return;}
  const from=document.getElementById(fund+'-stmt-from')?.value||'';
  const to=document.getElementById(fund+'-stmt-to')?.value||'';
  const type=document.getElementById(fund+'-stmt-type')?.value||'';
  const rows=FIN.fundLedger(fund,from,to,type);
  const fundLabel=fund==='food'?'صندوق الغداء':'صندوق الديوان';
  const fundColor=fund==='food'?'#B45309':'#1D4ED8';
  let bal=0,totCr=0,totDr=0;
  const rowsHTML=rows.map(r=>{
    bal+=r.cr-r.dr;totCr+=r.cr;totDr+=r.dr;
    return`<tr><td>${fmtDate2(r.date)}</td><td>${r.name}</td><td>${r.desc}</td><td style="color:green;text-align:left">${r.cr>0?'₪ '+fmt(r.cr):'—'}</td><td style="color:red;text-align:left">${r.dr>0?'₪ '+fmt(r.dr):r.type==='don'?'تبرع':'—'}</td><td style="text-align:left;font-weight:600;color:${bal>=0?'green':'red'}">₪ ${fmt(bal)}</td><td style="font-size:8pt;color:#666">${r.note||''}</td></tr>`;
  }).join('');
  const css='@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Cairo",Arial,sans-serif;direction:rtl;color:#000}h1{font-size:14pt;color:'+fundColor+';margin-bottom:4px}p{font-size:9pt;color:#666;margin-bottom:12px}.summ{display:flex;gap:16px;margin-bottom:14px}.scard{border:1pt solid #ddd;border-radius:4px;padding:8px 14px;min-width:120px}.sl{font-size:7.5pt;color:#666;display:block}.sv{font-size:13pt;font-weight:700}table{width:100%;border-collapse:collapse;font-size:9pt}thead th{background:#0A1628;color:#fff;padding:6px 8px;text-align:right;font-weight:500}tbody td{padding:5px 8px;border-bottom:.5pt solid #f0f0f0}tbody tr:nth-child(even){background:#f9f9f9}tfoot td{padding:6px 8px;font-weight:700;background:#f0f0f0;border-top:1pt solid #ccc}.footer{text-align:center;font-size:7.5pt;color:#aaa;margin-top:16px;border-top:1pt solid #eee;padding-top:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  const body=`<h1>${fundLabel}</h1><p>${from&&to?`الفترة: ${fmtDate2(from)} — ${fmtDate2(to)}`:from?`من ${fmtDate2(from)}`:to?`حتى ${fmtDate2(to)}`:'كل الفترات'} | طُبع: ${fmtDate2(new Date().toISOString())}</p>
  <div class="summ"><div class="scard"><span class="sl">إجمالي الإيرادات</span><span class="sv" style="color:green">₪ ${fmt(totCr)}</span></div><div class="scard"><span class="sl">إجمالي المصاريف</span><span class="sv" style="color:red">₪ ${fmt(totDr)}</span></div><div class="scard"><span class="sl">الرصيد الختامي</span><span class="sv" style="color:${bal>=0?'green':'red'}">₪ ${fmt(bal)}</span></div></div>
  <table><thead><tr><th>التاريخ</th><th>الاسم</th><th>البيان</th><th>دائن ₪</th><th>مدين ₪</th><th>الرصيد ₪</th><th>ملاحظات</th></tr></thead><tbody>${rowsHTML}</tbody></table>
  <div class="footer">All rights reserved © 2026-2027 | Diwan Al-Taha Financial Management System</div>`;
  openPrintWin(css,body);
};
window.prtMemberStmt=function(){
  if(!can.print()){toast(window.LANG==='ar'?'ليس لديك صلاحية الطباعة':'No print permission','err');return;}
  const mid=document.getElementById('ms-member')?.value;
  if(!mid){toast('اختر عضواً أولاً','warn');return;}
  const member=gm(mid);if(!member)return;
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';

  /* ── date range filter ── */
  const fd=from?new Date(from):null;
  const td=to?new Date(to):null;
  const inRange=d=>{
    if(!d||d==='—') return true;
    const dt=new Date(d);
    if(fd&&dt<fd) return false;
    if(td&&dt>td) return false;
    return true;
  };

  const rows=[];
  const openBal=Number(member.opening_balance||0);

  /* opening balance — موجب = مدين على العضو (متطابق مع الشاشة) */
  if(openBal!==0) rows.push({date:'—',no:'—',desc:'رصيد افتتاحي · Opening Balance',cr:0,dr:openBal,cls:'opening'});

  /* annual dues — مفلتر بـ active_from_year (إصلاح BUG 1) */
  DB.annual
    .filter(a=>!member.active_from_year||a.year>=member.active_from_year)
    .forEach(a=>rows.push({date:a.applied_at?.slice(0,10)||a.year+'-01-01',no:'—',desc:`اشتراك سنة ${a.year}`,cr:0,dr:Number(a.amount),cls:'due'}));

  /* receipts — مفلترة بالتاريخ */
  DB.receipts
    .filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===mid&&inRange(r.receipt_date))
    .forEach(r=>rows.push({date:r.receipt_date,no:r.no,desc:r.notes||'مساهمة',cr:Number(r.amount_ils||r.amount),dr:0,cls:'paid'}));

  rows.sort((a,b)=>a.date==='—'?-1:b.date==='—'?1:new Date(a.date)-new Date(b.date));

  /* summary */
  const totalDues=rows.filter(r=>r.cls==='due').reduce((s,r)=>s+r.dr,0);
  const totalPaid=rows.filter(r=>r.cls==='paid').reduce((s,r)=>s+r.cr,0);
  let bal=0;
  const rowsHTML=rows.map(r=>{
    bal+=r.dr-r.cr;
    const rowBg=r.cls==='due'?'background:#fff8f0':r.cls==='paid'?'background:#f0fdf4':r.cls==='opening'?'background:#f0f4ff':'';
    const balColor=bal>0?'#DC2626':bal<0?'#059669':'#374151';
    return`<tr style="${rowBg}">
      <td style="white-space:nowrap">${r.date==='—'?'—':fmtDate2(r.date)}</td>
      <td style="font-family:monospace;font-size:8pt">${esc(r.no)}</td>
      <td>${esc(r.desc)}</td>
      <td style="color:#059669;text-align:left;font-weight:600">${r.cr>0?'₪ '+fmt(r.cr):'—'}</td>
      <td style="color:#DC2626;text-align:left;font-weight:600">${r.dr>0?'₪ '+fmt(r.dr):'—'}</td>
      <td style="text-align:left;font-weight:700;color:${balColor}">₪ ${fmt(bal)}</td>
    </tr>`;
  }).join('');

  const finalBal=openBal+totalDues-totalPaid;
  const finalColor=finalBal>0?'#DC2626':finalBal<0?'#059669':'#374151';
  const printDate=new Date().toLocaleDateString('en-GB').replace(/\//g,'/');
  const periodLabel=from&&to?`${fmtDate2(from)} — ${fmtDate2(to)}`:from?`من ${fmtDate2(from)}`:to?`حتى ${fmtDate2(to)}`:'كل الفترات';

  const css=`@page{size:A4 portrait;margin:12mm 14mm}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Cairo",Arial,sans-serif;direction:rtl;color:#000;font-size:10pt}
    .hdr{background:#0F2B5B;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-radius:4px 4px 0 0}
    .hdr-left .org{font-size:13pt;font-weight:700;color:#fff;display:block}
    .hdr-left .org-en{font-size:8pt;color:rgba(255,255,255,.45);display:block;letter-spacing:.5px}
    .hdr-center .doc-type{font-size:12pt;font-weight:700;color:#00C896;display:block;text-align:center}
    .hdr-center .doc-type-en{font-size:8pt;color:rgba(0,200,150,.6);display:block;text-align:center}
    .hdr-right{text-align:left}
    .hdr-right .lbl{font-size:7pt;color:rgba(255,255,255,.4)}
    .hdr-right .val{font-size:10pt;font-weight:700;color:#fff;font-family:monospace}
    .strip{height:2.5px;background:linear-gradient(to left,#0F2B5B,#059669,#00C896)}
    .member-info{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:.5pt solid #e2e8f0}
    .mi{padding:6px 10px;border-left:.5pt solid #e2e8f0}
    .mi .lbl{font-size:7pt;color:#94a3b8;text-transform:uppercase;display:block;margin-bottom:1px;letter-spacing:.05em}
    .mi .val{font-size:10pt;font-weight:600;color:#0A1628}
    .summary{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;background:#f8fafc;border-bottom:1pt solid #e2e8f0;padding:8px 10px;gap:8px}
    .sum-cell{text-align:center;padding:6px;background:#fff;border:.5pt solid #e2e8f0;border-radius:3px}
    .sum-lbl{font-size:7pt;color:#64748b;display:block;margin-bottom:2px}
    .sum-val{font-size:11pt;font-weight:700}
    table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:0}
    thead th{background:#0F2B5B;color:#fff;padding:6px 8px;text-align:right;font-weight:500;font-size:8.5pt}
    tbody td{padding:5px 8px;border-bottom:.5pt solid #f1f5f9;vertical-align:middle}
    .final-row{background:#0F2B5B;color:#fff;font-weight:700;font-size:10pt}
    .final-row td{padding:7px 8px;color:#fff}
    .sig-area{display:flex;justify-content:space-between;padding:10px 10px 6px;border-top:.5pt solid #e2e8f0;margin-top:8px}
    .sig-block{text-align:center;min-width:100px}
    .sig-lbl{font-size:7.5pt;color:#64748b;display:block}
    .sig-lbl-ar{font-size:7pt;color:#94a3b8;display:block;margin-top:1px}
    .sig-line{border-top:.5pt solid #94a3b8;margin:10px auto 3px;width:90px}
    .stamp{width:50px;height:50px;border-radius:50%;border:1pt solid #0F2B5B;margin:2px auto;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#0F2B5B;text-align:center;line-height:1.3;font-family:Arial}
    .footer{background:#0F2B5B;padding:4px 10px;text-align:center;font-size:7pt;color:rgba(255,255,255,.4);margin-top:6px;border-radius:0 0 4px 4px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

  const body=`
    <div class="hdr">
      <div class="hdr-left">
        <span class="org">ديوان آل طه</span>
        <span class="org-en">DIWAN AL-TAHA FAMILY</span>
      </div>
      <div class="hdr-center">
        <span class="doc-type">كشف حساب العضو</span>
        <span class="doc-type-en">MEMBER ACCOUNT STATEMENT</span>
      </div>
      <div class="hdr-right">
        <div class="lbl">طُبع في</div>
        <div class="val">${printDate}</div>
      </div>
    </div>
    <div class="strip"></div>
    <div class="member-info">
      <div class="mi"><span class="lbl">الاسم · Name</span><span class="val">${esc(member.name)}</span></div>
      <div class="mi"><span class="lbl">عضو منذ · Since</span><span class="val">${member.active_from_year||'—'}</span></div>
      <div class="mi"><span class="lbl">الفترة · Period</span><span class="val">${periodLabel}</span></div>
    </div>
    <div class="summary">
      <div class="sum-cell"><span class="sum-lbl">رصيد افتتاحي</span><span class="sum-val" style="color:#1D4ED8">₪ ${fmt(openBal)}</span></div>
      <div class="sum-cell"><span class="sum-lbl">إجمالي الاشتراكات</span><span class="sum-val" style="color:#DC2626">₪ ${fmt(totalDues)}</span></div>
      <div class="sum-cell"><span class="sum-lbl">إجمالي المدفوعات</span><span class="sum-val" style="color:#059669">₪ ${fmt(totalPaid)}</span></div>
      <div class="sum-cell"><span class="sum-lbl">الرصيد الحالي</span><span class="sum-val" style="color:${finalColor}">₪ ${fmt(finalBal)}</span></div>
    </div>
    <table>
      <thead><tr><th>التاريخ</th><th>رقم السند</th><th>البيان</th><th>دائن ₪</th><th>مدين ₪</th><th>الرصيد ₪</th></tr></thead>
      <tbody>${rowsHTML}
        <tr class="final-row">
          <td colspan="5" style="text-align:right">الرصيد النهائي · Final Balance</td>
          <td style="text-align:left;color:${finalColor}">₪ ${fmt(finalBal)}</td>
        </tr>
      </tbody>
    </table>
    <div class="sig-area">
      <div class="sig-block">
        <div class="stamp">DIWAN<br>AL TAHA</div>
        <span class="sig-lbl">Prepared By</span>
        <span class="sig-lbl-ar">أعدّه</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <span class="sig-lbl">Member Signature</span>
        <span class="sig-lbl-ar">توقيع العضو</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <span class="sig-lbl">Manager Approval</span>
        <span class="sig-lbl-ar">اعتماد المسؤول</span>
      </div>
    </div>
    <div class="footer">جميع الحقوق محفوظة © 2026 | ديوان آل طه | All rights reserved | diwan-finance.com</div>`;
  openPrintWin(css,body);
};

/* ═══ PDF & EXPORT ═══ */
window.exportPDF=function(type){
  if(!can.print()){toast(window.t?window.t('errors.no_print'):'لا توجد صلاحية','err');return;}
  if(type==='food-stmt')  window.prtStmt('food');
  else if(type==='diwan-stmt') window.prtStmt('diwan');
  else if(type==='member') window.prtMemberStmt();
  else if(type==='don')    window.prtDonStmt();
};

window.prtDonStmt=function(){
  if(!can.print()){toast(window.LANG==='ar'?'ليس لديك صلاحية الطباعة':'No print permission','err');return;}
  const rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
  const tot=rows.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const rowsHTML=rows.map(r=>`<tr>
    <td>${fmtDate2(r.receipt_date)}</td>
    <td>${r.payer_name||gmn(r.member_id)||'—'}</td>
    <td style="text-align:left;color:#1B3A6B;font-weight:600">₪ ${fmtEN(r.amount_ils||r.amount)}</td>
    <td>${r.currency!=='ILS'?fmtD(r.amount)+' '+r.currency:'-'}</td>
    <td>${r.donation_display_fund==='food'?'صندوق الغداء':'صندوق الديوان'}</td>
    <td>${r.notes||'—'}</td>
  </tr>`).join('');
  const css=`@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#000}
    h1{font-size:14pt;color:#7C3AED;margin-bottom:4px}p{font-size:9pt;color:#666;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:9.5pt}
    thead th{background:#1B3A6B;color:#fff;padding:6px 10px;text-align:right;font-weight:500}
    tbody td{padding:5px 10px;border-bottom:.5pt solid #f0f0f0}
    tbody tr:nth-child(even){background:#f9f9f9}
    tfoot td{font-weight:700;background:#f0f0f0;border-top:1pt solid #ccc;padding:6px 10px}
    .footer{text-align:center;font-size:7.5pt;color:#aaa;margin-top:16px;border-top:1pt solid #eee;padding-top:8px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
  const body=`<h1>سجل التبرعات</h1><p>طُبع: ${fmtDate2(new Date().toISOString())} | بواسطة: ${firstName(CUR?.full_name||CU?.email)}</p>
  <table><thead><tr><th>التاريخ</th><th>المتبرع</th><th>المبلغ ₪</th><th>العملة</th><th>يُظهر في</th><th>ملاحظات</th></tr></thead>
  <tbody>${rowsHTML}</tbody>
  <tfoot><tr><td colspan="2">الإجمالي</td><td style="text-align:left">₪ ${fmtEN(tot)}</td><td colspan="3"></td></tr></tfoot></table>
  <div class="footer"><strong>All rights reserved © 2026-2027 | Diwan Al-Taha Financial Management System</strong></div>`;
  openPrintWin(css,body);
};

/* ═══ EXPORT CSV / BACKUP ═══ */
window.doBackup=function(){
  if(!can.export()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية التصدير','err');return;}
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='diwan_backup_'+today()+'.json';a.click();
  toast(window.t('messages.exported'),'ok');
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
    rows=stmtRows.map(r=>{bal+=r.cr-r.dr;return[fmtDate2(r.date),r.name,r.desc,r.cr||'',r.dr||'',bal,r.note||''];});
  }else if(type==='diwan-stmt'){
    const from=document.getElementById('diwan-stmt-from')?.value||'';
    const to=document.getElementById('diwan-stmt-to')?.value||'';
    const stmtRows=FIN.fundLedger('diwan',from,to,'');
    let bal=0;
    h=['التاريخ','الاسم','البيان','دائن ₪','مدين ₪','الرصيد ₪','ملاحظات'];
    rows=stmtRows.map(r=>{bal+=r.cr-r.dr;return[fmtDate2(r.date),r.name,r.desc,r.cr||'',r.dr||'',bal,r.note||''];});
  }else if(type==='member-stmt'){
    const mid=document.getElementById('ms-member')?.value;
    const member=gm(mid);
    if(!member){toast('اختر عضواً أولاً','warn');return;}
    h=['التاريخ','رقم السند','البيان','دائن ₪','مدين ₪','الرصيد ₪'];
    const csvRows=[];
    const openBal=Number(member.opening_balance||0);
    let csvBal=0;
    if(openBal!==0){csvBal+=openBal;csvRows.push(['—','—','رصيد افتتاحي','',openBal,csvBal]);}
    /* BUG 5 FIX: active_from_year filter */
    DB.annual
      .filter(a=>!member.active_from_year||a.year>=member.active_from_year)
      .forEach(a=>{csvBal+=Number(a.amount);csvRows.push([a.applied_at?.slice(0,10)||a.year+'-01-01','—',`اشتراك سنة ${a.year}`,'',a.amount,csvBal]);});
    DB.receipts
      .filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===mid)
      .sort((a,b)=>new Date(a.receipt_date)-new Date(b.receipt_date))
      .forEach(r=>{csvBal-=Number(r.amount_ils||r.amount);csvRows.push([r.receipt_date,r.no,r.notes||'مساهمة',r.amount_ils||r.amount,'',csvBal]);});
    rows=csvRows;
  }else if(type==='food-rec'){
    h=['رقم','التاريخ','الدافع','المبلغ ₪','العملة','طريقة الدفع','ملاحظات'];
    rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').map(r=>[r.no,r.receipt_date,r.payer_name||gmn(r.member_id),r.amount_ils||r.amount,r.currency,r.payment_method,r.notes]);
  }else if(type==='food-pay'){
    h=['رقم','التاريخ','المستفيد','المبلغ ₪','طريقة الصرف','ملاحظات'];
    rows=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').map(p=>[p.no,p.payment_date,p.beneficiary_name||gmn(p.member_id),p.amount_ils||p.amount,p.payment_method,p.notes]);
  }else if(type==='diwan-rec'){
    h=['رقم','التاريخ','الدافع','المبلغ ₪','العملة','طريقة الدفع','ملاحظات'];
    rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').map(r=>[r.no,r.receipt_date,r.payer_name||gmn(r.member_id),r.amount_ils||r.amount,r.currency,r.payment_method,r.notes]);
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
  if(!member){toast('اختر عضواً أولاً','warn');return;}
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';
  const fd=from?new Date(from):null;
  const td=to?new Date(to):null;
  const inRange=d=>{if(!d||d==='—')return true;const dt=new Date(d);if(fd&&dt<fd)return false;if(td&&dt>td)return false;return true;};
  const openBal=Number(member.opening_balance||0);
  const stmtRows=[];
  if(openBal!==0) stmtRows.push({date:'—',no:'—',desc:'\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a \u00b7 Opening Balance',cr:0,dr:openBal,cls:'opening'});
  DB.annual
    .filter(a=>!member.active_from_year||a.year>=member.active_from_year)
    .forEach(a=>stmtRows.push({date:a.applied_at?.slice(0,10)||a.year+'-01-01',no:'—',desc:`\u0627\u0634\u062a\u0631\u0627\u0643 \u0633\u0646\u0629 ${a.year}`,cr:0,dr:Number(a.amount),cls:'due'}));
  DB.receipts
    .filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===mid&&inRange(r.receipt_date))
    .forEach(r=>stmtRows.push({date:r.receipt_date,no:r.no,desc:r.notes||'\u062f\u0641\u0639\u0629 \u0645\u0633\u0627\u0647\u0645\u0629',cr:Number(r.amount_ils||r.amount),dr:0,cls:'paid'}));
  stmtRows.sort((a,b)=>a.date==='—'?-1:b.date==='—'?1:new Date(a.date)-new Date(b.date));

  /* running balance: dr-cr (dues+, payments-) */
  let runBal=0;
  const computed=stmtRows.map(r=>{runBal+=r.dr-r.cr;return{...r,bal:runBal};});

  const totalDues=stmtRows.filter(r=>r.cls==='due').reduce((s,r)=>s+r.dr,0);
  const totalPaid=stmtRows.filter(r=>r.cls==='paid').reduce((s,r)=>s+r.cr,0);
  const finalBal=openBal+totalDues-totalPaid;
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
    const doExcel=()=>{
      const XLSX=window.XLSX;if(!XLSX){toast('\u062c\u0627\u0631\u064f \u062a\u062d\u0645\u064a\u0644 \u0645\u0643\u062a\u0628\u0629 Excel...','info');return;}
      const wsData=[['\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 \u2014 \u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0636\u0648'],[`\u0627\u0644\u0639\u0636\u0648: ${member.name}  |  \u0627\u0644\u0641\u062a\u0631\u0629: ${periodLabel}`],[],['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062f','\u0627\u0644\u0628\u064a\u0627\u0646','\u062f\u0627\u0626\u0646 \u20aa','\u0645\u062f\u064a\u0646 \u20aa','\u0627\u0644\u0631\u0635\u064a\u062f \u20aa'],...computed.map(r=>[r.date==='—'?'—':r.date,r.no,r.desc,r.cr>0?r.cr:'',r.dr>0?r.dr:'',r.bal]),[],['\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a','','',openBal,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a','','',totalDues,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a','','','',totalPaid,''],['\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a','','','','',finalBal]];
      const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!cols']=[{wch:12},{wch:14},{wch:30},{wch:12},{wch:12},{wch:14}];ws['!rtl']=true;
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'\u0643\u0634\u0641 \u0627\u0644\u062d\u0633\u0627\u0628');XLSX.writeFile(wb,fname+'.xlsx');
      toast('\u2713 Excel exported','ok');
    };
    if(window.XLSX){doExcel();}else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=doExcel;document.head.appendChild(s);}
    return;
  }

  /* Shared HTML template */
  const bc=finalBal>0?'#DC2626':finalBal<0?'#059669':'#374151';
  const rowsHtml=computed.map(r=>{const bg=r.cls==='due'?'background:#fff8f0':r.cls==='paid'?'background:#f0fdf4':r.cls==='opening'?'background:#eef2ff':'';const rc=r.bal>0?'#DC2626':r.bal<0?'#059669':'#374151';return`<tr style="${bg}"><td>${r.date==='—'?'—':r.date}</td><td style="font-family:monospace">${esc(r.no)}</td><td>${esc(r.desc)}</td><td style="color:#059669;text-align:left;font-weight:600">${r.cr>0?'\u20aa '+fmt(r.cr):'—'}</td><td style="color:#DC2626;text-align:left;font-weight:600">${r.dr>0?'\u20aa '+fmt(r.dr):'—'}</td><td style="text-align:left;font-weight:700;color:${rc}">\u20aa ${fmt(r.bal)}</td></tr>`;}).join('');
  const htmlDoc=`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>\u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u2014 ${esc(member.name)}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Cairo",Arial,sans-serif;direction:rtl;color:#000;font-size:10pt;padding:14mm}.hdr{background:#0F2B5B;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-radius:4px 4px 0 0}.org{font-size:13pt;font-weight:700;color:#fff}.org-en{font-size:8pt;color:rgba(255,255,255,.4);display:block}.strip{height:2.5px;background:linear-gradient(to left,#0F2B5B,#059669,#00C896)}.summary{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;padding:8px;background:#f8fafc;border-bottom:1pt solid #e2e8f0}.sc{text-align:center;padding:5px;background:#fff;border:.5pt solid #e2e8f0;border-radius:3px}.sl{font-size:7pt;color:#64748b;display:block;margin-bottom:2px}.sv{font-size:11pt;font-weight:700}table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:0}thead th{background:#0F2B5B;color:#fff;padding:5px 8px;text-align:right;font-weight:500}tbody td{padding:4px 8px;border-bottom:.5pt solid #f1f5f9}.final{background:#0F2B5B}.final td{color:#fff;font-weight:700;padding:6px 8px}.footer{background:#0F2B5B;padding:3px;text-align:center;font-size:7pt;color:rgba(255,255,255,.3);margin-top:6px}@media print{body{padding:0}@page{size:A4 portrait;margin:12mm 14mm}}</style></head><body><div class="hdr"><div><span class="org">\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647</span><span class="org-en">DIWAN AL-TAHA</span></div><div style="text-align:center"><div style="font-size:12pt;font-weight:700;color:#00C896">\u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0627\u0644\u0639\u0636\u0648</div></div><div style="text-align:left;font-size:9pt;font-weight:600;color:#fff">${printDate}</div></div><div class="strip"></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:.5pt solid #e2e8f0"><div style="padding:5px 10px;border-left:.5pt solid #e2e8f0"><span style="font-size:7pt;color:#94a3b8;display:block">\u0627\u0644\u0627\u0633\u0645</span><span style="font-size:9.5pt;font-weight:600">${esc(member.name)}</span></div><div style="padding:5px 10px;border-left:.5pt solid #e2e8f0"><span style="font-size:7pt;color:#94a3b8;display:block">\u0639\u0636\u0648 \u0645\u0646\u0630</span><span style="font-size:9.5pt;font-weight:600">${member.active_from_year||'—'}</span></div><div style="padding:5px 10px"><span style="font-size:7pt;color:#94a3b8;display:block">\u0627\u0644\u0641\u062a\u0631\u0629</span><span style="font-size:9.5pt;font-weight:600">${periodLabel}</span></div></div><div class="summary"><div class="sc"><span class="sl">\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a</span><span class="sv" style="color:#1D4ED8">\u20aa ${fmt(openBal)}</span></div><div class="sc"><span class="sl">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a</span><span class="sv" style="color:#DC2626">\u20aa ${fmt(totalDues)}</span></div><div class="sc"><span class="sl">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a</span><span class="sv" style="color:#059669">\u20aa ${fmt(totalPaid)}</span></div><div class="sc"><span class="sl">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a</span><span class="sv" style="color:${bc}">\u20aa ${fmt(finalBal)}</span></div></div><table><thead><tr><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062f</th><th>\u0627\u0644\u0628\u064a\u0627\u0646</th><th>\u062f\u0627\u0626\u0646 \u20aa</th><th>\u0645\u062f\u064a\u0646 \u20aa</th><th>\u0627\u0644\u0631\u0635\u064a\u062f \u20aa</th></tr></thead><tbody>${rowsHtml}<tr class="final"><td colspan="5" style="text-align:right">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a</td><td style="text-align:left;color:${bc}">\u20aa ${fmt(finalBal)}</td></tr></tbody></table><div class="footer">\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629 \u00a9 2026 | \u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 | diwan-finance.com</div></body></html>`;

  if(format==='html'){
    const a=document.createElement('a');a.href='data:text/html;charset=utf-8,'+encodeURIComponent(htmlDoc);a.download=fname+'.html';a.click();
    toast('\u2713 HTML exported','ok');return;
  }

  /* PDF */
  if(format==='pdf'){
    const w=window.open('','_blank','width=800,height=700');
    if(!w){toast('\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0627\u0644\u0645\u0646\u0628\u062b\u0642\u0629 \u0645\u0637\u0644\u0648\u0628','warn');return;}
    w.document.write(htmlDoc);w.document.close();
    w.onload=()=>{w.focus();w.print();};
    toast('\u2713 \u0627\u0641\u062a\u062d \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0648\u062d\u062f\u062f "Save as PDF"','info');return;
  }
};


/* ═══ CLOCK ═══ */
function startClock(){
  const el=document.getElementById('clock');
  if(!el) return;
  /* Always English digits regardless of UI language; slightly larger */
  el.style.fontSize='14px';
  el.style.fontWeight='600';
  el.style.letterSpacing='0.5px';
  const tick=()=>{
    const now=new Date();
    const hh=String(now.getHours()).padStart(2,'0');
    const mm=String(now.getMinutes()).padStart(2,'0');
    el.textContent=hh+':'+mm;
  };
  tick();
  setInterval(tick,1000);
}

/* ═══ ENTER KEY NAVIGATION ═══ */
function setupEnterNav(formId){
  const form=document.getElementById(formId);
  if(!form)return;
  const fields=Array.from(form.querySelectorAll('input:not([type="hidden"]),select,textarea'));
  fields.forEach((el,i)=>{
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();
        const next=fields[i+1];
        if(next) next.focus();
      }
    });
  });
}
function setupAllForms(){
  ['m-rec','m-pay','m-member','m-edit-rec','m-edit-pay','m-edit-member','m-invite','m-change-pass'].forEach(setupEnterNav);
}

/* ═══ FORGOT PASSWORD ═══ */
window.forgotPassword=async function(){
  const emailEl=document.getElementById('l-email');
  const email=(emailEl?.value||'').trim();
  const msg=document.getElementById('forgot-msg');
  if(!email){
    if(msg){msg.textContent=window.LANG==='en'?'Enter your email first.':'أدخل بريدك الإلكتروني أولاً.';msg.style.display='block';setTimeout(()=>msg.style.display='none',5000);}
    return;
  }
  const {error}=await SB.auth.resetPasswordForEmail(email,{
    redirectTo:'https://www.diwan-finance.com/reset-password'
  });
  if(msg){
    if(error){
      msg.textContent=window.LANG==='en'?'Error: '+error.message:'خطأ: '+error.message;
    } else {
      msg.textContent=window.LANG==='en'?'Reset link sent to '+email:'تم إرسال رابط إعادة تعيين كلمة المرور إلى '+email+'. تحقق من بريدك.';
    }
    msg.style.display='block';
    setTimeout(()=>msg.style.display='none',8000);
  }
};

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
    titleEl.style.color='#ffffff';
    titleEl.style.textShadow='0 0 8px rgba(0,200,150,0.4)';
  }
  /* Fallback: target any element whose text contains the app name */
  document.querySelectorAll('.navbar *,.topbar *,.header *,.top-bar *').forEach(el=>{
    if(el.children.length===0 && el.textContent.includes('نظام الإدارة المالية')){
      el.style.color='#00C896';
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
    clockEl.style.fontFamily='monospace, sans-serif';
  }

  /* ── Rate display: enforce en-US numerals ── */
  const rateEl=document.getElementById('rate-txt');
  if(rateEl){
    rateEl.style.fontFamily='monospace, sans-serif';
    rateEl.style.fontVariantNumeric='tabular-nums';
  }
}

/* ── LOGIN PAGE TRANSLATION ── */
function applyLoginLang(){
  const isEn = window.LANG==='en';
  const ids = {
    'lbl-email': isEn?'Phone or Email':'رقم الهاتف أو البريد الإلكتروني',
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
  if(lEmail)lEmail.placeholder=isEn?'0599123456 or email@example.com':'0599123456 أو email@example.com';
  const lPass=document.getElementById('l-pass');
  if(lPass)lPass.placeholder=isEn?'••••••••':'••••••••';
  const loginBtn=document.getElementById('login-btn');
  if(loginBtn)loginBtn.innerHTML=`<i class="ti ti-login"></i><span id="btn-login-txt">${isEn?'Sign In':'تسجيل الدخول'}</span>`;
}

/* ═══ CHANGE PASSWORD ═══ */
window.changePassword = async function(){
  const newPass = document.getElementById('new-pass').value;
  const confirmPass = document.getElementById('confirm-pass').value;
  const v1 = vf('new-pass', v => v.length >= 6, 'e-new-pass');
  const v2 = vf('confirm-pass', v => v === newPass, 'e-confirm-pass');
  if(!v1 || !v2) return;
  const btn = document.querySelector('#m-change-pass .btn.primary');
  btn.disabled = true;
  btn.innerHTML = '<div class="spin"></div>';
  const { error } = await SB.auth.updateUser({ password: newPass });
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-lock-check"></i>حفظ كلمة المرور';
  if(error){toast('خطأ: ' + error.message, 'err');return;}
  await logAction('edit', 'تغيير كلمة المرور', 'auth', null);
  window.closeM();
  document.getElementById('new-pass').value = '';
  document.getElementById('confirm-pass').value = '';
  toast('✓ تم تغيير كلمة المرور بنجاح', 'ok');
};

/* ═══ MOBILE NAVIGATION ═══ */
function isMobile(){ return window.innerWidth <= 768; }

function initMobile(){
  const nav = document.getElementById('mobile-nav');
  const menu = document.getElementById('mobile-menu');
  if(!nav) return;
  if(isMobile()){
    nav.style.display = 'flex';
    if(menu) menu.style.display = 'none';
  } else {
    nav.style.display = 'none';
    if(menu) menu.style.display = 'none';
  }
}

window.setMobileNav = function(el){
  document.querySelectorAll('.mnb').forEach(m => m.classList.remove('on'));
  if(el) el.classList.add('on');
};

window.toggleMobileMenu = function(){
  const menu = document.getElementById('mobile-menu');
  if(!menu) return;
  const isOpen = menu.style.display === 'grid';
  menu.style.display = isOpen ? 'none' : 'grid';
  const btn = document.getElementById('mnb-more');
  if(btn) btn.classList.toggle('on', !isOpen);
};

window.closeMobileMenu = function(){
  const menu = document.getElementById('mobile-menu');
  if(menu) menu.style.display = 'none';
  const btn = document.getElementById('mnb-more');
  if(btn) btn.classList.remove('on');
};

document.addEventListener('click', function(e){
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('mnb-more');
  if(menu && btn && !menu.contains(e.target) && !btn.contains(e.target)){
    window.closeMobileMenu();
  }
});

window.addEventListener('resize', initMobile);

/* ═══ SETTINGS & OPENING BALANCES ═══ */
async function loadSettings(){
  try{
    const{data}=await SB.from('settings').select('*');
    if(!data) return;
    const map={};
    data.forEach(s=>map[s.key]=s.value);
    const foodEl=document.getElementById('set-food-opening');
    const diwanEl=document.getElementById('set-diwan-opening');
    const usdEl=document.getElementById('set-usd-rate');
    const jodEl=document.getElementById('set-jod-rate');
    if(foodEl)  foodEl.value  = map['food_opening_balance']  || '0';
    if(diwanEl) diwanEl.value = map['diwan_opening_balance'] || '0';
    if(usdEl)   usdEl.value   = map['usd_rate']  || '3.70';
    if(jodEl)   jodEl.value   = map['jod_rate']  || '5.00';
    if(map['usd_rate'])  RATES.USD = parseFloat(map['usd_rate']);
    if(map['jod_rate'])  RATES.JOD = parseFloat(map['jod_rate']);
    window.FOOD_OPENING  = parseFloat(map['food_opening_balance']  || '0');
    window.DIWAN_OPENING = parseFloat(map['diwan_opening_balance'] || '0');
  }catch(e){ console.error('loadSettings error',e); }
}

window.saveSettings = async function(){
  if(!can.admin()){toast(window.t?window.t('errors.no_permission'):'المدير فقط يمكنه تعديل الإعدادات','err');return;}
  const foodOpening  = parseFloat(document.getElementById('set-food-opening')?.value)  || 0;
  const diwanOpening = parseFloat(document.getElementById('set-diwan-opening')?.value) || 0;
  const usdRate      = parseFloat(document.getElementById('set-usd-rate')?.value)      || 3.70;
  const jodRate      = parseFloat(document.getElementById('set-jod-rate')?.value)      || 5.00;
  const updates = [
    {key:'food_opening_balance',  value: String(foodOpening)},
    {key:'diwan_opening_balance', value: String(diwanOpening)},
    {key:'usd_rate',  value: String(usdRate)},
    {key:'jod_rate',  value: String(jodRate)},
  ];
  for(const u of updates){
    await SB.from('settings').upsert({key:u.key, value:u.value, updated_at:new Date().toISOString()});
  }
  window.FOOD_OPENING  = foodOpening;
  window.DIWAN_OPENING = diwanOpening;
  RATES.USD = usdRate;
  RATES.JOD = jodRate;
  await logAction('edit',`تحديث الإعدادات — رصيد الغداء: ₪${fmt(foodOpening)} | رصيد الديوان: ₪${fmt(diwanOpening)}`,'settings',null);
  renderSettingsSummary();
  updateRateDisplay();
  renderDash();
  toast('✓ تم حفظ الإعدادات','ok');
};

function renderSettingsSummary(){
  const summaryCard = document.getElementById('settings-summary');
  const summaryEl   = document.getElementById('settings-bal-summary');
  if(!summaryCard||!summaryEl) return;
  summaryCard.style.display = '';
  const foodTotal  = (window.FOOD_OPENING||0)  + FIN.foodBalance();
  const diwanTotal = (window.DIWAN_OPENING||0) + FIN.diwanBalance();
  summaryEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
      <div class="kpi food" style="padding:14px">
        <div class="kpi-lbl">صندوق الغداء (مع الافتتاحي)</div>
        <div class="kpi-val">₪ ${fmt(foodTotal)}</div>
        <div class="kpi-sub">افتتاحي: ₪${fmt(window.FOOD_OPENING||0)} + حركات: ₪${fmt(FIN.foodBalance())}</div>
      </div>
      <div class="kpi diwan" style="padding:14px">
        <div class="kpi-lbl">صندوق الديوان (مع الافتتاحي)</div>
        <div class="kpi-val">₪ ${fmt(diwanTotal)}</div>
        <div class="kpi-sub">افتتاحي: ₪${fmt(window.DIWAN_OPENING||0)} + حركات: ₪${fmt(FIN.diwanBalance())}</div>
      </div>
    </div>
  `;
}

/* ═══ DATA PROTECTION ═══ */
function applyDataProtection(){
  const role=CUR?.role||'viewer';
  if(role==='viewer'){
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
  wm.innerHTML=`<div style="transform:rotate(-35deg);font-size:24px;font-weight:700;color:rgba(0,0,0,.04);white-space:nowrap;user-select:none;letter-spacing:.1em;text-align:center;line-height:3">${name}<br>${dt}<br>${name}<br>${dt}</div>`;
  document.body.appendChild(wm);
}

/* ═══ INIT ═══ */
(function(){
  const ls=document.getElementById('login-screen');
  if(ls) ls.setAttribute('data-force-light','1');
})();

async function init(){
  const{createClient}=supabase;
  SB=createClient(
    'https://ralifvemgapmsgrjgazh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4'
  );
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
                    'applyAnnualDue','saveSettings','inviteUser','changeRole'];

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
