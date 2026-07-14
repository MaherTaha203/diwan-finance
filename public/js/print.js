/* ═══ PRINT ENGINE (Module 9 — extracted from app.js, Phase B) ═══
   The unified print design system and every core print surface:
   PRINT_TOKENS (VIS-1 single source of design truth), openPrintWin
   (QR + fonts + auto-print shell), A0.5 Identity-v3 branding
   (BRAND_* + reportHeader/reportFooter), the VIS-2 single-voucher
   builders buildRecVoucher/buildPayVoucher with prtRec/prtPay
   (can.print()-gated), Arabic/English amount-in-words, print date
   helpers (fmtDate2/firstName/fundLabelAr), and the fund/member
   statement printers buildFundStatementHTML/prtStmt/
   downloadFundStatementPDF/prtMemberStmt. Verbatim move — no
   template, query or FIN call changed; report printers
   prtAnnualDebt/prtDelinquent/prtDonStmt stay with their report
   sections in app.js (Module 8). Loaded via <script defer> BEFORE
   app.js so sealRestrictedFunctions still wraps prtRec/prtPay/
   prtStmt/prtMemberStmt after definition. No load-time side effects.
   Runtime deps (DB, FIN, can, toast, esc, fmt, fmtD, gm, gmn, L,
   METHOD_LABELS, mcLabel, window.t/LANG, today) resolve at call time. */

/* ═══ PRINT ENGINE ═══ */
function fmtDate2(d){if(!d)return'—';try{const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,'0');const mm=String(dt.getMonth()+1).padStart(2,'0');const yy=dt.getFullYear();return dd+'/'+mm+'/'+yy;}catch{return d;}}
function firstName(n){if(!n)return'—';return n.trim().split(' ')[0];}
function amountToWords(n){
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!n||n===0)return'Zero New Israeli Shekels Only';
  n=Math.round(Number(n));
  function h(x){if(x===0)return'';if(x<20)return ones[x]+' ';if(x<100)return tens[Math.floor(x/10)]+' '+(x%10?ones[x%10]+' ':'');return ones[Math.floor(x/100)]+' Hundred '+(x%100?h(x%100):'');}
  let s='';if(n>=1000){s+=h(Math.floor(n/1000))+'Thousand ';n=n%1000;}if(n>0)s+=h(n);
  return s.trim()+' New Israeli Shekels Only';
}

/* ═══ VIS-1: UNIFIED PRINT DESIGN TOKENS (single source of truth) ═══ */
/* ════════════════════════════════════════════════════════════════════════
   UNIFIED PRINT DESIGN SYSTEM — single source of design truth for EVERY printed
   document (vouchers, statements, reports). Included in every print window via
   openPrintWin, so restyling these shared classes unifies all surfaces at once.
   Matches the on-screen premium language: navy + gold + teal, soft rounded
   cards, navy table headers, tabular numerals, RTL. Layout/structure unchanged.
   ════════════════════════════════════════════════════════════════════════ */
const PRINT_TOKENS=':root{--ink:#1A2230;--ink2:#3A4658;--muted:#8B94A3;--faint:#AAB2BF;--line:#E7EAEF;--line2:#D7DCE4;--hd:#F6F8FA;--zebra:#FBFCFD;--teal:#0E7C66;--teal-ink:#0A5C4C;--teal-soft:#E7F2EE;--teal-line:#1FA98C;--pos:#1E7E46;--neg:#B3261E;--gray:#5F6D7C;--fa:"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;--fe:"IBM Plex Mono",Menlo,monospace}'
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
+'.dh .chip{width:50px;height:50px;border-radius:11px;background:var(--ink);border:1.5px solid var(--teal);display:grid;place-items:center;color:#fff;font-weight:700;font-size:16px;flex:none;letter-spacing:1px}'
+'.rule{height:2px;background:var(--ink);border-radius:2px;margin-top:14px}'
/* ── Centered title with teal underline ── */
+'.title{text-align:center;margin:22px 0 2px}'
+'.title h2{font-size:19px;font-weight:700;display:inline-block;padding-bottom:8px;position:relative}'
+'.title h2::after{content:"";position:absolute;bottom:0;right:22%;left:22%;height:3px;background:var(--teal);border-radius:3px}'
/* ── Meta / period line (centered, muted) ── */
+'.period{text-align:center;margin:11px 0 18px;font-size:11.5px;color:var(--muted);font-weight:500;line-height:1.9}'
+'.period b{color:var(--ink2);font-weight:600}'
/* ── Summary cards ── */
+'.cards{display:flex;gap:12px;margin:16px 0 4px}'
+'.card{flex:1;background:#fff;border:1px solid var(--line);border-top:2px solid var(--line2);border-radius:9px;padding:11px 13px;text-align:center}'
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
+'table.dt td.bal{background:var(--teal-soft);border-inline-start:2px solid var(--teal-line)}'
+'table.dt td.bal .tag{font-family:var(--fa);font-size:10px;color:var(--teal);font-weight:600;margin-inline-start:5px}'
/* ── Final row: teal-filled, caps the balance column ── */
+'table.dt tr.final td{background:var(--teal);color:#fff;font-weight:700;font-size:12px;padding:11px 10px}'
+'table.dt tr.final td.bal{background:var(--teal);border-inline-start:none;color:#fff}'
+'table.dt tr.final .tag{color:rgba(255,255,255,.85)}table.dt tr.final .pos{color:#CFEFE0}table.dt tr.final .neg{color:#F6D4D0}'
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
+'.voucher{padding:14mm 12mm}'
+'.rows{margin-top:16px;border:1px solid var(--line);border-radius:9px;overflow:hidden}'
+'.rows .row{display:flex;border-bottom:1px solid var(--line);padding:10px 14px}.rows .row:last-child{border-bottom:none}.rows .row:nth-child(even){background:var(--zebra)}'
+'.rows .lbl{width:30%;color:var(--muted);font-size:10.5px;font-weight:600;display:flex;align-items:center}'
+'.rows .val{flex:1;color:var(--ink);font-size:12px;font-weight:600}'
+'.amount{display:flex;align-items:center;gap:14px;border:1px solid var(--line2);border-radius:10px;padding:14px 18px;margin-top:16px}'
+'.amount::before{content:"";width:4px;align-self:stretch;background:var(--teal);border-radius:4px;margin-inline-end:6px}'
+'.amount .big{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;font-family:var(--fe);color:var(--ink)}.amount .big.cr,.amount .big.dr{color:var(--ink)}'
+'.amount .words{font-size:11.5px;color:var(--muted);margin-inline-start:auto;max-width:56%;text-align:left;direction:ltr}'
+'.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}'
+'.wm span{transform:rotate(-33deg);font-size:72px;font-weight:800;color:rgba(26,34,48,.035)}'
+'@page{size:A4 portrait;margin:0}'
+'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tfoot{display:table-footer-group}tr{page-break-inside:avoid}.dfoot,.cards,.amount,table.dt tr.final{page-break-inside:avoid}.dh,.rule,.title,.period{page-break-after:avoid}}';

function openPrintWin(css,body){
  const html='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'
    +'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    +'<style>'+PRINT_TOKENS+css+'</style></head><body>'+body
    +'<script>window.onload=function(){'
    +'document.querySelectorAll("[data-qr-url]").forEach(function(el){'
    +'new QRCode(el,{text:el.getAttribute("data-qr-url"),width:52,height:52,colorDark:"#0F1B2D",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});'
    +'});'
    +'setTimeout(function(){window.print();},900);'
    +'};<\/script></body></html>';
  const win=window.open('','_blank','width=850,height=950');
  if(win){win.document.write(html);win.document.close();}
  else toast(window.t?window.t('errors.no_print'):'يرجى السماح بالنوافذ المنبثقة','warn');
}

function fundLabelAr(ft){return ft==='food'?'صندوق الغداء':ft==='donation'?'صندوق التبرعات':'صندوق الديوان';}

/* ═══ A0.5 — Identity v3 branding · single source of truth for every report/print surface ═══ */
const BRAND_NAME='ديوان آل طه';
const BRAND_SUBTITLE='نظام الإدارة المالية';
const BRAND_SITE='diwan-finance.com';
/* Print branding via BrandAssets (brand-assets.js loads first in the defer queue): dark-ink light-variant logo on white paper, embedded as data URI. URL fallback keeps print alive if the module ever fails to load. */
const BRAND_LOGO=(window.BrandAssets&&window.BrandAssets.getPrintLogo())||'/brand/light/PNG/logo-128.png';
/* Shared report/print header — vouchers, statements, reports, future A2/A3/A4. opts:{sub,no} */
function reportHeader(title,opts){
  opts=opts||{};
  var date=opts.date||new Date().toLocaleDateString('en-GB');
  var dateLine=(opts.dateText!=null)?opts.dateText:('تاريخ الطباعة: <span class="num">'+date+'</span>');
  var parts=[];
  if(opts.no) parts.push((opts.noLabel||'رقم السند')+': <b class="num">'+opts.no+'</b>');
  if(opts.sub) parts.push(opts.sub);
  var meta=parts.length?('<div class="period">'+parts.join(' · ')+'</div>'):'';
  return '<div class="dh"><div class="date">'+dateLine+'</div>'
    +'<div class="org"><div class="txt"><h1>'+BRAND_NAME+'</h1>'
    +'<div class="osub">'+BRAND_SUBTITLE+' · '+BRAND_SITE+'</div></div>'
    +'<div class="chip">دط</div></div></div>'
    +'<div class="rule"></div>'
    +'<div class="title"><h2>'+title+'</h2></div>'
    +meta;
}
/* Single-signature footer (Identity v4): QR + «توقيع الديوان» only. */
function reportDfoot(qrUrl,capHtml){
  return '<div class="dfoot"><div class="qr-u"><div class="box">'
    +(qrUrl?('<div data-qr-url="'+qrUrl+'"></div>'):'')+'</div>'
    +'<div class="cap">'+(capHtml||'diwan-finance.com')+'</div></div>'
    +'<div class="sig-one"><div class="line">توقيع الديوان</div></div></div>';
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
  var page=opts.page||'صفحة 1';
  var printedLabel=opts.printedLabel||'طُبع:';
  return '<div class="pgfoot"><span>'+BRAND_NAME+' — '+BRAND_SITE+'</span><span>'+printedLabel+' '+date+'</span><span>'+page+'</span></div>';
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
    +(r.movement_type==='diwan_operational_income'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">إيراد الديوان التشغيلي</div></div>':r.movement_type==='diwan_cash_donation'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">تبرع نقدي للديوان</div></div>':'')
    +'<div class="row"><div class="lbl">استلمنا من</div><div class="val">'+esc(r.payer_name||gmn(r.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(meth)+'</div></div>'
    +cur+note
    +'</div>'
    +'<div class="amount"><div class="big cr">₪ '+fmt(r.amount_ils||r.amount)+'</div><div class="words">'+amountToWordsEn(r.amount_ils||r.amount)+'</div></div>'
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
    +'<div class="amount"><div class="big dr">₪ '+fmt(p.amount_ils||p.amount)+'</div><div class="words">'+amountToWordsEn(p.amount_ils||p.amount)+'</div></div>'
    +reportDfoot(verifyUrl,'diwan-finance.com/verify<span class="tok">'+esc(p.verification_token||'')+'</span>')
    +reportFooter({date:fmtDate2(new Date().toISOString()),page:'صفحة 1 / 1'})
    +'</div></div>';
}

/* ── Print functions: all guarded by can.print() ── */
window.prtRec=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=DB.receipts.find(x=>x.id===id);if(!r)return;
  openPrintWin('',buildRecVoucher(r));
};
window.prtPay=function(id){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const p=DB.payments.find(x=>x.id===id);if(!p)return;
  openPrintWin('',buildPayVoucher(p));
};
function amountToWordsAr(n){
  n=Math.round(Number(n||0));
  if(n===0) return 'صفر شيكل فقط لا غير';
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
    'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hundreds=['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
  let parts=[];
  if(n>=1000){
    const t=Math.floor(n/1000);
    if(t===1) parts.push('ألف');
    else if(t===2) parts.push('ألفان');
    else if(t<=10) parts.push(ones[t]+' آلاف');
    else parts.push(t+' ألف');
    n=n%1000;
  }
  if(n>=100){
    parts.push(hundreds[Math.floor(n/100)]);
    n=n%100;
  }
  if(n>=20){
    const u=n%10;
    if(u>0) parts.push(ones[u]+' و'+tens[Math.floor(n/10)]);
    else parts.push(tens[Math.floor(n/10)]);
  } else if(n>0){
    parts.push(ones[n]);
  }
  return parts.join(' و')+' شيكل فقط لا غير';
}
/* ═══ PRINT STATEMENTS ═══ */
window.buildFundStatementHTML=function(fund){
  const from=document.getElementById(fund+'-stmt-from')?.value||'';
  const to=document.getElementById(fund+'-stmt-to')?.value||'';
  const type=document.getElementById(fund+'-stmt-type')?.value||'';
  const rows=FIN.fundLedger(fund,from,to,type);   /* FIN logic unchanged */
  const fundLabel=fund==='food'?window.t('receipts.fund_food'):window.t('receipts.fund_diwan');
  let bal=0,totCr=0,totDr=0,openBal=0;
  const rowsHTML=rows.map((r,i)=>{
    bal+=r.cr-r.dr;totCr+=r.cr;totDr+=r.dr;
    if(i===0&&r.type==='open')openBal=r.cr-r.dr;
    let crCell;
    if(r.cr>0){ crCell='<span class="cr">₪ '+fmt(r.cr)+'</span>'; }
    else if(r.type==='don'){
      /* P9 — informational food-donation row: classify Historical vs Current Support and
         show the amount. cr stays 0 so the current balance is NOT affected (display only). */
      const _dr=DB.receipts.find(x=>x.id===r.id);
      const _amt=_dr?Number(_dr.amount_ils||_dr.amount||0):0;
      const _hist=_dr?(_dr.manual_allocation?(Number(_dr.manual_historical_donation||0)>0):(_dr.food_donation_allocation==='reduce_deficit')):false;
      const _lbl=fund==='food'?(_hist?(window.LANG==='en'?'Historical Donation':'تبرع تاريخي'):(window.LANG==='en'?'Current Support':'دعم حالي')):window.t('receipts.fund_don');
      crCell='<span class="cr">+₪ '+fmt(_amt)+' · '+_lbl+'</span>';
    } else { crCell='—'; }
    const drCell=r.dr>0?'<span class="dr">₪ '+fmt(r.dr)+'</span>':'—';
    return '<tr><td>'+fmtDate2(r.date)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.desc)+'</td><td>'+crCell+'</td><td>'+drCell+'</td><td class="bal">₪ '+fmt(bal)+'</td><td>'+esc(r.note||'')+'</td></tr>';
  }).join('');
  const period=(from&&to?fmtDate2(from)+' — '+fmtDate2(to):from?window.t('stmt.date_from')+' '+fmtDate2(from):to?window.t('stmt.date_to')+' '+fmtDate2(to):window.t('stmt.all_periods'));
  const balCls=bal>=0?'pos':'neg';
  const isFood=fund==='food';
  const _en=window.LANG==='en';
  const curBal=isFood?FinContract.foodBalance():bal;
  const curCls=curBal>=0?'pos':'neg';
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const body=reportHeader(window.t('stmt.print_title')+' '+fundLabel,{sub:window.t('stmt.currency_note')})
    +'<div class="period">'+window.t('stmt.period_label')+' '+period+'</div>'
    +'<div class="cards">'
    +'<div class="card"><div class="k">'+window.t('stmt.opening_bal')+'</div><div class="v">₪ '+fmt(openBal)+'</div></div>'
    +'<div class="card"><div class="k">'+window.t('stmt.total_in')+'</div><div class="v pos">₪ '+fmt(totCr)+'</div></div>'
    +'<div class="card"><div class="k">'+window.t('stmt.total_out')+'</div><div class="v neg">₪ '+fmt(totDr)+'</div></div>'
    +'<div class="card"><div class="k">'+(isFood?(_en?'Current Food Fund Balance':'رصيد صندوق الغداء الحالي'):window.t('stmt.current_bal'))+'</div><div class="v '+curCls+'">₪ '+fmt(curBal)+'</div></div></div>'
    +(isFood?('<div class="cards">'
      +'<div class="card"><div class="k">'+(_en?'Remaining Historical Deficit':'العجز التاريخي المتبقي')+'</div><div class="v '+(FinContract.foodDeficitRemaining()<0?'neg':'pos')+'">₪ '+fmt(FinContract.foodDeficitRemaining())+'</div></div>'
      +'<div class="card"><div class="k">'+mcLabel('reserve')+'</div><div class="v">₪ '+fmt(FIN.foodSettlementReserve())+'</div></div>'
      +'<div class="card"><div class="k">'+(_en?'Net Food Fund Position':'صافي مركز صندوق الغداء')+'</div><div class="v '+(FinContract.foodNetPosition()>=0?'pos':'neg')+'">₪ '+fmt(FinContract.foodNetPosition())+'</div></div></div>'
      +'<div style="font-size:10px;color:#666;margin:2px 0 6px">'+(_en?'Current Food Fund Balance = Operational ':'رصيد صندوق الغداء الحالي = تشغيلي ')+'₪'+fmt(bal)+' + '+mcLabel('current')+' ₪'+fmt(FIN.foodCurrentSupportTotal())+' · '+mcLabel('debt')+(_en?' → Deficit (Q5) ':' ← العجز (ق5) ')+'₪'+fmt(FIN.foodDebtSettlementTotal())+'</div>'):'')
    +'<table class="dt"><thead><tr><th>'+window.t('common.date')+'</th><th>'+window.t('stmt.donor_name')+'</th><th>'+window.t('stmt.desc')+'</th><th>'+window.t('stmt.col_in')+'</th><th>'+window.t('stmt.col_out')+'</th><th>'+window.t('stmt.balance')+'</th><th>'+window.t('stmt.note')+'</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="5">'+(isFood?(_en?'Current Food Fund Balance':'رصيد صندوق الغداء الحالي'):'الرصيد الجاري · Current Balance')+'</td><td class="'+curCls+'">₪ '+fmt(curBal)+'</td><td></td></tr></tbody></table>'
    +reportDfoot('https://www.diwan-finance.com','diwan-finance.com')
    +reportFooter({printedLabel:window.t('stmt.printed_at'),date:fmtDate2(new Date().toISOString()),page:window.t('stmt.page_info')});
  const title=(fund==='food'?window.t('receipts.don_disp_food'):window.t('receipts.don_disp_diwan'));
  return {css:css, body:body, title:title};
};
window.prtStmt=function(fund){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=window.buildFundStatementHTML(fund);
  openPrintWin(r.css,r.body);
};
window.downloadFundStatementPDF=function(fund){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const r=window.buildFundStatementHTML(fund);
  const doPdf=()=>{
    const wrap=document.createElement('div');
    wrap.innerHTML='<style>'+r.css+'</style>'+r.body;
    wrap.style.cssText='direction:rtl;background:#fff';
    const opt={margin:[8,8,8,8],filename:(fund==='food'?'Food-Statement':'Diwan-Statement')+'-'+today()+'.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'}};
    window.html2pdf().set(opt).from(wrap).save().then(()=>toast('\u2713 PDF','ok'));
  };
  if(window.html2pdf){doPdf();}
  else{toast('\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...','info');const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';s.onload=doPdf;document.head.appendChild(s);}
};
window.prtMemberStmt=function(mode){
  /* mode: 'print' (default) · 'pdf' (download) · 'pdf-print' — ALL use the same
     official A4 statement template below; only the guidance toast differs. */
  mode=mode||'print';
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const mid=document.getElementById('ms-member')?.value;
  if(!mid){toast(window.t('errors.select_member'),'warn');return;}
  const member=gm(mid);if(!member)return;
  const from=document.getElementById('ms-from')?.value||'';
  const to=document.getElementById('ms-to')?.value||'';

  /* ── date range filter ── */
  const fd=from?new Date(from):null;
  const td=to?new Date(to):null;
  const inRange=d=>{
    if(!d||d==='—') return true;
    const dt=new Date(d);
    if(fd&&dt<fd) return false;
    if(td&&dt>td) return false;
    return true;
  };

  /* PHASE 11.5 — single source of truth (engine includes capped prepaid credit row) */
  const st=FIN.memberStatement(mid,from,to);
  const openBal=st.openingBalance, totalDues=st.totalDues, totalPaid=st.totalPaid;
  const finalBal=st.finalBalance;
  const _en=window.LANG==='en';
  const donCat=d=>{
    if(d.donation_display_fund==='food'){
      if(d.food_donation_allocation==='reduce_deficit') return _en?'Historical Deficit Donation':'تبرع عجز تاريخي';
      if(d.food_donation_allocation==='support_current') return _en?'Food Donation · Current Support':'تبرع غداء · دعم حالي';
      return _en?'Food Donation':'تبرع غداء';
    }
    return _en?'Diwan Donation':'تبرع ديوان';
  };
  const dons=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.member_id===mid&&r.movement_type!=='historical_debt_collection'&&inRange(r.receipt_date)); /* ق4 */
  const _alloc=FIN.allocateFoodDonations();
  const donSplit=d=>{
    const sp=_alloc.perReceipt[d.id]||{debtSettled:0,toDeficit:0,toCurrent:0};
    if(d.donation_display_fund!=='food') return (_en?'Diwan Donation':'تبرع ديوان');
    const parts=[];
    if(sp.debtSettled>0) parts.push(mcLabel('debt')+' ₪'+fmt(sp.debtSettled));
    if(sp.toDeficit>0)   parts.push(mcLabel('deficit')+' ₪'+fmt(sp.toDeficit));
    if(sp.toCurrent>0)   parts.push(mcLabel('current')+' ₪'+fmt(sp.toCurrent));
    return parts.length?parts.join(' · '):donCat(d);
  };
  const donsHTML=dons.length?('<div class="period" style="margin-top:10px">'+(_en?'Donation movements':'حركات التبرعات')+'</div>'
    +'<div style="font-size:10px;color:#666;margin:4px 0">'+(_en?'Debt Settlement reduces the member balance. Historical Deficit Donation and Current Support Donation are shown for transparency only and do not affect the member balance.':'تسوية الذمة تخفّض رصيد العضو. تبرع العجز التاريخي وتبرع الدعم الحالي يُعرضان للشفافية فقط ولا يؤثّران على رصيد العضو.')+'</div>'
    +'<table class="dt"><thead><tr><th>'+window.t('common.date')+'</th><th>'+window.t('stmt.ref')+'</th><th>'+(_en?'Movement breakdown':'تفصيل الحركة')+'</th><th>'+window.t('common.amount')+'</th></tr></thead><tbody>'
    +dons.map(d=>'<tr><td>'+fmtDate2(d.receipt_date)+'</td><td>'+esc(d.no)+'</td><td>'+donSplit(d)+'</td><td><span class="cr">₪ '+fmt(d.amount_ils||d.amount)+'</span></td></tr>').join('')
    +'</tbody></table>'):'';
  const printDate=new Date().toLocaleDateString('en-GB');
  const periodLabel=from&&to?`${fmtDate2(from)} — ${fmtDate2(to)}`:from?`${window.t('stmt.date_from')} ${fmtDate2(from)}`:to?`${window.t('stmt.date_to')} ${fmtDate2(to)}`:window.t('stmt.all_periods');

  /* Print mirrors the on-screen ledger 1:1 (presentation only). Every value
     comes from FIN.memberStatement / the member record — identical to the
     screen build in renderMemberStmt; only the markup/CSS is print-styled. */
  const refFromNotes=txt=>{
    if(!txt) return '';
    const s=String(txt);
    let m=s.match(/(?:إيصال|ايصال|سند|receipt|rcpt|ref|مرجع|رقم|no\.?|#)[^\d]{0,24}(\d{1,9})/i);
    if(m) return m[1];
    m=s.match(/^\s*#?\s*(\d{1,9})\s*$/);
    return m?m[1]:'';
  };
  const _hd=Number(member.historical_balance_ils||0), _hp=Number(member.historical_payments_ils||0), _carried=_hd-_hp;
  const moves=st.rows.filter(r=>r.date!=='—');
  let totSub=0, totPay=0;
  const balTxt=v=>'<span class="num">₪ '+fmt(Math.abs(v))+'</span>'+(v<0?(_en?' Cr':' دائن'):'');
  const cell=v=>v>0?'<span class="num">₪ '+fmt(v)+'</span>':'<span class="mut">—</span>';
  let tbody='<tr>'
    +'<td class="c mut">—</td><td class="ds">'+(_en?'Carried balance before 31/12/2024':'رصيد مُرحّل قبل 31/12/2024')+'</td>'
    +'<td class="c mut">—</td><td class="c mut">—</td><td class="c mut">—</td><td class="mut">—</td><td class="mut">—</td>'
    +'<td class="bal">'+balTxt(_carried)+'</td></tr>';
  moves.forEach(r=>{
    totSub+=Number(r.dr||0); totPay+=Number(r.cr||0);
    const isReceipt=r.no&&r.no!=='—';
    const year=(r.date&&r.date!=='—')?String(r.date).slice(0,4):'—';
    const sysNo=isReceipt?esc(r.no):'—';
    const refNo=isReceipt?(refFromNotes(r.desc)||'—'):'—';
    const desc=isReceipt?(_en?'Payment · Food contribution':'سداد · مساهمة غذاء'):esc(r.desc);
    const bal=Number(r.bal||0);
    tbody+='<tr>'
      +'<td><span class="num">'+fmtDate2(r.date)+'</span></td>'
      +'<td class="ds">'+desc+'</td>'
      +'<td class="c">'+year+'</td>'
      +'<td class="c num">'+sysNo+'</td>'
      +'<td class="c num">'+refNo+'</td>'
      +'<td>'+cell(r.dr)+'</td>'
      +'<td>'+cell(r.cr)+'</td>'
      +'<td class="bal">'+balTxt(bal)+'</td></tr>';
  });
  const finBal=Number(st.finalBalance||0);
  const finStatus=finBal>0?(_en?'Outstanding — member owes':'على العضو مستحقات')
                 :finBal<0?(_en?'Credit balance — owed to member':'للعضو رصيد دائن')
                 :(_en?'Fully settled':'الحساب مسدد بالكامل');
  /* final balance CAPS the running-balance column (tfoot) — approved layout */
  const tbl='<table class="dt msdt"><thead><tr>'
    +'<th>'+(_en?'Date':'التاريخ')+'</th>'
    +'<th>'+(_en?'Description':'البيان')+'</th>'
    +'<th class="c">'+(_en?'Year':'السنة')+'</th>'
    +'<th class="c">'+(_en?'System no.':'رقم النظام')+'</th>'
    +'<th class="c">'+(_en?'Reference no.':'الرقم المرجعي')+'</th>'
    +'<th>'+(_en?'Subscription (+)':'اشتراك (+)')+'</th>'
    +'<th>'+(_en?'Payment (−)':'سداد (−)')+'</th>'
    +'<th>'+(_en?'Running balance':'الرصيد الجاري')+'</th>'
    +'</tr></thead><tbody>'+tbody+'</tbody>'
    +'<tfoot><tr class="final"><td colspan="7">'+(_en?'Current final balance':'الرصيد النهائي الحالي')+' · <span style="font-weight:500">'+finStatus+'</span></td>'
    +'<td class="bal">'+balTxt(finBal)+'</td></tr></tfoot></table>';
  const openHTML='<div class="msopen"><span>'+(_en?'Carried balance before 31/12/2024':'الرصيد المرحّل قبل 31/12/2024')+'</span><span>'+balTxt(_carried)+'</span></div>';
  const sumHTML='<div class="cards">'
    +'<div class="card"><div class="k">'+(_en?'Subscriptions after system launch':'مجموع الاشتراكات بعد تشغيل النظام')+'</div><div class="v">₪ '+fmt(totSub)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Payments after system launch':'مجموع السداد بعد تشغيل النظام')+'</div><div class="v">₪ '+fmt(totPay)+'</div></div>'
    +'<div class="card acc"><div class="k">'+(_en?'Payments against carried balance':'مجموع السداد من الرصيد المرحل')+'</div><div class="v">₪ '+fmt(_hp)+'</div></div>'
    +'</div>';

  const css='@page{size:A4 portrait;margin:9mm}body{font-family:var(--fa);direction:rtl;background:#fff;padding:9mm}'
    +'.msopen{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line2);border-inline-start:3px solid var(--teal-line);border-radius:8px;padding:10px 14px;margin:4px 0 14px;font-size:12px;font-weight:600;color:var(--ink2)}'
    +'table.msdt{font-size:10px}table.msdt td.ds{text-align:right}';

  const subLine=(_en?'Member: <b>'+esc(member.name)+'</b> · No. <b class="num">'+esc(member.member_code||'—')+'</b>'
                    :'العضو: <b>'+esc(member.name)+'</b> · رقم العضو: <b class="num">'+esc(member.member_code||'—')+'</b>');
  const body=reportHeader(window.t('members.member_stmt'),{sub:subLine})
    +'<div class="period">'+window.t('stmt.period_label')+' '+periodLabel+' '+window.t('stmt.active_since')+' '+(member.active_from_year||'—')+(member.phone?' · ☎ '+esc(member.phone):'')+'</div>'
    +openHTML
    +tbl
    +sumHTML
    +donsHTML
    +reportDfoot('https://www.diwan-finance.com','diwan-finance.com')
    +reportFooter({printedLabel:window.t('stmt.printed_at'),date:printDate,page:window.t('stmt.page_info')});
  openPrintWin(css,body);
  if(mode==='pdf') toast(_en?'In the print dialog choose “Save as PDF”':'في نافذة الطباعة اختر «حفظ كـ PDF»','info');
  else if(mode==='pdf-print') toast(_en?'Generated from the official PDF template':'تم التوليد من قالب PDF الرسمي','info');
};

/* ═══ §3 PRINT-BUTTON AUDIT ADDITIONS (presentation-only printers) ═══
   Both print exactly the data the page displays — same source calls the
   screen renderers use (FIN.memberBalance/balanceLabel for members,
   DB.annual rows for annual dues). No new computation, openPrintWin +
   the shared template, can.print() gated (and swept for viewers). */
window.prtMembersList=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const q=(document.getElementById('q-members')?.value||'').toLowerCase();
  const st=document.getElementById('f-member-status')?.value||'';
  let d=DB.members.filter(m=>m.is_active);
  if(q)d=d.filter(m=>m.name.toLowerCase().includes(q)||(m.phone||'').includes(q));
  d=d.map(m=>({...m,bal:FIN.memberBalance(m.id)}));
  if(st==='paid')d=d.filter(m=>m.bal===0);
  else if(st==='due')d=d.filter(m=>m.bal>0);
  else if(st==='credit')d=d.filter(m=>m.bal<0);
  const _en=window.LANG==='en';
  const rows=d.map((m,i)=>'<tr><td>'+(i+1)+'</td><td style="text-align:right">'+esc(m.name)+'</td><td class="mono">'+esc(m.phone||'—')+'</td>'
    +'<td class="'+(m.bal>0?'dr':m.bal<0?'cr':'')+' mono">₪ '+fmt(Math.abs(m.bal))+'</td>'
    +'<td>'+esc(FIN.balanceLabel(m.bal,false))+'</td></tr>').join('');
  const body=reportHeader(_en?'Family Members List':'قائمة أعضاء العائلة',{sub:(_en?'Members: ':'عدد الأعضاء: ')+d.length})
    +'<div class="period">'+(_en?'As displayed — filter: ':'كما هو معروض — الفلتر: ')+(st||(_en?'All':'الكل'))+(q?(' · '+esc(q)):'')+'</div>'
    +'<table class="dt"><thead><tr><th class="c">#</th><th>'+(_en?'Name':'الاسم')+'</th><th>'+(_en?'Phone':'الهاتف')+'</th><th>'+(_en?'Balance ₪':'الرصيد ₪')+'</th><th>'+(_en?'Status':'الحالة')+'</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +reportDfoot('https://www.diwan-finance.com','diwan-finance.com')
    +reportFooter({date:fmtDate2(new Date().toISOString())});
  openPrintWin('@page{size:A4 portrait;margin:10mm}body{direction:rtl;background:#fff;padding:0}',body);
};
window.prtAnnual=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const _en=window.LANG==='en';
  const rows=DB.annual.map(a=>'<tr><td class="mono">'+esc(String(a.year))+'</td><td class="mono">₪ '+fmt(a.amount)+'</td><td class="mono">'+esc(String(a.member_count))+'</td>'
    +'<td class="mono">'+fmtDate2(a.applied_at?a.applied_at.slice(0,10):null)+'</td><td>'+esc(a.applied_by||'—')+'</td></tr>').join('');
  const body=reportHeader(_en?'Annual Subscriptions Log':'سجل الاشتراكات السنوية',{sub:(_en?'Applied years: ':'السنوات المطبقة: ')+DB.annual.length})
    +'<table class="dt" style="margin-top:12px"><thead><tr><th class="c">'+(_en?'Year':'السنة')+'</th><th>'+(_en?'Amount ₪':'المبلغ ₪')+'</th><th class="c">'+(_en?'Members':'عدد الأعضاء')+'</th><th class="c">'+(_en?'Applied on':'تاريخ التطبيق')+'</th><th>'+(_en?'Applied by':'بواسطة')+'</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +reportDfoot('https://www.diwan-finance.com','diwan-finance.com')
    +reportFooter({date:fmtDate2(new Date().toISOString())});
  openPrintWin('@page{size:A4 portrait;margin:10mm}body{direction:rtl;background:#fff;padding:0}',body);
};
