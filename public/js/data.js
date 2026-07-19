/* ═══ DATA LAYER (Module 4 — extracted from app.js, Phase B) ═══
   READ-ONLY loaders: loadAll (7-table parallel fetch), loadSettings,
   fetchRates (+ its display helper updateRateDisplay), loadAttachCounts.
   No insert/update/delete/save functions, no FIN logic; every query,
   table name and column list is byte-identical to app.js (verbatim move).
   All bindings are top-level declarations in a classic script, so they
   remain globally visible to app.js exactly as before. No load-time side
   effects except window.loadAll aliasing. Runtime deps (SB, DB, RATES,
   ATTACH_COUNTS, toast, window.t, renderAll) live in app.js/state and are
   resolved at call time — after login, long after all scripts executed. */

/* ═══ EXCHANGE RATES (read + display) ═══ */
async function fetchRates(){
  try{
    // استدعاء Edge Function لتحديث الأسعار
    await fetch(
      'https://ralifvemgapmsgrjgazh.supabase.co/functions/v1/super-function',
      {
        method:'POST',
        headers:{
          'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlmdmVtZ2FwbXNncmpnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDU5MjQsImV4cCI6MjA5NDUyMTkyNH0.uw2wupGY89h3lnkgDBka5w8eYWaeITgDOoHbwzz15J4',
          'Content-Type':'application/json'
        }
      }
    );
  }catch(e){console.warn('Edge function failed',e);}

  // اقرأ الأسعار المحدّثة من Supabase
  try{
    const{data}=await SB.from('settings').select('key,value')
      .in('key',['usd_rate','jod_rate']);
    if(data){
      data.forEach(s=>{
        if(s.key==='usd_rate'&&parseFloat(s.value)>0)RATES.USD=parseFloat(s.value);
        if(s.key==='jod_rate'&&parseFloat(s.value)>0)RATES.JOD=parseFloat(s.value);
      });
    }
  }catch(e){console.warn('fetchRates error',e);}

  updateRateDisplay();
}
function updateRateDisplay(){
  const el=document.getElementById('rate-txt');
  if(el) el.textContent='$'+RATES.USD.toFixed(2)+' | JOD '+RATES.JOD.toFixed(2);
}

/* ═══ DATA LOADING ═══ */
/* PERF (login speed): fetch and render are split so afterLogin can overlap the
   7-table fetch with loadSettings and render exactly once when BOTH are ready.
   window.loadAll keeps its original fetch+render behavior for every other
   caller (post-save refresh flows) — no behavior change outside login. */
async function loadAllData(){
    const[r1,r2,r3,r4,r5,r6,r7]=await Promise.all([
      SB.from('receipts').select('id,no,verification_token,fund_type,receipt_date,payer_type,member_id,contact_id,payer_name,amount,currency,amount_ils,exchange_rate,payment_method,description,notes,donation_display_fund,food_donation_allocation,created_by,created_at,is_deleted,version,manual_allocation,manual_debt_settlement,manual_historical_donation,manual_current_support,movement_type,destination_treasury,source_treasury,movement_reason,register_category').order('receipt_date',{ascending:false}),
      SB.from('payments').select('id,no,verification_token,fund_type,payment_date,beneficiary_type,member_id,beneficiary_name,amount,currency,amount_ils,exchange_rate,expense_type,payment_method,description,notes,approved_by,created_by,created_at,is_deleted,version,movement_type,destination_treasury,source_treasury,movement_reason').order('payment_date',{ascending:false}),
      SB.from('members').select(
'id,name,phone,member_code,notes,opening_balance,prepaid_subscription_ils,is_active,created_at,active_from_year,historical_balance_ils,historical_payments_ils,credit_balance_ils,is_migration_exception'
).order('name'),
      SB.from('contacts').select('*').order('name'),
      SB.from('annual_dues').select('*').order('year',{ascending:false}),
      SB.from('audit_log').select('id,action,description,user_name,created_at').order('created_at',{ascending:false}).limit(50),
      /* P0/V3 · Law 3 — annual subscription paid has ONE authoritative origin
         (paid_amount_ils). balance_ils is DB-derived and the override_* columns
         are constitutionally disabled (see ms_balance_is_derived /
         ms_no_independent_paid_authority); the client no longer reads any of
         these second-source fields. */
      SB.from('member_subscriptions').select('id,member_id,year,due_amount_ils,paid_amount_ils'),
      loadAttachCounts(),   /* independent read — same round trip instead of a serial one */
    ]);
    DB.receipts=r1.data||[];DB.payments=r2.data||[];DB.members=r3.data||[];
    DB.contacts=r4.data||[];DB.annual=r5.data||[];DB.audit=r6.data||[];DB.subscriptions=r7.data||[];DB._alloc=null;
    DB._loaded=true;   /* P0 — mark a successful load so read-only panels can tell "not loaded yet" from a genuine zero */
}
async function loadAll(){
  try{
    await loadAllData();
    renderAll();
  }catch(e){toast(window.t?window.t('errors.load_error'):'خطأ في تحميل البيانات','err');console.error(e);}
}
window.loadAll=loadAll;
window.loadAllData=loadAllData;

/* ═══ ATTACHMENT COUNTS (read) ═══ */
async function loadAttachCounts(){
  try{
    ATTACH_COUNTS.receipt={};ATTACH_COUNTS.payment={};
    const{data,error}=await SB.from('attachments').select('receipt_id,payment_id');
    if(error||!data)return;
    data.forEach(a=>{
      if(a.receipt_id)ATTACH_COUNTS.receipt[a.receipt_id]=(ATTACH_COUNTS.receipt[a.receipt_id]||0)+1;
      if(a.payment_id)ATTACH_COUNTS.payment[a.payment_id]=(ATTACH_COUNTS.payment[a.payment_id]||0)+1;
    });
  }catch(e){/* table may not exist yet */}
}

/* ═══ SETTINGS & OPENING BALANCES (read) ═══ */
async function loadSettings(){
  try{
    const{data}=await SB.from('settings').select('*');
    if(!data) return;
    const map={};
    data.forEach(s=>map[s.key]=s.value);
    /* Phase 10 — Year-End Lock threshold (default: previous calendar year). */
    window.LOCKED_THROUGH_YEAR = (map['locked_through_year']!=null && map['locked_through_year']!=='')
      ? Number(map['locked_through_year']) : (new Date().getFullYear()-1);
    const foodEl=document.getElementById('set-food-opening');
    const diwanEl=document.getElementById('set-diwan-opening');
    const usdEl=document.getElementById('set-usd-rate');
    const jodEl=document.getElementById('set-jod-rate');
    if(foodEl)  foodEl.value  = map['food_opening_balance']  || '0';
    if(diwanEl) diwanEl.value = map['diwan_opening_balance'] || '0';
    const fU=document.getElementById('set-food-opening-usd'),fJ=document.getElementById('set-food-opening-jod');
    const dU=document.getElementById('set-diwan-opening-usd'),dJ=document.getElementById('set-diwan-opening-jod');
    if(fU)fU.value=map['food_opening_usd']||'0'; if(fJ)fJ.value=map['food_opening_jod']||'0';
    if(dU)dU.value=map['diwan_opening_usd']||'0'; if(dJ)dJ.value=map['diwan_opening_jod']||'0';
    if(usdEl)   usdEl.value   = map['usd_rate']  || '3.70';
    if(jodEl)   jodEl.value   = map['jod_rate']  || '5.00';
    if(map['usd_rate'])  RATES.USD = parseFloat(map['usd_rate']);
    if(map['jod_rate'])  RATES.JOD = parseFloat(map['jod_rate']);
    window.FOOD_OPENING  = parseFloat(map['food_opening_balance']  || '0');
    window.DIWAN_OPENING = parseFloat(map['diwan_opening_balance'] || '0');
    /* P2-D — SINGLE formal mapping of legacy openings onto the new-model treasuries
       (Fable 5 carry-forward #3). food_opening_balance is the ORIGINAL HISTORICAL
       DEFICIT and opens the Historical-Deficit treasury; the Food treasury opens at 0
       (its legacy "opening" was memo-only); diwan_opening_balance opens Diwan.
       Every FIN2-composed display reads THIS map — nowhere else. */
    window.TREASURY_OPENINGS = {
      food: 0,
      diwan: window.DIWAN_OPENING,
      historical_deficit: window.FOOD_OPENING
    };
    window.FOOD_OPENING_USD  = parseFloat(map['food_opening_usd']  || '0');
    window.FOOD_OPENING_JOD  = parseFloat(map['food_opening_jod']  || '0');
    window.DIWAN_OPENING_USD = parseFloat(map['diwan_opening_usd'] || '0');
    window.DIWAN_OPENING_JOD = parseFloat(map['diwan_opening_jod'] || '0');
  }catch(e){ console.error('loadSettings error',e); }
}
