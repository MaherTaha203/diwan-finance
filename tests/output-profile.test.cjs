/* OUTPUT-002-C — Organization/Output Profile store: defaults, deep-merge, read shapes. */
'use strict';
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }

const OP = require('../public/js/output-profile.js');

/* defaults complete + seeded from brand */
const d = OP.get();
ok(d.organization && d.output, 'profile has organization + output blocks');
ok(d.organization.name.ar === 'ديوان آل طه', 'org name seeded from brand (ar)');
ok(d.organization.logo === '' && d.organization.stamp === '' && d.organization.signatureImage === '', 'image fields start empty');
ok(d.output.showQR === true && d.output.showLogo === true && d.output.showStamp === false, 'output toggles have sane defaults');

/* org() read shape for report-layout */
const org = OP.org();
ok(org.name && org.subtitle && 'logo' in org && 'signatoryTitle' in org, 'org() exposes header + signature fields');
ok(org.signatoryTitle.ar === 'توقيع الديوان', 'default signatory title present');

/* deep-merge: a partial patch keeps the rest of the schema */
OP.set({ organization: { phone: '0599', name: { en: 'Custom EN' } }, output: { showQR: false } });
const m = OP.get();
ok(m.organization.phone === '0599', 'patch applied (phone)');
ok(m.organization.name.en === 'Custom EN' && m.organization.name.ar === 'ديوان آل طه', 'nested patch merges, sibling default kept');
ok(m.output.showQR === false && m.output.showLogo === true, 'output patch merges, other toggles kept');

/* logo default = the system brand logo (BrandAssets absent under node ⇒ fallback URL),
   so it appears automatically in reports even with no custom upload */
ok(OP.org().logo === OP.defaultLogo() && OP.org().logo !== '', 'org().logo defaults to the system brand logo when no custom is set');
ok(OP.logoIsCustom() === false, 'logoIsCustom() false when using the default');
ok(OP.logoResolved() === OP.defaultLogo(), 'logoResolved() is the default when no custom');

/* a custom logo overrides the default */
OP.set({ organization: { logo: 'data:x' } });
ok(OP.org().logo === 'data:x' && OP.logoIsCustom() === true, 'custom logo overrides the default');

/* showLogo=false suppresses the logo (custom or default) but keeps it stored */
OP.set({ organization: { logo: 'data:x' }, output: { showLogo: false } });
ok(OP.org().logo === '' && OP.get().organization.logo === 'data:x', 'showLogo=false hides logo in org() but keeps it stored');
OP.reset();
ok(OP.org().logo === OP.defaultLogo(), 'reset restores the default-logo behavior');

/* reset restores defaults */
OP.reset();
ok(OP.get().output.showQR === true && OP.get().organization.phone === '', 'reset restores defaults');

/* unknown/legacy stored keys are ignored (schema authoritative) */
OP.set({ bogus: 1, organization: { nope: 2 } });
ok(OP.get().bogus === undefined && OP.get().organization.nope === undefined, 'unknown keys are dropped');
OP.reset();

console.log((fail === 0 ? 'PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
