<!-- Constitutional Amendment — owner-ratified via the OD-04 Constitutional Decision Session.
     Defines BO-06 settlement. No code in this phase; implementation is V2.0. -->

# CA‑004 · Constitutional Amendment — Historical‑Deficit Settlement (BO‑06)

**Amendment ID:** CA‑004 · **Status:** **RATIFIED & FROZEN** (owner, OD‑04, 2026‑07‑23)
**Depends on:** ADR‑004. **Baseline:** `main` @ `6adb118`.

---

## 1 · The rule
- The **Historical Deficit** is an **aggregate** obligation (an opening balance); **no individual
  pre‑system creditors** are maintained or reconstructed by the system.
- A **historical‑deficit settlement** (`historical_deficit_settlement`) is an **outflow funded from the
  Historical Deficit Treasury** that **reduces** the recorded deficit toward zero and **never creates a
  surplus** (Law 9). It is **capped at the remaining deficit**.
- The system records the settlement's **financial effect** (amount, date, actor, deficit effect) and its
  audit trail; **recipient identity / documentation may live outside the system**.

## 2 · Affected constitutional laws
- **Law 9 (Historical Deficit Bounds)** — central: settlement moves the deficit toward zero only; a surplus
  is impossible.
- **Law 8 (Custody)** — settlement draws from the treasury that holds the money (historical‑deficit).
- **Law 1 (Conservation)** — value conserved: the recorded deficit decreases by exactly the settled amount.
- **Law 6 (Traceability)** — the settlement action is fully audited even though the ultimate recipient is external.
- **Law 11 (Locked Period)** — a settlement dated in a closed period is barred (unchanged).

## 3 · Business Contract (draft) & implementation notes
A new certified **BO‑06** captures a settlement: validates authority, amount, the Law‑9 cap (≤ remaining
deficit), classifies `historical_deficit_settlement`, writes atomically (Law 7), and audits. Reporting: the
settlement appears in the deficit/treasury view as an outflow reducing the deficit. **No code in this phase.**

## 4 · Cross references
ADR‑004 · V2.0‑DIS OD‑04 · `model2.js:65` (`historical_deficit_settlement` event) · FOC‑006/007/022 (deficit
inflows/overflow) · FOC‑012 (re‑certifiable after BO‑06) · OD‑07/E‑08 (treasury shortage; Liquidity Guard).

## 5 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
