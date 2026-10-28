# DATA_DICTIONARY — قاموس البيانات لنسخة Excel (المرحلة 1A)

> مستخرج من الجرد الفعلي لقوائم `select` في `public/js/data.js` واستخدام كل حقل في المحرك.
> **لا يُفترض أن `SELECT *` يعني أن كل الأعمدة مستخدمة محاسبياً.** صنّفت كل حقل بحسب استخدامه الحقيقي.
>
> مفتاح الاستخدام: **CALC** يدخل حساباً مالياً · **DISPLAY** عرض/تقرير فقط · **KEY** مفتاح/ربط · **HIST** تاريخي · **COND** مشروط بعلم · **AUDIT** تدقيق/دورة حياة · **IGNORED** مقروء لكنه غير مستخدم في المحرك الحالي.
> أنواع البيانات مقترَحة لـ Excel؛ المبالغ المالية **ليست Float** (انظر ACCOUNTING_RULES §Money).

---

## 1. receipts — المقبوضات (`data.js:54`)

| حقل المصدر | المقترح في Excel | النوع | إلزامي | مفتاح | الاستخدام | القاعدة/الملاحظة | المصدر |
|---|---|---|---|---|---|---|---|
| id | ReceiptId | نص/UUID | نعم | PK | KEY | المعرّف الثابت (Law 12) | data.js:54 |
| no | ReceiptNo | نص | نعم | UNIQUE | KEY/DISPLAY | رقم فريد؛ يُولَّد بـ `nextNo`/`next_voucher_no` | operations.js:105 |
| verification_token | VerifyToken | نص | نعم | — | AUDIT | رمز تحقق محلي؛ **ليس تحققاً سحابياً** (C3) | data.js:54 |
| fund_type | FundType | نص (`food`/`diwan`/`donation`) | نعم | — | CALC | يوجّه السند لمساره المحاسبي | fin.js:66,353,395 |
| receipt_date | ReceiptDate | تاريخ | نعم | — | CALC | تصفية الفترة + القفل | fin.js:46؛ operations.js:100 |
| payer_type | PayerType | نص (`member`/`contact`/…) | نعم | — | CALC | يحدد مسار الغداء للعضو | receipt-settlement.js:193 |
| member_id | MemberId | نص/UUID | مشروط | FK→members | CALC | ربط العضو | fin.js:66 |
| contact_id | ContactId | نص/UUID | اختياري | FK→contacts | DISPLAY | — | data.js:54 |
| payer_name | PayerName | نص | مشروط | — | DISPLAY | اسم غير العضو؛ يستخدم في probe التكرار | fin.js:483 |
| amount | AmountNative | عدد | اختياري | — | DISPLAY | المبلغ الأصلي بالعملة | data.js:54 |
| currency | Currency | نص | اختياري | — | DISPLAY | العملة الأصلية | data.js:54 |
| amount_ils | AmountILS | **عملة (2dp، غير Float)** | نعم | — | CALC | **مبلغ المحاسبة الوحيد** (FD-021) | fin.js:463 |
| exchange_rate | ExchangeRate | عدد | اختياري | — | DISPLAY | سعر الصرف وقت الإدخال | data.js:54 |
| payment_method | PaymentMethod | نص | اختياري | — | DISPLAY | وسيلة الدفع | data.js:54 |
| description / notes | Desc/Notes | نص | اختياري | — | DISPLAY | وصف السطر في الكشف | fin.js:67 |
| donation_display_fund | DonationDisplayFund | نص (`food`/`diwan`) | مشروط | — | CALC | وجهة عرض التبرع | fin.js:94,395 |
| food_donation_allocation | FoodDonAllocation | نص (`reduce_deficit`/`support_current`) | مشروط | — | CALC | وجهة البند 9 | foodDonationAllocation.js:48 |
| manual_allocation | ManualAlloc | منطقي | اختياري | — | CALC | يحوّل السند لمسار التجاوز اليدوي | fin.js:308 |
| manual_debt_settlement | ManualDebt | عملة | مشروط | — | CALC | split يدوي: ذمة | fin.js:330 |
| manual_historical_donation | ManualHist | عملة | مشروط | — | CALC | split يدوي: عجز | fin.js:330 |
| manual_current_support | ManualCurrent | عملة | مشروط | — | CALC | split يدوي: دعم حالي | fin.js:330 |
| movement_type | MovementType | نص (كتالوج EVENTS) | مشروط | — | CALC/COND | التصنيف الصريح؛ يشمل `historical_debt_collection` (ق4) | model2.js:60-106 |
| destination_treasury | DestTreasury | نص (خزينة) | مشروط | — | CALC/COND | وجهة الخزينة (يكتبها P2-C) | fin2.js:27,113 |
| source_treasury | SourceTreasury | نص (خزينة) | مشروط | — | CALC/COND | مصدر التحويل | fin2.js:114 |
| movement_reason | MovementReason | نص | مشروط | — | AUDIT | سبب الحركة | fin2.js:94 |
| register_category | RegisterCategory | نص | اختياري | — | DISPLAY | فئة السجل العيني | fin.js:612 |
| created_by / created_by_uid | CreatedBy/Uid | نص | نعم | — | AUDIT | هوية المُنشئ | data.js:54 |
| created_at | CreatedAt | تاريخ/وقت | نعم | — | AUDIT/CALC | كسر تعادل الترتيب | foodDonationAllocation sort |
| is_deleted | IsDeleted | منطقي | نعم | — | AUDIT/CALC | حذف منطقي؛ يُستثنى من كل حساب | fin.js:66 (كل المرشّحات) |
| version | Version | عدد | نعم | — | AUDIT | رقم النسخة للقطات | operations.js:151 |
| ownership_state | OwnershipState | نص | نعم | — | AUDIT | ملكية السند | data.js:54 |

## 2. payments — المصروفات (`data.js:55`)

نفس بنية receipts مع: `payment_date`, `beneficiary_type`, `beneficiary_name`, `expense_type`, `approved_by`. الاستخدام المحاسبي عبر `fundLedger` (مدين) و`amountOf`. `movement_type='refund'` يستخدم في `refund-engine.refundedTotal` (مع `origin_receipt_id`). كل الحقول CALC/DISPLAY كما في receipts؛ `amount_ils` هو مبلغ المحاسبة.
المصدر: `fin.js:378-380,28-33`؛ `refund-engine.js:28-33`.

## 3. members — الأعضاء (`data.js:56-57`)

| حقل المصدر | المقترح | النوع | إلزامي | الاستخدام | القاعدة | المصدر |
|---|---|---|---|---|---|---|
| id | MemberId | UUID | نعم (PK) | KEY | — | data.js:56 |
| name | Name | نص | نعم | DISPLAY/KEY | — | fin.js |
| phone | Phone | نص | اختياري | DISPLAY | — | — |
| member_code | MemberCode | نص | اختياري | DISPLAY | يظهر في تقرير المديونية | fin.js:661 |
| notes | Notes | نص | اختياري | DISPLAY | — | — |
| **historical_balance_ils** | HistoricalBalanceILS | عملة | نعم | **CALC** | الافتتاح التاريخي — المصدر الوحيد للافتتاح | fin.js:42 |
| **historical_payments_ils** | HistoricalPaymentsILS | عملة | نعم | **CALC** | مدفوعات ما قبل النظام | fin.js:43 |
| opening_balance | (OpeningBalance_legacy) | عملة | — | **IGNORED** | **لا يدخل الكشف** (منع ازدواج) — عرض/تحقق فقط | fin.js:40-41؛ data.js:56 |
| prepaid_subscription_ils | (Prepaid_legacy) | عملة | — | **IGNORED** | **لا يدخل الكشف** (منع ازدواج) | fin.js:40-41 |
| credit_balance_ils | (CreditBalance_legacy) | عملة | — | IGNORED | مقروء، غير مستخدم في الصيغة الحالية | data.js:57 |
| is_active | IsActive | منطقي | نعم | CALC | يحدد أهلية الشطب (CA-007) ونطاق تقرير المديونية | writeoff-engine.js:34؛ fin.js:633 |
| active_from_year | ActiveFromYear | عدد | اختياري | DISPLAY/نموذج | مُدخل لـ `calcHistoricalFromYear` | fin.js:765 |
| is_migration_exception | IsMigrationException | منطقي | — | DISPLAY | علامة استثناء ترحيل | data.js:57 |
| created_at | CreatedAt | تاريخ/وقت | نعم | CALC | ترتيب التزامات (allocation-integration) | allocation-integration.js:83 |

## 4. member_subscriptions — الاشتراكات (`data.js:67`)

| حقل | المقترح | النوع | إلزامي | الاستخدام | القاعدة | المصدر |
|---|---|---|---|---|---|---|
| id | SubId | UUID | نعم (PK) | KEY | — | data.js:67 |
| member_id | MemberId | UUID | نعم (FK) | KEY | — | fin.js:49 |
| year | Year | عدد | نعم | CALC | سنة الاستحقاق؛ هوية مالية للقفل | fin.js:61؛ migration ig004 |
| due_amount_ils | DueAmountILS | عملة | نعم | CALC | الاستحقاق | fin.js:60 |
| paid_amount_ils | PaidAmountILS | عملة | نعم | **CALC (مصدر وحيد)** | المدفوع — لا مصدر ثانٍ (V3) | migration p0_v3 |
| balance_ils | (derived) | عملة | — | IGNORED(عميل) | مشتق `due−paid` على القاعدة؛ العميل لا يقرؤه | data.js:62-67؛ migration p0_v3 |
| override_* | — | — | — | **ممنوع** | override لا سلطة له دستورياً | migration p0_v3 |

## 5. annual_dues — الاستحقاقات السنوية (`data.js:60`, `SELECT *`)

جدول تعريف سنة الاشتراك؛ يُنشأ عبر BO-10 مع صفوف `member_subscriptions`.
**حالة DDL: غير متوفّر في المستودع** — لا يوجد `create table annual_dues` في `supabase/migrations/`، ولا صفوف في `lab/seed/prod-snapshot.json`. **لا يجوز قفل مخطط Excel لهذا الجدول قبل تصدير DDL من قاعدة الإنتاج (فجوة محمولة إلى 1B).** الأعمدة المؤكّدة من **استخدام الكود فقط**:

| حقل (من الكود) | النوع | إلزامي | الاستخدام | مرجع الدالة | المصدر |
|---|---|---|---|---|---|
| id | UUID | نعم (PK) | KEY | إرجاع `annual_id` | operations.js:324,331 |
| year | عدد | نعم | KEY/CALC (مفتاح سنة) | `duesRow.year`؛ `dues-workspace` عرض | operations.js:321,330؛ dues-workspace.js:62,112,115 |
| amount | عملة | نعم | قيمة الاستحقاق للسنة (مصدر `due_amount_ils` عند التوليد) | `duesRow.amount` | operations.js:321؛ dues-workspace.js:98,112,114 |

أي عمود آخر في `SELECT *` **غير معروف** ولم يُسنَد له تصنيف (تجنّب CALC بلا مرجع دالة). يُستكمل بتصدير DDL.

## 6. refunds — الاستردادات (`data.js:71`) — [مشروط/فارغ اليوم]

`id, no, movement_type, origin_receipt_id, member_id, amount, amount_ils, currency, destination_treasury, payment_date, is_deleted`. الاستخدام: خروج من خزينة الأصل (`fin2.js:125-130`)؛ إعادة خلق ذمة العضو (`fin.js:102-106`). كيان مستقل عن `payments`. المصدر: data.js:71؛ refund-engine.js.

## 7. member_write_offs — الشطوبات (`data.js:72`) — [مشروط/فارغ اليوم]

`id, no, movement_type (debt_write_off/credit_write_off), member_id, amount, amount_ils, receipt_date, is_deleted`. غير نقدي؛ يحل الذمة/الرصيد الدائن في الكشف (`fin.js:79-89`). المصدر: data.js:72؛ writeoff-engine.js.

## 8. internal_transfers — التحويلات الداخلية (`data.js:74`) — [مشروط/فارغ اليوم]

`id, no, movement_type, source_treasury, destination_treasury, amount, amount_ils, currency, transfer_date, reason, approving_director, created_by, created_at, is_deleted`. **غير قابل للتعديل/الحذف (DB-enforced)**. ينقل بين الخزائن فقط؛ لا يمس ذمم الأعضاء. المصدر: data.js:74؛ fin2.js:131-140؛ operations.js:535-568.

## 9. allocation_records — سجلات التسوية الصريحة (`data.js:91`) — [مشروط بـ `RECEIPT_ALLOCATION_ENABLED`]

`id, source_ref, source_kind, member_id, obligation_kind (due/historical/food), year, amount_allocated, voided_at, refunded_at`. يُقرأ فقط حين `source_kind='receipt_settlement'`. القارئ الوحيد: `FIN.memberAllocation` (`fin.js:202-231`) + `FIN2.settlementHistoricalByReceipt`/`settlementDeficitSlice`. سطر ملغى (`voided_at`) أو مسترد (`refunded_at`) لا يبقى فعالاً. المصدر: data.js:85-92.

## 10. fiscal_snapshots — لقطات الإقفال (`data.js:76`)

`id, closed_through, previous_lock, snapshot (JSON), created_by, created_at`. لقطة تقارير الإقفال (IG-016)؛ أحدث لقطة تغطّي السنة تفوز؛ التاريخ لا يُستبدل. المصدر: data.js:76؛ fin.js:503-546.

## 11. historical_subscription_truth — حقيقة الاشتراك التاريخي (`data.js:79`)

`id, member_id, year, status (paid/partial/unpaid/unknown), source, approved_by, approved_at`. **سلطة عرض فقط** لحالة السنة في `memberDelinquency.byYear`؛ **لا يدخل أي رصيد/خزينة/توزيع**. `unknown` ⇒ العودة للمشتق. المصدر: data.js:77-79؛ fin.js:444-458,159-169.

## 12. settings — الإعدادات (`data.js:30,120`)

مفاتيح/قيم: `usd_rate`, `jod_rate`, `food_opening_balance` (= الأصل الذي يفتح خزينة العجز التاريخي، **محل تعارض C5: -8639/-8689**), `diwan_opening_balance` (يفتح الديوان), `food_opening_usd/jod`, `diwan_opening_usd/jod`, `locked_through_year`, `current_operating_year`. المصدر: data.js:118-156؛ allocation-integration.js:68-74.
**تنبيه تعيين الافتتاحيات (data.js:143-152):** `food_opening_balance` **لا** يفتح خزينة الغداء — يفتح خزينة العجز التاريخي؛ خزينة الغداء تفتح بـ 0.

## 13. contacts, audit_log, attachments

- `contacts` (`SELECT *`): جهات اتصال غير أعضاء. **حالة DDL: غير متوفّر في المستودع** (لا `create table`، لا صفوف في اللقطة) — **لا تُقفل مخطط Excel قبل تصدير DDL (فجوة محمولة إلى 1B).** المؤكّد من الكود: `id` (PK, KEY)، `name` (DISPLAY) — (`crud.js`/`forms.js`: `c.id`, `c.name`؛ `c.style`/`c.value` عناصر DOM لا أعمدة). الهاتف وأي عمود آخر **غير مؤكّد** — لا يُسنَد له تصنيف حتى تصدير DDL.
- `audit_log` (`data.js:61`): `id, action, description, user_name, actor_user_id, actor_role, ip, reason, table_name, record_id, old_data, new_data, created_at` — AUDIT. يُحمَّل بحد 50 صفاً للعرض.
- `attachments` (`data.js:108`): `receipt_id, payment_id` لعدّ المرفقات فقط — **ليست سجلاً مالياً** (fin audit continuation §2.1).

---

### ملاحظات حاسمة للمهندس المنفّذ
1. الحقول الموسومة **IGNORED** (`opening_balance`, `prepaid_subscription_ils`, `credit_balance_ils`, `balance_ils`) يجب أن تظهر في Excel كـ «عرض/تحقق» فقط، وألا تُغذّي أي صيغة — إدخالها يسبب ازدواجاً.
2. كل كيانات **[مشروط/فارغ اليوم]** (refunds, write_offs, internal_transfers, allocation_records) موجودة في النموذج لكنها فارغة على بيانات الإنتاج حتى تُفعَّل الأعلام؛ تُنمذَج في Excel لكن تُترك عملياتها معطّلة حتى توثَّق شروطها (C8).
3. لا يوجد عدد حقول «مستهدف» — هذا الجرد نتج عن القراءة الفعلية لقوائم `select` واستخدام كل حقل.
