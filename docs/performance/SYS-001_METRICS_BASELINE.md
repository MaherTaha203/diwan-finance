# SYS-001 — Official Measured Performance Baseline

> **Read-only audit.** No production code, accounting, DB, SQL, or architecture was
> modified to produce this document. Every number below is **measured**, not
> estimated. This file is the official engineering baseline against which all future
> performance work (SYS-002+) is compared.

## Measurement contract (environment of record)

| Field | Value |
|---|---|
| Commit | `9bae5c6f7fb77460f8c677f8786ce70a19337991` (main @ R8-c merge) |
| Measurement date (UTC) | 2026-07-27 |
| Browser | Chromium **141.0.7390.37** (Playwright-driven, headless) |
| Node (harness) | v22.22.2 |
| OS | Linux 6.18.5 |
| CPU | Intel Xeon @ 2.80 GHz · 4 cores |
| RAM | 15.7 GB |
| Machine class | Sandboxed remote execution container (shared cloud CPU) |

### Measurement boundary (must be read before using any number)

- The harness serves `public/` from a local static server and drives the **real,
  unmodified** application in Chromium.
- **External hosts are stubbed** (Supabase JS + REST, Google Fonts, Tabler icon
  webfont) so nothing blocks on remote latency. Therefore startup numbers reflect the
  **app shell + the first-party module graph**, and **exclude** external network
  latency (auth round-trip, font/icon download, on-demand `xlsx`/`qr`/`jsPDF`).
- Absolute timings are **relative to this shared-CPU container** and will differ on
  an operator's machine. What is portable is the **shape**: ratios between datasets,
  DOM-node counts, byte weights, and request counts. Re-run the harness on target
  hardware to localize the absolute numbers.
- Runs per scenario: **startup = 12**, **render-at-scale = 8 iterations per dataset**.

---

## 1 · Asset inventory (measured, on disk + transferred)

| Asset class | Files | On-disk bytes | Transferred at startup |
|---|---:|---:|---:|
| First-party JS | 47 | 890,505 (869.6 KB) | 904,905 B (with `?v=` query) |
| CSS | 2 (`app.css`, `phase15.css`) | 193,445 (188.9 KB) | 190,860 B |
| `index.html` | 1 | 122,275 B | — |
| **Script resources at startup** | **49** (47 first-party + Supabase CDN + …) | — | — |
| Total requests on first load | — | — | **~57** |

**Largest first-party modules (bytes):**

| File | Bytes | File | Bytes |
|---|---:|---|---:|
| `app.js` | 149,862 | `dues-workspace.js` | 32,009 |
| `i18n.js` | 69,895 | `print.js` | 30,446 |
| `crud.js` | 62,164 | `brand-assets.js` | 28,224 |
| `report-model.js` | 46,951 | `reservations.js` | 24,859 |
| `fin.js` | 44,552 | `member-lifecycle.js` | 22,235 |
| `operations.js` | 42,653 | `payment-workspace.js` | 21,548 |

**On-demand libraries (NOT loaded at startup — injected via `createElement('script')` on first use):**

| Library | Version | Trigger |
|---|---|---|
| `xlsx-js-style` | 1.2.0 | first Excel export (`loadStyledXLSX`) |
| `qrcodejs` | 1.0.0 | first voucher print (QR) |
| `jsPDF` | — | first PDF export |

---

## 2 · Startup / navigation timing (12 cold loads, measured)

| Metric | avg (ms) | min | max | stddev |
|---|---:|---:|---:|---:|
| `domInteractive` | 168.13 | 145.5 | 212.6 | 17.77 |
| `first-paint` | 206.80 | 188.0 | 252.0 | 18.07 |
| `DOMContentLoaded` | 212.39 | 162.7 | 421.7 | 67.58 |
| `load` | 218.20 | 167.7 | 425.9 | 66.97 |

- **DOMContentLoaded ≈ 212 ms** is the headline: it includes parse + execution of all
  **49** deferred scripts (~905 KB) and DOM readiness of the login shell.
- Excluded by the measurement boundary: Supabase auth round-trip, web-font/icon
  download, and the on-demand libraries.
- A `scriptEvalMs` aggregate was collected but is **not reported** — it summed
  `PerformanceResourceTiming.duration` over the intercepted local server and reflects
  route-interception/queue overhead, not execution time. DCL is the authoritative
  startup figure.

---

## 3 · Engine render at scale (real renderer, 8 iterations/dataset, measured)

Path measured: `buildMemberStatementModel(source)` → `Report.render(model, 'screen')`
(the exact production pipeline of the unified Member Statement screen), rendered into
a live DOM node. `buildMs` = model construction; `renderMs` = renderer + `innerHTML`
DOM materialization.

| Dataset | Ledger rows | DOM nodes | HTML bytes | build median (ms) | render median (ms) | render max (ms) |
|---|---:|---:|---:|---:|---:|---:|
| **Small** | 20 | 413 | 13,400 | 0.10 | 1.0 | 2.7 |
| **Medium** | 200 | 3,329 | 107,162 | 0.10 | 5.4 | 6.5 |
| **Large** | 2,000 | 32,489 | 1,049,423 | 2.30 | 179.1 | 215.5 |

**Shape (portable across hardware):**
- Model build is negligible and ~linear (≤ 2.3 ms even at 2,000 rows).
- DOM materialization is the dominant cost and grows **faster than linear**: 10× rows
  (200 → 2,000) ⇒ ~**33×** render time (5.4 → 179 ms) and ~**10×** nodes (3.3 K → 32 K)
  with a single **1.05 MB** `innerHTML` string.
- There is **no virtualization or pagination** in the unified statement table; cost is
  O(rows) in DOM nodes and the whole document is one `innerHTML` assignment.

---

## 4 · Network (startup data path, static-verified)

| Fact | Evidence |
|---|---|
| Startup load = **1 `Promise.all` of ~13 parallel queries** | `data.js:53` (`loadAllData`) |
| Hot tables select **explicit columns** (not `select *`) | `receipts`/`payments` selects, `data.js:54–55` |
| `audit_log` capped at 50 rows, ordered | `data.js:61` (`.order(...).limit(50)`) |
| Separate follow-up query for attachments | `data.js:100` |
| Supabase `.from()` call sites (whole codebase) | 49 sites / 22 distinct tables: `data.js` 15, `operations.js` 10, `crud.js` 8, `app.js` 6, `reservations.js` 5, others 5 |

No N+1 pattern exists on the startup path (single batched round-trip). Live per-request
latency is **not** included (external Supabase stubbed by the measurement boundary).

---

## 5 · Storage & memory residency (static-verified)

| Signal | Value |
|---|---|
| `localStorage` | 10 uses · 3 keys: `diwan_lang`, `diwan_member_count`, `diwan_theme` (UI prefs only) |
| `sessionStorage` / `IndexedDB` / Cache API / Service Worker / Web Worker | **none** |
| Client persistence of the dataset | **none** — the full dataset lives in memory (`window.DB` arrays) and is re-fetched from Supabase on every load |

## 6 · Runtime lifecycle signals (static-verified)

| Signal | Count | Note |
|---|---:|---|
| Inline `onclick` handlers in render strings | 106 | interactivity is baked into `innerHTML` |
| Inline `oninput`/`onchange`/… handlers | 12 | same model |
| `document`/`window` `addEventListener` (one-time) | 20 | global setup |
| Element-level `addEventListener` | 60 | engine screens guarded by `__rptWired`; residual to verify |
| `removeEventListener` | 1 | — |
| `setInterval` | 1 | 1-second clock, `ui-infra.js:107` (`window._clockInterval`) |
| `setTimeout` | 31 | — |
| `requestAnimationFrame` | 6 | — |
| `MutationObserver` | 2 | — |

The inline-handler model means handlers on replaced DOM are garbage-collected with the
old nodes, so full-`innerHTML` re-renders do **not** accumulate listeners (see AUDIT
§ Strengths). The `60` element-level `addEventListener` sites are the residual to
audit for per-render attachment in a future pass.

---

*All figures reproducible via the harness in the SYS-001 PR description. Re-run on
target hardware to localize absolute timings; the ratios and counts are portable.*
