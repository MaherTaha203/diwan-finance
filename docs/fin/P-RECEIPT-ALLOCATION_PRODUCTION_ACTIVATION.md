# P-RECEIPT-ALLOCATION — Production Activation Package

**Scope‑final release package for activating Receipt Allocation in production. Refund is COMPLETELY OUT OF SCOPE and does not participate in this activation. Receipt Cancellation is the only operational reversal mechanism.**

Repository: `diwan-finance` · target branch: `main`.

## 1. Activation Scope (owner‑final)
| Capability | Status |
|---|---|
| Receipt Allocation (explicit settlement posting) | **IN SCOPE** |
| Settlement Editor | **IN SCOPE** |
| Allocation Reading (attribution → reports/statements) | **IN SCOPE** |
| Receipt Cancellation (void of settlement lines) | **IN SCOPE — the only operational reversal** |
| Refund | **OUT OF SCOPE** — separate flag, stays OFF; no UI entry point on activation |

## 2. Activation Mechanism (official production activation path)
Receipt Allocation is activated by setting the runtime flag **`window.RECEIPT_ALLOCATION_ENABLED = true`** at application bootstrap (before the JS bundle loads). This is a deliberate deploy‑time toggle — there is no separate settings/env surface, by design (no new activation architecture was introduced).

- `RECEIPT_ALLOCATION_ENABLED = true` → activates posting (atomic RPC), the Settlement Editor, allocation reading, and settlement‑aware cancellation.
- `MODEL2_ALLOCATION_ENABLED` → **leave unset/false.** It independently gates refund execution; keeping it off keeps refund entirely dormant. The refund UI is now also gated on this flag, so **no refund control appears** while Receipt Allocation is active.

Both flags default OFF; nothing activates until the flag above is explicitly set.

## 3. What activation does (verified against merged `main`)
- **Single posting authority.** With the flag on, `saveRec` routes every receipt through `ReceiptSettlement.postFromForm` → `SB.rpc('create_receipt_with_settlement')` and returns; the legacy posting body never runs (`crud.js:70`, `receipt-settlement.js:90`). The atomic RPC is the only settlement writer; direct client writes are blocked by RLS (PR‑4).
- **Settlement Editor.** `openRec` mounts the editor into the receipt form when enabled (`forms.js:63` → `receipt-settlement.js` `mountInReceiptForm`, slot `#rec-settlement`).
- **Allocation Reading.** `FIN.memberAllocation` is the sole reader of settlement attribution; all reports/statements/debt/delinquent/subscriptions/dashboard derive from it via `memberDelinquency`.
- **Single reversal authority.** Cancellation (`deleteRec` → `BusinessOps.cancelVoucher` → `void_receipt_settlement`) is the only operational reversal; gated on `RECEIPT_ALLOCATION_ENABLED` (`operations.js:199`), independent of the refund flag.
- **No accounting‑total change.** `FIN.memberStatement`, Final Balance, Treasury, Ledger, Historical Truth, `paid_amount_ils`, `member_subscriptions` are untouched; activation only records explicit settlement lines. `outstanding == memberStatement.finalBalance` holds (Integration Review, 35/35).

## 4. Production Deployment Checklist
1. **Confirm database objects are live** (read‑only):
   - `select proname from pg_proc where proname in ('create_receipt_with_settlement','void_receipt_settlement');` → expect **2** (refund RPC not required for this scope).
   - `select column_name from information_schema.columns where table_name='allocation_records' and column_name in ('notes','voided_at');` → expect **2**.
   - Migrations present in the repo: `pralloc_pr1_foundation`, `pralloc_pr2_atomic_engine`, `pralloc_pr4_settlement_rls`, `pralloc_pr6_void` (the `pralloc_pr7_refund` migration is additive and harmless but **not required** for this scope).
2. **Backup** — take/verify a current DB restore point.
3. **Confirm flags** — `RECEIPT_ALLOCATION_ENABLED` will be set true at activation; `MODEL2_ALLOCATION_ENABLED` stays false.
4. **Deploy** the merged code (no code change is required to keep refund dormant — the refund UI is now flag‑gated on the refund flag).
5. **Enable** — set `RECEIPT_ALLOCATION_ENABLED = true` via the bootstrap and deploy.
6. **Smoke test** on production with a controlled test member (Section 5).
7. **Confirm no refund control** appears anywhere in the receipt UI.

## 5. Live Operational UAT Checklist (post‑activation)
Perform as an administrator on the activated environment.
- ☐ Open a receipt → the Settlement Editor is present.
- ☐ Post to **one year** → that year settled; others unchanged.
- ☐ Post a **multi‑year / historical‑deficit split** → each destination settled exactly; `outstanding == Final Balance`.
- ☐ Verify reports reconcile: **Member Statement, Annual Debt, Delinquent, Subscriptions, Dashboard, Treasury, Ledger.**
- ☐ **Cancel** an explicitly‑settled receipt → settled years revert; Treasury/Ledger equal a legacy cancellation; repeat cancel rejected.
- ☐ Confirm **no Refund action is visible** on any receipt (refund out of scope).
- ☐ Golden Reference: a legacy member/receipt shows unchanged numbers.

**Pass criteria:** every box checked; no `paid_amount_ils`/`member_subscriptions`/FD‑002/Treasury/Ledger movement beyond the explicit settlement records; no refund entry point present.

## 6. Rollback Procedure (operational)
1. Set **`RECEIPT_ALLOCATION_ENABLED = false`** and redeploy. The pipeline becomes inert and behaviour returns to the Golden Reference **with no data change**; the legacy posting path resumes.
2. Settlement lines and cancellations already recorded remain valid, immutable audit history (safe to leave).
3. No schema rollback is required; the additive columns/RPCs are harmless when unused.

## 7. GO‑LIVE Report
- **Code state:** merged `main` @ `461e6f1` + this activation change (refund removed from the activation surface). Full automated suite: **80 green / 2 pre‑existing known‑red** (`business-operations-slice1`, `constitutional-explicit-q5`).
- **In scope, verified wired:** posting (single atomic authority), Settlement Editor, allocation reading, cancellation (single reversal authority).
- **Out of scope, confirmed dormant:** refund — separate flag OFF, and the refund UI is now gated on that flag, so activation exposes no refund path.
- **Blockers to go‑live:** none architectural. Remaining are operational: confirm DB objects live, take backup, set the flag, run Section 5 UAT.
- **Reversal:** single toggle (Section 6).

## 8. Owner Memo
Receipt Allocation is ready for production activation. Activation is a single, reversible toggle (`RECEIPT_ALLOCATION_ENABLED = true`); it turns on explicit settlement posting, the editor, allocation‑aware reports, and settlement cancellation. It changes **workflow** (allocation becomes explicit at posting) but not **financial totals** — Final Balance, Treasury, Ledger, Historical Truth, `paid_amount_ils`, and `member_subscriptions` are unaffected except through the new settlement records. **Refund is deliberately excluded** from this activation: its execution flag stays off and its UI no longer appears, so **cancellation is the only reversal available to accountants.** Refund can be activated later as a separate decision without any further allocation work. To roll back at any time, set the flag to false and redeploy.

---
*Refund appears in this document only to state its exclusion. It is not part of Production Activation, the deployment checklist, the go‑live path, or the operational reversal mechanism.*
