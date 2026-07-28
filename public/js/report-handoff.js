/* ═══ REPORT-001 — Handoff layer: publish FIN / DB on window ═══════════════════
   THE MISSING R1 CONTRACT WIRING (implementation gap, not a design change).

   From REPORT-001 R1 (427dfd9) the engine's runtime gatherers were DESIGNED to
   read the financial singletons off the global object:

       report-model.js:  «Runtime gatherer (reads FIN/DB globals)»
                          if (typeof root.FIN === 'undefined' …) return null;
       report-cutover.js: ready()  → «… && root.FIN && root.FIN.memberStatementView»
       fin-contract.js:   const F = () => window.FIN;

   But FIN (fin.js) and DB (app.js) are top-level lexical `const`s and were never
   assigned to `window` — the one publish-line was simply never written (fin2.js:248
   DID write the twin line `window.FIN2 = FIN2`; FIN/DB were the omission). While the
   legacy renderers read FIN/DB lexically they masked the gap; once R8-b/R8-c removed
   those legacy builders, ReportCutover.ready() was permanently false → the member &
   fund statement surfaces went blank / "engine unavailable".

   This module ONLY exposes the already-existing singletons under the names the engine
   already expects. It changes NO gatherer, renderer, registry or routing, no accounting
   formula, flag or rule. DB is mutated in place by loadAllData, so publishing the same
   object reference once is sufficient (later data loads are visible through it).

   Loaded via <script defer> AFTER fin.js (FIN) and app.js (DB) so both bindings exist.
   Revert = delete this file + its <script> tag. ─────────────────────────────────── */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  try { if (typeof FIN !== 'undefined' && !window.FIN) window.FIN = FIN; } catch (e) {}
  try { if (typeof DB  !== 'undefined' && !window.DB)  window.DB  = DB;  } catch (e) {}
})();
