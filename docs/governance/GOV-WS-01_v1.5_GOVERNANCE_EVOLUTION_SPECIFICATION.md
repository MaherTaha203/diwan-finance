<!-- ═══════════════════════════════════════════════════════════════════════════
     GOV-WS-01 v1.5 — Governance Evolution Specification (SPECIFICATION ONLY)
     A governance specification for owner review, approval & freeze. It introduces
     NO code, NO application-logic change, and NO change to the Accounting
     Constitution / Accounting Core / Certified Business Operations. It preserves
     the six v1.4 Business-Workspace Design Rules VERBATIM (backward compatible)
     and adds the platform-wide governance framework the current architecture needs.
     Upon approval & freeze it SUPERSEDES v1.4 and becomes the single governance
     reference for every architectural decision after P6.
     ═══════════════════════════════════════════════════════════════════════════ -->

# GOV‑WS‑01 v1.5 · Governance Evolution Specification

**Document ID:** GOV‑WS‑01
**Version:** 1.5 (DRAFT — for owner review, approval & freeze)
**Status:** SPECIFICATION · supersedes v1.4 upon freeze
**Date:** 2026‑07‑21
**Baseline:** `main` @ `c1f528e`
**Predecessors (frozen):** P0 · P1 · P2 · P3 · P4 · P5‑OBS · P6‑000 · GOV‑WS‑01 v1.4 (Rules 1–6).

> **Nature.** v1.5 is an **additive** governance evolution. It **does not change a
> single one of the six v1.4 Business‑Workspace Design Rules** — they are carried
> forward *verbatim* (see §9). What v1.5 adds is the **platform‑level** framework the
> program has been using implicitly since P5/P6: an official component taxonomy, the
> canonical layer diagram, dependency and boundary rules for *all* component types
> (not only Business Workspaces), the ADR trigger set, a governance decision matrix,
> and formal scope classification. After approval and freeze, **this document is the
> single governance reference for every architectural decision after P6**, and the
> foundation for opening P‑DUES‑000 and all later phases.

---

## 1 · Executive Summary

Through P4, "GOV‑WS‑01" governed **Business Workspaces** — how an operational surface
must be built (the six Design Rules). That was sufficient while every new unit was a
Business Module. **P5 and P6 changed the shape of the platform:**

- **P5‑OBS** introduced a genuinely new *kind* of component — an **Observability
  Layer** that reads certified state and **executes nothing** (Rule 4 N/A). The rules
  vocabulary had no first‑class name for it; it was governed by analogy.
- **P6‑000** classified every remaining candidate and surfaced component *types* the
  program treats as real but had never formally defined — **Cross‑Cutting Capability**
  (GAP‑P1 + GAP‑P2), **Platform Infrastructure** (the cash‑location foundation a Cash
  Management module would need), and **Governance Enhancement** — plus a discovered
  **non‑financial Operational Module** (Reservations) sitting outside the certified spine.

The governance framework now lags the architecture it governs. Before the next
Operational Business Module is opened, the framework must be evolved so that **every
component type that now exists has an official definition, an allowed/forbidden
dependency set, a lifecycle, and a review path** — and so that classifying and gating
future work is deterministic rather than case‑by‑case. That is the purpose of v1.5.

v1.5 is deliberately **conservative**: it renames nothing, moves no code, and changes
no rule. It *records* and *systematises* the architecture the program already built.

---

## 2 · Official Platform Component Taxonomy

Every artifact in the platform is **exactly one** of the following eight component
types. (The first four are the certified **Foundation**; the next three are the
**runtime application layers**; the last is a **supporting** layer.)

For each type: **Purpose · Responsibilities · Allowed dependencies · Forbidden
dependencies · Lifecycle · Review requirements.**

### 2.1 · Governance
- **Purpose.** Define how the platform is allowed to evolve; hold the rules, taxonomy,
  ADRs, specifications, completion reports, and roadmap.
- **Responsibilities.** Classify candidates; set dependency/boundary rules; gate every
  change; record baselines. Owns *no* runtime behaviour.
- **Allowed dependencies.** May reference every other component (to govern it).
- **Forbidden dependencies.** No runtime component may depend on Governance at runtime;
  Governance contains no executable business/accounting logic.
- **Lifecycle.** Versioned documents; changed only by a **new version** with a
  version‑history entry — never in‑place (frozen‑artifact discipline).
- **Review requirements.** Governance Review + Architectural Review; owner approval &
  freeze.

### 2.2 · Accounting Constitution
- **Purpose.** The supreme, frozen financial reference (P0): invariants, conservation,
  the historical‑deficit bound.
- **Responsibilities.** Define what must always hold; bound the Accounting Core.
- **Allowed dependencies.** None (it is the top financial authority).
- **Forbidden dependencies.** Must not depend on any lower layer; must never embed UI,
  workspace, or module concerns.
- **Lifecycle.** Frozen; amended only by an explicit Constitutional Review + a new
  certificate, never casually.
- **Review requirements.** **Constitutional Review** (mandatory) + Governance Review.

### 2.3 · Accounting Core
- **Purpose.** The sole executor of financial logic (FIN / FIN2 / FinContract + atomic
  RPCs); the single canonical source of every balance and treasury figure.
- **Responsibilities.** Compute and persist certified financial state; expose certified
  **Read Models**; enforce the Constitution's invariants.
- **Allowed dependencies.** The Accounting Constitution only.
- **Forbidden dependencies.** Must not depend on Business Operations, modules,
  observability, or infrastructure specifics; must hold no presentation logic.
- **Lifecycle.** Frozen; changes require re‑proving the Golden Baseline + deficit bound.
- **Review requirements.** Constitutional Review (if an invariant is touched) +
  Architectural Review; Golden‑Baseline re‑verification.

### 2.4 · Certified Business Operations
- **Purpose.** The **only** way to change financial state (BO‑01…BO‑10; BO‑06 reserved).
- **Responsibilities.** Execute a bounded state transition atomically, re‑verifying
  conservation/exactness/derivation against the core; the *how* of every mutation.
- **Allowed dependencies.** The Accounting Core (and, through it, the Constitution).
- **Forbidden dependencies.** Must not depend on any workspace/module/observability
  surface; must not contain presentation logic.
- **Lifecycle.** Certified; a **new** operation (or a change to one) requires a Business‑
  Contract (Part A) amendment and certification.
- **Review requirements.** Business Contract Amendment + Architectural Review; Constitu‑
  tional Review if it touches a bounded quantity (e.g. BO‑06 / the deficit).

### 2.5 · Operational Business Modules
- **Purpose.** Own a domain workflow; a Business Workspace that *executes* work by
  orchestrating certified Business Operations (P2/P3/P4; next: Annual Dues).
- **Responsibilities.** Present State/History/Capability; decide *whether* an operation
  is legitimate; route execution to a certified BO; read results from certified Read
  Models. Governed by **the six Design Rules (Rules 1–6)**.
- **Allowed dependencies.** Certified Read Models (read) + Certified Business Operations
  (write); Cross‑Cutting Capabilities exposed to it; Platform Infrastructure.
- **Forbidden dependencies.** No direct Accounting‑Core mutation; no accounting logic;
  no second source of truth; no dependency on another module's internals.
- **Lifecycle.** Spec (`P‑xxx‑000`) → gated slices → Completion Report → **FROZEN**.
- **Review requirements.** Architectural Review per slice; Governance Review at spec &
  closeout; a conformance test per slice; Golden Baseline unchanged.

### 2.6 · Observability Layers
- **Purpose.** Present certified state for oversight **above** the operational modules;
  **execute nothing** (P5 Treasury).
- **Responsibilities.** Project certified Read Models into a unified read‑only view
  (State + History) with read/navigation/export affordances only.
- **Allowed dependencies.** Certified Read Models (read‑only); navigation into modules.
- **Forbidden dependencies.** **No** Business Operation, **no** mutation, **no**
  accounting logic, **no** second source of truth, and **no re‑interpretation of
  accounting semantics** — an Observability Layer presents certified figures with their
  certified *meaning*; it must never relabel, re‑bucket, re‑derive, net, or re‑aggregate
  them into a new accounting meaning (any such transformation is accounting logic and
  belongs to the Accounting Core). **Rule 4 does not apply** (nothing is executed).
- **Lifecycle.** Spec (`P‑xxx‑OBS‑000`) → (typically one) read‑only slice → Completion
  Report → **FROZEN**.
- **Review requirements.** Architectural Review; a conformance test proving read‑only /
  no‑BO / no‑mutation; Golden Baseline unchanged.

### 2.7 · Cross‑Cutting Capabilities
- **Purpose.** A control/behaviour that spans multiple modules (e.g. an approval
  lifecycle or a liquidity guard across voucher types — GAP‑P1 / GAP‑P2).
- **Nature — horizontal, not hierarchical.** A Cross‑Cutting Capability is **not a
  hierarchical layer** in the certified stack: it does not sit "above" or "below" the
  Operational Modules, and nothing depends *downward through* it. It is a **horizontal
  capability** that attaches **sideways** to several modules at a declared seam. Its
  placement in the §3 diagram is an *attachment point across* modules, **not a rank** in
  the dependency order.
- **Responsibilities.** Provide a shared control at a well‑defined seam (typically a
  pre‑execution gate); own its own control‑state, not the domain state it gates.
- **Allowed dependencies.** Certified Read Models (read); Certified Business Operations
  (it usually *requires a new certified BO*); the modules it gates, via a declared seam.
- **Forbidden dependencies.** Must not duplicate a module's domain logic; **must not own
  Domain Entities** (members, vouchers, funds, subscriptions, reservations — those belong
  to the Operational Modules and the Accounting Core, never to a capability); must not
  bypass the certified write path; must not become a general‑purpose engine beyond its
  declared seam.
- **Lifecycle.** ADR(s) → (usually) a new certified BO + Business‑Contract amendment →
  spec → gated slices → Completion Report → **FROZEN**.
- **Review requirements.** **Mandatory ADR** + Architectural Review + Business Contract
  Amendment; Constitutional Review if it introduces a financial invariant (e.g. a
  liquidity bound).

### 2.8 · Platform Infrastructure
- **Purpose.** Foundational technical capability beneath the business layers
  (persistence/DB access, identity/authority, audit log, i18n, UI shell/navigation,
  build/test tooling).
- **Responsibilities.** Provide reliable technical services to every layer. **Must never
  contain business rules or accounting logic.**
- **Allowed dependencies.** External runtime/platform only (e.g. Supabase, the browser).
- **Forbidden dependencies.** Must not depend on modules/observability/capabilities; must
  not embed a business or accounting decision (those live in the certified layers).
- **Lifecycle.** Conventional engineering change control; an ADR when it introduces
  shared runtime behaviour or a new foundational concept.
- **Review requirements.** Architectural Review; ADR when it changes shared behaviour;
  no Constitutional impact (by definition, it holds no accounting).

---

## 3 · Architectural Layer Diagram (canonical)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              GOVERNANCE                                     │  governs all;
│         (rules · taxonomy · ADRs · specs · completion reports · roadmap)    │  no runtime role
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲ governs ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  FOUNDATION (certified, frozen)                                            │
│                                                                           │
│   Accounting Constitution                                                  │
│            ▼ (bounds)                                                       │
│   Accounting Core  ──exposes──▶ Certified Read Models                       │
│            ▼ (executes via)                                                 │
│   Certified Business Operations  (the only write path)                     │
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲ read        ▲ write (BO only)
┌───────────────────────────────────────────────────────────────────────────┐
│  RUNTIME APPLICATION LAYERS                                                │
│                                                                           │
│   Operational Business Modules   (P2 · P3 · P4 · … execute via BOs)         │
│     ◀───────────────────────────────────────────────────────────────▶      │
│     │  Cross‑Cutting Capabilities  (HORIZONTAL — shared controls that       │
│     │  attach SIDEWAYS to modules at a declared seam; NOT a stack rank)     │
│     ◀───────────────────────────────────────────────────────────────▶      │
│            ▼ observed by                                                    │
│   Observability Layers           (P5 Treasury · read‑only projection)       │
│            ▼ feed                                                           │
│   Reports / Export               (read‑only outputs)                        │
└───────────────────────────────────────────────────────────────────────────┘

        ┌───────────────────────────────────────────────────────────────┐
        │  PLATFORM INFRASTRUCTURE  (persistence · identity · audit ·    │  supporting;
        │  i18n · UI shell/nav · tooling) — supports every layer         │  NEVER contains
        │  and MUST NEVER contain business or accounting rules           │  business rules
        └───────────────────────────────────────────────────────────────┘
```

**Reading the diagram.** Governance sits above everything (it governs, it does not
run). The certified Foundation is the spine: Constitution → Core → (Read Models /
Business Operations). Operational Modules execute *only* through Business Operations
and read *only* through Read Models; Cross‑Cutting Capabilities attach **horizontally**
across modules as shared controls (a sideways seam, **not** a layer in the rank);
Observability Layers sit *above* modules as read‑only projections;
Reports/Export are the read‑only tail. Platform Infrastructure is a *supporting* column
touching every layer technically but **holding no business rule**.

---

## 4 · Dependency Rules

**Allowed directions** (a component may depend only *downward* into the certified spine,
plus laterally through *declared seams*):

| From | May depend on |
|---|---|
| Governance | (references everything, to govern; no runtime dependency) |
| Accounting Constitution | nothing |
| Accounting Core | Accounting Constitution |
| Certified Business Operations | Accounting Core (→ Constitution) |
| Operational Business Module | Certified Read Models (read) · Certified Business Operations (write) · declared Cross‑Cutting Capabilities · Platform Infrastructure |
| Cross‑Cutting Capability | Certified Read Models (read) · Certified Business Operations (write, incl. its own new BO) · the modules it gates via a declared seam · Platform Infrastructure |
| Observability Layer | Certified Read Models (read‑only) · navigation into modules · Platform Infrastructure |
| Reports / Export | Certified Read Models (read‑only) · Observability projections |
| Platform Infrastructure | external runtime only |

**Prohibited directions** (non‑exhaustive; each is a hard violation):

- **Upward dependencies into the Foundation are forbidden**: the Constitution/Core/BOs
  must never depend on a module, capability, observability layer, report, or
  infrastructure detail.
- **No layer may bypass the certified write path**: only Certified Business Operations
  mutate financial state. Modules/capabilities/observability must never write to the
  Accounting Core directly.
- **Observability Layers must never depend on Business Operations** (they execute
  nothing) and must never hold a second source of truth.
- **Platform Infrastructure must never depend on business layers** and must never
  contain business/accounting rules.
- **Modules must not depend on another module's internals** — only on the certified
  spine and on declared Cross‑Cutting seams.
- **Governance must not be a runtime dependency** of any component.

---

## 5 · Component Boundary Rules

For each runtime/supporting type: **ownership · responsibilities · business logic ·
accounting logic · read/write · state ownership · testing expectations.**

### 5.1 · Operational Business Modules
- **Ownership.** Owns a domain workflow and its workspace; declares owns / does‑not‑own
  (Rule 5).
- **Responsibilities.** State / History / Capability (Rule 3); one Primary Business
  Question (Rule 2); Intent/Authorization/Execution/Result (Rule 4).
- **Business logic.** May decide *whether* an operation is legitimate; **may not** hold
  domain calculation that belongs to a BO.
- **Accounting logic.** **None** — ever.
- **Read/write.** Read certified Read Models; write **only** via certified BOs.
- **State ownership.** Owns *no* financial state; the certified state is the single
  source (Rule 1, Rule 6).
- **Testing.** A conformance test per slice (routing, boundary, no‑BO‑in‑workspace,
  read‑model sourcing); Golden Baseline unchanged.

### 5.2 · Observability Layers
- **Ownership.** Owns a read‑only unified view above the modules.
- **Responsibilities.** State + History projections; read/navigation/export only.
- **Business logic.** **None** (no legitimacy decisions, no workflow).
- **Accounting logic.** **None** — and **no re‑interpretation of accounting semantics**:
  no relabelling, re‑bucketing, netting, or re‑deriving of a certified figure's meaning.
  A displayed value equals a certified Read Model **with its certified meaning intact**.
- **Read/write.** **Read‑only**; **no** write path at all.
- **State ownership.** Owns *no* state; every figure equals a certified Read Model (Rule
  6). **Rule 4 N/A.**
- **Testing.** A conformance test proving read‑only, zero Business‑Operation calls, zero
  mutation, and read‑model equality.

### 5.3 · Cross‑Cutting Capabilities
- **Ownership.** Owns a shared control and *its own control‑state* (e.g. a pending‑
  approval record), at a declared seam.
- **Responsibilities.** Provide the control (e.g. gate execution) uniformly across the
  modules it serves.
- **Business logic.** Owns the *control* logic (approve/reject, guard evaluation); **must
  not** duplicate a module's domain logic.
- **Accounting logic.** Only through a **certified** operation it introduces; never
  inline. A financial precondition (e.g. liquidity) is an invariant subject to
  Constitutional Review.
- **Read/write.** Read certified Read Models; write via a certified BO (usually its own
  new one); never bypass the write path.
- **State ownership.** Owns only its control‑state (e.g. a pending‑approval record);
  **never owns a Domain Entity** (member, voucher, fund, subscription, reservation) and
  never the domain/financial state it gates — those remain owned by the Operational
  Modules and the Accounting Core.
- **Testing.** Conformance tests for the control at each gated module; a certification
  test for any new BO; Golden Baseline unchanged.

### 5.4 · Platform Infrastructure
- **Ownership.** Owns technical services (persistence, identity/authority, audit, i18n,
  UI shell/nav, tooling).
- **Responsibilities.** Reliable, generic technical capability for all layers.
- **Business logic.** **Explicitly forbidden.** Platform Infrastructure must contain **no
  business rule, no legitimacy decision, no workflow, no domain branching, and no
  accounting decision** of any kind. It provides the *mechanism* (persist, authenticate,
  log, render, translate) and never the *policy*. Any business/accounting logic found in
  infrastructure is a boundary violation and must be moved to an Operational Module, a
  Cross‑Cutting Capability, or the certified Foundation.
- **Accounting logic.** **Explicitly forbidden** (as above — infrastructure holds no
  financial meaning or computation).
- **Read/write.** Provides the *mechanism* for read/write; makes no business decision
  about them.
- **State ownership.** Owns technical/session state only — never financial or domain
  state.
- **Testing.** Technical/integration tests; must demonstrate it embeds no business rule.

### 5.5 · Governance
- **Ownership.** Owns the rules, taxonomy, ADRs, specs, reports, roadmap, baselines.
- **Responsibilities.** Classify, gate, review, and record every change.
- **Business logic / Accounting logic.** **None** — documentation and process only.
- **Read/write.** Neither at runtime; it produces versioned documents.
- **State ownership.** Owns the *governance record*, not runtime state.
- **Testing.** Not executable; "tested" by review, approval, and freeze.

---

## 6 · ADR Requirements

An **Architecture Decision Record (ADR)** is **mandatory** before work proceeds whenever
a proposal would:

1. **Introduce a new component type** (anything not already in the §2 taxonomy).
2. **Change a layer's responsibilities** (e.g. give a module a capability it did not own).
3. **Change a dependency direction** (any edge not permitted in §4, including a new
   declared cross‑cutting seam).
4. **Introduce shared runtime behaviour** (a control/behaviour used by more than one
   module — every Cross‑Cutting Capability).
5. **Introduce or activate a Certified Business Operation** (including the reserved
   BO‑06) or otherwise extend the certified write path.
6. **Introduce a new financial invariant or precondition** (also triggers Constitutional
   Review — e.g. a liquidity bound).
7. **Introduce a new Platform Infrastructure concept** that other layers will build on
   (e.g. a cash‑location model).
8. **Remove, retire, or merge an existing architectural component type** from the §2
   taxonomy. A deletion is as architecturally significant as an introduction — it changes
   what the platform is permitted to contain and what every downstream classification may
   choose — so retiring a component type (or collapsing two types into one) is an
   ADR‑mandatory decision, never a silent edit.

An ADR is **not** required for: a new Operational Module or Observability Layer that
follows an existing pattern with no new dependency edge and no new BO (a spec + slice
orders suffice); routine within‑layer changes that touch no boundary. *(v1.5 defines
**when** an ADR is required; it authors none.)*

---

## 7 · Governance Decision Matrix

For any future proposal, the required gates are determined by what it touches. **✔ =
required · — = not required.** (Architectural Review and Governance Review apply to
essentially all structural changes; the differentiators are the first three columns.)

| Proposal touches → | ADR | Constitutional Review | Business Contract Amendment | Architectural Review | Governance Review |
|---|:--:|:--:|:--:|:--:|:--:|
| New Operational Business Module (existing pattern, no new BO) | — | — | — | ✔ | ✔ |
| New Observability Layer (read‑only, no BO) | — | — | — | ✔ | ✔ |
| New Cross‑Cutting Capability (new BO + seam) | ✔ | (if new invariant) | ✔ | ✔ | ✔ |
| New / activated Certified Business Operation (e.g. BO‑06) | ✔ | (if bounded quantity) | ✔ | ✔ | ✔ |
| Change to Accounting Core computation | — | ✔ | (if BO contract changes) | ✔ | ✔ |
| Change to the Accounting Constitution | — | ✔ | (if it cascades) | ✔ | ✔ |
| New financial invariant / precondition (e.g. liquidity guard) | ✔ | ✔ | (if enforced in a BO) | ✔ | ✔ |
| New Platform Infrastructure concept (e.g. cash‑location model) | ✔ | — | — | ✔ | ✔ |
| New dependency direction / cross‑cutting seam | ✔ | — | — | ✔ | ✔ |
| Governance rule / taxonomy change (a GOV‑WS version bump) | (if new type) | — | — | ✔ | ✔ |
| Change to a frozen module (reopening) | ✔ | (if financial) | (if BO changes) | ✔ | ✔ |

**How to read it.** Start from the row that best matches the proposal; every ✔ is a
mandatory gate that must be cleared *before* implementation. A proposal matching several
rows takes the **union** of their gates.

---

## 8 · Scope Governance (discovery → classification, before implementation)

### 8.1 · Architectural Discovery (mandatory — precedes classification)

**Classification must be preceded by an Architectural Discovery step.** Before a
candidate can be placed in a category, a discovery pass over the repository and the
certified surface is required to establish the *facts* the classification depends on:

- what **already exists** that the candidate could reuse — certified Read Models,
  Certified Business Operations, prior modules, existing infrastructure;
- what the candidate would **truly require** — a new certified BO? a new invariant? a
  new foundational concept? a new dependency edge?
- whether the candidate is **already partly built** or lives **outside the certified
  spine** (as discovery surfaced the non‑financial Reservations module in P6‑000);
- which §2 component type the facts point to — and which they rule out.

Discovery prevents mis‑classification (e.g. calling a Platform‑Infrastructure gap a
"module", or forcing an Observability Layer into the Business‑Module frame). Its output
is the evidence base for the classification that follows. **Only after Discovery is a
candidate classified.**

### 8.2 · Classification

**No implementation may begin until a candidate is classified** into exactly one of the
following, via an assessment in the P6‑000 style (discovery‑first, then classification):

| Category | Meaning | Typical gate before build |
|---|---|---|
| **Operational Business Module** | Owns a domain workflow; executes via certified BOs | Module spec + slice orders (ADR only if it needs a new BO/edge) |
| **Observability Layer** | Read‑only projection above modules; executes nothing | OBS spec + read‑only slice |
| **Cross‑Cutting Capability** | Shared control across modules | ADR + Business Contract amendment (+ Constitutional Review if a financial invariant) |
| **Platform Infrastructure** | Foundational technical capability; no business rules | ADR (if shared behaviour/new concept) |
| **Governance** | Rules/taxonomy/process change | New GOV‑WS version + Governance Review |
| **Deferred** | Valid but blocked on a policy/foundation/trigger decision | Recorded in the roadmap backlog; no phase opened |
| **Out of Scope** | Not the platform's responsibility | Recorded; explicitly not built |

The classification is **binding**: a candidate classified *Deferred* or *Out of Scope*
cannot be built until re‑classified by a new assessment; a candidate classified
*Cross‑Cutting Capability* cannot be shipped as a mere workspace without its ADR and
contract gate. *(This is exactly how P6‑000 classified GAP‑P1/GAP‑P2, BO‑06, Cash
Management, Governance Enhancements, and the discovered Reservations module.)*

---

## 9 · Backward Compatibility

v1.5 is **purely additive**. It verifiably introduces:

- **Zero business‑rule changes** — the six Design Rules (Rules 1–6) are carried forward
  **verbatim** from v1.4; no rule is altered, weakened, or removed.
- **Zero accounting changes** — the Accounting Constitution, Accounting Core, and
  Certified Business Operations are untouched (v1.5 only *describes* their roles).
- **Zero runtime‑behaviour changes** — no code, no UI, no module, no read/write model is
  modified; every frozen module (P2/P3/P4/P5‑OBS) is unchanged and remains conformant.
- **Zero migration requirements** — see §10.

The v1.4 rules remain in force exactly as written; v1.5 **wraps** them in the platform‑
level framework (§2–§8) and **supersedes v1.4 only as the document version** upon freeze.

## 10 · Migration Impact

**None.** v1.5 changes no runtime artifact, so there is nothing to migrate: no schema,
no data, no code path, no test. Existing conformance suites (Golden 12/12; P2/P3/P4/
P5‑OBS slice tests; deficit bound; E2E) remain valid **unchanged** — v1.5 does not
require re‑running them because it alters nothing they assert. The Golden Baseline is,
by construction, untouched.

## 11 · Future Governance Recommendations

For the next architectural generations (recommendations only — none authorized here):

1. **Adopt a lightweight ADR log** (`docs/adr/NNNN-*.md`) now that §6 defines the
   triggers — so the first Cross‑Cutting Capability (GAP‑P1/P2) opens with ADR‑0001.
2. **Add a per‑type conformance‑test template** to make §5 testing expectations
   mechanical (as the workspace conformance tests already are).
3. **Formalise the "declared seam"** artifact for Cross‑Cutting Capabilities — a small
   spec section that names exactly where a capability plugs into each module it gates.
4. **Introduce a "non‑financial module" governance note** to place components like the
   Reservations calendar under governance without pulling them into the certified
   accounting spine (per the P6‑000 Reservations ruling).
5. **Version the taxonomy independently** if component types proliferate, so a new type
   is a small, reviewable delta rather than a whole‑document revision.
6. **Keep the roadmap/baseline record (`GOV‑PROG‑BR‑01`) as the running index** of what
   is frozen, deferred, and open — updated at every closeout.

---

## 12 · Preserved v1.4 Rules (carried forward verbatim — normative)

The following six rules are **unchanged** from v1.4 and remain fully normative under
v1.5. (Reproduced by reference to their v1.4 text; not re‑worded.)

- **Rule 1 · Preserve the layering** — every Business Workspace reads only certified read
  models and acts only through certified Business Operations (every Business Workspace).
- **Rule 2 · One dominant Primary Business Question** (every Business Workspace).
- **Rule 3 · Distinguish State, History, and Capability** (every Business Workspace).
- **Rule 4 · Separate Intent, Authorization, Execution, and Result** (every **Operational**
  Workspace; **N/A** to Observability Layers, which execute nothing).
- **Rule 5 · Declare the Business Boundary — owns / does not own** (every Business Module).
- **Rule 6 · One source of operational truth** (every Business Workspace).

v1.5 adds **no seventh rule**; the six stand as the workspace‑level rules, now set inside
the platform‑level framework of §2–§8.

---

## Version history

- **1.0** — Rules 1–2 (P2‑S2).
- **1.1** — added Rule 3 (P2‑S3). Supersedes 1.0.
- **1.2** — added Rule 4 (P3‑000). Supersedes 1.1.
- **1.3** — added Rule 5 (P4‑000). Supersedes 1.2.
- **1.4** — added Rule 6 (P4‑S1). Supersedes 1.3.
- **1.5** — *(this specification, pending final approval & freeze)* — **additive platform
  governance evolution**: official Component Taxonomy (§2), canonical Layer Diagram (§3),
  Dependency Rules (§4), Component Boundary Rules (§5), ADR Requirements (§6), Governance
  Decision Matrix (§7), and Scope Governance (§8). **Changes none of Rules 1–6.**
  Supersedes 1.4 as the single governance reference upon freeze.
  - **1.5 · review amendments (PR #123 — Approved with minor architectural amendments):**
    (1) clarified Cross‑Cutting Capabilities as a **horizontal** capability, not a
    hierarchical layer (§2.7, §3); (2) added an **explicit** prohibition of Business
    Logic in Platform Infrastructure (§5.4); (3) prohibited owning **Domain Entities**
    inside Cross‑Cutting Capabilities (§2.7, §5.3); (4) prohibited **re‑interpreting
    accounting semantics** inside Observability Layers (§2.6, §5.2); (5) added a mandatory
    **Architectural Discovery** phase before Classification in Scope Governance (§8.1);
    (6) added an **ADR trigger for removing/retiring a component type** (§6.8).

---

*Specification only — no implementation is authorized. Upon owner review, approval, and
freeze, GOV‑WS‑01 v1.5 becomes the single governance reference for every architectural
decision after P6, and the foundation for opening P‑DUES‑000 and all subsequent phases.*
