# ENGINEERING STANDARD v1.0 — Project Execution Constitution

**Status:** Active. Ratified upon the official delivery of the **Food Receipt Engine**.
**Scope:** Every future module and feature of Diwan Finance.
**Authority:** This document is the permanent development methodology of the project.
It may be changed **only** by an explicit Owner Decision.

> This document does not implement code. It captures the successful engineering
> process that produced the Food Receipt Engine, so that every future module is
> built, reviewed, and delivered the same way.

---

## 0. Document status — Freeze & Amendment Policy

**This document is FROZEN v1.0 upon Owner approval.** It is the permanent execution
standard of the project. Future projects must follow this standard exactly.

**It shall NOT be modified** because of preference, style, optimization, or new ideas.

**It may be revised only if real execution proves the methodology itself is incomplete,
contradictory, or incapable of governing future work.** Any revision must:

- originate from **actual engineering experience** (not opinion or preference);
- **identify the exact limitation** that execution exposed;
- **preserve backward traceability** to prior versions;
- **create a new version** (v1.1, v2.0, …);
- **never overwrite historical versions** — superseded versions are retained intact.

The approved version remains the governing engineering standard **until formally
superseded by the Owner**. Superseding is itself an explicit Owner Decision.

**Version history**

| Version | Status | Notes |
|---------|--------|-------|
| v1.0 | **Frozen — governing** | Ratified upon delivery of the Food Receipt Engine. |

---

## 1. Governance hierarchy (frozen)

Every conflict is resolved top-down. A lower layer never overrides a higher one.

1. **Business Constitution**
2. **Approved Owner Decisions**
3. **Decision Validation Laboratory** (the Logic Freeze reference)
4. **Production Decision Function**
5. **Production Wiring**
6. **Production UI**

If Production ever differs from the Laboratory, **Production is wrong** — correct the
Laboratory first (only if it diverges from the Constitution/Owner Decisions), then make
Production a faithful translation of the Laboratory.

**Owner Decisions override** implementation, laboratory, architecture, and documentation.

---

## 2. Permanent execution pipeline

Every new feature follows this order exactly. **No stage may be skipped.**

| # | Stage | Purpose | Exit condition |
|---|-------|---------|----------------|
| 1 | Problem Definition | State the real problem, no guessing | Problem written and agreed |
| 2 | Business Analysis | Understand rules, data, and impact — no code | Analysis documented |
| 3 | Owner Decision | The Owner decides the business rule | Decision recorded verbatim |
| 4 | Business Constitution Update *(if required)* | Persist the rule at the highest layer | Constitution reflects the decision |
| 5 | Decision Validation Laboratory | Encode the rule as the single business-logic reference, over **real** data, offline, read-only | Laboratory reflects the Owner Decisions |
| 6 | Scenario Discovery | Derive every real pattern from real members/data | Pattern set enumerated |
| 7 | Scenario Validation | Run all scenarios against the reference invariants | 100% of scenarios pass |
| 8 | **Logic Freeze** | Freeze the laboratory as authoritative | Freeze declared (e.g. *Logic Freeze v2*) |
| 9 | Implementation | Translate the frozen laboratory into production — **translation only** | Focused tests pass |
| 10 | Independent Engineering Review Board | Independent reviewers audit with evidence | All required reviewers APPROVE |
| 11 | Regression | Full suite + golden reference + lab comparison | Regression green (baseline-relative reds excepted, and registered) |
| 12 | UX Review *(if UI changes)* | Cognitive-load and workflow review | Observations collected & classified |
| 13 | **UX Freeze** *(if UI changes)* | Owner tests in the real app and approves | Owner states approval; freeze declared |
| 14 | Delivery Audit | Repository, branches, migration chain, reproducibility | Delivery plan approved |
| 15 | Repository Consolidation | One coherent, reproducible history on `main` | `main` = single source of truth |
| 16 | **Official Delivery** | Declared complete | Delivery report signed off |

Each stage produces an artifact and **STOPS for explicit approval** before the next,
unless the Owner grants an autonomous-execution contract for that issue.

---

## 3. The Laboratory — single business-logic reference

- The Laboratory is the **single Business Logic Reference**.
- It reads **real production data** (read-only, one snapshot), uses real members and
  subscriptions, runs the **real engine offline**, and writes nothing to any database.
- **Implementation never defines business behaviour.** Implementation only translates
  the Laboratory. The proof of a correct translation is:

  **Production == Decision Function == Laboratory** — 100% identical over every
  approved scenario. (Food Receipt Engine baseline: **787 / 787 identical**.)

- The Laboratory must always reflect the Constitution and Owner Decisions. If it
  diverges, correct the Laboratory first — never bend the Constitution to the code.

---

## 4. Independent Engineering Review Board

Every implementation must pass **independent** review before delivery.

- Reviewers work independently and produce independent reports.
- Reviewers may **APPROVE** or **REJECT**. They do not vote; **agreement is never
  required, evidence always is.**
- Every rejection must include: **Severity · Evidence · Root Cause · Files affected ·
  Why it violates architecture or business rules.** No opinions, no preferences, no
  assumptions.
- On rejection: fix **only** the rejected findings, re-run tests, re-review. Repeat
  until no blocker remains.

**Reviewer roster**

| Reviewer | Reviews | Convened |
|----------|---------|----------|
| Chief Architect | Architecture, scope, dependencies, blast radius, maintainability | Always |
| Business Constitution Auditor | Constitution, Owner Decisions, Logic Freeze, business rules | Always |
| Financial Engine Auditor | Accounting correctness, allocation, invariants, edge cases, scenario consistency | Always |
| Database Auditor | SQL, RPC, migrations, data integrity, backward compatibility | When DB/SQL changes |
| Regression Auditor | Existing + new tests, golden reference, laboratory comparison, regression | Always |
| UX Auditor | Workflow, simplicity, cognitive load, UX Freeze | **Only when UI changes exist** |
| Delivery Auditor | Repository, branches, merge readiness, migration chain, reproducibility | At delivery |

---

## 5. Engineering principles (always in force)

- Never guess. Never invent business rules.
- Never expand scope. Never redesign outside the approved issue.
- Never modify unrelated code. Never optimize unless explicitly required.
- Never hide defects. **Register every discovered issue; solve only approved issues.**
- Minimum blast radius: touch only the files strictly required.
- Every change must be traceable to an approved issue.

**Issue register vs. fix:** a newly discovered problem is *registered*, not silently
fixed. It becomes its own issue and follows the pipeline.

---

## 6. Delivery & reproducibility

No implementation is complete until **all** of the following hold:

1. The repository is **reproducible** — a clean clone of `main` reproduces exactly
   what is running.
2. The **migration chain is complete** and self-contained: unique, correctly ordered
   timestamps; every referenced object created before use; additive only (no silent
   drop/alter/DML); no orphaned migration on another branch.
3. **Regression passes** on a clean clone of `main`.
4. **Production == Decision Function == Laboratory.**
5. **`main` is the single source of truth.** No orphan implementation branch remains
   the active source; historical branches are marked superseded (not deleted unless
   explicitly requested).
6. The golden-reference baseline is current (updated only as part of the approved
   delivery procedure — typically satisfied by the merge to `main` itself).

**Consolidation rules:** deliver onto a branch that is a clean linear descendant of
`main`; prefer a lossless merge that preserves issue-by-issue history (fast-forward
when eligible); never rewrite history; never merge or deploy without explicit Owner
approval.

---

## 7. Stop conditions

Stop immediately, do not continue, and escalate if:

- an Owner Decision is missing;
- there is a Constitutional or Laboratory conflict;
- regression fails (a genuine regression, not a registered baseline-relative artifact);
- the blast radius would exceed the approved scope;
- correctness cannot be proven;
- **Production ≠ Decision Function ≠ Laboratory.**

---

## 8. Success metric

Success is **not** measured by lines of code, speed, or number of commits.

Success is measured by:

- **Correctness**
- **Reproducibility**
- **Maintainability**
- **Traceability**
- **Owner approval**

---

## Appendix — Reference precedent: the Food Receipt Engine

The first module delivered under this standard, in order:

Business Constitution → Owner Decisions → Decision Validation Lab → **Logic Freeze v2**
→ **F-1** Decision Function → **F-1A** Fiscal Lock Compatibility → **F-2** Wiring →
**F-3** Explicit Historical Deficit → **F-4** Confirmation Layer → **F-5** Operator
Experience & UX Freeze v1.0 → Engineering Review Board (6/6 APPROVE) → Delivery &
Consolidation → **Official Delivery** on `main`.

Proven outcomes: Production == Decision Function == Laboratory at **787/787**; full
regression green on a clean clone (**66/66**); complete, self-contained migration
chain; `main` as the single reproducible source of truth.

---

*Engineering Standard v1.0 — FROZEN and governing. Revisable only per §0 (real
execution limitation → new version, historical versions never overwritten), and
superseded only by explicit Owner Decision.*
