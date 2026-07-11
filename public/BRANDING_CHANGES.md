# Rebrand — ديوان آل طه Identity v3 (المضافة والشجرة)

اعتماد الهوية البصرية الرسمية v3: شجرة الزيتون + المضافة الحجرية بالقبة والسقف القرميدي
+ «ديوان آل طه» / DIWAN AL-TAHA. استُبدل الرمز الهندسي السابق (COUNCIL) في كل مواضع النظام.
المرجع الكامل: `docs/branding/BRAND_GUIDELINES.md`.

## Files modified
- `public/logo.svg` — الشعار الكامل (خلفيات فاتحة)
- `public/logo-dark.svg` — الشعار الكامل (خلفيات داكنة، حبر عاجي)
- `public/favicon.svg` (جديد) + `favicon.ico`, `favicon-16x16/32x32/48x48.png` — أُعيد توليدها من الأيقونة المربعة
- `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — أيقونات جديدة
- `public/web-app-manifest-192x192.png`, `web-app-manifest-512x512.png` (جديد) — maskable بتسمية الحزمة الرسمية
- `public/site.webmanifest` — أيقونات maskable 192+512، theme/background أبيض
- `public/brand/` (جديد) — حزمة الأصول الرسمية الكاملة (light/dark/mono/print/mark/icon/watermarks + سلم PNG 64→1024)
- `public/index.html` — روابط الأيقونات، شعار الدخول، شعار الهيدر → الرمز الجديد
- `public/reset-password.html`, `public/verify.html` — الرمز الجديد + favicon.svg
- `public/js/print.js` — `BRAND_LOGO` أصبح رمز v3 (base64) في ترويسة كل التقارير/السندات/الكشوف

## Unchanged on purpose
- ألوان وتنسيقات واجهة التطبيق والطباعة (chrome) — هذا استبدال شعار فقط، دون أي تغيير في
  الأعمال أو الألوان العامة أو التخطيطات، التزامًا بالتكليف.
