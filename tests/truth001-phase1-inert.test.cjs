/* TRUTH-001 · Phase 1 — Structure-only inertness tests.
   Proves the new storage + interfaces EXIST and are INERT: the two modules load
   with no side effects and expose their contract; the Repository returns empty
   and the Materializer writes nothing; NO runtime code path calls either module
   (so behaviour is unchanged); the migration declares the two tables + the
   provenance columns; data.js reads them into EMPTY defaults; and the new code
   references neither FIN nor the Allocation Engine.
   Usage: node tests/truth001-phase1-inert.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const JS = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

/* ── 1. Modules load with no side effects and expose their contract ── */
const Repo = require(JS('subscription-status-repository.js'));
const Mat  = require(JS('status-materializer.js'));
ok(Repo && typeof Repo.get === 'function', 'Repository exposes get()');
ok(Mat && typeof Mat.materialize === 'function' && typeof Mat.backfill === 'function',
   'Materializer exposes materialize() + backfill()');

/* ── 2. Repository is empty; Materializer is a silent no-op (Phase 1) ── */
ok(Repo.get('any-member', 2026) === null, 'Repository.get() returns null (store empty/unconsumed)');
ok(Mat.materialize('any-member', 2026) === undefined, 'Materializer.materialize() is a no-op');
ok(Mat.backfill() === undefined, 'Materializer.backfill() is a no-op');

/* ── 3. INERTNESS: nothing anywhere CALLS the new modules ── */
const jsDir = path.join(__dirname, '..', 'public', 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
let repoCallers = [], matCallers = [];
const selfFiles = new Set(['subscription-status-repository.js', 'status-materializer.js']);
for (const f of files) {
  const src = read(path.join(jsDir, f));
  if (/SubscriptionStatusRepository\.get\s*\(/.test(src) && !selfFiles.has(f)) repoCallers.push(f);
  if (/StatusMaterializer\.(materialize|backfill)\s*\(/.test(src) && !selfFiles.has(f)) matCallers.push(f);
}
ok(repoCallers.length === 0, 'No runtime file calls SubscriptionStatusRepository.get() — found: [' + repoCallers.join(', ') + ']');
ok(matCallers.length === 0, 'No runtime file calls StatusMaterializer.* — found: [' + matCallers.join(', ') + ']');

/* ── 4. New modules touch neither FIN nor the Allocation Engine ── */
const repoSrc = read(JS('subscription-status-repository.js'));
const matSrc  = read(JS('status-materializer.js'));
ok(!/\bFIN\b|allocation-engine|MODEL2Allocation|memberAllocation/.test(repoSrc),
   'Repository references no FIN / allocation symbol');
ok(!/\bFIN\b|allocation-engine|MODEL2Allocation|memberAllocation/.test(matSrc),
   'Materializer references no FIN / allocation symbol');

/* ── 5. Migration declares the tables + provenance columns ── */
const migDir = path.join(__dirname, '..', 'supabase', 'migrations');
const mig = fs.readdirSync(migDir).find(f => /truth001_structure/.test(f));
ok(!!mig, 'Migration _truth001_structure.sql exists');
const migSrc = mig ? read(path.join(migDir, mig)) : '';
ok(/create table if not exists public\.import_batches/.test(migSrc), 'Migration creates import_batches');
ok(/create table if not exists public\.current_subscription_status/.test(migSrc), 'Migration creates current_subscription_status');
ok(/alter table public\.historical_subscription_truth[\s\S]*import_batch_id/.test(migSrc),
   'Migration adds provenance columns to historical_subscription_truth (additive)');
ok(/add column if not exists/.test(migSrc), 'Provenance columns are additive (add column if not exists)');

/* ── 6. data.js reads the new tables into EMPTY defaults ── */
const dataSrc = read(JS('data.js'));
ok(/SB\.from\('import_batches'\)/.test(dataSrc), 'data.js reads import_batches');
ok(/SB\.from\('current_subscription_status'\)/.test(dataSrc), 'data.js reads current_subscription_status');
ok(/DB\.import_batches=\(r13&&r13\.data\)\|\|\[\]/.test(dataSrc), 'DB.import_batches defaults to []');
ok(/DB\.current_subscription_status=\(r14&&r14\.data\)\|\|\[\]/.test(dataSrc), 'DB.current_subscription_status defaults to []');

console.log('\nTRUTH-001 Phase 1 inertness: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
