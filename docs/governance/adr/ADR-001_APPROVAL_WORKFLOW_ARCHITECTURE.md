# ADR‑001 · Approval Workflow — Architecture Readiness (design only, inert)

> **Phase:** V1.2 (Architecture Preparation) · **Feature:** STR‑001 F‑03 · **Date:** 2026‑07‑22
> Schema: P‑AIENG‑S2 **RS‑ADR** (id · context · decision · alternatives · consequences · status).

**ID:** ADR‑001
**Status:** **Accepted (design only — NOT activated)**
**Authored under:** GOV‑013 pipeline · owner‑ratified at merge
**Owner mandate:** "Architecture Readiness Phase, not a Business Behaviour Phase. No production
behaviour shall change. No approval workflow shall execute. No approval screen shall appear."

---

## Context
The system today is **single‑company / single‑user**. A pre‑execution Approval Workflow is a
future capability that must **not** add runtime complexity now. This ADR designs the architecture
so a future V2 can activate approvals as **mostly configuration**, while V1.2 changes **no code and
no behaviour** — the system remains byte‑identical to V1.1.

The certified **Accounting Core** and **Business Operations (BO‑01…BO‑10)** are **frozen**; this
ADR therefore *specifies* the extension points **without modifying any frozen artifact**. Nothing
here is wired into a running path.

## Decision
Design an **inert, pluggable approval layer** defined entirely as interfaces, events, and a single
attachment point, with a **transparent pass‑through default** so behaviour is unchanged.

### 1 · Extension interfaces (specification — not code)
```
interface ApprovalPolicy {
  // pure, synchronous decision: does this operation need approval?
  requiresApproval(op: OperationContext): boolean
}
interface ApprovalProvider {
  // resolves an approval decision when policy requires one
  request(op: OperationContext): Promise<ApprovalOutcome>  // {approved, approver, reason, at}
}
interface OperationContext {
  kind: 'receipt'|'payment'|'edit'|'cancel'|'reclassify'|'split'|'member'|'dues'
  amount_ils?: number; movement_type?: string; actor: string; payload: object
}
```

### 2 · Domain events (append‑only, observational)
`OperationProposed` → `ApprovalRequired?` → `ApprovalGranted | ApprovalDenied` → `OperationCommitted`.
Events are **descriptive**, emitted around the existing commit; they carry no authority by themselves.

### 3 · Policy interface (parameterized — values deferred to activation)
`ApprovalPolicy` is configured, not hard‑coded. Concrete parameters (which operations; any amount
threshold; which lifecycle changes) are **activation‑time configuration in V2**, not decided here.
The scope options recorded for the future owner decision: *large payments ≥ threshold*, *all
payments*, *lifecycle changes (edit/cancel/reclassify/split)*, or a union.

### 4 · Approval providers (pluggable; default is a no‑op)
- **`NoApprovalProvider` (DEFAULT — the only one active in V1.1/V1.2 behaviour):** returns
  `{approved:true}` immediately. Single‑user reality ⇒ **transparent**; nothing appears, nothing blocks.
- Future providers (V2, by config): `SingleReviewerProvider`, `ThresholdRoleProvider`, etc.

### 5 · Execution hook (attachment point — specified, NOT installed)
A future activation attaches a **single pre‑commit hook** at the **Business Operations boundary**
(the one certified write path, e.g. `BusinessOps.createVoucher` / the edit/cancel/reclassify/split
operations) — never inside the Accounting Core. Design contract:
```
// FUTURE wiring (not present in V1.2):
//   if (policy.requiresApproval(ctx)) {
//     const outcome = await provider.request(ctx)
//     if (!outcome.approved) return refuse(outcome)   // atomic: nothing commits (Law 7)
//   }
//   ...existing certified commit unchanged...
```
Because the default policy/provider approve everything transparently, wiring this later is
behaviour‑neutral until real parameters + a real provider are configured.

### 6 · Future integration points
BO layer pre‑commit (above); an optional read‑only "pending approvals" projection in the
Observability layer (GOV‑WS‑01 §2.6, executes nothing); the audit log already records who/why
(Law 6) — approvals extend it, not replace it.

## Alternatives considered
- **Build the approval workflow now.** Rejected by owner mandate (single‑user; no runtime complexity).
- **Put hooks inside the Accounting Core / BOs now.** Rejected — those are frozen; and it would add
  runtime behaviour. The pre‑commit boundary keeps the Core untouched.
- **Skip the design.** Rejected — then V2 would be a redesign, not configuration.

## Consequences
- **Behaviour:** **unchanged** — no code added to any running path; system behaves exactly as V1.1.
- **Constitution:** untouched — approvals are additive control above certified operations; atomicity
  (Law 7), traceability (Law 6), custody (Law 8) are the contract a future provider must honor.
- **Future cost:** activation = configure a policy + choose a provider + wire the one documented
  pre‑commit hook ⇒ **mostly configuration, minimal code**.
- **Risk now:** none (design only).

## Status note
**Not activated.** No policy is configured, no provider but the transparent default exists, no hook
is installed, no screen is added. Activation is a future, owner‑gated V2 decision (business policy).
