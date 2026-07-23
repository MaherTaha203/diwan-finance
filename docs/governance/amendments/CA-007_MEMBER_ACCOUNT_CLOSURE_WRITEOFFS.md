<!-- Constitutional Amendment — owner-ratified via the OD-07 Constitutional Decision Session.
     Member account closure + write-offs. No code; implementation is V2.0. -->

# CA‑007 · Constitutional Amendment — Member Account Closure & Write‑offs

**Amendment ID:** CA‑007 · **Status:** **RATIFIED & FROZEN** (owner, OD‑07, 2026‑07‑23)
**Depends on:** CA‑006 (credit lifecycle), FOC‑017 (deactivation). **Baseline:** `main` @ `65ca37a`.

---

## 1 · Rules (permanent member departure or death)
1. **Historical financial transactions remain immutable** (Law 5) — never deleted or altered.
2. **Outstanding receivable (debt)** is resolved through a **dedicated Debt Write‑off transaction**; the
   organization's outstanding receivable decreases accordingly.
3. **Outstanding member credit** is resolved through a **dedicated Credit Write‑off transaction**.
4. Member credit **shall not be automatically refunded**, and **shall not remain a perpetual liability**
   after permanent departure.
5. **Closing a member account is always an explicit financial transaction** — **never** a silent deletion or
   alteration of balances. Deactivation of the membership register entry (FOC‑017) is administrative and
   separate from these explicit financial write‑offs.

## 2 · Affected constitutional laws
- **Law 1 (Conservation)** — each write‑off is an explicit, recorded event that resolves a balance to zero
  with a documented counterpart; value is never silently lost or created.
- **Law 5 (Immutable History)** — all prior transactions are preserved; closure adds new records, rewrites none.
- **Law 6 (Traceability)** — the write‑offs are fully audited (who/when/why).
- **Law 3 (Single Source)** — the member's running balance (CA‑006) is resolved only by explicit events.

## 3 · Reconciliation with other decisions
- **OD‑05 (Refund):** a departure credit is **written off, not refunded** — refund remains a receipt‑linked,
  eligibility‑bound movement, not a departure mechanism.
- **OD‑06 (Credit lifecycle):** credit is member‑only and unusable after permanent departure ⇒ resolved by
  Credit Write‑off (not perpetual, not transferable).
- **BO‑09 / FOC‑017 (Deactivation):** administrative register change; the financial write‑offs are the
  explicit money events that accompany a permanent closure.

## 4 · Business Contract (draft) & implementation notes
Two new certified operations: **Debt Write‑off** and **Credit Write‑off**, each an explicit, audited,
atomic transaction (Law 7) that resolves the respective outstanding balance on permanent departure. **No
code in this phase.**

## 5 · Cross references
CA‑006 · ADR‑005/CA‑005 (refund distinct) · FOC‑017 (deactivation) · V2.0‑DIS OD‑07 / E‑06.

## 6 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
