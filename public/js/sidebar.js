/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR (Module SB) — navigation shell behaviour.
   Adds three operating modes (pinned · mini · overlay), collapsible groups with
   active-context accordion, instant page search, favorites (localStorage), and
   full keyboard/ARIA support — WITHOUT changing colours, typography, icons or the
   window.nav routing contract. Loaded via <script defer> AFTER app.js, so
   window.nav / applyDataProtection already exist and can be wrapped.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var LS_MODE='diwan_sb_mode';      // 'pinned' | 'mini'  (desktop preference)
  var LS_FAVS='diwan_sb_favs';      // JSON array of data-p page keys
  var NARROW='(max-width:768px)';   // tablet + mobile → overlay drawer
  var mqNarrow=window.matchMedia(NARROW);

  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  function isNarrow(){return mqNarrow.matches;}
  function lang(){return window.LANG||'ar';}
  function T(ar,en){return lang()==='en'?en:ar;}

  var sb, scrim, toggleBtn, pinBtn, search, searchX, favsGroup, favsBody, scrollArea;
  var searching=false;

  /* ── favorites persistence ── */
  function loadFavs(){ try{var v=JSON.parse(localStorage.getItem(LS_FAVS)); return Array.isArray(v)?v:[];}catch(_){return [];} }
  function saveFavs(a){ try{localStorage.setItem(LS_FAVS,JSON.stringify(a));}catch(_){} }

  /* ── page metadata read from the real nav item (label + icon), so favorites
        and any labels always mirror the source of truth (and current language). ── */
  function srcItem(p){ return $('.nbg-body:not(#sb-favs-body) .nb[data-p="'+p+'"]'); }
  function labelOf(p){ var el=srcItem(p), t=el&&el.querySelector('.nb-t'); return t?t.textContent:p; }
  function iconOf(p){ var el=srcItem(p), i=el&&el.querySelector('i'); return i?i.className:'ti ti-point'; }

  /* ═══ MODE: pinned ⇄ mini (desktop) ═══ */
  /* Theme-01 (owner revision): the expanded sidebar with ALL page names visible
     is the default; mini rail stays available via the pin button. */
  function getMode(){ return localStorage.getItem(LS_MODE)==='mini'?'mini':'pinned'; }
  function applyMode(){
    var mini=!isNarrow() && getMode()==='mini';
    document.body.classList.toggle('sb-mini',mini);
    if(pinBtn){
      pinBtn.setAttribute('aria-pressed',mini?'true':'false');
      pinBtn.setAttribute('aria-label',mini?T('تثبيت الشريط الجانبي','Pin sidebar'):T('طيّ الشريط الجانبي','Collapse sidebar'));
      var pi=pinBtn.querySelector('i');
      if(pi) pi.className='ti '+(mini?'ti-layout-sidebar-right-expand':'ti-layout-sidebar-right-collapse');
    }
    syncToggleAria();
  }
  function setMode(mode){ localStorage.setItem(LS_MODE,mode); applyMode(); placeInkSoon(); }
  function toggleMini(){ setMode(getMode()==='mini'?'pinned':'mini'); }

  /* ═══ MODE: overlay (narrow screens) ═══ */
  function overlayOpen(){ return document.body.classList.contains('sb-overlay-open'); }
  function openOverlay(){
    document.body.classList.add('sb-overlay-open');
    if(scrim) scrim.hidden=false;
    syncToggleAria();
    if(search){ try{search.focus();}catch(_){} }
  }
  function closeOverlay(returnFocus){
    document.body.classList.remove('sb-overlay-open');
    if(scrim) scrim.hidden=true;
    syncToggleAria();
    if(returnFocus && toggleBtn){ try{toggleBtn.focus();}catch(_){} }
  }
  function syncToggleAria(){
    if(!toggleBtn) return;
    var expanded= isNarrow() ? overlayOpen() : getMode()!=='mini';
    toggleBtn.setAttribute('aria-expanded',expanded?'true':'false');
  }
  /* The top ☰ button: opens the drawer on narrow screens, toggles mini on desktop. */
  function onToggle(){ if(isNarrow()) (overlayOpen()?closeOverlay(true):openOverlay()); else toggleMini(); }

  /* ═══ COLLAPSIBLE GROUPS + active-context accordion ═══ */
  function groups(){ return $$('.nbg:not(.sb-favs)'); }
  function groupOf(p){ var el=srcItem(p); return el?el.closest('.nbg'):null; }
  function setGroupOpen(g,open){
    g.classList.toggle('open',open);
    var h=g.querySelector('.nbg-h');
    if(h) h.setAttribute('aria-expanded',open?'true':'false');
  }
  /* Theme-01 (owner revision): NO accordions — every group stays open and every
     page name stays visible. Headers become static section labels; toggling and
     the active-context accordion are neutralized (search still filters items). */
  function toggleGroup(g){ setGroupOpen(g,true); }
  function expandActiveGroup(p){
    groups().forEach(function(g){ setGroupOpen(g,true); });
  }

  /* ═══ SEARCH — instant filter ═══ */
  function runSearch(q){
    q=(q||'').trim().toLowerCase();
    searching=!!q;
    if(searchX) searchX.hidden=!q;
    document.body.classList.toggle('sb-searching',searching);
    if(!searching){
      $$('.nb',sb).forEach(function(n){ n.classList.remove('sb-hit'); });
      groups().forEach(function(g){ g.classList.remove('sb-empty'); });
      applyMode();
      // restore accordion around the current page
      var on=$('.nb.on[data-p]'); expandActiveGroup(on?on.getAttribute('data-p'):'dash');
      placeInkSoon();
      return;
    }
    groups().forEach(function(g){
      var any=false;
      $$('.nbg-body .nb',g).forEach(function(n){
        if(n.style.display==='none'){ return; } // respect role-hidden items
        var t=n.querySelector('.nb-t'), txt=(t?t.textContent:'').toLowerCase();
        var hit=txt.indexOf(q)!==-1;
        n.classList.toggle('sb-hit',hit);
        if(hit) any=true;
      });
      g.classList.toggle('sb-empty',!any);
      setGroupOpen(g,any);           // auto-expand groups that have matches
    });
    placeInkSoon();
  }
  function clearSearch(){ if(search){ search.value=''; } runSearch(''); if(search) search.focus(); }

  /* ═══ FAVORITES ═══ */
  function isFav(p){ return loadFavs().indexOf(p)!==-1; }
  function toggleFav(p){
    var f=loadFavs(), i=f.indexOf(p);
    if(i===-1) f.push(p); else f.splice(i,1);
    saveFavs(f); renderFavs(); reflectStars();
  }
  function reflectStars(){
    var f=loadFavs();
    $$('.nbg-body:not(#sb-favs-body) .nb[data-p]').forEach(function(n){
      var on=f.indexOf(n.getAttribute('data-p'))!==-1;
      n.classList.toggle('is-fav',on);
      var st=n.querySelector('.nb-star');
      if(st){
        st.setAttribute('aria-pressed',on?'true':'false');
        st.setAttribute('aria-label',on?T('إزالة من المفضّلة','Remove from favorites'):T('تثبيت في المفضّلة','Add to favorites'));
        var si=st.querySelector('i'); if(si) si.className='ti '+(on?'ti-star-filled':'ti-star');
      }
    });
  }
  function renderFavs(){
    if(!favsBody) return;
    var f=loadFavs().filter(function(p){ var s=srcItem(p); return s && s.style.display!=='none'; });
    favsBody.innerHTML='';
    f.forEach(function(p){
      var d=document.createElement('div');
      d.className='nb'; d.setAttribute('role','button'); d.setAttribute('tabindex','0');
      d.setAttribute('data-p',p); d.setAttribute('data-fav','1');
      d.innerHTML='<i class="'+iconOf(p)+'"></i><span class="nb-t">'+labelOf(p)+'</span>'
        +'<button class="nb-star is-on" tabindex="-1" aria-label="'+T('إزالة من المفضّلة','Remove from favorites')+'"><i class="ti ti-star-filled"></i></button>';
      favsBody.appendChild(d);
    });
    if(favsGroup) favsGroup.hidden = f.length===0;
    // keep active highlight in sync on the clones too
    var on=$('.nb.on[data-p]'); if(on) markActive(on.getAttribute('data-p'));
  }

  /* ═══ ACTIVE STATE sync (covers favorite clones + accordion + overlay close) ═══ */
  function markActive(p){
    $$('.nb',sb).forEach(function(n){ n.classList.toggle('on', n.getAttribute('data-p')===p); });
  }
  /* ═══ DX-5 · the traveling ink layer ═══
     One shared active-layer travels between items (transform/height animate in
     CSS), so switching pages reads as the SAME ink moving with the user — never
     a new rectangle appearing. Falls back to a static .nb.on fill if absent. */
  var ink=null;
  function placeInk(){
    if(!sb||!scrollArea) return;
    if(!ink){
      ink=document.createElement('div'); ink.className='sb-ink';
      scrollArea.appendChild(ink); sb.classList.add('sb-has-ink');
    }
    /* target the real group item (favorites clones stay text-only) */
    var on=scrollArea.querySelector('.nbg-body:not(#sb-favs-body) .nb.on')||scrollArea.querySelector('.nb.on');
    if(!on || on.offsetParent===null){ ink.classList.remove('show'); return; }
    ink.style.height=on.offsetHeight+'px';
    ink.style.transform='translateY('+on.offsetTop+'px)';
    ink.classList.add('show');
  }
  var _inkT=null;
  function placeInkSoon(){ clearTimeout(_inkT); _inkT=setTimeout(placeInk,40); }
  function onNav(p){
    markActive(p);
    expandActiveGroup(p);
    placeInkSoon();
    if(isNarrow() && overlayOpen()) closeOverlay(false);
  }

  /* ═══ role-based group visibility — hide a group when all its items are hidden ═══ */
  function syncGroupVisibility(){
    groups().forEach(function(g){
      if(g.id==='sbsec-reservations') return; // auth toggles this group directly
      var visible=$$('.nbg-body .nb',g).some(function(n){ return n.style.display!=='none'; });
      g.style.display=visible?'':'none';
    });
  }

  /* ═══ WIRING ═══ */
  function wire(){
    sb=$('#sb'); scrim=$('#sb-scrim'); toggleBtn=$('#sb-toggle'); pinBtn=$('#sb-pin');
    search=$('#sb-search'); searchX=$('#sb-search-x'); favsGroup=$('#sb-favs');
    favsBody=$('#sb-favs-body'); scrollArea=$('#sb-scrollarea');
    if(!sb) return;

    if(toggleBtn) toggleBtn.addEventListener('click',onToggle);
    if(pinBtn) pinBtn.addEventListener('click',function(){ if(!isNarrow()) toggleMini(); });
    if(scrim) scrim.addEventListener('click',function(){ closeOverlay(true); });

    if(search){
      search.addEventListener('input',function(){ runSearch(search.value); });
      search.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); if(search.value) clearSearch(); else closeOverlay(true); } });
    }
    if(searchX) searchX.addEventListener('click',clearSearch);

    /* group headers: click / keyboard toggle */
    $$('.nbg-h[data-g]').forEach(function(h){
      h.addEventListener('click',function(){ toggleGroup(h.closest('.nbg')); });
    });

    /* delegated clicks inside the sidebar: favorites stars + favorite-clone nav */
    sb.addEventListener('click',function(e){
      var star=e.target.closest('.nb-star');
      if(star){
        e.stopPropagation(); e.preventDefault();
        var nb=star.closest('.nb'); if(nb) toggleFav(nb.getAttribute('data-p'));
        return;
      }
      var fav=e.target.closest('#sb-favs-body .nb[data-p]');
      if(fav){ window.nav(fav.getAttribute('data-p')); }
    });
    /* keyboard on favorite clones (real items are wired by ui-nav.js) */
    if(favsBody) favsBody.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ var fav=e.target.closest('.nb[data-p]'); if(fav){ e.preventDefault(); window.nav(fav.getAttribute('data-p')); } }
    });

    /* Escape closes the overlay from anywhere */
    document.addEventListener('keydown',function(e){ if(e.key==='Escape' && overlayOpen()) closeOverlay(true); });

    /* respond to breakpoint changes (tablet⇄desktop) */
    var onMq=function(){ closeOverlay(false); applyMode(); };
    if(mqNarrow.addEventListener) mqNarrow.addEventListener('change',onMq); else mqNarrow.addListener(onMq);

    /* wrap window.nav (routing untouched — we only mirror UI state after it runs) */
    if(typeof window.nav==='function' && !window.nav.__sbWrapped){
      var _nav=window.nav;
      window.nav=function(p){ var r=_nav.apply(this,arguments); try{ onNav(p); }catch(_){} return r; };
      window.nav.__sbWrapped=true;
    }
    /* wrap applyDataProtection so group visibility + favorites follow role changes */
    if(typeof window.applyDataProtection==='function' && !window.applyDataProtection.__sbWrapped){
      var _adp=window.applyDataProtection;
      window.applyDataProtection=function(){ var r=_adp.apply(this,arguments); try{ syncGroupVisibility(); renderFavs(); reflectStars(); }catch(_){} return r; };
      window.applyDataProtection.__sbWrapped=true;
    }

    /* language hook (called from i18n after it re-translates) */
    window.sidebarOnLang=function(){
      if(search) search.setAttribute('placeholder',T('بحث في الصفحات...','Search pages...'));
      renderFavs(); reflectStars(); applyMode(); placeInkSoon();
    };

    /* initial state */
    applyMode();
    reflectStars(); renderFavs();
    syncGroupVisibility();
    var on=$('.nb.on[data-p]'); expandActiveGroup(on?on.getAttribute('data-p'):'dash');
    if(search) search.setAttribute('placeholder',T('بحث في الصفحات...','Search pages...'));
    placeInkSoon();
    window.addEventListener('resize',placeInkSoon);
    if(sb) sb.addEventListener('transitionend',function(e){ if(e.propertyName==='width') placeInk(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();
})();
