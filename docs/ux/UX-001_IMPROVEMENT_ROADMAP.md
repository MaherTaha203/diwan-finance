# UX-001 — Improvement Roadmap (recommendations only)

> **Recommendations, not implementation.** Nothing here is executed in UX-001. Each
> item links to a finding in `UX-001_FORENSIC_AUDIT.md`, is judged against the six
> DDL-01 laws, and is prioritized by **expected gain**, **risk**, **complexity**, and
> **dependencies**. No UI change proceeds without explicit owner approval opening an
> implementation phase (UX-002+). The declared design systems are **fixed anchors** —
> improvements conform to them, never fork them.

## Prioritization legend
- **Gain**: user-visible accessibility/clarity benefit.
- **Risk**: chance of regressing behavior/visuals (accounting UI → risk weighted).
- **Complexity**: engineering effort.

## Tier 1 — accessibility corrections (high gain, low risk, CSS/markup only)

| ID | Recommendation | Fixes | Gain | Risk | Complexity | Notes |
|---|---|---|---|---|---|---|
| U-1 | **Make clickable `.lnk-*` / cell elements keyboard-operable** — convert to `<button class="linklike">` or add `role="button" tabindex="0"` + Enter/Space handler. | S2-1 | High (keyboard + SR users regain 50 actions; satisfies Law 4) | Low-Med (behavior-preserving; test each pattern) | Med | Do per recurring pattern, not per instance |
| U-2 | **Raise `--tx3`/`--faint` to ≥ 4.5:1 in the light themes** (token-only change). | S2-2 | High (readable captions for all light-theme users) | Low (CSS token; verify no paper-doc regression) | Low | Dark themes already pass |
| U-3 | **Add `aria-label` to the 8 unlabeled icon buttons.** | S3-1 | Med (SR users get names) | Low | Low | Mechanical |

## Tier 2 — semantics & consistency (medium gain)

| ID | Recommendation | Fixes | Gain | Risk | Complexity | Notes |
|---|---|---|---|---|---|---|
| U-4 | **Promote page/section titles to real `<h1>/<h2>`** (styling unchanged). | S3-2 | Med (SR landmark navigation) | Low | Med | App-wide sweep; verify no CSS assumes `div` |
| U-5 | **Audit form label associations**; add `for=`/`aria-label` where inputs rely on placeholder/proximity. | S3-4 | Med | Low | Med | Per-form pass |
| U-6 | **Retire residual `as-btn` into `btn`**; document `.dt` (paper) vs `.as-table` (screen) as one two-media system. | S3-3, S3-5 | Low-Med (vocabulary clarity) | Low | Low | Cosmetic consolidation |

## Tier 3 — density & polish (lower priority, may overlap SYS)

| ID | Recommendation | Fixes | Gain | Risk | Complexity | Notes |
|---|---|---|---|---|---|---|
| U-7 | **Window/paginate large tables** in the UI (statements, lists). | Density (Law 3) + SYS-001 S2-2 | Med | Med (preserve totals/print parity) | Med | Shared with SYS-002; coordinate |
| U-8 | **Per-page live UX pass on populated screens** once a seed/non-prod auth path exists (deep IA/density/visual review of authenticated pages). | audit boundary | N/A (closes the coverage gap) | Low | Med | Needs seed data path (also SYS-001 R-9) |

## Sequencing

```
UX-001 (this audit) ✅
        ↓
Owner approval to implement
        ↓
Tier 1 (U-1 keyboard ops · U-2 contrast token · U-3 icon labels)   ← WCAG AA quick wins
        ↓  re-verify with a11y snapshot + contrast recompute
Tier 2 (U-4 headings · U-5 form labels · U-6 vocabulary)
        ↓
Tier 3 (U-7 table windowing [with SYS-002] · U-8 seeded per-page pass)
        ↓
UX-002 exit: re-measured a11y baseline vs. UX-001
```

## Dependencies & coordination
- **U-7 ↔ SYS-002 R-1** are the same table-windowing work seen from UX and performance
  angles — do once, satisfy both.
- **U-8 ↔ SYS-001 R-9** both need a seed/non-production data path; provision it once.

## Non-goals (out of scope)
- No new navigation, button, table, or dialog vocabulary (conform to the frozen systems).
- No change to `FIN`/accounting/DB/business logic/auth.
- No visual change that alters a printed/exported figure or the certified voucher.
- No optimization without a re-measured before/after (contrast recompute + a11y snapshot).

## Acceptance for any UX-002 item
Per the REPORT-001/SYS-001 discipline: own branch, tests where applicable, a **measured
before/after** (contrast ratios recomputed, a11y snapshot re-run, keyboard path
verified), and **zero** accounting/behavior change. "Measured before changed" is the
standing rule.
