/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR — Navigation v3 · MINIMAL (matte-black, restrained, workflow-first).
   Two states only: expanded (icon + page name) and collapsed (icons only, with a
   clean floating tooltip on hover — the sidebar never fully expands on hover). No
   accordion, no fly-out menus, no widgets. Narrow screens use an off-canvas drawer.
   Routing (window.nav) and role visibility are untouched — we only mirror active
   state and hide fully-empty groups after they run. Loaded via <script defer>
   AFTER app.js. Body classes: `nav-min` (activates the minimal chrome) and
   `sb-min` (collapsed, desktop only).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var LS_MIN='diwan_sb_min';        // '1' = collapsed (desktop preference)
  var NARROW='(max-width:768px)';   // tablet + mobile → overlay drawer
  var mqNarrow=window.matchMedia(NARROW);

  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  function isNarrow(){return mqNarrow.matches;}

  var sb, scrim, toggleBtn, pinBtn, tipEl, tipTimer;

  /* ═══ COLLAPSE (desktop) ═══ */
  function isCollapsed(){ try{ return localStorage.getItem(LS_MIN)==='1'; }catch(_){ return false; } }
  function applyMin(){
    var c=!isNarrow() && isCollapsed();
    document.body.classList.toggle('sb-min',c);
    if(pinBtn){
      pinBtn.setAttribute('aria-pressed',c?'true':'false');
      pinBtn.setAttribute('aria-label',c?'تثبيت الشريط الجانبي':'طيّ الشريط الجانبي');
      var pi=pinBtn.querySelector('i');
      if(pi) pi.className='ti '+(c?'ti-layout-sidebar-right-expand':'ti-layout-sidebar-right-collapse');
    }
    if(!c) hideTip();
    syncToggleAria();
  }
  function setMin(v){ try{ localStorage.setItem(LS_MIN,v?'1':'0'); }catch(_){} applyMin(); }
  function toggleMin(){ setMin(!isCollapsed()); }

  /* ═══ OVERLAY DRAWER (narrow) ═══ */
  function overlayOpen(){ return document.body.classList.contains('sb-overlay-open'); }
  function openOverlay(){ document.body.classList.add('sb-overlay-open'); if(scrim) scrim.hidden=false; syncToggleAria(); }
  function closeOverlay(returnFocus){
    document.body.classList.remove('sb-overlay-open');
    if(scrim) scrim.hidden=true; syncToggleAria();
    if(returnFocus && toggleBtn){ try{toggleBtn.focus();}catch(_){} }
  }
  function syncToggleAria(){
    if(!toggleBtn) return;
    var expanded= isNarrow() ? overlayOpen() : !isCollapsed();
    toggleBtn.setAttribute('aria-expanded',expanded?'true':'false');
  }
  /* Top ☰ button: drawer on narrow screens, collapse toggle on desktop. */
  function onToggle(){ if(isNarrow()) (overlayOpen()?closeOverlay(true):openOverlay()); else toggleMin(); }

  /* ═══ GROUPS / ITEMS ═══ */
  function groups(){ return $$('.nbg',sb); }
  function items(){ return $$('.nb',sb); }
  /* Hide a whole group when all its items are hidden (role visibility) — avoids
     an empty gap. Runs after auth's applyDataProtection and on navigation. */
  function syncGroupVisibility(){
    groups().forEach(function(g){
      var visible=$$('.nb',g).some(function(n){ return n.style.display!=='none'; });
      g.style.display=visible?'':'none';
    });
  }

  /* ═══ ACTIVE STATE + navigation mirror ═══ */
  function markActive(p){ items().forEach(function(n){ n.classList.toggle('on', n.getAttribute('data-p')===p); }); }
  function onNav(p){
    markActive(p);
    try{ syncGroupVisibility(); }catch(_){}
    if(isNarrow() && overlayOpen()) closeOverlay(false);
  }

  /* ═══ TOOLTIP (collapsed hover) — clean floating label, no full expand ═══ */
  function ensureTip(){
    if(tipEl) return tipEl;
    tipEl=document.createElement('div'); tipEl.className='sb-tip'; tipEl.hidden=true;
    document.body.appendChild(tipEl); return tipEl;
  }
  function showTip(nb){
    if(!document.body.classList.contains('sb-min') || isNarrow()) return;
    var t=$('.nb-t',nb); if(!t) return;
    var e=ensureTip(); clearTimeout(tipTimer);
    e.textContent=t.textContent.trim(); e.hidden=false;
    var r=nb.getBoundingClientRect(), sr=sb.getBoundingClientRect();
    var rtl=(document.documentElement.getAttribute('dir')||'rtl')!=='ltr';
    var top=r.top + r.height/2 - e.offsetHeight/2;
    if(top<6) top=6; if(top+e.offsetHeight>window.innerHeight-6) top=window.innerHeight-e.offsetHeight-6;
    e.style.top=top+'px';
    e.style.left=(rtl ? (sr.left - e.offsetWidth - 10) : (sr.right + 10))+'px';
  }
  function hideTip(){ if(!tipEl) return; clearTimeout(tipTimer); tipEl.hidden=true; }

  /* ═══ WIRING ═══ */
  function wire(){
    sb=$('#sb'); scrim=$('#sb-scrim'); toggleBtn=$('#sb-toggle'); pinBtn=$('#sb-pin');
    if(!sb) return;
    document.body.classList.add('nav-min');       // activate the minimal chrome
    document.body.classList.remove('nav-b');       // ensure the Concept-B rail is off

    if(toggleBtn) toggleBtn.addEventListener('click',onToggle);
    if(pinBtn) pinBtn.addEventListener('click',function(){ if(!isNarrow()) toggleMin(); });
    if(scrim) scrim.addEventListener('click',function(){ closeOverlay(true); });

    /* tooltip on collapsed rail */
    items().forEach(function(nb){
      nb.addEventListener('mouseenter',function(){ showTip(nb); });
      nb.addEventListener('mouseleave',hideTip);
      nb.addEventListener('click',hideTip);
    });
    window.addEventListener('scroll',hideTip,true);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ hideTip(); if(overlayOpen()) closeOverlay(true); } });

    /* respond to breakpoint changes (tablet⇄desktop) */
    var onMq=function(){ closeOverlay(false); hideTip(); applyMin(); syncGroupVisibility(); };
    if(mqNarrow.addEventListener) mqNarrow.addEventListener('change',onMq); else mqNarrow.addListener(onMq);

    /* wrap window.nav (routing untouched — mirror UI state after it runs) */
    if(typeof window.nav==='function' && !window.nav.__sbWrapped){
      var _nav=window.nav;
      window.nav=function(p){ var r=_nav.apply(this,arguments); try{ onNav(p); }catch(_){} return r; };
      window.nav.__sbWrapped=true;
    }
    /* wrap applyDataProtection so empty-group visibility follows role changes */
    if(typeof window.applyDataProtection==='function' && !window.applyDataProtection.__sbWrapped){
      var _adp=window.applyDataProtection;
      window.applyDataProtection=function(){ var r=_adp.apply(this,arguments); try{ syncGroupVisibility(); }catch(_){} return r; };
      window.applyDataProtection.__sbWrapped=true;
    }

    /* language hook (called from i18n after it re-translates) */
    window.sidebarOnLang=function(){ hideTip(); };

    /* initial state */
    applyMin();
    syncGroupVisibility();
    var on=$('.nb.on[data-p]',sb); if(on) markActive(on.getAttribute('data-p'));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();
})();
