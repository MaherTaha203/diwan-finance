# Minimal Status Fix — Report (no code, no migration, no new design)

**Scope:** find the *single smallest* place to enforce the business rule below, with **FD-002 untouched**, **no new layers/tables/Repository/Resolver/Materializer**, **no accounting/amount change**.

**Business rule (final):**
- A year **with** an approved Historical Truth → show that status **as-is**, whatever `paid_amount_ils` is (730/1800/…). It is a historical **snapshot**, never re-interpreted, never redistributed, never fed through FD-002.
- A year **without** Historical Truth → show the **current FD-002** result as-is.

> **الخلاصة بالعربية:** القاعدة المطلوبة (سنة لها Truth ⇐ استخدمها؛ وإلا ⇐ FD-002) **منفّذة فعلاً** في نقطة واحدة: `FIN.memberDelinquency().byYear[y].status` (سطر fin.js:165-168)، وتقرأ من جدول `historical_subscription_truth` الموجود. ثلاثة تقارير من خمسة تمرّ منها فعلاً (المتأخرون، الاشتراكات، لوحة التحكم). **تقرير المديونية** هو الوحيد الذي يعرض «الحالة» ضمنيًا من مبالغ FD-002 دون تمريرها عبر هذه النقطة، فهو المكان الوحيد الذي يحتاج تصحيحًا. **كشف العضو** لا يعرض حالة سنوية أصلًا. **لا حاجة لأي تغيير في قاعدة البيانات، ولا في FD-002، ولا في المبالغ.**

---

## 1. The single point that can be modified

**`FIN.memberDelinquency()` — specifically the per-year status it emits at `public/js/fin.js:165-168`:**

```
const t = truth[Number(y)] || null;                 // truth[y] from subscriptionTruth()
const settled = t ? t==='paid' : derivedSettled;    // truth wins, else FD-002
byYear[y] = { …, settled,
  status: t || (derivedSettled ? 'paid'
                : ((p.due-remaining) > 0.005 ? 'partial' : 'unpaid')),  // truth || FD-002
  authoritative: !!t };
```

This line **already is** the requested rule: `status = truth-if-exists ELSE FD-002`. The truth comes from `FIN.subscriptionTruth()` (`fin.js:394`), which reads the **existing** `historical_subscription_truth` table (already loaded at `data.js:79`). It sits **on top of** FD-002 (read-time), so FD-002 itself is never touched.

## 2. Why it is the best point

- **It already implements the exact rule** — nothing new to invent; the seam exists.
- **It is the one accessor every status-showing report already funnels through** (the code calls it the single "FD-011 accessor", `fin.js:149-152`). Fixing/aligning here fixes all of them at once.
- **It respects every prohibition:** it is *downstream* of FD-002 (engine unchanged); the truth is **presentation-only** (never enters any balance/ledger/amount — `fin.js:386-391`); no new table (`historical_subscription_truth` already exists and is already loaded); no new layer/Repository/Resolver/Materializer.
- **Zero DB change, zero accounting change.**

## 3. Do all five reports actually pass through it?

| Report | Reads `memberDelinquency().byYear`? | Displayed **status** is truth-aware? | Evidence |
|---|---|---|---|
| **المتأخرون / Delinquent** | ✅ `byYear.status` + `authoritative` | ✅ **Yes** | `report-model.js:362-371` (`delStatus`), `reports.js:148,167` |
| **الاشتراكات / Dues** | ✅ `byYear.settled` | ✅ **Yes** (settled) | `dues-workspace.js:77-82` |
| **لوحة التحكم / Dashboard** | ✅ `memberDelinquency().unpaidCount` | ✅ **Yes** (`unpaidCount` counts `!settled`, truth-aware) | `app.js:681` |
| **كشف العضو / Member Statement** | ❌ uses `memberStatement` | — **shows no per-year paid/unpaid status** (it is a financial ledger: movements + final balance) | `fin.js:33`, `report-model.js:736`; truth explicitly *not* consumed here by design (`fin.js:390`) |
| **تقرير المديونية / Annual Debt** | ⚠️ reads `byYear.paid` (**amount only**) | ❌ **No** — it shows **no status column**; it conveys paid/unpaid **only through FD-002 amounts** (`selPaid`) | `fin.js:586`, `report-model.js:320-356` (columns are money/text; no status) |

So: **three of five already agree** through the single point. The Member Statement shows no year-status to disagree about. **Only the Annual Debt report presents a paid/unpaid picture that does not pass its status through this point.**

## 4. Is there a report that derives status directly and must be corrected?

**Yes — exactly one: تقرير المديونية / Annual Debt.**

- It no longer reads raw `paid_amount_ils` (that old bug is already fixed — it now uses `byYear.paid`, `fin.js:586`).
- But it still expresses "paid/unpaid" **purely via the FD-002 amount** `selPaid = due − remaining`. For a year the owner marked **unpaid** whose money was **surplus-settled by FD-002** (the 730-vs-200 case), the Annual Debt row shows `selPaid = full` → the member looks **paid**, while the Delinquent report correctly shows **`✗ غير مسدد ●`** (truth). **That is the remaining disagreement.**

**The correction (minimal, within all prohibitions):** carry the already-computed `byYear[y].status`/`settled` (truth-aware) into the Annual Debt presentation so its **paid/unpaid classification** matches the other reports — **without changing the money columns** (`selSub/selPaid/current` stay FD-002-derived, as the constitution requires: truth "never [touches] debt report figures", `fin.js:391`).

> **Honest boundary (needs your explicit call):** making the Annual Debt **money** (`selPaid`/balance) *also* reflect a truth-unpaid year is **impossible** without either changing FD-002 or overriding amounts — **both are forbidden** by your rules. So the minimal fix aligns the **status/classification** everywhere; the **amount** columns remain FD-002 by design. If you want the debt-report *money* to change for surplus-settled truth-unpaid years, that is a separate decision outside "minimal / don't touch FD-002 / don't change amounts."

## 5. Minimum number of files changed

- **1 file** if the truth-aware status is surfaced in the Annual Debt model only: `public/js/report-model.js` (`buildAnnualDebtModel` — add a truth-aware paid/unpaid marker, reading a status the row already can carry).
- **At most 2 files** if the per-year status must first be threaded into the debt row model: `public/js/fin.js` (`debtReportRows` — attach `byYear[y].status` to each row; it already loops `byYear`) **+** `public/js/report-model.js` (display it).

No other file changes. **The other four reports need no change.**

## 6. Can the fix be done with **no** database change?

**Yes — entirely, with zero DB change.** `historical_subscription_truth` already exists, is already loaded (`data.js:79`), and is already read by `subscriptionTruth()`. No migration, no new column, no new table. The single point and the truth source are all already present in the running code.

## 7. Brief implementation plan

1. **Confirm the single point** (`memberDelinquency().byYear[y].status`) is authoritative for status — done (§1); it already returns `truth || FD-002`.
2. **Thread the status into the Annual Debt row** — in `debtReportRows` attach the already-available `byYear[y].status`/`settled` to each member row (no amount touched).
3. **Display it** — in `buildAnnualDebtModel`, show a truth-aware paid/unpaid marker (same semantics/● marker the Delinquent report uses via `delStatus`), leaving `selSub/selPaid/current` numbers unchanged.
4. **Reconciliation test** — assert, for every member × year, that the displayed **status** is identical across Annual Debt = Delinquent = Dues = Dashboard, and all equal `memberDelinquency().byYear[y].status`; and assert every money figure is **byte-identical** before/after.
5. **Verify prohibitions** — no change to FD-002/`memberAllocation`/allocation-engine, no amount change, no DB change; suite green.

**Result:** one truth-aware status point, already feeding 3 reports, extended to the 4th (Annual Debt) as a *classification* only — so all reports show the **same status always**, with FD-002, amounts, and the database completely untouched.

---
**Report only — no code, no PR, no migration, no new design. `fin.js` at baseline; FD-002 / Allocation Engine / business rules / DB untouched.**
