/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR — Navigation v3 · Concept B (persistent icon rail + contextual fly-out).
   The desktop rail is permanently short: one icon per domain (the section
   headers). A domain's pages live in a fly-out that opens on hover (mouse) or on
   click / Enter (keyboard·touch — pinned as a menu). The workspace width never
   reflows. Narrow screens fall back to a full labelled off-canvas drawer.
   Routing (window.nav) is untouched — we only mirror active state after it runs.
   Loaded via <script defer> AFTER app.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var NARROW='(max-width:768px)';
  var mqNarrow=window.matchMedia(NARROW);

  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  function isNarrow(){return mqNarrow.matches;}
  function lang(){return window.LANG||'ar';}
  function T(ar,en){return lang()==='en'?en:ar;}

  var sb, scrim, toggleBtn, scrollArea, flyout, flyTimer;
  var pinnedGroup=null;   // the group whose fly-out is pinned open (click/keyboard)

  /* ═══ GROUPS ═══ */
  function groups(){ return $$('.nbg',sb); }
  function srcItem(p){ return $('.nbg-body .nb[data-p="'+p+'"]',sb); }
  function groupOf(p){ var el=srcItem(p); return el?el.closest('.nbg'):null; }
  function visibleItems(g){ return $$('.nbg-body .nb',g).filter(function(n){ return n.style.display!=='none'; }); }
  function headOf(g){ return g.querySelector('.nbg-h'); }

  /* ═══ role-based group visibility — hide a whole rail slot when all its pages are hidden ═══ */
  function syncGroupVisibility(){
    groups().forEach(function(g){
      if(g.id==='sbsec-reservations') return;      // auth toggles this group directly
      var visible=$$('.nbg-body .nb',g).some(function(n){ return n.style.display!=='none'; });
      g.style.display=visible?'':'none';
    });
  }

  /* ═══ MODE: overlay drawer (narrow screens) ═══ */
  function overlayOpen(){ return document.body.classList.contains('sb-overlay-open'); }
  function openOverlay(){ document.body.classList.add('sb-overlay-open'); if(scrim) scrim.hidden=false; syncToggleAria(); }
  function closeOverlay(returnFocus){
    document.body.classList.remove('sb-overlay-open');
    if(scrim) scrim.hidden=true; syncToggleAria();
    if(returnFocus && toggleBtn){ try{toggleBtn.focus();}catch(_){} }
  }
  function syncToggleAria(){ if(toggleBtn) toggleBtn.setAttribute('aria-expanded', overlayOpen()?'true':'false'); }
  function onToggle(){ if(isNarrow()) (overlayOpen()?closeOverlay(true):openOverlay()); }

  /* ═══ FLY-OUT (the contextual navigation panel) ═══ */
  function ensureFlyout(){
    if(flyout) return flyout;
    flyout=document.createElement('div'); flyout.className='sb-flyout'; flyout.hidden=true;
    flyout.setAttribute('role','menu');
    document.body.appendChild(flyout);
    flyout.addEventListener('mouseenter',function(){ clearTimeout(flyTimer); });
    flyout.addEventListener('mouseleave',function(){ if(!pinnedGroup) hideFlyout(); });
    flyout.addEventListener('click',function(e){
      var nb=e.target.closest('.nb[data-p]'); if(!nb) return;
      window.nav(nb.getAttribute('data-p')); hideFlyout(true);
      if(isNarrow() && overlayOpen()) closeOverlay(false);
    });
    flyout.addEventListener('keydown',onFlyoutKey);
    return flyout;
  }
  function buildFlyout(g){
    var items=visibleItems(g); if(!items.length) return null;
    var f=ensureFlyout();
    var ico=g.querySelector('.nbg-ico'), tEl=g.querySelector('.nbg-t');
    var title=tEl?tEl.textContent.trim():(headOf(g).getAttribute('aria-label')||'');
    var html='<div class="fly-h">'+(ico?'<i class="'+ico.className+'"></i>':'')+'<span>'+title+'</span></div>';
    items.forEach(function(n){
      var p=n.getAttribute('data-p'), ic=n.querySelector('i'), t=n.querySelector('.nb-t');
      html+='<div class="nb'+(n.classList.contains('on')?' on':'')+'" role="menuitem" tabindex="-1" data-p="'+p+'">'
        +'<i class="'+(ic?ic.className:'ti ti-point')+'"></i><span class="nb-t">'+(t?t.textContent:p)+'</span></div>';
    });
    f.innerHTML=html; f.setAttribute('data-g',g.getAttribute('data-g')||'');
    return f;
  }
  function positionFlyout(g,f){
    var gr=headOf(g).getBoundingClientRect(), sr=sb.getBoundingClientRect(), fw=f.offsetWidth, fh=f.offsetHeight;
    var rtl=(document.documentElement.getAttribute('dir')||'rtl')!=='ltr';
    var left=rtl ? (sr.left - fw - 8) : (sr.right + 8);
    if(left<6) left=6; if(left+fw>window.innerWidth-6) left=window.innerWidth-fw-6;
    var top=gr.top-6; if(top+fh>window.innerHeight-8) top=window.innerHeight-fh-8; if(top<8) top=8;
    f.style.left=left+'px'; f.style.top=top+'px';
  }
  function showFlyout(g){
    if(isNarrow()) return;                          // narrow uses the labelled drawer
    var f=buildFlyout(g); if(!f) return;
    clearTimeout(flyTimer);
    f.hidden=false; positionFlyout(g,f);
    setExpanded(g,true);
  }
  function hideFlyout(now){
    if(!flyout) return;
    clearTimeout(flyTimer);
    var doHide=function(){
      if(!flyout) return; flyout.hidden=true;
      var gid=flyout.getAttribute('data-g');
      var g=gid?$('.nbg[data-g="'+gid+'"]',sb):null; if(g) setExpanded(g,false);
    };
    if(now) doHide(); else flyTimer=setTimeout(doHide,140);
  }
  function setExpanded(g,on){ var h=headOf(g); if(h) h.setAttribute('aria-expanded',on?'true':'false'); }

  /* pinned (menu) open — from click / keyboard; stays until Esc or outside click */
  function openPinned(g){
    groups().forEach(function(x){ if(x!==g) setExpanded(x,false); });
    pinnedGroup=g; showFlyout(g);
    var first=flyout&&flyout.querySelector('.nb[data-p]'); if(first){ try{first.focus();}catch(_){} }
  }
  function closePinned(returnFocus){
    var g=pinnedGroup; pinnedGroup=null; hideFlyout(true);
    if(returnFocus && g){ var h=headOf(g); if(h){ try{h.focus();}catch(_){} } }
  }

  /* header click: single-page domain → navigate directly; multi-page → toggle pinned menu */
  function onHeadClick(g){
    if(isNarrow()) return;                          // drawer shows the pages directly
    var items=visibleItems(g);
    if(items.length===1){ closePinned(false); window.nav(items[0].getAttribute('data-p')); return; }
    if(pinnedGroup===g) closePinned(true); else openPinned(g);
  }

  /* arrow-key navigation inside the fly-out menu */
  function onFlyoutKey(e){
    var items=$$('.nb[data-p]',flyout); if(!items.length) return;
    var i=items.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); (items[i+1]||items[0]).focus(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); (items[i-1]||items[items.length-1]).focus(); }
    else if(e.key==='Home'){ e.preventDefault(); items[0].focus(); }
    else if(e.key==='End'){ e.preventDefault(); items[items.length-1].focus(); }
    else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(document.activeElement&&document.activeElement.getAttribute('data-p')){ window.nav(document.activeElement.getAttribute('data-p')); closePinned(true); } }
    else if(e.key==='Escape'){ e.preventDefault(); closePinned(true); }
  }

  /* ═══ ACTIVE STATE + navigation mirror ═══ */
  function markActive(p){
    $$('.nb',sb).forEach(function(n){ n.classList.toggle('on', n.getAttribute('data-p')===p); });
    var g=groupOf(p);
    groups().forEach(function(x){ x.classList.toggle('on-domain', x===g); });
  }
  function onNav(p){
    markActive(p);
    if(isNarrow() && overlayOpen()) closeOverlay(false);
    else if(!isNarrow()) closePinned(false);
  }

  /* ═══ WIRING ═══ */
  function wire(){
    sb=$('#sb'); scrim=$('#sb-scrim'); toggleBtn=$('#sb-toggle'); scrollArea=$('#sb-scrollarea');
    if(!sb) return;
    document.body.classList.add('nav-b');           // activate Concept B chrome

    if(toggleBtn) toggleBtn.addEventListener('click',onToggle);
    if(scrim) scrim.addEventListener('click',function(){ closeOverlay(true); });

    /* rail: hover fly-out + click-to-pin menu (per domain) */
    groups().forEach(function(g){
      g.addEventListener('mouseenter',function(){ if(!pinnedGroup) showFlyout(g); });
      g.addEventListener('mouseleave',function(){ if(!pinnedGroup) hideFlyout(); });
      var h=headOf(g);
      if(h) h.addEventListener('click',function(e){ e.preventDefault(); onHeadClick(g); });
    });
    window.addEventListener('scroll',function(){ if(!pinnedGroup) hideFlyout(true); },true);
    window.addEventListener('resize',function(){ hideFlyout(true); pinnedGroup=null; });

    /* Escape / outside click close the pinned menu or the drawer */
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(pinnedGroup) closePinned(true); if(overlayOpen()) closeOverlay(true); } });
    document.addEventListener('click',function(e){
      if(pinnedGroup && !e.target.closest('.sb-flyout') && !e.target.closest('.nbg')) closePinned(false);
    });

    /* respond to breakpoint changes (tablet⇄desktop) */
    var onMq=function(){ closeOverlay(false); hideFlyout(true); pinnedGroup=null; syncGroupVisibility(); };
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
    window.sidebarOnLang=function(){ hideFlyout(true); };

    /* initial state */
    syncToggleAria();
    syncGroupVisibility();
    var on=$('.nb.on[data-p]',sb); if(on) markActive(on.getAttribute('data-p'));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();
})();
