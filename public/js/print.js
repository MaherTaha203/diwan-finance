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

/* ═══ A0.5 — Identity v3 branding · single source of truth for every report/print surface ═══ */
const BRAND_NAME='ديوان آل طه';
const BRAND_SUBTITLE='نظام الإدارة المالية';
const BRAND_SITE='diwan-finance.com';
/* Official Diwan Al-Taha logo (public/brand/PNG/logo-128.png from the approved brand package, embedded byte-identical) — sits in the white logo box of the report masthead. */
const BRAND_LOGO='data:image/png;base64,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';
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
    +(r.movement_type==='diwan_operational_income'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">إيراد الديوان التشغيلي</div></div>':r.movement_type==='diwan_cash_donation'?'<div class="row"><div class="lbl">نوع الحدث</div><div class="val">تبرع نقدي للديوان</div></div>':'')
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
  const balTxt=v=>'₪ '+fmt(Math.abs(v))+(v<0?(_en?' Cr':' دائن'):'');
  let tbody='<tr>'
    +'<td>—</td><td class="ds">'+(_en?'Carried balance before 31/12/2024':'رصيد مُرحّل قبل 31/12/2024')+'</td>'
    +'<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>'
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
      +'<td>'+fmtDate2(r.date)+'</td>'
      +'<td class="ds">'+desc+'</td>'
      +'<td>'+year+'</td>'
      +'<td class="mono">'+sysNo+'</td>'
      +'<td class="mono">'+refNo+'</td>'
      +'<td>'+(r.dr>0?'₪ '+fmt(r.dr):'—')+'</td>'
      +'<td>'+(r.cr>0?'₪ '+fmt(r.cr):'—')+'</td>'
      +'<td class="bal">'+balTxt(bal)+'</td></tr>';
  });
  const tbl='<table class="dt msdt"><thead><tr>'
    +'<th>'+(_en?'Date':'التاريخ')+'</th>'
    +'<th>'+(_en?'Description':'البيان')+'</th>'
    +'<th>'+(_en?'Year':'السنة')+'</th>'
    +'<th>'+(_en?'System no.':'رقم النظام')+'</th>'
    +'<th>'+(_en?'Reference no.':'الرقم المرجعي')+'</th>'
    +'<th>'+(_en?'Subscription (+)':'اشتراك (+)')+'</th>'
    +'<th>'+(_en?'Payment (−)':'سداد (−)')+'</th>'
    +'<th>'+(_en?'Running balance':'الرصيد الجاري')+'</th>'
    +'</tr></thead><tbody>'+tbody+'</tbody></table>';

  const finBal=Number(st.finalBalance||0);
  const finStatus=finBal>0?(_en?'Outstanding — member owes':'على العضو مستحقات')
                 :finBal<0?(_en?'Credit balance — owed to member':'للعضو رصيد دائن')
                 :(_en?'Fully settled':'الحساب مسدد بالكامل');
  const metaHTML='<div class="msmeta">'
    +'<div class="mc"><div class="mk">'+(_en?'Member name':'اسم العضو')+'</div><div class="mv">'+esc(member.name)+'</div></div>'
    +'<div class="mc"><div class="mk">'+(_en?'Member no.':'رقم العضو')+'</div><div class="mv mono">'+esc(member.member_code||'—')+'</div></div>'
    +'<div class="mc"><div class="mk">'+(_en?'Registration':'تاريخ التسجيل')+'</div><div class="mv mono">'+(member.active_from_year||'—')+'</div></div>'
    +'<div class="mc"><div class="mk">'+(_en?'Print date':'تاريخ الطباعة')+'</div><div class="mv mono">'+printDate+'</div></div>'
    +'</div>';
  const openHTML='<div class="msopen"><span>'+(_en?'Carried balance before 31/12/2024':'الرصيد المرحّل قبل 31/12/2024')+'</span><span class="mono">'+balTxt(_carried)+'</span></div>';
  const sumHTML='<div class="cards">'
    +'<div class="card"><div class="k">'+(_en?'Subscriptions after system launch':'مجموع الاشتراكات بعد تشغيل النظام')+'</div><div class="v">₪ '+fmt(totSub)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Payments after system launch':'مجموع السداد بعد تشغيل النظام')+'</div><div class="v">₪ '+fmt(totPay)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Payments against carried balance':'مجموع السداد من الرصيد المرحل')+'</div><div class="v">₪ '+fmt(_hp)+'</div></div>'
    +'</div>';
  const finalHTML='<div class="msfinal"><span class="fk">'+(_en?'Current final balance':'الرصيد النهائي الحالي')+'</span><span class="fv mono">₪ '+fmt(Math.abs(finBal))+'</span><span class="fs">'+finStatus+'</span></div>';

  const css='@page{size:A4 portrait;margin:9mm}body{font-family:var(--fa);direction:rtl;background:#fff}'
    +'.msmeta{display:flex;gap:8px;margin:10px 0}'
    +'.msmeta .mc{flex:1;border:1px solid var(--line);border-radius:3px;padding:6px 9px;text-align:center}'
    +'.msmeta .mk{font-size:8.5px;color:var(--faint);font-weight:600}'
    +'.msmeta .mv{font-size:11px;color:var(--ink);font-weight:700;margin-top:3px}'
    +'.msopen{display:flex;justify-content:space-between;align-items:center;background:var(--brand-soft);border:1px solid var(--rule);border-radius:3px;padding:8px 12px;margin:10px 0;font-size:11.5px;font-weight:700;color:var(--brand)}'
    +'table.msdt{font-size:9.5px}table.msdt td.ds{text-align:right}'
    +'.msfinal{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--brand);color:#fff;border-radius:3px;padding:11px 16px;margin-top:12px}'
    +'.msfinal .fk{font-size:12px;font-weight:600}'
    +'.msfinal .fv{font-size:17px;font-weight:800}'
    +'.msfinal .fs{font-size:10.5px;color:rgba(255,255,255,.82);margin-inline-start:auto}';

  const body=reportHeader(window.t('members.member_stmt'),{sub:window.t('stmt.member_label')+' '+esc(member.name)+(member.member_code?' · '+esc(member.member_code):'')})
    +'<div class="period">'+window.t('stmt.period_label')+' '+periodLabel+' '+window.t('stmt.active_since')+' '+(member.active_from_year||'—')+(member.phone?' · ☎ '+esc(member.phone):'')+'</div>'
    +metaHTML
    +openHTML
    +tbl
    +sumHTML
    +finalHTML
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
