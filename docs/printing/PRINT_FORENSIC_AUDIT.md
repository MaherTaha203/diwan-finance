# PRINT-001 — Forensic Audit of the Print & PDF Engine

> **Type:** Read-only forensic engineering audit. **No code was changed, refactored, or committed.**
> **Scope:** The entire print / PDF output subsystem of the Diwan Finance client (`public/`).
> **Method:** Static source analysis of every print entry point, the shared print
> engine, the two CSS `@media print` blocks, the PDF generation pipeline, and the
> DOM that each path actually renders.
> **Author role:** Forensic software engineer — discover true root causes, do **not** fix.
> **Date:** 2026-07-26

---

## 0 · Executive Summary

The reported symptoms (huge white space, random page splitting, tables broken across
pages, headers not repeating, faded text, wasted page width, shifted content, print
preview differing from intent) are **not caused by a single bug**. They are the
compound result of **three independent print architectures coexisting in the same app**,
each with its own design system, its own page model, and its own failure modes:

| # | Path | Trigger | Renders | Design source | Health |
|---|------|---------|---------|---------------|--------|
| **P1** | **Popup window** (`openPrintWin`) | Vouchers, statements, reports | A **freshly written** HTML document in a new `window.open` | `PRINT_TOKENS` (print-only) | Works, but many layout defects |
| **P2** | **html2pdf/html2canvas** (`savePrintPDF`) | "Download PDF" buttons | An **off-screen raster** of a hidden `<div>` | `PRINT_TOKENS` (same string) | Raster pipeline → faded text, split rows |
| **P3** | **Native `window.print()`** | Treasury & Dues workspaces | The **live app DOM** | `app.css @media print` | **Broken — prints a blank page** |

The single most important structural finding: **the on-screen document design
(`.acct-stmt` ledger shell in `app.css`) never reaches any printout.** P1 and P2 build a
completely separate `PRINT_TOKENS` design and never load `app.css`; P3 loads `app.css`
but its `@media print` rule hides the entire body. This is why "print preview differs
from intended layout" — **there is no shared layer between screen and paper.**

Confidence in root causes below ranges from **Confirmed** (provable from source) to
**High** (well-established behaviour of the libraries/CSS involved). No speculative
fixes are proposed; a repair *strategy* (not a patch) is outlined in §10.

---

## Phase 1 — Architecture Discovery

### 1.1 How printing starts (call graph)

```
UI button (onclick)                     Print engine fn            Mechanism
─────────────────────────────────────────────────────────────────────────────
[حفظ وطباعة] saveRec(true) ───────────► prtRec(id) ──────────────► openPrintWin   (P1)
[حفظ وطباعة] savePay(true) ───────────► prtPay(id) ──────────────► openPrintWin   (P1)
[طباعة] (voucher row)      ───────────► prtRec/prtPay ───────────► openPrintWin   (P1)
[طباعة الكشف الشخصي]        ───────────► prtMemberStmt('print') ──► openPrintWin   (P1)
[طباعة] (fund statement)   ───────────► prtStmt(fund) ───────────► openPrintWin   (P1)
[طباعة] (annual debt)      ───────────► prtAnnualDebt() ─────────► openPrintWin   (P1)
[طباعة] (delinquent)       ───────────► prtDelinquent() ─────────► openPrintWin   (P1)
[طباعة] (donations)        ───────────► prtDonStmt() ────────────► openPrintWin   (P1)
[طباعة] (members list)     ───────────► prtMembersList() ────────► openPrintWin   (P1)
[طباعة] (annual log)       ───────────► prtAnnual() ─────────────► openPrintWin   (P1)
[سند تحويل داخلي]           ───────────► (app.js:2358) ───────────► openPrintWin   (P1)
[تقرير المطابقة]            ───────────► (reports.js:338) ────────► openPrintWin   (P1)

[تنزيل PDF] downloadFundStatementPDF ─► savePrintPDF ────────────► html2pdf       (P2)
[تنزيل PDF] prtMemberStmt('pdf') ─────► savePrintPDF ────────────► html2pdf       (P2)
[تنزيل PDF] exportPagePDF(type) ──────► savePrintPDF ────────────► html2pdf       (P2)
[تنزيل PDF] prtAnnualDebt('pdf') ─────► savePrintPDF ────────────► html2pdf       (P2)
[تنزيل PDF] prtDelinquent('pdf') ─────► savePrintPDF ────────────► html2pdf       (P2)

treasury-workspace.printPosition() ──► window.print() ───────────► native         (P3 · BROKEN)
dues-workspace.printView() ──────────► window.print() ───────────► native         (P3 · BROKEN)
```

### 1.2 Which mechanisms are in use

| Mechanism | Present? | Where |
|---|---|---|
| `window.print()` (native, main doc) | **Yes** | `treasury-workspace.js:238`, `dues-workspace.js:379` |
| `window.print()` (inside popup) | Yes | `print.js:120` (auto-fire inside the popup document) |
| New window / popup | **Yes (primary)** | `openPrintWin` `print.js:111-125` (`window.open('','_blank',...)`) |
| iframe | No | — |
| Hidden DOM (off-screen div) | **Yes** | `savePrintPDF` `print.js:134-137` (`position:fixed;left:-10000px`) |
| HTML cloning of live DOM | **No** | Print HTML is **re-built from data**, not cloned |
| Dedicated print template | **Yes** | `PRINT_TOKENS` + per-printer body builders |
| canvas / html2canvas | **Yes** | via `html2pdf.bundle` (`print.js:141,157`) |
| jsPDF | **Yes** | via `html2pdf` (`print.js:142`) |
| pdf-lib | No | — |
| Print CSS only | Partial | `app.css:323`, `app.css:732` (govern **P3** only) |
| Browser-native PDF export | Yes | User's "Save as PDF" in the P1 popup print dialog |

### 1.3 Execution flow (popup path P1)

```
prtX(id)
  └─ can.print() gate  ──► builds body HTML from data (reportHeader + rows + reportDfoot + reportFooter)
       └─ openPrintWin(css, body)
            ├─ html = '<style>' + PRINT_TOKENS + css + '</style>' + body + bootstrap<script>
            ├─ win = window.open('', '_blank', 'width=850,height=950')
            ├─ win.document.write(html); win.document.close()
            └─ [inside popup] window.onload:
                 ├─ render QR codes (data-qr-url)
                 └─ setTimeout(window.print, 900)   ← FIXED 900ms, race with fonts/QR/CDN
```

### 1.4 Execution flow (PDF path P2)

```
savePrintPDF(css, body, filename, orient)
  ├─ toast('جارٍ إنشاء PDF')
  ├─ lazy-load html2pdf.bundle from CDN, then qrcodejs from CDN
  └─ build():
       ├─ host = <div style="position:fixed;left:-10000px;width:210mm|297mm">
       ├─ host.innerHTML = '<style>'+PRINT_TOKENS+css+'</style><div class="pdfroot" style="padding:8mm">'+body+'</div>'
       ├─ document.body.appendChild(host)     ← PRINT_TOKENS leaks into the live document while present
       ├─ render QR (350ms wait)
       └─ html2pdf().set(opt).from(.pdfroot).save()
            opt = { image: jpeg 0.98, html2canvas: scale 2, jsPDF: a4, pagebreak: css+legacy avoid[...] }
```

---

## Phase 2 — Print DOM

**Which DOM is actually printed?** Different DOM per path — this is the core problem.

| Path | DOM printed | Origin |
|---|---|---|
| **P1** | A brand-new document in a separate window | Built string-by-string from **data** (not the screen). `app.css` is **not linked** into this window; only `PRINT_TOKENS` + a small inline `css` string apply. |
| **P2** | An off-screen `<div class="pdfroot">` inside the **live** document | Same `body` string as P1, wrapped in a hidden host. Rasterised by html2canvas. |
| **P3** | The **entire live application** `<body>` | Governed only by `app.css @media print`. |

Hierarchy of the P1/P2 printed body (identical string for both):

```
(document / pdfroot)
├─ reportHeader()            .dh  (brand: date · org name · logo chip)  +  .rule  +  .title  +  .period
├─ [optional] .cards         summary KPI cards (flex row, no wrap)
├─ [optional] .msopen        member carried-balance band
├─ table.dt                  thead (repeats) · tbody (rows) · tfoot/tr.final
├─ [voucher only] .rows      label/value rows  +  .amount  (+ .wm watermark, absolute)
├─ reportDfoot()             .dfoot  (QR box + single signature)
└─ reportFooter()            .pgfoot (brand line · printed date · "صفحة 1")
```

**Critical DOM facts**

- **`reportHeader` is ordinary flow content, not a running header.** It is emitted once at
  the top of the body. On a multi-page report only `table.dt thead` repeats (via
  `display:table-header-group`); the **brand block does not repeat**. → *"headers not
  repeating correctly."*
- **`reportFooter` says `صفحة 1` / `صفحة 1 / 1` hard-coded** (`print.js:248,271,291`;
  `reports.js` footers). There is **no real pagination counter**; a 4-page report still
  prints "page 1". → mis-numbered pages.
- **`#pra` (`index.html:274`) is an empty `<div>` that no JavaScript ever populates**
  (a repo-wide search for `pra` in `public/js` returns zero hits). It exists only to be
  the sole visible element under `app.css:323`. This makes **P3 print a blank page** (see
  Phase 4/8, ROOT-1).

---

## Phase 3 — CSS Audit

Two `@media print` blocks exist, **both in `app.css`, both governing the live document
(P3) only** — neither reaches the P1 popup (which never links `app.css`):

**Block A — `app.css:323`**
```css
@media print{ body>*:not(#pra){display:none !important} #pra{display:block !important;position:fixed;inset:0;background:#fff;z-index:9999} }
#pra{display:none}
```

**Block B — `app.css:732-737`**
```css
@media print{
  .dt,.dt th,.dt td{ border:1px solid #0F1B2D !important; }
  .dt thead th{ background:#eef0f3 !important; color:#0F1B2D !important; -webkit-print-color-adjust:exact;print-color-adjust:exact; }
  .dt tbody tr:nth-child(even){ background:#f6f7f9 !important; -webkit-print-color-adjust:exact;print-color-adjust:exact; }
  .dt td.bal,.dt td.num{ font-variant-numeric:tabular-nums; }
}
```

**The real print CSS is inside `PRINT_TOKENS` (`print.js:42-109`)** — the string injected
into the P1 popup and the P2 raster host. Its print-relevant rules:

```css
@page{size:A4 portrait;margin:0}                                   /* BASE, always present */
@media print{
  body{ -webkit-print-color-adjust:exact; print-color-adjust:exact }
  thead{display:table-header-group}  tfoot{display:table-footer-group}
  tr{page-break-inside:avoid}
  .dfoot,.cards,.amount,table.dt tr.final{page-break-inside:avoid}
  .dh,.rule,.title,.period{page-break-after:avoid}
}
```

### 3.1 Conflicting / problematic rules

| Property | Where | Conflict / consequence |
|---|---|---|
| `@page size` | `PRINT_TOKENS:108` = `A4 portrait margin:0` **vs** every landscape printer prepending `@page{size:A4 landscape;margin:10mm}` (e.g. `reports.js:127,225,294`, `print.js:368`) | Two `@page` rules in one stylesheet. Later wins per-descriptor, so `size` becomes landscape and `margin` becomes 10mm — **but only if the later rule is actually later in the concatenation** (`PRINT_TOKENS + css` → yes). Any printer that passes **empty css** (vouchers, `prtRec`/`prtPay`) keeps `margin:0`. Mixed page models across documents. |
| `@page margin` **+** `body{padding}` | Member statement: `@page margin:9mm` **and** `body{...padding:9mm}` (`print.js:490`) | **Double margin = 18mm** each side → narrow content, wasted width, content visually shifted inward. → *"page width not fully used", "content appears shifted".* |
| `@page margin` (P1) vs `.pdfroot padding` (P2) | P1 honours `@page{margin:10mm}`; P2 (html2canvas) **ignores `@page` entirely** and only sees `.pdfroot{padding:8mm}` (`print.js:136`) | Same document prints with **10mm** margins but its PDF downloads with **8mm** → *"print preview differs from intended layout".* |
| `page-break-inside:avoid` on tall blocks | `.cards`, `.amount`, `.dfoot`, `tr.final` (`PRINT_TOKENS:109`) | When such a block does not fit the remaining space it is pushed whole to the next page, **leaving a large blank gap** on the current page. → *"huge white spaces".* Classic avoid-induced whitespace. |
| `overflow:hidden` on the page box | `.page{...overflow:hidden}` (`print.js:96`) | Establishes a BFC; if voucher content ever exceeds one page it is clipped rather than flowing, and can interact badly with the absolute `.wm`. |
| `position:absolute; inset:0` watermark | `.wm` inside `position:relative .page` (`print.js:106`) | Anchored to `.page` height; if `.page` has no fixed height the watermark stretches to content and, on overflow, can bleed. |
| `transform:rotate(-33deg)` | `.wm span` (`print.js:107`) | Transforms render inconsistently across print engines (fine in Chrome, unreliable in Safari/PDF). |
| No `min-height` / fixed page height | `.page` has none | Voucher height = content height; short vouchers leave the rest of the physical A4 blank (expected), but there is no page frame to anchor the footer to the sheet bottom → footer floats mid-page. |
| `color:var(--faint)=#AEB6C4`, `--muted:#7C8494` | table `.mut`, `.period`, footer | Genuinely light greys; under JPEG raster (P2) or a printer with color-adjust off, they read **faded**. |
| Many cards in one non-wrapping flex row | `prtDonStmt` emits **7** `.card`s in one `.cards{display:flex;gap:12px}` with `.card{flex:1}` and **no `flex-wrap`** (`reports.js:297-304`) | 7 cards crammed on one row → each ~35mm, label text overflow/cramped. → *"inconsistent spacing".* |

### 3.2 Rules that do **not** apply where you'd expect

- `app.css` Block A and Block B **never run for P1/P2** — the popup and the raster host do
  not include `app.css`. So the on-screen `.dt` print polish (Block B) and the on-screen
  ledger shell `.acct-stmt` are absent from every printed page.
- `@page` rules in P2's css string are **inert** — html2canvas rasterises DOM to a bitmap;
  page geometry comes solely from `jsPDF{format:'a4'}` + `.pdfroot` padding + html2pdf's
  own pagebreak logic.

---

## Phase 4 — Table Audit

Printed tables use `table.dt` with `thead`/`tbody`/`tfoot(tr.final)`. Structure is valid
HTML. Behaviour splits sharply by path.

| Question | P1 (popup) | P2 (html2pdf) |
|---|---|---|
| Do rows split across pages? | **No** — `tr{page-break-inside:avoid}` holds each row together (`PRINT_TOKENS:109`) | **Yes, frequently** — html2canvas renders the table to **one tall bitmap**, then html2pdf slices it at fixed pixel offsets. `pagebreak.avoid:['tr']` (`print.js:143`) is only partially honoured by html2canvas and routinely **cuts through a row's pixels**. → *"tables broken across pages".* |
| Does `THEAD` repeat on each page? | **Yes** — `thead{display:table-header-group}` | **No** — a bitmap has no table semantics; the header appears only on the slice that contained it. → *"headers not repeating".* |
| Does `TFOOT` repeat? | Declared `tfoot{display:table-footer-group}` — repeats in engines that honour it | No (bitmap). |
| Is `TBODY` valid? | Yes | Yes (but rasterised). |
| Does any CSS allow breaking rows? | No explicit `break-inside:auto`; the risk is the **inverse** — over-avoidance causing whitespace | html2canvas ignores CSS row-atomicity beyond html2pdf's heuristic. |

**Root of table symptoms:** two different pagination engines. P1 = the browser's native
table paginator (rows atomic, header repeats). P2 = a raster slicer (rows cut, header
once). The same statement therefore paginates **differently when printed vs when saved as
PDF** — a primary source of the "print preview differs" and "tables broken" reports.

---

## Phase 5 — Layout Audit (measurements)

Page geometry per surface (A4 = 210 × 297 mm portrait; 297 × 210 landscape):

| Surface | Path | `@page` size / margin | Extra body/host padding | **Effective usable width** | Notes |
|---|---|---|---|---|---|
| Receipt / Payment voucher | P1 | portrait / **0** (empty css) | `.voucher` 14mm×12mm | ~186 mm | Single inset via voucher padding — OK |
| Fund statement | P1 | landscape / 10mm | none | ~277 mm | OK single margin |
| Member statement | P1 | portrait / **9mm** | **body `padding:9mm`** | **~174 mm** (double-inset) | **18mm each side — wasted width, shifted** |
| Members list / Annual log | P1 | portrait / 10mm | body `padding:0` | ~190 mm | OK |
| Internal transfer voucher | P1 | A4 (portrait default) / 14mm | none | ~182 mm | OK |
| Any statement/report **PDF** | P2 | *ignored* | `.pdfroot` 8mm | ~194 mm (portrait) / ~281 mm (landscape) | **Differs from the same doc's P1 margins** |

**Header/footer heights:** not fixed. `reportHeader` height varies with title/meta lines;
`.dfoot` uses `margin-top:30px` and is `page-break-inside:avoid`; `.pgfoot` uses
`margin-top:24px`. Because none are anchored to the sheet, on a short document the footer
sits directly under the content mid-sheet (large blank below); on a long document the
avoid-block footer can jump to a near-empty final page. → *"huge white spaces".*

**Scaling / zoom / DPR:** P1 inherits the user's browser print scale (default "Fit to page
width" can shrink landscape tables → faded/small). P2 hard-codes `html2canvas{scale:2}`
and `jsPDF{unit:'mm',format:'a4'}` regardless of `devicePixelRatio`; the fixed
mm↔px mapping frequently produces content **slightly wider than the page**, forcing a thin
overflow strip onto a second, nearly-blank page. → *"huge white space" in downloaded PDFs.*

---

## Phase 6 — PDF Generation Pipeline (P2, `savePrintPDF` `print.js:131-162`)

| Stage | Setting | Forensic observation |
|---|---|---|
| Render pipeline | html2pdf → **html2canvas** → **jsPDF** | DOM is **rasterised to a bitmap**, not drawn as vector/text. |
| Page sizing | `jsPDF{unit:'mm',format:'a4',orientation}` | Correct A4, but decoupled from `@page` used by P1. |
| Font embedding | **None** | Text becomes pixels in the canvas; no font is embedded and text is **not selectable/searchable** in the resulting PDF. |
| Image quality | `image:{type:'jpeg',quality:0.98}` | **JPEG for a text document** → chroma subsampling softens hairline rules and thin Arabic glyphs → *"faded text", blurriness.* PNG would be lossless; JPEG is the wrong codec here. |
| Canvas scaling | `html2canvas{scale:2}` fixed | Ignores DPR; combined with mm→px rounding causes width overflow (Phase 5). |
| Compression | JPEG lossy | Same as above. |
| Page insertion / pagination | `pagebreak:{mode:['css','legacy'],avoid:['tr','.card','.amount','tr.final','.dfoot','.cards']}` | html2canvas cannot truly honour `break-inside:avoid` on a single tall canvas; the "legacy" heuristic guesses cut points and **still slices through rows** (Phase 4). |
| Fonts loaded | main document's `--fa` (IBM Plex Sans Arabic) **only if the live page already loaded it** | P1 explicitly loads IBM Plex from CDN in the popup; P2 relies on whatever the live app loaded → possible **font mismatch between print and PDF** of the same document. |
| Timing | QR wait **350ms** (P2) vs **900ms** (P1) | Different fixed waits → QR/render race differs between the two outputs. |
| Side effect | `PRINT_TOKENS` (incl. `*{margin:0;padding:0}` and `body{...}`) injected into the **live** document while the host exists (`print.js:137`) | Momentary global restyle of the running app during PDF generation; removed on `host.remove()`. |

---

## Phase 7 — Browser Compatibility

| Engine | P1 popup | P2 html2pdf | P3 native |
|---|---|---|---|
| **Chrome / Edge (desktop)** | Best case; `table-header-group`, `page-break-inside:avoid`, `@page` all honoured | Works; JPEG fade + row slicing + possible overflow page | Blank (ROOT-1) |
| **Safari (desktop)** | `@page` size/margin support historically weaker; `transform` watermark and `size:landscape` less reliable → layout drift | html2canvas foreignObject quirks; Arabic shaping can degrade | Blank |
| **iOS Safari** | `window.open` + auto-`window.print()` is **frequently blocked / no print dialog**; popups suppressed → nothing prints (toast "allow popups") | Often the only working path on iOS, but memory-heavy raster can fail on large tables | Blank |
| **Android Chrome** | Popup print works via share sheet; scaling varies | Works; large canvas may OOM | Blank |
| **"Save as PDF" from P1 dialog** | Uses the browser's own vector PDF (good text) — **better quality than P2**, but user must choose it manually | — | — |

Key cross-browser fragilities: (1) fixed `setTimeout` before `window.print()` races slow
mobile networks/fonts; (2) popup blockers kill P1 silently on iOS; (3) `@page size`
landscape + `transform` are the least portable CSS used.

---

## Phase 8 — Root Cause Analysis

> Severity: **S1** critical (produces wrong/blank output) · **S2** major (visible defect
> every time) · **S3** minor. Confidence: **Confirmed** (provable from source) ·
> **High** (established library/CSS behaviour).

### ROOT-1 — Native print prints a blank page
- **Observed:** Treasury/Dues workspace "print" produces an empty sheet.
- **Root cause:** `app.css:323` hides every `body` child except `#pra`; `#pra`
  (`index.html:274`) is an **empty div never populated** by any JS, while
  `treasury-workspace.js:238` and `dues-workspace.js:379` call `window.print()` on the main
  document. Everything is hidden, `#pra` is empty → blank.
- **Affected:** `public/css/app.css:323-324`, `public/index.html:274`,
  `public/js/treasury-workspace.js:238`, `public/js/dues-workspace.js:379`.
- **Severity S1 · Confidence Confirmed.**

### ROOT-2 — Screen design never reaches paper (design divergence)
- **Observed:** "Print preview differs from intended layout"; printouts don't look like
  the on-screen `.acct-stmt` ledger.
- **Root cause:** P1 writes a **new document that does not link `app.css`**
  (`print.js:112-123`); it uses only `PRINT_TOKENS`. The screen's `.acct-stmt`/`.dt`
  print polish (`app.css`) is absent. Three design systems (screen `.acct-stmt`, print
  `PRINT_TOKENS`, dead P3 `app.css @media print`) with no shared source of truth.
- **Affected:** `print.js:42-125`, `app.css` (`.acct-stmt`, `732-737`).
- **Severity S2 · Confidence Confirmed.**

### ROOT-3 — Downloaded PDF ≠ printed page (two paginators, two geometries)
- **Observed:** Same statement looks different when printed vs saved as PDF; tables split;
  headers don't repeat in the PDF.
- **Root cause:** P1 uses the browser's native table paginator (honours `@page`,
  `table-header-group`, `page-break-inside:avoid`); P2 (`savePrintPDF`) rasterises via
  html2canvas and slices a bitmap, **ignoring `@page` and table semantics**
  (`print.js:141-144`). Margins also differ (`@page 10mm` vs `.pdfroot 8mm`).
- **Affected:** `print.js:131-162`.
- **Severity S2 · Confidence High.**

### ROOT-4 — Faded / blurry text in PDF
- **Observed:** Faded text, soft rules in downloaded PDFs.
- **Root cause:** `image:{type:'jpeg',quality:0.98}` (`print.js:141`) — **JPEG codec for a
  text document**; lossy chroma subsampling softens thin glyphs/hairlines. Compounded by
  light greys (`--muted #7C8494`, `--faint #AEB6C4`) and no font embedding (text is
  pixels).
- **Affected:** `print.js:42` (tokens), `print.js:141`.
- **Severity S2 · Confidence High.**

### ROOT-5 — Huge white space
- **Observed:** Large blank regions; content pushed to next page.
- **Root cause (two mechanisms):** (a) `page-break-inside:avoid` on tall blocks
  (`.cards`, `.amount`, `.dfoot`, `tr.final` — `PRINT_TOKENS:109`): a block that doesn't
  fit is pushed whole, leaving the remainder blank. (b) P2 mm↔px overflow: fixed
  `scale:2` + `format:'a4'` produces content marginally wider/taller than the page →
  overflow strip on a near-empty extra page.
- **Affected:** `print.js:109`, `print.js:141-142`.
- **Severity S2 · Confidence High.**

### ROOT-6 — Random page splitting / tables broken mid-row
- **Observed:** Pages split at arbitrary points; rows cut in half (esp. in PDFs).
- **Root cause:** In P2, html2canvas cannot honour per-row atomicity on a single tall
  canvas; the legacy pagebreak heuristic slices by pixel offset (`print.js:143`). In P1
  this is largely controlled, so the symptom is **PDF-dominant**.
- **Affected:** `print.js:143`.
- **Severity S2 · Confidence High.**

### ROOT-7 — Brand header not repeating; wrong page numbers
- **Observed:** Brand header only on page 1; every page says "صفحة 1".
- **Root cause:** `reportHeader` is flow content, not a running header; only `table.dt
  thead` repeats. `reportFooter` hard-codes `صفحة 1`/`صفحة 1 / 1` (`print.js:248,271,291`;
  `reports.js` footers) — no pagination counter exists.
- **Affected:** `print.js:205-220,243-249,271,291`, `reports.js:132,230,309`.
- **Severity S2 · Confidence Confirmed.**

### ROOT-8 — Wasted width / shifted content on the member statement
- **Observed:** Member statement narrow, content inset from both edges.
- **Root cause:** **Double margin** — `@page{margin:9mm}` **plus** `body{padding:9mm}`
  (`print.js:490`) = 18mm each side.
- **Affected:** `print.js:490`.
- **Severity S2 · Confidence Confirmed.**

### ROOT-9 — Fixed-timeout race (fonts / QR / CDN)
- **Observed:** Occasional wrong fonts, missing QR, layout reflow between preview and paper;
  worse on mobile/slow networks.
- **Root cause:** P1 fires `window.print()` on a **fixed `setTimeout(...,900)`**
  (`print.js:120`) regardless of whether the CDN web font (`fonts.googleapis.com`) and QR
  script finished; P2 waits a fixed `350ms` (`print.js:151`). Print may occur mid-load →
  fallback-font metrics (FOUT) and blank QR. External CDNs (fonts, qrcodejs, html2pdf) are
  hard dependencies with no offline fallback.
- **Affected:** `print.js:113-120,151-159`.
- **Severity S2 · Confidence High.**

### ROOT-10 — iOS/popup-blocked P1 prints nothing
- **Observed:** On iOS Safari, print buttons do nothing (or only a toast).
- **Root cause:** `window.open('','_blank')` (`print.js:122`) is blocked by popup
  policies on iOS; the code toasts "allow popups" and aborts.
- **Affected:** `print.js:122-124`.
- **Severity S2 (platform) · Confidence High.**

### ROOT-11 — Donation report: 7 KPI cards in one non-wrapping flex row
- **Observed:** Cramped/overlapping summary cards, inconsistent spacing on the donation
  statement.
- **Root cause:** `.cards{display:flex;gap:12px}` + `.card{flex:1}` with **no
  `flex-wrap`**, fed **7** cards (`reports.js:297-304`).
- **Affected:** `print.js:64-68`, `reports.js:297-304`.
- **Severity S3 · Confidence Confirmed.**

### ROOT-12 — Conflicting `@page` base vs per-printer
- **Observed:** Occasional portrait/landscape or margin inconsistency.
- **Root cause:** `PRINT_TOKENS` always ships `@page{size:A4 portrait;margin:0}`
  (`print.js:108`); landscape printers rely on a **second** `@page` in the appended css to
  override it. Correct only because concatenation order puts the override later; printers
  that pass empty css silently keep `margin:0`.
- **Affected:** `print.js:108` + every `@page{size:A4 landscape...}` css string.
- **Severity S3 · Confidence High.**

### ROOT-13 — Dead/duplicated export template
- **Observed:** N/A (latent maintenance risk).
- **Root cause:** `app.js:1972` builds a full member-statement print doc with **different
  fonts** (Cairo/Reem Kufi, not IBM Plex) but line `1976` immediately returns
  `prtMemberStmt('pdf')`, so the block is **dead code**. A second source of truth waiting
  to be re-activated by accident.
- **Affected:** `app.js:1968-1976`.
- **Severity S3 · Confidence Confirmed.**

---

## Phase 9 — Evidence Index

**Print engine (`public/js/print.js`)**
- `PRINT_TOKENS` design string: `42-109` · base `@page`: `108` · print `@media`: `109`
- `openPrintWin` (P1): `111-125` (window.open `122`, fixed print timeout `120`, CDN links `113-114`)
- `savePrintPDF` (P2): `131-162` (off-screen host `134-137`, jpeg/scale/pagebreak `141-143`, QR 350ms `151`)
- `reportHeader`/`reportDfoot`/`reportFooter`: `205-249` (hard-coded "صفحة 1" `248`)
- Vouchers `buildRecVoucher`/`buildPayVoucher`: `252-293` · `prtRec`/`prtPay`: `296-305`
- Fund statement `buildFundStatementHTML`/`prtStmt`/`downloadFundStatementPDF`: `336-398`
- Member statement `prtMemberStmt` (double margin `490`): `399-508`
- `prtMembersList`/`prtAnnual`: `515-546`

**Reports (`public/js/reports.js`)**
- `prtAnnualDebt`: `112-134` · `prtDelinquent`: `218-232` · `prtDonStmt` (7 cards `297-304`): `256-311`
- consistency/reconcile printer: `338-351`

**App (`public/js/app.js`)**
- dead export template (Cairo/Reem Kufi) `1968-1976`
- `exportPagePDF` (P2 dispatcher): `1981-2074`
- internal-transfer voucher print: `2358-2370`
- restricted-print seal `PRINT_FNS`: `2458`

**CSS (`public/css/app.css`)**
- P3 blank-print rule + empty `#pra`: `323-324`
- live-doc `.dt` print polish (P3 only): `732-737`
- (`public/css/phase15.css` contains **no** print rules.)

**Native print (P3)**
- `treasury-workspace.js:238` `printPosition(){ window.print() }`
- `dues-workspace.js:379` `printView(){ window.print() }`

**Markup**
- `index.html:274` `<div id="pra"></div>` (empty) · `1184` `print.js` load · `610/777/799` print buttons

---

## Phase 10 — Deliverable Summary

### Architecture
Three coexisting, non-sharing print stacks (P1 popup / P2 html2pdf raster / P3 native).
No shared design layer between screen and paper.

### Print Pipeline
P1 rebuilds an HTML doc from data and auto-prints on a fixed timer; P2 rasterises an
off-screen div to JPEG-in-PDF; P3 is wired but non-functional.

### CSS Conflicts
Base vs per-printer `@page`; double margins on the member statement; `page-break-inside:avoid`
whitespace; light greys; non-wrapping 7-card row; `app.css` print rules that never reach P1/P2.

### DOM Problems
Empty `#pra` → blank native print; brand header is flow (not running); hard-coded page numbers.

### Pagination Problems
Two different paginators (browser vs raster slicer) give different results for the same doc;
avoid-blocks and mm↔px overflow create blank space.

### Table Problems
P1 keeps rows atomic and repeats `thead`; P2 slices bitmaps → cut rows, header once.

### Browser Problems
iOS popup blocking kills P1; Safari `@page`/`transform` drift; fixed-timeout font/QR race;
hard CDN dependencies.

### Root Causes
ROOT-1…ROOT-13 above (S1: blank native print; S2: design divergence, PDF≠print, fade,
whitespace, split rows, header/pagination, wasted width, timing race, iOS; S3: card row,
`@page` conflict, dead template).

### Risk Assessment
- **S1 (1):** ROOT-1 blank native print — any use of the two workspace print buttons yields no output.
- **S2 (9):** the visible-every-time defects that produce the reported screenshots.
- **S3 (3):** cosmetic/maintenance latent risks.
- Cross-cutting risk: **no single source of print truth** — any fix applied to one path
  will not propagate to the others, so partial fixes will re-diverge.

### Recommended Repair Strategy (strategy only — **no code changed here**)
1. **Unify on one print path.** Prefer P1 (native browser pagination: real table headers,
   vector text, selectable PDF via the OS "Save as PDF"). Treat P2 (html2canvas) as a
   fallback only where a true file download is mandatory, and switch its `image.type` to
   PNG and remove the fixed `scale` overflow assumptions.
2. **Retire or repair P3.** Either populate `#pra` before `window.print()` in the two
   workspaces, or route those buttons through the unified P1 engine. Remove the
   `body>*:not(#pra)` blanket-hide once P3 is decided.
3. **Establish a single print stylesheet** shared by screen and paper (or explicitly derive
   `PRINT_TOKENS` from the same tokens as `.acct-stmt`) so preview == intent.
4. **Fix the page model:** remove double margins (drop `body{padding}` where `@page{margin}`
   already applies); make `@page` per-document authoritative instead of layering over a
   base `portrait/margin:0`.
5. **Real running header/footer + pagination** (CSS running elements or `position:fixed`
   header on `@media print`) to fix repetition and page numbers.
6. **Remove the fixed `setTimeout` race** — gate `window.print()` on `document.fonts.ready`
   and QR completion; provide offline/self-hosted fallbacks for the CDN dependencies.
7. **Re-check `page-break-inside:avoid`** on tall blocks; scope it to genuinely atomic units
   to stop avoid-induced whitespace.
8. **Delete the dead Cairo/Reem-Kufi export template** (`app.js:1968-1976`) to prevent a
   second design source re-entering.

---

*End of forensic audit (as originally delivered). No source files were modified during
the audit itself; the remediation that followed is logged below.*

---

## Remediation Log & Retirement Notice (PRINT-001 · PR-1 … PR-6)

The audit above was remediated in six focused, presentation-only PRs. **This section
is the authoritative record that the legacy print/PDF paths are officially retired.**

| PR | Title | Root causes closed |
|----|-------|--------------------|
| PR-1 | Off-screen iframe renderer, load-gated printing | ROOT-9, ROOT-10 |
| PR-2 | Real printable Treasury & Dues views; remove blank-print target | **ROOT-1** |
| PR-3 | Retire html2canvas/jsPDF raster path → native Save-as-PDF | ROOT-3, ROOT-4, ROOT-6 |
| PR-4 | Page-model corrections (double margin, false page number) | ROOT-7 (page numbers), ROOT-8 |
| PR-5 | Layout polish (wrap KPI card row, avoid-induced whitespace) | ROOT-5, ROOT-11 |
| PR-6 | Print-engine cleanup & dead-code removal | ROOT-13 |

### Officially retired (do NOT reintroduce)
- **The html2canvas / jsPDF raster PDF pipeline.** All PDF output is now the browser's
  native print → "Save as PDF" through the single `openPrintWin` iframe renderer. No
  `html2pdf` / `html2canvas` / `jsPDF` reference remains in `public/js`.
- **The `#pra` in-page print target** and the `@media print` blanket body-hide rule.
  Removed; native `window.print()` of the main document is no longer a print path (only
  a guarded fallback in the two workspaces).
- **The Cairo/Reem-Kufi member-statement `htmlDoc` builder** in `exportMemberStmt`
  (dead — computed then discarded). Removed.
- **Dead amount-in-words helpers** `amountToWords()` and `amountToWordsAr()`, and the
  unused `firstName()` helper. Removed. Vouchers use `amountToWordsEn()`.

### Still open by explicit decision (not defects)
- **Brand header repeating on every page (ROOT-7):** column `<thead>` already repeats
  on the native path; repeating the *brand* block needs `position:fixed` running headers
  — deferred pending owner sign-off (would change every document's layout).
- **ROOT-12 (base `@page` cascade):** deterministic in practice; left untouched to avoid
  voucher-margin regressions.
- **ROOT-2 (screen ⇄ print design convergence):** intentionally out of scope for
  stabilization — it belongs to the next-generation effort **REPORT-001 (Unified
  Financial Reporting Engine)**, not to further incremental patching of this engine.

### Guard tests (pure-node, no browser)
`tests/print-renderer.test.cjs` · `print-native-views.test.cjs` · `print-pdf-native.test.cjs`
· `print-page-model.test.cjs` · `print-layout-polish.test.cjs` · `print-cleanup.test.cjs`
lock in each fix so it cannot silently regress.

> **PRINT Stabilization is complete after PR-6.** No further incremental fixes to the
> legacy engine are planned; the next phase is a clean-slate **REPORT-001**.
