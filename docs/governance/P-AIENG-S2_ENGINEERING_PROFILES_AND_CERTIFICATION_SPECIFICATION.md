<!-- ═══════════════════════════════════════════════════════════════════════════
     P-AIENG-S2 — Engineering Profiles & Certification (SPECIFICATION)
     Governance program only. Elevates each engineering role (defined in
     P-AIENG-000, operationalized in P-AIENG-S1) into an INDIVIDUALLY CERTIFIED
     profile with mandatory inputs/outputs, competency, certification & acceptance
     criteria, reusable report specifications, inter-role interaction contracts,
     and traceability requirements. NO automation, NO implementation, NO code
     generation, NO runtime execution, NO business change. It touches NO Accounting
     Constitution / Accounting Core / Certified Business Operation / Read Model /
     GOV-WS-01 rule. Specification for owner review, approval & freeze.
     ═══════════════════════════════════════════════════════════════════════════ -->

# P-AIENG-S2 · Engineering Profiles & Certification — Specification

**Document ID:** GOV‑AIENG‑S2‑01
**Program:** P‑AIENG · AI Engineering Governance Platform · Task P‑AIENG‑S2
**Classification:** Governance Program (Governance Enhancement under GOV‑WS‑01 v1.5 §2.1)
**Status:** DRAFT — for Architectural Review, approval & freeze (no activation beyond this definition)
**Date:** 2026‑07‑21
**Builds on (frozen):** P‑AIENG‑000 (GOV‑AIENG‑SPEC‑01) · P‑AIENG‑S1 (GOV‑AIENG‑S1‑01) · GOV‑WS‑01 v1.5.

> **Purpose.** P‑AIENG‑000 *defined* the organization; P‑AIENG‑S1 *operationalized* it
> (profiles, templates, matrix, workflows, lifecycle). **P‑AIENG‑S2 certifies it**: it
> turns each role into an **individually certified profile** — a formal, reviewable unit
> with **mandatory inputs & outputs, competency requirements, certification criteria,
> acceptance criteria, reusable report specifications, interaction contracts** with the
> other roles, and **traceability requirements**. This is the "define the roles" step of
> the program's gradual path (specification → operationalization → **certification** →
> future gradual activation). **No automation, no implementation, no code generation, no
> runtime execution, no business change** occurs here.

---

## 1 · Scope & Non‑Goals

**In scope (defined by this document):** the **Certified Profile schema** (§4) · an
individually **certified profile per role** (§5) with mandatory inputs/outputs, competency,
certification & acceptance criteria · **reusable report specifications** (§6) · **inter‑role
interaction contracts** (§7) · **traceability requirements** (§8) · the **certification
process** by which a profile is ratified & frozen (§9).

**Out of scope (permanent for this slice):** any automation; any implementation or code
generation; any runtime execution; any live agent activation; any Business Operation /
Read Model / Accounting Core / Constitution / GOV‑WS‑01 change. **Operational activation of
the AI Engineering Organization is not authorized here** — it requires a dedicated
Architectural Order.

## 2 · Conformance

Every certified profile is a strict specialization of its P‑AIENG‑000 role and its
P‑AIENG‑S1 operational profile; nothing here extends authority, adds a role, or relaxes an
invariant. The **no‑self‑approval**, **single‑responsibility**, **bounded‑authority** rules
and the **Chief Architect's final authority** are preserved. Roles are identified by the
S1 roster IDs (R00 Chief Architect · R01 Coordinator · R02–R10 the nine teams · R11 Release
Board).

## 3 · Certification Principle

A role is **certified** when its profile is complete against the §4 schema, independently
reviewed against its **certification criteria**, and **approved & frozen** by the Chief
Architect. A role that is not certified may not (in any future activation phase) be
assigned mandatory work. Certification is a **governance state of the profile document**,
not the creation of any agent.

## 4 · Certified Profile Schema

Every role's certified profile (§5) is expressed against this fixed schema:

1. **Identity** — role ID + title + layer.
2. **Mandate** — the single responsibility (verbatim from S1), and the invariants it upholds.
3. **Mandatory Inputs** — the artifacts/records the role must receive to act (typed).
4. **Mandatory Outputs** — the record(s) the role must produce (typed; references a §6 report spec).
5. **Competency Requirements** — the knowledge/skills the role must demonstrably apply.
6. **Certification Criteria** — the objective conditions under which the profile is deemed correct and complete (what a reviewer checks to certify it).
7. **Acceptance Criteria** — the objective conditions a *single unit of the role's work* must meet to be accepted (PASS) within a phase.
8. **Interaction Contracts** — the upstream producers and downstream consumers it is bound to (references §7).
9. **Traceability Obligations** — the IDs/links the role must attach (references §8).

## 5 · Certified Role Profiles

*(Each profile below is complete against §4. Inputs/outputs are typed; competency,
certification, and acceptance criteria are objective and reviewable.)*

### R01 · Engineering Coordinator
- **Mandate.** Orchestration only (assign · sequence · consolidate · block); upholds scope & authority boundaries.
- **Mandatory Inputs.** The Architectural Order; the §5 participation row; all specialist **T1** reports; the evidence index.
- **Mandatory Outputs.** Task distribution record; **Consolidated Engineering Report (RS‑T2)**.
- **Competency.** Correctly classify a change to its participation row; detect out‑of‑scope/unauthorized work; assemble an evidence index; identify unresolved conflicts.
- **Certification Criteria.** Profile shows a deterministic mapping order→participants; a defined block condition; no authority to code/certify/approve.
- **Acceptance Criteria.** For a unit of work: every mandatory participant engaged; a complete RS‑T2 produced; all escalations logged; no self‑certification.
- **Interaction Contracts.** Consumes IC‑02…IC‑10 (specialist statuses); produces IC‑11 (to Release Board) and IC‑00 (to Chief Architect).
- **Traceability.** Attaches order‑id, artifact‑ref, and the full status matrix.

### R02 · Architecture Team
- **Mandate.** Boundary / dependency / layer / component‑type / design‑consistency conformance (GOV‑WS‑01 v1.5 §2–§5).
- **Mandatory Inputs.** The diff/spec; the component taxonomy; the dependency rules.
- **Mandatory Outputs.** **Specialist Status Report (RS‑T1)** with boundary & dependency findings.
- **Competency.** Apply v1.5 §2 (types), §4 (dependency directions), §5 (boundaries); recognize an illegal edge or misclassified component.
- **Certification Criteria.** Profile enumerates the exact rules it checks and the evidence it cites; carries no implementation authority.
- **Acceptance Criteria.** A status is accepted only if it names the rule(s) checked, the artifact location, and a verifiable finding.
- **Interaction Contracts.** Consumes IC‑01 (assignment); produces IC‑02 (status → Coordinator).
- **Traceability.** Rule‑id + artifact‑ref + finding‑id.

### R03 · Implementation Team
- **Mandate.** Build strictly within the ordered scope; no rule/accounting/BO/Constitution/GOV‑WS change; no self‑approval.
- **Mandatory Inputs.** The approved specification + Architectural Order.
- **Mandatory Outputs.** Implementation summary + diff + affected‑files list + self‑test output (as **evidence**, via RS‑T1).
- **Competency.** Implement to spec; produce runnable evidence (`node --check`, conformance tests); keep changes in scope.
- **Certification Criteria.** Profile forbids business/accounting change and self‑certification; requires evidence output.
- **Acceptance Criteria.** Diff is in scope; self‑tests attached; no certified‑spine change; independent review pending (never self‑PASS).
- **Interaction Contracts.** Consumes IC‑01; produces IC‑03 (artifact → all reviewers).
- **Traceability.** Commit/PR‑ref + files + test‑refs.

### R04 · Quality Team
- **Mandate.** QA · testing · regression detection · static analysis · bug detection.
- **Mandatory Inputs.** The change; the full test suites; the Golden Baseline.
- **Mandatory Outputs.** **RS‑T1** + test results, regression comparison, static‑analysis findings.
- **Competency.** Run & interpret the suites; compare to baseline; distinguish regression from expected change.
- **Certification Criteria.** Profile requires full‑suite + Golden‑Baseline evidence; forbids editing production code and approving own implementation.
- **Acceptance Criteria.** PASS only with full suite output + **Golden 12/12 unchanged** + before/after comparison showing no regression.
- **Interaction Contracts.** Consumes IC‑03; produces IC‑04; hands failures to R05 (IC‑Q5).
- **Traceability.** Suite‑run‑ref + baseline‑ref.

### R05 · Engineering Investigation Team
- **Mandate.** Root‑cause · reproduction · forensics · evidence · risk · incident investigation.
- **Mandatory Inputs.** The failure/incident + logs + reproduction context.
- **Mandatory Outputs.** **Root‑Cause Report (RS‑T4)**.
- **Competency.** Reproduce deterministically; isolate the true cause; assess risk; judge feasibility.
- **Certification Criteria.** Profile bars implementing the fix it probes; requires root cause or a justified infeasibility.
- **Acceptance Criteria.** RS‑T4 has reproduction + root cause (or documented INFEASIBLE) + risk; **no bug closes without it** where feasible.
- **Interaction Contracts.** Consumes IC‑Q5 (from Quality/any FAIL); produces IC‑05 (→ Coordinator, Implementation).
- **Traceability.** Incident‑id + reproduction‑ref + cause‑ref.

### R06 · Business Governance Team
- **Mandate.** Business‑rule / BO / Constitution / Accounting‑Core / Business‑Contract compliance.
- **Mandatory Inputs.** The change; the certified BO list; the Constitution; Part A contracts.
- **Mandatory Outputs.** **RS‑T1** + BO/Constitution/Contract conformance evidence.
- **Competency.** Detect business‑behaviour change, invented/duplicated BOs, or accounting logic outside the core.
- **Certification Criteria.** Profile bars authoring/amending BO/Constitution/Contract; requires conformance evidence.
- **Acceptance Criteria.** PASS only with evidence such as **0 direct `BusinessOps` calls** in a workspace and **Golden Baseline unchanged**; no behaviour drift.
- **Interaction Contracts.** Consumes IC‑03; produces IC‑06.
- **Traceability.** BO/rule‑id + code‑location + result.

### R07 · Data Integrity Team
- **Mandate.** Data validation · referential integrity · state consistency · read‑model verification · migration review.
- **Mandatory Inputs.** The change; the data model; read models; any migration.
- **Mandatory Outputs.** **RS‑T1** + integrity/consistency evidence.
- **Competency.** Verify referential integrity, read‑model equality, migration reversibility; find contradiction/orphan states.
- **Certification Criteria.** Profile bars destructive ops and model changes; requires integrity evidence.
- **Acceptance Criteria.** PASS only with proven integrity + read‑model equality + reviewed/reversible migration.
- **Interaction Contracts.** Consumes IC‑03; produces IC‑07.
- **Traceability.** Check‑id + dataset/model‑ref.

### R08 · Runtime Operations Team
- **Mandate.** Observability · logging · runtime health · deploy monitoring · performance · operational readiness.
- **Mandatory Inputs.** Build/deploy status; logs; runtime errors; metrics.
- **Mandatory Outputs.** **RS‑T1** + runtime health & readiness evidence.
- **Competency.** Read deploy/build signals, logs, error counts, E2E results; judge readiness.
- **Certification Criteria.** Profile bars business‑behaviour change; requires runtime evidence.
- **Acceptance Criteria.** PASS only with green build/deploy + **E2E pass, 0 page errors** + no new runtime errors.
- **Interaction Contracts.** Consumes IC‑03; produces IC‑08.
- **Traceability.** Deploy‑ref + log/metric‑ref.

### R09 · Security Team
- **Mandate.** Permission review · authorization validation · input validation · logical‑vulnerability prevention.
- **Mandatory Inputs.** The change; the authority model (`can.*`); input surfaces.
- **Mandatory Outputs.** **RS‑T1** + authorization & validation evidence.
- **Competency.** Verify authority gates, input validation, and absence of privilege escalation/leaks.
- **Certification Criteria.** Profile bars weakening controls; requires authz/validation evidence.
- **Acceptance Criteria.** PASS only with the gate checked + validation path + no escalation/leak.
- **Interaction Contracts.** Consumes IC‑03; produces IC‑09.
- **Traceability.** Gate‑id + validation‑ref.

### R10 · Documentation Team
- **Mandate.** ADRs · completion reports · roadmap updates · architectural records · technical docs.
- **Mandatory Inputs.** The decision/change; the governance templates & ADR trigger set (v1.5 §6).
- **Mandatory Outputs.** The required record(s) (ADR / Completion Report / roadmap update); **RS‑T1** for record‑completeness.
- **Competency.** Determine which records are required; produce them to pattern; never edit a frozen artifact in place.
- **Certification Criteria.** Profile requires new‑version discipline; requires ADR when a v1.5 §6 trigger fires.
- **Acceptance Criteria.** PASS only when every required record exists, references the artifact, and follows the frozen‑artifact rule.
- **Interaction Contracts.** Consumes IC‑01/IC‑11 (closeout); produces IC‑10.
- **Traceability.** Record‑ids + artifact/baseline‑refs.

### R11 · Release Board
- **Mandate.** Final Ready / Not‑Ready certification; **never proceed while any mandatory review = FAIL**.
- **Mandatory Inputs.** RS‑T2 (Consolidated) + all specialist statuses.
- **Mandatory Outputs.** **Release Readiness Report (RS‑T3)**.
- **Competency.** Read the status matrix; enforce the no‑FAIL rule; require documented acceptance for any WARNING.
- **Certification Criteria.** Profile bars overriding a FAIL and replacing the Chief Architect's authority.
- **Acceptance Criteria.** READY only when zero FAIL and every WARNING carries documented Chief‑Architect acceptance.
- **Interaction Contracts.** Consumes IC‑11 (from Coordinator); produces IC‑R0 (→ Chief Architect).
- **Traceability.** Status‑matrix‑ref + decision + reasons.

### R00 · Chief Architect (final authority — profiled for completeness)
- **Mandate.** Architectural Review → Approval → Freeze; final conflict resolution; WARNING acceptance.
- **Mandatory Inputs.** RS‑T2 + RS‑T3 + escalations.
- **Mandatory Outputs.** The Architectural Review decision (Approve / Return) and the Freeze record.
- **Certification / Acceptance.** Is the certifying authority; is not certified by a subordinate role (no self‑approval within the org applies to specialists, not to the external final authority).
- **Interaction Contracts.** Consumes IC‑00/IC‑R0; produces the ratification.

## 6 · Reusable Report Specifications

The S1 templates are hereby formalized as **versioned, reusable report specifications**
(RS). Each RS defines: required fields · field types · producing role · acceptance
condition. RS content is the S1 template body (§7 of GOV‑AIENG‑S1‑01), now with an
identifier and acceptance rule:

| RS | Name | Producer | Required fields (min) | Accepted when |
|---|---|---|---|---|
| **RS‑T1** | Specialist Status Report | R02–R10 | report‑id · agent · order · artifact · status · findings[] · evidence[] · conclusion · ts | status ∈ {PASS,WARNING,FAIL} **and** ≥1 evidence‑ref |
| **RS‑T2** | Consolidated Engineering Report | R01 | order · artifact · participation‑row · status‑matrix · escalations · evidence‑index · conclusion · ts | every mandatory participant present in the matrix |
| **RS‑T3** | Release Readiness Report | R11 | order · artifact · per‑team status · any‑FAIL? · any‑WARNING? · decision · reasons · ts | decision ∈ {READY,NOT‑READY}; READY ⇒ zero FAIL |
| **RS‑T4** | Root‑Cause Report | R05 | incident · artifact · symptom · reproduction · root‑cause│INFEASIBLE · fix‑direction · risk · ts | root cause present or justified infeasible |
| **RS‑ADR** | Architecture Decision Record | R10 | id · context · decision · alternatives · consequences · status | triggered by GOV‑WS‑01 v1.5 §6 |
| **RS‑CR** | Completion Report | R10 | per GOV‑P4‑CR‑01 / GOV‑PDUES‑CR‑01 pattern | at phase closeout |

An RS is **reusable**: any phase instantiates it by filling its fields; the spec (fields +
acceptance) does not change per phase. Amending an RS is a new RS version under governance.

## 7 · Interaction Contracts (between specialist roles)

Each interaction contract (IC) binds a **producer** to a **consumer** with a typed
artifact and a pre/post condition. No role consumes an artifact outside its contracts; no
role produces outside its mandate.

| IC | Producer → Consumer | Artifact | Precondition | Postcondition |
|---|---|---|---|---|
| IC‑01 | R01 → each participant | Task assignment | order in‑scope & authorized | participant knows its mandate & inputs |
| IC‑03 | R03 → R02,R04,R06,R07,R08,R09 | The artifact (diff/PR) | implementation in scope | reviewers can review a concrete artifact |
| IC‑02…IC‑10 | R02…R10 → R01 | RS‑T1 (or RS‑T4/records) | review complete + evidence | Coordinator can consolidate |
| IC‑Q5 | R04 (or any FAIL) → R05 | Failure hand‑off | a FAIL/incident exists | Investigation has context to reproduce |
| IC‑05 | R05 → R01, R03 | RS‑T4 | root cause established/infeasible | fix direction known; closure gated |
| IC‑11 | R01 → R11 | RS‑T2 | all mandatory statuses collected | Release Board can certify |
| IC‑R0 | R11 → R00 | RS‑T3 | zero FAIL (else NOT‑READY) | Chief Architect can review |
| IC‑00 | R01/R11 → R00 | Consolidated evidence + readiness | consolidation complete | Architectural Review can proceed |
| IC‑10 | R10 → record store | RS‑ADR / RS‑CR / roadmap | closeout or ADR trigger | governance record complete |

**Contract rules.** A consumer may reject an artifact that fails its precondition (routed
back via R01). No specialist bypasses R01 to influence another specialist's status
(independence). Every IC hand‑off is recorded (traceability, §8).

## 8 · Traceability Requirements

Every unit of work is traceable end‑to‑end by stable identifiers:

- **Order‑id** → **distribution‑id** → each **status‑id (RS‑T1)** → each **evidence‑id** →
  **consolidation‑id (RS‑T2)** → **readiness‑id (RS‑T3)** → **review/approval‑id** →
  **freeze‑id** → **record‑ids (RS‑ADR/RS‑CR)**.
- **Rules.** (1) every status references its order‑id and artifact‑ref (commit/PR); (2)
  every finding references the rule/BO/gate it concerns and its evidence‑id; (3) every
  evidence‑id is reproducible and points to a commit/PR/run; (4) every decision
  (READY/NOT‑READY, Approve/Return, Freeze) references the RS it rests on; (5) no artifact
  is accepted whose trace is broken. Traceability is a **documentation property**, not a
  runtime system.

## 9 · Certification Process (how a profile is certified & frozen)

1. **Draft** — the profile is written against the §4 schema (this document).
2. **Independent review** — reviewed against its **Certification Criteria** by a party
   other than its author (no self‑certification).
3. **Governance & Architectural Review** — checked for conformance to P‑AIENG‑000/S1 and
   GOV‑WS‑01 v1.5 (Decision Matrix §7: Architectural + Governance Review).
4. **Approval & Freeze** — the Chief Architect ratifies; the profile becomes **certified &
   frozen**; changes are new versions, never in‑place edits.
5. **Effect.** Only a certified role may (in a *future, separately‑ordered* activation
   phase) be assigned mandatory work. Certification here creates **no agent and no
   automation**.

## 10 · Acceptance & Success Criteria

- **Acceptance (per profile).** Complete against §4; objective certification & acceptance
  criteria; bound by its interaction contracts; carries its traceability obligations; adds
  no authority and breaks no invariant.
- **Success (program).** Every role is an individually certifiable profile; every mandatory
  interaction has a reusable report spec (§6) and an interaction contract (§7); traceability
  (§8) is defined end‑to‑end; a future phase can certify and (separately) activate roles
  **without inventing profile structure** — all before any agent or automation exists.

## 11 · Out of Scope & Completion Boundary

- **Out of scope (permanent for S2):** any automation; any implementation, code generation,
  or runtime execution; any live agent; any business/accounting/BO/Read‑Model/Constitution/
  GOV‑WS‑01 change.
- **Completion boundary.** S2 is complete when every role's certified profile, the reusable
  report specifications, the interaction contracts, and the traceability requirements are
  defined, reviewed, approved, and frozen. **Operational activation of the AI Engineering
  Organization remains unauthorized** without a dedicated Architectural Order.

---

*Specification only — after P‑AIENG‑S2 is completed, stop and await Architectural Review.
No operational activation of the AI Engineering Organization is authorized without a
dedicated Architectural Order. Governance‑only; the certified foundation and all frozen
modules remain untouched.*
