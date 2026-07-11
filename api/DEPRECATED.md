# `api/` — module status

The live system serves its financial logic from the browser bundle under
`public/js/` (loaded by `public/index.html`). The Node side is intentionally thin.

## Loaded in production / development

- **`verify.js`** — the ONLY module wired up. `server.js` requires it directly and
  Vercel serves it as the `/api/verify` serverless function (QR receipt verification).

## Not loaded — dead code (kept for reference only)

None of the following are imported by `server.js`, referenced in `index.html`,
or run by any test script (`package.json` defines no test runner):

- `_phase15-allocationEngine.js`
- `_phase15-auditService.js`
- `_phase15-foodFundDonationService.js`
- `allocationEngine.js` *(if present)*
- `auditService.js`
- `foodFundDonationService.js`
- `allocationEngine.test.js`
- `foodDonationAllocation.test.js`

These are historical experiments from an earlier server-side allocation design.
The authoritative allocation kernel is `public/js/foodDonationAllocation.js`
consumed by `public/js/fin.js`. Do not treat anything here as source of truth.

> Left in place (not deleted) so history stays inspectable. Slated for removal
> once the migration reaches its system-wide consistency phase.
