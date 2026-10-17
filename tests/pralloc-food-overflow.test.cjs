'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const D = require(path.join(__dirname, '..', 'public', 'js', 'food-receipt-decision.js'));
const fs = require('node:fs');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function kinds(result) { return result.steps.map(s => ({ kind: s.kind, year: s.year, amount: s.amount })); }
function sum(result) { return result.steps.reduce((n, s) => n + s.amount, 0); }

test('ordinary payment settles ERP years before historical deficit', () => {
  const r = D.decide({ subYears: [{year:2026,remaining:200},{year:2025,remaining:200}], deficit:200 }, 600,
    { firstFutureYear:2027 });
  assert.deepEqual(kinds(r), [
    {kind:'due',year:2025,amount:200},
    {kind:'due',year:2026,amount:200},
    {kind:'historical',year:undefined,amount:200}
  ]);
  assert.equal(r.balanced, true);
  assert.equal(sum(r), 600);
});

test('ordinary payment leaves historical deficit untouched when no surplus remains', () => {
  const r = D.decide({ subYears: [{year:2025,remaining:200},{year:2026,remaining:200}], deficit:200 }, 400,
    { firstFutureYear:2027 });
  assert.deepEqual(kinds(r), [
    {kind:'due',year:2025,amount:200},
    {kind:'due',year:2026,amount:200}
  ]);
  assert.equal(r.balanced, true);
});

test('ordinary surplus after ERP dues and history becomes prepaid future subscription', () => {
  const r = D.decide({ subYears: [{year:2025,remaining:200},{year:2026,remaining:200}], deficit:0 }, 500,
    { firstFutureYear:2027 });
  assert.deepEqual(kinds(r), [
    {kind:'due',year:2025,amount:200},
    {kind:'due',year:2026,amount:200},
    {kind:'future',year:2027,amount:100}
  ]);
  assert.equal(r.balanced, true);
});

test('explicit historical payment with zero remaining deficit goes wholly to current food fund', () => {
  const r = D.decide({ subYears: [{year:2026,remaining:200}], deficit:0 }, 700,
    { deficitAmount:700, firstFutureYear:2027 });
  assert.deepEqual(kinds(r), [
    {kind:'food',year:undefined,amount:700}
  ]);
  assert.equal(r.toFood, 700);
  assert.equal(r.balanced, true);
  assert.equal(sum(r), 700);
});

test('explicit historical payment caps at deficit and sends excess to current food fund', () => {
  const r = D.decide({ subYears: [{year:2026,remaining:200}], deficit:500 }, 700,
    { deficitAmount:700, firstFutureYear:2027 });
  assert.deepEqual(kinds(r), [
    {kind:'historical',year:undefined,amount:500},
    {kind:'food',year:undefined,amount:200}
  ]);
  assert.equal(r.toFood, 200);
  assert.equal(r.balanced, true);
  assert.equal(sum(r), 700);
});

test('member position read failures stop posting rather than silently using an empty position', () => {
  const src = read('public/js/receipt-settlement.js');
  assert.match(src, /تعذر التحقق من استحقاقات العضو والعجز التاريخي/);
  assert.match(src, /member_position_unavailable/);
  assert.match(src, /obligation_kind: 'food'/);
});

test('food overflow kind is accepted by the guarded atomic RPC and remains void/refund reversible', () => {
  const migration = read('supabase/migrations/20261017110000_pralloc_food_fund_overflow.sql');
  assert.match(migration, /auth\.uid\(\) is null or not public\.is_finance_writer\(\)/i);
  assert.match(migration, /not in \('due','historical','donation','credit','food'\)/i);
  assert.match(migration, /round\(v_sum, 2\) <> v_amount/i);
  assert.match(migration, /insert into public\.allocation_records/i);
  assert.match(migration, /settlement_food_requires_food_fund/);
  assert.match(migration, /settlement_food_requires_explicit_historical_mode/);
  assert.match(migration, /settlement_food_mixed_with_other_obligations/);
  assert.match(migration, /p_receipt \\->> 'settlement_mode'/);
  const wiring = read('public/js/receipt-settlement.js');
  assert.match(wiring, /settlement_mode: isMemberFood && Number\\(ctx\\.deficitAmount\\) > 0\\.005 \\? 'historical_deficit' : null/);
  const voidSql = read('supabase/migrations/20261015100000_guard_settlement_rpcs_authorization.sql');
  assert.match(voidSql, /update public\.allocation_records[\s\S]*source_kind = 'receipt_settlement'[\s\S]*voided_at is null/i);
  assert.match(voidSql, /update public\.allocation_records[\s\S]*source_kind = 'receipt_settlement'[\s\S]*refunded_at is null/i);
});

test('food fund ledger keeps the receipt credit once and displays historical allocation as a debit', () => {
  const fin = read('public/js/fin.js');
  assert.match(fin, /settlementHistoricalByReceipt\(\)/);
  assert.match(fin, /cr:FIN\.amountOf\(r\),dr:0,type:'cr'/);
  assert.match(fin, /تخصيص للعجز التاريخي من صندوق الغداء/);
  assert.match(fin, /cr:0,dr:hist,type:'dr'/);
  assert.match(fin, /Historical settlement is a debit from the food fund/);
  assert.match(fin, /if\(!typeFilter\|\|typeFilter==='dr'\)\{/);
});
