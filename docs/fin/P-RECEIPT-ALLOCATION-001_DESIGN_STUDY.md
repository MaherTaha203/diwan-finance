# P-RECEIPT-ALLOCATION-001 — Receipt Allocation Architecture Study (design only, NO CODE)

**Mission.** Design an operator-driven Receipt Allocation capability so that, at the moment a receipt is created, the operator states **exactly** which subscription years / destinations the money pays — removing all guessing — while **every existing balance stays byte-identical** (Golden Reference) and FIN / FD-002 / accounting / treasury / ledger / historical imports are **not modified**.

**Constitutional anchor proven from the code (so the design is grounded, not invented):**
- Receipts are **already classified at creation** (`movement_type`, `destination_treasury`, `fund_type`, `register_category` — `crud.js:143-184`). The system already records *where money goes at the fund level*; what it does **not** yet record is the *per-subscription-year* breakdown.
- An **operator-override precedent already exists and coexists with FD-002**: food donations can be split manually (`manual_allocation` + `manual_debt_settlement` / `manual_historical_donation` / `manual_current_support`), read as authoritative in `fin.js:266-288`. So "operator states the split; the engine does not guess" is an **accepted, shipped pattern** — this feature generalises it to subscription years.
- A per-`(receipt → obligation/year, amount)` attribution store **already exists**: `allocation_records` (`source_ref`, `obligation_kind`, `year`, `amount_allocated` — MODEL2 migration), currently empty. It is the natural home for explicit allocations — **no new table required**.
- Balances depend on **totals + fund routing**, not on per-year attribution: `finalBalance = openingDebt + Σdue − Σpaid − …` (`fin.js:115`). Therefore **any split that sums to the receipt total leaves every total identical** — this is the invariant that guarantees the Golden Reference.

> **The one-sentence architecture:** the explicit allocation is an **authoritative attribution record attached to the receipt**, constrained by `Σ rows = receipt total`; it **replaces FD-002's guess for that receipt only** (exactly as `manual_allocation` already does for donations), changes **no total and no engine math**, and is **never re-derived**.

---

## Section 1 — Does this remove the historical ambiguity? Why?

**It removes the ambiguity completely for every receipt created through the new flow (all future money). It does *not* retroactively change historical imported data or legacy receipts — and it must not, by constitution.**

- **Why it removes future ambiguity:** today a live member payment is a food receipt dropped into the FD-002 pool, which distributes it **oldest-first (a guess)** across years/historical (`fin.js:220-230`, `MODEL2Allocation`). The operator's intent ("this 800 pays 2025, 2026, historical, donation") is **lost at capture and re-guessed at read time**. The new flow **captures intent at source** and stores it as the legal allocation, so nothing is ever guessed or re-derived. Ambiguity exists only where attribution is *inferred*; capturing it at creation eliminates the inference.
- **Why it does *not* touch history:** the imported `paid_amount_ils` snapshot and all pre-existing receipts keep their current behaviour (Section 8). The historical migration ambiguity (documented separately in CONSTITUTIONAL-001) is **out of scope** — this feature governs attribution **going forward**, and deliberately does not reinterpret imported Excel.

So: **total** ambiguity removal for new receipts; **zero** disturbance to history. That boundary is what makes it constitutional.

---

## Section 2 — The Receipt screen: complete new workflow

The existing steps are preserved; the **Allocation Grid** and **Validation** steps are inserted before Save. For member subscription/food receipts the grid is required; for pure single-purpose receipts (e.g. a diwan operational income) the grid auto-fills one row.

```
Create Receipt
  → Member            (or non-member payer)           existing
  → Amount            (positive)                        existing
  → Currency          (ILS/USD/JOD; rate applied)       existing
  → Payment Method    (cash/bank/…)                     existing
  → Reference / Date  (voucher no auto, date)           existing
  → Allocation Grid   ← NEW: operator distributes the amount across destinations
  → Validation        ← NEW: Σ rows must equal amount; all rules pass (Section 4)
  → Save              (disabled until valid)
```

**Field descriptions (new/affected only):**
- **Member** — selects the payer; drives which subscription years + historical deficit are offered as destinations (from `FIN.subscriptionYears()` + the member's outstanding historical balance). Non-member payers → grid limited to Donation.
- **Amount / Currency / Rate** — unchanged; `amount_ils` is the control total the grid must match.
- **Allocation Grid** — the new core (Section 3).
- **Validation banner** — live running total: `Allocated X / Amount Y — remaining Z`; turns green only when `Z = 0` and all rules pass.
- **Save** — routes through the existing `BusinessOps.createVoucher` path; additionally persists the grid rows as the receipt's allocation (attribution), `manual_allocation = true`.

---

## Section 3 — The Allocation Grid

| Destination | Amount |
|---|---|
| 2025 (subscription) | 200 |
| 2026 (subscription) | 200 |
| Historical Deficit | 300 |
| Donation | 100 |
| **Total** | **800 (must equal receipt)** |

**Destination types:** each subscription **year** the member is scheduled for (dynamic, from records — never hard-coded); **Historical Deficit** (the member's pre-2025 carried balance); **Donation** (routes to the donation fund, not a subscription); optionally **Future year** (a year with due already generated) and **Credit / Prepayment** (explicit overpayment parked as member credit).

- **Validation:** `Σ Amount = receipt amount`; per-row `≥ 0`; each subscription year at most once; Historical Deficit at most once; Donation at most once (Section 4).
- **Editing:** rows are added/removed/edited freely **before Save**; the running total updates live. After Save, editing follows the existing voucher-edit + year-lock rules (Section 9).
- **Deletion:** removing a row reduces the allocated total; Save stays disabled until the remainder is re-allocated to reach the receipt amount.
- **Partial payments:** the operator simply allocates less than a year's due to that year (e.g. `2025 = 120` against a `200` due) → that year becomes **partial**; the receipt total still must be fully allocated across the chosen destinations.
- **Overpayments:** money beyond all selected obligations must be placed **explicitly** — either into a **Future year** row or a **Credit / Prepayment** row. The system never silently cascades an overpayment; the operator decides. (This directly answers the surplus problem: no automatic oldest-first spill.)
- **Future years:** allowed as an explicit destination only when that year's dues row exists; otherwise offered as **Credit** to avoid inventing an obligation.

---

## Section 4 — Validation rules (complete)

1. **Balance:** `Σ(all rows) == receipt amount_ils` (exact, to the stored rounding). *Primary rule.*
2. **Non-negative:** every row amount `> 0` (zero-rows are removed, not stored).
3. **No duplicate subscription year:** each year appears at most once.
4. **Historical Deficit at most once.**
5. **Donation at most once.**
6. **No row exceeds the receipt total**, and no single subscription-year row may exceed that year's **due** unless the excess is explicitly moved to a Future/Credit row (a year cannot be "over-paid in place").
7. **Year eligibility:** a subscription-year row is allowed only for a year the member is scheduled for (`due` row exists); Historical Deficit only if the member carries a historical balance.
8. **Closed-period guard:** no allocation row may target a fiscal year `≤ locked_through_year` (mirrors the existing `trg_closed_period` guard — `…ig004…sql`).
9. **Fund coherence:** Donation rows route to a donation destination; subscription/historical rows route to their funds — the grid cannot mix a destination with an incompatible fund.
10. **Cannot save until valid:** the Save action is disabled while any rule fails; the receipt is never persisted in a half-allocated state.

---

## Section 5 — What happens after Save (step by step)

```
Save (valid grid)
  ↓
1. Receipt persisted   — one legal financial document, via BusinessOps.createVoucher
                         (amount, currency, member, method, date, voucher no) — UNCHANGED path.
  ↓
2. Allocation persisted — the grid rows stored as the receipt's authoritative attribution
                         (source_ref = receipt id; rows = {year|historical|donation, amount});
                         receipt.manual_allocation = true. This is the LEGAL allocation.
  ↓
3. Treasury updated     — each row routed to its fund by the EXISTING classification rules
                         (subscription/food → food; historical → historical_deficit;
                         donation → donation). Σ rows = amount ⇒ treasury deltas identical
                         to a single unallocated receipt of the same amount.
  ↓
4. Reports read attribution — for this receipt, per-year "which years paid" comes from the
                         stored allocation (authoritative), NOT from the FD-002 guess.
  ↓
5. Balances             — finalBalance / treasury / ledger totals are unchanged by construction
                         (Section 6 proof). No guessing anywhere.
```

**Key point:** steps 1 and 3 use the **existing** money paths, so totals move exactly as they do today. Step 2 adds **attribution only**. Nothing recomputes a balance from the allocation — the allocation *describes* the money, it does not *create* it.

---

## Section 6 — How every report changes (and what must not)

**Invariant for all of them:** because `Σ allocation rows = receipt amount`, the receipt's contribution to every **total** is identical to today. What changes is only **which year the money is shown against** — the attribution, now explicit instead of guessed.

- **Member Statement** — *Years:* each subscription year shows its due and the **explicitly allocated** paid (no oldest-first reshuffle). *Allocation:* a receipt can show its split lines ("Receipt 812 → 2025 200 · 2026 200 · Historical 300 · Donation 100"). *Historical deficit:* the historical row is reduced by exactly the Historical-Deficit allocation. *Final balance:* **identical** to today for the same total. *Example:* a member paying `2025=200,2026=200` shows both years paid **because the operator said so**, not because the pool happened to reach them.
- **Annual Debt** — allocated years reduce that year's `selPaid` by the allocated amount; the signed `current` balance is **unchanged for the same total** (it is `hist + duesAll − paidAll − resolutions`, and `paidAll` counts the same money). *Example:* after a `2025=200` allocation, 2025's paid column shows 200 and the member's overall balance drops by 200 — same as any 200 payment, but attributed to 2025 deterministically.
- **Delinquent Report** — an overdue year becomes settled/partial **only** if the operator allocated to it; a surplus is **never** auto-applied to a later year. *Example:* paying 2025 only leaves 2026 delinquent even if the member overpaid 2025 into Credit.
- **Dues Workspace** — allocated years show paid/settled per the explicit allocation; per-year `paid` equals the sum of allocations to that year.
- **Dashboard** — no structural change; `unpaidCount` / delinquency reflect the explicit attribution. Totals unchanged.
- **Treasury** — **no change in totals**; each allocation row lands in the same fund the equivalent single receipt would. (Donation portion → donation fund, etc.)
- **General Ledger** — **no change in totals**; the receipt is one document. Optionally the GL can display the allocation as memo sub-lines, but the posted amounts are identical.

---

## Section 7 — Complete worked example

**Member owes:** 2025 = 200, 2026 = 200, Historical Deficit = 500. **Receipt = 900**, allocated `2025=200, 2026=200, Historical=500`.

**After Save:**
- **Member Statement:** 2025 → paid 200 (settled); 2026 → paid 200 (settled); Historical Deficit 500 → reduced by 500 → 0. Ledger shows one receipt (900) with three attribution lines. **Final balance:** was `200+200+500 = 900` owed → now `0`. (Same as any 900 payment; attribution is exact.)
- **Debt Report:** `selSub` years 2025+2026 paid 200+200; `hist` reduced by 500; `current` balance `0`. Same total effect as a 900 payment, no guessing.
- **Delinquent Report:** 2025 ✓, 2026 ✓, no overdue years remain (all explicitly covered).
- **Treasury:** food fund +400 (2025+2026 subscription portion), historical_deficit fund +500 — exactly the routing a 900 receipt split this way produces; grand total +900.
- **Final Balance:** member 0; every treasury/ledger grand total moved by exactly 900. **Byte-identical to what a correctly-attributed 900 payment must produce.**

*(Contrast with today: a 900 food receipt would be pooled and the waterfall would guess oldest-first — possibly settling a year the owner considers unpaid, or spilling surplus. The explicit grid removes that guess.)*

---

## Section 8 — Backward compatibility

- **Old receipts keep working, untouched.** Legacy receipts have `manual_allocation` unset/false → they follow the **existing FD-002 path exactly** (`fin.js:266` already branches `autoRows` vs `manualRows`). The new flow only adds a second, explicit branch for receipts that carry an allocation.
- **Legacy behaviour is identical**, not merely similar: no legacy field changes, no re-computation, no re-attribution of existing money.
- **Migration required? No.** The feature is **forward-only**. Existing `allocation_records` is empty and reused; no historical data is rewritten. (This is the same "empty until used" posture as the MODEL2 tables — `data.js:69-72`.)
- **Historical imported `paid_amount_ils`** is never touched or reinterpreted (constitutional).

---

## Section 9 — Risks (business)

| Risk | Nature | Mitigation (design-level) |
|---|---|---|
| **Incorrect allocation** | operator attributes to the wrong year | live grid + validation; statement shows the split for review; audit trail on the receipt |
| **Operator mistakes / typos** | Σ ≠ intent | Save disabled until `Σ = amount`; per-year due shown inline as a guide |
| **Editing after posting** | attribution changed post-hoc | reuse existing voucher-edit + **year-lock** rules (`trg_closed_period`); edits are versioned/audited; closed years immutable |
| **Receipt cancellation** | money + attribution must both reverse | cancellation reverses the whole receipt **and** its allocation atomically (one document) |
| **Refunds** | partial money returned | refund reduces the receipt's allocation proportionally or per operator choice; reuses FD-009 refund path; totals reconcile |
| **Fiscal-year close** | allocating into a closed year | validation rule 8 forbids it; matches the DB guard |
| **Historical imports** | double-attribution vs the snapshot | explicit allocation governs **receipts only**; imported `paid_amount_ils` is separate and untouched — no overlap |
| **Overpayment mishandling** | surplus silently cascades | design forbids silent cascade; overpayment must go to an explicit Future/Credit row |
| **Reconciliation drift** | allocation total ≠ receipt | the `Σ rows = amount` invariant is enforced at save and re-checkable as a report test |
| **Partial-then-later payment** | a year paid across two receipts | each receipt allocates its own portion; the year's paid = sum of allocations — deterministic, no re-guess |

---

## Section 10 — Architecture verdict

1. **Does this eliminate all ambiguity?** **Yes, for all future receipts** — attribution is captured at source and never re-derived. It does **not** retroactively resolve historical-import ambiguity (out of scope, by constitution).
2. **Does this preserve every current balance?** **Yes, by construction** — `Σ allocation rows = receipt amount`, and all balances derive from totals (`fin.js:115`); attribution changes which year money shows against, never the totals. Legacy receipts are untouched.
3. **Does it remove the need for future allocation guessing?** **Yes** — for explicitly-allocated receipts the FD-002 oldest-first guess is bypassed (the proven `manual_allocation` branch pattern); the operator's stated split is authoritative.
4. **Does it simplify reports?** **Yes** — reports read a stored, authoritative attribution instead of each re-deriving from a pool; the per-year "which years paid" question has one source.
5. **Does it simplify auditing?** **Strongly** — the receipt is the legal document and its allocation lines are the legal record of where the money went; an auditor reads intent directly, no reconstruction.
6. **Does it reduce future bugs?** **Yes** — the entire class of "the waterfall guessed wrong / surplus cascaded into a wrong year" disappears for new receipts; a single `Σ = amount` invariant is trivially testable.
7. **Is it constitutionally cleaner than the current approach?** **Yes** — it captures truth at source rather than inferring it at read time; it preserves FIN/FD-002/totals unchanged; it reuses existing structures (`manual_allocation` branch, `allocation_records`); and it draws a clean line between **money** (unchanged) and **attribution** (now explicit).

**Honest boundary to flag before approval:** to make reports *display* the explicit per-year attribution, one consumer seam must read the stored allocation as authoritative for the "which years" question — precisely as `fin.js:266-288` already reads `manual_allocation` for donations. That seam changes **attribution sourcing only**; it does **not** change any total, the FD-002 math, or historical data. If the strictest reading of "do not touch FIN" is required, the alternative is to have the save-time split create correctly-classified sub-movements so the existing engine reaches the same attribution deterministically — same outcome, different seam. **This is the single decision to confirm at approval.**

---

## Deliverables recap
- **Engineering study** — Sections 1, 5, 8, 10 + the grounded architecture (attribution ≠ money; `Σ = amount` invariant; reuse of `manual_allocation` + `allocation_records`).
- **Business workflow** — Section 2 (end-to-end receipt flow).
- **UI proposal** — Sections 2–3 (fields + Allocation Grid).
- **Report examples** — Sections 6–7 (every report, worked example).
- **Validation rules** — Section 4.
- **Sequence diagrams** — Sections 2 and 5 (flow + post-save).
- **Architecture recommendation** — Section 10 (adopt, forward-only, reuse existing structures; confirm the single consumer-seam decision).

---
**Study only — NO code, NO database changes, NO implementation, NO migration, NO PR. FIN / FD-002 / accounting / treasury / ledger / balances / historical imports untouched. STOP and await approval.**
