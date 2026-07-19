<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     This certificate is immutable. It is never re-edited in place. A future
     re-certification issues a NEW certificate document; this one is retained as a
     historical record. The chain of certificates is the audit trail.
     ═══════════════════════════════════════════════════════════════════════════ -->

# 🏛️ Accounting Constitution — Compliance Certificate

**Document ID:** GOV‑CERT‑01
**Version:** 1.0 (frozen)
**System:** Diwan Al‑Taha Finance
**Project:** `ralifvemgapmsgrjgazh`
**Certified against:** `main` @ `1eca2ce`
**Date:** 2026‑07‑19
**Verdict:** ✅ **CONSTITUTION COMPLIANT**

---

## 1 · Executive Summary
Phase P0 — Constitutional Compliance is complete. All nine register items (V1–V9) are
implemented, merged, and independently re‑verified for this certification against the
frozen golden baseline, the live production schema, and the end‑to‑end acceptance
suite. The golden baseline is **unchanged**, runtime constitutional guards are **active
and rejecting** violations at the database, and **no constitutional violation remains
open**. This certification introduced **zero** code, database, or test changes
(evidence gathered read‑only / via rolled‑back transactions).

**Evidence re‑run for this certificate:** Golden master **12/12** (baseline unchanged) ·
V6 proof **10/10** · V5 proof **35/35** · Acceptance **48/48** (0 page errors) ·
`node --check` clean on the frozen engine · live DB object + integrity + guard‑activity
checks all pass.

## 2 · Closed Constitutional Register
| Item | Title | Objective evidence | Verdict |
|------|-------|--------------------|:------:|
| **V7** | Constitutional Verification Framework | golden master runs, 12/12, baseline locked | **PASS** |
| **V4** | Identity Uniqueness | unique indexes on `receipts.no` & `payments.no`; 0 duplicates live | **PASS** |
| **V1** | Atomic Receipt Split | `reclassify_split_atomic` deployed (atomic RPC) | **PASS** |
| **V2** | Atomic Member + Subscription | `create_member_atomic` deployed (atomic RPC) | **PASS** |
| **V9** | Runtime Constitutional Guards | guard block on function; live split rejected | **PASS** |
| **V3** | Single Source of Truth | `ms_balance_is_derived` + `ms_no_independent_paid_authority` active; permissive `override_chk` removed; 0 divergence live | **PASS** |
| **V5** | Historical Deficit Bounds | adversarial proof 35/35; read‑time clamp proven | **PASS** |
| **V8** | Immutable History / Traceability | cancellation writes `voucher_versions` snapshot; integration 4/4 | **PASS** |
| **V6** | Explicit Accounting Classification | `q5_debt_settlement_transfer` catalogued; proof 10/10; 0 persisted rows | **PASS** |

**Register: 9 / 9 PASS.**

## 3 · Law‑by‑Law Certification
| Law | Name | Objective basis | Verdict |
|----|------|-----------------|:------:|
| 1 | Conservation | golden LAW‑1 (Σ treasuries = openings + Σ movements); V9 conservation guard active | **PASS** |
| 2 | Derivation | golden LAW‑2 (food re‑derivable: raw − ق5 == engine) | **PASS** |
| 3 | Single Source | golden LAW‑3 ×4 (FIN2 == FinContract); V3 constraints active; 0 divergence, 0 override live | **PASS** |
| 4 | Explicit Classification | V6 10/10; `q5_debt_settlement_transfer` explicit; `never_guess:true` | **PASS** |
| 5 | Immutable History | V8 — cancellation appends immutable full snapshot + v1 baseline | **PASS** |
| 6 | Traceability | V8 — snapshot carries who/when/why; `voucher_versions` + audit log | **PASS** |
| 7 | Atomicity | V1/V2 atomic RPCs; V9 RAISE→full rollback (live) | **PASS** |
| 8 | Custody | explicit destination treasuries (`ADMIN_SELECTED`/`FROM_LINKED_ORIGIN`, `never_guess:true`); conservation holds | **PASS** |
| 9 | Historical Deficit Bounds | V5 35/35 + golden LAW‑9 (`remaining ≤ 0`, `overflow ≥ 0`); V9 deficit guard | **PASS** |
| 10 | Split Exactness | golden LAW‑10 (Σ slices == amount); V9 split‑exactness guard active (live reject) | **PASS** |
| 11 | Locked Period Sanctity | `voucherLocked()` guards on create / edit / cancel / reclassify / move | **PASS** |
| 12 | Identity Uniqueness | V4 unique indexes; 0 duplicate active voucher numbers live | **PASS** |

**Laws: 12 / 12 PASS.**

## 4 · Guarantee‑by‑Guarantee Certification
Certified against the guarantees materially enforced in the shipped implementation:

| Guarantee | Enforced by | Verdict |
|-----------|-------------|:------:|
| **§1** — System integrity / conservation | V9 guards + golden LAW‑1 | **PASS** |
| **§3** — Single source of truth | V3 constraints; golden LAW‑3 | **PASS** |
| **§4** — Atomicity (all‑or‑nothing) | V1/V2 RPCs; V9 rollback | **PASS** |
| **§7** — Pre‑commit invariant enforcement | V9 Detect→Reject (live) | **PASS** |
| **§9** — Deficit bound / no surplus | V5 proof; golden LAW‑9 | **PASS** |

**Guarantees: 5 / 5 materialized guarantees PASS.**

## 5 · Engineering Verification
| Check | Result |
|-------|:------:|
| Golden baseline unchanged | **PASS** (12/12, baseline byte‑identical) |
| Real‑schema verification completed | **PASS** (live DB objects + integrity + guard‑activity) |
| Runtime guards active | **PASS** (V9 split + V3 balance + V3 override all rejected live) |
| Regression suite passing | **PASS** (golden 12/12 · V5 35/35 · V6 10/10) |
| Integration suite passing | **PASS** (acceptance 48/48, 0 page errors; real‑schema BEGIN…ROLLBACK) |
| No constitutional violations open | **PASS** (9/9 register items merged & closed) |

## 6 · Final Verdict

# ✅ CONSTITUTION COMPLIANT

---

*Frozen governance artifact. This is the first constitutionally‑certified accounting
baseline of Diwan Al‑Taha Finance. Superseded only by a new certificate; never edited
in place.*
