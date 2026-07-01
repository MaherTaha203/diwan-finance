/* ═══ UI-INFRA (Module 3 — extracted from app.js, Phase B) ═══
   Session timeout, double-submission guard, clock, Enter-key form
   navigation, and mobile navigation. Pure UI infrastructure: no FIN,
   no SQL, no Supabase, no report logic. All bindings are top-level
   function declarations / window.* assignments in a classic script,
   so they remain globally visible to app.js and to inline onclick
   handlers exactly as before (concatenation-equivalent).
   Loaded via <script defer> BEFORE app.js. Load-time side effects are
   two listener attachments (document click-outside for the mobile menu,
   window resize → initMobile) — both DOM-only and order-independent.
   Runtime dep window.logout lives in app.js and is resolved at call time. */

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
      + '<div style="font-size:16px;font-weight:600;color:#0F1B2D;margin-bottom:8px">تنبيه انتهاء الجلسة</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.7">ستنتهي الجلسة خلال دقيقتين بسبب عدم النشاط.</div>'
      + '<div style="display:flex;gap:10px;justify-content:center">'
      + '<button onclick="resetSessionTimer()" style="padding:10px 24px;background:#0F1B2D;color:#fff;border:none;border-radius:8px;font-family:Cairo;font-size:13px;font-weight:500;cursor:pointer">متابعة الجلسة</button>'
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
