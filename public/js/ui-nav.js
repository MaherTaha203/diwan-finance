/* ═══ UI-NAV (Module 2 — extracted from app.js, Phase B) ═══
   Pagination + page navigation + theme toggle. All entry points are
   window.* / global function declarations, so they stay globally visible
   to app.js and to inline handlers in index.html exactly as before.
   Loaded via <script defer> BEFORE app.js. The only load-time side effect
   is attaching .nb click listeners (needs DOM + window.nav, both ready).
   Runtime deps (PS, PSZ, D, can, toast, L, window.t/LANG, render*) live in
   app.js and are only touched when these functions are *called* — after all
   scripts have executed. Concatenation-equivalent, behavior unchanged. */

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
/* A-1 PERF: debounced search — coalesces full-table re-renders while typing.
   Behaviour identical (same filter result); only intermediate keystroke renders
   are skipped. ~200ms idle delay. One timer per table key. */
window.searchDebounced=(()=>{const _t={};return k=>{clearTimeout(_t[k]);_t[k]=setTimeout(()=>{D[k]&&D[k].render();},200);};})();

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
  if(p==='annual-debt') renderAnnualDebt();
  if(p==='delinquent') renderDelinquent();
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
