# Navigation v3 — Original Diwan Work (Record)

> This file records the **original, Diwan-native** navigation v3 work — the design
> exercise and the shipped implementation. It is the counterpart to
> `NAVIGATION_REFERENCE_STUDY.md`: that file studies *external* references; this
> one documents *our own* path. Keep the two separate.

---

## 1. Origin

Navigation v2 was an **accordion sidebar** (one section open at a time, premium
typography). It shipped and merged, but the owner asked to rethink navigation
**from first principles** for a large financial application with dozens of modules,
with the primary objective of **reducing cognitive load and keeping the main
sidebar permanently short**.

## 2. The three concepts (design-first exercise)

An interactive prototype presented three distinct architectures, all capping the
top level at a small number of domains:

- **Concept A — Two-stage: domain rail + persistent context panel.**
  A short primary column of domains beside a panel showing only the selected
  domain's pages (Outlook/Jira family). *Pros:* short rail forever, persistent
  context, visual browsing. *Cons:* two columns cost width; one click to switch.
- **Concept B — Persistent icon rail + contextual fly-out.**
  A slim icon-only rail (one icon per domain); hovering opens a fly-out of that
  domain's pages over the workspace without reflow. *Pros:* maximum workspace,
  always short, fast hover. *Cons:* relies on icon recall; fly-out transient.
- **Concept C — Favorites + recents + command palette (⌘K).**
  An ultra-short rail of pinned/recent items; everything else behind ⌘K + an
  "all modules" grid. *Pros:* shortest rail, scales to hundreds. *Cons:* leans on
  search; weaker discovery.

**Recommendation at the time:** Concept A as the backbone, with ⌘K + pins as
accelerators. The owner selected **Concept B** for production.

## 3. Concept B — shipped (PR #200, merged to `main`)

Concept B replaced the v2 accordion as the production sidebar.

**Behavior**
| Surface | Behavior |
|---|---|
| Desktop rail | 7 domain icons only; active domain = calm white tile + reserved lime marker |
| Hover a domain | Contextual fly-out lists that domain's pages beside the rail (no reflow) |
| Click / Enter a domain | Multi-page → pinned keyboard-navigable menu; single-page → navigates directly |
| Narrow (≤768px) | Off-canvas drawer with full labelled list; `☰` toggles |

**Implementation**
- `public/index.html` — a domain icon (`.nbg-ico`) + `aria-label`/`title` added to
  each of the 7 section headers. No routing/nav items changed.
- `public/css/app.css` — one authoritative `body.nav-b` block (last in cascade)
  defining the 72px icon rail, fly-out header, active-domain marker, and the narrow
  labelled-drawer fallback.
- `public/js/sidebar.js` — rewritten for the single-mode rail: hover fly-out,
  click-to-pin menu (ArrowUp/Down · Home/End · Enter · Escape), active page +
  active-domain mirroring, overlay drawer on narrow. Routing (`window.nav`) and
  role-based visibility (`applyDataProtection`, `#sbsec-reservations`) preserved
  via non-invasive wrappers.

**Identity** — navy chrome in both themes (rail is the identity anchor); lime
confined strictly to the active marker; no accordion; workspace never reflows.

**Domains (production IA, unchanged):** Overview · Lunch Fund · Diwan Fund ·
Reservations · Donations · Members (incl. subscriptions/reports) · System.

## 4. Refinement direction (design-preview stage)

A follow-up brief pushed Concept B toward **enterprise production quality**
(benchmark feel: Linear / Stripe / Microsoft 365 / GitHub / Figma / Slack) while
**freezing the architecture**. The key evolution: the transient hover fly-out
becomes a **persistent, independent Context Panel** — the full two-stage system:

```
Primary Rail  →  Context Panel (persistent)  →  Workspace (stable)
```

Refinement goals (design-preview delivered, not yet in production):
- Rail: clearer active container + slight scale, faster hover, better optical
  centering, top identity mark.
- Context panel: independent floating card, **272px**, wider padding, comfortable
  white-space; **quiet in-panel grouping** for large modules (no accordion).
- Typography: stronger module titles (16/800), larger comfortable page labels
  (14.5px), no wrapping.
- Active: slightly stronger background + reserved-lime marker (no glow).
- Motion: panel swap 180–220ms ease-out, no bounce.

The formal tokens for this refinement are specified in
`DIWAN_NAVIGATION_DESIGN_SYSTEM.md`.

## 5. Frozen invariants

No accordion · no nested expanding lists · no rail width change · no workspace
shift · lime reserved as a subtle marker · solid navy chrome · Arabic-first, RTL.

## 6. Status

- Concept B: **shipped**, merged to `main` (PR #200).
- Two-stage refinement: **design specified** (this record + design system);
  implementation pending owner approval.
- Reference study / recreations / translation: research artifacts, **separate from
  production** — see the companion files.
