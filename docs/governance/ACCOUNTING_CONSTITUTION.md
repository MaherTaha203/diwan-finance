<!-- ═══════════════════════════════════════════════════════════════════════════
     FROZEN GOVERNANCE ARTIFACT — DO NOT EDIT
     This document is immutable. It is never re-edited in place. A future change
     to the constitution is issued as a NEW versioned document alongside this one;
     the historical chain is preserved. Any implementation change is measured
     against this text, not the reverse.
     ═══════════════════════════════════════════════════════════════════════════ -->

# Accounting Constitution — Diwan Al‑Taha Finance

**Document ID:** GOV‑CONST‑01
**Version:** 1.0 (frozen)
**Status:** RATIFIED · FROZEN
**Ratified:** 2026‑07‑19
**Certified baseline:** `main` @ `1eca2ce`
**Governance rule:** immutable — superseded only by a new versioned document, never edited in place.

---

## Core Principle — *Never Guess*

Every accounting movement must have exactly **one explicit accounting identity**. No
accounting effect may exist solely as an interpretation performed while reading. The
system never infers a destination, a classification, or a value it was not explicitly
given or cannot derive from a single authoritative source.

---

## The Twelve Accounting Laws

| # | Law | Statement |
|---|-----|-----------|
| 1 | **Conservation** | Value is neither created nor destroyed. Every treasury position equals its opening plus the signed sum of its cash movements. |
| 2 | **Derivation** | Authoritative balances are re‑derivable from movements alone; a derived value must reconcile exactly to its source. |
| 3 | **Single Source of Truth** | Every accounting quantity has exactly one authoritative origin. Derived values are permitted; independent duplicate truths are forbidden. |
| 4 | **Explicit Classification** | Every movement carries one explicit accounting identity (type + destination + reason). The system never guesses. |
| 5 | **Immutable History** | Every accounting state transition — including cancellation — is preserved as an immutable, full‑snapshot version. History is never rewritten. |
| 6 | **Traceability** | Every transition records who, when, and why, and is reconstructible from the immutable history. |
| 7 | **Atomicity** | A multi‑write accounting operation is all‑or‑nothing. No partial state may reach persistent storage. |
| 8 | **Custody** | Money resides only in the treasury it explicitly entered; a movement may not draw from a treasury the money never reached. |
| 9 | **Historical Deficit Bounds** | A settlement/contribution may reduce the remaining historical deficit toward zero only, never create a surplus; excess overflows to Food. |
| 10 | **Split Exactness** | A split’s parts sum exactly to the whole, in every currency: parent = child + remaining. |
| 11 | **Locked Period Sanctity** | A closed fiscal year is sealed: no create, edit, cancel, reclassify, or move may alter a voucher dated within it. |
| 12 | **Identity Uniqueness** | Every voucher identity (receipt/payment number) is unique; no two active vouchers share an identity. |

---

## Constitutional Guarantees (as materialized in the implementation)

| Guarantee | Meaning |
|-----------|---------|
| **§1** | System integrity / conservation is preserved across every operation. |
| **§3** | Exactly one accounting source of truth per quantity. |
| **§4** | Atomicity — all‑or‑nothing for every multi‑write accounting operation. |
| **§7** | Constitutional invariants are enforced **before commit** (Detect → Reject). |
| **§9** | The historical deficit is bounded — no surplus may form in place. |

---

## Enforcement Doctrine — *Detect → Reject*

Runtime constitutional guards enforce the laws **before commit**. On violation they
abort and roll back the entire operation, returning an explicit constitutional error.
Guards **never** auto‑correct, repair, silently continue, or rewrite an accounting
value. Enforcement lives at the single source (the database) wherever an invariant can
be checked without creating a second derivation.

---

*Frozen governance artifact. See `ACCOUNTING_CONSTITUTION_CERTIFICATE.md` for the
compliance verdict and `CONSTITUTIONAL_COMPLIANCE_REGISTER.md` for the closed register.*
