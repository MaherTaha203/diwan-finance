/* ═══ UTILS (Module 1 — extracted from app.js, Phase B) ═══
   Pure/global helper bindings shared across all classic scripts.
   Loaded via <script defer> BEFORE app.js, so these top-level `const`
   bindings live in the shared global lexical environment and are
   available to app.js exactly as if still inlined (concatenation-equivalent).
   Behavior unchanged. `gm`/`gmn` read the global `DB` at call time only. */
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Math.round(Number(n||0)).toLocaleString('en-US');
const fmtEN=n=>Math.round(Number(n||0)).toLocaleString('en-US');
const fmtDEN=n=>Number(n||0).toFixed(2);
const fmtD=n=>Number(n||0).toFixed(2);
const fdate=d=>{if(!d)return'—';try{const dt=new Date(d);return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();}catch(e){return d;}};
const gm=id=>DB.members.find(m=>m.id===id);
const gmn=id=>gm(id)?.name||'—';
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/* P0 — next voucher number from the MAX existing suffix (+1), never a row count.
   A count-based scheme reused a live number whenever a gap existed (a hard-deleted
   or filtered row), silently colliding with an existing voucher. Max-based numbering
   is monotonic and gap-safe. Residual multi-client concurrency (two tabs reading the
   same max) still needs a DB unique index on `no` — verified/enforced in P2. */
const nextNo=(prefix,arr)=>{
  let mx=0;
  (arr||[]).forEach(x=>{
    if(!x||typeof x.no!=='string'||!x.no.startsWith(prefix+'-'))return;
    const n=parseInt(x.no.slice(prefix.length+1),10);
    if(Number.isFinite(n)&&n>mx)mx=n;
  });
  return prefix+'-'+String(mx+1).padStart(5,'0');
};
