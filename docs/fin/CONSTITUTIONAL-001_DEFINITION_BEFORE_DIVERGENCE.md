# CONSTITUTIONAL-001 — Definition Before Divergence (read-only investigation)

**Read-only. No fix, no design, no architecture, no migration, no PR.** Every conclusion is proven from write-path provenance, constitutional documents, and live production data (read-only SELECTs) before it is used. The investigation stops at the proven First Constitutional Divergence.

---

## Stage 1 — Complete provenance of `member_subscriptions.paid_amount_ils`

Every occurrence was enumerated repo-wide (`grep` across JS/TS/SQL/MD). The **write** paths:

| # | Writer | Layer | Value written | Mechanism | Evidence |
|---|---|---|---|---|---|
| 1 | **Phase-15 spreadsheet import** | JS (service_role, Express API) | **non-zero, per-year** (the ONLY non-zero source) | `UPSERT … onConflict member_id,year` | `docs/phase15/devtools/migrationService.js:170-172`; runner `runMigration` |
| 2 | **BO-10 Apply Annual Dues** | JS → `SB.from('member_subscriptions').insert` | **0 only** — non-zero is rejected | `INSERT`; guard `Detect→Reject` | `operations.js:300-305` (`some(paid≠0) → E_CONTRACT`) |
| 3 | **BO-07 Create Member** | JS → `create_member_atomic` RPC | **0** (caller passes 0) | `INSERT` inside RPC | `crud.js:282`; RPC `…p0_v2_create_member_atomic.sql:52` |
| 4 | `create_member_atomic` (generic RPC body) | SQL | whatever caller passes; `COALESCE(paid,0)` only defaults NULL→0 | `INSERT` | `…p0_v2…sql:48-57` — *potential* non-zero, but the sole certified caller (#3) passes 0 |

**Update paths: NONE.** No JS `update`/`upsert` of `paid_amount_ils` outside the import; no SQL `UPDATE … member_subscriptions` setting paid anywhere in migrations (grep: zero). The only triggers on the table are **protective, and write nothing to paid**: `trg_closed_period_member_subscriptions` (BEFORE UPDATE/DELETE — raises `closed_fiscal_period`, `…ig004…sql:61-63`) and `trg_set_updated` (stamps `updated_at` only, `…ownership_stamps.sql:44`).

**Delete paths:** none targeted; the closed-period guard blocks deletes in locked years. **Import paths:** exactly one (#1). **Edge Functions:** the deployed set is `super-function` (FX rates — the only one the client calls, `data.js:16`), `rapid-responder`, `rapid-handler`, `admin-users`, `login-gate`, `change-password` — auth/rates/admin; **none writes `member_subscriptions`.**

- **First writer:** the Phase-15 import (non-zero) / BO-07/BO-10 (zero) at row genesis.
- **Last writer:** the same insert/upsert — **`paid_amount_ils` is write-once; nothing updates it after creation.**

### Provenance discrepancy (proven, must be flagged)
The repo import **caps** each year at its due (`paid = Math.min(pool, due)`, `migrationService.js:65`; overflow → `credit_balance_ils`) and generates **no** rows for the 3 exception members (`:103`). That code **cannot** produce `paid > due`. **Production contradicts it:**

```
member_subscriptions: 302 rows · 42 non-zero paid · 24 rows paid_amount_ils > due_amount_ils
0 rows violate balance_ils = due − paid (V3 holds) · 0 negative paid · max paid 1525
```

So the migration that actually populated production used **verbatim per-year assignment** — matching the import file's own **header** ("*Direct per-year assignment*", `migrationService.js:7`) — **not** the pooled/capped body. The 24 `paid > due` rows are real and their exact generator is **not reproducible from the current repo code**. This is a genuine provenance gap, not an assumption.

---

## Stage 2 — Semantic definition (proven, not assumed)

**`paid_amount_ils` is a verbatim Imported Historical Financial Snapshot** — the migration-time, per-year record of pre-activation subscription payment, written once, never an ERP event.

Proof, from the constitution + provenance + data:
- **Migration origin, spreadsheet-authoritative, allocation-excluded:** "*spreadsheet is authoritative … NO receipt replay. NO allocation engine. Direct per-year assignment. The allocation engine governs only LIVE payments entered after activation.*" (`migrationService.js:4-8`).
- **Never written by an ERP event:** the only live subscription-write operation (BO-10) **rejects** any non-zero paid (`operations.js:300`); live member payments are **food receipts**, a different table. So no post-activation event ever writes this field.
- **Sole authoritative stored origin, with exactly one sanctioned derivative:** "*the authoritative origin of 'annual subscription paid' is member_subscriptions.paid_amount_ils … balance_ils is explicitly derived (= due − paid).*" (`…p0_v3…sql`; constraints `ms_no_independent_paid_authority`, `ms_balance_is_derived`). Production confirms the derivation holds on all 302 rows.
- **Per-year, and legitimately able to exceed due:** 24 production rows have `paid > due` (a per-year credit, `balance_ils < 0`) — consistent only with a **verbatim per-year snapshot**, not a live/pooled payment.

**Classification (choosing now):** it is a **Historical Snapshot** *and* **Imported Financial Truth** (the two are compatible: an imported figure that is financially authoritative for its year). It is **not** a live *Financial Payment*, **not** an *ERP Event*, **not** a *Ledger Movement* (it is a stored per-year field, not a transaction row), **not** a *Carry Forward*, **not** a *Balance Adjustment*.

---

## Stage 3 — Responsibilities

**It HAS these responsibilities:**
- Be the single authoritative **stored per-year figure** for "annual subscription paid" (V3 · Law 3).
- **Derive** exactly one value: `balance_ils = due_amount_ils − paid_amount_ils`, per row (V3).

**It explicitly does NOT have these:**

| Capability | Allowed? | Justification |
|---|---|---|
| **Generate payments?** | **No** | It is a stored snapshot, not a movement; live payments are receipts. Nothing downstream is authorised to mint a payment from it. |
| **Allocate?** | **No** | Allocation was performed **once, at import**, to *produce* the field. Post-import it is a settled figure; the *field* does not allocate. |
| **Settle future years?** | **No** | Its authority is **its own year**. The import sends any overflow to `credit_balance_ils`, explicitly **not** to settle other subscription years through this field. |
| **Participate in FD-002?** | **No** | The constitution is explicit: "*the allocation engine governs only LIVE payments entered after activation.*" The imported snapshot is **out of FD-002's domain**. |
| **Behave like receipts?** | **No** | Receipts are live ERP events that feed FD-002; `paid_amount_ils` is frozen, migration-origin, and never re-processed as live money. |

---

## Stage 4 — The First Constitutional Divergence

**Definition to test against (proven):** `paid_amount_ils` is a frozen per-year imported snapshot whose *only* sanctioned use is (a) being the year's paid figure and (b) deriving `balance = due − paid`; it must **not** be governed by the allocation engine nor used to settle another year.

Searching for the **first line that treats it as something else** — reads happen in `memberStatement` (`fin.js:60`), `memberAllocation` (`fin.js:196`), and a sum in `fin.js:248`. Two are consistent with the definition; one violates it:

- **`memberStatement` (`fin.js:60-62 → 114-115`) — NOT the divergence.** It records `paid` as the year's credit and computes `finalBalance = openingDebt + Σdue − Σpaid`. Because `Σdue − Σpaid = Σ(due − paid) = Σ balance_ils`, this is the **faithful aggregation of the V3-sanctioned per-row balances** (including the per-year credit of a `paid>due` row). It never invokes the allocation engine and never marks another year settled. It aggregates the sanctioned derivative — it does not *reinterpret* the field. *(Whether a per-year credit should offset another year in the member total is a V3-level policy question, not a violation of this field's definition.)*

- **`memberAllocation` (`fin.js:197`) — THIS is the First Constitutional Divergence.**
  ```
  197:  pool = r2(pool + Math.max(0, paid − due));   // imported per-year surplus → FD-002 pool
  220:  pool = r2(pool + liveFood + donSettled + debtWO − creditWO − refunded);   // mixed with LIVE money
  226:  const res = eng.computeAllocation({ … amount: pool, obligations });        // FD-002 engine walks it
  227-230: … perYear[a.year].allocated += a.amount_allocated                        // settles OTHER years
  ```
  Line **197** lifts the imported snapshot's per-year excess (`paid − due`) **out of its year** and into the shared allocation `pool`; line **220** makes it **indistinguishable from live receipts**; line **226** submits it to the FD-002 engine (`MODEL2Allocation`); lines **227-230** spend it **oldest-first to settle other years**. This is the *exact* act the definition forbids — the allocation engine governing the imported snapshot, and the snapshot settling a year that is not its own.

**Therefore the First Constitutional Divergence is `public/js/fin.js:197`** (enacted through `:220 → :226 → :229`). It is not where a bug "appears to the user" (that is the Annual Debt report, far downstream) — it is the first line where the system violates the proven definition of `paid_amount_ils`.

### Why the divergence bites in production (proven, not hypothetical)
The pool term at `:197` is non-zero **only** for rows where `paid > due` — and those exist: **19 rows carry a 2025 surplus (₪8,587 total); all 19 of those members have an adopted 2026 truth, and 12 of them say 2026 = *unpaid*.** For those 12, line 197 feeds the 2025 imported surplus into FD-002, which settles 2026 — directly contradicting the owner-adopted truth. The divergence is live, on real members.

---

## Stage 5 — Evidence chain (no gaps)

```
DEFINITION
  paid_amount_ils = verbatim Imported Historical Financial Snapshot (per-year, write-once,
  migration-origin); sole authoritative stored "paid"; only sanctioned derivative balance = due − paid.
  [migrationService.js:4-8 · p0_v3 constraints · operations.js:300 · prod: 302 rows, V3 holds]
        ↓
RESPONSIBILITIES
  IS: the year's stored paid figure; derive balance = due − paid.
  IS NOT: generate payments · allocate · settle future years · participate in FD-002 · act like receipts.
        ↓
FORBIDDEN INTERPRETATIONS
  Being lifted out of its year, mixed with live money, and allocated by FD-002 to settle another year.
        ↓
FIRST VIOLATING LINE
  public/js/fin.js:197 — pool += Math.max(0, paid − due)     (imported surplus → FD-002 pool)
  enacted at :220 (mixed with live receipts) → :226 (MODEL2Allocation) → :227-230 (settles other years)
  [NOT memberStatement:115, which faithfully aggregates the V3-sanctioned per-row balance]
        ↓
PROPAGATION
  memberAllocation.perYear[y].settled  →  memberDelinquency.byYear  →  (and, via V3 credit,
  memberStatement.finalBalance)  →  every financial surface (single source, FD-006).
        ↓
AFFECTED REPORTS
  Member Statement · Delinquent · Dues · Dashboard · Annual Debt — all inherit the same
  post-197 numbers. Annual Debt is merely the surface where it was first noticed.
```

### The proven First Constitutional Divergence
**`public/js/fin.js:197`** — the line that admits the imported per-year snapshot's surplus into the FD-002 allocation pool. It is the first place the system treats `paid_amount_ils` as an allocatable, cross-year, receipt-like payment, in direct violation of its proven definition ("*direct per-year assignment … the allocation engine governs only LIVE payments*").

**Two honest caveats carried forward (not fixes):**
1. The **enabling precondition** is upstream: production holds 24 `paid > due` rows whose exact generator is **not reproducible from the current repo import code** (which caps). Without such rows, line 197 contributes 0.
2. `memberStatement`'s aggregate netting is **V3-faithful**, so the debt report's *balance* reflecting a per-year credit is a **V3 policy** matter, distinct from the `:197` allocation-engine violation.

---
**Investigation only — read-only. No code, no design, no architecture, no migration, no PR. `fin.js` at baseline. STOP at the identified First Constitutional Divergence (`fin.js:197`).**
