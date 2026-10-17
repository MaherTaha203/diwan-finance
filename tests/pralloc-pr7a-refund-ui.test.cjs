/* P-RECEIPT-ALLOCATION · PR-7A — Refund UI (presentation only).
   Proves the refund UI exposes the EXISTING capability with: correct eligibility
   gating (no draft/cancelled/fully-refunded/non-admin/flag-off), exactly ONE
   execution path (BusinessOps.refundReceipt) and NO refund/allocation/DB logic in
   the UI, wired into the edit-receipt screen, and the accounting engine untouched
   (Golden Reference). Usage: node tests/pralloc-pr7a-refund-ui.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

/* ---- load the module against a mock window (no DOM; eligible() needs no DOM) ---- */
global.window = {};
global.window.RECEIPT_ALLOCATION_ENABLED = true;
global.window.MODEL2_ALLOCATION_ENABLED = true;   /* refund execution flag — refund UI is out of the allocation-activation scope and requires this */
let adminFlag = true, flagOn = true;
global.window.ReceiptSettlement = { enabled: () => flagOn };
global.window.can = { admin: () => adminFlag };
const RefundUI = require(P('refund-ui.js'));

const R = (o) => Object.assign({ id: 'R', member_id: 'M', receipt_date: '2026-05-01', amount_ils: 400, is_deleted: false, manual_allocation: true }, o);
const AL = (rid, opts) => Object.assign({ id: rid + ':x', source_ref: rid, source_kind: 'receipt_settlement', member_id: 'M', obligation_kind: 'due', year: 2027, amount_allocated: 200, voided_at: null, refunded_at: null }, opts);
function setDB(receipts, alloc, refunds) { global.window.DB = { receipts: receipts || [], allocation_records: alloc || [], refunds: refunds || [] }; }

/* ── Eligibility matrix (requirement 2) ── */
setDB([R()], [AL('R')]);
ok(RefundUI.eligible(global.window.DB.receipts[0]) === true, 'eligible: posted receipt with an active settlement line + admin + flag ON');

flagOn = false; ok(RefundUI.eligible(R()) === false, 'NOT eligible: feature flag OFF'); flagOn = true;
/* PR-7A activation scope: refund UI stays hidden unless refund execution (MODEL2) is ON */
global.window.MODEL2_ALLOCATION_ENABLED = false; ok(RefundUI.eligible(R()) === false, 'NOT eligible: refund execution flag (MODEL2_ALLOCATION_ENABLED) OFF — refund out of allocation activation'); global.window.MODEL2_ALLOCATION_ENABLED = true;
adminFlag = false; ok(RefundUI.eligible(R()) === false, 'NOT eligible: non-admin user'); adminFlag = true;

setDB([R({ is_deleted: true })], [AL('R')]);
ok(RefundUI.eligible(global.window.DB.receipts[0]) === false, 'NOT eligible: cancelled receipt (is_deleted)');

setDB([R()], []);
ok(RefundUI.eligible(R()) === false, 'NOT eligible: no settlement lines (draft / legacy receipt)');

setDB([R()], [AL('R', { refunded_at: '2026-06-01T00:00:00Z' })]);
ok(RefundUI.eligible(R()) === false, 'NOT eligible: fully refunded (no active lines left)');

setDB([R()], [AL('R', { voided_at: '2026-06-01T00:00:00Z' })]);
ok(RefundUI.eligible(R()) === false, 'NOT eligible: all lines voided (cancelled settlement)');

setDB([R()], [AL('R', { id: 'l1' }), AL('R', { id: 'l2', year: 2028, refunded_at: '2026-06-01T00:00:00Z' })]);
ok(RefundUI.eligible(R()) === true, 'eligible: partially refunded receipt still has an active line');

/* ── Presentation-only guarantees (static scan of refund-ui.js) ── */
const src = read(P('refund-ui.js'));
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   /* strip comments */
ok(/root\.BusinessOps/.test(code) && /refundReceipt\s*\(\s*\{/.test(code), 'UI calls the ONE execution path: BusinessOps.refundReceipt({...})');
ok(!/SB\.(from|rpc)\s*\(/.test(code), 'UI performs NO direct DB writes / RPC calls (no SB.from / SB.rpc)');
ok(!/create_receipt_with_settlement|void_receipt_settlement|refund_receipt_settlement/.test(code), 'UI never calls a settlement RPC directly (goes through BО-11)');
ok(!/paid_amount_ils/.test(code) && !/member_subscriptions/.test(code), 'UI never touches paid_amount_ils / member_subscriptions');
ok(!/computeRefund|computeAllocation|amount_allocated\s*=|\.update\(/.test(code), 'UI performs NO refund/allocation math and NO record mutation');
ok(/loadAll\s*\(/.test(code), 'UI refreshes every screen via the normal loadAll flow after success');
ok(/RECEIPT_ALLOCATION_ENABLED|ReceiptSettlement\.enabled/.test(src), 'UI is gated on the feature flag (OFF ⇒ inert)');
ok(/_executing/.test(code), 'UI guards against double-click execution');
ok(/role="dialog"|aria-|focusables|Tab/.test(src), 'UI has accessibility affordances (dialog role / aria / focus trap)');

/* ── Wiring (index.html + crud.js) ── */
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
ok(/id="m-refund"/.test(html) && /id="refund-body"/.test(html), 'index.html has the #m-refund dialog shell');
ok(/id="edit-rec-refund-btn"[\s\S]*?window\.openRefund/.test(html), 'edit-receipt footer has the (hidden) Refund button → window.openRefund');
ok(/display:none/.test(html.match(/id="edit-rec-refund-btn"[^>]*/)[0]), 'Refund button is hidden by default (shown only when eligible)');
ok(/refund-ui\.js/.test(html), 'refund-ui.js is included');
ok(/role="dialog"[\s\S]*?aria-modal="true"/.test(html.match(/id="m-refund"[\s\S]{0,200}/)[0]), '#m-refund is an aria dialog');
ok(/RefundUI\.syncEditButton/.test(read(P('crud.js'))), 'editRec toggles the Refund button via RefundUI.syncEditButton');

/* ── Golden Reference: allow only the scoped food-overflow migration and ledger split ── */
const { execSync } = require('child_process');
/* The additive food-overflow migration and the exact food-ledger presentation split
   are approved scope. All pre-existing migrations and operations.js/data.js stay fixed. */
let coreChanged = '';
let migrationChanges = [];
try {
  coreChanged = execSync(
    'git diff --name-only origin/main -- public/js/operations.js public/js/data.js',
    { cwd: path.join(__dirname, '..') }
  ).toString().trim();
  migrationChanges = execSync(
    'git diff --name-only origin/main -- supabase/migrations',
    { cwd: path.join(__dirname, '..') }
  ).toString().trim().split('\n').filter(Boolean);
} catch (e) {
  coreChanged = 'ERR:' + e.message;
}
const allowedMigration = 'supabase/migrations/20261017110000_pralloc_food_fund_overflow.sql';
const headSha = execSync('git rev-parse HEAD', { cwd: path.join(__dirname, '..') }).toString().trim();
const mainSha = execSync('git rev-parse origin/main', { cwd: path.join(__dirname, '..') }).toString().trim();
const runningOnMain = headSha === mainSha;
const migrationScopeOk = runningOnMain
  ? migrationChanges.length === 0
  : migrationChanges.length === 1 && migrationChanges[0] === allowedMigration;
ok(
  coreChanged === '' && migrationScopeOk,
  'Golden Reference: operations/data unchanged; migration diff is scoped for PR checks and empty on main — core=[' +
    coreChanged + '], migrations=[' + migrationChanges.join(', ') + ']'
);
let finBase = '';
try { finBase = execSync('git show origin/main:public/js/fin.js', { cwd: path.join(__dirname, '..'), maxBuffer: 1 << 24 }).toString(); } catch (e) { finBase = 'ERR:' + e.message; }
function stripDebtReportRows(text) {
  const anchor = 'debtReportRows(opts){';
  const i = text.indexOf(anchor);
  if (i < 0) return text;
  let depth = 0, k = i + anchor.length - 1;
  for (; k < text.length; k++) { const c = text[k]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { k++; break; } } }
  return text.slice(0, i) + text.slice(k);
}
function stripFoodLedgerSplit(text) {
  /* Strip only the approved food-ledger attribution additions so the golden
     reference continues to detect unrelated changes in the frozen engine. */
  const declStart = text.indexOf("    /* Historical settlement is a debit from the food fund.");
  if (declStart >= 0) {
    const declEnd = text.indexOf("    if(!typeFilter||typeFilter==='cr'){", declStart);
    if (declEnd < 0) return text;
    text = text.slice(0, declStart) + text.slice(declEnd);
  }
  const drStart = text.indexOf("    if(!typeFilter||typeFilter==='dr'){");
  const debitStart = text.indexOf("      if(fund==='food'){", drStart);
  if (debitStart >= 0) {
    const debitEnd = text.indexOf("      }\n    }\n    if(!typeFilter||typeFilter==='don')", debitStart);
    if (debitEnd < 0) return text;
    text = text.slice(0, debitStart) + text.slice(debitEnd + "      }\n".length);
  }
  return text;
}
ok(!/^ERR:/.test(finBase)
    && stripDebtReportRows(stripFoodLedgerSplit(read(P('fin.js'))))
      === stripDebtReportRows(stripFoodLedgerSplit(finBase)),
  'Golden Reference: fin.js unchanged outside the exact approved food-ledger historical split (PR and post-merge)');

console.log('\nPR-7A refund UI: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
