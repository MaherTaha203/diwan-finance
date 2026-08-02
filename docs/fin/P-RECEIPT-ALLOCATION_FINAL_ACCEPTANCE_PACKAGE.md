# P-RECEIPT-ALLOCATION — Final Acceptance Package

**Official closing document for the P-RECEIPT-ALLOCATION program.** Engineering is complete; this package contains everything required to accept, activate, and close the project. It records only facts proven by the merged work; anything not proven is stated as such. No implementation, code, SQL, migration, or PR is part of this document.

Status at issue: PR‑1..PR‑7 + Integration Review + PR‑7A **merged** to `main`. Feature flag `RECEIPT_ALLOCATION_ENABLED` **OFF by default**. Automated suite: **80 green / 2 pre‑existing known‑red** (unrelated: `business-operations-slice1`, `constitutional-explicit-q5`).

**Contents:** 1 Executive Summary · 2 Project Timeline · 3 Delivered Work · 4 Proven Invariants · 5 Project Non‑Goals · 6 Architecture Snapshot · 7 Operational Acceptance Runbook · 8 Complete UAT Matrix · 9 Go/No‑Go · 10 Feature Flag Decision · 11 Production Rollout Plan · 12 Rollback Plan · 13 Known Limitations · 14 Lessons Learned · 15 Final Project Closure · 16 Owner Sign‑off.

---

## 1. Executive Summary
**Why it was created.** Imported/legacy receipts settled a member's obligations implicitly through the FD‑002 oldest‑first "pool" waterfall. There was no way to record *which* specific obligations a receipt settled, and no first‑class, auditable way to cancel or refund that settlement. The system also carried a latent constitutional risk: settlement attribution was inferred at read time rather than recorded as part of the transaction.

**What it solved.** It introduced **Explicit Receipt Settlement**: a receipt may carry explicit settlement lines (which year / historical deficit / donation / future‑credit each shekel settles), recorded atomically with the receipt, read by exactly one authority, and reversible by cancellation (void) and refund (line‑level reversal) — each through a single dedicated authority.

**What was deliberately NOT changed.** The accounting core: `FD‑002` pool math for legacy receipts, `FIN.memberStatement` and its `finalBalance`, Treasury totals, Ledger totals, Historical Truth, `paid_amount_ils`, and `member_subscriptions`. Legacy receipts, imported history, and existing balances behave exactly as before (see §5).

**Why it is constitutionally correct.** The feature is inert unless a feature flag is ON; with it OFF the system is byte‑identical to the prior production behaviour (Golden Reference). When ON, settlement only redistributes *which* obligation a receipt settles — never a total — so `outstanding` continues to equal `memberStatement.finalBalance` at every step. Each capability (write, read, void, refund) has exactly one authority, enforced in code and, for writes, by database Row‑Level Security.

---

## 2. Project Timeline

| Stage | Purpose | Result | Status | Reference |
|---|---|---|---|---|
| Architectural Investigation | Locate the source of truth for year status; find the first constitutional divergence | Divergence proven at `fin.js` (imported surplus enters the FD‑002 pool) | Completed (read‑only) | Study notes (design phase) |
| Constitutional Review | Decide whether explicit settlement is part of the transaction and confirm no second source of truth | Confirmed: allocation IS part of the transaction; single‑source constraints hold | Completed (read‑only) | Design phase |
| PR‑0 | Prove the single **read** path (no report bypasses the repository) | Proven | Completed (read‑only; no merge) | Verification artefact |
| PR‑0A | Prove the single **write** path (settlement writes must go through one authority) | Proven | Completed (read‑only; no merge) | Verification artefact |
| PR‑1 Foundation | Additive DB foundation + inert RPC skeleton + feature flag | Inert; flag OFF; zero behaviour change | Merged | #278 · `0cf2352` |
| PR‑2 Atomic Posting | `create_receipt_with_settlement` RPC body (Σ lines = amount) | Dormant; revoked from clients | Merged | #279 · `a7e6381` |
| PR‑3 Settlement Editor | Pure editor component + mount (UI only) | Inert; no runtime caller | Merged | #280 · `d6cdc28` |
| PR‑4 Wiring | Single posting path (`saveRec` → RPC) + RLS fence | Client settlement writes only via the RPC | Merged | #281 · `3a1d13f` |
| PR‑5 Consumer Seam | `FIN.memberAllocation` = sole reader of attribution | Byte‑identical OFF; `outstanding = finalBalance` | Merged | #282 · `b245129` |
| PR‑6 Cancellation | `void_receipt_settlement`; cancel voids the lines | Single void authority; repeat cancel rejected | Merged | #283 · `4e5d462` |
| PR‑7 Refund Engine | `refund_receipt_settlement`; allocation‑aware refund | Single refund authority; invariant preserved | Merged | #284 · `e219a7b` |
| Integration Review | End‑to‑end lifecycle + one‑authority proof + UAT checklist | 35/35; acceptance‑ready | Merged | #285 · `51a1dc4` |
| PR‑7A Refund UI | Accountant‑facing refund dialog (UI only) | Sole path `BusinessOps.refundReceipt`; engine untouched | Merged | #286 · `e06b888` |
| Final Acceptance Package | Official closure documentation (this document) | Produced | Pending owner sign‑off | branch `claude/pralloc-final-acceptance` (no PR) |

---

## 3. Delivered Work (per stage)

| Stage | Purpose | Result | Merge (PR · commit) | Unchanged |
|---|---|---|---|---|
| **PR‑1 Foundation** | Additive DB foundation + inert RPC skeleton + flag | Inert; flag OFF | #278 · `0cf2352` | All runtime behaviour; `paid_amount_ils` |
| **PR‑2 Atomic Posting Engine** | RPC body: Σ lines = amount; closed‑year & kind validation | Dormant (revoked); no caller | #279 · `a7e6381` | `paid_amount_ils`, `member_subscriptions` |
| **PR‑3 Settlement Editor (UI)** | Pure editor + mount, flag‑gated | Inert; no runtime caller | #280 · `d6cdc28` | All screens/engines |
| **PR‑4 Wire Editor → RPC** | Single posting path + RLS fence | Settlement writes only via the RPC | #281 · `3a1d13f` | Legacy posting path (flag OFF) |
| **PR‑5 Consumer Seam** | Sole reader of attribution (explicit‑first, legacy residual) | Byte‑identical OFF; `outstanding = finalBalance` | #282 · `b245129` | `memberStatement`, FD‑002 math, totals |
| **PR‑6 Cancellation** | `void_receipt_settlement`; cancel voids lines | Repeat cancel rejected; single void authority | #283 · `4e5d462` | Money side via existing cancel path |
| **PR‑7 Refund** | `refund_receipt_settlement`; partial=selected, full=all | `outstanding = finalBalance` incl. mixed member | #284 · `e219a7b` | `memberStatement` (+refunded total), legacy refunds |
| **Integration Review** | Lifecycle + one‑authority proof + UAT checklist | 35/35; acceptance‑ready | #285 · `51a1dc4` | Nothing (test + docs only) |
| **PR‑7A Refund UI** | Accountant refund dialog; sole path `refundReceipt` | UI only; engine/schema untouched | #286 · `e06b888` | `fin.js`, `operations.js`, `data.js`, migrations |

PR‑0 / PR‑0A were read‑only proofs (design/verification) and merged no runtime code.

---

## 4. Proven Invariants
Each item is enforced and covered by the merged automated tests (`tests/pralloc-*`).

- **Single write authority** — `create_receipt_with_settlement` (SECURITY DEFINER) is the only writer of settlement rows; the PR‑4 RLS fence blocks direct client writes of `source_kind='receipt_settlement'`. Its only client caller is `receipt-settlement.js`.
- **Single read authority** — `FIN.memberAllocation` is the sole computer of settlement attribution/balances from `allocation_records`; `data.js` only loads, `refund-ui.js` only displays (proven to compute no attribution).
- **Single cancellation (void) authority** — `void_receipt_settlement`; only client caller `receipt-settlement.js`; only invoker `BusinessOps.cancelVoucher` (BO‑03). Repeated cancellation rejected.
- **Single refund‑reversal authority** — `refund_receipt_settlement`; only client caller `receipt-settlement.js`; only invoker `BusinessOps.refundReceipt` (BO‑11). Repeated refund rejected.
- **Exactly one refund execution path (UI)** — the refund dialog calls only `BusinessOps.refundReceipt`; it performs no DB writes and no allocation math.
- **Golden Reference (flag OFF)** — `memberAllocation` and `memberStatement.finalBalance` are byte‑identical ON vs OFF for legacy data; a purely‑legacy member is `JSON.stringify`‑equal ON vs OFF.
- **Outstanding == Final Balance** — holds through the full post → cancel → partial refund → full refund lifecycle (Integration Review, 35/35).
- **No writes to `paid_amount_ils`** — proven for all three RPCs and the settlement/UI modules.
- **No writes to `member_subscriptions`** — same.
- **FD‑002 pool math untouched for legacy** — the seam adds only flag‑gated, additive branches; OFF ⇒ empty ⇒ identical.
- **`memberStatement` totals untouched** — the file/function is unmodified across all PRs.
- **Treasury / Ledger untouched** — no treasury/ledger computation file was modified by the program.
- **Historical Truth untouched** — not read or written by any settlement path.
- **Feature flag default OFF** — `RECEIPT_ALLOCATION_ENABLED` defaults false in every gating module.

**Not proven (stated explicitly):** live behaviour on the Preview deployment (§13); end‑to‑end execution of the refund money‑path in a running app (gated by `MODEL2_ALLOCATION_ENABLED`, §10); execution of the behavioural SQL self‑tests against a live DB (they are written to run via `psql` on a dev/branch DB and roll back, but were not executed here — the prod DB is read‑only). The JavaScript engine tests were executed and pass.

---

## 5. Project Non‑Goals (intentionally unchanged)
The program was scoped to add explicit settlement **without** altering the certified accounting core. The following were deliberately not changed, and this is proven by the absence of edits to their files/functions and by the Golden‑Reference equality (§4).

| Not changed | Why it remained unchanged |
|---|---|
| **FIN / `memberStatement` totals** | It is the single source of the member's Final Balance; settlement only redistributes attribution, never a total, so the statement must stay authoritative and untouched. |
| **FD‑002 pool math (legacy)** | Legacy/imported receipts must keep their oldest‑first waterfall; the seam adds explicit handling only behind the flag. |
| **Treasury totals** | Settlement records *which obligation* is settled, not cash movement; cash effects continue to flow through the existing certified paths. |
| **Ledger totals** | Same rationale as Treasury; no ledger computation was modified. |
| **Historical Truth** | Presentation authority for year status; never part of any balance, so out of scope. |
| **`paid_amount_ils`** | The single authoritative origin of subscription‑paid; a second writer would create a competing source of truth — forbidden. |
| **`member_subscriptions`** | Derived/authoritative subscription store; settlement never writes it. |
| **Existing accounting rules** | The constitution (single source, derived balances) was preserved, not rewritten. |
| **Existing balances** | Any change to stored balances would break reproducibility; balances remain derived. |
| **Legacy receipts** | Only receipts posted with explicit settlement lines use the new behaviour; legacy receipts are byte‑identical. |
| **Imported history** | Treated as established truth after approval; the feature adds attribution going forward, not retroactive rewriting. |

---

## 6. Architecture Snapshot (one page)

**Posting → data → read → reports (the happy path):**
```
Receipt (+ explicit settlement lines)
        │
        ▼
Atomic RPC  create_receipt_with_settlement   ← the ONLY settlement writer (RLS-fenced)
        │   (Σ lines = amount; never writes paid_amount_ils / member_subscriptions)
        ▼
allocation_records   (source_kind = 'receipt_settlement';  markers: voided_at, refunded_at)
        │
        ▼
FIN.memberAllocation()   ← the ONLY reader of settlement attribution
        │
        ▼
memberDelinquency()  →  Reports (Statement · Annual Debt · Delinquent · Subscriptions · Dashboard)
```

**Authority model:**
```
Single Writer  (create_receipt_with_settlement)
        ↓
Single Reader  (FIN.memberAllocation)
        ↓
Single Status  (outstanding == memberStatement.finalBalance)
        ↓
Reports        (all read status transitively via memberDelinquency)
```

**Lifecycle authorities:**
- **Posting** — `create_receipt_with_settlement` RPC, reached only via `ReceiptSettlement.post` (from `saveRec`, flag‑gated).
- **Cancellation** — `void_receipt_settlement` RPC (stamps `voided_at`), reached only via `ReceiptSettlement.cancel` from `BusinessOps.cancelVoucher` (BO‑03).
- **Refund** — `refund_receipt_settlement` RPC (stamps `refunded_at`; partial = selected lines, full = all), reached only via `ReceiptSettlement.refund` from `BusinessOps.refundReceipt` (BO‑11); accountant entry point is the flag‑gated Refund dialog.
- **Feature Flag** — `RECEIPT_ALLOCATION_ENABLED` (default OFF) makes the entire pipeline inert; a second flag `MODEL2_ALLOCATION_ENABLED` independently gates refund execution.
- **Golden Reference** — with the flag OFF, every read path is byte‑identical to the pre‑project production behaviour.

---

## 7. Operational Acceptance Runbook (owner)
Perform on a **staging / Preview** deployment with a real login. Do not enable in production before §9/§11.

1. **Enable flags (Preview only).** Set `window.RECEIPT_ALLOCATION_ENABLED = true`. For the refund money‑path to execute, `window.MODEL2_ALLOCATION_ENABLED` must also be true (it guards `BusinessOps.refundReceipt`). Reload so settlement rows load.
2. **Prepare test data.** A member with several open subscription years, a historical deficit, and at least one legacy (non‑explicit) receipt for comparison. Confirm the fiscal lock year so some years are open and one is closed.
3. **Post — one year.** New food receipt → Settlement Editor → allocate the full amount to one open year → Save. **Pass:** that year shows settled; others unchanged.
4. **Post — multiple years / split / historical / future‑credit / overpayment.** Repeat with splits across years, historical deficit, future credit, and an amount exceeding obligations. **Pass:** each chosen destination is settled exactly; overpayment becomes future credit; `outstanding` matches the statement.
5. **Verify reports & accounting:** **Member Statement, Annual Debt, Delinquent Report, Subscriptions, Dashboard, Treasury, Ledger, Historical Deficit, Future Credit.** **Pass:** chosen years are the ones marked paid; `outstanding == Final Balance`; Treasury/Ledger equal a legacy receipt of the same amount.
6. **Cancel.** Cancel an explicitly‑settled receipt. **Pass:** the settled years revert exactly; Final Balance/Treasury/Ledger equal a legacy cancellation; a second cancel is rejected.
7. **Refund — partial then full.** Open the Refund dialog, select individual lines (partial), confirm; then full. **Pass:** only selected obligations reopen (partial) / all reopen (full); already‑refunded lines are non‑selectable; a repeated refund is rejected; every report reconciles and `outstanding == Final Balance`.
8. **Legacy + explicit together.** Confirm a member holding both behaves correctly and the legacy pool is not disturbed by an explicit refund.
9. **Golden Reference.** Set `RECEIPT_ALLOCATION_ENABLED = false`, reload. **Pass:** legacy member/receipt/refund shows exactly today's numbers.

**Global pass/fail:** every step behaves as described; flag OFF is byte‑identical; no `paid_amount_ils` / `member_subscriptions` / FD‑002 / Treasury / Ledger movement is attributable to settlement.

---

## 8. Complete UAT Matrix

| # | Scenario | Purpose | Expected Result | Verification | Pass/Fail |
|---|---|---|---|---|---|
| 1 | One subscription year | Basic explicit post | That year settled only | Member Statement / Annual Debt | ☐ |
| 2 | Multiple years | Multi‑line post | Each chosen year settled | Subscriptions / Statement | ☐ |
| 3 | Subscription + Historical Deficit | Mixed destinations | Both reduced exactly | Statement / Historical Deficit | ☐ |
| 4 | Split across several years | Explicit (not oldest‑first) | Exactly the chosen years | Annual Debt | ☐ |
| 5 | Split including Future Credit | Credit destination | Credit increased by line | Member Card / Statement | ☐ |
| 6 | Overpayment | Excess → credit | Obligations cleared + credit | Statement (creditBalance) | ☐ |
| 7 | Cancel receipt | Void lines | Years revert; totals equal legacy cancel | Statement / Treasury / Ledger | ☐ |
| 8 | Partial refund | Reverse selected lines | Only selected obligations reopen | Refund dialog / Statement | ☐ |
| 9 | Full refund | Reverse all lines | Equivalent to no receipt | Statement / Treasury | ☐ |
| 10 | Legacy + explicit | Coexistence | Legacy pool undisturbed | Statement / Delinquent | ☐ |
| 11 | Large member history | Performance / correctness | Correct totals, responsive | Statement / Dashboard | ☐ |
| 12 | Consecutive receipts | Repeated posting | Each attributed independently | Annual Debt | ☐ |
| 13 | Consecutive cancellations | Repeated void | Each reverts; repeat rejected | Statement | ☐ |
| 14 | Consecutive refunds | Repeated reversal | Each line once; repeat rejected | Refund dialog / Statement | ☐ |
| 15 | Closed fiscal year | Lock enforcement | Closed‑year settlement/refund rejected | Server error surfaced | ☐ |
| E1 | Duplicate line (same year) | Uniqueness guard | Post rejected atomically | Server error | ☐ |
| E2 | Σ lines ≠ amount | Invariant guard | Post rejected | Server error | ☐ |
| E3 | Refund exceeding remaining | Cap guard | Rejected / capped | Refund dialog validation | ☐ |
| E4 | Refund already‑refunded line | Idempotency | Non‑selectable / rejected | Refund dialog | ☐ |
| E5 | Golden Reference (flag OFF) | Byte‑identical | Today's numbers exactly | All reports | ☐ |

Automated coverage already proves the *logic* for these; the matrix is for owner confirmation on the live app.

---

## 9. Go / No‑Go Decision (objective)

**GO requires all of:**
- All UAT matrix rows (§8) marked Pass on the live Preview.
- Golden Reference confirmed byte‑identical with the flag OFF.
- No settlement‑attributable movement in Treasury, Ledger, FD‑002, `paid_amount_ils`, `member_subscriptions`, Historical Truth.
- The refund money‑path prerequisite (`MODEL2_ALLOCATION_ENABLED`) decided and, if refunds are in scope for launch, enabled and passing §8 rows 8/9/14.
- Automated suite green except the two documented pre‑existing reds.

**NO‑GO if any of:**
- Any UAT row fails, or any total moves that should not.
- Flag OFF is not byte‑identical.
- The refund path cannot execute in the target environment and refunds are required for launch.
- A closed‑year settlement or refund is not rejected.

---

## 10. Feature Flag Decision
Two flags are relevant. `RECEIPT_ALLOCATION_ENABLED` governs the whole feature (posting/reading/cancel/refund UI). `MODEL2_ALLOCATION_ENABLED` independently guards `BusinessOps.refundReceipt` execution.

| Option | Advantages | Risks | Recommended usage |
|---|---|---|---|
| **Keep OFF** | Zero risk; byte‑identical; instant | Feature unavailable | Default until UAT signed off |
| **Enable on Preview** | Real UAT without touching production | None to production | The acceptance step (§7) |
| **Enable Production** | Feature live for accountants | Operational; needs monitoring + rollback ready | After GO (§9); enable `RECEIPT_ALLOCATION_ENABLED`, and `MODEL2_ALLOCATION_ENABLED` only if refunds are in launch scope |
| **Remove flag** | Simpler code; feature permanent | Removes the instant OFF switch; should follow a stable production period | Only after production has run cleanly for an agreed period |

Recommendation basis (fact, not opinion): the OFF default is the proven safe state; production enablement should follow a passed UAT and be reversible via the flag before any flag removal.

---

## 11. Production Rollout Plan (chronological, owner‑executed)
1. **Preparation** — confirm §9 GO; confirm a backup/restore point exists for the database.
2. **Backup** — take/verify a current DB snapshot per standard operations.
3. **Enable** — set `RECEIPT_ALLOCATION_ENABLED = true` in production (and `MODEL2_ALLOCATION_ENABLED` if refunds are in scope). No deploy of new code is required.
4. **Verification** — repeat the §7 smoke steps on production with a controlled test member; confirm `outstanding == Final Balance` and Golden‑Reference parity for legacy members.
5. **Monitoring** — watch balances, Treasury, and Ledger totals for the first operating period; confirm no unexpected movement on legacy members.
6. **Rollback** — see §12.
7. **Owner responsibilities** — authorize enablement, own the backup, run verification, decide flag‑removal timing.

---

## 12. Rollback Plan (operational)
- **Immediate:** set `RECEIPT_ALLOCATION_ENABLED = false` (and `MODEL2_ALLOCATION_ENABLED = false` if it was enabled). The settlement pipeline becomes inert and behaviour returns to the Golden Reference **with no data change**. Newly recorded settlement rows simply stop being read.
- **Data:** cancellations and refunds already performed remain valid, auditable records; disabling the flag does not delete them. Because settlement rows only *redistribute* attribution (never totals), turning the flag off returns every member to the legacy pool computation.
- **Full removal (only if ever required):** the additive DB objects (columns `notes`, `voided_at`, `refunded_at`; the three RPCs) may be dropped by standard migration procedure; no existing data is altered by their removal. This is an operational decision, not part of this package.

---

## 13. Known Limitations (real, in‑scope statements only)
- **Live UAT not executed by engineering.** The Preview deployment was unreachable and loginless from the engineering environment, only Chromium was available, and no physical devices/other browsers existed. UI evidence provided (`docs/fin/pr7a-shots/`) is rendered from the real component + real CSS with mock data — not live‑app captures. Live acceptance is owner‑executed (§7).
- **Refund execution gated by a second flag.** `BusinessOps.refundReceipt` self‑guards on `MODEL2_ALLOCATION_ENABLED`; with it OFF the refund dialog opens but execution returns `E_DISABLED`. Enabling it is an owner decision (§10).
- **Behavioural SQL self‑tests not run here.** `tests/pralloc-pr{2,4,6,7}-*.sql` are provided to run on a dev/branch DB (they roll back); they were not executed in this environment (production DB is read‑only). The JavaScript engine tests were executed and pass.
- **Partial refunds operate at whole‑line granularity.** A refund reverses selected settlement *lines* in full; it does not split an individual line into a fractional amount. This is by design (no reconstruction/guessing).
- **Refund UI is admin‑only** and appears only for eligible posted receipts (not draft/cancelled/fully‑refunded), mirroring the BO‑11 authority.

---

## 14. Lessons Learned (engineering retrospective — proven only)
- **Explicit transaction truth beats inferred attribution.** Recording *which* obligation a receipt settles, as part of the transaction, removed the read‑time guessing that produced the original constitutional divergence.
- **One read authority prevents drift.** Making `FIN.memberAllocation` the sole reader of settlement attribution kept every report consistent and made "single status" (`outstanding == finalBalance`) provable rather than hoped‑for.
- **One write authority improves integrity.** A single SECURITY DEFINER writer plus an RLS fence made it structurally impossible for a client to create settlement rows outside the validated path.
- **The Golden Reference was the safety net.** Requiring byte‑identical behaviour with the flag OFF at every stage caught regressions immediately and made each PR independently reversible.
- **Feature flags reduced deployment risk.** Shipping dormant, flag‑gated code let the engine, wiring, and UI land incrementally in production with zero behavioural change until deliberately enabled.
- **Constitutional reviews up front prevented later redesign.** Settling the source‑of‑truth question before coding meant the architecture never had to be reopened; every subsequent PR fit the same authority model.
- **Presentation reads must be distinguished from attribution reads.** PR‑7A showed that a UI may read raw settlement rows for display without becoming a second attribution authority — the invariant was refined to state this precisely rather than weakened.

---

## 15. Final Project Closure
- **Project scope:** completed.
- **Architecture:** closed (no further architectural change intended or required).
- **Engineering:** completed; all stages merged to `main`.
- **Acceptance:** pending owner (Operational Acceptance §7/§8 on the Preview).
- **Production activation:** pending owner decision (§9/§10/§11).
- **Remaining engineering work:** none.
- **Additional PRs required before owner acceptance:** none.

---

## 16. Owner Sign‑off

| Item | Decision | Date | Owner |
|---|---|---|---|
| Operational Acceptance (UAT §7/§8 passed) | ☐ Accepted ☐ Rejected | __________ | __________ |
| Production Approval (§9 GO) | ☐ Approved ☐ Held | __________ | __________ |
| Feature Flag Decision (§10) | ☐ Keep OFF ☐ Enable Preview ☐ Enable Production ☐ Remove | __________ | __________ |
| Project Closure | ☐ Closed | __________ | __________ |

_Owner signature: ______________________  Date: _______________

---
*This document is the official closure package for P‑RECEIPT‑ALLOCATION. Engineering is complete; no further development is proposed.*
