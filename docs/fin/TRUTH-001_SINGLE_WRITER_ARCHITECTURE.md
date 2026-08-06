# TRUTH-001 — Single Writer Architecture (final architecture review · no code)

**Design only.** No code, no implementation plan, no prior document modified. This settles the last open point: **who is the single writer of a year's status.**

It also corrects a loose phrasing in my earlier notes ("each domain writes its own authoritative status") — that would be *multiple* writers, which you rightly reject. The correct answer is below.

---

## 1. The single writer
**The single writer of every year-status is one dedicated projector: the `Status Materializer`.**

No business domain qualifies to be the sole writer, because **no single domain observes all status-changing events**:

| Candidate | Sees only… | Can be the sole writer? |
|---|---|---|
| Adoption | the one-time import genesis | ✗ — never sees receipts or close |
| ERP Receipt | one payment event | ✗ — never sees adoption / dues-gen / close |
| Allocation (FD-002) | receipts → a computed result | ✗ — a pure function; blind to imported & close; making it write also couples it |
| Year Close | period end | ✗ — never sees daily events |
| Dues Generation | year genesis | ✗ — one moment only |
| **Status Materializer** | **all status-relevant events** | ✓ **the only component that can** |

So the single writer must be a component whose *sole job* is to consume every status-relevant event and write the resulting status. That is the `Status Materializer`. Everyone else **emits facts/events**; only the Materializer **writes status**.

Crucially, the Materializer **does not contain business logic** like FD-002 — that stays in Allocation/FIN, which hands it a *result fact* ("2026 obligation settled/partial/open"). The Materializer only **applies status-relevant events in order and writes the outcome** (a thin projection). Business computation lives upstream; the Materializer is the single *persister* of the projected status.

## 2. Is there more than one place that can write the status? — No.
**Exactly one write path exists**, and it is enforced at two levels:
- **Architecturally:** the `Current Subscription Status` store exposes **no write API to any other module**. Adoption, ERP, Allocation, Year-Close, Dues-Gen, Reports, Repository, Resolver have **read-only or no** access to it; only the Materializer writes.
- **Enforced at the data layer:** the status store accepts writes **only** from the Materializer's identity/path (DB grant / RLS / a guard that rejects any write not originating from the Materializer). A second writer is not "discouraged" — it is **rejected**.

Why one and not many: multiple writers = multiple owners = the exact race/conflict TRUTH-001 exists to abolish. One writer gives one owner, one audit point, one place to reason about correctness.

## 3. Status lifecycle (single-writer)
```
Dues Generation ──► (fact: year created)
Adoption ─────────► (fact: Historical Imported Truth, frozen)
ERP Receipt ──────► Allocation / FD-002 ──► (fact: ERP operational result)
Year Close ───────► (fact: period frozen)
        │  (all of the above are FACTS/EVENTS — none writes status)
        ▼
┌─────────────────────────┐
│   STATUS MATERIALIZER    │   ◄──  the SINGLE WRITER
│  (applies events in order,│
│   writes the outcome)     │
└─────────────────────────┘
        │  writes ONE current status per (member, year)
        ▼
 Current Subscription Status  (the Repository's backing store)
        │
        ▼
     Repository  (read only)
        │
        ▼
   Resolver = Repository  (find only)
        │
        ▼
 Reports: Statement · Delinquent · Annual Debt · Dues  (read only)
```
Status values transition `OPEN → PARTIAL → PAID → REOPENED`, but **every transition is written by the Materializer alone**, in response to an upstream fact. No report, engine, or table writes a status.

## 4. One responsibility per layer (proof by role)
| Layer | Its one responsibility | Proof it does nothing else |
|---|---|---|
| **Reports** | render | read-only clients of the Repository; hold no store handle, issue no write, run no FD-002 |
| **Repository** | fetch by key | `get(member,year)→value`; no write method exposed; no computation |
| **Resolver** | = Repository (find) | proven in the Resolver-Responsibility note; substitutable by a store |
| **Current Status / Truth Table** | store | passive rows; tables don't compute — all values arrive pre-decided from the Materializer |
| **Historical Imported Truth** | frozen source of record | written once at adoption; never in the daily cycle; holds facts + provenance, computes nothing |
| **Allocation (FD-002 / FIN)** | compute the ERP operational result from receipts | reads receipts/subscriptions only; **never reads reports**; emits a fact; does not write status |
| **Adoption / Dues-Gen / Year-Close** | emit genesis/close facts | produce facts; do not write the current status |
| **Status Materializer** | **write the status** | the *only* writer; contains projection, not domain computation |

Each arrow flows one way: facts → Materializer → store → Repository → reports. No layer both computes and stores; no layer both reads reports and writes truth.

## 5. Proof: no two places can write the same truth
1. The `Current Subscription Status` has a **single writer identity** (the Materializer); the data layer **rejects** writes from any other identity/path.
2. Every other component's relationship to status is **read** (Repository, Resolver, Reports) or **emit-fact** (Adoption, ERP, Allocation, Close, Dues-Gen) — none holds a write path to the status store.
3. Therefore the set of writers has cardinality **exactly one**, by construction and by enforcement. Two components writing the same `(member, year)` status is not merely avoided — it is **unrepresentable** in the architecture. ∎

(The two *sources of truth* — Historical Imported and ERP operational — remain two, but they are **facts consumed** by the one writer, never two writers of the *status*. Sources ≠ writers.)

## 6. Write Side → Single Writer → Repository → Read Side
```
                         WRITE SIDE  (facts + all business logic)
   ┌───────────────┬───────────────┬───────────────┬───────────────┐
 Dues Generation   Adoption      ERP Receipt      Year Close
                      │               │
             Historical Import   Allocation (FD-002 / FIN)
                      │               │
                      └──────┬────────┘
                             ▼  (facts / events only)
                    ┌──────────────────┐
                    │ SINGLE WRITER     │   =  Status Materializer
                    │ (writes status)   │
                    └──────────────────┘
                             │  writes
                             ▼
                        REPOSITORY        (Current Subscription Status; read-only API)
                             │
                             ▼
                         READ SIDE
             Resolver(=Repository) ─► Reports (Statement · Delinquent · Annual Debt · Dues)
```
Placement of each named part:
- **ERP, Allocation, Historical Import, Adoption, Dues-Gen, Year-Close** → **Write Side** (emit facts / hold business logic; none writes status).
- **Status Materializer** → the single hinge (**the only writer**).
- **Repository** → the boundary the writer writes and the read side reads.
- **Resolver, Reports** → **Read Side** (read only).

---

## Conclusion — TRUTH-001 is architecturally complete
- **Who owns the truth:** its two sources (Historical Imported = frozen; ERP operational = live).
- **Who writes it:** exactly one — the **Status Materializer**.
- **Who reads it:** the Repository/Resolver, consumed by source-blind reports.
- **Who may never modify it:** everyone else — enforced, not merely intended.

With a single writer proven, the ownership, write, read, and no-touch responsibilities are all settled. This is the last architectural gate.

---
**Design only — nothing implemented; no prior design file changed; FIN / allocation / reports / DB untouched; `fin.js` at baseline; #273 held.** Ready for your green light to move to the implementation plan — only on your word.
