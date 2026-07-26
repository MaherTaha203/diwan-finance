# Navigation Reference Study

> **Purpose: research only.** This document is completely separate from the
> production Diwan navigation work. The reference designs studied here are **not**
> to be copied into production. They are reverse-engineered as examples of modern
> navigation systems, and their *underlying design language* — never their
> implementation — is translated into the Diwan identity in the companion files.

**Companion documents**
- `NAVIGATION_V3_ORIGINAL.md` — the original Diwan navigation work (context).
- `REFERENCE_RECREATIONS.md` — isolated, un-branded educational recreations.
- `DIWAN_TRANSLATION.md` — each recreation translated into the Diwan language.
- `DIWAN_NAVIGATION_DESIGN_SYSTEM.md` — the resulting formal system.

**References studied** (5 attached images, anonymized as R1–R5):

| # | Working name | Family | Theme |
|---|---|---|---|
| R1 | *Budget* | Light finance app | Light, solid |
| R2 | *Thor* | Dark DeFi console | Dark, neon |
| R3 | *ReSync* | Light file manager | Light, solid |
| R4 | *Good Day* | Glassmorphism workspace | Light, frosted |
| R5 | *Aceagency* | Glassmorphism agency app | Light, frosted |

All five share one master pattern: a **two-state left navigation** — an expanded
labelled panel that collapses to an **icon rail**, with the collapsed state
revealing labels on hover. Everything below reads that master pattern through
each reference's specific choices.

---

## Reverse-engineering axes

For every reference: *navigation philosophy · visual hierarchy · layout system ·
component relationships · typography · spacing · icon rhythm · active state ·
hover state · context panel · primary rail · floating panels · motion · shadow ·
radius · color usage · white-space strategy.*

Measurements are read visually from the images and expressed in relative,
transferable terms (the exact px are the *designer's* grid, reconstructed).

---

## R1 — *Budget* (light finance app)

A pill-shaped white panel of primary destinations with a persuasive billing card
welded to the bottom; collapses to a pure icon rail that keeps the billing card
as a single gradient tile.

- **Philosophy** — "Destinations + one goal." Flat list of top destinations, no
  nesting; the bottom card drives the single commercial action (upgrade).
- **Visual hierarchy** — (1) bold near-black item labels → (2) muted `Menu` /
  `Account` section labels → (3) the saturated gradient card, which wins the eye
  last-but-loudest because it is the only color on the panel.
- **Layout** — single column; two quiet groups (`Menu`, `Account`); `Log out`
  pushed down by a spacer; billing card pinned to the floor.
- **Component relationships** — icon + label rows are peers; section labels are
  non-interactive dividers; the card is a self-contained module.
- **Typography** — one family; labels ~15px/600 near-black; section labels
  ~11px/600 muted uppercase-ish; card headline bold on tint.
- **Spacing** — generous row rhythm (~44–52px rows), calm; card sits in its own
  padded well.
- **Icon rhythm** — 24px outline, 1.75 stroke, evenly weighted, single accent-free
  ink so nothing competes with the card.
- **Active state** — barely expressed (top item only): the design leans on
  location, not decoration.
- **Hover** — implied subtle row tint.
- **Context panel** — none; this is a single-stage nav.
- **Primary rail (collapsed)** — icons only + the card reduced to a gradient tile,
  proving the bottom-anchor survives collapse.
- **Floating panels** — the whole nav is one floating rounded panel.
- **Motion** — chevron toggles width expand/collapse.
- **Shadow** — soft, low; the panel floats a little off the canvas.
- **Radius** — large on the container (~20px), medium on rows/card.
- **Color usage** — monochrome nav + **one** gradient reserved for the commercial
  card. Discipline: color = call to action.
- **White-space** — high; the panel breathes, the card is the only dense object.

**Successful because** it is calm and legible; the single splash of color makes
the one action unmissable. **Scalable?** Only modestly — a flat list stops
scaling past ~7–9 items (no grouping depth, no search). **Do not copy** the
upgrade/billing card, and do not adopt "no active state." **Inspires Diwan:** the
bottom-anchored utility module that survives collapse (for Diwan: a treasury /
context summary, not a sales card); the one-reserved-color discipline.

---

## R2 — *Thor* (dark DeFi console)

The most complete two-state study of the set: dark rail, labelled panel, **hover
tooltip flyouts** on the collapsed rail, and a social footer — shown across
several frames including the flyout mechanics.

- **Philosophy** — "Console." Dense operational list with strong active feedback;
  power-user oriented.
- **Visual hierarchy** — active pill (loudest) → grouped operations → utility
  rows (Vesting, Stats) → social footer.
- **Layout** — brand + wordmark header; one operations group; loose utilities;
  `Collapse Sidebar` control; social-icon footer row.
- **Component relationships** — items are peers; two can be "active-colored"
  simultaneously (a primary green, a secondary cyan) signalling *type* of
  destination, not just selection.
- **Typography** — one family; ~14px labels; header wordmark heavier; muted ink
  for inactive.
- **Spacing** — tighter than R1 (console density) but still even.
- **Icon rhythm** — 20–22px outline, consistent; active icon inherits the pill ink.
- **Active state** — **full-width saturated pill** (neon green / cyan). Extremely
  legible, but heavy and identity-defining.
- **Hover (collapsed)** — dark **tooltip bubble with a pointer** appears beside the
  icon; a group (socials) expands into a horizontal bubble. This is the canonical
  collapsed-rail affordance.
- **Context panel** — none; the flyout *is* the transient context.
- **Primary rail** — narrow icon rail mirrors the panel exactly.
- **Floating panels** — rounded dark cards; flyouts are separate floating bubbles
  with pointers.
- **Motion** — hover reveals tooltip (fast, ~150ms); collapse animates width.
- **Shadow** — deep, large-blur dark shadows sell the float on the gradient page.
- **Radius** — pill (full) on items; large on containers; rounded bubbles.
- **Color usage** — two neon accents carry meaning; the rest is desaturated navy.
- **White-space** — moderate; denser than the light refs, still rhythmic.

**Successful because** orientation is instant — you always know the active item
and its *type*. **Scalable?** Yes for the rail (icons scale), less for the flat
operations list. **Do not copy** the neon saturated pills (they would hijack the
Diwan identity) or the crypto/social chrome. **Inspires Diwan:** the
**collapsed-rail hover flyout with a pointer** (already Diwan's Concept B), and the
idea that active state can encode *type* — for Diwan, via the per-fund tone color
on the icon, never a neon fill.

---

## R3 — *ReSync* (light file manager)

A Google-Drive-class **tree**: a `+ Add New` primary action, nested expandable
folders, a two-tier active language, and a storage-quota card at the bottom.

- **Philosophy** — "Browse a hierarchy." Navigation *is* the data tree; depth and
  expansion are first-class.
- **Visual hierarchy** — primary `+ Add New` → active section pill → selected file
  tint → nested children (indented, lighter) → utilities → storage card.
- **Layout** — logo + `+ Add New`; tree (Home / My Drive ▸ Ex/Dependency ▸ files /
  Database); flat utilities (Computer, Recent, Trash); a `Channel /…` label;
  Starred, Timeline; storage card floor.
- **Component relationships** — parent rows own children by **indentation +
  connector**; expansion chevrons per branch; two active tiers (section vs file).
- **Typography** — one family; ~15px labels; monospace-ish file names; muted
  section captions.
- **Spacing** — comfortable; indentation step is a clear, consistent unit.
- **Icon rhythm** — 20px outline + file-type glyphs; green accent on active only.
- **Active state** — **two tiers**: solid-green **section** pill + pale-green
  **selected row** tint. Elegant separation of "where I am" vs "what I opened."
- **Hover** — row tint.
- **Context panel** — the tree itself; the collapsed rail is the primary-icon layer
  of the same tree.
- **Primary rail** — icons for the top branches + a white elevated `+` tile + a
  storage ring at the foot.
- **Floating panels** — rounded white panels; storage card is a nested panel.
- **Motion** — branch expand/collapse (height), chevron rotate.
- **Shadow** — soft, medium.
- **Radius** — large container; **pill** on the active section; medium rows.
- **Color usage** — single green accent, used at two saturations (solid vs tint).
- **White-space** — comfortable; indentation creates its own rhythm.

**Successful because** the two-tier active language answers two questions at once
and the tree makes deep structure walkable. **Scalable?** Very — trees scale to
thousands of nodes. **Do not copy** the **accordion/expand-in-place tree** (Diwan
explicitly forbids accordion nav) or the storage/quota card. **Inspires Diwan:**
the **two-tier active language** (module-active vs page-active) — Diwan expresses
this *across the two stages* (rail = module-active, panel = page-active) instead of
nesting; and the persistent primary CTA (`+ Add New` → for Diwan a scoped "new
voucher" action).

---

## R4 — *Good Day* (glassmorphism workspace)

The densest information design: frosted panels, **counter section labels**
(`Menu: 6`, `Service: 3`, `Settings: 6`), grouped **cards inside the nav**, badges,
avatar stacks, and a create-task FAB.

- **Philosophy** — "Cockpit." Everything reachable; grouping by *cards*; live
  status baked into the nav (counts, avatars).
- **Visual hierarchy** — greeting/identity → active blue pill → menu rows with
  inline status → service card → settings card → create FAB.
- **Layout** — avatar + greeting header; `Menu` group; `Service` card (integrations);
  `Settings` card (icon cluster); FAB. Each group titled with a **count**.
- **Component relationships** — sections are **cards**, not just labels; rows carry
  trailing affordances (filter icon, `+`, badge, avatar stack).
- **Typography** — one family; ~15–16px labels; bold greeting; small section
  counters; numerals in badges.
- **Spacing** — dense but organized because cards fence each group.
- **Icon rhythm** — 22px; brand logos in the service card; consistent tiles.
- **Active state** — **solid blue pill**, full width; collapsed → solid blue rounded
  tile.
- **Hover** — row tint; trailing controls appear.
- **Context panel** — the cards act as embedded sub-panels.
- **Primary rail** — icons + collapsed cards become icon stacks; FAB persists.
- **Floating panels** — frosted glass over a photo; nested white cards for groups.
- **Motion** — width collapse; card contents reflow to icons.
- **Shadow** — soft glass edges + inner light.
- **Radius** — large everywhere; pill active.
- **Color usage** — blue accent + semantic red badges + brand logos; glass tints.
- **White-space** — lower (cockpit density) but structured by cards.

**Successful because** it surfaces live status *in* the nav and fences complexity
into cards. **Scalable?** Yes via the card/group model; badges keep growth
legible. **Do not copy** the **glassmorphism** (breaks Diwan's solid navy chrome),
the FAB-in-nav, or avatar/plugin chrome. **Inspires Diwan:** **counter/section
labels** (e.g., `المديونية · ٤`), **badges for live financial status** (delinquent
count, pending vouchers), and **grouping by fenced card** inside the context panel
for large modules — done with quiet dividers, not glass cards.

---

## R5 — *Aceagency* (glassmorphism agency app)

The most restrained active state of the set and the cleanest **subtle** language:
bold-weight active (no fill), a paginated messages card, hover tooltips on the
collapsed rail, and a user-profile footer.

- **Philosophy** — "Calm surface." Minimal chrome; status via weight and small
  badges; people are first-class (messages).
- **Visual hierarchy** — `MENU` group → active row (bold + colored icon + badge) →
  inactive muted rows → `MESSAGES` card → user footer.
- **Layout** — window chrome + logo; `MENU` list; `MESSAGES` section with **‹ ›
  pagination**; people card; profile footer.
- **Component relationships** — active differs from inactive by **weight + icon
  color + badge only**; messages are a nested list card with its own controls.
- **Typography** — one family; ~15px; **active = heavier weight**, inactive = muted;
  this is the primary hierarchy device.
- **Spacing** — generous, airy.
- **Icon rhythm** — 22px; inactive icons desaturated grey, active icon inks up.
- **Active state** — **no pill, no fill**: bold label + colored icon + count badge.
  The reference proof that "active" needs neither background nor glow.
- **Hover (collapsed)** — **blue tooltip bubble with pointer**; messages collapse to
  an avatar stack with a `…` expander.
- **Context panel** — the messages card is a persistent sub-panel.
- **Primary rail** — icons; active shown via tooltip on hover; avatar stack for
  people.
- **Floating panels** — frosted; nested people card; tooltip bubbles.
- **Motion** — hover tooltip; pagination slide.
- **Shadow** — soft glass.
- **Radius** — large; rounded bubbles.
- **Color usage** — one blue accent + badge numerals; otherwise neutral.
- **White-space** — high.

**Successful because** it proves a premium, low-cognitive-load nav can signal
active state with *typography alone*. **Scalable?** The list is flat (limited), but
the pattern (weight + badge) scales beautifully. **Do not copy** glassmorphism, the
messages/people module, or the profile-as-footer. **Inspires Diwan (most of all):**
**active-by-weight-and-marker, not by fill** — this is exactly Diwan's "lime is a
subtle indicator, never a glow" rule; and **pagination/΅show-more** as a scale
valve inside a long section instead of infinite scroll.

---

## Synthesis — the shared design language

Stripped of skins, the five references teach one coherent system:

1. **Two states, one model.** A labelled panel and an icon rail are the *same*
   navigation at two densities. The rail is for orientation; the panel is for
   reading. (All 5.)
2. **The collapsed rail must speak.** A hover flyout/tooltip with a pointer returns
   the labels the rail hides. (R2, R5.)
3. **Group with quiet structure.** Section labels (R1, R5), counters (R4), or
   fenced cards (R4) — never raw long lists. Depth via *grouping*, and only where a
   true hierarchy exists, via a *tree* (R3).
4. **Active state is a spectrum — choose one end deliberately.** Loud saturated
   pills (R2, R4) read instantly but define the identity; weight-and-marker (R5) is
   premium and calm. A two-tier active (R3) answers "where" and "what" together.
5. **Anchor a utility zone at the floor.** Billing (R1), socials (R2), storage
   (R3), create-FAB (R4), profile (R5) — and it must survive collapse.
6. **Floating rounded panels + soft shadow** are the container grammar; radius and
   shadow scale with elevation; flyouts get their own elevation + pointer.
7. **One reserved accent.** Every reference restricts saturated color to a single
   role (action or active). Discipline, not palette size, reads as premium.
8. **Motion is small and functional.** Width collapse, hover reveal, chevron
   rotate, pagination slide — all fast, all ease-out, none decorative.

---

## Diwan Navigation Language v1 (ideas only — never the implementation)

The translation of the above into Diwan, expressed as principles. The concrete
tokens live in `DIWAN_NAVIGATION_DESIGN_SYSTEM.md`; the visual payoff lives in
`DIWAN_TRANSLATION.md`.

**DNL-1 · Two-stage, one truth.** Diwan already commits to the two-state model as
*Concept B*: a permanent **Primary Rail** (domain icons) + a **Context Panel**
(the active domain's pages). The rail orients; the panel reads. Borrowed from the
shared two-state pattern (all refs), but expressed as **rail + persistent panel**
rather than expand/collapse of one list.

**DNL-2 · The rail always speaks.** On the narrow rail, a **navy flyout with a
pointer** returns page labels on hover — R2/R5's tooltip mechanic, re-skinned to
Diwan navy (never neon, never glass).

**DNL-3 · Active = marker + tone, never glow.** Adopt **R5's restraint**: the active
page is *heavier weight + inked icon + a thin reserved-lime marker*, never a
saturated pill. The active **domain** on the rail gets a calm white tile + the same
lime marker. Two-tier active (R3) is expressed **across the two stages**:
rail = active-module, panel = active-page.

**DNL-4 · Group quietly, count meaningfully.** For large modules, the context panel
uses **quiet group headers** (R1/R5) and, where it adds signal, **counters/badges**
(R4) tied to real financial state — e.g., `الأعضاء المتأخرون · ٤`. No glass cards,
no accordion.

**DNL-5 · A financial anchor at the floor.** Replace the refs' billing/social/
storage anchors with a Diwan-appropriate **context summary** (e.g., treasury
position or the signed-in user) that survives collapse to a single tile.

**DNL-6 · One reserved color = lime.** Diwan's `--dx-lime` plays the role every
reference gives its single accent — but *only* as the active marker, upholding the
existing "lime is reserved" rule.

**DNL-7 · Solid navy chrome, not glass.** Reject R4/R5's glassmorphism and R2's
neon; keep Diwan's deep-navy floating panels with soft shadow and large radius —
the same *container grammar*, a different *skin*.

**DNL-8 · RTL-first, Arabic-first.** Every borrowed pattern is mirrored for RTL and
tuned for IBM Plex Sans Arabic legibility at long-session sizes (≥14.5px page
labels, ≥16px module titles). See the design system for the full type contract.

**DNL-9 · Scale valves.** When a module grows past a comfortable panel length, use
R5's **show-more/pagination** or R4's **grouping**, never nesting or infinite
accordion — preserving the frozen Concept-B architecture.

> **Boundary restated:** nothing above reproduces a reference. R1–R5 contribute
> *principles* (two-stage model, speaking rail, restrained active, quiet grouping,
> floor anchor, reserved color, functional motion). The skin, palette, typography,
> modules, and interaction details are Diwan's own.
