# ACCOUNTING_RULES — القواعد المحاسبية المستخلصة من المصدر (المرحلة 1A)

> القواعد أدناه مستخلصة **من المصدر الحالي فقط**. كل قاعدة تميّز بين:
> **[محرك مرجعي]** موجود في الشيفرة (قد يكون خلف علم) · **[مفعّل اليوم]** يعمل على الإنتاج · **[تصميم مقترح لـ Excel]** توصية، ليست مصدراً.
> الأمثلة العددية **اصطناعية صغيرة** لتوضيح القاعدة، لا بيانات إنتاج.

---

## MONEY — تمثيل المبالغ والتقريب

- **[مفعّل اليوم]** مبلغ المحاسبة الوحيد هو `amount_ils`؛ `amountOf(r)=Number(r.amount_ils||0)` دون أي بديل من `amount` (صف بلا `amount_ils` يساهم بـ 0 — fail-safe). المصدر: `fin.js:463`, `fin2.js:33`.
- **[مفعّل اليوم]** التقريب إلى منزلتين عبر دوال `R2`. **تحذير تنفيذي:** هناك تطبيقان مختلفان:
  - `foodDonationAllocation.round2`/`food-receipt-decision.R2` = `Math.round((n + Number.EPSILON)*100)/100`
  - `allocation-engine.R2`/`fin._r2`/`fin2.R2` = `Math.round((n[ +EPSILON ])*100)/100` (fin._r2 يضيف EPSILON؛ allocation-engine.R2 لا يضيفه)
  يجب في Excel/VBA توحيد قاعدة تقريب واحدة موثّقة واختبار حدودها (C4).
- **[تصميم مقترح لـ Excel]** لا تستخدم `Float`/`Double` كمصدر حقيقة. استخدم `Currency` (VBA، دقة 4 منازل داخلية) أو عدداً صحيحاً بالأغورات (×100) مع تقريب صريح عند كل خطوة، وثّق دقة كل عملة (لا تفترض أن كل العملات منزلتان).

## MS — كشف العضو والرصيد  [مفعّل اليوم] (المصدر: `fin.js:33-119`)

المصدر المركزي `FIN.memberStatement(memberId, from, to)`؛ `memberBalance` يفوّض إليه (صيغة واحدة).

صفوف الكشف (dr = مدين/ذمة، cr = دائن):
```
إن historical_balance_ils ≠ 0 → صف افتتاح: dr = historical_balance_ils
إن historical_payments_ils ≠ 0 → صف: cr = historical_payments_ils
لكل اشتراك سنة: due>0 → dr=due ; paid>0 → cr=paid
مقبوضات food الحية للعضو ضمن الفترة → cr = amount_ils
ق4 historical_debt_collection للعضو → cr = amount_ils
debt_write_off → cr ; credit_write_off → dr      [مشروط]
البند 9 debtSettled>0 → cr = debtSettled
refund للعضو ضمن الفترة → dr = amount_ils         [مشروط]
```
الرصيد النهائي (مصدر الحقيقة الوحيد):
```
finalBalance = openingDebt + totalDues − totalPaid − debtSettled
             − debtWrittenOff + creditWrittenOff + refunded
```
الإشارة: `>0` ذمة على العضو · `<0` رصيد دائن · `0` مسدّد. (`fin.js:115-128`)

**مثال اصطناعي:** عضو بافتتاح 200، استحقاق 2025 = 200، دفع 2025 = 150، مقبوض غذاء حي = 50.
`finalBalance = 200 + 200 − (150 + 50) = 200` ذمة على العضو. (totalPaid = 150 + 50 = 200)

- **[مفعّل اليوم]** `opening_balance` و`prepaid_subscription_ils` **لا** يدخلان الصيغة (منع ازدواج). (`fin.js:40-41`)
- **[مفعّل اليوم]** قاعدة الفترة: الصفوف بلا تاريخ (`'—'`: الافتتاح والمدفوعات التاريخية) تُعرض دائماً؛ المرشّح يطبّق فقط على الصفوف المؤرخة (`fin.js:44-46,108`) → **يحتاج اختبار مستقل C7**.

## HB — صيغة الرصيد التاريخي (قفل Phase 15)  [مفعّل اليوم كنموذج إدخال] (`fin.js:765-769`)
```
historicalFromYear(y) = (y بين active_from_year و 2024) ? max(0, 2024−y+1)*200 : 0
```
**مثال:** `y=2022 → (2024−2022+1)*200 = 600`. يقترح فقط في نموذج الإدخال عبر `onMemberFromYearChange`، لا يُكتب تلقائياً في الكشف.

## AL — التوزيع الدستوري FD-002  [محرك مرجعي] (`allocation-engine.js`, `fin.js:189-284`)

الترتيب: (1) اشتراكات سنوية غير مسددة **من الأقدم للأحدث**، (2) ثم الذمة التاريخية (دائماً أخيراً)، (3) الفائض يبقى رصيداً دائناً.
كسر التعادل: الفئة ← السنة الأقدم ← `createdAt` ← المعرّف الثابت (`allocation-engine.js:50-62`).
حفظ القيمة: `totalAllocated + creditRemaining = amount`.

**مثال:** مبلغ 300، التزامات: 2025 متبقٍ 200، تاريخي متبقٍ 150.
→ 2025 يأخذ 200، التاريخي يأخذ 100، الرصيد الدائن 0. `outstanding = 150−100 + 0 = 50`.

- **[محرك مرجعي، غير مفعّل تشغيلياً افتراضياً]** `MODEL2Allocation` نقي وغير موصول إلا بالعلم؛ لكن `FIN.memberAllocation` **يستدعيه read-time** متى كان `window.MODEL2Allocation` موجوداً (`fin.js:265-274`) — أي المحرك يُستهلك في اشتقاق الحالة/التأخر حتى والعلم OFF، بينما **التسجيل** (`allocation_records`) هو ما يُحجب بالعلم. ميّز بوضوح: «استهلاك read-time للترتيب» ≠ «تسجيل/كتابة صفوف التوزيع». (قرار توضيحي — C2/C6)
- `outstanding` دائماً = `memberStatement().finalBalance` (مصدر واحد، order-invariant).

## I9 — البند 9: توزيع تبرعات الغداء بأولوية الذمة  [مفعّل اليوم] (`foodDonationAllocation.js`, `fin.js:295-337`)

لكل تبرع غذائي بالترتيب الزمني:
```
debtSettled = min(debtLeft[member], amount)        // خطوة 1
remainder   = amount − debtSettled                 // خطوة 2
إن allocation=reduce_deficit:
    toDeficit = min(remainder, deficitLeft); toCurrent = remainder − toDeficit   // الفائض ↦ دعم حالي
وإلا (support_current): toCurrent = remainder
```
- **[مفعّل اليوم]** IG-002/FD-008: تبرع **آلي** لا يسوّي ذمة في سنة **مفتوحة** (`memberId=null` إلا في سنة مقفلة ≤ `locked_through_year`). التبرعات في سنوات مقفلة تحتفظ بأثرها التاريخي. (`fin.js:310-320`)
- **[مفعّل اليوم]** التجاوز اليدوي (`manual_allocation=true`): الـ split المخزّن (`manual_debt_settlement/historical_donation/current_support`) هو المصدر المحاسبي لذلك السند. (`fin.js:329-334`)
- مقدار العجز للتسوية = `|FOOD_OPENING|` (`fin.js:323`). **القيمة محل تعارض C5.**

**مثال:** تبرع عضو 500، ذمته 300، `reduce_deficit`, عجز متبقٍ 100.
→ debtSettled 300، remainder 200، toDeficit 100، toCurrent 100.

## FR — دالة قرار سند الغداء (F-1)  [محرك مرجعي إنتاجي] (`food-receipt-decision.js`)
```
عادي: اشتراكات ERP أقدم أولاً → ثم العجز → والفائض لأول سنة ERP مستقبلية
عجز صريح (deficitAmount>0): العجز حتى min(deficitAmount, deficit, rem) → ثم الفائض للغداء الحالي (لا للاشتراكات)
balanced = |amount − allocated| < 0.005 و amount > 0.005
```
يُستهلك في مسار التسوية الصريحة فقط (`receipt-settlement.js:126-139`)، خلف `RECEIPT_ALLOCATION_ENABLED`.

## TR — الخزائن والتحويلات  [محرك مرجعي، يعتمد تصنيفاً من P2-C] (`fin2.js`, `model2.js`)

ثلاث خزائن نقدية فقط: `food`, `diwan`, `historical_deficit`.
```
treasuryBalance(key) = Σ(للصفوف المصنّفة ذات cash=true):
    إن destination=key: ± amount (outflow ? − : +)
    إن source=key:      − amount                      // التحويل يغادر المصدر
    + شريحة ق5 (food→historical_deficit)
    + حركات refunds (خروج من خزينة الأصل)             [مشروط]
    + internal_transfers (− مصدر، + وجهة)              [مشروط]
    + settlementDeficitSlice (food→deficit)            [مشروط]
composed():
    food   = opening.food(=0) + foodTreasury + overflow
    diwan  = opening.diwan + diwanTreasury
    historical_deficit_remaining = min(0, opening.historical_deficit + historicalDeficitTreasury)
    overflow = max(0, opening.historical_deficit + historicalDeficitTreasury)   // الفائض ↦ الغداء
```
- **[مفعّل اليوم]** التحويل الداخلي ليس إيراداً/مصروفاً ولا يمس ذمم الأعضاء (`fin2.js:131-140`).
- **[محرك مرجعي]** الاسترداد خروج من خزينة الأصل عبر جدول `refunds` المستقل (ليس مصروفاً في `payments`) (`fin2.js:125-130`).
- **[مفعّل اليوم]** قاعدة الفائض read-time: حين يبلغ العجز صفراً، الزائد يُحتسب في الغداء — لا يُكتب صف (`fin2.js:299-309`).
- **[قرار]** الافتتاحيات تُعيَّن مرة واحدة في `TREASURY_OPENINGS`؛ `food_opening_balance` يفتح **العجز التاريخي** لا الغداء، والغداء يفتح بـ 0 (`data.js:143-152`). **لا تضف رصيداً افتتاحياً مرتين.**

**مثال (العجز):** opening.historical_deficit = −8639، تمويل = 2000.
→ rem = −6639 → `historical_deficit_remaining = −6639`، overflow = 0 (العجز لم يُصفَّر بعد).
لو التمويل = 9000 → rem = +361 → العجز المتبقي = 0، overflow = 361 يُضاف للغداء.

## LC — دورة حياة السندات  [مفعّل اليوم] (`operations.js`)

- **BO-01 إنشاء:** صلاحية كتابة + `amount_ils>0` + تاريخ غير مقفل + `movement_type` صريح صالح + رقم فريد (`operations.js:93-114`).
- **BO-02 تصحيح = إبطال + استبدال (FD-034):** لا تعديل صامت؛ أدرِج البديل أولاً ثم أبطِل الأصل، وإن فشل الإبطال عوّض البديل (ذرّي منطقياً)؛ سبب إلزامي + لقطة نسخة (`operations.js:116-164`).
- **BO-03 إلغاء:** `is_deleted=true` + لقطة نسخة؛ مدير + غير مقفل؛ ومع العلم ON يبطل أسطر التسوية عبر RPC (`operations.js:166-207`).
- **BO-07 عضو + اشتراكاته:** عملية ذرّية واحدة (`create_member_atomic`) — لا عضو بلا جدول (`operations.js:278-285`).
- **BO-10 توليد استحقاقات فقط:** يرفض أي `paid_amount_ils != 0` (لا مصدر ثانٍ) (`operations.js:319-332`).
- **BO-14/15 إقفال/فتح:** مدير + قاعدة «31 يناير» + **لقطة إقفال إلزامية** (لا إقفال بلا لقطة) (`operations.js:462-532`).
- **[تصميم مقترح لـ Excel]** لا حذف نهائي للسجلات المالية؛ استخدم حالة إلغاء/حذف منطقي + سجل تدقيق مطابق للمصدر.

## RF/WO — الاسترداد والشطب  [محرك مرجعي، مشروط بـ `MODEL2_ALLOCATION_ENABLED`]

- **استرداد (CA-005):** حركة أولى‑الدرجة (سند جديد)، ليست إلغاءً؛ كامل/جزئي محافظ على العملة؛ مسقوف بالمتبقي (`origin.amount_ils − already-refunded`)؛ ممنوع في سنة مقفلة؛ لا يمس الأصل (`refund-engine.js:42-85`؛ `operations.js:334-397`). **استرداد التبرع ممنوع دستورياً** (FD-032) (`operations.js:353-356`).
- **شطب (CA-007):** عند `is_active===false` فقط؛ غير نقدي (لا حركة خزينة)؛ شطب ذمة = كامل `finalBalance>0`، شطب رصيد دائن = كامل `creditBalance>0`؛ سجل جديد لا حذف صامت (`writeoff-engine.js`).

## SUB — الاشتراك مصدر واحد  [مفعّل اليوم] (migration `p0_v3`)
`paid_amount_ils` هو المصدر المخزّن الوحيد؛ `balance_ils` مشتق محتوم `= due − paid`؛ مسار override ممنوع.

## CP — الفترة المقفلة والتجميد  [مفعّل اليوم] (migrations `ig004`, `ig005b`)
- قفل القاعدة حياديّ للدور على receipts/payments (بالتاريخ) و member_subscriptions (بالسنة، UPDATE/DELETE؛ INSERT غير محروس لتعرُّف العضو الجديد).
- تجميد الافتتاحيات يُفعَّل تلقائياً عند `locked_through_year>=2026` (INERT قبله).
