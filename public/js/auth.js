/* ═══ AUTHENTICATION & SESSION (Module 5 — extracted from app.js, Phase B) ═══
   Login (email/phone), fail-closed role check (afterLogin), logout,
   role-based permission lockdown (applyPerms + _sweepRestrictedElements),
   session restore (checkSession), forgot-password (neutral, anti-enumeration)
   and change-password. Verbatim move — no auth rule, role logic or
   Supabase call changed. All bindings are global declarations / window.*
   assignments in a classic script, visible to app.js and inline handlers
   exactly as before. No load-time side effects. Runtime deps (SB, CU, CUR,
   DB, ROLES, can, toast, vf, window.t, loadSettings/fetchRates/loadAll,
   startClock/initSessionTimeout/initMobile, applyTopbarStyles,
   applyDataProtection, applyLoginLang, logAction, window.nav, window.closeM)
   are shared globals resolved at call time — after every script executed. */

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
  const{data:role}=await SB.from('user_roles').select('*').eq('user_id',CU.id).maybeSingle();
  /* Fail-closed: only users provisioned with a valid role row may enter.
     No default-viewer fallback — an unknown/self-registered account is denied. */
  const rawRole=role?.role;
  if(!role||(rawRole!=='admin'&&rawRole!=='viewer'&&rawRole!=='reservation')){
    await SB.auth.signOut();CU=null;CUR=null;
    showLoginErr('لا تملك صلاحية الوصول إلى النظام. الرجاء التواصل مع مسؤول النظام.');
    const lb=document.getElementById('login-btn');
    if(lb){lb.disabled=false;lb.innerHTML='<i class="ti ti-login"></i>تسجيل الدخول';}
    return;
  }
  const safeRole=(rawRole==='admin')?'admin':(rawRole==='reservation'?'reservation':'viewer');
  CUR={...role,role:safeRole,full_name:role.full_name||CU.email};

  const ini=(CUR.full_name||CU.email).charAt(0).toUpperCase();
  document.getElementById('uav').textContent=ini;
  document.getElementById('uav').className='uav '+CUR.role;
  document.getElementById('uname').textContent=CUR.full_name||CU.email;
  document.getElementById('urole').textContent=ROLES[CUR.role]||CUR.role;
  applyPerms();
  applyTopbarStyles();
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  /* First-login security (EB-08 — MANDATORY): a user provisioned with a
     temporary password carries must_change_password=true in metadata. The
     AuthDS overlay opens LOCKED (opaque, no close, focus-trapped; logout is
     the only escape) so no page is usable before the password is changed.
     Cleared by the change itself (auth-password.js → updateUser metadata). */
  if(CU?.user_metadata?.must_change_password){
    if(typeof window.openPasswordChange==='function'){
      window.openPasswordChange({locked:true});
    }
  }
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
  if(CUR.role==='reservation'){
    /* Module R single-purpose role: finance tables are RLS-blocked for this
       role, so skip finance loads entirely and land on the calendar. */
    startClock();
    initSessionTimeout();
    await logAction('login','تسجيل دخول','auth',null);
    applyLoginLang();
    window.nav('reservations');
    return;
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
  const rsv=CUR?.role==='reservation';
  /* Module R: reservation-manager sees ONLY the calendar (CSS lockdown);
     the calendar item itself is admin+reservation only (design Q1: viewer=no). */
  document.body.classList.toggle('role-reservation',rsv);
  const nbRes=document.getElementById('nb-reservations');
  if(nbRes)nbRes.style.display=(a||rsv)?'':'none';
  const sbRes=document.getElementById('sbsec-reservations');
  if(sbRes)sbRes.style.display=(a||rsv)?'':'none';

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
  /* 'fab' (mobile quick-action) is write-gated here; CSS reveals it only on phones. */
  ['btn-food-rec','btn-diwan-rec','btn-don','btn-food-pay','btn-diwan-pay','btn-add-member',
   'dash-btn-rec','dash-btn-pay','fab'].forEach(id=>{
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

/* ═══ CHANGE PASSWORD ═══
   EB-08: the legacy 6-char modal handler was replaced by the AuthDS premium
   experience — window.changePassword is now defined in auth-password.js
   (loaded right after this file) with full policy, strength, reuse-history,
   current-password verification, audit logging and the first-login lock. */
