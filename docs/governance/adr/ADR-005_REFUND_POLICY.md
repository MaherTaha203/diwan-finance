# ADR‑005 · Refund Policy — first‑class refund movement

> **Owner Decision:** OD‑05 (Constitutional Decision Session) · **Date:** 2026‑07‑23
> Schema: P‑AIENG‑S2 **RS‑ADR**.

**ID:** ADR‑005 · **Status:** **Accepted & FROZEN** (owner, OD‑05) — *decision record; implementation is V2.0.*
**Constitutional amendment:** CA‑005 · **Source:** V2.0‑DIS OD‑05.

---

## Context
No first‑class refund exists; reversing a receipt is done today by preserved **cancellation** (BO‑03,
FOC‑019). The `refund` event is defined in MODEL2 but reserved (FOC‑013 excluded).

## Decision (owner, OD‑05)
1. **Eligibility.** Only receipts that **remain eligible for reversal** and have **not produced irreversible
   business consequences** may be refunded.
2. **Amount.** **Full or partial** refunds are permitted (currency‑preserving, Law 10).
3. **Funding source.** A refund is **always paid from the Origin Treasury** (`FROM_LINKED_ORIGIN`, Law 8).
4. **After year close.** Refunds are **prohibited** once the accounting period is closed. Any correction
   required after closure is recorded as a **new accounting transaction in an open period** and shall
   **never alter or indirectly reopen** the closed period (Law 11).
5. **Refund is a first‑class business transaction — NOT a cancellation** (new constitutional rule):
   - **Cancellation** voids an operation **before its final effects are approved** (preserved void, BO‑03).
   - **Refund** is an **independent financial movement recorded as a NEW voucher** reflecting money leaving.
6. **Invariants.** Every refund preserves value (Law 1), immutable history (Law 5), treasury custody
   (Law 8), full auditability (Law 6), and never violates closed‑period protection (Law 11).

## Alternatives (not chosen)
- **Refund from a reserve** — rejected (origin‑treasury funding is Law‑8‑native).
- **Refund after close via a bounded Law‑11 amendment** — rejected (owner prohibits post‑close refunds;
  corrections go forward instead).
- **Treating refund as a cancellation of a finalized receipt** — rejected (refund is first‑class, distinct).

## Consequences
- **Accounting:** a refund is a certified **outflow** (`refund`) linked to the origin receipt, drawn from
  the origin treasury, full or partial, conserving value.
- **FOC‑013** becomes re‑certifiable once refund is implemented (F‑07); **FOC‑019** (cancellation) is now
  clearly the *pre‑finalization void*, distinct from refund.
- **Implementation (V2.0):** a refund capture path linked to the origin; eligibility guard (reversible / no
  irreversible consequences); the "final effects" boundary maps to that eligibility rule (BO‑design detail);
  interacts with the future Liquidity Guard (ADR‑002) and with a credit that was auto‑consumed (OD‑02).
  **Not performed now.**

## Status
**FROZEN** — reopened only by a further explicit constitutional amendment (owner).
