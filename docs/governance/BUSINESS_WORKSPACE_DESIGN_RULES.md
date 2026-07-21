<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     Standing design rules for every Business Workspace. Immutable; a change is
     issued as a NEW version, never an in-place edit. Applies to ALL current and
     future Business Modules, not only the Member Financial Lifecycle.
     ═══════════════════════════════════════════════════════════════════════════ -->

# Business Workspace — Design Rules

**Document ID:** GOV‑WS‑01
**Version:** 1.4 (FROZEN)
**Status:** RATIFIED · STANDING
**Established:** 2026‑07‑20 · Rules 1–2 (P2‑S2) · Rule 3 (P2‑S3) · Rule 4 (P3‑000) · Rule 5 (P4‑000) · Rule 6 (P4‑S1)
**Scope:** every Business Workspace of Diwan — all current and future Business Modules.
Rules 1–3 and Rule 6 apply to **every** Business Workspace; Rule 4 applies to every **Operational**
Workspace; Rule 5 applies to every **Business Module**.

---

## Rule 1 · Preserve the layering (architecture)

Every Business Module and its workspace preserves this separation, top to bottom:

```
Business Workspace          → orchestrates the user's tasks; presentation only
        ▼
Business Operations         → the only way to change state (certified BOs)
        ▼
Certified Accounting Core   → the only executor of financial logic (FIN/FIN2 + atomic RPCs)
        ▼
Accounting Constitution     → the governing reference (frozen, P0)
```

- A workspace **reads** only from certified read models and **acts** only through certified
  Business Operations. It never contains accounting logic, new calculations, business rules,
  duplicated logic, or a second source of truth.
- This layering is mandatory for **every future Business Module**, not a one‑off for the
  Member Financial Lifecycle.

## Rule 2 · One dominant Primary Business Question (permanent design rule)

> **Every Business Workspace shall present one visually dominant Primary Business Question,
> with all remaining sections acting as supporting context rather than competing focal points.**

- Each workspace declares a single **Primary Business Question** — the one thing the user came
  to answer — and makes it the clear visual focal point (hierarchy, size, position, emphasis).
- All other sections are **supporting context**: they inform or enable the primary question and
  must not compete with it for attention. No workspace is a grid of co‑equal cards.
- Applies to all workspaces. (For the Member Financial Lifecycle, the primary question is the
  member's **current financial position**; Summary / Statement / Timeline / Actions support it.)

## Rule 3 · Distinguish State, History, and Capability (permanent design rule)

> **Every Business Workspace shall distinguish between State, History, and Capability, and
> shall not mix these information types within a single section.**

Every workspace presents three clearly separated kinds of information:

1. **State** — *what is the current situation?* (e.g. the member's current financial position / standing).
2. **History** — *how did we get here?* (e.g. the statement and the timeline of certified events).
3. **Capability** — *what does the system allow to be done right now?* (the legitimacy‑gated
   operations, each routing to a certified Business Operation).

- These three types must not be blended inside one section: a section is a **State** section, a
  **History** section, or a **Capability** section — never a mixture.
- **The workspace determines _what_ the user is legitimately allowed to do; the certified Business
  Operations determine _how_ it is done.** Capability answers legitimacy only; business logic never
  migrates into the workspace layer.
- Applies to all workspaces. (In the Member Financial Lifecycle: **State** = Financial Status ·
  **History** = Statement + Timeline · **Capability** = Available Actions / operational panel.)

## Rule 4 · Separate Intent, Authorization, Execution, and Result (Operational Workspaces)

> **Every Operational Workspace shall separate Intent, Authorization, Execution, and Result.
> Execution must always occur exclusively through certified Business Operations, and every
> visible result must originate exclusively from certified Read Models. No accounting logic,
> direct state mutation, or second source of truth may exist inside the Workspace.**

An **Operational Workspace** — one where the user *executes* work, not only observes — keeps these
four moments distinct and never collapses them:

1. **Intent** — *what the user wants to do* (the chosen affordance / form input). Presentation only.
2. **Authorization** — *whether it is legitimate now* (authority + certified state). A gate, never a
   mutation; it decides legitimacy only.
3. **Execution** — *how it is carried out* — **exclusively** by invoking a certified Business
   Operation. The workspace never mutates state directly and contains no accounting logic.
4. **Result** — *what happened* — read back **exclusively** from certified Read Models. No cached or
   independently‑computed outcome; no second source of truth.

- These four moments must not be blended: Authorization is not Execution; the displayed Result is
  never computed by the workspace.
- This refines Rule 3's **Capability** layer for Operational Workspaces: Capability = **Intent +
  Authorization**; **Execution** routes to a certified Business Operation; **Result** returns through
  a certified Read Model.
- Applies to every Operational Workspace — the Member Financial Lifecycle today, and every future
  one (starting with the Collection Operations Workspace, P3).

## Rule 5 · Declare the Business Boundary — owns / does not own (every Business Module)

> **Every Business Module shall explicitly define its Business Boundary by stating both what it
> OWNS and what it intentionally DOES NOT OWN.**

- Each module's specification declares, in explicit terms, the operations, data, and decisions it
  **owns** (its Scope) and the ones it **intentionally does not own** (its Out‑of‑Scope and deferred
  gaps) — including *why* each is excluded and what future decision would be required to include it.
- "Does not own" is a **first‑class, permanent statement**, not an omission. A capability that is
  not owned is not merely unbuilt; it is deliberately outside the module and belongs to another
  module or to a separate business decision.
- The boundary is the module's **contract with the rest of the system**: no module silently absorbs
  a neighbouring module's responsibility, and no gap is filled without an explicit decision.
- Applies to every Business Module (P2 Member Lifecycle, P3 Collection, P4 Payment Vouchers, and all
  future modules). *(E.g. P4 **owns** issue / edit / cancel / correct of payment vouchers; it
  explicitly **does not own** the approval workflow (GAP‑P1) or the liquidity guard (GAP‑P2).)*

## Rule 6 · One source of operational truth (every Business Workspace)

> **Every Business Workspace shall expose only one source of operational truth. Multiple views
> (Summary, Ledger, Timeline, …) are permitted only as different PROJECTIONS of the same certified
> operational state.**

- A workspace has a single certified operational state (the certified read models). Every view —
  Summary, Ledger, Timeline, hero figures, tiles — is a **projection** of that same state, computed
  the same way from the same certified source. No view holds its own cached, recomputed, or
  divergent number.
- Two views that show the same quantity agree **because they read the same certified value**, not
  because they are separately kept in sync — there is no second copy to drift.
- Reinforces Rule 1 at the view layer: the prohibition is not only on a second source of *data*, but
  on a second source of *operational truth* across a workspace's views.
- Applies to every Business Workspace. *(E.g. the Payment workspace's hero total, Summary total, and
  Ledger footer total are one projection of the certified `FIN.fundLedger` debits — never three
  separate sums.)*

---

## Application

- **P2‑S2** established the first true Business Workspace and the layering above (approved).
- **P2‑S3** delivered the first **Operational Workspace** (Member Financial Lifecycle),
  honoring Rules 1–3.
- Every new Business Module opens its **own** workspace under these rules; future phases begin a
  new business unit rather than extending an existing workspace.

---

## Version history

- **1.0** — Rules 1–2, ratified at the P2‑S2 architectural review.
- **1.1** — added Rule 3 (State / History / Capability), ratified at the P2‑S3 architectural
  review. Issued as a new version (frozen artifacts change only by new version, never in‑place);
  supersedes 1.0.
- **1.2** — added Rule 4 (Intent / Authorization / Execution / Result for Operational Workspaces),
  ratified at the P3‑000 approval. Supersedes 1.1.
- **1.3** — added Rule 5 (declare the Business Boundary: owns / does not own — every Business
  Module), ratified at the P4‑000 approval. Supersedes 1.2.
- **1.4** — added Rule 6 (one source of operational truth; views are projections of the same
  certified state — every Business Workspace), ratified at the P4‑S1 approval. Supersedes 1.3.

---

*Frozen governance artifact. Standing design rules for all Business Workspaces.*
