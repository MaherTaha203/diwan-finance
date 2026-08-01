# DEBT-REPORT-RECON-001 — Source-Boundary Allocation Design (for approval)

**Status: DESIGN ONLY. Nothing implemented.** No change to FIN, `allocation-engine`, DB/schema, migration data, the 12 records, truth overrides, or PR #273 until this design is approved. This document defines *what* to build and *why it is constitutionally safe*; it does not build it.

Governing evidence: `DEBT-RECON-001_PROVENANCE.md`, `migrationService.js` (header: *"the allocation engine governs only LIVE payments entered after activation"*), `p0_v3` single-source migration, and `FIN.memberAllocation` (`public/js/fin.js:189-241`).

---

## 1. Source Boundary Architecture

There are **three** distinct sources of money in a member's annual-settlement picture. Today they are conflated inside one allocation pool; the design separates them.

| Source | What it is | Where it lives | May enter the FD-002 cascade? |
|---|---|---|---|
| **① Live certified payments** | Receipts captured **after activation** through the certified flow: food `subscription_payment`, member food donations (Item-9), write-offs, refunds, q4 historical-debt collections | `receipts`, `member_write_offs`, `refunds` | **YES** — this is the only money the engine allocates |
| **② Migration seed (settled state)** | Pre-ERP figures imported once: `member_subscriptions.paid_amount_ils` | `member_subscriptions.paid_amount_ils` | **NO** — it *states* a year's already-settled amount; it is not spendable money that can settle other years |
| **③ Historical / pre-2025 debt** | The carried opening balance and its pre-2025 payments | `members.historical_balance_ils` / `historical_payments_ils` (+ q4 collections) | It is an **obligation** (a target the cascade can pay **last**), never a payment |

**Rule (the boundary):**
- **① Live** forms the cascade pool and is distributed across obligations in the frozen FD-002 order — **annual years oldest-first, then historical last** (owner rule: pay 400 → 2025+2026 paid; historical never consumes annual money).
- **② Migration seed** settles **only its own year, capped at that year's due**. Any excess (`paid − due`) is **member credit** — it does **not** cascade into future annual years and does **not** reduce historical automatically. (This is exactly what the certified migration `buildMigratedSubscriptions` already does: cap at due, overflow → `credit_balance_ils`.)
- **③ Historical** is a lower-priority obligation for ① only.

### The precise defect this removes
`FIN.memberAllocation` currently does (`fin.js:196-197`):
```
pool += Math.max(0, paid - due)     // ② migration overpayment folded into the ① live pool
```
That single line lets migration seed (②) behave as spendable live money (①) and cascade into 2026 — the boundary violation. **The design removes that term from the cascade pool** and books the excess as credit instead. No other allocation math changes.

---

## 2. Canonical Allocation Contract

**One producer, four consumers. No report computes annual settlement itself.**

```
                 ┌──────────────────────────────────────────────┐
                 │  FIN.memberAllocation(memberId)  (SOLE SOURCE) │
                 │  → perYear{due, remaining, settled}            │
                 │  wrapped by FIN.memberDelinquency → byYear{…}  │
                 └──────────────────────────────────────────────┘
                        │            │            │            │
                Member Statement  Delinquent   Annual Debt   Dues Workspace
```

**Contract of `memberAllocation` (the only place the boundary lives):**
1. `remaining_seed[y] = max(0, due[y] − paid_amount_ils[y])` — migration seed settles its own year, capped.
2. `seedCredit = Σ max(0, paid_amount_ils[y] − due[y])` — migration overpayment → **credit** (not cascaded).
3. `livePool = Σ live food receipts + Item-9 donation settlements + debt write-offs − credit write-offs − refunds` — **① only**.
4. Obligations = each year's `remaining_seed` (kind `due`) + `histSeed` (kind `historical`).
5. `livePool` is distributed by `MODEL2Allocation` in FD-002 order (annual oldest-first → historical last).
6. `remaining[y] = remaining_seed[y] − liveAllocated[y]`; `settled[y] = due[y] ≤ 0 || remaining[y] ≤ 0`.
7. `creditRemaining = seedCredit + livePool leftover`.
8. `outstanding = FIN.memberStatement().finalBalance` (unchanged — the authoritative total).

**Consumer contract (unchanged in spirit, now consistent by construction):**
- **Member Statement** — reads `finalBalance` (authoritative total; already counts the full `paid_amount_ils` as credit). *No change.*
- **Delinquent** — reads `byYear.settled/status` (with the owner-approved truth override as the displayed authority). *No change to code; its derived layer now agrees with truth.*
- **Annual Debt** — after #273, reads `byYear.due`/`byYear.paid` (= `due − remaining`). *No independent field.*
- **Dues Workspace** — reads `byYear` today. *No change.*

**Invariant (already checked by `verifyConsistency`, must continue to hold):**
`Σ remaining[y] + histRemaining − creditRemaining = finalBalance` — conserved, because the excess merely moves from "allocated across obligations" to "creditRemaining" without changing the total.

**No report-specific override is introduced.** The truth table remains the display authority for status; once the derivation stops cascading migration seed, derived and truth **agree**, so the override stops masking a conflict rather than creating one.

---

## 3. Migration Compatibility (the 12 records stay untouched)

- **No row is modified.** `paid_amount_ils = 730` on a 2025 row stays `730`; `balance_ils = −530` stays. The design changes only how `memberAllocation` *interprets* an existing row (`paid > due` ⇒ own-year settled + credit, not cascade).
- **`finalBalance` is preserved for every member** (it is computed from the ledger, which counts the full `paid_amount_ils`; the waterfall only redistributes it). So treasury, fund ledgers, dashboards, and the Statement totals are **identical**.
- **The 12 become self-consistent:** derived 2026 → unpaid, matching the owner truth (override no longer conflicts). Their 2025 stays settled; the excess shows as member credit.
- **The 10 live-receipt members are unaffected by the boundary change** (their money is ① live; it still cascades). #273 then shows them correctly.
- **The 112 "A" members are unaffected** (no migration overpayment, no divergence).
- **Optional, separate, owner-gated:** normalize the 12 rows to the certified form (cap 2025 `paid` at due, move excess to `credit_balance_ils`). *Not required* once the engine honors the boundary, and *not part of this design's code path.*

---

## 4. Regression Matrix (expected `byYear` under the design)

Dues assumed 200/year; “live” = certified food `subscription_payment` receipt; “seed” = `paid_amount_ils`.

| # | Case | Data | 2025 | 2026 | Historical | Notes |
|---|---|---|---|---|---|---|
| 1 | New member, no payment | due 200/200 | unpaid | unpaid | — | baseline |
| 2 | New member, live 400 | live 400 | **paid** | **paid** | — | owner rule: 400 → both years |
| 3 | New member, live 200 | live 200 | **paid** | unpaid | — | oldest-first |
| 4 | Old member + historical, live 400 | hist 300, live 400 | **paid** | **paid** | **300 (unchanged)** | historical never consumes annual |
| 5 | Old member + historical, live 200 | hist 300, live 200 | paid | unpaid | 300 | oldest annual first |
| 6 | Old member + historical, live 500 | hist 300, live 500 | paid | paid | 200 | live overflow *may* pay historical (①, last) |
| 7 | **Migration seed = due** | seed 200 (2025) | paid | unpaid | — | exact seed, no excess |
| 8 | **Migration overpayment** (the 12) | seed 730 (2025), 2026 seed 0 | **paid** | **unpaid** | unchanged | excess 530 → **credit**, no cascade; matches truth |
| 9 | Migration partial | seed 120 (2025) | partial (rem 80) | unpaid | — | seed caps own year |
| 10 | Migration seed both years | seed 200/200 | paid | paid | — | each year seeded |
| 11 | Seed 2025 + live 2026 | seed 200 (2025), live 200 | paid | **paid** | — | live settles 2026 |
| 12 | Migration overpay + later live | seed 730 (2025), live 200 | paid | **paid** (via live) | unchanged | live pays 2026; seed excess still credit |
| 13 | Multi-year live (spanning) | live 300, dues 2025+2026 | paid | partial (100) | — | 200→2025, 100→2026 |
| 14 | Live overpay beyond all dues | live 900, dues 400, hist 300 | paid | paid | paid; 200 credit | ① cascades fully, remainder credit |

**Cross-surface assertion for every row:** `Member Statement finalBalance`, `Delinquent settled`, `Annual Debt selPaid` (post-#273), and `Dues Workspace` all reconcile to the same `byYear`. (Rows 2-6, 13-14 = the current #273 regression suite; rows 7-12 = the new migration-boundary cases to add.)

---

## 5. Impact Analysis

### What changes
- **`FIN.memberAllocation` only:** migration overpayment (`paid − due`) is booked as `creditRemaining` instead of entering the cascade pool. One term relocated.
- **`byYear.paid`/`settled` for members with migration overpayment** (the 12 today): future annual years no longer inherit the seed excess → 2026 derived becomes **unpaid**, matching the owner truth.
- **Annual Debt (once #273 lands)** shows those years as unpaid — consistent with Delinquent, Statement, Dues.
- **New regression tests** (matrix rows 7-12) added.

### What does NOT change
- **`memberStatement().finalBalance`** and every total derived from it — treasury positions, fund ledgers, dashboard balances, Statement figures. Conserved by construction.
- **The FD-002 order and the owner rule** — annual oldest-first, historical last, for live payments. Untouched (the engine still runs the same order on ① live).
- **Live-receipt behavior** (the 10 members; rows 2-6, 11-14) — identical.
- **The 112 already-correct members** — identical.
- **Truth overrides, the 12 records, migration data, schema** — untouched.
- **No report gains its own settlement logic** — the boundary lives in the single shared accessor.

### Why no accounting or constitutional rule is affected
- **Single Source of Truth (Law 3 / p0_v3):** `paid_amount_ils` remains the one authoritative seed; the design stops a *second* interpretation (seed-as-live-cascade) rather than adding one.
- **FD-002 (frozen allocation order):** unchanged; it simply operates on its constitutionally-correct input (① live) per the migration authority "*engine governs live payments only.*"
- **Value conservation (Law 1 / FD-006):** `Σ remaining + histRemaining − creditRemaining = finalBalance` still holds; the excess moves from obligation-allocated to credit, not lost.
- **Owner semantic decision:** migration seed no longer manufactures payment of future annual years — enforced structurally, not per-report.

---

## Decision requested
Approve this design, then choose the sequence:
- **(A)** implement the `memberAllocation` boundary change (+ regression rows 7-12), then merge #273; or
- **(B)** a preliminary step first (e.g., optional data normalization of the 12 rows, or staging the engine change behind a verification pass) before #273.

Recommendation: **(A)** — the engine boundary fix is the minimal change that yields one canonical `byYear` for all four surfaces and makes #273 correct for every member, with no data migration required. Implementation begins only on your approval.
