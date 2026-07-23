# Changelog

All notable milestones up to the V1 baseline. This baseline is the first tagged release;
entries below summarize the certified phases that constitute it (newest first).

## [1.0.0] — 2026‑07‑22 · Constitutional Baseline V1

### Added (governance / assurance — no runtime feature change in RLS‑001)
- **RLS‑001** — V1 Release Candidate Certification & Packaging: this release package
  (notes, changelog, checklists, snapshots, certificates, manifest) and the `v1.0.0` tag.
- **GOV‑013** — Autonomous Engineering Pipeline governance framework (A→B→C loop,
  Acceptance Gate, Stop Conditions), bound to the certified P‑AIENG roster.
- **Constitutional Certification Campaign** — Constitutional Laboratory (`lab/`) + FOC‑001…025:
  23/23 in‑scope chapters certified from real headless runs, 2 owner‑excluded, 0 failed;
  final Constitutional Certification Report + per‑chapter records + 184 evidence screenshots.
  - FOC‑022 recertified per the owner's Q4‑excess→member‑credit constitutional clarification
    (found to be a certification‑expectation correction, not a code defect).

### Platform (pre‑existing, frozen — carried into the baseline)
- **P0** Accounting Constitution · **P1** Certified Business Operations (BO‑01…BO‑10; BO‑06 deferred).
- **P2** Member Financial Lifecycle · **P3** Collection Operations · **P4** Payment Voucher
  Workspace · **P‑DUES** Annual Subscriptions · **P5‑OBS** Treasury Observability.
- **GOV‑WS‑01 v1.5** · **GOV‑WS‑02** Operational Separation Principle.
- **P‑AIENG** (000/S1/S2/S3 · ACT‑001 · W1 program + pilot, baseline‑frozen).

### Not changed / not activated
- **MODEL2** remains defined and **inert** (`DEFINED_INERT_P2A`).
- **BO‑06** (deficit settlement) and **Refund** remain deferred/reserved — not implemented.

### Known issues
- Legacy suites `tests/e2e-acceptance.cjs` and `tests/q5-evidence.cjs` require the uncommitted
  fixture `tests/roundtrip-seed.json`; superseded by the Constitutional Laboratory. See
  `OUTSTANDING_RISKS_REPORT.md`.

---
*Prior engineering history is preserved in git and in `docs/` (phase specs, completion
reports, closure reports). The pre‑V1 tag `baseline-pre-refactor-2026-06-29` remains for
historical reference.*
