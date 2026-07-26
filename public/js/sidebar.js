/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR (Module SB) — Navigation v2 (frozen architecture).
   Accordion (one section open at a time · remembered · auto-expands the current
   page's section · single-page sections show no chevron), an icons-only collapsed
   rail with a hover fly-out submenu (the layout width never reflows), and full
   keyboard/ARIA support. No Favorites. No Search. Routing (window.nav) untouched —
   we only mirror UI state after it runs. Loaded via <script defer> AFTER app.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var LS_MODE='diwan_sb_mode';      // 'pinned' | 'mini'  (desktop preference)
  var LS_OPEN='diwan_sb_open';      // id of the single expanded section (accordion)
  var NARROW='(max-width:768px)';   // tablet + mobile → overlay drawer
  var mqNarrow=window.matchMedia(NARROW);

  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  function isNarrow(){return mqNarrow.matches;}
  function lang(){return window.LANG||'ar';}
  function T(ar,en){return lang()==='en'?en:ar;}

  var sb, scrim, toggleBtn, pinBtn, scrollArea, flyout, flyTimer;

  /* ═══ MODE: pinned ⇄ mini (desktop) ═══ */
  function getMode(){ try{ return localStorage.getItem(LS_MODE)==='mini'?'mini':'pinned'; }catch(_){ return 'pinned'; } }
  function applyMode(){
    var mini=!isNarrow() && getMode()==='mini';
    document.body.classList.toggle('sb-mini',mini);
    if(pinBtn){
      pinBtn.setAttribute('aria-pressed',mini?'true':'false');
      pinBtn.setAttribute('aria-label',mini?T('تثبيت الشريط الجانبي','Pin sidebar'):T('طيّ الشريط الجانبي','Collapse sidebar'));
      var pi=pinBtn.querySelector('i');
      if(pi) pi.className='ti '+(mini?'ti-layout-sidebar-right-expand':'ti-layout-sidebar-right-collapse');
    }
    if(!mini) hideFlyout(true);
    syncToggleAria();
  }
  function setMode(mode){ try{ localStorage.setItem(LS_MODE,mode); }catch(_){} applyMode(); }
  function toggleMini(){ setMode(getMode()==='mini'?'pinned':'mini'); }

  /* ═══ MODE: overlay (narrow screens) ═══ */
  function overlayOpen(){ return document.body.classList.contains('sb-overlay-open'); }
  function openOverlay(){ document.body.classList.add('sb-overlay-open'); if(scrim) scrim.hidden=false; syncToggleAria(); }
  function closeOverlay(returnFocus){
    document.body.classList.remove('sb-overlay-open');
    if(scrim) scrim.hidden=true; syncToggleAria();
    if(returnFocus && toggleBtn){ try{toggleBtn.focus();}catch(_){} }
  }
  function syncToggleAria(){
    if(!toggleBtn) return;
    var expanded= isNarrow() ? overlayOpen() : getMode()!=='mini';
    toggleBtn.setAttribute('aria-expanded',expanded?'true':'false');
  }
  /* Top ☰ button: drawer on narrow screens, mini toggle on desktop. */
  function onToggle(){ if(isNarrow()) (overlayOpen()?closeOverlay(true):openOverlay()); else toggleMini(); }

  /* ═══ GROUPS ═══ */
  function groups(){ return $$('.nbg',sb); }
  function srcItem(p){ return $('.nbg-body .nb[data-p="'+p+'"]',sb); }
  function groupOf(p){ var el=srcItem(p); return el?el.closest('.nbg'):null; }
  function visibleItems(g){ return $$('.nbg-body .nb',g).filter(function(n){ return n.style.display!=='none'; }); }
  function isSingle(g){ return g.classList.contains('nbg-single'); }

  function setGroupOpen(g,open){
    if(isSingle(g)) open=true;               // single-page sections are always shown
    g.classList.toggle('open',open);
    var h=g.querySelector('.nbg-h');
    if(h && !isSingle(g)) h.setAttribute('aria-expanded',open?'true':'false');
  }
  /* Accordion: opening one section collapses the others (single-page sections excluded). */
  function openOnly(g){
    groups().forEach(function(x){ if(!isSingle(x)) setGroupOpen(x, x===g); });
    if(g && g.getAttribute('data-g')) { try{ localStorage.setItem(LS_OPEN,g.getAttribute('data-g')); }catch(_){} }
  }
  function toggleGroup(g){
    if(isSingle(g)) return;                   // no accordion for single-page sections
    if(g.classList.contains('open')){ setGroupOpen(g,false); try{ localStorage.removeItem(LS_OPEN); }catch(_){} }
    else openOnly(g);
  }
  function openGroupFor(p){ var g=groupOf(p); if(g && !isSingle(g)) openOnly(g); }

  /* Mark single-page (≤1 visible item) sections: no chevron, always open. */
  function markSingles(){
    groups().forEach(function(g){
      var single=visibleItems(g).length<=1;
      g.classList.toggle('nbg-single',single);
      if(single) setGroupOpen(g,true);
    });
  }

  /* ═══ role-based group visibility — hide a group whose items are all hidden ═══ */
  function syncGroupVisibility(){
    groups().forEach(function(g){
      if(g.id==='sbsec-reservations') return; // auth toggles this group directly
      var visible=$$('.nbg-body .nb',g).some(function(n){ return n.style.display!=='none'; });
      g.style.display=visible?'':'none';
    });
    markSingles();
    restoreOpen();
  }

  /* ═══ FLY-OUT (collapsed rail) ═══ */
  function ensureFlyout(){
    if(flyout) return flyout;
    flyout=document.createElement('div'); flyout.className='sb-flyout'; flyout.hidden=true;
    document.body.appendChild(flyout);
    flyout.addEventListener('mouseenter',function(){ clearTimeout(flyTimer); });
    flyout.addEventListener('mouseleave',function(){ hideFlyout(); });
    flyout.addEventListener('click',function(e){ var nb=e.target.closest('.nb[data-p]'); if(nb){ window.nav(nb.getAttribute('data-p')); hideFlyout(true); } });
    return flyout;
  }
  function showFlyout(g){
    if(getMode()!=='mini' || isNarrow()) return;
    var items=visibleItems(g); if(!items.length) return;
    var f=ensureFlyout(); clearTimeout(flyTimer);
    var hEl=g.querySelector('.nbg-t'), title=hEl?hEl.textContent.trim():'';
    var html=title?('<div class="fly-h">'+title+'</div>'):'';
    items.forEach(function(n){
      var p=n.getAttribute('data-p'), ic=n.querySelector('i'), t=n.querySelector('.nb-t');
      html+='<div class="nb'+(n.classList.contains('on')?' on':'')+'" role="button" tabindex="0" data-p="'+p+'">'
        +'<i class="'+(ic?ic.className:'ti ti-point')+'"></i><span class="nb-t">'+(t?t.textContent:p)+'</span></div>';
    });
    f.innerHTML=html; f.hidden=false;
    // position beside the rail, direction-aware, clamped to viewport
    var gr=g.getBoundingClientRect(), sr=sb.getBoundingClientRect(), fw=f.offsetWidth, fh=f.offsetHeight;
    var rtl=(document.documentElement.getAttribute('dir')||'rtl')!=='ltr';
    var left=rtl ? (sr.left - fw - 6) : (sr.right + 6);
    if(left<6) left=6; if(left+fw>window.innerWidth-6) left=window.innerWidth-fw-6;
    var top=gr.top; if(top+fh>window.innerHeight-8) top=window.innerHeight-fh-8; if(top<8) top=8;
    f.style.left=left+'px'; f.style.top=top+'px';
  }
  function hideFlyout(now){
    if(!flyout) return;
    clearTimeout(flyTimer);
    if(now){ flyout.hidden=true; return; }
    flyTimer=setTimeout(function(){ if(flyout) flyout.hidden=true; },130);
  }

  /* ═══ ACTIVE STATE + navigation mirror ═══ */
  function markActive(p){ $$('.nb',sb).forEach(function(n){ n.classList.toggle('on', n.getAttribute('data-p')===p); }); }
  function onNav(p){
    markActive(p);
    openGroupFor(p);                          // auto-expand the section of the current page
    if(isNarrow() && overlayOpen()) closeOverlay(false);
  }

  /* Restore the remembered open section, else the active page's section. */
  function restoreOpen(){
    if(getMode()==='mini' && !isNarrow()) return; // mini shows all icons; accordion N/A
    var saved=null; try{ saved=localStorage.getItem(LS_OPEN); }catch(_){}
    var target=null;
    if(saved){ target=$('.nbg[data-g="'+saved+'"]',sb); if(target && (target.style.display==='none'||isSingle(target))) target=null; }
    if(!target){ var on=$('.nb.on[data-p]',sb); target=on?on.closest('.nbg'):null; }
    if(!target){ target=groups().filter(function(g){return g.style.display!=='none'&&!isSingle(g);})[0]||null; }
    if(target) openOnly(target); else groups().forEach(function(g){ if(!isSingle(g)) setGroupOpen(g,false); });
  }

  /* ═══ WIRING ═══ */
  function wire(){
    sb=$('#sb'); scrim=$('#sb-scrim'); toggleBtn=$('#sb-toggle'); pinBtn=$('#sb-pin'); scrollArea=$('#sb-scrollarea');
    if(!sb) return;

    if(toggleBtn) toggleBtn.addEventListener('click',onToggle);
    if(pinBtn) pinBtn.addEventListener('click',function(){ if(!isNarrow()) toggleMini(); });
    if(scrim) scrim.addEventListener('click',function(){ closeOverlay(true); });

    /* section headers: click / keyboard toggle (accordion) */
    $$('.nbg-h',sb).forEach(function(h){
      h.addEventListener('click',function(){ toggleGroup(h.closest('.nbg')); });
    });

    /* fly-out on the collapsed rail */
    groups().forEach(function(g){
      g.addEventListener('mouseenter',function(){ showFlyout(g); });
      g.addEventListener('mouseleave',function(){ hideFlyout(); });
    });
    window.addEventListener('scroll',function(){ hideFlyout(true); },true);

    /* Escape closes the overlay from anywhere */
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ hideFlyout(true); if(overlayOpen()) closeOverlay(true); } });

    /* respond to breakpoint changes (tablet⇄desktop) */
    var onMq=function(){ closeOverlay(false); hideFlyout(true); applyMode(); syncGroupVisibility(); };
    if(mqNarrow.addEventListener) mqNarrow.addEventListener('change',onMq); else mqNarrow.addListener(onMq);

    /* wrap window.nav (routing untouched — mirror UI state after it runs) */
    if(typeof window.nav==='function' && !window.nav.__sbWrapped){
      var _nav=window.nav;
      window.nav=function(p){ var r=_nav.apply(this,arguments); try{ onNav(p); }catch(_){} return r; };
      window.nav.__sbWrapped=true;
    }
    /* wrap applyDataProtection so section visibility follows role changes */
    if(typeof window.applyDataProtection==='function' && !window.applyDataProtection.__sbWrapped){
      var _adp=window.applyDataProtection;
      window.applyDataProtection=function(){ var r=_adp.apply(this,arguments); try{ syncGroupVisibility(); }catch(_){} return r; };
      window.applyDataProtection.__sbWrapped=true;
    }

    /* language hook (called from i18n after it re-translates) */
    window.sidebarOnLang=function(){ applyMode(); };

    /* initial state */
    applyMode();
    syncGroupVisibility();      // → markSingles() → restoreOpen()
    var on=$('.nb.on[data-p]',sb); if(on) markActive(on.getAttribute('data-p'));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();
})();
