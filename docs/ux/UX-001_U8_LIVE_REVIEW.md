# UX-001 U-8 — Seeded live per-page review

> Closes UX-001 **U-8** (and provides the seed path REL-001 **R-9** asked for): a live
> pass over the **populated, authenticated** pages, which the earlier static UX-001 could
> not reach without production credentials. **Read-only review** — no production code
> changed. The reusable harness is committed at `tools/ux-live-review.mjs`.

## Method

`tools/ux-live-review.mjs` serves `public/` and **stubs the Supabase client** (auth +
chainable `.from()` returning in-memory seed rows), so the **real, unmodified** app boots
authenticated as *admin* and fills `window.DB` through its own `loadAllData` path. It then
navigates each page, screenshots it, and records per-page a11y signals. **No real network,
no production data, no code change.** Chromium 141; commit `afcf876`; 17 pages; admin role.

Booted cleanly (`authed: true`, **0 boot errors**).

## Per-page results (visible elements only)

| Page | visible `h1` | focusables | inputs w/o label | clickable-no-role | icon-btn-no-name |
|---|:--:|--:|:--:|:--:|:--:|
| dash | 0 | 47 | 0 | **0** | **0** |
| members | 0 | 51 | 1 | 0 | 0 |
| member-stmt* | 0 | 37 | 1 | 0 | 0 |
| food-rec | 0 | 47 | 1 | 0 | 0 |
| diwan-rec | 0 | 42 | 1 | 0 | 0 |
| food-pay | 0 | 42 | 1 | 0 | 0 |
| diwan-pay | 0 | 43 | 1 | 0 | 0 |
| don | 0 | 39 | 2 | 0 | 0 |
| food-stmt* | 0 | 38 | 3 | 0 | 0 |
| annual-debt | **1** | 44 | 0 | 0 | 0 |
| delinquent | **1** | 42 | 1 | 0 | 0 |
| annual | 0 | 36 | 0 | 0 | 0 |
| treasury-workspace | 0 | 40 | 0 | 0 | 0 |
| dues-workspace | 0 | 50 | 1 | 0 | 0 |
| audit | 0 | 36 | 2 | 0 | 0 |
| users | 0 | 36 | 3 | 0 | 0 |
| settings | 0 | 52 | 8 | 0 | 0 |
| **totals** | 2/17 | — | 13 pages | **0** | **0** |

\* `member-stmt`/`food-stmt` render the statement only after a member/period is selected;
with none chosen the engine body (which carries its own `<h1>`, verified in UX Tier-2)
does not render, so the screen shows only its filter controls here.

## ✅ Confirmed live (regression-tested with real data)

- **Keyboard operability (UX-002) holds everywhere** — `clickable-no-role = 0` on all 17
  pages: every inline-`onclick` control is keyboard-focusable/operable via the a11y module,
  now proven against populated screens, not just synthetic ones.
- **Icon buttons are all named (UX-002)** — `icon-btn-no-name = 0` on all 17.
- **Boot + data path healthy** — the app authenticates, loads, and renders every page with
  seed data and **zero runtime errors**; per-page DOM stays modest (~1.7–2.6 K nodes).

## ⚠ Residual findings (new — surfaced by the live pass)

| # | Sev | Finding | Evidence |
|---|---|---|---|
| U8-1 | S3 | **15 of 17 pages present no `<h1>` landmark** on screen | only `annual-debt`/`delinquent` have one (from Tier-2). Dashboards, lists (members/receipts/payments/donations), workspaces (treasury/dues), and admin (audit/users/settings) render their titles as styled non-heading elements. UX Tier-2's heading work reached the engine reports + the 2 legacy report screens + login, **not** these app-shell pages. |
| U8-2 | S3 | **On-page filter / settings inputs lack programmatic labels** | 13 pages, 1–8 each (settings 8, users 3, food-stmt 3, don 2, audit 2). UX Tier-2's U-5 fixed the user-edit modal; these on-page controls (date/type/search filters, settings fields) remain visible-but-unassociated. |

Both are **S3** (minor, non-blocking) accessibility polish, consistent with — and extending
— the UX-001 S3-2/S3-4 findings. Neither affects correctness or task completion.

## Recommendation (a small follow-up, owner's call)

A focused **UX Tier-2b** (CSS/markup only, same measured-before/after discipline) would:
- Give each app-shell page one `<h1>` (its existing title element → a heading; the global
  `*{margin:0}` reset keeps layout identical, as in Tier-2).
- Associate the on-page filter/settings inputs (`for=`/`aria-label`), starting with the
  highest-count pages (settings, users).

This is **not GA-blocking** (all S2/AA items already shipped in UX-002 + Tier-2). It is
listed here for prioritization, not implemented in this review.

## Deliverables
- `tools/ux-live-review.mjs` — the reusable seed/non-production review harness (closes the
  U-8 / REL-001 R-9 tooling gap; re-runnable on any branch).
- This report. Screenshots are written to the harness's out-dir on each run (not committed;
  regenerate with `node tools/ux-live-review.mjs`).

## Status vs. UX-001 roadmap
Tier-1 (UX-002) ✅ · Tier-2 U-4/U-5/U-6 ✅ · Tier-3 U-7 (windowing = SYS-002) ✅ ·
**U-8 (this live pass) ✅** — with two S3 residuals catalogued above for an optional Tier-2b.
