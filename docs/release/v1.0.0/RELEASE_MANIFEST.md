# Release Manifest — v1.0.0

Machine‑and‑human readable inventory of the V1 release.

## Identity
| Field | Value |
|---|---|
| Release name | Diwan Financial System — Constitutional Baseline V1 |
| Version | `1.0.0` (matches `package.json`) |
| Git tag | `v1.0.0` (annotated) |
| Tag target | the merged RLS‑001 commit on `main` (built on `b40ec03`) |
| Phase | RLS‑001 |
| Date | 2026‑07‑22 |
| Pipeline | GOV‑013 (A→B→C→PASS) |

## Tag command (applied to the merged baseline — see §Tagging)
```
git tag -a v1.0.0 <merged-RLS-001-commit> -m "Diwan Financial System — Constitutional Baseline V1"
git push origin v1.0.0
```

## Release package contents (`docs/release/v1.0.0/`)
- RELEASE_NOTES.md
- CHANGELOG.md
- DEPLOYMENT_CHECKLIST.md
- BACKUP_CHECKLIST.md
- RESTORE_CHECKLIST.md
- PRODUCTION_READINESS_REPORT.md
- OUTSTANDING_RISKS_REPORT.md
- FINAL_ARCHITECTURE_SNAPSHOT.md
- FINAL_BUSINESS_RULE_SNAPSHOT.md
- FINAL_CONSTITUTIONAL_SNAPSHOT.md
- FINAL_RELEASE_REPORT.md
- PRODUCTION_READINESS_CERTIFICATE.md
- V1_BASELINE_CERTIFICATE.md
- RELEASE_MANIFEST.md (this file)

## Certified system components (frozen at V1)
- Accounting Constitution (12 Laws) · Accounting Core (`fin.js`/`fin2.js`/`fin-contract.js` +
  atomic RPCs) · Certified Business Operations BO‑01…BO‑10 (BO‑06 deferred).
- Modules: P2 (`member-lifecycle.js`) · P3 (`collection-workspace.js`) · P4
  (`payment-workspace.js`) · P‑DUES (`dues-workspace.js`) · P5‑OBS (`treasury-workspace.js`).
- Governance: GOV‑WS‑01 v1.5 · GOV‑WS‑02 · P‑AIENG track · GOV‑013.
- Assurance: Constitutional Laboratory (`lab/`) + certification corpus (`lab/certification/`).

## Verification snapshot (at release)
| Gate | Result |
|---|---|
| Constitutional Laboratory | 90/90 · 23/23 · 0 failures |
| constitutional-verification.cjs | 12/12 · GOLDEN unchanged |
| fin2.test.cjs | ALL PASS |
| node --check (public/js) | 28/28 clean |

## Deployment target
Vercel (static `public/` + `api/verify.js`) over Supabase; config in `vercel.json`; env by
name only. Reversible via previous‑deployment re‑promote.

## Tagging (final step — sequencing)
The annotated tag `v1.0.0` is pushed **after** the RLS‑001 PR merges into `main`, so the tag
marks the true production baseline commit on `main`. Until then this manifest records intent.
