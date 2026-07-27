# REPORT-001 — Unified Financial Reporting Engine · Frozen Architecture Specification

> **Status:** FROZEN SPECIFICATION — architecture only. **No code is written in this phase.**
> **Supersedes:** the legacy per-surface print/Excel string-builders (retired incrementally, never before their replacement is complete and verified).
> **Builds on:** PRINT-001 (PRs #209–#214, print/PDF unified on `openPrintWin`) and the OUTPUT-001 audit (`docs/reporting/OUTPUT_*`).
> **Baseline:** `main` @ `deb910f`.
> **Date:** 2026-07-27
>
> This document is the single authority for the reporting engine. Changing any
> **Immutable Principle** (§1–§4) requires an explicit, recorded owner amendment —
> the same constitutional discipline used for AUTH-003.

---

## 0 · Purpose & Scope

Build **one** reporting engine that renders every financial document — on screen,
to print, to PDF, and to Excel — from **one** data model and **one** design-token
source. The engine is the only producer of customer-facing output. Its correctness
bar is: *the same report, in any medium, shows the same data and the same design.*

**In scope:** all statements, reports, lists, and vouchers (see §5).
**Out of scope (unchanged):** the certified financial engine `FIN.*` (single source of
financial truth — REPORT-001 only *reads* it), JSON backup (`doBackup`), authorization
(AUTH-003), and the disabled backup-restore.

---

## 1 · IMMUTABLE PRINCIPLE — Single Source of Truth

Every report MUST flow through exactly one pipeline:

```
Financial Data  (FIN.* — certified engine, the only source of numbers)
      ↓
ReportModel     (neutral, serializable; data + intent, NO styling)
      ↓
Layout Engine   (maps ReportModel → ordered layout components)
      ↓
Renderers       (Screen · Print · PDF · Excel — one model, four outputs)
```

**Rules (frozen):**
1. A report's numbers come **only** from `FIN.*`. Renderers never compute financial
   values and never read the live DOM for data.
2. There is **exactly one** `ReportModel` per report instance. Screen, print, PDF, and
   Excel consume that same instance.
3. **No medium may own bespoke HTML.** Separate screen-HTML, print-HTML, and PDF-HTML
   for the same report is an **architectural defect**, not an option.
4. The `ReportModel` carries **data + intent** (column formats, totals, repeat-header
   flags, orientation) but **zero styling**. Styling lives only in Design Tokens (§4).

---

## 2 · IMMUTABLE PRINCIPLE — Output Engines

All four renderers consume the same `ReportModel`. **Any difference in data or design
between them is an architectural error** (a failing quality gate, §7).

| Renderer | Medium | Delivery | Notes |
|---|---|---|---|
| **Screen Renderer** | in-app view | DOM into the page shell | The canonical on-screen ledger; the visual reference. |
| **Print Renderer** | paper | `openPrintWin` off-screen iframe → browser print (PRINT-001) | Reuses the proven, resilient primitive. |
| **PDF Renderer** | PDF file | the Print Renderer + browser "Save as PDF" | Not a separate engine (PRINT-001 decision); adds `meta` → filename + PDF title. |
| **Excel Renderer** | `.xlsx` (+ CSV by-product) | SheetJS driven from `ReportModel` columns/formats | Self-hosted lib (no CDN). CSV = `toCsv(model)` from the same columns. |

**Rule (frozen):** adding a fifth medium means adding a renderer that consumes the same
model — never a parallel data path.

### 2.5 Report Registry (owner amendment — 2026-07-27)

Reports are **never** invoked by function name (`prtMemberStmt()`, `prtAnnualDebt()`, …).
Every report is a **registry entry keyed by a stable ID**, and the only way to produce a
report is through the engine:

```
Report.render("MEMBER_STATEMENT", target)      // id form
Report.render(model, target)                    // model carries meta.reportId
```

**Registry IDs (frozen):** `MEMBER_STATEMENT · FUND_STATEMENT · ANNUAL_DEBT ·
DELINQUENT · DONATION_REPORT · MEMBERS_LIST · ANNUAL_LOG · RECEIPT_VOUCHER ·
PAYMENT_VOUCHER · TRANSFER_VOUCHER · TREASURY_POSITION · DUES_SNAPSHOT · AUDIT_LOG ·
USERS_LIST · CONSISTENCY`.

Each entry MUST declare:

| Field | Meaning |
|---|---|
| `id` | stable identifier (the only handle callers use) |
| `title` | `{ar,en}` display title |
| `icon` | Tabler icon name |
| `category` | `statement` \| `report` \| `list` \| `voucher` |
| `orientation` | `portrait` \| `landscape` |
| `defaultColumns` | ordered column keys for the main table |
| `outputs` | the report's Output Capability set (see §2.6) |
| `permission` | `print` (admin\|accountant) \| `export` (admin) |

Adding a new report = **adding a registry entry**, never a new bespoke function.

### 2.6 Output Capability Matrix (owner amendment — 2026-07-27)

A report does **not** decide per-surface, ad-hoc, which outputs it has. Its registry
entry declares an `outputs` set drawn from `{ screen, print, pdf, excel, csv }`, and the
**system builds the output controls automatically** from that set:

```
Report.outputButtons("FUND_STATEMENT", ctx)   // → Print / PDF / Excel / CSV buttons
```

**Rules (frozen):**
1. No developer ever hand-writes `<button>Print</button>` (or PDF/Excel/CSV) again — the
   engine emits them from `outputs`, with the frozen icons/labels/order of §4.6.
2. Buttons are permission-gated by the entry's `permission` (via `can.print()` /
   `can.export()`); a report the user may not output shows no buttons.
3. Every page's output affordance is therefore identical by construction — resolving the
   Phase-8 inconsistencies and the missing-output gaps found in OUTPUT-001.

> §2.5–§2.6 extend Principle §2 and are themselves constitutional: they change only by a
> further recorded owner amendment. Implemented in R0 (`public/js/report-engine.js`:
> `ReportRegistry`, `Report.render`, `Report.outputButtons`).

---

## 3 · IMMUTABLE PRINCIPLE — Unified Document Structure

Every report is composed from this ordered component set. Optional parts are marked;
everything else is mandatory and appears in this order.

| # | Component | Mandatory | Source in ReportModel |
|---|-----------|-----------|------------------------|
| 1 | **Report Header** (brand + title) | ✅ | `meta.org`, `meta.title`, `meta.subtitle` |
| 2 | **Metadata** (date, doc no., period, party) | ✅ | `meta.*` |
| 3 | **KPI Summary** (cards) | optional | `summary: KpiCard[]` |
| 4 | **Applied Filters** (what the data is scoped to) | ✅ when filtered | `meta.filters` |
| 5 | **Main Table(s)** | ✅ (or KeyValue/AmountBox for vouchers) | `sections[]` |
| 6 | **Totals** | ✅ when the table has money columns | `Table.totals` |
| 7 | **Notes** | optional | `Section.footnotes` / `Note` section |
| 8 | **Signatures** | when required (vouchers, official docs) | `meta.signatures` |
| 9 | **Footer** (brand line, printed-at) | ✅ | `meta.org`, printed date |
| 10 | **Page Numbering** | ✅ (print/PDF) | engine-provided running footer |
| 11 | **QR Code** | ✅ on official docs | `meta.verifyToken` / `meta.qrUrl` |

**Rule (frozen):** a report is defined by *which* components it enables and *what data*
it feeds them — never by custom markup. The Layout Engine renders the components; the
report only supplies the model.

---

## 4 · IMMUTABLE PRINCIPLE — Visual Identity (Design Tokens)

One frozen token set is the sole source of appearance for **all** media. Values below
are the canonical starting set (derived from the current `PRINT_TOKENS` + `.acct-stmt`
so migration preserves the accepted look). Tokens — not per-report CSS — define design.

### 4.1 Typography
- **Arabic / UI / body:** `IBM Plex Sans Arabic` (weights 400/500/600/700).
- **Numerals / tabular / mono:** `IBM Plex Mono` (`font-variant-numeric: tabular-nums`, `direction: ltr; unicode-bidi: isolate` for numbers).
- **Self-hosted** (no CDN dependency for print or app).

### 4.2 Color
| Token | Value | Use |
|---|---|---|
| `--ink` | `#17202E` | primary text, rules |
| `--ink2` | `#57606E` | secondary text, table headers |
| `--muted` | `#7C8494` | labels, meta |
| `--faint` | `#AEB6C4` | de-emphasis, watermark caption |
| `--line` | `#E5EAF2` | hairline borders / zebra |
| `--line2` | `#C9D2E0` | stronger borders |
| `--hd` | `#F2F5FA` | table header background |
| `--accent` (navy) | `#0F1B33` | structural accent (never decorative) |
| `--pos` | `#2F6B47` | credit / positive |
| `--neg` | `#B4552E` | debit / negative |

### 4.3 Spacing scale
`4 · 6 · 8 · 11 · 14 · 16 · 22 · 30` px — components use scale steps only (no ad-hoc margins).

### 4.4 Table sizing
- Header cell: 10.5px / 600 / `--hd` bg / bottom border `--line2`.
- Body cell: 11px / padding `9px 10px` / bottom border `--line`.
- Totals / final row: 12px / 700–800 / top border `--accent`.
- Numeric columns: mono, tabular, right-aligned (RTL-aware).

### 4.5 Page / header / footer / margins
- **Page:** A4. Portrait = vouchers + member statement; landscape = fund statements + multi-column reports.
- **Margins:** single source — `@page` only (no body padding double-inset; PRINT-001 ROOT-8).
- **Header band:** brand (name + subtitle + logo chip) + rule; title chip centered; meta line.
- **Footer band:** brand line + printed-at + page number (engine-generated).

### 4.6 Output icons (frozen)
| Action | Icon |
|---|---|
| Print | `ti-printer` |
| PDF | `ti-file-type-pdf` |
| Excel | `ti-file-spreadsheet` |
| CSV | `ti-file-text` |
| (share, if ever added) | `ti-share` |

**Rule (frozen):** every output control uses the same icon, label, and order on every page (§7, resolves OUTPUT-001 Phase-8 gaps).

---

## 5 · Target Reports (migration inventory + priority)

All output surfaces to move onto the engine, ranked. **Priority 1 = the pilot that
proves the architecture.**

| Prio | Report | Current source | Type | Orientation |
|---|---|---|---|---|
| **1** | **Member Financial Statement** (كشف الحساب المالي للأعضاء) | `print.js prtMemberStmt` + `app.js exportMemberStmt` | Table + KPI + carried band + donations | Portrait |
| 2 | Fund Statement — Food / Diwan (كشف الصندوق) | `print.js buildFundStatementHTML` | Table + KPI + food figures | Landscape |
| 3 | Annual Debt Report (تقرير المديونية السنوية) | `reports.js prtAnnualDebt` | Wide table + totals | Landscape |
| 4 | Delinquent Members (تقرير الأعضاء المتأخرين) | `reports.js prtDelinquent` | Dynamic-year table | Landscape |
| 5 | Donations Register (سجل التبرعات) | `reports.js prtDonStmt` | Table + KPI (cash/in-kind split) | Landscape |
| 6 | Members List (قائمة الأعضاء) | `print.js prtMembersList` | Table | Portrait |
| 7 | Annual Subscriptions Log (سجل الاشتراكات) | `print.js prtAnnual` | Table | Portrait |
| 8 | Receipt Voucher (سند قبض) | `print.js buildRecVoucher` | KeyValue + AmountBox + QR + signature | Portrait |
| 9 | Payment Voucher (سند صرف) | `print.js buildPayVoucher` | KeyValue + AmountBox + QR + signature | Portrait |
| 10 | Internal Transfer Voucher (سند تحويل داخلي) | `app.js prtTransfer` | KeyValue + QR | Portrait |
| 11 | Treasury Position (المركز المالي) | `treasury-workspace.js buildPositionBody` | KPI + tables | Landscape |
| 12 | Dues Workspace snapshot (اشتراكات السنة) | `dues-workspace.js buildDuesBody` | KPI + tables | Landscape |
| 13 | Audit Log (سجل العمليات) | `app.js exportPagePDF('audit')` | Table (+ add Print, OUTPUT-001 gap) | Landscape |
| 14 | Users (المستخدمون) | `app.js exportPagePDF('users')` | Table (+ add Print) | Portrait |
| 15 | Consistency / Reconcile (تقرير المطابقة) | `reports.js reconcileReport` | Table | Portrait |

> **Pilot rationale (owner-endorsed):** the **Member Financial Statement** is the most
> complex surface (carried-balance band, KPI cards, subscription/payment table with
> running balance + Dr/Cr tags, an independent donations table, RTL, multi-page). If the
> engine renders it correctly across all four media, the architecture is proven for the rest.

---

## 6 · Migration Plan (phased — R0…R8)

Same discipline as PRINT-001: each phase is its own PR, additive where possible,
verified before the next. **No legacy engine is removed until its replacement is
complete AND verified (R8 only).** `FIN.*` is never touched.

| Phase | Deliverable | Definition of done |
|---|---|---|
| **R0 · Foundation** | Design-token module (self-hosted fonts) + engine skeleton `Report.render(model, target)`. No surface migrated; not yet wired into production. | Tokens exist; engine no-op renders an empty model in all 4 targets; guards in place. |
| **R1 · ReportModel** | Freeze the `ReportModel` schema (§3) + `buildMemberStatementModel()` projecting `FIN.memberStatementView`. | Model validates; unit test asserts it equals current member-statement values (parity). |
| **R2 · Layout Components** | The ordered component set (§3) as renderer-agnostic layout primitives (Header, Meta, KPI, Filters, Table, Totals, Notes, Signatures, Footer). | Components render from a model in isolation; visual snapshot approved. |
| **R3 · Print Renderer** | Model + components → the `openPrintWin` iframe body. | Member statement prints via the engine, byte-parity of data vs legacy; guards. |
| **R4 · PDF Renderer** | Print renderer + Save-as-PDF, with `meta`→filename/title + running header/footer + real page numbers (the deferred PRINT-001 ROOT-7, done once centrally). | PDF matches print; page numbers correct; owner sign-off on running header. |
| **R5 · Excel Renderer** | `toWorkbook(model)` from column formats (self-hosted SheetJS) + `toCsv(model)`. | Excel + CSV data-match the print/screen; RTL; correct number formats. |
| **R6 · Member Financial Statement** | Cut the live member-statement surface (screen + all outputs) over to the engine; retire its bespoke builders. | All quality gates (§7) pass for the pilot; screen == print == PDF == Excel. |
| **R7 · Voucher & remaining reports** | Migrate fund statements, debt/delinquent/donations, lists, vouchers, transfer, treasury/dues, audit/users, reconcile — each cut over + verified. | Each surface passes §7; output affordances unified (§4.6). |
| **R8 · Legacy Removal** | Remove the old `prt*`/`build*`/`exportPage*`/`exportCSV`/`exportPDF` string-builders and orphaned refs **only after** every surface is on the engine. | No surface depends on legacy; dead-code guards green; docs updated. |

**Ordering note:** R3–R5 build the renderers *against the member statement as their
reference report*; R6 is the formal cut-over of that surface once all three renderers
are proven on it. This reconciles "member statement first" with "renderers before
surfaces."

---

## 7 · Quality Standards (per-report acceptance gates)

A report is not "migrated" until **all** of these pass (mirrors the owner's list):

1. **Cross-medium parity** — screen, print, PDF, and Excel show identical **data** and identical **design** (same numbers, same columns, same totals). Any divergence = architectural failure.
2. **Repeating table headers** — the column `<thead>` repeats on every printed page.
3. **Correct pagination** — real "Page X of Y"; no false/hard-coded page numbers.
4. **Correct totals** — totals equal `FIN.*` and the on-screen figures.
5. **Unified filenames** — deterministic, per-report (`<report>-<scope>-<date>`), across PDF/Excel/CSV.
6. **RTL support** — full right-to-left layout and numeric isolation.
7. **A4 support** — correct size/orientation/margins for the report type.
8. **No critical-row splitting** — a table row, the amount box, the signature block, and the final/totals row never split across pages.
9. **All output buttons work** — Print / PDF / Excel / (CSV where applicable) present, consistent (§4.6), and functional on the page.

**Verification method (per phase):** Playwright print-emulation screenshots (screen +
print), an Excel open-and-parse + value diff, a CSV parse check, and pure-node static
guards locking the model schema, component order, token usage, and output-affordance
placement — exactly the guard style proven in PRINT-001.

---

## 8 · Governance & Non-Goals

- **Constitutional constraints (frozen):** §1–§4 cannot change without a recorded owner
  amendment. §5–§7 may be refined (scope/priority/gate wording) without an amendment,
  provided §1–§4 hold.
- **Non-goals:** no return of html2canvas/jsPDF/html2pdf (PDF = native Save-as-PDF); no
  in-browser backup restore; `FIN.*` untouched; JSON backup stays separate from the
  reporting engine.
- **Definition of done for REPORT-001:** every reachable output on every page is produced
  by `Report.render(model, target)`; the four media are one system by construction; CSV
  is a model by-product; no output depends on a live CDN; legacy builders removed (R8);
  guards prevent regression.

---

*End of frozen specification. No code was written in this phase. Implementation begins
only on explicit owner approval to start R0, one phased PR at a time.*
