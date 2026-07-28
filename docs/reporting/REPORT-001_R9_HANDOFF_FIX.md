# REPORT-001 · R9 — Handoff-layer fix: publish `window.FIN` / `window.DB`

> **Production-blocking regression fix.** Member Statement and Fund Statement screens
> rendered blank / "محرك الكشف غير متاح" (Statement engine unavailable). Root-caused to a
> **missing implementation of the original R1 data contract**, not a design change.
> Fix touches **only the handoff layer** — no gatherer, renderer, registry, routing,
> accounting formula, flag or rule was modified.

## Symptom
From the Administrator (and every) account, **all** member statements and fund
statements failed to render — member statement blanked (`#ms-out` empty), fund statement
showed the literal *"Statement engine unavailable / محرك الكشف غير متاح"* (`app.js:948`).
Member-independent: it failed before any member was even selected.

## Root cause — measured, not inferred
The unified report engine's runtime **data gatherers** read the financial singletons off
the global object: `report-model.js` (`typeof root.FIN === 'undefined' … return null`),
`report-cutover*.js` `ready()` (`… && root.FIN && root.FIN.memberStatementView`), and the
`fin-contract.js` facade (`const F = () => window.FIN`).

But `FIN` (`fin.js`) and `DB` (`app.js:4`) are top-level **lexical `const`s** and were
**never assigned to `window`**. So `window.FIN` / `window.DB` were `undefined`, every
gatherer returned `null`, and `ReportCutover.ready()` was **permanently `false`**.

Live diagnostic (seeded admin boot), `ReportCutover.ready()` conjuncts:

| conjunct | value |
|---|---|
| `REPORT_ENGINE_MEMBER_STATEMENT` (flag) | `true` |
| `Report` present | `true` |
| `ReportModels.memberStatement` is fn | `true` |
| **`window.FIN` present** | **`false`** ← failing component |
| `window.FIN.memberStatementView` | `false` |
| *(lexical `FIN` present)* | `true` |

All 13 `REPORT_ENGINE_*` flags were `true`; the registry **did** contain
`MEMBER_STATEMENT` (`report-engine.js:91`; `outputButtons('MEMBER_STATEMENT')` = 623 chars);
renderers were registered. **The engine was healthy — only the FIN/DB handoff was absent.**

## Why it surfaced now (regression history)
The `root.FIN`/`root.DB` gatherer contract dates to **REPORT-001 R1** (`427dfd9`), with the
explicit design comment *"Runtime gatherer (reads FIN/DB globals)"*. Because the contract
line was never written, `ready()` was always `false`, so the **legacy** builders silently
rendered the statements the whole time. When **R8-b / R8-c removed those legacy builders**,
nothing remained to render → blank / "unavailable". `fin2.js:248` publishes the twin line
`window.FIN2 = FIN2`; the matching `window.FIN` / `window.DB` was simply the omission.

**Conclusion: an implementation gap in the handoff layer, not a design change.**

## The fix — handoff layer only
New file **`public/js/report-handoff.js`**, loaded via `<script defer>` immediately after
`app.js` (so both `FIN` and `DB` bindings exist):

```js
if (typeof FIN !== 'undefined' && !window.FIN) window.FIN = FIN;
if (typeof DB  !== 'undefined' && !window.DB)  window.DB  = DB;
```

Publishes the already-existing singletons under the names the engine already expects.
`DB` is mutated in place by `loadAllData`, so publishing the reference once is sufficient.
**No** gatherer / renderer / registry / routing / formula / flag changed. Revert = delete
the file + its `<script>` tag.

## Verification — measured after the fix (loaded via `index.html`, not injected)

**Contract:** `window.FIN` = object, `window.DB` = object, `ReportCutover.ready()` = **true**.

**Surfaces (member + fund):** `Report.render(model, target)` returns `ok:true` for
**screen · print · pdf · excel**; the two statement **screens render** (member 949 chars /
18 ₪ · fund 613 chars / 15 ₪, `unavailable:false`).

**Figure parity (single ReportModel → every surface):**
- Member summary figures {400, 100} present in screen **and** print **and** pdf **and** excel (2/2 each).
- **Cross-surface equality:** member screen == print == pdf → **16 identical figures**
  (incl. 100 / 200 / 400); fund screen == print == pdf → **13 identical figures**
  (incl. 120 / 200 / 320).

**Live page sweep (13 pages):** **zero** pages show "unavailable"; **zero** boot errors.

**Regression gate:**
- Node suite sweep: **64 pass / 2 fail** — the 2 are the pre-existing documented legacy
  fixture-missing suites (`business-operations-slice1`, `constitutional-explicit-q5`,
  `tests/LEGACY_SUITES.md`); **no new failures**. (Browser-only fix cannot affect node suites.)
- Constitutional lab (`node lab/run.cjs`): **90/90 checks · 23/23 certified · exit 0** —
  unchanged from baseline (FOC-001…FOC-025). No accounting code was touched by this
  handoff fix, so FIN certification is unaffected.

## Files
- **new** `public/js/report-handoff.js`
- **edit** `public/index.html` — one `<script defer src="/js/report-handoff.js?v=1.0">` after `app.js`
