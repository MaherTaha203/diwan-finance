/* Q5 VISUAL/FUNCTIONAL EVIDENCE — drives the REAL app (forms, navigation, renderers)
   on the production seed and captures before/after screenshots for the owner's
   three scenarios + the no-double-counting numbers. Usage: node q5-evidence.cjs <port> */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const SP=__dirname, PORT=process.argv[2]||'3272';
const OUT=SP+'/q5-evidence'; fs.mkdirSync(OUT,{recursive:true});
const seed=JSON.parse(fs.readFileSync(SP+'/roundtrip-seed.json','utf8'));
/* synthetic actor for scenario B only (clearly labeled تجريبي): a member with NO debt */
seed.members.push({id:'q5-m-nodebt',name:'عضو تجريبي بلا ذمة — ق5',is_active:true,
  historical_balance_ils:0,historical_payments_ils:0,active_from_year:2025});
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
  const ctx=await br.newContext({viewport:{width:1240,height:1050},locale:'ar'});
  await ctx.addInitScript(`(${HARNESS})(${JSON.stringify(seed)})`);
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:'+PORT+'/index.html',{waitUntil:'load',timeout:25000}).catch(()=>{});
  await p.waitForFunction(()=>{const a=document.getElementById('app');return a&&getComputedStyle(a).display!=='none';},{timeout:15000}).catch(()=>{});
  await p.waitForTimeout(1200);
  const shot=async n=>{await p.waitForTimeout(350);await p.screenshot({path:OUT+'/'+n+'.png'});console.log('shot',n);};

  const S={}; const num=async fn=>await p.evaluate(fn);
  const T=()=>({food:FIN2.composed().food,defRem:FIN2.composed().historical_deficit_remaining,
    regN:FIN2.cashDonationRegister().length,
    regS:Math.round(FIN2.cashDonationRegister().reduce((s,x)=>s+Number(x.amount||0),0)*100)/100,
    legFood:Math.round(FIN.foodBalance()*100)/100,legDef:Math.round(FIN.foodDeficitRemaining()*100)/100,
    net:Math.round(FIN.foodNetPosition()*100)/100});

  /* pick the scenario-A member: real member with debt >= 500 */
  const A=await num(()=>{const m=DB.members.find(m=>m.is_active!==false&&FIN.memberStatement(m.id).finalBalance>=500&&m.id!=='q5-m-nodebt');
    return {id:m.id,name:m.name,bal:Math.round(FIN.memberStatement(m.id).finalBalance*100)/100};});
  console.log('Scenario-A member:',JSON.stringify(A));

  const gotoMember=async id=>{await p.evaluate(id=>{window.nav('member-stmt');},id);await p.waitForTimeout(250);
    await p.evaluate(id=>{document.getElementById('ms-member').value=id;window.renderMemberStmt();},id);await p.waitForTimeout(400);};
  const gotoFoodStmt=async()=>{await p.evaluate(()=>{window.nav('food-stmt');});await p.waitForTimeout(250);
    await p.evaluate(()=>{window.renderStmt('food');});await p.waitForTimeout(400);};
  const gotoTreasury=async f=>{await p.evaluate(f=>{window.nav('dash');setTimeout(()=>window.selectTreasuryFund(f),150);},f);await p.waitForTimeout(600);};
  const gotoDon=async()=>{await p.evaluate(()=>{window.nav('don');});await p.waitForTimeout(400);};

  async function newReceipt(fund,fields){
    await p.evaluate(async({fund,fields})=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const set=(id,v)=>{const el=document.getElementById(id);if(el){el.value=v;el.dispatchEvent(new Event('change'));}};
      window.openRec(fund); await wait(200);
      set('rec-payer-type',fields.payerType||'member'); window.onPayerTypeChange&&window.onPayerTypeChange(); await wait(80);
      if(fields.memberId) set('rec-member',fields.memberId);
      if(fields.payerName) set('rec-payer-name',fields.payerName);
      set('rec-amount',fields.amount); document.getElementById('rec-amount').dispatchEvent(new Event('input'));
      set('rec-date',new Date().toISOString().slice(0,10));
      if(fund==='donation'){
        set('rec-don-kind',fields.kind||'cash'); window.onDonKindChange(); await wait(60);
        set('rec-don-display',fields.display); window.onDonDisplayChange(); await wait(60);
        if(fields.alloc) set('rec-don-alloc-type',fields.alloc);
      }
      window.__n0=window.__seed.receipts.length;
      await window.saveRec(false);
    },{fund,fields});
    await p.waitForTimeout(3400);
    const okIns=await num(()=>window.__seed.receipts.length>window.__n0);
    if(!okIns) throw new Error('insert did not happen for '+JSON.stringify(fields));
  }

  /* ── BASELINE (production numbers, branch code — proves zero retroactive effect) ── */
  S.base=await num(T);
  await gotoTreasury('food');      await shot('00-baseline-food-tab');
  await gotoTreasury('deficit');   await shot('01-baseline-deficit-tab');
  await gotoTreasury('registers'); await shot('02-baseline-registers-tab');

  /* ── SCENARIO A — member WITH debt donates 500 to food ── */
  await gotoMember(A.id);  await shot('03-A-before-member-stmt');
  await gotoFoodStmt();    await shot('04-A-before-food-stmt');
  await newReceipt('donation',{payerType:'member',memberId:A.id,amount:500,kind:'cash',display:'food',alloc:'support_current'});
  S.afterA=await num(T);
  S.afterA_member=await p.evaluate(id=>Math.round(FIN.memberStatement(id).finalBalance*100)/100,A.id);
  await gotoMember(A.id);          await shot('05-A-after-member-stmt');
  await gotoFoodStmt();            await shot('06-A-after-food-stmt');
  await gotoTreasury('deficit');   await shot('07-A-after-deficit-tab');
  await gotoTreasury('registers'); await shot('08-A-after-registers-tab');
  await gotoDon();                 await shot('09-A-after-donations-badge');

  /* ── SCENARIO B — member WITHOUT debt donates 500 to food ── */
  await newReceipt('donation',{payerType:'member',memberId:'q5-m-nodebt',amount:500,kind:'cash',display:'food',alloc:'support_current'});
  S.afterB=await num(T);
  S.afterB_member=await num(()=>Math.round(FIN.memberStatement('q5-m-nodebt').finalBalance*100)/100);
  await gotoTreasury('registers'); await shot('10-B-after-registers-tab');
  await gotoTreasury('deficit');   await shot('11-B-after-deficit-unchanged');
  await gotoTreasury('food');      await shot('12-B-after-food-tab');
  await gotoMember('q5-m-nodebt'); await shot('13-B-member-stmt-zero');

  /* ── SCENARIO C — donor from OUTSIDE the family gives 500 for food ── */
  await newReceipt('food',{payerType:'manual',payerName:'متبرع خارجي — ق5 (تجريبي)',amount:500});
  S.afterC=await num(T);
  await gotoTreasury('registers'); await shot('14-C-after-registers-tab');
  await gotoFoodStmt();            await shot('15-C-after-food-stmt');

  /* ── functional assertions (the numbers behind the pictures) ── */
  const R=[]; const ok=(n,c,d)=>R.push({n,pass:!!c,d:String(d??'')});
  const r2=x=>Math.round(x*100)/100;
  ok('baseline = production (1694.04 / -8139 / 7=4700)', S.base.food===1694.04&&S.base.defRem===-8139&&S.base.regN===7&&S.base.regS===4700, JSON.stringify(S.base));
  ok('A: food balance UNCHANGED (500 fully settles debt slice)', S.afterA.food===S.base.food&&S.afterA.legFood===S.base.legFood, JSON.stringify([S.base.food,S.afterA.food]));
  ok('A: deficit fell by exactly 500 (-8139 -> -7639)', S.afterA.defRem===r2(S.base.defRem+500)&&S.afterA.legDef===r2(S.base.legDef+500), S.afterA.defRem);
  ok('A: member debt fell by exactly 500', S.afterA_member===r2(A.bal-500), A.bal+' -> '+S.afterA_member);
  ok('A: cash-donation register UNCHANGED (7=4700)', S.afterA.regN===7&&S.afterA.regS===4700, S.afterA.regN+'='+S.afterA.regS);
  ok('A: net moved by exactly the cash 500 (counted ONCE)', S.afterA.net===r2(S.base.net+500), S.base.net+' -> '+S.afterA.net);
  ok('B: food +500, deficit UNCHANGED, register +1 (8=5200)', S.afterB.food===r2(S.afterA.food+500)&&S.afterB.defRem===S.afterA.defRem&&S.afterB.regN===8&&S.afterB.regS===5200, JSON.stringify(S.afterB));
  ok('B: no-debt member balance stays 0', S.afterB_member===0, S.afterB_member);
  ok('B: net moved by exactly the cash 500', S.afterB.net===r2(S.afterA.net+500), '');
  ok('C: food +500, register +1 (9=5700), deficit unchanged', S.afterC.food===r2(S.afterB.food+500)&&S.afterC.regN===9&&S.afterC.regS===5700&&S.afterC.defRem===S.afterB.defRem, JSON.stringify(S.afterC));
  ok('C: net moved by exactly the cash 500', S.afterC.net===r2(S.afterB.net+500), '');
  fs.writeFileSync(OUT+'/q5-evidence-numbers.json',JSON.stringify({A,S,R},null,2));
  const pass=R.filter(x=>x.pass).length;
  R.filter(x=>!x.pass).forEach(x=>console.log('FAIL:',x.n,'::',x.d));
  console.log(`EVIDENCE: ${pass}/${R.length} PASS; pageerrors=${errs.length}${errs.length?' :: '+errs.join('|').slice(0,200):''}`);
  await br.close();
  process.exit(R.length-pass||errs.length?1:0);
})();
