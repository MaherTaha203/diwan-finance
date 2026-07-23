<!-- Constitutional Amendment — owner-ratified 2026-07-23. Supersedes the IMPLEMENTATION
     INTERPRETATION (not the business intent) of CA-004 regarding Historical-Deficit Settlement.
     Verbatim owner text preserved in §"Owner Ratified Text"; engineering notes follow. -->

# CA‑004 · Revision 1 — Historical Deficit Operational Clarification

**Amendment ID:** CA‑004‑R1 · **Status:** **OWNER RATIFIED & FROZEN** (2026‑07‑23)
**Supersedes:** the *implementation interpretation* of CA‑004 (not its business intent).
**Baseline:** `main` @ `d2fc04a`. **Resolves:** the Slice‑3 STOP
(`V2.0-S3_STOP_DEFICIT_SETTLEMENT_MECHANISM.md`).

---

## 1 · Ruling (owner)
- The Diwan Financial System **SHALL NOT** record payments made to historical creditors. Those payments
  occur **entirely outside** the software.
- Therefore the software **SHALL NOT** implement an internal **Historical Deficit Settlement** transaction,
  treasury outflow, payment voucher, or accounting movement for such external payments.
- The internal concept **Historical Deficit Settlement** is **replaced** by **Historical Deficit Funding**.
- The **Historical Deficit Treasury** becomes an **informational** treasury representing accumulated funds
  available for historical‑deficit resolution.

## 2 · Software responsibility (unchanged business intent)
The software SHALL:
1. Maintain the **Historical Opening Deficit**.
2. **Automatically** allocate eligible payments toward historical member debt per MODEL2 Allocation Rules.
3. **Automatically** transfer those allocated amounts into the **Historical Deficit Treasury**.
4. Maintain the **Historical Deficit Treasury balance**.
5. Provide reports / management visibility for: **Opening Historical Deficit**, **Historical Deficit Treasury
   Balance**, **Total Historical Funding**.

**Historical Funding** is produced automatically by the Allocation Engine — e.g. payment allocated to
historical member debt, a constitutionally‑approved payment surplus, and dedicated historical‑deficit
donations. **No manual funding transaction is required.**

## 3 · This supersedes (precisely)
- CA‑004 §1 sentence "a *historical‑deficit settlement* (`historical_deficit_settlement`) is an **outflow**…
  that **reduces** the recorded deficit … capped at the remaining deficit" — **withdrawn**. There is **no
  settlement outflow** in the system.
- ADR‑004 "BO‑06 becomes a certified **outflow**…" — **withdrawn**. **BO‑06 is cancelled**: there is no
  settlement business‑operation to certify.
- The STOP question (M‑A Neutral vs M‑B Reduce) is **moot** — the outflow it debated does not exist.
- **Unchanged:** the deficit *inflow / funding* side (FOC‑006/007/022, ق4 collections, ق5 debt‑settled
  transfers, directed donations) and Law 9 (a funding contribution reduces the remaining deficit toward zero
  only; excess overflows to Food).

## 4 · Architectural consequence (implemented in V2.0 Slice 3)
- Retire the MODEL2 event `historical_deficit_settlement` (the forbidden internal outflow).
- Replace the read‑side "settlement" accessors with **Historical Funding** accessors; the funding total is the
  amount accumulated into the deficit treasury by allocation (collections + directed donations + ق5 slices).
- Reporting shows Opening Deficit · Treasury Balance · **Total Historical Funding** (no settlement line).
- **FOC‑012** (تسوية عجز تاريخي — صرفٌ للدائنين) is now **permanently Not Applicable** (was EXCLUDED/deferred);
  the settled‑to‑creditors event it described no longer exists in the model.

## 5 · Owner Ratified Text (verbatim)
> The Diwan Financial System SHALL NOT record payments made to historical creditors. Payments to historical
> creditors occur entirely outside the software. Therefore the software SHALL NOT implement an internal
> Historical Deficit Settlement transaction. … The implementation SHALL replace the internal concept
> Historical Deficit Settlement with Historical Deficit Funding. Historical Deficit Treasury becomes an
> informational treasury representing accumulated funds available for historical‑deficit resolution. …
> This amendment introduces no business‑policy change. It only removes an implementation assumption that does
> not exist in the approved operational workflow. **OWNER DECISION: APPROVED** — part of the frozen
> constitutional baseline effective immediately.

## 6 · Status
**FROZEN.** Reopened only by a further explicit constitutional amendment (owner).
