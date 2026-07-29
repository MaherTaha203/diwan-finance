# FORM-001 · Phase 7 — Administrative variant (`m-invite`, `m-reclass`)

Establishes the **Administrative variant** (`.fw-admin`) on the two privileged-action dialogs: create-user (`#m-invite`) and accounting reclassify (`#m-reclass`). Presentation/layout only — **no FIN/DB/schema/RLS/validation/payload/permissions/audit change**. Every field id, radio group, and handler is preserved.

## Discovery — a finding that reframes the phase
Reading the base classes settled a question the earlier audit had left implicit:
- **`.modal.editor`** = the full-height edge **drawer** (`position:fixed; inset-inline-start:0; height:100dvh; width:min(600px)`), animated in from the side — the anti-pattern FORM-001 was created to fix.
- **plain `.modal`** = an **already-centered** dialog (`max-width:420–480px`, `mIn` fade, centered in the overlay).

**All five `.modal.editor` drawers were already converted** (Phases 1–5: `m-pay`, `m-rec`, `m-member`, `m-edit-member`, `m-res-form`), plus the dynamic Settings modal (Phase 6). **Zero unconverted drawers remain.** Every remaining backlog form — including `m-invite` and `m-reclass` — is already a centered `.modal` dialog, not a drawer.

So Phase 7 is **not a layout fix** (these dialogs were never mis-presented). It is a **consistency adoption**: bringing the two Administrative action dialogs under the Base workspace shell so they share the same header/body/footer semantics, the Phase-2 motion contract (`fwIn` entrance, reduced-motion, no `transition:all`), and a typed variant marker — matching the FT / Entity / Settings surfaces. This was surfaced to the owner, who chose to proceed with the variant.

## Field inventory (preserved verbatim)
| Form | Fields (id) | Handlers |
|---|---|---|
| `m-invite` | `cu-name`, `cu-role`, `cu-phone`, `cu-email`, `cu-idhint`, `cu-mode` (radios auto/manual), `cu-manual-block`, `cu-pass`, `cu-note`, `cu-bar`, `cu-lvl`, `cu-force`, `cu-submit` | `openCreateUser`, `createUser`, `genCreatePass`, `cuSyncMode` (radio change) |
| `m-reclass` | `rcl-info`, `rcl-type`, `rcl-dest`, `rcl-amount`, `rcl-amount-hint`, `rcl-reason` | `openReclassify`, `onReclassTypeChange`, `doReclassify` |

The save paths (`createUser` → admin-users Edge Function; `doReclassify` → `reclassifyVoucher`) read the same ids and are untouched, so behavior is identical by construction.

## Implementation — the Administrative variant
Both dialogs now carry `fw-modal fw-admin` and reuse the **Base workspace shell**:
- **Header** → `.fw-hd-txt` with the existing title + a static subtitle («حساب وصلاحيات مستخدم النظام» / «تصحيح إداري لتصنيف سند»).
- **Body** → `.mbd fw-body` wrapping the existing fields in one `.fw-sec` / `.fw-sec-h` section (the field grids and all ids unchanged).
- **Footer** → sticky `.mft fw-ft` (primary action · `.fw-ft-spacer` · ghost «إلغاء»), reordered to the Base convention (primary leads).

### New CSS (`.fw-admin`) — a compact action card
```css
@media (min-width:768px){ .modal.editor.fw-modal.fw-admin{width:min(520px,94vw)} }
@media (max-width:767px){ .modal.editor.fw-modal.fw-admin{ /* content-sized bottom sheet */ } }
```
A compact centered card (520px) — the tightest of the variants (Admin 520 < Entity 560 < Settings 640 < FT 960) — since these are short, single-column action forms. On mobile it becomes a content-sized bottom sheet, the same footprint family as the Entity card, with a distinct intent marker. No Base / FT / Entity / Settings rule was touched.

## Evidence · invariance · tests (live, 0 console errors)
- **Screens:** compact centered card at 1440/1024/768 (sticky footer pinned to the card); content-sized bottom sheet at 390. Both dialogs render correctly RTL with header title + subtitle.
- **Structure/ids:** both carry `fw-modal fw-admin` (not `fw-fin`/`fw-entity`); `.mbd fw-body` + `.fw-sec` present; sticky `.mft fw-ft .fw-ft-spacer` present and **not** inside the body; all 12 create-user + 6 reclassify ids present; the `cu-mode` radios preserved; the manual-password toggle (`cuSyncMode`) still reveals `#cu-manual-block` on change.
- **Regression:** FT (payment/receipt/donation), Entity (members/reservations), Settings unaffected — only the two dialogs' HTML + one new scoped `.fw-admin` rule changed.
- **Tests:** contract guard extended to **36/36** (both dialogs = Administrative, ids + radios preserved, converted count 5→7, compact width). Node suite: 70 pass, only the 2 known baseline failures (`business-operations-slice1`, `constitutional-explicit-q5`).

## Architecture note — variant set complete for the audited surfaces
The typed-variant set is now **FT** (`.fw-fin`, 3 surfaces) · **Entity** (`.fw-entity`, 2 surfaces) · **Settings** (`.fw-settings`, 1 surface) · **Administrative** (`.fw-admin`, 2 surfaces). Every full-height editor drawer is a proper workspace, and the two Administrative action dialogs now share the Base structure and motion contract. Remaining plain `.modal` surfaces (`m-edit-pay`/`m-edit-rec` compact FT-edit dialogs; `m-res-view`/`m-res-del`/`m-vhist`/`m-person` view/confirm cards) are already-centered dialogs with no layout problem.

## Files changed
- `public/index.html` — `#m-invite` and `#m-reclass` restructured into the Base shell (ids/handlers/radios preserved).
- `public/css/app.css` — one new scoped block: `.fw-admin` compact card (`min(520px)` ≥768px) + mobile bottom sheet.
- `tests/form-workspace-contract.test.cjs` — Administrative assertions + converted count 5→7 (24→36 pass).
- `docs/form/FORM-001_PHASE7_ADMINISTRATIVE.md`.
- **Not touched:** any JS/FIN/DB/schema/RLS/permissions/validation/audit; the FT/Entity/Settings forms; the Base/FT/Entity/Settings CSS.

## STOP GATE
Remaining backlog (owner-gated) is now only **already-centered dialogs with no layout problem**: optional FT-edit alignment (`m-edit-pay`/`m-edit-rec`), optional motion-contract adoption across the view/confirm `.modal` cards. Owner decision: **A** approve (and optionally pick a next polish target) · **B** revise · **C** close the program — the drawer-conversion mission is complete and all typed variants are established.
