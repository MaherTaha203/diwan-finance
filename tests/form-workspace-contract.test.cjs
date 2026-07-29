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

/* ── FORM-001 Phase 3 · Entity variant (members) ── */
const memTag = (html.match(/<div class="modal editor[^"]*" id="m-member"/) || [''])[0];
const ememTag = (html.match(/<div class="modal editor[^"]*" id="m-edit-member"/) || [''])[0];
ok(/fw-modal/.test(memTag) && /fw-entity/.test(memTag), '#m-member carries the Base (fw-modal) + Entity (fw-entity) classes');
ok(/fw-modal/.test(ememTag) && /fw-entity/.test(ememTag), '#m-edit-member carries the Base + Entity classes');
ok(['mem-name','mem-phone','mem-from-year','mem-balance','mem-notes'].every(id => html.includes('id="' + id + '"')), 'member create form preserves all field ids');
ok(['edit-mem-id','edit-mem-name','edit-mem-phone','edit-mem-from-year','edit-mem-balance','edit-mem-notes'].every(id => html.includes('id="' + id + '"')), 'member edit form preserves all field ids');
/* the Entity variant is a COMPACT card, not the wide FT workspace, and not two FT columns */
ok(/\.modal\.editor\.fw-modal\.fw-entity\{width:min\(560px/.test(css), 'Entity variant is a compact centered card (min(560px), narrower than the FT workspace)');
ok(!/id="m-member"[\s\S]{0,400}fw-cols/.test(html), 'the Entity form does not use the FT two-column split (single logical section)');
/* Entity forms are NOT financial — they must not carry the FT variant class */
ok(!/fw-fin/.test(memTag) && !/fw-fin/.test(ememTag), 'member forms are Entity, not Financial-Transaction (no fw-fin)');

/* ── FORM-001 Phase 5 · reservations (2nd Entity surface) ── */
const resTag = (html.match(/<div class="modal editor[^"]*" id="m-res-form"/) || [''])[0];
ok(/fw-modal/.test(resTag) && /fw-entity/.test(resTag) && !/fw-fin/.test(resTag), '#m-res-form is the Entity variant (fw-modal fw-entity, not financial)');
ok(['res-f-id','res-f-date','res-f-name','res-f-phone','res-f-type','res-f-notes','res-f-save','m-res-form-title'].every(id => html.includes('id="' + id + '"')), 'reservation form preserves all field ids + dynamic title/save ids');
ok(['res-f-date-err','res-f-name-err','res-f-phone-err','res-f-type-err'].every(id => html.includes('id="' + id + '"')), 'reservation per-field error slots preserved');

/* ── FORM-001 Phase 6 · Settings variant (m-output-settings, built in output-settings.js) ──
   The settings modal is created dynamically, so it isn't in index.html — assert against the
   builder source + the app.css variant rule. */
const os = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'output-settings.js'), 'utf8');
ok(/class="modal editor fw-modal fw-settings"/.test(os) && !/fw-fin/.test(os) && !/fw-entity/.test(os), '#m-output-settings is the Settings variant (fw-modal fw-settings, not financial/entity)');
ok(/class="mbd fw-body"/.test(os), 'settings body uses the Base scrollable shell (mbd fw-body)');
ok(/class="mft fw-ft"/.test(os) && /fw-ft-spacer/.test(os), 'settings has the Base sticky footer (mft fw-ft with primary Save · spacer · ghost Reset)');
ok(!/\.mbd\{max-height:72vh/.test(os), 'the legacy .mbd max-height override was removed (Base scroll + sticky footer now handle overflow)');
ok(['os-show-logo','os-name','os-subtitle','os-site','os-phone','os-email','os-address','os-footer','os-default-action','os-prev-logo','os-logo-note'].every(id => os.includes("'" + id + "'") || os.includes('"' + id + '"')), 'settings form preserves its field ids/bases (read by populate/collect)');
ok(/\.modal\.editor\.fw-modal\.fw-settings\{width:min\(640px/.test(css), 'Settings variant is a wider config card (min(640px), between the Entity card and the FT workspace)');

/* ── FORM-001 Phase 7 · Administrative variant (m-invite, m-reclass) ──
   These were already-centered plain `.modal` dialogs (not editor drawers); Phase 7 adopts
   the Base workspace shell + a compact Administrative variant for structural/motion
   consistency. Presentation only — every field id + handler preserved. */
const invTag = (html.match(/<div class="modal editor[^"]*" id="m-invite"/) || [''])[0];
const rclTag = (html.match(/<div class="modal editor[^"]*" id="m-reclass"/) || [''])[0];
ok(/fw-modal/.test(invTag) && /fw-admin/.test(invTag) && !/fw-fin/.test(invTag) && !/fw-entity/.test(invTag), '#m-invite is the Administrative variant (fw-modal fw-admin, not financial/entity)');
ok(/fw-modal/.test(rclTag) && /fw-admin/.test(rclTag) && !/fw-fin/.test(rclTag) && !/fw-entity/.test(rclTag), '#m-reclass is the Administrative variant (fw-modal fw-admin, not financial/entity)');
ok(['cu-name','cu-role','cu-phone','cu-email','cu-idhint','cu-manual-block','cu-pass','cu-note','cu-bar','cu-lvl','cu-force','cu-submit'].every(id => html.includes('id="' + id + '"')), 'create-user form preserves all field ids');
ok(['rcl-info','rcl-type','rcl-dest','rcl-amount','rcl-amount-hint','rcl-reason'].every(id => html.includes('id="' + id + '"')), 'reclassify form preserves all field ids');
ok(/name="cu-mode"/.test(html), 'create-user password-mode radios preserved (cu-mode)');
ok(/\.modal\.editor\.fw-modal\.fw-admin\{width:min\(520px/.test(css), 'Administrative variant is a compact action card (min(520px), narrower than the Entity/Settings cards)');

/* ── FORM-001 Phase 4 · audit completeness ──
   Every `.modal editor` INPUT form in index.html must be either converted (carries
   `fw-modal`) or an explicitly-listed known-unconverted candidate, so a new legacy
   drawer can't slip in unclassified. Update KNOWN_UNCONVERTED only via the audit. */
const KNOWN_UNCONVERTED = [];   /* all editor forms converted through Phase 7; Settings (m-output-settings) is dynamic */
const editorForms = [...html.matchAll(/<div class="modal editor[^"]*" id="([^"]+)"/g)].map(m => ({ id: m[1], cls: m[0] }));
const unclassified = editorForms.filter(f => !/fw-modal/.test(f.cls) && !KNOWN_UNCONVERTED.includes(f.id));
ok(unclassified.length === 0, 'every .modal.editor form is converted (fw-modal) or a listed audit candidate' + (unclassified.length ? ' — stray: ' + unclassified.map(f => f.id).join(',') : ''));
ok(editorForms.filter(f => /fw-modal/.test(f.cls)).length === 7, 'exactly the 7 expected forms are converted (m-pay/m-rec/m-member/m-edit-member/m-res-form/m-invite/m-reclass)');

console.log(fail ? ('FAILED — ' + pass + ' passed, ' + fail + ' failed') : ('ALL PASS — ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
