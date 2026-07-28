# UX-001 Tier-2b — closing the U-8 residuals (headings + input labels)

> Implements the two S3 residuals surfaced by the U-8 live pass
> (`UX-001_U8_LIVE_REVIEW.md`): app-shell pages lacking an `<h1>`, and on-page filter/
> settings inputs lacking programmatic labels. **Presentation/accessibility only** — no
> accounting/DB/behaviour change; the global `*{margin:0}` reset keeps tag→heading swaps
> layout-neutral. Measured before/after with the U-8 harness.

## U8-1 — per-page `<h1>` landmarks

The app-shell page titles use one static pattern: `<div class="ph-t">…</div>`. Promoted
**all 22** to `<h1 class="ph-t">` in `index.html` (one uniform change; `.ph-t` is styled
by class, not tag, so appearance is unchanged).

| Metric (17 pages, live) | Before | After |
|---|:--:|:--:|
| pages with a visible `<h1>` | **2/17** | **16/17** |

The single exception is the **dashboard**, whose title is a stylized hero band
(`<b>` greeting), not a conventional page title; a dedicated `<h1>` there is deferred to
avoid a visual regression on the custom band (tiny optional follow-up).

## U8-2 — on-page input labels

Added `aria-label` to the previously-unlabeled **visible** controls:

- **Search boxes** (`class="si"`, 6 list pages) → «بحث».
- **Statement filters** (food/diwan `from`/`to`/`type`), **donation type**, **member/dues
  selects** → contextual labels (`index.html`).
- **Settings** — opening balances (×6 currencies), exchange rates, fiscal-close fields,
  internal-transfer fields → contextual labels.
- **JS-rendered filters** — delinquent year `<select>` (`reports.js`), audit search
  (`app.js`), dues search (`dues-workspace.js`).

| Metric (17 pages, live) | Before | After |
|---|:--:|:--:|
| pages with input-label gaps | **13** | **3** |
| total unlabeled visible inputs | (higher) | **5** |

Residual **5** gaps (member-stmt 1, audit 1, users 3) are deep JS-rendered admin/statement
controls; non-blocking S3, documented for an optional later pass.

## Verification (measured — `tools/ux-live-review.mjs`)

- **visible `h1`: 16/17** (was 2/17); **input gaps: 5** (was 13 pages).
- **UX-002 still perfect live:** `clickable-no-role = 0` and `icon-btn-no-name = 0` on all
  17 pages; **0 boot errors**.
- Full `tests/` sweep: **109 pass / 2 fail** (the two pre-existing fixture-missing legacy suites).
- Cache-bust: `index.html` (static), `reports.js?v=2.8`, `app.js?v=2.14`,
  `dues-workspace.js?v=1.3`.

## Roadmap status
Tier-1 (UX-002) ✅ · Tier-2 (U-4/U-5/U-6) ✅ · U-7 windowing (SYS-002) ✅ · U-8 live pass ✅
· **Tier-2b (this) ✅** — the UX-001 roadmap is now fully implemented, bar two documented,
non-blocking S3 residuals (dashboard hero `h1`; 5 deep JS-rendered inputs).
