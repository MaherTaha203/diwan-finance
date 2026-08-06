# Decision Validation — Food Receipt Engine (Lab Reference)

**Additive lab extension** on top of the Constitutional Laboratory. Runs the **real**
production engine (`public/js/fin.js`) **offline** over a static, read-only production
snapshot. No DB writes, no system change, no network at run time.

## Components (additive)
- `lab/snapshot` → `lab/seed/prod-snapshot.json` — read-only production snapshot (retained for reproducibility).
- `lab/engine.cjs` — loads the real engine headless; `position(member)` (real FIN outputs) + `propose(member, amount)` (confirmation-first decision, step-by-step + reasons).
- `lab/decision-runner.cjs` — explain one member+amount decision, step by step.
- `lab/scenario-discovery.cjs` — cluster all real members into patterns; compare vs the fixed seed.
- `lab/scenario-runner.cjs` — generate & run scenarios (member × amount strategies), assert invariants, report coverage.

## Snapshot (source of truth for this run)
151 members · 302 subscriptions · 69 receipts (10 active food) · `locked_through_year=2025` · `food_opening=-8639`.

## Discovered real patterns (8) — none matched the old fixed seed
| # | count | pattern |
|---|---|---|
| 1 | 97 | open:1 · locked:y · deficit:y · owing |
| 2 | 20 | open:0 · locked:n · deficit:y · owing |
| 3 | 12 | open:1 · locked:n · deficit:y · owing |
| 4 | 8 | open:0 · clear |
| 5 | 4 | open:1 · locked:y · owing |
| 6 | 4 | open:0 · locked:y · deficit:y · owing |
| 7 | 3 | open:1 · owing |
| 8 | 3 | open:0 · credit · clear |

The fixed seed (4 members) covers patterns that **do not occur in production** (e.g. `open:2+`), because prod has only years 2025/2026 and 2025 is locked ⇒ at most one open year. **6 real patterns were uncovered by the fixed cases.**

## Coverage result
- **Members:** 151 · **Scenarios:** 667 · **Passed:** 667 · **Failed:** 0
- **Patterns:** 8/8 fully passing · **Pattern coverage:** 100% · **Scenario pass:** 100%

Invariants asserted per scenario: balanced (Σ steps = amount), no settlement of a **locked** year, no `due` line exceeds that year's remaining, historical ≤ deficit, obligations ≤ positive debt, surplus → future credit.

## Findings surfaced by the lab (value of running on real data)
1. **Credit-holding members** (outstanding negative) are a real pattern (3 members) — the first invariant draft wrongly flagged them; corrected so a credit member's payment routes fully to future credit.
2. **Locked-year (2025) debt is real and widespread** (97+4+4 members) and is **never settleable by a subscription line** (fiscal lock). The reference logic surfaces it separately; whether/how it maps to the historical-deficit bucket is the pending owner decision (MIR-001).
3. Production has **at most one open year (2026)** per member — the seed's multi-open-year cases are not representative.

## Reproducibility
Re-running `node lab/scenario-runner.cjs` on the retained `lab/seed/prod-snapshot.json` reproduces these exact numbers. Keep the snapshot with any approval.

## Gate status (before any system implementation)
- Decision Validation — ✅ 667/667
- Scenario Coverage — ✅ 8/8 real patterns, 100%
- Decision Trace — ✅ (`decision-runner.cjs` explains each step)
- Prototype Validation — ✅ prototype driven by the same reference logic on the 8 real patterns
