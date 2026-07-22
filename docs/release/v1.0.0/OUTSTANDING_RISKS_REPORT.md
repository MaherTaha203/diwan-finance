# Outstanding Risks Report — v1.0.0

Honest register of what is **not** perfect at the V1 baseline. None is a release blocker;
each has a rating and a disposition.

## R‑1 · Legacy test suites blocked on a missing fixture — LOW
- **What:** `tests/e2e-acceptance.cjs` and `tests/q5-evidence.cjs` read
  `tests/roundtrip-seed.json`, which was **never committed** (no repo script generates it,
  it is not git‑ignored). Both suites therefore abort on a clean checkout.
- **Why it's LOW:** their coverage is **superseded** by the **Constitutional Laboratory**
  (90/90, runnable, green) and by `constitutional-verification.cjs` (12/12 GOLDEN) and
  `fin2.test.cjs` (all pass). No runtime defect is implied.
- **Disposition:** recorded as remaining work — either commit a correct `roundtrip-seed.json`
  or migrate the two suites onto the Lab seed. **Deliberately not done in RLS‑001** (this
  phase introduces no functionality and must not fabricate test data to force a pass).

## R‑2 · MODEL2 inert vs declared allocation order — LOW / by design
- **What:** MODEL2 declares an allocation order it does not execute (runtime nets
  oldest‑first). Certified and documented (FOC‑025); a known, intentional state, not a bug.
- **Disposition:** resolved only if/when MODEL2 is activated by owner order.

## R‑3 · Deferred capabilities absent — ACCEPTED (owner‑gated)
- **What:** BO‑06 (deficit settlement) and Refund have no live path; FOC‑012/013 excluded.
- **Disposition:** intentional V1 scope decision; re‑certify when implemented.

## R‑4 · Operational (data plane) — MANAGED
- **What:** production correctness depends on Supabase backups/PITR, RLS, and the atomic
  RPCs remaining unchanged.
- **Disposition:** covered by `BACKUP_CHECKLIST.md` / `RESTORE_CHECKLIST.md` /
  `DEPLOYMENT_CHECKLIST.md`; verify before go‑live.

## Blockers
**None.** No HIGH/critical risk is open against the V1 baseline.
