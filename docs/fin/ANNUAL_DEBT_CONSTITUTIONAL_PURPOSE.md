# The Constitutional Purpose of the Annual Debt Report (study only)

**Question:** is the Annual Debt report **(A)** a financial report of the accounting movement produced by FD-002 only, or **(B)** a report expressing the member's adopted annual subscription *status*?

**Answer: it is (A) — unambiguously — and the system's own constitution already says so.** Therefore **no "مسدد/غير مسدد" status may appear inside it at all.** My earlier suggestion to add a truth-aware status marker to it is **withdrawn**: you are correct that it would put two different truths in one row, and it also contradicts the existing architecture.

> **الخلاصة:** تقرير المديونية هو **(A)**: تقرير **مالي/محاسبي** ناتجه **رصيد موقّع (مدين/دائن)** من معادلة IG-006. لا يحمل — ولا يجوز أن يحمل — حالة «مسدد/غير مسدد». والدليل الحاسم: النظام **أصلاً** يملك تقريرًا منفصلاً للحالة هو **تقرير المتأخرين**، وهو الذي يملك خلايا الحالة السنوية وعلامة الحقيقة المعتمدة `●`. فصلٌ دستوري متعمَّد: **المديونية = مال، المتأخرون = حالة.** إذًا الإصلاح الصحيح هو: **لا نُدخل الحالة في تقرير المديونية إطلاقًا** — سطرٌ واحد، مصدرٌ واحد (FD-002/الدفتر).

---

## The determination: (A) — a financial money report

**Its constitutional output is a signed money balance, not a status.** Evidence, from the system's own definitions:

1. **The IG-006 identity is pure money** (`fin.js:561-570`):
   `current = hist + duesAll − paidAll − resolutions`
   Every term is a currency amount; the result `current` is a **signed final balance (Dr/Cr)**. There is no status term anywhere in the model.

2. **All nine columns are money/identity, ending in a signed balance** (`report-model.js:323-332`): `hist`, `histPaid`, `selSub`, `selPaid`, `resolutions`, `current` — formats `money`/`balance`. **There is no paid/unpaid column.** The totals row sums money and deliberately excludes `current` (`report-model.js:354-355`).

3. **It classifies members by balance sign, not by payment status** — the filters are **debtors / creditors / zero-balance** (`reports.js:40`), i.e. *how much money*, never *paid vs unpaid*.

4. **FD-006 / FD-013 govern it as a single-source *financial* model** (`fin.js:561-564`): screen, print and Excel show byte-identical **figures**, and no surface derives its own. It is a money ledger with one authoritative numeric source.

5. **The decisive structural fact — status already has its own separate report.** The governing spec `REPORT-001_R7b_DEBT_DELINQUENT.md` ships **two distinct reports**:
   - **Annual Debt** → "the certified IG-006 model … `current` is a **signed balance** (Dr/Cr)" (spec §Design; `report-model.js:320`).
   - **Delinquent** → **dynamic per-year status cells**: `✓ مسدد`, `✗ <remaining> ₪`, `◐ جزئي`, **and the Owner-approved `●` marker for authoritative (Truth) years** (spec lines 48-51; `report-model.js:362-371` `delStatus`).

   Paid/unpaid **status**, and the Historical-Truth `●` marker, **already live in the Delinquent report by constitutional assignment** — not in the Debt report. The two were separated on purpose.

**Conclusion:** the Annual Debt report answers **"how much money does this member owe or hold as credit?"** It does **not** answer "did they pay year X?" — that is the Delinquent report's job.

---

## Consequence for the fix (per your own dichotomy)

You framed it exactly: *if (A), then "مسدد/غير مسدد" may never be shown inside it.* Since it **is** (A):

- **The correct fix is to add nothing.** The Annual Debt report must show **one source per row — FD-002/ledger money — and no status.** It already does (all columns are money; there is no status cell). So the "two truths in one row" risk is avoided precisely by **not** introducing a status marker. My earlier §4 recommendation is retracted.
- **The status-consistency goal you want ("all reports show the same status") belongs to the status reports** — Delinquent, Dues, Dashboard — which already funnel through the single truth-aware point (`memberDelinquency().byYear[y].status`, `fin.js:165-168`) and already carry the `●` Truth marker. The Annual Debt report is simply **not a member of that set**, by design, and should not be forced into it.
- **The original production defect was a money defect, and its fix is consistent with (A):** the report used to read raw `paid_amount_ils` (0 for members who paid via live food receipts) and showed them owing; it now reads the FD-002-allocated `byYear.paid` (`fin.js:586`), so the **money** is accurate. That was correct precisely *because* the report is (A) — the fix restored the true accounting figure, not a status.

---

## The one honest fork you must decide separately (not part of this study's fix)

Under (A), the report faithfully shows **FD-002 money**. So when FD-002 settles a year from the migration surplus (the 730-vs-200 case) for a year you adopted as **unpaid**, the report's balance will show that year as **covered** — because, as an accounting fact, FD-002 *did* allocate the surplus to it. This is **internally consistent (one source, all money)** — it is **not** the "two truths in one row" problem you rejected.

It exposes a different, deeper question — **and only you can rule on it**:

- **Today's constitution:** Historical Truth is **presentation/status only — it never touches any amount** (`fin.js:386-391`). Under this rule, the Annual Debt money legitimately reflects FD-002 (surplus included), and the report is *correct as-is*.
- **The alternative:** if you intend Historical Truth to also govern **money owed** (so the debt report shows the unpaid year as still owed), then Truth would have to become **amount-authoritative**, which changes what the FD-002 surplus is permitted to settle. **That is a change to the accounting/allocation meaning — outside "presentation only," outside "don't touch FD-002," outside "don't change amounts."**

I am **not** proposing that change or any architecture for it — only naming it, because it is the sole thing that could make the Debt report's *numbers* reflect Truth, and it is a constitutional decision, not a presentation fix.

---

## Recommendation

**Ratify the Annual Debt report as (A): a financial money report; keep all status out of it.** Then:
- **No change to the Annual Debt report** (it is already one-source money; the earlier marker idea is dropped).
- **Status consistency is delivered where it constitutionally belongs** — the Delinquent / Dues / Dashboard reports, already truth-aware through the single point. If you want, the only remaining "same status everywhere" work is to confirm those three are byte-consistent (they read the same accessor) — no Debt-report involvement.
- **Separately decide the fork above** — whether Historical Truth stays *display-only* (status quo, Debt report is already correct) or becomes *amount-authoritative* (a distinct constitutional change). Say which, and I'll study only that.

---
**Study only — no code, no new architecture, no new tables. `fin.js` at baseline; FD-002 / Allocation Engine / business rules / DB untouched.**
