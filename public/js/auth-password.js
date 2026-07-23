/* ═══ AuthDS — Authentication Design System (EB-08) ═══
   Single source of truth for password policy, strength, reuse-history and
   the premium change-password experience. Used by:
     · the in-app change-password screen (#pass-screen overlay)
     · the first-login forced-change lock (must_change_password metadata)
     · reset-password.html (standalone — policy + widgets only)
     · the admin invite modal (temp-password policy + generator)
   Presentation + auth-flow only — no FIN/DB/financial logic. Loaded AFTER
   auth.js so window.changePassword below overrides the legacy modal handler.
   Runtime deps resolve at call time: SB, CU, toast, logAction, BrandAssets,
   supabase (CDN), window.t/LANG. All optional-guarded for standalone use. */
(function(){
'use strict';
var T=function(ar,en){ return (typeof window!=='undefined'&&window.LANG==='en')?en:ar; };

/* checkPassword — AUTH-001 FINAL policy: ≥10 chars AND ≥2 of {upper,lower,digit,symbol}.
   Mirrors supabase/functions/_shared/auth-core.mjs (single frozen rule, two runtimes).
   Returns {valid, level(0 weak|1 good|2 strong), levelLabel, message} — ONE message at a
   time (length → classes → OK). `ctx` retained for signature compatibility (unused now:
   the owner-ratified policy intentionally drops the similarity/common-word gates). */
function classCount(pw){
  return (/[A-Z]/.test(pw)?1:0)+(/[a-z]/.test(pw)?1:0)+(/[0-9]/.test(pw)?1:0)+(/[^A-Za-z0-9]/.test(pw)?1:0);
}
function checkPassword(pw, ctx){
  pw=String(pw||'');
  var n=classCount(pw);
  var valid = pw.length>=10 && n>=2;
  // 3-tier advisory strength: 0 doesn't meet policy · 1 meets · 2 strong.
  var level = !valid ? 0 : (pw.length>=14 && n>=3) ? 2 : 1;
  var labels=[T('ضعيفة','Weak'),T('جيدة','Good'),T('قوية','Strong')];
  var message = null;              // ONE actionable hint at a time
  if(pw.length===0) message=null;
  else if(pw.length<10) message=T('10 أحرف على الأقل','At least 10 characters');
  else if(n<2) message=T('أضِف نوعاً ثانياً: حرف/رقم/رمز','Add a second type: letter, number, or symbol');
  else message=T('كلمة مرورٍ مقبولة','Password meets requirements');
  return {valid:valid, level:level, levelLabel:pw.length?labels[level]:'—', message:message, items:[]};
}

/* ── Reuse-history fingerprints (last 5) — salted SHA-256 via Web Crypto ── */
function fingerprint(pw, salt){
  try{
    var data=new TextEncoder().encode(String(salt||'')+'::'+String(pw||''));
    return crypto.subtle.digest('SHA-256',data).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    });
  }catch(e){ return Promise.resolve(null); } /* non-secure context → skip reuse check */
}

/* ── Strong temp-password generator (policy-compliant, unambiguous) ── */
function genPassword(len){
  len=len||16;
  var U='ABCDEFGHJKLMNPQRSTUVWXYZ', L='abcdefghijkmnpqrstuvwxyz', D='23456789', S='!@#$%&*+-=?';
  var all=U+L+D+S, out=[U,L,D,S].map(function(set){ return set[rnd(set.length)]; });
  while(out.length<len) out.push(all[rnd(all.length)]);
  for(var i=out.length-1;i>0;i--){ var j=rnd(i+1), tmp=out[i]; out[i]=out[j]; out[j]=tmp; }
  return out.join('');
  function rnd(n){ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }
}

/* ── Widget wiring: live checklist + strength + match + save gate ──
   attachPolicyUI({newInput,confirmInput,meterBar,meterLvl,checksEl,matchEl,saveBtn,ctx,extraValid})
   Returns {isValid(), refresh()} — everything updates live on input. */
function attachPolicyUI(o){
  var res=checkPassword('',o.ctx?o.ctx():{});
  function paint(){
    var ctx=o.ctx?o.ctx():{};
    res=checkPassword(o.newInput.value,ctx);
    var has=!!o.newInput.value;
    var noteEl=o.noteEl||o.checksEl;   // checksEl kept for signature compat (now a single note line)
    if(noteEl){
      noteEl.textContent=has?(res.message||''):'';
      noteEl.className='pw-note'+(has?(res.valid?' ok':' bad'):'');
    }
    if(o.meterBar){
      o.meterBar.className='l'+res.level+(has?' on':'');
      o.meterBar.style.width=(has?[34,67,100][res.level]:0)+'%';
    }
    if(o.meterLvl){ o.meterLvl.textContent=res.levelLabel; o.meterLvl.className='pw-meter-lvl l'+res.level; }
    if(o.matchEl){
      var c=o.confirmInput?o.confirmInput.value:'';
      if(!c){ o.matchEl.className='pw-match off'; o.matchEl.innerHTML=''; }
      else if(c===o.newInput.value){ o.matchEl.className='pw-match ok'; o.matchEl.innerHTML='<i class="ti ti-circle-check-filled"></i>'+T('كلمتا المرور متطابقتان','Passwords match'); }
      else { o.matchEl.className='pw-match bad'; o.matchEl.innerHTML='<i class="ti ti-alert-triangle-filled"></i>'+T('كلمتا المرور غير متطابقتين','Passwords do not match'); }
    }
    if(o.saveBtn){
      var ok=isValid();
      if(ok && o.saveBtn.disabled){ o.saveBtn.disabled=false; o.saveBtn.classList.add('ready'); }
      else if(!ok && !o.saveBtn.disabled){ o.saveBtn.disabled=true; o.saveBtn.classList.remove('ready'); }
    }
  }
  function isValid(){
    var m=!o.confirmInput||o.confirmInput.value===o.newInput.value&&o.confirmInput.value.length>0;
    var x=!o.extraValid||o.extraValid();
    return res.valid&&m&&x;
  }
  o.newInput.addEventListener('input',paint);
  if(o.confirmInput) o.confirmInput.addEventListener('input',paint);
  if(o.extraInputs) o.extraInputs.forEach(function(el){ el.addEventListener('input',paint); });
  paint();
  return {isValid:isValid, refresh:paint};
}

/* show/hide toggle with animated icon */
function bindEyes(root){
  root.querySelectorAll('.pw-eye').forEach(function(btn){
    btn.addEventListener('click',function(){
      var inp=document.getElementById(btn.getAttribute('data-for')); if(!inp) return;
      var show=inp.type==='password';
      inp.type=show?'text':'password';
      btn.innerHTML='<i class="ti '+(show?'ti-eye-off':'ti-eye')+'"></i>';
      btn.setAttribute('aria-label',show?T('إخفاء كلمة المرور','Hide password'):T('إظهار كلمة المرور','Show password'));
      btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
      inp.focus();
    });
  });
}

/* ═══ In-app change-password screen (premium overlay) ═══ */
var LOCKED=false, WIRED=null;

function screenHTML(locked){
  var eye='<button type="button" class="pw-eye" data-for="%ID%" aria-label="'+T('إظهار كلمة المرور','Show password')+'"><i class="ti ti-eye"></i></button>';
  var field=function(id,label,ac,icon){
    return '<div class="auth-fi"><label for="'+id+'">'+label+'</label>'
      +'<div class="auth-field"><i class="ti '+icon+' afi"></i>'
      +'<input type="password" id="'+id+'" autocomplete="'+ac+'" placeholder="••••••••••••" dir="ltr">'
      +eye.replace('%ID%',id)+'</div></div>';
  };
  return ''
  +'<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="pw-title">'
    +'<div class="auth-brand"><img data-brand="mark" alt="" class="auth-logo"></div>'
    +'<h1 class="auth-title" id="pw-title">'+T('تغيير كلمة المرور','Change Password')+'</h1>'
    +'<p class="auth-sub">'+(locked
        ? T('تم إنشاء حسابك بكلمة مرورٍ مؤقتة — يجب تعيين كلمة مرورٍ خاصةٍ بك قبل استخدام النظام.','Your account was created with a temporary password — set your own before using the system.')
        : T('اختر كلمة مرورٍ قويةً لحماية بيانات الديوان المالية.','Choose a strong password to protect the Diwan financial data.'))+'</p>'
    +(locked?'<div class="auth-lockbar"><i class="ti ti-shield-lock"></i>'+T('خطوة إلزامية — لا يمكن المتابعة قبل التغيير','Mandatory step — you cannot continue before changing it')+'</div>':'')
    +field('pw-cur',T('كلمة المرور الحالية','Current password'),'current-password','ti-lock')
    +field('pw-new',T('كلمة المرور الجديدة','New password'),'new-password','ti-lock-plus')
    +'<div class="pw-meter" aria-hidden="true"><div class="pw-meter-track"><i id="pw-bar"></i></div><span class="pw-meter-lvl" id="pw-lvl" role="status" aria-live="polite">—</span></div>'
    +'<p class="pw-note" id="pw-note" aria-live="polite"></p>'
    +field('pw-cnf',T('تأكيد كلمة المرور','Confirm password'),'new-password','ti-lock-check')
    +'<div class="pw-match off" id="pw-match" aria-live="polite"></div>'
    +'<button type="button" class="auth-btn" id="pw-save" disabled><i class="ti ti-lock-check"></i><span>'+T('حفظ كلمة المرور','Save password')+'</span></button>'
    +'<div class="auth-alt">'
      +(locked
        ?'<button type="button" class="auth-link" onclick="window.logout&&window.logout()"><i class="ti ti-logout"></i>'+T('تسجيل الخروج','Sign out')+'</button>'
        :'<button type="button" class="auth-link" id="pw-cancel"><i class="ti ti-arrow-right"></i>'+T('عودة','Back')+'</button>')
    +'</div>'
    +'<div class="auth-msg" id="pw-msg" role="alert"></div>'
    +'<div class="auth-success" id="pw-success" aria-hidden="true">'
      +'<svg viewBox="0 0 72 72" class="auth-ok-svg"><circle cx="36" cy="36" r="32" class="c"/><path d="M22 37.5 32 47 51 27" class="k"/></svg>'
      +'<div class="t">'+T('تم تغيير كلمة المرور بنجاح','Password changed successfully')+'</div>'
      +'<div class="s">'+T('جارٍ تحويلك…','Redirecting…')+'</div>'
    +'</div>'
  +'</div>';
}

function ensureScreen(locked){
  var host=document.getElementById('pass-screen');
  if(!host){ host=document.createElement('div'); host.id='pass-screen'; document.body.appendChild(host); }
  host.className='auth-screen'+(locked?' locked':'');
  host.innerHTML=screenHTML(locked);
  if(window.BrandAssets&&window.BrandAssets.apply) try{window.BrandAssets.apply();}catch(e){}
  bindEyes(host);
  var ui=attachPolicyUI({
    newInput:document.getElementById('pw-new'),
    confirmInput:document.getElementById('pw-cnf'),
    meterBar:document.getElementById('pw-bar'),
    meterLvl:document.getElementById('pw-lvl'),
    noteEl:document.getElementById('pw-note'),
    matchEl:document.getElementById('pw-match'),
    saveBtn:document.getElementById('pw-save'),
    ctx:function(){ var u=(typeof CU!=='undefined'&&CU)||{}; var m=u.user_metadata||{};
      return {email:u.email||'', username:m.full_name||''}; },
    extraValid:function(){ return String(document.getElementById('pw-cur').value||'').length>0; },
    extraInputs:[document.getElementById('pw-cur')]
  });
  document.getElementById('pw-save').addEventListener('click',function(){ submit(ui,locked); });
  /* single keydown listener per open — stale listeners from a previous open
     would otherwise let a normal-mode ESC handler close the LOCKED screen */
  if(host.__pwKey) host.removeEventListener('keydown',host.__pwKey);
  host.__pwKey=function(e){
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); if(ui.isValid()) submit(ui,locked); else shake(); }
    if(e.key==='Escape'){ e.stopPropagation(); if(locked){ e.preventDefault(); } else close(); }
    if(e.key==='Tab'){ trapTab(e,host); }
  };
  host.addEventListener('keydown',host.__pwKey);
  if(!locked){ var c=document.getElementById('pw-cancel'); if(c) c.addEventListener('click',close); }
  return host;
}

function trapTab(e,host){
  var f=host.querySelectorAll('button:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
  if(!f.length) return;
  var first=f[0], last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
}
function shake(){
  var card=document.querySelector('#pass-screen .auth-card'); if(!card) return;
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
}
function setMsg(txt,kind){
  var m=document.getElementById('pw-msg'); if(!m) return;
  m.textContent=txt||''; m.className='auth-msg'+(txt?(' show '+(kind||'')):'');
}
function close(){
  var host=document.getElementById('pass-screen'); if(host){ host.className='auth-screen off'; host.innerHTML=''; }
  LOCKED=false;
}

/* Open the experience. opts:{locked} — locked = first-login mandatory mode. */
window.openPasswordChange=function(opts){
  opts=opts||{};
  LOCKED=!!opts.locked;
  var host=ensureScreen(LOCKED);
  host.classList.add('on');
  setTimeout(function(){ var el=document.getElementById('pw-cur'); if(el) el.focus(); },80);
};
/* Legacy entry point (topbar + any old caller) now opens the new experience. */
window.changePassword=function(){ window.openPasswordChange({locked:false}); };

/* ── Submit: verify current → reuse check → update → audit → success ── */
async function submit(ui,locked){
  if(!ui.isValid()){ shake(); return; }
  var cur=document.getElementById('pw-cur').value,
      nw =document.getElementById('pw-new').value;
  var btn=document.getElementById('pw-save');
  btn.disabled=true; btn.innerHTML='<span class="auth-spin"></span>';
  setMsg('');
  var u=(typeof CU!=='undefined'&&CU)||{}, meta=u.user_metadata||{};
  try{
    /* 1 — verify the current password on an ISOLATED client (never swaps the session) */
    if(u.email&&typeof supabase!=='undefined'&&window.__SB_URL){
      var tmp=supabase.createClient(window.__SB_URL,window.__SB_ANON,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'sb-pwv-tmp'}});
      var v=await tmp.auth.signInWithPassword({email:u.email,password:cur});
      try{ await tmp.auth.signOut(); }catch(_){}
      if(v.error){ fail(T('كلمة المرور الحالية غير صحيحة','Current password is incorrect')); return; }
    }
    if(nw===cur){ fail(T('كلمة المرور الجديدة مطابقة للحالية','New password must differ from the current one')); return; }
    /* 2 — reuse prevention: last 5 salted fingerprints in user metadata */
    var hist=Array.isArray(meta.pw_history)?meta.pw_history.slice():[];
    var fpNew=await fingerprint(nw,u.id), fpCur=await fingerprint(cur,u.id);
    if(fpNew&&hist.indexOf(fpNew)>=0){ fail(T('لا يمكن إعادة استخدام إحدى كلمات المرور الخمس الأخيرة','You cannot reuse one of your last five passwords')); return; }
    var newHist=[fpNew,fpCur].concat(hist).filter(function(x,i,a){return x&&a.indexOf(x)===i;}).slice(0,5);
    /* 3 — the actual change (secure hashing is server-side in Supabase Auth) */
    var r=await SB.auth.updateUser({password:nw,data:{must_change_password:false,pw_history:newHist}});
    if(r.error){ fail(T('تعذّر التغيير: ','Change failed: ')+r.error.message); return; }
    try{ if(r.data&&r.data.user) CU=r.data.user; }catch(_){}
    /* 4 — audit trail */
    try{ if(typeof logAction==='function') await logAction('password_change',T('تغيير كلمة المرور','Password changed'),'auth',null); }catch(_){}
    /* 5 — success experience → redirect */
    var card=document.querySelector('#pass-screen .auth-card');
    if(card) card.classList.add('done');
    setTimeout(function(){
      close();
      if(typeof toast==='function') toast('✓ '+T('تم تحديث كلمة المرور','Password updated'),'ok');
      if(locked&&typeof window.nav==='function'){ try{ window.nav('dash'); }catch(_){} }
    },1700);
  }catch(e){ fail(T('حدث خطأ غير متوقع','Unexpected error')+(e&&e.message?(': '+e.message):'')); }
  function fail(msg){
    setMsg(msg,'err'); shake();
    btn.disabled=false; btn.classList.add('ready');
    btn.innerHTML='<i class="ti ti-lock-check"></i><span>'+T('حفظ كلمة المرور','Save password')+'</span>';
  }
}

/* ── Invite helper: generate + fill a compliant temp password ── */
window.genInvitePass=function(){
  var inp=document.getElementById('inv-pass'); if(!inp) return;
  inp.value=genPassword(16);
  inp.dispatchEvent(new Event('input'));
  try{ navigator.clipboard&&navigator.clipboard.writeText(inp.value); }catch(_){}
  if(typeof toast==='function') toast(T('تم توليد كلمة مرورٍ قوية ونسخها','Strong password generated & copied'),'ok');
};

/* Public API (also used by reset-password.html) */
window.AuthDS={ checkPassword:checkPassword, attachPolicyUI:attachPolicyUI,
  fingerprint:fingerprint, genPassword:genPassword, bindEyes:bindEyes,
  isLocked:function(){ return LOCKED; } };

/* Wire the invite modal's live temp-password policy (static markup in index.html) */
function wireInvite(){
  var inp=document.getElementById('inv-pass'); if(!inp||inp.__pwWired) return;
  inp.__pwWired=true;
  attachPolicyUI({
    newInput:inp,
    meterBar:document.getElementById('inv-bar'),
    meterLvl:document.getElementById('inv-lvl'),
    noteEl:document.getElementById('inv-note'),
    ctx:function(){ return {
      email:(document.getElementById('inv-email')||{}).value||'',
      username:(document.getElementById('inv-name')||{}).value||'' }; },
    extraInputs:[document.getElementById('inv-email'),document.getElementById('inv-name')].filter(Boolean)
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wireInvite);
else wireInvite();
})();
