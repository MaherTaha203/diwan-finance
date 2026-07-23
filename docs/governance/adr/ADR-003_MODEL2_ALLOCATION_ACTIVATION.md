# ADR‑003 · MODEL2 Activation & Explicit Stored Allocation

> **Owner Decision:** OD‑01 (Constitutional Decision Session) · **Date:** 2026‑07‑23
> Schema: P‑AIENG‑S2 **RS‑ADR** (id · context · decision · alternatives · consequences · status).

**ID:** ADR‑003
**Status:** **Accepted & FROZEN** (owner‑approved OD‑01, Policy C) — *design/decision record; implementation is V2.0, after all OD frozen + readiness certificates*
**Source of truth:** V2.0‑DIS · OD‑01 · Owner Decision 2026‑07‑23
**Constitutional amendment:** CA‑001 (this decision’s constitutional package)

---

## Context
Today member payments are **netted** — the system stores one net balance, not a per‑obligation
allocation (`fin.js:89`); MODEL2’s allocation order is declared but inert (FOC‑025). OD‑01 asked
whether to keep pooled netting (A), activate the declared order (B), or activate explicit allocation
with a different, owner‑specified order (C).

## Decision (owner, OD‑01 — Policy C)
1. **MODEL2 is approved.** Runtime allocation becomes **explicit and stored** as part of the
   accounting truth — no longer a derived presentation only.
2. **The constitutional allocation order is amended to (CA‑001):**
   1. **Current‑Year Obligations**
   2. **Historical Debt**
   3. **Future‑Year Obligations**
   4. **Remaining Amount → Member Credit**
   This **supersedes** the previously declared `model2.js` order (`2025 → 2026 → historical →
   future_credit`): the change is **Current → Historical → Future → Credit** (historical now precedes
   future‑year obligations).
3. **Forward‑only activation.** **No historical voucher shall ever be reallocated.** Only payments
   created *after* activation are allocated under this order; all pre‑activation records stay exactly
   as recorded (Law 5).
4. **Permanent record.** Every payment created after activation **permanently records its allocation**
   (per obligation), which becomes the authoritative allocation fact (Law 3, Law 4).
5. **Non‑configurable.** This allocation order is **constitutional** — it is not a runtime setting and
   shall not be configurable. It changes only by a further explicit constitutional amendment.

## Alternatives (not chosen)
- **A · Keep pooled netting** — rejected by owner (MODEL2 to be activated; transparency required).
- **B · Declared order (Current → Future → Historical)** — rejected: owner amended the order so that
  **Historical Debt precedes Future‑Year Obligations**.

## Consequences
- **Accounting:** each post‑activation payment yields a stored, ordered split (current‑year dues →
  historical debt → future‑year dues → credit). Treasury balances remain derived (Law 2); the split is
  a stored capture‑time fact (Law 4), the single source for that payment (Law 3).
- **History:** unchanged — forward‑only guarantees no past statement is rewritten (Law 5, Law 11).
- **Downstream:** BO‑06 settlement (F‑06) and Refund (F‑07) can now reference *what a payment actually
  settled*; OD‑02 (credit consumption) and OD‑03 (tie‑break) must be read **against this amended order**
  (owner instruction) — see Cross References.
- **Implementation (V2.0, later):** update `model2.js` `ALLOCATION_ORDER` to the amended order, activate
  the allocation engine behind a reversible flag, persist the per‑payment allocation, and re‑certify the
  Constitutional Laboratory. **Not performed in this decision phase.**

## Status
**FROZEN** — reopened only by an explicit further constitutional amendment (owner).
