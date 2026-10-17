const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20261015100000_guard_settlement_rpcs_authorization.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

function readSql(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function functionBody(sql, name) {
  const start = sql.search(
    new RegExp('create\\s+or\\s+replace\\s+function\\s+public\\.' + name + '\\s*\\(', 'i')
  );
  assert.notEqual(start, -1, 'SQL contains function ' + name);

  const definition = sql.slice(start);
  const asMatch = /\\bas\\s+(\\$[A-Za-z_0-9]*\\$)/i.exec(definition);
  assert.ok(asMatch, name + ' has a dollar-quoted function body');

  const bodyStart = asMatch.index + asMatch[0].length;
  const bodyEnd = definition.indexOf(asMatch[1], bodyStart);
  assert.notEqual(bodyEnd, -1, name + ' has a closing dollar quote');
  return definition.slice(bodyStart, bodyEnd);
}

function normalizeSqlBody(body) {
  return body
    .replace(/--[^\\n]*/g, '')
    .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const authorizationGuard =
  /if\\s+auth\\.uid\\(\\)\\s+is\\s+null\\s+or\\s+not\\s+public\\.is_finance_writer\\(\\)\\s+then[\\s\\S]*?end\\s+if\\s*;/i;

test('settlement RPCs reject unauthenticated and non-finance callers before writes', () => {
  for (const name of [
    'create_receipt_with_settlement',
    'void_receipt_settlement',
    'refund_receipt_settlement'
  ]) {
    const body = functionBody(migrationSql, name);
    const guardIndex = body.search(authorizationGuard);
    assert.notEqual(guardIndex, -1, name + ' has server-side role guard');

    const firstWrite = body.search(
      /\\b(insert\\s+into\\s+public\\.(receipts|allocation_records)|update\\s+public\\.allocation_records)\\b/i
    );
    assert.notEqual(firstWrite, -1, name + ' retains its expected write path');
    assert.ok(guardIndex < firstWrite, name + ' authorizes before the first write');

    const guard = body.match(authorizationGuard)[0];
    assert.match(guard, /errcode\\s*=\\s*'42501'/i, name + ' returns a permission error');
  }
});

test('settlement RPC bodies match their historical financial logic after removing only the new guard', () => {
  const baselines = {
    create_receipt_with_settlement:
      'supabase/migrations/20260806110000_f1a_fiscal_lock_erp_first_year.sql',
    void_receipt_settlement:
      'supabase/migrations/20260801160000_pralloc_pr6_void.sql',
    refund_receipt_settlement:
      'supabase/migrations/20260801170000_pralloc_pr7_refund.sql'
  };

  for (const [name, baselinePath] of Object.entries(baselines)) {
    const baselineSql = readSql(baselinePath);
    const baselineBody = normalizeSqlBody(functionBody(baselineSql, name));
    const guardedBody = functionBody(migrationSql, name);
    assert.match(guardedBody, authorizationGuard, name + ' contains the expected guard');
    const bodyWithoutGuard = guardedBody.replace(authorizationGuard, '');
    assert.equal(
      normalizeSqlBody(bodyWithoutGuard),
      baselineBody,
      name + ' must preserve its historical function body apart from the authorization guard'
    );
  }
});

test('authorization migration does not alter financial totals or delete accounting records', () => {
  assert.doesNotMatch(
    migrationSql,
    /update\\s+public\\.(receipts|payments|member_subscriptions|allocation_records)\\s+set\\s+(amount|amount_ils|paid_amount_ils|amount_allocated)\\s*=/i
  );
  assert.doesNotMatch(
    migrationSql,
    /delete\\s+from\\s+public\\.(receipts|payments|member_subscriptions|allocation_records)/i
  );
});
