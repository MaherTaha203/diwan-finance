# SOURCE_INVENTORY — جرد المصدر (المرحلة 1A)

> تاريخ الفحص: 2026-10-28
> الفرع المفحوص: `claude/new-session-7wqqjm` (رأسه مطابق لـ `origin/main` عند `17576fe`).
> النطاق: فحص مصدري تمهيدي لنظام `diwan-finance` قبل بناء نسخة Excel/VBA مستقلة.
> **لم تُفتح أي ورقة Excel ولم يُجمَّع أو يُشغَّل أي VBA في هذه البيئة.**

هذا الملف يسرد الملفات التي قُرئت فعلياً وصُنّفت، والملفات التي لم تُقرأ بعد وسبب ذلك.
التصنيف: **E** = مصدر تنفيذي فعال · **F** = مصدر خلف علم تشغيل (flag-gated) · **D** = وثيقة/تصميم · **T** = اختبار · **M** = ترحيل قاعدة بيانات.

---

## 1. ملفات المحرك المالي (قُرئت كاملة)

| الملف | النوع | ما يحويه (مُثبَت من القراءة) |
|---|---|---|
| `public/js/data.js` | E | محمّلات القراءة فقط: `loadAllData` (قراءة 13 كياناً متوازياً)، `loadSettings` (الأسعار + الافتتاحيات + `TREASURY_OPENINGS`)، `fetchRates` (Edge Function)، `loadAttachCounts`. قائمة الأعمدة لكل `select` مثبتة حرفياً. |
| `public/js/fin.js` | E | المحرك المجمَّد: `FIN.memberStatement/memberBalance/memberAllocation/allocateFoodDonations/fundLedger/debtReportRows/verifyConsistency/treasuryPosition/...` + `calcHistoricalFromYear` (قفل Phase 15). |
| `public/js/fin2.js` | E/F | محرك النموذج الجديد: `FIN2.treasuryBalance` للخزائن الثلاث، السجلّان النقدي/العيني، تمويل العجز، شرائح ق5 والتسوية التاريخية، `composed()` وقاعدة الفائض. يقرأ تصنيفاً يكتبه P2-C. |
| `public/js/fin-contract.js` | E | واجهة `FinContract` الوحيدة: الخزائن تُقرأ من FIN2، كشوف العضو/التوزيع من FIN. |
| `public/js/allocation-engine.js` | F | محرك MODEL2 النقي (INERT): `computeAllocation/orderObligations` بترتيب FD-002 (اشتراكات أقدم أولاً ثم التاريخي). `MODEL2_ALLOCATION_ENABLED=false`، `MODEL2_AUDIT_LOG_ENABLED=true`. |
| `public/js/allocation-integration.js` | F | وصل المحرك بمسار الالتقاط خلف العلم: `MODEL2RecordAllocation` (OD-01)، `MODEL2RecordCreditConsumption` (OD-02)، `buildObligations`، `resolveCurrentYear`. |
| `public/js/model2.js` | E(تعريفي) | كتالوج MODEL2 المجمَّد (deepFreeze): `TREASURIES` (3)، `REGISTERS` (2)، `EVENTS`، `CLASSIFICATION`، `ALLOCATION_ORDER`، `DONATION_DESTINATIONS`. تعريفي فقط. |
| `public/js/foodDonationAllocation.js` | E | محرك البند 9 النقي: تسوية ذمة العضو أولاً ثم `reduce_deficit`/`support_current` مع فائض العجز ↦ الدعم الحالي. |
| `public/js/food-receipt-decision.js` | E | دالة قرار سند الغداء (F-1): اشتراكات ERP أقدم أولاً ثم العجز، والفائض لأول سنة ERP مستقبلية؛ وضع العجز الصريح يسوّي التاريخ ثم يفيض للغداء. |
| `public/js/receipt-settlement.js` | F | وصل التسوية الصريحة بـ RPC: `post → create_receipt_with_settlement`، `cancel → void_receipt_settlement`، `refund → refund_receipt_settlement`. خلف `RECEIPT_ALLOCATION_ENABLED` (افتراضي OFF). |
| `public/js/refund-engine.js` | F | محرك الاسترداد النقي (CA-005): استرداد كامل/جزئي محافظ على العملة، من خزينة الأصل، ممنوع في سنة مقفلة. |
| `public/js/writeoff-engine.js` | F | محرك الشطب النقي (CA-007): شطب ذمة/رصيد دائن عند `is_active===false` فقط، غير نقدي. |
| `public/js/operations.js` | E | طبقة العمليات `BusinessOps` (BO-01…BO-16) وعقودها: إنشاء/تصحيح(إبطال+استبدال)/إلغاء/إعادة تصنيف/تقسيم/عضو/استحقاقات/استرداد/شطب/إقفال/تحويل داخلي. |

## 2. ملفات واجهة/عمليات إضافية (قُرئت جزئياً أو مُسحت بحثياً)

| الملف | النوع | الحالة |
|---|---|---|
| `public/js/crud.js` | E | مُسح بحثياً (دوال الحفظ/التحميل والمسارات القديمة). لم يُقرأ سطراً بسطر بالكامل. |
| `public/js/forms.js`, `public/js/reports.js`, `public/js/dues-workspace.js` | E | لم تُقرأ بالكامل في هذه المرحلة؛ مرشّحة للقراءة في 1B عند تثبيت مواصفة الواجهة والتقارير. |
| `public/js/report-model.js`, `report-engine.js`, `print.js` | E | طبقة التقارير/الطباعة؛ خارج نطاق محرك الحساب في 1A (تُفحص عند مواصفة تقارير A4). |

## 3. الترحيلات (قُرئت رؤوسها والمقاطع الحرجة)

| الملف | النوع | ما يفرضه (مُثبَت) |
|---|---|---|
| `20260719160000_p0_v3_subscription_single_source.sql` | M | `paid_amount_ils` هو المصدر الوحيد؛ إلغاء مسار `override`؛ `balance_ils` مشتق محتوم `= due − paid`. |
| `20260724210000_ccr001_ig004_closed_period_guard.sql` | M | قفل السنة المقفلة على مستوى القاعدة (receipts/payments: date؛ member_subscriptions: year، INSERT غير محروس). حياديّ للدور. |
| `20260724213000_ccr001_ig005b_opening_freeze.sql` | M | تجميد الافتتاحيات بعد إقفال 2026 (`members.historical_balance_ils/historical_payments_ils` و `settings.food/diwan_opening_balance`). |
| `20260806090000_mir002_server_voucher_numbering.sql` | M | `next_voucher_no` سلطة الترقيم على الخادم لمسار التسوية (قفل استشاري + MAX+1، محمي بـ UNIQUE(no)). |
| `20260806100000_mir019_receipt_insert_defaults.sql` | M | إدراج بقائمة أعمدة صريحة كي تطبّق القاعدة دفاعاتها (verification_token/ownership_state). |
| `20261017110000_pralloc_food_fund_overflow.sql` | M | يسمح لسطر تسوية بتحديد جزء سند عجز يبقى في صندوق الغداء؛ يحافظ على فحص الصلاحية وثابت المجموع والترقيم. |
| باقي ترحيلات `pralloc_pr*`, `model2_v2`, `historical_subscription_truth`, `internal_transfers`, `fiscal_snapshots`, `auth*` | M | مُسحت فهرسياً؛ جداول/RLS/RPC النموذج الجديد والهوية والتدقيق. |

## 4. وثائق مرجعية (استُشهد بها، لم تُعتمد كمصدر تنفيذي)

| الملف | النوع | الدور |
|---|---|---|
| `docs/system/DIWAN_SYSTEM_MASTER_SPECIFICATION.md` | D | يذكر ثابت العجز `-8639` بوصفه المعتمد. |
| `docs/phase15/DATABASE_CHANGES.md` | D | يذكر `food_opening_balance = -8689` (تعارض C5). |
| `docs/P2C_DRY_RUN_REPORT.md` | D | حساب تجفيف يستخدم `-8639`. |
| `lab/seed/prod-snapshot.json` | D | لقطة إعدادات تحوي `food_opening_balance = -8639` و `diwan_opening_balance` والأسعار. |
| `ENGINEERING-STANDARD-v1.md`, `README.md` | D | معايير عامة. |

## 5. الاختبارات (فُهرست؛ شُغّلت المجموعة — انظر TEST_SPECIFICATION وPHASE_1A_REPORT)

مجلد `tests/` يضم 112 ملفاً (‏`*.test.cjs`/`*.cjs`/`*.sql`/`*.mjs`/`*.json`). أمر `npm test` يشغّل `node --test tests/*.test.cjs` فقط (لا يشمل ملفات `.cjs` بدون لاحقة `.test`، ولا ملفات `.sql`/`.mjs`). التفصيل في `TEST_SPECIFICATION.md`.

## 6. ملفات تعذّر الاعتماد عليها أو خارج النطاق

- ملفات `tests/*.sql` (مثل `constitutional-schema-assertions.sql`): **لم تُنفَّذ** — تتطلب اتصال PostgreSQL/Supabase غير متاح في هذه البيئة؛ قُرئت كمصدر توقّع فقط.
- ملفات `tests/*.cjs` بدون `.test` و `tests/auth-core.test.mjs`: **خارج أمر `npm test` القياسي**؛ لم تُشغَّل ضمن المجموعة الرسمية.
- لا يوجد ملف هيكل Excel/VBA سابق في المستودع — لم أدّعِ إنشاءه، ولم أستبدل شيئاً.

## 7. تنبيه قراءة البيانات الحسّاسة

`public/js/data.js` يحوي رمز `anon` (Bearer JWT) وعنوان مشروع Supabase مضمّنين في الكود (السطور 17–25). هذا سر تشغيلي مكشوف في المصدر العام — سُجِّل كخطر في `CONFLICTS_AND_DECISIONS.md` (R-SEC-1)، ولا علاقة له بصحة المحاسبة لكنه يجب أن يراجَع قبل أي نشر.
