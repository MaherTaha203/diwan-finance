# TRUTH-001 — Phase 1 Database Review (design only)

**Purpose:** prove Phase 1 did **not** introduce a second Source of Truth, before Phase 2 is authorized. No code, no migrations, no implementation, no plan — analysis only.

**Headline verdict:** **Phase 1 introduced no new Source of Truth.** The authoritative sources are unchanged: **(1) Historical Imported Truth** (`historical_subscription_truth`) and **(2) the ERP Operational domain** (`receipts` → FD-002 allocation → `member_subscriptions`). Everything Phase 1 added is *downstream* of those two: `current_subscription_status` is a **derivative read model**, `import_batches` is a **provenance store**, the **Repository** is a **read interface**, and the **Status Materializer** is the **single writer (a process, not data)**. None of them **originates** a fact.

> ⚠️ **One honest caveat, disclosed up front (relevant to Q9/Q10):** the "single writer" is currently an *architectural* guarantee, **not yet mechanically enforced**. Phase 1's interim RLS on `current_subscription_status` still allows `is_admin()` writes; the data-layer lock that permits **only** the Materializer to write is deferred to Phase 3. Today this is harmless — the table is **empty and unread** — but the mechanical enforcement is a Phase-3 obligation, not something Phase 1 already delivered.

---

## The component list is missing one source — name it first
The review lists five objects, but the **second source of truth is not among them**. It is the **ERP Operational domain** (`receipts`, FD-002 allocation output, `member_subscriptions`). This matters because the fear — "did we create a second source?" — is answered by observing that the *real* second source already existed (ERP) and Phase 1 added **no third**. `current_subscription_status` sits *below* both sources; it competes with neither.

---

## 1. Why `current_subscription_status` if we already have `historical_subscription_truth`?

They answer **different questions over different time windows**, and one is a source while the other is a projection.

| | `historical_subscription_truth` (HST) | `current_subscription_status` (CSS) |
|---|---|---|
| **Question it answers** | "What did the owner *certify as true* for the imported/closed window (≤ go-live)?" | "What is the *current* status of **any** (member, year) — imported **or** ERP-driven — for reports to read uniformly?" |
| **Time window** | ≤ import cutoff / closed years only | **every** year: imported, current-open, and future (2027+) |
| **Origin of its rows** | owner review + adoption (once) | **projected** by the Materializer from HST **+** ERP operational result |
| **Mutability** | **frozen** — write-once at adoption/close; corrections are audited amendments | rewritten whenever an upstream fact changes (receipt, adoption, close) |
| **Role** | **Source of Truth** (imported window) | **Materialized Read Model** (derivative of the two sources) |

**Why HST alone is not enough — three reasons:**
1. **Coverage.** HST deliberately covers only the imported/closed window. It holds nothing for the open year's live ERP movements or for future years that have no import. A report needs *one* answer for *every* year; HST can supply only part of it.
2. **The frozen boundary (already ratified).** `TRUTH-001_WRITE_CYCLE_BOUNDARY.md` forbids HST from joining the daily ERP write cycle. So the "current" status of an actively-collected year **must not** be written into HST. CSS is where the daily-changing projection lives, precisely so HST can stay frozen.
3. **Source-blind, read-time-cheap reports.** Reports must not recompute FD-002 at read time nor branch on "imported vs ERP." CSS is the single materialized surface that lets every report do one keyed lookup.

**Exact responsibilities:** HST *owns and freezes* the imported facts (+ provenance). CSS *holds the projected current status* so reads are uniform and HST stays out of the hot path. HST is authoritative; CSS is derived.

---

## 2. Classification (exactly one role each)

| Component | Classification | Justification |
|---|---|---|
| `historical_subscription_truth` | **Source of Truth** | Holds owner-adjudicated imported facts that exist nowhere else and cannot be recomputed from ERP data. Authoritative for its window. |
| `current_subscription_status` | **Materialized Read Model** | Every row is a *projection* of HST + ERP operational result. Holds no independent fact; rebuildable from the sources. |
| `import_batches` | **Provenance Store** | Records where/when/by-whom/which-file each import came from. Audit metadata about facts, not the facts' authority. |
| `Repository` | **Read Interface** | `get(member, year) → {status, provenance}`; no storage, no write path, no logic. |
| `Status Materializer` | *(none of the five — it is the **single Writer / projector**, a **process, not data**)* | The five categories are **data roles**; the Materializer is the only **process** in the list. Forcing it into a data role would be false. What matters for this review: it is emphatically **NOT a Source of Truth** — it *computes nothing of its own* and *stores nothing*; it applies upstream facts in order and persists the projection. |

I am deliberately **not** mislabeling the Materializer to satisfy "exactly one," because a wrong label would undermine the very proof you asked for. Its correct place is on the **write side** (see §5), producing the Materialized Read Model.

---

## 3. Can any report read directly from `historical_subscription_truth`?

**Today: yes (legacy) — and that is exactly what TRUTH-001 removes.** In the current codebase, `memberDelinquency` reads HST as a status **override**. This pre-existing coupling makes HST do double duty (Source of Truth **and** a report input), which is the scattered pattern the architecture abolishes.

**Target (post-cutover): no.** After Phase 5/7, no report reads HST directly. **Why the Repository still exists even though HST is right there:**
- **Coverage:** a report reading HST alone would be blind to ERP/open-year/future status (HST doesn't hold it). It would show a partial truth.
- **Source-blindness:** reports must not know that "imported" and "ERP" are different origins; the Repository hands them one status.
- **Frozen boundary:** routing reads through the Repository (over CSS) is what lets HST stay frozen and out of the daily cycle.

So: the direct read is a **legacy fact**, and eliminating it is a defined migration step — not a property of the target design.

---

## 4. Can any report read directly from `current_subscription_status`?

**No.** Reports read **only through the Repository**, never the table. **Why the Repository exists even though CSS holds the value:**
- **Substitutability:** the Repository's contract is `get(key) → value`; CSS could be swapped for another store (SQL table, cache, in-memory map) with **no caller change** (proven in `TRUTH-001_CANONICAL_RESOLVER_RESPONSIBILITY.md` §5).
- **Access discipline:** the Repository exposes **read-only**; it holds no write method. Keeping reports off the raw table is what makes "only the Materializer writes" enforceable.
- **Encapsulation:** storage shape, provenance packaging, and future changes stay behind one interface.

---

## 5. The real dependency graph

Your example graph is *almost* right but omits the second source (ERP) and the provenance edge. The correct graph:

```
   Excel file
       │
       ▼
   import_batches  ───(provenance FK)──►  historical_subscription_truth (rows)
                                                   │
   ┌───────────────── SOURCES OF TRUTH ───────────┤
   │                                               │
Historical Imported Truth (HST, frozen)     ERP Operational domain
   │                                        (receipts → FD-002 allocation
   │                                         → member_subscriptions)
   └───────────────────┬───────────────────────────┘
                       ▼   (facts / events only)
             Status Materializer   ── the SINGLE WRITER
                       │  (projects; writes status)
                       ▼
        current_subscription_status  (Materialized Read Model)
                       │
                       ▼
                  Repository  (Read Interface)
                       │
                       ▼
                    Reports   (Statement · Delinquent · Annual Debt · Dues · Dashboard)
```

Corrections to the example: **(a)** two sources feed the Materializer, not one; **(b)** `import_batches` feeds HST **provenance** (it is not an ancestor of the *status* value, only of its audit trail); **(c)** the Materializer sits between the sources and CSS — sources never write CSS directly.

---

## 6. No dependency cycles — the complete chain

**Every edge points strictly downstream. Enumerated:**
1. Excel → `import_batches` (register origin)
2. `import_batches` → HST rows (provenance FK)
3. HST (source) → Materializer (read fact)
4. ERP domain (source) → Materializer (read fact)
5. Materializer → CSS (write projection)
6. CSS → Repository (read)
7. Repository → Reports (read)

**Proof of acyclicity:**
- **No back-edges.** Reports **never write** (read-only clients). Repository **never writes** (no write method). CSS **never feeds back** into HST or ERP. The Materializer **reads** sources and **writes** CSS, but the sources **never read** CSS. Provenance flows `import_batches → HST`, never the reverse.
- A **strict topological order** therefore exists — exactly the 1→7 enumeration above. A graph with a valid topological order is a **DAG**; a DAG has **no cycles**. ∎
- Specifically, the two dangerous cycles are absent: **no `report → truth` write** (reports can't mutate any source or the read model), and **no `CSS → HST` write** (the read model can't rewrite its own source).

---

## 7. Deleting `current_subscription_status` does NOT destroy truth

Because **CSS is a pure derivative** — every row equals `project( HST[m,y] , ERP-events[m,y] )` computed by the Materializer. Concretely:
- **No fact lives only in CSS.** Its inputs are HST (persisted) and ERP operational data (persisted). CSS adds no owner decision, no receipt, no adjudication of its own.
- **It is rebuildable.** Drop CSS → run the Materializer's backfill → an **identical** CSS is reconstructed from the untouched sources. (This is the standard read-model property; stated in `..._SOURCE_OWNERSHIP_ARCHITECTURE.md` §7 and `..._CANONICAL_RESOLVER_RESPONSIBILITY.md` §7.)
- **Amounts/facts untouched** by its deletion.

Therefore CSS is a **read model / performance-and-uniformity optimization**, not authoritative data. Losing it costs a rebuild, not a truth. ∎

---

## 8. Deleting `historical_subscription_truth` DOES destroy truth

Because **HST holds facts that exist nowhere else and cannot be recomputed**:
- **Owner adjudications.** The manually reviewed statuses — e.g. the production class where 2025 stored `paid 730 > due 200` yet the owner ruled **2026 UNPAID** — are *human decisions*. ERP data cannot re-derive them; recomputing from ERP alone reproduces the **original defect** (surplus cascade wrongly settling later years).
- **Pre-go-live reality.** ERP has **no receipts** for the period before activation (the migration recorded lump amounts, not per-year settlement events). Only HST records what each imported member-year actually was.
- **`import_batches` cannot substitute.** It stores batch metadata (file, hash, row-count, who/when) — **not** the per-(member,year) adjudicated status. It answers "where did it come from," not "what was the status."
- **Re-importing the Excel is not equivalent.** Adoption froze *owner-approved* rows including corrections/versions; the raw file predates those adjudications.

Delete HST → the imported window's truth is **unrecoverable**, and any rebuild of CSS would be **wrong**. That is the definition of a Source of Truth. ∎

*(The symmetry of §7 vs §8 is itself the proof of the layering: one is rebuildable, the other is not.)*

---

## 9. The Repository is NOT a Source of Truth

- **No storage:** it owns no table; it forwards CSS rows.
- **No write path:** it exposes only `get()`; it cannot originate or alter a fact.
- **No logic:** no FD-002, no precedence rule, no branch on source — a logic-less keyed lookup (`..._CANONICAL_RESOLVER_RESPONSIBILITY.md`).
- **Substitutable:** replace it with any repository over the same `get(key)→value` contract and nothing else changes — a Source of Truth is, by definition, **not** freely substitutable; the Repository is. 
- **Deletable without truth loss:** remove it and HST + ERP + CSS are fully intact; only the read *path* is gone.

A component that stores nothing, decides nothing, and is freely replaceable cannot be a Source of Truth. It is a **read abstraction only**. ∎

---

## 10. If HST and CSS ever disagree

First, define "disagree" precisely: since CSS is a **derivative**, a disagreement is **not** two competing truths — it is **drift/staleness**, i.e. `CSS[m,y] ≠ project(current sources for m,y)`. HST (for its window) and the ERP domain (for theirs) are authoritative **by construction**; CSS is only ever obliged to *equal their projection*.

- **Who detects it:**
  - **Idempotent re-projection** by the Materializer: re-running for `(m,y)` and getting a value different from the stored one *is* the detection signal.
  - **The Phase-6 parity gate** — a permanent invariant test asserting `Statement == Delinquent == Annual Debt == Dues == Repository == approved matrix` for all member-years; any mismatch fails the gate and blocks cutover.
- **Who repairs it:** the **Status Materializer**, and only it — re-materialize/backfill **overwrites CSS from the sources**. Direction is always `sources → CSS`. HST is **never** "corrected to match CSS" (that would invert authority); a genuine change to imported truth is a separate, audited HST amendment, after which the Materializer re-projects.
- **Can reports ever see inconsistent data:**
  - **Contradictory data: no.** A report reads **one** value from **one** store via **one** interface; it cannot observe two conflicting statuses for the same key simultaneously.
  - **Stale data: only transiently, and bounded.** Between an upstream change and re-materialization, CSS could lag. Guarantees that bound it: **(i)** Phase-3 Materializer hooks re-project on each status-changing event (additively, in the same flow), keeping CSS current; **(ii)** the **single-writer** rule (Phase-3-enforced) means no partial or competing writes — a read sees a complete prior projection, never a half-written one; **(iii)** the **parity gate** blocks a report's cutover until parity is 100%; **(iv)** each report's **flag** rolls it back to the legacy path instantly if drift is ever found in production.

**Architectural guarantee, stated plainly:** reports can, at worst, see a *momentarily stale but internally consistent* value that is **self-healing toward HST + ERP** via the single writer — never two contradictory truths, and never a value that CSS could defend against its own sources.

> The honesty note from the top applies here: guarantee **(ii)** is only *fully* true once Phase 3 installs the data-layer single-writer lock. In Phase 1, CSS is empty and unread, so there is nothing to be inconsistent yet — but this is why single-writer enforcement is a **hard prerequisite of Phase 3**, not an optional extra.

---

## Conclusion
Phase 1 added a **read model** (CSS), a **provenance store** (`import_batches`), a **read interface** (Repository), and a **single-writer process** (Materializer) — all strictly **downstream** of the two unchanged Sources of Truth (HST + ERP). The layering is proven by the asymmetry in §7/§8: **CSS is rebuildable; HST is not.** No cycles exist (§6); the Repository originates nothing (§9); disagreements are drift, detected by parity and repaired by the single writer, never surfacing as contradictory truth (§10). **No second Source of Truth was introduced.**

The **one** thing Phase 1 has *not yet* delivered — and which Phase 2 must **not** rely upon — is the **mechanical** single-writer lock on CSS; that is the explicit gate for Phase 3.

---
**Design review only — no code, no migration, no implementation, no plan. FIN / allocation / reports / DB behavior untouched; `fin.js` at baseline; #273 held; Phase 1 remains inert.** Awaiting your authorization before Phase 2.
