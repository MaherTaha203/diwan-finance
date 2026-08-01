# TRUTH-001 — Adopt the Approved Truth Matrix as the Canonical Year-Status Source (design only)

**Design study — no code.** Goal: after the owner's manual review, the approved Truth Matrix becomes the **single source of the per-year status** (مسدّد / جزئي / غير مسدّد) on **every** surface. **Amounts are never changed** — due, paid, balance, historical, final stay exactly as-is. Only *status* is unified. Forbidden until approval: touching Allocation Engine, FIN, DB, Reports, Business Rules.

> Key reframing this produces: because status will come from the **approved truth**, not from re-derivation, the **allocation math never needs to change** — which is exactly why you forbade touching the engine. The earlier memberAllocation-cascade repair becomes unnecessary; #273's direction also simplifies to "Annual Debt shows the canonical *status*, keeps its raw amount columns."

---

## 1. Root Cause Analysis
The system **already has a single canonical year-status accessor**: `FIN.memberDelinquency(id).byYear[year]` → `{ status, settled, authoritative }`, which applies the `historical_subscription_truth` override on top of the FD-002 derivation.

- **Five of six status surfaces already read it** (truth-aware, mutually consistent): Delinquent list, Dues Workspace, Dashboard debts, Member-lifecycle card, and the engine Delinquent model.
- **One surface bypasses it:** the **Annual Debt / Debt report** (`FIN.debtReportRows` → raw `paid_amount_ils` amounts). It implies a per-year status from the raw stored amount, **independent of the canonical accessor and the truth override**.
- **Member Statement** shows the ledger *amounts* (due/paid rows); it asserts no explicit per-year status label.

**Root cause:** year status is not sourced from one accessor — a single report (**Annual Debt**) re-derives it from raw `paid_amount_ils`, so "Statement/Delinquent = X, Debt Report = Y" for the same year. Everything else is already unified.

## 2. Source Dependency Diagram (where each surface reads year status)

| Surface | Reads status from | Allocation? | `paid_amount_ils`? | `memberDelinquency`? | Truth override? | Verdict |
|---|---|:--:|:--:|:--:|:--:|---|
| قائمة المتأخرين (Delinquent) | `memberDelinquency.byYear.status` | via accessor | via accessor | **yes** | **yes** | canonical ✓ |
| Dues Workspace | `memberDelinquency.byYear.settled` | via accessor | via accessor | **yes** | **yes** | canonical ✓ |
| Dashboard debts (`app.js:671/681`) | `memberDelinquency` | via accessor | via accessor | **yes** | **yes** | canonical ✓ |
| Member-lifecycle card (`member-lifecycle.js`) | `memberDelinquency` | via accessor | via accessor | **yes** | **yes** | canonical ✓ |
| **تقرير المديونية (Annual Debt)** | **`debtReportRows` → raw `paid_amount_ils`** | no | **yes (direct)** | **no** | **no** | **ROGUE ✗** |
| كشف الحساب (Statement) | `memberStatement` ledger (amounts) | no | ledger only | no | no | amounts only — no status label |

**Canonical flow (target):**
```
Approved Truth Matrix ──► Year Status Table (historical_subscription_truth)
                                     │  (Domain A: authoritative imported status)
                                     ▼
                    FIN.memberDelinquency().byYear[y].status   ◄── Domain B (ERP receipts) derivation where no truth
                                     │   ← THE single accessor
        ┌──────────────┬────────────┼──────────────┬───────────────┐
   Statement       Delinquent   Annual Debt      Dues            Dashboard / Card
   (status)         (status)    (status + raw amounts)  (status)   (status)
```

## 3. Canonical Truth Design
- **One accessor, one meaning:** `FIN.memberDelinquency().byYear[y].status` is the *only* year-status source. Every surface (including Annual Debt) renders it. Amount columns stay raw.
- **Domain A (imported/reviewed years):** status = the approved matrix, authoritative, **never re-derived**.
- **Domain B (ERP live):** where no approved status exists, status derives from ERP allocation (FD-002) — unchanged.
- **Where the approved truth lives — three options compared:**

| Option | What it is | Verdict |
|---|---|---|
| (a) Truth Matrix becomes a permanent table | Persist the review artifact itself as a data store | ✗ — it's a review UI with no persistence; would be a new, parallel source |
| (b) Move results to an "official Truth table" | Write approved statuses into a dedicated status table | ✓ in spirit |
| (c) Standalone Year-Status Table | A dedicated `(member_id, year, status)` table | ✓ — **but this table already exists**: `historical_subscription_truth` |

**Chosen: (b)＝(c) — reuse the existing `historical_subscription_truth` as the canonical Year-Status Table.** It already exists, is already the override authority, and is already consumed by `memberDelinquency`. Creating a new table would manufacture a *second* source — the exact anti-pattern we're removing. The approved matrix is adopted **into** it.

- **Go-forward rule (Domain A + B combination):** imported approved status is the **baseline**; a later ERP receipt may **upgrade** a year (غير مسدّد → جزئي → مسدّد) but derivation may never silently **downgrade** an approved status. (Design decision to ratify — see Risk 2.)

## 4. Migration Plan (adopt matrix → canonical table; no amount change)
1. Export the approved matrix (member × year → status) — the copied result from the Truth Review artifact.
2. **Upsert** into `historical_subscription_truth` `(member_id, year, status, source='owner_review_2026', approved_by, approved_at)` for every reviewed member-year; idempotent; fully audited.
3. No `member_subscriptions`, `receipts`, balances, or amounts touched.
4. Validation: row count == reviewed member-years; every status ∈ {paid, partial, unpaid}; diff report vs current table contents for owner sign-off.

## 5. Rollout Plan
- **Phase 0 — data:** adopt the approved matrix into the Year-Status Table (§4). Immediately makes the 5 canonical surfaces reflect the approved truth.
- **Phase 1 — the one rogue surface:** route the Annual Debt report's per-year **status** through `memberDelinquency` (canonical), keeping its **amount** columns as raw stored values. (Supersedes/absorbs #273: Annual Debt consumes canonical *status*, not raw paid.)
- **Phase 2 — verify:** every surface shows an identical status for every member×year; amounts unchanged.
- Feature-flag Phase 1 so it can be toggled; screen/print/PDF/Excel inherit from the one model.

## 6. Regression Plan (permanent guarantees)
1. **Amount invariance:** due / paid / balance / historical / final are byte-identical on every surface, before vs after (asserted per member).
2. **Status-parity invariant (new permanent test):** for every member × year, `Statement == Delinquent == Annual Debt == Dues == canonical byYear.status`. Fail-fast on any divergence.
3. **The 5 already-canonical surfaces** produce identical output (only their truth-table input changed, via the adopted matrix).
4. **Oracle:** the repaired surfaces match the **approved matrix** for all 147 members.
5. Full Node suite green (2 known baseline failures aside); `verifyConsistency` conservation unchanged (no engine/amount change).

## 7. Risk Analysis
| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Truth table incompleteness (a reviewed year missing / `unknown`) → that year falls back to derivation and may diverge | med | Migration validates 100% coverage of reviewed member-years; `unknown` explicitly disallowed post-adoption |
| 2 | **Go-forward:** a new ERP payment after review must upgrade status; if the table is treated as frozen, new payments won't reflect | **high** | Ratify the monotonic-upgrade rule (Domain B may raise, never lower, an approved status); design the accessor to combine truth-baseline + ERP-upgrade |
| 3 | Amount vs status visual mismatch (status = paid while raw paid column shows 0, for imports lumped on another year) | low | Accepted per owner ("amounts stay as-is"); optional footnote on the report; the *status* is the authority |
| 4 | Domain boundary not physically enforced (provenance is contract-based) | low | Optional later: explicit provenance marker / DB guard (separate, additive) |
| 5 | Engine/allocation/balances **untouched** → near-zero risk to financial totals | — | Amount invariance test (§6.1) proves it |

## 8. Recommendation
**Adopt the approved Truth Matrix into the existing `historical_subscription_truth` table (the canonical Year-Status Table), and route the single rogue surface (Annual Debt) through `FIN.memberDelinquency` so every screen renders one status. Leave all amounts and the allocation engine untouched.**

Why: it removes the one remaining independent status derivation with the **smallest surface area**, introduces **no second source of truth** (reuses the existing, already-wired table), requires **no change to FIN, the allocation engine, balances, or business rules**, and satisfies the constitutional goal — *one status, everywhere, from one source*. Ratify the monotonic go-forward rule (Risk 2) as part of approval.

---
**Design only — nothing implemented.** `fin.js` at baseline, engine/DB/reports/truth untouched, #273 held. On approval I'll produce the implementation plan (data adoption + the one report-status reroute + the status-parity test) and STOP again before any merge.
