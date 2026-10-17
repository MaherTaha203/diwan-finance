/* API-level regression for public internal-transfer QR verification.
   Uses a Supabase client stub; no network or database is touched. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

let rows = {};
let queries = [];
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@supabase/supabase-js') {
    return {
      createClient() {
        return {
          from(table) {
            return {
              select(fields) {
                const query = { table, fields, column: null, value: null };
                queries.push(query);
                return {
                  eq(column, value) {
                    query.column = column;
                    query.value = value;
                    return {
                      async maybeSingle() {
                        return { data: rows[table] || null, error: null };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const handler = require('../api/verify.js');
Module._load = originalLoad;

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(s) { this.statusCode = s; return this; },
    json(body) { this.body = body; return this; }
  };
}
async function invoke(token, ip) {
  const res = response();
  await handler({
    query: { id: token },
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip }
  }, res);
  return res;
}

test('valid transfer token returns only document number, type, and date', async () => {
  queries = [];
  rows = {
    receipts: null,
    payments: null,
    internal_transfers: {
      no: 'IT-0001', transfer_date: '2026-07-25', is_deleted: false,
      amount_ils: 99999, source_treasury: 'food', reason: 'private reason',
      approving_director: 'private name'
    }
  };
  const token = 'AbCdEf0123456789';
  const res = await invoke(token, '198.51.100.101');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    valid: true,
    document: { id: 'IT-0001', type: 'Internal Transfer Voucher', date: '2026-07-25' }
  });
  assert.deepEqual(queries.map(q => q.table), ['receipts', 'payments', 'internal_transfers']);
  assert.ok(queries.every(q => q.column === 'verification_token' && q.value === token));
  assert.deepEqual(queries.map(q => q.fields), [
    'no, receipt_date, is_deleted',
    'no, payment_date, is_deleted',
    'no, transfer_date, is_deleted'
  ]);
});

test('cancelled internal transfer returns generic cancellation without details', async () => {
  queries = [];
  rows = {
    receipts: null,
    payments: null,
    internal_transfers: {
      no: 'IT-0002', transfer_date: '2026-07-26', is_deleted: true,
      amount_ils: 5000, source_treasury: 'food', reason: 'private reason'
    }
  };
  const res = await invoke('ZyXwVu9876543210', '198.51.100.102');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { valid: false, error: 'Document has been cancelled' });
  assert.ok(!JSON.stringify(res.body).includes('5000'));
  assert.ok(!JSON.stringify(res.body).includes('private reason'));
});
