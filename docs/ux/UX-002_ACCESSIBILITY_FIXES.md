# UX-002 — Accessibility fixes (implementation)

> Implements the Tier-1 WCAG-AA items from `UX-001_IMPROVEMENT_ROADMAP.md`
> (U-1 keyboard operability, U-2 light-theme contrast, U-3 icon-button names). This is
> an **implementation** phase — it changes CSS/markup/adds one module — with a
> **measured before/after** and **zero** accounting/DB/behaviour change. All figures
> and the certified voucher/print artifacts are untouched.

## What changed

| Fix | UX-001 finding | Change |
|---|---|---|
| **U-1 — Keyboard operability** | S2-1 (50 clickable `span`/`div` not keyboard-operable) | New module `public/js/a11y-keyboard.js` |
| **U-2 — Light-theme contrast** | S2-2 (`--tx3`/`--faint` < AA in light themes) | Darkened `--mut`/`--tx3`/`--faint` in the 3 light themes (`app.css`) |
| **U-3 — Icon-button names** | S3-1 (8 unlabeled icon buttons) | Added `aria-label` to the 8 print/edit/pager buttons (`app.js`) |

### U-1 — `a11y-keyboard.js` (self-healing, no render-site edits)
The app renders interactive controls (person/voucher links, filter tabs/pills,
selectable rows) as non-button elements with inline `onclick`, replaced wholesale on
each `innerHTML` render. Editing ~50 render sites would be error-prone, so a single
module handles them all:
1. **Delegated keyboard activation** — one `document` `keydown` listener: **Enter/Space**
   on a focused inline-`onclick` control triggers its `click()` (Space is prevented from
   scrolling). Native `button`/`a`/`input` are ignored (they already work).
2. **Self-healing focusability** — gives every inline-`onclick` non-native control
   `tabindex="0"` + `role="button"` so it enters the tab order and is announced. Runs at
   load and on the subtrees added by each re-render (a scoped `MutationObserver` on
   `#app`), so it survives the innerHTML-replace model. Idempotent
   (`:not([tabindex])` skips already-processed elements).

The mouse `onclick` path is untouched; this is purely additive accessibility.

### U-2 — contrast tokens (measured)
Muted content text (`--tx3`/`--faint`, and the alias `--mut`) is used for card labels,
sub-headers, period lines and hints. It failed WCAG AA in the light themes. Darkened,
hue preserved:

| Theme | `--tx3` before → after | contrast on bg (before → after) | on card |
|---|---|---|---|
| Light (A) | `#8F9299` → `#6e7076` | 2.93 → **4.66** | **4.78** |
| Light (B) | `#8A8F98` → `#696d74` | 2.90 → **4.65** | **5.20** |
| Nile (light) | `#7C8494` → `#666c79` | 3.32 → **4.65** | **5.27** |

All now meet **AA (≥ 4.5:1)** on both the page and card surfaces. Dark themes already
passed and were not touched. Primary/secondary text (`--tx`/`--tx2`) unchanged.

### U-3 — icon-button names
Added `aria-label` to the 8 unlabeled icon buttons: receipt/payment/transfer **print**
(«طباعة …»), receipt/payment **edit** («تعديل …»), and the audit **pager** («الصفحة
السابقة/التالية»).

## Verification (measured this phase)

- **Contrast recomputed** from the tokens: all three light themes now **≥ 4.65:1** on bg
  and card (was 2.90–3.32).
- **Keyboard module (Playwright, real DOM):** `.lnk-nm`/`.pill` → `tabindex=0` +
  `role=button`; native `button`/`a` left untouched; a **dynamically re-rendered**
  element is enhanced via the observer; **Enter** and **Space** each activate the
  control (2/2 hits); zero console/page errors.
- **Regression:** full `tests/` sweep **109 pass / 2 fail** — the two are the
  pre-existing fixture-missing legacy suites (unchanged).
- **Real index.html load smoke:** app shell boots with the new module in the true load
  order — no console/page errors; `dir="rtl"` intact.
- Cache-bust bumped: `app.js?v=2.13`; `a11y-keyboard.js?v=1.0` added after `app.js`.

## Scope notes / residual
- `role="button"` is the pragmatic accessible role for every activated control (satisfies
  WCAG 2.1.1 keyboard + 4.1.2 name/role). Finer roles (`tab`/`tablist` for the filter
  tabs) are a larger semantic refactor, out of this AA-focused scope.
- UX-001 Tier-2/3 items (heading landmarks U-4, form-label sweep U-5, vocabulary
  consolidation U-6, table windowing U-7 ↔ SYS-002) remain open and are **not** in this PR.

## GA impact
Closes the two **S2** accessibility gaps that REL-001 listed as a
"must close before GA / owner decision" item — the WCAG-AA path was chosen and
implemented. The `REL-001_PRODUCTION_READINESS.md` "Accessibility / UX" row can move
from 🟡 Conditional toward 🟢 for the S2 items.
