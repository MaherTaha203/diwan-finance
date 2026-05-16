# ديوان آل طه — نظام الإدارة المالية

## هيكل الملفات
```
diwan-finance/
├── server.js          ← السيرفر
├── package.json       ← المكتبات
├── .env               ← بيانات Supabase (لا ترفعه!)
├── .gitignore
└── public/
    ├── index.html     ← الواجهة
    ├── css/
    │   └── app.css    ← التنسيقات
    └── js/
        └── app.js     ← المنطق
```

## تشغيل على جهازك (VS Code)

```bash
# 1. افتح Terminal في VS Code
# 2. ثبّت المكتبات (مرة واحدة فقط)
npm install

# 3. شغّل السيرفر
npm run dev

# 4. افتح المتصفح
# http://localhost:3000
```

## رفع على الإنترنت (Vercel)

1. سجّل في vercel.com
2. ارفع المجلد
3. أضف متغيرات البيئة في Vercel:
   - SUPABASE_URL
   - SUPABASE_KEY
