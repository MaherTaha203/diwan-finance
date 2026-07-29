# FORM-001 · Phase 1 — Receipt Workspace (`#m-rec`) · Variant: Financial Transaction

Independent program (not OUTPUT-002). Presentation/layout/interaction only — **no FIN/DB/schema/RLS/validation-semantics/payload/accounting/permissions/numbering change**. The Base is derived from **Payment Pilot + Receipt Discovery together**; nothing is promoted to Base without evidence from **≥2 surfaces**.

## A — Receipt Field Inventory (read-only; code is the source of truth)

Open: `window.openRec(fund)` (forms.js) → `openM('rec')`; presets `#rec-fund`, `onRecFundChange()`, fills member/contact dropdowns, `#rec-date=today()`. Gated by `can.write()`. Save: `window.saveRec(print)` (crud.js). Edit: separate modal `#m-edit-rec` (amount/date/member/payer/food-alloc/notes) — **out of this phase**.

| # | Field (id) | Type | Req | Conditional visibility | Payload key | Handler |
|---|---|---|:--:|---|---|---|
| 1 | `rec-fund` | select food/diwan/**donation** | ✓ | always | `fund_type` (+ drives `movement_type`/`destination_treasury`/`movement_reason`) | `onRecFundChange()` |
| 2 | `rec-payer-type` (`rec-payer-type-wrap`) | select member/**contact**/manual | — | contact+manual options hidden unless fund=diwan; donation forces member | `payer_type` | `onPayerTypeChange()` |
| 3 | `rec-member` (`rec-member-wrap`) + `e-rec-member` | searchable combo | ✓* | payerType=member OR fund=donation | `member_id` | — |
| 4 | `rec-contact` (`rec-contact-wrap`) | select | — | payerType=contact | `contact_id` | — |
| 5 | `rec-payer-name` (`rec-manual-wrap`) + `rec-save-contact` | text + checkbox | ✓* | payerType=manual | `payer_name` (+ maybe new contact) | — |
| 6 | `rec-diwan-type` (`rec-diwan-type-wrap`) | select operational/donation | ✓ (diwan) | fund=diwan | → `movement_type` (diwan_operational_income / diwan_cash_donation) | — |
| 7 | `rec-don-kind` (`rec-don-fund-wrap`) | select cash/inkind | — | fund=donation | → classification | `onDonKindChange()` |
| 8 | `rec-don-category` (`rec-don-category-wrap`) | select | — | fund=donation & inkind | `register_category` | — |
| 9 | `rec-don-display` (`rec-don-display-wrap`) | select food/diwan | — | fund=donation & cash | `donation_display_fund` | `onDonDisplayChange()` |
| 10 | `rec-don-alloc-type` (`rec-don-alloc-wrap`) + `rec-alloc-preview` | select support/deficit | — | fund=donation & cash & display=food | `food_donation_allocation` | Item-9 confirm at save |
| 11 | `rec-amount` + `rec-currency` (`.iw.cur`) + `rec-currency-sym` + `e-rec-amount` | number + currency | ✓ | always | `amount`,`currency`,`amount_ils`,`exchange_rate` | `calcILS('rec')`/`onCurrencyChange('rec')` |
| 12 | `rec-ils-row` (`rec-ils-val`,`rec-rate-label`) | computed | — | currency≠ILS | — | — |
| 13 | `rec-date` + `e-rec-date` | date | ✓ | always | `receipt_date` | today; year-lock at save |
| 14 | `rec-pills` + `rec-method` | pills cash/check/transfer/**online** | — | always | `payment_method` | `setPill('rec')` |
| 15 | `rec-cheque-wrap` (`rec-cheque-no`,`-date`,`-bank`) | sub-panel | — | method=check | — | — |
| 16 | `rec-notes` | textarea | — | always | `notes` | — |
| — | footer | save+print / save-only / cancel | — | — | — | `saveRec(true)` · `saveRec(false)` · `closeM()` |

Save-time business logic (**must be preserved, not touched**): required-field validation (member/payer-name/amount/date), year-end lock, **probable-duplicate STRONG WARNING** confirm, **Item-9 food-donation allocation** confirm, **deficit-overflow** confirm, non-member-donation contact suppression, P2-D classification, `MODEL2RecordAllocation`, `vouchers` upsert.

## B — Behavior Graph (conditional dependencies, from code)
```
rec-fund
├── food     → payer(member|manual*) · classify by payerType (subscription_payment | food_cash_donation)
├── diwan    → payer(member|contact|manual) + rec-diwan-type(operational|donation)
└── donation → payer forced=member · rec-don-kind
                 ├── cash   → rec-don-display(food|diwan)
                 │             └── food → rec-don-alloc-type(support_current|reduce_deficit) → Item-9 confirm
                 └── inkind → rec-don-category(...)  · no treasury, documentary
rec-payer-type
├── member  → rec-member-wrap
├── contact → rec-contact-wrap        (diwan only)
└── manual  → rec-manual-wrap (+ save-as-contact, non-donation only)
rec-method: check → rec-cheque-wrap
rec-currency ≠ ILS → rec-ils-row
```

## C — Payment Pilot ↔ Receipt comparison (item by item)
| Aspect | Payment (`#m-pay`) | Receipt (`#m-rec`) | Common? |
|---|---|---|---|
| workspace shell (drawer→centered) | pilot did it | **needs it** (same drawer problem) | **BASE** |
| header title + subtitle | title + subtitle | title only (add subtitle) | **BASE** |
| section grouping w/ headings | `.fw-sec-h` (new) | already has `.sdiv` dividers | **BASE** (unify) |
| responsive shell (1440/1024/768/390) | pilot did it | same targets | **BASE** |
| footer hierarchy (1 primary + secondary + ghost) | yes | yes (2 save + cancel) | **BASE** |
| focus/validation-beside-field/RTL/a11y | yes | yes | **BASE** |
| amount+currency compound (`.iw.cur`) | yes | yes | **FINANCIAL TRANSACTION** |
| transaction date | yes | yes | **FINANCIAL TRANSACTION** |
| payment method pills | 3 (cash/check/transfer) | 4 (+online) | **FINANCIAL TRANSACTION** (count is data, not layout) |
| cheque sub-panel on method=check | yes | yes | **FINANCIAL TRANSACTION** |
| counterparty area | beneficiary (member/manual) | payer (member/contact/manual) | **FINANCIAL TRANSACTION** (shape) / mode set is **surface-specific** |
| notes full-width | yes | yes | **FINANCIAL TRANSACTION** |
| expense category | yes (beneficiary side) | — | **PAYMENT-SPECIFIC** |
| approved-by | yes | — | **PAYMENT-SPECIFIC** |
| fund options | food/diwan | food/diwan/donation | **RECEIPT-SPECIFIC** |
| payer contact mode + save-as-contact | — | yes | **RECEIPT-SPECIFIC** |
| diwan-type block | — | yes | **RECEIPT-SPECIFIC** |
| donation sub-tree (kind/category/display/alloc) | — | yes | **RECEIPT-SPECIFIC** |

## D — BASE Form Workspace (proven on BOTH surfaces → promote)
`workspace positioning` (centered, not drawer) · `max-width strategy` (desktop `min(960px)` / tablet `min(620px)`) · `responsive shell` (≥1024 two-col · 768 single-col sheet · ≤767 full-screen) · `section structure` + `heading hierarchy` · `spacing rhythm` · `footer action hierarchy` · `focus treatment` · `validation placement` (beside field) · `RTL behavior` · `accessibility foundations`. **Contains NO field names, business conditions, or accounting assumptions.** Class root: `.fw-modal` + `.fw-body/.fw-cols/.fw-sec/.fw-sec-h/.fw-fields/.fw-notes` + `.fw-ft`.

## E — FINANCIAL TRANSACTION Variant (Receipt + Payment; donations only if Phase 2 proves it)
`amount prominence` (present, not oversized) · `amount+currency relationship` (joined compound) · `transaction date` · `counterparty area` (person/party block) · `financial classification` region · `payment method` · `notes/description` · `action footer`. Layer class: `.fw-fin`. **Donation is NOT locked into this variant yet** — pending its own discovery (Phase 2).

## F — RECEIPT-SPECIFIC layer (kept outside Base)
payer mode switching (member/contact/manual + save-as-contact) · diwan-type classification block · donation conditional sub-tree · receipt movement classification. **Presentation may change; behavior/ids/handlers must not.**

## G — CANDIDATE rules (seen on ONE surface only — NOT promoted to Base)
- header **subtitle** line (pilot only so far) — Candidate (will be present on receipt too → promotable once both ship).
- payment-method **pills as a row** vs a select — only pills so far; keep as FINANCIAL-TRANSACTION, not Base.
- **section divider style** (`.sdiv` legacy vs `.fw-sec-h` new) — unify visual, but the "sections exist" idea is Base; the exact divider styling stays a Candidate until proven not to clash on entity/admin forms.
- **two-column split** — proven on 2 financial surfaces → BASE for financial; NOT asserted for Entity/Settings forms (those may want different column logic).

## Implementation
- **CSS** (`app.css`): the Slice-5 `.fw-*` block is re-headed as the **Form Workspace System** — BASE (shell/responsive/sections/footer) + a **`.fw-fin`** Financial-Transaction variant marker; added `.fw-band` (full-width conditional classification blocks) and `.sdiv` alignment inside `.fw-modal`. No existing rule changed; no per-form duplication.
- **HTML** (`index.html`): `#m-rec` re-grouped into `.fw-*` sections (context = fund; two `.fw-sec` = بيانات الدافع | المبلغ والتاريخ; full-width `.fw-band`s = diwan-type + donation sub-tree; `.fw-notes`); `#m-pay` and `#m-rec` both carry `fw-modal fw-fin`. Every field id, handler, `data-i18n`, error span and conditional-wrapper id is preserved verbatim; footer aligned to the shared hierarchy (primary Save · secondary Save+print · ghost Cancel).

## G — Responsive evidence (live, real app, 0 console errors)
| Width | Receipt (diwan) | Receipt (donation, full sub-tree) |
|---|---|---|
| 1440 | centered workspace, two sections + divider, diwan-type band full-width | «توجيه التبرع» sub-tree renders as a clean full-width band |
| 1024 | two-section workspace (Base) | — |
| 768 | centered single-column sheet | — |
| 390 | full-screen, vertical flow, sticky footer | full-screen incl. the donation band |
No clipping · no overflow · nothing off-screen · no stretched fields · no unjustified gaps · footer never covers fields · RTL correct.

## H — Business invariance (payload before vs after)
Captured live (`BusinessOps.createVoucher` intercepted) across **4 branches** — **byte-identical BEFORE vs AFTER**:
`member_food` · `manual_diwan_operational` · `donation_cash_food_member` · `contact_diwan`. Same `movement_type`/`destination_treasury`/`register_category`/`donation_display_fund`/`food_donation_allocation`/… No FIN/DB/schema/RLS/validation/payload/accounting/permission/numbering change.

## I — Live interaction
Open · Cancel · Escape (closes) · Reopen ✓ · payer modes member/contact/manual switch correctly ✓ · required-field validation blocks empty with errors beside the field (amount/date/member) ✓ · conditional bands appear/disappear per fund (food/diwan/donation) + donation kind/display ✓ · amount/currency/date/method/notes ✓ · save produces the identical payload ✓ · keyboard focus + tab order logical ✓. **Payment form re-verified: pixel-identical, unaffected.** Node suite: 69 pass, only the 2 known baseline failures (unrelated).

## Files changed
- `public/index.html` — `#m-rec` re-grouped into `.fw-*`; `fw-fin` added to `#m-pay` + `#m-rec`.
- `public/css/app.css` — Form Workspace System header + `.fw-fin` marker + `.fw-band`/`.sdiv` rules (no existing rule modified).
- `docs/form/FORM-001_PHASE1_RECEIPT.md` — this document.
- **Not touched:** any JS (crud.js/forms.js/app.js), FIN, DB, schema, RLS, permissions, validation, numbering, audit, other modals.

## K — STOP. No further generalization.
Not applied to members/subscriptions/users/settings/any other form. Candidate rules (§G) remain un-promoted. Owner decision: **A** approve → Phase 2 (Donations, validate/extend the FT variant) · **B** revise · **C** reject.
