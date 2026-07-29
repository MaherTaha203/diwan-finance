# FORM-001 · Phase 4 — System-wide Form Audit & Classification

Read-only inventory of **every** modal/form in the system, classified into the four families (Financial Transaction / Entity / Administrative / Settings) plus non-form surfaces (Views / Confirms). This phase **classifies and recommends** — per the program, Administrative & Settings are *designed* only when the program reaches them. **No code behavior changed.**

## Complete inventory (13 static modals + 1 dynamic + 1 inline)

| Form / modal | Title | Container | Kind | **Family** | State | Drawer problem? | Recommendation |
|---|---|---|---|---|---|:--:|---|
| `m-pay` | سند صرف | `.fw-modal.fw-fin` | create | **Financial Transaction** | ✅ converted (P1/2) | — | done |
| `m-rec` | سند قبض/تبرع | `.fw-modal.fw-fin` | create | **Financial Transaction** | ✅ converted (P1/2) | — | done |
| `m-edit-pay` | تعديل سند الصرف | `.modal` (compact) | edit | **Financial Transaction** (edit) | compact centered dialog | No | low priority — small focused edit (amount/notes/reason); optional light FT-edit alignment |
| `m-edit-rec` | تعديل الإيصال | `.modal` (compact) | edit | **Financial Transaction** (edit) | compact centered dialog | No | low priority — same as above (incl. food-alloc) |
| `m-member` | إضافة عضو | `.fw-modal.fw-entity` | create | **Entity** | ✅ converted (P3) | — | done |
| `m-edit-member` | تعديل العضو | `.fw-modal.fw-entity` | edit | **Entity** | ✅ converted (P3) | — | done |
| `m-res-form` | حجز جديد | `.modal.editor` | create/edit | **Entity** (booking) | legacy **drawer** | **YES** | **top convert candidate** — a 2nd Entity surface (fields: date, customer, phone, type…); converting it *promotes the Entity variant from Candidate to confirmed* |
| `m-invite` | إنشاء مستخدم | `.modal` | create | **Administrative** | legacy modal | mild | design when Administrative is reached |
| `m-reclass` | إعادة تصنيف محاسبي | `.modal` | action | **Administrative** | legacy modal | mild | design when Administrative is reached (accounting-sensitive) |
| *(inline)* الاشتراكات السنوية | تطبيق الاشتراك | inline page card | bulk action | **Administrative** | inline (not a drawer) | No | design when Administrative is reached |
| `m-output-settings` | إعدادات الإخراج | `.modal.editor` (dynamic) | settings | **Settings** | legacy **drawer** | **YES** | design when Settings is reached (its own variant) |
| `m-res-del` | تأكيد إلغاء الحجز | `.modal` | confirm | *Confirm* | — | — | **not a form** — leave |
| `m-res-view` | تفاصيل الحجز | `.modal` | view | *View* | — | — | **not a form** — leave |
| `m-vhist` | سجل نسخ السند | `.modal` | view | *View* | — | — | **not a form** — leave |
| `m-person` | سندات الشخص | `.modal` | view | *View* | — | — | **not a form** — leave |

## Family summary
- **Financial Transaction** — creates done (`m-pay`/`m-rec`); two **edit** dialogs remain (compact, not drawers → low priority; a future "FT-edit" light treatment could align them without the workspace).
- **Entity** — members done; **`m-res-form` (reservations)** is the outstanding drawer and the natural next conversion — it gives the Entity variant its **second surface** (moving it from Candidate to confirmed).
- **Administrative** — `m-invite`, `m-reclass`, the subscription-apply card. No workspace applied. To be designed **only when the program reaches Administrative** (needs its own variant — dense/action-oriented, likely compact centered, not the financial workspace).
- **Settings** — `m-output-settings` (a drawer). Its own variant when reached (grouped sections, long scroll).
- **Views / Confirms** — `m-res-view`, `m-vhist`, `m-person`, `m-res-del` are display/confirmation surfaces, **not data-entry forms** — outside the Form Workspace program; left as-is.

## Recommended roadmap (owner picks order)
1. **Entity · Reservations (`m-res-form`)** — highest value: converts the last entity drawer AND confirms the Entity variant on a 2nd surface. *(Recommended next.)*
2. **FT-edit alignment (`m-edit-pay`/`m-edit-rec`)** — optional, low risk; light shared "edit dialog" polish (not the full workspace).
3. **Settings (`m-output-settings`)** — establish the **Settings variant** (sectioned, scrollable). Design when reached.
4. **Administrative (`m-invite`, `m-reclass`, subscription card)** — establish the **Administrative variant**. Design when reached.

Guard: `tests/form-workspace-contract.test.cjs` extended to assert **every `.modal.editor` input form is either converted (`fw-modal`) or an explicitly-listed known-unconverted candidate** — so a new legacy drawer can't slip in unclassified.

## Boundaries
Nothing was converted in Phase 4 (audit only). No FIN/DB/schema/RLS/behavior/CSS-behavior change. The converted forms (P1–P3) are unchanged.

## STOP GATE
Owner decides which family to take next (recommended: Entity · Reservations). **A** approve a target · **B** revise the classification · **C** stop the program here.
