# MODEL2 Engineering Readiness Certificate

> **CERTIFIED — MODEL2 is ready for engineering implementation (V2.0).**

**Issued:** 2026‑07‑23 · **Baseline:** `main` @ `65ca37a` · **Depends on:** MODEL2 Constitutional Readiness
Certificate.

## This certificate attests that the implementation inputs are complete and unambiguous
1. **Every behaviour is defined** — allocation, credit consumption, ordering/determinism, BO‑06 settlement,
   refund, running balance/credit lifecycle, and member‑closure write‑offs (CA‑001…CA‑007).
2. **No unresolved business question remains** (7/7 decisions frozen; global review PASS).
3. **The build is bounded & reversible:**
   - **Forward‑only** activation — no historical voucher reallocated (CA‑001/003).
   - **Reversible feature flag**, **pre‑migration Supabase snapshot**, **full Constitutional Laboratory
     re‑certification** required before enabling (V1 Migration Strategy).
   - **Reconciliation:** post‑activation member balances equal the pre‑activation net for identical inputs
     (the amendments make the netting explicit/recorded; they do not change totals).
4. **Determinism is guaranteed** — ordering never depends on database/query order (CA‑003).
5. **Compatibility confirmed** — Approval Workflow (ADR‑001) & Liquidity Guard (ADR‑002) sit above the commit
   boundary; MODEL2 allocation sits below.

## Implementation scope handed to V2.0 (STR‑001 F‑05 → F‑08)
- Activate the allocation engine to the **CA‑001** order; persist per‑payment & per‑credit‑consumption
  allocation records; update `model2.js ALLOCATION_ORDER` to Current→Historical→Future→Credit under CA‑001.
- Implement **BO‑06** (CA‑004), **Refund** (CA‑005), and **Debt/Credit Write‑off** (CA‑007) as certified
  Business Operations.
- Re‑certify the Constitutional Laboratory (including re‑opening **FOC‑012/FOC‑013**).

## Gate
Implementation proceeds under the GOV‑013 pipeline (A→B→C→PASS→certification→regression→merge). Owner
intervention returns only for a **new** constitutional rule, a **business‑policy change**, an **emergency
override**, or a **scenario not covered** by this package.

**Status: ENGINEERING‑READY. V2.0 (MODEL2 Implementation) is authorized to begin.**
