# FIN-RECON-001 — Fix: Annual Debt report consumes the certified per-year truth

Companion to `FIN-RECON-001_FORENSIC.md`. Implements the approved minimal repair.

## Change (presentation-derivation only)
`FIN.debtReportRows` (`public/js/fin.js`) previously built the Annual Debt report's per-year
columns by summing the raw stored `subscriptions.paid_amount_ils`. That field is only ever a
**migration seed** — live subscription payments are food receipts resolved through the FD-002
waterfall (`operations.js` actively rejects any non-zero `paid_amount_ils`). So live-app-paid
members were reported **unpaid**.

The per-year block now reads the **certified FD-011 accessor** `FIN.memberDelinquency(id).byYear`:
- `selPaid = Σ byYear[y].paid` (waterfall allocation) — **corrected**.
- `selSub = Σ byYear[y].due` — value-identical to the previous `Σ due_amount_ils`.

No DB/schema change · no stored-data rewrite · no allocation/waterfall rule change · no UI
workaround · no report-specific duplicate logic. The Annual Debt report now **consumes** the
same certified truth the Delinquent report, dues workspace and member statement already use.

`FIN.verifyConsistency` gains a 6th per-member identity (`debt-report-paid`): the report's
`selPaid` must equal `Σ byYear.paid`, so any future revert is caught automatically.

## `paid_amount_ils` consumer audit (field retained — NOT deprecated)
| Consumer | Role | Verdict |
|---|---|---|
| `memberStatement` (fin.js:60) | statement seed row | legitimate — keep |
| `memberAllocation` (fin.js:196) | waterfall `remaining_seed = due − paid` | legitimate — keep |
| `_memberBaseBalance` (fin.js:248) | Item-9 base balance | legitimate — keep |
| `allocation-integration` buildObligations | waterfall seed (flagged engine) | legitimate — keep |
| `operations.js:300` | contract guard (rejects non-zero) | legitimate — keep |
| **`debtReportRows` (fin.js:579)** | Annual Debt per-year paid | **fixed (only change)** |

The field remains the stored obligation seed for four legitimate consumers; only the Annual
Debt report stopped reinterpreting it as final truth.

## Evidence
**Before/after — member paid 200 for 2026 via the live app (previously failing):**

| | BEFORE | AFTER |
|---|---|---|
| Annual Debt `selPaid` 2026 | **0 (unpaid)** | **200 (paid)** |
| Annual Debt balance (`current`) | 0 | 0 |
| Delinquent report 2026 | PAID ✓ | PAID ✓ |
| Member Statement balance | 0 | 0 |

**Cross-report reconciliation invariant** (`tests/fin-recon-reconciliation.test.cjs`, 11 checks,
all pass) — for the same member × year, Member Statement = Delinquent = Annual Debt, across:
fully paid · partially paid · unpaid · multiple payments · historical deficit + current dues ·
payment spanning two years · migration-seeded (no regression). Constitutional oldest-first
allocation preserved (SPAN: 300 → 2025 fully, 2026 partial, identical on both reports).

**Four output surfaces:** screen / print / PDF / Excel all consume the single
`ReportModels.annualDebt()` → `debtReportRows` model (`report-engine.js` lists all four reading
`selPaid`), so the correction propagates to every surface with no per-surface change.

**Regression:** full Node suite 71 pass (incl. the new test); the only failures are the 2
pre-existing baseline failures unrelated to forms/finance (`business-operations-slice1`,
`constitutional-explicit-q5`); existing `debt-report-model.test.cjs` and `consistency-verifier`
still green.
