# Rebrand — ديوان آل طه: الحزمة الرسمية المعتمدة (Official Brand Package)

اعتُمدت ملفات الهوية الرسمية المسلَّمة من مالك المشروع (`Broomet_brand_assets.zip`) كمصدر
الحقيقة الوحيد، واستُبدل بها كل ما سبق (الرمز الهندسي COUNCIL ثم الرسم المتجهي المؤقت v3).
لم يُعدَّل أي بكسل في الأصول؛ المقاسات الإضافية مشتقة حصريًا بإعادة تحجيم Lanczos عالية الجودة.
المرجع الكامل: `docs/branding/BRAND_GUIDELINES.md`.

## الأصول المثبتة
- `public/brand/` — الحزمة الرسمية كاملة كما سُلِّمت: `PNG/` (32→4096 + شفاف + خلفية بيضاء)،
  `Favicon/`، `ICO/`، `ICNS/`، `PDF/`، `SVG/`، `Android/`، `AppleAppIcon/`
- `public/brand/derived/logo-white-128.png` و `logo-white-256.png` — مشتقان ميكانيكيًا
  (Lanczos فقط) من `PNG/logo-white-1254.png` لواجهات الهيدر الداكنة
- `public/brand/SVG/logo-master.svg` و `public/favicon.svg` — غلافا SVG بصيغة الحزمة نفسها
  بعد استعادة حمولة الصورة المفقودة بتضمين PNG الرسمي (بلا أي تغيير مرئي)
- جذر `public/`: `favicon.ico`، `favicon-16x16/32x32/48x48.png`، `apple-touch-icon.png`،
  `android-chrome-192x192.png`، `android-chrome-512x512.png`، `favicon.svg`

## Files modified
- `public/site.webmanifest` — أيقونات `android-chrome-*` بأسمائها الرسمية، theme/background أبيض
- `public/index.html` — شعار الدخول + شعار الهيدر → `brand/derived/logo-white-128.png`
- `public/reset-password.html`, `public/verify.html` — الشعار الرسمي في الترويسات
- `public/js/print.js` — `BRAND_LOGO` = `PNG/logo-128.png` الرسمي (base64، بايت-ببايت)
  في ترويسة كل التقارير والسندات والكشوف

## Removed legacy assets
- كل ملفات `public/brand/` المولّدة سابقًا (14 SVG + 12 PNG متجهية مؤقتة)
- `public/logo.svg`, `public/logo-dark.svg` (الرسم المؤقت)
- `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`,
  `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`
  (حلّت محلها ملفات `android-chrome-*` الرسمية)

## Unchanged on purpose
- ألوان الواجهة والتخطيطات والمسافات كلها كما هي — استبدال أصول فقط.
