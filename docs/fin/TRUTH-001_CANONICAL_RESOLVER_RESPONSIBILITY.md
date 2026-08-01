# TRUTH-001 — Canonical Resolver Responsibility (final architecture review · no code)

**Design only.** No code, no implementation plan, no prior document changed. This answers one thing: what the Resolver *is* — and proves it is a Repository, not a business layer.

---

## The one-word answer
**The Resolver FINDS the truth (يجد).**
Not *computes* (يحسب), not *combines* (يجمع), not *selects* (يختار).

**Justification.** *Compute* would require an algorithm (FD-002) → it becomes FIN. *Combine* would require composing two sources (anchor + advance) → it becomes a Composer. *Select* would require a precedence rule ("ERP supersedes imported after cutoff") → that rule is still an algorithm, and it still couples the Resolver to how the sources relate. Only **find** carries **zero logic**: the current truth is *already decided and stored* by the domain that owns it; the Resolver locates it by key and returns it. Find is the sole answer under which the Resolver knows nothing about imported-vs-ERP, FD-002, or cutoffs — which is the whole requirement.

## 1. What is the Resolver's responsibility?
Exactly one thing: **`resolve(member, year) → { status, provenance }`** — a **keyed lookup** of an already-persisted current status. Locate it, fetch it, return it. It does not know *why* the status is what it is, or that two sources ever existed.

## 2. What the Resolver must NOT do
If any of these words would appear in it, the design is wrong:
`compose · apply · advance · merge · override · derive · replay · reconstruct · select-by-precedence`.
It must not: run FD-002, run allocation, read receipts, know the import cutoff, know that "imported" and "ERP" are different, or branch on source. **It holds no rule and no algorithm.**

## 3. Where does the Business Logic live? (precise responsibilities)
The logic never disappears — it moves **upstream of the read**, to the domain that owns each decision, and each domain **persists its authoritative outcome**:

| Concern | Owner | Responsibility |
|---|---|---|
| FD-002 / allocation / ERP operational status | **FIN / Allocation Engine (ERP Domain)** | compute the ERP-driven status from receipts **and persist** the resulting current status |
| Imported subscription status | **Adoption** (one-time genesis) | write the reviewed imported status as the initial current status |
| Freezing at period end | **Year Close** | snapshot the current status into the frozen record |
| Origin / audit record of imported facts | **Historical Imported Truth** (frozen) | hold provenance; never daily-written |
| **Retrieving the current status** | **Resolver (Repository)** | **read only — no logic** |

There is **no central "composer"**: each domain writes its own authoritative status on the event it owns; the last authoritative write is the current truth. The Resolver reads it.

## 4. Why the Resolver stays a read-only layer
Because **every decision is made and persisted upstream by the domain that owns it**, the Resolver has *nothing to decide* — it receives only a key and returns a stored value. Keeping it logic-less is what guarantees the constitutional goals: one stored truth (no read-time divergence), source-blind reports, trivial testability, and — the proof below — replaceability.

## 5. Proof — the Resolver is (definitionally) a Repository
- **Contract:** `get(memberId, year) → { status, provenance }`.
- **Reference implementation:** a single indexed lookup — `SELECT status, provenance FROM current_subscription_status WHERE member_id = ? AND year = ?` — returning one row.
- **No branches, no algorithm, no domain knowledge, no second query to "the other source".**
- **Substitution test:** replace it with any repository — a SQL table, a key-value store, an in-memory `Map` seeded from a fixture — and **no caller changes and no behaviour changes**, because callers depend only on the `get(key) → value` contract.
- **∴** the Resolver *is* a Repository. Conversely, the instant it would need FD-002, allocation, a precedence rule, or knowledge of ERP internals, it would stop satisfying this contract — which is exactly the red flag you named. It never crosses that line.

## 6. The honest consequence — materialization is the price of a logic-less Resolver
For the Resolver to **find** (not compute) the truth, the current status must be **persisted by the write side**. The "imported anchor + ERP advance" is performed **once, at write time, by the owning domains**, yielding a **stored** current status. This is the standard read/write split:
- **Write side** (ERP Domain, Adoption, Year-Close) owns *all* logic and *persists* the outcome.
- **Read side** (Resolver = Repository) owns *retrieval only*.

The "anchor/advance" language in the earlier Source-Ownership note therefore belongs to the **write side**, not the Resolver — this clarifies, and does not modify, that document.

## 7. Where the value physically sits (design intent, not a plan)
- **Historical Imported Truth** — frozen, provenanced **source of record** for imported facts; never in the daily write cycle.
- **Current Subscription Status** — a **materialized read model** the Resolver reads; written by Adoption (imported → current) and by the ERP Domain on settling events. It is a **derivative** of the two authoritative sources, not a third source of truth; if lost it is rebuildable **by the write side** (never by the Resolver, which never replays).

## Recap — the five required answers
1. **Resolver responsibility:** find and return the stored current status by key. Nothing else.
2. **Must not:** compute, compose, select-by-precedence, run FD-002/allocation, or know ERP internals.
3. **Business logic lives in:** FIN/Allocation Engine (FD-002 + persist), Adoption (imported genesis), Year-Close (freeze) — never the Resolver.
4. **Read-only because:** all decisions are made and persisted upstream; the Resolver has nothing to decide.
5. **Replaceable by a Repository:** its contract is `get(key) → value`; the substitution proof (§5) shows any repository works with no system change.

---
**Final architecture review — design only. Nothing implemented; no prior design file modified; FIN / allocation / reports / DB untouched; `fin.js` at baseline; #273 held.**
