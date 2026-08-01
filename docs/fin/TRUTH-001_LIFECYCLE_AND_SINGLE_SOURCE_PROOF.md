# TRUTH-001 — Full Truth Lifecycle & Single-Source Proof (design only)

**Design only — no code.** This document defines the complete lifecycle
**Truth Review → Truth Adoption → Canonical Persistence → Runtime Consumption**
and — the gate before any implementation — **proves** that after adoption the system holds **exactly one source of per-year status**, with the review tool being **no runtime dependency at all**.

```
 STAGE 1                STAGE 2                 STAGE 3                     STAGE 4
 Truth Review    ─►     Truth Adoption   ─►     Canonical Persistence  ─►  Runtime Consumption
 (authoring UI,         (one audited            (Year-Status Table =        (ONE accessor →
  ephemeral)             transaction)            record of truth)            every surface)
      │                                                                          ▲
      └───────────── severable after Stage 2: nothing downstream reads it ───────┘
```

---

## Stage 1 — Truth Review (authoring, ephemeral)
- **What:** the Truth Review artifact loads current figures; the owner sets each year's status (مسدّد / جزئي / غير مسدّد), source, and notes.
- **Persistence:** none. **API calls:** none. It is a pure authoring surface.
- **Output:** the *approved-matrix payload* — one line per member × year: `{ member_id, year, status, source, note }`, captured via "نسخ النتائج".
- **System side-effects:** **zero.** The artifact touches no table and no code path.

## Stage 2 — Truth Adoption (one audited transaction — «اعتماد الحقيقة»)
- **Where:** an **admin-only ERP operation**, never the read-only artifact.
- **On press:** (1) validate the payload (real `member_id`; `year` ∈ reviewed set; `status ∈ {paid,partial,unpaid}`; 100 % coverage; no duplicates); (2) show a **diff** vs the current table and require confirmation; (3) write in **one transaction**; (4) record an **immutable adoption snapshot** (version, actor, timestamp, full before/after).
- **Idempotent & versioned:** re-adopting a corrected matrix creates a new version and replaces current statuses; prior versions retained for audit/rollback.
- **This is the *only* moment the review results enter the system.** After it commits, Stage 1 is finished forever for that adoption.

## Stage 3 — Canonical Persistence (the record of truth)
- **Target of record:** the **existing** `historical_subscription_truth` table — reused as the canonical **Year-Status Table** (no second table is created).
- **Written per member × reviewed year:** `member_id`, `year`, `status`, `source='owner_review_2026'`, `approved_by`, `approved_at`; plus one adoption-snapshot row.
- **NOT written / NOT changed:** every amount — `due_amount_ils`, `paid_amount_ils`, `balance_ils`, `historical_balance_ils`, `finalBalance` — and `receipts`, `member_subscriptions`, balances, allocation. **Amounts are untouched; only status is adopted.**
- After this stage, the *record of truth is a database table*, independent of any tool.

## Stage 4 — Runtime Consumption (one accessor → every surface)
- **One canonical accessor:** `FIN.memberDelinquency(id).byYear[y].status`, which reads the Year-Status Table (Domain A authoritative) with ERP derivation only where no adopted status exists (Domain B).
- **Every status surface reads that accessor** — including the Annual Debt report once its lone raw-`paid_amount_ils` derivation is routed through the accessor (the single change TRUTH-001 identified). Amount columns keep their raw values.
- Result: identical status for every member × year on Statement, Delinquent, Annual Debt, Dues, dashboard, member card, print/PDF/Excel.

---

## SINGLE-SOURCE PROOF (the gate)
**Claim:** after adoption, per-year status has exactly one source — the Year-Status Table via `memberDelinquency` — and the review artifact is not a runtime dependency.

**P1 · Enumerate every runtime status reader** (from the read-only source audit):

| Surface | Status source after TRUTH-001 | Reads the artifact? |
|---|---|:--:|
| Delinquent list | `memberDelinquency.byYear.status` | no |
| Dues Workspace | `memberDelinquency.byYear.settled` | no |
| Dashboard debts | `memberDelinquency` | no |
| Member-lifecycle card | `memberDelinquency` | no |
| Annual Debt (after reroute) | `memberDelinquency.byYear.status` | no |
| Member Statement | amounts only (no status label) | no |

**P2 · One accessor, one table.** All readers funnel through `memberDelinquency`, which derives status from exactly one table (`historical_subscription_truth`) plus live ERP receipts. There is **no other status producer** — the one prior independent derivation (Annual Debt reading raw `paid_amount_ils`) is removed. ⇒ single producer.

**P3 · The artifact is severable.** It has (a) no persistence, (b) no API, (c) no `import`/reference from any runtime file, (d) no row that points to it. Its results already live in the table after Stage 2. Therefore **deleting the artifact changes no status, amount, or balance anywhere** — formally, it is a *leaf* in the data-flow graph that feeds the table exactly once (Stage 2) and is then disconnected.

**P4 · Acyclic, terminating flow.** `artifact → (adopt, once) → Year-Status Table → memberDelinquency → surfaces`. No surface feeds back into the artifact; no runtime path traverses it. The graph has the artifact as a *source with out-degree that becomes 0 after adoption*.

**∴** Post-adoption the system returns to **one source of truth** for status (the table), consumed through **one accessor**, with the review tool provably **removable**. This satisfies the constitutional goal and the gate you set.

---

## What stays true throughout
- **Amounts never change** — due / paid / balance / historical / final are byte-identical before and after (the regression oracle).
- **No engine / FIN / allocation / business-rule change** — status is *adopted*, not *re-derived*.
- **Go-forward (to ratify):** the adopted status is the authoritative baseline; a later ERP receipt may **upgrade** a year (غير → جزئي → مسدّد), never silently downgrade an adopted status (monotonic). Implementation form (read-time overlay vs. an `source='erp'` status row) is fixed at the implementation-plan step.

## Ratification requested (before any implementation)
1. This **lifecycle** (Review → Adoption → Canonical Persistence → Runtime Consumption).
2. The **single-source proof** as the gate (artifact severable; one table; one accessor).
3. The **monotonic go-forward** rule.

On ratification, the next deliverable is the *implementation plan* (admin adoption operation · Annual-Debt status reroute · status-parity regression test) — still no code until that plan is approved.

---
**Design only. Nothing implemented** — FIN / allocation / DB / reports / business rules untouched; #273 held; `fin.js` at baseline.
