# Why Every Decision Exists

> The permanent architectural rationale for **Navigation v3**. Every navigation
> decision is recorded here with: **why it exists · which UX problem it solves ·
> which reference influenced the idea · what was intentionally rejected · why the
> Diwan implementation is different.**
>
> This document is the contract that keeps Diwan from becoming a *collage* of
> references. We treat each reference as a **lesson**, extract the principle,
> discard the implementation, and rebuild it in the Diwan language — the way Apple
> learned from Braun without resembling it.

## The design standard

When someone sees the final navigation they must **not** say *"this looks like
Reference #3"* or *"this is inspired by Figma."* They must say:

> **"This feels like a financial platform that has matured for ten years."**

## Optimization order (non-negotiable)

Every decision below is justified against this order — never by beauty alone:

1. **Information clarity**
2. **Cognitive load**
3. **Navigation speed**
4. **Long-session comfort**
5. **Accessibility**
6. **Scalability**
7. **Brand identity**
8. **Visual beauty**

Beauty must *emerge from solving the problem*. If an idea has no measurable UX
advantage for **accountants**, **administrators**, cognitive load, scanning, or
**200+ screens**, it is not adopted — regardless of how good it looks.

**Live proof:** `prototypes/r2-applied-system.html` shows the full Diwan system
with the R2 lesson applied (a rail that speaks + type-encoded active), answering
"how does the system become when we apply the lesson, not the look."

---

## D1 — Two-stage architecture (Primary Rail → Context Panel → Workspace)

- **Why it exists.** A financial platform with dozens of modules cannot present
  every destination at once. Splitting *orientation* (rail) from *reading*
  (context) lets the top level stay tiny while any module's pages remain one step
  away.
- **UX problem solved.** *Information clarity + cognitive load.* The user answers
  two questions separately and instantly: "which domain am I in?" (rail) and "which
  page?" (panel) — instead of scanning one long mixed list.
- **Reference influence.** The two-state model is shared by **all five** references
  (labelled panel ⇄ icon rail).
- **Intentionally rejected.** R3's expand-in-place **tree** and the v2 **accordion**
  — both make depth cost vertical space and hide siblings.
- **Why Diwan differs.** Diwan expresses the two tiers as **two persistent stages**
  (rail = module, panel = page), never as one nesting list. Depth never pushes the
  layout.

## D2 — Permanently short primary rail (icons only)

- **Why it exists.** The rail is the backbone; it must be scannable in one glance
  and never grow as the system grows.
- **UX problem solved.** *Navigation speed + scalability.* A fixed set of ~7–12
  domain icons is parsed by **shape + position** (muscle memory) far faster than
  reading a growing text list — and it is stable at 50, 100, 200+ screens because
  pages live in the panel, not the rail.
- **Reference influence.** The collapsed icon rail (R1–R5).
- **Intentionally rejected.** R1's permanently-labelled flat list (stops scaling at
  ~9 items) and any rail whose width animates.
- **Why Diwan differs.** The rail width is an **invariant** (72px) — it never
  reflows the workspace, unlike the refs' expand/collapse that shifts content.

## D3 — The rail speaks on hover (context fly-out with a pointer)

- **Why it exists.** An icon-only rail risks ambiguity. Hover must instantly return
  the labels the rail hides.
- **UX problem solved.** *Cognitive load + discovery.* You get a short rail **and**
  full labels on demand — no memorization tax, no lost discoverability.
- **Reference influence.** **R2** and **R5** — the tooltip/fly-out bubble with a
  pointer beside the collapsed icon. *(This is the lesson your question targets.)*
- **Intentionally rejected.** R2's **neon** bubbles and social-group expansion;
  R2's crypto chrome.
- **Why Diwan differs.** The bubble is a **navy context panel** carrying the
  domain's actual Arabic pages + a tone icon header — a working navigator, not a
  decorative tooltip; RTL-mirrored, opens toward the workspace.

## D4 — Active state = background + weight + inked icon + reserved-lime marker (never a fill/glow)

- **Why it exists.** "Where am I" must be unmistakable for an all-day operator, but
  the chrome must stay calm across an 8-hour session.
- **UX problem solved.** *Information clarity + long-session comfort + accessibility.*
  Active is signalled by **four cues** (fill, weight, icon ink, lime bar) so it is
  legible without relying on color alone (colour-blind safe, high contrast).
- **Reference influence.** **R5** (active by weight + marker, no fill) is the tonal
  target; R3's two-tier active informs the rail-vs-panel split.
- **Intentionally rejected.** R2/R4's **saturated active pills** and any glow — they
  read instantly but fatigue the eye and would hijack the Diwan identity.
- **Why Diwan differs.** Lime is **reserved**: it appears only as the thin active
  marker, never as a surface. Active is a *shape* language, not a *color splash*.

## D5 — Type encoded by per-domain tone (on the active icon + carried into the workspace)

- **Why it exists.** In a multi-fund ledger, the single most dangerous error is
  posting to the **wrong fund**. The UI must make "which fund am I operating in"
  impossible to miss.
- **UX problem solved.** *Information clarity + error prevention (financial safety).*
  The active domain's **tone** (gold = Lunch, blue = Diwan Fund, slate = Members…)
  inks the active rail icon **and** the workspace hero/KPI accents, so the fund
  context is continuously visible where the work happens.
- **Reference influence.** **R2** — active color encodes *type*, not just selection
  (its green vs cyan actives).
- **Intentionally rejected.** R2's method of showing type via a **saturated fill**,
  and colouring *every* item.
- **Why Diwan differs.** Tone lives on the **icon and the workspace**, never as a
  row background; it is a quiet identity thread, not a neon state. This is a
  *measurable* advantage (fewer mis-posted vouchers), not decoration.

## D6 — Calm rest icons (no rainbow rail)

- **Why it exists.** If every resting icon carried its tone, the rail would become a
  rainbow and raise scanning cost.
- **UX problem solved.** *Cognitive load + scanning.* At rest, icons are calm
  monochrome; tone appears only on **hover/active**, exactly when type matters.
- **Reference influence.** R2 (tone-on-active) — but applied selectively.
- **Intentionally rejected.** An always-on multi-color rail (visual noise, competes
  with the reserved lime).
- **Why Diwan differs.** Type is revealed **on interaction**, keeping the resting
  rail quiet — a deliberate restraint the references do not exercise.

## D7 — No accordion, no nested expanding lists

- **Why it exists.** Accordions hide siblings and make every navigation a
  memory-and-click puzzle; they also make deep structure fragile.
- **UX problem solved.** *Navigation speed + long-session comfort.* The panel shows
  a whole module's pages at once; no expand/collapse dance.
- **Reference influence.** R3's tree is the *counter-example* studied and rejected.
- **Intentionally rejected.** The v2 accordion and R3's expand-in-place folders.
- **Why Diwan differs.** Depth is handled by **quiet grouping** inside the panel
  (D8), not by nesting — a frozen architectural invariant.

## D8 — Quiet in-panel grouping + counters + show-more (the scale valves)

- **Why it exists.** Some modules (Members & Dues) hold many pages; the panel must
  stay scannable at 15, 50, 150 pages.
- **UX problem solved.** *Scalability + information clarity.* Group headers
  (*Members / Dues & Collection / Reports*) chunk a long list; an optional
  **show-more** caps panel length; **counters** (`التقارير · ٤`) preview size.
- **Reference influence.** R1/R5 quiet section labels; **R4** counters; **R5**
  pagination.
- **Intentionally rejected.** R4's **glass grouping cards** and R3's nested tree.
- **Why Diwan differs.** Grouping is **flat headers + dividers** inside one panel —
  no cards, no glass, no nesting.

## D9 — Live financial badges (semantic, separate from lime)

- **Why it exists.** Administrators need "what needs attention" to read at a glance
  from the nav itself.
- **UX problem solved.** *Information clarity.* A count badge on *Delinquent
  Members* or *Pending Vouchers* surfaces actionable state before the user opens the
  page.
- **Reference influence.** **R4/R5** badges and counts.
- **Intentionally rejected.** R4's notification/avatar/plugin chrome.
- **Why Diwan differs.** Badges use **semantic financial color** (warning/positive),
  kept **separate from lime** so the active marker never competes with status.

## D10 — Floor anchor = financial context (not commerce / social / storage)

- **Why it exists.** The bottom of the nav is prime real estate; every reference
  anchors a utility there.
- **UX problem solved.** *Information clarity.* A persistent **treasury position**
  (or the signed-in user/period) gives constant orientation and survives collapse.
- **Reference influence.** R1 billing card, R2 socials, R3 storage ring, R4 FAB, R5
  profile — the *placement* lesson.
- **Intentionally rejected.** All of their *contents* (upgrade CTA, social icons,
  disk quota, create-FAB) — irrelevant to a family financial diwan.
- **Why Diwan differs.** The anchor is a **financial summary tile** with a single
  lime figure, collapsing to one navy tile — informational, never promotional.

## D11 — Motion: 180–220ms ease-out, no spring, no bounce

- **Why it exists.** Motion must confirm a state change without delaying an
  all-day operator.
- **UX problem solved.** *Navigation speed + long-session comfort.* Panel content
  swaps in ~200ms ease-out; hover feedback is ~130ms; nothing bounces or idles.
- **Reference influence.** The refs' fast hover reveals / width transitions.
- **Intentionally rejected.** Springy/bouncy motion and any decorative/ambient
  animation.
- **Why Diwan differs.** Motion is **functional only** and honors
  `prefers-reduced-motion` (state still changes instantly).

## D12 — Solid navy chrome (never glassmorphism, never neon)

- **Why it exists.** Identity must be stable, legible, and serious across light and
  dark, on any workspace content.
- **UX problem solved.** *Accessibility + brand identity + long-session comfort.*
  Solid navy holds contrast that glass cannot guarantee over arbitrary content.
- **Reference influence.** R4/R5 glass, R2 neon — the *looks* to avoid.
- **Intentionally rejected.** Glassmorphism (unpredictable contrast) and neon
  accents (fatigue, identity clash).
- **Why Diwan differs.** The chrome is the deep-navy Diwan anchor in **both** themes;
  the only saturated color anywhere is the reserved lime marker.

## D13 — RTL-first, Arabic-first typography

- **Why it exists.** The primary operators read Arabic; the system is RTL by
  default.
- **UX problem solved.** *Information clarity + accessibility.* IBM Plex Sans Arabic,
  ≥14.5px page labels, ≥16px module titles, **no wrapping**, tabular numerals for
  aligned figures.
- **Reference influence.** None (all references are LTR/Latin) — this is a Diwan
  requirement the references cannot teach.
- **Intentionally rejected.** Tiny labels and Latin-first metrics.
- **Why Diwan differs.** Every borrowed pattern is **mirrored for RTL** using logical
  properties, and tuned for Arabic legibility at long-session sizes.

## D14 — Stable workspace (never reflows on navigation)

- **Why it exists.** Content jumping on every click is disorienting and slow.
- **UX problem solved.** *Long-session comfort + navigation speed.* Rail and panel
  widths are fixed; switching domains/pages never shifts the workspace.
- **Reference influence.** The refs' expand/collapse (which *does* shift content) —
  the behavior to avoid.
- **Intentionally rejected.** Any width animation that reflows the workspace.
- **Why Diwan differs.** Fixed rail/panel widths are **invariants**; the workspace is
  a stable stage.

## D15 — Keyboard, focus, and contrast (accessibility as a first-class state)

- **Why it exists.** Administrators use keyboards heavily; the nav must be fully
  operable and visible without a mouse.
- **UX problem solved.** *Accessibility.* Every tile/row defines focus (lime ring),
  the fly-out is a keyboard menu (Arrow/Home/End/Enter/Esc), active is not
  color-only, and contrast holds in both themes.
- **Reference influence.** None make this explicit — a Diwan addition.
- **Intentionally rejected.** Hover-only affordances with no keyboard path.
- **Why Diwan differs.** Accessibility is specified as a **state**, not an
  afterthought (see the design system's five-state table).

---

## The anti-collage rule (summary)

| Reference | Lesson extracted | Implementation discarded |
|---|---|---|
| R1 Budget | floor anchor + one reserved color | upgrade/billing card, gradient |
| R2 Thor | rail speaks on hover · active encodes type | neon pills, crypto/social chrome |
| R3 ReSync | two-tier active · persistent CTA | expand-in-place tree, disk quota |
| R4 Good Day | counters + live badges | glassmorphism, FAB, avatar/plugin chrome |
| R5 Aceagency | active by weight, not fill · scale valve | glass, people/messages module |

No reference contributes a *look*. Each contributes a *principle*, re-expressed in
the Diwan language. The result is meant to feel like a ten-year-matured financial
platform — not like any reference.

> This document is the permanent rationale. Any future navigation change must be
> justified against the optimization order above and recorded here.
