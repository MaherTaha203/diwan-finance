/* P-RECEIPT-ALLOCATION · PR-2 — Atomic Posting Engine · static + inertness tests.
   Proves the RPC body enforces its invariants (Σ lines = amount, closed-year,
   valid kinds), never writes paid_amount_ils / member_subscriptions, writes only
   receipt_settlement lines, stays REVOKED from client roles, and is still called
   by NO runtime path while the feature flag stays OFF. (Live behavioural proof:
   tests/pralloc-pr2-atomic-rpc.sql, run on a dev/branch DB.)
   Usage: node tests/pralloc-pr2-atomic-engine.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const read = p => fs.readFileSync(p, 'utf8');
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');

/* ── locate the PR-2 migration ── */
const migFile = fs.readdirSync(migDir).find(f => /pralloc_pr2_atomic_engine/.test(f));
ok(!!migFile, 'PR-2 migration _pralloc_pr2_atomic_engine.sql exists');
const raw = migFile ? read(path.join(migDir, migFile)) : '';
const code = raw.replace(/--[^\n]*/g, '');   /* -- comments stripped; string literals KEPT for structural checks */

/* ── RPC body & invariants ── */
ok(/create or replace function public\.create_receipt_with_settlement/i.test(code), 'defines create_receipt_with_settlement');
ok(/language plpgsql/i.test(code) && /security definer/i.test(code), 'is a plpgsql SECURITY DEFINER function (single atomic transaction)');
ok(/settlement_sum_mismatch/i.test(code) && /v_sum[\s\S]*<>[\s\S]*v_amount|round\(v_sum, 2\) <> v_amount/i.test(code),
   'enforces the Σ lines = amount invariant (raises settlement_sum_mismatch)');
ok(/settlement_closed_year/i.test(code) && /locked/i.test(code), 'rejects closed-year due lines');
ok(/obligation_kind[\s\S]*not in \('due','historical','donation','credit'\)/i.test(code), 'validates obligation_kind against the enum');
ok(/insert into public\.receipts/i.test(code), 'inserts the receipt');
ok(/insert into public\.allocation_records[\s\S]*'receipt_settlement'/i.test(code), 'inserts settlement lines with source_kind=receipt_settlement');
ok(/manual_allocation\s*:=\s*true/i.test(code), 'marks the receipt manual_allocation = true');

/* ── the sacred prohibitions (identifiers only: blank ALL string literals so
      descriptive text inside COMMENT/RAISE messages can't create false matches) ── */
const codeIdents = code.replace(/'(?:[^']|'')*'/g, "''");
ok(!/paid_amount_ils/i.test(codeIdents), 'RPC never writes paid_amount_ils');
ok(!/member_subscriptions/i.test(codeIdents), 'RPC never touches member_subscriptions');

/* ── dormant: revoked from every client role ── */
ok(/revoke all on function public\.create_receipt_with_settlement\(jsonb, jsonb\) from public, anon, authenticated/i.test(code),
   'RPC is REVOKED from public/anon/authenticated (uncallable by clients)');

/* ── the RPC's ONLY caller is the flag-gated settlement wiring module (PR-4) ── */
const jsDir = path.join(__dirname, '..', 'public', 'js');
let callers = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))
  .filter(f => /create_receipt_with_settlement/.test(read(path.join(jsDir, f))));
ok(callers.length === 1 && callers[0] === 'receipt-settlement.js',
   'the RPC is called only by receipt-settlement.js (flag-gated) — found: [' + callers.join(', ') + ']');
ok(/RECEIPT_ALLOCATION_ENABLED === true/.test(read(path.join(jsDir, 'receipt-settlement.js'))),
   'that caller keys the call on the OFF-by-default flag');

/* ── feature flag still defaults OFF ── */
const rs = read(path.join(jsDir, 'receipt-settlement.js'));
ok(/RECEIPT_ALLOCATION_ENABLED\s*===\s*'undefined'[\s\S]*=\s*false/.test(rs) || /=\s*false;/.test(rs),
   'feature flag still defaults OFF');

/* ── the behavioural self-test ships and covers the key cases ── */
const sqlTest = path.join(__dirname, 'pralloc-pr2-atomic-rpc.sql');
ok(fs.existsSync(sqlTest), 'behavioural SQL self-test pralloc-pr2-atomic-rpc.sql ships');
const st = fs.existsSync(sqlTest) ? read(sqlTest) : '';
ok(/rollback;/i.test(st), 'SQL self-test rolls back (persists nothing)');
['valid post','Σ mismatch','closed-year','bad obligation_kind','atomic rollback'].forEach(function (c, i) {
  ok(new RegExp('T' + (i + 1) + ' PASSED').test(st), 'SQL self-test covers case ' + (i + 1) + ' (' + c + ')');
});

console.log('\nPR-2 atomic engine (static + inertness): ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
