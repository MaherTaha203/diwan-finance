# P-RECEIPT-ALLOCATION · Integration Review & User Acceptance

**A short quality gate between PR-7 and PR-8. Read-only: no runtime behaviour changes (the feature flag stays OFF by default). It proves PR-1..PR-7 compose into one coherent, allocation-aware settlement system with exactly one authority per capability, and hands the owner an acceptance package.**

## ملخّص للمالك (Arabic summary)
- كل مراحل PR‑1 حتى PR‑7 مدموجة في `main` وتعمل معاً بشكل متكامل.
- **مرجع واحد للقراءة** (`FIN.memberAllocation`)، و**سلطة واحدة** لكل عملية: الإنشاء، الإلغاء (void)، الاسترداد (refund).
- طوال دورة الحياة كاملة (إنشاء تسوية → قراءة → إلغاء → استرداد جزئي ثم كلّي) يبقى الثابت: **المتبقّي = الرصيد النهائي في كشف العضو** — لا اختلال في أي خطوة.
- عندما يكون الـ Feature Flag مغلقاً (الوضع الافتراضي): النظام **مطابق بايت‑ببايت** للسلوك الحالي (Golden Reference). الاستردادات القديمة (Legacy) لم تتغيّر.
- لا يُكتب إطلاقاً إلى `paid_amount_ils` ولا `member_subscriptions`؛ ولا مساس بـ FD‑002 أو الخزينة أو دفتر الأستاذ أو مجاميع كشف العضو.
- **التوصية:** جاهز للقبول والانتقال إلى PR‑8 عند موافقتك.

## 1. Scope & Method
Read-only verification. No schema change, no runtime code change — only a new cross-PR integration test and this document. The integration test loads the **real** `fin.js` engine + allocation engine and drives one member through the complete lifecycle, recomputing `FIN.memberAllocation` and `FIN.memberStatement` after each authority acts.

## 2. Integrated Architecture (as merged)
| Capability | Single authority | Runtime entry point | Reversal marker |
|---|---|---|---|
| Post explicit settlement | `create_receipt_with_settlement` (RPC, SECURITY DEFINER) | `saveRec` → `ReceiptSettlement.postFromForm` (PR-4) | — |
| Read attribution | `FIN.memberAllocation` (sole reader of `allocation_records`) | every report via `memberDelinquency` (PR-5) | — |
| Cancel → void lines | `void_receipt_settlement` (RPC) | `BusinessOps.cancelVoucher` BO-03 → `ReceiptSettlement.cancel` (PR-6) | `voided_at` |
| Refund → reverse lines | `refund_receipt_settlement` (RPC) | `BusinessOps.refundReceipt` BO-11 → `ReceiptSettlement.refund` (PR-7) | `refunded_at` |

`data.js` only **loads** `allocation_records` (flag-gated); it is not a reader. The PR-4 RLS fence makes the three `SECURITY DEFINER` RPCs the only writers of settlement rows; clients cannot write them directly.

## 3. Combined Invariants — verified (`tests/pralloc-integration-review.test.cjs`, 35/35)
- **Composition invariant at every step:** `memberAllocation().outstanding === memberStatement().finalBalance`.
- **One authority per capability** (repository scan): read = `[fin.js, data.js]`; create/void/refund RPCs each called by exactly `[receipt-settlement.js]`; `operations.js` delegates and never calls a settlement RPC directly.
- **No second-source writes:** `receipt-settlement.js` and all three RPCs never reference `paid_amount_ils` / `member_subscriptions`.
- **Flag defaults OFF** in every gating module; `data.js` issues no settlement query when OFF.

## 4. Lifecycle Walkthrough (one member owing 2026/2027/2028 = 600)
| Step | Authority | Action | Outstanding | == finalBalance | Attribution |
|---|---|---|---|---|---|
| S1 | create | post R1=400 → 2027+2028 | 200 | ✓ | 2027,2028 settled |
| S2 | create | post R2=200 → 2026 | 0 | ✓ | all settled |
| S3 | void | cancel R2 | 200 | ✓ | 2026 back; 2027,2028 settled |
| S4 | refund | partial refund R1 (2028 line) | 400 | ✓ | 2027 stays; 2026,2028 owed |
| S5 | refund | full refund R1 (2027 line) | 600 | ✓ | nothing settled |

Every transition keeps the breakdown consistent with the frozen total — cancellation and refund only change **which** obligation is settled, never a total.

## 5. Golden Reference Comparison
- A fully-reversed lifecycle (R1 fully refunded + R2 cancelled) yields **600 owed, identical ON vs OFF**.
- `memberStatement.finalBalance` is **identical ON vs OFF** (memberStatement never reads the flag; it is untouched by all seven PRs).
- A purely-legacy member is **byte-identical ON vs OFF** (`JSON.stringify` equal).
- Full JS suite: **79 green / 2 known-red** (`business-operations-slice1`, `constitutional-explicit-q5` — pre-existing baseline, unrelated).

## 6. Migration Sequence (all on `main`, additive)
`pr1_foundation` (notes col + scoped unique index + RPC skeleton) → `pr2_atomic_engine` (create RPC body) → `pr4_settlement_rls` (RLS fence + grant create) → `pr6_void` (`voided_at` + void RPC) → `pr7_refund` (`refunded_at` + refund RPC). Each is idempotent and touches no existing data. Applied to production by the merge pipeline.

## 7. Security Posture
Clients cannot INSERT/UPDATE/DELETE `source_kind='receipt_settlement'` rows (PR-4 RLS). The three RPCs are `SECURITY DEFINER`, revoked from `public`/`anon`, granted to `authenticated`. The dormant MODEL2 audit recorder (`source_kind` `allocation`/`credit_consumption`) is unaffected (source_kind-scoped policies).

## 8. User Acceptance (UAT) — owner checklist
Perform on a **staging / preview** deployment (never enable the flag in production before sign-off).

1. **Enable the flag** in the browser console of the preview: `window.RECEIPT_ALLOCATION_ENABLED = true;` then reload (loads settlement rows). Leave production OFF.
2. **Post** a member food receipt and use the Settlement Editor to split it across specific years / historical / donation / credit; Save. → Confirm the years you chose show settled (not oldest-first).
3. **Read** the member statement & debt report. → Confirm `outstanding` matches the member's Final Balance and the chosen years are the ones marked paid.
4. **Cancel** that receipt (BO-03). → Confirm the settled years revert exactly; Final Balance/Treasury/Ledger unchanged versus a legacy cancellation.
5. **Refund** an explicitly-settled receipt, partial (select lines) then full. → Confirm only the selected obligations reopen (partial) / all reopen (full), and repeated refund is rejected.
6. **Golden Reference:** with the flag **OFF**, confirm a legacy member/receipt/refund shows exactly today's numbers.
7. **DB self-tests** (optional, on a dev/branch DB): run `tests/pralloc-pr2-atomic-rpc.sql`, `pralloc-pr4-rls.sql`, `pralloc-pr6-void.sql`, `pralloc-pr7-refund.sql` — each rolls back.

**Acceptance criteria:** every step above behaves as described; flag OFF is byte-identical; no `paid_amount_ils`/`member_subscriptions`/FD-002/Treasury/Ledger movement attributable to settlement.

## 9. Rollback Plan
Set/leave `window.RECEIPT_ALLOCATION_ENABLED = false` (default) ⇒ the entire settlement pipeline is inert and behaviour is today's. The additive columns (`notes`, `voided_at`, `refunded_at`) and the three RPCs may remain harmlessly; a full DB unwind is `drop function …; alter table allocation_records drop column …`. No existing data is altered by any PR.

## 10. Recommendation
PR-1..PR-7 are **integrated, coherent, and acceptance-ready**. The system exposes exactly one authority per capability, preserves the Golden Reference with the flag OFF, and keeps `outstanding == finalBalance` through the full post/cancel/refund lifecycle. **Ready for owner acceptance and, on approval, PR-8.** No PR-8 work will begin without explicit approval.
