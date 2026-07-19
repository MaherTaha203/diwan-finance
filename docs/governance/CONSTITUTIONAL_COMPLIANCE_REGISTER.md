<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     This register records the CLOSED state of Phase P0. It is immutable. Future
     phases (P1+) open their own registers; they never re-edit this one. A reopened
     or superseded item is recorded in a new register, preserving this history.
     ═══════════════════════════════════════════════════════════════════════════ -->

# Constitutional Compliance Register — Phase P0

**Document ID:** GOV‑REG‑01
**Version:** 1.0 (frozen)
**Status:** CLOSED · CERTIFIED
**Certified against:** `main` @ `1eca2ce`
**Date:** 2026‑07‑19
**Verdict:** ✅ CONSTITUTION COMPLIANT (see `ACCOUNTING_CONSTITUTION_CERTIFICATE.md`)

---

## Closed register (execution order)

| Item | Title | Law(s) | Enforcement mechanism | Evidence artifact | PR | Status |
|------|-------|--------|-----------------------|-------------------|----|--------|
| **V7** | Constitutional Verification Framework | 1,2,3,9,10 | Node golden master + locked baseline | `tests/constitutional-verification.cjs`, `tests/constitutional-baseline.json` | #86 | ✅ CLOSED |
| **V4** | Identity Uniqueness | 12 | Unique indexes on `receipts.no`/`payments.no` | `tests/constitutional-schema-assertions.sql` | #87 | ✅ CLOSED |
| **V1** | Atomic Receipt Split | 7 (protects 1) | `reclassify_split_atomic` RPC (atomic) | `supabase/migrations/20260719130000_p0_v1_reclassify_split_atomic.sql` | #88 | ✅ CLOSED |
| **V2** | Atomic Member + Subscription | 7 | `create_member_atomic` RPC (atomic) | `supabase/migrations/20260719140000_p0_v2_create_member_atomic.sql` | #89 | ✅ CLOSED |
| **V9** | Runtime Constitutional Guards | 1,3,7,9,10 | Detect→Reject guards on `reclassify_split_atomic` | `supabase/migrations/20260719150000_p0_v9_constitutional_runtime_guards.sql`, `tests/constitutional-runtime-guards.sql` | #90 | ✅ CLOSED |
| **V3** | Single Source of Truth (subscription paid) | 3 | CHECKs `ms_balance_is_derived` + `ms_no_independent_paid_authority` | `supabase/migrations/20260719160000_p0_v3_subscription_single_source.sql`, `tests/constitutional-single-source.sql` | #91 | ✅ CLOSED |
| **V5** | Historical Deficit Bounds | 9 | Read‑time clamp (proven) — closed by constitutional proof | `tests/constitutional-deficit-bound.cjs` | #92 | ✅ CLOSED |
| **V8** | Immutable History / Traceability (cancellation) | 5,6 | Cancellation writes immutable `voucher_versions` snapshot | `public/js/crud.js`, `tests/constitutional-cancellation-history.sql` | #93 | ✅ CLOSED |
| **V6** | Explicit Accounting Classification (ق5 transfer) | 4 | MODEL2 event `q5_debt_settlement_transfer` | `public/js/model2.js`, `public/js/fin2.js`, `tests/constitutional-explicit-q5.cjs`, `tests/constitutional-explicit-q5-integration.sql` | #94 | ✅ CLOSED |

**Open items: 0. Register: 9 / 9 CLOSED.**

---

## Governance decisions (frozen)

- **V3** — annual subscription *paid* has one authoritative origin (`paid_amount_ils`); the
  override mechanism is constitutionally disabled and `balance_ils` is explicitly derived.
- **V5** — a settlement reduces the remaining deficit toward zero only, never a surplus;
  closed by constitutional proof because no settlement‑creation operation exists. If one
  is introduced later, an operation‑level Detect→Reject guard is added **then**, with no
  server‑side aggregate re‑derivation.
- **V6** — the ق5 transfer is an explicit first‑class event; its amount remains a
  single‑source derivation (Item‑9), only its accounting identity became explicit.

---

## Certified baseline

The commit `1eca2ce` on `main` is hereby declared the **first constitutionally‑certified
accounting baseline** of Diwan Al‑Taha Finance. All subsequent phases (P1+) are built on
this baseline and measured against the golden master and the constitutional guards. Any
future change is evaluated against this frozen standard; the standard is not adjusted to
fit the change.

---

*Frozen governance artifact. Phase P0 is administratively closed. P1 begins on this
baseline — not before.*
