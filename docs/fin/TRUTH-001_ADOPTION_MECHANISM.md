# TRUTH-001 — Adoption Mechanism (design only)

**The single question answered:** how the reviewed Truth Matrix becomes part of the system's *official data*, after which the Truth Matrix has **no runtime role and can be deleted** with zero effect. No code.

## Lifecycle in one line
**Review (ephemeral UI) → Adopt (one audited write) → Year-Status Table becomes the sole reference → Truth Matrix is discarded.**

```
[Truth Review Artifact]      [Adopt Truth]            [Official data]              [Runtime]
  owner sets status   ──►  validate + diff + ──►  historical_subscription_truth ──► memberDelinquency
  (no persistence)          confirm (one txn)      (+ immutable adoption snapshot)   → every surface
        │                                                                                  ▲
        └──────────────── discardable after adoption (nothing reads it) ──────────────────┘
```

## Phase 1 — Review (مرحلة المراجعة)
The Truth Review artifact is a **stateless authoring surface**: it loads the current figures, the owner sets each year's status (مسدّد / جزئي / غير مسدّد), the payment source, and notes. It **persists nothing** and **calls no API** (by design). Its only output is the **approved matrix payload** — one line per member × year: `{ member_code/member_id, year, status, source, note }` — captured via "نسخ النتائج". This payload is the hand-off; the artifact itself never touches the system.

## Phase 2 — Adoption (مرحلة الاعتماد) — "اعتماد الحقيقة"
Adoption is a **separate, admin-only, one-time operation inside the ERP** (never inside the read-only artifact). Pressing **«اعتماد الحقيقة»** runs a single controlled transaction:

1. **Input & validate** the approved-matrix payload: every row maps to a real `member_id`; `year ∈ reviewed years`; `status ∈ {paid, partial, unpaid}`; no duplicates; 100 % coverage of reviewed member-years.
2. **Show a diff** — current `historical_subscription_truth` vs the approved payload — and require explicit admin confirmation. (Nothing is written before confirm.)
3. **Write, in one transaction** (see next section).
4. **Record an immutable adoption snapshot** (batch id, actor, timestamp, full before/after) for audit and rollback.
5. On success: the Year-Status Table *is* the official reference; the artifact is now irrelevant.

Idempotent & versioned: re-adopting a corrected matrix creates a **new adoption version** and replaces the current statuses; every prior version is retained in the snapshot log (nothing is silently lost; rollback = re-apply a prior snapshot).

## What gets written to the database
**Exactly one table of record is touched — the Year-Status Table** (the existing `historical_subscription_truth`):

| Column | Value written |
|---|---|
| `member_id` | the member |
| `year` | 2025 / 2026 (reviewed years) |
| `status` | the approved `paid` / `partial` / `unpaid` |
| `source` | `owner_review_2026` (provenance = manual adoption) |
| `approved_by` | the adopting admin |
| `approved_at` | adoption timestamp |

Plus **one immutable adoption record** (a batch/snapshot row: version, actor, time, full payload) for audit.

**What is NOT written / NOT changed:** no amount — `due_amount_ils`, `paid_amount_ils`, `balance_ils`, `historical_balance_ils`, `finalBalance` — no `receipts`, no `member_subscriptions`, no balances, no allocation. **Amounts stay exactly as they are.** Only *status* is adopted.

## What becomes the final reference
The **Year-Status Table (`historical_subscription_truth`)** is the sole authoritative source of per-year status. It is read by the **one canonical accessor** `FIN.memberDelinquency().byYear[y].status`, which every surface consumes (after the one rogue surface, Annual Debt, is routed through it per the TRUTH-001 design). One table → one accessor → identical status everywhere.

**Go-forward (Domain B):** the adopted status is the authoritative **baseline** for the imported/reviewed years; a *new* ERP receipt after adoption may **upgrade** a year (غير → جزئي → مسدّد) via FD-002, but nothing re-derives or **downgrades** an adopted status. (This monotonic-upgrade rule is the one point to ratify — TRUTH-001 Risk 2. Implementation choice — read-time overlay vs. writing an `source='erp'` status row — is settled at the implementation-plan step.)

## Can the Truth Matrix be deleted afterward? — **Yes, completely.**
After adoption the artifact has **zero runtime role**, proven by construction:
- No surface, report, screen, or accessor reads from the artifact — they read `memberDelinquency` → the Year-Status Table.
- The artifact never persisted anything; its output already lives in the database.
- Deleting the artifact URL changes **no** displayed status, amount, or balance.

So the artifact is a **disposable authoring tool**: its role ends the instant adoption commits. This is exactly the intended outcome — *"then the Truth Matrix's role disappears entirely."*

## Recommendation
- **Adoption channel:** a dedicated **admin-only ERP operation** («اعتماد الحقيقة») — *not* the artifact (which stays read-only). One validated, diffed, confirmed, audited transaction.
- **Target of record:** the existing `historical_subscription_truth` (Year-Status Table) — reuse it; do **not** create a second table.
- **Written:** status rows (+ adoption snapshot). **Never** amounts.
- **Final reference:** `memberDelinquency().byYear.status`, table-fed, consumed by all surfaces.
- **Artifact:** safely deletable post-adoption.

Ratify: (1) this adoption mechanism, (2) the monotonic go-forward rule. Then the next step is the *implementation plan* for (a) the admin adoption operation, (b) routing Annual Debt's status through the canonical accessor, (c) the status-parity regression test — still no code until that plan is approved.

---
**Design only. Nothing implemented** — FIN / allocation / DB / reports / business rules untouched; #273 held.
