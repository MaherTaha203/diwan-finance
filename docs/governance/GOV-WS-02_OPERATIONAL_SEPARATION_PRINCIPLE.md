<!-- ═══════════════════════════════════════════════════════════════════════════
     GOV-WS-02 — Operational Separation Principle (PLATFORM GOVERNANCE AMENDMENT)
     A permanent governance rule for owner review, approval & freeze. It introduces
     NO code, NO application-logic change, NO activation, NO runtime, and NO change
     to the Accounting Constitution / Accounting Core / Certified Business
     Operations / Read Models. It does NOT modify GOV-WS-01 v1.5 or any of its
     Rules 1–6; it is ADDITIVE and sits alongside GOV-WS-01 as a platform-wide
     rule. Upon approval & freeze it becomes a permanent, mandatory rule governing
     every operational program on the platform.
     ═══════════════════════════════════════════════════════════════════════════ -->

# GOV‑WS‑02 · Operational Separation Principle — Platform Governance Amendment

**Document ID:** GOV‑WS‑02
**Classification:** Permanent Governance Rule (Platform Governance Amendment under GOV‑WS‑01 v1.5 §2.1 Governance)
**Status:** DRAFT — for Architectural Review, approval & freeze (introduces no runtime; activates nothing)
**Date:** 2026‑07‑22
**Baseline:** `main` @ `08ecb24`
**Predecessors (frozen):** GOV‑WS‑01 v1.5 · P‑AIENG‑000 · S1 · S2 · S3 · P‑AIENG‑ACT‑001 · P‑AIENG‑W1‑000 · P‑AIENG‑W1‑ACT‑001.

> **Nature.** GOV‑WS‑02 is an **additive** platform governance amendment. It **changes
> not a single one of the six GOV‑WS‑01 Business‑Workspace Design Rules**, and it modifies
> **no** frozen artifact. It establishes **one permanent architectural rule** — the
> **Operational Separation Principle** — that governs *how any operational capability is
> represented and authorized* across the whole platform. It is the codification of the
> design/execution separation the program adopted during Wave 1 (a Program Specification is
> not an Execution Order; an Execution Order is not a Completion Report), promoted from a
> Wave‑specific practice to a **standing platform rule**. Upon approval & freeze it is
> **mandatory** for every operational program named in §4.

---

## 1 · Objective

Introduce a **permanent architectural rule** governing every operational program on the
platform: separate **design**, **authorization**, and **evidence** into three independent
artifacts so that no program can be *specified into execution*, *executed without
authorization*, or *reported without having executed*. The rule makes the boundary between
"what is designed", "what is authorized to run", and "what actually happened" **explicit,
auditable, and impossible to cross implicitly**.

This principle exists because the failure it prevents is concrete: a specification read as
an authorization, or an authorization read as a completed result, collapses the safety
gates the platform depends on. Three independent artifacts keep each gate a deliberate,
recorded, human decision.

---

## 2 · The Principle

**Every operational capability shall be represented by three independent artifacts.**

### 2.1 · Artifact 1 — Program Specification
- **Role.** Defines the **architecture** of the capability.
- **Contains.** The design: purpose, structure, component classification (per GOV‑WS‑01
  §2), invariants, boundaries, interfaces, acceptance criteria, and the *conditions under
  which* execution would later be authorized.
- **Contains NO operational authority.** A Program Specification **never** authorizes
  execution. Approving and freezing a specification establishes *that the design is
  correct*, **not** that anything may run. Silence, approval, or freeze of a specification
  is **not** an authorization to execute.

### 2.2 · Artifact 2 — Execution Order
- **Role.** **Authorizes** execution of an already‑specified capability.
- **Contains.** The operational envelope: **scope** (what runs, on what target),
  **authority** (who/what may act and under whose supervision), **limits** (authority
  ceiling and prohibitions), **duration** (maximum run window), **rollback** (how to undo,
  and verification of undo), and **success criteria** (and, where applicable, failure
  criteria, kill‑switch authority, and evidence‑collection requirements).
- **Is the ONLY artifact that authorizes execution.** No capability may run except under
  an approved Execution Order that has been explicitly **authorized for execution**.

### 2.3 · Artifact 3 — Completion & Evidence Report
- **Role.** **Records what actually happened** when an authorized capability executed.
- **Contains evidence only.** Observed results, the audit trail, artifacts produced,
  metrics against the Execution Order's success/failure criteria, rollback‑verification
  outcome, and the recorded outcome decision. It **prescribes nothing** and **authorizes
  nothing**; it is a factual record.
- **May exist only after executed work.** A Completion & Evidence Report **cannot** be
  written for work that has not executed under an Execution Order.

---

## 3 · Invariants (the separation rules)

These are the binding rules of the principle. Each is permanent and non‑negotiable:

1. **No artifact may replace another.** A Program Specification is not an Execution Order;
   an Execution Order is not a Completion Report. Each is a distinct artifact with a
   distinct role, authored and reviewed on its own.
2. **No artifact may imply another.** Approving a Program Specification does **not** imply
   authorization to execute. Issuing an Execution Order does **not** imply that execution
   occurred. Nothing is inferred across the boundary; every transition is an explicit,
   recorded decision.
3. **No execution may occur without an Execution Order.** Execution is authorized **only**
   by an approved Execution Order explicitly authorized for execution — never by a
   specification, a roadmap, a review note, a chat message, or any implicit reading.
4. **No Completion & Evidence Report may exist without executed work.** Evidence records
   real execution; there is no report in advance of the work it describes.

Together these guarantee the canonical order for any operational capability:

```
Program Specification  →  Execution Order  →  Execution  →  Completion & Evidence Report
   (design; no                (authorization;     (only under        (evidence only;
    authority)                 scope/limits/        an approved        after the fact)
                               rollback/criteria)   Execution Order)
```

No step is skipped, merged, or implied.

---

## 4 · Applicability

The Operational Separation Principle is **mandatory** for every operational program in the
following domains:

- **AI Engineering** — the AI Engineering Governance Platform (P‑AIENG‑*): specifications,
  activation orders, and completion reports are already separate; this rule makes that
  separation permanent and universal (e.g. P‑AIENG‑W1‑ACT‑001 *specification* → the
  forthcoming P‑AIENG‑W1‑PILOT‑001 *Execution Order* → the post‑pilot *Completion &
  Evidence Report*).
- **Governance** — governance amendments that carry operational effect.
- **Accounting Operations** — any program that would exercise the Accounting Core.
- **Treasury** — treasury/observability programs whose scope becomes operational.
- **Business Operations** — programs exercising Certified Business Operations.
- **Future operational programs** — every operational capability introduced hereafter,
  by construction.

**Scope note.** The principle governs **operational** capabilities — those that *act*
(execute code, run agents, exercise BOs, mutate state, or perform a runtime activity). It
does **not** impose a three‑artifact ceremony on purely descriptive or read‑only governance
records that authorize and execute nothing; those remain single specifications. Where a
program *both* specifies and would later act, the acting is separated out into an Execution
Order per this rule.

---

## 5 · Relationship to GOV‑WS‑01 and the frozen baseline

- **GOV‑WS‑01 v1.5 is unchanged.** GOV‑WS‑02 modifies none of its text and none of Rules
  1–6. Under the GOV‑WS‑01 §2.1 taxonomy this document is a **Governance** artifact; it
  owns no runtime behaviour and holds a platform rule.
- **No frozen artifact is touched.** GOV‑WS‑02 re‑opens, re‑interprets, and re‑classifies
  nothing. Its references to prior programs (e.g. Wave 1) are **descriptive illustration**,
  not amendments to those frozen documents.
- **Forward‑binding, not retroactive rework.** The rule binds every operational program
  *from freeze onward*. It does not require rewriting already‑frozen programs; it recognises
  that the mature ones already follow the pattern and requires all future ones to.
- **Precedence.** GOV‑WS‑02 is read **together with** GOV‑WS‑01: GOV‑WS‑01 governs *how a
  component is built and classified*; GOV‑WS‑02 governs *how an operational capability is
  separated into design, authorization, and evidence*. Neither overrides the other.

---

## 6 · Enforcement & review path

1. **At classification.** When a program is classified (GOV‑WS‑01 §8), if it is
   operational, the reviewer confirms the three‑artifact separation applies and that the
   design and any execution are not conflated in one artifact.
2. **At specification review.** A Program Specification is approved on its architecture
   alone; approval explicitly carries **no** execution authority (§2.1, §3.2).
3. **At execution.** No execution proceeds until a distinct **Execution Order** is approved
   and explicitly authorized for execution (§3.3).
4. **At completion.** A **Completion & Evidence Report** is authored only after the
   authorized work has executed, and contains evidence only (§2.3, §3.4).
5. **Breach handling.** Any attempt to execute without an Execution Order, to treat a
   specification as authorization, or to publish a Completion Report without executed work
   is a **governance breach**: it is stopped, escalated to the Chief Architect, and
   recorded. (This is the exact class of error the rule exists to prevent.)

---

## 7 · Scope of this document (what it does NOT do)

- It **defines a permanent governance rule only.** It introduces **no implementation, no
  activation, no runtime, and no automation**, and it executes nothing.
- It **authorizes no program to run.** In particular it does **not** authorize the Wave 1
  pilot; that remains gated behind P‑AIENG‑W1‑PILOT‑001 being approved and explicitly
  authorized for execution.
- It **changes no business rule, no accounting logic, no Business Operation, no Read Model,
  no Constitution clause, and no GOV‑WS‑01 rule.** The certified foundation and every
  frozen module remain untouched.

---

## 8 · ADR · Operational Separation Principle (ADR‑GOV‑WS‑02‑0001)

*(Embedded architecture decision record — the "one ADR if required" for this amendment.)*

- **Status.** Proposed (becomes Accepted upon approval & freeze of GOV‑WS‑02).
- **Context.** During Wave 1 the platform distinguished, for the first time explicitly, a
  *Controlled Activation Specification* (design) from a *Pilot Execution Order*
  (authorization) from a *Completion & Evidence Report* (result). This separation was
  Wave‑specific. A concrete failure — reading an approval of the specification as an
  authorization to run — demonstrated that without a **standing** rule, the design and the
  authority to act can be silently conflated.
- **Decision.** Adopt the **Operational Separation Principle** as a **permanent, platform‑
  wide** rule (§2–§3): every operational capability is represented by three independent
  artifacts — Program Specification, Execution Order, Completion & Evidence Report — with
  the four separation invariants (no replacement, no implication, no execution without an
  Execution Order, no report without executed work).
- **Consequences.**
  - *Positive.* The design→authorization→evidence boundary is explicit and auditable;
    execution requires a deliberate, recorded authorization; completion reports are always
    grounded in real work; the Wave‑1‑class failure is structurally prevented.
  - *Cost.* Operational programs carry three artifacts rather than one; this ceremony is
    intentional and proportional to the risk of acting.
  - *Boundary.* Purely descriptive/read‑only governance records are unaffected (§4 scope
    note).
- **Alternatives considered.** (a) Keep the separation as a per‑program convention —
  rejected: it already failed once and offers no guarantee. (b) Fold the rule into
  GOV‑WS‑01 as a seventh Rule — rejected here: GOV‑WS‑01 v1.5 is frozen and its Rules 1–6
  govern Business‑Workspace construction, a different axis; a standalone amendment keeps the
  frozen baseline intact and states the rule at platform scope.
- **Compliance.** GOV‑WS‑01 v1.5 unchanged; no runtime; no frozen artifact modified.

---

## 9 · Success Criteria & Completion Boundary

- **Success.** A permanent, mandatory rule exists that separates every operational
  capability into three independent artifacts, with the four separation invariants and a
  defined enforcement/review path, applicable across AI Engineering, Governance, Accounting
  Operations, Treasury, Business Operations, and all future operational programs — changing
  no frozen artifact and authorizing nothing to run.
- **Completion boundary.** GOV‑WS‑02 is complete when it is reviewed, approved, and frozen.
  Freezing it establishes the rule; it activates nothing and authorizes no execution.

---

## Program map (for reference)

- **Foundation (frozen):** Accounting Constitution · Accounting Core · Certified Business
  Operations · GOV‑WS‑01 v1.5.
- **Operational Modules (frozen):** P2 · P3 · P4 · P‑DUES. **Observability (frozen):** P5.
- **Engineering Governance (frozen):** P‑AIENG‑000 · S1 · S2 · S3 · ACT‑001 · W1‑000 ·
  W1‑ACT‑001.
- **This amendment:** GOV‑WS‑02 — Operational Separation Principle (permanent platform rule).

---

*Governance amendment only — no implementation, activation, or runtime is authorized. Upon
owner review, approval, and freeze, GOV‑WS‑02 becomes a permanent, mandatory rule governing
the representation and authorization of every operational program on the platform. It does
not authorize the Wave 1 pilot or any other execution; execution remains gated behind a
distinct, approved Execution Order. The certified foundation and all frozen modules remain
untouched.*
