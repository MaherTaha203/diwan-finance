'use strict';
/* ═══ TRANSLATION SYSTEM ═══ */
window.LANG = 'ar';

const T = {
  ar: {
    // Topbar
    backup:'نسخ احتياطي', light:'فاتح', dark:'داكن', logout:'خروج',
    // Sidebar sections
    home:'الرئيسية', operations:'العمليات', members_sec:'الأعضاء',
    reports_sec:'التقارير', system_sec:'النظام',
    // Sidebar items
    dashboard:'لوحة التحكم',
    food_rec:'إيصالات الغداء', food_pay:'مصاريف الغداء', food_stmt:'كشف الغداء',
    diwan_rec:'إيصالات الديوان', diwan_pay:'مصاريف الديوان', diwan_stmt:'كشف الديوان',
    donations:'سجل التبرعات', members:'أعضاء العائلة',
    member_stmt:'كشف حساب عضو', annual:'الاشتراكات السنوية',
    users:'المستخدمون', audit:'سجل العمليات', backup_pg:'النسخ الاحتياطي',
    // Dashboard
    refresh:'تحديث', new_rec:'سند قبض', new_pay:'سند صرف',
    food_fund:'صندوق الغداء', diwan_fund:'صندوق الديوان', don_fund:'صندوق التبرعات',
    total_members:'أعضاء العائلة', late_members:'متأخرون', did_not_pay:'لم يسددوا',
    total_income:'إجمالي الإيصالات', total_expense:'إجمالي المصاريف',
    monthly_chart:'الحركات الشهرية', recent_ops:'آخر الحركات',
    quick_actions:'إجراءات سريعة', late_title:'أعضاء متأخرون',
    all_good:'✅ كل الأعضاء ملتزمون',
    // Buttons
    new_receipt:'إيصال جديد', new_payment:'مصروف جديد', new_donation:'تبرع جديد',
    new_member:'عضو جديد', invite_user:'دعوة مستخدم',
    export:'تصدير', print:'طباعة', view:'عرض', save:'حفظ',
    save_print:'حفظ وطباعة', save_only:'حفظ فقط', cancel:'إلغاء',
    edit:'تعديل', delete:'حذف', apply:'تطبيق',
    // Table headers
    no:'الرقم', date:'التاريخ', payer:'الدافع', amount:'المبلغ ₪',
    currency:'العملة', method:'طريقة الدفع', notes:'ملاحظات', actions:'إجراءات',
    beneficiary:'المستفيد', category:'الفئة', fund:'الصندوق',
    name:'الاسم', phone:'الهاتف', food_balance:'رصيد الغداء ₪',
    status:'الحالة', paid:'مسدَّد', late:'متأخر',
    show_in:'يُظهر في',
    // Statement
    from_date:'من تاريخ', to_date:'إلى تاريخ', op_type:'نوع الحركة',
    all_ops:'الكل', receipts_only:'إيصالات فقط', expenses_only:'مصاريف فقط',
    donations_only:'تبرعات فقط',
    total_income_lbl:'إجمالي الإيرادات', total_expense_lbl:'إجمالي المصاريف',
    closing_bal:'الرصيد الختامي', no_ops:'لا توجد حركات في هذه الفترة',
    credit:'دائن ₪', debit:'مدين ₪', balance:'الرصيد ₪',
    // Forms
    receipt_type:'نوع الإيصال', payer_type:'نوع الدافع',
    member_payer:'عضو من العائلة', contact_payer:'جهة اتصال مسجلة',
    manual_payer:'إدخال يدوي', choose_member:'-- اختر عضواً --',
    payer_name:'اسم الدافع', save_contact:'حفظ كجهة اتصال',
    don_direction:'توجيه التبرع', don_display:'يُظهر في كشف أي صندوق؟',
    amount_lbl:'المبلغ', auto_calc:'المبلغ بالشيكل:',
    payment_method:'طريقة الدفع', add_notes:'ملاحظات',
    cash:'نقد', check:'شيك', transfer:'تحويل', online:'أونلاين',
    expense_type:'فئة المصروف', ben_type:'المستفيد', approved_by:'معتمد من',
    reason_lbl:'سبب الصرف',
    full_name:'الاسم الكامل', opening_balance:'الرصيد الافتتاحي لصندوق الغداء ₪',
    opening_hint:'سالب = دين على العضو',
    // Annual
    annual_title:'الاشتراكات السنوية', annual_desc:'200 ₪ على كل عضو بداية كل سنة',
    year_lbl:'السنة', amount_per:'المبلغ ₪', apply_annual:'تطبيق الاشتراك السنوي',
    annual_history:'سجل الاشتراكات المطبقة', no_annual:'لا توجد اشتراكات مطبقة',
    // Expense types
    food_expense:'مصاريف إطعام عزاء', electricity:'كهرباء',
    water:'ماء', cleaning:'تنظيف', maintenance:'صيانة', other:'أخرى',
    // Fund labels
    food_label:'صندوق الغداء', diwan_label:'صندوق الديوان', don_label:'تبرع',
    // Status
    admin_role:'مدير', accountant_role:'محاسب', viewer_role:'عارض',
    // Messages
    no_permission:'ليس لديك صلاحية الإضافة',
    no_receipts:'لا توجد إيصالات', no_expenses:'لا توجد مصاريف',
    no_donations:'لا توجد تبرعات', no_members:'لا يوجد أعضاء',
    // Member stmt
    food_stmt_title:'كشف حساب صندوق الغداء', opening_bal_lbl:'رصيد افتتاحي',
    annual_due:'اشتراك سنة', contribution:'مساهمة',
    donations_sec:'التبرعات (لا تؤثر على الرصيد)',
    current_bal:'الرصيد الحالي', total_donations:'إجمالي التبرعات',
    receipt_no:'رقم السند',
    // Edit
    edit_rec_title:'تعديل الإيصال', edit_pay_title:'تعديل سند الصرف',
    edit_member_title:'تعديل بيانات العضو',
    edit_warning:'يمكن تعديل المبلغ بالشيكل والملاحظات فقط',
    cancel_voucher:'إلغاء السند',
    // Backup
    backup_title:'النسخ الاحتياطي', backup_desc:'تصدير كامل بصيغة JSON',
    download_backup:'تحميل النسخة', sys_info:'معلومات النظام',
  },

  en: {
    backup:'Backup', light:'Light', dark:'Dark', logout:'Logout',
    home:'Home', operations:'Operations', members_sec:'Members',
    reports_sec:'Reports', system_sec:'System',
    dashboard:'Dashboard',
    food_rec:'Food Receipts', food_pay:'Food Expenses', food_stmt:'Food Statement',
    diwan_rec:'Diwan Receipts', diwan_pay:'Diwan Expenses', diwan_stmt:'Diwan Statement',
    donations:'Donations', members:'Family Members',
    member_stmt:'Member Statement', annual:'Annual Dues',
    users:'Users', audit:'Audit Log', backup_pg:'Backup',
    refresh:'Refresh', new_rec:'Receipt', new_pay:'Payment',
    food_fund:'Food Fund', diwan_fund:'Diwan Fund', don_fund:'Donations Fund',
    total_members:'Family Members', late_members:'Late', did_not_pay:'Unpaid',
    total_income:'Total Receipts', total_expense:'Total Expenses',
    monthly_chart:'Monthly Activity', recent_ops:'Recent Operations',
    quick_actions:'Quick Actions', late_title:'Late Members',
    all_good:'✅ All members are up to date',
    new_receipt:'New Receipt', new_payment:'New Expense', new_donation:'New Donation',
    new_member:'New Member', invite_user:'Invite User',
    export:'Export', print:'Print', view:'View', save:'Save',
    save_print:'Save & Print', save_only:'Save Only', cancel:'Cancel',
    edit:'Edit', delete:'Delete', apply:'Apply',
    no:'No.', date:'Date', payer:'Payer', amount:'Amount ₪',
    currency:'Currency', method:'Method', notes:'Notes', actions:'Actions',
    beneficiary:'Beneficiary', category:'Category', fund:'Fund',
    name:'Name', phone:'Phone', food_balance:'Food Balance ₪',
    status:'Status', paid:'Paid', late:'Late',
    show_in:'Show In',
    from_date:'From Date', to_date:'To Date', op_type:'Type',
    all_ops:'All', receipts_only:'Receipts Only', expenses_only:'Expenses Only',
    donations_only:'Donations Only',
    total_income_lbl:'Total Income', total_expense_lbl:'Total Expenses',
    closing_bal:'Closing Balance', no_ops:'No transactions in this period',
    credit:'Credit ₪', debit:'Debit ₪', balance:'Balance ₪',
    receipt_type:'Receipt Type', payer_type:'Payer Type',
    member_payer:'Family Member', contact_payer:'Saved Contact',
    manual_payer:'Manual Entry', choose_member:'-- Select Member --',
    payer_name:'Payer Name', save_contact:'Save as Contact',
    don_direction:'Donation Direction', don_display:'Show in which fund statement?',
    amount_lbl:'Amount', auto_calc:'Amount in ILS:',
    payment_method:'Payment Method', add_notes:'Notes',
    cash:'Cash', check:'Cheque', transfer:'Transfer', online:'Online',
    expense_type:'Expense Type', ben_type:'Beneficiary', approved_by:'Approved By',
    reason_lbl:'Reason',
    full_name:'Full Name', opening_balance:'Opening Balance (Food Fund) ₪',
    opening_hint:'Negative = debt on member',
    annual_title:'Annual Dues', annual_desc:'₪200 per member at start of each year',
    year_lbl:'Year', amount_per:'Amount ₪', apply_annual:'Apply Annual Due',
    annual_history:'Applied Dues History', no_annual:'No dues applied yet',
    food_expense:'Funeral Food Expenses', electricity:'Electricity',
    water:'Water', cleaning:'Cleaning', maintenance:'Maintenance', other:'Other',
    food_label:'Food Fund', diwan_label:'Diwan Fund', don_label:'Donation',
    admin_role:'Admin', accountant_role:'Accountant', viewer_role:'Viewer',
    no_permission:'You do not have permission',
    no_receipts:'No receipts found', no_expenses:'No expenses found',
    no_donations:'No donations found', no_members:'No members found',
    food_stmt_title:'Food Fund Statement', opening_bal_lbl:'Opening Balance',
    annual_due:'Annual Due', contribution:'Contribution',
    donations_sec:'Donations (do not affect balance)',
    current_bal:'Current Balance', total_donations:'Total Donations',
    receipt_no:'Receipt No.',
    edit_rec_title:'Edit Receipt', edit_pay_title:'Edit Payment',
    edit_member_title:'Edit Member',
    edit_warning:'Only amount and notes can be edited',
    cancel_voucher:'Cancel Voucher',
    backup_title:'Backup', backup_desc:'Full export in JSON format',
    download_backup:'Download Backup', sys_info:'System Info',
  }
};

window.t = key => (T[window.LANG]||T.ar)[key] || key;

window.applyLang = function(){
  const lang = window.LANG;
  const tr = T[lang];
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Sidebar sections
  const secs = $$('.sb-sec');
  const secKeys = ['home','operations','food_fund','diwan_fund','donations','members_sec','reports_sec','system_sec'];
  // map by position
  $$('.sb-sec').forEach((el,i) => { if(secKeys[i]) el.textContent = tr[secKeys[i]]||el.textContent; });

  // Sidebar items
  const nbMap = {
    'dash': ['ti-layout-dashboard', 'dashboard'],
    'food-rec': ['ti-receipt', 'food_rec'],
    'food-pay': ['ti-cash', 'food_pay'],
    'food-stmt': ['ti-file-description', 'food_stmt'],
    'diwan-rec': ['ti-receipt', 'diwan_rec'],
    'diwan-pay': ['ti-cash', 'diwan_pay'],
    'diwan-stmt': ['ti-file-description', 'diwan_stmt'],
    'don': ['ti-heart', 'donations'],
    'members': ['ti-users', 'members'],
    'member-stmt': ['ti-user', 'member_stmt'],
    'annual': ['ti-calendar', 'annual'],
    'users': ['ti-shield-lock', 'users'],
    'audit': ['ti-list-check', 'audit'],
    'bk': ['ti-database', 'backup_pg'],
  };
  Object.entries(nbMap).forEach(([p,[ico,key]])=>{
    const el = document.querySelector(`.nb[data-p="${p}"]`);
    if(el) el.innerHTML = `<i class="ti ${ico}"></i>${tr[key]||''}`;
  });

  // Topbar
  const themeBtn = $('theme-btn');
  if(themeBtn){
    const isLight = document.body.classList.contains('light');
    themeBtn.innerHTML = isLight
      ? `<i class="ti ti-moon"></i>${tr.dark}`
      : `<i class="ti ti-sun"></i>${tr.light}`;
  }
  const backupBtn = document.querySelector('.tbtn[onclick="window.doBackup()"]');
  if(backupBtn) backupBtn.innerHTML = `<i class="ti ti-database-export"></i>${tr.backup}`;
  const logoutBtn = document.querySelector('.tbtn.red');
  if(logoutBtn) logoutBtn.innerHTML = `<i class="ti ti-logout"></i>${tr.logout}`;

  // Dashboard page header
  const dashTitle = document.querySelector('#pg-dash .ph-t');
  if(dashTitle) dashTitle.textContent = tr.dashboard;
  const refreshBtn = document.querySelector('#pg-dash .btn.sm[onclick="window.loadAll()"]');
  if(refreshBtn) refreshBtn.innerHTML = `<i class="ti ti-refresh"></i>${tr.refresh}`;
  const dashRecBtn = $('dash-btn-rec');
  if(dashRecBtn) dashRecBtn.innerHTML = `<i class="ti ti-plus"></i>${tr.new_rec}`;
  const dashPayBtn = $('dash-btn-pay');
  if(dashPayBtn) dashPayBtn.innerHTML = `<i class="ti ti-minus"></i>${tr.new_pay}`;

  // Page headers
  const pageMap = {
    'food-rec': ['food_rec', 'btn-food-rec', 'new_receipt'],
    'food-pay': ['food_pay', 'btn-food-pay', 'new_payment'],
    'diwan-rec': ['diwan_rec', 'btn-diwan-rec', 'new_receipt'],
    'diwan-pay': ['diwan_pay', 'btn-diwan-pay', 'new_payment'],
    'don': ['donations', 'btn-don', 'new_donation'],
    'members': ['members', 'btn-add-member', 'new_member'],
  };
  Object.entries(pageMap).forEach(([pg,[titleKey,btnId,btnKey]])=>{
    const title = document.querySelector(`#pg-${pg} .ph-t`);
    if(title) title.textContent = tr[titleKey]||'';
    const btn = $(btnId);
    if(btn){
      const ico = btnId.includes('rec')||btnId.includes('don')?'ti-plus':btnId.includes('pay')?'ti-plus':'ti-user-plus';
      btn.innerHTML = `<i class="ti ${ico}"></i>${tr[btnKey]||''}`;
    }
  });

  // Table headers
  const thMap = {
    'food-rec-body': [tr.no, tr.date, tr.payer, tr.amount, tr.method, tr.notes, tr.actions],
    'food-pay-body': [tr.no, tr.date, tr.beneficiary, tr.amount, tr.method, tr.notes, tr.actions],
    'diwan-rec-body': [tr.no, tr.date, tr.payer, tr.amount, tr.currency, tr.method, tr.notes, tr.actions],
    'diwan-pay-body': [tr.no, tr.date, tr.beneficiary, tr.amount, tr.category, tr.method, tr.notes, tr.actions],
    'don-body': [tr.no, tr.date, tr.payer, tr.amount, tr.currency, tr.show_in, tr.notes, tr.actions],
    'members-body': ['#', tr.name, tr.phone, tr.food_balance, tr.status, tr.actions],
  };
  Object.entries(thMap).forEach(([bodyId,headers])=>{
    const tbody = $(bodyId);
    if(!tbody) return;
    const thead = tbody.closest('table')?.querySelector('thead tr');
    if(thead) thead.innerHTML = headers.map(h=>`<th>${h}</th>`).join('');
  });

  // Statement pages
  const foodStmtTitle = document.querySelector('#pg-food-stmt .ph-t');
  if(foodStmtTitle) foodStmtTitle.textContent = tr.food_fund + ' — ' + (lang==='ar'?'كشف الحساب':'Statement');
  const diwanStmtTitle = document.querySelector('#pg-diwan-stmt .ph-t');
  if(diwanStmtTitle) diwanStmtTitle.textContent = tr.diwan_fund + ' — ' + (lang==='ar'?'كشف الحساب':'Statement');

  // Statement filters labels
  $$('label[for="food-stmt-from"],label[for="diwan-stmt-from"]').forEach(l=>l.textContent=tr.from_date);
  $$('label[for="food-stmt-to"],label[for="diwan-stmt-to"]').forEach(l=>l.textContent=tr.to_date);
  $$('[id$="-stmt-type"] option').forEach(opt=>{
    if(opt.value==='') opt.text=tr.all_ops;
    else if(opt.value==='cr') opt.text=tr.receipts_only;
    else if(opt.value==='dr') opt.text=tr.expenses_only;
    else if(opt.value==='don') opt.text=tr.donations_only;
  });

  // Search placeholders
  const searchMap = {
    'q-food-rec': lang==='ar'?'بحث...':'Search...',
    'q-food-pay': lang==='ar'?'بحث...':'Search...',
    'q-diwan-rec': lang==='ar'?'بحث...':'Search...',
    'q-diwan-pay': lang==='ar'?'بحث...':'Search...',
    'q-don': lang==='ar'?'بحث بالاسم...':'Search by name...',
    'q-members': lang==='ar'?'بحث بالاسم...':'Search by name...',
  };
  Object.entries(searchMap).forEach(([id,ph])=>{ const el=$(id); if(el)el.placeholder=ph; });

  // Annual page
  const annTitle = document.querySelector('#pg-annual .ph-t');
  if(annTitle) annTitle.textContent = tr.annual_title;
  const annDesc = document.querySelector('#pg-annual .ph-s');
  if(annDesc) annDesc.textContent = tr.annual_desc;
  const applyBtn = $('btn-apply-due');
  if(applyBtn) applyBtn.innerHTML = `<i class="ti ti-calendar-plus"></i>${tr.apply_annual}`;

  // Users page
  const usersTitle = document.querySelector('#pg-users .ph-t');
  if(usersTitle) usersTitle.textContent = tr.users;
  const inviteBtn = document.querySelector('#pg-users .btn.sm.primary');
  if(inviteBtn) inviteBtn.innerHTML = `<i class="ti ti-user-plus"></i>${tr.invite_user}`;

  // Audit page
  const auditTitle = document.querySelector('#pg-audit .ph-t');
  if(auditTitle) auditTitle.textContent = tr.audit;

  // Backup page
  const bkTitle = document.querySelector('#pg-bk .ph-t');
  if(bkTitle) bkTitle.textContent = tr.backup_title;

  // Member stmt page
  const msTitle = document.querySelector('#pg-member-stmt .ph-t');
  if(msTitle) msTitle.textContent = tr.member_stmt;
  const msFrom = document.querySelector('label[for="ms-from"]');
  if(msFrom) msFrom.textContent = tr.from_date;
  const msTo = document.querySelector('label[for="ms-to"]');
  if(msTo) msTo.textContent = tr.to_date;
};
