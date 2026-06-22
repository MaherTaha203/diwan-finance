# Phase 0 — Authoritative Member Migration (Excel) — Verification Report

**Date:** 2026-06-21
**Status:** Applied and verified.
**Authoritative sources:** `DIWAN_SYSTEM_MASTER_SPECIFICATION.md` + approved Excel migration file.
**Rule proven:** `opening + dues − paid = debt` for all migrated members.

> Production balances were **not** treated as authoritative. The approved Excel is the
> single source for opening balances, subscription years, payments, and historical debt.

---

## Scope applied
- Excel migration (149 members) → authoritative structured fields.
- Opening balance corrections → `members.historical_balance_ils`.
- Subscription-year corrections → per-year `member_subscriptions` + `active_from_year`.
- Credit-balance seeding → `members.credit_balance_ils`.
- Exception handling (#120, #134, #149) → `members.is_migration_exception`.

## Method (deterministic, idempotent)
1. **Match:** Excel rows ↔ members by normalized name (collapse whitespace, strip quotes).
   Result: **149/149 unique 1:1**, 0 unmatched, 0 duplicates.
2. **Backup (retained):** `members_backup_phase0_20260621` (149),
   `member_subscriptions_backup_phase0_20260621` (292).
3. **Members update:** `historical_balance_ils = opening`, `historical_payments_ils = paid (pre-2025)`,
   `credit_balance_ils = max(0, −debt)`, `is_migration_exception`, and `active_from_year`
   set so 2025/2026 dues match the Excel gating.
4. **Per-year subscriptions upsert (2025/2026):** `due` by gating (400→200+200, 200→0+200, 0→0+0),
   `paid` = Excel 2025/2026 payments.
5. **Verify** in-DB against the Excel and drop the staging table.

## Field mapping
| Excel column | Target |
|---|---|
| الذمة قبل 01.01.2025 (opening) | `members.historical_balance_ils` |
| مجموع المدفوع قبل 01.01.2025 | `members.historical_payments_ils` |
| مدفوعات 2025 / 2026 | `member_subscriptions.paid_amount_ils` (year 2025 / 2026) |
| dues (derived 0/200/400) | `member_subscriptions.due_amount_ils` + `active_from_year` |
| credit = max(0, −total_debt) | `members.credit_balance_ils` |
| #120 / #134 / #149 | `members.is_migration_exception = true` |

`debt` is **derived** (`historical_balance + Σ dues − historical_payments − Σ paid`), never stored.

---

## Verification results (post-migration, in-DB)

| Metric | Value |
|---|---|
| Total members | **149** |
| Total opening balances | **288,000** |
| Total dues (2025+2026) | **58,800** (146×400 + 2×200 + 1×0) |
| Total paid | **120,021** (historical 102,159 + 2025/2026 17,862) |
| Total debt (derived) | **226,779** |
| Total debt (Excel) | **226,779** |
| Total credit balances | **208** |
| Exception members | **3** |

**Identity:** 288,000 + 58,800 − 120,021 = **226,779** ✓

**Per-member mismatches (vs Excel):** opening 0 · dues 0 · paid 0 · debt 0 · credit 0 · exception 0.

### Credit-balance members
| # | Name | opening | dues | paid | debt | credit |
|---|---|--:|--:|--:|--:|--:|
| 32 | جمال اسماعيل يونس | 2200 | 400 | 2604 | −4 | 4 |
| 83 | عماد يونس طه | 2200 | 400 | 2604 | −4 | 4 |
| 149 | حسام محمد كمال طه | 0 | 0 | 200 | −200 | 200 |

### Exception members (verbatim; engine bypass)
| # | Name | opening | dues | paid | debt | credit | active_from_year |
|---|---|--:|--:|--:|--:|--:|--:|
| 120 | محمود مصطفى عبد الله طه | 1200 | 400 | 1600 | 0 | 0 | 2019 |
| 134 | نمر عطا نمر طه | 0 | 200 | 0 | 200 | 0 | 2026 |
| 149 | حسام محمد كمال طه | 0 | 0 | 200 | −200 | 200 | 2027 |

### Worked proofs (sample)
| # | opening | dues | paid | debt = opening+dues−paid |
|---|--:|--:|--:|--:|
| 8 | 2200 | 400 | 1600 | 1000 |
| 25 | 2200 | 400 | 2010 | 590 |
| 103 | 1400 | 400 | 1800 | 0 |
| 147 | 1600 | 400 | 200 | 1800 |

---

## Live-app impact (legacy path)
- `active_from_year` changed for **2** members only (#134 2025→2026, #149 2025→2027 — both exceptions).
- Legacy `opening_balance` and `prepaid_subscription_ils`: **unchanged** (0 rows).
- The legacy read-path is otherwise untouched; the structured authoritative store is now the
  baseline for the Phase 1 engine.

## Rollback
Restore `members` and `member_subscriptions` from the retained `*_backup_phase0_20260621` tables.

**Phase 1 is NOT started.** Item 9 replay must be validated against this post-migration baseline.
