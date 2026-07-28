<div dir="rtl">

# دليل المدير التقنيّ — نظام ديوان آل طه المالي

> دليل **الصيانة والتطوير** للمهندس/المشرف التقنيّ على الشيفرة: الفلسفة المعمارية، بنية
> المستودع، النموذج الطبقيّ، محرك التقارير، مساحات العمل، الاختبارات، اتفاقيات الشيفرة،
> وكيفية الإضافة والتعديل بأمان. مبنيٌّ على الشيفرة الفعلية.
>
> **يكمّل** — لا يكرّر — دليلَي: **المستخدم** (`USER_GUIDE.md`) و**المدير التشغيليّ**
> (`ADMIN_GUIDE.md`: النشر/البيئة/الأسرار/دوالّ الحافة/النسخ). هذا الدليل عن **الكود**.

## المحتويات
1. [الفلسفة المعمارية](#1-الفلسفة-المعمارية)
2. [بنية المستودع](#2-بنية-المستودع)
3. [النموذج الطبقيّ](#3-النموذج-الطبقي)
4. [البيئة التطويرية](#4-البيئة-التطويرية)
5. [محرك التقارير REPORT-001](#5-محرك-التقارير-report-001)
6. [مساحات العمل (Workspaces)](#6-مساحات-العمل)
7. [العمليات التجارية والدساتير](#7-العمليات-التجارية-والدساتير)
8. [الاختبارات وضمان الجودة](#8-الاختبارات-وضمان-الجودة)
9. [اتفاقيات الشيفرة](#9-اتفاقيات-الشيفرة)
10. [الأداء وإمكانية الوصول](#10-الأداء-وإمكانية-الوصول)
11. [وصفات: كيف تُضيف…](#11-وصفات-كيف-تضيف)
12. [المراجع](#12-المراجع)

---

## 1. الفلسفة المعمارية

- **بلا خطوة بناء (no-build):** HTML/CSS/JS خام. لا bundler/webpack/Vite. الوحدات تُحمَّل
  عبر `<script defer>` بترتيب صريح في `index.html`، وتتشارك **نطاقاً عامّاً** (globals على
  `window`/النطاق اللغويّ). مفاهيم bundling/tree-shaking/code-splitting **لا تنطبق**.
- **`module.exports` للاختبارات فقط:** كلّ وحدة قابلة للتشغيل تحت Node بنمط
  `if (typeof module !== 'undefined' && module.exports) …` بجانب التعليق على `window` — فتُختبَر
  الدوالّ النقيّة بلا متصفّح.
- **RTL/عربيّ أوّلاً:** `<html lang="ar" dir="rtl">`؛ الأرقام/الرموز LTR عبر عزل الاتجاه.
- **الويب الثابت + Supabase:** الواجهة على Vercel (ثابتة)، والخلفية Postgres + RLS + Edge
  Functions. **RLS هو سلطة التخويل**، ومفتاح anon عامّ.
- **القاعدة الحاكمة:** لا كتابة إلا عبر العمليات المعتمدة والقواعد الدستورية؛ لا حساب ماليّ
  خارج المحرك (`FIN`).

## 2. بنية المستودع

```
public/
  index.html            ← القشرة + ترتيب تحميل 49 وحدة JS + صفحة الدخول
  css/app.css           ← نظام التصميم (ثيمات متعددة، رموز --token)
  js/                   ← 49 وحدة (انظر الطبقات في §3)
server.js               ← Express (استضافة ذاتية/تطوير) + /api/config
vercel.json             ← نشر ثابت + رؤوس أمان + إعادة كتابة /verify
api/                    ← دوالّ Vercel (verify.js لمسار /verify) + خدمات phase15
supabase/
  migrations/           ← هجرات دستورية/مصادقة (للأمام فقط)
  functions/            ← admin-users · change-password · login-gate · _shared
tests/                  ← 111 مجموعة Node (.cjs/.test.cjs/.test.mjs) + LEGACY_SUITES.md
lab/                    ← المختبر الدستوري (run.cjs → 90/90 · 23/23)
tools/ux-live-review.mjs← أداة QA: بذرة غير إنتاجية + تمريرة a11y لكل صفحة
docs/                   ← الحوكمة · التصميم · التقارير · الأداء · UX · الإصدار · الأدلة
```

## 3. النموذج الطبقيّ

```
البيانات (Supabase) → DB (مصفوفات في الذاكرة) → FIN (المحرك المالي، مصدر الحقيقة للأرقام)
                                              → ReportModel (إسقاط محايد) → Layout → Renderers
```

- **طبقة البيانات:** `data.js` (`loadAllData` = `Promise.all` لـ~13 استعلاماً متوازياً) →
  يملأ `DB.{receipts,payments,members,contacts,annual,audit,subscriptions,…}`.
- **المحرّك المالي:** `fin.js` + `fin2.js` + `model2.js` + `foodDonationAllocation.js` +
  `fin-contract.js` + `allocation-engine/-integration` + `refund/writeoff-engine`. **كلّ رقمٍ
  ماليّ يُقرأ من `FIN.*`** — لا حساب في طبقة العرض.
- **العرض:** `app.js` (القشرة/الحالة/غالبية الرسم) + `reports.js` + مساحات العمل + `print.js`
  + محرك التقارير (§5).
- **البنية التحتية:** `auth.js`/`auth-password.js`، `crud.js`، `operations.js`، `ui-nav.js`،
  `ui-infra.js`، `forms.js`، `i18n.js`، `sidebar.js`، `floating-labels.js`، `a11y-keyboard.js`.

> `DB` و`FIN` **متغيّرات نطاقٍ لغويّ** (ليست على `window`) — تصل إليها الوحدات كمتغيّرات حرّة.

## 4. البيئة التطويرية

- **تشغيل محليّ:** `npm start` (`node server.js`) أو `npm run dev` (nodemon). يخدم `public/`
  ويوفّر `GET /api/config` بـ`{url,key}` من متغيّرات البيئة.
- **الإعداد:** في الإنتاج (Vercel الثابت) مفتاح anon مُضمَّن في `app.js` (عامّ)؛ في server.js
  يأتي من `SUPABASE_URL` + `SUPABASE_KEY/ANON_KEY`. التفاصيل في `ADMIN_GUIDE.md`.
- **لا حاجة لأداة بناء** — عدّل الملفّ وحدّث نسخة الكاش (`?v=`) في `index.html` (§9).

## 5. محرك التقارير REPORT-001

الوحدات: `report-engine.js` (السجلّ + `Report.render/registerRenderer`)، `report-model.js`
(البُناة النقيّة + الجامعات)، `report-layout.js` (تخطيط `rpt-*` مشترك)، والمُصيّرات
`report-render-{print,pdf,excel,screen,voucher}.js`، وجسور التحويل `report-cutover*.js`،
والتفعيل `report-activation.js`.

- **`ReportModel`** — إسقاط محايد قابل للتسلسل: `meta{reportId,title{ar,en},orientation,
  party?,period?,printDate?,filters?,signatures?}`, `summary[]`, `sections[band|table]`.
- **مسار موحّد:** نموذج واحد → `Report.render(model, target)` حيث target ∈
  `screen|print|pdf|excel` (والسندات عبر مُصيّر هجين). فالشاشة == الطباعة == PDF == Excel.
- **أعلام التحويل (13 علماً، كلّها ON افتراضياً بعد R8-a):** `REPORT_ENGINE_*` — تُقرأ عند
  **وقت النداء**، فيمكن إيقاف أيّ سطحٍ فوراً (kill-switch) دون إعادة نشر. لا مسار قديم بعد R8-b/c.
- **الأداء (SYS-002):** مُصيّر الشاشة يمرّر `windowRows` فتُحدَّد الجداول الكبيرة (300+ صفّاً)
  مع زرّ «عرض الكل»؛ الإجماليات دائماً من النموذج الكامل؛ الطباعة/التصدير بلا تحديد.

## 6. مساحات العمل (Workspaces)

`treasury-workspace.js`، `dues-workspace.js`، `collection-workspace.js`،
`payment-workspace.js`، `member-lifecycle.js`، `reservations.js`. تحكمها
`docs/governance/BUSINESS_WORKSPACE_DESIGN_RULES.md`:
- **الفصل State / History / Capability**، و**سؤال عمل رئيسيّ واحد** لكلّ مساحة.
- **تنسيقٌ لا تنفيذ:** كلّ قيمة من قراءةٍ معتمدة؛ الكتابة تُفوَّض لعمليةٍ تجارية معتمدة (BO-xx)،
  لا حساب/كتابة داخل المساحة.

## 7. العمليات التجارية والدساتير

- **BusinessOps (BO-xx):** كلّ كتابةٍ ماليّة عمليةٌ معتمدة (BO-02 تعديل سند … BO-10 تطبيق
  اشتراك …). المساحات/الشاشات تنادي المتحكّم المعتمد؛ التحقّق وRLS في الخلفية.
- **الدساتير (مجمّدة):** `docs/governance/ACCOUNTING_CONSTITUTION.md` + سجلّ الامتثال +
  حرّاس التشغيل الدستورية (هجرات). أيّ تغيير يمرّ عبر الحوكمة، لا تعديلاً مباشراً.

## 8. الاختبارات وضمان الجودة

- **مجموعات Node (111):** `for t in tests/*.cjs …; do node "$t"; done`. الخطّ الأساس الأخضر
  = **109 ناجحة / 2 فاشلة** (الفاشلتان قديمتان تعتمدان على fixture غير موجود — موثّق في
  `tests/LEGACY_SUITES.md`؛ لا تُصلَحا باختلاق بيانات).
- **المختبر الدستوري:** `node lab/run.cjs` → **90/90 تحقّق · 23/23 مُعتمَد** (دورة العضو/السند/
  الاشتراكات/التبرعات/التوزيع/Phase-15/MODEL2).
- **المتصفّح (Playwright):** Chromium على `/opt/pw-browsers/chromium`؛ استيراد
  `import pkg from '/opt/node22/lib/node_modules/playwright/index.js'`.
- **أداة UX الحيّة:** `node tools/ux-live-review.mjs` — بذرة غير إنتاجية (تُحاكي Supabase)
  تُقلع التطبيق مصادَقاً وتمرّ على كلّ صفحة (a11y/عناوين/تسميات). تُستخدَم لأيّ تحقّق UX حيّ.
- **قاعدة:** أيّ تغيير على السطح المرئيّ/الأداء يُرفَق بقياس **قبل/بعد** ولا يمسّ المحاسبة.

## 9. اتفاقيات الشيفرة

- **كسر الكاش:** عند تعديل وحدة، **زد رقم `?v=`** في `index.html` (مثال `app.js?v=2.14`) —
  آلية النشر الثابت الوحيدة لضمان تحميل النسخة الجديدة.
- **أعلام الميزات:** تُقرأ عند وقت النداء (تراجع فوريّ). التفعيل المركزيّ في `report-activation.js`.
- **ختم الدوالّ الحسّاسة:** `sealRestrictedFunctions` في `app.js` يلفّ الطباعة/التصدير/الكتابة
  فيُمنَع المشاهد حتى من الـConsole.
- **التدويل:** سمات `data-i18n`/`data-i18n-placeholder` + جدول `i18n.js`؛ نصوص ثنائية `{ar,en}`.
- **الوصول:** التفاعل بمعالجات مضمّنة (`onclick`)؛ وحدة `a11y-keyboard.js` تجعل كلّ عنصر
  `onclick` قابلاً للتشغيل بلوحة المفاتيح (tabindex+role+Enter/Space) ذاتياً عبر MutationObserver.
- **النمط المزدوج:** كلّ وحدة تُصدّر على `window` + `module.exports` (اختبار).

## 10. الأداء وإمكانية الوصول

- **خطوط الأساس المقيسة:** `docs/performance/SYS-001_*` (DCL ~212مث، مسار بيانات متوازٍ،
  تأجيل المكتبات الثقيلة) و`docs/ux/UX-001_*` (RTL صحيح، تباين، لوحة المفاتيح).
- **المطبَّق:** SYS-002 (تحديد الجداول)، UX-002 (WCAG-AA: لوحة المفاتيح/التباين/الأسماء)،
  UX Tier-2/2b (عناوين `h1` لكل صفحة، تسميات الحقول). المكتبات الثقيلة (`xlsx`/`qrcode`/`jsPDF`)
  تُحمَّل **عند الطلب** لا عند الإقلاع.

## 11. وصفات: كيف تُضيف…

**تقريراً جديداً:** (1) أضِف بانياً نقيّاً في `report-model.js` (`buildXModel`) يُنتج
`ReportModel`، وجامعاً يقرأ `FIN.*`؛ (2) سجّله في `report-engine.js`؛ (3) وفّر عَلماً في
`report-activation.js`؛ (4) اربط أزرار الإخراج بـ`Report.render(model,target)`؛ (5) أضِف
اختبار بانٍ + سطراً في `report-r8-verification`. لا تكتب HTML للتقرير يدوياً — المحرّك يفعل.

**صفحةً جديدة:** أضِف حاوية `<div class="pg" id="pg-x">` بعنوان `<h1 class="ph-t">`، ووجهة
`nav('x')`، وطبّق قواعد الملاحة (`docs/navigation/…`) والوصول (h1 + تسميات الحقول).

**عمليةً تجارية:** عرّفها في طبقة BusinessOps المعتمدة مع تحقّقها الدستوريّ + هجرة/RLS؛ لا
تنفّذ كتابةً من الواجهة مباشرةً — فوّضها للمتحكّم المعتمد.

**تعديل سطح مرئيّ:** عدّل ثم زد `?v=`، شغّل `node --check`، مجموعة Node، والمختبر الدستوري،
وقِس UX عبر `tools/ux-live-review.mjs` (قبل/بعد).

## 12. المراجع

- **الحوكمة/الدساتير:** `docs/governance/`. **القرارات:** `docs/decisions/`.
- **التقارير/الطباعة:** `docs/reporting/REPORT-001_*`, `docs/printing/`.
- **الأداء/UX:** `docs/performance/SYS-00*`, `docs/ux/UX-00*`.
- **الإصدار:** `docs/release/REL-001_*` و`docs/release/v1.0.0/`.
- **التشغيل/النشر:** `docs/guides/ADMIN_GUIDE.md`. **المستخدم:** `docs/guides/USER_GUIDE.md`.

> **قبل أيّ دمج:** node suites + `node lab/run.cjs` خضراء (عدا الـsuiteين القديمين الموثّقين)،
> وصفر تغييرٍ في المحاسبة/DB إلا عبر الحوكمة.

</div>
