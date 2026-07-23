<!-- Constitutional Amendment — owner-ratified via the OD-02 Constitutional Decision Session.
     Extends CA-001 (allocation). No code in this phase; implementation is V2.0. -->

# CA‑002 · Constitutional Amendment — Automatic Credit Consumption

**Amendment ID:** CA‑002 · **Status:** **RATIFIED & FROZEN** (owner, OD‑02, 2026‑07‑23)
**Extends:** CA‑001 (MODEL2 explicit stored allocation). **Depends on:** ADR‑003, CA‑001. **Baseline:** `main` @ `7328ad1`.

---

## 1 · The rule
A member **credit** is consumed **automatically, and only, upon the creation of a new legal obligation**
(e.g., annual dues generation, BO‑10). Consumption follows the **CA‑001 constitutional order**:

| Step | Applied to |
|---|---|
| 1 | Current‑Year Obligations |
| 2 | Historical Debt |
| 3 | Future‑Year Obligations |
| 4 | Any remainder **stays Member Credit** |

- **Trigger is exclusive:** automatic consumption **never** occurs outside the creation of a new obligation
  (no arbitrary‑time or recompute‑driven consumption).
- **Permanent record:** every credit consumption generates a **stored allocation record of the same audit
  quality as a payment allocation** (obligation → amount), per Laws 4 & 6.
- **No manual intervention** is required or introduced.

## 2 · Affected constitutional laws
- **Law 1 (Conservation)** — value is preserved: credit either offsets an obligation or remains credit; nothing is lost.
- **Law 2 (Derivation)** — treasury balances remain derived; the credit‑consumption allocation is a stored capture‑time fact.
- **Law 4 (Explicit Classification)** — consumption is an explicit, recorded allocation, never guessed.
- **Law 6 (Traceability)** — each consumption records who/when/why at payment‑grade quality.
- **Law 5 / 11** — unaffected: consumption fires only on forward obligation creation; no history/closed period is altered.

## 3 · Business Contract amendment (draft)
BO‑10 (Apply Annual Dues) and any future obligation‑creating operation gain a post‑condition: **if the member
holds a credit, apply it in the CA‑001 order and record the allocation atomically** (Law 7). No other change.

## 4 · Migration / compatibility notes
- **Forward‑only:** consistent with CA‑001; no back‑fill of past consumptions.
- **Reconciliation:** post‑activation balances equal the pre‑activation net for identical inputs (the amendment
  makes the already‑occurring netting **explicit and recorded**, it does not change totals).
- **Compatible** with ADR‑001/002 (above the commit boundary) and OD‑05 Refund (a refund must account for
  whether a credit was already consumed — cross‑ref for OD‑05).

## 5 · Cross references
CA‑001 · ADR‑003 · V2.0‑DIS OD‑02 · `fin.js:89` (current netting) · FOC‑003/022 (current credit behaviour) ·
OD‑05 (refund‑vs‑consumed‑credit) · OD‑06 (credit lifecycle/expiry — still open).

## 6 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
