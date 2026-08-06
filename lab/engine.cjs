/* ═══════════════════════════════════════════════════════════════════════════
   Lab · Decision Engine (offline, read-only)  — ADDITIVE lab component.
   Loads the REAL production engine (public/js/fin.js) headless over a STATIC
   snapshot (lab/seed/prod-snapshot.json). No network, no DB writes, no system
   change.  This file is the Business-Logic Reference (Logic Freeze v2), and it
   embodies the AUTHORITATIVE Owner Decisions verbatim:
     D1 Food receipts only (scope).
     D2 Automatic allocation starts from the FIRST ERP year (2025), then year by
        year in order (the fiscal-lock exclusion does NOT apply to allocation).
     D3 Historical Deficit NEVER participates automatically.
     D4 Historical Deficit is ALWAYS an explicit accountant decision.
     D5 An explicit deficit amount is DEDUCTED FIRST; only the remainder is
        auto-allocated.
     D6 When all ERP subscriptions are satisfied, the remaining balance becomes
        the FIRST FUTURE subscription year — NOT generic credit.
     D7 Legacy balances before ERP remain untouched (the deficit = legacy).
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const ROOT = path.join(__dirname, '..');

let FIN = null, LOCKED = 2025, SNAP = null, BYID = {}, FIRST_FUTURE = 2027;
/* ONE persistent window object: fin.js closes over it at eval time, so we mutate
   its props and swap global.DB per load (the engine is evaluated once). */
const WIN = {
  MODEL2Allocation: require(path.join(ROOT, 'public/js/allocation-engine.js')),
  FoodDonationAllocation: require(path.join(ROOT, 'public/js/foodDonationAllocation.js')),
  FOOD_OPENING: 0, LOCKED_THROUGH_YEAR: 2025, RECEIPT_ALLOCATION_ENABLED: true,
};
global.window = WIN;
global.today = () => '2026-08-06';

function load(snapshotPath) {
  SNAP = JSON.parse(fs.readFileSync(snapshotPath || path.join(__dirname, 'seed', 'prod-snapshot.json'), 'utf8'));
  const st = {}; (SNAP.settings || []).forEach(s => st[s.key] = s.value);
  LOCKED = parseInt(st.locked_through_year, 10); if (!isFinite(LOCKED)) LOCKED = new Date().getFullYear() - 1;
  WIN.FOOD_OPENING = Number(st.food_opening_balance || 0);
  WIN.LOCKED_THROUGH_YEAR = LOCKED;
  const subs = SNAP.subscriptions || SNAP.member_subscriptions || [];
  FIRST_FUTURE = Math.max.apply(null, subs.map(s => Number(s.year)).concat([2025])) + 1; // first year AFTER the last ERP year
  global.DB = {
    members: SNAP.members || [], subscriptions: subs, receipts: SNAP.receipts || [],
    payments: [], member_write_offs: [], refunds: [],
    allocation_records: SNAP.allocation_records || [], _alloc: null,
  };
  if (!FIN) FIN = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'public/js/fin.js'), 'utf8') + ';FIN');
  BYID = {}; (SNAP.members || []).forEach(m => BYID[m.id] = m);
  return { members: SNAP.members, byId: BYID, settings: st, locked: LOCKED, firstFuture: FIRST_FUTURE };
}

/* the member's REAL position — ERP subscription years with remaining (INCLUDING the
   first ERP year, per D2); historical deficit = legacy/pre-ERP (D7), never auto. */
function position(memberId) {
  const dl = FIN.memberDelinquency(memberId) || { byYear: {}, outstanding: 0, historicalRemaining: 0 };
  const al = FIN.memberAllocation(memberId) || { historical: { remaining: 0 }, creditRemaining: 0 };
  const subYears = [];
  Object.keys(dl.byYear || {}).forEach(y => {
    const yr = Number(y), rem = R2(dl.byYear[y].remaining);
    if (rem > 0.005) subYears.push({ year: yr, remaining: rem });
  });
  subYears.sort((a, b) => a.year - b.year);
  const deficit = R2((al.historical && al.historical.remaining) || dl.historicalRemaining || 0);
  const credit = R2(al.creditRemaining || 0);
  return {
    id: memberId, name: (BYID[memberId] || {}).name || memberId, code: (BYID[memberId] || {}).member_code || '',
    subYears, deficit, credit, outstanding: R2(dl.outstanding || 0), isDelinquent: !!dl.isDelinquent,
  };
}

/* THE food-receipt decision (Owner Decisions · Logic Freeze v2), step-by-step. */
function propose(memberId, amount, opts) {
  opts = opts || {};
  const deficitAmount = R2(opts.deficitAmount || 0);   // explicit accountant amount → Historical Deficit
  const pos = position(memberId);
  const steps = []; let rem = R2(amount);
  // D3/D4/D5 — explicit Historical Deficit, deducted FIRST
  if (deficitAmount > 0.005 && pos.deficit > 0.005) {
    const d = R2(Math.min(deficitAmount, pos.deficit, rem));
    if (d > 0.005) { steps.push({ target: 'historical', kind: 'historical', amount: d,
      reason: 'قرار المحاسب: تسوية عجز تاريخي — تُخصم أولاً (العجز ' + pos.deficit + ')' }); rem = R2(rem - d); }
  }
  // D2 — automatic allocation over ERP subscription years, oldest-first from the first ERP year
  pos.subYears.forEach(y => {
    if (rem <= 0.005) return;
    const take = R2(Math.min(rem, y.remaining));
    if (take > 0.005) { steps.push({ target: 'due:' + y.year, kind: 'due', year: y.year, amount: take,
      reason: 'اشتراك ERP سنة ' + y.year + ' (تلقائي، الأقدم أولاً) — المتبقٍّ ' + y.remaining }); rem = R2(rem - take); }
  });
  // D6 — surplus becomes the FIRST FUTURE subscription year (not generic credit)
  if (rem > 0.005) {
    steps.push({ target: 'due:' + FIRST_FUTURE, kind: 'future', year: FIRST_FUTURE, amount: rem,
      reason: 'كل اشتراكات ERP مسدَّدة → الفائض يصبح اشتراك السنة المستقبلية الأولى ' + FIRST_FUTURE }); rem = 0;
  }
  const toCurrent = R2(steps.filter(s => s.kind === 'due' || s.kind === 'historical').reduce((a, s) => a + s.amount, 0));
  const toFuture = R2(steps.filter(s => s.kind === 'future').reduce((a, s) => a + s.amount, 0));
  const allocated = R2(toCurrent + toFuture);
  return {
    member: pos, amount: R2(amount), deficitAmount, steps,
    toObligations: toCurrent, toFuture, allocated,
    remaining: R2(R2(amount) - allocated),
    balanced: Math.abs(R2(amount) - allocated) < 0.005 && amount > 0.005,
    balanceAfter: R2(pos.outstanding - toCurrent),
  };
}

module.exports = { load, position, propose, R2,
  get LOCKED() { return LOCKED; }, get FIRST_FUTURE() { return FIRST_FUTURE; }, get SNAP() { return SNAP; } };
