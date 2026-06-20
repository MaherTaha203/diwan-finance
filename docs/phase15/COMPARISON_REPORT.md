# Phase 15 — Final Comparison Report (Current DB vs New Structured)

> **Model (Final Implementation Lock):** Historical Balance is **derived** from Active Year (`(2024 − ActiveYear + 1) × 200`) — verified to equal the spreadsheet's Historical Balance column for all 146 non-exception members (0 mismatches), so every figure below is unchanged under this model. Credit is stored explicitly; exceptions are verbatim.

**Current DB Balance** = `opening_balance + dues(by DB active year) − prepaid_subscription_ils` (the live legacy formula).
**New Structured Balance** = `(historical_balance − historical_payments) + (total_due − subscription_payments)` (= spreadsheet col9, authoritative).
All amounts in ₪.

## Summary

- Members with a **net balance change**: **4** (all Historical balance corrections)
- Members where a **credit is created** (net balance unchanged): **15**
- Members whose **Active Year value is corrected** with **no balance impact**: **145**
- **Exceptions** (verbatim, approved, no review): **3**

> Note: an earlier draft cited ~30 changes; that used the spreadsheet's payments as the reference instead of the DB's own `prepaid_subscription_ils`. Using the true legacy formula, the real net-change count is 4.

---

## 1. Historical balance correction — 4 members (NET CHANGE)

The new spreadsheet revises these members' net historical figure. Active Year, subscriptions, and credit are unchanged for them.

| Member Code | Member Name | Current DB Balance | New Structured Balance | Difference | Reason |
|---|---|---:|---:|---:|---|
| TAHA-0040 | حسين درويش حسين طه | 2600 | 1400 | -1200 | Historical balance corrected (2200 → 1000) |
| TAHA-0038 | حسن عودة حسن طه | 2400 | 2000 | -400 | Historical balance corrected (2000 → 1600) |
| TAHA-0042 | حسين جلال درويش طه | 2400 | 2200 | -200 | Historical balance corrected (2000 → 1800) |
| TAHA-0074 | عبد الجابر فرح طه | 1010 | 810 | -200 | Historical balance corrected (610 → 410) |

## 2. Active Year correction — 0 members with balance change

145 members have their stored Active Year corrected from the DB value to the approved spreadsheet value (the DB held 2025 for almost everyone; true membership-start years range 2014–2026). **None of these change the member's balance**, because the dues owed for 2025–2026 are the same whether the active year is 2014 or 2025. Full per-member Active Year list is in the workbook → Migration_Plan.

## 3. Spreadsheet correction — 0 members

No additional general value revisions beyond the historical corrections in section 1.

## 4. Subscription correction — 0 members (net)

Subscription payment differences are fully captured as credit (section 5); none produce a net balance change.

## 5. Credit creation — 15 members (NET BALANCE UNCHANGED)

These members overpaid their 2025–2026 subscriptions. The legacy `opening_balance` already absorbed the overpayment, so the **net balance does not change** — the new model simply tracks the credit explicitly in `credit_balance_ils`.

| Member Code | Member Name | Current DB Balance | New Structured Balance | Difference | Credit created | Reason |
|---|---|---:|---:|---:|---:|---|
| TAHA-0052 | زهير عبد العزيز طه | 0 | 0 | +0 | 1400 | Overpayment now tracked as credit |
| TAHA-0025 | باسم فخري عيسى طه | 590 | 590 | +0 | 710 | Overpayment now tracked as credit |
| TAHA-0113 | محمد فايز عبد الرحمن طه | 0 | 0 | +0 | 600 | Overpayment now tracked as credit |
| TAHA-0089 | فايز عبد الرحمن فايز طه | 1173 | 1173 | +0 | 427 | Overpayment now tracked as credit |
| TAHA-0039 | حسني احمد حسني طه | 1270 | 1270 | +0 | 330 | Overpayment now tracked as credit |
| TAHA-0048 | رائد احمد حسني طه | 1270 | 1270 | +0 | 330 | Overpayment now tracked as credit |
| TAHA-0070 | طه احمد حسني طه | 1270 | 1270 | +0 | 330 | Overpayment now tracked as credit |
| TAHA-0104 | محمد احمد حسني طه | 1270 | 1270 | +0 | 330 | Overpayment now tracked as credit |
| TAHA-0045 | راتب عبد الهادي درويش طه | 940 | 940 | +0 | 260 | Overpayment now tracked as credit |
| TAHA-0111 | محمد عبد الخالق | 750 | 750 | +0 | 250 | Overpayment now tracked as credit |
| TAHA-0026 | باسم مصطفى عبد الله طه | 0 | 0 | +0 | 200 | Overpayment now tracked as credit |
| TAHA-0064 | صالح فواز يونس طه | 550 | 550 | +0 | 200 | Overpayment now tracked as credit |
| TAHA-0115 | محمد كمال حسين عبد الله طه | 0 | 0 | +0 | 200 | Overpayment now tracked as credit |
| TAHA-0069 | طارق ابراهيم حسني ابناء المرحوم | 520 | 520 | +0 | 80 | Overpayment now tracked as credit |
| TAHA-0106 | محمد حسين درويش طه | 165 | 165 | +0 | 35 | Overpayment now tracked as credit |

## 6. Exceptions — 3 members (verbatim, approved, no review)

Imported exactly as provided; stored so the structured balance equals the approved spreadsheet total.

| Member Code | Member Name | Current DB Balance | New Structured (verbatim) | Difference | Reason |
|---|---|---:|---:|---:|---|
| TAHA-0120 | محمود مصطفى عبد الله طه | 0 | 0 | +0 | Verbatim total matches DB |
| TAHA-0134 | نمر عطا نمر طه | 200 | 200 | +0 | Verbatim total matches DB |
| TAHA-0149 | حسام محمد كمال طه | 200 | -200 | -400 | Approved exception — verbatim total differs from DB |

---

## Total balance impact

Net change across all members (4 historical + 1 exception): **-2400 ₪**.
All other members are unchanged in balance; only representation (explicit credit) or stored Active Year is updated.
