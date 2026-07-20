<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     Standing design rules for every Business Workspace. Immutable; a change is
     issued as a NEW version, never an in-place edit. Applies to ALL current and
     future Business Modules, not only the Member Financial Lifecycle.
     ═══════════════════════════════════════════════════════════════════════════ -->

# Business Workspace — Design Rules

**Document ID:** GOV‑WS‑01
**Version:** 1.0 (FROZEN)
**Status:** RATIFIED · STANDING
**Established:** 2026‑07‑20 (owner architectural review of P2‑S2)
**Scope:** every Business Workspace of Diwan — all current and future Business Modules.

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

---

## Application

- **P2‑S2** established the first true Business Workspace and the layering above (approved).
- **From P2‑S3 onward**, the Member Financial Lifecycle evolves into an **Operational
  Workspace** while maintaining this exact layering and honoring Rule 2.
- Any new Business Module opens its own workspace under these rules.

---

*Frozen governance artifact. Standing design rules for all Business Workspaces.*
