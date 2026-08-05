# P-RECEIPT-ALLOCATION — Production Activation Package

**Production Activation is IMPLEMENTED BY THIS PR.** The bootstrap feature flag `RECEIPT_ALLOCATION_ENABLED` is set ON in `public/index.html`, so on merge Receipt Allocation is active in production. Refund is COMPLETELY OUT OF SCOPE (`MODEL2_ALLOCATION_ENABLED` remains OFF, no Refund UI). Receipt Cancellation is the only operational reversal mechanism.

Repository: `diwan-finance` · target branch: `main` · activation carrier: this PR.

## 1. Activation Scope (owner‑final)
| Capability | Status |
|---|---|
| Receipt Allocation (explicit settlement posting) | **IN SCOPE** |
| Settlement Editor | **IN SCOPE** |
| Allocation Reading (attribution → reports/statements) | **IN SCOPE** |
| Receipt Cancellation (void of settlement lines) | **IN SCOPE — the only operational reversal** |
| Refund | **OUT OF SCOPE** — separate flag, stays OFF; no UI entry point on activation |

## 2. Activation Mechanism (official production activation path)
The official Production Activation mechanism for this project is the bootstrap feature flag (`window.RECEIPT_ALLOCATION_ENABLED`), which is evaluated by all Receipt Allocation consumers during application startup. This project intentionally provides no runtime settings or environment-based activation surface.

**This PR performs that activation:** `public/index.html` sets `window.RECEIPT_ALLOCATION_ENABLED = true` at bootstrap, before the deferred bundle loads, so every consumer evaluates it as active at startup. It remains a reversible toggle (set to `false` to roll back).

- `RECEIPT_ALLOCATION_ENABLED = true` (set by this PR) → activates posting (atomic RPC), the Settlement Editor, allocation reading, and settlement‑aware cancellation.
- `MODEL2_ALLOCATION_ENABLED` → **intentionally NOT set (remains OFF).** It independently gates refund execution; keeping it off keeps refund entirely dormant. The refund UI is also gated on this flag, so **no refund control appears** while Receipt Allocation is active.

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
3. **Confirm flags** — `RECEIPT_ALLOCATION_ENABLED` is set true in code by this PR (`index.html`); `MODEL2_ALLOCATION_ENABLED` is not set (stays false).
4. **Merge & deploy** this PR — merging is what activates Receipt Allocation in production (the flag is already ON in the bundle). No separate enable step is required.
5. **Smoke test** on production with a controlled test member (Section 5).
6. **Confirm no refund control** appears anywhere in the receipt UI.

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
- **Activation carrier:** THIS PR. `public/index.html` sets `RECEIPT_ALLOCATION_ENABLED = true` at bootstrap, so **merging this PR is the production activation** — Receipt Allocation becomes active on deploy with no separate enable step.
- **Code state:** merged `main` @ `461e6f1` + this activation (flag ON + refund held out of the activation surface). Full automated suite: **80 green / 2 pre‑existing known‑red** (`business-operations-slice1`, `constitutional-explicit-q5`).
- **In scope, active on merge:** posting (single atomic authority), Settlement Editor, allocation reading, cancellation (single reversal authority).
- **Out of scope, confirmed dormant:** refund — `MODEL2_ALLOCATION_ENABLED` not set; the refund UI is gated on that flag, so activation exposes no refund path.
- **Accounting:** no engine/authority/total change; existing balances unchanged (the read seam is neutral until settlement records exist).
- **Blockers to go‑live:** none. Post‑merge operational steps: confirm DB objects live (Section 4.1), backup, run Section 5 UAT.
- **Reversal:** single toggle (Section 6).

## 8. Owner Memo
Receipt Allocation is now activated **by this PR**: `RECEIPT_ALLOCATION_ENABLED` is set ON in the bundle, so merging turns on explicit settlement posting, the editor, allocation‑aware reports, and settlement cancellation in production. It changes **workflow** (allocation becomes explicit at posting) but not **financial totals** — Final Balance, Treasury, Ledger, Historical Truth, `paid_amount_ils`, and `member_subscriptions` are unaffected except through the new settlement records. **Refund is deliberately excluded**: its execution flag stays off and its UI does not appear, so **Receipt Cancellation is the only reversal available to accountants.** Refund can be activated later as a separate decision without any further allocation work. To roll back at any time, set the flag to false and redeploy.

---
*Refund appears in this document only to state its exclusion. It is not part of Production Activation, the deployment checklist, the go‑live path, or the operational reversal mechanism.*
