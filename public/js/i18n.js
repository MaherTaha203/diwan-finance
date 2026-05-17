'use strict';

/* ═══════════════════════════════════════════
   نظام الترجمة الكامل — ديوان آل طه
═══════════════════════════════════════════ */

window.LANG = 'ar';

window.T = {
  ar: {
    // ── تسجيل الدخول
    loginTitle:    'ديوان آل طه',
    loginSub:      'نظام الإدارة المالية',
    loginEmail:    'البريد الإلكتروني',
    loginPass:     'كلمة المرور',
    loginBtn:      'تسجيل الدخول',
    loginFooter:   'نظام إدارة مالي خاص · ديوان آل طه',
    loginLoading:  'جاري الدخول...',
    loginErr:      'بريد إلكتروني أو كلمة مرور غير صحيحة',
    loginFill:     'يرجى إدخال البريد وكلمة المرور',

    // ── شريط علوي
    backup:  'نسخ احتياطي',
    light:   'فاتح',
    dark:    'داكن',
    logout:  'خروج',

    // ── القائمة الجانبية
    secHome:    'الرئيسية',
    secOps:     'العمليات',
    secMembers: 'الأعضاء',
    secReports: 'التقارير',
    secSystem:  'النظام',
    dash:    'لوحة التحكم',
    rec:     'إيصالات القبض',
    pay:     'سندات الصرف',
    fam:     'أعضاء العائلة',
    stmt:    'كشف الحساب',
    rep:     'التقارير',
    users:   'المستخدمون',
    audit:   'سجل العمليات',
    bk:      'النسخ الاحتياطي',

    // ── لوحة التحكم
    refresh:       'تحديث',
    quickRec:      'إيصال',
    quickPay:      'سند صرف',
    monthlyChart:  'الإيصالات الشهرية',
    last6months:   'آخر 6 أشهر',
    lastOps:       'آخر العمليات',
    viewAll:       'عرض الكل',
    payMethods:    'طرق الدفع',
    topBalances:   'أعلى الأرصدة',
    quickActions:  'إجراءات سريعة',
    qaRec:         'إيصال قبض جديد',
    qaPay:         'سند صرف جديد',
    qaStmt:        'كشف حساب عضو',
    qaRep:         'عرض التقارير',

    // ── KPI
    kpiIn:      'إجمالي الإيصالات',
    kpiOut:     'إجمالي المدفوعات',
    kpiNet:     'صافي الرصيد',
    kpiMembers: 'أعضاء العائلة',
    kpiRecCount:'إيصال',
    kpiPayCount:'سند',
    kpiBalances:'أرصدة',
    surplus:    'فائض',
    deficit:    'عجز',

    // ── الإيصالات
    newRec:      'إيصال جديد',
    recNo:       'رقم الإيصال',
    member:      'العضو',
    amount:      'المبلغ ₪',
    method:      'طريقة الدفع',
    description: 'البيان',
    date:        'التاريخ',
    by:          'بواسطة',
    actions:     'إجراءات',
    totalRec:    'إيصال',
    totalAmt:    'إجمالي',
    noRec:       'لا توجد إيصالات',

    // ── المدفوعات
    newPay:      'سند جديد',
    payNo:       'رقم السند',
    beneficiary: 'المستفيد',
    payMethod:   'طريقة الصرف',
    reason:      'السبب',
    noPay:       'لا توجد سندات',
    totalPay:    'سند',

    // ── الأعضاء
    newFam:      'عضو جديد',
    num:         '#',
    name:        'الاسم',
    phone:       'الهاتف',
    balance:     'الرصيد ₪',
    monthlyRent: 'الإيجار الشهري',
    status:      'الحالة',
    noFam:       'لا يوجد أعضاء',
    totalFam:    'عضو',
    creditor:    'دائن',
    debtor:      'مدين',
    balanced:    'متوازن',
    allMembers:  'الكل',
    creditors:   'دائنون',
    debtors:     'مدينون',

    // ── طرق الدفع
    allMethods:  'كل طرق الدفع',
    cash:        'نقد',
    cheque:      'شيك',
    transfer:    'تحويل بنكي',
    online:      'أونلاين',

    // ── كشف الحساب
    stmtTitle:   'كشف حساب عضو',
    selectMember:'-- اختر --',
    stmtLabel:   'كشف حساب',
    currentBal:  'الرصيد الحالي',
    totalPaid:   'إجمالي الدفعات',
    movements:   'عدد الحركات',
    stmtDate:    'التاريخ',
    stmtDesc:    'البيان',
    credit:      'دائن',
    debit:       'مدين',
    stmtBal:     'الرصيد',
    noMovements: 'لا توجد حركات',

    // ── التقارير
    repTitle:    'التقارير',
    methodsDist: 'توزيع طرق الدفع',
    membersRep:  'أرصدة الأعضاء',
    noData:      'لا توجد بيانات',

    // ── المستخدمون
    inviteUser:  'دعوة مستخدم',
    usersReg:    'المستخدمون المسجلون',
    permLevels:  'مستويات الصلاحيات',
    adminDesc:   'كامل الصلاحيات — إضافة وحذف وتعديل وإدارة المستخدمين',
    accountantDesc: 'إضافة إيصالات ومدفوعات — لا يحذف',
    viewerDesc:  'عرض البيانات فقط',
    youLabel:    '(أنت)',

    // ── سجل العمليات
    auditTitle:  'سجل العمليات',
    export:      'تصدير',
    emptyAudit:  'السجل فارغ',

    // ── النسخ الاحتياطي
    bkTitle:     'النسخ الاحتياطي',
    bkDesc:      'تصدير كامل بصيغة JSON',
    bkDownload:  'تحميل النسخة',
    csvExport:   'تصدير CSV',
    csvRec:      'الإيصالات',
    csvPay:      'المدفوعات',
    csvFam:      'الأعضاء',
    sysInfo:     'معلومات النظام',
    sysRec:      'عدد الإيصالات',
    sysPay:      'عدد سندات الصرف',
    sysFam:      'عدد الأعضاء',
    sysCurUser:  'المستخدم الحالي',
    sysRole:     'الصلاحية',

    // ── النماذج (Modals)
    mRecTitle:   'إيصال قبض جديد',
    mRecSec1:    'بيانات العضو والمبلغ',
    mRecSec2:    'تفاصيل الإيصال',
    mRecMember:  'العضو',
    mRecAmt:     'المبلغ ₪',
    mRecDate:    'التاريخ',
    mRecMethod:  'طريقة الدفع',
    mRecRcv:     'المستلم',
    mRecRcvPh:   'اسم المستلم',
    mRecDesc:    'البيان',
    mRecDescPh:  'سبب الاستلام أو ملاحظات...',
    saveAndPrint:'حفظ وطباعة',
    saveOnly:    'حفظ فقط',
    cancel:      'إلغاء',
    errMember:   'اختر عضواً',
    errAmount:   'أدخل مبلغاً صحيحاً',
    errDate:     'مطلوب',

    mPayTitle:   'سند صرف جديد',
    mPaySec1:    'بيانات الصرف',
    mPaySec2:    'تفاصيل إضافية',
    mPayBen:     'اسم المستفيد',
    mPayBenPh:   'الشخص أو الجهة المستفيدة',
    mPayAmt:     'المبلغ ₪',
    mPayDate:    'التاريخ',
    mPayMethod:  'طريقة الصرف',
    mPayApv:     'معتمد من',
    mPayApvPh:   'اسم المعتمد',
    mPayRsn:     'سبب الصرف',
    mPayRsnPh:   'وصف تفصيلي لسبب الصرف...',
    savePay:     'حفظ السند',
    errBen:      'مطلوب',
    errRsn:      'مطلوب',

    mFamTitle:   'إضافة عضو جديد',
    mFamName:    'الاسم الكامل',
    mFamNamePh:  'الاسم الرباعي',
    mFamPhone:   'الهاتف',
    mFamPhonePh: '05x-xxx-xxxx',
    mFamApt:     'رقم الشقة',
    mFamRent:    'الإيجار الشهري ₪',
    mFamBal:     'الرصيد الافتتاحي ₪',
    mFamNotes:   'ملاحظات',
    mFamNotesPh: 'ملاحظات إضافية...',
    save:        'حفظ',
    errName:     'مطلوب',

    mInvTitle:   'دعوة مستخدم جديد',
    mInvName:    'الاسم الكامل',
    mInvNamePh:  'اسم المستخدم',
    mInvEmail:   'البريد الإلكتروني',
    mInvPass:    'كلمة المرور المؤقتة',
    mInvPassPh:  'أرسلها للمستخدم بأمان',
    mInvRole:    'الدور والصلاحية',
    mInvWarn:    'أرسل كلمة المرور للمستخدم بشكل آمن خارج النظام',
    mInvBtn:     'إنشاء الحساب',

    mPrtTitle:   'معاينة الإيصال',
    print:       'طباعة',
    close:       'إغلاق',

    // ── الإيصال المطبوع
    prtTitle:    'ديوان آل طه',
    prtSub:      'سند قبض',
    prtNo:       'رقم الإيصال',
    prtDate:     'التاريخ',
    prtMember:   'اسم العضو',
    prtMethod:   'طريقة الدفع',
    prtDesc:     'البيان',
    prtSig1:     'توقيع المستلم: __________',
    prtSig2:     'توقيع المدفوع: __________',

    // ── أدوار
    adminRole:      'مدير',
    accountantRole: 'محاسب',
    viewerRole:     'عارض',

    // ── رسائل
    loggedOut:   'تم تسجيل الخروج',
    noPermWrite: 'ليس لديك صلاحية',
    noPermDel:   'ليس لديك صلاحية الحذف',
    dupMember:   'يوجد عضو بنفس الاسم',
    saveErr:     'خطأ في الحفظ',
    loadErr:     'خطأ في تحميل البيانات',
    backupDone:  'تم تصدير النسخة الاحتياطية',
    exported:    'تم التصدير',
    rolChanged:  'تم تغيير الدور إلى',
    invDone:     'تم إنشاء حساب',
    delConfRec:  'حذف إيصال',
    delConfPay:  'حذف سند',
    delConfFam:  'حذف العضو',
    delConfRent: 'حذف هذا العقد؟',
    deleted:     'حُذف',

    // ── تواريخ
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    dir: 'rtl',
  },

  en: {
    loginTitle:    'Diwan Al-Taha',
    loginSub:      'Financial Management System',
    loginEmail:    'Email Address',
    loginPass:     'Password',
    loginBtn:      'Sign In',
    loginFooter:   'Private Financial System · Diwan Al-Taha',
    loginLoading:  'Signing in...',
    loginErr:      'Invalid email or password',
    loginFill:     'Please enter email and password',

    backup:  'Backup',
    light:   'Light',
    dark:    'Dark',
    logout:  'Logout',

    secHome:    'Home',
    secOps:     'Operations',
    secMembers: 'Members',
    secReports: 'Reports',
    secSystem:  'System',
    dash:    'Dashboard',
    rec:     'Receipts',
    pay:     'Payments',
    fam:     'Family Members',
    stmt:    'Statement',
    rep:     'Reports',
    users:   'Users',
    audit:   'Audit Log',
    bk:      'Backup',

    refresh:       'Refresh',
    quickRec:      'Receipt',
    quickPay:      'Payment',
    monthlyChart:  'Monthly Receipts',
    last6months:   'Last 6 months',
    lastOps:       'Recent Transactions',
    viewAll:       'View All',
    payMethods:    'Payment Methods',
    topBalances:   'Top Balances',
    quickActions:  'Quick Actions',
    qaRec:         'New Receipt',
    qaPay:         'New Payment',
    qaStmt:        'Member Statement',
    qaRep:         'View Reports',

    kpiIn:      'Total Receipts',
    kpiOut:     'Total Payments',
    kpiNet:     'Net Balance',
    kpiMembers: 'Family Members',
    kpiRecCount:'receipt',
    kpiPayCount:'payment',
    kpiBalances:'balances',
    surplus:    'Surplus',
    deficit:    'Deficit',

    newRec:      'New Receipt',
    recNo:       'Receipt No.',
    member:      'Member',
    amount:      'Amount ₪',
    method:      'Method',
    description: 'Description',
    date:        'Date',
    by:          'By',
    actions:     'Actions',
    totalRec:    'receipt',
    totalAmt:    'Total',
    noRec:       'No receipts found',

    newPay:      'New Payment',
    payNo:       'Payment No.',
    beneficiary: 'Beneficiary',
    payMethod:   'Payment Method',
    reason:      'Reason',
    noPay:       'No payments found',
    totalPay:    'payment',

    newFam:      'New Member',
    num:         '#',
    name:        'Name',
    phone:       'Phone',
    balance:     'Balance ₪',
    monthlyRent: 'Monthly Rent',
    status:      'Status',
    noFam:       'No members found',
    totalFam:    'member',
    creditor:    'Creditor',
    debtor:      'Debtor',
    balanced:    'Balanced',
    allMembers:  'All',
    creditors:   'Creditors',
    debtors:     'Debtors',

    allMethods:  'All Methods',
    cash:        'Cash',
    cheque:      'Cheque',
    transfer:    'Bank Transfer',
    online:      'Online',

    stmtTitle:   'Member Statement',
    selectMember:'-- Select --',
    stmtLabel:   'Statement',
    currentBal:  'Current Balance',
    totalPaid:   'Total Paid',
    movements:   'Transactions',
    stmtDate:    'Date',
    stmtDesc:    'Description',
    credit:      'Credit',
    debit:       'Debit',
    stmtBal:     'Balance',
    noMovements: 'No transactions',

    repTitle:    'Reports',
    methodsDist: 'Payment Methods Distribution',
    membersRep:  'Member Balances',
    noData:      'No data available',

    inviteUser:  'Invite User',
    usersReg:    'Registered Users',
    permLevels:  'Permission Levels',
    adminDesc:   'Full access — add, delete, edit and manage users',
    accountantDesc: 'Add receipts and payments — cannot delete',
    viewerDesc:  'View only',
    youLabel:    '(You)',

    auditTitle:  'Audit Log',
    export:      'Export',
    emptyAudit:  'Log is empty',

    bkTitle:     'Backup & Restore',
    bkDesc:      'Full export in JSON format',
    bkDownload:  'Download Backup',
    csvExport:   'Export CSV',
    csvRec:      'Receipts',
    csvPay:      'Payments',
    csvFam:      'Members',
    sysInfo:     'System Info',
    sysRec:      'Total Receipts',
    sysPay:      'Total Payments',
    sysFam:      'Total Members',
    sysCurUser:  'Current User',
    sysRole:     'Role',

    mRecTitle:   'New Receipt',
    mRecSec1:    'Member & Amount',
    mRecSec2:    'Receipt Details',
    mRecMember:  'Member',
    mRecAmt:     'Amount ₪',
    mRecDate:    'Date',
    mRecMethod:  'Payment Method',
    mRecRcv:     'Received By',
    mRecRcvPh:   'Name of receiver',
    mRecDesc:    'Description',
    mRecDescPh:  'Reason or notes...',
    saveAndPrint:'Save & Print',
    saveOnly:    'Save Only',
    cancel:      'Cancel',
    errMember:   'Select a member',
    errAmount:   'Enter a valid amount',
    errDate:     'Required',

    mPayTitle:   'New Payment',
    mPaySec1:    'Payment Details',
    mPaySec2:    'Additional Info',
    mPayBen:     'Beneficiary Name',
    mPayBenPh:   'Person or entity',
    mPayAmt:     'Amount ₪',
    mPayDate:    'Date',
    mPayMethod:  'Payment Method',
    mPayApv:     'Approved By',
    mPayApvPh:   'Name of approver',
    mPayRsn:     'Reason',
    mPayRsnPh:   'Detailed reason for payment...',
    savePay:     'Save Payment',
    errBen:      'Required',
    errRsn:      'Required',

    mFamTitle:   'Add New Member',
    mFamName:    'Full Name',
    mFamNamePh:  'Full name',
    mFamPhone:   'Phone',
    mFamPhonePh: '05x-xxx-xxxx',
    mFamApt:     'Apartment No.',
    mFamRent:    'Monthly Rent ₪',
    mFamBal:     'Opening Balance ₪',
    mFamNotes:   'Notes',
    mFamNotesPh: 'Additional notes...',
    save:        'Save',
    errName:     'Required',

    mInvTitle:   'Invite New User',
    mInvName:    'Full Name',
    mInvNamePh:  'User name',
    mInvEmail:   'Email Address',
    mInvPass:    'Temporary Password',
    mInvPassPh:  'Send it securely to the user',
    mInvRole:    'Role & Permission',
    mInvWarn:    'Send the password to the user securely outside the system',
    mInvBtn:     'Create Account',

    mPrtTitle:   'Receipt Preview',
    print:       'Print',
    close:       'Close',

    prtTitle:    'Diwan Al-Taha',
    prtSub:      'Receipt Voucher',
    prtNo:       'Receipt No.',
    prtDate:     'Date',
    prtMember:   'Member Name',
    prtMethod:   'Payment Method',
    prtDesc:     'Description',
    prtSig1:     'Receiver Signature: __________',
    prtSig2:     'Payer Signature: __________',

    adminRole:      'Admin',
    accountantRole: 'Accountant',
    viewerRole:     'Viewer',

    loggedOut:   'Logged out',
    noPermWrite: 'You do not have permission',
    noPermDel:   'You do not have delete permission',
    dupMember:   'A member with this name already exists',
    saveErr:     'Error saving',
    loadErr:     'Error loading data',
    backupDone:  'Backup exported successfully',
    exported:    'Exported successfully',
    rolChanged:  'Role changed to',
    invDone:     'Account created for',
    delConfRec:  'Delete receipt',
    delConfPay:  'Delete payment',
    delConfFam:  'Delete member',
    delConfRent: 'Delete this contract?',
    deleted:     'Deleted',

    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    dir: 'ltr',
  }
};

// الدالة الرئيسية للترجمة
window.t = key => (window.T[window.LANG] || window.T.ar)[key] || key;

// تطبيق الترجمة على كل العناصر الثابتة في الصفحة
window.applyLang = function() {
  const lang = window.LANG;
  const tr   = window.T[lang];
  const doc  = document;

  // اتجاه الصفحة
  doc.documentElement.dir  = tr.dir;
  doc.documentElement.lang = lang;

  // ── تسجيل الدخول
  const loginH1 = doc.querySelector('.login-logo h1');
  if (loginH1) loginH1.textContent = tr.loginTitle;
  const loginP = doc.querySelector('.login-logo p');
  if (loginP) loginP.textContent = tr.loginSub;
  const loginFooter = doc.querySelector('.login-footer');
  if (loginFooter) loginFooter.textContent = tr.loginFooter;
  const emailLabel = doc.querySelector('.lfi:nth-child(2) label');
  if (emailLabel) emailLabel.textContent = tr.loginEmail;
  const passLabel = doc.querySelector('.lfi:nth-child(3) label');
  if (passLabel) passLabel.textContent = tr.loginPass;
  const loginBtn = doc.getElementById('login-btn');
  if (loginBtn && !loginBtn.disabled) loginBtn.innerHTML = `<i class="ti ti-login"></i> ${tr.loginBtn}`;

  // ── شريط علوي
  const backupBtn = doc.querySelector('.top-btn[onclick="doBackup()"]');
  if (backupBtn) backupBtn.innerHTML = `<i class="ti ti-database-export"></i>${tr.backup}`;
  const logoutBtn = doc.querySelector('.top-btn[onclick="logout()"]');
  if (logoutBtn) logoutBtn.innerHTML = `<i class="ti ti-logout"></i>${tr.logout}`;
  const themeBtn = doc.getElementById('theme-btn');
  if (themeBtn) {
    const isLight = doc.body.classList.contains('light');
    themeBtn.innerHTML = isLight
      ? `<i class="ti ti-moon"></i>${tr.dark}`
      : `<i class="ti ti-sun"></i>${tr.light}`;
  }

  // ── القائمة الجانبية
  const sbSecs = doc.querySelectorAll('.sb-sec');
  const secKeys = ['secHome','secOps','secMembers','secReports','secSystem'];
  sbSecs.forEach((el,i) => { if (secKeys[i]) el.textContent = tr[secKeys[i]]; });

  doc.querySelector('.nb[data-p="dash"]').innerHTML  = `<i class="ti ti-layout-dashboard"></i>${tr.dash}`;
  doc.querySelector('.nb[data-p="rec"]').innerHTML   = `<i class="ti ti-receipt"></i>${tr.rec}`;
  doc.querySelector('.nb[data-p="pay"]').innerHTML   = `<i class="ti ti-cash"></i>${tr.pay}`;
  doc.querySelector('.nb[data-p="fam"]').innerHTML   = `<i class="ti ti-users"></i>${tr.fam}`;
  doc.querySelector('.nb[data-p="stmt"]').innerHTML  = `<i class="ti ti-file-description"></i>${tr.stmt}`;
  doc.querySelector('.nb[data-p="rep"]').innerHTML   = `<i class="ti ti-chart-bar"></i>${tr.rep}`;
  const nbU = doc.querySelector('.nb[data-p="users"]');
  if (nbU) nbU.innerHTML = `<i class="ti ti-shield-lock"></i>${tr.users}`;
  doc.querySelector('.nb[data-p="audit"]').innerHTML = `<i class="ti ti-list-check"></i>${tr.audit}`;
  doc.querySelector('.nb[data-p="bk"]').innerHTML    = `<i class="ti ti-database"></i>${tr.bk}`;

  // ── لوحة التحكم
  const phT = doc.querySelector('#pg-dash .ph-t');
  if (phT) phT.textContent = tr.dash;
  const refreshBtn = doc.querySelector('.btn[onclick="loadAll()"]');
  if (refreshBtn) refreshBtn.innerHTML = `<i class="ti ti-refresh"></i>${tr.refresh}`;
  const btnQrec = doc.getElementById('btn-qrec');
  if (btnQrec) btnQrec.innerHTML = `<i class="ti ti-plus"></i>${tr.quickRec}`;
  const btnQpay = doc.getElementById('btn-qpay');
  if (btnQpay) btnQpay.innerHTML = `<i class="ti ti-cash"></i>${tr.quickPay}`;

  // عناوين البطاقات في لوحة التحكم
  const dashCards = doc.querySelectorAll('#pg-dash .ct');
  if (dashCards[0]) dashCards[0].innerHTML = `<i class="ti ti-chart-histogram"></i>${tr.monthlyChart}`;
  const last6 = doc.querySelector('#pg-dash small');
  if (last6) last6.textContent = tr.last6months;
  if (dashCards[1]) dashCards[1].innerHTML = `<i class="ti ti-receipt"></i>${tr.lastOps}`;
  const viewAllBtn = doc.querySelector('#pg-dash .btn.ghost.sm');
  if (viewAllBtn) viewAllBtn.innerHTML = `${tr.viewAll} <i class="ti ti-arrow-left"></i>`;
  if (dashCards[2]) dashCards[2].innerHTML = `<i class="ti ti-chart-donut-3"></i>${tr.payMethods}`;
  if (dashCards[3]) dashCards[3].innerHTML = `<i class="ti ti-trophy"></i>${tr.topBalances}`;
  if (dashCards[4]) dashCards[4].innerHTML = `<i class="ti ti-bolt"></i>${tr.quickActions}`;

  // ── صفحة الإيصالات
  const recPhT = doc.querySelector('#pg-rec .ph-t');
  if (recPhT) recPhT.textContent = tr.rec;
  const btnAddRec = doc.getElementById('btn-add-rec');
  if (btnAddRec) btnAddRec.innerHTML = `<i class="ti ti-plus"></i>${tr.newRec}`;
  const qRec = doc.getElementById('q-rec');
  if (qRec) qRec.placeholder = lang==='ar'?'بحث برقم الإيصال أو اسم العضو...':'Search by receipt no or member...';
  const recMethodFlt = doc.getElementById('f-rec-m');
  if (recMethodFlt) {
    recMethodFlt.options[0].text = tr.allMethods;
    recMethodFlt.options[1].text = tr.cash;
    recMethodFlt.options[2].text = tr.cheque;
    recMethodFlt.options[3].text = tr.transfer;
    recMethodFlt.options[4].text = tr.online;
  }
  const recThead = doc.querySelector('#pg-rec thead tr');
  if (recThead) recThead.innerHTML = `<th>${tr.recNo}</th><th>${tr.member}</th><th>${tr.amount}</th><th>${tr.method}</th><th>${tr.description}</th><th>${tr.date}</th><th>${tr.by}</th><th>${tr.actions}</th>`;

  // ── صفحة المدفوعات
  const payPhT = doc.querySelector('#pg-pay .ph-t');
  if (payPhT) payPhT.textContent = tr.pay;
  const btnAddPay = doc.getElementById('btn-add-pay');
  if (btnAddPay) btnAddPay.innerHTML = `<i class="ti ti-plus"></i>${tr.newPay}`;
  const qPay = doc.getElementById('q-pay');
  if (qPay) qPay.placeholder = lang==='ar'?'بحث برقم السند أو المستفيد...':'Search by payment no or beneficiary...';
  const payThead = doc.querySelector('#pg-pay thead tr');
  if (payThead) payThead.innerHTML = `<th>${tr.payNo}</th><th>${tr.beneficiary}</th><th>${tr.amount}</th><th>${tr.payMethod}</th><th>${tr.reason}</th><th>${tr.date}</th><th>${tr.by}</th><th>${tr.actions}</th>`;

  // ── صفحة الأعضاء
  const famPhT = doc.querySelector('#pg-fam .ph-t');
  if (famPhT) famPhT.textContent = tr.fam;
  const btnAddFam = doc.getElementById('btn-add-fam');
  if (btnAddFam) btnAddFam.innerHTML = `<i class="ti ti-user-plus"></i>${tr.newFam}`;
  const qFam = doc.getElementById('q-fam');
  if (qFam) qFam.placeholder = lang==='ar'?'بحث بالاسم أو الهاتف...':'Search by name or phone...';
  const famStatusFlt = doc.getElementById('f-fam-s');
  if (famStatusFlt) {
    famStatusFlt.options[0].text = tr.allMembers;
    famStatusFlt.options[1].text = tr.creditors;
    famStatusFlt.options[2].text = tr.debtors;
  }
  const famThead = doc.querySelector('#pg-fam thead tr');
  if (famThead) famThead.innerHTML = `<th>${tr.num}</th><th>${tr.name}</th><th>${tr.phone}</th><th>${tr.balance}</th><th>${tr.monthlyRent}</th><th>${tr.status}</th><th>${tr.actions}</th>`;

  // ── كشف الحساب
  const stmtPhT = doc.querySelector('#pg-stmt .ph-t');
  if (stmtPhT) stmtPhT.textContent = tr.stmtTitle;
  const stmtSel = doc.getElementById('stmt-sel');
  if (stmtSel && stmtSel.options[0]) stmtSel.options[0].text = tr.selectMember;

  // ── التقارير
  const repPhT = doc.querySelector('#pg-rep .ph-t');
  if (repPhT) repPhT.textContent = tr.repTitle;
  const repCt = doc.querySelector('#pg-rep .ct');
  if (repCt) repCt.innerHTML = `<i class="ti ti-chart-bar"></i> ${tr.methodsDist}`;
  const repFamThead = doc.querySelector('#pg-rep thead tr');
  if (repFamThead) repFamThead.innerHTML = `<th>${tr.member}</th><th>${tr.balance}</th><th>${tr.status}</th>`;

  // ── سجل العمليات
  const auditPhT = doc.querySelector('#pg-audit .ph-t');
  if (auditPhT) auditPhT.textContent = tr.auditTitle;
  const exportBtn = doc.querySelector('.btn[onclick="exportCSV(\'audit\')"]');
  if (exportBtn) exportBtn.innerHTML = `<i class="ti ti-download"></i>${tr.export}`;

  // ── النسخ الاحتياطي
  const bkPhT = doc.querySelector('#pg-bk .ph-t');
  if (bkPhT) bkPhT.textContent = tr.bkTitle;

  // ── نموذج الإيصال
  const mRecT = doc.querySelector('#m-rec .mt2');
  if (mRecT) mRecT.innerHTML = `<span class="mico" style="background:rgba(0,200,150,.15);color:#00C896"><i class="ti ti-receipt"></i></span>${tr.mRecTitle}`;
  const mRecSec1 = doc.querySelector('#m-rec .sec-lbl:first-of-type');
  if (mRecSec1) mRecSec1.textContent = tr.mRecSec1;
  const mRecSec2 = doc.querySelector('#m-rec .sec-lbl:last-of-type');
  if (mRecSec2) mRecSec2.textContent = tr.mRecSec2;
  setLabel('r-mem', tr.mRecMember);
  setLabel('r-amt', tr.mRecAmt);
  setLabel('r-dat', tr.mRecDate);
  setPlaceholder('r-rcv', tr.mRecRcvPh);
  setPlaceholder('r-dsc', tr.mRecDescPh);
  const rRcvLabel = doc.querySelector('label[for="r-rcv"]') || getLabelBefore('r-rcv');
  setLabel('r-rcv', tr.mRecRcv);
  setLabel('r-dsc', tr.mRecDesc);
  const mRecBtns = doc.querySelectorAll('#m-rec .mf .btn');
  if (mRecBtns[0]) mRecBtns[0].innerHTML = `<i class="ti ti-printer"></i>${tr.saveAndPrint}`;
  if (mRecBtns[1]) mRecBtns[1].innerHTML = `<i class="ti ti-device-floppy"></i>${tr.saveOnly}`;
  if (mRecBtns[2]) mRecBtns[2].textContent = tr.cancel;

  // ── نموذج المدفوعات
  const mPayT = doc.querySelector('#m-pay .mt2');
  if (mPayT) mPayT.innerHTML = `<span class="mico" style="background:rgba(229,62,62,.15);color:#E53E3E"><i class="ti ti-cash"></i></span>${tr.mPayTitle}`;
  setLabel('p-ben', tr.mPayBen); setPlaceholder('p-ben', tr.mPayBenPh);
  setLabel('p-amt', tr.mPayAmt);
  setLabel('p-dat', tr.mPayDate);
  setLabel('p-apv', tr.mPayApv); setPlaceholder('p-apv', tr.mPayApvPh);
  setLabel('p-rsn', tr.mPayRsn); setPlaceholder('p-rsn', tr.mPayRsnPh);
  const mPayBtns = doc.querySelectorAll('#m-pay .mf .btn');
  if (mPayBtns[0]) mPayBtns[0].innerHTML = `<i class="ti ti-device-floppy"></i>${tr.savePay}`;
  if (mPayBtns[1]) mPayBtns[1].textContent = tr.cancel;

  // ── نموذج الأعضاء
  const mFamT = doc.querySelector('#m-fam .mt2');
  if (mFamT) mFamT.innerHTML = `<span class="mico" style="background:rgba(27,108,168,.15);color:#1B6CA8"><i class="ti ti-user-plus"></i></span>${tr.mFamTitle}`;
  setLabel('f-nm', tr.mFamName);  setPlaceholder('f-nm', tr.mFamNamePh);
  setLabel('f-ph', tr.mFamPhone); setPlaceholder('f-ph', tr.mFamPhonePh);
  setLabel('f-ap', tr.mFamApt);
  setLabel('f-rnt', tr.mFamRent);
  setLabel('f-bal', tr.mFamBal);
  setLabel('f-nt', tr.mFamNotes);  setPlaceholder('f-nt', tr.mFamNotesPh);
  const mFamBtns = doc.querySelectorAll('#m-fam .mf .btn');
  if (mFamBtns[0]) mFamBtns[0].innerHTML = `<i class="ti ti-device-floppy"></i>${tr.save}`;
  if (mFamBtns[1]) mFamBtns[1].textContent = tr.cancel;

  // ── نموذج الدعوة
  const mInvT = doc.querySelector('#m-invite .mt2');
  if (mInvT) mInvT.innerHTML = `<span class="mico" style="background:rgba(109,40,217,.15);color:#7C3AED"><i class="ti ti-send"></i></span>${tr.mInvTitle}`;
  setLabel('inv-name', tr.mInvName);  setPlaceholder('inv-name', tr.mInvNamePh);
  setLabel('inv-email', tr.mInvEmail);
  setLabel('inv-pass', tr.mInvPass);  setPlaceholder('inv-pass', tr.mInvPassPh);
  setLabel('inv-role', tr.mInvRole);
  const mInvWarn = doc.querySelector('#m-invite .warn-box, #m-invite [style*="warn"]');
  if (mInvWarn) mInvWarn.innerHTML = `<i class="ti ti-alert-triangle"></i> ${tr.mInvWarn}`;
  const mInvBtns = doc.querySelectorAll('#m-invite .mf .btn');
  if (mInvBtns[0]) mInvBtns[0].innerHTML = `<i class="ti ti-send"></i>${tr.mInvBtn}`;
  if (mInvBtns[1]) mInvBtns[1].textContent = tr.cancel;

  // ── نموذج الطباعة
  const mPrtT = doc.querySelector('#m-prt .mt2');
  if (mPrtT) mPrtT.innerHTML = `<i class="ti ti-printer"></i>${tr.mPrtTitle}`;
  const mPrtBtns = doc.querySelectorAll('#m-prt .mf .btn');
  if (mPrtBtns[0]) mPrtBtns[0].innerHTML = `<i class="ti ti-printer"></i>${tr.print}`;
  if (mPrtBtns[1]) mPrtBtns[1].textContent = tr.close;

  // ── pills طرق الدفع
  updatePills();
};

// دوال مساعدة
function setLabel(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const label = el.closest('.fi')?.querySelector('label');
  if (label) {
    const req = label.querySelector('.req');
    label.textContent = text + ' ';
    if (req) label.appendChild(req);
  }
}
function setPlaceholder(id, ph) {
  const el = document.getElementById(id);
  if (el) el.placeholder = ph;
}
function updatePills() {
  const tr = window.T[window.LANG];
  const pillMap = { 'نقد': tr.cash, 'شيك': tr.cheque, 'تحويل بنكي': tr.transfer, 'أونلاين': tr.online };
  document.querySelectorAll('.pill').forEach(p => {
    const icon = p.querySelector('i');
    const arText = p.dataset.ar || p.textContent.replace(/\s+/g,'').replace(/[^\u0600-\u06FF]/g,'').trim() ||
      (p.textContent.includes('نقد')||p.textContent.includes('Cash')?'نقد':
       p.textContent.includes('شيك')||p.textContent.includes('Cheque')?'شيك':
       p.textContent.includes('تحويل')||p.textContent.includes('Transfer')?'تحويل بنكي':
       p.textContent.includes('أونلاين')||p.textContent.includes('Online')?'أونلاين':'');
    if (!p.dataset.ar && arText) p.dataset.ar = arText;
    const translated = pillMap[p.dataset.ar] || p.dataset.ar || '';
    if (translated && icon) {
      p.innerHTML = '';
      p.appendChild(icon);
      p.appendChild(document.createTextNode(translated));
    }
  });
}
