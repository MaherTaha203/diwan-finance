// public/js/qr-print.js
// مساعد اختياري لتوليد رمز QR للتحقق في صفحات الطباعة.
// ملاحظة: مسار الطباعة الفعلي للسندات في app.js (buildRecVoucher / buildPayVoucher)
//         يولّد رمز QR مباشرةً من data-qr-url ولا يستخدم هذا الملف.
//         هذا الملف محفوظ كأداة مشتركة قابلة لإعادة الاستخدام، ويجب تغذيته دائماً
//         برمز التحقق verification_token وليس برقم السند.
// يتطلب مكتبة qrcode.js:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

const DiwanQR = {

  // الدومين الأساسي لصفحة التحقق
  BASE_URL: 'https://www.diwan-finance.com/verify/',

  /**
   * توليد QR Code وإدراجه في العنصر المحدد.
   * @param {string} token     - رمز التحقق verification_token (base62، 16 خانة) — وليس رقم السند.
   * @param {string} elementId - id العنصر الذي سيحتوي QR
   */
  generate(token, elementId) {
    const container = document.getElementById(elementId);
    if (!container || !token) return;

    container.innerHTML = '';

    const url = this.BASE_URL + token;

    new QRCode(container, {
      text:           url,
      width:          80,   // 80px = ~2.1cm عند 96dpi
      height:         80,
      colorDark:      '#0F1B2D',   // كحلي الهوية
      colorLight:     '#ffffff',
      correctLevel:   QRCode.CorrectLevel.H  // أعلى مستوى تصحيح خطأ
    });

    // أضف النص أسفل QR — يعرض رمز التحقق (token) وليس رقم السند
    const label = document.createElement('div');
    label.style.cssText = 'font-size:7px;color:#0F1B2D;text-align:center;margin-top:3px;word-break:break-all;max-width:80px;line-height:1.3;';
    label.textContent = 'diwan-finance.com/verify · ' + token;
    container.appendChild(label);
  },

  /**
   * تهيئة جميع رموز QR في صفحة الطباعة.
   * يبحث عن كل عنصر بـ data-qr-token (قيمته = verification_token).
   * مثال: <div data-qr-token="XfdpMvcDAQ4Y9S9c"></div>
   */
  initAll() {
    document.querySelectorAll('[data-qr-token]').forEach(el => {
      const token = el.getAttribute('data-qr-token');
      if (token) {
        el.id = el.id || ('qr-' + token);
        this.generate(token, el.id);
      }
    });
  }
};

// تشغيل تلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => DiwanQR.initAll());
