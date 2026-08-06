# P-RECEIPT-ALLOCATION — Phase 0 Closure: 12 Proof Questions (read-only)

**Read-only. Nothing modified. No Phase 1 started.** Every answer is proven from the current code / database / schema. Where the system has **no explicit evidence**, that is stated plainly.

---

## 1. Settlement Line Identity — what is the real key?

**Key = Receipt + Obligation**, where an *Obligation* is `(obligation_kind, year)` — `kind='due'` carries a `year`; `kind='historical'` carries no year; `kind='donation'`/`'credit'` carry no year.

**Why:** the money's destination is an obligation, not a fund or a movement. A "year" alone is insufficient (historical/donation/credit have no year); a "fund" is a *consequence* of the obligation, not its identity (two obligations, e.g. 2025 and 2026, share the **food** fund); a "movement" is the receipt itself, one level up.

**Does the current system allow this?** The existing `allocation_records` table already models exactly this shape (verified schema): `source_ref` + `source_kind` (the receipt), `member_id`, `obligation_kind`, `year`, `obligation_id`, `amount_allocated`. It matches the internal obligation identity the engine already uses: `obligations.push({ id:'sub:'+y, kind:'due', year })` and `{ id:'hist', kind:'historical' }` (`fin.js:221-222`). **So the identity is representable today** — with the caveat in Q5 (no uniqueness/FK constraints yet).

## 2. Historical Deficit — how is it actually represented?

It is **primarily a Member Balance**, and it *also* surfaces as an **Obligation** and has a **Fund** — three faces of one thing:
- **Member Balance (the authoritative source):** `members.historical_balance_ils − historical_payments_ils` (`fin.js:42-43`, seeded `fin.js:204`).
- **Obligation (in the waterfall):** `{ id:'hist', kind:'historical' }` (`fin.js:222`).
- **Fund/Treasury:** `destination_treasury='historical_deficit'`, `FIN2.historicalDeficitTreasury()` (`crud.js:161,165`).

**Inside settlement lines it should appear as** `obligation_kind='historical'` (no year), amount = the reduction; it routes to the `historical_deficit` treasury via the existing `historical_debt_collection` movement (`crud.js:160-161`). **Not** a virtual year.

## 3. Future Credit — how is an overpayment represented?

- **A stored field exists:** `members.credit_balance_ils` — but it is **written only at member creation / migration** (`crud.js:274-275,881-882`) and, per proof, **is not consumed by the live balance engine** (`memberStatement` never reads it; `fin.js:33-118`).
- **How credit actually behaves today:** an overpayment flows into `totalPaid`, drives `finalBalance` **negative**, and the engine **derives** the credit as `creditBalance = finalBalance < 0 ? −finalBalance : 0` (`fin.js:115-116`). So **credit is a derived value, not the stored field.**
- **Where stored / how read:** the *money* effect needs no new store — it is derived from the receipt total via `finalBalance`. Only the **attribution** ("this line is prepayment/credit") is not represented today.
- **Do we need something new?** **No new table.** A Future/Credit settlement line is recorded as `obligation_kind='credit'` in `allocation_records` (attribution); the money remains a derived credit via `finalBalance`. *(New attribution rows, not new storage machinery.)*

## 4. Existing `manual_allocation` — precise limits

| Aspect | Finding (proven) |
|---|---|
| **What it is** | A **flag + a 3-way override**, scoped to **food donations only**. `manual_allocation=true` switches a food *donation* from auto-split to the operator's `manual_debt_settlement` / `manual_historical_donation` / `manual_current_support` (`fin.js:266-288`; edit UI `crud.js:703-772`). |
| **What it does** | Lets the operator override how a **food donation** splits across debt-settlement / historical-donation / current-support (Item-9). |
| **What it does NOT do** | It does **not** allocate to **subscription years**; it has **no per-year lines**; it applies only to `fund_type` food **donations**, not to subscription/food payments or historical-deficit collections; it carries **no destination list**. |
| **Why insufficient alone** | It answers "how does this *donation* split among 3 buckets," not "which *years* did this receipt pay." It is a fixed 3-field override, not an N-row settlement grid. It is, however, **precedent** that an operator override coexists with the engine — reusable as the "explicitly settled" flag, not as the settlement itself. |

## 5. `allocation_records` as the Settlement Store — proof, not opinion

**Verified live schema:** `id, source_ref(text), source_kind(text), member_id(uuid), obligation_id(text), obligation_kind(text), year(int), amount_allocated(numeric NOT NULL), allocated_at, immutable(bool NOT NULL), created_at, created_by_uid, created_by, updated_at, updated_by`. Rows = **0**.

- **Has the required fields?** Yes for the core: receipt link (`source_ref`+`source_kind`), member, destination (`obligation_kind`+`year`+`obligation_id`), amount (`amount_allocated`), immutability flag, ownership/audit stamps.
- **What it lacks (must be added to be a *robust* settlement store):**
  1. **No FK** from `source_ref` to `receipts` (it is `text`, not a receipt `uuid` FK) → referential integrity not enforced.
  2. **No UNIQUE** constraint on `(source_ref, obligation_kind, year)` → duplicate lines per obligation not prevented at DB level.
  3. **No CHECK** `amount_allocated > 0`.
  4. **No enum/CHECK** on `obligation_kind` (free text; `due/historical/donation/credit` not constrained).
  5. **No per-line `notes`** column (spec §3 wants Notes).
  6. **No DB-level guarantee** that `Σ lines = receipt amount` (that is inherently application/RPC-level).
- **Verdict:** **usable, not ready as-is.** It is the correct home and requires **no new table**, but it needs **added constraints/columns** (items 1-5) to be a safe settlement store. *(The decision to add them is Phase 2; Phase 0 only proves the gap exists.)*

## 6. Atomic Transaction — how many transactions on Save?

**Proven: today it is NOT one atomic transaction.** `BusinessOps.createVoucher` (`operations.js:93-115`) performs:
1. `SB.from('receipts').insert(row)` — **one** DB statement (its own transaction).
2. `logAction('add', …)` — a **separate** insert, wrapped in `try/catch` (best-effort; can fail silently).

**Treasury and Ledger are NOT written** — they are **derived at read time** from `receipts`/`payments` (`FinContract` / FIN), so there is nothing to write for them.

So the real count today = **two independent writes** (receipt, then audit), **not** a single transaction; there is **no transactional wrapper**. Therefore **receipt + settlement-lines cannot be made atomic on the current path** — guaranteeing "a posted receipt always has complete settlement" requires a **new atomic mechanism** (a single RPC, in the proven style of `create_member_atomic`, `…p0_v2…sql`). **This is a confirmed gap, not a design choice.**

## 7. Cancellation — can the current system reverse settlement lines?

**No — it cannot, because settlement lines do not yet exist in the flow, and cancellation does not touch `allocation_records`.** `cancelVoucher` (`operations.js`) **soft-deletes** the receipt (`is_deleted=true`, `version++`), records a version-history row, and logs audit. Balances then **recompute from source** (FIN rebuilds from non-deleted receipts). It contains **no reference to `allocation_records`**, and those rows are `immutable=true` with admin-only delete. **So reversing settlement lines needs NEW logic** (void the receipt's lines on cancel), or the money-effect disappears with the soft-delete while the attribution rows orphan. **Proven, not designed.**

## 8. Refund — does the current refund know about allocation?

**No. The current refund is allocation-blind.** Verified `refunds` schema has `origin_receipt_id, amount, amount_ils, destination_treasury, fund_type, payment_date` — **no `year`, no `obligation_kind`, no allocation breakdown.** In the engine a refund only **reduces the pool** (`fin.js:218`, `pool − refunded`).

**"Refund part of 2026 only":** the current system **cannot express it** — there is no year/obligation on a refund, so it can only return an amount, after which the oldest-first waterfall **re-guesses** the effect. Targeted per-year/per-line refunds require **new representation** (a refund that references the settlement line it unwinds). **Proven gap.**

## 9. Closed Year — receipt spans 2025/2026/historical/future, only 2025 closed

**Decision: block the LINE, not the whole receipt.** The 2025 settlement line is rejected (V6); the operator removes or redirects it; the receipt still posts for the open destinations (2026, historical, future).

**Reason:** a receipt dated today legitimately settles open obligations; only the line targeting a **closed** year is illegal. Blocking the entire receipt would punish legal lines for one illegal one. **Caveat (proven):** the current enforcement is **date-based** — `trg_closed_period_*` blocks by `receipt_date` year (`…ig004…sql`), and `isLocked(dateOf(...))` blocks by document date (`operations.js`). **Per-settlement-line target-year validation is NEW logic** (the DB guard checks the receipt's date, not each line's target year).

## 10. Audit today — can an auditor trace a shekel to 2025 vs historical vs 2027?

**Partially — and for subscription years, NO.**
- **Historical:** **Yes** — a collection carries `movement_type='historical_debt_collection'` (stored), so "this shekel went to the historical deficit" is auditable from the receipt.
- **Subscription year (2025 vs 2026 vs 2027):** **No** — a live subscription payment is a **food receipt** with **no stored year**; the per-year split is **computed at read time** by the oldest-first waterfall (`fin.js:220-230`). Nothing in the stored receipt says which year it paid.
- **Conclusion:** today an auditor **cannot** prove a specific shekel went to 2025 vs 2026 vs 2027 — it is inferred, not recorded. **This is exactly the gap the feature closes.**

## 11. Golden Reference — mathematical proof

Receipt `R = 900`, settlement `200→2025, 300→2026, 400→Historical`.

**Final Balance.** `finalBalance = openingDebt + Σdue − Σcredits − resolutions` (`fin.js:115`). Every settlement line is a **credit** to its destination (subscription payment or historical collection — both `cr` rows, `fin.js:62,67,73`). The credits this receipt contributes = `200 + 300 + 400 = 900 = R`. Let `B₀` be the balance without the receipt. With it:
`B = B₀ − Σ(lines) = B₀ − 900`.
A single **unallocated** 900 receipt contributes `−900` identically. **∴ the split changes which obligation each credit targets, never Σcredits, so `B` is invariant to the split — 900 either way.** For *existing* members with **no** new receipt, `B = B₀` (nothing added). ∎
- **Treasury.** Each line routes to a fund; total inflow `= Σ lines = 900`. Per-fund distribution differs by design, but the **grand total moves by exactly 900** — the same as one 900 receipt. No phantom shekel (`Σ lines = R` enforced). Existing treasury (no new receipt) is untouched. ∎
- **Ledger.** One document, posted amount `= 900`. **Critical invariant:** settlement lines are **attribution**, not additional ledger movements — the ledger counts `R` once, never `R + Σlines`. Because `Σ lines = R`, there is nothing to double-count. ∎

**The whole proof rests on one enforced invariant: `Σ settlement lines = receipt amount`, and lines are attribution not money.** Everything else follows.

## 12. Worst Case — the scenario most likely to break the design

**Non-atomic posting + double-source.** Two compounding dangers, both proven present today:
1. **Partial post (atomicity):** because the current path writes the receipt and its audit as **separate** operations (Q6), a settlement-lines write added naively would be a **third separate** write — a crash between them yields **a posted receipt with missing/partial settlement**, violating "the receipt fully defines the settlement" and breaking `Σ lines = amount`. **The current system does NOT prevent this** — there is no transaction wrapper. It **must** be solved by a single atomic RPC before any posting code ships.
2. **Two sources of truth:** if the feature ever wrote per-year `paid_amount_ils` **and** settlement lines, a member-year would have two competing paids. Mitigation is mandated by existing law: `paid_amount_ils` is migration-only and **BO-10 rejects non-zero** (`operations.js:300`), so the feature must record attribution **only** in `allocation_records` and never touch `paid_amount_ils`. **The current system enforces the rejection**, so the guardrail exists — but the reconciliation between legacy (pool-derived) and new (line-recorded) attribution must be defined so no member-year is counted twice.

Secondary breakers: currency-rounding making `Σ lines ≠ amount_ils` (needs exact-rounding validation), and historical-deficit over-allocation (needs the V5 cap). None are blockers, but all must be explicit rules.

---

## Verdict

# ✅ Phase 0 Complete

All 12 questions are answered with evidence from the live code / database / schema; where the system lacks a capability, it is stated as a proven gap rather than assumed. **The starting point is correct and clean** — V3 invariant holds (0/302 violations), the settlement-line store exists and is empty, a single creation seam exists, credit is already derived, and the `Σ = amount` invariant provably preserves every balance.

**"Complete" means the readiness review is complete and the baseline is proven — not that the system already implements the feature.** The review has surfaced **six confirmed build-items** that later phases must resolve (they are inputs to Phase 1-4, not defects in the baseline):

1. **Atomicity (Q6, Q12):** posting must become a **single atomic RPC** (receipt + settlement lines together) — the current path is non-atomic.
2. **Settlement store hardening (Q5):** `allocation_records` needs FK / UNIQUE(`source_ref,kind,year`) / CHECK(`amount>0`) / `obligation_kind` enum / `notes` (no new table).
3. **Cancellation (Q7):** new logic to void a receipt's settlement lines on cancel.
4. **Refund (Q8):** new representation so a refund can target a specific settlement line/year.
5. **Closed-year (Q9):** per-line target-year validation (current guard is date-based).
6. **Legacy reconciliation (Q10, Q12):** define how new line-recorded attribution coexists with legacy pool-derived attribution so no member-year is double-counted, and never write `paid_amount_ils`.

**No Phase 1 has been started.** Awaiting your explicit approval to close Phase 0 and begin Phase 1 (Functional Model).

---
**Read-only — nothing modified. No code, no migration, no PR. STOP.**
