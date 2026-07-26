# Diwan Navigation Lab — 10 Concepts

> **Research exercise — invent from scratch.** Ignore the current sidebar; pretend
> Diwan has no navigation yet. This lab defines **10 fundamentally different
> navigation models** — not color variations, but distinct interaction paradigms —
> each with its own philosophy, visual language, behavior, and personality. It
> closes with an **objective 11-criterion scoring matrix** and a **top-3
> recommendation**.
>
> **Interactive exhibition:** `prototypes/diwan-navigation-lab.html` — all ten
> concepts, switch instantly, every state explorable (viewport · theme · RTL/LTR ·
> collapse), plus the live scoreboard.

Shared test model across all concepts (so they are comparable): Diwan's 7 domains
— Overview · Lunch Fund · Diwan Fund · Members & Dues · Donations · Reservations ·
System.

Legend for the per-concept attribute tables: **Str**ucture · **Vis**ual identity ·
**Int**eraction · **Spc** spacing · **Typ**ography · **Ico**n · **Col**or ·
**Act**ive · **Hov**er · **Clp** collapse · **Mob**ile · **Tab**let · **Dsk**top ·
**Anm** animation · **A11y** accessibility.

---

## 01 · Meridian — two-stage rail + context

**Philosophy.** The rail orients, the context panel reads, the workspace stays
stable. The calm enterprise backbone.

| | |
|---|---|
| Str | Icon rail → persistent context panel → workspace (three zones) |
| Vis | Deep-navy chrome, one reserved lime marker; institutional calm |
| Int | Click a domain → panel swaps; click a page → workspace loads |
| Spc | 4/8 grid; 66px rail, 216–272px panel, 44px rows |
| Typ | IBM Plex Sans Arabic; 16/800 titles, 14.5/600 rows |
| Ico | Outline, 1.7 stroke, 22px |
| Col | Navy #0c1626/#14223c + lime #CBF000 (marker only) |
| Act | White tile + thin lime bar + inked icon (never a fill) |
| Hov | Subtle white wash (.06–.08), 130ms |
| Clp | Panel hides; rail persists; workspace never reflows |
| Mob | Off-canvas drawer (rail becomes full labelled list) |
| Tab | Rail + panel; panel overlays on narrow tablets |
| Dsk | Both stages persistent |
| Anm | 180–220ms ease-out panel swap, no bounce |
| A11y | Full keyboard menu, lime focus ring, active ≠ color-only |

**Advantages** — always short, scales to dozens of modules, persistent context,
excellent long-session readability. **Disadvantages** — two columns cost width;
not the most visually novel. **Ideal** — the daily enterprise financial app.
**Scalability** — excellent (rail fixed, panel grouped).

## 02 · Ledger Spine — navigation as a bound ledger

**Philosophy.** An accounting metaphor: numbered, hairline-ruled sections like the
pages of a ledger book. A rooted, unmistakably financial identity.

| | |
|---|---|
| Str | Numbered ruled spine (01–07) → page-like workspace |
| Vis | Cream paper, ink text, gold bookmark ribbon; editorial warmth |
| Int | Click a ruled row; active row gets a gold ribbon edge |
| Spc | Generous 26px gutters; tall ruled rows |
| Typ | Serif display (Naskh/Iowan) + mono numerals; ink hierarchy |
| Ico | None — **numerals** (01–07) are the "icons" |
| Col | #f2eee4 paper, #20180f ink, #b8892f gold |
| Act | Gold ribbon bar + bolder ink |
| Hov | Warm paper darkening |
| Clp | Collapses to a numbered spine (numbers only) |
| Mob | Numbered list, full-width rows |
| Tab | Spine + page |
| Dsk | Full ruled spine |
| Anm | Minimal — ink settle, ribbon slide |
| A11y | High ink contrast, numerals aid recall; focus underline |

**Advantages** — a unique financial identity that imprints in memory, numbering
speeds recall, premium typography. **Disadvantages** — the classic tone may feel
less "modern"; heavy growth needs grouping. **Ideal** — a finance platform that
wants a distinctive identity. **Scalability** — good with numbering + grouping.

## 03 · Command — command-palette first (⌘K)

**Philosophy.** A power tool: almost no persistent chrome; everything lives behind
search + a command palette, with a tiny breadcrumb for location.

| | |
|---|---|
| Str | Top command bar + ⌘K palette overlay + breadcrumb |
| Vis | Near-black, monospace, terminal restraint |
| Int | ⌘K opens palette → type → jump; breadcrumb shows location |
| Spc | Dense, technical; 8px rhythm |
| Typ | Monospace UI, amber highlight |
| Ico | Minimal/technical, used sparingly |
| Col | #0a0b0d, amber #e6a94a accent |
| Act | Breadcrumb segment + palette selection |
| Hov | Row highlight in palette only |
| Clp | Already near-zero chrome (nothing to collapse) |
| Mob | Full-screen palette on tap |
| Tab | Same as desktop |
| Dsk | Keyboard-first |
| Anm | Instant; palette fade ~120ms |
| A11y | Superb for keyboard; weaker for discovery/pointer users |

**Advantages** — fastest for experts, minimal chrome = maximum workspace, scales to
hundreds of screens. **Disadvantages** — steep learning curve for novices, weaker
discovery, typing-dependent. **Ideal** — expert heavy users. **Scalability** —
excellent for experts.

## 04 · Dock — OS-style dock, modules as apps

**Philosophy.** The operating-system metaphor: each module is an "app" in a
magnifying dock. Familiar and a little playful.

| | |
|---|---|
| Str | Bottom (or side) dock of app tiles + full workspace above |
| Vis | Graphite + translucent glass dock; squircle tiles |
| Int | Hover magnifies; click launches module; running-dot marks active |
| Spc | Tight dock cluster; airy workspace |
| Typ | Sans; labels on hover/tooltip |
| Ico | **Filled duotone** squircle app icons, per-module color |
| Col | Graphite #1b1e26 + per-module gradients |
| Act | Running dot under the tile |
| Hov | Magnify (scale 1.16, translateY) spring |
| Clp | Dock auto-hides; reveal on edge |
| Mob | Bottom app bar (native pattern) |
| Tab | Bottom dock |
| Dsk | Floating dock |
| Anm | Springy magnify, bounce on launch |
| A11y | Familiar; tooltips needed; magnify can distract |

**Advantages** — instantly familiar, full workspace, great for touch/tablet.
**Disadvantages** — icon-recall dependent, no persistent sub-context, can read
consumer rather than enterprise. **Ideal** — touch/kiosk or few modules.
**Scalability** — limited (tightens past ~12).

## 05 · Orbit — radial menu around a hub

**Philosophy.** Spatial, touch-first: domains orbit a central hub and bloom on tap.
Spatial memory over reading.

| | |
|---|---|
| Str | Center hub + domains on a ring; bloom to reveal |
| Vis | Dark space, geometric thin marks, teal glow-ring |
| Int | Tap hub → nodes bloom; tap a node → active + workspace |
| Spc | Radial; equal angular spacing |
| Typ | Mono labels, minimal text |
| Ico | Thin geometric, centered in circular nodes |
| Col | #0a0d13 + teal #5fcdb0 |
| Act | Node scales + ring highlight |
| Hov | Node lift/glow |
| Clp | Collapses to just the hub |
| Mob | Excellent — thumb-reach radial |
| Tab | Excellent — touch |
| Dsk | Works but unusual for mouse |
| Anm | Bloom stagger, spring scale |
| A11y | Hard for keyboard; needs a linear fallback |

**Advantages** — unique and striking, great for touch/kiosk, fast spatial recall.
**Disadvantages** — unfamiliar for desktop software, weak past a handful of
domains, accessibility challenges. **Ideal** — touch kiosk / showcase.
**Scalability** — weak (one ring fills).

## 06 · Canvas — infinite plane + minimap

**Philosophy.** Spatial navigation: modules are zones on a plane you pan between; a
minimap keeps you oriented.

| | |
|---|---|
| Str | Zones on a dotted plane + corner minimap |
| Vis | Light blueprint; dotted grid; technical cards |
| Int | Click a zone to focus (outline); minimap dot follows |
| Spc | Free spatial placement |
| Typ | Technical sans + mono captions |
| Ico | **Technical/architectural** line icons |
| Col | #eaedf1 grid, blueprint blue #2b5aa0 |
| Act | Zone outline + minimap highlight |
| Hov | Zone border tint |
| Clp | Zoom-to-fit / minimap-only |
| Mob | Minimap-driven list fallback |
| Tab | Pan + zones |
| Dsk | Pan/zoom canvas |
| Anm | Pan easing, zone focus |
| A11y | Spatial is hard for SR/keyboard; needs list mode |

**Advantages** — strong spatial memory, scales horizontally, suits visual grouping
and relationships. **Disadvantages** — higher learning curve, orientation needs the
minimap, poor for linear lists. **Ideal** — systems with spatial relations.
**Scalability** — good spatially.

## 07 · Timeline — fiscal period as the axis

**Philosophy.** Finance is temporal. Make the fiscal period the primary axis;
modules become tracks beneath it. Period-and-close first.

| | |
|---|---|
| Str | Horizontal period axis + module tracks below |
| Vis | Editorial paper; oxblood accent; ruled tracks |
| Int | Pick a period (column) + a module (track) |
| Spc | Even track rhythm; period columns |
| Typ | Editorial serif/sans mix; mono period labels |
| Ico | Minimal; period markers |
| Col | #fbfbf9 + oxblood #7a2e28 |
| Act | Current period column + track highlight |
| Hov | Track bar tint |
| Clp | Collapse to the axis only |
| Mob | Vertical period scrubber |
| Tab | Axis + tracks |
| Dsk | Full timeline |
| Anm | Period scrub, track fill |
| A11y | Period model intuitive for accountants; needs labels |

**Advantages** — matches the accountant's mental model (periods/closes), constant
temporal context, easy cross-period comparison. **Disadvantages** — unusual as the
primary nav, non-temporal modules feel forced, limited horizontal room. **Ideal** —
financial reporting & closes. **Scalability** — moderate.

## 08 · Deck — full-card switcher

**Philosophy.** Each module is a large card that comes forward — a tactile,
app-switcher feel with strong per-module color identity.

| | |
|---|---|
| Str | Stacked cards + a tab strip |
| Vis | Vivid per-module color, big rounded cards |
| Int | Click a tab/card to bring it front; swipe on mobile |
| Spc | Large card padding; airy |
| Typ | Bold display headings |
| Ico | Large filled per-card glyph |
| Col | Per-module vivid gradients on dark |
| Act | Frontmost raised card |
| Hov | Card lift |
| Clp | Collapse to tab strip only |
| Mob | Swipe deck (native card metaphor) |
| Tab | Deck + strip |
| Dsk | Deck center-stage |
| Anm | Card slide/scale flip |
| A11y | Big targets; parallel work is weak |

**Advantages** — visually engaging and tactile, per-module color identity, great on
mobile (swipe). **Disadvantages** — shows one module clearly, weak for parallel
work, can read consumer. **Ideal** — mobile / few modules. **Scalability** —
limited.

## 09 · Columns — cascading Miller columns

**Philosophy.** Progressive disclosure: drill domain → area → page → detail across
cascading columns. Built for deep hierarchies.

| | |
|---|---|
| Str | Cascading columns (Finder-style), selection chain |
| Vis | Neutral, technical, thin dividers |
| Int | Select in a column → next column opens; chain stays visible |
| Spc | Even column widths (~200px) |
| Typ | Neutral sans; clear row rhythm |
| Ico | Small outline + chevrons |
| Col | #f5f6f8 + blue #2b5aa0 selection |
| Act | Highlighted selection chain across columns |
| Hov | Row tint |
| Clp | Collapse to a single column with breadcrumb |
| Mob | One column at a time (drill navigation) |
| Tab | Two–three columns |
| Dsk | Full cascade |
| Anm | Column slide-in |
| A11y | Strong keyboard model (arrow between columns), clear location |

**Advantages** — excellent for deep hierarchies (150+ pages), the location chain is
always visible, professional and familiar. **Disadvantages** — costs horizontal
width, needs a mobile drill adaptation, less visual "personality." **Ideal** — deep
hierarchies. **Scalability** — excellent for depth.

## 10 · Zen — ambient, summoned on demand

**Philosophy.** Content first: the chrome is hidden until summoned. Maximum
workspace, minimum distraction.

| | |
|---|---|
| Str | Hidden nav; a summon control + a tiny presence indicator |
| Vis | Near-empty, huge whitespace, hairline type |
| Int | Summon (button/edge) → centered minimal overlay list |
| Spc | Maximal whitespace |
| Typ | Thin/light weights, large |
| Ico | Almost none — text-led |
| Col | #0e0f11 + a single lime dot |
| Act | Subtle dot / faint marker |
| Hov | Gentle text brighten |
| Clp | Default state *is* collapsed |
| Mob | Gesture/edge reveal |
| Tab | Summon overlay |
| Dsk | Chrome-on-demand |
| Anm | Fade/blur reveal |
| A11y | Needs a persistent summon affordance + shortcut |

**Advantages** — maximum focus and space, refined calm, excellent for reading/review.
**Disadvantages** — weaker discovery (hidden), extra steps to navigate, poor for
heavy switching. **Ideal** — reading/review modes. **Scalability** — moderate.

---

## Objective scoring

Each concept scored 0–10 on 11 criteria. The **weighted total** reflects
enterprise-financial priorities (not beauty): Financial suitability ×2.2 ·
Enterprise suitability ×2.2 · Readability ×2 · Scalability ×1.8 · Long-term
viability ×1.8 · Accessibility ×1.5 · Visual/Learning/Maintenance/Implementation ×1
· Innovation ×0.8.

| # | Concept | Vis | Read | Ent | Fin | Scl | A11y | Learn | Maint | Impl | Inno | Long | **Weighted** |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 01 | **Meridian** | 7 | 9 | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 5 | 10 | **9.0** |
| 02 | **Ledger Spine** | 9 | 8 | 8 | 9 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | **8.1** |
| 09 | **Columns** | 6 | 8 | 9 | 8 | 9 | 8 | 7 | 8 | 7 | 6 | 8 | **7.9** |
| 03 | Command | 7 | 7 | 7 | 7 | 9 | 6 | 4 | 8 | 7 | 9 | 7 | **7.1** |
| 07 | Timeline | 8 | 7 | 6 | 8 | 6 | 6 | 6 | 6 | 6 | 8 | 6 | **6.6** |
| 04 | Dock | 8 | 7 | 6 | 5 | 5 | 7 | 9 | 7 | 7 | 7 | 5 | **6.3** |
| 10 | Zen | 8 | 8 | 5 | 5 | 6 | 6 | 6 | 7 | 7 | 8 | 6 | **6.3** |
| 06 | Canvas | 8 | 6 | 5 | 5 | 7 | 5 | 5 | 6 | 5 | 9 | 6 | **5.9** |
| 08 | Deck | 9 | 6 | 5 | 4 | 4 | 6 | 8 | 6 | 6 | 8 | 5 | **5.7** |
| 05 | Orbit | 9 | 6 | 4 | 4 | 4 | 5 | 6 | 6 | 5 | 10 | 4 | **5.2** |

(Learn/Maint/Impl are scored so **higher = easier**.)

## Recommendation — the strongest three

Not by appearance — by fit to a long-lived enterprise financial platform.

1. **Meridian (01) — the backbone.** Highest on the priorities that matter most
   (enterprise, financial, scalability, readability, long-term). It stays short
   forever, keeps context persistent, and is the safest ten-year bet. This is also
   Diwan's shipped Concept B, so it is proven, not speculative.
2. **Columns (09) — for depth.** The strongest answer if Diwan's page count grows
   into the deep hundreds: cascading columns keep the location chain visible and
   scale by depth without accordion. A natural *evolution* of Meridian's context
   stage for very deep modules.
3. **Ledger Spine (02) — for identity.** The most distinctive *financial* identity
   in the set, and it scores well on suitability. Best used as the **visual
   language** layered onto Meridian's structure (numbered, ruled sections) to make
   the platform unmistakably Diwan — or a **Command (03)** ⌘K layer as a
   power-user accelerator.

**Deliberately not recommended as primary:** Orbit, Deck, Canvas — the most
*innovative* and beautiful, but they lose decisively on enterprise suitability,
scalability, and accessibility. Beauty must emerge from solving the problem; here it
would fight it.

### Synthesis for the next decade

The winning identity is **Meridian as the structural backbone**, optionally dressed
in **Ledger's** numbered-ruled identity, with a **Command ⌘K** accelerator and a
**Columns** drill for the deepest modules — one coherent system, chosen for
measurable UX advantage, not a collage. See `WHY_EVERY_DECISION_EXISTS.md` for the
decision rationale and `DIWAN_NAVIGATION_DESIGN_SYSTEM.md` for the tokens.
