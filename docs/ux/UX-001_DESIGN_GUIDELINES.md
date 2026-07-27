# UX-001 — Design Guidelines (consolidated reference)

> This document **consolidates the design systems the project already has** and adds a
> **measured accessibility baseline**. It does not replace or contradict the anchoring
> documents — it points to them and fills the gaps UX-001 measured. Documentation only;
> no code changes.
>
> **Authoritative sources (unchanged):**
> - `docs/design/DDL-01_DESIGN_PHILOSOPHY.md` — the six product laws (governing).
> - `docs/navigation/DIWAN_NAVIGATION_DESIGN_SYSTEM.md` — frozen nav architecture, spacing, RTL.
> - `docs/governance/BUSINESS_WORKSPACE_DESIGN_RULES.md` — State/History/Capability.
> - `docs/execution-briefs/EB-06_UX-01_UNIFIED_STATEMENT_DESIGN.md`, `EB-07_UX-02_MINIMAL_PRINT_IDENTITY.md`.

## 1 · The six product laws (from DDL-01 — restated as the review lens)

Every screen and change is judged against these:

1. **Speed over ornament** — no decoration that costs interaction latency.
2. **Trust over trends** — stable, sober financial look; no trend-chasing.
3. **Clarity over density** — reduce, don't cram; whitespace is functional.
4. **Keyboard-first** — every action reachable and operable by keyboard.
5. **Data before decoration** — the figure leads; styling serves it.
6. **Every visual decision reduces cognitive load** — if it doesn't, remove it.

> UX-001 found the largest gap against **Law 4 (Keyboard-first)** — see the a11y baseline below.

## 2 · Navigation (defer to the frozen system)

Use `docs/navigation/DIWAN_NAVIGATION_DESIGN_SYSTEM.md` verbatim: primary rail + context
panel, 4/8 spacing grid, collapsed-rail tooltips, and the RTL mirroring rules. New pages
register a `pg-*` container + a `nav()` target and inherit the system — do not introduce
a parallel navigation pattern.

## 3 · Component vocabulary (observed + recommended canonical)

| Component | Canonical class | Notes |
|---|---|---|
| Button | `btn` (+ modifiers) | 137× — the standard. Retire the residual `as-btn` (2×) into `btn`. |
| Card | `card` | 48× — the standard summary/figure container. |
| Screen table | `as-table` | interactive on-screen tables. |
| Paper/report table | `dt` | print/PDF/report engine tables. |
| Dialog | `modal` | 17× — the single dialog pattern; no second dialog vocabulary. |
| Chip / Tab | `chip` / `tab` | filter chips and view tabs. |

**Rule:** two table vocabularies (`as-table` screen vs `dt` paper) are **intentional**
(screen theme-adaptive vs paper theme-independent). Document them as one system with two
media targets; do not merge or fork further.

## 4 · Color & theming

Multiple themes exist (dark + several light, incl. "Nile"). Text roles:

| Token | Role | Requirement |
|---|---|---|
| `--tx` / `--ink` | primary text | ≥ 7:1 (AAA) — currently met everywhere |
| `--tx2` | secondary text | ≥ 4.5:1 (AA) — currently met everywhere |
| `--tx3` / `--faint` | muted captions/labels/hints | **≥ 4.5:1 (AA) — currently FAILS in light themes (2.9–3.3:1)** |

**Guideline:** `--tx3`/`--faint` must meet **WCAG AA (4.5:1)** against the surface it
sits on in *every* theme, because it is used for real content (card labels, sub-headers,
period lines), not decoration. Reserve sub-3:1 greys for non-text separators only.

## 5 · Accessibility baseline (new — measured in UX-001)

This is the standard for all future UX work:

- **Keyboard operability (Law 4 / WCAG 2.1.1, 4.1.2):** any element with an `onclick`
  MUST be a native `<button>`/`<a>`, **or** carry `role="button"` + `tabindex="0"` + a
  keyboard (`Enter`/`Space`) handler. No bare clickable `<span>`/`<div>`.
- **Accessible names (WCAG 4.1.2):** every icon-only control MUST have `aria-label` or
  `title`.
- **Labels (WCAG 1.3.1, 3.3.2):** every input MUST have a programmatic label
  (`<label for>` or `aria-label`) — not placeholder-as-label alone.
- **Headings (WCAG 1.3.1):** each page exposes a real `<h1>`; sections use `<h2>/<h3>`.
- **Focus (WCAG 2.4.7):** visible focus is already provided via `:focus-visible` — keep it.
- **RTL:** root stays `lang="ar" dir="rtl"`; use logical properties / `dir` for mixed
  LTR runs (numbers, tokens) as the codebase already does.

## 6 · Forms

- Label every field programmatically; placeholders are hints, never the only label.
- Inline validation messages use `aria-live` (already present, 5×) so errors are announced.
- Keyboard: full tab order, `Enter` submits, `Esc` closes modals (verify per form).

## 7 · Density & data (Laws 3 & 5)

- Lead with the figure; captions are secondary (and must still meet AA contrast — §4).
- For large result sets, prefer windowing/pagination over rendering everything (this is
  also the SYS-001 S2-2 finding: a 2,000-row statement = 32 K DOM nodes). Keep totals
  computed from the full model even when the view is windowed.

## 8 · Anti-patterns (from DDL-01 §5, reinforced by UX-001 evidence)

- Clickable non-button elements without keyboard support (measured: 50 instances).
- Muted text below AA contrast used for real content (measured: light themes).
- Icon-only controls without an accessible name (measured: 8).
- Placeholder-as-label.
- Introducing a parallel navigation, button, table, or dialog vocabulary.

*These guidelines are the review checklist for UX-002 and every subsequent UI change.*
