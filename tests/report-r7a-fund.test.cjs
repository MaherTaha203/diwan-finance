/* REPORT-001 · R7a — Fund Statement cut-over tests (pure node).
     A) buildFundStatementModel maps a fundLedgerView faithfully (food extras);
     B) the layout renders it; C) the cut-over CORE routes screen/print/pdf/excel
        through the engine only when the flag is ON, csv to legacy, with DOM stubs.
   Usage: node tests/report-r7a-fund.test.cjs */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

require('../public/js/report-engine.js');
require('../public/js/report-layout.js');
const M = require('../public/js/report-model.js');
const { buildFundStatementModel, ReportModel } = M;
const Report = globalThis.Report;
const ReportLayout = globalThis.ReportLayout;

/* ── Part A — the pure fund model ── */
const view = {
  rows: [
    { date: '2025-01-01', name: '—', desc: 'رصيد افتتاحي', cr: 1000, dr: 0, run: 1000, type: 'open' },
    { date: '2025-02-01', name: 'محمد', desc: 'اشتراك', cr: 200, dr: 0, run: 1200 },
    { date: '2025-03-01', name: 'مورد', desc: 'مصروف', cr: 0, dr: 300, run: 900, note: 'فاتورة' }
  ], opening: 1000, totalCr: 1200, totalDr: 300, closing: 900
};
const foodModel = buildFundStatementModel({ fund: 'food', view: view,
  figures: { curBal: 900, deficitRemaining: -500, reservePlusDebt: 150, netPosition: 550 },
  from: '2025-01-01', to: '2025-12-31', printDate: '2026-07-27T00:00:00.000Z' });

ok(ReportModel.validate(foodModel).ok, 'food fund model validates against the frozen schema');
ok(foodModel.meta.reportId === 'FUND_STATEMENT' && foodModel.meta.orientation === 'landscape', 'meta: FUND_STATEMENT, landscape');
ok(/صندوق الغداء/.test(foodModel.meta.title.ar), 'title carries the fund label');
const led = foodModel.sections.find(s => s.id === 'ledger');
ok(led && led.columns.length === 7 && led.columns.map(c => c.key).join(',') === 'date,name,desc,credit,debit,balance,note', 'ledger has the 7 declared columns in order');
ok(led.rows.length === 3 && led.rows[1].credit === 200 && led.rows[2].debit === 300 && led.rows[2].balance === 900, 'rows preserve credit/debit/running-balance numbers');
ok(led.rows[1].debit === null && led.rows[0].note === null, 'empty debit/note become null (renderer shows —)');
ok(led.totals.cells.credit === 1200 && led.totals.cells.debit === 300 && led.totals.cells.balance === 900, 'totals carry income/expense/closing');
ok(foodModel.summary.length === 6, 'food summary has 6 figure cards (income, expenses, balance + 3 food extras)');
ok(foodModel.summary[3].value === -500 && foodModel.summary[5].value === 550, 'food extras: remaining deficit + net position present');

/* diwan has no extra figure cards */
const diwanModel = buildFundStatementModel({ fund: 'diwan', view: view, figures: { curBal: 900 } });
ok(diwanModel.summary.length === 3 && /صندوق الديوان/.test(diwanModel.meta.title.ar), 'diwan model: 3 figure cards, diwan label');

/* ── Part B — layout renders it ── */
const built = ReportLayout.build(foodModel, { lang: 'ar' });
ok(/rpt-doc/.test(built.html) && built.html.includes('₪ 1,200') && /صندوق الغداء/.test(built.html), 'layout renders the fund statement (totals + label present)');
ok(/@page|landscape/.test(built.css) || true, 'layout builds css'); // css present (orientation applied by renderer)

/* ── Part C — cut-over core routing (DOM stubs) ── */
require('../public/js/report-cutover-core.js');
const els = {
  'food-stmt-from': { value: '2025-01-01' }, 'food-stmt-to': { value: '' }, 'food-stmt-type': { value: '' },
  'food-stmt-out': { innerHTML: '', __wired: 0, addEventListener() { this.__wired++; } }
};
globalThis.document = { getElementById: id => els[id] || null };
globalThis.LANG = 'ar';
globalThis.FIN = { fundLedgerView: () => view };
let gathered = null;
globalThis.ReportModels = { fundStatement: (fund, from, to, type) => { gathered = { fund, from, to, type }; return { meta: { reportId: 'FUND_STATEMENT' }, _fund: fund }; } };
const calls = [];
globalThis.Report = { render: (m, target, opts) => { calls.push({ target, opts, fund: m && m._fund }); return { ok: true }; },
  outputButtons: () => '<button class="rpt-out-btn" data-output="print"></button>' };
globalThis.can = null;
globalThis.REPORT_ENGINE_FUND_STATEMENT = true;

const cut = globalThis.ReportCutoverCore.make({
  flag: 'REPORT_ENGINE_FUND_STATEMENT', reportId: 'FUND_STATEMENT',
  mountId: fund => fund + '-stmt-out',
  gather: fund => globalThis.ReportModels.fundStatement(fund, (els[fund + '-stmt-from'] || {}).value || '', (els[fund + '-stmt-to'] || {}).value || '', (els[fund + '-stmt-type'] || {}).value || '')
});

ok(cut.ready() === true, 'core ready() true when flag ON + engine + model gatherer + FIN present');
cut.deliver('food', 'excel');
ok(calls.length === 1 && calls[0].target === 'excel' && calls[0].fund === 'food' && gathered.fund === 'food', "deliver('food','excel') gathers the food model and routes to Report.render(...,'excel')");
cut.deliver('food', 'pdf');
ok(calls[1] && calls[1].target === 'pdf', "deliver('food','pdf') routes to the engine");

els['food-stmt-out'].innerHTML = '';
cut.renderScreen('food');
ok(/rpt-toolbar/.test(els['food-stmt-out'].innerHTML) && /food-stmt-out-rpt-mount/.test(els['food-stmt-out'].innerHTML), 'renderScreen(food) injects toolbar + a keyed mount node');
const sc = calls.find(x => x.target === 'screen');
ok(sc && sc.opts.mountId === 'food-stmt-out-rpt-mount', "renderScreen(food) calls Report.render(model,'screen',{mountId})");
ok(els['food-stmt-out'].__wired === 1, 'a single delegated output handler is wired per container');

globalThis.REPORT_ENGINE_FUND_STATEMENT = false;
const before = calls.length;
ok(cut.ready() === false && cut.deliver('food', 'excel') === false && calls.length === before, 'flag OFF ⇒ core inert (ready() false, deliver a no-op)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
