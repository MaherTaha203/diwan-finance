# OUTPUT-002-C · UX Slice 4 — Output/Organization Profile Propagation

**الهدف:** `Settings → Output/Organization Profile → Output Document Composition → Print/PDF` بحيث يصبح **الـ Profile هو المصدر المركزي الوحيد** لهوية مستندات الإخراج. توحيد **DATA SOURCE** لا زيادة محتوى المستند. بلا مصدر حقيقة ثانٍ، وبلا مساس بـ FIN/الحسابات/الأرصدة/المخطط/الفرز/الـ pagination (Slice 2)/الفورمز.

## 1) الجرد (Audit — قبل التعديل)

| المصدر | الموضع | التصنيف | الإجراء |
|---|---|---|---|
| `OutputProfile.org()` / `output()` | `output-profile.js` | **Profile-backed** (المصدر المركزي) | لا شيء — هذا هو المصدر |
| رأس التقارير عبر `orgOf(meta)` | `report-layout.js` | **Profile-backed** (منذ Slice 1) | لا شيء — يقرأ `OutputProfile.org()` |
| `DEFAULT_ORG` | `report-layout.js:63` | **Derived/Fallback** | إبقاء — احتياط أخير فقط عند غياب وحدة Profile (اختبارات node)؛ `OutputProfile` يفوز دائمًا في التطبيق |
| `BRAND_NAME/SUBTITLE/SITE` | `print.js:249‑251` | **Hard-coded** (هوية سندات) | **أُصلح** — `reportHeader` يقرأ من `OutputProfile.org()`؛ تبقى ثوابت `BRAND_*` احتياطًا فقط |
| `BRAND_LOGO` | `print.js:253` | **Hard-coded** (شعار سند، يتجاهل Show Logo) | **أُصلح** — شعار السند = `org().logo` (يحترم Show Logo + الرفع المخصّص) |
| `'توقيع الديوان'` | `print.js:281` | **Hard-coded** (والحقل موجود في Profile) | **أُصلح** — `reportDfoot` يقرأ `org().signatoryTitle` |
| `verifyUrl = https://www.diwan-finance.com/verify/<token>` | `print.js` | **Hard-coded (نقطة تحقّق وظيفية)** | إبقاء — دومين التحقّق الفعلي؛ ربطه بالـ Profile يكسر روابط التحقّق. مُوثّق. |
| نصّ QR caption `diwan-finance.com/verify` | `print.js` | **Hard-coded (وظيفي)** | إبقاء — الصيغة المقروءة لرابط التحقّق المقترن بالـ QR. مُوثّق. |
| تذييل لوحة الخزينة `ديوان آل طه — diwan-finance.com` | `app.js:649` | **App Shell / UI شاشة** | خارج نطاق «مستندات الإخراج» — لوحة شاشة لا مستند طباعة. مُوثّق (لم يُخفَ). |
| حقول Profile: phone/email/address | `output-profile.js` | **Profile-backed لكن غير معروضة** | لا تُضاف للمستندات — وجود الحقل ≠ طباعته (بحسب الطلب) |

**لم يُنشأ أي مصدر حقيقة ثانٍ.** الوحيد المتبقّي المصلّب هو نقاط التحقّق الوظيفية (verify URL/QR) وتذييل لوحة شاشة — كلاهما ليس «هوية مستند مطبوع» قابلة للتوحيد بأمان ضمن هذه الشريحة، ومُوثّق صراحةً أعلاه بدل إخفائه أو توسيع النطاق.

## 2) عقد الشعار (نهائي)
شعار Output Settings = **DOCUMENT OUTPUT LOGO**. يظهر في Print/PDF افتراضيًّا، ولا يظهر مطلقًا داخل تقارير/كشوف/قوائم/معاينات الشاشة. `Show Logo`: ON ⇒ Print/PDF يعرضان الشعار؛ OFF ⇒ يُخفى في Print/PDF. القرار في **مسار التصيير/التركيب** لا CSS: التقارير عبر `header(meta,lang,target)` (screen ⇒ بلا ماستهيد)، والسندات عبر `voucherOrg().logo` (فارغ عند Show Logo=OFF). شعار App Shell خارج النطاق.

## 3) الإصلاح (توحيد مصدر البيانات)
- `print.js`: دالة `voucherOrg()` تقرأ `OutputProfile.org()` (اسم/وصف/موقع/شعار/عنوان التوقيع) مع pick عربي واحتياط `BRAND_*`. `reportHeader()` و`reportDfoot()` صارا يستهلكانها. الشعار يُصيَّر فقط حين `org.logo` غير فارغ (يحترم Show Logo). يغطّي **سند القبض + سند الصرف + سند التحويل الداخلي** (وكلها تمرّ عبر `reportHeader`/`reportDfoot`)، وكذلك مسار المحرّك `VoucherRenderer` الذي يعيد استخدام نفس البُناة حرفيًّا.
- **لم تُضف حقول جديدة** (لا هاتف/بريد/عنوان) للمستند.

## 4) اختبار End-to-End حيّ (Settings → Save → Reload → Compose → Print/PDF)
Playwright حيّ، عبر واجهة الإعدادات الحقيقية (`openOutputSettings` → تعبئة → `saveOutputSettings`) ثم **إعادة تحميل فعلية** للصفحة:

| المرحلة | الاسم | الموقع | Show Logo | سند القبض | سند الصرف | تقرير (Print/Screen) |
|---|---|---|:--:|:--:|:--:|:--:|
| Baseline | ديوان آل طه | diwan-finance.com | ON | اسم+موقع+شعار+توقيع ✓ | اسم+شعار ✓ | Print شعار ✓ · Screen بلا شعار/اسم ✓ |
| **بعد الحفظ + Reload** | **ديوان آل طه — اختبار الإخراج** | **e2e.example.test** | ON | يعرض الاسم+الموقع الجديدين ✓ | يعرض الاسم الجديد ✓ | Print شعار · Screen بلا شعار ✓ |
| Show Logo = OFF (Reload) | (المتغيّر) | (المتغيّر) | OFF | **بلا شعار** ✓ · التوقيع باقٍ | **بلا شعار** ✓ | Print **بلا شعار** · Screen بلا شعار ✓ |
| Show Logo = ON (Reload) | (المتغيّر) | (المتغيّر) | ON | **الشعار المخزّن يعود** ✓ | الشعار يعود ✓ | Print شعار يعود ✓ |

**صفر أخطاء console.** لقطات PDF حقيقية A4: `rec-logo-on` (يُظهر الاسم/الموقع المتغيّرين + الشعار + «توقيع الديوان»)، `pay-logo-on`، `rec-logo-off` (بلا شعار). التغيير يظهر فعليًّا في المستند بعد إعادة التحميل — لا اعتماد على unit test وحده.

## 5) رفع الشعار
المسار الحالي صالح (لم يُنشأ نظام جديد): `output-settings.js` يحوّل الملف إلى data-URI (سقف 2MB) → `OutputProfile.set` → localStorage؛ زر «حذف (العودة للافتراضي)» يمسح المخصّص. أُثبت حيًّا: Upload/Select → Save → Reload → Print/PDF يعرض الشعار؛ Show Logo OFF → بلا شعار؛ Show Logo ON → **نفس** الشعار المخزّن يعود؛ ولا يظهر في تقرير الشاشة في الحالتين.

## 6) عدم التكرار
لكل معلومة موضع واحد: الاسم/الموقع/الشعار **مرّة** في الماستهيد؛ تاريخ الطباعة **مرّة** في التذييل؛ التوقيع **مرّة**؛ لا رقم صفحة مكرّر (السندات صفحة واحدة). اختبار الوحدة يؤكّد `class="osub"` تظهر **مرّة واحدة**. (نصّ QR caption يحمل رابط التحقّق الوظيفي لا الموقع البراندي — ليس تكرار هوية.)

## 7) حماية النطاق
لم يُمَسّ: تصميم المستندات، حجم/موضع الشعار (سوى ظهوره/إخفاؤه حسب العقد)، FIN/الحسابات/الأرصدة، مخطّط قاعدة البيانات، الفرز، الـ pagination (Slice 2)، الفورمز. ولم تُضف حقول للمستند لمجرّد وجودها في Profile.

## 8) مصفوفة القبول

| المستند/السطح | مصدر الهوية | Logo Screen | Logo Print | Logo PDF | ShowLogo يُحترم | هوية مصلّبة متبقية |
|---|---|:--:|:--:|:--:|:--:|---|
| كشف حساب العضو | `OutputProfile.org()` (المحرّك) | **NO** | Profile (ON افتراضيًّا) | Profile | **YES** | لا (DEFAULT_ORG احتياط فقط) |
| كشف صندوق الديوان | المحرّك | **NO** | Profile | Profile | **YES** | لا |
| كشف صندوق الغذاء | المحرّك | **NO** | Profile | Profile | **YES** | لا |
| تقرير المديونية السنوية | المحرّك | **NO** | Profile | Profile | **YES** | لا |
| الأعضاء المتأخرون | المحرّك | **NO** | Profile | Profile | **YES** | لا |
| سند القبض | `OutputProfile.org()` (`voucherOrg`) — جديد | N/A (بلا شاشة) | Profile | Profile | **YES** (جديد) | verify URL/QR caption (وظيفي، مُوثّق) |
| سند الصرف | `voucherOrg` — جديد | N/A | Profile | Profile | **YES** (جديد) | نفسه |
| سند التحويل الداخلي | `voucherOrg` — جديد | N/A | Profile | Profile | **YES** (جديد) | QR site (وظيفي) |

**المحصّلة:** Screen report logo = NO · Print/PDF logo = Profile-controlled · Document identity = Profile-backed · هوية مصلّبة مكرّرة = NONE (المتبقّي = نقاط تحقّق وظيفية + تذييل لوحة شاشة، مُوثّقة) · تغييرات الإعدادات تنتشر بعد إعادة التحميل.

## التحقّق
- **حيّ:** `slice4-e2e` (المصفوفة أعلاه، صفر أخطاء) + لقطات PDF.
- **وحدة:** `tests/voucher-profile-identity.test.cjs` (12/12) — السندات Profile-backed، الانتشار، عقد Show Logo (OFF/ON مع إبقاء المخزّن)، عنوان التوقيع، عدم التكرار. و`tests/output-profile.test.cjs` القائم يقفل مصدر البيانات.
- **حزمة node:** لا إخفاقات جديدة (الاثنان القديمان فقط).
