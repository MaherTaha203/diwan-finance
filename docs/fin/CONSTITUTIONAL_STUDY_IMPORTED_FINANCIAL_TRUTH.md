# Constitutional Study — Does adopted Excel data become Financial Truth?

**This is a study only.** No code, no design, no architecture, no tables, no plan. It answers eight questions and locates the **First Constitutional Divergence** by engineering evidence.

**The rule you have ratified:** adopted Excel data is the **official financial truth** for that member-year. If the file says `2025 = paid, 2026 = unpaid`, that holds **regardless** of `paid_amount_ils = 730 / 1800 / …`; those amounts are **not ERP events** and **may not be reinterpreted by FD-002**.

> **الخلاصة:** الاستيراد يدخل النظام من **بابين منفصلين**: باب **مالي** (`paid_amount_ils` في `member_subscriptions`) يستهلكه محرك الاشتقاق بحرية (netting + FD-002)، وباب **عرض** (`historical_subscription_truth`) يحمل الحالة المعتمدة لكنه **لا يحكم المال**. لذلك اليوم: المبلغ المستورد جزءٌ من الحقيقة المالية **لكنه قابل لإعادة التفسير**، والحالة المعتمدة **مجرد طبقة عرض**. أول انحراف دستوري ليس في تقرير المديونية، بل **قبله بكثير**: في `FIN.memberStatement` حيث يُعامَل `paid_amount_ils` كدفعة عضو قابلة للمقاصّة عبر السنوات (fin.js:60-62 → 114-115)، ثم في `FIN.memberAllocation` حيث يُعاد توزيع الفائض عبر FD-002 (fin.js:197). تقرير المديونية **ضحية** لرقمٍ خاطئ وُلِد قبله.

---

## 1. Does adoption make the Excel data Financial Truth, or only Presentation Truth?

**As you rule it: it must be Financial Truth. As the system is built today: it is split — and neither door implements your rule.** The import enters through **two disconnected channels**:

| Channel | Object | What it is today | Governs the money? |
|---|---|---|---|
| **Amount channel** | `member_subscriptions.paid_amount_ils` (written once by the Phase-15 migration) | consumed **directly** by the financial engine as a member payment | **Yes — but freely reinterpretable** by netting + FD-002 |
| **Status channel** | `historical_subscription_truth` (the owner's adopted review) | applied **only** as a display override, far downstream | **No — presentation only** (`fin.js:386-391`) |

So the honest answer: **the imported *amount* is already inside the financial truth, but as raw, reinterpretable fuel; the adopted *status* is only presentation.** Your rule requires the **adopted** fact to be the financial authority. The system does the opposite: it lets the **raw amount** drive the money and demotes the **adopted** fact to a cosmetic override. **That inversion is the root defect.**

## 2. If it is Financial Truth, may any later logic (FD-002 / memberAllocation / any derivative) reinterpret it or change its financial effect?

**No.** If the adopted year is financial truth, it is a **settled, frozen fact**: `2026 = unpaid` means 2026 is owed, full stop; `2025 = paid` means 2025 is closed and its amount is **not** a live credit to be spent elsewhere. Any step that (a) nets one adopted year's amount against another year, or (b) pools an adopted overpayment and re-allocates it across years, is **reinterpreting frozen truth as a live ERP event** — precisely what you forbid. FD-002 is constitutionally for **ERP events after go-live**, never for the imported snapshot.

## 3. If reinterpretation is forbidden, where in the system does that forbidden interpretation first occur?

At the point where the financial engine **reads `paid_amount_ils` and treats it as a fungible, allocatable member payment** — which happens **before any report**, in two sibling consumers of the raw field:

- **`FIN.memberStatement`** — builds a generic *paid* credit row from the snapshot and nets it member-wide:
  - `fin.js:60-62` — `const paid = Number(s.paid_amount_ils||0); if(paid>0) rows.push({… cr:paid, cls:'paid'})` → the 2025 snapshot (730) becomes a plain credit.
  - `fin.js:114-115` — `totalPaid = Σ paid rows` and `finalBalance = openingDebt + totalDues − totalPaid − …` → **no per-year attribution**: 2025's 730 offsets 2026's 200 inside one member-level balance.
- **`FIN.memberAllocation`** — pools the overpayment and redistributes it across years via the FD-002 waterfall:
  - `fin.js:196-201` — reads `paid`, seeds each year's remaining, and `pool = r2(pool + Math.max(0, paid−due))` (**line 197**) sends the 530 excess into the unattributed pool.
  - the ordered engine then spends that pool on the oldest unpaid year → **marks 2026 settled** from 2025's imported surplus.

**Neither consults `historical_subscription_truth`.** The adopted truth has *no authority* at the moment the money is computed.

## 4. Is the problem in the Annual Debt report, or is the report only showing the result of a problem that happened before it?

**The report is not the problem. It faithfully displays a number that was already made wrong upstream.** We already established (previous study) that Annual Debt is a *financial* report (IG-006 signed balance). Its `current` balance and `selPaid` are **inherited** from `memberStatement.finalBalance` and `memberAllocation.byYear.paid` (`fin.js:576, 586`). It has no independent status derivation and no way to know the adopted truth. **It is the messenger, not the origin.**

## 5. What is the first component that emits the wrong financial number that later reaches the Annual Debt report?

**`FIN.memberStatement`** — specifically `finalBalance` at `fin.js:115`, built from the imported `paid_amount_ils` credit rows at `fin.js:60-62`. This is the **canonical member balance**, and it is the first place the imported amount is netted across years without per-year attribution or truth authority.

For the **per-year** status figure, the wrong number is emitted by **`FIN.memberAllocation`** (`byYear[y].remaining/settled`, seeded at `fin.js:197` + the waterfall) — and note `memberAllocation.outstanding` is itself `memberStatement.finalBalance` (`fin.js:241`), so **memberStatement is the deepest origin** and memberAllocation compounds it per-year.

## 6. Does more than one report depend on this number, or is Annual Debt the only place it appears?

**Many reports depend on it — Annual Debt is merely one consumer.** The same `memberStatement` / `memberAllocation` output feeds:

| Surface | Consumes | Evidence |
|---|---|---|
| Member Statement | `memberStatement.finalBalance` | `fin.js:33`, `report-model.js:736` |
| Delinquent | `memberDelinquency` → `memberAllocation` | `reports.js:148` |
| Dues | `memberDelinquency().byYear` | `dues-workspace.js:77` |
| Dashboard | `memberDelinquency` (`unpaidCount`/`isDelinquent`) | `app.js:681` |
| Annual Debt | `memberStatement` + `memberDelinquency().byYear` | `fin.js:576, 586` |

The single-source design (FD-006) means they **all** inherit the same upstream number. (Display **status** is truth-overridden only inside `memberDelinquency.byYear.status`, which is why the *status* columns look right while the *money* stays wrong — the override patches the symptom on one branch, not the source.)

## 7. Would fixing this one point automatically correct all financial reports that depend on the same value?

**Yes — by construction.** Because every financial surface derives from the same `memberStatement` / `memberAllocation` output (FD-006: one source, no surface derives its own — `fin.js:561-564`), correcting how the **adopted import is interpreted at that origin** propagates to *all* consumers simultaneously — Statement, Delinquent, Dues, Dashboard, and Annual Debt — with no per-report change. Conversely, patching any single report (as the earlier status-marker idea did) fixes one symptom and leaves the rest wrong: proof that the origin, not the report, is the correct locus.

## 8. The First Constitutional Divergence (not the first user-visible symptom)

**The First Constitutional Divergence is the point at which the system reads the adopted, frozen import (`member_subscriptions.paid_amount_ils`) and feeds it into the live financial derivation as an allocatable ERP-style payment — instead of treating the adopted year as settled financial truth and reading the adopted record as the authority.**

Precisely, in execution order:

1. **Deepest origin — member-level netting:** `FIN.memberStatement`, `fin.js:60-62` (the imported amount becomes a generic *paid* credit) → `fin.js:114-115` (netted into `finalBalance` with no per-year attribution and no truth consultation). This is where the imported amount **loses its per-year identity and becomes fungible money**.
2. **Compounding — cross-year redistribution:** `FIN.memberAllocation`, `fin.js:197` (imported overpayment → FD-002 pool) + the ordered waterfall (spends it on other years). This is where FD-002 **actively reinterprets** the snapshot.

Both share **one** constitutional root: **the adopted truth (`historical_subscription_truth`) has no authority over the money; the raw imported amount does.** The divergence is therefore not a line in the Annual Debt report, nor even solely a line in FD-002 — it is the **architectural moment the import is admitted into the financial engine through the amount-channel while the adopted-truth-channel is denied any financial authority.** Everything downstream is faithful propagation of that first wrong admission.

---

## Direct answers, condensed
1. Today: the **amount** is financial-but-reinterpretable; the **adopted status** is presentation-only. Under your rule it **should** be financial truth — the system does not yet implement that.
2. If financial truth → **no**, no later logic may reinterpret it; today `memberStatement` and `memberAllocation` do.
3. First forbidden interpretation: `memberStatement` (`fin.js:60-62,114-115`) and `memberAllocation` (`fin.js:197`) reading `paid_amount_ils` as a fungible payment.
4. **Not** the Annual Debt report — it displays a pre-existing wrong number.
5. First wrong-number emitter: `FIN.memberStatement.finalBalance` (`fin.js:115`); per-year via `memberAllocation`.
6. **Many** reports depend on it (Statement, Delinquent, Dues, Dashboard, Annual Debt) — not Annual Debt alone.
7. **Yes** — correcting the origin corrects every financial consumer at once (FD-006 single source).
8. **First Constitutional Divergence:** the admission of the frozen adopted import into the live financial derivation via `paid_amount_ils`, with the adopted-truth record holding **no** authority over the money — located at `FIN.memberStatement` (`fin.js:60-62 → 114-115`), compounded at `FIN.memberAllocation` (`fin.js:197`).

**The proof, stated once:** the money is wrong *before* any report runs, because the system trusts the raw imported *amount* over the owner's adopted *truth*. Adoption today confers presentation authority but **not** financial authority — and that gap, not the Annual Debt report, is where the problem actually begins.

---

## Addendum — consumption vs. conversion (precision correction)

An earlier phrasing called `memberStatement()` "the first *consumer* of the wrong value." That is imprecise and is corrected here: **`memberStatement()` is not a consumer of a value produced elsewhere — it is itself a *conversion* site.** There is **no separate converter component**; the conversion is **inlined** at the point each function reads the raw frozen field.

- **The divergence is the conversion, not the consumption.** The constitutional violation is the **act of classifying `paid_amount_ils` as a `paid` (payment) movement** — the instant a frozen, adopted historical snapshot is admitted into the engine as **money** indistinguishable from a live ERP receipt.
- **Site 1 — `memberStatement` (`fin.js:62` → `114-115`):** stamps the snapshot `cls:'paid'` and nets it **fungibly across all years** in `finalBalance`. This is a conversion (snapshot → member-level fungible credit), and it is the **upstream-most** one (its `finalBalance` feeds `memberAllocation.outstanding`, `fin.js:241`).
- **Site 2 — `memberAllocation` (`fin.js:196-197`):** reads the same raw field and pools the overpayment into the FD-002 unattributed pool, which the waterfall then **distributes** to specific other years. This is the literal *"convert into a **distributable** ERP payment"* act.
- These two are **independent siblings**, each reading `member_subscriptions.paid_amount_ils` directly — **not** a producer→consumer chain. Neither consults `historical_subscription_truth`.

**Precise answer to the question "is `memberStatement` only the first consumer, or is the first divergence the place that turns `paid_amount_ils` into distributable ERP payments?":**
It is the **conversion** that is the first divergence — and `memberStatement` is one of the two conversion sites (the upstream-most), **not** a mere consumer. If a single narrowest line is wanted: *fungible payment at all* → `fin.js:62`; *distributable across years* → `fin.js:197`. Both share the one root: **the frozen adopted import is reclassified as money while the adopted-truth record has no authority over it.**

---
**Study only — no code, no architecture, no tables, no plan. `fin.js` at baseline; FD-002 / Allocation Engine / DB untouched.**
