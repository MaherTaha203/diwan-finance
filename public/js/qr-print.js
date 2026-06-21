// public/js/qr-print.js
// أضف هذا السكريبت في صفحة الطباعة
// يتطلب مكتبة qrcode.js:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

const DiwanQR = {

  // الدومين الأساسي
  BASE_URL: 'https://diwan-finance.com/verify/',

  /**
   * توليد QR Code وإدراجه في العنصر المحدد
   * @param {string} docId   - رقم السند مثل REC-000123
   * @param {string} elementId - id العنصر الذي سيحتوي QR
   */
  generate(docId, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = '';

    const url = this.BASE_URL + docId;

    new QRCode(container, {
      text:           url,
      width:          80,   // 80px = ~2.1cm عند 96dpi
      height:         80,
      colorDark:      '#0F1B2D',   // كحلي الهوية
      colorLight:     '#ffffff',
      correctLevel:   QRCode.CorrectLevel.H  // أعلى مستوى تصحيح خطأ
    });

    // أضف النص أسفل QR
    const label = document.createElement('div');
    label.style.cssText = 'font-size:7px;color:#0F1B2D;text-align:center;margin-top:3px;word-break:break-all;max-width:80px;line-height:1.3;';
    label.textContent = 'diwan-finance.com/verify/' + docId;
    container.appendChild(label);
  },

  /**
   * تهيئة جميع QR Codes في صفحة الطباعة
   * يبحث عن كل عنصر بـ data-qr-id
   * مثال: <div data-qr-id="REC-000123"></div>
   */
  initAll() {
    document.querySelectorAll('[data-qr-id]').forEach(el => {
      const docId = el.getAttribute('data-qr-id');
      if (docId) {
        el.id = el.id || ('qr-' + docId);
        this.generate(docId, el.id);
      }
    });
  }
};

// تشغيل تلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => DiwanQR.initAll());
