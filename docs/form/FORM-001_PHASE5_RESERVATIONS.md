# FORM-001 · Phase 5 — Reservations → Entity variant (2nd surface)

Applies the **Entity variant** (established in Phase 3) to the reservation form `#m-res-form`, the last input drawer flagged by the Phase-4 audit. This **confirms the Entity variant on a second surface** (member → reservation), promoting it from Candidate to confirmed. Presentation/layout only — **no FIN/DB/schema/RLS/validation/payload/permissions/audit change**.

## Discovery
- **Create** = `resOpenAdd(iso)` / `resOpenAddToday()` (the «حجز جديد» button + FAB) → `#m-res-form`. **Edit** = `resOpenEdit(iso)` (same modal, populated). Save: `resSave` → `SB.from('reservations').insert/update`. Gated by `resCanWrite()`.
- The title (`#m-res-form-title`) and the save button (`#res-f-save`) have their innerHTML set dynamically per open (create vs edit, with the localized date) — preserved as-is.

## Field inventory (preserved verbatim)
| Field (id) | Type | Req | Payload key | Validation (`resValidate`) |
|---|---|:--:|---|---|
| `res-f-id` | hidden | — | (drives insert vs update) | — |
| `res-f-date` (+`-err`) | date | ✓ | `res_date` | required · not past · no same-day clash |
| `res-f-name` (+`-err`) | text (max 80) | ✓ | `customer_name` | length ≥ 2 |
| `res-f-phone` (+`-err`) | text ltr | ✓ | `phone` | `^05\d{8}$` (spaces/dashes stripped) |
| `res-f-type` (+`-err`) | select ×12 | ✓ | `res_type` | required |
| `res-f-notes` | textarea | — | `notes` (or null) | — |

Errors here use per-field `.ferr` slots (`#…-err`, textContent + `.on`) + `.err` on the input — a different pattern from the FT forms, **kept intact**.

## Implementation (Entity variant reused — no new CSS)
`#m-res-form` now carries `fw-modal fw-entity` and is restructured into the Base workspace: header (dynamic title + a static subtitle), one `.fw-sec` «تفاصيل الحجز» with the `.fg` grid — **date** full · **name + phone** paired · **type** full · **notes** full — and the `.fw-ft` footer (primary «حفظ الحجز» · ghost «إلغاء»). Every field id, error slot, handler, and the dynamic `#m-res-form-title`/`#res-f-save` are preserved. No CSS added — the Phase-3 `.fw-entity` variant applies as-is (compact centered card on desktop, content-sized bottom sheet on mobile).

## Evidence · invariance · tests (live, 0 console errors)
- **Screens:** compact Entity card at 1440/1024/768; content-sized bottom sheet at 390. The dynamic title («حجز جديد — الجمعة 25 December 2026») + subtitle render correctly.
- **Validation gate:** empty required → no insert; per-field errors shown on name/phone/type.
- **Save payload** (`reservations` insert intercepted): `{res_date, customer_name, phone, res_type, notes, created_by}` — correct and, since `resSave`/`resValidate` are untouched and read the same ids, **identical to before by construction**.
- **Regression:** members (Entity) and payment/receipt/donation (FT) unaffected — only `#m-res-form` HTML changed; no CSS/Base/JS change.
- **Tests:** contract guard extended to **24/24** (reservation = Entity, field-ids + error slots preserved, converted count now 5, audit-completeness). Node suite: 70 pass, only the 2 known baseline failures.

## Architecture note — Entity variant confirmed
The Entity variant is now proven on **two surfaces** (members, reservations) with two different field sets and two different validation/error patterns — it is no longer a single-surface Candidate. It remains distinct from the FT variant (no `fw-fin`), and no Base or FT rule was touched.

## Files changed
- `public/index.html` — `#m-res-form` restructured (ids/handlers/error slots preserved).
- `tests/form-workspace-contract.test.cjs` — reservation assertions + converted count 4→5; `m-res-form` removed from the audit's known-unconverted list.
- `docs/form/FORM-001_PHASE5_RESERVATIONS.md`.
- **Not touched:** any JS (`reservations.js`), CSS, FIN/DB/schema/RLS/permissions/validation/audit; the FT forms; the Base/Entity CSS.

## STOP GATE
Remaining audit backlog: FT-edit dialogs (optional), Settings variant (`m-output-settings`), Administrative variant (`m-invite`/`m-reclass`/subscription card). Owner decision: **A** approve next target · **B** revise · **C** stop the program here.
