# FORM-001 · Phase 2 — Donations Workspace + Form-Interaction Performance

Baseline = Phase 1 / PR #265 (Base Form Workspace + Financial-Transaction variant). **Not a redesign.** Goal: test the FT variant against the most conditional financial transaction, and extend it **only** if a gap proves general — without letting donation-specific complexity pollute Base. Plus the owner's **Form Interaction Performance Contract**. No FIN/DB/schema/RLS/validation/payload/accounting/permissions/numbering/audit change.

## 1 — Discovery (surfaces, from code)
- **Donations have NO separate form.** Create = `openRec('donation')` (the «تبرع جديد» button on سجل التبرعات) → the **receipt** workspace `#m-rec` with `fund=donation` (the `rec-don-*` sub-tree). Already in the workspace since Phase 1.
- **Edit** = `editRec` → the compact `#m-edit-rec` dialog (amount/date/payer/notes + `edit-rec-food-wrap` allocation) — a small centered edit dialog, **not** a drawer; out of the workspace-conversion scope (kept, tested).
- Other `openRec` entry points (food/diwan/FAB/dashboard) all reach the same `#m-rec`. No standalone donation surface exists.

## 2 — Donation field inventory
The donation sub-tree of `#m-rec` (all preserved verbatim; see Phase-1 doc §A for the shared receipt fields): `rec-don-kind` (cash/inkind) · `rec-don-category` (inkind only) · `rec-don-display` (cash: food/diwan) · `rec-don-alloc-type` (cash+food: support/deficit) + `rec-alloc-preview`. Payload keys: `register_category`, `donation_display_fund`, `food_donation_allocation` (+ the shared `movement_type`/`destination_treasury`/`movement_reason`). Donor reuses the receipt payer modes (member/contact/manual); donation forces payer=member.

## 3 — Donation state machine (from implementation)
```
fund=donation → payer forced=member
 rec-don-kind
 ├── cash → rec-don-display
 │           ├── food → rec-don-alloc-type (support_current | reduce_deficit)
 │           │           └── member + reduce_deficit ⇒ historical_debt_collection (Q4)
 │           │           else ⇒ food_cash_donation / deficit_cash_donation
 │           └── diwan → donation_cash
 └── inkind → rec-don-category (equipment/…); NO destination/treasury; donation_inkind (documentary)
```
Verified payloads (live, save-path unchanged): `cash_food(support)`→food_cash_donation · `cash_diwan`→donation_cash · `cash_food(deficit, member)`→historical_debt_collection · `inkind`→donation_inkind. Trigger→shown/hidden/validation/payload transitions all match code.

## 4 — FT comparison matrix
| Capability | Payment | Receipt | Donation | Classification |
|---|:--:|:--:|:--:|---|
| Workspace shell / sections / footer | ✓ | ✓ | ✓ | **BASE** |
| Counterparty area | beneficiary | payer | donor(=member) | **FT variant** |
| Transaction date | ✓ | ✓ | ✓ | **FT variant** |
| Amount + currency compound | ✓ | ✓ | ✓ (cash & inkind value) | **FT variant** |
| Payment method (+cheque) | ✓ | ✓ | ✓ | **FT variant** |
| Notes | ✓ | ✓ | ✓ | **FT variant** |
| Fund / classification region | expense | fund + diwan-type | donation kind/dest/alloc | **surface-specific** |
| Valuation (in-kind value) | — | — | ✓ (amount field) | **DONATION-SPECIFIC** (reuses FT amount) |
| Distribution / allocation | — | (food alloc) | ✓ | **DONATION-SPECIFIC** |
| Destination selection | — | — | ✓ | **DONATION-SPECIFIC** |
| Dynamic multi-level conditionals | low | medium | **high** | **DONATION-SPECIFIC** (`.fw-band`) |

## 5 — Variant hardening (the key result)
Donation exercised the FT variant harder than any surface and **revealed no general gap**. Every FT capability (counterparty, date, amount+currency, method, notes, footer) worked unchanged. Donation's extra complexity (kind→category/destination/allocation) is **DONATION-SPECIFIC** and stays in the receipt/`.fw-band` layer — **not** promoted to the variant. So the FT variant is now **confirmed on three surfaces without absorbing donation complexity** — exactly the success criterion. **No Base or FT rule was widened for donations.**

## 6 — Motion inventory + performance (owner's contract)
**Inventory (Form Workspace):** modal open `mIn` scale `.96→1` .18s (ESSENTIAL→but EXPENSIVE: scales whole panel) · `.ov` backdrop `blur(6px)` (EXPENSIVE, static composite) · `.fw-modal .pill` `transition:all` (REDUNDANT) · field focus `transition:border/box-shadow` (USEFUL, cheap) · conditional reveal = `display` toggle (no animation — already instant). No business behavior depends on `animationend`/`transitionend`.

**Measured (Chromium, median of 9, ms):**
| Interaction | Before | After |
|---|:--:|:--:|
| Open — JS to interactive (desktop/mobile) | ~0.8 | ~0.7 |
| Open — visual settle (desktop) | ~210 | ~185 *(≈158 with blur fully off)* |
| Close — JS | ~1.1 | ~1.1 |
| Conditional-state switch (fund→donation…) | ~0 | ~0 |
The form was **always** interactive in <1ms; the perceived weight was the 180ms **scale** entrance + backdrop composite. Isolated test proved the backdrop `blur(6px)` alone added **~50ms (~25%)** to every desktop modal-open.

**Change (Base-level, CSS only):** entrance = `fwIn` (opacity + 6px lift, **140ms, no scale**); `.fw-modal .pill` explicit transitions (no `transition:all`); `prefers-reduced-motion` → workspace opens instantly; `.ov` backdrop `blur(6px)→3px` (≈half the composite cost, keeps a subtle depth cue). Calm · Fast · Functional — motion no longer draws attention to itself.

## Architecture deliverable (§15)
- **Base Form Workspace** — confirmed rules unchanged (positioning, max-width, responsive shell, sections, footer, focus, validation placement, RTL, a11y). **Phase-2 change:** entrance motion (fwIn, no scale) + reduced-motion + pill transition + lighter backdrop — all presentation-only, applied to every `.fw-modal`.
- **Financial Transaction Variant** — inherited from Phase 1; **confirmed by donation** on all capabilities; **no extension added** (donation revealed no general gap).
- **Donation layer** — kind/category/destination/allocation conditionals in the receipt `.fw-band`; in-kind reuses the FT amount as a documentary value. Donation-specific, not in Base/variant.
- **Candidates (still NOT generalized)** — header subtitle, `.sdiv` vs `.fw-sec-h` divider unification, two-column split for non-financial forms.

## Evidence · regression · tests
- Donation states rendered live (0 console errors): **cash** (display+allocation) and **in-kind** (category; display/allocation correctly hidden — clean reflow, no empty holes / orphan labels) at 1440 + 390 full-screen.
- **Regression:** payment + receipt at 1440/390 — pixel-identical layout/behavior (only the backdrop is intentionally a touch lighter).
- **Payload invariance:** donation states classify correctly and are unchanged (Phase 2 touched no save path — CSS only).
- **Tests:** new `tests/form-workspace-contract.test.cjs` (12/12) locks Base+FT classes, field-id preservation (payment 11 / receipt 15 + conditional wrappers), and the motion contract (fwIn not scale · pills not `transition:all` · reduced-motion · backdrop ≤3px). Full node suite: 70 pass, only the 2 known baseline failures.

## Files changed
- `public/css/app.css` — motion contract (fwIn/pill/reduced-motion) + lighter backdrop. **HTML/JS untouched** (the donation workspace shipped in Phase 1).
- `tests/form-workspace-contract.test.cjs` · `docs/form/FORM-001_PHASE2_DONATIONS.md`.

## STOP GATE (§16)
Not started Members/Subscriptions. Candidates un-promoted. Owner decision: **A** approve → Phase 3 (Entity variant) · **B** revise · **C** reject.
