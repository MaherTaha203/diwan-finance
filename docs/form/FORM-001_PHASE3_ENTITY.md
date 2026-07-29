# FORM-001 · Phase 3 — Members + Subscriptions → **Entity variant**

Establishes the **Entity variant** on the Base Form Workspace, using the member forms. Presentation/layout only — **no FIN/DB/schema/RLS/validation/payload/permissions/numbering/audit change**. Entity forms get a layout suited to **entity data**, *not* the financial-voucher layout literally.

## 1 — Discovery (surfaces, from code)
- **Member create** = `openM('member')` (the «عضو جديد» action) → `#m-member` (`.modal.editor` — the side-drawer). Save: `saveMember` → `BusinessOps.createMember` (member + subscription rows).
- **Member edit** = `editMember(id)` → `#m-edit-member` (drawer). Save: `updateMember` (admin; opening-balance change writes a `voucher_versions` snapshot — untouched). Delete: `deleteMember`.
- **Subscriptions** (الاشتراكات السنوية) = an **inline page card** (`due-year` + `due-amount` + «تطبيق الاشتراك السنوي» → `applyAnnualDue`), **not** a drawer/modal — a bulk financial *action*, not an entity record. **Out of the Entity-variant scope** (no drawer problem; candidate for a future Administrative pass).

## 2 — Member field inventory (preserved verbatim)
| # | Field (id) — create / edit | Type | Req | Payload key | Notes |
|---|---|---|:--:|---|---|
| 1 | `mem-name` / `edit-mem-name` (+`e-mem-name`) | text | ✓ | `name` | validated (len>1) + duplicate check |
| 2 | `mem-phone` / `edit-mem-phone` | tel | — | `phone` | |
| 3 | `mem-from-year` / `edit-mem-from-year` | number | — | `active_from_year` | `onMemberFromYearChange` recomputes the hint + subscription rows |
| 4 | `mem-balance` / `edit-mem-balance` (+`-hist-hint`) | number | — | `opening_balance` (+ auth `historical_*`/`credit_balance_ils`) | opening liability; edit writes a version snapshot |
| 5 | `mem-notes` / `edit-mem-notes` | textarea | — | `notes` | |
| — | footer | — | — | — | create: Save·Cancel · edit: Save·**Delete**·Cancel |

No amount / currency / payment-method / classification / conditional fields — a flat identity record.

## 3 — Compare with Base + existing variants
| Aspect | FT forms (pay/rec) | Member (entity) | Classification |
|---|---|---|---|
| Workspace shell / responsive / footer / focus / motion | ✓ | ✓ | **BASE** (unchanged) |
| Section + heading | multi | single «بيانات العضو» | **BASE** |
| Amount+currency / method / cheque / classification region | ✓ | — | **FT-specific** (absent here) |
| Two-column financial split | ✓ | **no** | **FT-specific** |
| Compact card sized to content | — | ✓ | **ENTITY variant** |
| Short-field pairing grid (`.fg`), full-width name/balance/notes | — | ✓ | **ENTITY variant** |
| Mobile presentation | full-screen | **content-sized bottom sheet** | **ENTITY variant** |
| Opening-balance auto-calc, member-code, subscription rows | — | ✓ | **MEMBER-specific** |

## 4 — Architecture deliverable
- **Base Form Workspace** — **confirmed, unchanged in Phase 3.** No Base rule was modified (only a new variant class was added), so payment/receipt/donation are provably unaffected.
- **Financial Transaction variant** (`.fw-fin`) — untouched; not applied to entity forms.
- **Entity variant** (`.fw-entity`) — NEW. Inherits the Base shell but: a **compact centered card** `min(560px)` on desktop (never the wide FT workspace, never the tall empty drawer); a single logical section with the standard `.fg` grid (short fields pair, name/balance/notes span full — the previously orphaned half-width balance is now full-width, removing an empty grid hole); on mobile a **content-sized bottom sheet** (avoids a mostly-empty full screen for a 5-field form). Contains no financial/business assumptions.
- **Member-specific layer** — opening-balance liability + subscription generation live in the save code (untouched).
- **Candidates (NOT generalized)** — the Entity variant is proven on **one** entity surface (members) only; do not assert it for users/other entities until a second surface confirms it. The subscription-apply inline card and the `#m-edit-rec` compact dialog remain Administrative candidates.

## 5 — Evidence · regression · invariance · tests
- **Live (0 console errors):** member **create** and **edit** render as the compact Entity card at 1440/1024/768 and a bottom sheet at 390; edit loads the member's data («أحمد آل طه»).
- **Regression:** payment (and by construction receipt/donation) **unchanged** — the FT workspace is pixel-identical; Phase 3 added only `.fw-entity`-scoped CSS + restructured member HTML, touching no Base rule and no FT form.
- **Payload invariance:** `saveMember` payload **byte-identical** before vs after (name/phone/notes/opening_balance/active_from_year + auth `historical_*` + 2 subscription rows); validation still blocks an empty name; all field ids resolve.
- **Tests:** `tests/form-workspace-contract.test.cjs` extended to 19/19 (Entity classes, member field-id preservation, compact-not-FT-wide, single-section, entity≠financial). Full node suite: 70 pass, only the 2 known baseline failures.

## Files changed
- `public/index.html` — `#m-member` + `#m-edit-member` restructured into the Entity card (ids/handlers preserved; orphan balance → full-width).
- `public/css/app.css` — appended the `.fw-entity` variant (no existing rule changed).
- `tests/form-workspace-contract.test.cjs` · `docs/form/FORM-001_PHASE3_ENTITY.md`.
- **Not touched:** any JS/FIN/DB/schema/RLS/permissions/validation/numbering/audit; FT forms; Base rules.

## STOP GATE
Not started Phase 4 (system-wide audit). Owner decision: **A** approve → Phase 4 (classify remaining forms) · **B** revise · **C** reject.
