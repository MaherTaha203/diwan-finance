# SYS-002 — Screen table windowing (implementation)

> Implements **R-1** from `SYS-001_PERFORMANCE_ROADMAP.md` (= UX-001 **U-7**): the large
> statement/report tables had no virtualization, so a 2,000-row member statement
> rendered **32,489 DOM nodes / ~1 MB HTML / ~180 ms** on screen. This adds
> **screen-only row windowing** with a measured before/after. **No accounting/DB/model
> change; totals stay from the full model; print/PDF/Excel always render every row.**

## Design (safety-first)

- **Screen only.** The shared `ReportLayout.build` gains an optional `windowRows`
  parameter. The **screen renderer** passes a default (`{threshold: 300, initial: 200}`);
  the **print, PDF and Excel** renderers never pass it, so exports/printouts render the
  **full** table unchanged.
- **Totals are never windowed.** The `tfoot` totals come from `sec.totals` (the full
  model), computed independently of the detail rows. So even a windowed table shows the
  **correct final balance / totals** — windowing hides only *detail rows*, never a figure.
- **Ordinary statements are untouched.** Only tables with **> 300 rows** window; real
  member/fund statements are far smaller, so 99% of usage sees **zero change**.
- **One-click reveal.** Beyond the threshold, a `<button class="rpt-showall">` ("عرض …
  — عرض الكل") appears; `Report.expandReport(btn)` re-renders the stashed full model with
  windowing off. It's a native button (keyboard-accessible; consistent with UX-002).
  Print CSS hides the control defensively (`@media print{.rpt-more{display:none}}`).

## Measured before / after

**2,000-row member statement, on-screen render** (Chromium 141, same harness as SYS-001):

| Metric | SYS-001 baseline | SYS-002 | Δ |
|---|---:|---:|---:|
| DOM nodes | 32,489 | **3,214** | **−90 %** |
| render median | ~179 ms | **~16 ms** | **−91 %** |
| rows in DOM | 2,000 | **200 + "show all"** | windowed |
| totals / final balance | present | **present (correct figure)** | preserved |

**Controls / correctness (Playwright, real DOM):**
- **Small (20 rows, < threshold):** 21 rows rendered, **no** "show all" button, totals
  present — **identical to before**.
- **Large (2,000 rows):** 200 rows + "show all", totals row present **with its figure**,
  DOM nodes 3,214.
- **Show all:** clicking `Report.expandReport` renders **all 2,001 rows**, totals still
  present, button gone.
- Zero console/page errors.

## Verification

- Report/layout/render suites: `report-layout`, `report-render-print`,
  `report-render-pdf`, `report-render-excel`, `report-r6-cutover`, `report-r8-verification`,
  `report-r8c-lifecycle-port` — **all pass**.
- Full `tests/` sweep: **109 pass / 2 fail** — the two pre-existing fixture-missing
  legacy suites (unchanged).
- Print/PDF confirmed **not** windowed (they call `ReportLayout.build` without
  `windowRows`; PDF delegates to the print compose).
- Cache-bust: `report-layout.js?v=0.3`, `report-render-screen.js?v=0.7`.

## Scope / residual
- Threshold/initial (`300`/`200`) are conservative defaults; tune if needed.
- This is **capping**, not true virtualization (no scroll-recycling) — sufficient to
  remove the measured bottleneck while keeping the render path simple and the totals
  exact. Full windowed-scroll virtualization remains a possible future step but was not
  needed to close S2-2.
- Other large lists that don't go through the report engine (e.g. the receipts/expenses
  **list** pages) are out of REPORT-001 scope and unaffected; they paginate separately.

## GA impact
Closes SYS-001 **S2-2** (and UX-001 **U-7**). The `SYS-001` "Performance" watch item —
large-table render — is resolved for the engine-rendered statements/reports.
