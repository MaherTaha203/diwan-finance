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

/* ── Golden Reference: the accounting engine + authorities + schema are UNTOUCHED ── */
const { execSync } = require('child_process');
let changed = '';
try { changed = execSync('git diff --name-only origin/main -- public/js/fin.js public/js/operations.js public/js/data.js public/js/receipt-settlement.js supabase/migrations', { cwd: path.join(__dirname, '..') }).toString().trim(); } catch (e) { changed = 'ERR:' + e.message; }
ok(changed === '', 'Golden Reference: fin.js / operations.js / data.js / receipt-settlement.js / migrations UNCHANGED vs origin/main — [' + changed + ']');

console.log('\nPR-7A refund UI: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
