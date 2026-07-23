# ADR‑004 · BO‑06 — Historical‑Deficit Settlement Policy

> **Owner Decision:** OD‑04 (Constitutional Decision Session) · **Date:** 2026‑07‑23
> Schema: P‑AIENG‑S2 **RS‑ADR**.

**ID:** ADR‑004 · **Status:** **Accepted & FROZEN** (owner, OD‑04, Policy A) — *decision record; implementation is V2.0.*
**Constitutional amendment:** CA‑004 · **Source:** V2.0‑DIS OD‑04.

---

## Context
The communal historical deficit can receive money (inflows reduce it, Law 9) but has no defined **outflow /
settlement** path; `historical_deficit_settlement` is defined in MODEL2 but deferred (FOC‑012 excluded).

## Decision (owner, OD‑04 — Policy A)
1. **Aggregate obligation.** The Historical Deficit is an **aggregated historical financial obligation**
   carried into the system as an **opening balance**. The system **does not maintain or reconstruct
   individual historical creditors** for pre‑system events.
2. **Funding source.** Historical‑deficit settlements are **always funded from the Historical Deficit
   Treasury**.
3. **Law 9 bound.** Each settlement **reduces** the Historical Deficit balance and **never creates a
   surplus** (Law 9). A settlement is capped at the remaining deficit.
4. **Record the effect, not the liability.** The system records the **financial effect** of the settlement
   (amount, date, actor, effect on the deficit). The actual recipient / supporting documentation **may exist
   outside the system**; the system is not responsible for reconstructing historical liabilities.

## Alternatives (not chosen)
- **B · Earmarked reserve** and **C · Tracked per‑creditor payables** — rejected: the owner ruled the
  deficit is aggregate with no per‑creditor reconstruction, funded from the deficit treasury itself.

## Consequences
- **Accounting:** BO‑06 becomes a certified **outflow** classified `historical_deficit_settlement`, drawn
  from the historical‑deficit treasury, decreasing the recorded deficit toward zero (never past it).
- **Constitution:** honors Law 8 (custody), Law 9 (bound), Law 1 (conservation), Law 6 (traceability).
- **FOC‑012:** becomes re‑certifiable once BO‑06 is implemented (F‑06 → F‑08).
- **Implementation (V2.0):** a capture path + certified BO‑06 + audit; a settlement may never drive the
  deficit into surplus; interacts with the future Liquidity Guard (ADR‑002). **Not performed now.**

## Status
**FROZEN** — reopened only by a further explicit constitutional amendment (owner).
