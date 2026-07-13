/* ═══ REPORTS — A2 ANNUAL DEBT · A3 DELINQUENT · DONATION STATEMENT
   (Module 8 — extracted from app.js, Phase B) ═══
   Read-only reporting layer: A2 annual debt report (annualDebtRows +
   filter/year-chip state, renderAnnualDebt, prtAnnualDebt), A3
   delinquent members report (delinquentRows + primary/year filters,
   renderDelinquent, prtDelinquent, exportDelinquentExcel) and the
   donation statement printer prtDonStmt. FIN.* remains the single
   source of truth for every figure — verbatim move, no calculation,
   query or column changed. Report-local state (_adFilter, _adYears,
   _delPrimary, _delYear) moves with its functions; loadStyledXLSX/
   styleDiwanSheet and the universal exporters stay in app.js and are
   reached as shared globals at call time (and vice versa: ui-nav.js
   and exportPageExcel call renderAnnualDebt/annualDebtRows here).
   Loaded via <script defer> BEFORE app.js so sealRestrictedFunctions
   still wraps prtAnnualDebt/prtDelinquent/prtDonStmt after definition.
   No load-time side effects. */

/* ═══ A2 — Annual Debt Report (reporting only · FIN.* = single source of truth) ═══ */
let _adFilter='all';
function annualDebtRows(filter){
  const f=filter||_adFilter;
  let rows=DB.members.filter(m=>m.is_active!==false).map(m=>{
    const st=FIN.memberStatement(m.id);
    return {code:m.member_code||'—', name:m.name, phone:m.phone||'',
      opening:st.openingBalance, dues:st.totalDues,
      paid:FIN._r2(st.totalPaid+(st.debtSettled||0)), current:st.finalBalance};
  });
  if(f==='debtors')        rows=rows.filter(r=>r.current>0.005);
  else if(f==='creditors') rows=rows.filter(r=>r.current<-0.005);
  else if(f==='zero')      rows=rows.filter(r=>Math.abs(r.current)<=0.005);
  return rows.sort((a,b)=>b.current-a.current);
}
function _adHead(){ return window.LANG==='en'
  ? ['Member No.','Member Name','Phone','Historical Balance','Subscription Dues','Total Paid','Current Balance']
  : ['رقم العضو','اسم العضو','الهاتف','رصيد افتتاحي','اشتراكات مستحقة','إجمالي المدفوع','الرصيد الحالي']; }
function _adCurCell(c){
  if(c>0.005)  return '<span class="dr">₪ '+fmt(c)+'</span>';
  if(c<-0.005) return '<span class="cr">₪ '+fmt(-c)+' '+(window.LANG==='en'?'credit':'دائن')+'</span>';
  return '<span style="color:var(--tx3,#94a3b8)">₪ 0</span>';
}
function _adFilterLabel(){ const en=window.LANG==='en';
  return _adFilter==='debtors'?(en?'Debtors':'مدينون'):_adFilter==='creditors'?(en?'Creditors':'دائنون'):_adFilter==='zero'?(en?'Zero balance':'رصيد صفر'):(en?'All':'الكل'); }
window.setAnnualDebtFilter=function(f){ _adFilter=f; renderAnnualDebt(); };

/* ── Dynamic subscription-year filter (years read from existing records — never hardcoded) ── */
let _adYears=null; // Set<number> of selected years; null until first init
function adAvailableYears(){
  const map={};
  (DB.subscriptions||[]).forEach(s=>{
    const y=Number(s.year); if(!y) return;
    map[y]=Math.max(map[y]||0,Number(s.due_amount_ils||0));
  });
  return Object.keys(map).map(Number).sort((a,b)=>a-b).map(y=>({year:y,due:map[y]}));
}
function adEnsureYears(){
  const avail=adAvailableYears();
  if(_adYears===null) _adYears=new Set(avail.map(y=>y.year)); // default: all years selected
  return avail;
}
window.toggleAdYear=function(y){
  adEnsureYears(); y=Number(y);
  if(_adYears.has(y)) _adYears.delete(y); else _adYears.add(y);
  renderAnnualDebt();
};
/* Per-member aggregation over selected years — SUMS OF EXISTING STORED VALUES ONLY (no new calc) */
function adMemberSelected(mid){
  let sub=0,paid=0;
  (DB.subscriptions||[]).filter(s=>s.member_id===mid).forEach(s=>{
    if(_adYears && _adYears.has(Number(s.year))){ sub+=Number(s.due_amount_ils||0); paid+=Number(s.paid_amount_ils||0); }
  });
  return {sub,paid};
}
function renderAnnualDebt(){
  const el=document.getElementById('annual-debt-list'); if(!el) return;
  const en=window.LANG==='en';
  const avail=adEnsureYears();
  /* Rows: historical figures + selected-year aggregation + authoritative FIN final balance */
  let rows=DB.members.filter(m=>m.is_active!==false).map(m=>{
    const st=FIN.memberStatement(m.id);
    const seld=adMemberSelected(m.id);
    return {code:m.member_code||'—', name:m.name, phone:m.phone||'',
      hist:Number(m.historical_balance_ils||0), histPaid:Number(m.historical_payments_ils||0),
      selSub:seld.sub, selPaid:seld.paid, current:st.finalBalance};
  });
  const total=rows.length;
  if(_adFilter==='debtors')        rows=rows.filter(r=>r.current>0.005);
  else if(_adFilter==='creditors') rows=rows.filter(r=>r.current<-0.005);
  else if(_adFilter==='zero')      rows=rows.filter(r=>Math.abs(r.current)<=0.005);
  rows.sort((a,b)=>b.current-a.current);

  const subEl=document.getElementById('annual-debt-sub');
  if(subEl) subEl.textContent='Annual Debt Report · '+rows.length+(en?' of ':' من ')+total;

  const chips=[['all',en?'All':'الكل'],['debtors',en?'Debtors':'مدينون'],['creditors',en?'Creditors':'دائنون'],['zero',en?'Zero balance':'رصيد صفر']]
    .map(c=>'<button class="tp-tab'+(_adFilter===c[0]?' on':'')+'" onclick="setAnnualDebtFilter(\''+c[0]+'\')">'+c[1]+'</button>').join('');
  const yearChips=avail.length
    ? avail.map(y=>{const on=_adYears.has(y.year);return '<button class="adr-ychip'+(on?' on':'')+'" onclick="toggleAdYear('+y.year+')"><span class="ck"><i class="ti '+(on?'ti-square-check':'ti-square')+'"></i></span>'+y.year+'<span class="amt">('+fmt(y.due)+' ₪)</span></button>';}).join('')
    : '<span style="font-size:12px;color:var(--tx3)">'+(en?'No subscription years yet':'لا توجد سنوات اشتراك')+'</span>';

  const head='<th>'+(en?'Member No.':'رقم العضو')+'</th><th>'+(en?'Member Name':'اسم العضو')+'</th><th>'+(en?'Phone':'الهاتف')+'</th>'
    +'<th class="as-num">'+(en?'Debt until 31/12/2024':'الذمم حتى 31/12/2024')+'</th><th class="as-num">'+(en?'Paid until 31/12/2024':'المسدد حتى 31/12/2024')+'</th>'
    +'<th class="as-num">'+(en?'Selected subscriptions':'اشتراكات السنوات المحددة')+'</th><th class="as-num">'+(en?'Selected payments':'مدفوعات السنوات المحددة')+'</th>'
    +'<th class="as-num">'+(en?'Current final balance':'الرصيد النهائي الحالي')+'</th>';
  /* screen-coloured final balance cell (same thresholds as the print _adCurCell) */
  const curCell=c=> c>0.005?'<span class="as-dr">₪ '+fmt(c)+'</span>':c<-0.005?'<span class="as-cr">₪ '+fmt(-c)+(en?' credit':' دائن')+'</span>':'<span style="color:var(--tx3)">₪ 0</span>';

  let tHist=0,tHistPaid=0,tSub=0,tPaid=0;
  const bodyRows=rows.map(r=>{tHist+=r.hist;tHistPaid+=r.histPaid;tSub+=r.selSub;tPaid+=r.selPaid;
    return '<tr><td>'+esc(r.code)+'</td><td class="as-desc">'+esc(r.name)+'</td><td>'+(r.phone?esc(r.phone):'—')+'</td>'
      +'<td class="as-num">₪ '+fmt(r.hist)+'</td><td class="as-num as-cr">₪ '+fmt(r.histPaid)+'</td>'
      +'<td class="as-num">₪ '+fmt(r.selSub)+'</td><td class="as-num as-cr">₪ '+fmt(r.selPaid)+'</td>'
      +'<td class="as-num">'+curCell(r.current)+'</td></tr>';}).join('');
  const foot='<tfoot><tr><td colspan="3">'+(en?'Total':'الإجمالي')+' ('+rows.length+')</td>'
    +'<td class="as-num">₪ '+fmt(tHist)+'</td><td class="as-num">₪ '+fmt(tHistPaid)+'</td><td class="as-num">₪ '+fmt(tSub)+'</td><td class="as-num">₪ '+fmt(tPaid)+'</td><td></td></tr></tfoot>';

  el.innerHTML='<div class="acct-stmt">'
    +'<div class="as-top"><div class="as-title"><span class="as-brand"></span><div>'
      +'<div class="as-h">'+(en?'Annual Debt Report':'تقرير المديونية السنوية')+'</div>'
      +'<div class="as-sub">'+(en?'Finance ‹ Members ‹ Debt report':'المالية ‹ الأعضاء ‹ تقرير المديونية')+'</div>'
    +'</div></div>'
    +(can.print()?'<div class="as-actions"><button class="as-btn as-btn-pri" onclick="window.prtAnnualDebt()"><i class="ti ti-printer"></i>'+(en?'Print':'طباعة')+'</button></div>':'')
    +'</div>'
    +'<div class="as-filters"><span class="as-fl-lbl"><i class="ti ti-calendar-stats"></i>'+(en?'Subscription years':'اشتراكات السنوات')+'</span><div class="adr-years">'+yearChips+'</div></div>'
    +'<div class="as-filters"><span class="as-fl-lbl"><i class="ti ti-filter"></i>'+(en?'Category':'التصنيف')+'</span><div class="tp-tabs">'+chips+'</div></div>'
    +(rows.length
      ? '<div class="as-tablewrap"><table class="as-table"><thead><tr>'+head+'</tr></thead><tbody>'+bodyRows+'</tbody>'+foot+'</table></div>'
      : '<div class="as-empty">'+(en?'No members in this category':'لا يوجد أعضاء في هذا التصنيف')+'</div>')
    +'<div class="as-foot"><span>'+(en?'Shown':'المعروض')+': '+rows.length+' / '+total+'</span>'
    +'<span>'+(en?'Auto-generated report — Diwan Al-Taha Finance':'تقرير مُولّد آليًا — ديوان آل طه')+'</span></div>'
    +'</div>';
}
window.prtAnnualDebt=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const en=window.LANG==='en';
  const rows=annualDebtRows();
  const total=DB.members.filter(m=>m.is_active!==false).length;
  const head=_adHead().map(h=>'<th>'+h+'</th>').join('');
  const body=rows.map(r=>'<tr><td>'+esc(r.code)+'</td><td>'+esc(r.name)+'</td><td>'+(r.phone?esc(r.phone):'—')+'</td><td>₪ '+fmt(r.opening)+'</td><td>₪ '+fmt(r.dues)+'</td><td><span class="cr">₪ '+fmt(r.paid)+'</span></td><td class="bal">'+_adCurCell(r.current)+'</td></tr>').join('');
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const b=reportHeader(en?'Annual Debt Report':'تقرير المديونية السنوية',{sub:window.t('stmt.currency_note')})
    +'<div class="period">'+(en?'Filter: ':'التصنيف: ')+_adFilterLabel()+' · '+(en?'Shown: ':'المعروض: ')+rows.length+' / '+total+'</div>'
    +'<table class="dt"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+window.t('stmt.sig_accountant')+'</div></div><div class="sig-u"><div class="line">'+window.t('stmt.sig_diwan')+'</div></div></div></div>'
    +reportFooter({printedLabel:window.t('stmt.printed_at'),date:fmtDate2(new Date().toISOString()),page:window.t('stmt.page_info')});
  openPrintWin(css,b);
};

/* ═══ A3 — Delinquent Members Report (read-only · dynamic subscription years) ═══ */
let _delPrimary='all', _delYear='all';
function _delYearStatus(byYear, year){
  const v=byYear[year];
  if(!v || v.due<=0) return 'na';
  return v.paid>=v.due ? 'settled' : 'unpaid';
}
function _delCell(v){
  if(!v || v.due<=0) return '<span style="color:var(--tx3,#94a3b8)">—</span>';
  if(v.paid>=v.due)  return '<span class="cr">✓ مسدد</span>';
  return '<span class="dr">✗ '+fmt(v.remaining)+' ₪</span>';
}
function _delHeaderLabel(){
  const en=window.LANG==='en';
  const prim=_delPrimary==='delinquent'?(en?'Delinquent':'المتأخرون'):_delPrimary==='current'?(en?'Not delinquent':'غير المتأخرين'):(en?'All':'الكل');
  const yr=_delYear==='all'?(en?'All years':'جميع السنوات'):String(_delYear);
  return (en?'Filter: ':'التصنيف: ')+prim+' · '+(en?'Year: ':'السنة: ')+yr;
}
function delinquentRows(){
  const years=FIN.subscriptionYears();
  let rows=DB.members.filter(m=>m.is_active!==false).map(m=>({
    code:m.member_code||'—', name:m.name, phone:m.phone||'', d:FIN.memberDelinquency(m.id)
  }));
  rows=rows.filter(r=>{
    if(_delPrimary==='all') return true;
    if(_delYear==='all') return _delPrimary==='delinquent' ? r.d.isDelinquent : !r.d.isDelinquent;
    const st=_delYearStatus(r.d.byYear, Number(_delYear));
    return _delPrimary==='delinquent' ? st==='unpaid' : st==='settled';
  });
  rows.sort((a,b)=> b.d.unpaidCount-a.d.unpaidCount || String(a.name).localeCompare(String(b.name),'ar'));
  return {years, rows};
}
function _delHead(years){
  const en=window.LANG==='en';
  return ['رقم العضو','اسم العضو','الهاتف'].concat(years.map(String)).concat([en?'Unpaid years':'عدد السنوات غير المسددة']);
}
function _delRowCells(r, years){
  return '<td>'+esc(r.code)+'</td><td>'+esc(r.name)+'</td><td>'+(r.phone?esc(r.phone):'—')+'</td>'
    +years.map(y=>'<td>'+_delCell(r.d.byYear[y])+'</td>').join('')
    +'<td class="bal">'+(r.d.unpaidCount>0?'<span class="dr"><b>'+r.d.unpaidCount+'</b></span>':'<span class="cr">0</span>')+'</td>';
}
window.setDelPrimary=function(p){ _delPrimary=p; renderDelinquent(); };
window.setDelYear=function(y){ _delYear=y; renderDelinquent(); };
function renderDelinquent(){
  const el=document.getElementById('delinquent-list'); if(!el) return;
  const en=window.LANG==='en';
  const {years, rows}=delinquentRows();
  const total=DB.members.filter(m=>m.is_active!==false).length;
  const sub=document.getElementById('delinquent-sub'); if(sub) sub.textContent='Delinquent Members Report · '+rows.length+(en?' of ':' من ')+total;
  const chips=[['all',en?'All':'الكل'],['delinquent',en?'Delinquent':'المتأخرون'],['current',en?'Not delinquent':'غير المتأخرين']]
    .map(c=>'<button class="tp-tab'+(_delPrimary===c[0]?' on':'')+'" onclick="setDelPrimary(\''+c[0]+'\')">'+c[1]+'</button>').join('');
  const yopts=['<option value="all">'+(en?'All years':'جميع السنوات')+'</option>']
    .concat(years.map(y=>'<option value="'+y+'"'+(String(_delYear)===String(y)?' selected':'')+'>'+y+'</option>')).join('');
  const yearSel='<select onchange="setDelYear(this.value)" style="height:34px;padding:0 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg2);color:var(--tx);font-size:12.5px;font-weight:700;margin-inline-start:auto">'+yopts+'</select>';
  const head=_delHead(years).map(h=>'<th>'+h+'</th>').join('');
  const body=rows.map(r=>'<tr>'+_delRowCells(r,years)+'</tr>').join('');
  el.innerHTML='<div class="acct-stmt">'
    +'<div class="as-top"><div class="as-title"><span class="as-brand"></span><div>'
      +'<div class="as-h">'+(en?'Delinquent Members Report':'تقرير الأعضاء المتأخرين')+'</div>'
      +'<div class="as-sub">'+(en?'Finance ‹ Members ‹ Delinquent report':'المالية ‹ الأعضاء ‹ تقرير المتأخرين')+'</div>'
    +'</div></div>'
    +(can.print()?'<div class="as-actions"><button class="as-btn as-btn-pri" onclick="window.prtDelinquent()"><i class="ti ti-printer"></i>'+(en?'Print':'طباعة')+'</button></div>':'')
    +'</div>'
    +'<div class="as-filters"><span class="as-fl-lbl"><i class="ti ti-filter"></i>'+(en?'Category':'التصنيف')+'</span><div class="tp-tabs">'+chips+'</div>'
      +'<span class="as-fl-lbl" style="margin-inline-start:auto"><i class="ti ti-calendar"></i>'+(en?'Year':'السنة')+'</span>'+yearSel+'</div>'
    +(rows.length?'<div class="as-tablewrap"><table class="as-table"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>'
      :'<div class="as-empty">'+(en?'No members in this category':'لا يوجد أعضاء في هذا التصنيف')+'</div>')
    +'<div class="as-foot"><span>'+(en?'Shown':'المعروض')+': '+rows.length+' / '+total+'</span>'
    +'<span>'+(en?'Auto-generated report — Diwan Al-Taha Finance':'تقرير مُولّد آليًا — ديوان آل طه')+'</span></div>'
    +'</div>';
}
window.prtDelinquent=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const en=window.LANG==='en';
  const {years, rows}=delinquentRows();
  const total=DB.members.filter(m=>m.is_active!==false).length;
  const head=_delHead(years).map(h=>'<th>'+h+'</th>').join('');
  const body=rows.map(r=>'<tr>'+_delRowCells(r,years)+'</tr>').join('');
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const b=reportHeader(en?'Delinquent Members Report':'تقرير الأعضاء المتأخرين',{sub:window.t('stmt.currency_note')})
    +'<div class="period">'+_delHeaderLabel()+' · '+(en?'Shown: ':'المعروض: ')+rows.length+' / '+total+'</div>'
    +'<table class="dt"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+window.t('stmt.sig_accountant')+'</div></div><div class="sig-u"><div class="line">'+window.t('stmt.sig_diwan')+'</div></div></div></div>'
    +reportFooter({printedLabel:window.t('stmt.printed_at'),date:fmtDate2(new Date().toISOString()),page:window.t('stmt.page_info')});
  openPrintWin(css,b);
};
window.exportDelinquentExcel=function(){
  if(!can.export()){toast(window.t?window.t('errors.no_permission'):'لا توجد صلاحية','err');return;}
  const {years, rows}=delinquentRows();
  const head=_delHead(years);
  const doExcel=()=>{
    const XLSX=window.XLSX; if(!XLSX){toast('جارٍ تحميل مكتبة Excel...','info');return;}
    const wsData=[['ديوان آل طه — تقرير الأعضاء المتأخرين'],[_delHeaderLabel()],[],head];
    rows.forEach(r=>{
      const yc=years.map(y=>{ const v=r.d.byYear[y]; if(!v||v.due<=0) return '—'; return v.paid>=v.due?'✓ مسدد':'✗ '+fmt(v.remaining)+' ₪'; });
      wsData.push([r.code, r.name, r.phone||'—'].concat(yc).concat([r.d.unpaidCount]));
    });
    const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!rtl']=true;
    ws['!cols']=[{wch:14},{wch:28},{wch:14}].concat(years.map(()=>({wch:12}))).concat([{wch:18}]);
    styleDiwanSheet(XLSX,ws,{headerRow:3});
    const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,'المتأخرون');
    XLSX.writeFile(wb,'diwan-delinquent-'+today()+'.xlsx');
    toast('✓ Excel','ok');
  };
  loadStyledXLSX(doExcel);
};

window.prtDonStmt=function(){
  if(!can.print()){toast(window.t('errors.no_print'),'err');return;}
  const _en=window.LANG==='en';
  const rows=DB.receipts.filter(r=>!r.is_deleted&&r.fund_type==='donation');
  /* Domain 3 (§4.2 enforcement) — the printed CASH total must never conflate the
     in-kind documentary value. Split: cash donations vs in-kind/service (FE-008,
     documentary only, no cash). The in-kind value is shown SEPARATELY, never in
     the cash total or the cash directions. Constitutional display correction
     (FM-01 §8/§9.2 phase 3); treasuries and the cash register are untouched. */
  const _isInkind=r=>r.movement_type==='donation_inkind';
  const cashRows=rows.filter(r=>!_isInkind(r));
  const inkindRows=rows.filter(_isInkind);
  const cashTot=cashRows.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const inkindTot=inkindRows.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const toFood=cashRows.filter(r=>r.donation_display_fund==='food').reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
  const toDiwan=cashTot-toFood;
  /* ITEM 9 — recognized donation portions (after member debt settlement). */
  const foodDeficit=FIN.foodSettlementReserve();   // Historical Deficit Donation -> Reserve
  const foodSupport=FIN.foodCurrentSupportTotal(); // Current Support Donation
  const foodDebt=FIN.foodDebtSettlementTotal();    // Debt Settlement (NOT a donation)
  const _dalloc=FIN.allocateFoodDonations();
  const donDir=r=>{
    /* Domain 3 (Display Principle) — an in-kind/service donation is documentary,
       never a diwan-directed cash donation; label it by its category. */
    if(_isInkind(r)) return (_en?'In-kind/Service · documentary':'عيني/خدمي · توثيقي')+(r.register_category?' ('+esc(r.register_category)+')':'');
    if(r.donation_display_fund!=='food') return window.t('receipts.fund_diwan');
    const sp=_dalloc.perReceipt[r.id]||{debtSettled:0,toDeficit:0,toCurrent:0};
    const parts=[];
    if(sp.debtSettled>0) parts.push(mcLabel('debt')+' ₪'+fmt(sp.debtSettled));
    if(sp.toDeficit>0)   parts.push(mcLabel('deficit')+' ₪'+fmt(sp.toDeficit));
    if(sp.toCurrent>0)   parts.push(mcLabel('current')+' ₪'+fmt(sp.toCurrent));
    return window.t('receipts.fund_food')+(parts.length?' · '+parts.join(' · '):'');
  };
  const rowsHTML=rows.map(r=>'<tr>'
    +'<td>'+fmtDate2(r.receipt_date)+'</td>'
    +'<td>'+esc(r.no)+'</td>'
    +'<td>'+esc(r.payer_name||gmn(r.member_id)||'—')+'</td>'
    +'<td><span class="cr">₪ '+fmt(r.amount_ils||r.amount)+'</span></td>'
    +'<td>'+(r.currency!=='ILS'?esc(r.currency):'ILS')+'</td>'
    +'<td>'+donDir(r)+'</td>'
    +'<td>'+esc(r.notes||'—')+'</td></tr>').join('');
  const css='@page{size:A4 landscape;margin:10mm}body{font-family:var(--fa);direction:rtl;background:#fff}';
  const body=reportHeader(window.t('stmt.donation_report'),{sub:window.t('stmt.currency_note')})
    +'<div class="period">'+window.t('stmt.count_label')+' '+rows.length+'</div>'
    +'<div class="cards">'
    +'<div class="card"><div class="k">'+window.t('stmt.donation_count')+'</div><div class="v">'+rows.length+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Cash Donations (Total)':'التبرعات النقدية (الإجمالي)')+'</div><div class="v pos">₪ '+fmt(cashTot)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'In-kind/Service · documentary value (not cash)':'عيني/خدمي · قيمة توثيقية (ليست نقداً)')+'</div><div class="v">₪ '+fmt(inkindTot)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Debt Settlement':'تسوية ذمم')+'</div><div class="v">₪ '+fmt(foodDebt)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Food — Deficit Settlement':'الغداء — تسوية العجز')+'</div><div class="v">₪ '+fmt(foodDeficit)+'</div></div>'
    +'<div class="card"><div class="k">'+(_en?'Food — Current Support':'الغداء — دعم حالي')+'</div><div class="v">₪ '+fmt(foodSupport)+'</div></div>'
    +'<div class="card"><div class="k">'+window.t('stmt.to_diwan')+'</div><div class="v">₪ '+fmt(toDiwan)+'</div></div></div>'
    +'<table class="dt"><thead><tr><th>'+window.t('common.date')+'</th><th>'+window.t('stmt.ref')+'</th><th>'+window.t('donations.donor')+'</th><th>'+window.t('common.amount')+'</th><th>'+window.t('common.currency')+'</th><th>'+window.t('stmt.direction')+'</th><th>'+window.t('stmt.note')+'</th></tr></thead>'
    +'<tbody>'+rowsHTML
    +'<tr class="final"><td colspan="3">'+(_en?'Cash Total (in-kind excluded — §4.2)':'الإجمالي النقدي (العيني مستبعَد — §4.2)')+'</td><td class="pos">₪ '+fmt(cashTot)+'</td><td colspan="3">'+(_en?'in-kind documentary: ₪':'قيمة عينية توثيقية: ₪')+' '+fmt(inkindTot)+'</td></tr></tbody></table>'
    +'<div class="dfoot"><div class="qr-u"><div class="box"><div data-qr-url="https://www.diwan-finance.com"></div></div><div class="cap">diwan-finance.com</div></div>'
    +'<div class="sigs"><div class="sig-u"><div class="line">'+window.t('stmt.sig_accountant')+'</div></div><div class="sig-u"><div class="line">'+window.t('stmt.sig_diwan')+'</div></div></div></div>'
    +reportFooter({printedLabel:window.t('stmt.printed_at'),date:fmtDate2(new Date().toISOString()),page:window.t('stmt.page_info')});
  openPrintWin(css,body);
};

