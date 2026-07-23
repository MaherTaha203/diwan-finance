<!-- Constitutional Amendment — owner-ratified via the OD-01 Constitutional Decision Session.
     Amends the MODEL2 payment-allocation model. No code in this phase; implementation is V2.0. -->

# CA‑001 · Constitutional Amendment — MODEL2 Explicit Stored Allocation Order

**Amendment ID:** CA‑001 · **Status:** **RATIFIED & FROZEN** (owner, OD‑01, 2026‑07‑23)
**Amends:** the MODEL2 payment‑allocation model (`ALLOCATION_ORDER`) and the constitutional treatment of
payment allocation. **Supersedes** the prior declared order `2025 → 2026 → historical → future_credit`.
**Depends on:** ADR‑003. **Baseline:** `main` @ `7328ad1`.

---

## 1 · The amended constitutional allocation order
Every member payment created **after activation** is allocated, in this fixed order, and the split is
**stored** as accounting truth:

| Step | Obligation | Meaning |
|---|---|---|
| 1 | **Current‑Year Obligations** | the active fiscal year’s dues |
| 2 | **Historical Debt** | pre‑existing historical/opening balance (the member’s own historical receivable) |
| 3 | **Future‑Year Obligations** | dues generated for years beyond the current year |
| 4 | **Remaining → Member Credit** | any surplus is preserved as the member’s credit |

**Forward‑only:** applies to payments created after activation; **no historical voucher is ever
reallocated**. **Non‑configurable:** this order is constitutional, not a setting.

## 2 · Affected constitutional laws (exactly which, and how)
- **Law 2 (Derivation)** — treasury balances remain derived from movements; *additionally*, the
  per‑obligation allocation is now a **stored** capture‑time fact. Derivation of balances is unchanged.
- **Law 3 (Single Source of Truth)** — the stored allocation is the **single authoritative** record of
  what a payment settled; no parallel/derived duplicate may contradict it.
- **Law 4 (Explicit Classification)** — allocation joins classification as **explicit at capture**
  (the system never guesses which obligation a payment covers).
- **Law 5 (Immutable History)** — protected by forward‑only; past allocations/statements are never rewritten.
- **Law 1 (Conservation)** — step 4 conserves value: nothing is lost; surplus becomes credit.
- **Laws 8 (Custody), 9 (Deficit Bounds), 11 (Locked Period)** — unaffected in principle; the historical‑
  debt step interacts with the member’s personal receivable, not the communal deficit treasury (that
  distinction, FOC‑007/022, is preserved).

*No law is repealed or weakened; the amendment extends the “explicit at capture” doctrine to allocation.*

## 3 · Business Contract amendment (draft)
The Business Operations contract (Part A) for payment/receipt operations is amended to add a
post‑condition: **a payment created after activation records its ordered allocation breakdown**
(obligation → amount) as part of the certified write, subject to atomicity (Law 7). No other operation
contract changes. (Full BO wording is produced at V2.0 implementation; this fixes the contractual intent.)

## 4 · Migration notes
- **Forward‑only:** no back‑fill; pre‑activation payments keep their netted representation. No historical
  data is transformed → **no destructive migration**.
- **Activation:** reversible feature flag; persist per‑payment allocation from activation onward; a
  pre‑activation Supabase snapshot; **full Lab re‑certification** before enabling (V1 Migration Strategy).
- **Reconciliation:** post‑activation member balances must equal the pre‑activation net for identical
  inputs (the amended order changes *which obligation* a payment labels, not the member’s total balance).

## 5 · Compatibility notes
- **Approval Workflow (ADR‑001)** / **Liquidity Guard (ADR‑002)** — sit above the commit boundary;
  allocation sits below; fully compatible.
- **Overpayment→credit (FOC‑022)** — preserved as step 4.
- **Future multi‑user / multi‑company** — a stored allocation is a stronger foundation, not a blocker.

## 6 · Cross references
- **ADR‑003** (the decision record) · **V2.0‑DIS · OD‑01** (source) · **`model2.js:104‑109`** (the
  declared order this supersedes) · **`fin.js:89`** (current netting) · **FOC‑002/003/022/023** (certified
  current behaviour) · **OD‑02 & OD‑03** — **must be re‑read against this amended order** (owner
  instruction): OD‑03’s historical‑voucher question is **already resolved** here (forward‑only); OD‑02’s
  credit step is now constitutionally **step 4 (last within a payment)**, leaving only the *consumption
  trigger* (auto/manual) and *cross‑year* open.

## 7 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
