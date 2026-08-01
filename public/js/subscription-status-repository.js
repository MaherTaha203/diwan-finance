/* ═══════════════════════════════════════════════════════════════════════════
   TRUTH-001 · Subscription Status Repository  —  Phase 1 (INTERFACE ONLY, INERT)
   ---------------------------------------------------------------------------
   The read side of the Canonical Subscription Status model. Its ONLY contract
   is a logic-less keyed lookup of an already-persisted status:

        get(memberId, year) → { status, source, provenance } | null

   It computes nothing, combines nothing, knows nothing about imported-vs-ERP,
   FD-002, or cutoffs (see TRUTH-001_CANONICAL_RESOLVER_RESPONSIBILITY.md). It
   FINDS the truth the write side already decided.

   PHASE 1 SCOPE: the interface exists but returns empty — the backing store
   (current_subscription_status) is not populated until the Status Materializer
   runs (Phase 3) and this Repository is not consumed by any report until the
   flag-gated cutover (Phase 5). Loaded via <script defer>; NO load-time side
   effects; NOTHING calls it yet.

   Reverting Phase 1 = remove the <script> tag and delete this file. Nothing
   depends on it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var SubscriptionStatusRepository = {
    /* Keyed lookup. Phase 1: always empty (store unpopulated / unconsumed).
       Phase 4 wires this to DB.current_subscription_status. */
    get: function (/* memberId, year */) {
      return null;
    }
  };

  if (root) root.SubscriptionStatusRepository = SubscriptionStatusRepository;
  if (typeof module !== 'undefined' && module.exports) module.exports = SubscriptionStatusRepository;
})(typeof window !== 'undefined' ? window : this);
