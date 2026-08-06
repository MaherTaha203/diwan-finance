# Decision Validation — Food Receipt Engine (Lab Reference · Logic Freeze v2)

**Additive lab extension** on the Constitutional Laboratory. Runs the **real** engine
(`public/js/fin.js`) **offline** over a static read-only production snapshot. No DB
writes, no system change, no network at run time. The lab is synchronized to the
**authoritative Owner Decisions** (governance hierarchy: Constitution → Owner Decisions
→ Lab → Implementation).

## Authoritative Owner Decisions embodied (Logic Freeze v2)
- **D1** Payment Allocation applies only to Food Receipts.
- **D2** Automatic allocation starts from the **first ERP year (2025)** and proceeds year by year, oldest-first.
- **D3** Historical Deficit **never** participates automatically.
- **D4** Historical Deficit is **always** an explicit accountant decision.
- **D5** An explicit deficit amount is **deducted first**; only the remainder is auto-allocated.
- **D6** When all ERP subscriptions are satisfied, the surplus becomes the **first future subscription year** — **not** generic credit.
- **D7** Legacy balances before ERP remain untouched (the deficit = legacy).

## Snapshot (source of truth for this run — retained for reproducibility)
151 members · 302 subscriptions · 69 receipts (10 active food) · `locked_through_year=2025` · first future year = **2027**.

## Discovered real patterns (7)
| count | pattern |
|---|---|
| 97 | subs:2+ · deficit:y · owing |
| 20 | subs:0 · deficit:y · owing |
| 16 | subs:1 · deficit:y · owing |
| 8 | subs:0 · clear |
| 4 | subs:2+ · owing |
| 3 | subs:1 · owing |
| 3 | subs:0 · credit · clear |

(The fixed constitution seed covers different patterns that do not occur in production.)

## Coverage result (Logic Freeze v2)
- **Members 151 · Scenarios 787 · Passed 787 · Failed 0**
- **Patterns 7/7 fully passing · Pattern coverage 100% · Scenario pass 100%**

Invariants asserted per scenario (all from the Owner Decisions): balanced (Σ steps = amount);
no generic credit (D6); explicit deficit is **first** and within bounds (D5); `due` steps are
ERP subscription years, **oldest-first**, capped at each year's remaining (D2); surplus targets
the **first future year** 2027 (D6); obligations ≤ positive current debt.

## Worked example (Decision Runner)
Member with 2025=200, 2026=200, deficit=2200; pay 500 with 100 to deficit →
1) **100 → historical** (deducted first, D5) · 2) **200 → 2025** (first ERP year, D2) · 3) **200 → 2026** (D2). Balanced.

## What changed vs v1 (governance correction, not a redesign)
1. **2025 is now allocated** (first ERP year) — v1 wrongly excluded it as fiscally locked.
2. **Deficit is deducted first** (v1 applied it after the years).
3. **Surplus → first future year (2027)**, not a generic credit bucket (v1 used credit).

## Reproducibility
`node lab/scenario-runner.cjs` on the retained snapshot reproduces these numbers exactly.

## Gate status
- Decision Validation ✅ 787/787 · Scenario Coverage ✅ 7/7 (100%) · Decision Trace ✅ · Prototype Validation ✅ (same reference logic).
- **Logic Freeze v2 — proposed, pending owner approval.**
