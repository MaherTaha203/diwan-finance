/* P-RECEIPT-ALLOCATION · PR-3 — Settlement Editor tests (pure logic + inertness).
   Proves the editor's validation, totals, remaining, and Save-enable logic are
   correct, and that the module is INERT: no load-time side effect, references no
   FIN/DB/RPC/persistence symbol, is called by no runtime path, and the feature
   flag stays OFF.  Usage: node tests/pralloc-pr3-settlement-editor.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const P = f => path.join(__dirname, '..', 'public', 'js', f);
const read = p => fs.readFileSync(p, 'utf8');

const SE = require(P('settlement-editor.js'));
const DEST = [
  { kind: 'due', year: 2025, label: '2025', outstanding: 200 },   /* closed (locked=2025) */
  { kind: 'due', year: 2026, label: '2026', outstanding: 200 },
  { kind: 'due', year: 2027, label: '2027', outstanding: 200 },
  { kind: 'historical', label: 'Historical', outstanding: 500 },
  { kind: 'credit', label: 'Credit', outstanding: null },
  { kind: 'donation', label: 'Donation', outstanding: null },
];
const cs = (amount, lines) => SE.computeState({ receiptAmount: amount, lines: lines, destinations: DEST, lockedThroughYear: 2025 });

/* ── 1. Valid full allocation → canSave, remaining 0 ── */
let s = cs(900, [
  { kind: 'due', year: 2026, amount: 200 },
  { kind: 'due', year: 2027, amount: 200 },
  { kind: 'historical', amount: 500 },
]);
ok(s.allocated === 900 && s.remaining === 0, 'totals: allocated 900, remaining 0');
ok(s.valid && s.canSave, 'valid full allocation → Save enabled');
ok(s.rows[0].status === 'paid' && s.rows[2].status === 'reduces_deficit', 'per-row status (paid / reduces_deficit)');

/* ── 2. Σ mismatch → remaining != 0, cannot save ── */
s = cs(900, [{ kind: 'due', year: 2026, amount: 200 }]);
ok(s.remaining === 700 && !s.canSave && s.errors.indexOf('sum_mismatch') >= 0, 'Σ mismatch blocks Save (remaining 700)');

/* ── 3. Duplicate destination ── */
s = cs(400, [{ kind: 'due', year: 2026, amount: 200 }, { kind: 'due', year: 2026, amount: 200 }]);
ok(s.rows[1].errors.indexOf('duplicate_destination') >= 0 && !s.canSave, 'duplicate destination rejected');

/* ── 4. Negative / zero amount ── */
ok(cs(200, [{ kind: 'due', year: 2026, amount: -50 }]).rows[0].errors.indexOf('non_positive_amount') >= 0, 'negative amount rejected');
ok(cs(0, [{ kind: 'due', year: 2026, amount: 0 }]).rows[0].errors.indexOf('non_positive_amount') >= 0, 'zero amount rejected');

/* ── 5. Amount greater than outstanding (capped kinds) ── */
ok(cs(300, [{ kind: 'due', year: 2026, amount: 300 }]).rows[0].errors.indexOf('exceeds_outstanding') >= 0, 'due amount > outstanding rejected');
ok(cs(999, [{ kind: 'credit', amount: 999 }]).rows[0].errors.indexOf('exceeds_outstanding') < 0, 'credit is uncapped (no exceeds_outstanding)');

/* ── 6. Closed fiscal year ── */
ok(cs(200, [{ kind: 'due', year: 2025, amount: 200 }]).rows[0].errors.indexOf('closed_year') >= 0, 'closed-year due line rejected');

/* ── 7. Invalid / empty destination & amount, orphan row ── */
ok(cs(100, [{ kind: null, amount: 100 }]).rows[0].errors.indexOf('empty_destination') >= 0, 'empty destination rejected');
ok(cs(100, [{ kind: 'due', year: 2026, amount: '' }]).rows[0].errors.indexOf('empty_amount') >= 0, 'empty amount rejected');
ok(cs(100, [{ kind: 'nonsense', amount: 100 }]).rows[0].errors.indexOf('invalid_destination') >= 0, 'invalid destination rejected');
ok(cs(100, [{ kind: null, amount: '' }]).rows[0].errors.indexOf('orphan_row') >= 0, 'orphan row flagged');

/* ── 8. No lines ── */
ok(cs(100, []).errors.indexOf('no_lines') >= 0 && !cs(100, []).canSave, 'no lines → cannot save');

/* ── 9. Remaining-after-payment per row ── */
ok(cs(120, [{ kind: 'due', year: 2026, amount: 120 }]).rows[0].remaining === 80, 'row remaining-after-payment = outstanding - amount (200-120=80)');

/* ── 10. Save enable/disable transitions on exact zero ── */
ok(!cs(400, [{ kind: 'due', year: 2026, amount: 200 }]).canSave, 'partial allocation → Save disabled');
ok(cs(400, [{ kind: 'due', year: 2026, amount: 200 }, { kind: 'due', year: 2027, amount: 200 }]).canSave, 'exact zero remaining → Save enabled');

/* ── 11. INERTNESS ── */
ok(typeof SE.computeState === 'function' && typeof SE.mount === 'function', 'module exposes computeState + mount');
const src = read(P('settlement-editor.js')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
ok(!/\bSB\b|\.rpc\(|create_receipt_with_settlement|allocation_records|\.insert\(|\.update\(|\.upsert\(/.test(src), 'module never persists / calls the RPC / writes allocation_records');
ok(!/\bFIN\b|memberAllocation|memberStatement|debtReportRows|paid_amount_ils|BusinessOps\./.test(src), 'module references no FIN / BusinessOps / paid_amount_ils symbol');

/* the editor's ONLY mounter is the flag-gated settlement wiring module (PR-4) */
const jsDir = path.join(__dirname, '..', 'public', 'js');
let callers = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'settlement-editor.js')
  .filter(f => /SettlementEditor\.(mount|computeState)\s*\(/.test(read(path.join(jsDir, f))));
ok(callers.length === 1 && callers[0] === 'receipt-settlement.js',
   'the editor is mounted only by receipt-settlement.js (flag-gated) — found: [' + callers.join(', ') + ']');

/* feature flag still OFF (receipt-settlement.js from PR-1) */
ok(/RECEIPT_ALLOCATION_ENABLED[\s\S]*?=\s*false/.test(read(P('receipt-settlement.js'))), 'feature flag still defaults OFF');

console.log('\nPR-3 settlement editor: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
