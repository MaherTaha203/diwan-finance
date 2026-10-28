| TC-14 | التقريب (حدّ) | `1.005`, `0.145`, `1.015`, `-1.005` عبر الصيغتين | A/B تختلف في بعض القيم الموجبة؛ لا فرق في هذه الأمثلة السالبة؛ قرار السياسة موحّد لم يعتمد | `rounding-boundary-vectors.cjs` | artifact شُغّل: PASS، 10 vectors + 2 conservation paths; اختبار المبالغ الأصلي لا يغطي حد EPSILON |npm test` (= `node --test tests/*.test.cjs`) في هذه البيئة بتاريخ 2026-10-28.
> النتيجة الإجمالية المثبتة: **101 نجاح / 102 ملف اختبار، فشل واحد (C9، طوبولوجيا Git — ليس خللاً محاسبياً).**
> هذه توقّعات لاختبار **نسخة Excel القادمة**؛ لا يجوز نقل نتائج مستند قديم باعتبارها تشغيلاً حالياً.

| # | القاعدة | مدخلات اصطناعية | النتيجة المتوقعة | مصدر التوقّع | الاختبار الأصلي المقابل | شُغِّل فعلاً؟ |
|---|---|---|---|---|---|---|
| TC-01 | كشف العضو (سليم) | افتتاح 200، 2025 due 200 paid 150، مقبوض غذاء 50 | finalBalance = 200 (ذمة) | fin.js:115 | `fin2.test.cjs` (memberStatementView) | ✅ نجح |
| TC-02 | التفويض (balance↔statement) | أي عضو | `memberBalance == memberStatement().finalBalance` | fin.js:24-26 | `fin2.test.cjs` | ✅ نجح |
| TC-03 | تجاهل opening_balance/prepaid | عضو بـ opening_balance=999, prepaid=999 | لا أثر على finalBalance | fin.js:40-41 | `historical-truth.test.cjs` + مراجعة يدوية | ✅ نجح (جزئياً — يحتاج حالة صريحة TC-03b) |
| TC-04 | ترتيب التوزيع FD-002 | مبلغ 300؛ 2025 rem 200، تاريخي rem 150 | 2025←200، تاريخي←100، credit 0 | allocation-engine.js:67-93 | `allocation-engine.test.cjs` | ✅ نجح |
| TC-05 | كسر التعادل الحتمي | التزامان بنفس الفئة/السنة | الترتيب بـ createdAt ثم id | allocation-engine.js:50-62 | `allocation-engine.test.cjs` | ✅ نجح |
| TC-06 | حفظ القيمة | أي مبلغ والتزامات | `totalAllocated + creditRemaining = amount` | allocation-engine.js:66 | `allocation-engine.test.cjs` + `verifyConsistency` | ✅ نجح |
| TC-07 | الافتتاحيات في كشف فترة (حدّ) | from/to يستثني تاريخ الافتتاح | صفوف `'—'` تظهر رغم الفلتر | fin.js:44-46,108 | **لا يوجد اختبار صريح (C7)** | ⚠️ غير مغطّى — يجب إنشاؤه |
| TC-08 | البند 9 (ذمة ثم عجز ثم فائض) | تبرع 500، ذمة 300، reduce_deficit، عجز 100 | debt 300، deficit 100، current 100 | foodDonationAllocation.js:24-69 | `food-receipt-deficit-split.test.cjs`, `pralloc-food-overflow.test.cjs` | ✅ نجح |
| TC-09 | تبرع آلي لا يسوّي ذمة بسنة مفتوحة | تبرع آلي بسنة مفتوحة لعضو مدين | debtSettled = 0 | fin.js:310-320 | `allocation-integration.test.cjs` | ✅ نجح |
| TC-10 | التجاوز اليدوي | manual_allocation، split (d/h/c) | يُعتمد الـ split المخزّن | fin.js:329-334 | `pralloc-pr3-settlement-editor.test.cjs` | ✅ نجح |
| TC-11 | دالة قرار سند الغداء (عادي) | مبلغ يفوق الاشتراكات والعجز | الفائض لأول سنة ERP مستقبلية | food-receipt-decision.js:41-53 | `food-receipt-decision.test.cjs` | ✅ نجح |
| TC-12 | قرار الغداء (عجز صريح) | deficitAmount>0، فائض بعد العجز | الفائض ↦ الغداء لا الاشتراكات | food-receipt-decision.js:33-40 | `food-receipt-deficit-split.test.cjs` | ✅ نجح |
| TC-13 | أمبلغ المحاسبة (amount_ils فقط) | صف بلا amount_ils | يساهم بـ 0 (لا بديل من amount) | fin.js:463 | `ils-accounting-amount.test.cjs` | ✅ نجح |
| TC-14 | التقريب (حدّ) | `1.005`, `0.145`, `1.015`, `-1.005` عبر الصيغتين | تباين موجب (1.005→1 مقابل 1.01)؛ السالب لا يختلف — قاعدة موحّدة محجوبة (C4) | allocation-engine.R2 مقابل round2/_r2؛ `rounding-boundary-vectors.cjs` | `ils-accounting-amount.test.cjs` (لا يغطّي EPSILON) + الـ artifact | ⚠️ `ils-accounting` نجح؛ **حدّ EPSILON مُثبَت بالـ artifact لا بالاختبارات** |
| TC-15 | الخزائن الثلاث | صفوف مصنّفة + تحويل | balance = دخول − خروج | fin2.js:107-148 | `fin2.test.cjs` | ✅ نجح |
| TC-16 | التحويل الداخلي | تحويل food→diwan 1000 | − food، + diwan؛ لا أثر على ذمم | fin2.js:131-140؛ operations.js:535 | `internal-transfer.test.cjs` | ✅ نجح |
| TC-17 | العجز والفائض (composed) | opening −8639، تمويل 9000 | deficit_remaining 0، overflow 361 ↦ food | fin2.js:299-309 | `fin2.test.cjs`, `pralloc-food-overflow.test.cjs` | ✅ نجح (بقيمة -8639؛ C5) |
| TC-18 | قاعدة الفائض (حدّ صفر) | تمويل = مقدار العجز تماماً | deficit 0، overflow 0 | fin2.js:243-247,302-307 | `pralloc-food-overflow.test.cjs` | ✅ نجح |
| TC-19 | الإلغاء (حذف منطقي) | إلغاء سند نشط | is_deleted=true + لقطة نسخة؛ يُستثنى من الحساب | operations.js:166-207 | `void-replace.test.cjs` | ✅ نجح |
| TC-20 | التصحيح (إبطال+استبدال) | تصحيح مبلغ سند | سند بديل يشير للأصل + الأصل مبطَل | operations.js:116-164 | `void-replace.test.cjs` | ✅ نجح |
| TC-21 | إلغاء سند بتسوية صريحة | إلغاء + العلم ON | إبطال أسطر التسوية عبر RPC | operations.js:185-205 | `pralloc-pr6-cancellation.test.cjs` | ✅ نجح |
| TC-22 | المبالغ الناقصة (استرداد جزئي) | استرداد 100 من أصل 300 | remainingAfter 200، isFull=false | refund-engine.js:42-85 | `refund-engine.test.cjs`, `pralloc-pr7-refund.test.cjs` | ✅ نجح |
| TC-23 | استرداد يعيد خلق الذمة (FD-009) | استرداد لعضو | صف مدين بتاريخ الاسترداد | fin.js:98-106 | `refund-debt.test.cjs` | ✅ نجح |
| TC-24 | منع استرداد التبرع (FD-032) | استرداد سند fund_type=donation | E_FORBIDDEN | operations.js:353-356 | `pralloc-pr7-refund.test.cjs` | ✅ نجح |
| TC-25 | الشطب (أهلية) | شطب عضو is_active=true | E_ACTIVE | writeoff-engine.js:34 | `writeoff-engine.test.cjs` | ✅ نجح |
| TC-26 | شطب ذمة/رصيد دائن | عضو مغادر بذمة 750 / رصيد 250 | سجل غير نقدي بكامل المبلغ | writeoff-engine.js:28-83 | `writeoff-engine.test.cjs` | ✅ نجح |
| TC-27 | الفترة المقفلة (منع) | إنشاء/تعديل بتاريخ سنة مقفلة | E_LOCKED (عميل) + closed_fiscal_period (قاعدة) | operations.js:100؛ migration ig004 | `fiscal-close.test.cjs`, `close-snapshot.test.cjs` | ✅ نجح |
| TC-28 | الإقفال يتطلب لقطة | إقفال بلا لقطة | رفض الإقفال (IG-016) | operations.js:462-515 | `close-snapshot.test.cjs` | ✅ نجح |
| TC-29 | تجميد الافتتاحيات بعد 2026 | تعديل historical_balance و locked≥2026 | opening_balance_frozen | migration ig005b | `tests/*.sql` (constitutional) | ❌ لم يُشغَّل (SQL يتطلب DB) |
| TC-30 | الاشتراك مصدر واحد | محاولة override | رفض؛ balance_ils مشتق | migration p0_v3 | `constitutional-single-source.sql` | ❌ لم يُشغَّل (SQL) |
| TC-31 | الذمم التاريخية (ق4) | historical_debt_collection لعضو | دائن بكامل المبلغ؛ يُستثنى من البند 9 | fin.js:71-73,306 | `debt-report-live-alignment.test.cjs` | ✅ نجح |
| TC-32 | توافق التقارير (مصدر واحد) | أي مجموعة أعضاء | `verifyConsistency().allMatch === true` | fin.js:696-746 | `consistency-verifier.test.cjs`, `debt-report-model.test.cjs` | ✅ نجح |
| TC-33 | حقيقة الاشتراك (عرض فقط) | truth=paid على سنة | يغيّر العرض لا الرصيد/العجز | fin.js:444-458 | `historical-truth.test.cjs` | ✅ نجح |
| TC-34 | الاستعادة/النسخ الاحتياطي | (تصميم Excel) | تحقق مسبق + نسخة أمان + تحقق قبل الاستبدال | شرط المشروع (prompt §5) | **لا يوجد — خارج المصدر الحالي** | ⚠️ يُصمَّم في مرحلة لاحقة |
| TC-35 | تأكيد-قبل-الحفظ للفائض (§12) | سند عجز صريح يفيض فوق العجز المتبقي | عرض التخصيص الآلي (عجز/دعم حالي) للتأكيد؛ الإلغاء ⇒ لا سند؛ فصل الاحتياطي عن الغداء التشغيلي | المواصفة الأم §12؛ model2.js:128-132 | `food-receipt-confirmation.test.cjs`, `food-receipt-deficit-ui.test.cjs` | ✅ نجح (معيار قبول UI لـ 1B) |

---

## حالات حدود/تكرار إضافية موصى بإضافتها (غير مغطّاة اليوم)

- **TC-03b** إثبات صريح أن `opening_balance`/`prepaid_subscription_ils` لا يغيّران أي رقم (الحقول IGNORED).
- **TC-07** الافتتاحيات داخل كشف فترة (C7).
- **TC-14b** فارق تقريب EPSILON بين `allocation-engine.R2` و`round2`/`_r2` على كسور حدية (C4) — **مُوفَّر الآن** كـ artifact قابل للتشغيل: `node migration/excel/phase-1a/rounding-boundary-vectors.cjs` (نتائج فعلية مسجّلة في CONFLICTS §C4).
- **TC-DUP** probe التكرار (`findProbableDuplicates`) يحذّر ولا يمنع (fin.js:472-485).
- **TC-C5** مطابقة قيمة العجز الفعلية قبل أي اختبار يعتمدها (C5).

## القيود البيئية (مثبتة)
- `npm test` يشغّل `tests/*.test.cjs` فقط. ملفات `tests/*.sql` (توكيدات دستورية/RLS) و`tests/*.cjs` بدون `.test` و`auth-core.test.mjs` **لم تُشغَّل** ضمن المجموعة الرسمية (تحتاج PostgreSQL/Supabase أو مشغّلاً مستقلاً).
- الفشل الوحيد (`pralloc-pr7a-refund-ui.test.cjs`) سببه طوبولوجيا Git (C9)، **منفصل تماماً عن أي فشل محاسبي**.
- **لم يُشغَّل أي PASS محاسبي لنسخة Excel** — لم تُبنَ بعد.
