<!-- ═══════════════════════════════════════════════════════════════════════════
     P6-000 — Architectural Evolution Assessment (ASSESSMENT ONLY)
     Classification-first. No code, no API, no schema, no route, no component, no
     service, no read/write model, no implementation specification, and NO change
     to any existing governance document is made by this file. It CLASSIFIES every
     remaining candidate and recommends what to build, merge, defer, or reject.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P6-000 · Architectural Evolution Assessment

**Document ID:** GOV‑P6‑SPEC‑01
**Phase:** P6 · Task P6‑000 (assessment only)
**Status:** DRAFT — for owner review, approval & freeze (no implementation until then)
**Date:** 2026‑07‑21
**Repository baseline:** `main` @ `3d48915` (CLOSED & ACTIVE)
**Predecessors (all frozen):** P0 · P1 · P2 · P3 · P4 · P5‑OBS · GOV‑WS‑01 v1.4.

> **Role.** Prepared as Lead Software Architect. This is a **classification‑first**
> assessment: the architectural *role* of every remaining candidate is fixed
> **before** any implementation is authorized. It designs nothing and modifies
> nothing. Each "Required Specifications / ADRs" entry *names* the artifact a future
> phase would need — it does not produce it.

---

## 1 · Executive Summary

The platform is architecturally complete for its current mandate: a certified
foundation (Constitution · Accounting Core · Business Operations), three operational
Business Modules (P2/P3/P4), and one Observability Layer (P5 Treasury). Every
remaining candidate is one of three things: (a) a **ready operational module** on
the existing certified surface, (b) a **control that extends the certified write
path** (new Business Operation + constitutional/contract amendment), or (c) a
**foundational concept the platform does not yet model**.

**The single clean, low‑risk, high‑value next step is Annual Subscriptions / Dues** —
the only remaining Operational Business Module whose certified foundation already
exists (BO‑10 obligation + BO‑07 onboarding; certified read models). It is
orchestration‑only, adds no accounting, and mirrors P2/P3/P4 exactly.

Everything that adds real *control* — **Approval Workflow (GAP‑P1)** and the
**Liquidity Guard (GAP‑P2)** — is architecturally significant: it is the first work
since P1 to **extend the certified write path**, requiring a new certified Business
Operation and a Business‑Contract (Part A) amendment, and in the guard's case a
constitutional invariant. These are a paired **Cross‑Cutting Capability** initiative,
sequenced after the ready module and gated by ADRs.

**BO‑06** (historical‑deficit settlement) and **Cash Management** touch the
constitutionally‑bounded deficit and an unmodeled physical‑cash concept respectively;
both are **deferred** until a business policy decision exists. **Governance
Enhancements** are low‑cost, high‑leverage, and should run in parallel. A discovered
**Additional Candidate — the Reservations calendar** — already exists *outside* the
certified spine and needs only a governance ruling, not an accounting evolution.

**Recommended P6 build: Annual Subscriptions / Dues.** Recommended P7 initiative:
GAP‑P1 + GAP‑P2 as a paired control capability. Defer BO‑06 and Cash Management.

---

## 2 · Method & Classification Vocabulary

Each candidate is placed in **exactly one** architectural role:

- **Operational Business Module** — owns a domain workflow; a workspace that
  *executes* by orchestrating certified Business Operations (GOV‑WS‑01 Rule 4).
- **Observability Layer** — projects certified state for oversight; executes nothing
  (Rule 4 N/A).
- **Governance Enhancement** — a rule/artifact/process change to GOV‑WS‑01 or the
  certification method; not a runtime surface.
- **Platform Infrastructure** — a foundational technical capability (persistence,
  identity, tooling) beneath the business layers.
- **Cross‑Cutting Capability** — a control/behaviour spanning multiple modules;
  typically requires a *new* certified operation and/or a core precondition.
- **Deferred / Out of Scope** — not authorized to build now (missing policy,
  foundation, or business trigger).

Read/write characterisation uses the certified spine: **read** = consumes certified
Read Models only; **write** = must route through (or newly extend) certified Business
Operations / the Accounting Core.

---

## 3 · Candidate‑by‑Candidate Assessment

### Candidate 1 · Approval Workflow (GAP‑P1)

1. **Purpose.** Introduce a request → approve/reject → execute lifecycle so that
   privileged operations (esp. disbursements) are authorised before they take effect.
2. **Business Problem.** Today a write‑authorised user issues a payment directly;
   there is no second‑party approval gate. The organisation needs segregation of duty
   over money leaving the funds.
3. **Business Boundary.** *Owns* the approval lifecycle/state of a pending operation.
   *Does not own* the underlying accounting effect (still owned by BO‑01…BO‑05) or the
   fund balances (Accounting Core).
4. **Dependencies.** P4 (Payment) primarily, P3 (Collection) secondarily; the
   certified BO layer; a new persisted "pending request/approval" state.
5. **Interaction.** Constitution — a new *authorisation* invariant ("no execution
   without approval") may be added. Accounting Core — unchanged (approval precedes,
   does not alter, the accounting). Certified Business Operations — requires a **new
   certified BO** (request/approve/reject → execute) or a wrapper that gates the
   existing BOs.
6. **Read / Write.** **Write** — introduces new state transitions and a new certified
   operation; it is not a projection.
7. **Architectural Classification.** **Cross‑Cutting Capability** (spans every
   voucher‑issuing module; adds a control, not a domain).
8. **Governance Impact.** High — first new certified BO since P1; GOV‑WS‑01 Rule 4
   gains an explicit Authorization sub‑stage backed by a certified operation.
9. **Constitutional Impact.** Medium — a new authorisation invariant; no change to
   financial conservation/deficit rules.
10. **Required ADRs.** ADR‑P6‑APPROVAL‑01 (approval as a certified operation vs. a
    UI gate); ADR‑P6‑APPROVAL‑02 (pending‑state persistence & idempotency).
11. **Required Specifications.** A GAP‑P1 capability spec + a Business‑Contract
    (Part A) amendment defining the new certified operation. *(Named, not produced.)*
12. **Risks.** Touching the certified write path; partial‑approval / race conditions;
    scope creep into a general workflow engine.
13. **Complexity.** High.
14. **Recommended Priority.** P2 (after the ready operational module).
15. **Recommendation.** **Proceed** — but gated by ADRs, and evaluate **merging with
    Candidate 2** (they share the pre‑execution control point).

---

### Candidate 2 · Liquidity Guard (GAP‑P2)

1. **Purpose.** Prevent a disbursement that would overdraw a fund (or breach a budget)
   by enforcing a liquidity precondition before a payment executes.
2. **Business Problem.** Nothing today blocks a payment that exceeds available fund
   liquidity; the deficit is observed (P5) but not *enforced*.
3. **Business Boundary.** *Owns* the pre‑execution liquidity precondition. *Does not
   own* the balances themselves (Accounting Core) or the payment workflow (P4).
4. **Dependencies.** Accounting Core balances (`FIN.foodBalance`/`diwanBalance`), the
   BO write path; naturally shares the pre‑execution point with GAP‑P1.
5. **Interaction.** Constitution — a **new invariant** ("no execution below zero
   liquidity / above budget") is constitutional in nature. Accounting Core — a new
   precondition check at the write path. Certified Business Operations — BO‑01 (and
   payment issuance) gains a guard.
6. **Read / Write.** **Write‑path precondition** — it reads certified balances but its
   purpose is to *block* a write; it is enforcement, not projection.
7. **Architectural Classification.** **Cross‑Cutting Capability** (a guard spanning the
   issuing modules, realised as a Business Rule at the core/BO boundary).
8. **Governance Impact.** Medium — codifies a guard the workspaces already *describe*
   as out‑of‑scope; GOV‑WS‑01 unaffected in wording.
9. **Constitutional Impact.** High — introduces a hard financial precondition; must be
   proven not to conflict with the existing deficit bound.
10. **Required ADRs.** ADR‑P6‑LIQUIDITY‑01 (hard block vs. soft warning; budget model);
    ADR‑P6‑LIQUIDITY‑02 (interaction with the historical‑deficit bound).
11. **Required Specifications.** A GAP‑P2 rule spec + a constitutional amendment note
    for the new invariant. *(Named, not produced.)*
12. **Risks.** Over‑blocking legitimate operations; conflict with deficit accounting;
    emergency‑override policy.
13. **Complexity.** High (constitutional).
14. **Recommended Priority.** P3 (with, or immediately after, GAP‑P1).
15. **Recommendation.** **Merge with another candidate** — pair with GAP‑P1 as one
    control initiative sharing the pre‑execution gate (approval + liquidity).

---

### Candidate 3 · Annual Subscriptions / Dues

1. **Purpose.** An operational workspace for the yearly dues lifecycle: apply annual
   obligations to eligible members and see, per year, who is billed and what remains.
2. **Business Problem.** Applying and tracking annual dues is done ad‑hoc; there is no
   dedicated operational surface, though the certified operations exist.
3. **Business Boundary.** *Owns* the dues **State** (years billed, per‑year totals,
   outstanding), **History** (schedule evolution), and **Capability** (apply annual
   dues → BO‑10; onboard → BO‑07). *Does not own* payments (P3), member lifecycle
   (P2), disbursements (P4), or per‑year payment allocation (GAP‑1, inflow — deferred).
4. **Dependencies.** BO‑10 (obligation generation), BO‑07 (onboarding); read models
   `subscriptionYears`, `memberDelinquency`, member subscriptions — **all already
   certified.** GOV‑WS‑01 v1.4; the P2/P3/P4 workspace pattern.
5. **Interaction.** Constitution — none (no new accounting). Accounting Core — none
   (reuses BO‑10, which is obligation‑only, never a payment). Certified Business
   Operations — **reuse only**; nothing new.
6. **Read / Write.** **Read** for State/History; **write only via existing certified
   BO‑10 / BO‑07** for capability — orchestration, no new write model.
7. **Architectural Classification.** **Operational Business Module.**
8. **Governance Impact.** Low — a fourth module under the same GOV‑WS‑01 language.
9. **Constitutional Impact.** None.
10. **Required ADRs.** None mandatory (pattern is precedented by P3/P4). Optionally a
    short note on the read‑only vs. capability slice split.
11. **Required Specifications.** A P‑Dues‑000 module spec + slice orders (State/History,
    then capability), following the P3/P4 template. *(Named, not produced.)*
12. **Risks.** Low — the main boundary risk is drifting into payment allocation
    (GAP‑1), which must stay out of scope.
13. **Complexity.** Low–Medium.
14. **Recommended Priority.** **P1 — highest.** Ready, low‑risk, high‑value.
15. **Recommendation.** **Proceed** — this is the recommended P6 build.

---

### Candidate 4 · BO‑06 (Historical‑Deficit Settlement)

1. **Purpose.** A certified operation that formally *settles* (reduces) the historical
   deficit, rather than only displaying its remaining balance.
2. **Business Problem.** The historical deficit is tracked and observed but there is no
   sanctioned operation to retire it under a defined policy.
3. **Business Boundary.** *Owns* the settlement write against the deficit treasury.
   *Does not own* donations/allocations (already feed the deficit via certified
   allocation) or the deficit *bound* (Constitution).
4. **Dependencies.** The Accounting Core deficit treasury (FIN2), the constitutional
   deficit‑bound invariant, the certified BO framework.
5. **Interaction.** Constitution — **direct**: it mutates a constitutionally‑bounded
   quantity; the deficit‑bound proof must be re‑established. Accounting Core — a new
   write against the deficit treasury. Certified Business Operations — a **new
   certified BO** (the reserved BO‑06 slot).
6. **Read / Write.** **Write** — a core accounting mutation of a bounded quantity.
7. **Architectural Classification.** **Deferred / Out of Scope** (a discrete certified
   Business Operation extending the Accounting Core, with no current business trigger
   and the highest constitutional sensitivity).
8. **Governance Impact.** High — activates a long‑reserved BO slot; requires
   certification.
9. **Constitutional Impact.** **Highest** — touches the deficit bound directly.
10. **Required ADRs.** ADR‑BO06‑01 (settlement policy: what event legitimately reduces
    the historical deficit, and its bound interaction).
11. **Required Specifications.** A BO‑06 operation spec + constitutional amendment +
    deficit‑bound re‑proof. *(Named, not produced.)*
12. **Risks.** Very high — mis‑settlement corrupts the constitutional bound; no clear
    business demand yet.
13. **Complexity.** High (constitutional).
14. **Recommended Priority.** Low (blocked on policy).
15. **Recommendation.** **Defer** — unlock only when a written settlement policy and
    business trigger exist.

---

### Candidate 5 · Cash Management

1. **Purpose.** Model and reconcile *physical* cash / bank location (where the money
   physically is), distinct from fund *balances* (what each fund is owed/holds).
2. **Business Problem.** The platform tracks fund balances but not cash location; there
   is no cash‑vs‑bank reconciliation.
3. **Business Boundary.** *Owns* a cash‑location ledger and reconciliation. *Does not
   own* fund accounting (Accounting Core) — it is an orthogonal axis.
4. **Dependencies.** A **new foundational concept** (cash locations / reconciliation)
   not present in MODEL2 or the certified read/write models.
5. **Interaction.** Constitution — likely a new sub‑domain (cash conservation).
   Accounting Core — needs new model surface (not just reuse). Certified Business
   Operations — new operations for cash movement/reconciliation.
6. **Read / Write.** **Write** — new state and new operations (net‑new foundation).
7. **Architectural Classification.** **Operational Business Module** (low readiness) —
   but predicated on new **Platform / Accounting‑Core** modelling first.
8. **Governance Impact.** High — a new domain under governance.
9. **Constitutional Impact.** Medium–High — a new conservation axis (cash location).
10. **Required ADRs.** ADR‑CASH‑01 (cash‑location model; relationship to fund balances).
11. **Required Specifications.** A cash‑model foundation spec, then a module spec.
    *(Named, not produced.)*
12. **Risks.** High — inventing foundation contradicts the "orchestrate the certified
    surface" methodology if attempted as a mere workspace.
13. **Complexity.** High.
14. **Recommended Priority.** Low.
15. **Recommendation.** **Defer** — requires a foundational modelling decision before
    it can be a methodology‑compliant module.

---

### Candidate 6 · Governance Enhancements

1. **Purpose.** Evolve the governance vocabulary/process: e.g. codify "Observability
   Layer" as a first‑class GOV‑WS‑01 artifact type; formalise the ADR process; record
   the baseline/roadmap cadence.
2. **Business Problem.** The program has *used* an Observability Layer and ADR‑style
   decisions without them being first‑class in GOV‑WS‑01; the vocabulary lags practice.
3. **Business Boundary.** *Owns* governance rules/artifacts/process. *Does not own* any
   runtime surface, accounting, or data.
4. **Dependencies.** GOV‑WS‑01; the existing completion‑report/roadmap artifacts.
5. **Interaction.** Constitution — none (governance sits beside, not inside, the
   Constitution). Accounting Core — none. Certified Business Operations — none.
6. **Read / Write.** Neither (documentation/process only).
7. **Architectural Classification.** **Governance Enhancement.**
8. **Governance Impact.** By definition — a new GOV‑WS‑01 version (e.g. v1.5) adding the
   Observability‑Layer rule + an ADR‑process note.
9. **Constitutional Impact.** None.
10. **Required ADRs.** ADR‑GOV‑01 (adopt the ADR process itself) — self‑bootstrapping.
11. **Required Specifications.** A GOV‑WS‑01 v1.5 amendment (separate, individually
    gated). *(Named, not produced.)*
12. **Risks.** Very low — documentation only; risk is over‑proceduralisation.
13. **Complexity.** Low.
14. **Recommended Priority.** Medium (parallel enabler; no runtime dependency).
15. **Recommendation.** **Proceed** — small, parallelizable, high leverage.

---

### Additional Candidate · Reservations — Diwan Reservation Calendar (discovered)

*Discovered in the repository (`public/js/reservations.js`, ~456 lines): a functional
Diwan reservation calendar already in production, operating **outside** the certified
accounting spine — its own `reservations` table (DB‑enforced single active reservation
per date), soft‑delete cancellation, and `logAction` audit; no FIN read models and no
certified Business Operations.*

1. **Purpose.** Answer "is the Diwan free on a given day?" and manage bookings.
2. **Business Problem.** Venue scheduling — a non‑financial operational need already met
   by existing code.
3. **Business Boundary.** *Owns* the reservation calendar/state. *Does not own* any
   fund, voucher, or accounting concept (it has no financial semantics).
4. **Dependencies.** Its own table + audit; shared UI globals. **No** dependency on the
   Accounting Core or certified BOs.
5. **Interaction.** Constitution — none. Accounting Core — none. Certified Business
   Operations — none (it predates and sits beside the certified spine).
6. **Read / Write.** **Write**, but against a **non‑certified, non‑financial** store —
   architecturally isolated from the accounting foundation.
7. **Architectural Classification.** **Operational Business Module (non‑financial)** —
   already delivered, outside the certified accounting architecture.
8. **Governance Impact.** The only open question is *governance*: should this existing
   non‑financial module be formally recognised under GOV‑WS‑01, or explicitly declared
   out of the certified accounting scope?
9. **Constitutional Impact.** None (no financial state).
10. **Required ADRs.** ADR‑RES‑01 (does a non‑financial module fall under GOV‑WS‑01, or
    under a separate "non‑financial modules" governance note?).
11. **Required Specifications.** None for function; at most a governance classification
    note. *(Named, not produced.)*
12. **Risks.** Low — the risk is *scope confusion* (accidentally pulling a non‑financial
    calendar into the accounting governance and inventing accounting it must not have).
13. **Complexity.** Low (governance ruling only).
14. **Recommended Priority.** Low.
15. **Recommendation.** **Defer** any accounting evolution; resolve its status with a
    **Governance ruling only** (it is complete as a non‑financial module).

*(Also noted, not separately assessed: Audit/Activity Log and Financial Reports /
Statements are already‑delivered read surfaces → Observability; no new phase implied.)*

---

## 4 · Dependency Graph

```
                         ┌──────────────────────────────┐
                         │   Certified Foundation        │
                         │  Constitution · Core · BOs    │
                         └───────────────┬───────────────┘
        reuse (no new accounting)        │            extend the write path
     ┌───────────────────────────────────┼──────────────────────────────────┐
     ▼                                    ▼                                   ▼
┌──────────────────────┐        ┌───────────────────────┐        ┌────────────────────────┐
│ C3 Annual Dues       │        │ C1 Approval (GAP-P1)   │◀──────▶│ C2 Liquidity (GAP-P2)  │
│ Operational Module   │        │ Cross-Cutting (new BO) │ shared │ Cross-Cutting (invariant)│
│ (BO-10 + BO-07)      │        └───────────┬───────────┘  gate  └────────────┬───────────┘
│ READY · no new acct  │                    │ requires ADR + Part A            │ requires ADR + Constitution
└──────────────────────┘                    ▼                                  ▼
                                   ┌────────────────────────────────────────────────┐
                                   │ C4 BO-06 deficit settlement  · DEFER (const.)   │
                                   │ C5 Cash Management           · DEFER (new model)│
                                   └────────────────────────────────────────────────┘

  C6 Governance Enhancement ── parallel, no runtime dependency ──▶ enables clean C1/C2 governance
  Additional: Reservations ── isolated (non-financial) ── governance ruling only, no graph edge
```

**Edges that matter:** C1 and C2 share the single pre‑execution control point (merge
candidate). C3 depends only on already‑certified operations (no new edges into the
core). C4/C5 sit behind constitutional/foundational gates. C6 has no runtime edge.

---

## 5 · Recommended Execution Order

| Order | Candidate | Class | Rationale | Recommendation |
|---|---|---|---|---|
| **1** | **C3 Annual Dues** | Operational Module | Ready, low‑risk, high‑value; pure orchestration on certified BO‑10/BO‑07 | **Proceed (P6 build)** |
| **2** | **C6 Governance Enhancement** | Governance | Low‑cost enabler; codify Observability‑Layer type + ADR process (parallel) | **Proceed (parallel)** |
| **3** | **C1 Approval (GAP‑P1)** | Cross‑Cutting | First new certified BO since P1; needs ADR + Part A amendment | **Proceed (gated, next)** |
| **4** | **C2 Liquidity (GAP‑P2)** | Cross‑Cutting | Shares C1's gate; constitutional invariant | **Merge with C1** |
| **5** | **C4 BO‑06** | Deferred | Constitutionally sensitive; no policy/trigger | **Defer** |
| **6** | **C5 Cash Management** | Deferred | Needs new foundational model first | **Defer** |
| **—** | **Reservations** | Op. Module (non‑fin.) | Already delivered, isolated | **Governance ruling only** |

---

## 6 · Recommended Future Roadmap

- **P6 · Annual Subscriptions / Dues Operations** — the fourth Operational Business
  Module (State/History → capability via BO‑10/BO‑07). Orchestration only; no new
  accounting. *(Requires its own P‑Dues‑000 spec + slice orders — not produced here.)*
- **GOV‑WS‑01 v1.5 (parallel)** — codify "Observability Layer" as a first‑class artifact
  type and adopt the ADR process. *(Separate, individually‑gated governance change.)*
- **P7 · Pre‑Execution Control Capability (GAP‑P1 + GAP‑P2, merged)** — the first work
  since P1 to extend the certified write path: approval lifecycle + liquidity guard at
  one control point. *(Requires ADRs + a Business‑Contract Part A amendment + a
  constitutional invariant review — none produced here.)*
- **Deferred backlog (no phase opened):** BO‑06 (unlock on a settlement policy),
  Cash Management (unlock on a cash‑location foundation decision).
- **Governance ruling (no phase):** classify the existing Reservations calendar's
  standing relative to GOV‑WS‑01.

## 7 · Final Architectural Recommendation

1. **Build next (P6): Annual Subscriptions / Dues** — the only ready Operational
   Business Module; lowest risk, clear value, zero new accounting.
2. **Run in parallel: a Governance Enhancement** (GOV‑WS‑01 v1.5) to make the
   Observability‑Layer type and the ADR process first‑class.
3. **Sequence as P7: GAP‑P1 + GAP‑P2 merged** into one Cross‑Cutting *Pre‑Execution
   Control* capability — architecturally the most significant remaining work, gated by
   ADRs and the first constitutional/contract amendment since P1.
4. **Never build now (defer): BO‑06 and Cash Management** — both blocked on a policy or
   a foundational‑model decision; building either as a mere workspace would violate the
   orchestrate‑the‑certified‑surface methodology.
5. **Governance‑only: Reservations** — recognise the existing non‑financial module by a
   governance ruling; do not retrofit accounting onto it.

**What should be built:** Annual Dues (now); the merged Approval + Liquidity control
(next). **What should never be built (as‑is):** a Cash Management or BO‑06 *workspace*
without its foundational/constitutional decision first. **What should be merged:**
GAP‑P1 + GAP‑P2. **Belongs to Governance:** the Observability‑Layer/ADR enhancement and
the Reservations ruling. **Belongs to Business Operations:** Annual Dues; the new
approval operation. **Belongs to Observability:** already delivered (Treasury, reports,
audit) — no new phase. **Belongs to Platform Infrastructure:** the cash‑location model
that Cash Management would first require.

---

*Assessment only — no implementation is authorized until P6‑000 is reviewed, approved,
and formally frozen, and the owner selects the next phase.*
