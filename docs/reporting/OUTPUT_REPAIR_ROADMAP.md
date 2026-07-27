# OUTPUT-001 — Output Repair Roadmap & Redesign Recommendation (Phase 11)

> Read-only proposal. **No code is changed here.** This document proposes the target
> architecture for a unified output layer and a migration path. It is the on-ramp to the
> **REPORT-001 — Unified Financial Reporting Engine** project.
> Baseline: `main` @ `deb910f` (after PRINT-001 PRs #209–#214).

---

## 1 · Where we are (one-paragraph state)

Print and PDF are already unified behind a single, resilient renderer (`openPrintWin`
iframe → native browser print → Save-as-PDF). Excel is a separate, working engine
(SheetJS). CSV is dead code. The remaining problems are **not stability** (PRINT-001
fixed that) — they are **fragmentation and consistency**: three visual systems for the
same data (print `PRINT_TOKENS`, Excel `styleDiwanSheet`, screen `.acct-stmt`), each
report hand-builds its own HTML string, there is no shared "report" component model, and
some pages expose outputs inconsistently or not at all.

---

## 2 · Target architecture — REPORT-001

### 2.1 Single Source of Truth: a Report Model
One neutral, serializable **ReportModel** produced from the certified engine (`FIN.*`) —
never from the DOM. Every renderer consumes the same model.

```
ReportModel {
  meta:    { title, subtitle, org, date, period, docNo?, verifyToken?, orientation }
  summary: KpiCard[]            // the .cards row (label, value, tone)
  sections: Section[]           // ordered
}
Section = Table { columns[], rows[], totals?, footnotes? }
        | KeyValue { pairs[] }  // voucher-style label/value rows
        | AmountBox { amount, words, tone }
        | Band { text }         // openbar / carried-balance strip
Column { key, header, align, format: 'text'|'num'|'money'|'date'|'tag', repeatHeader }
```

The model carries **data + intent** (format hints, totals, repeat-header flags) but **no
styling**. `FIN.*` remains the single financial source; the model is a pure projection.

### 2.2 Unified Reporting Engine (orchestrator)
`Report.render(model, target)` where `target ∈ { screen, print, pdf, excel }`. One call
site per page; the engine picks the renderer. No page hand-builds HTML strings anymore.

### 2.3 Renderers (one model → four targets)

| Renderer | Built on | Replaces |
|---|---|---|
| **Screen** | shared component CSS (evolve `.acct-stmt` into the canonical shell) | ad-hoc `renderStmt`/`renderMemberStmt`/report renderers |
| **Print** | the existing `openPrintWin` iframe + a **token set derived from the same shell** | `PRINT_TOKENS` string-building in each `prt*` |
| **PDF** | the print renderer + browser Save-as-PDF (already unified) | `savePrintPDF` (keep as alias) |
| **Excel** | SheetJS driven **from the ReportModel columns/formats** (not a parallel hand-built sheet) | `exportPageExcel` per-type branches, `styleDiwanSheet` ad-hoc |

**Key unification:** the print token set and the screen shell are generated from **one**
design-token source (colors, type scale, table rules), so "preview == paper" by
construction and Excel inherits the same column semantics. This directly resolves
**OUT-5** (three visual systems) and the deferred **ROOT-2** from PRINT-001.

### 2.4 Unified Print Engine
Keep `openPrintWin` as the delivery primitive (it is already correct and resilient). The
engine's Print renderer produces the iframe body from the ReportModel instead of each
`prt*` assembling strings. Optional, behind a decision: **running brand header/footer +
real "Page X of Y"** via a small paged-media approach (the deferred ROOT-7) — implement
once, centrally, benefiting every report.

### 2.5 Unified PDF Engine
No separate PDF engine — PDF is "print → Save as PDF" (the PRINT-001 decision). The only
addition worth considering: seed proper PDF **document metadata** (title/author) and a
stable filename per report from `model.meta`.

### 2.6 Unified Excel Engine
One `toWorkbook(model)` that maps `Section=Table` → a styled sheet using
`Column.format` for number/RTL/width. **Self-host SheetJS** (resolves OUT-3, the CDN
availability risk) or bundle it. CSV becomes a free by-product of the same column model
(`toCsv(model)`) — re-enabling CSV *correctly* instead of resurrecting dead code.

### 2.7 Component hierarchy

```
FIN.*  (certified financial engine — unchanged, single source of truth)
  │
  └── buildReportModel(pageContext)         ← per surface: one small function
        │  (voucher / fund-stmt / member-stmt / debt / delinquent / donations / list …)
        ▼
      ReportModel  ───────────────────────────────────────────────┐
        │                                                          │
        ├── Report.render(model,'screen') → Screen renderer  → DOM │  shared
        ├── Report.render(model,'print')  → Print renderer   → openPrintWin (iframe)
        ├── Report.render(model,'pdf')    → Print renderer   → browser Save-as-PDF
        └── Report.render(model,'excel')  → Excel renderer   → SheetJS  ── toCsv() → CSV
                              design tokens (one source) ─────────────────┘
```

---

## 3 · Migration strategy (safe, incremental — mirrors the PRINT-001 cadence)

Each step is its own PR, presentation-only where possible, verified before the next.
Financial logic (`FIN.*`, queries, totals) is **never** touched.

| Step | Goal | Risk |
|---|---|---|
| **R0 — Foundation** | Introduce `ReportModel` + `Report.render` + a design-token module. No surface migrated yet; engine unused in prod. | Low (additive) |
| **R1 — Pilot: one report** | Migrate the **fund statement** (screen + print + Excel) to the model. Prove parity against current output with screenshots + value diff. | Low |
| **R2 — Statements** | Member statement + donations register onto the model. | Low |
| **R3 — Reports** | Annual-debt + delinquent + members/annual lists. | Low |
| **R4 — Vouchers** | Receipt/payment/transfer vouchers (KeyValue + AmountBox sections). | Medium (QR/verify token) |
| **R5 — Excel/CSV unification** | Excel driven from the model; re-enable CSV as `toCsv(model)`; self-host SheetJS. | Medium |
| **R6 — Consistency pass** | One output-affordance component (Print / PDF / Excel / CSV) placed identically on every page; fix the UX gaps (Audit/Users Print, Reservations output). | Low |
| **R7 — Dead-code retirement** | Remove `exportPDF`, dead `exportCSV`, `exportMemberStmt` csv/json/html branches, and orphaned `auth.js`/`i18n.js` selectors — once nothing references them. | Low |
| **R8 — Optional: running headers + page numbers** | Central paged-media header/footer + "Page X of Y" (the deferred ROOT-7), one implementation for all reports — **requires owner visual sign-off**. | Medium |

**Verification per step:** Playwright print-emulation screenshots (screen + print), an
Excel open-and-parse check, and a value-parity assertion that columns/totals equal the
pre-migration output. Pure-node static guards (as in PRINT-001) lock each contract.

---

## 4 · Prioritized fix list (maps to Phase-10 root causes)

| Priority | Item | Root cause | Where it lands |
|---|---|---|---|
| P1 | Unify screen/print/Excel on one ReportModel + tokens | OUT-5 | R0–R5 (core of REPORT-001) |
| P1 | Self-host SheetJS (Excel availability) | OUT-3 | R5 |
| P2 | Re-enable CSV correctly; delete dead CSV/PDF dispatchers | OUT-1, OUT-2 | R5, R7 |
| P2 | Consistent output affordance on every page; add Print to Audit/Users; add output to Reservations | Phase 8, OUT-6 | R6 |
| P3 | Running brand header + real page numbers | OUT-4 | R8 (owner sign-off) |
| P3 | Self-host fonts/QR in the print doc | OUT-7 | R4/R5 |
| P3 | PDF document metadata + stable filenames | Phase 5 | R1+ |

---

## 5 · Explicit non-goals / carry-over decisions

- **Do not** reintroduce html2canvas/jsPDF/html2pdf — the raster path is retired; PDF is
  native Save-as-PDF (PRINT-001 decision).
- **Do not** restore in-browser backup **restore** — deliberately disabled for data safety.
- Backup (`doBackup`) stays its own JSON mechanism; it is not a "report" and is out of the
  ReportModel scope.
- Running headers / real page numbers remain gated on owner sign-off (visual change to
  every document).

---

## 6 · Definition of done for REPORT-001

1. Every reachable output on every page is produced by `Report.render(model, target)`.
2. Screen, print, PDF, and Excel of the same report are visually one system and share
   totals/columns by construction.
3. CSV works and is a by-product of the same model; no dead export dispatchers remain.
4. Output affordances are identical (icon/label/order) across all pages; no page that
   should export/print is missing the control.
5. SheetJS (and ideally fonts/QR) are self-hosted — no output depends on a live CDN.
6. Static + Playwright guards lock parity and prevent regression, as in PRINT-001.

> This roadmap is a proposal only. No implementation begins until the owner approves
> REPORT-001 and its frozen scope.
