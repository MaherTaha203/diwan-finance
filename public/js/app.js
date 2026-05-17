'use strict';

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let SB  = null;   // supabase client
let CU  = null;   // current user
let CUR = null;   // current user role

const DB = { rec:[], pay:[], fam:[], tx:[], audit:[] };
const ROLES = { admin:'مدير', accountant:'محاسب', viewer:'عارض' };
const PSZ = 15;
const PS  = { rec:1, pay:1, fam:1 };

/* ═══════════════════════════════════════════
   PERMISSIONS
═══════════════════════════════════════════ */
const can = {
  write:  () => ['admin','accountant'].includes(CUR?.role),
  delete: () => CUR?.role === 'admin',
  manage: () => CUR?.role === 'admin',
};

/* ═══════════════════════════════════════════
   LEDGER
═══════════════════════════════════════════ */
const L = {
  bal:   mid => DB.tx.filter(t=>t.member_id==mid).reduce((s,t)=>t.type==='cr'?s+Number(t.amount):s-Number(t.amount),0),
  txFor: mid => DB.tx.filter(t=>t.member_id==mid).sort((a,b)=>new Date(a.date)-new Date(b.date)),
  in:    ()  => DB.rec.reduce((s,r)=>s+Number(r.amount),0),
  out:   ()  => DB.pay.reduce((s,p)=>s+Number(p.amount),0),
};

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
const today = () => new Date().toISOString().slice(0,10);
const fmt   = n  => Math.round(Number(n||0)).toLocaleString('ar-SA');
const fdate = d  => { try { return new Date(d).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}); } catch { return d||'—'; } };
const gm    = id => DB.fam.find(m=>m.id==id);
const gmn   = id => gm(id)?.name||'—';
const esc   = s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function debounce(fn,ms=300){ let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}; }

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
const ICONS = { ok:'ti-circle-check', err:'ti-circle-x', warn:'ti-alert-triangle', inf:'ti-info-circle' };
function toast(msg, type='ok') {
  const c  = document.getElementById('tc');
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.innerHTML = `<i class="ti ${ICONS[type]}"></i><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),300); }, 3500);
}

/* ═══════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════ */
function vf(id, test, eid) {
  const el = document.getElementById(id);
  const ok = el && test(el.value);
  el?.classList.toggle('er', !ok);
  document.getElementById(eid)?.classList.toggle('on', !ok);
  return ok;
}

/* ═══════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════ */
function mkPag(tbl, total) {
  const pages = Math.max(1, Math.ceil(total/PSZ));
  PS[tbl] = Math.min(PS[tbl], pages);
  const cur = PS[tbl];
  const el  = document.getElementById(tbl+'-pag'); if (!el) return;
  const shown = Math.min(PSZ, total-(cur-1)*PSZ);
  let h = `<span class="pi">عرض ${shown} من ${total}</span>`;
  h += `<button class="pb" onclick="gp('${tbl}',${cur-1})" ${cur<=1?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
  for (let i=Math.max(1,cur-2); i<=Math.min(pages,cur+2); i++)
    h += `<button class="pb${i===cur?' on':''}" onclick="gp('${tbl}',${i})">${i}</button>`;
  h += `<button class="pb" onclick="gp('${tbl}',${cur+1})" ${cur>=pages?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
  el.innerHTML = h;
}
window.gp = (t,p) => { PS[t]=p; D[t].render(); };

/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function nav(p) {
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+p)?.classList.add('on');
  document.querySelector(`.nb[data-p="${p}"]`)?.classList.add('on');
  if (p==='rep')   renderRep();
  if (p==='stmt')  fillStmtSel();
  if (p==='audit') renderAudit();
  if (p==='users') loadUsers();
  if (p==='bk')    renderSysInfo();
}
document.querySelectorAll('.nb[data-p]').forEach(el => el.addEventListener('click', ()=>nav(el.dataset.p)));

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  document.getElementById('theme-btn').innerHTML = isLight
    ? '<i class="ti ti-moon"></i>داكن'
    : '<i class="ti ti-sun"></i>فاتح';
}
window.toggleTheme = toggleTheme;

/* ═══════════════════════════════════════════
   LANGUAGE — يستخدم i18n.js
═══════════════════════════════════════════ */
function toggleLang() {
  window.LANG = window.LANG === 'ar' ? 'en' : 'ar';
  const btn = document.getElementById('lang-btn');
  btn.innerHTML = `<i class="ti ti-language"></i>${window.LANG==='ar'?'EN':'AR'}`;
  window.applyLang();
  renderAll();
}
window.toggleLang = toggleLang;

/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
async function login() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const btn   = document.getElementById('login-btn');
  const err   = document.getElementById('login-err');
  if (!email||!pass) { showErr(t('loginFill')); return; }
  btn.disabled = true;
  btn.innerHTML = `<div class="spin"></div> ${t('loginLoading')}`;
  err.classList.remove('show');
  const { data, error } = await SB.auth.signInWithPassword({ email, password: pass });
  if (error) {
    showErr(t('loginErr'));
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-login"></i> تسجيل الدخول';
    return;
  }
  CU = data.user;
  await afterLogin();
}
window.login = login;

function showErr(msg) {
  const el = document.getElementById('login-err');
  el.textContent = msg;
  el.classList.add('show');
}

async function afterLogin() {
  const { data: role } = await SB.from('user_roles').select('*').eq('user_id', CU.id).single();
  CUR = role || { role:'viewer', full_name: CU.email };
  const r   = CUR.role;
  const ini = (CUR.full_name||CU.email).charAt(0).toUpperCase();
  document.getElementById('uav').textContent = ini;
  document.getElementById('uav').className   = 'uav '+r;
  document.getElementById('uname').textContent = CUR.full_name||CU.email;
  document.getElementById('urole').textContent = ROLES[r]||r;
  applyPerms();
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  await loadAll();
  startClock();
}

async function logout() {
  await SB.auth.signOut();
  CU=null; CUR=null;
  Object.keys(DB).forEach(k=>DB[k]=[]);
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-pass').value = '';
  toast(t('loggedOut'),'inf');
}
window.logout = logout;

function applyPerms() {
  ['btn-qrec','btn-qpay','btn-add-rec','btn-add-pay','btn-add-fam'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.style.display = can.write()?'':'none';
  });
  const nu = document.getElementById('nb-users');
  if (nu) nu.style.display = can.manage()?'':'none';
}

async function checkSession() {
  const { data:{ session } } = await SB.auth.getSession();
  if (session) { CU=session.user; await afterLogin(); }
}

/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
async function loadAll() {
  try {
    const [r1,r2,r3,r4,r5] = await Promise.all([
      SB.from('receipts').select('*').order('created_at',{ascending:false}),
      SB.from('payments').select('*').order('created_at',{ascending:false}),
      SB.from('family').select('*').order('name'),
      SB.from('transactions').select('*'),
      SB.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100),
    ]);
    DB.rec   = r1.data||[];
    DB.pay   = r2.data||[];
    DB.fam   = r3.data||[];
    DB.tx    = r4.data||[];
    DB.audit = r5.data||[];
    renderAll();
  } catch(e) {
    toast(t('loadErr'),'err');
    console.error(e);
  }
}
window.loadAll = loadAll;

function renderAll() {
  renderDash();
  D.rec.render();
  D.pay.render();
  D.fam.render();
  fillStmtSel();
  fillMemDrop();
}

/* ═══════════════════════════════════════════
   PAGE RENDERERS
═══════════════════════════════════════════ */
const D = {
  rec: {
    render() {
      const q = (document.getElementById('q-rec')?.value||'').toLowerCase().trim();
      const m = document.getElementById('f-rec-m')?.value||'';
      let d = DB.rec.map(r=>({...r,mname:gmn(r.member_id)}));
      if (q) d = d.filter(r=>(r.no+r.mname+(r.description||'')).toLowerCase().includes(q));
      if (m) d = d.filter(r=>r.method===m);
      const sub = document.getElementById('rec-sub');
      if (sub) sub.textContent = `${d.length} إيصال — ₪ ${fmt(d.reduce((s,r)=>s+Number(r.amount),0))}`;
      mkPag('rec',d.length);
      const page = d.slice((PS.rec-1)*PSZ, PS.rec*PSZ);
      const body = document.getElementById('rec-body');
      if (!page.length){ body.innerHTML=`<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i><p>${t('noRec')}</p></div></td></tr>`; return; }
      body.innerHTML = page.map(r=>`<tr>
        <td><b>${esc(r.no)}</b></td>
        <td>${esc(r.mname)}</td>
        <td style="color:var(--ok);font-weight:600;text-align:left">₪ ${fmt(r.amount)}</td>
        <td><span class="badge inf">${esc(r.method)}</span></td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2)">${esc(r.description||'—')}</td>
        <td style="color:var(--tx2)">${fdate(r.date)}</td>
        <td style="color:var(--tx3);font-size:11px">${esc(r.created_by_name||'—')}</td>
        <td class="tda">
          <button class="btn ghost sm" style="color:var(--inf)" onclick="prtRec('${r.id}')" title="طباعة"><i class="ti ti-printer"></i></button>
          ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delRec('${r.id}')" title="حذف"><i class="ti ti-trash"></i></button>`:''}
        </td></tr>`).join('');
    }
  },
  pay: {
    render() {
      const q = (document.getElementById('q-pay')?.value||'').toLowerCase().trim();
      let d = [...DB.pay];
      if (q) d = d.filter(p=>(p.no+p.beneficiary+(p.reason||'')).toLowerCase().includes(q));
      const sub = document.getElementById('pay-sub');
      if (sub) sub.textContent = `${d.length} سند — ₪ ${fmt(d.reduce((s,p)=>s+Number(p.amount),0))}`;
      mkPag('pay',d.length);
      const page = d.slice((PS.pay-1)*PSZ, PS.pay*PSZ);
      const body = document.getElementById('pay-body');
      if (!page.length){ body.innerHTML=`<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i><p>${t('noPay')}</p></div></td></tr>`; return; }
      body.innerHTML = page.map(p=>`<tr>
        <td><b>${esc(p.no)}</b></td>
        <td>${esc(p.beneficiary)}</td>
        <td style="color:var(--err);font-weight:600;text-align:left">₪ ${fmt(p.amount)}</td>
        <td><span class="badge warn">${esc(p.method)}</span></td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2)">${esc(p.reason||'—')}</td>
        <td style="color:var(--tx2)">${fdate(p.date)}</td>
        <td style="color:var(--tx3);font-size:11px">${esc(p.created_by_name||'—')}</td>
        <td class="tda">${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delPay('${p.id}')"><i class="ti ti-trash"></i></button>`:''}</td>
      </tr>`).join('');
    }
  },
  fam: {
    render() {
      const q  = (document.getElementById('q-fam')?.value||'').toLowerCase().trim();
      const st = document.getElementById('f-fam-s')?.value||'';
      let d = DB.fam.map(m=>({...m,bal:L.bal(m.id)}));
      if (q)       d = d.filter(m=>m.name.includes(q)||(m.phone||'').includes(q));
      if (st==='cr') d = d.filter(m=>m.bal>0);
      else if (st==='dr') d = d.filter(m=>m.bal<0);
      const sub = document.getElementById('fam-sub');
      if (sub) sub.textContent = `${d.length} عضو — إجمالي الأرصدة: ₪ ${fmt(d.reduce((s,m)=>s+m.bal,0))}`;
      mkPag('fam',d.length);
      const page = d.slice((PS.fam-1)*PSZ, PS.fam*PSZ);
      const body = document.getElementById('fam-body');
      if (!page.length){ body.innerHTML=`<tr><td colspan="7"><div class="empty"><i class="ti ti-users"></i><p>${t('noFam')}</p></div></td></tr>`; return; }
      body.innerHTML = page.map((m,i)=>{
        const b=m.bal, cls=b>0?'ok':b<0?'err':'neu', lbl=b>0?t('creditor'):b<0?t('debtor'):t('balanced');
        return `<tr>
          <td style="color:var(--tx3)">${(PS.fam-1)*PSZ+i+1}</td>
          <td><b>${esc(m.name)}</b></td>
          <td style="color:var(--tx2)">${esc(m.phone||'—')}</td>
          <td style="font-weight:600;color:${b>=0?'var(--ok)':'var(--err)'};text-align:left">₪ ${fmt(b)}</td>
          <td style="color:var(--tx2)">${m.monthly_rent?'₪ '+fmt(m.monthly_rent):'—'}</td>
          <td><span class="badge ${cls}">${lbl}</span></td>
          <td class="tda">
            <button class="btn ghost sm" style="color:var(--inf)" onclick="goStmt('${m.id}')" title="كشف الحساب"><i class="ti ti-file-description"></i></button>
            ${can.delete()?`<button class="btn ghost sm" style="color:var(--err)" onclick="delFam('${m.id}')" title="حذف"><i class="ti ti-trash"></i></button>`:''}
          </td></tr>`;
      }).join('');
    }
  }
};

/* ═══════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════ */
function renderDash() {
  const ti=L.in(), to=L.out(), net=ti-to;
  const tb=DB.fam.reduce((s,m)=>s+L.bal(m.id),0);
  const dd=document.getElementById('dash-date');
  if (dd) dd.textContent=new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  document.getElementById('kpis').innerHTML=`
    <div class="kpi g"><i class="ti ti-trending-up kpi-ico"></i><div class="kpi-lbl">${t('kpiIn')}</div><div class="kpi-val">₪ ${fmt(ti)}</div><div class="kpi-sub">${DB.rec.length} ${t('kpiRecCount')}</div></div>
    <div class="kpi r"><i class="ti ti-trending-down kpi-ico"></i><div class="kpi-lbl">${t('kpiOut')}</div><div class="kpi-val">₪ ${fmt(to)}</div><div class="kpi-sub">${DB.pay.length} ${t('kpiPayCount')}</div></div>
    <div class="kpi ${net>=0?'g':'r'}"><i class="ti ti-scale kpi-ico"></i><div class="kpi-lbl">${t('kpiNet')}</div><div class="kpi-val">₪ ${fmt(net)}</div><div class="kpi-sub">${net>=0?t('surplus'):t('deficit')}</div></div>
    <div class="kpi b"><i class="ti ti-users kpi-ico"></i><div class="kpi-lbl">${t('kpiMembers')}</div><div class="kpi-val">${DB.fam.length}</div><div class="kpi-sub">${t('kpiBalances')}: ₪ ${fmt(tb)}</div></div>
  `;

  // Monthly bar chart
  const now=new Date(); const months=[];
  for (let i=5;i>=0;i--) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const v=DB.rec.filter(r=>r.date?.startsWith(k)).reduce((s,r)=>s+Number(r.amount),0);
    months.push({lbl:d.toLocaleDateString('ar-SA',{month:'short'}),v});
  }
  const maxV=Math.max(...months.map(m=>m.v),1);
  document.getElementById('month-chart').innerHTML=months.map(m=>`
    <div class="bc-wrap">
      <div class="bc-val">${m.v?'₪'+fmt(m.v):''}</div>
      <div class="bc-bar" style="height:${Math.max(4,Math.round(m.v/maxV*100))}px;background:${m.v?'var(--acc)':'var(--bg3)'}"></div>
      <div class="bc-lbl">${m.lbl}</div>
    </div>`).join('');

  // Methods chart
  const mth={}, COLS=['#00C896','#1B6CA8','#DD6B20','#E53E3E','#6D28D9'];
  DB.rec.forEach(r=>{mth[r.method]=(mth[r.method]||0)+Number(r.amount);});
  const mT=Object.values(mth).reduce((a,b)=>a+b,1);
  document.getElementById('dash-methods').innerHTML=Object.entries(mth).length
    ?Object.entries(mth).map(([m,v],i)=>`
      <div class="h-bar">
        <span class="h-lbl">${esc(m)}</span>
        <div class="h-track"><div class="h-fill" style="width:${Math.round(v/mT*100)}%;background:${COLS[i%5]}">${Math.round(v/mT*100)}%</div></div>
        <span class="h-val">₪ ${fmt(v)}</span>
      </div>`).join('')
    :`<div class="empty" style="padding:12px"><p>${t('noData')}</p></div>`;

  // Last receipts
  document.getElementById('dash-rec').innerHTML=DB.rec.slice(0,5).length
    ?DB.rec.slice(0,5).map(r=>`
      <div class="sr">
        <span class="sr-l">${esc(gmn(r.member_id))}<br><small style="color:var(--tx3)">${fdate(r.date)}</small></span>
        <span class="sr-v" style="color:var(--ok)">₪ ${fmt(r.amount)}</span>
      </div>`).join('')
    :`<div class="empty" style="padding:12px"><p>${t('noRec')}</p></div>`;

  // Top balances
  const top=[...DB.fam].map(m=>({...m,b:L.bal(m.id)})).sort((a,b)=>b.b-a.b).slice(0,5);
  const maxB=Math.max(...top.map(m=>Math.abs(m.b)),1);
  document.getElementById('dash-balances').innerHTML=top.length
    ?top.map(m=>`
      <div class="h-bar">
        <span class="h-lbl">${esc(m.name)}</span>
        <div class="h-track"><div class="h-fill" style="width:${Math.round(Math.abs(m.b)/maxB*100)}%;background:${m.b>=0?'#00C896':'#E53E3E'}">₪${fmt(m.b)}</div></div>
        <span class="h-val" style="color:${m.b>=0?'var(--ok)':'var(--err)'}">₪ ${fmt(m.b)}</span>
      </div>`).join('')
    :`<div class="empty" style="padding:12px"><p>${t('noFam')}</p></div>`;

  // Quick actions
  const qa=document.getElementById('dash-qa');
  if (qa) qa.innerHTML=`
    ${can.write()?`<button class="qa-btn g" onclick="openM('rec')"><i class="ti ti-receipt"></i><span>${t('qaRec')}</span></button>`:''}
    ${can.write()?`<button class="qa-btn r" onclick="openM('pay')"><i class="ti ti-cash"></i><span>${t('qaPay')}</span></button>`:''}
    <button class="qa-btn b" onclick="nav('stmt')"><i class="ti ti-file-description"></i><span>${t('qaStmt')}</span></button>
    <button class="qa-btn b" onclick="nav('rep')"><i class="ti ti-chart-bar"></i><span>${t('qaRep')}</span></button>
  `;
}

/* ═══════════════════════════════════════════
   STATEMENT
═══════════════════════════════════════════ */
function fillStmtSel() {
  const s=document.getElementById('stmt-sel'); if(!s) return;
  s.innerHTML='<option value="">-- اختر --</option>'+DB.fam.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
}
function fillMemDrop() {
  const s=document.getElementById('r-mem'); if(!s) return;
  s.innerHTML='<option value="">-- اختر عضواً --</option>'+DB.fam.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
}
window.renderStmt = function() {
  const id=document.getElementById('stmt-sel').value;
  const out=document.getElementById('stmt-out');
  if (!id){ out.innerHTML=''; return; }
  const m=gm(id); if(!m){ out.innerHTML=''; return; }
  const txs=L.txFor(id);
  const bal=L.bal(id);
  const paid=txs.filter(t=>t.type==='cr').reduce((s,t)=>s+Number(t.amount),0);
  let run=0;
  const rows=txs.map(t=>{
    run+=t.type==='cr'?Number(t.amount):-Number(t.amount);
    return `<div class="lr">
      <span class="lr-d">${fdate(t.date)}</span>
      <span class="lr-t">${esc(t.description||'—')}</span>
      <span class="lr-c">${t.type==='cr'?'₪ '+fmt(t.amount):'—'}</span>
      <span class="lr-dr2">${t.type==='dr'?'₪ '+fmt(t.amount):'—'}</span>
      <span class="lr-b">₪ ${fmt(run)}</span>
    </div>`;
  }).join('');
  out.innerHTML=`<div class="card">
    <div style="background:var(--pri);color:#fff;padding:14px;border-radius:var(--r);margin-bottom:16px">
      <div style="font-size:11px;opacity:.6">كشف حساب</div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${esc(m.name)}</div>
    </div>
    <div class="kgrid" style="margin-bottom:16px">
      <div class="kpi ${bal>=0?'g':'r'}"><div class="kpi-lbl">${t('currentBal')}</div><div class="kpi-val">₪ ${fmt(bal)}</div></div>
      <div class="kpi g"><div class="kpi-lbl">${t('totalPaid')}</div><div class="kpi-val">₪ ${fmt(paid)}</div></div>
      <div class="kpi b"><div class="kpi-lbl">${t('movements')}</div><div class="kpi-val">${txs.length}</div></div>
    </div>
    <div style="display:flex;gap:6px;font-size:11px;font-weight:600;color:var(--tx3);padding:6px 0;border-bottom:1px solid var(--bd);margin-bottom:4px">
      <span style="min-width:88px">${t('stmtDate')}</span><span style="flex:1">${t('stmtDesc')}</span>
      <span style="min-width:75px">${t('credit')}</span><span style="min-width:75px">${t('debit')}</span><span style="min-width:75px">${t('stmtBal')}</span>
    </div>
    <div class="scroll">${rows||`<div class="empty" style="padding:16px"><p>${t('noMovements')}</p></div>`}</div>
  </div>`;
};
window.goStmt = id => { nav('stmt'); setTimeout(()=>{ document.getElementById('stmt-sel').value=id; window.renderStmt(); },80); };

/* ═══════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════ */
function renderRep() {
  const ti=L.in(), to=L.out(), net=ti-to;
  const tb=DB.fam.reduce((s,m)=>s+L.bal(m.id),0);
  document.getElementById('rep-kpis').innerHTML=`
    <div class="kpi g"><div class="kpi-lbl">${t('kpiIn')}</div><div class="kpi-val">₪ ${fmt(ti)}</div></div>
    <div class="kpi r"><div class="kpi-lbl">${t('kpiOut')}</div><div class="kpi-val">₪ ${fmt(to)}</div></div>
    <div class="kpi ${net>=0?'g':'r'}"><div class="kpi-lbl">${t('kpiNet')}</div><div class="kpi-val">₪ ${fmt(net)}</div></div>
    <div class="kpi b"><div class="kpi-lbl">${t('kpiMembers')}</div><div class="kpi-val">₪ ${fmt(tb)}</div></div>
  `;
  const mth={}, COLS=['#00C896','#1B6CA8','#DD6B20','#E53E3E','#6D28D9'];
  DB.rec.forEach(r=>{mth[r.method]=(mth[r.method]||0)+Number(r.amount);});
  const mT=Object.values(mth).reduce((a,b)=>a+b,1);
  document.getElementById('rep-methods').innerHTML=Object.entries(mth).map(([m,v],i)=>`
    <div class="h-bar">
      <span class="h-lbl">${esc(m)}</span>
      <div class="h-track"><div class="h-fill" style="width:${Math.round(v/mT*100)}%;background:${COLS[i%5]}">${Math.round(v/mT*100)}%</div></div>
      <span class="h-val">₪ ${fmt(v)}</span>
    </div>`).join('')||'<div class="empty"><p>لا توجد بيانات</p></div>';
  const sorted=[...DB.fam].map(m=>({...m,b:L.bal(m.id)})).sort((a,b)=>b.b-a.b);
  document.getElementById('rep-fam-body').innerHTML=sorted.map((m,i)=>{
    const cls=m.b>0?'ok':m.b<0?'err':'neu', lbl=m.b>0?'دائن':m.b<0?'مدين':'متوازن';
    return `<tr><td>${esc(m.name)}</td><td style="text-align:left;color:${m.b>=0?'var(--ok)':'var(--err)'}">₪ ${fmt(m.b)}</td><td><span class="badge ${cls}">${lbl}</span></td></tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   AUDIT
═══════════════════════════════════════════ */
function renderAudit() {
  const list=document.getElementById('audit-list');
  if (!DB.audit.length){ list.innerHTML=`<div class="empty"><i class="ti ti-clipboard-list"></i><p>${t('emptyAudit')}</p></div>`; return; }
  list.innerHTML=DB.audit.map(a=>`
    <div class="ae">
      <div class="ai ${a.action==='add'?'add':a.action==='delete'?'del':'sys'}">
        <i class="ti ${a.action==='add'?'ti-plus':a.action==='delete'?'ti-trash':'ti-settings'}"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--tx)">${esc(a.description)}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${esc(a.user_name||'—')} · ${fdate(a.created_at)}</div>
      </div>
    </div>`).join('');
}

function renderSysInfo() {
  document.getElementById('sys-info').innerHTML=`
    <div class="sr"><span class="sr-l">${t('sysRec')}</span><span class="sr-v">${DB.rec.length}</span></div>
    <div class="sr"><span class="sr-l">${t('sysPay')}</span><span class="sr-v">${DB.pay.length}</span></div>
    <div class="sr"><span class="sr-l">${t('sysFam')}</span><span class="sr-v">${DB.fam.length}</span></div>
    <div class="sr"><span class="sr-l">${t('sysCurUser')}</span><span class="sr-v">${esc(CUR?.full_name||CU?.email||'—')}</span></div>
    <div class="sr"><span class="sr-l">${t('sysRole')}</span><span class="sr-v"><span class="role-tag ${CUR?.role||'viewer'}">${ROLES[CUR?.role]||'—'}</span></span></div>
  `;
}

/* ═══════════════════════════════════════════
   USERS
═══════════════════════════════════════════ */
async function loadUsers() {
  if (!can.manage()) return;
  const { data } = await SB.from('user_roles').select('*').order('created_at');
  const list=document.getElementById('users-list');
  if (!data?.length){ list.innerHTML='<div class="empty"><p>لا يوجد مستخدمون</p></div>'; return; }
  const BG={admin:'linear-gradient(135deg,#6D28D9,#4F46E5)',accountant:'linear-gradient(135deg,#059669,#0D9488)',viewer:'linear-gradient(135deg,#1B6CA8,#0284C7)'};
  list.innerHTML=data.map(u=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;background:var(--bg2)">
      <div style="width:38px;height:38px;border-radius:50%;background:${BG[u.role]||'#475569'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:#fff;flex-shrink:0">${(u.full_name||'م').charAt(0).toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:500">${esc(u.full_name||'—')}</div><div style="font-size:11px;color:var(--tx3)">${u.user_id}</div></div>
      <span class="role-tag ${u.role}">${ROLES[u.role]}</span>
      ${u.user_id!==CU?.id
        ?`<select onchange="changeRole('${u.user_id}',this.value)" style="padding:5px 8px;border-radius:var(--r);border:1px solid var(--bd2);background:var(--bg2);color:var(--tx);font-size:12px;font-family:var(--fn)">
            <option value="viewer" ${u.role==='viewer'?'selected':''}>عارض</option>
            <option value="accountant" ${u.role==='accountant'?'selected':''}>محاسب</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>مدير</option>
          </select>`
        :'<span style="font-size:11px;color:var(--tx3)">(أنت)</span>'}
    </div>`).join('');
}
window.changeRole = async (uid, role) => {
  await SB.from('user_roles').update({role}).eq('user_id',uid);
  await log('edit',`تغيير دور المستخدم إلى ${ROLES[role]}`);
  toast(`${t('rolChanged')} ${ROLES[role]}`,'ok');
  loadUsers();
};
window.inviteUser = async () => {
  const email=document.getElementById('inv-email').value.trim();
  const pass =document.getElementById('inv-pass').value;
  const role =document.getElementById('inv-role').value;
  const name =document.getElementById('inv-name').value.trim();
  if (!email||!pass){ toast('البريد وكلمة المرور مطلوبان','warn'); return; }
  const {data,error}=await SB.auth.signUp({email,password:pass});
  if (error){ toast(t('saveErr')+': '+error.message,'err'); return; }
  await SB.from('user_roles').upsert({user_id:data.user.id,role,full_name:name||email});
  await log('add',`إضافة مستخدم: ${name||email} (${ROLES[role]})`);
  closeM();
  toast(`${t('invDone')} ${email}`,'ok');
  loadUsers();
};

/* ═══════════════════════════════════════════
   MODAL
═══════════════════════════════════════════ */
window.openM = type => {
  document.getElementById('ov').classList.add('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.getElementById('m-'+type).style.display='block';
  fillMemDrop();
  ['r-dat','p-dat'].forEach(id=>{const e=document.getElementById(id);if(e&&!e.value)e.value=today();});
};
window.closeM = () => {
  document.getElementById('ov').classList.remove('on');
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
  document.querySelectorAll('.fi input,.fi select,.fi textarea').forEach(el=>{
    el.classList.remove('er');
    if (el.type!=='date'&&el.tagName!=='SELECT') el.value='';
    if (el.type==='number') el.value=el.defaultValue||'';
  });
  document.querySelectorAll('.fe').forEach(e=>e.classList.remove('on'));
  // reset pills
  document.querySelectorAll('.pills .pill').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.pills .pill:first-child').forEach(p=>p.classList.add('on'));
  const rm=document.getElementById('r-mth'); if(rm) rm.value='نقد';
  const pm=document.getElementById('p-mth'); if(pm) pm.value='نقد';
};

window.setPill = (prefix, val, el) => {
  document.getElementById(prefix+'-pills')?.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(prefix+'-mth').value = val;
};

/* ═══════════════════════════════════════════
   AUDIT LOG
═══════════════════════════════════════════ */
async function log(action, desc) {
  await SB.from('audit_log').insert({
    user_name: CUR?.full_name||CU?.email,
    action, description: desc,
  });
}

/* ═══════════════════════════════════════════
   SAVE
═══════════════════════════════════════════ */
window.saveRec = async (prt=false) => {
  if (!can.write()){ toast(t('noPermWrite'),'err'); return; }
  const mid=document.getElementById('r-mem').value;
  const amt=document.getElementById('r-amt').value;
  const dat=document.getElementById('r-dat').value;
  const v1=vf('r-mem',v=>!!v,'e-r-mem');
  const v2=vf('r-amt',v=>+v>=1&&+v<=999999,'e-r-amt');
  const v3=vf('r-dat',v=>!!v,'e-r-dat');
  if (!v1||!v2||!v3) return;
  const no='REC-'+String(DB.rec.length+1).padStart(5,'0');
  const {data,error}=await SB.from('receipts').insert({
    no, member_id:mid, member_name:gmn(mid), amount:+amt,
    method:document.getElementById('r-mth').value||'نقد',
    date:dat, receiver:document.getElementById('r-rcv').value,
    description:document.getElementById('r-dsc').value,
    created_by_name: CUR?.full_name||CU?.email,
  }).select().single();
  if (error){ toast(t('saveErr')+': '+error.message,'err'); return; }
  await SB.from('transactions').insert({
    member_id:mid, amount:+amt, type:'cr',
    ref_id:data.id,
    description:data.description||'إيصال قبض',
    date:dat,
  });
  await log('add',`إضافة إيصال ${no} — ${gmn(mid)} — ₪${fmt(amt)}`);
  closeM();
  await loadAll();
  toast(`✓ تم حفظ ${no}`,'ok');
  if (prt) setTimeout(()=>prtRec(data.id),300);
};

window.savePay = async () => {
  if (!can.write()){ toast('ليس لديك صلاحية','err'); return; }
  const ben=document.getElementById('p-ben').value;
  const amt=document.getElementById('p-amt').value;
  const rsn=document.getElementById('p-rsn').value;
  const v1=vf('p-ben',v=>v.trim().length>=2,'e-p-ben');
  const v2=vf('p-amt',v=>+v>=1,'e-p-amt');
  const v3=vf('p-rsn',v=>v.trim().length>=2,'e-p-rsn');
  if (!v1||!v2||!v3) return;
  const no='PAY-'+String(DB.pay.length+1).padStart(5,'0');
  const {error}=await SB.from('payments').insert({
    no, beneficiary:ben, amount:+amt,
    method:document.getElementById('p-mth').value||'نقد',
    date:document.getElementById('p-dat').value,
    approved_by:document.getElementById('p-apv').value,
    reason:rsn,
    created_by_name: CUR?.full_name||CU?.email,
  });
  if (error){ toast('خطأ: '+error.message,'err'); return; }
  await log('add',`إضافة سند ${no} — ${ben} — ₪${fmt(amt)}`);
  closeM();
  await loadAll();
  toast(`✓ تم حفظ ${no}`,'ok');
};

window.saveFam = async () => {
  if (!can.manage()){ toast('ليس لديك صلاحية','err'); return; }
  const nm=document.getElementById('f-nm').value;
  if (!vf('f-nm',v=>v.trim().length>=2,'e-f-nm')) return;
  if (DB.fam.find(m=>m.name.trim()===nm.trim())){ toast(t('dupMember'),'warn'); return; }
  const bal=+document.getElementById('f-bal').value||0;
  const {data,error}=await SB.from('family').insert({
    name:nm.trim(),
    phone:document.getElementById('f-ph').value,
    apartment:document.getElementById('f-ap').value,
    monthly_rent:+document.getElementById('f-rnt').value||0,
    notes:document.getElementById('f-nt').value,
  }).select().single();
  if (error){ toast('خطأ: '+error.message,'err'); return; }
  if (bal!==0) await SB.from('transactions').insert({
    member_id:data.id, amount:Math.abs(bal),
    type:bal>0?'cr':'dr',
    description:t('currentBal'), date:today(),
  });
  await log('add',`إضافة عضو: ${nm}`);
  closeM();
  await loadAll();
  toast(`✓ تمت إضافة ${nm}`,'ok');
};

/* ═══════════════════════════════════════════
   DELETE
═══════════════════════════════════════════ */
window.delRec = async id => {
  if (!can.delete()){ toast(t('noPermDel'),'err'); return; }
  const r=DB.rec.find(x=>x.id===id);
  if (!r||!confirm(`${t('delConfRec')} ${r.no}?`)) return;
  await SB.from('transactions').delete().eq('ref_id',id);
  await SB.from('receipts').delete().eq('id',id);
  await log('delete',`حذف إيصال ${r.no} — ${gmn(r.member_id)}`);
  await loadAll();
  toast(`${t('deleted')} ${r.no}`,'warn');
};

window.delPay = async id => {
  if (!can.delete()){ toast('ليس لديك صلاحية الحذف','err'); return; }
  const p=DB.pay.find(x=>x.id===id);
  if (!p||!confirm(`${t('delConfPay')} ${p.no}?`)) return;
  await SB.from('payments').delete().eq('id',id);
  await log('delete',`حذف سند ${p.no}`);
  await loadAll();
  toast(`${t('deleted')} ${p.no}`,'warn');
};

window.delFam = async id => {
  if (!can.delete()){ toast('ليس لديك صلاحية الحذف','err'); return; }
  const m=gm(id);
  if (!m||!confirm(`${t('delConfFam')} ${m.name}?`)) return;
  await SB.from('transactions').delete().eq('member_id',id);
  await SB.from('family').delete().eq('id',id);
  await log('delete',`حذف عضو: ${m.name}`);
  await loadAll();
  toast(`${t('deleted')} ${m.name}`,'warn');
};

/* ═══════════════════════════════════════════
   PRINT
═══════════════════════════════════════════ */
window.prtRec = id => {
  const r=DB.rec.find(x=>x.id===id); if(!r) return;
  const html=`<div class="rdoc">
    <div class="rt">${t('prtTitle')}<br><span style="font-size:11px;font-weight:400">${t('prtSub')}</span></div>
    <div class="rr"><span>${t('prtNo')}</span><b>${esc(r.no)}</b></div>
    <div class="rr"><span>${t('prtDate')}</span><span>${fdate(r.date)}</span></div>
    <div class="rr"><span>${t('prtMember')}</span><span>${esc(gmn(r.member_id))}</span></div>
    <div class="rr"><span>${t('prtMethod')}</span><span>${esc(r.method)}</span></div>
    <div class="rr"><span>${t('prtDesc')}</span><span>${esc(r.description||'—')}</span></div>
    <div class="rv">₪ ${fmt(r.amount)}</div>
    <div class="rs"><div>${t('prtSig1')}</div><div>${t('prtSig2')}</div></div>
    <div style="text-align:center;font-size:10px;margin-top:14px;color:#777">${t('prtTitle')} · ${new Date().toLocaleDateString('ar-SA')}</div>
  </div>`;
  document.getElementById('prt-prev').innerHTML=html;
  document.getElementById('pra').innerHTML=html;
  openM('prt');
};

/* ═══════════════════════════════════════════
   BACKUP & EXPORT
═══════════════════════════════════════════ */
window.doBackup = () => {
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`diwan_backup_${today()}.json`;
  a.click();
  toast(t('backupDone'),'ok');
};

window.exportCSV = type => {
  let h,r;
  if (type==='rec'){
    h=['رقم الإيصال','العضو','المبلغ','طريقة الدفع','البيان','التاريخ','بواسطة'];
    r=DB.rec.map(x=>[x.no,gmn(x.member_id),x.amount,x.method,x.description,x.date,x.created_by_name]);
  } else if (type==='pay'){
    h=['رقم السند','المستفيد','المبلغ','طريقة الصرف','السبب','التاريخ'];
    r=DB.pay.map(x=>[x.no,x.beneficiary,x.amount,x.method,x.reason,x.date]);
  } else if (type==='fam'){
    h=['الاسم','الهاتف','الرصيد','الإيجار الشهري'];
    r=DB.fam.map(m=>[m.name,m.phone,L.bal(m.id),m.monthly_rent]);
  } else {
    h=['العملية','الوصف','المستخدم','الوقت'];
    r=DB.audit.map(a=>[a.action,a.description,a.user_name,a.created_at]);
  }
  const csv='\uFEFF'+[h,...r].map(row=>row.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=type+'_'+today()+'.csv';
  a.click();
  toast(t('exported'),'ok');
};

/* ═══════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════ */
function startClock() {
  const el=document.getElementById('clock');
  if (el) setInterval(()=>{
    el.textContent=new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
  },1000);
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
  const { createClient } = supabase;
  SB = createClient(
    'https://ralifvemgapmsgrjgazh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4'
  );

  // إخفاء التطبيق حتى تسجيل الدخول
  document.getElementById('app').style.display = 'none';

  // فحص جلسة موجودة
  await checkSession();
}

init();
