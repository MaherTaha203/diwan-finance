# P-RECEIPT-ALLOCATION-008 — PR-0: Proof of Single Read Path (added gate)

**One implementation condition added before PR-1. Read-only. No spec changed, no code, no migration, no PR.** Visual proof: Artifact "PR-0 — Proof of Single Read Path".

## The condition
Insert **PR-0** as the first item of the Phase-9 implementation order (before PR-1). PR-0 is a **read-only proof** that `FIN.memberAllocation()` is the single read point for year-attribution and that a change there propagates to all intended surfaces — and nowhere else. PR-1 does not begin until PR-0 passes and is approved.

## Proof (verified from the current code)
- **Single producer.** The per-year attribution structure `perYear{}` is created in exactly one function — `memberAllocation()` (`fin.js:194`); `byYear{}` is only its wrapper (`fin.js:160`). No second producer exists.
- **Single funnel.** Every attribution surface resolves, via `memberDelinquency()`, to that one producer:
  - Delinquent — `reports.js:148`
  - Annual Debt — `fin.js:586` (`debtReportRows`)
  - Dues — `dues-workspace.js:77`
  - Dashboard — `app.js:681`
  - Member Card — `member-lifecycle.js:243`
  - `verifyConsistency` cross-check — `fin.js:639-640`
- **No competing reader.** `allocation_records` is only *written* (MODEL2 audit, flag-gated: `allocation-integration.js:40,57`) and is read by **no** read-model today → `memberAllocation()` becomes its sole reader with zero contention.
- **Propagation.** Producers of `perYear` = 1 · attribution surfaces = 5 · competing readers = 0 · balances the change may move = 0 (attribution decides *which* year, never a total; `memberStatement.finalBalance` is split-invariant).

## PR-0 acceptance (objective, read-only)
- ✓ `perYear` is assigned in exactly one function (grep: 1 match).
- ✓ Each of the five surfaces resolves to `memberDelinquency → memberAllocation` (call graph).
- ✓ No read-model reads `allocation_records` directly (repo scan: 0).
- ✓ A read-only propagation probe perturbs `memberAllocation().perYear` in memory and shows all five surfaces change while every member Final Balance stays byte-identical.

## Updated Phase-9 order
`PR-0 (this gate) → PR-1 … PR-9` (per P-RECEIPT-ALLOCATION-006 §Phase 9). Each phase independent, reversible, ending in a verification report; none starts before the previous is approved.

**Verdict: READY.** PR-0 is defined and its proof holds today.

---
**Read-only — nothing modified beyond this document. `fin.js` @ baseline; Golden Reference intact.**
