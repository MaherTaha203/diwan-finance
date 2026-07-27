# SYS-001 — Performance Roadmap (recommendations only)

> **Recommendations, not implementation.** Nothing here is executed in SYS-001. Each
> item is evidence-linked to `SYS-001_PERFORMANCE_AUDIT.md` / `_METRICS_BASELINE.md`
> and prioritized by **expected gain**, **risk**, **complexity**, and
> **dependencies**. No optimization proceeds without explicit owner approval opening
> an implementation phase (SYS-002+). The build-free vanilla-JS architecture is a
> **fixed constraint** — no bundler/framework is proposed.

## Prioritization legend

- **Gain**: measured/expected user-visible or maintainability benefit.
- **Risk**: chance of regressing behavior (the app is accounting-critical → risk is weighted heavily).
- **Complexity**: engineering effort.
- **Dependencies**: what must precede it.

## Priority tiers

### Tier 1 — high gain, low/medium risk (recommend first)

| ID | Recommendation | Addresses | Gain | Risk | Complexity | Dependencies |
|---|---|---|---|---|---|---|
| R-1 | **Window/cap the statement & large-list tables** — render the first N rows with a "show all / paginate" affordance beyond a threshold; keep totals from the full model. | S2-2 | High (2,000-row render 180 ms → ~1 order of magnitude fewer nodes) | Med (must preserve totals + print parity) | Med | A representative large dataset to re-measure |
| R-2 | **Prove reachability of low-fan-in engines** (`migrate2`, `refund-engine`, `writeoff-engine`); delete if dead, else document. | S3-3 | Med (less startup JS + clarity) | Low (removal is reversible, test-guarded) | Low | Call-graph/reachability pass |
| R-3 | **Audit the 60 element-level `addEventListener` sites** for any attached inside a repeated-render path without a guard. | S3-1 | Med (closes the one open memory question) | Low (read-only audit) | Low | — |

### Tier 2 — structural / maintainability (medium gain, needs care)

| ID | Recommendation | Addresses | Gain | Risk | Complexity | Dependencies |
|---|---|---|---|---|---|---|
| R-4 | **Decompose `app.js`** by moving render clusters into their already-existing sibling modules (statements, exports, nav) — mechanical, behavior-preserving, one cluster per PR. | S2-1 | Med-High (change-risk ↓, parse surface ↓) | Med (large surface; needs the REPORT-001-style phased discipline + tests each step) | High | Test coverage per cluster |
| R-5 | **Defer non-critical-path modules** — split the eager `<script defer>` set so role-specific surfaces (e.g. reservations, user-admin) load on first navigation to them. | S3-5 | Med (~less startup eval per role) | Med (load-order + global-timing correctness) | Med | R-4 clarifies boundaries |
| R-6 | **Lazy-load the i18n table** for the non-active language / non-login strings. | S3-2 | Low-Med (~70 KB off startup) | Low-Med | Med | i18n access-pattern map |

### Tier 3 — infrastructure / nice-to-have (lower priority)

| ID | Recommendation | Addresses | Gain | Risk | Complexity | Dependencies |
|---|---|---|---|---|---|---|
| R-7 | **IndexedDB warm cache** for the read-only dataset (fetch-then-revalidate) to speed warm starts / enable limited offline read. | S3-4 | Med (warm start) | Med-High (cache-invalidation vs. accounting freshness — must never serve stale figures for a write path) | High | Freshness/invalidation design; explicit owner decision |
| R-8 | **Scope/trim `app.css`** (189 KB) and reduce inline `index.html` (122 KB) templates. | S3-6, S3-7 | Low-Med | Low | Med | CSS usage map |
| R-9 | **Extend the baseline harness for live network + print/export timing** on a seeded dataset (needs a non-production auth/seed path). | S3-8 | N/A (fills the measurement gap) | Low | Med | A seed/test data path that doesn't touch production Supabase |

## Sequencing

```
SYS-001 (this audit) ✅
        ↓
Owner approval to implement
        ↓
Tier 1 (R-1 statement windowing · R-2 dead-code proof · R-3 listener audit)
        ↓  re-measure against this baseline
Tier 2 (R-4 app.js decomposition · R-5 route-deferred loading · R-6 i18n lazy)
        ↓  re-measure
Tier 3 (R-7 IndexedDB · R-8 CSS/HTML trim · R-9 network/print harness)
        ↓
SYS-002 exit: new measured baseline vs. SYS-001
```

## Non-goals (explicitly out of scope)

- No bundler, framework, or build system (fixed architectural constraint).
- No change to `FIN`/accounting/DB/SQL/Supabase/business logic/auth.
- No change that alters any printed/exported figure or the certified voucher artifact.
- No speculative optimization without a re-measured before/after against this baseline.

## Acceptance for any SYS-002 item

Every implementation must, per the REPORT-001 discipline: run on its own branch behind
tests, produce a **measured before/after** against `SYS-001_METRICS_BASELINE.md`, and
change **zero** accounting/DB/business behavior. "Measured before removed / before
optimized" is the standing rule.
