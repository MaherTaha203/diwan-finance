<!-- Constitutional Amendment — owner-ratified via the OD-05 Constitutional Decision Session.
     Defines refund as a first-class movement, distinct from cancellation. No code; implementation is V2.0. -->

# CA‑005 · Constitutional Amendment — Refund as a First‑Class Movement

**Amendment ID:** CA‑005 · **Status:** **RATIFIED & FROZEN** (owner, OD‑05, 2026‑07‑23)
**Depends on:** ADR‑005. **Baseline:** `main` @ `6adb118`.

---

## 1 · The rules
1. **Refund is a first‑class business transaction, recorded as a NEW voucher** (an independent outflow) —
   **it is not a cancellation.**
   - **Cancellation** = void an operation **before its final effects are approved** (preserved void, BO‑03).
   - **Refund** = a new financial movement reflecting **money leaving**, linked to the origin receipt.
2. **Eligibility:** only receipts still **eligible for reversal** with **no irreversible business
   consequences**.
3. **Amount:** **full or partial** (currency‑preserving, Law 10).
4. **Funding:** **always the Origin Treasury** (`FROM_LINKED_ORIGIN`).
5. **Closed period:** refunds are **prohibited after period close**; any needed correction is a **new
   transaction in an open period** and **never** alters or reopens the closed period.

## 2 · Affected constitutional laws
- **Law 1 (Conservation)** — a refund returns exactly the refunded value; nothing created/lost.
- **Law 5 (Immutable History)** — the origin receipt is unchanged; the refund is a **new** record.
- **Law 8 (Custody)** — refund paid from the origin treasury (where the money entered).
- **Law 6 (Traceability)** — the refund is fully audited and linked to its origin.
- **Law 11 (Locked Period)** — **untouched and reinforced**: no post‑close refund; corrections go forward.

## 3 · Business Contract (draft) & implementation notes
A new certified **refund** operation captures an outflow linked to an origin receipt, enforces eligibility
(reversible / no irreversible consequences), supports full/partial, funds from the origin treasury, and
audits atomically (Law 7). The **cancellation** operation (BO‑03) is unchanged and remains the
pre‑finalization void. The concrete "final effects" trigger maps to the eligibility rule (V2.0 BO design).
**No code in this phase.**

## 4 · Cross references
ADR‑005 · V2.0‑DIS OD‑05 · `model2.js:90` (`refund` event, `FROM_LINKED_ORIGIN`, reverses linked receipt) ·
FOC‑019 (cancellation — distinct) · FOC‑013 (refund — re‑certifiable after implementation) · OD‑02
(refund vs auto‑consumed credit) · OD‑07/E‑08 (treasury shortage; Liquidity Guard).

## 5 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
