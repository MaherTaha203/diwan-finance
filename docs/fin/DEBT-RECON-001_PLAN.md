# DEBT-REPORT-RECON-001 — Repair Plan (Step 3 · for approval, no implementation)

Methodology: proof → decision → **plan** → implement → verify. This is the plan; nothing is coded. `fin.js` is at baseline, `memberAllocation` untouched, PR #273 held.

## 0. Established (prior steps)
- **Proof:** `member_subscriptions.paid_amount_ils` is **write-once at creation, immutable after** (only the Phase-15 Excel import writes it non-zero; ERP writes 0 and `operations.js:300` rejects non-zero; no UPDATE path in app/DB/triggers/RPC/edge-functions). → **Domain A = frozen historical snapshot.** `receipts` = **Domain B = ERP events.**
- **Decision:** FD-002 allocation operates on **Domain B only**; `paid_amount_ils` is never a financial event.
- **Owner truth matrix reviewed** → the authoritative per-year status reference.

## 1. The engine change — `FIN.memberAllocation` (one boundary)
| # | Location | Change |
|---|---|---|
| 1 | `fin.js:193` | add `seedCredit=0` |
| 2 | `fin.js:197` | **remove** `pool += max(0, paid−due)`; replace with `seedCredit += max(0, paid−due)` — Domain-A surplus becomes member credit, **never entering the FD-002 pool** |
| 3 | `fin.js:224/231` | `creditRemaining` carries `seedCredit` (credit total unchanged) |

Unchanged: line 200 (`remaining_seed = max(0, due−paid)` — Domain-A snapshot still settles *its own year, capped*); line 220 (pool = Domain-B receipts/donations/write-offs/refunds); the FD-002 order (annual oldest-first → historical last) — it now runs on **Domain B only**.

**Conservation is preserved by construction** (proven algebraically and on the 147-member dataset): `Σ remaining + histRemaining − creditRemaining = finalBalance`, identical before/after — the surplus merely moves from "allocated" to "credit."

## 2. Canonical `byYear` after the repair (and the one residual decision)
- `byYear.settled/status` = **owner truth** (authoritative) where present, else Domain-B derived — **unchanged** (already how `memberDelinquency` works).
- `byYear.paid` = Domain-A per-year imported amount (capped, **no cascade**) + Domain-B allocation.

**Residual to decide:** a small set of members have an *internally inconsistent import* — the imported **amount** implies one thing while the imported/approved **status** says another (e.g. TAHA-0001: 400 stored on 2025, approved status 2026 = paid). After the repair, `byYear.settled` = truth (correct), but `byYear.paid` for that year is 0. Two ways to make amount and status agree at the canonical source:
- **(Recommended) Data reconciliation, guided by your approved matrix** — a separate, owner-gated step: align only the flagged rows so the imported amount matches the approved status (no engine hack, fixes the root data inconsistency, and then derived == truth with the override no longer papering over anything). Keeps the engine free of any truth-in-amount special case.
- **(Alt) Truth-consistent `byYear.paid` in the single accessor** — make the amount follow the approved status inside `memberDelinquency`. No data change, but the amount is then a presentation of the approved status rather than a pure derivation.

The **engine repair (§1) is independent of this decision** and can proceed first; the residual is resolved afterward using your reviewed matrix.

## 3. Tests affected
| Test | Action |
|---|---|
| `historical-truth.test.cjs` | **Rewrite** the surplus-cascade assertions (lines 37, 57: *"2026 settled by surplus"*, *"engine still allocates the surplus"*). These certify the **now-superseded** behavior. New assertions: imported surplus does **not** cascade (2026 derived unpaid); truth still overrides the displayed status; every financial figure still byte-identical. Comment cites the owner's final Domain A/B rule. |
| **NEW** `annual-settlement-source-boundary.test.cjs` | Domain-A snapshot never allocates across years; Domain-B receipts do; the §4 regression matrix (rows 1-14 incl. migration overpayment, clean prepay, live receipt, partial, multi-year). |
| `fin-recon-reconciliation.test.cjs` (#273) | Extend with Domain-A/B cases; keep the four-surface reconciliation invariant. |
| `consistency-verifier.test.cjs` | Must still pass unchanged — conservation invariant is the guardrail. |
| `debt-report-model.test.cjs` | Verify unaffected (its fixtures have no surplus rows). |
| Full suite | Expect all green except the 2 known pre-existing baseline failures. |

## 4. Regression guarantees (what proves no harm)
1. **`finalBalance` byte-identical for all 147 members** (memberStatement untouched) — asserted per member.
2. **Treasury, fund ledgers, dashboards unchanged** (all derive from `finalBalance`).
3. **Conservation invariant** (`verifyConsistency`) holds for every member.
4. **Live-receipt (Domain B) members unchanged** — the 10 ERP-paid members still settle correctly.
5. **Owner-matrix oracle:** the repaired reports' per-year status matches your **approved matrix** for all 147 (the official reference).
6. **Four-surface reconciliation** (Statement / Delinquent / Annual Debt / Dues) after repair + #273.

## 5. Sequencing
1. Implement §1 in `memberAllocation` + §3 tests → run full suite + conservation + prod re-run.
2. Verify against your **approved matrix** (status parity, 147/147).
3. Resolve §2 residual (recommended: data reconciliation on the flagged rows).
4. **Then** merge #273 → four-surface consistency proven.
5. (Optional, separate) formalize provenance durably (explicit marker / DB guard) so the Domain boundary can't silently break in future.

## 6. What I'll need at verification
Your **approved matrix** (the copied text from the Truth Review artifact) as the oracle — or your confirmation that you left the baseline system statuses unchanged. This drives both the §4.5 parity check and the §2 data-reconciliation scope.

## 7. Boundaries (unchanged)
No DB/schema change, no migration-data change, no truth-table change, no receipt/voucher/UI change in the engine repair. Code = `memberAllocation` + tests only. Any data reconciliation (§2 recommended) is a **separate, owner-gated** step driven by your approved matrix.

---
**Awaiting approval of this plan.** On your go: implement §1 + §3, verify (§4), and STOP before merging #273 for your final sign-off — exactly as the methodology prescribes.
