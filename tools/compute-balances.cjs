/**
 * tools/compute-balances.cjs — authoritative member balances via the REAL engine.
 *
 * Runs the project's FROZEN financial engine (public/js/fin.js) headlessly inside a
 * Node `vm` sandbox, fed from the exported JSON (exports/raw). No balance formula is
 * reimplemented — FIN.memberStatement() is the single source of truth, exactly as the
 * live app computes it. Produces:
 *   exports/computed/member_balances.json  (per-member statement result)
 *   exports/computed/fund_summary.json     (cash in/out per fund from receipts/payments)
 *
 * Usage: node tools/compute-balances.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'exports', 'raw');
const OUT = path.join(ROOT, 'exports', 'computed');

/* ---- load exported tables (bundle-aware, same rule as the exporter) -------- */
function loadTables() {
  const tables = {};
  for (const f of fs.readdirSync(RAW).sort()) {
    if (!f.endsWith('.json') || f === '_meta.json') continue;
    const data = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
    if (Array.isArray(data)) tables[f.replace(/\.json$/, '')] = data;
    else if (data && typeof data === 'object')
      for (const [k, v] of Object.entries(data)) tables[k] = Array.isArray(v) ? v : [];
  }
  return tables;
}

const T = loadTables();
const settings = Object.fromEntries((T.settings || []).map(s => [s.key, s.value]));
const FOOD_OPENING = Number(settings.food_opening_balance || 0);
const LOCKED_THROUGH_YEAR = settings.locked_through_year != null && settings.locked_through_year !== ''
  ? Number(settings.locked_through_year) : (new Date().getFullYear() - 1);

/* ---- DB shape expected by fin.js (note: DB.subscriptions, not member_subscriptions) */
const DB = {
  members: T.members || [],
  subscriptions: T.member_subscriptions || [],
  receipts: T.receipts || [],
  payments: T.payments || [],
  refunds: T.refunds || [],
  member_write_offs: T.member_write_offs || [],
};

/* ---- sandbox globals the engine resolves at call time ---------------------- */
const FoodDonationAllocation = require(path.join(ROOT, 'public', 'js', 'foodDonationAllocation.js'));
const sandbox = {
  DB, console, Date, Math, Number, String, Object, Array, JSON, Boolean, isNaN,
  parseInt, parseFloat, RegExp, Set, Map,
  document: { getElementById: () => null },
};
sandbox.window = sandbox; // many refs use window.X and bare X interchangeably
sandbox.window.FoodDonationAllocation = FoodDonationAllocation;
sandbox.window.FOOD_OPENING = FOOD_OPENING;
sandbox.window.LOCKED_THROUGH_YEAR = LOCKED_THROUGH_YEAR;
sandbox.lockedThroughYear = () => LOCKED_THROUGH_YEAR;
sandbox.today = () => new Date().toISOString().slice(0, 10);
sandbox.fmt = n => String(n);
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

/* fin.js declares `const FIN = {...}` (not exported); capture it via window. */
const finSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'fin.js'), 'utf8')
  + '\n;window.__FIN__ = FIN;';
vm.runInContext(finSrc, sandbox, { filename: 'fin.js' });
const FIN = sandbox.window.__FIN__;
if (!FIN || typeof FIN.memberStatement !== 'function') throw new Error('engine load failed');

/* ---- compute per-member balances via the real engine ----------------------- */
const r2 = n => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const balances = [];
for (const m of DB.members) {
  const st = FIN.memberStatement(m.id);
  balances.push({
    member_code: m.member_code || '',
    name: m.name || '',
    phone: m.phone || '',
    active_from_year: m.active_from_year ?? '',
    is_active: m.is_active === false ? 'غير نشط' : 'نشط',
    historical_debt: r2(st.openingBalance),       // historical_balance_ils
    historical_paid: r2(Number(m.historical_payments_ils || 0)),
    carried: r2(st.openingBalance - Number(m.historical_payments_ils || 0)),
    total_dues: r2(st.totalDues),                 // Σ subscription dues
    total_paid: r2(st.totalPaid),                 // hist paid + subs paid + food + collections
    debt_settled: r2(st.debtSettled),             // ITEM-9 food-donation settlement
    refunded: r2(st.refunded),
    final_balance: r2(st.finalBalance),           // >0 owed · <0 credit
    credit_balance: r2(st.creditBalance),
    status: st.finalBalance > 0.005 ? 'عليه مستحقات'
          : st.finalBalance < -0.005 ? 'له رصيد دائن' : 'مسدد',
  });
}
balances.sort((a, b) => b.final_balance - a.final_balance);

/* ---- fund cash summary (direct from receipts/payments, non-deleted) -------- */
const liveR = (DB.receipts || []).filter(r => !r.is_deleted);
const liveP = (DB.payments || []).filter(p => !p.is_deleted);
const funds = ['diwan', 'food', 'donation'];
const fundSummary = funds.map(f => {
  const inc = r2(liveR.filter(r => r.fund_type === f).reduce((s, r) => s + Number(r.amount_ils || 0), 0));
  const out = r2(liveP.filter(p => p.fund_type === f).reduce((s, p) => s + Number(p.amount_ils || 0), 0));
  return { fund: f, receipts_ils: inc, payments_ils: out, net_ils: r2(inc - out) };
});

/* ---- totals + engine-consistency anchors ----------------------------------- */
const sum = (arr, k) => r2(arr.reduce((s, x) => s + Number(x[k] || 0), 0));
const totalOwed = r2(balances.filter(b => b.final_balance > 0).reduce((s, b) => s + b.final_balance, 0));
const totalCredit = r2(balances.filter(b => b.final_balance < 0).reduce((s, b) => s + (-b.final_balance), 0));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'member_balances.json'), JSON.stringify(balances, null, 0));
fs.writeFileSync(path.join(OUT, 'fund_summary.json'), JSON.stringify(fundSummary, null, 0));

console.log(`engine: FOOD_OPENING=${FOOD_OPENING}  LOCKED_THROUGH_YEAR=${LOCKED_THROUGH_YEAR}`);
console.log(`members: ${balances.length}`);
console.log(`Σ total_dues=${sum(balances, 'total_dues')}  Σ total_paid=${sum(balances, 'total_paid')}  Σ debt_settled=${sum(balances, 'debt_settled')}`);
console.log(`Σ final_balance=${sum(balances, 'final_balance')}  (owed=${totalOwed}, credit=${totalCredit})`);
console.log('fund summary:', JSON.stringify(fundSummary));
console.log('top 3 owed:', balances.slice(0, 3).map(b => `${b.name}=${b.final_balance}`).join(' | '));
