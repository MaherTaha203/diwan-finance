/* ═══════════════════════════════════════════════════════════════════════════
   FLOATING LABELS (Module FL) — DDL-03 adopted form pattern.
   Applies modern floating labels to TEXT-LIKE inputs only (text/number/tel/
   email/password/search + textarea). Selects, date inputs and composite
   currency fields (.iw / .iw.cur) intentionally keep their static top label —
   floating them is an anti-pattern since they always show content. Unified
   field metrics live in app.css so every field type reads as one system.
   Pure progressive enhancement: no markup reorder, no value/logic change,
   fully revertible. Loaded via <script defer> after app.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var SKIP_TYPES=['date','datetime-local','month','week','time','checkbox','radio','hidden','file','color','range'];

  function eligible(fi){
    if(fi.querySelector('select')) return null;        // has a select → keep top label
    if(fi.querySelector('.iw')) return null;           // currency/prefixed composite → keep top label
    var ctrl=fi.querySelector('input,textarea');
    if(!ctrl || ctrl.closest('.iw')) return null;
    if(ctrl.tagName==='INPUT'){
      var t=(ctrl.getAttribute('type')||'text').toLowerCase();
      if(SKIP_TYPES.indexOf(t)!==-1) return null;
    }
    var label=null, kids=fi.children;
    for(var i=0;i<kids.length;i++){ if(kids[i].tagName==='LABEL'){ label=kids[i]; break; } }
    if(!label) return null;
    return {ctrl:ctrl,label:label};
  }

  function setFilled(fi,ctrl){
    fi.classList.toggle('is-filled', !!(ctrl.value && String(ctrl.value).trim()!==''));
  }

  function enhance(fi){
    var e=eligible(fi); if(!e) return;
    fi.classList.add('fi-fl');
    if(e.ctrl.tagName==='TEXTAREA') fi.classList.add('fi-area');
    if(e.ctrl.id && !e.label.getAttribute('for')) e.label.setAttribute('for',e.ctrl.id);
    e.ctrl.addEventListener('focus',function(){ fi.classList.add('is-focus'); });
    e.ctrl.addEventListener('blur',function(){ fi.classList.remove('is-focus'); setFilled(fi,e.ctrl); });
    e.ctrl.addEventListener('input',function(){ setFilled(fi,e.ctrl); });
    e.ctrl.addEventListener('change',function(){ setFilled(fi,e.ctrl); });
    setFilled(fi,e.ctrl);
  }

  /* Enhance new fields and re-sync filled state (values may arrive after open). */
  function refresh(root){
    var scope=root||document;
    var fis=scope.querySelectorAll('.fi');
    for(var i=0;i<fis.length;i++){
      var fi=fis[i];
      if(!fi.classList.contains('fi-fl')) enhance(fi);
      if(fi.classList.contains('fi-fl')){
        var ctrl=fi.querySelector('input,textarea');
        if(ctrl) setFilled(fi,ctrl);
      }
    }
  }
  window.refreshFloatLabels=refresh;

  function init(){
    refresh(document);
    /* Edit modals pre-fill values on open — refresh when a modal becomes visible. */
    var modals=document.querySelectorAll('.modal');
    for(var i=0;i<modals.length;i++){
      (function(m){
        new MutationObserver(function(){
          if(m.style.display!=='none') setTimeout(function(){ refresh(m); },40);
        }).observe(m,{attributes:true,attributeFilter:['style']});
      })(modals[i]);
    }
    /* values populated slightly after boot (e.g. settings) */
    setTimeout(function(){ refresh(document); },350);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
