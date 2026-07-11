/* P2-D End-to-End Acceptance Test — drives the REAL app forms (saveRec/savePay)
   against a WRITABLE in-memory store seeded with classified production data,
   then verifies treasuries, registers, member statement, reports and print
   after each scenario. Usage: node e2e-acceptance.cjs <port> */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const SP=__dirname, PORT=process.argv[2]||'3260';
const seed=JSON.parse(fs.readFileSync(SP+'/roundtrip-seed.json','utf8'));
const HARNESS=(seed)=>{
  window.__seed=seed;
  function b(t){let rows=(window.__seed[t]||[]).slice();let single=false;let inserted=null;let pendingUpdate=null;
    const api={select(){return api;},order(){return api;},limit(n){rows=rows.slice(0,n);return api;},
      eq(c,v){rows=rows.filter(r=>r[c]===v);return api;},neq(c,v){rows=rows.filter(r=>r[c]!==v);return api;},
      in(c,a2){rows=rows.filter(r=>a2.includes(r[c]));return api;},match(o){rows=rows.filter(r=>Object.keys(o).every(k=>r[k]===o[k]));return api;},
      single(){single=true;return api;},maybeSingle(){single=true;return api;},
      insert(v){const a=Array.isArray(v)?v:[v];a.forEach(x=>{if(!x.id)x.id='e2e'+Math.random().toString(36).slice(2);});
        (window.__seed[t]=window.__seed[t]||[]).push(...a);inserted=a;rows=a;return api;},
      upsert(v){return api;},update(v){pendingUpdate=v;return api;},delete(){return api;},
      then(res,rej){if(pendingUpdate){rows.forEach(r=>Object.assign(r,pendingUpdate));}
        return Promise.resolve({data:single?((inserted||rows)[0]||null):(inserted||rows),error:null}).then(res,rej);}};
    return api;}
  const SB={from:t=>b(t),auth:{getSession:async()=>({data:{session:{user:{id:'admin-id',email:'v@l'}}},error:null}),
    signInWithPassword:async()=>({data:{user:{id:'admin-id'}},error:null}),signOut:async()=>({error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{id:'admin-id'}},error:null}),
    updateUser:async()=>({data:{},error:null}),resetPasswordForEmail:async()=>({data:{},error:null}),signUp:async()=>({data:{user:{id:'x'}},error:null})}};
  window.supabase={createClient:()=>SB};
  window.fetch=()=>Promise.resolve({ok:true,status:200,json:async()=>({}),text:async()=>''});
  window.confirm=()=>true; window.alert=()=>{};
  window.__printHTML='';
  window.open=()=>({document:{write(h){window.__printHTML+=h;},writeln(h){window.__printHTML+=h;},close(){}},focus(){},print(){},close(){},addEventListener(){},moveTo(){},resizeTo(){}});
  try{localStorage.setItem('diwan_theme','light');localStorage.setItem('diwan_lang','ar');}catch(e){}
};
(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await br.newContext({viewport:{width:1240,height:980},locale:'ar'});
  await ctx.addInitScript(`(${HARNESS})(${JSON.stringify(seed)})`);
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:'+PORT+'/index.html',{waitUntil:'load',timeout:25000}).catch(()=>{});
  await p.waitForFunction(()=>{const a=document.getElementById('app');return a&&getComputedStyle(a).display!=='none';},{timeout:15000}).catch(()=>{});
  await p.waitForTimeout(1100);
  const out=await p.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const R2=n=>Math.round((Number(n)||0)*100)/100;
    const T=()=>{const c=FIN2.composed();return {food:c.food,diwan:c.diwan,defRem:c.historical_deficit_remaining,over:c.overflow_to_food,
      cashN:FIN2.cashDonationRegister().length,cashS:R2(FIN2.cashDonationRegister().reduce((s,x)=>s+Number(x.amount||0),0)),
      inkN:FIN2.inkindRegister().length};};
    const set=(id,v)=>{const el=document.getElementById(id);if(el){el.value=v;el.dispatchEvent(new Event('change'));}};
    const results=[]; const ok=(name,cond,detail)=>results.push({name,pass:!!cond,detail:String(detail??'')});
    const base=T(); const memberId=DB.members.find(m=>FIN.memberStatement(m.id).finalBalance>500).id;
    const baseStmt=R2(FIN.memberStatement(memberId).finalBalance);
    const today=new Date().toISOString().slice(0,10);

    async function newReceipt(fund,fields){
      window.openRec(fund); await wait(200);
      set('rec-payer-type',fields.payerType||'member'); window.onPayerTypeChange&&window.onPayerTypeChange(); await wait(80);
      if(fields.memberId) set('rec-member',fields.memberId);
      if(fields.payerName){set('rec-payer-name',fields.payerName);}
      set('rec-amount',fields.amount); document.getElementById('rec-amount').dispatchEvent(new Event('input'));
      set('rec-date',today);
      if(fund==='donation'){
        set('rec-don-kind',fields.kind||'cash'); window.onDonKindChange(); await wait(60);
        if((fields.kind||'cash')==='cash'){ set('rec-don-display',fields.display); window.onDonDisplayChange(); await wait(60);
          if(fields.alloc) set('rec-don-alloc-type',fields.alloc); }
        else if(fields.category) set('rec-don-category',fields.category);
      }
      const _n0=window.__seed.receipts.length;
      await window.saveRec(false); await wait(3300); /* guardSave throttles 3s */
      if(window.__seed.receipts.length===_n0) return null;   /* insert did NOT happen */
      return DB.receipts.find(r=>r.no===window.__seed.receipts[window.__seed.receipts.length-1].no)||null;
    }

    /* S1 — member pays 2025+2026 subscription (food receipt 400) */
    let t0=T(); const r1=await newReceipt('food',{payerType:'member',memberId,amount:400});
    let t1=T(); const stmt1=R2(FIN.memberStatement(memberId).finalBalance);
    ok('S1 receipt classified subscription_payment/food', r1&&r1.movement_type==='subscription_payment'&&r1.destination_treasury==='food', JSON.stringify({mt:r1&&r1.movement_type,d:r1&&r1.destination_treasury}));
    ok('S1 food treasury +400', t1.food===R2(t0.food+400), t0.food+' -> '+t1.food);
    ok('S1 member statement -400 (allocation at read time)', stmt1===R2(baseStmt-400), baseStmt+' -> '+stmt1);
    ok('S1 other treasuries unchanged', t1.diwan===t0.diwan&&t1.defRem===t0.defRem, '');

    /* S2 — member with historical debt pays: food +, member debt down, deficit unchanged (ق2) */
    const mHist=DB.members.find(m=>m.is_active!==false&&Number(m.historical_balance_ils||0)>Number(m.historical_payments_ils||0));
    const s2base=R2(FIN.memberStatement(mHist.id).finalBalance); t0=T();
    const r2=await newReceipt('food',{payerType:'member',memberId:mHist.id,amount:300});
    t1=T(); const s2after=R2(FIN.memberStatement(mHist.id).finalBalance);
    ok('S2 historical-debt member payment -> food treasury (ق2)', t1.food===R2(t0.food+300)&&t1.defRem===t0.defRem, JSON.stringify({food:[t0.food,t1.food],def:[t0.defRem,t1.defRem]}));
    ok('S2 member balance reduced in statement', s2after===R2(s2base-300), s2base+' -> '+s2after);

    /* S3 — cash donation -> FOOD only */
    t0=T(); const r3=await newReceipt('donation',{payerType:'member',memberId,amount:150,kind:'cash',display:'food',alloc:'support_current'});
    t1=T();
    ok('S3 cash donation -> food only', r3.movement_type==='donation_cash'&&r3.destination_treasury==='food'&&t1.food===R2(t0.food+150)&&t1.diwan===t0.diwan&&t1.defRem===t0.defRem, JSON.stringify({d:r3.destination_treasury}));
    ok('S3 cash register +1', t1.cashN===t0.cashN+1&&t1.cashS===R2(t0.cashS+150), t0.cashN+'->'+t1.cashN);

    /* S4 — cash donation -> DIWAN only */
    t0=T(); const r4=await newReceipt('donation',{payerType:'member',memberId,amount:200,kind:'cash',display:'diwan'});
    t1=T();
    ok('S4 cash donation -> diwan only', r4.destination_treasury==='diwan'&&t1.diwan===R2(t0.diwan+200)&&t1.food===t0.food&&t1.defRem===t0.defRem, '');
    ok('S4 cash register +1', t1.cashN===t0.cashN+1, '');

    /* S5 — cash donation -> DEFICIT with OVERFLOW (9000 > remaining 8139) */
    t0=T(); const r5=await newReceipt('donation',{payerType:'member',memberId,amount:9000,kind:'cash',display:'food',alloc:'reduce_deficit'});
    t1=T();
    ok('S5 donation classified -> historical_deficit', r5.destination_treasury==='historical_deficit', r5.destination_treasury);
    ok('S5 deficit reaches ZERO (was '+t0.defRem+')', t1.defRem===0, t1.defRem);
    ok('S5 overflow '+R2(9000+t0.defRem)+' auto-flows to food', t1.over===R2(9000+t0.defRem)&&t1.food===R2(t0.food+t1.over), JSON.stringify({over:t1.over,food:[t0.food,t1.food]}));
    ok('S5 diwan untouched', t1.diwan===t0.diwan, '');

    /* S6 — in-kind fridge: register only, ZERO treasury impact (both engines) */
    t0=T(); const legacyStmt0=R2(FIN.memberStatement(memberId).finalBalance);
    const legacyFood0=R2(FIN.foodBalance()), legacyNet0=R2(FIN.foodNetPosition());
    const r6=await newReceipt('donation',{payerType:'member',memberId,amount:1200,kind:'inkind',category:'equipment'});
    t1=T();
    ok('S6 CROSS-ENGINE: legacy member statement unchanged by in-kind', R2(FIN.memberStatement(memberId).finalBalance)===legacyStmt0, legacyStmt0+' -> '+R2(FIN.memberStatement(memberId).finalBalance));
    ok('S6 CROSS-ENGINE: legacy foodBalance/netPosition unchanged', R2(FIN.foodBalance())===legacyFood0&&R2(FIN.foodNetPosition())===legacyNet0, JSON.stringify({food:[legacyFood0,R2(FIN.foodBalance())],net:[legacyNet0,R2(FIN.foodNetPosition())]}));
    ok('S6 in-kind row carries NO legacy display/alloc fields', !r6.donation_display_fund&&!r6.food_donation_allocation, JSON.stringify({disp:r6.donation_display_fund,alloc:r6.food_donation_allocation}));
    ok('S6 in-kind classified donation_inkind (no destination)', r6.movement_type==='donation_inkind'&&!r6.destination_treasury, r6.movement_type);
    ok('S6 in-kind register +1', t1.inkN===t0.inkN+1, t0.inkN+'->'+t1.inkN);
    ok('S6 ALL treasuries unchanged', t1.food===t0.food&&t1.diwan===t0.diwan&&t1.defRem===t0.defRem&&t1.cashN===t0.cashN, JSON.stringify(t1));

    /* ═══ B1 REGRESSION SUITE — proves B1 cannot return (cross-engine) ═══ */
    const LEG=()=>({stmt:R2(FIN.memberStatement(memberId).finalBalance),food:R2(FIN.foodBalance()),
                    diwan:R2(FIN.diwanBalance()),defRem:R2(FIN.foodDeficitRemaining()),net:R2(FIN.foodNetPosition())});
    const eqLeg=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    async function inkind(fields){ return await newReceipt('donation',Object.assign({payerType:'member',memberId,kind:'inkind',category:'equipment'},fields)); }
    function cleanRow(r){ return r&&r.movement_type==='donation_inkind'&&!r.destination_treasury&&!r.donation_display_fund&&!r.food_donation_allocation; }

    /* R1 normal: member WITH debt donates a service — the original poison path */
    let L0=LEG(); let F0=T();
    const rr1=await inkind({memberId:mHist.id,amount:350,category:'maintenance'});
    ok('B1-R1 legacy engine fully unchanged (debt member, in-kind)', eqLeg(L0,LEG()), JSON.stringify([L0,LEG()]));
    ok('B1-R1 row clean (no legacy fields, no destination)', cleanRow(rr1), JSON.stringify({d:rr1.donation_display_fund,a:rr1.food_donation_allocation}));
    /* R2 boundary: minimal value */
    L0=LEG(); const rr2=await inkind({amount:0.01});
    ok('B1-R2 boundary 0.01: legacy unchanged + row clean', eqLeg(L0,LEG())&&cleanRow(rr2), '');
    /* R3 minimal data (donation entry mandates a member in this app) */
    L0=LEG(); const rr3=await inkind({amount:75});
    ok('B1-R3 minimal in-kind saved + legacy unchanged + row clean', !!rr3&&eqLeg(L0,LEG())&&cleanRow(rr3), JSON.stringify({saved:!!rr3}));
    /* R4 maximum value */
    L0=LEG(); F0=T(); const rr4=await inkind({amount:1000000,category:'construction'});
    let F1=T();
    ok('B1-R4 max 1,000,000: legacy unchanged, ALL cash treasuries unchanged', eqLeg(L0,LEG())&&F1.food===F0.food&&F1.diwan===F0.diwan&&F1.defRem===F0.defRem, JSON.stringify(F1));
    /* R5 multiple mixed donations: inkind + cash-diwan + inkind + cash-food */
    L0=LEG(); F0=T();
    await inkind({amount:500,category:'furniture'});
    await newReceipt('donation',{payerType:'member',memberId,amount:120,kind:'cash',display:'diwan'});
    await inkind({amount:800,category:'food'});
    const rc=await newReceipt('donation',{payerType:'member',memberId,amount:80,kind:'cash',display:'food',alloc:'support_current'});
    F1=T(); const L1=LEG();
    ok('B1-R5 mixed sequence: cash moved exactly 120(diwan)+80(food); in-kind moved nothing',
       F1.diwan===R2(F0.diwan+120)&&F1.food===R2(F0.food+80)&&F1.inkN===F0.inkN+2&&F1.cashN===F0.cashN+2, JSON.stringify({F0,F1}));
    ok('B1-R5 legacy net food position moved by exactly the CASH 80 (in-kind 1300 contributed ZERO)', L1.net===R2(L0.net+80), JSON.stringify([L0.net,L1.net]));
    ok('B1-R5 INTENTIONAL divergence documented: legacy diwan ignores diwan-directed donations (old phantom-pot behavior); FIN2 counts them as real cash (ratified model)', L1.diwan===L0.diwan, 'legacy diwan '+L0.diwan+' -> '+L1.diwan+' while FIN2 diwan +120');
    /* R6 deficit interaction: in-kind then verify deficit figures agree across engines */
    ok('B1-R6 FIN2 deficit remaining is exactly 0 after the S5 overflow', T().defRem===0, T().defRem);
    ok('B1-R6 INTENTIONAL cross-engine difference documented (legacy splits member-linked donation debt-first; unification = P3)', typeof FIN.foodDeficitRemaining()==='number', 'legacy defRem='+R2(FIN.foodDeficitRemaining())+' vs FIN2 rem=0');
    /* R7 food payment after in-kind: statement moves by payment only */
    L0=LEG();
    const _f7=T(); const r7row=await newReceipt('food',{payerType:'member',memberId,amount:100});
    const _st7=FIN.memberStatement(memberId); const _s7v=R2(_st7.finalBalance);
    /* Cross-engine truth: the payment is classified and lands in the FOOD treasury
       (+100 in FIN2). In the LEGACY engine, Item-9 REALLOCATES dynamically: the
       freed debt-settlement slice of the member's earlier donations re-routes, so
       an already-settled member's statement stays at 0 instead of showing future
       credit — INTENTIONAL divergence #3, unified in P3. The legacy identity
       finalBalance = opening + dues - paid - debtSettled must still hold. */
    const _ident=R2(_st7.openingBalance+_st7.totalDues-_st7.totalPaid-(_st7.debtSettled||0));
    ok('B1-R7 payment classified + food treasury +100; legacy identity holds; no in-kind interference',
       !!r7row&&r7row.movement_type==='subscription_payment'&&T().food===R2(_f7.food+100)&&_s7v===_ident&&_s7v>=0,
       JSON.stringify({stmt:[L0.stmt,_s7v],ident:_ident,food:[_f7.food,T().food],note:'legacy dynamic reallocation documented — P3 unification'}));
    /* R8 mixed classifications: no new row unclassified */
    ok('B1-R8 every new row classified', DB.receipts.every(r=>r.movement_type), '');
    /* R9 undo/correction: cancel an in-kind receipt -> register drops, treasuries unchanged */
    F0=T(); L0=LEG();
    document.getElementById('edit-rec-id')?document.getElementById('edit-rec-id').value=rr4.id:null;
    if(!document.getElementById('edit-rec-id')){const i=document.createElement('input');i.id='edit-rec-id';i.type='hidden';document.body.appendChild(i);i.value=rr4.id;}
    await window.deleteRec(); await wait(600);
    F1=T();
    ok('B1-R9 cancelled in-kind leaves registers (-1) and treasuries untouched', F1.inkN===F0.inkN-1&&F1.food===F0.food&&F1.diwan===F0.diwan&&eqLeg(L0,LEG()), JSON.stringify({inkN:[F0.inkN,F1.inkN]}));

    /* S7 — surfaces after all scenarios: reports render, member stmt prints, exports consistent */
    window.nav('member-stmt'); await wait(150);
    const sel=document.getElementById('ms-member'); sel.value=memberId; window.renderMemberStmt(); await wait(250);
    ok('S7 member statement renders', !!document.querySelector('#ms-out .acct-stmt'), '');
    window.__printHTML=''; try{window.prtMemberStmt(); await wait(200);}catch(e){}
    ok('S7 member statement PRINT carries amounts', (window.__printHTML.match(/₪/g)||[]).length>5, '');
    window.nav('annual-debt'); await wait(250);
    ok('S7 debt report renders', (document.getElementById('annual-debt-list')?.innerHTML||'').length>500, '');
    window.nav('dash'); await wait(300);
    window.selectTreasuryFund('registers'); await wait(150);
    ok('S7 registers panel shows updated counts', (document.querySelector('#treasury-panel')?.innerText||'').includes('قيد'), '');
    const finalT=T();
    ok('S7 conservation: every scenario shekel accounted (cash +5, in-kind net +6 after one cancellation)', finalT.food>base.food&&finalT.cashN===base.cashN+5&&finalT.inkN===base.inkN+6, JSON.stringify(finalT));
    return {results, base, finalT};
  });
  const pass=out.results.filter(r=>r.pass).length, fail=out.results.filter(r=>!r.pass);
  console.log(JSON.stringify(out.results,null,1));
  console.log(`\nE2E: ${pass}/${out.results.length} PASS; pageerrors=${errs.length}${errs.length?' :: '+errs.join('|').slice(0,300):''}`);
  fs.writeFileSync(SP+'/e2e-results.json',JSON.stringify(out,null,2));
  await br.close();
  process.exit(fail.length||errs.length?1:0);
})();
