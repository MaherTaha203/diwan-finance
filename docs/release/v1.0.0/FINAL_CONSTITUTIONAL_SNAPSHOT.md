# Final Constitutional Snapshot — v1.0.0

The constitutional state of the system, frozen at the V1 baseline. Source of truth: the
Constitutional Laboratory (`lab/`) and its Certification Campaign.

## Certification counters (at release)
| Counter | Value |
|---|---|
| **Certified** | **23** |
| **Excluded (owner‑approved)** | **2** (FOC‑012 BO‑06 · FOC‑013 Refund) |
| **Failed** | **0** |
| **Pending** | **0** |
| **Coverage (in‑scope)** | **23/23 = 100%** |
| **Total chapters** | 25 (2 out of current scope) |
| **Lab checks** | **90/90** |
| **Evidence screenshots** | **184** |

## The twelve Laws — status
All twelve Accounting Constitution laws are **frozen and upheld** by the certified behavior
(names verbatim from `docs/governance/ACCOUNTING_CONSTITUTION.md`):
1 **Conservation** · 2 **Derivation** · 3 **Single Source of Truth** · 4 **Explicit
Classification** · 5 **Immutable History** · 6 **Traceability** · 7 **Atomicity** · 8
**Custody** · 9 **Historical Deficit Bounds** · 10 **Split Exactness** · 11 **Locked Period
Sanctity** · 12 **Identity Uniqueness**. No law was modified in V1.

## Chapter ledger (FOC‑001…025)
- **Certified (23):** FOC‑001…011, FOC‑014…025.
- **Excluded — owner‑approved (2):** FOC‑012 (BO‑06 deficit settlement, deferred) ·
  FOC‑013 (Refund, reserved). To be re‑opened and certified when MODEL2 / BO‑06 are
  implemented by owner order.

## Constitutional distinctions frozen at V1
- Member's personal `historical_balance_ils` (a receivable, reduced by netting) **vs** the
  communal Historical‑Deficit treasury (fed by classified ق4 collections / directed
  donations / ق5 transfers).
- **Excess Q4 collection → member credit** (owner clarification, FOC‑022): outstanding
  closes to 0 first, remainder is a preserved credit.
- **MODEL2 is inert** (`DEFINED_INERT_P2A`): classification authority, not runtime allocator.
- **Overflow** is a read‑time rule (no rows written).

## Assurance method (integrity guarantees)
- All evidence generated from **real headless runs** over an isolated in‑memory mock —
  **zero production contact**, **no fabricated evidence**.
- **Regression gate:** any change to an expected result fails the run; Golden baseline held.
- **No MODEL2 activation, no BO‑06, no Refund, no production‑logic change** during any
  certification or during RLS‑001.

## Standing constitutional obligations carried forward
- When MODEL2 / BO‑06 are officially implemented: remove the exclusion and perform full
  constitutional certification for FOC‑012 and FOC‑013 under the same methodology.
