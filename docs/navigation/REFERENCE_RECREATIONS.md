# Reference Recreations (Educational — Never Shipped)

> **Educational only.** These recreations reproduce the *composition, spacing,
> hierarchy, typography, interaction, rhythm, and proportions* of the five
> reference navigations as faithfully as possible, **as isolated UI studies**.
>
> - **No Diwan branding. No Diwan colors. No Diwan modules.**
> - They exist to understand how the original designers built the systems.
> - **They will never ship.** The production translation lives in
>   `DIWAN_TRANSLATION.md` + `DIWAN_NAVIGATION_DESIGN_SYSTEM.md`.

**Live models:** the interactive recreations are in
`prototypes/reference-studies.html` (toggle **"Recreation"** per reference; also
published as an Artifact). This document is the written spec behind each one.

Each recreation uses **placeholder branding** (generic wordmarks like *Budget*,
*Thor*, *ReSync*, *Good Day*, *Aceagency*) and the reference's **own** palette —
because the point is to study *their* language, not to apply ours. That palette is
discarded at the translation step.

---

## R1 — *Budget* (light finance)

**Goal of the study:** how a flat destination list + a single commercial anchor
create a calm, one-action surface.

- **Container** — white pill panel, radius ~20px, soft low shadow; ~260px wide
  expanded, ~72px collapsed.
- **Composition** — `Menu` label → 5 destination rows → `Account` label → 2 rows →
  spacer → `Log out` → gradient billing card welded to the floor.
- **Rows** — 48–52px tall; 24px outline icon + ~15px/600 near-black label; ~12px
  icon-label gap; hover = faint grey tint.
- **Section labels** — ~11px/600 muted grey, letter-spaced.
- **Billing card** — blue→violet gradient, radius ~16px, white headline + white
  pill button; the only saturated element.
- **Collapse study** — labels drop; icons center in the rail; the card reduces to a
  single gradient tile — proving the floor-anchor survives collapse.
- **What to learn** — color discipline (one gradient), row rhythm, the survive-
  collapse anchor.

## R2 — *Thor* (dark DeFi console)

**Goal of the study:** the canonical two-state rail with **hover tooltip flyouts**
and a meaning-carrying active state.

- **Container** — dark navy card (~#0e1a30), radius ~18px; deep large-blur shadow
  over a soft gradient page; ~240px expanded / ~64px rail.
- **Composition** — brand + wordmark → operations group (Swap, Add Liquidity,
  Manage, Stake, Pending) → utilities (Vesting, Wallet, Thornode, Stats) →
  `Collapse Sidebar` → social-icon footer row.
- **Active** — full-width **saturated pill**: green (#39d98a) primary, cyan
  secondary; icon + label ink to the pill's contrast. Two can be colored at once
  to signal *type*.
- **Rows** — ~14px labels, muted inactive ink; 20–22px icons.
- **Flyout study** — collapsed rail: hovering an icon pops a **dark rounded tooltip
  with a pointer** beside it (~150ms); the social group expands into a horizontal
  bubble. This is the key interaction to reproduce.
- **What to learn** — flyout mechanics + pointer geometry; active-as-type; deep dark
  shadow for float.

## R3 — *ReSync* (light file manager)

**Goal of the study:** a real **tree** with a **two-tier active** language and a
persistent primary CTA.

- **Container** — white panels, radius ~20px, soft shadow; ~280px expanded /
  ~72px rail.
- **Composition** — logo → `+ Add New` outlined pill → tree (Home / **My Drive** ▸
  Ex/Dependency ▸ files / Database) → utilities (Computer, Recent, Trash) →
  `Channel/…` label → Starred, Timeline → storage-ring card.
- **Two-tier active** — solid-green **section** pill (My Drive) + pale-green
  **selected row** tint (Rules.png). Study how the two saturations separate
  "location" from "opened item."
- **Tree** — indentation step ~16px + branch chevrons; connector lines; file-type
  glyphs.
- **Rail study** — top-branch icons + elevated white `+` tile + circular
  storage-progress at the foot.
- **What to learn** — indentation rhythm, two-tier active, persistent CTA, quota
  card. *(Note: the tree's expand-in-place is intentionally NOT carried into
  Diwan.)*

## R4 — *Good Day* (glassmorphism cockpit)

**Goal of the study:** maximal information density kept legible by **cards +
counters + badges**.

- **Container** — frosted glass over a photo; nested white cards; radius large
  throughout; ~300px expanded / ~72px rail.
- **Composition** — avatar + greeting → `Menu: 6` group → `Service: 3` card
  (integrations) → `Settings: 6` icon-cluster card → create-task FAB.
- **Counters** — every section titled with a live count (`: 6`, `: 3`).
- **Active** — solid **blue** pill; collapsed → solid blue tile.
- **Status in nav** — trailing filter icon, `+`, red count badge, avatar stack on
  rows; brand logos in the service card.
- **Glass study** — translucent fills, inner top-light, soft edges; how legibility
  survives on a busy photo (heavy blur + high-contrast text).
- **What to learn** — counter labels, badges, fenced grouping cards. *(Glass, FAB,
  avatar/plugin chrome are study-only.)*

## R5 — *Aceagency* (glassmorphism, restrained)

**Goal of the study:** premium active state using **typography weight alone** + a
people module.

- **Container** — frosted glass over a blue swirl; radius large; ~300px / ~72px.
- **Composition** — window chrome + logo → `MENU` list → active row (**bold + inked
  icon + count badge, no fill**) → `MESSAGES` card with **‹ › pagination** → user
  footer.
- **Active** — no pill, no background: **weight + icon color + badge**. Reproduce
  exactly to feel how little is needed.
- **Flyout study** — collapsed: blue tooltip bubble with pointer; messages collapse
  to an avatar stack + `…` expander.
- **What to learn** — active-by-weight, pagination as a scale valve, tooltip on
  collapse. *(Glass + people module are study-only.)*

---

## How the recreations are built (fidelity notes)

- Reconstructed from the images at transferable proportions; exact px are the
  designers' grid, re-derived (see per-item specs above).
- Each uses its **reference palette** and a **placeholder wordmark** — deliberately
  *not* Diwan — so the study stays honest.
- Interactions reproduced: two-state expand/collapse, hover tooltip flyout (R2/R5),
  tree expand (R3, study-only), pagination (R5).
- **These files never enter `public/`. They are documentation studies only.**

Proceed to `DIWAN_TRANSLATION.md` to see each study rebuilt in the Diwan language.
