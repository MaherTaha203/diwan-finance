'use strict';

/* ═══ STATE ═══ */
let SB=null,CU=null,CUR=null;
const DB={rec:[],pay:[],fam:[],tx:[],audit:[],donations:[],rentals:[]};
const ROLES={admin:'مدير',accountant:'محاسب',viewer:'عارض'};
const PSZ=15,PS={rec:1,pay:1,fam:1,don:1,rent:1};
let USD_RATE=null,RATE_DATE=null;

/* ═══ PERMISSIONS ═══ */
const can={
  write:()=>['admin','accountant'].includes(CUR?.role),
  delete:()=>CUR?.role==='admin',
  manage:()=>CUR?.role==='admin',
};

/* ═══ LEDGER ═══ */
const L={
  bal:mid=>DB.tx.filter(t=>t.member_id==mid).reduce((s,t)=>t.type==='cr'?s+Number(t.amount):s-Number(t.amount),0),
  txFor:mid=>DB.tx.filter(t=>t.member_id==mid).sort((a,b)=>new Date(a.date)-new Date(b.date)),
  in:()=>DB.rec.reduce((s,r)=>s+Number(r.amount),0),
  out:()=>DB.pay.reduce((s,p)=>s+Number(p.amount),0),
  fundIn:fund=>DB.rec.filter(r=>r.fund===fund).reduce((s,r)=>s+Number(r.amount),0),
  donTotal:()=>DB.donations.reduce((s,d)=>s+Number(d.amount_ils||d.amount),0),
};

/* ═══ EXCHANGE RATE ═══ */
async function fetchRate(){
  try{
    const res=await fetch('https://data.gov.il/api/3/action/datastore_search?resource_id=88adaee8-624c-4b3b-b0d7-07c39034fa0a&limit=1&sort=_id desc');
    const json=await res.json();
    const rec=json?.result?.records?.[0];
    if(rec){USD_RATE=parseFloat(rec.EXCHANGERATE);RATE_DATE=rec.DATE;updateRateDisplay();return USD_RATE;}
  }catch(e){}
  try{
    const r2=await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const j2=await r2.json();
    USD_RATE=j2?.rates?.ILS;RATE_DATE=today();updateRateDisplay();return USD_RATE;
  }catch(e2){USD_RATE=3.7;updateRateDisplay();}
  return USD_RATE;
}
function updateRateDisplay(){
  document.querySelectorAll('.rate-display').forEach(el=>{
    if(USD_RATE) el.textContent=`1$ = ₪${USD_RATE.toFixed(2)} (${RATE_DATE||'اليوم'})`;
  });
  calcILS('r');calcILS('p');calcILS('don');calcILS('rent');
}
function calcILS(prefix){
  const usdEl=document.getElementById(prefix+'-amt-usd');
  const ilsEl=document.getElementById(prefix+'-amt-ils');
  const curEl=document.getElementById(prefix+'-currency');
  if(!usdEl||!ilsEl||!curEl)return;
  if(curEl.value==='USD'&&USD_RATE&&usdEl.value){
    ilsEl.value=(parseFloat(usdEl.value)*USD_RATE).toFixed(2);
  }
}

/* ═══ UTILS ═══ */
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Math.round(Number(n||0)).toLocaleString('ar-SA');
const fmtD=n=>Number(n||0).toFixed(2);
const fdate=d=>{try{return new Date(d).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'});}catch{return d||'—';}};
const gm=id=>DB.fam.find(m=>m.id==id);
const gmn=id=>gm(id)?.name||'—';
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function debounce(fn,ms=350){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

/* ═══ TOAST ═══ */
const ICONS={ok:'ti-circle-check',err:'ti-circle-x',warn:'ti-alert-triangle',inf:'ti-info-circle'};
function toast(msg,type='ok'){
  const c=document.getElementById('toast-container');
  const el=document.createElement('div');
  el.className='toast '+type;el.classList.add('fade-in');
  el.innerHTML=`<i class="ti ${ICONS[type]}"></i><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},3500);
}

/* ═══ VALIDATION ═══ */
function vf(id,test,eid){
  const el=document.getElementById(id);
  const ok=el&&test(el.value);
  el?.classList.toggle('er',!ok);
  document.getElementById(eid)?.classList.toggle('show',!ok);
  return ok;
}

/* ═══ PAGINATION ═══ */
function mkPag(tbl,total){
  const pages=Math.max(1,Math.ceil(total/PSZ));
  PS[tbl]=Math.min(PS[tbl],pages);
  const cur=PS[tbl];
  const el=document.getElementById(tbl+'-pag');if(!el)return;
  const shown=Math.min(PSZ,total-(cur-1)*PSZ);
  let h=`<span class="pag-info">عرض ${shown} من ${total}</span>`;
  h+=`<button class="pb" onclick="gp('${tbl}',${cur-1})" ${cur<=1?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
  for(let i=Math.max(1,cur-2);i<=Math.min(pages,cur+2);i++)
    h+=`<button class="pb${i===cur?' on':''}" onclick="gp('${tbl}',${i})">${i}</button>`;
  h+=`<button class="pb" onclick="gp('${tbl}',${cur+1})" ${cur>=pages?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
  el.innerHTML=h;
}
window.gp=(t,p)=>{PS[t]=p;renderPage(t);};
function renderPage(t){
  if(t==='rec')D.rec.render();
  else if(t==='pay')D.pay.render();
  else if(t==='fam')D.fam.render();
  else if(t==='don')D.don.render();
  else if(t==='rent')D.rent.render();
}

/* ═══ NAVIGATION ═══ */
window.nav = function nav(p){
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('show'));
  document.querySelectorAll('.nb').forEach(x=>x.classList.remove('show'));
  document.getElementById('pg-'+p)?.classList.add('on');
  document.querySelector(`.nb[data-p="${p}"]`)?.classList.add('on');
  if(p==='rep')renderRep();
  if(p==='stmt')fillStmtSel();
  if(p==='audit')renderAudit();
  if(p==='users')loadUsers();
  if(p==='bk')renderSysInfo();
}
document.querySelectorAll('.nb[data-p]').forEach(el=>el.addEventListener('click',()=>nav(el.dataset.p)));

/* ═══ THEME ═══ */
window.toggleTheme = function toggleTheme(){
  document.body.classList.toggle('light');
  const isLight=document.body.classList.contains('light');
  document.getElementById('theme-btn').innerHTML=isLight?'<i class="ti ti-moon"></i>داكن':'<i class="ti ti-sun"></i>فاتح';
}

/* ═══ LANGUAGE ═══ */
window.toggleLang = function toggleLang(){
  window.LANG=window.LANG==='ar'?'en':'ar';
  document.getElementById('lang-btn').innerHTML=`<i class="ti ti-language"></i>${window.LANG==='ar'?'EN':'AR'}`;
  window.applyLang();renderAll();
}

/* ═══ AUTH ═══ */
window.login = async function login(){
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  const btn=document.getElementById('login-btn');
  if(!email||!pass){showErr('يرجى إدخال البريد وكلمة المرور');return;}
  btn.disabled=true;btn.innerHTML='<div class="spin"></div> جاري الدخول...';
  document.getElementById('login-err').classList.remove('show');
  const{data,error}=await SB.auth.signInWithPassword({email,password:pass});
  if(error){
    showErr('بريد إلكتروني أو كلمة مرور غير صحيحة');
    btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i> تسجيل الدخول';
    return;
  }
  CU=data.user;await afterLogin();
}
function showErr(msg){const el=document.getElementById('login-err');el.textContent=msg;el.classList.add('show');}

async function afterLogin(){
  const{data:role}=await SB.from('user_roles').select('*').eq('user_id',CU.id).single();
  CUR=role||{role:'viewer',full_name:CU.email};
  const r=CUR.role,ini=(CUR.full_name||CU.email).charAt(0).toUpperCase();
  document.getElementById('uav').textContent=ini;
  document.getElementById('uav').className='uav '+r;
  document.getElementById('uname').textContent=CUR.full_name||CU.email;
  document.getElementById('urole').textContent=ROLES[r]||r;
  applyPerms();window.applyLang();
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  await fetchRate();await loadAll();startClock();
}
window.logout = async function logout(){
  await SB.auth.signOut();CU=null;CUR=null;
  Object.keys(DB).forEach(k=>DB[k]=[]);
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('l-pass').value='';
  toast('تم تسجيل الخروج','inf');
}
function applyPerms(){
  ['btn-qrec','btn-qpay','btn-add-rec','btn-add-pay','btn-add-fam','btn-add-don','btn-add-rent'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=can.write()?'':'none';
  });
  const nu=document.getElementById('nb-users');if(nu)nu.style.display=can.manage()?'':'none';
}
async function checkSession(){
  const{data:{session}}=await SB.auth.getSession();
  if(session){CU=session.user;await afterLogin();}
}

/* ═══ DATA ═══ */
async function loadAll(){
  try{
    const[r1,r2,r3,r4,r5,r6,r7]=await Promise.all([
      SB.from('receipts').select('id,no,member_id,member_name,amount,currency,amount_usd,exchange_rate,fund,receipt_type,method,date,description,created_by_name,created_at').order('created_at',{ascending:false}),
      SB.from('payments').select('id,no,beneficiary,amount,currency,amount_usd,category,method,reason,date,approved_by,created_by_name,created_at').order('created_at',{ascending:false}),
      SB.from('family').select('id,name,phone,apartment,membership_fee,fee_period,subscription_type,subscription_status,annual_fee,notes,created_at').order('name'),
      SB.from('transactions').select('*'),
      SB.from('audit_log').select('id,action,description,user_name,created_at').order('created_at',{ascending:false}).limit(50),
      SB.from('donations').select('id,member_id,member_name,amount,currency,amount_ils,exchange_rate,date,notes,created_by_name,created_at').order('created_at',{ascending:false}),
      SB.from('rentals').select('id,tenant_name,tenant_type,member_id,event_date,start_time,end_time,amount,currency,amount_usd,paid_amount,status,notes,created_at').order('created_at',{ascending:false}),
    ]);
    DB.rec=r1.data||[];DB.pay=r2.data||[];DB.fam=r3.data||[];
    DB.tx=r4.data||[];DB.audit=r5.data||[];DB.donations=r6.data||[];DB.rentals=r7.data||[];
    renderAll();
  }catch(e){toast('خطأ في تحميل البيانات','err');console.error(e);}
}
window.loadAll=loadAll;
function renderAll(){
  renderDash();
  // فقط الصفحة الحالية
  const activePage = document.querySelector('.pg.on')?.id?.replace('pg-','');
  if(activePage==='rec')  D.rec.render();
  else if(activePage==='pay')  D.pay.render();
  else if(activePage==='fam')  D.fam.render();
  else if(activePage==='don')  D.don.render();
  else if(activePage==='rent') D.rent.render();
  else if(activePage==='rep')  renderRep();
  else if(activePage==='audit')renderAudit();
  fillStmtSel();fillMemDrop();
}

/* ═══ PAGE RENDERERS ═══ */
const D={
  rec:{render(){
    const q=(document.getElementById('q-rec')?.value||'').toLowerCase().trim();
    const fund=document.getElementById('f-rec-fund')?.value||'';
    const rtype=document.getElementById('f-rec-type')?.value||'';
    let d=DB.rec.map(r=>({...r,mname:gmn(r.member_id)}));
    if(q)d=d.filter(r=>(r.no+r.mname+(r.description||'')).toLowerCase().includes(q));
    if(fund)d=d.filter(r=>r.fund===fund);
    if(rtype)d=d.filter(r=>r.receipt_type===rtype);
    const sub=document.getElementById('rec-sub');
    if(sub){
      const totILS=d.reduce((s,r)=>s+Number(r.amount),0);
      const totUSD=d.filter(r=>r.currency==='USD').reduce((s,r)=>s+Number(r.amount_usd||0),0);
      sub.textContent=`${d.length} إيصال — ₪ ${fmt(totILS)}${totUSD?` | $${fmtD(totUSD)}`:''}`;
    }
    mkPag('rec',d.length);
    const page=d.slice((PS.rec-1)*PSZ,PS.rec*PSZ);
    const body=document.getElementById('rec-body');
    if(!page.length){body.innerHTML='<tr><td colspan="9"><div class="empty"><i class="ti ti-inbox"></i><p>لا توجد إيصالات</p></div></td></tr>';return;}
    body.innerHTML=page.map(r=>`<tr>
      <td><b>${esc(r.no)}</b></td>
      <td>${esc(r.mname)}</td>
      <td class='col-number' style="color:#00C896">₪ ${fmt(r.amount)}${r.currency==='USD'&&r.amount_usd?`<br><small style="color:var(--tx3)">$${fmtD(r.amount_usd)}</small>`:''}
      </td>
      <td><span class="badge ${r.fund==='food'?'warn':'inf'}">${r.fund==='food'?'صندوق الغداء':'صندوق الديوان'}</span></td>
      <td><span class="badge neu">${r.receipt_type==='donation'?'تبرع':r.receipt_type==='membership'?'مساهمة':'أخرى'}</span></td>
      <td style="color:var(--tx2)">${fdate(r.date)}</td>
      <td style="color:var(--tx3);font-size:11px">${esc(r.created_by_name||'—')}</td>
      <td class="tda">
        <button class="btn ghost sm" style="color:var(--inf)" onclick="prtRec('${r.id}')"><i class="ti ti-printer"></i></button>
        ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delRec('${r.id}')"><i class="ti ti-trash"></i></button>`:''}
      </td></tr>`).join('');
  }},
  pay:{render(){
    const q=(document.getElementById('q-pay')?.value||'').toLowerCase().trim();
    const cat=document.getElementById('f-pay-cat')?.value||'';
    let d=[...DB.pay];
    if(q)d=d.filter(p=>(p.no+p.beneficiary+(p.reason||'')).toLowerCase().includes(q));
    if(cat)d=d.filter(p=>p.category===cat);
    const sub=document.getElementById('pay-sub');
    if(sub){
      const totILS=d.reduce((s,p)=>s+Number(p.amount),0);
      const totUSD=d.filter(p=>p.currency==='USD').reduce((s,p)=>s+Number(p.amount_usd||0),0);
      sub.textContent=`${d.length} سند — ₪ ${fmt(totILS)}${totUSD?` | $${fmtD(totUSD)}`:''}`;
    }
    mkPag('pay',d.length);
    const page=d.slice((PS.pay-1)*PSZ,PS.pay*PSZ);
    const body=document.getElementById('pay-body');
    if(!page.length){body.innerHTML='<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i><p>لا توجد سندات</p></div></td></tr>';return;}
    const cats={general:'عام',maintenance:'صيانة',salaries:'رواتب',utilities:'فواتير',food:'غداء',other:'أخرى'};
    body.innerHTML=page.map(p=>`<tr>
      <td><b>${esc(p.no)}</b></td>
      <td>${esc(p.beneficiary)}</td>
      <td class='col-number' style="color:#EF4444">₪ ${fmt(p.amount)}${p.currency==='USD'&&p.amount_usd?`<br><small style="color:var(--tx3)">$${fmtD(p.amount_usd)}</small>`:''}
      </td>
      <td><span class="badge neu">${cats[p.category]||'عام'}</span></td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2)">${esc(p.reason||'—')}</td>
      <td style="color:var(--tx2)">${fdate(p.date)}</td>
      <td style="color:var(--tx3);font-size:11px">${esc(p.created_by_name||'—')}</td>
      <td class="tda">
        <button class="btn ghost sm" style="color:var(--inf)" onclick="prtPay('${p.id}')" title="طباعة"><i class="ti ti-printer"></i></button>
        ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delPay('${p.id}')"><i class="ti ti-trash"></i></button>`:''}
      </td>
    </tr>`).join('');
  }},
  fam:{render(){
    const q=(document.getElementById('q-fam')?.value||'').toLowerCase().trim();
    const st=document.getElementById('f-fam-s')?.value||'';
    let d=DB.fam.map(m=>({...m,bal:L.bal(m.id)}));
    if(q)d=d.filter(m=>m.name.includes(q)||(m.phone||'').includes(q));
    if(st==='cr')d=d.filter(m=>m.bal>0);
    else if(st==='dr')d=d.filter(m=>m.bal<0);
    const sub=document.getElementById('fam-sub');
    if(sub)sub.textContent=`${d.length} عضو — إجمالي المساهمات: ₪ ${fmt(d.reduce((s,m)=>s+m.bal,0))}`;
    mkPag('fam',d.length);
    const page=d.slice((PS.fam-1)*PSZ,PS.fam*PSZ);
    const body=document.getElementById('fam-body');
    if(!page.length){body.innerHTML='<tr><td colspan="8"><div class="empty"><i class="ti ti-users"></i><p>لا يوجد أعضاء</p></div></td></tr>';return;}
    const periods={yearly:'سنوي',biennial:'كل سنتين',once:'مرة واحدة'};
    body.innerHTML=page.map((m,i)=>{
      const b=m.bal,cls=b>0?'ok':b<0?'err':'neu',lbl=b>0?'مسدَّد':b<0?'متأخر':'صفر';
      return`<tr>
        <td style="color:var(--tx3)">${(PS.fam-1)*PSZ+i+1}</td>
        <td><b>${esc(m.name)}</b></td>
        <td style="color:var(--tx2)">${esc(m.phone||'—')}</td>
        <td style="font-weight:600;color:${b>=0?'var(--ok)':'var(--err)'};text-align:left">₪ ${fmt(b)}</td>
        <td style="color:var(--tx2)">${m.membership_fee?'₪ '+fmt(m.membership_fee):'-'}</td>
        <td style="color:var(--tx2);font-size:12px">${periods[m.fee_period]||'-'}</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
        <td class="tda">
          <button class="btn ghost sm" style="color:var(--inf)" onclick="goStmt('${m.id}')"><i class="ti ti-file-description"></i></button>
          ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delFam('${m.id}')"><i class="ti ti-trash"></i></button>`:''}
        </td></tr>`;
    }).join('');
  }},
  don:{render(){
    const q=(document.getElementById('q-don')?.value||'').toLowerCase().trim();
    let d=DB.donations.map(r=>({...r,mname:gmn(r.member_id)||r.member_name||'متبرع'}));
    if(q)d=d.filter(r=>(r.mname+(r.notes||'')).toLowerCase().includes(q));
    const sub=document.getElementById('don-sub');
    if(sub){
      const totILS=d.reduce((s,r)=>s+Number(r.amount_ils||r.amount),0);
      const totUSD=d.filter(r=>r.currency==='USD').reduce((s,r)=>s+Number(r.amount),0);
      sub.textContent=`${d.length} تبرع — ₪ ${fmt(totILS)}${totUSD?` | $${fmtD(totUSD)}`:''}`;
    }
    mkPag('don',d.length);
    const page=d.slice((PS.don-1)*PSZ,PS.don*PSZ);
    const body=document.getElementById('don-body');
    if(!page.length){body.innerHTML='<tr><td colspan="7"><div class="empty"><i class="ti ti-heart-off"></i><p>لا توجد تبرعات</p></div></td></tr>';return;}
    body.innerHTML=page.map(r=>`<tr>
      <td>${esc(r.mname)}</td>
      <td class='col-number' style="color:#00C896">₪ ${fmt(r.amount_ils||r.amount)}${r.currency==='USD'?`<br><small style="color:var(--tx3)">$${fmtD(r.amount)}</small>`:''}
      </td>
      <td style="color:var(--tx2);font-size:11px">${r.exchange_rate?`1$=₪${r.exchange_rate}`:'-'}</td>
      <td style="color:var(--tx2)">${fdate(r.date)}</td>
      <td style="color:var(--tx2)">${esc(r.notes||'—')}</td>
      <td style="color:var(--tx3);font-size:11px">${esc(r.created_by_name||'—')}</td>
      <td class="tda">${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delDon('${r.id}')"><i class="ti ti-trash"></i></button>`:''}</td>
    </tr>`).join('');
  }},
  rent:{render(){
    let d=[...DB.rentals];
    const sub=document.getElementById('rent-sub');
    if(sub)sub.textContent=`${d.length} عقد`;
    mkPag('rent',d.length);
    const page=d.slice((PS.rent-1)*PSZ,PS.rent*PSZ);
    const body=document.getElementById('rent-body');
    if(!page.length){body.innerHTML='<tr><td colspan="9"><div class="empty"><i class="ti ti-home-off"></i><p>لا توجد عقود</p></div></td></tr>';return;}
    const sm={pending:'warn',paid:'ok',partial:'inf',cancelled:'err'};
    const sl={pending:'معلق',paid:'مدفوع',partial:'جزئي',cancelled:'ملغى'};
    body.innerHTML=page.map(r=>`<tr>
      <td><b>${esc(r.tenant_name)}</b><br><small style="color:var(--tx3)">${r.tenant_type==='member'?'عضو':'خارجي'}</small></td>
      <td style="color:var(--tx2)">قاعة الديوان</td>
      <td style="color:var(--tx2)">${fdate(r.event_date)}</td>
      <td style="color:var(--tx2)">${r.start_time||'—'} - ${r.end_time||'—'}</td>
      <td class='col-number' style="color:#00C896">₪ ${fmt(r.amount)}${r.currency==='USD'&&r.amount_usd?`<br><small style="color:var(--tx3)">$${fmtD(r.amount_usd)}</small>`:''}
      </td>
      <td style="color:var(--ok)">₪ ${fmt(r.paid_amount)}</td>
      <td style="color:var(--err)">₪ ${fmt(r.amount-r.paid_amount)}</td>
      <td><span class="badge ${sm[r.status]||'neu'}">${sl[r.status]||r.status}</span></td>
      <td class="tda">
        ${can.write()?`<button class="btn ghost sm" style="color:var(--ok)" onclick="payRent('${r.id}')"><i class="ti ti-cash"></i></button>`:''}
        ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delRent('${r.id}')"><i class="ti ti-trash"></i></button>`:''}
      </td></tr>`).join('');
  }}
};

/* ═══ DASHBOARD ═══ */
function renderDash(){
  const ti=L.in(),to=L.out(),net=ti-to;
  const tb=DB.fam.reduce((s,m)=>s+L.bal(m.id),0);
  const foodIn=L.fundIn('food'),diwanIn=L.fundIn('diwan'),totDon=L.donTotal();
  const dd=document.getElementById('dash-date');
  if(dd)dd.textContent=new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('kpis').innerHTML=`
    <div class="kpi g"><i class="ti ti-trending-up kpi-ico"></i><div class="kpi-lbl">إجمالي الإيصالات</div><div class="kpi-val">₪ ${fmt(ti)}</div><div class="kpi-sub">${DB.rec.length} إيصال</div></div>
    <div class="kpi r"><i class="ti ti-trending-down kpi-ico"></i><div class="kpi-lbl">إجمالي المدفوعات</div><div class="kpi-val">₪ ${fmt(to)}</div><div class="kpi-sub">${DB.pay.length} سند</div></div>
    <div class="kpi ${net>=0?'g':'r'}"><i class="ti ti-scale kpi-ico"></i><div class="kpi-lbl">صافي الرصيد</div><div class="kpi-val">₪ ${fmt(net)}</div></div>
    <div class="kpi b"><i class="ti ti-building kpi-ico"></i><div class="kpi-lbl">صندوق الديوان</div><div class="kpi-val">₪ ${fmt(diwanIn)}</div></div>
    <div class="kpi o"><i class="ti ti-tools-kitchen-2 kpi-ico"></i><div class="kpi-lbl">صندوق الغداء</div><div class="kpi-val">₪ ${fmt(foodIn)}</div></div>
    <div class="kpi g"><i class="ti ti-heart kpi-ico"></i><div class="kpi-lbl">إجمالي التبرعات</div><div class="kpi-val">₪ ${fmt(totDon)}</div><div class="kpi-sub">${DB.donations.length} تبرع</div></div>
  `;
  const now=new Date();const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const v=DB.rec.filter(r=>r.date?.startsWith(k)).reduce((s,r)=>s+Number(r.amount),0);
    months.push({lbl:d.toLocaleDateString('ar-SA',{month:'short'}),v});
  }
  const maxV=Math.max(...months.map(m=>m.v),1);
  document.getElementById('month-chart').innerHTML=months.map(m=>`
    <div class="bc-wrap"><div class="bc-val">${m.v?'₪'+fmt(m.v):''}</div>
    <div class="bc-bar" style="height:${Math.max(4,Math.round(m.v/maxV*100))}px;background:${m.v?'var(--acc)':'var(--bg3)'}"></div>
    <div class="bc-lbl">${m.lbl}</div></div>`).join('');
  const fundData=[{lbl:'صندوق الديوان',v:diwanIn,c:'#1B6CA8'},{lbl:'صندوق الغداء',v:foodIn,c:'#DD6B20'},{lbl:'التبرعات',v:totDon,c:'#00C896'}];
  const maxF=Math.max(...fundData.map(f=>f.v),1);
  document.getElementById('dash-methods').innerHTML=fundData.map(f=>`
    <div class="h-bar"><span class="h-lbl">${f.lbl}</span>
    <div class="h-track"><div class="h-fill" style="width:${Math.round(f.v/maxF*100)}%;background:${f.c}">₪${fmt(f.v)}</div></div>
    <span class="h-val">₪ ${fmt(f.v)}</span></div>`).join('');
  const last5=DB.rec.slice(0,5);
  document.getElementById('dash-rec').innerHTML=last5.length
    ?last5.map(r=>`<div class="sr"><span class="sr-l">${esc(gmn(r.member_id))}<br><small style="color:var(--tx3)">${fdate(r.date)} · ${r.fund==='food'?'غداء':'ديوان'}</small></span><span class="sr-v" style="color:var(--ok)">₪ ${fmt(r.amount)}</span></div>`).join('')
    :'<div class="empty" style="padding:12px"><p>لا توجد إيصالات</p></div>';
  const debtors=[...DB.fam].map(m=>({...m,b:L.bal(m.id)})).filter(m=>m.b<0).sort((a,b)=>a.b-b.b).slice(0,5);
  document.getElementById('dash-balances').innerHTML=debtors.length
    ?debtors.map(m=>`<div class="sr"><span class="sr-l">${esc(m.name)}</span><span class="sr-v" style="color:var(--err)">₪ ${fmt(m.b)}</span></div>`).join('')
    :'<div class="empty" style="padding:12px"><p>كل الأعضاء ملتزمون ✅</p></div>';
  const qa=document.getElementById('dash-qa');
  if(qa)qa.innerHTML=`
    ${can.write()?`<button class="qa-btn g" onclick="openM('rec')"><i class="ti ti-receipt"></i><span>إيصال قبض جديد</span></button>`:''}
    ${can.write()?`<button class="qa-btn r" onclick="openM('pay')"><i class="ti ti-cash"></i><span>سند صرف جديد</span></button>`:''}
    ${can.write()?`<button class="qa-btn g" onclick="openM('don')"><i class="ti ti-heart"></i><span>تسجيل تبرع</span></button>`:''}
    <button class="qa-btn b" onclick="nav('stmt')"><i class="ti ti-file-description"></i><span>كشف حساب عضو</span></button>
    <button class="qa-btn b" onclick="nav('rep')"><i class="ti ti-chart-bar"></i><span>عرض التقارير</span></button>
  `;
}

/* ═══ STATEMENT ═══ */
function fillStmtSel(){
  const s=document.getElementById('stmt-sel');if(!s)return;
  s.innerHTML='<option value="">-- اختر --</option>'+DB.fam.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
}
function fillMemDrop(){
  ['r-mem','don-mem','rent-mem'].forEach(id=>{
    const s=document.getElementById(id);if(!s)return;
    s.innerHTML='<option value="">-- اختر عضواً --</option>'+DB.fam.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  });
}
window.renderStmt=function(){
  const id=document.getElementById('stmt-sel').value;
  const out=document.getElementById('stmt-out');
  if(!id){out.innerHTML='';return;}
  const m=gm(id);if(!m){out.innerHTML='';return;}
  const txs=L.txFor(id),bal=L.bal(id);
  const paid=txs.filter(t=>t.type==='cr').reduce((s,t)=>s+Number(t.amount),0);
  const memberDons=DB.donations.filter(d=>d.member_id===id);
  const totDon=memberDons.reduce((s,d)=>s+Number(d.amount_ils||d.amount),0);
  let run=0;
  const rows=txs.map(t=>{
    run+=t.type==='cr'?Number(t.amount):-Number(t.amount);
    return`<div class="lr"><span class="lr-d">${fdate(t.date)}</span><span class="lr-t">${esc(t.description||'—')}</span><span class="lr-c">${t.type==='cr'?'₪ '+fmt(t.amount):'—'}</span><span class="lr-dr2">${t.type==='dr'?'₪ '+fmt(t.amount):'—'}</span><span class="lr-b">₪ ${fmt(run)}</span></div>`;
  }).join('');
  const periods={yearly:'سنوي',biennial:'كل سنتين',once:'مرة واحدة'};
  out.innerHTML=`<div class="card">
    <div style="background:var(--pri);color:#fff;padding:14px;border-radius:var(--r);margin-bottom:16px">
      <div style="font-size:11px;opacity:.6">كشف حساب مساهمات</div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${esc(m.name)}</div>
    </div>
    <div class="kgrid" style="margin-bottom:16px">
      <div class="kpi ${bal>=0?'g':'r'}"><div class="kpi-lbl">رصيد المساهمات</div><div class="kpi-val">₪ ${fmt(bal)}</div></div>
      <div class="kpi g"><div class="kpi-lbl">إجمالي الدفعات</div><div class="kpi-val">₪ ${fmt(paid)}</div></div>
      <div class="kpi b"><div class="kpi-lbl">إجمالي التبرعات</div><div class="kpi-val">₪ ${fmt(totDon)}</div></div>
      <div class="kpi o"><div class="kpi-lbl">رسوم العضوية</div><div class="kpi-val">₪ ${fmt(m.membership_fee||0)}</div><div class="kpi-sub">${periods[m.fee_period]||''}</div></div>
    </div>
    <div style="display:flex;gap:6px;font-size:11px;font-weight:600;color:var(--tx3);padding:6px 0;border-bottom:1px solid var(--bd);margin-bottom:4px">
      <span style="min-width:88px">التاريخ</span><span style="flex:1">البيان</span>
      <span style="min-width:75px">دائن</span><span style="min-width:75px">مدين</span><span style="min-width:75px">الرصيد</span>
    </div>
    <div class="scroll">${rows||'<div class="empty" style="padding:16px"><p>لا توجد حركات</p></div>'}</div>
    ${memberDons.length?`<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)">
      <div style="font-size:12px;font-weight:600;color:var(--tx3);margin-bottom:8px">التبرعات (منفصلة عن المساهمات)</div>
      ${memberDons.map(d=>`<div class="sr"><span class="sr-l">${fdate(d.date)} — ${esc(d.notes||'تبرع')}</span><span class="sr-v" style="color:var(--ok)">₪ ${fmt(d.amount_ils||d.amount)}</span></div>`).join('')}
    </div>`:''}
  </div>`;
};
window.goStmt=id=>{nav('stmt');setTimeout(()=>{document.getElementById('stmt-sel').value=id;window.renderStmt();},80);};

/* ═══ REPORTS ═══ */
function renderRep(){
  const ti=L.in(),to=L.out(),net=ti-to;
  const foodIn=L.fundIn('food'),diwanIn=L.fundIn('diwan'),totDon=L.donTotal();
  document.getElementById('rep-kpis').innerHTML=`
    <div class="kpi g"><div class="kpi-lbl">إجمالي الإيصالات</div><div class="kpi-val">₪ ${fmt(ti)}</div></div>
    <div class="kpi r"><div class="kpi-lbl">إجمالي المدفوعات</div><div class="kpi-val">₪ ${fmt(to)}</div></div>
    <div class="kpi ${net>=0?'g':'r'}"><div class="kpi-lbl">الصافي</div><div class="kpi-val">₪ ${fmt(net)}</div></div>
    <div class="kpi b"><div class="kpi-lbl">صندوق الديوان</div><div class="kpi-val">₪ ${fmt(diwanIn)}</div></div>
    <div class="kpi o"><div class="kpi-lbl">صندوق الغداء</div><div class="kpi-val">₪ ${fmt(foodIn)}</div></div>
    <div class="kpi g"><div class="kpi-lbl">التبرعات</div><div class="kpi-val">₪ ${fmt(totDon)}</div></div>
  `;
  const cats={general:'عام',maintenance:'صيانة',salaries:'رواتب',utilities:'فواتير',food:'غداء',other:'أخرى'};
  const catTotals={};
  DB.pay.forEach(p=>{const c=p.category||'general';catTotals[c]=(catTotals[c]||0)+Number(p.amount);});
  const COLS=['#E53E3E','#DD6B20','#1B6CA8','#00C896','#6D28D9','#0284C7'];
  const maxC=Math.max(...Object.values(catTotals),1);
  document.getElementById('rep-methods').innerHTML=Object.entries(catTotals).map(([c,v],i)=>`
    <div class="h-bar"><span class="h-lbl">${cats[c]||c}</span>
    <div class="h-track"><div class="h-fill" style="width:${Math.round(v/maxC*100)}%;background:${COLS[i%6]}">${Math.round(v/maxC*100)}%</div></div>
    <span class="h-val">₪ ${fmt(v)}</span></div>`).join('')||'<div class="empty"><p>لا توجد بيانات</p></div>';
  const sorted=[...DB.fam].map(m=>({...m,b:L.bal(m.id)})).sort((a,b)=>a.b-b.b);
  document.getElementById('rep-fam-body').innerHTML=sorted.map(m=>{
    const cls=m.b>0?'ok':m.b<0?'err':'neu',lbl=m.b>0?'مسدَّد':m.b<0?'متأخر':'صفر';
    return`<tr><td>${esc(m.name)}</td><td style="text-align:left;color:${m.b>=0?'var(--ok)':'var(--err)'}">₪ ${fmt(m.b)}</td><td>${m.membership_fee?'₪ '+fmt(m.membership_fee):'-'}</td><td><span class="badge ${cls}">${lbl}</span></td></tr>`;
  }).join('');
}

/* ═══ AUDIT ═══ */
function renderAudit(){
  const list=document.getElementById('audit-list');
  if(!DB.audit.length){list.innerHTML='<div class="empty"><i class="ti ti-clipboard-list"></i><p>السجل فارغ</p></div>';return;}
  list.innerHTML=DB.audit.map(a=>`<div class="ae">
    <div class="audit-dot ${a.action==='add'?'add':a.action==='delete'?'delete':'system'}"><i class="ti ${a.action==='add'?'ti-plus':a.action==='delete'?'ti-trash':'ti-settings'}"></i></div>
    <div style="flex:1"><div style="font-size:13px;font-weight:500">${esc(a.description)}</div>
    <div style="font-size:11px;color:var(--tx3);margin-top:2px">${esc(a.user_name||'—')} · ${fdate(a.created_at)}</div></div>
  </div>`).join('');
}
function renderSysInfo(){
  const totUSD=DB.rec.filter(r=>r.currency==='USD').reduce((s,r)=>s+Number(r.amount_usd||0),0);
  const payUSD=DB.pay.filter(p=>p.currency==='USD').reduce((s,p)=>s+Number(p.amount_usd||0),0);
  document.getElementById('sys-info').innerHTML=`
    <div class="sr"><span class="sr-l">عدد الإيصالات</span><span class="sr-v">${DB.rec.length}</span></div>
    <div class="sr"><span class="sr-l">عدد سندات الصرف</span><span class="sr-v">${DB.pay.length}</span></div>
    <div class="sr"><span class="sr-l">عدد الأعضاء</span><span class="sr-v">${DB.fam.length}</span></div>
    <div class="sr"><span class="sr-l">عدد التبرعات</span><span class="sr-v">${DB.donations.length}</span></div>
    <div class="sr"><span class="sr-l">عدد عقود الإيجار</span><span class="sr-v">${DB.rentals.length}</span></div>
    <div class="sr"><span class="sr-l">إجمالي دولار مُستلم</span><span class="sr-v">$${fmtD(totUSD)}</span></div>
    <div class="sr"><span class="sr-l">إجمالي دولار مصروف</span><span class="sr-v">$${fmtD(payUSD)}</span></div>
    <div class="sr"><span class="sr-l">سعر الصرف اليوم</span><span class="sr-v">${USD_RATE?`1$ = ₪${USD_RATE.toFixed(2)}`:'—'}</span></div>
    <div class="sr"><span class="sr-l">المستخدم الحالي</span><span class="sr-v">${esc(CUR?.full_name||CU?.email||'—')}</span></div>
  `;
}

/* ═══ USERS ═══ */
async function loadUsers(){
  if(!can.manage())return;
  const{data}=await SB.from('user_roles').select('*').order('created_at');
  const list=document.getElementById('users-list');
  if(!data?.length){list.innerHTML='<div class="empty"><p>لا يوجد مستخدمون</p></div>';return;}
  const BG={admin:'linear-gradient(135deg,#6D28D9,#4F46E5)',accountant:'linear-gradient(135deg,#059669,#0D9488)',viewer:'linear-gradient(135deg,#1B6CA8,#0284C7)'};
  list.innerHTML=data.map(u=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;background:var(--bg2)">
      <div style="width:38px;height:38px;border-radius:50%;background:${BG[u.role]||'#475569'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:#fff;flex-shrink:0">${(u.full_name||'م').charAt(0).toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:500">${esc(u.full_name||'—')}</div><div style="font-size:11px;color:var(--tx3)">${u.user_id}</div></div>
      <span class="role-tag ${u.role}">${ROLES[u.role]}</span>
      ${u.user_id!==CU?.id
        ?`<select onchange="changeRole('${u.user_id}',this.value)" style="padding:5px 8px;border-radius:var(--r);border:1px solid var(--bd2);background:var(--bg2);color:var(--tx);font-size:12px;font-family:var(--fn)"><option value="viewer" ${u.role==='viewer'?'selected':''}>عارض</option><option value="accountant" ${u.role==='accountant'?'selected':''}>محاسب</option><option value="admin" ${u.role==='admin'?'selected':''}>مدير</option></select>`
        :'<span style="font-size:11px;color:var(--tx3)">(أنت)</span>'}
    </div>`).join('');
}
window.changeRole=async(uid,role)=>{
  await SB.from('user_roles').update({role}).eq('user_id',uid);
  await log('edit',`تغيير دور المستخدم إلى ${ROLES[role]}`);
  toast(`تم تغيير الدور إلى ${ROLES[role]}`,'ok');loadUsers();
};
window.inviteUser=async()=>{
  const email=document.getElementById('inv-email').value.trim();
  const pass=document.getElementById('inv-pass').value;
  const role=document.getElementById('inv-role').value;
  const name=document.getElementById('inv-name').value.trim();
  if(!email||!pass){toast('البريد وكلمة المرور مطلوبان','warn');return;}
  const{data,error}=await SB.auth.signUp({email,password:pass});
  if(error){toast('خطأ: '+error.message,'err');return;}
  await SB.from('user_roles').upsert({user_id:data.user.id,role,full_name:name||email});
  await log('add',`إضافة مستخدم: ${name||email} (${ROLES[role]})`);
  closeM();toast(`تم إنشاء حساب ${email}`,'ok');loadUsers();
};

/* ═══ MODAL ═══ */
window.openM=type=>{
  document.getElementById('modal-overlay').classList.add('open');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.getElementById('m-'+type).style.display='block';
  fillMemDrop();
  ['r-dat','p-dat','don-dat','rent-dat'].forEach(id=>{const e=document.getElementById(id);if(e&&!e.value)e.value=today();});
  if(!USD_RATE)fetchRate();else updateRateDisplay();
  toggleCurrency('r');toggleCurrency('p');toggleCurrency('don');toggleCurrency('rent');
};
window.closeM=()=>{
  document.getElementById('modal-overlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.querySelectorAll('.fi input,.fi select,.fi textarea').forEach(el=>{
    el.classList.remove('er');
    if(el.type!=='date'&&el.tagName!=='SELECT')el.value='';
    if(el.type==='number')el.value=el.defaultValue||'';
  });
  document.querySelectorAll('.fe').forEach(e=>e.classList.remove('open'));
  document.querySelectorAll('.pills .pill').forEach(p=>p.classList.remove('show'));
  document.querySelectorAll('.pills .pill:first-child').forEach(p=>p.classList.add('on'));
  ['r-mth','p-mth'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='نقد';});
};
window.setPill=(prefix,val,el)=>{
  document.getElementById(prefix+'-pills')?.querySelectorAll('.pill').forEach(p=>p.classList.remove('open'));
  el.classList.add('on');document.getElementById(prefix+'-mth').value=val;
};
window.toggleCurrency=prefix=>{
  const curEl=document.getElementById(prefix+'-currency');if(!curEl)return;
  const isUSD=curEl.value==='USD';
  ['usd-row','ils-row','rate-row'].forEach(s=>{
    const el=document.getElementById(prefix+'-'+s);if(el)el.style.display=isUSD?'':'none';
  });
  if(isUSD)calcILS(prefix);
};
window.onAmtUSD=prefix=>calcILS(prefix);
window.toggleTenantType=()=>{
  const t=document.getElementById('rent-ttype')?.value;
  const memRow=document.getElementById('rent-mem-row');
  const nameRow=document.getElementById('rent-name-row');
  if(memRow)memRow.style.display=t==='member'?'':'none';
  if(nameRow)nameRow.style.display=t==='other'?'':'none';
};

/* ═══ LOG ═══ */
async function log(action,desc){
  await SB.from('audit_log').insert({user_name:CUR?.full_name||CU?.email,action,description:desc});
}

/* ═══ SAVE — RECEIPT ═══ */
window.saveRec=async(prt=false)=>{
  if(!can.write()){toast('ليس لديك صلاحية','err');return;}
  const mid=document.getElementById('r-mem').value;
  const cur=document.getElementById('r-currency').value;
  const isUSD=cur==='USD';
  const amtUSD=parseFloat(document.getElementById('r-amt-usd')?.value)||0;
  const amtILS=parseFloat(isUSD?document.getElementById('r-amt-ils')?.value:document.getElementById('r-amt')?.value)||0;
  const dat=document.getElementById('r-dat').value;
  const fund=document.getElementById('r-fund').value;
  const rtype=document.getElementById('r-type').value;
  const v1=vf('r-mem',v=>!!v,'e-r-mem');
  const v2=isUSD?vf('r-amt-usd',v=>+v>0,'e-r-amt'):vf('r-amt',v=>+v>=1,'e-r-amt');
  const v3=vf('r-dat',v=>!!v,'e-r-dat');
  if(!v1||!v2||!v3)return;
  const finalAmt=amtILS||amtUSD;
  const no='REC-'+String(DB.rec.length+1).padStart(5,'0');
  const{data,error}=await SB.from('receipts').insert({
    no,member_id:mid||null,member_name:mid?gmn(mid):'',
    amount:finalAmt,currency:cur,
    amount_usd:isUSD?amtUSD:null,exchange_rate:isUSD?USD_RATE:null,
    method:document.getElementById('r-mth').value||'نقد',
    date:dat,fund,receipt_type:rtype,
    receiver:document.getElementById('r-rcv').value,
    description:document.getElementById('r-dsc').value,
    created_by_name:CUR?.full_name||CU?.email,
  }).select().single();
  if(error){toast('خطأ: '+error.message,'err');return;}
  if(rtype==='membership'&&mid){
    await SB.from('transactions').insert({
      member_id:mid,amount:finalAmt,type:'cr',ref_id:data.id,
      description:`${fund==='food'?'صندوق الغداء':'صندوق الديوان'} — ${data.description||'مساهمة'}`,date:dat,
    });
  }
  await log('add',`إضافة إيصال ${no} — ${mid?gmn(mid):''} — ₪${fmt(finalAmt)}${isUSD?` ($${fmtD(amtUSD)})`:''}`);
  closeM();await loadAll();toast(`✓ تم حفظ ${no}`,'ok');
  if(prt)setTimeout(()=>prtRec(data.id),300);
};

/* ═══ SAVE — PAYMENT ═══ */
window.savePay=async()=>{
  if(!can.write()){toast('ليس لديك صلاحية','err');return;}
  const ben=document.getElementById('p-ben').value;
  const cur=document.getElementById('p-currency').value;
  const isUSD=cur==='USD';
  const amtUSD=parseFloat(document.getElementById('p-amt-usd')?.value)||0;
  const amtILS=parseFloat(isUSD?document.getElementById('p-amt-ils')?.value:document.getElementById('p-amt')?.value)||0;
  const rsn=document.getElementById('p-rsn').value;
  const v1=vf('p-ben',v=>v.trim().length>=2,'e-p-ben');
  const v2=isUSD?vf('p-amt-usd',v=>+v>0,'e-p-amt'):vf('p-amt',v=>+v>=1,'e-p-amt');
  const v3=vf('p-rsn',v=>v.trim().length>=2,'e-p-rsn');
  if(!v1||!v2||!v3)return;
  const finalAmt=amtILS||amtUSD;
  const no='PAY-'+String(DB.pay.length+1).padStart(5,'0');
  const{error}=await SB.from('payments').insert({
    no,beneficiary:ben,amount:finalAmt,currency:cur,
    amount_usd:isUSD?amtUSD:null,exchange_rate:isUSD?USD_RATE:null,
    method:document.getElementById('p-mth').value||'نقد',
    date:document.getElementById('p-dat').value,
    approved_by:document.getElementById('p-apv').value,
    reason:rsn,category:document.getElementById('p-cat').value||'general',
    created_by_name:CUR?.full_name||CU?.email,
  });
  if(error){toast('خطأ: '+error.message,'err');return;}
  await log('add',`إضافة سند ${no} — ${ben} — ₪${fmt(finalAmt)}${isUSD?` ($${fmtD(amtUSD)})`:''}`);
  closeM();await loadAll();toast(`✓ تم حفظ ${no}`,'ok');
};

/* ═══ SAVE — DONATION ═══ */
window.saveDon=async()=>{
  if(!can.write()){toast('ليس لديك صلاحية','err');return;}
  const mid=document.getElementById('don-mem').value;
  const donName=document.getElementById('don-name')?.value||'متبرع';
  const cur=document.getElementById('don-currency').value;
  const isUSD=cur==='USD';
  const amtUSD=parseFloat(document.getElementById('don-amt-usd')?.value)||0;
  const amtILS=parseFloat(isUSD?document.getElementById('don-amt-ils')?.value:document.getElementById('don-amt')?.value)||0;
  const dat=document.getElementById('don-dat').value;
  if(!dat){toast('التاريخ مطلوب','warn');return;}
  if(amtILS<1&&amtUSD<0.01){toast('أدخل مبلغاً صحيحاً','warn');return;}
  const{error}=await SB.from('donations').insert({
    member_id:mid||null,
    member_name:mid?gmn(mid):donName,
    amount:isUSD?amtUSD:amtILS,
    currency:cur,amount_ils:amtILS,
    exchange_rate:isUSD?USD_RATE:null,
    date:dat,notes:document.getElementById('don-notes').value,
    created_by_name:CUR?.full_name||CU?.email,
  });
  if(error){toast('خطأ: '+error.message,'err');return;}
  await log('add',`تسجيل تبرع — ${mid?gmn(mid):donName} — ₪${fmt(amtILS)}${isUSD?` ($${fmtD(amtUSD)})`:''}`);
  closeM();await loadAll();toast('✓ تم تسجيل التبرع','ok');
};

/* ═══ SAVE — FAMILY ═══ */
window.saveFam=async()=>{
  if(!can.manage()){toast('ليس لديك صلاحية','err');return;}
  const nm=document.getElementById('f-nm').value;
  if(!vf('f-nm',v=>v.trim().length>=2,'e-f-nm'))return;
  if(DB.fam.find(m=>m.name.trim()===nm.trim())){toast('يوجد عضو بنفس الاسم','warn');return;}
  const bal=+document.getElementById('f-bal').value||0;
  const fee=+document.getElementById('f-fee').value||0;
  const period=document.getElementById('f-period').value||'yearly';
  const{data,error}=await SB.from('family').insert({
    name:nm.trim(),phone:document.getElementById('f-ph').value,
    apartment:document.getElementById('f-ap').value,
    membership_fee:fee,fee_period:period,
    notes:document.getElementById('f-nt').value,
  }).select().single();
  if(error){toast('خطأ: '+error.message,'err');return;}
  if(bal!==0)await SB.from('transactions').insert({
    member_id:data.id,amount:Math.abs(bal),type:bal>0?'cr':'dr',
    description:'رصيد افتتاحي',date:today(),
  });
  await log('add',`إضافة عضو: ${nm} — رسوم: ₪${fmt(fee)} (${period})`);
  closeM();await loadAll();toast(`✓ تمت إضافة ${nm}`,'ok');
};

/* ═══ SAVE — RENTAL ═══ */
window.saveRent=async()=>{
  if(!can.write()){toast('ليس لديك صلاحية','err');return;}
  const ttype=document.getElementById('rent-ttype').value;
  const mid=document.getElementById('rent-mem').value;
  const tname=ttype==='member'?gmn(mid):document.getElementById('rent-tname')?.value;
  if(!tname||tname==='—'){toast('أدخل اسم المستأجر','warn');return;}
  const cur=document.getElementById('rent-currency').value;
  const isUSD=cur==='USD';
  const amtUSD=parseFloat(document.getElementById('rent-amt-usd')?.value)||0;
  const amtILS=parseFloat(isUSD?document.getElementById('rent-amt-ils')?.value:document.getElementById('rent-amt')?.value)||0;
  if(amtILS<1&&amtUSD<0.01){toast('أدخل مبلغاً صحيحاً','warn');return;}
  const{error}=await SB.from('rentals').insert({
    tenant_name:tname,tenant_type:ttype,
    member_id:ttype==='member'?mid:null,
    hall:'قاعة الديوان',
    event_date:document.getElementById('rent-dat').value,
    start_time:document.getElementById('rent-start').value,
    end_time:document.getElementById('rent-end').value,
    amount:amtILS,currency:cur,
    amount_usd:isUSD?amtUSD:null,exchange_rate:isUSD?USD_RATE:null,
    paid_amount:+document.getElementById('rent-paid').value||0,
    status:document.getElementById('rent-status').value||'pending',
    notes:document.getElementById('rent-notes').value,
    created_by_name:CUR?.full_name||CU?.email,
  });
  if(error){toast('خطأ: '+error.message,'err');return;}
  await log('add',`عقد إيجار قاعة الديوان: ${tname} — ₪${fmt(amtILS)}`);
  closeM();await loadAll();toast(`✓ تم حفظ عقد ${tname}`,'ok');
};

window.payRent=async id=>{
  if(!can.write()){toast('ليس لديك صلاحية','err');return;}
  const r=DB.rentals.find(x=>x.id===id);if(!r)return;
  const remaining=r.amount-r.paid_amount;
  const amt=prompt(`المبلغ المتبقي: ₪${fmt(remaining)}\nأدخل مبلغ الدفعة:`);
  if(!amt||isNaN(+amt))return;
  const newPaid=Math.min(r.paid_amount+Number(amt),r.amount);
  await SB.from('rentals').update({paid_amount:newPaid,status:newPaid>=r.amount?'paid':'partial'}).eq('id',id);
  await log('edit',`دفعة إيجار: ${r.tenant_name} — ₪${fmt(amt)}`);
  await loadAll();toast('✓ تم تسجيل الدفعة','ok');
};

/* ═══ DELETE ═══ */
window.delRec=async id=>{
  if(!can.delete()){toast('ليس لديك صلاحية الحذف','err');return;}
  const r=DB.rec.find(x=>x.id===id);
  if(!r||!confirm(`حذف إيصال ${r.no}؟`))return;
  await SB.from('transactions').delete().eq('ref_id',id);
  await SB.from('receipts').delete().eq('id',id);
  await log('delete',`حذف إيصال ${r.no}`);
  await loadAll();toast(`حُذف ${r.no}`,'warn');
};
window.delPay=async id=>{
  if(!can.delete()){toast('ليس لديك صلاحية الحذف','err');return;}
  const p=DB.pay.find(x=>x.id===id);
  if(!p||!confirm(`حذف سند ${p.no}؟`))return;
  await SB.from('payments').delete().eq('id',id);
  await log('delete',`حذف سند ${p.no}`);
  await loadAll();toast(`حُذف ${p.no}`,'warn');
};
window.delFam=async id=>{
  if(!can.delete()){toast('ليس لديك صلاحية الحذف','err');return;}
  const m=gm(id);
  if(!m||!confirm(`حذف العضو ${m.name}؟`))return;
  await SB.from('transactions').delete().eq('member_id',id);
  await SB.from('family').delete().eq('id',id);
  await log('delete',`حذف عضو: ${m.name}`);
  await loadAll();toast(`حُذف ${m.name}`,'warn');
};
window.delDon=async id=>{
  if(!can.delete()){toast('ليس لديك صلاحية الحذف','err');return;}
  if(!confirm('حذف هذا التبرع؟'))return;
  await SB.from('donations').delete().eq('id',id);
  await log('delete','حذف تبرع');
  await loadAll();toast('تم حذف التبرع','warn');
};
window.delRent=async id=>{
  if(!can.delete()){toast('ليس لديك صلاحية الحذف','err');return;}
  if(!confirm('حذف هذا العقد؟'))return;
  await SB.from('rentals').delete().eq('id',id);
  await log('delete','حذف عقد إيجار');
  await loadAll();toast('تم حذف العقد','warn');
};

/* ═══ PRINT ═══ */
window.prtRec=id=>{
  const r=DB.rec.find(x=>x.id===id);if(!r)return;
  const fundLabel=r.fund==='food'?'صندوق الغداء':'صندوق الديوان';
  const typeLabel=r.receipt_type==='donation'?'تبرع':r.receipt_type==='membership'?'مساهمة':'أخرى';
  const html=`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>إيصال ${esc(r.no)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .doc{background:#fff;max-width:380px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}
  .doc-header{background:#0A1628;padding:20px 24px;text-align:center;position:relative}
  .doc-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#00C896,#059669)}
  .doc-org{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
  .doc-sub{font-size:12px;color:rgba(255,255,255,.6)}
  .doc-badge{display:inline-block;margin-top:10px;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(0,200,150,.2);color:#00C896;border:1px solid rgba(0,200,150,.3)}
  .doc-no{font-size:22px;font-weight:700;color:#fff;margin-top:8px;letter-spacing:1px}
  .doc-body{padding:20px 24px}
  .doc-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .doc-row:last-of-type{border-bottom:none}
  .doc-row-label{color:#666;font-weight:400}
  .doc-row-value{font-weight:600;color:#0A1628;text-align:left}
  .doc-amount{background:linear-gradient(135deg,#0A1628,#1B6CA8);margin:16px 24px;border-radius:10px;padding:16px;text-align:center}
  .doc-amount-label{font-size:11px;color:rgba(255,255,255,.6);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase}
  .doc-amount-value{font-size:32px;font-weight:700;color:#00C896;letter-spacing:-1px}
  ${r.currency==='USD'?`.doc-amount-usd{font-size:14px;color:rgba(255,255,255,.7);margin-top:4px}`:''}
  .doc-sigs{display:flex;justify-content:space-between;padding:16px 24px 8px;gap:16px}
  .doc-sig{flex:1;text-align:center;padding-top:32px;border-top:1px dashed #ccc;font-size:11px;color:#999}
  .doc-footer{background:#f9f9f9;padding:12px 24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee}
  .fund-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600}
  .fund-diwan{background:#EFF6FF;color:#1B6CA8}
  .fund-food{background:#FFFBEB;color:#D97706}
  .type-badge{display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600}
  .type-membership{background:#ECFDF5;color:#059669}
  .type-donation{background:#FEF3C7;color:#D97706}
  .type-other{background:#F3F4F6;color:#6B7280}
  @media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0;max-width:100%}}
</style>
</head>
<body>
<div class="doc">
  <div class="doc-header">
    <div class="doc-org">ديوان آل طه</div>
    <div class="doc-sub">نظام الإدارة المالية</div>
    <div class="doc-badge">سند قبض</div>
    <div class="doc-no">${esc(r.no)}</div>
  </div>
  <div class="doc-amount">
    <div class="doc-amount-label">المبلغ المستلم</div>
    <div class="doc-amount-value">₪ ${fmt(r.amount)}</div>
    ${r.currency==='USD'?`<div class="doc-amount-usd">$${fmtD(r.amount_usd)} × ₪${r.exchange_rate?.toFixed(2)}</div>`:''}
  </div>
  <div class="doc-body">
    <div class="doc-row"><span class="doc-row-label">التاريخ</span><span class="doc-row-value">${fdate(r.date)}</span></div>
    <div class="doc-row"><span class="doc-row-label">اسم العضو</span><span class="doc-row-value">${esc(gmn(r.member_id))}</span></div>
    <div class="doc-row"><span class="doc-row-label">الصندوق</span><span class="doc-row-value"><span class="fund-badge ${r.fund==='food'?'fund-food':'fund-diwan'}">${fundLabel}</span></span></div>
    <div class="doc-row"><span class="doc-row-label">نوع الإيصال</span><span class="doc-row-value"><span class="type-badge type-${r.receipt_type||'other'}">${typeLabel}</span></span></div>
    <div class="doc-row"><span class="doc-row-label">طريقة الدفع</span><span class="doc-row-value">${esc(r.method||'—')}</span></div>
    ${r.description?`<div class="doc-row"><span class="doc-row-label">البيان</span><span class="doc-row-value" style="max-width:180px;text-align:left">${esc(r.description)}</span></div>`:''}
  </div>
  <div class="doc-sigs">
    <div class="doc-sig">توقيع المستلم</div>
    <div class="doc-sig">توقيع الدافع</div>
  </div>
  <div class="doc-footer">
    All rights reserved © 2026-2027 | Diwan Al-Taha Financial Management System<br>
    طُبع بتاريخ ${new Date().toLocaleDateString('ar-SA')} — ${new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
  </div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body>
</html>`;
  const win=window.open('','_blank','width=480,height=700,scrollbars=yes');
  if(win){win.document.write(html);win.document.close();}
  else{toast('يرجى السماح بالنوافذ المنبثقة في المتصفح','warn');}
};

/* ═══ BACKUP ═══ */

window.prtPay=id=>{
  const p=DB.pay.find(x=>x.id===id);if(!p)return;
  const cats={general:'عام',maintenance:'صيانة',salaries:'رواتب',utilities:'فواتير',food:'غداء',other:'أخرى'};
  const catLabel=cats[p.category]||p.category||'عام';
  const html=`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>سند صرف ${esc(p.no)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .doc{background:#fff;max-width:380px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}
  .doc-header{background:#1A0A0A;padding:20px 24px;text-align:center;position:relative}
  .doc-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#DC2626,#B91C1C)}
  .doc-org{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
  .doc-sub{font-size:12px;color:rgba(255,255,255,.6)}
  .doc-badge{display:inline-block;margin-top:10px;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(220,38,38,.25);color:#FCA5A5;border:1px solid rgba(220,38,38,.4)}
  .doc-no{font-size:22px;font-weight:700;color:#fff;margin-top:8px;letter-spacing:1px}
  .doc-body{padding:20px 24px}
  .doc-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .doc-row:last-of-type{border-bottom:none}
  .doc-row-label{color:#666;font-weight:400}
  .doc-row-value{font-weight:600;color:#0A1628;text-align:left}
  .doc-amount{background:linear-gradient(135deg,#1A0A0A,#7F1D1D);margin:16px 24px;border-radius:10px;padding:16px;text-align:center}
  .doc-amount-label{font-size:11px;color:rgba(255,255,255,.6);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase}
  .doc-amount-value{font-size:32px;font-weight:700;color:#FCA5A5;letter-spacing:-1px}
  .doc-amount-usd{font-size:14px;color:rgba(255,255,255,.7);margin-top:4px}
  .doc-sigs{display:flex;justify-content:space-between;padding:16px 24px 8px;gap:16px}
  .doc-sig{flex:1;text-align:center;padding-top:32px;border-top:1px dashed #ccc;font-size:11px;color:#999}
  .doc-footer{background:#f9f9f9;padding:12px 24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee}
  .cat-badge{display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#FEF2F2;color:#DC2626}
  @media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0;max-width:100%}}
</style>
</head>
<body>
<div class="doc">
  <div class="doc-header">
    <div class="doc-org">ديوان آل طه</div>
    <div class="doc-sub">نظام الإدارة المالية</div>
    <div class="doc-badge">سند صرف</div>
    <div class="doc-no">${esc(p.no)}</div>
  </div>
  <div class="doc-amount">
    <div class="doc-amount-label">المبلغ المصروف</div>
    <div class="doc-amount-value">₪ ${fmt(p.amount)}</div>
    ${p.currency==='USD'&&p.amount_usd?`<div class="doc-amount-usd">$${fmtD(p.amount_usd)} × ₪${p.exchange_rate?.toFixed(2)}</div>`:''}
  </div>
  <div class="doc-body">
    <div class="doc-row"><span class="doc-row-label">التاريخ</span><span class="doc-row-value">${fdate(p.date)}</span></div>
    <div class="doc-row"><span class="doc-row-label">المستفيد</span><span class="doc-row-value">${esc(p.beneficiary)}</span></div>
    <div class="doc-row"><span class="doc-row-label">فئة المصروف</span><span class="doc-row-value"><span class="cat-badge">${catLabel}</span></span></div>
    <div class="doc-row"><span class="doc-row-label">طريقة الصرف</span><span class="doc-row-value">${esc(p.method||'—')}</span></div>
    ${p.approved_by?`<div class="doc-row"><span class="doc-row-label">معتمد من</span><span class="doc-row-value">${esc(p.approved_by)}</span></div>`:''}
    ${p.reason?`<div class="doc-row"><span class="doc-row-label">السبب</span><span class="doc-row-value" style="max-width:180px;text-align:left">${esc(p.reason)}</span></div>`:''}
    <div class="doc-row"><span class="doc-row-label">بواسطة</span><span class="doc-row-value">${esc(p.created_by_name||'—')}</span></div>
  </div>
  <div class="doc-sigs">
    <div class="doc-sig">المستلم</div>
    <div class="doc-sig">المعتمد</div>
    <div class="doc-sig">المحاسب</div>
  </div>
  <div class="doc-footer">
    All rights reserved © 2026-2027 | Diwan Al-Taha Financial Management System<br>
    طُبع بتاريخ ${new Date().toLocaleDateString('ar-SA')} — ${new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
  </div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body>
</html>\`;
  const win=window.open('','_blank','width=480,height=700,scrollbars=yes');
  if(win){win.document.write(html);win.document.close();}
  else{toast('يرجى السماح بالنوافذ المنبثقة في المتصفح','warn');}
};

window.doBackup=()=>{
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`diwan_backup_${today()}.json`;a.click();
  toast('تم تصدير النسخة الاحتياطية','ok');
};
window.exportCSV=type=>{
  let h,r;
  if(type==='rec'){
    h=['رقم','العضو','₪','العملة','$','سعر الصرف','الصندوق','النوع','التاريخ'];
    r=DB.rec.map(x=>[x.no,gmn(x.member_id),x.amount,x.currency,x.amount_usd||'',x.exchange_rate||'',x.fund==='food'?'غداء':'ديوان',x.receipt_type,x.date]);
  }else if(type==='pay'){
    h=['رقم','المستفيد','₪','العملة','$','الفئة','السبب','التاريخ'];
    r=DB.pay.map(x=>[x.no,x.beneficiary,x.amount,x.currency,x.amount_usd||'',x.category,x.reason,x.date]);
  }else if(type==='fam'){
    h=['الاسم','الهاتف','رصيد المساهمات','رسوم العضوية','فترة الدفع'];
    r=DB.fam.map(m=>[m.name,m.phone,L.bal(m.id),m.membership_fee,m.fee_period]);
  }else if(type==='don'){
    h=['العضو/المتبرع','₪','العملة','$','سعر الصرف','التاريخ','ملاحظات'];
    r=DB.donations.map(x=>[gmn(x.member_id)||x.member_name,x.amount_ils||x.amount,x.currency,x.amount||'',x.exchange_rate||'',x.date,x.notes]);
  }else{
    h=['المستأجر','النوع','التاريخ','₪','المدفوع','الحالة'];
    r=DB.rentals.map(x=>[x.tenant_name,x.tenant_type==='member'?'عضو':'خارجي',x.event_date,x.amount,x.paid_amount,x.status]);
  }
  const csv='\uFEFF'+[h,...r].map(row=>row.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=type+'_'+today()+'.csv';a.click();
  toast('تم التصدير','ok');
};

/* ═══ CLOCK ═══ */
function startClock(){
  const el=document.getElementById('clock');
  if(el)setInterval(()=>{el.textContent=new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});},1000);
}

/* ═══ INIT ═══ */
async function init(){
  const{createClient}=supabase;
  SB=createClient(
    'https://ralifvemgapmsgrjgazh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4'
  );
  document.getElementById('app').style.display='none';
  await checkSession();
}
init();
