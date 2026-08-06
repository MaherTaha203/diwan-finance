# TRUTH-001 — Single Read-Point Proof (design only, evidence-based)

**The question:** *Can any report today compute a year's status directly from `receipts` / FD-002 / `member_subscriptions` **without** going through the Repository? Do all five reports (Statement, Delinquent, Annual Debt, Dues, Dashboard) depend on a single read point (the Repository), with no report deriving status on its own?*

I must answer this with the **actual code**, not the target design — because a false "yes" here is exactly how the Annual Debt defect would recur.

---

## Headline answer (honest)

**Today, YES — every report computes status from operational data, and NO report goes through the Repository.** The Repository is inert (Phase 1) and referenced by **zero** runtime code. So the guarantee as literally stated — "all reports depend on the Repository only" — is **false today and cannot become true before Phase 5.** Phase 1 was *deliberately* inert; the Repository single-read-point is Phase 5's deliverable, not Phase 1's. **Making "all reports already read the Repository" the gate for Phase 2 is therefore unsatisfiable by construction.**

**But the news is better than that headline suggests, and it is provable:** today all five reports do **not** each independently reinterpret raw data. They already converge on **one computed accessor inside the FIN engine** — `FIN.memberDelinquency(...).byYear` (and `memberStatement`) — which is the *single* place that reads `member_subscriptions` / `receipts` / FD-002. The migration is thus a clean **substitution of one funnel for another** (a *computed* accessor → a *stored* Repository), done report-by-report and flag-gated — not a hunt across scattered derivations.

---

## Evidence — where each report gets its status (current code)

**A. Does any runtime file reference the Repository?**
```
$ grep -rn "SubscriptionStatusRepository|SubscriptionStatus.get|subscription-status-repository" public/js/
>>> (zero matches)
```
→ **No report (or any code) reads the Repository today.** It is inert.

**B. The single computed funnel — one engine accessor reads the operational data:**
- `public/js/fin.js:189` `memberAllocation()` — the **only** status-relevant reader of operational data: `DB.subscriptions` (`due_amount_ils`, `paid_amount_ils`) at `fin.js:195-201` and `DB.receipts` (FD-002 / ق4) at `fin.js:202-203`.
- `public/js/fin.js:142` `memberDelinquency()` → calls `memberAllocation()` and produces `byYear[y].status` (`fin.js:167-169`) — the canonical per-year status accessor (the code names it the "single accessor (FD-011)", `fin.js:149-152`).

**C. Each report's status source (call sites):**

| Report | Status comes from | Evidence |
|---|---|---|
| **Annual Debt** | `FIN.debtReportRows` → `FIN.memberDelinquency(m.id).byYear` (+ `memberStatement`) | `fin.js:586` (`const dqBy=FIN.memberDelinquency(m.id).byYear`); entry via `reports.js:25`, model `report-model.js:318` |
| **Delinquent** | `delinquentRows()` → `FIN.memberDelinquency(m.id)` → `.byYear` | `reports.js:148`, `:153`, `:167` |
| **Dues** | `FIN.memberDelinquency(id).byYear[year]` | `dues-workspace.js:74`, `:77` (comment `:71` "from the certified FIN.memberDelinquency read model") |
| **Dashboard** | `FIN.memberDelinquency(m.id)` (`unpaidCount` / `isDelinquent`) | `app.js:681`, `:893` |
| **Member Statement** | `FIN.memberStatementView` → `memberStatement` | `report-model.js:736`, `:750`; `fin.js:367` |

**D. Do the report *surfaces* touch raw operational data directly (bypassing the accessor)?**
The only direct `DB.subscriptions` reads in report code are **year enumeration**, not status:
- `reports.js:47` — `adAvailableYears()` builds the year-filter dropdown (collects `year` + max `due_amount_ils`); no status.
- `dues-workspace.js:62` — collects the set of years; no status.
- The `movement_type` reads in `report-model.js:122/179/742` and `app.js:279-499` are **donation/treasury** balances, not subscription year-status.

→ **No report derives year status from raw `paid_amount_ils` / `receipts`.** Every status value flows through `memberDelinquency.byYear` / `memberStatement`.

---

## Why this exactly explains — and bounds — the Annual Debt defect

The FIN-RECON-001 bug happened for one precise reason: **the Annual Debt report was the single report that *escaped* the funnel** and re-derived status from raw stored `paid_amount_ils` instead of the accessor. The fix routed it back through `FIN.memberDelinquency(m.id).byYear` — see the comment now at `fin.js:577-585` and the code at `fin.js:586`. So:

- **The defect class = "a report re-derives status from operational data on its own."**
- Today only the accessor derives; the one violator was found and conformed.

**But the current funnel is a *convention*, not a *structural guarantee*.** Nothing physically stops a **future** report from calling `DB.subscriptions` and re-deriving status wrongly — precisely how the bug arose. That is the residual risk the Repository is designed to eliminate.

---

## Two different "single read points" — this is the crux

| | **Today (achieved)** | **Target — Phase 5+ (not yet)** |
|---|---|---|
| Single point | `FIN.memberDelinquency().byYear` / `memberStatement` | `Repository.get(member, year)` |
| Nature | **computed** — re-derives from `member_subscriptions`/`receipts`/FD-002 on every read | **stored** — reads a materialized value |
| Enforcement | **convention** (discipline; a new report can bypass it) | **structural** once legacy derivation is removed (Phase 7): the only status path is the stored lookup |
| Recurrence risk | non-zero (a new report can re-derive) | eliminated (no operational-data derivation path remains) |

The Repository does not *create* the single read point — a single (computed) funnel already exists. The Repository **hardens** it from a *computed convention* into a *stored, enforced* one, so that after Phase 7 a report **physically cannot** re-derive status from operational data. **That** is the durable guarantee against recurrence you are asking for — and it is delivered by Phases 5–7, verified by the Phase-6 parity test, not by Phase 1.

---

## Consequence for the Phase-2 gate

The stated gate ("prove all reports already depend on the Repository") **cannot be met now** and is the wrong precondition for Phase 2 — it is the *output* of Phase 5, not its *entry* condition. The correct, achievable gate — **which the evidence above proves is already satisfied** — is:

1. **Single funnel exists today:** all five reports derive status through exactly one engine accessor (`memberDelinquency.byYear` / `memberStatement`); **proven** (§C).
2. **No report re-derives status from raw operational data:** the only direct operational reads in report code are year-enumeration/treasury, not status; **proven** (§D).
3. **The historical escapee (Annual Debt) is conformed** to the funnel; **proven** (`fin.js:586`).

On that basis the migration is a controlled swap of one funnel for another, one report at a time, each flag-gated and each verified `report == Repository == approved matrix`, with a **permanent parity test** (Phase 6) that fails the build if any report's status ever diverges from the single source. That test — not a promise — is what makes "no report reinterprets status" enforceable forever.

**Recommendation:** do **not** authorize Phase 2 on the false premise that reports already read the Repository (they do not, by design). Authorize it on the true, proven premise: *there is exactly one status funnel today, no report bypasses it to re-derive from operational data, and Phases 5–7 replace that computed funnel with a stored, structurally-enforced one under a permanent parity gate.*

---
**Design/evidence review only — no code, no migration, no implementation, no plan. `fin.js` at baseline; Phase 1 inert; #273 held.** Awaiting your decision on the corrected Phase-2 gate.
