# SOURCE_TRACEABILITY — تتبّع المصدر لكل قاعدة/حقل (المرحلة 1A)

> لكل قاعدة مالية: مسار الملف، الدالة/الجدول/القيد، والأسطر المرجعية.
> رموز الحالة: **[فعّال]** مصدر تنفيذي يعمل اليوم · **[مشروط]** خلف علم تشغيل · **[تاريخي]** وثيقة/تعليق · **[اختبار]** · **[قرار]** استنتاج يحتاج حسماً من صاحب النظام.

تنبيه: كل مراجع الأسطر مأخوذة من حالة الفرع عند `17576fe`. أي إعادة تنسيق لاحقة قد تزيحها؛ أسماء الدوال هي المرجع الأدق.

---

## 1. كشف العضو والرصيد (Member Statement / Balance)

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-MS-1 | `memberBalance` يفوّض إلى `memberStatement().finalBalance` — لا صيغة رصيد مكرّرة | `public/js/fin.js:24-26` | [فعّال] |
| T-MS-2 | الافتتاح التاريخي من `historical_balance_ils` **وليس** `opening_balance` | `fin.js:42` (+تعليق 37-41) | [فعّال] |
| T-MS-3 | المدفوعات قبل النظام من `historical_payments_ils` | `fin.js:43,55-56` | [فعّال] |
| T-MS-4 | الاستحقاقات/المدفوعات السنوية من `member_subscriptions.due_amount_ils`/`paid_amount_ils` | `fin.js:48-63` | [فعّال] |
| T-MS-5 | المقبوضات الحية: `fund_type='food'` للعضو تُضاف كدائن | `fin.js:65-67` | [فعّال] |
| T-MS-6 | الإشارة: موجب = ذمة على العضو، سالب = رصيد دائن | `fin.js:115-116,122-128` | [فعّال] |
| T-MS-7 | `prepaid_subscription_ils` و `opening_balance` **لا** يدخلان الصيغة (منع ازدواج) | `fin.js:40-41` (تعليق)؛ `data.js:56-57` يقرؤهما للعرض فقط | [فعّال] |
| T-MS-8 | صيغة الرصيد النهائي الصريحة | `fin.js:115` | [فعّال] |
| T-MS-9 | تصفية الفترة من/إلى عبر `inRange`؛ الصفوف بلا تاريخ (`'—'`) تُعرض دائماً | `fin.js:44-46,108` | [فعّال] |
| T-MS-10 | قفل الرصيد التاريخي (Phase 15): سنوات `active_from_year..2024 × 200` | `fin.js:765-769` | [فعّال] (اقتراح نموذج، لا يكتب تلقائياً إلا عبر `onMemberFromYearChange`) |

## 2. آثار إضافية على كشف العضو

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-MS-11 | ق4: تحصيل ذمة تاريخية مرتبط بالعضو (`movement_type='historical_debt_collection'`) = دائن بكامل المبلغ | `fin.js:71-73` | [فعّال] |
| T-MS-12 | شطب ذمة (`debt_write_off`) = دائن غير نقدي؛ شطب رصيد دائن (`credit_write_off`) = مدين غير نقدي | `fin.js:79-89` | [مشروط] (صفر صفوف اليوم؛ ينتج عند تفعيل MODEL2 V2.0) |
| T-MS-13 | البند 9: تسوية ذمة من تبرع العضو (`perMember[memberId]`) = دائن | `fin.js:91-96` | [فعّال] |
| T-MS-14 | الاسترداد (FD-009) يعيد خلق الذمة: صف مدين بتاريخ الاسترداد | `fin.js:98-106` | [مشروط] (جدول `refunds` فارغ حتى التفعيل) |

## 3. التوزيع (Allocation)

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-AL-1 | ترتيب FD-002: اشتراكات أقدم أولاً (rank 0) ثم التاريخي (rank 1، دائماً أخيراً) ثم الفائض رصيد دائن | `allocation-engine.js:44-62,67-93` | [فعّال كمرجع] المحرك نقي؛ غير موصول تشغيلياً إلا بالعلم |
| T-AL-2 | كسر التعادل: الفئة ← السنة الأقدم ← وقت الإنشاء ← المعرّف الثابت | `allocation-engine.js:50-62` | [فعّال كمرجع] |
| T-AL-3 | حفظ القيمة: `totalAllocated + creditRemaining = amount` | `allocation-engine.js:66-93` | [فعّال كمرجع] |
| T-AL-4 | `memberAllocation` هو القارئ الوحيد لتوزيع read-time ويبني المجمّع (pool) ويستدعي `MODEL2Allocation` | `fin.js:189-284` | [فعّال] |
| T-AL-5 | `outstanding` في `memberAllocation` دائماً = `memberStatement().finalBalance` (مصدر واحد) | `fin.js:283` | [فعّال] |
| T-AL-6 | قارئ التسوية الصريحة الوحيد (`allocation_records`, `source_kind='receipt_settlement'`) داخل `memberAllocation` | `fin.js:202-231` | [مشروط] `RECEIPT_ALLOCATION_ENABLED` |

## 4. البند 9 — توزيع تبرعات الغداء بأولوية الذمة

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-I9-1 | خطوة 1 تسوية ذمة العضو، خطوة 2 توزيع بالوجهة (`reduce_deficit` حتى العجز ثم الفائض ↦ الدعم الحالي / `support_current`) | `foodDonationAllocation.js:24-69` | [فعّال] |
| T-I9-2 | `allocateFoodDonations` memoized لكل تحميل (`DB._alloc`) | `fin.js:295-337` | [فعّال] |
| T-I9-3 | IG-002/FD-008: تبرع آلي لا يسوّي ذمة في سنة مفتوحة (`memberId=null` إلا في سنة مقفلة) | `fin.js:310-320` | [فعّال] |
| T-I9-4 | طبقة التجاوز اليدوي (`manual_allocation`): split مخزّن (`manual_debt_settlement/historical_donation/current_support`) | `fin.js:308-309,329-334` | [فعّال] |
| T-I9-5 | ق4 لا يدخل مُوزّع البند 9 (يُستثنى `historical_debt_collection`) | `fin.js:306` (+303-305) | [فعّال] |
| T-I9-6 | مقدار العجز للتسوية = `Math.abs(window.FOOD_OPENING)` | `fin.js:323`؛ القيمة من `data.js:141` | [فعّال] (القيمة محل تعارض C5) |

## 5. دالة قرار سند الغداء (F-1)

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-FR-1 | عادي: ERP أقدم أولاً ثم العجز، والفائض لأول سنة ERP مستقبلية | `food-receipt-decision.js:41-53` | [فعّال كمرجع إنتاج] |
| T-FR-2 | عجز صريح: يسوّي العجز حتى سقفه ثم يفيض إلى الغداء الحالي، لا للاشتراكات | `food-receipt-decision.js:33-40` | [فعّال كمرجع إنتاج] |
| T-FR-3 | أول سنة ERP مستقبلية = max(سنوات الاشتراك, LOCKED_THROUGH_YEAR) + 1 | `receipt-settlement.js:88-94` | [مشروط] (يُستهلك فقط في مسار التسوية بالعلم) |

## 6. الخزائن والتحويلات (FIN2)

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-TR-1 | ثلاث خزائن نقدية: `food`, `diwan`, `historical_deficit` | `model2.js:18-40`؛ `fin2.js:107-152` | [فعّال كمرجع] |
| T-TR-2 | `treasuryBalance`: دخول − خروج؛ الحدث `outflow:true` أو التحويل من المصدر يُنقص | `fin2.js:107-124` | [مشروط] (يعتمد صفوفاً مصنّفة يكتبها P2-C) |
| T-TR-3 | التحويل الداخلي (`internal_transfers`): يُنقص المصدر ويزيد الوجهة؛ ليس إيراداً/مصروفاً | `fin2.js:131-140`؛ `operations.js:535-568` | [مشروط] (الجدول فارغ اليوم) |
| T-TR-4 | الاسترداد خروج من خزينة الأصل عبر جدول `refunds` المستقل | `fin2.js:125-130` | [مشروط] |
| T-TR-5 | شريحة ق5 (`q5Settled`) تنقل Food→Historical-Deficit حسب هوية الحدث | `fin2.js:42-63,115-123`؛ `model2.js:89` | [فعّال] (مقدار مشتق من البند 9) |
| T-TR-6 | شريحة التسوية التاريخية لسند الغداء (`settlementDeficitSlice`) تنقل Food→Deficit | `fin2.js:76-85,141-147` | [مشروط] `RECEIPT_ALLOCATION_ENABLED` |
| T-TR-7 | `composed()`: الافتتاحيات + الحركات + قاعدة الفائض؛ العجز المتبقي = `min(0, opening + funding)` والفائض ↦ الغداء | `fin2.js:299-309` | [فعّال] |
| T-TR-8 | الافتتاحيات تُعيَّن مرة واحدة: `TREASURY_OPENINGS = {food:0, diwan:DIWAN_OPENING, historical_deficit:FOOD_OPENING}` | `data.js:143-152` | [فعّال] |

## 7. المبالغ والعملات والتقريب

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-AM-1 | `amountOf(r) = Number(r.amount_ils||0)` — لا بديل من `amount` (fail-safe = 0) | `fin.js:463`؛ `fin2.js:33` | [فعّال] |
| T-AM-2 | التقريب إلى منزلتين: `R2`/`_r2`/`round2` | `fin.js:135`؛ `fin2.js:17`؛ `allocation-engine.js:36`؛ `foodDonationAllocation.js:22` | [فعّال] (انتبه: `foodDonationAllocation.round2` يستخدم `Number.EPSILON`، بينما `allocation-engine.R2` لا) |
| T-AM-3 | `amount_ils` إلزامي عند الإنشاء (FD-021) `> 0` | `operations.js:96-99` | [فعّال] |
| T-AM-4 | الحقول الأصلية (`amount`, `currency`, `exchange_rate`, `amount_ils`) تبقى مستقلة | `data.js:54-55` | [فعّال] |

## 8. أعلام التشغيل (Flags)

| # | العلم | القيمة الافتراضية | المصدر |
|---|---|---|---|
| T-FL-1 | `MODEL2_ALLOCATION_ENABLED` | `false` | `allocation-engine.js:25` |
| T-FL-2 | `MODEL2_AUDIT_LOG_ENABLED` | `true` | `allocation-engine.js:32` |
| T-FL-3 | `RECEIPT_ALLOCATION_ENABLED` | `false` | `receipt-settlement.js:34-35`؛ القراءة في `data.js:90` |

ثلاثة أعلام مستقلة؛ **لا يجوز دمجها في مفتاح واحد في Excel** (انظر C6).

## 9. دورة حياة السندات والعقود (BusinessOps)

| # | العملية | المصدر | الحالة |
|---|---|---|---|
| T-BO-1 | BO-01 إنشاء: صلاحية كتابة + `amount_ils>0` + تاريخ غير مقفل + تصنيف صريح صالح + رقم فريد | `operations.js:40-41,93-114` | [فعّال] |
| T-BO-2 | BO-02 تصحيح = إبطال + استبدال (FD-034)، لا تعديل صامت؛ سبب إلزامي؛ أدرِج البديل ثم أبطِل الأصل مع تعويض | `operations.js:116-164` | [فعّال] |
| T-BO-3 | BO-03 إلغاء = حذف منطقي `is_deleted=true` + لقطة نسخة؛ مدير + غير مقفل | `operations.js:166-207` | [فعّال] |
| T-BO-4 | BO-04/05 إعادة تصنيف/تقسيم (تصنيف فقط، ذرّي) | `operations.js:209-271` | [فعّال] (مُسح) |
| T-BO-5 | BO-07 إنشاء عضو + جدول اشتراكاته ذرّياً عبر `create_member_atomic` | `operations.js:272-285` | [فعّال] |
| T-BO-6 | BO-10 توليد استحقاقات فقط — يرفض أي `paid_amount_ils != 0` | `operations.js:313-332` | [فعّال] |
| T-BO-7 | BO-11 استرداد خلف `MODEL2_ALLOCATION_ENABLED`؛ يرفض استرداد تبرع (FD-032) | `operations.js:334-397` | [مشروط] |
| T-BO-8 | BO-12/13 شطب خلف العلم | `operations.js:398-461` | [مشروط] |
| T-BO-9 | BO-14/15 إقفال/إعادة فتح: مدير + قاعدة 31 يناير + لقطة إقفال إلزامية (IG-016) | `operations.js:462-532` | [فعّال] |
| T-BO-10 | BO-16 تحويل داخلي: صناديق من المجموعة الثلاثية ومتمايزة + مدير معتمد + غير مقفل + سبب | `operations.js:535-568` | [فعّال] |

## 10. ضوابط قاعدة البيانات (Migrations)

| # | القاعدة | المصدر | الحالة |
|---|---|---|---|
| T-DB-1 | `paid_amount_ils` مصدر وحيد؛ `balance_ils` مشتق محتوم؛ override ممنوع | `supabase/migrations/20260719160000_p0_v3_subscription_single_source.sql` | [فعّال] |
| T-DB-2 | قفل الفترة المقفلة على القاعدة (حياديّ للدور)؛ `member_subscriptions` INSERT غير محروس | `supabase/migrations/20260724210000_ccr001_ig004_closed_period_guard.sql` | [فعّال] |
| T-DB-3 | تجميد الافتتاحيات بعد إقفال 2026 | `supabase/migrations/20260724213000_ccr001_ig005b_opening_freeze.sql` | [فعّال] (INERT حتى `locked_through_year>=2026`) |
| T-DB-4 | الترقيم على الخادم لمسار التسوية | `supabase/migrations/20260806090000_mir002_server_voucher_numbering.sql` | [مشروط] |
| T-DB-5 | فحص صلاحية `is_finance_writer()` في RPC التسوية | `supabase/migrations/20261015100000_guard_settlement_rpcs_authorization.sql`؛ `20261017110000_...overflow.sql` | [مشروط] |
