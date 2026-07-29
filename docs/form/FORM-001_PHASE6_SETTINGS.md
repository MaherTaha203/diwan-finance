# FORM-001 · Phase 6 — Output Settings → Settings variant (new variant)

Establishes the **Settings variant** (`.fw-settings`) on the output-settings dialog `#m-output-settings` — the last major input surface flagged by the Phase-4 audit. Settings is neither a financial transaction nor a short identity card: it is a **grouped, scrollable configuration form**. So it defines the fourth typed variant. Presentation/layout only — **no FIN/DB/schema/RLS/validation/payload/permissions/audit change**.

## Discovery
- **Open** = `openOutputSettings()` (from the «الإخراج ▼» menu, admin-only via `isAdmin()`). The modal is **built dynamically** in `public/js/output-settings.js` (`ensureModal()`), not declared in `index.html`.
- **Persist** = `saveOutputSettings()` → `collect()` → `OutputProfile.set()` → localStorage. **Reset** = `resetOutputSettings()` → `OutputProfile.reset()` → `populate()`. Populate on open reads `OutputProfile.get()`.
- Three config groups: **logo** (show toggle + upload/replace/delete), **organization** (name/subtitle/site/phone/email/address, bilingual), **output options** (footer note bilingual + default action). Field ids are read by `populate()`/`collect()` by id.

## Field inventory (preserved verbatim)
| Group | Fields (id / id-base) | Payload path |
|---|---|---|
| Logo | `os-show-logo`, `os-prev-logo`, `os-logo-note`, image handlers `__osImg`/`__osImgClear` | `output.showLogo`, `organization.logo` |
| Organization | `os-name-ar/-en`, `os-subtitle-ar/-en`, `os-site`, `os-phone`, `os-email`, `os-address-ar/-en` | `organization.*` |
| Output options | `os-footer-ar/-en`, `os-default-action` | `output.footerNote`, `output.defaultAction` |

Every id, the `_img` working-copy logic, and the `collect()`/`populate()` mapping are **untouched** — the persisted `OutputProfile` shape is identical to before by construction.

## Implementation — the Settings variant
`#m-output-settings` now carries `fw-modal fw-settings` and reuses the **Base workspace shell**:
- **Header** → `.fw-hd-txt` with the title «إعدادات الإخراج» + a static subtitle «هوية المستندات وخيارات الطباعة».
- **Body** → `.mbd fw-body` (the Base scrollable region), holding the three `.os-grp` groups verbatim.
- **Footer** → a sticky `.mft fw-ft` (primary «حفظ» · `.fw-ft-spacer` · ghost «استعادة الافتراضي»), **moved out of** the scroll region so Save/Reset are always reachable.
- The legacy `#m-output-settings .mbd{max-height:72vh;overflow:auto}` override was **removed** — the Base modal's own scroll + the sticky footer now handle a long form.

### New CSS (`.fw-settings`) — one width rule
```css
@media (min-width:768px){
  .modal.editor.fw-modal.fw-settings{width:min(640px,94vw)}
}
```
A slightly wider config card (640px) — between the compact Entity card (560px) and the FT workspace (960px) — to seat the two-up field groups. On mobile it stays the **Base full-screen sheet** (the content is long, so a bottom-sheet would over-scroll). No Base, FT, or Entity rule was touched.

## Evidence · invariance · tests (live, 0 console errors)
- **Screens:** centered 640px card at 1440/1024/768 (sticky footer pinned to the card bottom); full-screen sheet with pinned footer at 390. Header title + subtitle render correctly RTL.
- **Save→persist→reload propagation:** changed name/footer/default-action → `saveOutputSettings()` → `OutputProfile.get()` returns the new values (`organization.name.ar`, `output.footerNote.ar`, `output.defaultAction`) → re-open repopulates from the persisted profile. The Slice-4 settings-propagation path is intact.
- **Structure checks:** sticky footer is `.mft.fw-ft` and **not** inside `.mbd`; all 15 field ids present; `saveOutputSettings`/`resetOutputSettings` handlers wired.
- **Regression:** FT (payment/receipt/donation) and Entity (members/reservations) forms unaffected — only `output-settings.js` HTML + one new scoped `.fw-settings` rule changed.
- **Tests:** contract guard extended to **30/30** (settings = Settings variant, Base body/footer, legacy override removed, field ids, width rule). Node suite: 70 pass, only the 2 known baseline failures (`business-operations-slice1`, `constitutional-explicit-q5`).

## Architecture note — fourth variant defined
The typed-variant set is now complete for the audited surfaces: **FT** (`.fw-fin`, 3 surfaces), **Entity** (`.fw-entity`, 2 surfaces), **Settings** (`.fw-settings`, 1 surface). Settings is deliberately distinct — a wider sectioned card whose value is the **grouped scroll + sticky footer**, not a transaction column layout or a compact card. As a single-surface variant it is a defined-but-not-yet-cross-proven variant; no Base rule was generalised from it.

## Files changed
- `public/js/output-settings.js` — `#m-output-settings` markup restructured into the Base shell (header subtitle, `.mbd fw-body`, sticky `.mft fw-ft`); the `.mbd max-height` override removed. Ids/handlers/`collect`/`populate` unchanged.
- `public/css/app.css` — one new scoped rule: `.fw-settings` width `min(640px)` ≥768px.
- `tests/form-workspace-contract.test.cjs` — Settings-variant assertions (24→30).
- `docs/form/FORM-001_PHASE6_SETTINGS.md`.
- **Not touched:** any FIN/DB/schema/RLS/permissions/validation/audit; `OutputProfile`; the FT/Entity forms; the Base/FT/Entity CSS.

## STOP GATE
Remaining audit backlog (owner-gated): **Administrative variant** (`m-invite`/`m-reclass`/subscription-apply card); optional FT-edit dialog alignment (`m-edit-pay`/`m-edit-rec`). Owner decision: **A** approve next target · **B** revise · **C** stop the program here.
