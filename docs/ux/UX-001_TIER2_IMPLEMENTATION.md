# UX-001 Tier-2 — implementation (headings, form labels, vocabulary)

> Implements the Tier-2 items from `UX-001_IMPROVEMENT_ROADMAP.md` (U-4 heading
> landmarks, U-5 form-label associations, U-6 vocabulary). Presentation/accessibility
> only — no accounting/DB/behaviour change; the global `*{margin:0}` reset means
> switching a wrapper's tag to a heading does not alter layout.

## U-4 — heading landmarks (S3-2)

Screens exposed no `<h1>` (titles were styled `div`s). Promoted the primary title of
each surface to a real heading; **styling is unchanged** (the classes are kept and are
selected by class, not tag; the reset zeroes heading margins):

| Surface | Before | After |
|---|---|---|
| Engine reports (all 15, screen + print) | `.rpt-title <h2>` | **`.rpt-title <h1>`** (+ CSS selector `.rpt-title h1,.rpt-title h2`) |
| Annual-debt screen title | `<div class="as-h">` | **`<h1 class="as-h">`** |
| Delinquent screen title | `<div class="as-h">` | **`<h1 class="as-h">`** |
| Login page title | `<div class="lp-title">` | **`<h1 class="lp-title">`** |

**Verified (Playwright):** an engine report screen now renders exactly **one `<h1>`**
(the report title), **zero `<h2>`**, styling intact, no errors.

## U-5 — form-label associations (S3-4)

Audited inputs for programmatic labels. The dynamically-rendered **user-edit** form
(`user-admin.js`) had three inputs (`eu-name`/`eu-email`/`eu-phone`) with **visible but
unassociated** `<label>`s. Added `for="…"` to each so the label is programmatically tied
to its input (WCAG 1.3.1 / 3.3.2). Other audited inputs (login, filters) were already
labeled (`for=`/`aria-label`), and the UX-002 icon buttons carry `aria-label`.

## U-6 — component vocabulary (S3-3 / S3-5)

- **`.dt` (paper/report tables) vs `.as-table` (screen tables)** — a deliberate
  **two-media** system (paper is theme-independent; screen is theme-adaptive), not a
  fork. Documented as one system with two targets; no change.
- **`.as-btn`** — a **scoped variant** (`.acct-stmt .as-btn`) with its own
  account-statement padding/hover, used by the annual-debt/delinquent screens. It is a
  deliberate scoped style, **not** technical debt; merging it into `btn` would be a
  visual regression, so it is **kept and documented** rather than removed.

## Verification

- Report/layout/render suites pass; full `tests/` sweep **109 pass / 2 fail** (the two
  pre-existing fixture-missing legacy suites).
- Browser: engine report → single `<h1>`, styling preserved, zero errors.
- Cache-bust: `report-layout.js?v=0.3`, `reports.js?v=2.7`, `user-admin.js?v=1.2`.

## Status vs. UX-001 roadmap

- **Tier-1 (U-1/U-2/U-3)** — shipped in **UX-002**.
- **Tier-2 (U-4/U-5/U-6)** — this change.
- **Tier-3** — U-7 (table windowing) shipped as **SYS-002**; U-8 (seeded per-page live
  pass) remains, pending a non-production seed/auth path.
