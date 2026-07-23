# ADR‑002 · Liquidity Guard — Architecture Readiness (design only, inert)

> **Phase:** V1.2 (Architecture Preparation) · **Feature:** STR‑001 F‑04 · **Date:** 2026‑07‑22
> Schema: P‑AIENG‑S2 **RS‑ADR** (id · context · decision · alternatives · consequences · status).

**ID:** ADR‑002
**Status:** **Accepted (design only — NOT enforced)**
**Authored under:** GOV‑013 pipeline · owner‑ratified at merge · paired with ADR‑001
**Owner mandate:** "No liquidity restriction shall be enforced. No production behaviour shall
change. The architecture shall simply become ready for future activation."

---

## Context
A **Liquidity Guard** would prevent an operation from driving a treasury below a defined floor.
Today the system is single‑user and enforces no such floor at execution time. This ADR designs the
guard so a future V2 can activate it as **mostly configuration**, while V1.2 enforces **nothing**
and changes **no code and no behaviour** (identical to V1.1).

Constitutional anchor: **Law 9 (Historical Deficit Bounds)** already governs the deficit treasury
(a settlement may reduce the remaining deficit toward zero only; excess overflows to Food). The
Liquidity Guard is **additive** and must never re‑interpret or duplicate that rule — the deficit
treasury is intentionally negative and is **exempt** from any positive‑floor concept. The Accounting
Core and BOs are **frozen**; this ADR specifies attachment points **without touching them**.

## Decision
Design an **inert, pluggable liquidity policy layer** — an interface + events + one attachment
point — whose **default enforces nothing**, so behaviour is unchanged.

### 1 · Liquidity policy provider (specification — not code)
```
interface LiquidityPolicy {
  // pure, synchronous: is the projected post-operation position allowed?
  evaluate(projection: TreasuryProjection): LiquidityVerdict  // {ok} | {breach, fund, floor, projected}
}
interface TreasuryProjection {
  // computed from certified read models (FIN2.composed()) + the pending operation delta
  food_after: number; diwan_after: number; historical_deficit_after: number
  op: OperationContext
}
```
Projection is **derived** (Law 2) from the certified composed treasury view; the guard never holds a
second source of truth (Law 3).

### 2 · Enforcement modes (selected at activation — not chosen here)
The policy is configurable to one of the modes the owner will pick at activation:
- **Hard block at zero** — refuse if `food_after < 0` or `diwan_after < 0` (`historical_deficit` exempt).
- **Floor per fund** — refuse if `fund_after < fund_floor` (floors supplied at activation).
- **Warn + audited override** — allow, but require an explicit override reason (recorded, Law 6).
- **Off (DEFAULT — the only mode in V1.1/V1.2 behaviour):** `NoLiquidityPolicy.evaluate() ⇒ {ok}`.

### 3 · Domain events (append‑only, observational)
`LiquidityCheckRequested` → `LiquidityOk | LiquidityBreachDetected` → (`OverrideRecorded`?).
Descriptive only; carry no authority by themselves.

### 4 · Execution hook (attachment point — specified, NOT installed)
A future activation attaches a **single pre‑execution check** at the **Business Operations boundary**
(same boundary as ADR‑001; never inside the Accounting Core). Design contract:
```
// FUTURE wiring (not present in V1.2):
//   const verdict = policy.evaluate(projectAfter(op))
//   if (verdict.breach && mode !== 'warn') return refuse(verdict)   // atomic (Law 7)
//   if (verdict.breach && mode === 'warn') requireOverrideReason()  // audited (Law 6)
//   ...existing certified execution unchanged...
```
With the default **Off** policy this is behaviour‑neutral until a mode + floors are configured.

### 5 · Constitutional alignment & future integration points
- **Law 9** remains the sole authority on the deficit bound/overflow; the guard defers to it and
  exempts `historical_deficit`.
- Pairs with **ADR‑001** at one shared pre‑execution control point (P6‑000's paired recommendation).
- Optional read‑only "liquidity status" projection in the Observability layer (executes nothing).

## Alternatives considered
- **Enforce a floor now.** Rejected by owner mandate (no runtime restriction; single‑user).
- **Reuse/extend Law 9 for positive floors.** Rejected — Law 9 governs the deficit only; positive
  reserve floors are a different, additive policy that must not re‑interpret accounting semantics.
- **Compute projections in the UI.** Rejected — projection derives from the certified read models,
  never a second truth (Law 3).

## Consequences
- **Behaviour:** **unchanged** — default policy is Off; no code on any running path; identical to V1.1.
- **Constitution:** untouched; Law 9 unaffected; the guard is additive and deferential.
- **Future cost:** activation = pick a mode + supply floors + wire the one documented pre‑execution
  check ⇒ **mostly configuration, minimal code**.
- **Risk now:** none (design only).

## Status note
**Not enforced.** No mode is configured (default Off), no floors exist, no hook is installed, no
restriction applies. Activation is a future, owner‑gated V2 decision (business policy +
Constitutional Review).
