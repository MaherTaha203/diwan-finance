const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261015100000_guard_settlement_rpcs_authorization.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

function functionBody(name) {
  const start = sql.indexOf('create or replace function public.' + name + '(');
  assert.notEqual(start, -1, 'migration contains ' + name);
  const next = sql.indexOf('create or replace function public.', start + 1);
  const end = next === -1 ? sql.length : next;
  return sql.slice(start, end);
}

test('settlement RPCs reject unauthenticated and non-finance callers before writes', () => {
  for (const name of [
    'create_receipt_with_settlement',
    'void_receipt_settlement',
    'refund_receipt_settlement'
  ]) {
    const body = functionBody(name);
    const guard = body.indexOf('if auth.uid() is null or not public.is_finance_writer() then');
    assert.notEqual(guard, -1, name + ' has server-side role guard');
    const firstWrite = body.search(/\b(insert into public\.receipts|insert into public\.allocation_records|update public\.allocation_records)\b/i);
    assert.notEqual(firstWrite, -1, name + ' still contains its expected write path');
    assert.ok(guard < firstWrite, name + ' authorizes before the first write');
    assert.match(body, /errcode = '42501'/, name + ' returns a permission error');
  }
});

test('authorization migration does not alter financial totals or settlement arithmetic', () => {
  assert.doesNotMatch(sql, /update\s+public\.(receipts|payments|member_subscriptions|allocation_records)\s+set\s+(amount|amount_ils|paid_amount_ils|amount_allocated)\s*=/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.(receipts|payments|member_subscriptions|allocation_records)/i);
  assert.match(sql, /round\(v_sum, 2\) <> v_amount/);
  assert.match(sql, /round\(\(v_line ->> 'amount_allocated'\)::numeric, 2\)/);
  assert.match(sql, /set voided_at = now\(\)/);
  assert.match(sql, /set refunded_at = now\(\)/);
});
