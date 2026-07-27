/* REPORT-001 · R8-c — the MemberLifecycle initial-state card is ported into the
   unified engine member screen (ReportCutover.renderScreen), restoring the additive
   card the legacy screen injected (P2·S1) so the engine is a 1:1 replacement before
   the legacy cluster is removed. Pure node. Usage: node tests/report-r8c-lifecycle-port.test.cjs */
'use strict';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* ── minimal DOM: #ms-out (target), #ms-member (selected), #ms-from/#ms-to ── */
const els = {
  'ms-out': { innerHTML: '', __wired: false, addEventListener() { this.__wired = true; } },
  'ms-member': { value: 'M1' }, 'ms-from': { value: '' }, 'ms-to': { value: '' }
};
globalThis.document = { getElementById: id => els[id] || null };
globalThis.LANG = 'ar';
globalThis.can = { print: () => true, export: () => true };

/* ── engine + model + FIN stubs (just enough for ready()/gatherModel/render) ── */
let rendered = null;
globalThis.Report = {
  outputButtons: () => '<button class="rpt-out-btn" data-output="print">P</button>',
  render: (model, target, opts) => { rendered = { model, target, opts }; }
};
globalThis.ReportModels = { memberStatement: (mid, f, t) => ({ meta: { reportId: 'MEMBER_STATEMENT' }, mid, f, t }) };
globalThis.FIN = { memberStatementView: () => ({}) };

/* ── the ported dependency: MemberLifecycle.initialStateCard returns a sentinel card ── */
const SENT = '<div class="mlc-initial" data-sentinel="R8C">LIFECYCLE-CARD</div>';
let cardArgs = null;
globalThis.MemberLifecycle = { initialStateCard: (mid, en) => { cardArgs = { mid, en }; return SENT; } };

globalThis.REPORT_ENGINE_MEMBER_STATEMENT = true;
const Cutover = require('../public/js/report-cutover.js');

/* render the member screen through the engine glue */
els['ms-out'].innerHTML = '';
const handled = Cutover.renderMemberScreen();
const html = els['ms-out'].innerHTML;

ok(handled === true, 'renderMemberScreen handled the render (flag ON, deps present)');
ok(rendered && rendered.target === 'screen' && rendered.opts && rendered.opts.mountId === 'ms-rpt-mount',
  'the statement itself still renders through Report.render(screen, #ms-rpt-mount)');
ok(html.indexOf('data-sentinel="R8C"') !== -1, 'the MemberLifecycle initial-state card is injected into the screen');
ok(cardArgs && cardArgs.mid === 'M1' && cardArgs.en === false,
  'the card is built for the selected member with the correct lang flag (ar → en=false)');

/* position: card sits AFTER the toolbar and BEFORE the statement mount (top of the statement area) */
const iToolbar = html.indexOf('rpt-toolbar');
const iCard = html.indexOf('data-sentinel="R8C"');
const iMount = html.indexOf('id="ms-rpt-mount"');
ok(iToolbar !== -1 && iToolbar < iCard && iCard < iMount,
  'card is positioned after the toolbar and before the statement mount');

/* graceful: if MemberLifecycle is absent, the screen still renders (no throw, no card) */
delete globalThis.MemberLifecycle;
els['ms-out'].innerHTML = '';
let threw = false; try { Cutover.renderMemberScreen(); } catch (e) { threw = true; }
ok(!threw && els['ms-out'].innerHTML.indexOf('ms-rpt-mount') !== -1 && els['ms-out'].innerHTML.indexOf('data-sentinel') === -1,
  'without MemberLifecycle the screen still renders (no throw, card simply absent)');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
