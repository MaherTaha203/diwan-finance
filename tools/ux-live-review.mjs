/* UX-001 U-8 — seeded live per-page review harness (read-only, non-production QA tool).
   ---------------------------------------------------------------------------------
   Serves public/ over a local static server and stubs the Supabase client (auth +
   chainable .from() returning in-memory SEED rows) so the REAL, unmodified app boots
   authenticated as admin and populates window.DB through its own loadAllData path.
   It then navigates each page, screenshots it, and reports per-page accessibility
   signals (headings, focusables, unlabeled icon buttons/inputs, non-keyboard clickables).

   No production code is touched and no real network/Supabase is used — this is the
   "seed / non-production path" UX-001 U-8 and REL-001 R-9 asked for, so the authenticated
   pages can be reviewed live without production credentials.

   Usage:  node tools/ux-live-review.mjs [outDir]
   Requires: Playwright + a Chromium at /opt/pw-browsers/chromium (this environment).
   On other machines set PLAYWRIGHT_BIN / a chromium executablePath as needed. */
import http from 'http'; import fs from 'fs'; import path from 'path';
import os from 'os'; import { fileURLToPath } from 'url';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js'; const { chromium } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'public');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'ux-live-review');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.svg':'image/svg+xml' };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end('');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'}); fs.createReadStream(fp).pipe(res); });
await new Promise(r=>server.listen(0,r)); const PORT=server.address().port, BASE=`http://127.0.0.1:${PORT}`;

const STUB = `
window.__SEED = {
  user_roles: [{ user_id:'u1', role:'admin', full_name:'مدير النظام', is_disabled:false }],
  members: [
    {id:'m1',member_code:'A-001',name:'أحمد آل طه',phone:'0590000001',is_active:true,historical_balance_ils:300,historical_payments_ils:100,active_from_year:2020},
    {id:'m2',member_code:'A-002',name:'محمد آل طه',phone:'0590000002',is_active:true,historical_balance_ils:0,historical_payments_ils:0,active_from_year:2021},
    {id:'m3',member_code:'A-003',name:'خالد آل طه',phone:'0590000003',is_active:true,historical_balance_ils:150,historical_payments_ils:150,active_from_year:2019},
    {id:'m4',member_code:'A-004',name:'سعيد آل طه',phone:'0590000004',is_active:true,historical_balance_ils:500,historical_payments_ils:0,active_from_year:2022}
  ],
  receipts: [
    {id:'r1',no:'R-001',fund_type:'food',receipt_date:'2025-03-01',payer_name:'أحمد آل طه',member_id:'m1',amount:200,amount_ils:200,currency:'ILS',payment_method:'cash',movement_type:'subscription_payment',is_deleted:false,version:1},
    {id:'r2',no:'R-002',fund_type:'diwan',receipt_date:'2025-03-05',payer_name:'متبرع',amount:500,amount_ils:500,currency:'ILS',payment_method:'transfer',movement_type:'donation_cash',destination_treasury:'diwan',is_deleted:false,version:1},
    {id:'r3',no:'R-003',fund_type:'food',receipt_date:'2025-03-08',payer_name:'محمد آل طه',member_id:'m2',amount:120,amount_ils:120,currency:'ILS',payment_method:'cash',movement_type:'donation_cash',destination_treasury:'food',donation_display_fund:'food',is_deleted:false,version:1}
  ],
  payments: [
    {id:'p1',no:'P-001',fund_type:'food',payment_date:'2025-03-10',beneficiary_name:'مورّد الطعام',amount:120,amount_ils:120,currency:'ILS',expense_type:'food_expense',is_deleted:false,version:1},
    {id:'p2',no:'P-002',fund_type:'diwan',payment_date:'2025-03-12',beneficiary_name:'صيانة',amount:80,amount_ils:80,currency:'ILS',expense_type:'maintenance',is_deleted:false,version:1}
  ],
  contacts: [{id:'c1',name:'مورّد الطعام',phone:'0591111111'}],
  annual_dues: [{id:'ad1',year:2024,amount:200,member_count:4,applied_by:'مدير النظام',applied_at:'2024-01-15T00:00:00Z'},{id:'ad2',year:2025,amount:200,member_count:4,applied_by:'مدير النظام',applied_at:'2025-01-10T00:00:00Z'}],
  audit_log: [
    {id:'a1',action:'create_member',description:'إضافة عضو أحمد آل طه',user_name:'مدير النظام',created_at:'2025-03-01T10:00:00Z',table_name:'members'},
    {id:'a2',action:'create_receipt',description:'سند قبض R-001',user_name:'مدير النظام',created_at:'2025-03-01T10:05:00Z',table_name:'receipts'}
  ],
  member_subscriptions: [
    {id:'s1',member_id:'m1',year:2024,due_amount_ils:200,paid_amount_ils:200},
    {id:'s2',member_id:'m2',year:2024,due_amount_ils:200,paid_amount_ils:100},
    {id:'s3',member_id:'m1',year:2025,due_amount_ils:200,paid_amount_ils:0},
    {id:'s4',member_id:'m4',year:2025,due_amount_ils:200,paid_amount_ils:0}
  ],
  refunds: [], member_write_offs: [], internal_transfers: [], fiscal_snapshots: [], historical_subscription_truth: [], settings: [], attachments: []
};
(function(){
  function thenable(data){ return { then:function(res){ return Promise.resolve({data:data,error:null}).then(res); } }; }
  function chain(table){
    var o={}; var rows=function(){ return window.__SEED[table]||[]; };
    ['select','order','limit','eq','neq','in','gte','lte','lt','gt','filter','or','not','is','contains','range','ilike','like','match','overlaps'].forEach(function(m){o[m]=function(){return o;};});
    o.single=function(){ return thenable(rows()[0]||null); };
    o.maybeSingle=function(){ return thenable(rows()[0]||null); };
    o.then=function(res,rej){ return Promise.resolve({data:rows(),error:null}).then(res,rej); };
    o.insert=function(){return thenable(null);}; o.update=function(){return o;}; o.delete=function(){return o;}; o.upsert=function(){return thenable(null);};
    return o;
  }
  var client={
    auth:{
      getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'admin@diwan.test',app_metadata:{},user_metadata:{}}}},error:null});},
      getUser:function(){return Promise.resolve({data:{user:{id:'u1',email:'admin@diwan.test',app_metadata:{},user_metadata:{}}},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};},
      signOut:function(){return Promise.resolve({error:null});},
      signInWithPassword:function(){return Promise.resolve({data:{},error:null});},
      refreshSession:function(){return Promise.resolve({data:{session:null},error:null});}
    },
    from:function(t){return chain(t);},
    rpc:function(){return thenable([]);},
    functions:{invoke:function(){return Promise.resolve({data:null,error:null});}},
    channel:function(){return {on:function(){return this;},subscribe:function(){return this;}};},
    removeChannel:function(){}
  };
  window.supabase={ createClient:function(){ return client; } };
})();
`;

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport:{width:1366,height:900} });
await ctx.route('**', route=>{ const u=route.request().url();
  if(u.startsWith(BASE)) return route.continue();
  if(/supabase-js/.test(u)) return route.fulfill({status:200,contentType:'text/javascript',body:STUB});
  return route.fulfill({status:200,contentType:/\.css/.test(u)?'text/css':'text/javascript',body:''});
});
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto(BASE+'/index.html',{waitUntil:'load'});
const authed = await page.waitForFunction(()=>{ var a=document.getElementById('app'); return a && getComputedStyle(a).display!=='none'; },{timeout:15000}).then(()=>true).catch(()=>false);

const pages = ['dash','members','member-stmt','food-rec','diwan-rec','food-pay','diwan-pay','don','food-stmt','annual-debt','delinquent','annual','treasury-workspace','dues-workspace','audit','users','settings'];
const report = { authed, bootErrors: errs.slice(0,8), outDir: OUT, pages:{} };
if (authed) {
  for (const pg of pages) {
    try {
      await page.evaluate((p)=>window.nav&&window.nav(p), pg);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT, pg+'.png') });
      const a = await page.evaluate(()=>{
        var vis=function(el){return el && el.offsetParent!==null;};
        var q=function(s){return [].slice.call(document.querySelectorAll(s));};
        return {
          visH1: q('#app h1').filter(vis).length,
          focusables: q('#app a[href],#app button,#app input,#app select,#app textarea,#app [tabindex]').filter(vis).length,
          iconBtnsNoName: q('#app button').filter(function(b){return vis(b)&&!b.textContent.trim()&&b.querySelector('i')&&!b.getAttribute('aria-label')&&!b.getAttribute('title');}).length,
          inputsNoLabel: q('#app input,#app select,#app textarea').filter(function(e){return vis(e)&&!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!(e.id&&document.querySelector('label[for="'+e.id+'"]'));}).length,
          clickableNoRole: q('#app [onclick]').filter(function(e){return vis(e)&&['SPAN','DIV','LI','TD','TR'].indexOf(e.tagName)>=0&&!e.hasAttribute('tabindex');}).length
        };
      });
      report.pages[pg] = a;
    } catch(e){ report.pages[pg] = { error: String(e).slice(0,120) }; }
  }
}
console.log(JSON.stringify(report,null,2));
await browser.close(); server.close();
process.exit(authed ? 0 : 1);
