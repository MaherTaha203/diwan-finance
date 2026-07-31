# FIN-RECON-001 — Cross-Report Financial Truth Reconciliation (forensic, read-only)

**Status:** investigation complete · **no code changed** · awaiting owner review before any fix.
**Method:** static trace of the real `fin.js` / `reports.js` / `report-model.js` chain + a read-only reproduction that loads the real `fin.js` and drives it with seeded members (`scratchpad/finrecon-repro.mjs`). All values below are **measured**, not inferred.

---

## A. ROOT CAUSE

The **Annual Debt report** derives its per-year subscription columns — «اشتراكات السنوات المحددة» (`selSub`) and **«مدفوعات السنوات المحددة» (`selPaid`)** — by summing the **raw stored `subscriptions.paid_amount_ils` / `due_amount_ils`** fields (`FIN.debtReportRows`, `public/js/fin.js:577–580`).

But `subscriptions.paid_amount_ils` is a **dormant field that no live payment path ever updates**. Every write sets it to `0`:
- `public/js/crud.js:282` — member creation → `paid_amount_ils:0`
- `public/js/app.js:1244` + `public/js/operations.js:305` — Apply Annual Dues → `paid_amount_ils:0` (comment: *"Obligation-generation only… paid stays 0; balance derived"*)
- **No** `UPDATE … paid_amount_ils` exists anywhere in the codebase.

A member's actual annual-subscription payment is captured as a **food receipt** with `movement_type:'subscription_payment'`, `fund_type:'food'` (`public/js/crud.js:137`). That receipt is money that flows into the **canonical FIN allocation waterfall** (`FIN.memberAllocation` pool, `fin.js:206`), which every other surface reads.

So the Annual Debt report reads a **second, incomplete definition of "paid"** that is only ever non-zero for members whose `paid_amount_ils` was **seeded by a pre-ERP migration/import**. Members who paid through the live app show `selPaid = 0` → **appear unpaid**, even though the money is fully recorded and their balance is settled.

This is precisely the architecture violation the contract forbids: *"No report is allowed to independently reinterpret whether a member paid."* The code's own contract already declares the authoritative source — `fin.js:144–152`: per-year settled status *"derives from the constitutional FD-002 allocation … never from stored subscription rows alone … single accessor (FD-011)."* `debtReportRows` violates that contract.

## B. FIRST DIVERGENCE

Walking the chain for a live-app payer, every step is correct **until** the debt-report column build:

| Step | Value | Correct? |
|---|---|---|
| Receipt (`subscription_payment`, food, member_id, 2026) | 200 | ✅ |
| `memberStatement().finalBalance` | 0 | ✅ |
| `memberAllocation` waterfall (pool→year) | 2026 remaining 0 | ✅ |
| `memberDelinquency().byYear[2026].settled` | `true` (PAID) | ✅ |
| **`debtReportRows` → `selPaid` (Σ `paid_amount_ils`)** | **0** | ❌ **first divergence** |

**Divergence point:** `FIN.debtReportRows`, `public/js/fin.js:579` — `selPaid += Number(s.paid_amount_ils||0)`. It should derive per-year paid from the canonical waterfall (`memberDelinquency().byYear[y].paid`), not from the dormant stored field.

## C. CORRECT vs INCORRECT MEMBER TRACE (measured)

Two seeded members, **identical economic reality**: each owes a 200 ₪ subscription for 2026 and paid it in full during 2026, no historical debt. The **only** difference is how the payment was recorded.

| | **P** (migrated: `paid_amount_ils=200`) | **L** (live app: food `subscription_payment` receipt, row paid=0) |
|---|---|---|
| `finalBalance` (canonical) | **0** | **0** |
| Delinquent report 2026 (`memberDelinquency`) | **PAID ✓** (200/200) | **PAID ✓** (200/200) |
| Dues workspace 2026 (`memberDelinquency`) | settled | settled |
| **Annual Debt `selPaid` 2026** | **200** ✅ | **0** ❌ — *appears unpaid* |
| Annual Debt `current` (final balance) | 0 ✅ | 0 ✅ |

P and L are financially identical, yet the Annual Debt report shows P paid and L unpaid — the exact reported symptom. The final-balance column is correct for both; only the per-year payment breakdown is wrong.

**Constitutional control case C** (owes 2025 **and** 2026, pays one 200 live in 2026): the waterfall correctly settles **2025** first (oldest-first) and leaves 2026 outstanding — `finalBalance=200`, delinquent report shows 2025 PAID / 2026 UNPAID. This is **correct** behaviour and is preserved; the proposed fix does not disturb it.

## D. CANONICAL TRUTH MAP

| Fact | Canonical source | Surfaces that use it | Verdict |
|---|---|---|---|
| Per-year obligation (`due`) | `subscriptions.due_amount_ils` (obligation rows) | all | canonical (writes are obligation-generation) |
| Per-year **paid / remaining / settled** | **`FIN.memberAllocation` → `FIN.memberDelinquency().byYear`** (FD-002 waterfall, single accessor FD-011) | Delinquent report, Dues workspace, Member statement | **CANONICAL** |
| Member final balance | `FIN.memberStatement().finalBalance` | Annual Debt `current`, Member statement, Treasury | canonical (order-invariant) |
| Per-year **paid** in Annual Debt (`selPaid`) | **raw `subscriptions.paid_amount_ils`** | Annual Debt screen/print/PDF/Excel | **LEGACY / non-authoritative — the defect** |

There are **two** competing definitions of "paid toward year Y": the waterfall (authoritative, used everywhere except one report) and the dormant stored field (`selPaid`, used only by the Annual Debt report).

## E. CROSS-REPORT RECONCILIATION MATRIX (member L, 2026 — measured)

| Surface | Source | Shows for L/2026 | Reconciles? |
|---|---|---|---|
| Member Statement | `memberStatement` | balance 0 (paid) | ✅ |
| Delinquent Members | `memberDelinquency.byYear` | PAID ✓ | ✅ |
| Annual Subscription workspace | `memberDelinquency.byYear` | settled | ✅ |
| Receipt history | `DB.receipts` | 200 receipt present | ✅ |
| Treasury | receipts / finalBalance | +200 food | ✅ |
| **Annual Debt — screen** | `debtReportRows.selPaid` | **0 (unpaid)** | ❌ |
| **Annual Debt — print** | same model | **0 (unpaid)** | ❌ |
| **Annual Debt — PDF** | same model | **0 (unpaid)** | ❌ |
| **Annual Debt — Excel** | same model | **0 (unpaid)** | ❌ |

The same financial fact reconciles on **every** surface except the four Annual Debt outputs, which all share the one broken `debtReportRows` model.

## F. BLAST RADIUS

- **Who:** every member whose annual-subscription payments were recorded through the **live app** (as `subscription_payment` food receipts) rather than seeded via migration `paid_amount_ils`. In a live-operated system this is potentially **most/all** members and **all fiscal years** that were billed after go-live.
- **Where:** the Annual Debt report's `selSub` / `selPaid` per-year columns only, on **all four output surfaces** (screen, print, PDF, Excel — single `debtReportRows` model).
- **What is NOT affected:** financial **state** is intact — `finalBalance`, treasury, fund ledgers, the Delinquent report, the Dues workspace, and Member statements are all correct (they derive from the canonical waterfall). The Annual Debt **final-balance column** (`current`) is also correct. No DB/schema/allocation/receipt data is corrupted.
- **Screen only or underlying state?** Presentation/report-derivation only — the `selPaid` column mis-reads; the stored financial truth is correct.

## G. SEVERITY

**SEV-1 — reporting financial misstatement** (not SEV-1 truth corruption).
A core financial report (Annual Debt) misstates whether members paid their annual subscriptions, for potentially all live-paid members, on official printed/PDF/Excel outputs. Mitigating and remediation-bounding fact: the **underlying financial state is uncorrupted** — every canonical figure (balances, treasury, delinquency) is correct — so the fix is confined to the report-derivation layer with **no data migration required**.

## H. PROPOSED MINIMAL ARCHITECTURAL FIX (for approval — NOT implemented)

Route the Annual Debt report's per-year "paid" through the **single canonical accessor**, eliminating the second definition:

- In `FIN.debtReportRows` (`fin.js:577–580`), derive per-year paid from `FIN.memberDelinquency(id).byYear[y].paid` (waterfall) instead of `s.paid_amount_ils`.
  - `selPaid = Σ_over_selected_years byYear[y].paid` (where `byYear[y].paid = due − remaining`, waterfall-derived).
  - `selSub` (obligation/`due`) stays as-is — `due_amount_ils` is the canonical obligation and is written only by obligation-generation.
- This makes `selPaid` reconcile with the Delinquent report and Dues workspace by construction (all three then read the one accessor), and it automatically propagates to screen/print/PDF/Excel because they share the model.

**Why this is aligning-to-authority, not "copying the correct-looking report":** `fin.js:144–152` already declares `memberDelinquency` the single authoritative per-year accessor and explicitly forbids deriving settled status "from stored subscription rows alone." The fix removes the one code path that violates that ratified contract.

**Notes / guardrails:**
- Preserves the oldest-first constitutional allocation (case C) — no allocation rule is touched.
- No double-count: the waterfall caps per-year paid at `due` and treats any stored `paid_amount_ils` as an already-attributed obligation reducer, so a member with both a seeded `paid_amount_ils` and a receipt cannot exceed `due`.
- No DB/schema/data change; no FIN allocation-rule change; presentation-derivation only.
- Optional follow-up (separate decision): retire or formally document `subscriptions.paid_amount_ils` as migration-seed-only, so the dormant field cannot mislead a future report.

## I. REQUIRED REGRESSION TESTS (to accompany the fix)

1. **Live payer, no older debt** — member with 2026 due 200 + a `subscription_payment` food receipt 200; assert Annual Debt `selPaid(2026)=200` and it equals `memberDelinquency.byYear[2026].paid` and the Dues-workspace paid.
2. **Migrated payer unchanged** — member with `paid_amount_ils=200`, no receipt; `selPaid(2026)=200` (no regression).
3. **Oldest-first invariant** — member owes 2025+2026, pays 200 live; assert `selPaid(2025)=200`, `selPaid(2026)=0`, `finalBalance=200` (constitutional behaviour preserved).
4. **Cross-report reconciliation invariant** — for every member/selected-year set: Annual Debt `selPaid` == Σ `memberDelinquency.byYear.paid` == Dues-workspace paid. Add as a `verifyConsistency` check so future drift is caught.
5. **Totals** — Σ `selPaid` over the filtered rows equals Σ waterfall per-year paid (no aggregate drift).
6. **Existing `tests/debt-report-model.test.cjs` case 4** — M1 (no receipts) still yields `selPaid=50`; confirm the fix changes only members carrying unattributed pool credit.
7. **Four-surface parity** — screen/print/PDF/Excel all render the corrected `selPaid` (single model), byte-identical view state.

---

## Architectural success target
One certified per-year truth (`FIN.memberDelinquency.byYear`) consumed by **every** surface — Annual Debt joins the Delinquent report, Dues workspace, and Member statement in reading the single accessor. The Annual Debt report stops independently reinterpreting "paid."

**STOP — awaiting owner decision before any implementation.**
