# Diwan Navigation Design System

> The formal navigation system derived from `NAVIGATION_REFERENCE_STUDY.md` and
> the frozen **Concept B** architecture (Primary Rail → Context Panel →
> Workspace). This is the single source of truth for tokens, sizes, states,
> motion, and RTL/LTR rules. It preserves the Diwan visual identity: solid navy
> chrome, IBM Plex Sans Arabic, and **lime reserved** as a subtle indicator only.

Status: **v1 — design specification.** Values are expressed as design tokens;
where they already exist in `public/css/app.css` the current variable name is
noted so implementation stays a mapping exercise, not a reinvention.

---

## 1. Architecture (frozen)

```
┌──────┐ ┌──────────────┐ ┌───────────────────────────┐
│ RAIL │ │ CONTEXT PANEL│ │        WORKSPACE          │
│ 72px │ │   272px      │ │          fluid            │
│domains│ │ active domain│ │   stays visually stable   │
│icons │ │   pages      │ │  (never shifts on switch) │
└──────┘ └──────────────┘ └───────────────────────────┘
   ▲ orient        ▲ read/navigate        ▲ work
```

- **No accordion. No nested expanding lists. No rail width change. No workspace
  shift.** These are invariants.
- The rail is the permanent backbone; the context panel is the primary page
  navigator; the workspace is stable.

---

## 2. Spacing grid — 4 / 8

All spacing is a multiple of **4px**; **8px** is the primary step.

| Token | Value | Use |
|---|---|---|
| `--nav-s0` | 2px | hairline nudges, marker insets |
| `--nav-s1` | 4px | icon-to-edge micro gaps |
| `--nav-s2` | 8px | item vertical rhythm, tile gaps |
| `--nav-s3` | 12px | item inner padding-x, icon-to-label |
| `--nav-s4` | 16px | panel padding-x, group side padding |
| `--nav-s5` | 20px | panel header padding, section top gap |
| `--nav-s6` | 24px | large separations, workspace padding |
| `--nav-s7` | 32px | floor-anchor breathing room |

Rule: **row rhythm ≥ 8px**, **group gap ≥ 16px**, **panel breathing ≥ 16px**.
White-space is a feature; never compress below these floors.

---

## 3. Dimensions

### 3.1 Primary Rail
| Property | Value | Notes |
|---|---|---|
| Rail width | **72px** (`--rail-b`) | fixed; never animates |
| Rail inset (floating) | 18px from start edge | detached-dock geometry |
| Domain tile | **46 × 46px**, radius **13px** | R2/R5 icon-tile proportion |
| Tile gap | 4–6px | vertical rhythm |
| Icon size | **23px**, stroke 1.7 | optical-centered in tile |
| Brand mark (top) | 38 × 38px, radius 11px | orientation anchor |
| Divider | 26 × 1px | below brand mark |
| Active marker | 3.5px lime bar, inset-start | reserved-lime |

### 3.2 Context Panel
| Property | Value | Notes |
|---|---|---|
| Panel width | **272px** | inside R3/R4 260–280 band |
| Panel radius | **16px** | floating card |
| Panel gap from rail | 10px | reads as independent (R-study §7) |
| Header padding | 19px 20px 15px | module title zone |
| Module title | **16px / 800** | strong, high-contrast (fixes "too light") |
| Module caption | 11.5px mono, muted | page count / scope |
| Header/body divider | 1px, 16px side inset | |
| Scroll padding | 10px 12px 16px | |
| Page row height | **44px** (comfort) / 38px (compact) | |
| Page font | **14.5px / 600** (active 700) | long-session legible, no wrap |
| Page icon | 20px | inked per state |
| Row radius | 11px | |
| Row gap | 2px margin + rhythm | |
| Group header | 11px / 700 muted, 14px top pad | quiet grouping (R1/R5) |
| WS/count badge | 9–10px mono, bordered | live status (R4/R5) |

### 3.3 Narrow / drawer (≤768px)
| Property | Value |
|---|---|
| Drawer width | min(292px, 86vw) |
| Behavior | off-canvas; rail becomes a full labelled list; `☰` toggles |
| Group header | shown as inline section label (icon + text) |

---

## 4. Typography

**Arabic-first.** Family: `IBM Plex Sans Arabic` (`--fn`); numerals use
`font-variant-numeric: tabular-nums`; monospace captions use `--fmono`.

| Role | Size | Weight | Color token | Notes |
|---|---|---|---|---|
| Module title (panel header) | 16px | 800 | `#fff` (dark) / navy (light) | letter-spacing −.01em; balances |
| Group header | 11px | 700 | `--nav-ink3` | letter-spacing .04em; no uppercasing Arabic |
| Page label — inactive | 14.5px | 600 | `--nav-ink2` | ellipsis, **never wrap** |
| Page label — active | 14.5px | 700 | `#fff` | weight is a primary hierarchy cue (R5) |
| Caption / count | 11.5px | 600 | `--nav-ink3` | mono, tabular |
| Rail tooltip (flyout) title | 13px | 750 | `#fff` | |

**English (LTR):** same sizes; substitute `Inter`/system; keep weights. Line-height
1.25 for titles, 1.4 for rows. Minimum interactive label size **14.5px** — no tiny
labels, no wrapping, ever.

---

## 5. Color system (navigation scope)

Navigation runs on the deep-navy chrome in **both** light and dark (identity
anchor). Lime is the **only** saturated color and appears **only** as the active
marker.

| Token | Dark | Light | Role |
|---|---|---|---|
| `--rail` | `#0c1626` | `#0F1B33` | rail background |
| `--panel` | `#14223c` | `#0F1B33` | context panel (a shade lighter than rail in dark) |
| `--chrome-line` | rgba(160,180,220,.16) | rgba(255,255,255,.10) | hairlines |
| `--nav-ink` | rgba(231,237,246,1) | #fff | active label/icon |
| `--nav-ink2` | rgba(231,237,246,.82) | rgba(255,255,255,.80) | inactive label |
| `--nav-ink3` | rgba(231,237,246,.42) | rgba(255,255,255,.55) | captions/icons-inactive |
| `--dx-lime` | `#CBF000` | `#CBF000` | **reserved** active marker only |
| `--dx-limeink` | `#1a2205` | — | ink on lime (focus rings etc.) |

**Per-domain tone** (used for the module icon and the workspace accent, *not* for
active fills): `--gold` (Lunch Fund), `--blue` (Diwan Fund), `--slate`
(Members & Dues), `--purple` (Donations), `--pink` (Reservations), `--teal`
(Overview), `--grey` (System). Tone tints the **icon**, never the row background —
this is how Diwan encodes destination *type* (R2's idea) without neon.

**Hard rule:** no saturated active pills; no glow; no glassmorphism. Lime is a
marker, not a surface.

---

## 6. Component states

Every interactive nav element defines all five states.

### 6.1 Rail domain tile
| State | Background | Icon | Marker | Motion |
|---|---|---|---|---|
| Default | transparent | `--nav-ink2` | — | — |
| Hover | rgba(255,255,255,.08) | `--nav-ink` | — | 130ms ease |
| Active | rgba(255,255,255,.14) | #fff | 3.5px lime bar (inset-start) + scale(1.02) | 130ms |
| Focus | + 2px lime outline, offset 2px | — | — | none |
| Disabled | opacity .4 | — | — | pointer:none |

### 6.2 Context-panel page row
| State | Background | Icon | Label | Marker |
|---|---|---|---|---|
| Default | transparent | `--nav-ink3` | `--nav-ink2` / 600 | — |
| Hover | rgba(255,255,255,.06) | `--nav-ink2` | `--nav-ink` | — |
| Active | rgba(255,255,255,.10) | #fff | #fff / **700** | 3px lime bar (inset-start) |
| Focus | 2px lime outline, offset −2px | — | — | — |
| Disabled | opacity .4, pointer:none | muted | muted | — |

Active recognition **does not rely on color alone**: it combines background +
weight + inked icon + lime marker (shape cues), satisfying contrast/colour-blind
requirements (R-study: "do not rely only on color").

### 6.3 Flyout (collapsed-rail tooltip / mobile)
Navy card, radius 12px, soft large shadow, **pointer** toward the rail; header =
domain title + tone icon; rows reuse §6.2. Appears on hover (desktop) / used as the
drawer body (narrow).

---

## 7. Motion

| Interaction | Duration | Curve | Notes |
|---|---|---|---|
| Panel content swap (module change) | **180–220ms** | ease-out | fade + 7px translateY; **no spring, no bounce** |
| Hover feedback (tile/row) | 120–140ms | ease | background + color only |
| Flyout reveal | 150ms | ease-out | opacity + small translate |
| Focus ring | 0 | — | instant |
| Marker move | 190ms | cubic-bezier(.3,.85,.3,1) | optional traveling marker |

`@media (prefers-reduced-motion: reduce)` disables the swap animation and tile
scale; state still changes instantly. No decorative/idle motion anywhere.

---

## 8. Shadow & radius

| Elevation | Shadow | Radius |
|---|---|---|
| Rail (floating dock) | 0 10px 30px −14px rgba(0,0,0,.6) | 16px |
| Context panel | 0 12px 34px −16px rgba(0,0,0,.55) + 1px chrome-line | 16px |
| Flyout / tooltip | 0 16px 40px rgba(0,0,0,.5) | 12px |
| Tiles / rows | none (state = fill) | 13px / 11px |

Radius scale: **container 16px · tile 13px · row 11px · badge 5px**. Shadow grows
with elevation; flyouts always sit above the panel.

---

## 9. RTL / LTR rules

- **Direction-agnostic properties only:** use `inset-inline-start/-end`,
  `margin-inline-*`, `padding-inline-*`, `border-inline-*`. Never `left/right`.
- **Rail side:** start edge — right in RTL (default Arabic), left in LTR.
- **Context panel:** always adjacent to the rail on its inner side; flyout opens
  toward the workspace (start−width in RTL, end+gap in LTR).
- **Active marker:** `inset-inline-start` (rail-side edge) in both directions.
- **Icons:** directional glyphs (chevrons, arrows) mirror with direction; symbolic
  glyphs (users, bank) do not.
- **Numerals:** tabular; Arabic-Indic in AR contexts where the app already uses
  them, Latin in EN.
- **Ellipsis & truncation** work in both directions (logical properties handle it).

---

## 10. Extending the system (adding modules / pages)

The architecture must stay manageable at **50 → 100 → 150+** pages.

1. **New page in an existing module** → add a row to that domain's page list.
   If the panel exceeds a comfortable length (~10 rows), introduce **quiet group
   headers** inside the panel (R1/R5) — *not* accordion, *not* nesting.
2. **Large module (15+ pages)** → split into **in-panel groups** with headers
   (e.g., Members & Dues → *Members / Dues & Collection / Reports*), optionally a
   **show-more** valve (R5). The rail still shows **one** icon for the module.
3. **New top-level domain** → add **one** rail tile (icon + tone + label). The rail
   comfortably holds ~10–12 tiles at 46px within a standard viewport; beyond that,
   introduce a rail scroll region — never shrink tiles below spec.
4. **Live status** → attach a **count badge** (R4/R5) to any row/tile whose backing
   data has an actionable count (delinquent members, pending vouchers). Badges use
   semantic color (separate from lime).
5. **Role-scoped visibility** → hide rows/whole domains via the existing
   `applyDataProtection` contract; a domain whose pages are all hidden hides its
   rail tile. No layout reflow results (rail width fixed).
6. **Naming** → module titles are nouns (`الأعضاء والاشتراكات`); page labels are the
   destination, not the mechanism (a person reads *"تقرير المديونية"*, not a table
   name). Keep labels short enough to never wrap at 272px.

**Invariants that never change when extending:** rail width, panel width, the
no-accordion rule, the reserved-lime rule, the stable-workspace rule.

---

## 11. Token mapping to the current codebase

| System token | Existing CSS | Status |
|---|---|---|
| Rail width 72px | `--rail-b:72px` (nav-b block) | present |
| Panel/flyout | `.sb-flyout` | present (flyout); persistent panel = refinement |
| Active marker lime | `.nb.on::before` / `.nbg.on-domain::before` | present |
| Navy chrome | `--chrome`, `#0F1B33` light | present |
| Domain tones | `--gold/--blue/--slate/...` | present |
| Motion swap | `@keyframes ctxIn .2s ease-out` | to add (refinement) |
| Type: module title 16/800 | new rule | to add |

Implementing the persistent two-stage refinement is therefore a **mapping** of this
system onto the shipped Concept B, not a rewrite — consistent with the frozen
architecture.
