<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     Standing design rules for every Business Workspace. Immutable; a change is
     issued as a NEW version, never an in-place edit. Applies to ALL current and
     future Business Modules, not only the Member Financial Lifecycle.
     ═══════════════════════════════════════════════════════════════════════════ -->

# Business Workspace — Design Rules

**Document ID:** GOV‑WS‑01
**Version:** 1.2 (FROZEN)
**Status:** RATIFIED · STANDING
**Established:** 2026‑07‑20 · Rules 1–2 (P2‑S2 review) · Rule 3 (P2‑S3 review) · Rule 4 (P3‑000 approval)
**Scope:** every Business Workspace of Diwan — all current and future Business Modules.
Rules 1–3 apply to **every** Business Workspace; Rule 4 applies to every **Operational** Workspace.

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

---

*Frozen governance artifact. Standing design rules for all Business Workspaces.*
