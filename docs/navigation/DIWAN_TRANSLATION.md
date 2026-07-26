# Diwan Translation

> Every reference recreation from `REFERENCE_RECREATIONS.md`, **translated into the
> Diwan Design Language**. We replace branding, typography, colors, spacing, icons,
> hierarchy, and interaction — **preserving only the underlying design
> principles**. The result must be *unmistakably Diwan*: solid navy chrome, IBM
> Plex Sans Arabic, RTL-first, lime reserved as a subtle marker, real Diwan
> modules.

**Live models:** `prototypes/reference-studies.html` — toggle **"Diwan"** per
reference to see the translation beside its recreation. Tokens: see
`DIWAN_NAVIGATION_DESIGN_SYSTEM.md`.

**The replacement contract (applied to every translation):**

| Layer | Reference | → Diwan |
|---|---|---|
| Branding | *Budget / Thor / ReSync / …* wordmarks | ديوان آل طه mark |
| Typography | each ref's Latin family | IBM Plex Sans Arabic, Arabic-first, RTL |
| Colors | blue / neon-green / green / glass | deep-navy chrome + **lime marker only** |
| Spacing | ref grids | Diwan 4/8 grid (design system §2) |
| Icons | ref icon sets | Diwan/Tabler outline, per-domain tone |
| Hierarchy | ref cues (fills, glass) | weight + marker + quiet grouping |
| Interaction | ref motion | 180–220ms ease-out swap; hover flyout; no bounce |
| Modules | ref content | Overview · Lunch/Diwan Funds · Members & Dues · Donations · Reservations · System |

---

## T1 — from R1 (*Budget*) → **Diwan calm destinations + floor anchor**

- **Keep the principle:** calm flat destinations + one reserved color + a floor
  anchor that survives collapse.
- **Translate:** the blue→violet **billing card** becomes a **treasury context
  tile** (المركز المالي / رصيد الخزينة) at the panel floor — informational, navy
  with a single lime figure, *not* a sales CTA. Rows become Diwan pages; `Menu` /
  `Account` become quiet Arabic group headers. The one reserved color is **lime**,
  used on the anchor's key figure and the active marker only.
- **Result:** a calm Overview panel where the only saturated ink is lime, and the
  treasury summary collapses to a single navy tile on the rail.
- **Discarded:** upgrade/commerce semantics, the gradient.

## T2 — from R2 (*Thor*) → **Diwan speaking rail (Concept B, production)**

- **Keep the principle:** two-state rail + **hover tooltip flyout with a pointer** +
  active state that encodes *type*.
- **Translate:** the neon green/cyan **pills** become Diwan's **calm white active
  tile + reserved-lime marker**; "type" is encoded by the **per-domain tone on the
  icon** (gold = Lunch, blue = Diwan Fund, slate = Members…), never a saturated
  fill. The dark tooltip becomes a **navy flyout** with the domain's Arabic pages;
  the social footer becomes a **user / session** anchor.
- **Result:** exactly Diwan's shipped Concept B — the reference's *mechanics*
  (speaking rail) with none of its *skin* (neon, crypto, socials).
- **Discarded:** neon pills, wallet/social chrome.

## T3 — from R3 (*ReSync*) → **Diwan two-tier active across two stages**

- **Keep the principle:** a **two-tier active** language + a persistent primary
  action.
- **Translate:** R3 nests the two tiers in one tree; Diwan **forbids accordion**, so
  we express the same two tiers **across the two stages** — the **rail** shows the
  active *module* (white tile + lime bar), the **context panel** shows the active
  *page* (weight + lime bar). Depth that R3 solves by nesting, Diwan solves by
  **quiet in-panel group headers** (e.g., Members & Dues → *الأعضاء / الاشتراكات
  والتحصيل / التقارير*). The `+ Add New` CTA becomes a **scoped action** where the
  domain warrants it (e.g., «سند جديد»). The storage-quota ring becomes an optional
  **period/close** status chip — financial, not disk.
- **Result:** the same "where am I / what did I open" clarity, with **zero
  accordion** and no tree.
- **Discarded:** expand-in-place tree, disk-quota card.

## T4 — from R4 (*Good Day*) → **Diwan counters + live financial badges**

- **Keep the principle:** density made legible by **counters, badges, and fenced
  grouping**.
- **Translate:** `Menu: 6` counters become Arabic **group headers with counts**
  (`التقارير · ٤`); the red notification badges become **semantic financial badges**
  — delinquent-member count, pending vouchers — in semantic color (separate from
  lime). The **glass** cockpit becomes **solid navy** panels; grouping "cards"
  become **quiet dividers** with headers (no glass). The FAB is dropped (actions
  live in the workspace, not the nav).
- **Result:** a context panel that surfaces *actionable financial state* inline
  (what needs attention reads at a glance) without glass or cockpit clutter.
- **Discarded:** glassmorphism, FAB-in-nav, plugin/avatar chrome.

## T5 — from R5 (*Aceagency*) → **Diwan restrained active + scale valve**

- **Keep the principle (the most important borrow):** **active by weight + marker,
  never by fill or glow**; and **pagination/show-more** as a scale valve.
- **Translate:** R5's bold-black active becomes Diwan's **white bold label + inked
  tone icon + thin lime marker** on navy. The blue count badge becomes a semantic
  Diwan badge. The frosted surface becomes solid navy. The people/messages module
  is dropped (not Diwan's domain); its **pagination** idea is kept as the
  **show-more** valve for very long modules (design system §10).
- **Result:** the calmest, most premium expression — proof that Diwan's
  "lime-is-reserved" rule and R5's philosophy are the same idea. This is the tonal
  target for the whole system.
- **Discarded:** glass, people module, profile-as-footer.

---

## What every translation shares (the Diwan signature)

1. **Solid navy chrome** in both light and dark — never glass, never neon.
2. **Lime is the only saturated color**, and only as the active marker / one key
   figure.
3. **Per-domain tone** lives on the **icon**, encoding destination type without a
   colored row.
4. **Active = background + weight + inked icon + lime marker** (shape cues, not
   color alone).
5. **Two stages, no accordion:** rail = module, panel = page; depth via quiet
   grouping + show-more.
6. **Arabic-first, RTL**, IBM Plex Sans Arabic, ≥14.5px page labels, no wrapping.
7. **Floor anchor** = financial context (treasury / session), not commerce/social/
   storage.
8. **Motion** = 180–220ms ease-out panel swap + fast hover; no bounce, no idle
   motion.

The five references contributed *principles*; the outcome is **unmistakably
Diwan** — which is exactly the deliverable's success criterion.
