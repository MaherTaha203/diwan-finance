/* ═══ PRINT ENGINE (Module 9 — extracted from app.js, Phase B) ═══
   The unified print design system and every core print surface:
   PRINT_TOKENS (VIS-1 single source of design truth), openPrintWin
   (QR + fonts + auto-print shell), A0.5 Identity-v3 branding
   (BRAND_* + reportHeader/reportFooter), the VIS-2 single-voucher
   builders buildRecVoucher/buildPayVoucher with prtRec/prtPay
   (can.print()-gated), English amount-in-words, print date
   helpers (fmtDate2/fundLabelAr), and the fund/member
   statement print entrypoints prtStmt/prtMemberStmt. REPORT-001 ·
   R8-b: the legacy statement/list string-builders were removed —
   those entrypoints now route solely through the unified engine
   (flag-gated kill-switch). OUTPUT-002-C cleanup removed the then-
   orphaned downloadFundStatementPDF wrapper. The
   vouchers stay a hybrid (engine reuses buildRecVoucher/buildPayVoucher).
   Loaded via <script defer> BEFORE
   app.js so sealRestrictedFunctions still wraps prtRec/prtPay/
   prtStmt/prtMemberStmt after definition. No load-time side effects.
   Runtime deps (DB, FIN, can, toast, esc, fmt, fmtD, gm, gmn, L,
   METHOD_LABELS, mcLabel, window.t/LANG, today) resolve at call time. */

/* ═══ PRINT ENGINE ═══ */
function fmtDate2(d){if(!d)return'—';try{const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,'0');const mm=String(dt.getMonth()+1).padStart(2,'0');const yy=dt.getFullYear();return dd+'/'+mm+'/'+yy;}catch{return d;}}
/* PR-6 — removed dead helpers firstName() and amountToWords() (legacy "New Israeli
   Shekels" words): no call site anywhere. Vouchers use amountToWordsEn() below. */

/* ═══ VIS-1: UNIFIED PRINT DESIGN TOKENS (single source of truth) ═══ */
/* ════════════════════════════════════════════════════════════════════════
   UNIFIED PRINT DESIGN SYSTEM — single source of design truth for EVERY printed
   document (vouchers, statements, reports). Included in every print window via
   openPrintWin, so restyling these shared classes unifies all surfaces at once.
   Matches the DDL paper language: Natural-Paper ground, Ink Navy accent used
   structurally (never decorative), semantic Credit/Debit (green/rust) reserved
   for balances, hairline rules, tabular numerals, RTL. Layout/structure unchanged.
   ════════════════════════════════════════════════════════════════════════ */
/* Theme-01 «السحاب النيليّ»: deep-navy accent + cool ice greys on paper (identity-only change) */
const PRINT_TOKENS=':root{--ink:#17202E;--ink2:#57606E;--muted:#7C8494;--faint:#AEB6C4;--line:#E5EAF2;--line2:#C9D2E0;--hd:#F2F5FA;--zebra:transparent;--teal:#0F1B33;--teal-ink:#17202E;--teal-soft:transparent;--teal-line:#1C2A45;--pos:#2F6B47;--neg:#B4552E;--gray:#57606E;--fa:"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;--fe:"IBM Plex Mono",Menlo,monospace}'
+'*{box-sizing:border-box;margin:0;padding:0}'
+'body{font-family:var(--fa);color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}'
+'.mono,.num{font-family:var(--fe);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}'
/* ── Identity v4 · minimal white header ── */
+'.dh{display:flex;justify-content:space-between;align-items:flex-start}'
+'.dh .date{font-size:11px;color:var(--muted);font-weight:600;padding-top:8px}'
+'.dh .date .num{font-weight:600}'
+'.dh .org{display:flex;gap:12px;align-items:center}'
+'.dh .org .txt{text-align:left}'
+'.dh h1{font-size:18px;color:var(--ink);font-weight:700;line-height:1.2;letter-spacing:-.2px}'
+'.dh .org .osub{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.7}'
+'.dh .chip{width:56px;height:56px;flex:none;display:grid;place-items:center}'
+'.dh .chip img{width:100%;height:100%;object-fit:contain;display:block}'
+'.rule{height:2px;background:var(--ink);border-radius:2px;margin-top:14px}'
/* ── Centered title — type + centering carry it (accent is structural-only, never decorative) ── */
+'.title{text-align:center;margin:22px 0 2px}'
+'.title h2{font-size:19px;font-weight:700;display:inline-block}'
/* ── Meta / period line (centered, muted) ── */
+'.period{text-align:center;margin:11px 0 18px;font-size:11.5px;color:var(--muted);font-weight:500;line-height:1.9}'
+'.period b{color:var(--ink2);font-weight:600}'
/* the voucher number (رقم السند) is always RED on the original document */
+'.period .num{color:#C62828;font-weight:700}'
/* ── Summary cards ── */
/* PR-5 (ROOT-11): wrap the KPI row so a many-card report (e.g. the 7-card donation
   summary) flows onto a second line instead of cramming everything onto one; the
   flex-basis floor stops cards from squishing below a legible width. 3–4-card
   statement rows are unaffected (they still fit on one line). */
+'.cards{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0 4px}'
+'.card{flex:1 1 130px;background:#fff;border:1px solid var(--line);border-top:2px solid var(--line2);border-radius:9px;padding:11px 13px;text-align:center}'
+'.card:last-child,.card.acc{border-top-color:var(--teal)}'
+'.card .k{font-size:9.5px;color:var(--muted);font-weight:600}.card .v{font-size:14px;font-weight:700;color:var(--ink);margin-top:5px;font-family:var(--fe);font-variant-numeric:tabular-nums}'
+'.card .v.pos{color:var(--pos)}.card .v.neg{color:var(--neg)}'
+'table.dt td.mut,.mut{color:var(--faint)}'
/* ── Tables: light, hairline; numbers isolated ── */
+'table.dt{width:100%;border-collapse:collapse;font-size:11px}'
+'table.dt thead th{background:var(--hd);color:var(--ink2);padding:9px 10px;font-weight:600;font-size:10.5px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--line2)}'
+'table.dt thead th.c,table.dt tbody td.c{text-align:center}'
+'table.dt tbody td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:right;vertical-align:middle}'
+'table.dt tbody tr:nth-child(even){background:var(--zebra)}'
+'table.dt tfoot td{border-top:2px solid var(--ink);font-weight:700;font-size:12px;padding:11px 10px;text-align:right}'
+'.cr{color:var(--pos);font-weight:600}.dr{color:var(--neg);font-weight:600}.bal{font-weight:700;color:var(--teal-ink);font-family:var(--fe);font-variant-numeric:tabular-nums}'
+'table.dt td.bal{background:transparent}'
+'table.dt td.bal .tag{font-family:var(--fa);font-size:10px;font-weight:600;margin-inline-start:5px}'
+'table.dt td.bal .tag.cr{color:var(--pos)}table.dt td.bal .tag.dr{color:var(--neg)}'
/* ── Final row: ruled ink conclusion, caps the balance column ── */
+'table.dt tr.final td{background:transparent;color:var(--ink);font-weight:800;font-size:12px;padding:11px 10px;border-top:2px solid var(--teal-line)}'
+'table.dt tr.final td.bal{background:transparent;color:var(--ink)}'
+'table.dt tr.final .tag.cr{color:var(--pos)}table.dt tr.final .tag.dr{color:var(--neg)}table.dt tr.final .pos{color:var(--pos)}table.dt tr.final .neg{color:var(--neg)}'
/* ── Footer · single signature · QR ── */
+'.dfoot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px}'
+'.qr-u{width:88px;text-align:center}'
+'.qr-u .box{width:60px;height:60px;border:1px solid var(--line2);border-radius:8px;margin:0 auto;padding:3px;background:#fff}'
+'.qr-u .box>div,.qr-u .box img,.qr-u .box canvas{width:52px!important;height:52px!important}'
+'.qr-u .cap{font-size:7px;color:var(--faint);margin-top:3px;word-break:break-all}'
+'.qr-u .cap .tok{display:block;font-weight:700;color:var(--teal);font-size:7.5px;letter-spacing:.2px;margin-top:1px;font-family:var(--fe)}'
+'.sig-one{text-align:center;min-width:150px}'
+'.sig-one .line{border-top:1.5px solid var(--ink2);margin-top:34px;padding-top:6px;font-size:11px;color:var(--ink2);font-weight:600;text-align:center}'
+'.pgfoot{border-top:1px solid var(--line);margin-top:24px;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:var(--faint)}'
/* ── Vouchers ── */
+'.page{background:#fff;position:relative;overflow:hidden}'
/* OUTPUT-002-C F-4 — a single-record voucher FILLS the A4 sheet and sinks its
   sign-off (QR + signature + brand strip) to the foot of the page, so a short
   voucher no longer leaves a large blank band under the amount box. min-height
   (just under A4, .page margin is 0) makes a short voucher fill exactly one page
   while a rare long one still grows rather than clipping; .voucher stretches to
   it (align-items:stretch) and .dfoot's margin-top:auto drops the sign-off to the
   bottom. Scoped to .page.portrait/.voucher so the table-based transfer voucher
   (no .voucher wrapper) keeps its own flow. */
+'.page.portrait{min-height:296mm;display:flex}'
+'.voucher{flex:1;display:flex;flex-direction:column;padding:14mm 12mm}'
+'.voucher .dfoot{margin-top:auto}'
+'.rows{margin-top:16px;border:1px solid var(--line);border-radius:9px;overflow:hidden}'
+'.rows .row{display:flex;border-bottom:1px solid var(--line);padding:10px 14px}.rows .row:last-child{border-bottom:none}.rows .row:nth-child(even){background:var(--zebra)}'
+'.rows .lbl{width:30%;color:var(--muted);font-size:10.5px;font-weight:600;display:flex;align-items:center}'
+'.rows .val{flex:1;color:var(--ink);font-size:12px;font-weight:600}'
+'.amount{display:flex;align-items:center;gap:14px;border:1px solid var(--line2);border-radius:10px;padding:14px 18px;margin-top:16px}'
+'.amount::before{content:"";width:4px;align-self:stretch;background:var(--teal);border-radius:4px;margin-inline-end:6px}'
/* OUTPUT-002-C F-2 — the big amount reads "number ₪"; isolate LTR so that order
   survives the RTL voucher's bidi (without isolation the ₪ would jump before it). */
+'.amount .big{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;font-family:var(--fe);color:var(--ink);direction:ltr;unicode-bidi:isolate}.amount .big.cr,.amount .big.dr{color:var(--ink)}'
+'.amount .words{font-size:11.5px;color:var(--muted);margin-inline-start:auto;max-width:56%;text-align:left;direction:ltr}'
+'.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}'
+'.wm span{transform:rotate(-33deg);font-size:72px;font-weight:800;color:rgba(26,34,48,.035)}'
+'@page{size:A4 portrait;margin:0}'
/* PR-5 (ROOT-5): `.cards` was removed from the page-break-inside:avoid list — a tall
   KPI row that no longer fits was pushed WHOLE to the next page, leaving a large
   blank gap. It may now break between cards. Small, genuinely atomic units
   (.amount, tr, tr.final) and the signature block (.dfoot) still stay together. */
+'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tfoot{display:table-footer-group}tr{page-break-inside:avoid}.dfoot,.amount,table.dt tr.final{page-break-inside:avoid}.dh,.rule,.title,.period{page-break-after:avoid}}';

/* PRINT-001 · PR-1 — Unified print renderer.
   Renders into an OFF-SCREEN, same-origin <iframe> (never a popup window) and
   drives printing from inside that document once its fonts + QR have actually
   loaded. This replaces the old window.open + fixed setTimeout(…,900) approach:
     · iframes are not subject to popup blockers → printing works on iOS Safari
       and anywhere a popup would have been suppressed (ROOT-10).
     · print() fires on document.fonts.ready (with a safety cap), not a blind
       900ms timer, so the web font is applied before print → no FOUT reflow and
       no blank QR (ROOT-9). A `printed` guard prevents a double dialog if both
       fonts.ready and the safety timer resolve.
   The document body, PRINT_TOKENS and the per-call css are byte-for-byte the
   same as before — this is a delivery-mechanism change only, no layout change. */
function openPrintWin(css,body,title){
  /* Early inline bootstrap — the FIRST thing in <head>, after only the inline
     <style> (inline styles never block script execution; an external stylesheet
     <link> would, which is why the fonts are injected from here instead of a
     parser-blocking <link>). It:
       · injects the web-font stylesheet and the QR library ASYNCHRONOUSLY, so a
         slow/unreachable CDN can never stall parsing or printing;
       · draws QR codes once the lib is available (with retries);
       · fires print() gated on document.fonts.ready, but ALWAYS within an absolute
         safety cap (print never depends on any network resource);
       · a single `printed` guard prevents a double dialog;
       · notifies the parent on afterprint so the iframe can be reclaimed. */
  const bootstrap='<script>(function(){'
    +'var FONTS="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";'
    +'var QRLIB="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";'
    +'try{var fl=document.createElement("link");fl.rel="stylesheet";fl.href=FONTS;document.head.appendChild(fl);}catch(e){}'
    +'var printed=false;'
    +'var go=function(){if(printed)return;printed=true;try{window.focus();}catch(e){}try{window.print();}catch(e){}};'
    +'var drawQR=function(){try{if(window.QRCode){document.querySelectorAll("[data-qr-url]").forEach(function(el){'
    +'if(el.__qrDone)return;el.__qrDone=1;'
    +'new QRCode(el,{text:el.getAttribute("data-qr-url"),width:52,height:52,colorDark:"#17202E",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});'
    +'});}}catch(e){}};'
    +'try{var qs=document.createElement("script");qs.src=QRLIB;qs.onload=drawQR;document.head.appendChild(qs);}catch(e){}'
    +'window.addEventListener("afterprint",function(){try{if(window.parent&&window.parent.__diwanPrintDone)window.parent.__diwanPrintDone();}catch(e){}});'
    +'document.addEventListener("DOMContentLoaded",function(){drawQR();setTimeout(drawQR,200);});'
    +'var fire=function(){drawQR();go();};'
    +'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(fire,80);}).catch(fire);}'
    +'setTimeout(fire,1200);'  /* absolute cap: print even if fonts/QR never resolve */
    +'})();<\/script>';
  /* Optional <title> — the browser's "Save as PDF" pre-fills the file name from it,
     and the print dialog header shows it. Sanitised (no markup). */
  const titleTag=title?('<title>'+String(title).replace(/[<>&]/g,' ')+'</title>'):'';
  const html='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'+titleTag
    +'<style>'+PRINT_TOKENS+css+'</style>'+bootstrap+'</head><body>'+body+'</body></html>';
  try{
    const prev=document.getElementById('diwan-print-frame');
    if(prev) prev.remove();
    const frame=document.createElement('iframe');
    frame.id='diwan-print-frame';
    frame.setAttribute('aria-hidden','true');
    /* off-screen but present in the render tree (never display:none / visibility:hidden,
       which would suppress the printed content) */
    frame.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    const cleanup=function(){try{frame.remove();}catch(e){}};
    window.__diwanPrintDone=cleanup;
    /* srcdoc (not document.write): parses as a normal same-origin document so the
       inline bootstrap runs and its async-injected font/QR resources load cleanly.
       document.write would stall its parser on the first blocking external node. */
    frame.srcdoc=html;
    document.body.appendChild(frame);
    /* safety net: reclaim the frame even if afterprint never fires (dialog cancelled) */
    setTimeout(cleanup,60000);
  }catch(e){
    try{toast('تعذّرت تهيئة الطباعة','warn');}catch(_){}
  }
}

/* PRINT-001 · PR-3 — "Download PDF" now uses the browser's native print → "Save as
   PDF" instead of the html2canvas/jsPDF raster pipeline. That pipeline rasterised
   the document to a JPEG-in-PDF, which produced faded text (ROOT-4), sliced table
   rows with non-repeating headers (ROOT-6), and a geometry that differed from the
   printed page (ROOT-3). Routing through openPrintWin gives ONE renderer for both
   print and PDF: vector, selectable text, real table pagination with repeating
   <thead>, and identical layout. The browser's Save-as-PDF names the file from the
   document <title> (passed here as `filename`). The `orient` argument is now
   redundant — each caller's css already sets the authoritative @page size — and is
   accepted only for signature compatibility. */
function savePrintPDF(css, body, filename, orient){
  if(typeof openPrintWin==='function'){
    try{toast('اختر «حفظ كـ PDF» من وجهة الطباعة','info');}catch(e){}
    openPrintWin(css, body, filename);
  }
}
window.savePrintPDF=savePrintPDF;

function fundLabelAr(ft){return ft==='food'?'صندوق الغداء':ft==='donation'?'صندوق التبرعات':'صندوق الديوان';}

/* ═══ CCR-001 · IG-017 — FC-003 · FD-017 ═══
   The DESTINATION fund of a donation, read from the STORED destination fields:
   the classified accounting destination (destination_treasury) wins; legacy
   unclassified rows fall back to donation_display_fund. In-kind donations are
   documentary and carry no cash destination by design. */
function donationDestLabelAr(r){
  if(r.movement_type==='donation_inkind') return 'عيني/خدمي — توثيقي (بلا وجهة نقدية)';
  const d=r.destination_treasury||r.donation_display_fund;
  return d==='food'?'صندوق الغداء'
       : d==='diwan'?'خزينة الديوان'
       : d==='historical_deficit'?'حساب العجز التاريخي'
       : '—';
}

/* ═══ CCR-001 · IG-019 — FC-001 · FD-018 ═══
   A member's donation appears on his statement as an INDEPENDENT event in the
   constitutional form «تبرع — [الصندوق الوجهة]», read from the STORED
   destination (donationDestLabelAr — IG-017's single mapping). A settlement
   suffix appears ONLY when the allocation engine actually settled debt from
   that donation (explicit FD-008 designation under the IG-002 gate; historical
   settlements keep displaying because they enter the balance — FD-006).
   One label rule for all three statement surfaces: screen · print · Excel. */
function donationStmtLabel(r, settled, en){
  const dest = en
    ? (r.movement_type==='donation_inkind' ? 'In-kind — documentary (no cash destination)'
       : (function(d){ return d==='food'?'Food Fund':d==='diwan'?'Diwan Treasury':d==='historical_deficit'?'Historical Deficit Account':'—'; })(r.destination_treasury||r.donation_display_fund))
    : donationDestLabelAr(r);
  const base = (en?'Donation — ':'تبرع — ') + dest;
  const s = Number(settled)||0;
  return s>0 ? base + (en?' · Debt Settlement ':' · تسوية ذمة ') + fmt(s) + ' ₪' : base;
}

/* ═══ A0.5 — Identity v3 branding · single source of truth for every report/print surface ═══ */
const BRAND_NAME='ديوان آل طه';
const BRAND_SUBTITLE='نظام الإدارة المالية';
const BRAND_SITE='diwan-finance.com';
/* Print branding via BrandAssets (brand-assets.js loads first in the defer queue): dark-ink light-variant logo on white paper, embedded as data URI. URL fallback keeps print alive if the module ever fails to load. */
const BRAND_LOGO=(window.BrandAssets&&window.BrandAssets.getPrintLogo())||'/brand/light/PNG/logo-128.png';
/* OUTPUT-002-C Slice 4 — voucher document identity now reads from the Organization/Output
   Profile (the single identity source every output document shares), NOT from local BRAND_*
   constants. The historical BRAND_* remain only as the last-resort fallback for contexts
   where the profile module is not loaded (isolated tests). This is a DATA-SOURCE change,
   not a presentation one: the same fields (name + system name + site + logo + signatory
   title) are rendered in the same places — vouchers simply stop being a second source of
   truth. The logo follows the profile's Show-Logo toggle and any custom upload exactly like
   the report engine (org().logo is '' when Show Logo is off), so print/PDF vouchers honour
   the same logo contract; nothing new (phone/email/address) is added to the document. */
function voucherOrg(){
  var pk=function(v,f){ return (v&&typeof v==='object')?(v.ar!=null&&v.ar!==''?v.ar:(v.en!=null&&v.en!==''?v.en:f)):(v!=null&&v!==''?v:f); };
  var o=(window.OutputProfile&&window.OutputProfile.org&&window.OutputProfile.org())||null;
  if(!o) return { name:BRAND_NAME, subtitle:BRAND_SUBTITLE, site:BRAND_SITE, logo:BRAND_LOGO, signatoryTitle:'توقيع الديوان' };
  return {
    name: pk(o.name, BRAND_NAME),
    subtitle: pk(o.subtitle, BRAND_SUBTITLE),
    site: (o.site!=null?o.site:BRAND_SITE),
    logo: (o.logo||''),                              /* '' when Show Logo OFF; custom or brand default otherwise */
    signatoryTitle: pk(o.signatoryTitle, 'توقيع الديوان')
  };
}
/* OUTPUT-002-C — unified Letterhead for vouchers, matching the report engine: identity
   ONCE (org name + system name + logo) → rule → title → one context line (no + sub).
   The print DATE is NOT here — it lives once in the footer (dedup). */
function reportHeader(title,opts){
  opts=opts||{};
  var org=voucherOrg();
  var parts=[];
  if(opts.no) parts.push((opts.noLabel||'رقم السند')+': <b class="num">'+opts.no+'</b>');
  if(opts.sub) parts.push(opts.sub);
  var meta=parts.length?('<div class="period">'+parts.join(' · ')+'</div>'):'';
  return '<div class="dh">'
    +'<div class="org"><div class="txt"><h1>'+esc(org.name)+'</h1>'
    +'<div class="osub">'+esc(org.subtitle)+(org.site?(' · '+esc(org.site)):'')+'</div></div>'
    +(org.logo?('<div class="chip"><img src="'+esc(org.logo)+'" alt="'+esc(org.name)+'"></div>'):'')
    +'</div></div>'
    +'<div class="rule"></div>'
    +'<div class="title"><h2>'+esc(title)+'</h2></div>'
    +meta;
}
/* Sign-off (QR + «توقيع الديوان»). OUTPUT-002-C — gated by the Output Profile: QR shows
   only when output.showQR, the signature only when output.showSignature. Vouchers are
   certified documents, so both DEFAULT to on; the owner can hide either from settings.
   Returns '' when both are off (no empty sign-off row). */
function reportDfoot(qrUrl,capHtml){
  var out=(window.OutputProfile&&window.OutputProfile.output&&window.OutputProfile.output())||{};
  var showQR=out.showQR!==false, showSig=out.showSignature!==false;
  if(!showQR&&!showSig) return '';
  var qr=showQR?('<div class="qr-u"><div class="box">'+(qrUrl?('<div data-qr-url="'+qrUrl+'"></div>'):'')
    +'</div><div class="cap">'+(capHtml||'diwan-finance.com')+'</div></div>'):'';
  var sig=showSig?'<div class="sig-one"><div class="line">'+esc(voucherOrg().signatoryTitle)+'</div></div>':'';
  return '<div class="dfoot">'+qr+sig+'</div>';
}
/* Amount in words — English (vouchers). Whole shekels. */
function amountToWordsEn(n){
  n=Math.round(Number(n||0));
  if(n===0) return 'Zero Shekels Only';
  var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function trio(x){var s='';if(x>=100){s+=ones[Math.floor(x/100)]+' Hundred';x%=100;if(x)s+=' ';}
    if(x>=20){s+=tens[Math.floor(x/10)];if(x%10)s+='-'+ones[x%10];}else if(x>0){s+=ones[x];}return s;}
  var out='';
  if(n>=1000000){out+=trio(Math.floor(n/1000000))+' Million';n%=1000000;if(n)out+=' ';}
  if(n>=1000){out+=trio(Math.floor(n/1000))+' Thousand';n%=1000;if(n)out+=' ';}
  if(n>0){out+=trio(n);}
  return out+' Shekels Only';
}
/* Shared report/print footer strip — identical brand line everywhere. opts:{printedLabel,date,page} */
function reportFooter(opts){
  opts=opts||{};
  var date=opts.date||new Date().toLocaleDateString('en-GB');
  var printedLabel=opts.printedLabel||'طُبع:';
  /* PRINT-001 · PR-4 (ROOT-7) — the page number is no longer printed here. It was
     hard-coded ("صفحة 1" / "صفحة 1 / 1") and therefore wrong on any multi-page
     document. Real "Page X of Y" is not computable without a pagination polyfill,
     so we rely on the browser's own print header/footer page numbers instead. Any
     `opts.page` a caller still passes is intentionally ignored. */
  /* OUTPUT-002-C — dedup: the brand line (name — site) is already in the header, so the
     footer carries ONLY the print date (its single home). Page numbers come from the
     print engine / browser chrome, as noted above. */
  return '<div class="pgfoot"><span>'+printedLabel+' <span class="num">'+date+'</span></span></div>';
}

/* VIS-2: single-voucher builders matching approved mockups (01 receipt / 03 payment) */
function buildRecVoucher(r){
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(r.verification_token||'');
  const meth=METHOD_LABELS[r.payment_method||'cash']||(r.payment_method||'');
  const cur=(r.currency&&r.currency!=='ILS')?('<div class="row"><div class="lbl">العملة الأصلية</div><div class="val">'+fmtD(r.amount)+' '+esc(r.currency)+' × ₪'+Number(r.exchange_rate||1).toFixed(2)+'</div></div>'):'';
  const note=r.notes?('<div class="row"><div class="lbl">البيان</div><div class="val">'+esc(r.notes)+'</div></div>'):'';
  return '<div class="page portrait"><div class="wm"><span>أصل</span></div><div class="voucher">'
    +reportHeader('سند قبض',{no:esc(r.no),sub:'معتمد إلكترونياً · Verified'+(Number(r.version||1)>1?(' · نسخة رقم '+Number(r.version)+' · تم التعديل'):'')})
    +'<div class="rows">'
    +'<div class="row"><div class="lbl">التاريخ</div><div class="val">'+fmtDate2(r.receipt_date)+'</div></div>'
    +'<div class="row"><div class="lbl">الصندوق</div><div class="val">'+fundLabelAr(r.fund_type)+'</div></div>'
    /* IG-017 (FD-017): a donation receipt explicitly displays its DESTINATION fund. */
    +(r.fund_type==='donation'?'<div class="row"><div class="lbl">الصندوق الوجهة</div><div class="val">'+donationDestLabelAr(r)+'</div></div>':'')
    +(r.movement_type==='diwan_operational_income'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">إيراد الديوان التشغيلي</div></div>':r.movement_type==='diwan_cash_donation'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">تبرع نقدي للديوان</div></div>':'')
    +'<div class="row"><div class="lbl">استلمنا من</div><div class="val">'+esc(r.payer_name||gmn(r.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(meth)+'</div></div>'
    +cur+note
    +'</div>'
    +'<div class="amount"><div class="big cr">'+fmt(FIN.amountOf(r))+' ₪</div><div class="words">'+amountToWordsEn(FIN.amountOf(r))+'</div></div>'
    +reportDfoot(verifyUrl,'diwan-finance.com/verify<span class="tok">'+esc(r.verification_token||'')+'</span>')
    +reportFooter({date:fmtDate2(new Date().toISOString()),page:'صفحة 1 / 1'})
    +'</div></div>';
}
function buildPayVoucher(p){
  const verifyUrl='https://www.diwan-finance.com/verify/'+esc(p.verification_token||'');
  const cur=(p.currency&&p.currency!=='ILS')?('<div class="row"><div class="lbl">العملة الأصلية</div><div class="val">'+fmtD(p.amount)+' '+esc(p.currency)+' × ₪'+Number(p.exchange_rate||1).toFixed(2)+'</div></div>'):'';
  const note=p.notes?('<div class="row"><div class="lbl">البيان</div><div class="val">'+esc(p.notes)+'</div></div>'):'';
  const appr=p.approved_by?('<div class="row"><div class="lbl">معتمد من</div><div class="val">'+esc(p.approved_by)+'</div></div>'):'';
  return '<div class="page portrait"><div class="wm"><span>أصل</span></div><div class="voucher">'
    +reportHeader('سند صرف',{no:esc(p.no),sub:'معتمد إلكترونياً · Verified'+(Number(p.version||1)>1?(' · نسخة رقم '+Number(p.version)+' · تم التعديل'):'')})
    +'<div class="rows">'
    +'<div class="row"><div class="lbl">التاريخ</div><div class="val">'+fmtDate2(p.payment_date)+'</div></div>'
    +'<div class="row"><div class="lbl">الصندوق</div><div class="val">'+fundLabelAr(p.fund_type)+'</div></div>'
    +'<div class="row"><div class="lbl">صُرف إلى</div><div class="val">'+esc(p.beneficiary_name||gmn(p.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">نوع المصروف</div><div class="val">'+esc(L.expense(p.expense_type))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(L.method(p.payment_method))+'</div></div>'
    +cur+note+appr
    +'</div>'
    +'<div class="amount"><div class="big dr">'+fmt(FIN.amountOf(p))+' ₪</div><div class="words">'+amountToWordsEn(FIN.amountOf(p))+'</div></div>'
    +reportDfoot(verifyUrl,'diwan-finance.com/verify<span class="tok">'+esc(p.verification_token||'')+'</span>')
    +reportFooter({date:fmtDate2(new Date().toISOString()),page:'صفحة 1 / 1'})
    +'</div></div>';
}

/* REPORT-001 · R7e — expose the certified voucher builders so the hybrid engine
   VoucherRenderer can reuse them verbatim (byte-identical output). */
window.buildRecVoucher=buildRecVoucher;
window.buildPayVoucher=buildPayVoucher;

/* ── Print functions: all guarded by can.print() ── */
window.prtRec=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=DB.receipts.find(x=>x.id===id);if(!r)return;
  /* R7e — route through the unified engine when the flag is ON (same builder). */
  if(window.REPORT_ENGINE_VOUCHERS && window.Report && window.Report.get && window.Report.get('RECEIPT_VOUCHER')){
    return window.Report.render('RECEIPT_VOUCHER','print',{record:r});
  }
  openPrintWin('',buildRecVoucher(r));
};
window.prtPay=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  if(window.REPORT_ENGINE_VOUCHERS && window.Report && window.Report.get && window.Report.get('PAYMENT_VOUCHER')){
    return window.Report.render('PAYMENT_VOUCHER','print',{record:p});
  }
  openPrintWin('',buildPayVoucher(p));
};
/* PR-6 — removed dead helper amountToWordsAr() (Arabic amount-in-words): no call
   site anywhere. The vouchers render English words via amountToWordsEn(). */
/* ═══ PRINT STATEMENTS ═══ */
/* REPORT-001 · R8-b — the legacy buildFundStatementHTML string-builder was removed;
   the unified engine (ReportCutoverFund) is the sole print/PDF path. The R7a flag
   stays a kill-switch: with it off, these surfaces no-op rather than falling back. */
window.prtStmt=function(fund){
  if(window.REPORT_ENGINE_FUND_STATEMENT && window.ReportCutoverFund && window.ReportCutoverFund.ready()){
    return window.ReportCutoverFund.deliver(fund,'print');
  }
  if(typeof toast==='function') toast(window.t?window.t('errors.no_print'):'الطباعة غير متاحة','err');
};
window.prtMemberStmt=function(mode){
  /* mode: 'print' (default) · 'pdf' (download) · 'pdf-print'. */
  mode=mode||'print';
  /* REPORT-001 — the unified engine is the sole print/pdf path (R8-b removed the
     legacy A4 template builder). The R6 flag stays a kill-switch: with it off this
     surface no-ops rather than falling back — no legacy path remains. */
  if(window.REPORT_ENGINE_MEMBER_STATEMENT && window.ReportCutover && window.ReportCutover.ready()){
    return window.ReportCutover.deliverMember((mode==='pdf'||mode==='pdf-print')?'pdf':'print');
  }
  if(typeof toast==='function') toast(window.t?window.t('errors.no_print'):'الطباعة غير متاحة','err');
};

/* ═══ §3 PRINT-BUTTON AUDIT ADDITIONS (presentation-only printers) ═══
   Both print exactly the data the page displays — same source calls the
   screen renderers use (FIN.memberBalance/balanceLabel for members,
   DB.annual rows for annual dues). No new computation, openPrintWin +
   the shared template, can.print() gated (and swept for viewers). */
window.prtMembersList=function(){
  /* REPORT-001 — the unified engine is the sole print path (R8-b removed the legacy
     string-builder). The R7d flag stays a kill-switch: with it off this surface
     no-ops rather than falling back — no legacy path remains. */
  if(window.REPORT_ENGINE_MEMBERS_LIST && window.ReportCutoverLists && window.ReportCutoverLists.membersReady()){
    return window.ReportCutoverLists.members('print');
  }
  if(typeof toast==='function') toast(window.t?window.t('errors.no_print'):'الطباعة غير متاحة','err');
};
window.prtAnnual=function(){
  /* REPORT-001 — the unified engine is the sole print path (R8-b removed the legacy
     string-builder). The R7d flag stays a kill-switch: with it off this surface
     no-ops rather than falling back — no legacy path remains. */
  if(window.REPORT_ENGINE_ANNUAL_LOG && window.ReportCutoverLists && window.ReportCutoverLists.annualReady()){
    return window.ReportCutoverLists.annual('print');
  }
  if(typeof toast==='function') toast(window.t?window.t('errors.no_print'):'الطباعة غير متاحة','err');
};
