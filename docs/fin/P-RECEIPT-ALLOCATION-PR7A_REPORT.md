# P-RECEIPT-ALLOCATION · PR-7A — Refund User Interface (completion of PR-7)

**Exposes the ALREADY-EXISTING refund capability to accountants. UI only: no new architecture, authority, table, RPC, or accounting logic. The sole execution path is `BusinessOps.refundReceipt()`. Feature flag OFF ⇒ inert ⇒ Golden Reference byte-identical.**

## 1. Implementation Summary
The forensic investigation confirmed the refund engine/authority/RPC/reversal all exist but had **no UI entry point**. PR-7A adds only the accountant-facing surface:

| File | Change | Nature |
|---|---|---|
| `public/js/refund-ui.js` | **new** — the Refund dialog: eligibility, line rendering, two modes, live validation, confirmation, and the single call to `BusinessOps.refundReceipt`. Presentation only. | added |
| `public/index.html` | hidden Refund button in the `#m-edit-rec` footer (`#edit-rec-refund-btn` → `window.openRefund`); `#m-refund` dialog shell (aria dialog); `<script>` include | added |
| `public/js/crud.js` | `editRec` calls `RefundUI.syncEditButton(r)` to show the button only when eligible (3 lines) | added |
| `public/css/app.css` | `.rfd-*` dialog styles + a `.btn.warn` variant, using existing design tokens (theme-aware, RTL) | added |

**No change** to `fin.js`, `operations.js`, `data.js`, `receipt-settlement.js`, `refund-engine.js`, or any migration — proven in §5/§11.

## 2. Verification Report
- `tests/pralloc-pr7a-refund-ui.test.cjs` — **24/24**: eligibility matrix (posted/flag-off/non-admin/cancelled/draft/fully-refunded/all-voided/partially-refunded), presentation-only guarantees, wiring, and the Golden-Reference git-diff check.
- Full suite: **80 green / 2 known-red** (`business-operations-slice1`, `constitutional-explicit-q5` — pre-existing baseline). PR-1..PR-7 + Integration Review all remain green.
- The PR-5 and Integration "single-reader" assertions were refined (not weakened) to classify `refund-ui.js` as a **presentation** reader of `DB.allocation_records` and to prove it computes **no** attribution (`perYear`/`finalBalance`/`computeAllocation` absent). `FIN.memberAllocation` remains the sole attribution authority. Rationale in §12.

## 3–8. Screenshots (evidence)
Rendered from the **real** `refund-ui.js` + real `public/css/app.css` with mock data in a standalone harness (`docs/fin/pr7a-shots/`). *Note: the live Preview is unreachable/loginless from this environment, so these are component renders, not live-app captures; the empty circle glyphs are the Tabler icon **webfont being CDN-blocked offline** — cosmetic only, icons load normally in the app.*

| # | File | Shows |
|---|---|---|
| 3 Desktop | `01-desktop-full.png` | **Full refund** — all active lines selected, live totals, "جاهز للاسترداد" |
| Desktop | `02-desktop-partial.png` | **Partial refund** — subset selected |
| Desktop | `03-desktop-invalid.png` | **Invalid** — nothing selected, Continue disabled |
| Desktop | `04-desktop-confirm.png` | **Confirmation step** — lines to reverse, years, total ₪800, reason |
| Desktop | `05-desktop-refunded.png` | **Already-refunded line** — "مُسترَد" badge, Already-Refunded/Remaining columns, line locked |
| Desktop (dark) | `06-desktop-dark.png` | dark theme parity |
| 4 Tablet | `07-tablet-full.png` | tablet width (834) |
| 5 Mobile | `08-mobile-full.png` | mobile width (390), bottom-sheet layout |

9 (attempt to refund already-refunded lines) is shown by `05` — such lines render **locked/non-selectable** (checkbox replaced by a lock, status "مُسترَد"). 10 (invalid refund) is `03`. 6/7/8 (refund flow, full example, partial example) are `04`/`01`/`02`.

## 3. Refund Dialog contents (requirement compliance)
Header: Receipt No · Member · Date · Receipt Amount. Table per settlement line: **Destination · Year · Amount · Already Refunded · Remaining Refundable · Status · Notes**. Modes: **Full** (auto-selects every refundable line) / **Partial** (individual selection); already-refunded and voided lines are non-selectable. Live: **Receipt Total · Selected Refund Total · Remaining Refundable · Validation state**; Confirm disabled until valid. A dedicated **confirmation step** precedes execution (lines, years, money, reason).

## 4. Execution path
The UI performs **no** refund logic, allocation math, or DB writes (asserted: no `SB.from`/`SB.rpc`, no `computeRefund`/`computeAllocation`, no `.update(`, no `paid_amount_ils`/`member_subscriptions`). On confirm it calls exactly:
```
BusinessOps.refundReceipt({ originId, amountILS: Σ(selected line amounts), reason, settlementLineIds: [selected ids] })
```
Then it refreshes every screen via the normal `loadAll()` flow. Double-click is guarded (`_executing`).

## 9. Rollback Plan
Feature flag OFF (default) ⇒ the Refund button never shows and the module is inert ⇒ instant behavioural revert. Full revert: delete `refund-ui.js`, its `<script>` include, the `#m-refund` shell + `#edit-rec-refund-btn` in `index.html`, the `editRec` toggle line in `crud.js`, and the `.rfd-*`/`.btn.warn` block in `app.css`. No schema, no data, nothing to unwind.

## 10. Risk Assessment
- **Low:** additive UI behind an OFF-by-default flag; engine/authority untouched; the engine re-validates and caps every refund server-side, so a UI mistake cannot corrupt accounting.
- **Operational prerequisite (owner decision, not code):** `BusinessOps.refundReceipt` self-guards on `MODEL2_ALLOCATION_ENABLED` (`operations.js:347`). With that flag OFF the dialog opens but execution returns `E_DISABLED` (surfaced as a toast). Enabling it is a business-rule/config decision I did not change.
- **Environment:** live-app UAT (real login, devices, cross-browser) still pending — see the FINAL UAT report; these screenshots are component renders.

## 11. Regression Report
`git diff origin/main` touches only: `refund-ui.js` (new), `index.html`, `crud.js`, `app.css`, and test/doc files. Engine/authority/schema files (`fin.js`, `operations.js`, `data.js`, `receipt-settlement.js`, `supabase/migrations/*`) are **unchanged** (asserted in test). All prior automated tests pass.

## 12. Golden Reference Comparison
Final Balance, Treasury, Ledger, FD-002, `paid_amount_ils`, `member_subscriptions`, Historical Truth: **byte-identical** — none of the files that compute them were modified. The only test edits reclassify a new **presentation** reader (analogous to the existing `data.js` loader carve-out) and add a guard proving `refund-ui.js` computes no attribution; the behavioural attribution cases are unchanged and green. Flag OFF ⇒ no UI, no calls, no difference.

## 13. Accessibility
`role="dialog"` + `aria-modal` + `aria-labelledby`; radiogroup for modes with `aria-checked`; per-row checkbox `aria-label`; `aria-live` summary; **focus trap** (Tab cycles within the dialog) with initial focus; Escape closes via the app-wide overlay handler; Confirm disabled until valid.

## 14. Responsive Design
Reuses the app's modal/overlay system (bottom-sheet on small screens via existing `.ov/.modal` breakpoints); the line table scrolls horizontally inside its own container; a `≤560px` block stacks meta/actions. Verified at 1280 (desktop), 834 (tablet), 390 (mobile), light + dark.

## 15. Final Acceptance Checklist
- [x] No architectural changes · [x] No new accounting logic · [x] No new allocation logic
- [x] No new authorities · [x] No new database objects
- [x] One execution path only: `BusinessOps.refundReceipt()`
- [x] All existing automated tests remain green (80/2 baseline)
- [x] Golden Reference byte-identical (engine/schema files untouched)
- [x] Refund lifecycle now accessible to accountants (button + dialog, admin + eligibility gated)
- [ ] Live-app UAT (login/devices/cross-browser) — pending environment access (component renders provided)
- [ ] `MODEL2_ALLOCATION_ENABLED` enablement decision — owner’s call (business rule; not changed here)

---
**PR-7A — refund UI only, flag-gated, single execution path. Engine/accounting untouched. Stopping here; awaiting your approval.**
