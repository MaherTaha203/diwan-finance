/* FIN-RECON-001 — cross-report reconciliation invariant (loads the REAL fin.js).
   Proves, on representative seeded members, that for the SAME member + fiscal year the
   annual-subscription truth is IDENTICAL across the three surfaces that present it:
     · Member Statement   (FIN.memberStatement — member-level balance)
     · Delinquent report  (FIN.memberDelinquency().byYear — certified per-year accessor)
     · Annual Debt report (FIN.debtReportRows — per selected year)
   The fix routes the Annual Debt per-year figures through the certified accessor instead
   of the raw stored paid_amount_ils, so the three must reconcile by construction.
   Usage: node tests/fin-recon-reconciliation.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const R2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

global.window = {
  MODEL2Allocation: require('../public/js/allocation-engine.js'),
  FoodDonationAllocation: require('../public/js/foodDonationAllocation.js'),
  FOOD_OPENING: -1000, LOCKED_THROUGH_YEAR: 2025,
};
global.today = () => '2026-07-31';
global.fmt = n => String(n);
global.gmn = () => 'عضو';
global.L = { expense: x => String(x || '') };
const FIN = vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fin.js'), 'utf8') + ';FIN');

/* A live subscription payment is a food receipt (crud.js:137). Helper to seed one. */
let _rid = 0;
const rcpt = (member_id, amount, date) => ({ id: 'r' + (++_rid), no: '' + (100 + _rid), is_deleted: false,
  fund_type: 'food', member_id, movement_type: 'subscription_payment', destination_treasury: 'food',
  amount_ils: amount, receipt_date: date });

global.DB = {
  members: [
    { id: 'FULL',   member_code: '1', name: 'مسدد كامل',   is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'PART',   member_code: '2', name: 'جزئي',        is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'UNPAID', member_code: '3', name: 'غير مسدد',    is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'MULTI',  member_code: '4', name: 'دفعات متعددة', is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
    { id: 'HISTDEF',member_code: '5', name: 'عجز+حالي',    is_active: true, historical_balance_ils: 300, historical_payments_ils: 0 },
    { id: 'SPAN',   member_code: '6', name: 'دفعة تعبر سنوات', is_active: true, historical_balance_ils: 0, historical_payments_ils: 0 },
    { id: 'MIG',    member_code: '7', name: 'مُرحّل مخزّن', is_active: true, historical_balance_ils: 0,   historical_payments_ils: 0 },
  ],
  subscriptions: [
    { member_id: 'FULL',   year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'PART',   year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'UNPAID', year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'MULTI',  year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'HISTDEF',year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'SPAN',   year: 2025, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'SPAN',   year: 2026, due_amount_ils: 200, paid_amount_ils: 0 },
    { member_id: 'MIG',    year: 2026, due_amount_ils: 200, paid_amount_ils: 200 },  /* migration seed (no receipt) */
  ],
  receipts: [
    rcpt('FULL', 200, '2026-03-01'),
    rcpt('PART', 120, '2026-03-01'),
    rcpt('MULTI', 100, '2026-02-01'), rcpt('MULTI', 100, '2026-04-01'),
    rcpt('HISTDEF', 500, '2026-03-01'),   /* covers 200 current + 300 historical */
    rcpt('SPAN', 300, '2026-03-01'),      /* 200 → 2025 (oldest), 100 → 2026 */
  ],
  payments: [], member_write_offs: [], refunds: [], _alloc: null,
};

const YEARS = [2025, 2026];
/* Annual Debt per-year figures: select a single year and read that member's row. */
function annualDebtYear(id, y) {
  const row = FIN.debtReportRows({ years: new Set([y]), filter: 'all' }).rows.find(r => r.id === id);
  return row ? { selSub: R2(row.selSub), selPaid: R2(row.selPaid), current: R2(row.current) } : null;
}

/* ── INVARIANT 1 — per-year: Annual Debt == Delinquent (certified accessor), for every
      member × every year. This is the heart of the reconciliation. ── */
(() => {
  let allMatch = true, detail = [];
  DB.members.forEach(m => {
    const by = FIN.memberDelinquency(m.id).byYear;
    YEARS.forEach(y => {
      const ad = annualDebtYear(m.id, y);
      const cell = by[y] || { due: 0, paid: 0 };
      const subOk = eq(ad.selSub, R2(cell.due || 0));
      const paidOk = eq(ad.selPaid, R2(cell.paid || 0));
      if (!subOk || !paidOk) { allMatch = false; detail.push(`${m.id}/${y}: AD(${ad.selSub},${ad.selPaid}) vs DEL(${R2(cell.due||0)},${R2(cell.paid||0)})`); }
    });
  });
  ok(allMatch, 'per-year Annual Debt (selSub/selPaid) == Delinquent byYear (due/paid) for every member × year' + (detail.length ? ' — ' + detail.join(' | ') : ''));
})();

/* ── INVARIANT 2 — status agreement: "Annual Debt shows the year paid" ⟺ "Delinquent
      shows the year settled", for every member × year. ── */
(() => {
  let allMatch = true, detail = [];
  DB.members.forEach(m => {
    const by = FIN.memberDelinquency(m.id).byYear;
    YEARS.forEach(y => {
      const cell = by[y]; if (!cell || Number(cell.due) <= 0) return;
      const ad = annualDebtYear(m.id, y);
      const adPaidStatus = ad.selPaid >= ad.selSub - 0.005;   /* Annual Debt "✓ paid" test */
      if (adPaidStatus !== !!cell.settled) { allMatch = false; detail.push(`${m.id}/${y}: AD paid=${adPaidStatus} vs DEL settled=${!!cell.settled}`); }
    });
  });
  ok(allMatch, 'paid/unpaid STATUS agrees between Annual Debt and Delinquent for every member × year' + (detail.length ? ' — ' + detail.join(' | ') : ''));
})();

/* ── INVARIANT 3 — member level: Member Statement finalBalance == Annual Debt current
      == Delinquency outstanding, for every member. ── */
(() => {
  let allMatch = true, detail = [];
  DB.members.forEach(m => {
    const st = R2(FIN.memberStatement(m.id).finalBalance);
    const del = R2(FIN.memberDelinquency(m.id).outstanding);
    const ad = R2(FIN.debtReportRows({ years: null, filter: 'all' }).rows.find(r => r.id === m.id).current);
    if (!eq(st, ad) || !eq(st, del)) { allMatch = false; detail.push(`${m.id}: stmt=${st} ad=${ad} del=${del}`); }
  });
  ok(allMatch, 'member-level finalBalance == Annual Debt current == delinquency outstanding' + (detail.length ? ' — ' + detail.join(' | ') : ''));
})();

/* ── Concrete real-world sanity (prove the fix yields CORRECT results, not just equal) ── */
(() => {
  const d = id => FIN.memberDelinquency(id).byYear;
  ok(d('FULL')[2026].settled && eq(annualDebtYear('FULL', 2026).selPaid, 200), 'FULL: 2026 settled · Annual Debt selPaid 200 (live receipt, was 0 before fix)');
  ok(!d('PART')[2026].settled && eq(annualDebtYear('PART', 2026).selPaid, 120) && eq(d('PART')[2026].remaining, 80), 'PART: 2026 partial · selPaid 120 · remaining 80');
  ok(!d('UNPAID')[2026].settled && eq(annualDebtYear('UNPAID', 2026).selPaid, 0), 'UNPAID: 2026 unpaid · selPaid 0');
  ok(d('MULTI')[2026].settled && eq(annualDebtYear('MULTI', 2026).selPaid, 200), 'MULTI: two receipts (100+100) settle 2026 · selPaid 200');
  ok(d('MIG')[2026].settled && eq(annualDebtYear('MIG', 2026).selPaid, 200), 'MIG: migration-seeded paid_amount_ils still reads 200 (no regression)');
  /* SPAN — a single 300 payment across two obligations: oldest-first covers 2025 fully, 2026 partial */
  const span = { p25: annualDebtYear('SPAN', 2025).selPaid, p26: annualDebtYear('SPAN', 2026).selPaid };
  ok(eq(span.p25 + span.p26, 300) && eq(d('SPAN')[2025].paid, span.p25) && eq(d('SPAN')[2026].paid, span.p26),
    'SPAN: 300 spanning payment splits across 2025/2026 identically on both reports (Σ=300): ' + JSON.stringify(span));
  /* HISTDEF — 500 covers 200 current + 300 historical; current-year 2026 settled, member balance 0 */
  ok(d('HISTDEF')[2026].settled && eq(R2(FIN.memberStatement('HISTDEF').finalBalance), 0),
    'HISTDEF: historical deficit + current dues both cleared by 500 · 2026 settled · balance 0');
})();

/* ── Totals never drift (screen/print/PDF/Excel share this one model) ── */
(() => {
  const model = FIN.debtReportRows({ years: null, filter: 'all' });
  const sumPaid = R2(model.rows.reduce((s, r) => s + r.selPaid, 0));
  const sumByWaterfall = R2(DB.members.reduce((s, m) => {
    const by = FIN.memberDelinquency(m.id).byYear;
    return s + Object.keys(by).reduce((t, y) => t + Number(by[y].paid || 0), 0);
  }, 0));
  ok(eq(sumPaid, sumByWaterfall), 'aggregate Σ selPaid == Σ waterfall per-year paid (no drift): ' + sumPaid);
})();

console.log('\n' + (fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED') + ' · ' + pass + ' checks');
process.exit(fail === 0 ? 0 : 1);
