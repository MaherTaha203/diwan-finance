/* MODEL2 audit allocation must consume FIN's canonical residual obligations. */
'use strict';
const assert = require('node:assert/strict');
const A = require('../public/js/allocation-engine.js');
let inserted = null;
global.window = {
  MODEL2Allocation: A,
  MODEL2_AUDIT_LOG_ENABLED: true,
  MODEL2_ALLOCATION_ENABLED: false
};
global.DB = { settings: { current_operating_year: 2026 }, members: [], subscriptions: [] };
global.FIN = {
  memberAllocation(memberId) {
    assert.equal(memberId, 'M1');
    return {
      perYear: {
        2025: { due: 200, remaining: 0 },
        2026: { due: 200, remaining: 165 }
      },
      historical: { remaining: 0 }
    };
  }
};
global.SB = {
  from(table) {
    assert.equal(table, 'allocation_records');
    return { insert(rows) { inserted = rows; return Promise.resolve({ error: null, data: rows }); } };
  }
};
require('../public/js/allocation-integration.js');

(async () => {
  const obligations = window.MODEL2BuildObligations('M1');
  assert.deepEqual(obligations.map(o => [o.kind, o.year || null, o.remaining]), [['due', 2026, 165]]);
  const result = await window.MODEL2RecordAllocation('M1', 'R-1', 200);
  assert.equal(result.totalAllocated, 165);
  assert.equal(result.creditRemaining, 35);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].year, 2026);
  assert.equal(inserted[0].amount_allocated, 165);
  console.log('PASS allocation audit reads FIN residual obligations; 165 → 2026 and 35 remains credit');
})().catch(err => { console.error(err); process.exitCode = 1; });
