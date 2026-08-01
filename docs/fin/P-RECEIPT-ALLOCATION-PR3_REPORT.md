# P-RECEIPT-ALLOCATION · PR-3 — Settlement Editor (UI only) — verification report

**UI only. Feature flag OFF; nothing persisted; no RPC; no runtime wiring. Zero runtime behaviour change.**

## 1. Implementation Summary
New self-contained component `public/js/settlement-editor.js` (`window.SettlementEditor`):
- **`computeState(input)` — pure, DOM-free, unit-testable.** Given the receipt amount, the current lines, the available destinations (with outstanding), and the fiscal lock, it returns per-row `{status, remaining, errors}`, running `allocated`/`remaining`, global errors, and `canSave`.
- **`mount(container, opts)` — thin DOM layer** over `computeState`: renders the grid + live summary bar, wires input + keyboard, toggles the Save button, and (read-only mode) renders a static posted/cancelled/refunded view. Styles are injected on mount only (no `app.css` change).
- Destinations are the spec-approved four: **Subscription Year (`due`) · Historical Deficit (`historical`) · Future Credit (`credit`) · Donation (`donation`).**
- Columns per row: **Destination · Outstanding · Allocated · Remaining · Status · Notes.**
- The Save button **does not persist and does not call the RPC** — at most it hands the validated state to an `onSaveIntent` callback (unused in PR-3).

Nothing mounts the editor in any live flow; with the flag OFF (default) it never renders.

## 2. UI (interactive artifact)
Interactive demo (same `computeState` logic, Arabic RTL operator UI): **the Settlement Editor artifact** — add/remove rows, type amounts, watch live validation, the summary bar (Receipt / Allocated / Remaining / Validation status), and the Save button enable only at exactly zero remaining. Pressing Save shows "nothing is persisted (UI only)".

## 3. Validation matrix (all live, while typing)
| Rule | Trigger | Result |
|---|---|---|
| `Σ lines = amount` | remaining ≠ 0 | `sum_mismatch`; Save disabled |
| No duplicate destination | same (kind, year) twice | `duplicate_destination` |
| No negative / zero amount | amount ≤ 0 | `non_positive_amount` |
| No amount > outstanding | capped kinds (due/historical) exceed outstanding | `exceeds_outstanding` |
| No closed fiscal year | `due` line with `year ≤ locked` | `closed_year` |
| No invalid destination | kind ∉ {due,historical,credit,donation} | `invalid_destination` |
| No empty destination | kind missing | `empty_destination` |
| No empty amount | amount blank | `empty_amount` |
| No orphan row | no destination **and** no amount | `orphan_row` |
| Save gate | any error or remaining ≠ 0 | `canSave = false` |
| Per-row status | valid row | paid / partial / reduces_deficit / donation / prepayment |
| Remaining-after-payment | capped kinds | `max(outstanding − amount, 0)` |

## 4. Files changed
| File | Change |
|---|---|
| `public/js/settlement-editor.js` | **new** — the editor (pure logic + DOM + read-only), inert |
| `public/index.html` | +1 `<script>` tag (loads the inert module) |
| `tests/pralloc-pr3-settlement-editor.test.cjs` | **new** — 23 assertions |

**Not touched:** `fin.js`, `reports.js`, `report-model.js`, `dues-workspace.js`, `app.js`, `data.js`, `operations.js`, `receipt-settlement.js`, the RPC/migrations, all tables/policies.

## 5. Tests
`tests/pralloc-pr3-settlement-editor.test.cjs` — **23/23 pass**: totals + remaining correctness; per-row status; every validation rule (Σ mismatch, duplicate, negative/zero, exceeds-outstanding, credit-uncapped, closed-year, empty/invalid destination, empty amount, orphan, no-lines); Save enable/disable transitions on exact zero; and inertness (no persistence/RPC/`allocation_records`/FIN/`paid_amount_ils`/BusinessOps reference; no runtime file mounts it; flag still OFF).
Full suite: **73 green / 2 red** — the 2 red are the pre-existing `business-operations-slice1` and `constitutional-explicit-q5`, unchanged from `main`.

## 6. Risk assessment
- **Runtime risk: none.** The component is never mounted in any live flow; the flag is OFF; styles inject only on mount; no `app.css` change; `data.js` untouched (no new query).
- **Isolation:** the module references no FIN/BusinessOps/DB/RPC symbol and cannot persist. Its Save path stops at an unused callback.

## 7. Rollback confirmation
Delete `settlement-editor.js` + remove its `<script>` tag (and the test). Nothing depends on it; no data, no schema.

## 8. Zero runtime behaviour change — explicit statement
**PR-3 changes ZERO runtime behaviour.** The editor is a dormant, unmounted component; the flag is OFF; nothing is persisted, nothing reaches the Atomic RPC, no existing receipt/balance/report/treasury/ledger is affected, and the Golden Reference is byte-identical. Proven by the unchanged full-suite result and a diff that touches only `index.html` (one script tag) plus new, unreferenced files.

---
**PR-3 only — Settlement Editor UI, inert. Next (on approval): the validation/wiring toward posting per the plan.**
