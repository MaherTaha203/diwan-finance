# OUTPUT-002-C · UX Slice 5 — Payment Form Workspace (Pilot: «سند صرف الديوان»)

**Pilot only** — the create-payment form `#m-pay` (fund = diwan → title «سند صرف الديوان»; the same modal also serves «سند صرف الغداء»). No other form is touched. Presentation/layout/interaction only — **no FIN/DB/schema/RLS/permissions/validation-semantics/payload/numbering/audit change**.

## STAGE 1 — Field Inventory (read-only)

**Open point:** «الإخراج ▼» → `window.openPay(fund)` (forms.js) → `openM('pay')` shows `#m-pay`; presets `#pay-fund`, calls `onPayFundChange()`, sets `#pay-date=today()`. Gated by `can.write()`.
**DOM/CSS:** static modal `#m-pay` in `index.html`; styled by `.modal.editor` (a `position:fixed`, full-height **~600 px side-drawer** pinned to the inline-start / right in RTL — the “narrow drawer” problem), `.fg` (2-col grid), `.fi`, `.pills`, `.iw.cur`. On ≤768 px it already collapses to a bottom sheet.
**Save/validation:** `window.savePay(print)` (crud.js) reads every field **by id**, validates ben-name (if manual) + amount>0 + date, checks the year-end lock, then `BusinessOps.createVoucher({kind:'payment', payload})`. Two entry actions: save-only `savePay(false)`, save+print `savePay(true)`.
**Edit mode:** a **separate** minimal admin modal `#m-edit-pay` (amount/notes/reason only) — out of this pilot.
**Permissions:** create gated by `can.write()`; edit by `can.admin()`.

| # | Field (id) | Control | Required | Conditional | Handler / notes |
|---|---|---|:--:|---|---|
| 1 | `pay-fund` | select food/diwan | ✓ | drives everything | `onPayFundChange()` — sets title, expense options, beneficiary types |
| 2 | `pay-expense` (`pay-expense-wrap`) | select | ✓ | options depend on fund | food→1 option · diwan→كهرباء/ماء/تنظيف/صيانة/أخرى |
| 3 | `pay-beneficiary-type` | select member/manual | ✓ | food→manual only | `onPayBenChange()` |
| 4 | `pay-member` (`pay-member-wrap`) | searchable combo | ✓* | shown when type=member | enhanced select (combo) |
| 5 | `pay-ben-name` (`pay-manual-wrap`) | text + `e-pay-ben` | ✓* | shown when type=manual | validated on save |
| 6 | `pay-amount` + `pay-currency` (`.iw.cur`) + `pay-currency-sym` + `e-pay-amount` | number + currency select | ✓ | — | `calcILS('pay')` / `onCurrencyChange('pay')` |
| 7 | `pay-ils-row` (`pay-ils-val`,`pay-rate-label`) | computed display | — | shown when currency≠ILS | ILS conversion |
| 8 | `pay-date` + `e-pay-date` | date | ✓ | — | preset to today; year-lock on save |
| 9 | `pay-pills` + `pay-method` | pills نقد/شيك/تحويل | — | — | `setPill('pay')` → `onMethodChange` |
| 10 | `pay-cheque-wrap` (`pay-cheque-no`,`-date`,`-bank`) | sub-panel | — | shown when method=check | — |
| 11 | `pay-approved` | text | — | — | approved_by |
| 12 | `pay-notes` | textarea | — | — | description/notes |
| — | footer | save+print / save-only / cancel | — | — | `savePay(true)` · `savePay(false)` · `closeM()` |

**No field is removed or has its meaning changed.** Every `id`, handler, `data-i18n`, and error span above is preserved verbatim in the redesign.

## STAGE 2–5 — Design (workspace, responsive, financial, RTL)
- **Field grouping** (from the inventory, not the mockup literally): **بيانات المستفيد** = fund-context (full-width) + beneficiary-type + member/manual name + expense category + approved-by; **البيانات المالية** = amount+currency (+ILS row) + date + method (+cheque); **الملاحظات** = full-width.
- **Desktop workspace (≥1024):** the modal is no longer a side-drawer — it becomes a **centered workspace** `min(940px, 94vw)`, two logical sections side-by-side with a divider; fields are single-column **within** each section (comfortable ~420 px, not screen-wide). Amount+currency stay a joined compound; the amount is prominent but not oversized.
- **Tablet (768–1023):** centered comfortable **sheet** `min(620px, 94vw)`, sections stack to one column.
- **Mobile (≤767):** **full-screen** form (`inset:0; height:100dvh`), single vertical flow, sticky footer so Save/Cancel stay reachable — no narrow drawer, no horizontal scroll.
- **Footer hierarchy:** one **Primary** «حفظ سند الصرف» (save), a secondary «حفظ وطباعة», and a ghost «إلغاء» — no competing equal buttons. Both save functions preserved.
- **RTL/a11y:** labels above fields, numerals stay LTR-isolated inside `.iw`/`.rpt-num`, visible focus rings kept, tab order follows the logical DOM order, error spans stay beside their field.

## Architecture (Stage 7 — generalizable, not generalized)
A reusable **`.fw-*` form-workspace shell** (`.fw-modal`, `.fw-context`, `.fw-cols`, `.fw-sec`, `.fw-sec-h`, `.fw-fields`, `.fw-notes`) — applied **only** to `#m-pay` for the pilot. Other modals keep `.modal.editor` untouched. Generalizing later = add the `fw-modal` class + section wrappers to another form; no rule duplication.

## STAGE 8 — Live visual evidence (real app, print/screen media)
Playwright, authenticated stub, `openPay('diwan')`, 0 console errors at every width.

| Width | Before | After |
|---|---|---|
| **1440** (desktop) | narrow ~600 px right-drawer, cramped 2-col, vast empty page | centered workspace `min(960px)`, two sections side-by-side + divider, full-width notes |
| **1024** (desktop/tablet) | same drawer | two-section workspace `min(960px)` |
| **768** (tablet) | drawer | centered single-column sheet `min(620px)` |
| **390** (mobile) | partial bottom sheet | **full-screen** form, vertical flow, sticky reachable footer |

Checked on every shot: no clipping · no overflow · nothing off-screen · no screen-wide stretched fields · no unjustified gaps · clear hierarchy · correct RTL (labels/numerals/currency/date/select arrows) · clear buttons · reads as a financial-system form, not a generic web page.

## STAGE 9 — Functional verification (behavior unchanged)
- **Open / Fill / Cancel(Escape closes) / Reopen** — all work.
- **Validation gate:** empty required → no voucher created; `e-pay-amount`/`e-pay-date`/`e-pay-ben` shown beside their fields. ✓
- **Keyboard:** tab order from `pay-fund` = fund → beneficiary-type → member combo → expense → approved → currency… (visual order); focus rings intact. ✓
- **Save PAYLOAD — captured live (BusinessOps.createVoucher intercepted) — byte-identical BEFORE vs AFTER:**
  ```json
  {"fund_type":"diwan","payment_date":"2026-07-15","movement_type":"diwan_expense",
   "destination_treasury":"diwan","movement_reason":"diwan_expense","beneficiary_type":"manual",
   "member_id":null,"beneficiary_name":"مورّد اختبار","amount":500,"currency":"ILS",
   "amount_ils":500,"exchange_rate":1,"expense_type":"electricity","payment_method":"cash",
   "notes":"فاتورة كهرباء","approved_by":"المدير"}
  ```
  Same on the pre-change tree — **no semantics changed**. Node suite: 69 pass, only the 2 known baseline failures (unrelated), none touching this form.

## Files changed
- `public/index.html` — `#m-pay` inner markup re-grouped into `.fw-*` sections (every id/handler/`data-i18n`/error span preserved; footer hierarchy).
- `public/css/app.css` — appended the reusable `.fw-*` workspace shell + `#m-pay`-scoped responsive rules (+ `.sr-only`). No existing rule changed.
- `docs/output/OUTPUT-002-C_SLICE5_PAYFORM.md` — this document.
- **Not touched:** any JS (crud.js/forms.js/app.js), FIN, DB, schema, RLS, permissions, validation, numbering, audit, other modals.

## STAGE 10 — Generalization proposal (for AFTER approval only — not done now)
The `.fw-*` shell is already reusable. To roll the pattern to another form later: (1) add class `fw-modal` to that modal; (2) wrap its fields in `.fw-context` / `.fw-cols` > `.fw-sec` (`.fw-sec-h` + `.fw-fields`) / `.fw-notes`; (3) keep all field ids/handlers. No new CSS per form. Suggested order once approved: سند القبض (mirror), then donation, then member/subscription — each as its own reviewed slice, never in bulk. **Pilot stops here pending owner decision (A approve→generalize · B revise · C reject).**
