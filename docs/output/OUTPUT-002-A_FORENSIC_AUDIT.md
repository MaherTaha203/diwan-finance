# OUTPUT-002-A · Forensic Output Audit

> **Read-only, evidence-based.** Boots the real seeded app (post-R9 handoff) and measures the
> output layer directly — live DOM buttons, pure `compose()` per surface, screenshots. No code
> changed. Companion docs: `OUTPUT_INVENTORY`, `SURFACE_COVERAGE`, `FIELD_COMPLETENESS_MATRIX`,
> `IMPLEMENTATION_ROADMAP`. Evidence images in `OUTPUT-002-A_evidence/`.

## 1. Evidence method
- Seeded Supabase stub + admin session boot the unmodified app; `window.FIN`/`window.DB` present
  (R9), so every engine cutover is **active** and gatherers return real models.
- **Buttons:** enumerated from each page's live DOM (`[onclick]`, `[data-output]`, `.rpt-out-btn`).
- **Surfaces:** each report rendered via the renderers' pure `compose()` — `screen`/`print`/`pdf`
  return `{html,css}`, `excel` returns `{aoa}` — then field-scanned and length-measured.
- **Screenshots:** 18 page screens + print-composed member & fund artifacts (evidence folder).
- **0 boot errors** during the whole run.

## 2. The core finding — the paper engine is already unified; the *shell* is not
The REPORT-001 engine already makes **Screen = Print = PDF byte-identical** for every report
(identical field set and identical composed length — see `FIELD_COMPLETENESS_MATRIX`). Every
pain the owner listed lives in the **shell around** the engine, not in the engine:

| Owner's pain | Root, measured |
|---|---|
| تكرار أزرار الطباعة | migrated statements show **both** the legacy page toolbar **and** the engine bar (member 5 btns, each fund 7) |
| غياب أزرار في بعض الصفحات | debt/delinquent have no on-screen Excel; donation/members/annual print-only; **users/audit/treasury/dues have 0 buttons** |
| اختلاف الطباعة عن الشاشة | **not present** for engine reports (screen=print=pdf identical); only the **legacy transfer voucher** and **CSV/Excel** differ |
| فقدان حقول (المستفيد/الملاحظات) | reports drop nothing across paper; **Excel** drops title/filters/₪; **QR/Signature absent from all reports** |
| المحاذاة/الهوامش/الرأس/التذييل | unified in `ReportLayout.build` for all engine reports; drift only vs legacy transfer voucher |
| إعدادات طباعة متفرقة | no central Output Profile; per-report options (QR/signature/running-balance) not modelled |
| لا مشاركة | Share = 0 and Deep-Link = 0 across the whole app |

## 3. Visual consistency (analysis #5)
Measured across engine reports (screen/print/pdf come from one builder):
- **Margins / paper size / orientation** — one `@page` rule in `report-layout.js` (per-model
  `orientation`); identical everywhere. ✅
- **Running header / footer / page numbers** — single shared chrome; identical. ✅
- **Table width / alignment / fonts / colours** — one engine stylesheet injected once. ✅
- **Repeated page headers on multipage** — handled by the engine layout. ✅

**Drift exists only at two edges:** (a) the **internal-transfer voucher** (`prtTransfer` →
`openPrintWin`, legacy template — different margins/header than the engine); (b) **Excel**,
which lacks the title/filter/currency chrome (a different medium, but should still echo them).
Everything else is already visually one system.

## 4. Legacy detection (analysis #7) — explicit list

| Legacy path | Kind | Live or dead (post-R9) | Disposition |
|---|---|---|---|
| `buildRecVoucher` / `buildPayVoucher` | Printer | **Dead** — `REPORT_ENGINE_VOUCHERS` on → engine hybrid used | remove in -B (keep kill-switch per policy) |
| `prtTransfer` → `openPrintWin` | Printer | **Live** — transfer voucher never migrated | migrate to engine in -B |
| `exportCSV(type)` (8 types) | CSV | **Live** — no engine CSV renderer exists | -B decision: build engine CSV renderer *or* keep as the one legacy medium |
| `exportMemberStmt('csv'\|'json')` | CSV/JSON | **Live** | fold into the CSV decision |
| `exportDelinquentExcel` | Excel | **Shadowed** — `exportPageExcel` routes delinquent to engine first | remove after engine-Excel parity |
| `exportPageExcel` voucher-list branch (`*-rec`/`*-pay`) | Excel | **Live** — uses `FIN.voucherExportRows` + `styleDiwanSheet` | migrate to engine list model in -B |
| `exportPagePDF` / `exportPageExcel` dispatchers | Router | **Live** — thin dispatchers to engine | collapse into the unified bar in -C |

> Note: the statement/report **legacy string-builders were already removed in R8-b**; the
> surviving `prt*` functions are now thin engine-routers, not legacy printers. True remaining
> legacy = the **CSV family**, the **transfer voucher**, and the **voucher-list Excel**.

## 5. Output Profile readiness (analysis #6) — General / Per-Report / Organization

The engine `meta` already carries `orientation`, `filters`, `printDate`, `signatures` per model,
and vouchers carry QR — so the profile has real anchors. Proposed mapping:

**Organization Profile (shared identity — future multi-org ready):** logo · organization name ·
address · phone · email · website · stamp · QR issuer · footer text. *(Today these are hard-set
in the layout header; lift to one source.)*

**General output (applies to all):** paper size · orientation default · margins · colour vs
mono · print backgrounds · page numbering · header/footer on-off · PDF filename pattern · Excel
filename pattern · open-print-window-directly · auto-copy-link · share-PDF-after-generate.

**Per-Report overrides:**
| Report | QR | Signature | Running balance | Donation details | Totals |
|---|:-:|:-:|:-:|:-:|:-:|
| Member statement | opt | opt | ✅ | ✅ | ✅ |
| Fund statement | opt | opt | ✅ | — | ✅ |
| Annual debt | opt | — | — | — | ✅ |
| Members list | opt | — | — | — | — |
| Users list | opt | ✗ default | — | — | ✗ |

**Readiness:** signatures already in `meta.signatures`; **QR + per-report toggles are not yet
modelled on reports** and must be added (see F-3). The profile store does not exist yet — new
settings surface required in -C. **No DB change** (client-side settings + `meta`).

## 6. Deep-Link readiness (analysis #8)

Current navigation is `window.nav('<page>')` — **no parameters, not URL-addressable**. Adding a
hash router (`#/<page>?params`) with an auth-return bounce is feasible **without any DB change**.

| Page | Params needed | Source today | Deep-link ready? |
|---|---|---|:--:|
| Member statement | `id` (+`from`/`to`) | DOM `ms-member`,`ms-from`,`ms-to` | ✅ easy |
| Fund statement | `fund` (+`from`/`to`/`type`) | DOM `food/diwan-stmt-*` | ✅ easy |
| Annual debt | `year`,`filter` | **JS closure** `_adFilter` (no stable DOM id) | ⚠️ surface state first |
| Delinquent | `year`,`primary` | **JS closure** `_delYear`,`_delPrimary` | ⚠️ surface state first |
| Donation report | `from`/`to` | DOM/state | ✅ easy |
| Members / Annual / Users / Audit | (none / filter) | list pages | ✅ trivial (page-level link) |

**Required for -C:** a thin hash-router + per-page "read params → set controls → render", and a
"login → return to the requested report" bounce. The statement pages are immediately linkable;
debt/delinquent need their filter state lifted out of closures into readable controls first.

## 7. Summary of what -A proves
1. Engine reports: **screen=print=pdf perfect**; no re-layout needed.
2. The nine pains are **shell problems**: duplicate/absent/inconsistent buttons, Excel chrome
   gaps, missing QR/signature model, no profile, no share, no deep-link.
3. True remaining legacy is small and enumerated (CSV family, transfer voucher, voucher-list Excel).
4. Everything needed is **client-side** — **no database or accounting change** anywhere in OUTPUT-002.
