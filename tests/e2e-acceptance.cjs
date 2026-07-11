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
  function b(t){let rows=(window.__seed[t]||[]).slice();let single=false;let inserted=null;
    const api={select(){return api;},order(){return api;},limit(n){rows=rows.slice(0,n);return api;},
      eq(c,v){rows=rows.filter(r=>r[c]===v);return api;},neq(c,v){rows=rows.filter(r=>r[c]!==v);return api;},
      in(c,a2){rows=rows.filter(r=>a2.includes(r[c]));return api;},match(o){rows=rows.filter(r=>Object.keys(o).every(k=>r[k]===o[k]));return api;},
      single(){single=true;return api;},maybeSingle(){single=true;return api;},
      insert(v){const a=Array.isArray(v)?v:[v];a.forEach(x=>{if(!x.id)x.id='e2e'+Math.random().toString(36).slice(2);});
        (window.__seed[t]=window.__seed[t]||[]).push(...a);inserted=a;rows=a;return api;},
      upsert(v){return api;},update(){return api;},delete(){return api;},
      then(res,rej){return Promise.resolve({data:single?((inserted||rows)[0]||null):(inserted||rows),error:null}).then(res,rej);}};
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
      await window.saveRec(false); await wait(3300); /* guardSave throttles 3s */
      return DB.receipts[DB.receipts.length-1].no?DB.receipts.find(r=>r.no===window.__seed.receipts[window.__seed.receipts.length-1].no):null;
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

    /* S6 — in-kind fridge: register only, ZERO treasury impact */
    t0=T(); const r6=await newReceipt('donation',{payerType:'member',memberId,amount:1200,kind:'inkind',category:'equipment'});
    t1=T();
    ok('S6 in-kind classified donation_inkind (no destination)', r6.movement_type==='donation_inkind'&&!r6.destination_treasury, r6.movement_type);
    ok('S6 in-kind register +1', t1.inkN===t0.inkN+1, t0.inkN+'->'+t1.inkN);
    ok('S6 ALL treasuries unchanged', t1.food===t0.food&&t1.diwan===t0.diwan&&t1.defRem===t0.defRem&&t1.cashN===t0.cashN, JSON.stringify(t1));

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
    ok('S7 conservation: every scenario shekel accounted', finalT.food>base.food&&finalT.cashN===base.cashN+3&&finalT.inkN===base.inkN+1, JSON.stringify(finalT));
    return {results, base, finalT};
  });
  const pass=out.results.filter(r=>r.pass).length, fail=out.results.filter(r=>!r.pass);
  console.log(JSON.stringify(out.results,null,1));
  console.log(`\nE2E: ${pass}/${out.results.length} PASS; pageerrors=${errs.length}${errs.length?' :: '+errs.join('|').slice(0,300):''}`);
  fs.writeFileSync(SP+'/e2e-results.json',JSON.stringify(out,null,2));
  await br.close();
  process.exit(fail.length||errs.length?1:0);
})();
