/* FORM-001 — Form Workspace System contract guard (Phase 1 + Phase 2).
   Locks the reusable architecture without asserting business behavior:
   · both financial forms (#m-pay, #m-rec) carry the Base + Financial-Transaction classes
     and preserve their field ids (savePay/saveRec read the DOM by id);
   · the Phase-2 motion contract: the workspace opens with the light `fwIn` (opacity + small
     lift, NO scale of the whole panel), the method pills don't use `transition:all`, reduced
     motion makes the workspace instant, and the backdrop blur is light.
   Usage: node tests/form-workspace-contract.test.cjs */
'use strict';
const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');

/* ── both financial forms opt into the Base + FT variant ── */
const payTag = (html.match(/<div class="modal editor[^"]*" id="m-pay"/) || [''])[0];
const recTag = (html.match(/<div class="modal editor[^"]*" id="m-rec"/) || [''])[0];
ok(/fw-modal/.test(payTag) && /fw-fin/.test(payTag), '#m-pay carries the Base (fw-modal) + Financial-Transaction (fw-fin) classes');
ok(/fw-modal/.test(recTag) && /fw-fin/.test(recTag), '#m-rec carries the Base (fw-modal) + Financial-Transaction (fw-fin) classes');

/* ── field preservation (the save functions read these ids) ── */
const payIds = ['pay-fund','pay-expense','pay-beneficiary-type','pay-member','pay-ben-name','pay-currency','pay-amount','pay-date','pay-method','pay-approved','pay-notes'];
const recIds = ['rec-fund','rec-payer-type','rec-member','rec-contact','rec-payer-name','rec-currency','rec-amount','rec-date','rec-method','rec-notes','rec-diwan-type','rec-don-kind','rec-don-category','rec-don-display','rec-don-alloc-type'];
ok(payIds.every(id => html.includes('id="' + id + '"')), 'payment form preserves all ' + payIds.length + ' field ids');
ok(recIds.every(id => html.includes('id="' + id + '"')), 'receipt form preserves all ' + recIds.length + ' field ids (incl. donation sub-tree)');
/* the receipt conditional wrappers used for show/hide must remain by id */
ok(['rec-member-wrap','rec-contact-wrap','rec-manual-wrap','rec-diwan-type-wrap','rec-don-fund-wrap','rec-cheque-wrap','rec-ils-row']
  .every(id => html.includes('id="' + id + '"')), 'receipt conditional wrappers preserved by id');

/* ── Base workspace structure present on the receipt ── */
ok(/<div class="mbd fw-body">/.test(html) && /class="fw-cols"/.test(html) && /class="fw-sec"/.test(html), 'receipt uses the Base section shell (fw-body/fw-cols/fw-sec)');
ok(/id="rec-diwan-type-wrap" class="fw-band"/.test(html) && /id="rec-don-fund-wrap" class="fw-band"/.test(html), 'receipt conditional classification blocks use .fw-band (full-width)');

/* ── Phase-2 motion contract ── */
ok(/@keyframes fwIn\{from\{opacity:0;transform:translateY\(6px\)\}to\{opacity:1;transform:none\}\}/.test(css), 'workspace entrance is fwIn = opacity + 6px lift (NO scale of the whole panel)');
ok(!/\.modal\.editor\.fw-modal\{[^}]*animation:mIn/.test(css), 'the workspace no longer uses the mIn scale entrance');
ok(/\.fw-modal \.pill\{transition:background[^}]*\}/.test(css) && !/\.fw-modal \.pill\{transition:all/.test(css), 'method pills use explicit transitions (not transition:all) inside the workspace');
ok(/@media \(prefers-reduced-motion:reduce\)\{ ?\.modal\.editor\.fw-modal\{animation:none!important\} ?\}/.test(css), 'reduced-motion makes the workspace open instantly');
const blur = (css.match(/\.ov\{[^}]*backdrop-filter:blur\((\d+)px\)/) || [])[1];
ok(blur !== undefined && Number(blur) <= 3, 'overlay backdrop blur is light (<=3px) — measured to cut ~25% off modal-open on desktop');

console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
