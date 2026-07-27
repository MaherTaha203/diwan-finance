/* REPORT-001 · R1 — ReportModel schema + member-statement builder parity tests.
   Pure node, no browser, no FIN/DB. Proves the builder is a faithful projection:
   given a certified statement view, the model carries the SAME numbers in the
   SAME slots (no mutation/loss), and the model is schema-valid.
   Usage: node tests/report-model.test.cjs */
const { buildMemberStatementModel, validate, refFromNotes } = require('../public/js/report-model.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── Synthetic certified source with KNOWN numbers (stands in for FIN.*) ── */
const source = {
  member: { name: 'عضو تجريبي', member_code: 'A-12', phone: '0591', active_from_year: 2019 },
  from: '2025-01-01', to: '2025-12-31', printDate: '2026-07-27T00:00:00.000Z',
  view: {
    statement: { finalBalance: 350 },
    carried: 1200,
    histPaid: 800,
    totSub: 900,
    totPay: 550,
    moves: [
      { date: '2025-03-01', no: 'REC-1', desc: 'دفعة نقدية إيصال 4477', dr: 0, cr: 400, bal: 800 },
      { date: '2025-04-01', no: '—', desc: 'اشتراك سنوي 2025', dr: 200, cr: 0, bal: 1000 },
      { date: '2025-05-01', no: 'REC-2', desc: 'no ref here', dr: 0, cr: 150, bal: 350 }
    ]
  },
  donations: [
    { receipt_date: '2025-06-01', no: 'D-9', amount_ils: 300, movement_type: 'donation', destination_treasury: 'food', _settled: 100 }
  ]
};

const model = buildMemberStatementModel(source);

/* ── Schema validity ── */
const v = validate(model);
ok(v.ok, 'model passes schema validation' + (v.ok ? '' : ' — ' + v.errors.join('; ')));
ok(model.meta.reportId === 'MEMBER_STATEMENT' && model.meta.orientation === 'portrait', 'meta.reportId + orientation correct');
ok(model.meta.party.code === 'A-12' && model.meta.party.name === 'عضو تجريبي', 'party (member) carried into meta');
ok(model.meta.period.from === '2025-01-01' && model.meta.period.to === '2025-12-31', 'period carried into meta');

/* ── Summary parity (numbers unchanged) ── */
const sv = model.summary.map(s => s.value);
ok(sv[0] === 900 && sv[1] === 550 && sv[2] === 800, 'summary values = totSub/totPay/histPaid (900/550/800)');

/* ── Ledger section parity ── */
const ledger = model.sections.find(s => s.id === 'ledger');
const band = model.sections.find(s => s.type === 'band');
ok(band && band.value === 1200, 'carried-balance band value = 1200');
ok(ledger && ledger.columns.length === 8, 'ledger has 8 columns');
/* row 0 = carried; rows 1..3 = the three moves */
ok(ledger.rows.length === 4, 'ledger has carried row + 3 move rows');
ok(ledger.rows[0].bal === 1200 && ledger.rows[0].sub === null && ledger.rows[0].pay === null, 'leading carried row carries signed balance, no sub/pay');
/* move 1: payment 400 → pay=400, sub=null, bal=800 */
ok(ledger.rows[1].pay === 400 && ledger.rows[1].sub === null && ledger.rows[1].bal === 800, 'move#1 payment mapped (pay=400, bal=800)');
/* move 2: subscription 200 → sub=200, pay=null, bal=1000; no receipt no → year null, sysNo null */
ok(ledger.rows[2].sub === 200 && ledger.rows[2].pay === null && ledger.rows[2].bal === 1000, 'move#2 subscription mapped (sub=200, bal=1000)');
ok(ledger.rows[2].sysNo === null && ledger.rows[2].year === '2025', 'non-receipt move has no sysNo but still derives year from its date (matches current statement)');
/* receipt rows derive year + sysNo + refNo */
ok(ledger.rows[1].sysNo === 'REC-1' && ledger.rows[1].year === '2025', 'receipt move derives sysNo + year');
ok(ledger.rows[1].refNo === '4477', 'refNo extracted from notes (إيصال 4477 → 4477)');
ok(ledger.rows[3].refNo === null, 'no reference in notes → refNo null');

/* ── Totals parity (final balance + status) ── */
ok(ledger.totals.cells.bal === 350, 'ledger totals final balance = 350');
ok(ledger.totals.status.ar === 'على العضو مستحقات', 'positive final balance → outstanding status (AR)');

/* ── Donations section parity ── */
const dons = model.sections.find(s => s.id === 'donations');
ok(dons && dons.rows.length === 1 && dons.rows[0].amount === 300, 'donation amount carried (300)');
ok(dons.rows[0]._meta.settled === 100 && dons.rows[0]._meta.destination === 'food', 'donation settlement + destination carried in meta');

/* ── No-mutation guarantee: every certified number appears unchanged ── */
const flat = JSON.stringify(model);
ok(flat.includes('1200') && flat.includes('900') && flat.includes('550') && flat.includes('800') && flat.includes('350') && flat.includes('300'),
  'all certified figures (1200/900/550/800/350/300) present unchanged in the model');

/* ── Empty-statement edge case: still valid, no rows beyond carried ── */
const empty = buildMemberStatementModel({ member: {}, view: { statement: { finalBalance: 0 }, carried: 0, moves: [], totSub: 0, totPay: 0, histPaid: 0 } });
ok(validate(empty).ok, 'empty statement still schema-valid');
ok(empty.sections.find(s => s.id === 'ledger').rows.length === 1, 'empty statement ledger has only the carried row');
ok(!empty.sections.find(s => s.id === 'donations'), 'no donations section when there are no donations');

/* zero/credit status wording */
ok(buildMemberStatementModel({ view: { statement: { finalBalance: -50 }, carried: 0, moves: [] } }).sections.find(s => s.id === 'ledger').totals.status.en === 'Credit balance — owed to member', 'negative final balance → credit status');

/* refFromNotes unit checks */
ok(refFromNotes('إيصال رقم 12345') === '12345' && refFromNotes('#77') === '77' && refFromNotes('no ref') === '', 'refFromNotes extracts numbers per the statement rule');

/* validator rejects a malformed model */
ok(!validate({ meta: { reportId: 'X', orientation: 'diagonal' }, summary: [], sections: [] }).ok, 'validator rejects invalid orientation');
ok(!validate({ meta: { reportId: 'X', orientation: 'portrait' }, summary: [], sections: [{ type: 'table', columns: [{ key: 'a', header: {} }], rows: [{ b: 1 }] }] }).ok, 'validator rejects row using unknown column');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
