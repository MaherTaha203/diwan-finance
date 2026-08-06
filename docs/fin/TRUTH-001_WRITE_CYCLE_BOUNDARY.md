# TRUTH-001 — Should Historical Truth join the daily ERP write cycle? (design only)

## Answer: **No.**
`Historical Subscription Truth` must **not** be written by the daily ERP cycle. It is written **only at deliberate genesis moments** — (1) import adoption, and (2) fiscal-year **close**. The daily ERP cycle (receipts, collection, allocation) maintains the **live** operational status; it never touches Historical Truth.

This **corrects my own Final Canonical Model §4**, which had an ERP receipt "version the truth record forward." That was wrong: it would make Historical Truth a daily-mutated operational table and destroy the very identity you insisted on protecting. Your question caught it.

## Why not (three reasons the name itself dictates)
1. **Identity.** *Historical* means *closed, settled past*. A table rewritten on every receipt is *operational live state*, not history. Daily writes would make the name a lie.
2. **Coupling & integrity.** Putting it in the hot path means every payment write contends with, and can corrupt, the audited record of history. History must be **append-only at deliberate checkpoints**, not a mutable operational cache.
3. **Auditability.** A frozen historical record answers "what did we certify was true for year Y?" A daily-mutated one cannot — it only ever shows *now*, losing the certified past.

## The correct boundary — ownership by fiscal state (no overlay)
Each member-year's status has **exactly one owner**, decided by whether the year is closed:

| Year state | Status owner | Written when | Read how |
|---|---|---|---|
| **Closed** (≤ `LOCKED_THROUGH_YEAR`) — incl. adopted imported years | **Historical Truth** (frozen) | once, at **adoption / close** | direct read |
| **Open** (current operating year) | **Live ERP domain** (receipts / subscriptions — today's machinery) | continuously, the **daily cycle** | live read of the operating period |

Because a year is **either** closed **or** open — never both — the report reads the single owning source directly. **There is no read-time `truth : derived` merge, no overlay, no patch.** The "combination" the earlier design feared is replaced by a **temporal handoff**, not a runtime merge.

## The handoff — how a year becomes Historical Truth
This is exactly the existing fiscal-close/snapshot pattern (IG-016 `fiscal_snapshots` already exists), applied to status:

```
 open year (live, daily ERP) ──► [year-end CLOSE] ──► frozen status snapshot ──► Historical Truth (immutable)
```

- **Import adoption** is simply the *first* close: it freezes the imported/closed years' status as historical truth, once.
- **Each subsequent year-end close** freezes that year's final live status into Historical Truth — a single deliberate write, not a daily one.
- After close, the year is immutable history; a later correction is an **explicit, audited amendment** (append a new version), never a silent daily write.

## Consequence to decide — the current operating year
The one real fork this raises: the year you are **actively collecting** (2026 today) is **open/live**, so under this boundary its status comes from the **live ERP domain**, not from a frozen record. Your Truth-Matrix review of 2026 is therefore best understood as **either**:
- **(a)** the authoritative **opening** for 2026 (frozen for the closed portion / carried imports), with live ERP payments moving it during the open period, frozen in full at 2026 close; **or**
- **(b)** an explicit decision to **close 2026 now** at the reviewed state (freeze it as historical truth immediately), after which any ERP payment on 2026 is an audited amendment, not routine.

2025 (already closed) is unambiguous — it freezes into Historical Truth via adoption. Only the open year needs this call.

## What this means for the model
- **Historical Truth stays frozen, import/close-fed, immutable** — its name, content, and responsibility remain coherent.
- **The daily ERP cycle keeps doing what it already does** (receipts drive live status) — **no new daily coupling, no new hot table.**
- **No overlay** — ownership by fiscal state, not a read-time merge.
- **Amounts untouched.** Implementation scope is *smaller* than daily-writing truth, and it **reuses the existing close/snapshot machinery** rather than inventing a status write-path on every receipt.

## Recommendation
**Do not put Historical Truth in the daily ERP write cycle.** Feed it only at adoption and fiscal close; let the live year stay live; hand off at close. Then decide the single open point above (recommend **(a)** — treat the review as 2026's authoritative opening and freeze at year-end close, so collection continues normally without amendments).

---
**Design only — nothing implemented.** FIN / allocation / reports / DB untouched; #273 held; `fin.js` at baseline. On your ratification of this boundary (and the open-year call), I'll fold the correction into the canonical model and only then produce an implementation plan.
