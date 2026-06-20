# Phase 15 — Validation Report

> **Model (Final Implementation Lock):** Historical Balance is **derived** from Active Year (`(2024 − ActiveYear + 1) × 200`) — verified to equal the spreadsheet's Historical Balance column for all 146 non-exception members (0 mismatches), so every figure below is unchanged under this model. Credit is stored explicitly; exceptions are verbatim.

Proves the structured model reproduces the spreadsheet's authoritative totals.

- Reconciled (col8 total paid **and** col9 total remaining): **146/146 PASS**
- Failures: **0**
- Exceptions (skipped, verbatim): **3**
- Spreadsheet col7 deviations (intermediate column, NOT authoritative, not used): **18**

## Reconciliation method (per non-exception member)

- `col8 = historical_payments + Payments2025 + Payments2026`  → matched
- `col9 = (historical_balance − historical_payments) + (total_due − pooled_payments)`  → matched
- subscription balances: pooled payments allocated oldest-first; overflow → credit
- historical balance: stored verbatim (D-2); remaining = balance − payments

All 146 non-exception members PASS both checks. Full per-member results in the workbook → Validation sheet.