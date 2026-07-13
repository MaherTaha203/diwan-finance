# Rebrand — ديوان آل طه: الحزمة الرسمية بنسختي Light/Night

اعتُمدت الحزمة الرسمية المسلَّمة من مالك المشروع (نسختا `light/` و`night/`) كمصدر الحقيقة
الوحيد، مع وحدة مركزية `BrandAssets` تختار النسخة تلقائيًا حسب وضع التطبيق.
لم يُعدَّل أي بكسل؛ ملفا SVG وصلا كغلافين دون حمولة الصورة فاستُعيدا بتضمين PNG الرسمي.
المرجع الملزم: `docs/branding/BRAND_GUIDELINES.md`.

## القاعدة
- **light** (حبر كحلي): للخلفيات الفاتحة — يُستخدم تلقائيًا في وضع التطبيق الفاتح (favicon وأي موضع متغيّر).
- **night** (حبر عاجي): للخلفيات الداكنة — وضع التطبيق الداكن، والأسطح الداكنة الثابتة
  (هيدر التطبيق، لوحة الدخول، صفحتا التحقق وإعادة التعيين).
- **الطباعة**: شعار داكن (نسخة light) على ورق أبيض دائمًا، مضمّنًا data URI.
- ممنوع تلوين SVG عبر CSS — لكل خلفية أصلها المخصص.

## الأصول المثبتة
- `public/brand/light/**` + `public/brand/night/**` — الحزمة كاملة كما سُلِّمت
  (PNG 32→2048 + onbg، Favicon، ICO، ICNS، PDF، Android، AppleAppIcon، SVG المستعاد)
- جذر `public/`: `favicon.ico` + `apple-touch-icon.png` (نسخة light — أعراف المتصفحات)

## Files modified
- `public/js/brand-assets.js` (جديد) — الوحدة المركزية: `getLogo/getLogoMark/getAppIcon/getPrintLogo/getFavicon`
  + متابعة تلقائية لتبديل الوضع (MutationObserver على `body.light`) + تحديث الفافيكون
- `public/index.html` — روابط أيقونات بمعرّفات يديرها BrandAssets، تحميل الوحدة أولًا،
  شعار الدخول والهيدر عبر `data-brand`
- `public/verify.html` · `reset-password.html` — رمز night عبر `data-brand`
- `public/js/print.js` — `BRAND_LOGO` عبر `BrandAssets.getPrintLogo()`
- `public/site.webmanifest` — أيقونات light بمسارات مطلقة

## Removed legacy assets
- شجرة `public/brand/` أحادية النسخة السابقة (حزمة يوليو الأولى + المشتقات)
- أيقونات الجذر القديمة: `android-chrome-*`, `favicon-16/32/48`, `favicon.svg` القديمة

## Unchanged on purpose
- ألوان الواجهة والتخطيطات والمسافات والمسارات والمنطق — استبدال أصول فقط.
