/* ═══════════════════════════════════════════════════════════════════════════
   Lab · Decision Engine (offline, read-only)  — ADDITIVE lab component.
   Loads the REAL production engine (public/js/fin.js) headless over a STATIC
   snapshot (lab/seed/prod-snapshot.json). No network, no DB writes, no system
   change. Exposes:
     load(snapshotPath)          → { members, byId, settings, locked }
     position(memberId)          → the member's REAL financial position (via the
                                    real FIN.memberDelinquency / memberAllocation)
     propose(memberId, amount, o)→ the Food-Receipt DECISION (confirmation-first)
                                    with a step-by-step trace + reason per step.
   The proposal logic here is the LAB REFERENCE for the food-receipt engine
   (Business-Logic Reference). It reads the real member position; it settles the
   OLDEST OPEN subscription year first, then (optional) the historical deficit,
   then routes any surplus to future credit. Locked years are never settled by a
   subscription line (fiscal lock) — surfaced separately.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const ROOT = path.join(__dirname, '..');

let FIN = null, LOCKED = 2025, SNAP = null, BYID = {};
/* ONE persistent window object: fin.js closes over it at eval time, so we mutate
   its props (never replace it) and swap global.DB per load. The engine is evaluated
   exactly once (fin.js declares a top-level `FIN`; re-eval would redeclare it), and
   its methods read global.DB + window.* at CALL time — so reloading is data-only. */
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
  global.DB = {
    members: SNAP.members || [],
    subscriptions: SNAP.subscriptions || SNAP.member_subscriptions || [],
    receipts: SNAP.receipts || [],
    payments: [], member_write_offs: [], refunds: [],
    allocation_records: SNAP.allocation_records || [],
    _alloc: null,
  };
  if (!FIN) FIN = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'public/js/fin.js'), 'utf8') + ';FIN');
  BYID = {}; (SNAP.members || []).forEach(m => BYID[m.id] = m);
  return { members: SNAP.members, byId: BYID, settings: st, locked: LOCKED };
}

/* the member's REAL position, straight from the production engine */
function position(memberId) {
  const dl = FIN.memberDelinquency(memberId) || { byYear: {}, outstanding: 0, historicalRemaining: 0 };
  const al = FIN.memberAllocation(memberId) || { historical: { remaining: 0 }, creditRemaining: 0 };
  const openYears = [], lockedDebt = [];
  Object.keys(dl.byYear || {}).forEach(y => {
    const yr = Number(y), rem = R2(dl.byYear[y].remaining);
    if (rem > 0.005) (yr > LOCKED ? openYears : lockedDebt).push({ year: yr, remaining: rem });
  });
  openYears.sort((a, b) => a.year - b.year); lockedDebt.sort((a, b) => a.year - b.year);
  const deficit = R2((al.historical && al.historical.remaining) || dl.historicalRemaining || 0);
  const credit = R2(al.creditRemaining || 0);
  return {
    id: memberId, name: (BYID[memberId] || {}).name || memberId,
    code: (BYID[memberId] || {}).member_code || '',
    openYears, lockedDebt, deficit, credit,
    outstanding: R2(dl.outstanding || 0), isDelinquent: !!dl.isDelinquent,
  };
}

/* THE food-receipt decision (confirmation-first) — step-by-step with reasons. */
function propose(memberId, amount, opts) {
  opts = opts || {};
  const includeDeficit = opts.includeDeficit !== false; // default: offer deficit settlement
  const pos = position(memberId);
  const steps = []; let rem = R2(amount);
  // 1) oldest OPEN subscription year first
  pos.openYears.forEach(y => {
    if (rem <= 0.005) return;
    const take = R2(Math.min(rem, y.remaining));
    if (take > 0.005) { steps.push({ target: 'due:' + y.year, kind: 'due', year: y.year, amount: take,
      reason: 'أقدم سنة اشتراك مفتوحة (' + y.year + ') المتبقٍّ عليها ' + y.remaining }); rem = R2(rem - take); }
  });
  // 2) optional historical deficit
  if (includeDeficit && pos.deficit > 0.005 && rem > 0.005) {
    const take = R2(Math.min(rem, pos.deficit));
    steps.push({ target: 'historical', kind: 'historical', amount: take,
      reason: 'تقليص العجز التاريخي (اختياري) بقيمة ' + pos.deficit }); rem = R2(rem - take);
  }
  // 3) surplus → future credit
  if (rem > 0.005) {
    steps.push({ target: 'credit', kind: 'credit', amount: rem,
      reason: 'الفائض بعد تغطية الالتزامات يُحفظ رصيداً مستقبلياً' }); rem = 0;
  }
  const toObl = R2(steps.filter(s => s.kind === 'due' || s.kind === 'historical').reduce((a, s) => a + s.amount, 0));
  const toCredit = R2(steps.filter(s => s.kind === 'credit').reduce((a, s) => a + s.amount, 0));
  const allocated = R2(toObl + toCredit);
  return {
    member: pos, amount: R2(amount), steps,
    toObligations: toObl, toCredit, allocated,
    remaining: R2(R2(amount) - allocated),          // always 0 for amount>0 (credit absorbs)
    balanced: Math.abs(R2(amount) - allocated) < 0.005 && amount > 0.005,
    balanceAfter: R2(pos.outstanding - toObl),
  };
}

module.exports = { load, position, propose, R2, get LOCKED() { return LOCKED; }, get SNAP() { return SNAP; } };
