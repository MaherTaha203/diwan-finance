# P-RECEIPT-ALLOCATION-006 — Final Implementation Specification
### (Architecture CLOSED · reuse existing Diwan structures · NO CODE / NO MIGRATION / NO PR)

**Accepted decision.** A Receipt Voucher is the complete legal financial document. The operator explicitly allocates every part of the payment (2025/2026/2027 subscription · Historical Deficit · Future Credit · Donation). The system never guesses, reallocates, or redistributes; the allocation engine, when it meets an explicitly-allocated receipt, **reads the recorded settlement inside the receipt — it does not guess it.** Mandatory invariant: **`Σ settlement lines = receipt amount_ils`**. Only new receipts carry explicit settlement; all existing balances are the Golden Reference and stay byte-identical.

**Grounding (from Phase 0 closure, proven):** settlement lines belong in the existing empty `allocation_records` table (key = Receipt + Obligation`(kind,year)`); `receipts.manual_allocation` is the "explicitly settled" flag; posting is **not atomic today** (needs an RPC); `paid_amount_ils` is migration-only and must never be written; credit is a derived `−finalBalance`; historical deficit is a member balance + obligation + fund; refunds are allocation-blind today.

---

# Phase 1 — Receipt Data Model

**Receipt Header** (existing `receipts` row, unchanged shape + one flag):
- Required: `no` (auto), `member_id` (payer=member), `amount`, `currency`, `exchange_rate`, `amount_ils` (control total, > 0), `receipt_date`, `payment_method`, `fund_type`, `movement_type`, `created_by`/`created_by_uid`, `verification_token`.
- Set by this feature: **`manual_allocation = true`** (marks the receipt as explicitly settled → its settlement lines are authoritative; the engine never pools it).
- Optional: `reference`, `notes`.

**Settlement Lines** (existing `allocation_records`, one row per line):
- Required: `source_ref` = receipt id, `source_kind` = `'receipt'`, `member_id`, `obligation_kind` ∈ {`due`,`historical`,`donation`,`credit`}, `year` (required when `kind='due'`, else null), `amount_allocated` (> 0), `created_by`/`created_by_uid`, `immutable=true`.
- Optional: `obligation_id` (`'sub:'+year` / `'hist'` — mirrors `fin.js:221-222`), `notes` (**new column**, Phase 8).

**Validation rules (data-level):**
1. `Σ amount_allocated (lines of a receipt) = receipt.amount_ils` — exact (post-rounding). **Mandatory.**
2. `amount_allocated > 0` per line.
3. Unique `(source_ref, obligation_kind, year)` — no duplicate destination.
4. `kind='due'` ⇒ `year` present, member scheduled for it, `amount ≤ that year's due`.
5. `kind='historical'` ⇒ `year` null, `amount ≤ member outstanding historical deficit`.
6. `kind='donation'`/`'credit'` ⇒ `year` null.
7. No line targets a closed year (`year ≤ locked_through_year`).

---

# Phase 2 — Receipt UI

**Screen = existing receipt form + a Settlement Grid.**

- **Header fields:** Member · Amount · Currency (+rate) · Payment Method · Reference · Date · Notes (existing controls).
- **Settlement Grid columns:** Destination (Year picker / Historical Deficit / Donation / Future Credit) · Amount · Due-or-Outstanding (read-only guide) · Status (Paid / Partial / Reduces Deficit / Donation / Prepayment) · Remaining (read-only) · Notes · Remove.
- **Buttons:** `Add Line`, `Remove Line`, `Save` (disabled until valid), `Cancel` (discard draft).
- **Totals bar:** `Amount 800 · Allocated 800 · Remaining 0` (green at 0, red otherwise).
- **Validation:** live; each failing rule shows an inline message; **Save disabled** while any fail.
- **User workflow:** pick member → destinations load with outstanding → enter amount → add lines until Remaining = 0 → Save.
- **Keyboard:** Enter commits a line and focuses the next Amount; Tab moves across columns; Esc cancels the row edit; Alt+A adds a line; Alt+S saves (only when valid).
- **Error handling:** blocking errors (Σ mismatch, closed year, cap exceeded, duplicate) disable Save with a specific message; non-blocking warnings (e.g. partial year) are shown but allow Save.
- **Editing:** a **draft** is fully editable. A **posted** receipt is **read-only** (Phase 5 correction = reverse + recreate).
- **Read-only mode:** posted / cancelled / refunded receipts render the grid non-editable with a status badge (Posted / Cancelled / Refunded) and links to any reversal/refund documents.

---

# Phase 3 — Posting Lifecycle (sequence only)

```
Draft (header + settlement grid in the UI; nothing persisted)
   ↓
Validation (all Phase-1/4 rules; Σ lines = amount; Save enabled only when green)
   ↓
Atomic Posting  ← ONE server transaction (new RPC): insert receipt + all settlement
                  lines together; re-check Σ = amount server-side; all-or-nothing.
   ↓
Audit (the same transaction records the create in audit_log; created_by/uid stamped)
   ↓
Treasury (derived — each line's amount is attributed to its fund; Σ = amount, so the
          treasury grand total moves by exactly the receipt amount; nothing written)
   ↓
Member Statement (reads the receipt + its settlement lines: shows the split)
   ↓
Reports (read the recorded settlement as authoritative attribution — never re-derive)
   ↓
Commit (transaction complete; the receipt is official, immutable, fully attributed)
```

No later step allocates, reallocates, or interprets the receipt. Treasury/ledger remain **derived** (no separate writes), so the only persisted objects are the receipt row + its settlement rows + the audit row — **in one atomic transaction.**

---

# Phase 4 — Settlement Rules (per destination)

| Destination | `obligation_kind` | Year? | Fund routing | Cap / limit | Status shown |
|---|---|---|---|---|---|
| **Subscription Year** | `due` | required | food | `amount ≤ year's due`; excess → Future/Credit | Paid (≥due) / Partial (<due) |
| **Historical Deficit** | `historical` | none | historical_deficit (`historical_debt_collection`) | `amount ≤ member outstanding historical` | Reduces Deficit |
| **Future Credit / Prepayment** | `credit` | none | derived credit (money lands as `−finalBalance`; attribution recorded) | none | Prepayment |
| **Donation** | `donation` | none | donation fund | none | Donation |

**Universal rules:** each destination at most once per receipt; every line `> 0`; **`Σ = amount_ils` mandatory**; no line targets a closed year; a subscription year is never over-paid in place (excess is an explicit Future/Credit line — the system never spills a surplus automatically). "Other future destinations" (e.g. a second import source) are **out of scope**; the `obligation_kind` enum is extensible later without schema change beyond the enum value.

---

# Phase 5 — Cancellation / Correction / Refund

- **Cancellation (whole receipt):** the existing soft-delete path (`cancelVoucher`: `is_deleted=true`, version++, version-history, audit) is extended so the **same transaction voids the receipt's settlement lines** (mark them reversed/void). Because balances are derived from non-deleted receipts, the money effect disappears with the soft-delete; voiding the lines removes the attribution so no orphan remains. Reversal is exact (each line to its exact destination); nothing is guessed.
- **Void vs Reverse:** *Void* = the receipt was never valid (cancelled same period) → soft-delete + line void. *Reverse* = a posted, past-period receipt needs undoing → an immutable reversing entry (per existing versioning), lines voided.
- **Correction:** **never edit a posted receipt.** Reverse/cancel the wrong one → create a new correct receipt → post. The pair is the audit narrative.
- **Refund (decided):** a refund is (a) a money movement in the existing `refunds` table (unchanged) **plus** (b) **negative settlement lines** in `allocation_records` referencing the original receipt's lines — so the refund is **allocation-aware**.
- **Partial refund:** the operator selects which line(s) to unwind; a negative settlement line of the refunded amount is recorded against that exact obligation (e.g. `due/2026 : −150`). `Σ` of the refund's negative lines = the refunded amount.
- **Historical refund:** a refund against a `historical` line records `historical : −amount`, returning money to the historical deficit exactly.

*(This decision keeps one attribution store — `allocation_records` — for both settlements and their reversals; the `refunds` table remains the money document.)*

---

# Phase 6 — Impact Study (what changes · what MUST NEVER change)

| Module | What changes | What must NEVER change |
|---|---|---|
| **Member Statement** | shows a posted receipt with its settlement lines (per-year/historical/donation split) | the final balance for a given total; the ledger math |
| **Annual Debt** | a year's paid reflects the **allocated** amount for explicitly-settled receipts | the IG-006 identity `current = hist+dues−paid−resolutions`; the signed balance for a given total |
| **Delinquent** | a year is settled/partial only if a line targeted it; no surplus auto-applied | the outstanding-based delinquency math |
| **Dashboard** | unpaid counts reflect explicit attribution | all totals |
| **Treasury** | a new receipt's amount is routed per its lines (Σ = amount) | every existing treasury balance; total inflow ≠ receipt amount is impossible |
| **Ledger** | receipt shown with optional settlement sub-lines (memo) | posted amounts (one document = its amount; lines are attribution, never additional money) |
| **Reports / Print / PDF / Excel** | display the recorded settlement attribution | all financial totals; existing receipts' output |
| **Search** | settlement destinations become searchable (optional) | nothing financial |
| **API** | receipt payloads may include settlement lines; read endpoints may expose them | existing response totals; legacy receipts |

**The universal rule:** attribution becomes explicit and stored; **no total, no existing balance, no legacy receipt, and no imported figure changes.**

---

# Phase 7 — Golden Reference Verification (byte-identical invariants)

Must be **byte-identical** before/after the feature (baseline captured in Phase 0):
1. **Every member's Final Balance.**
2. **Treasury / fund balances** (food, diwan, donation, historical_deficit) — anchor totals: receipts 16,404.19 · payments 17,880.00.
3. **Ledger totals** (Σ movements).
4. **Historical balances** (Σ members hist net = 187,441.00; `paid_amount_ils` Σ = 17,862.00; never written).
5. **Existing receipts** (no legacy receipt altered or re-attributed).
6. **Imported data** (`paid_amount_ils` write-once; migration-only; never reinterpreted).
7. **V3 invariant** `balance_ils = due − paid` (0/302 violations) preserved.

Verification method: a reconciliation harness compares per-member Final Balance and all fund totals **before vs after** on the full member set; any delta ≠ 0 fails the gate.

---

# Phase 8 — Database Review (reuse vs new — proven)

- **Settlement lines:** **reuse `allocation_records`** (exists, empty). It already has receipt link, member, obligation kind/year, amount, immutability, ownership stamps. **Additive changes required (no new table):** FK `source_ref → receipts(id)` semantics (or a typed `receipt_id`), UNIQUE`(source_ref, obligation_kind, year)`, CHECK`amount_allocated > 0`, an `obligation_kind` enum/CHECK ∈ {due,historical,donation,credit}, and a `notes` column. **Justification:** the table's purpose (ordered-allocation audit) and shape already match settlement lines; adding constraints is strictly safer than a parallel table and avoids two attribution stores.
- **Explicitly-settled flag:** **reuse `receipts.manual_allocation`** (exists) — no change.
- **Atomic posting:** **new RPC required** (proven: `createVoucher` is non-atomic). Model it on `create_member_atomic` (`…p0_v2…sql`): insert receipt + lines + audit in one transaction, enforce `Σ = amount` server-side, roll back on any failure. **This is the one unavoidable new database object (a function, not a table).**
- **Refund attribution:** **reuse `allocation_records`** (negative lines) + existing `refunds` table — no new table.
- **No other new tables. No data migration.** Imported history untouched.

---

# Phase 9 — Implementation Order (smallest safe, flag-gated, each ends in verification)

| PR | Scope | Reversible by | Verification |
|---|---|---|---|
| **PR-1** | Harden `allocation_records` (FK/UNIQUE/CHECK/enum/`notes`) — additive DDL; table empty, unconsumed | migration down | constraints exist; **zero behavior change**; suite green |
| **PR-2** | Atomic posting **RPC** (`create_receipt_with_settlement`) — defined, **uncalled** | drop function | RPC posts receipt+lines atomically or rolls back; server-side `Σ=amount`; nothing calls it yet |
| **PR-3** | Settlement **Grid UI** (draft + validation only; behind `RECEIPT_ALLOC` flag OFF) | flag off | all Phase-1/4 validations; Save gate; posts nothing yet |
| **PR-4** | Wire Save → RPC (flag-gated) — new receipts post with settlement | flag off | posted receipt has lines; **balance moves by exactly amount**; Golden Reference intact |
| **PR-5** | Consumer seam: allocation **reader branch** consumes settlement lines for explicitly-settled receipts (bypasses pool); legacy unchanged | flag off | per-year attribution = lines; **totals byte-identical**; parity harness on all members |
| **PR-6** | Cancellation voids settlement lines (atomic) | flag off / revert | cancel reverses lines to exact destinations; balances return identical |
| **PR-7** | Allocation-aware refund (negative lines + `refunds`) | flag off / revert | partial-year refund targets the exact line; totals reconcile |
| **PR-8** | Reports/print/PDF/Excel display recorded attribution | flag off | every surface shows same attribution; Golden Reference intact |
| **PR-9** | Flag flip to ON + finalize | flag off | full acceptance checklist (Phase 11) green |

No PR starts before the previous is approved. Each is independent, reviewable, reversible (flag off or DDL down), and ends with its own verification report.

---

# Phase 10 — Risk Review

| Risk | Mitigation (spec-level) |
|---|---|
| **Atomicity** (partial post) | single RPC; all-or-nothing; server-side `Σ=amount` re-check (PR-2) |
| **Concurrency** (two operators, same member) | per-receipt lines keyed by receipt id; UNIQUE`(receipt,kind,year)`; no cross-receipt contention (each receipt independent) |
| **Double posting** (same receipt twice) | voucher `no` uniqueness (existing Law 12) + idempotent RPC on `verification_token` |
| **Wrong allocation** (operator error) | live validation; statement shows the split; correction = reverse + recreate |
| **Editing after posting** | posted receipts read-only; reverse + recreate only |
| **Closed fiscal year** | per-line target-year validation (V7) + existing date guard + RPC re-check |
| **Cancellation** | atomic void of receipt + lines; exact reversal |
| **Refund** | allocation-aware negative lines; partial/historical targeted exactly |
| **Audit** | every line stamped `created_by`/`uid` + timestamp; immutable; reversal is a new record |
| **Recovery / Rollback** | every PR flag-gated (flag off reverts read behavior instantly) or DDL-down; no data migration to unwind |
| **Double-counting** (lines + receipt both as money) | **hard invariant: lines are attribution, money is the receipt total; `Σ lines = amount`** — reader adds lines *instead of* pooling, never in addition |
| **Two sources of truth** | attribution only in `allocation_records`; **`paid_amount_ils` never written** (BO-10 enforces); legacy pool-derived vs new line-recorded reconciled by the reader branch (explicitly-settled ⇒ lines; else ⇒ pool) |

---

# Phase 11 — Acceptance Criteria (objective)

- ✓ A receipt **cannot post** when `Σ settlement lines ≠ amount_ils`.
- ✓ A receipt **cannot post** with a zero/negative line, a duplicate destination, a line over its year's due, a historical line over outstanding, or a line targeting a closed year.
- ✓ Posting is **atomic**: on any failure, **no** receipt and **no** lines are persisted (verified by injected failure).
- ✓ A posted receipt is **read-only**; no edit path mutates its lines.
- ✓ For a posted receipt, each targeted year shows the **allocated** amount; a non-targeted overdue year stays **unpaid** (no auto-cascade).
- ✓ **Every member's Final Balance is byte-identical** to the Phase-0 baseline (reconciliation harness, delta = 0 for all members).
- ✓ **Treasury/fund totals byte-identical** to baseline; a new receipt moves the grand total by **exactly its amount**.
- ✓ **Ledger totals** unchanged; no receipt is counted as `amount + Σlines`.
- ✓ **`paid_amount_ils` is never written** by any receipt operation (verified: Σ unchanged = 17,862.00).
- ✓ **Existing receipts unchanged**; **imported history unchanged**.
- ✓ Cancellation reverses **every** line to its exact destination; post-cancel balances equal pre-post balances.
- ✓ A partial refund of a specific year records a negative line against **that** obligation only.
- ✓ **No process re-derives** an explicitly-settled receipt's attribution after posting (verified: reader branch consumes lines, pool bypassed).
- ✓ Every report/print/PDF/Excel shows the **same** settlement attribution; all financial totals identical.

---

## Verdict

# ✅ READY FOR IMPLEMENTATION

Every implementation question is answered and every open decision is made: settlement lines reuse `allocation_records` (with named additive constraints), `manual_allocation` is the flag, posting uses one new atomic **RPC** (the sole unavoidable new DB object — a function, not a table), refunds are allocation-aware via negative lines, the consumer seam is a **reader branch** (FD-002 reads the recorded truth, never guesses), and the `Σ lines = amount` + "lines are attribution not money" invariants provably hold every Golden-Reference total byte-identical. There are **no unresolved blockers**.

Implementation proceeds **only after your approval**, PR-by-PR per Phase 9, each ending in its own verification report, none starting before the previous is approved.

---
**Specification only — no code, no migration, no PR, no file modified beyond this document. STOP and await approval.**
