<!-- Constitutional Amendment — owner-ratified via the OD-03 Constitutional Decision Session.
     Refines CA-001 ordering. No code in this phase; implementation is V2.0. -->

# CA‑003 · Constitutional Amendment — Deterministic Allocation Ordering & Current‑Year Definition

**Amendment ID:** CA‑003 · **Status:** **RATIFIED & FROZEN** (owner, OD‑03, 2026‑07‑23)
**Refines:** CA‑001 (allocation order). **Depends on:** ADR‑003, CA‑001, CA‑002. **Baseline:** `main` @ `6adb118`.

---

## 1 · Rules

### 1.1 · Future‑Year ordering
Within the **Future‑Year Obligations** category, allocation is always **chronological ascending
(earliest‑year‑first)** — e.g. 2027 before 2028; with a gap (2027, 2029), 2027 then 2029.

### 1.2 · Deterministic ordering (all categories)
Within **every** allocation category, ordering is **deterministic**. If multiple obligations exist for the
**same year**, ordering resolves by **(a) creation timestamp, then (b) immutable unique identifier**. This
ordering is **constitutional** and **shall not depend on database ordering or any implementation detail**.

### 1.3 · Historical vouchers (reaffirmed from OD‑01)
**Forward‑only. No historical allocation shall ever be recalculated or rewritten.**

### 1.4 · "Current‑Year Obligation" — constitutional definition
"Current‑Year Obligation" means the obligation belonging to the **organization's designated current
operating year**. It is a **business definition** and is **independent of period‑lock status**
(`locked_through_year` does not define it).

## 2 · Affected constitutional laws
- **Law 2 (Derivation)** — strengthens determinism: the derived/stored allocation is fully reproducible from
  business facts (year → creation time → unique id), never from storage order.
- **Law 5 (Immutable History)** — forward‑only reaffirmed.
- **Law 12 (Identity Uniqueness)** — the immutable unique identifier is the final, guaranteed tie‑breaker.

## 3 · Business Contract / implementation notes
- The allocation engine (V2.0) must sort obligations by (year per CA‑001 order) → creation timestamp →
  unique id, computed in code — **never** relying on query/row order.
- A **designated current operating year** is a business setting distinct from the period lock; the engine
  reads it to identify Current‑Year obligations. (No code in this phase.)

## 4 · Cross references
CA‑001 (order) · CA‑002 (credit consumption uses this same ordering) · ADR‑003 · V2.0‑DIS OD‑03 ·
Law 12 (Identity Uniqueness).

## 5 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
