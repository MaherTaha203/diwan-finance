/* ═══ PRINT ENGINE (Module 9 — extracted from app.js, Phase B) ═══
   The unified print design system and every core print surface:
   PRINT_TOKENS (VIS-1 single source of design truth), openPrintWin
   (QR + fonts + auto-print shell), A0.5 COUNCIL branding
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
const PRINT_TOKENS=':root{--brand:#24425C;--brand-2:#2E5273;--accent:#2F6DB3;--navy:#24425C;--navy2:#2E5273;--rule:#C3CFDA;--line:#DDE3EA;--soft:#EEF1F5;--brand-soft:#E9EEF4;--pos:#1E7E46;--neg:#B3261E;--teal-ink:#1E7E46;--teal-acc:#2F6DB3;--teal-bg:#E9EEF4;--gold:#C3CFDA;--gold-d:#93A0AD;--danger:#B3261E;--gray:#5F6D7C;--faint:#93A0AD;--bg:#FAFBFC;--bg2:#EEF2F6;--bd:#DDE3EA;--ink:#1C2733;--fa:"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;--fe:"IBM Plex Mono",Menlo,monospace}'
+'*{box-sizing:border-box;margin:0;padding:0}'
+'body{font-family:var(--fa);color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}'
+'.mono,.num{font-family:var(--fe);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}'
/* ── Masthead: solid slate brand bar ── */
+'.dh{display:flex;justify-content:space-between;align-items:center;background:var(--brand);padding:13px 16px;border-radius:3px}'
+'.dh .org{display:flex;gap:11px;align-items:center}'
+'.dh .logo{width:46px;height:46px;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;padding:3px}.logo img{width:40px;height:40px;object-fit:contain;display:block}'
+'.dh h1{font-size:16px;color:#fff;font-weight:700;line-height:1.2;letter-spacing:0}'
+'.dh .org p{font-size:10px;color:rgba(255,255,255,.75);margin-top:2px}'
+'.dh .meta{text-align:left}'
+'.dh .meta .tt{display:inline-block;background:rgba(255,255,255,.14);color:#fff;font-size:12.5px;font-weight:700;padding:5px 14px;border-radius:3px;letter-spacing:.2px}'
+'.dh .meta .no{font-size:12.5px;color:#fff;font-weight:700;margin-top:6px;font-family:var(--fe);font-variant-numeric:tabular-nums}'
+'.dh .meta .sub{font-size:10.5px;color:rgba(255,255,255,.75);margin-top:4px}'
/* ── Period band → context strip ── */
+'.period{text-align:center;margin:12px 0;font-size:12px;color:var(--brand);font-weight:600;background:#fff;border:1px solid var(--line);border-radius:3px;padding:8px 12px}'
/* ── Summary cards: white + 3px top rule ── */
+'.cards{display:flex;gap:10px;margin-bottom:14px}'
+'.card{flex:1;background:#fff;border:1px solid var(--line);border-top:3px solid var(--line);border-radius:3px;padding:10px 12px;text-align:center}'
+'.card:last-child{border-top-color:var(--accent)}'
+'.card .k{font-size:9px;color:var(--faint);font-weight:600}.card .v{font-size:15px;font-weight:700;color:var(--ink);margin-top:5px;font-family:var(--fe);font-variant-numeric:tabular-nums}'
+'.card .v.pos{color:var(--pos)}.card .v.neg{color:var(--neg)}'
/* ── Tables ── */
+'table.dt{width:100%;border-collapse:collapse;font-size:10.5px;border:1px solid var(--line)}'
+'table.dt thead th{background:#EEF2F6;color:var(--gray);border-top:2px solid var(--brand);padding:7px;font-weight:700;font-size:10px;letter-spacing:.2px;border-bottom:1px solid var(--line)}'
+'table.dt thead th:not(:first-child),table.dt tbody td:not(:first-child){border-inline-start:1px solid var(--soft)}'
+'table.dt tbody td{padding:6px;border-bottom:1px solid var(--line);text-align:center}'
+'table.dt tbody tr:nth-child(even){background:var(--bg)}'
+'table.dt tfoot td{border-top:2px solid var(--rule);font-weight:700;padding:7px}'
+'.cr{color:var(--pos);font-weight:700}.dr{color:var(--neg);font-weight:700}.bal{font-weight:700;color:var(--ink);font-family:var(--fe);font-variant-numeric:tabular-nums}'
+'table.dt td.bal{background:var(--brand-soft);border-inline-start:2px solid var(--rule)}'
+'table.dt tr.final td{background:var(--brand);color:#fff;font-weight:700;font-size:12px;padding:9px}'
+'table.dt tr.final td.bal{background:var(--brand);border-inline-start:none}'
+'table.dt tr.final .pos{color:#BFE8D2}table.dt tr.final .neg{color:#F5C6C2}'
/* ── Footer · signatures · QR ── */
+'.dfoot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px}'
+'.qr-u{width:92px;text-align:center}'
+'.qr-u .box{width:64px;height:64px;border:1px solid var(--brand);border-radius:3px;margin:0 auto;padding:3px;background:#fff}'
+'.qr-u .box>div,.qr-u .box img,.qr-u .box canvas{width:56px!important;height:56px!important}'
+'.qr-u .cap{font-size:7px;color:var(--faint);margin-top:3px;word-break:break-all}'
+'.qr-u .cap .tok{display:block;font-weight:700;color:var(--brand);font-size:7.5px;letter-spacing:.2px;margin-top:1px;font-family:var(--fe)}'
+'.sigs{display:flex;gap:42px}'
+'.sig-u{text-align:center}.sig-u .line{width:124px;border-top:1.5px solid var(--brand);margin-top:36px;padding-top:5px;font-size:10px;color:var(--gray);text-align:center}'
+'.pgfoot{border-top:1px solid var(--line);margin-top:18px;padding-top:7px;display:flex;justify-content:space-between;font-size:9px;color:var(--faint)}'
/* ── Vouchers ── */
+'.page{background:#fff;position:relative;overflow:hidden}'
+'.voucher{padding:14mm 12mm}'
+'.rows{margin-top:16px;border:1px solid var(--line);border-radius:3px;overflow:hidden}'
+'.rows .row{display:flex;border-bottom:1px solid var(--line);padding:8px 12px}.rows .row:last-child{border-bottom:none}.rows .row:nth-child(even){background:var(--bg)}'
+'.rows .lbl{width:34%;color:var(--faint);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center}'
+'.rows .val{flex:1;color:var(--ink);font-size:11.5px;font-weight:700}'
+'.amount{display:flex;justify-content:space-between;align-items:center;background:var(--accent);border-radius:3px;padding:13px 16px;margin-top:16px}'
+'.amount .big{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;font-family:var(--fe);color:#fff}.amount .big.cr{color:#fff}.amount .big.dr{color:#fff}'
+'.amount .words{font-size:11px;color:rgba(255,255,255,.85);max-width:58%;text-align:left}'
+'.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}'
+'.wm span{transform:rotate(-35deg);font-size:64px;font-weight:800;color:rgba(36,66,92,.05)}'
+'@page{size:A4 portrait;margin:0}'
+'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tfoot{display:table-footer-group}tr{page-break-inside:avoid}.dfoot,.cards,.amount,table.dt tr.final{page-break-inside:avoid}.dh,.period{page-break-after:avoid}}';

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

/* ═══ A0.5 — COUNCIL branding · single source of truth for every report/print surface ═══ */
const BRAND_NAME='ديوان آل طه';
const BRAND_SUBTITLE='نظام الإدارة المالية';
const BRAND_SITE='diwan-finance.com';
/* Approved COUNCIL mark (public/logo-dark.svg) — ivory+gold, for the navy report-header box. */
const BRAND_LOGO='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSLYr9mK2YjYp9mGINii2YQg2LfZhyI+Cjxwb2x5Z29uIHBvaW50cz0iNTAsMTggNDIuNiwxOCAxOCw0Mi42IDE4LDUwIDM0LDUwIDUwLDM0IiBmaWxsPSIjRjJFRUU3Ij48L3BvbHlnb24+PHBvbHlnb24gcG9pbnRzPSI3MCwxOCA3Ny40LDE4IDEwMiw0Mi42IDEwMiw1MCA4Niw1MCA3MCwzNCIgZmlsbD0iI0YyRUVFNyI+PC9wb2x5Z29uPjxwb2x5Z29uIHBvaW50cz0iMTAyLDcwIDEwMiw3Ny40IDc3LjQsMTAyIDcwLDEwMiA3MCw4NiA4Niw3MCIgZmlsbD0iI0YyRUVFNyI+PC9wb2x5Z29uPjxwb2x5Z29uIHBvaW50cz0iNTAsMTAyIDQyLjYsMTAyIDE4LDc3LjQgMTgsNzAgMzQsNzAgNTAsODYiIGZpbGw9IiNGMkVFRTciPjwvcG9seWdvbj48cG9seWdvbiBwb2ludHM9IjUzLDE4IDY3LDE4IDYwLDM0IiBmaWxsPSIjQzZBNDZBIj48L3BvbHlnb24+PHBvbHlnb24gcG9pbnRzPSIxMDIsNTMgMTAyLDY3IDg2LDYwIiBmaWxsPSIjQzZBNDZBIj48L3BvbHlnb24+PHBvbHlnb24gcG9pbnRzPSI1MywxMDIgNjcsMTAyIDYwLDg2IiBmaWxsPSIjQzZBNDZBIj48L3BvbHlnb24+PHBvbHlnb24gcG9pbnRzPSIxOCw1MyAxOCw2NyAzNCw2MCIgZmlsbD0iI0M2QTQ2QSI+PC9wb2x5Z29uPgo8L3N2Zz4=';
/* Shared report/print header — vouchers, statements, reports, future A2/A3/A4. opts:{sub,no} */
function reportHeader(title,opts){
  opts=opts||{};
  return '<div class="dh"><div class="org"><div class="logo"><img src="'+BRAND_LOGO+'" alt="'+BRAND_NAME+'"></div>'
    +'<div><h1>'+BRAND_NAME+'</h1><p>'+BRAND_SUBTITLE+' · '+BRAND_SITE+'</p></div></div>'
    +'<div class="meta"><span class="tt">'+title+'</span>'
    +(opts.no?'<div class="no">'+opts.no+'</div>':'')
    +(opts.sub?'<div class="sub">'+opts.sub+'</div>':'')
    +'</div></div>';
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
    +'<div class="row"><div class="lbl">استلمنا من</div><div class="val">'+esc(r.payer_name||gmn(r.member_id))+'</div></div>'
    +'<div class="row"><div class="lbl">طريقة الدفع</div><div class="val">'+esc(meth)+'</div></div>'
    +cur+note
    +'</div>'
    +'<div class="amount"><div class="big cr">₪ '+fmt(r.amount_ils||r.amount)+'</div><div class="words">'+amountToWordsAr(r.amount_ils||r.amount)+'</div></div>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="'+verifyUrl+'"></div></div><div class="cap">diwan-finance.com/verify<span class="tok">'+esc(r.verification_token||'')+'</span></div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحرِّر</div></div><div class="sig-u"><div class="line">المُعتمِد</div></div></div></div>'
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
    +'<div class="amount"><div class="big dr">₪ '+fmt(p.amount_ils||p.amount)+'</div><div class="words">'+amountToWordsAr(p.amount_ils||p.amount)+'</div></div>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="'+verifyUrl+'"></div></div><div class="cap">diwan-finance.com/verify<span class="tok">'+esc(p.verification_token||'')+'</span></div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">المُحرِّر</div></div><div class="sig-u"><div class="line">المُعتمِد</div></div></div></div>'
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
  const curBal=isFood?FIN.foodBalance():bal;
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
      +'<div class="card"><div class="k">'+(_en?'Remaining Historical Deficit':'العجز التاريخي المتبقي')+'</div><div class="v '+(FIN.foodDeficitRemaining()<0?'neg':'pos')+'">₪ '+fmt(FIN.foodDeficitRemaining())+'</div></div>'
      +'<div class="card"><div class="k">'+mcLabel('reserve')+'</div><div class="v">₪ '+fmt(FIN.foodSettlementReserve())+'</div></div>'
      +'<div class="card"><div class="k">'+(_en?'Net Food Fund Position':'صافي مركز صندوق الغداء')+'</div><div class="v '+(FIN.foodNetPosition()>=0?'pos':'neg')+'">₪ '+fmt(FIN.foodNetPosition())+'</div></div></div>'
      +'<div style="font-size:10px;color:#666;margin:2px 0 6px">'+(_en?'Current Food Fund Balance = Operational ':'رصيد صندوق الغداء الحالي = تشغيلي ')+'₪'+fmt(bal)+' + '+mcLabel('debt')+' ₪'+fmt(FIN.foodDebtSettlementTotal())+' + '+mcLabel('current')+' ₪'+fmt(FIN.foodCurrentSupportTotal())+'</div>'):'')
    +'<table class="dt"><thead><tr><th>'+window.t('common.date')+'</th><th>'+window.t('stmt.donor_name')+'</th><th>'+window.t('stmt.desc')+'</th><th>'+window.t('stmt.col_in')+'</th><th>'+window.t('stmt.col_out')+'</th><th>'+window.t('stmt.balance')+'</th><th>'+window.t('stmt.note')+'</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="5">'+(isFood?(_en?'Current Food Fund Balance':'رصيد صندوق الغداء الحالي'):'الرصيد الجاري · Current Balance')+'</td><td class="'+curCls+'">₪ '+fmt(curBal)+'</td><td></td></tr></tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+window.t('stmt.sig_accountant')+'</div></div><div class="sig-u"><div class="line">'+window.t('stmt.sig_diwan')+'</div></div></div></div>'
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
  const dons=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation'&&r.member_id===mid&&inRange(r.receipt_date));
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
  const rowsHTML=st.rows.map(r=>{
    const balTxt='₪ '+fmt(Math.abs(r.bal))+(r.bal>0?' '+window.t('stmt.debit_tag'):r.bal<0?' '+window.t('stmt.credit_tag'):'');
    return '<tr>'
      +'<td>'+(r.date==='—'?'—':fmtDate2(r.date))+'</td>'
      +'<td>'+esc(r.no)+'</td>'
      +'<td>'+esc(r.desc)+'</td>'
      +'<td>'+(r.dr>0?'<span class="dr">₪ '+fmt(r.dr)+'</span>':'—')+'</td>'
      +'<td>'+(r.cr>0?'<span class="cr">₪ '+fmt(r.cr)+'</span>':'—')+'</td>'
      +'<td class="bal">'+balTxt+'</td></tr>';
  }).join('');
  const printDate=new Date().toLocaleDateString('en-GB').replace(/\//g,'/');
  const periodLabel=from&&to?`${fmtDate2(from)} — ${fmtDate2(to)}`:from?`${window.t('stmt.date_from')} ${fmtDate2(from)}`:to?`${window.t('stmt.date_to')} ${fmtDate2(to)}`:window.t('stmt.all_periods');

  /* ─── A1 REDESIGN (print, presentation only) — A4 portrait chronological statement.
     Balances unchanged: the Final row is FIN.balanceLabel(finalBal). Dynamic years. */
  const css='@page{size:A4 portrait;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}'
    +'.grp td{background:var(--navy);color:#fff;text-align:right;font-weight:700;font-size:10.5px;padding:7px 9px}'
    +'.grp .gtag{float:left;font-weight:600;font-size:9px;color:var(--gold)}'
    +'.li td:first-child{text-align:right}'
    +'.sub td{background:#eef2f7;font-weight:700;color:var(--navy)}.sub td:first-child{text-align:right}';
  const _hd=Number(member.historical_balance_ils||0),_hp=Number(member.historical_payments_ils||0),_carried=_hd-_hp;
  const _subs=(DB.subscriptions||[]).filter(s=>s.member_id===mid).sort((a,b)=>Number(a.year)-Number(b.year));
  let _r=_carried;
  const _yb=_subs.map(s=>{const d=Number(s.due_amount_ils||0),p=Number(s.paid_amount_ils||0);_r=_r+d-p;return{year:s.year,due:d,paid:p,bal:_r};});
  const _cur=_r;
  const _food=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='food'&&r.member_id===mid&&inRange(r.receipt_date));
  const _ds=Number(_alloc.perMember[mid]||0);
  const _balTd=v=>'<td class="bal">₪ '+fmt(Math.abs(v))+(v>0?' '+window.t('stmt.debit_tag'):v<0?' '+window.t('stmt.credit_tag'):'')+'</td>';
  const grp=(t,tag)=>'<tr class="grp"><td colspan="4">'+t+(tag?'<span class="gtag">'+tag+'</span>':'')+'</td></tr>';
  const li=(l,due,paid)=>'<tr class="li"><td>'+l+'</td><td>'+(due!==''&&due!=null?'<span class="dr">₪ '+fmt(due)+'</span>':'—')+'</td><td>'+(paid!==''&&paid!=null?'<span class="cr">₪ '+fmt(paid)+'</span>':'—')+'</td><td></td></tr>';
  const sub=(l,v)=>'<tr class="sub"><td>'+l+'</td><td></td><td></td>'+_balTd(v)+'</tr>';
  let tbl='<table class="dt"><thead><tr><th>'+window.t('stmt.desc')+'</th><th>'+(_en?'Dues / Subscription':'ذمم / اشتراك')+'</th><th>'+(_en?'Paid':'مدفوع')+'</th><th>'+window.t('stmt.balance')+'</th></tr></thead><tbody>';
  tbl+=grp(_en?'Carried balance before 2025':'رصيد مُرحّل قبل 2025',_en?'Prior':'رصيد سابق');
  tbl+=li(_en?'Dues until 31/12/2024':'ذمم مستحقة حتى 31/12/2024',_hd,'');
  tbl+=li(_en?'Paid until 31/12/2024':'مدفوعات حتى 31/12/2024','',_hp);
  tbl+=sub(_en?'Carried balance':'الرصيد المُرحّل',_carried);
  _yb.forEach(y=>{
    tbl+=grp((_en?'Year ':'سنة ')+y.year);
    tbl+=li((_en?'Subscription ':'اشتراك ')+y.year,y.due,'');
    tbl+=li((_en?'Payment ':'دفعة ')+y.year,'',y.paid>0?y.paid:'');
    tbl+=sub((_en?'Balance after ':'الرصيد بعد ')+y.year,y.bal);
  });
  tbl+=sub(_en?'Current balance':'الرصيد الحالي',_cur);
  if(_food.length||_ds>0){
    tbl+=grp(_en?'System transactions':'حركات النظام',_en?'Receipts & vouchers':'إيصالات وسندات');
    _food.forEach(r=>tbl+=li(fmtDate2(r.receipt_date)+' · '+esc(r.notes||(_en?'Food contribution':'مساهمة غداء')),'',r.amount_ils||r.amount));
    if(_ds>0) tbl+=li(_en?'Debt settlement from donation (Item 9)':'تسوية ذمة من تبرع (البند 9)','',_ds);
  }
  tbl+='<tr class="final"><td colspan="3">'+(_en?'Final current balance':'الرصيد النهائي الحالي')+'</td><td class="'+(finalBal<=0?'pos':'neg')+'">'+FIN.balanceLabel(finalBal,true)+'</td></tr></tbody></table>';
  const body=reportHeader(window.t('members.member_stmt'),{sub:window.t('stmt.member_label')+' '+esc(member.name)+(member.member_code?' · '+esc(member.member_code):'')})
    +'<div class="period">'+window.t('stmt.period_label')+' '+periodLabel+' '+window.t('stmt.active_since')+' '+(member.active_from_year||'—')+(member.phone?' · ☎ '+esc(member.phone):'')+'</div>'
    +tbl
    +donsHTML
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+window.t('stmt.sig_accountant')+'</div></div><div class="sig-u"><div class="line">'+window.t('stmt.sig_member')+'</div></div></div></div>'
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
    +'<table class="dt"><thead><tr><th>#</th><th>'+(_en?'Name':'الاسم')+'</th><th>'+(_en?'Phone':'الهاتف')+'</th><th>'+(_en?'Balance ₪':'الرصيد ₪')+'</th><th>'+(_en?'Status':'الحالة')+'</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+(_en?'Accountant':'المحاسب')+'</div></div></div></div>'
    +reportFooter({date:fmtDate2(new Date().toISOString())});
  openPrintWin('@page{size:A4 portrait;margin:10mm}body{direction:rtl;background:#fff;padding:0}',body);
};
window.prtAnnual=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const _en=window.LANG==='en';
  const rows=DB.annual.map(a=>'<tr><td class="mono">'+esc(String(a.year))+'</td><td class="mono">₪ '+fmt(a.amount)+'</td><td class="mono">'+esc(String(a.member_count))+'</td>'
    +'<td class="mono">'+fmtDate2(a.applied_at?a.applied_at.slice(0,10):null)+'</td><td>'+esc(a.applied_by||'—')+'</td></tr>').join('');
  const body=reportHeader(_en?'Annual Subscriptions Log':'سجل الاشتراكات السنوية',{sub:(_en?'Applied years: ':'السنوات المطبقة: ')+DB.annual.length})
    +'<table class="dt" style="margin-top:12px"><thead><tr><th>'+(_en?'Year':'السنة')+'</th><th>'+(_en?'Amount ₪':'المبلغ ₪')+'</th><th>'+(_en?'Members':'عدد الأعضاء')+'</th><th>'+(_en?'Applied on':'تاريخ التطبيق')+'</th><th>'+(_en?'Applied by':'بواسطة')+'</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+(_en?'Accountant':'المحاسب')+'</div></div></div></div>'
    +reportFooter({date:fmtDate2(new Date().toISOString())});
  openPrintWin('@page{size:A4 portrait;margin:10mm}body{direction:rtl;background:#fff;padding:0}',body);
};
