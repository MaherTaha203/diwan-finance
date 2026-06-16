'use strict';
/* ═══ STATE ═══ */
let SB=null,CU=null,CUR=null;
const DB={receipts:[],payments:[],members:[],contacts:[],annual:[],audit:[]};
const RATES={ILS:1,USD:3.7,JOD:5.0};
window.FOOD_OPENING=0;
window.DIWAN_OPENING=0;
window.FOOD_OPENING_USD=0;window.FOOD_OPENING_JOD=0;
window.DIWAN_OPENING_USD=0;window.DIWAN_OPENING_JOD=0;
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
    if(!member) return {member:null, rows:[], openingBalance:0, totalDues:0, totalPaid:0, prepaidEffective:0, finalBalance:0};

    const openingBalance = Number(member.opening_balance || 0);
    const fd = from ? new Date(from) : null;
    const td = to   ? new Date(to)   : null;
    const inRange = d => { if(!d || d==='—') return true; const dt=new Date(d); if(fd&&dt<fd) return false; if(td&&dt>td) return false; return true; };

    const rows = [];
    if(openingBalance !== 0)
      rows.push({date:'—', no:'—', desc:'رصيد افتتاحي · Opening Balance', cr:0, dr:openingBalance, cls:'opening'});

    DB.annual
      .filter(a => !member.active_from_year || a.year >= member.active_from_year)
      .forEach(a => rows.push({date:a.applied_at?.slice(0,10) || a.year+'-01-01', no:'—', desc:`اشتراك سنة ${a.year}`, cr:0, dr:Number(a.amount||0), cls:'due'}));

    DB.receipts
      .filter(r => !r.is_deleted && r.fund_type==='food' && r.member_id===memberId && inRange(r.receipt_date))
      .forEach(r => rows.push({date:r.receipt_date, no:r.no, desc:r.notes||'مساهمة', cr:Number(r.amount_ils||r.amount||0), dr:0, cls:'paid'}));

    const dues2526 = DB.annual
      .filter(a => (a.year===2025 || a.year===2026) && (!member.active_from_year || a.year >= member.active_from_year))
      .reduce((s,a)=>s + Number(a.amount||0),0);
    const prepaidEffective = Math.min(Number(member.prepaid_subscription_ils||0), dues2526);
    if(prepaidEffective > 0)
      rows.push({date:'2026-12-31', no:'—', desc:'مدفوعات قبل تطبيق النظام (2025–2026)', cr:prepaidEffective, dr:0, cls:'prepaid'});

    rows.sort((a,b)=> a.date==='—' ? -1 : b.date==='—' ? 1 : new Date(a.date)-new Date(b.date));

    let bal = 0;
    rows.forEach(r => { bal += r.dr - r.cr; r.bal = bal; });

    const totalDues = rows.filter(r=>r.cls==='due').reduce((s,r)=>s+r.dr,0);
    const totalPaid = rows.filter(r=>r.cls==='paid').reduce((s,r)=>s+r.cr,0);
    const finalBalance = openingBalance + totalDues - totalPaid - prepaidEffective;

    return {member, rows, openingBalance, totalDues, totalPaid, prepaidEffective, finalBalance};
  },

  /* Approved balance terminology (Phase 11.5). Sign unchanged. */
  balanceLabel(bal, withAmount=true){
    bal = Number(bal)||0;
    const amt = withAmount ? ' ₪ '+fmt(Math.abs(bal)) : '';
    if(bal > 0) return 'على العضو مستحقات'+amt;
    if(bal < 0) return 'للعضو رصيد'+amt;
    return 'الحساب مسدد بالكامل';
  },

  foodBalance(){
    /* TREASURY MODEL: Food fund is operational-only. The old fund was closed;
       the historical reference value (FOOD_OPENING) is display-only and NEVER summed. */
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    return income-expense;
  },
  foodHistorical(){ return Number(window.FOOD_OPENING||0); },  /* reference only, never in calculations */
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
    toast(window.t('messages.access_denied'),'err');
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
  initSessionTimeout();
  await logAction('login','تسجيل دخول','auth',null);
  initMobile();
  applyDataProtection();
  applyLoginLang();
}

window.logout=async function(){
  try{await logAction('logout','تسجيل خروج','auth',null);}catch(e){}
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
'id,name,phone,notes,opening_balance,prepaid_subscription_ils,is_active,created_at,active_from_year'
).order('name'),
      SB.from('contacts').select('*').order('name'),
      SB.from('annual_dues').select('*').order('year',{ascending:false}),
      SB.from('audit_log').select('id,action,description,user_name,created_at').order('created_at',{ascending:false}).limit(50),
    ]);
    DB.receipts=r1.data||[];DB.payments=r2.data||[];DB.members=r3.data||[];
    DB.contacts=r4.data||[];DB.annual=r5.data||[];DB.audit=r6.data||[];
    await loadAttachCounts();
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
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(7,'receipts');return;}
    body.innerHTML=page.map(r=>`<tr>
      <td><b style="font-size:11px">${esc(r.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(r.receipt_date)}</td>
      <td>${esc(r.payer_name||gmn(r.member_id))}</td>
      <td class="num" style="color:#00C896">₪ ${fmt(r.amount_ils||r.amount)}</td>
      <td><span class="badge green">${L.method(r.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtRec('${r.id}')" title="${window.t('common.print')}"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editRec('${r.id}')" title="${window.t('common.edit')}"><i class="ti ti-edit"></i></button>`:''}
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
    if(!body)return;
    if(!page.length){body.innerHTML=emptyRow(7,'expenses');return;}
    body.innerHTML=page.map(p=>`<tr>
      <td><b style="font-size:11px">${esc(p.no)}</b></td>
      <td style="color:var(--tx2)">${fdate(p.payment_date)}</td>
      <td>${esc(p.beneficiary_name||gmn(p.member_id))}</td>
      <td class="num" style="color:var(--danger)">₪ ${fmt(p.amount_ils||p.amount)}</td>
      <td><span class="badge gray">${L.method(p.payment_method)}</span></td>
      <td style="color:var(--tx3);font-size:11px">${esc(p.notes||'—')}</td>
      <td class="tda">
        ${window.attachBtn('payment',p.id,p.no,p.fund_type)}
        ${can.print()?`<button class="btn ghost sm" style="color:#60A5FA" onclick="window.prtPay('${p.id}')" title="${window.t('common.print')}"><i class="ti ti-printer"></i></button>`:''}
        ${can.admin()?`<button class="btn ghost sm" style="color:var(--warn)" onclick="window.editPay('${p.id}')" title="${window.t('common.edit')}"><i class="ti ti-edit"></i></button>`:''}
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
    if(!body)return;
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
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
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
    if(!body)return;
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
        ${window.attachBtn('payment',p.id,p.no,p.fund_type)}
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
    if(!body)return;
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
        ${window.attachBtn('receipt',r.id,r.no,r.fund_type)}
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
    if(sub)sub.textContent=`${d.length} ${window.t('members.count')}`;
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
        <td style="color:var(--tx3)">${(PS['members']-1)*PSZ+i+1}</td>
        <td><b>${esc(m.name)}</b></td>
        <td style="color:var(--tx2)">${esc(m.phone||'—')}</td>
       <td class="num" style="color:${
  m.bal > 0 ? 'var(--danger)' :
  m.bal < 0 ? '#2563EB' :
  '#00C896'
}">
${
  `₪ ${fmt(Math.abs(m.bal))}`
}
</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
        <td class="tda">
          <button class="btn ghost sm" style="color:#60A5FA" onclick="window.nav('member-stmt');setTimeout(()=>{document.getElementById('ms-member').value='${m.id}';window.renderMemberStmt();},80)" title="${window.t('members.member_stmt')}"><i class="ti ti-file-description"></i></button>
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
  const tabs=[['diwan','صندوق الديوان'],['food','صندوق الغداء'],['donation','التبرعات']];
  el.innerHTML=tabs.map(([k,l])=>`<div class="tp-tab ${TP_FUND===k?'on':''}" onclick="window.selectTreasuryFund('${k}')">${l}</div>`).join('');
}
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
  const fundName=fund==='food'?'صندوق الغداء':fund==='diwan'?'صندوق الديوان':'صندوق التبرعات';
  const nat=tpCurrency(fund);
  const upd='محدث وفق أسعار الصرف اليومية';
  const ratesLine=`USD ${RATES.USD.toFixed(3)} · JOD ${RATES.JOD.toFixed(3)} · ${today()}`;
  let middle='', total=0, neg=false, cap='الرصيد الإجمالي الكلي', rule='';

  if(fund==='diwan'){
    const opening=Number(window.DIWAN_OPENING||0);
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='diwan').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='diwan').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    total=opening+income-expense; neg=total<0;
    rule='القاعدة: الكلي = الرصيد الأولي السابق + إجمالي المقبوضات − إجمالي المصروفات';
    middle=`<div class="tp-flow">
      <div class="nd prev"><div class="t">الرصيد الأولي السابق</div><div class="v">₪ ${fmt(opening)}</div><div class="s">يشارك في الحساب</div></div>
      <div class="ar"><div class="op up">+ إجمالي المقبوضات ₪ ${fmt(income)}</div><div class="ln"></div><div class="op dn">− إجمالي المصروفات ₪ ${fmt(expense)}</div></div>
      <div class="nd cur"><div class="t">رصيد الصندوق الحالي = الكلي</div><div class="v${neg?' neg':''}">₪ ${fmt(total)}</div><div class="s">محسوب تلقائياً</div></div>
    </div>`;
  } else if(fund==='food'){
    const hist=FIN.foodHistorical();
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    const expense=DB.payments.filter(p=>!p.is_deleted&&p.fund_type==='food').reduce((s,p)=>s+Number(p.amount_ils||p.amount),0);
    total=income-expense; neg=total<0;
    cap='الرصيد الإجمالي الكلي (تشغيلي)';
    rule='القاعدة: الإجمالي = رصيد الصندوق الحالي فقط · «الرصيد الأولي السابق» مرجعي ولا يُجمع';
    middle=`<div class="tp-food">
      <div class="tp-prev"><div class="lk">🔒 للملاحظة فقط</div><div class="t">الرصيد الأولي السابق</div><div class="v${hist<0?' neg':''}">₪ ${fmt(hist)}</div><div class="ro">رصيد مرجعي للملاحظة فقط · لا يدخل في أي حساب أو تقرير</div></div>
      <div class="tp-op"><div class="t">رصيد الصندوق الحالي</div>
        <div class="of"><div class="sg"><div class="l">البداية</div><div class="n">₪ 0</div></div><span class="x">+</span>
        <div class="sg"><div class="l">إجمالي المقبوضات</div><div class="n up">₪ ${fmt(income)}</div></div><span class="x">−</span>
        <div class="sg"><div class="l">إجمالي المصروفات</div><div class="n dn">₪ ${fmt(expense)}</div></div></div>
        <div class="rs"><div class="l">رصيد الصندوق الحالي = الإجمالي</div><div class="n">₪ ${fmt(total)}</div></div></div>
    </div>`;
  } else {
    const income=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
    total=income; neg=false; cap='الرصيد الإجمالي الكلي';
    rule='القاعدة: إجمالي التبرعات المستلمة';
    middle=`<div class="tp-flow"><div class="nd cur" style="flex:1"><div class="t">رصيد الصندوق الحالي</div><div class="v">₪ ${fmt(total)}</div><div class="s">${DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation').length} تبرعات</div></div></div>`;
  }

  el.innerHTML=`<div class="tp">
    <div class="tp-hero"><div class="tp-top"><div style="color:#fff;font-weight:700;font-size:13px">لوحة الخزينة · Treasury</div><div class="tp-tag">${fundName}</div></div>
      <div class="tp-cap">${cap}</div><div class="tp-total${neg?' neg':''}">₪ ${fmt(total)}</div>
      <div class="tp-rule">${rule}</div><div class="tp-upd">${upd}</div></div>
    ${middle}
    <div class="tp-cs${TP_CUR_OPEN?' open':''}">
      <div class="tp-cs-h" onclick="window.toggleTreasuryCurrency()"><div class="ht">أرصدة العملات</div><div class="tp-cs-ar">${TP_CUR_OPEN?'▲':'▼'}</div></div>
      <div class="tp-cs-body"><div class="tp-cs-rates">${ratesLine}</div>${tpCurrencyRows(fund,nat)}</div>
    </div>
    <div class="tp-ft"><span>ديوان آل طه — diwan-finance.com</span><span>الأسعار من إعدادات النظام (يدوية)</span></div>
  </div>`;
}
function renderDash(){
  const fb=FIN.foodBalance(),db=FIN.diwanBalance(),donb=FIN.donBalance();
  const dd=document.getElementById('dash-date');
  if(dd)dd.textContent=new Date().toLocaleDateString('en-CA');

  const _isEn=window.LANG==='en';
  document.getElementById('fund-summary').innerHTML=`
    <div class="fsum-brand"><i class="ti ti-building-bank"></i><span>${_isEn?'Treasury':'الخزينة'}</span></div>
    <div class="fsum-seg food"><span class="fsum-k">${L.fundLabel('food')}</span><span class="fsum-v">₪ ${fmt(fb)}</span></div>
    <div class="fsum-seg diwan"><span class="fsum-k">${L.fundLabel('diwan')}</span><span class="fsum-v">₪ ${fmt(db)}</span></div>
    <div class="fsum-seg don"><span class="fsum-k">${L.fundLabel('donation')}</span><span class="fsum-v">₪ ${fmt(donb)}</span></div>
    <div class="fsum-seg members"><span class="fsum-k">${_isEn?'Members':'الأعضاء'}</span><span class="fsum-v">${DB.members.filter(m=>m.is_active).length}</span></div>
  `;
  renderTreasuryTabs();renderTreasuryPanel();



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
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:72px;gap:1px">
        <div style="width:100%;height:${Math.max(3,Math.round(m.food/maxV*58))}px;background:var(--food);border-radius:3px 3px 0 0;opacity:.8"></div>
        <div style="width:100%;height:${Math.max(3,Math.round(m.diwan/maxV*58))}px;background:var(--diwan);border-radius:3px 3px 0 0;opacity:.8"></div>
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

  const _en=window.LANG==='en';
  document.getElementById('quick-actions').innerHTML=`
    ${can.write()?`<button class="qa-btn rec" onclick="window.openRec()"><i class="ti ti-plus"></i><span>${_en?'Receipt Voucher':'سند قبض'}</span></button>`:''}
    ${can.write()?`<button class="qa-btn pay" onclick="window.openPay()"><i class="ti ti-minus"></i><span>${_en?'Payment Voucher':'سند صرف'}</span></button>`:''}
    ${can.write()?`<button class="qa-btn diwan" onclick="window.openRec('diwan')"><i class="ti ti-receipt"></i><span>${_en?'Diwan Receipt':'إيصال ديوان'}</span></button>`:''}
    ${can.write()?`<button class="qa-btn food" onclick="window.openRec('food')"><i class="ti ti-receipt"></i><span>${_en?'Food Receipt':'إيصال غداء'}</span></button>`:''}
    ${can.write()?`<button class="qa-btn member" onclick="window.openM('member')"><i class="ti ti-user-plus"></i><span>${_en?'New Member':'عضو جديد'}</span></button>`:''}
    <button class="qa-btn stmt" onclick="window.openStmtSelector()"><i class="ti ti-file-description"></i><span>${_en?'Account Statement':'كشف حساب'}</span></button>
  `;
}

/* Account Statement selector (visual nav only — opens existing statement pages) */
window.openStmtSelector=function(){
  let ov=document.getElementById('stmt-sel-ov');
  if(!ov){
    ov=document.createElement('div'); ov.id='stmt-sel-ov'; ov.className='ov';
    const en=window.LANG==='en';
    const opt=(p,ar,eng,ic)=>`<button class="ssel-item" onclick="window.closeStmtSelector();window.nav('${p}')"><i class="ti ${ic}"></i><span>${en?eng:ar}</span></button>`;
    ov.innerHTML=`<div class="modal ssel" style="max-width:460px">
      <div class="mhd"><span class="mtt"><span class="mico diwan"><i class="ti ti-file-description"></i></span>${en?'Account Statement':'اختر نوع الكشف'}</span><button class="btn ghost" onclick="window.closeStmtSelector()"><i class="ti ti-x"></i></button></div>
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
        <div class="kpi ${bal>=0?'green':'red'}" style="padding:12px"><div class="kpi-lbl">${window.LANG==='en'?'Current Balance':'الرصيد الجاري'}</div><div class="kpi-val" style="font-size:16px">₪ ${fmt(bal)}</div></div>
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
  enhanceMemberSelect('ms-member'); syncComboInput('ms-member');
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

  const dons=DB.receipts.filter(r=>
    !r.is_deleted &&
    r.fund_type==='donation' &&
    r.member_id===mid &&
    inRange(r.receipt_date)
  );

  /* PHASE 11.5 — single balance engine (incl. capped prepaid credit row) */
  const st=FIN.memberStatement(mid,from,to);
  const rows=st.rows;

  const rowsHTML=rows.map(r=>{

    const bal=r.bal;

    let balColor='#00C896';

    if(bal>0){
      balColor='var(--danger)';
    }else if(bal<0){
      balColor='#2563EB';
    }

    return `
      <div class="lr">
        <span class="lr-date">
          ${(r.cls==='opening'||r.date==='—')?'—':fdate(r.date)}
        </span>
        <span class="lr-name">
          ${r.no&&r.no!=='—'?esc(r.no):'—'}
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
          ₪ ${fmt(Math.abs(bal))}
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
        ${member.active_from_year?`<div style="font-size:12px;color:var(--tx3);margin-top:3px">سنة بدء الاشتراك: ${member.active_from_year}</div>`:''}
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
    if(mico){mico.className='mico food';} if(title)title.textContent='إيصال صندوق الغداء';
    if(donWrap)donWrap.style.display='none';
    if(optContact)optContact.style.display='none';
    if(optManual)optManual.style.display='';
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
async function loadAttachCounts(){
  try{
    ATTACH_COUNTS.receipt={};ATTACH_COUNTS.payment={};
    const{data,error}=await SB.from('attachments').select('receipt_id,payment_id');
    if(error||!data)return;
    data.forEach(a=>{
      if(a.receipt_id)ATTACH_COUNTS.receipt[a.receipt_id]=(ATTACH_COUNTS.receipt[a.receipt_id]||0)+1;
      if(a.payment_id)ATTACH_COUNTS.payment[a.payment_id]=(ATTACH_COUNTS.payment[a.payment_id]||0)+1;
    });
  }catch(e){/* table may not exist yet */}
}
function attachCount(type,id){return ATTACH_COUNTS[type]?.[id]||0;}

/* Row button (paperclip + count) — visible to all roles */
window.attachBtn=function(type,id,no,fund){
  const n=attachCount(type,id);
  const badge=n>0?`<span style="background:var(--acc2,#059669);color:#fff;border-radius:9px;padding:0 5px;font-size:9px;margin-inline-start:3px;font-weight:700">${n}</span>`:'';
  return `<button class="btn ghost sm" style="color:#0F2B5B" onclick="window.openAttach('${type}','${id}','${esc(no||'')}','${fund||''}')" title="${window.t('common.attachments')}"><i class="ti ti-paperclip"></i>${badge}</button>`;
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
    <div class="mhd"><span class="mtt"><span class="mico green"><i class="ti ti-paperclip"></i></span><span id="attach-title">المرفقات</span></span><button class="btn ghost" onclick="window.closeAttach()"><i class="ti ti-x"></i></button></div>
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
    <div class="mhd"><span class="mtt"><span class="mico green"><i class="ti ti-eye"></i></span><span id="attach-view-title">معاينة</span></span><button class="btn ghost" onclick="window.closeAttachView()"><i class="ti ti-x"></i></button></div>
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

/* ═══ SAVE RECEIPT ═══ */
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
  const saveContact=document.getElementById('rec-save-contact')?.checked||false;

  const v1=fund==='donation'?vf('rec-member',v=>!!v,'e-rec-member'):
    payerType==='member'?vf('rec-member',v=>!!v,'e-rec-member'):
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
  const{data:mNew,error}=await SB.from('members').insert({name,phone,notes,opening_balance:bal,active_from_year:fromYear}).select('id').single();
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  await logAction('add',`إضافة عضو: ${name}`,'members',mNew?.id||null);
  window.closeM();await loadAll();toast(window.t('messages.member_added')+' '+name,'ok');
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
  toast(window.t('errors.invalid_amount'),'warn');
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
  toast(window.t('errors.generic_error')+': '+error.message,'err');
  return;
}

await logAction('edit',`تعديل إيصال — ₪${fmt(amount)} | تاريخ: ${date||'—'}`, 'receipts', id);
window.closeM();
await loadAll();
toast(window.t('messages.updated'),'ok');

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
  if(amount<=0){toast(window.t('errors.invalid_amount'),'warn');return;}
  const{error}=await SB.from('payments').update({amount_ils:amount,amount,notes,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  await logAction('edit',`تعديل سند صرف — ₪${fmt(amount)}`,'payments',id);
  window.closeM();await loadAll();toast(window.t('messages.updated'),'ok');
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
  const{error}=await SB.from('members').update({name,phone,opening_balance:bal,notes,active_from_year:efy,updated_at:new Date().toISOString()}).eq('id',id);
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
  const{data:prevRole}=await SB.from('user_roles').select('role,full_name').eq('user_id',uid).maybeSingle();
  await SB.from('user_roles').update({role:safeRole}).eq('user_id',uid);
  await logAction('edit',`تغيير دور ${prevRole?.full_name||uid}: من ${ROLES[prevRole?.role]||prevRole?.role||'—'} إلى ${ROLES[safeRole]}`,'user_roles',uid);
  toast(window.t('messages.role_changed')+': '+ROLES[safeRole],'ok');loadUsers();
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
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  await SB.from('user_roles').upsert({user_id:data.user.id,role:safeRole,full_name:name||email});
  await logAction('add',`إنشاء مستخدم: ${email} — دور: ${ROLES[safeRole]}`,'user_roles',data.user.id);
  window.closeM();toast(window.t('messages.account_created')+': '+email,'ok');loadUsers();
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

/* ═══ VIS-1: UNIFIED PRINT DESIGN TOKENS (single source of truth) ═══ */
const PRINT_TOKENS=':root{--navy:#1C2B3A;--green:#00C896;--gold:#C4A450;--danger:#DC3545;--gray:#6B7280;--bg:#F8FAFC;--bd:#e2e8f0;--ink:#1C2B3A;--fa:"Cairo",Arial,sans-serif;--fe:"Inter",Arial,sans-serif}'
+'*{box-sizing:border-box;margin:0;padding:0}'
+'.dh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--gold);padding-bottom:10px}'
+'.dh .org{display:flex;gap:10px;align-items:center}'
+'.dh .logo{width:46px;height:46px;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--navy)}.logo img{width:46px;height:46px;object-fit:contain;display:block}'
+'.dh h1{font-size:18px;color:var(--navy);font-weight:800;line-height:1.2}'
+'.dh .org p{font-size:10px;color:var(--gray)}'
+'.dh .meta{text-align:left}'
+'.dh .meta .tt{display:inline-block;background:var(--navy);color:#fff;font-size:13px;font-weight:700;padding:5px 14px;border-radius:6px}'
+'.dh .meta .no{font-size:13px;color:var(--navy);font-weight:700;margin-top:6px}'
+'.dh .meta .sub{font-size:11px;color:var(--gray);margin-top:4px}'
+'.period{text-align:center;margin:12px 0;font-size:12.5px;color:var(--navy);font-weight:600}'
+'.cards{display:flex;gap:10px;margin-bottom:12px}'
+'.card{flex:1;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:10px;text-align:center}'
+'.card .k{font-size:10px;color:var(--gray)}.card .v{font-size:16px;font-weight:800;color:var(--navy);margin-top:4px}'
+'.card .v.pos{color:var(--green)}.card .v.neg{color:var(--danger)}'
+'table.dt{width:100%;border-collapse:collapse;font-size:10px}'
+'table.dt thead th{background:var(--navy);color:#fff;padding:7px 6px;font-weight:700;border:1px solid var(--navy)}'
+'table.dt tbody td{padding:6px;border:1px solid var(--bd);text-align:center}'
+'table.dt tbody tr:nth-child(even){background:var(--bg)}'
+'.cr{color:var(--green);font-weight:600}.dr{color:var(--danger);font-weight:600}.bal{font-weight:700;color:var(--navy)}'
+'table.dt tr.final td{background:var(--navy);color:#fff;font-weight:700;font-size:12.5px;padding:9px}'
+'table.dt tr.final .pos{color:var(--green)}table.dt tr.final .neg{color:#ff9aa2}'
+'.dfoot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px}'
+'.qr-u{width:90px;text-align:center}'
+'.qr-u .box{width:62px;height:62px;border:1px solid var(--navy);border-radius:4px;margin:0 auto}'
+'.qr-u .box>div,.qr-u .box img,.qr-u .box canvas{width:56px!important;height:56px!important;margin:3px}'
+'.qr-u .cap{font-size:7px;color:var(--gray);margin-top:3px;word-break:break-all}'
+'.sigs{display:flex;gap:40px}'
+'.sig-u .line{width:120px;border-top:1px solid var(--navy);margin-top:34px;padding-top:4px;font-size:10px;color:var(--gray);text-align:center}'
+'.pgfoot{border-top:1px solid var(--bd);margin-top:16px;padding-top:6px;display:flex;justify-content:space-between;font-size:8.5px;color:var(--gray)}'
+'.page{background:#fff;position:relative;overflow:hidden}'+'.voucher{padding:14mm 12mm}'+'.rows{margin-top:14px}'+'.rows .row{display:flex;border-bottom:1px solid var(--bd);padding:8px 0}'+'.rows .lbl{width:34%;color:var(--gray);font-size:11px;font-weight:600}'+'.rows .val{flex:1;color:var(--navy);font-size:12.5px;font-weight:600}'+'.amount{display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:12px 14px;margin-top:14px}'+'.amount .big{font-size:22px;font-weight:800}.amount .big.cr{color:var(--green)}.amount .big.dr{color:var(--danger)}'+'.amount .words{font-size:11px;color:var(--gray);max-width:58%;text-align:left}'+'.sigs{display:flex;gap:40px}.sig-u{text-align:center}'+'.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}'+'.wm span{transform:rotate(-35deg);font-size:60px;font-weight:800;color:rgba(0,200,150,.06)}'+'@page{size:A4 portrait;margin:0}'+'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

function openPrintWin(css,body){
  const html='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Reem+Kufi:wght@400;500;700&display=swap" rel="stylesheet">'
    +'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    +'<style>'+PRINT_TOKENS+css+'</style></head><body>'+body
    +'<script>window.onload=function(){'
    +'document.querySelectorAll("[data-qr-url]").forEach(function(el){'
    +'new QRCode(el,{text:el.getAttribute("data-qr-url"),width:52,height:52,colorDark:"#1C2B3A",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});'
    +'});'
    +'setTimeout(function(){window.print();},900);'
    +'};<\/script></body></html>';
  const win=window.open('','_blank','width=850,height=950');
  if(win){win.document.write(html);win.document.close();}
  else toast(window.t?window.t('errors.no_print'):'يرجى السماح بالنوافذ المنبثقة','warn');
}

function fundLabelAr(ft){return ft==='food'?'صندوق الغداء':ft==='donation'?'صندوق التبرعات':'صندوق الديوان';}

/* VIS-2: single-voucher builders matching approved mockups (01 receipt / 03 payment) */
function buildRecVoucher(r){
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(r.no);
  const meth=METHOD_LABELS[r.payment_method||'cash']||(r.payment_method||'');
  const cur=(r.currency&&r.currency!=='ILS')?('<div class="row"><div class="lbl">العملة الأصلية</div><div class="val">'+fmtD(r.amount)+' '+esc(r.currency)+' × ₪'+Number(r.exchange_rate||1).toFixed(2)+'</div></div>'):'';
  const note=r.notes?('<div class="row"><div class="lbl">البيان</div><div class="val">'+esc(r.notes)+'</div></div>'):'';
  return '<div class="page portrait"><div class="wm"><span>أصل</span></div><div class="voucher">'
    +'<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>ديوان آل طه</h1><p>نظام الإدارة المالية · diwan-finance.com</p></div></div>'
    +'<div class="meta"><span class="tt">سند قبض</span><div class="no">'+esc(r.no)+'</div><div class="sub">معتمد إلكترونياً · Verified</div></div></div>'
    +'<div class="rows">'
    +'<div class="row"><div class="lbl">التاريخ</div><div class="val">'+fmtDate2(r.receipt_date)+'</div></div>'
    +'<div class="row"><div class="lbl">الصندوق</div><div class="val">'+fundLabelAr(r.fund_type)+'</div></div>'
    +'<div class="row"><div class="lbl">استلمنا من</div><div class="val">'+esc(r.payer_name||gmn(r.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(meth)+'</div></div>'
    +cur+note
    +'</div>'
    +'<div class="amount"><div class="big cr">₪ '+fmt(r.amount_ils||r.amount)+'</div><div class="words">'+amountToWordsAr(r.amount_ils||r.amount)+'</div></div>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="'+verifyUrl+'"></div></div><div class="cap">diwan-finance.com/verify/'+esc(r.no)+'</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحرِّر</div></div><div class="sig-u"><div class="line">المُعتمِد</div></div></div></div>'
    +'<div class="pgfoot"><span>ديوان آل طه — diwan-finance.com</span><span>طُبع: '+fmtDate2(new Date().toISOString())+'</span><span>صفحة 1 / 1</span></div>'
    +'</div></div>';
}
function buildPayVoucher(p){
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(p.no);
  const cur=(p.currency&&p.currency!=='ILS')?('<div class="row"><div class="lbl">العملة الأصلية</div><div class="val">'+fmtD(p.amount)+' '+esc(p.currency)+' × ₪'+Number(p.exchange_rate||1).toFixed(2)+'</div></div>'):'';
  const note=p.notes?('<div class="row"><div class="lbl">البيان</div><div class="val">'+esc(p.notes)+'</div></div>'):'';
  const appr=p.approved_by?('<div class="row"><div class="lbl">معتمد من</div><div class="val">'+esc(p.approved_by)+'</div></div>'):'';
  return '<div class="page portrait"><div class="wm"><span>أصل</span></div><div class="voucher">'
    +'<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>ديوان آل طه</h1><p>نظام الإدارة المالية · diwan-finance.com</p></div></div>'
    +'<div class="meta"><span class="tt">سند صرف</span><div class="no">'+esc(p.no)+'</div><div class="sub">معتمد إلكترونياً · Verified</div></div></div>'
    +'<div class="rows">'
    +'<div class="row"><div class="lbl">التاريخ</div><div class="val">'+fmtDate2(p.payment_date)+'</div></div>'
    +'<div class="row"><div class="lbl">الصندوق</div><div class="val">'+fundLabelAr(p.fund_type)+'</div></div>'
    +'<div class="row"><div class="lbl">صُرف إلى</div><div class="val">'+esc(p.beneficiary_name||gmn(p.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">نوع المصروف</div><div class="val">'+esc(L.expense(p.expense_type))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(L.method(p.payment_method))+'</div></div>'
    +cur+note+appr
    +'</div>'
    +'<div class="amount"><div class="big dr">₪ '+fmt(p.amount_ils||p.amount)+'</div><div class="words">'+amountToWordsAr(p.amount_ils||p.amount)+'</div></div>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="'+verifyUrl+'"></div></div><div class="cap">diwan-finance.com/verify/'+esc(p.no)+'</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحرِّر</div></div><div class="sig-u"><div class="line">المُعتمِد</div></div></div></div>'
    +'<div class="pgfoot"><span>ديوان آل طه — diwan-finance.com</span><span>طُبع: '+fmtDate2(new Date().toISOString())+'</span><span>صفحة 1 / 1</span></div>'
    +'</div></div>';
}

/* ── Print functions: all guarded by can.print() ── */
window.prtRec=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=DB.receipts.find(x=>x.id===id);if(!r)return;
  openPrintWin('',buildRecVoucher(r));
};
window.prtPay=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  openPrintWin('',buildPayVoucher(p));
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
window.buildFundStatementHTML=function(fund){
  const from=document.getElementById(fund+'-stmt-from')?.value||'';
  const to=document.getElementById(fund+'-stmt-to')?.value||'';
  const type=document.getElementById(fund+'-stmt-type')?.value||'';
  const rows=FIN.fundLedger(fund,from,to,type);   /* FIN logic unchanged */
  const fundLabel=fund==='food'?'صندوق الغداء':'صندوق الديوان';
  let bal=0,totCr=0,totDr=0,openBal=0;
  const rowsHTML=rows.map((r,i)=>{
    bal+=r.cr-r.dr;totCr+=r.cr;totDr+=r.dr;
    if(i===0&&r.type==='open')openBal=r.cr-r.dr;
    const crCell=r.cr>0?'<span class="cr">₪ '+fmt(r.cr)+'</span>':(r.type==='don'?'<span class="cr">تبرع</span>':'—');
    const drCell=r.dr>0?'<span class="dr">₪ '+fmt(r.dr)+'</span>':'—';
    return '<tr><td>'+fmtDate2(r.date)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.desc)+'</td><td>'+crCell+'</td><td>'+drCell+'</td><td class="bal">₪ '+fmt(bal)+'</td><td>'+esc(r.note||'')+'</td></tr>';
  }).join('');
  const period=(from&&to?fmtDate2(from)+' — '+fmtDate2(to):from?'من '+fmtDate2(from):to?'حتى '+fmtDate2(to):'كل الفترات');
  const balCls=bal>=0?'pos':'neg';
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const body='<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>ديوان آل طه</h1><p>نظام الإدارة المالية · diwan-finance.com</p></div></div>'
    +'<div class="meta"><span class="tt">كشف '+fundLabel+'</span><div class="sub">عملة الكشف: شيكل (₪)</div></div></div>'
    +'<div class="period">الفترة: '+period+'</div>'
    +'<div class="cards">'
    +'<div class="card"><div class="k">رصيد افتتاحي</div><div class="v">₪ '+fmt(openBal)+'</div></div>'
    +'<div class="card"><div class="k">إجمالي الوارد</div><div class="v pos">₪ '+fmt(totCr)+'</div></div>'
    +'<div class="card"><div class="k">إجمالي المنصرف</div><div class="v neg">₪ '+fmt(totDr)+'</div></div>'
    +'<div class="card"><div class="k">الرصيد الجاري</div><div class="v '+balCls+'">₪ '+fmt(bal)+'</div></div></div>'
    +'<table class="dt"><thead><tr><th>التاريخ</th><th>الاسم</th><th>البيان</th><th>وارد</th><th>منصرف</th><th>الرصيد</th><th>ملاحظات</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="5">الرصيد الجاري · Current Balance</td><td class="'+balCls+'">₪ '+fmt(bal)+'</td><td></td></tr></tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحاسب</div></div><div class="sig-u"><div class="line">رئيس الديوان</div></div></div></div>'
    +'<div class="pgfoot"><span>ديوان آل طه — diwan-finance.com</span><span>طُبع: '+fmtDate2(new Date().toISOString())+'</span><span>صفحة 1 / 1</span></div>';
  const title=(fund==='food'?'كشف صندوق الغداء':'كشف صندوق الديوان');
  return {css:css, body:body, title:title};
};
window.prtStmt=function(fund){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=window.buildFundStatementHTML(fund);
  openPrintWin(r.css,r.body);
};
window.downloadFundStatementPDF=function(fund){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=window.buildFundStatementHTML(fund);
  const doPdf=()=>{
    const wrap=document.createElement('div');
    wrap.innerHTML='<style>'+r.css+'</style>'+r.body;
    wrap.style.cssText='direction:rtl;background:#fff';
    const opt={margin:[8,8,8,8],filename:(fund==='food'?'Food-Statement':'Diwan-Statement')+'-'+today()+'.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'}};
    window.html2pdf().set(opt).from(wrap).save().then(()=>toast('\u2713 PDF','ok'));
  };
  if(window.html2pdf){doPdf();}
  else{toast('\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...','info');const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';s.onload=doPdf;document.head.appendChild(s);}
};
window.prtMemberStmt=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const mid=document.getElementById('ms-member')?.value;
  if(!mid){toast(window.t('errors.select_member'),'warn');return;}
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

  /* PHASE 11.5 — single source of truth (engine includes capped prepaid credit row) */
  const st=FIN.memberStatement(mid,from,to);
  const openBal=st.openingBalance, totalDues=st.totalDues, totalPaid=st.totalPaid;
  const finalBal=st.finalBalance;
  const rowsHTML=st.rows.map(r=>{
    const balTxt='₪ '+fmt(Math.abs(r.bal))+(r.bal>0?' (مدين)':r.bal<0?' (دائن)':'');
    return '<tr>'
      +'<td>'+(r.date==='—'?'—':fmtDate2(r.date))+'</td>'
      +'<td>'+esc(r.no)+'</td>'
      +'<td>'+esc(r.desc)+'</td>'
      +'<td>'+(r.dr>0?'<span class="dr">₪ '+fmt(r.dr)+'</span>':'—')+'</td>'
      +'<td>'+(r.cr>0?'<span class="cr">₪ '+fmt(r.cr)+'</span>':'—')+'</td>'
      +'<td class="bal">'+balTxt+'</td></tr>';
  }).join('');
  const printDate=new Date().toLocaleDateString('en-GB').replace(/\//g,'/');
  const periodLabel=from&&to?`${fmtDate2(from)} — ${fmtDate2(to)}`:from?`من ${fmtDate2(from)}`:to?`حتى ${fmtDate2(to)}`:'كل الفترات';

  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const finalCls=finalBal>0?'neg':finalBal<0?'pos':'';  /* mo, positive bal = credit(green) */
  const body='<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>ديوان آل طه</h1><p>نظام الإدارة المالية · diwan-finance.com</p></div></div>'
    +'<div class="meta"><span class="tt">كشف حساب عضو</span><div class="sub">العضو: '+esc(member.name)+'</div></div></div>'
    +'<div class="period">الفترة: '+periodLabel+' · ناشط من سنة '+(member.active_from_year||'—')+'</div>'
    +'<div class="cards">'
    +'<div class="card"><div class="k">رصيد افتتاحي</div><div class="v">₪ '+fmt(openBal)+'</div></div>'
    +'<div class="card"><div class="k">إجمالي المستحق</div><div class="v neg">₪ '+fmt(totalDues)+'</div></div>'
    +'<div class="card"><div class="k">إجمالي المدفوع</div><div class="v pos">₪ '+fmt(totalPaid)+'</div></div>'
    +'<div class="card"><div class="k">الرصيد النهائي</div><div class="v '+(finalBal<=0?'pos':'neg')+'">'+FIN.balanceLabel(finalBal,true)+'</div></div></div>'
    +'<table class="dt"><thead><tr><th>التاريخ</th><th>المرجع</th><th>البيان</th><th>مستحق (مدين)</th><th>مدفوع (دائن)</th><th>الرصيد</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="5">الرصيد النهائي · Final Balance</td><td class="'+(finalBal<=0?'pos':'neg')+'">'+FIN.balanceLabel(finalBal,true)+'</td></tr></tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحاسب</div></div><div class="sig-u"><div class="line">توقيع العضو</div></div></div></div>'
    +'<div class="pgfoot"><span>ديوان آل طه — diwan-finance.com</span><span>طُبع: '+printDate+'</span><span>صفحة 1 / 1</span></div>';
  openPrintWin(css,body);
};

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
  const NAVY='1C2B3A', WHITE='FFFFFF', BG='F8FAFC';
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

window.prtDonStmt=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
  const tot=rows.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const toFood=rows.filter(r=>r.donation_display_fund==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const toDiwan=tot-toFood;
  const rowsHTML=rows.map(r=>'<tr>'
    +'<td>'+fmtDate2(r.receipt_date)+'</td>'
    +'<td>'+esc(r.no)+'</td>'
    +'<td>'+esc(r.payer_name||gmn(r.member_id)||'—')+'</td>'
    +'<td><span class="cr">₪ '+fmt(r.amount_ils||r.amount)+'</span></td>'
    +'<td>'+(r.currency!=='ILS'?esc(r.currency):'ILS')+'</td>'
    +'<td>'+(r.donation_display_fund==='food'?'صندوق الغداء':'صندوق الديوان')+'</td>'
    +'<td>'+esc(r.notes||'—')+'</td></tr>').join('');
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const body='<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>ديوان آل طه</h1><p>نظام الإدارة المالية · diwan-finance.com</p></div></div>'
    +'<div class="meta"><span class="tt">تقرير التبرعات</span><div class="sub">عملة الكشف: شيكل (₪)</div></div></div>'
    +'<div class="period">عدد التبرعات: '+rows.length+'</div>'
    +'<div class="cards">'
    +'<div class="card"><div class="k">عدد التبرعات</div><div class="v">'+rows.length+'</div></div>'
    +'<div class="card"><div class="k">إجمالي التبرعات</div><div class="v pos">₪ '+fmt(tot)+'</div></div>'
    +'<div class="card"><div class="k">موجّه للغداء</div><div class="v">₪ '+fmt(toFood)+'</div></div>'
    +'<div class="card"><div class="k">موجّه للديوان</div><div class="v">₪ '+fmt(toDiwan)+'</div></div></div>'
    +'<table class="dt"><thead><tr><th>التاريخ</th><th>المرجع</th><th>المتبرع</th><th>المبلغ</th><th>العملة</th><th>التوجيه</th><th>ملاحظات</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="3">الإجمالي · Total</td><td class="pos">₪ '+fmt(tot)+'</td><td colspan="3"></td></tr></tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحاسب</div></div><div class="sig-u"><div class="line">رئيس الديوان</div></div></div></div>'
    +'<div class="pgfoot"><span>ديوان آل طه — diwan-finance.com</span><span>طُبع: '+fmtDate2(new Date().toISOString())+'</span><span>صفحة 1 / 1</span></div>';
  openPrintWin(css,body);
};

/* ═══ EXPORT CSV / BACKUP ═══ */
window.doBackup=function(){
  if(!can.export()){toast(window.t?window.t('errors.no_permission'):'ليس لديك صلاحية التصدير','err');return;}
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='diwan_backup_'+today()+'.json';a.click();
  toast(window.t('messages.exported'),'ok');
};
/* ═══ BACKUP RESTORE ═══ */
window.doRestore=async function(){
  if(!can.admin()){toast(window.t('errors.admin_only'),'err');return;}
  const input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=async function(e){
    const file=e.target.files[0];
    if(!file){return;}
    try{
      const text=await file.text();
      const backup=JSON.parse(text);
      
      /* Validate structure */
      const requiredTables=['members','receipts','payments'];
      const missingTables=requiredTables.filter(t=>!backup[t]||!Array.isArray(backup[t]));
      if(missingTables.length>0){
        toast(window.t('errors.invalid_file_tables')+' ('+missingTables.join(', ')+')','err');
        return;
      }
      
      /* Show preview */
      const stats='\nأعضاء: '+backup.members.length
        +'\nإيصالات: '+(backup.receipts||[]).length
        +'\nمدفوعات: '+(backup.payments||[]).length
        +'\nاشتراكات: '+(backup.annual_dues||[]).length;
      
      const confirmed=confirm('هل تريد استعادة هذه النسخة؟\n\n⚠️ سيتم استبدال جميع البيانات الحالية!'+stats);
      if(!confirmed){return;}
      
      /* Double confirm */
      const doubleConfirm=confirm('تأكيد نهائي: هذا الإجراء لا يمكن التراجع عنه.\n\nاكتب "نعم" للمتابعة.');
      if(!doubleConfirm){return;}
      
      toast(window.t('messages.restoring'),'info');
      
      /* Restore each table */
      const tables=['members','receipts','payments','annual_dues','contacts','settings'];
      let errors=[];
      
      for(const table of tables){
        if(!backup[table]||!Array.isArray(backup[table]))continue;
        
        /* Delete existing */
        const{error:delErr}=await SB.from(table).delete().neq('id','00000000-0000-0000-0000-000000000000');
        if(delErr)errors.push(table+' delete: '+delErr.message);
        
        /* Insert from backup in batches */
        const rows=backup[table];
        const batchSize=100;
        for(let i=0;i<rows.length;i+=batchSize){
          const batch=rows.slice(i,i+batchSize);
          const{error:insErr}=await SB.from(table).insert(batch);
          if(insErr)errors.push(table+' insert: '+insErr.message);
        }
      }
      
      if(errors.length>0){
        toast(window.t('messages.restore_partial')+': '+errors.join('; '),'warn');
      }else{
        toast('✓ '+window.t('messages.restore_success'),'ok');
      }
      
      await logAction('restore','استعادة نسخة احتياطية ('+file.name+')','system',null);
      await loadAll();
      
    }catch(e){
      toast(window.t('errors.file_error')+': '+e.message,'err');
    }
  };
  input.click();
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
    if(!member){toast(window.t('errors.select_member'),'warn');return;}
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
    const doExcel=()=>{
      const XLSX=window.XLSX;if(!XLSX){toast('\u062c\u0627\u0631\u064f \u062a\u062d\u0645\u064a\u0644 \u0645\u0643\u062a\u0628\u0629 Excel...','info');return;}
      const wsData=[['\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 \u2014 \u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0636\u0648'],[`\u0627\u0644\u0639\u0636\u0648: ${member.name}  |  \u0627\u0644\u0641\u062a\u0631\u0629: ${periodLabel}`],[],['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062f','\u0627\u0644\u0628\u064a\u0627\u0646','\u062f\u0627\u0626\u0646 \u20aa','\u0645\u062f\u064a\u0646 \u20aa','\u0627\u0644\u0631\u0635\u064a\u062f \u20aa'],...computed.map(r=>[r.date==='—'?'—':r.date,r.no,r.desc,r.cr>0?r.cr:'',r.dr>0?r.dr:'',r.bal]),[],['\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a','','',openBal,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a','','',totalDues,'',''],['\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a','','','',totalPaid,''],['\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a','','','','',finalBal]];
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
  const htmlDoc='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'+'<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Reem+Kufi:wght@400;500;700&display=swap" rel="stylesheet">'+'<style>'+PRINT_TOKENS+'@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff;padding:10mm}</style></head><body>'+'<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647</h1><p>\u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u00b7 diwan-finance.com</p></div></div>'+'<div class="meta"><span class="tt">\u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0636\u0648</span><div class="sub">\u0627\u0644\u0639\u0636\u0648: '+esc(member.name)+'</div></div></div>'+'<div class="period">\u0627\u0644\u0641\u062a\u0631\u0629: '+periodLabel+' \u00b7 \u0646\u0627\u0634\u0637 \u0645\u0646 \u0633\u0646\u0629 '+(member.active_from_year||'\u2014')+'</div>'+'<div class="cards"><div class="card"><div class="k">\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a</div><div class="v">\u20aa '+fmt(openBal)+'</div></div>'+'<div class="card"><div class="k">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062d\u0642</div><div class="v neg">\u20aa '+fmt(totalDues)+'</div></div>'+'<div class="card"><div class="k">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639</div><div class="v pos">\u20aa '+fmt(totalPaid)+'</div></div>'+'<div class="card"><div class="k">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a</div><div class="v '+balCls+'">'+finalTxt+'</div></div></div>'+'<table class="dt"><thead><tr><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0645\u0631\u062c\u0639</th><th>\u0627\u0644\u0628\u064a\u0627\u0646</th><th>\u0645\u0633\u062a\u062d\u0642 (\u0645\u062f\u064a\u0646)</th><th>\u0645\u062f\u0641\u0648\u0639 (\u062f\u0627\u0626\u0646)</th><th>\u0627\u0644\u0631\u0635\u064a\u062f</th></tr></thead><tbody>'+rowsHtml+'<tr class="final"><td colspan="5">\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u00b7 Final Balance</td><td class="'+balCls+'">'+finalTxt+'</td></tr></tbody></table>'+'<div class="dfoot"><div class="qr-u"><div class="box"></div><div class="cap">diwan-finance.com</div></div>'+'<div class="sigs"><div class="sig-u"><div class="line">\u0627\u0644\u0645\u064f\u062d\u0627\u0633\u0628</div></div><div class="sig-u"><div class="line">\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0639\u0636\u0648</div></div></div></div>'+'<div class="pgfoot"><span>\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 \u2014 diwan-finance.com</span><span>\u0637\u064f\u0628\u0639: '+printDate+'</span><span>\u0635\u0641\u062d\u0629 1 / 1</span></div>'+'</body></html>';

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


/* ═══ UNIVERSAL PDF + EXCEL EXPORT ═══ */
window.exportPagePDF=function(type){
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
    const d=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
    let total=0;
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0631\u0642\u0645</th><th>\u0627\u0644\u062a\u0627\u0631\u064a\u062e</th><th>\u0627\u0644\u0645\u062a\u0628\u0631\u0639</th><th>\u0627\u0644\u0645\u0628\u0644\u063a \u20aa</th><th>\u064a\u0638\u0647\u0631 \u0641\u064a</th><th>\u0645\u0644\u0627\u062d\u0638\u0627\u062a</th></tr></thead><tbody>';
    d.forEach(r=>{
      const amt=Number(r.amount_ils||r.amount||0);total+=amt;
      tableHTML+=`<tr><td>${esc(r.no)}</td><td>${r.receipt_date}</td><td>${esc(r.payer_name||gmn(r.member_id)||'')}</td><td>\u20aa ${fmt(amt)}</td><td>${r.donation_display_fund||''}</td><td>${esc(r.notes||'')}</td></tr>`;
    });
    tableHTML+=`<tr class="final"><td colspan="3">\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a (${d.length})</td><td>\u20aa ${fmt(total)}</td><td></td><td></td></tr></tbody></table>`;
  }
  else if(type==='members'){
    tableHTML='<table class="dt"><thead><tr><th>\u0627\u0644\u0627\u0633\u0645</th><th>\u0627\u0644\u0647\u0627\u062a\u0641</th><th>\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0638\u0627\u0645</th><th>\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a</th></tr></thead><tbody>';
    DB.members.filter(m=>m.is_active!==false).forEach(m=>{
      const bal=FIN.memberBalance(m.id);
      tableHTML+=`<tr><td>${esc(m.name)}</td><td>${m.phone||''}</td><td>\u20aa ${fmt(m.opening_balance||0)}</td><td class="bal">\u20aa ${fmt(bal)}</td></tr>`;
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

  const body='<div class="dh"><div class="org"><div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+CiAgPCEtLSBDb25jZXB0IEIg4oCUIE1vZGVybiBUcmVhc3VyeSDCtyB0cmFuc3BhcmVudCBpbnN0aXR1dGlvbmFsIG1hcmsgwrcgZ29sZCDYtyBvbiBsZWRnZXIgcm93cyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjAxLDE2Miw3NSwuMzIpIiBzdHJva2Utd2lkdGg9IjEuMyI+CiAgICA8bGluZSB4MT0iMjQiIHkxPSIzNCIgeDI9Ijc2IiB5Mj0iMzQiLz4KICAgIDxsaW5lIHgxPSIyNCIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPgogICAgPGxpbmUgeDE9IjI0IiB5MT0iNTgiIHgyPSI3NiIgeTI9IjU4Ii8+CiAgICA8bGluZSB4MT0iMjQiIHkxPSI3MCIgeDI9Ijc2IiB5Mj0iNzAiLz4KICA8L2c+CiAgPHRleHQgeD0iNTAiIHk9IjU4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjQzlBMjRCIgogICAgZm9udC1mYW1pbHk9IidSZWVtIEt1ZmknLCdDYWlybycsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZm9udC1zaXplPSI1MiI+2Lc8L3RleHQ+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iNDAiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjMDBBNTdCIi8+CiAgPHJlY3QgeD0iMzAiIHk9Ijc2IiB3aWR0aD0iMTMiIGhlaWdodD0iMy40IiByeD0iMS43IiBmaWxsPSIjQzlBMjRCIi8+Cjwvc3ZnPgo=" alt="ديوان آل طه"></div><div><h1>\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647</h1><p>\u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u00b7 diwan-finance.com</p></div></div>'+'<div class="meta"><span class="tt">'+t[0]+'</span><div class="sub">'+t[1]+'</div></div></div>'+'<div class="period">\u0637\u064f\u0628\u0639: '+printDate+'</div>'+tableHTML+'<div class="pgfoot"><span>\u062f\u064a\u0648\u0627\u0646 \u0622\u0644 \u0637\u0647 \u2014 diwan-finance.com</span><span>\u0637\u064f\u0628\u0639: '+printDate+'</span><span>\u0635\u0641\u062d\u0629 1</span></div>';
  openPrintWin(css,body);
};

/* Universal Excel Export */
window.exportPageExcel=function(type){
  if(!can.export()){toast('\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0629','err');return;}
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
    d.forEach(r=>wsData.push([r.no,r.receipt_date,r.payer_name||gmn(r.member_id)||'',Number(r.amount_ils||r.amount||0),r.donation_display_fund||'',r.notes||'']));
  }
  else if(type==='members'){
    wsData=[['\u0627\u0644\u0627\u0633\u0645','\u0627\u0644\u0647\u0627\u062a\u0641','\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0638\u0627\u0645','\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a']];
    DB.members.filter(m=>m.is_active!==false).forEach(m=>wsData.push([m.name,m.phone||'',m.opening_balance||0,FIN.memberBalance(m.id)]));
  }
  else if(type==='annual'){
    wsData=[['\u0627\u0644\u0633\u0646\u0629','\u0627\u0644\u0645\u0628\u0644\u063a','\u0639\u062f\u062f \u0627\u0644\u0623\u0639\u0636\u0627\u0621','\u0637\u064f\u0628\u0642 \u0628\u0648\u0627\u0633\u0637\u0629','\u0627\u0644\u062a\u0627\u0631\u064a\u062e']];
    DB.annual.forEach(a=>wsData.push([a.year,a.amount,a.member_count,a.applied_by||'',a.applied_at?.slice(0,10)||'']));
  }
  else if(type==='audit'){
    wsData=[['\u0627\u0644\u062a\u0627\u0631\u064a\u062e','\u0627\u0644\u0625\u062c\u0631\u0627\u0621','\u0627\u0644\u0648\u0635\u0641','\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645','\u0627\u0644\u062c\u062f\u0648\u0644']];
    DB.audit.forEach(a=>wsData.push([a.created_at?.slice(0,10)||'',a.action,a.description||'',a.user_name||'',a.table_name||'']));
  }

  const doExcel=()=>{
    const XLSX=window.XLSX;if(!XLSX){toast('\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644...','info');return;}
    const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!rtl']=true;
    const moneyMap={receipts:[3],payments:[3],donation:[3],members:[3,4],annual:[1],audit:[],users:[]};
    const colW={receipts:[10,12,26,14,16,24],payments:[10,12,26,14,16,24],donation:[10,12,26,14,16,24],members:[26,16,12,14,16],annual:[10,14,16,18,14],audit:[14,12,30,18,14],users:[26,14,14]};
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



/* ═══ SESSION TIMEOUT — 45 min inactivity ═══ */
const SESSION_TIMEOUT = 45 * 60 * 1000;
const SESSION_WARNING = 2 * 60 * 1000;
let sessionTimer = null;
let warningTimer = null;
let sessionWarningShown = false;

function resetSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  sessionWarningShown = false;
  hideSessionWarning();

  warningTimer = setTimeout(() => {
    showSessionWarning();
  }, SESSION_TIMEOUT - SESSION_WARNING);

  sessionTimer = setTimeout(() => {
    window.logout();
  }, SESSION_TIMEOUT);
}

function showSessionWarning() {
  if (sessionWarningShown) return;
  sessionWarningShown = true;
  let overlay = document.getElementById('session-warn-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'session-warn-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;direction:rtl';
    overlay.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px 32px;max-width:380px;text-align:center;font-family:Cairo,sans-serif">'
      + '<div style="font-size:40px;margin-bottom:12px">⏰</div>'
      + '<div style="font-size:16px;font-weight:600;color:#1A1A2E;margin-bottom:8px">تنبيه انتهاء الجلسة</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.7">ستنتهي الجلسة خلال دقيقتين بسبب عدم النشاط.</div>'
      + '<div style="display:flex;gap:10px;justify-content:center">'
      + '<button onclick="resetSessionTimer()" style="padding:10px 24px;background:#1A1A2E;color:#fff;border:none;border-radius:8px;font-family:Cairo;font-size:13px;font-weight:500;cursor:pointer">متابعة الجلسة</button>'
      + '<button onclick="window.logout()" style="padding:10px 24px;background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:8px;font-family:Cairo;font-size:13px;cursor:pointer">تسجيل الخروج</button>'
      + '</div></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function hideSessionWarning() {
  const overlay = document.getElementById('session-warn-overlay');
  if (overlay) overlay.style.display = 'none';
}

function initSessionTimeout() {
  ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (!sessionWarningShown) resetSessionTimer();
    }, { passive: true });
  });
  resetSessionTimer();
}


/* ═══ DOUBLE SUBMISSION GUARD ═══ */
const _saving = {};
function guardSave(key) {
  if (_saving[key]) return false;
  _saving[key] = true;
  setTimeout(() => { _saving[key] = false; }, 3000);
  return true;
}
function releaseSave(key) { _saving[key] = false; }

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
window.forgotPassword = async function(){
  const emailEl = document.getElementById('l-email');
  const email = emailEl ? emailEl.value.trim() : '';
  const msg = document.getElementById('forgot-msg');

  const neutral = 'إذا كان البريد مسجلاً لدينا فستصلك رسالة إعادة التعيين.';

  if(!email){
    if(msg){ msg.textContent = 'يرجى إدخال البريد الإلكتروني أولاً.'; msg.style.display='block'; }
    return;
  }

  try{
    await SB.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.diwan-finance.com/reset-password.html'
    });
  }catch(_){
    // لا نكشف أي خطأ — منع User Enumeration
  }

  // رسالة محايدة دائماً بصرف النظر عن وجود البريد أو عدمه
  if(msg){ msg.textContent = neutral; msg.style.display='block'; }
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
  if(error){toast(window.t('errors.generic_error')+': '+error.message,'err');return;}
  await logAction('edit', 'تغيير كلمة المرور', 'auth', null);
  window.closeM();
  document.getElementById('new-pass').value = '';
  document.getElementById('confirm-pass').value = '';
  toast('✓ '+window.t('messages.pass_changed'), 'ok');
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
    const fU=document.getElementById('set-food-opening-usd'),fJ=document.getElementById('set-food-opening-jod');
    const dU=document.getElementById('set-diwan-opening-usd'),dJ=document.getElementById('set-diwan-opening-jod');
    if(fU)fU.value=map['food_opening_usd']||'0'; if(fJ)fJ.value=map['food_opening_jod']||'0';
    if(dU)dU.value=map['diwan_opening_usd']||'0'; if(dJ)dJ.value=map['diwan_opening_jod']||'0';
    if(usdEl)   usdEl.value   = map['usd_rate']  || '3.70';
    if(jodEl)   jodEl.value   = map['jod_rate']  || '5.00';
    if(map['usd_rate'])  RATES.USD = parseFloat(map['usd_rate']);
    if(map['jod_rate'])  RATES.JOD = parseFloat(map['jod_rate']);
    window.FOOD_OPENING  = parseFloat(map['food_opening_balance']  || '0');
    window.DIWAN_OPENING = parseFloat(map['diwan_opening_balance'] || '0');
    window.FOOD_OPENING_USD  = parseFloat(map['food_opening_usd']  || '0');
    window.FOOD_OPENING_JOD  = parseFloat(map['food_opening_jod']  || '0');
    window.DIWAN_OPENING_USD = parseFloat(map['diwan_opening_usd'] || '0');
    window.DIWAN_OPENING_JOD = parseFloat(map['diwan_opening_jod'] || '0');
  }catch(e){ console.error('loadSettings error',e); }
}

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
  const foodOp = FIN.foodBalance();          /* operational only */
  const foodHist = FIN.foodHistorical();      /* reference only — never summed */
  const diwanBal = FIN.diwanBalance();        /* unchanged: opening + movements */
  summaryEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
      <div class="kpi food" style="padding:14px">
        <div class="kpi-lbl">صندوق الغداء (تشغيلي)</div>
        <div class="kpi-val">₪ ${fmt(foodOp)}</div>
        <div class="kpi-sub">رصيد سابق (للمعلومية فقط، لا يُجمع): ₪${fmt(foodHist)}</div>
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
