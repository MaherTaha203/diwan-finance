/* ═══════════════════════════════════════════════════════════════════════════
   TRUTH-001 · Status Materializer  —  Phase 1 (DEFINED BUT UNCALLED, INERT)
   ---------------------------------------------------------------------------
   The SINGLE WRITER of every per-(member,year) canonical status (see
   TRUTH-001_SINGLE_WRITER_ARCHITECTURE.md). It consumes status-relevant FACTS
   emitted upstream — Historical Imported Truth (adoption), the ERP operational
   result (receipts → FD-002 allocation), dues-generation, year-close — and
   PROJECTS them into current_subscription_status. It contains projection, NOT
   domain computation: FD-002 stays in the Allocation Engine; the Materializer
   only applies the resulting facts in order and persists the outcome.

   PHASE 1 SCOPE: the writer is DEFINED but UNCALLED. Its methods are no-op
   stubs; the real projection + one-time backfill + the additive event hooks
   arrive in Phase 3. Loaded via <script defer>; NO load-time side effects;
   NOTHING calls it yet; it writes nothing.

   Reverting Phase 1 = remove the <script> tag and delete this file. Nothing
   depends on it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var StatusMaterializer = {
    /* Project the canonical status for one (member, year) from upstream facts
       and persist it. Phase 3 implements this; Phase 1 is a no-op stub. */
    materialize: function (/* memberId, year */) {
      return;
    },
    /* One-time backfill over all member-years. Phase 3 implements this. */
    backfill: function () {
      return;
    }
  };

  if (root) root.StatusMaterializer = StatusMaterializer;
  if (typeof module !== 'undefined' && module.exports) module.exports = StatusMaterializer;
})(typeof window !== 'undefined' ? window : this);
