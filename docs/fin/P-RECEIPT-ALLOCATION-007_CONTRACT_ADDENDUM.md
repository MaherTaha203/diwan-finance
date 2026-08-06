# P-RECEIPT-ALLOCATION-007 — Implementation Contract Addendum
### (Closes the last two gaps · reuse existing flow · one canonical reader · one deterministic rule)

Grounding fact (proven, Phase 0): per-year **attribution** is decided in exactly one place today — `FIN.memberAllocation()` (`fin.js:189-241`) — and every status surface consumes it through one accessor, `FIN.memberDelinquency()` (`fin.js:142-176`), which calls `memberAllocation`. No new layer is introduced; the settlement read is a **branch inside the function that already owns attribution**, mirroring the existing `autoRows`/`manualRows` branch (`fin.js:266-267`).

---

## Gap 1 — Runtime Read Rule

**1. The single runtime entry point that reads settlement lines:** **`FIN.memberAllocation(memberId)`**. It is the only function that reads `DB.allocation_records`. It already decides per-obligation attribution; it gains one branch that credits explicit settlement lines instead of pooling that receipt's money.

**2. The canonical reader:** **`FIN.memberAllocation()`** — the sole consumer of `allocation_records`. (`FIN.memberDelinquency()` remains the single *status accessor* downstream, but it reads `memberAllocation`'s output, never `allocation_records`.)

**3. Functions that remain UNCHANGED:**
- `FIN.memberStatement()` — still computes totals/`finalBalance` from receipts; the receipt total flows identically (split-invariant), so it needs no settlement read.
- `MODEL2Allocation` (the FD-002 waterfall) — its math is untouched; it is simply fed **less** pool money (legacy money only).
- `FIN.memberDelinquency()` — same logic, new data (it reads `memberAllocation.perYear`).
- `debtReportRows`, `delinquentRows`, dues workspace, dashboard — unchanged; they consume `memberDelinquency`/`byYear`.
- `FinContract` (treasury) — unchanged (totals derive from receipts).

**4. Reports that indirectly receive the behavior through the canonical reader:**
- **Delinquent · Annual Debt · Dues · Dashboard** — via `memberDelinquency().byYear` ← `memberAllocation`.
- **Member Statement** — receives the correct **total** effect (finalBalance) with no change; if it *displays* the per-line split, it takes it from `memberAllocation`'s returned structure, **never** from `allocation_records`.

**5. Modules that must NEVER read `allocation_records` directly:** everything except `memberAllocation` — specifically `reports.js`, `report-model.js`, `dues-workspace.js`, `app.js` (dashboard), all print/PDF/Excel renderers, `FinContract`/treasury, and `memberStatement`. Exactly one reader.

**6. Exact runtime flow:**
```
Receipt (manual_allocation = true)  +  its lines in allocation_records
        ↓                                        (loaded into DB.allocation_records)
        └───────────────┬────────────────────────┘
                        ▼
          FIN.memberAllocation()      ◄── THE single canonical reader
          (branch: explicit lines credit named obligations directly;
           legacy receipts still flow into the oldest-first pool)
                        ▼  perYear{} attribution (allocated / remaining / settled)
          FIN.memberDelinquency().byYear   ◄── single status accessor (unchanged logic)
                        ▼
   Statement · Annual Debt · Delinquent · Dues · Dashboard
   (all read memberDelinquency/byYear — none reads allocation_records)
```

---

## Gap 2 — Backward Compatibility Rule (deterministic runtime)

**The branch key is per receipt: does this receipt have settlement lines?** A receipt's money is attributed by **exactly one** mechanism — never both.

- **Receipt WITH settlement lines** → `memberAllocation` reads its lines and credits each to its exact obligation: `due/year → perYear[year].allocated`, `historical → histAllocated`, `credit → creditRemaining`, `donation → donation fund`. **This receipt's money never enters the oldest-first pool** (it is excluded from `liveFood` / q4 / overpayment pool inputs).
- **Receipt WITHOUT settlement lines (legacy)** → its money enters the existing pool exactly as today (`liveFood`, q4/`histSeed`, subscription overpayment) and is distributed oldest-first by `MODEL2Allocation`. **Unchanged behavior.**

**Member with both legacy and explicit receipts — deterministic combination (ordered):**
1. Seed each year's need: `remaining_seed = due − paid_amount_ils` (legacy stored; = due for new receipts since `paid_amount_ils` is never written).
2. **Apply explicit lines first** (recorded facts): `perYear[y].allocated += Σ explicit-line amounts for y`; likewise historical/credit.
3. Reduce each obligation by its explicit credit: `residual[y] = max(remaining_seed[y] − explicitAllocated[y], 0)`.
4. **Then distribute the legacy pool** (sum of legacy receipts' money + overpayment + q4) oldest-first over the **residual** only.
No overlap: explicit money is removed from the pool, legacy money fills only what explicit did not cover.

**Attribution determination by case (no ambiguity):**
- **Year with only legacy receipts** → attribution = legacy oldest-first pool (unchanged).
- **Year with only explicit receipts** → attribution = `Σ explicit settlement lines targeting that year`.
- **Year with both** → **deterministic precedence: explicit-recorded before legacy-pool.** `paid(y) = Σ explicit lines to y + pool-allocated(residual y)`. Explicit lines are applied first and removed from the pool; the pool covers only the remainder.

**Why totals stay byte-identical:** every receipt (explicit or legacy) still contributes its **full amount** as a credit in `memberStatement` → `finalBalance` is split-invariant and unchanged. Attribution only decides *which obligation* each shekel settles; because an explicit receipt's shekels are attributed by its lines and simultaneously **excluded** from the pool, no shekel is counted twice and none is lost. `Σ` money in = `Σ` money attributed, exactly as before.

---

## IMPLEMENTATION CONTRACT ADDENDUM

The following becomes part of the implementation specification and governs the runtime read:

1. **One canonical reader.** `FIN.memberAllocation()` is the **sole** reader of `DB.allocation_records`. No other module may read it directly.
2. **Branch, not redesign.** Inside `memberAllocation`, receipts split into **explicit** (has settlement lines) and **legacy** (none) — the same pattern as the existing `autoRows`/`manualRows` branch. The `MODEL2Allocation` waterfall math is unchanged; it receives only legacy pool money.
3. **Per-receipt exclusivity.** A receipt with settlement lines is attributed **only** by those lines and is **excluded** from every pool input (`liveFood`, q4/`histSeed`, overpayment). A receipt without lines is attributed **only** by the legacy pool.
4. **Deterministic precedence.** For any year, `paid = Σ explicit lines to that year + oldest-first pool over the residual`. Explicit before legacy-pool, always; no interpretation, no guessing.
5. **Totals frozen.** `memberStatement.finalBalance`, treasury, and ledger totals are computed from receipt **totals** and are unaffected by attribution; the Golden Reference is preserved by construction (`Σ lines = amount`; explicit money excluded from the pool).
6. **`paid_amount_ils` is never written**; explicit attribution lives **only** in `allocation_records`; the status accessor `memberDelinquency` and all reports consume `memberAllocation`'s output, never `allocation_records`.
7. **No new layer.** No Repository, Resolver, or Materializer; the existing `memberAllocation → memberDelinquency → reports` chain is reused unchanged in shape.

---

## Verdict

# ✅ READY

Both gaps are closed with no ambiguity: **one** canonical reader (`FIN.memberAllocation`), **one** status accessor downstream (`FIN.memberDelinquency`), a strict prohibition on any other module reading `allocation_records`, and a **deterministic** legacy/explicit rule (per-receipt exclusivity + explicit-before-pool precedence) that provably preserves every Golden-Reference total. This addendum is part of the specification. Implementation begins only after your approval, PR-by-PR per Phase 9.

---
**Addendum only — no code, no migration, no table, no PR, no file modified beyond this document. STOP.**
