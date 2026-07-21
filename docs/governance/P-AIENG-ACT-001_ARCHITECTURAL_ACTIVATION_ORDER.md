<!-- ═══════════════════════════════════════════════════════════════════════════
     P-AIENG-ACT-001 — Architectural Activation Order (SPECIFICATION)
     Governance program. Defines the PROGRESSIVE, evidence-driven, reversible,
     continuously-reviewed activation of the certified AI Engineering Organization
     (P-AIENG-000/S1/S2/S3) in three waves. THIS DOCUMENT ACTIVATES NOTHING and
     spawns no agent: each wave becomes operational only under an explicit,
     separate activation authorization by the Chief Architect. It changes NO
     Accounting Constitution / Accounting Core / Certified Business Operation /
     Read Model / GOV-WS-01 rule, and no business functionality.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P-AIENG-ACT-001 · Architectural Activation Order — Specification

**Document ID:** GOV‑AIENG‑ACT‑001
**Program:** P‑AIENG · AI Engineering Governance Platform · Activation Task ACT‑001
**Classification:** Governance Program (Activation governance under GOV‑WS‑01 v1.5 §2.1)
**Status:** DRAFT — for Architectural Review, approval & freeze (no role activated by this document)
**Date:** 2026‑07‑21
**Reference Baseline:** `main` @ `72e090a`
**Builds on (frozen):** P‑AIENG‑000 · P‑AIENG‑S1 · P‑AIENG‑S2 · P‑AIENG‑S3 · GOV‑WS‑01 v1.5.

> **Purpose.** The governance program is complete: the organization is defined (000),
> operationalized (S1), certified (S2), and its execution framework specified (S3).
> **P‑AIENG‑ACT‑001 defines how the certified organization is brought into live
> operation** — **progressively, evidence‑driven, reversibly, and under continuous
> review**, with the **Chief Architect (R00) as final authority** at every step. It
> activates only a **limited subset** of roles first and advances by waves.
>
> **This document activates no role and spawns no agent.** It is the *governance
> instrument* that authorizes activation; each wave becomes operational **only** under a
> separate, explicit **Wave Activation Authorization** issued by the Chief Architect. Per
> the stop condition, **no engineering role may become operational except under this
> order.**

---

## 1 · Activation Principles (invariants)

1. **Progressive** — activation proceeds in ordered **waves**; a wave begins only after
   the previous wave meets its **exit criteria** and is explicitly authorized.
2. **Limited first** — only a **subset** of certified roles is activated in Wave 1.
3. **Evidence‑driven** — every activated role operates through its **certified profile**
   (S2) and the **execution framework** (S3), producing the required reports/evidence;
   activation health is judged on that evidence, not assertion.
4. **Reversible** — any activated role or wave can be **rolled back / deactivated** at
   any time without residual effect; activation never modifies a frozen artifact.
5. **Continuously reviewed** — the Chief Architect (R00) and Coordinator (R01)
   continuously review activation health; a failing indicator triggers pause or rollback.
6. **Bounded authority preserved** — activation grants **no new authority**; every role
   stays inside its certified profile and the platform invariants (no business/accounting/
   BO/Read‑Model/Constitution/GOV‑WS‑01 change; **no self‑approval**; **R00 final
   approval & freeze**).
7. **Explicit gate** — no role is operational without an explicit **Wave Activation
   Authorization**; silence is not activation.

## 2 · What "Operational" Means

A role is **operational** for a wave when it is explicitly authorized to *perform its
certified function on real Architectural Orders* within that wave's **authority ceiling**
(§3). Until then it is **specified & certified but dormant**. Operational status is per
role and per wave, and is always **revocable**.

## 3 · The Three Activation Waves

Activation advances through three waves. Each wave defines: **roles activated · authority
ceiling · entry criteria · exit criteria · evidence · rollback**.

### Wave 1 · Read‑Only Review Activation
- **Roles activated.** **R02 Architecture · R04 Quality (QA + Regression) · R05
  Engineering Investigation · R10 Documentation.** *(Read‑only reviewers.)*
- **Authority ceiling.** **Review & report only — NO authority to modify code or any
  artifact.** They consume artifacts and emit **RS‑T1 / RS‑T4** with evidence; they
  recommend, they do not change.
- **Entry criteria.** ACT‑001 approved & frozen; a low‑risk pilot Architectural Order
  selected; Coordinator (R01) available to orchestrate per S3.
- **Exit criteria (to Wave 2).** Over a defined pilot set: **100% review coverage**,
  **100% evidence completeness**, statuses reproducible, **zero** unrequested artifact
  changes by any review role, and R00 continuous‑review sign‑off that the reports are
  correct and useful.
- **Evidence.** RS‑T1/RS‑T4 per S1/S2; the S3 audit trail for each pilot order.
- **Rollback.** Deactivate any/all review roles instantly; no state to unwind (read‑only).

### Wave 2 · Assisted Execution
- **Roles activated.** Wave‑1 roles **+ R03 Implementation (assisted)**; R01 Coordinator
  orchestrating; R06/R07/R08/R09 join as read‑only reviewers as their triggers arise.
- **Authority ceiling.** **R03 may PREPARE proposals / draft corrections only.** **Actual
  execution (applying a change) and approval remain under the human engineer + Coordinator
  supervision** — no change is committed/merged on a role's own authority. Reviews
  (Wave‑1 roles) run on every proposal.
- **Entry criteria.** Wave 1 exit met + explicit Wave‑2 Authorization.
- **Exit criteria (to Wave 3).** Proposals are consistently correct and in‑scope; **zero
  unsupervised executions**; every proposal carried its evidence and passed independent
  review; R00 sign‑off.
- **Evidence.** Proposal drafts + review statuses + the human‑approved execution record.
- **Rollback.** Revoke R03's assisted status (back to Wave 1); discard un‑applied
  proposals; nothing was executed on a role's own authority, so there is nothing to revert.

### Wave 3 · Full Engineering Workflow
- **Roles activated.** The full organization (R01–R11) under the S3 execution framework.
- **Authority ceiling.** The complete engineering work cycle runs per S3 (orchestration →
  parallel review → investigation → consolidation → release readiness → **R00 review →
  approval → freeze**). **The Chief Architect (R00) remains the final authority for
  approval and freeze**; the Release Board (R11) never overrides a FAIL.
- **Entry criteria.** Wave 2 exit met + explicit Wave‑3 Authorization.
- **Exit criteria.** Steady‑state: the readiness metrics (S3 §11) consistently green
  across orders; the audit trail complete; no invariant breach.
- **Rollback.** Fall back to Wave 2 (or Wave 1) at any time; freeze remains R00‑only, so
  no change reaches `main` without R00 — the ultimate safety stop.

## 4 · Activation Governance (how a wave is authorized)

1. A wave is proposed only when the prior wave's **exit criteria** are demonstrably met
   (evidence + audit trail).
2. The Chief Architect issues an explicit **Wave Activation Authorization** (its own
   record) naming the wave, the roles, and the authority ceiling.
3. Activation is **recorded** in the S3 audit trail (append‑only): who was activated,
   when, under what ceiling, and the authorizing decision.
4. **Continuous review**: R00 + R01 monitor activation‑health metrics (§5); any breach
   pauses activation and may trigger rollback.
5. **No wave self‑advances** — advancing is always an explicit R00 decision.

## 5 · Activation‑Health Metrics (continuous review)

| Metric | Meaning | Healthy |
|---|---|---|
| Authority conformance | activated roles acting within their ceiling | **100%** |
| Review coverage / evidence completeness | S3 §11 metrics on activated work | **100%** |
| Unauthorized action count | actions beyond the wave's ceiling (e.g. a review role changing an artifact; an unsupervised execution) | **0** |
| Invariant‑breach count | any business/accounting/BO/Read‑Model/Constitution/GOV‑WS‑01 change attempted by a role | **0** |
| Golden Baseline | constitutional baseline under activated work | **12/12 unchanged** |
| Rollback readiness | ability to deactivate a role/wave cleanly | **always true** |

A non‑healthy metric **pauses** the wave and is escalated to R00 (rollback if warranted).

## 6 · Reversibility & Rollback

- Every activation is **revocable**: a role or wave can be **deactivated** by R00 at any
  time, returning to the prior wave or to fully‑dormant.
- Activation introduces **no persistent change** to any frozen artifact; Wave‑1/2 roles
  never commit; Wave‑3 changes still pass **only** through R00's freeze.
- Because **freeze is R00‑only**, no activated role can land a change on `main` without the
  Chief Architect — the permanent safety stop that makes the whole program reversible.

## 7 · Safety Invariants (unchanged by activation)

Activation grants **no** new authority. Every activated role remains bound by: its
certified profile (S2); the single‑responsibility, no‑self‑approval, bounded‑authority
rules (000); the FAIL‑blocks‑release and root‑cause rules (S1/S3); and the permanent
prohibition on changing business rules, accounting, Business Operations, Read Models, the
Constitution, or GOV‑WS‑01. The certified foundation and all frozen modules remain
untouched.

## 8 · Scope of This Document

- **This document defines the activation program only.** It **activates no role, spawns no
  agent, introduces no automation, and executes nothing.**
- **Each wave requires its own explicit Wave Activation Authorization** by the Chief
  Architect; Wave 1 does not begin merely because this order is approved.
- Approving & freezing ACT‑001 establishes *the authority to activate progressively* — the
  first concrete activation (Wave 1, on a low‑risk pilot order) is a **subsequent, explicit
  step** under this order.

## 9 · Success Criteria & Completion Boundary

- **Success.** A defined, gated path exists to bring the organization live **progressively,
  reversibly, and under continuous R00 review**, with a limited first subset, per‑wave
  authority ceilings, entry/exit criteria, health metrics, and rollback — with the Chief
  Architect retaining final approval & freeze throughout.
- **Completion boundary.** ACT‑001 is complete when this activation program is reviewed,
  approved, and frozen. **No engineering role becomes operational except under an explicit
  Wave Activation Authorization issued under this order.**

---

## Program map (for reference)

- **Foundation (frozen):** Accounting Constitution · Accounting Core · Certified Business
  Operations · GOV‑WS‑01 v1.5.
- **Operational Modules (frozen):** P2 · P3 · P4 · P‑DUES. **Observability (frozen):** P5.
- **Engineering Governance (frozen):** P‑AIENG‑000 · S1 · S2 · S3.
- **Activation (this order):** P‑AIENG‑ACT‑001 — progressive, waved, reversible, R00‑final.

---

*Specification only — this order authorizes progressive activation but activates nothing by
itself. After approval & freeze, stop and await an explicit Wave Activation Authorization
before any role becomes operational. Governance‑only; the certified foundation and all
frozen modules remain untouched.*
