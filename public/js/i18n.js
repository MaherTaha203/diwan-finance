'use strict';
/* ===================================================
   DIWAN FINANCE — i18n System
   Bilingual: Arabic (RTL) + English (LTR)
   Persistent via localStorage
=== ... === */

/* == TRANSLATIONS == */
const translations = {
  ar: {
    common: {
      required:'مطلوب',
      save:'حفظ', cancel:'إلغاء', edit:'تعديل', delete:'حذف',
      print:'طباعة', export:'تصدير', search:'بحث...', refresh:'تحديث',
      apply:'تطبيق', view:'عرض', close:'إغلاق', confirm:'تأكيد',
      attachments:'المرفقات', preview:'معاينة', download:'تنزيل',
      save_print:'حفظ وطباعة', save_only:'حفظ فقط',
      no_data:'لا توجد بيانات', loading:'جاري التحميل...',
      actions:'إجراءات', notes:'ملاحظات', date:'التاريخ',
      amount:'المبلغ', currency:'العملة', method:'طريقة الدفع',
      status:'الحالة', name:'الاسم', phone:'الهاتف',
      all:'الكل', yes:'نعم', no:'لا',
      export_dd:'تصدير ▼', number:'الرقم', amount_ils:'المبلغ ₪',
      from_date:'من تاريخ', to_date:'إلى تاريخ',
      opening_balance:'الرصيد الافتتاحي',
    },
    nav: {
      dashboard:'لوحة التحكم',
      food_receipts:'إيصالات الغداء', food_expenses:'مصاريف الغداء', food_stmt:'كشف الغداء',
      diwan_receipts:'إيصالات الديوان', diwan_expenses:'مصاريف الديوان', diwan_stmt:'كشف الديوان',
      donations:'سجل التبرعات', members:'أعضاء العائلة',
      member_stmt:'كشف حساب عضو', annual:'الاشتراكات السنوية',
      users:'المستخدمون', audit:'سجل العمليات',
      backup:'النسخ الاحتياطي', settings:'الإعدادات',
      home:'الرئيسية', operations:'العمليات',
      food_fund:'صندوق الغداء', diwan_fund:'صندوق الديوان',
      donations_sec:'التبرعات', members_sec:'الأعضاء',
      reports_sec:'التقارير', system_sec:'النظام', more:'المزيد',
      reservations:'تقويم الحجوزات', reservations_sec:'الديوان — الحجوزات',
    },
    reservations: {
      title:'تقويم الحجوزات', subtitle:'حجز واحد لكل يوم · التقويم الميلادي · الأسبوع يبدأ السبت',
      new:'حجز جديد', today:'اليوم', details:'تفاصيل الحجز',
      search_ph:'بحث فوري: اسم، هاتف، تاريخ، نوع…',
      f_today:'اليوم', f_week:'هذا الأسبوع', f_month:'هذا الشهر', f_reserved:'محجوز', f_available:'متاح',
      lg_reserved:'محجوز', lg_available:'متاح', lg_today:'اليوم', lg_past:'ماضٍ (للاطلاع فقط)',
      f_date:'التاريخ *', f_name:'اسم الزبون *', f_name_ph:'الاسم الكامل',
      f_phone:'رقم الهاتف *', f_type:'نوع الحجز *', f_notes_ph:'اختياري — عدد الضيوف، تجهيزات خاصة…',
      cancel_res:'إلغاء الحجز', cancel_title:'تأكيد إلغاء الحجز',
      cancel_note:'إلغاء ناعم: يُخفى الحجز من التقويم ويبقى في سجل العمليات، ويعود اليوم متاحًا فورًا.',
      keep:'تراجع', confirm_cancel:'تأكيد الإلغاء',
    },
    topbar: {
      backup:'نسخ احتياطي', light:'فاتح', dark:'داكن',
      logout:'خروج', password:'كلمة المرور',
    },
    dashboard: {
      title:'لوحة التحكم', subtitle:'ملخص مالي شامل',
      food_fund:'صندوق الغداء', diwan_fund:'صندوق الديوان',
      don_fund:'صندوق التبرعات', total_members:'أعضاء العائلة',
      late_members:'متأخرون', unpaid:'لم يسددوا',
      total_income:'إجمالي الإيصالات', total_expenses:'إجمالي المصاريف',
      monthly:'الحركات الشهرية', last6:'آخر 6 أشهر',
      recent:'آخر الحركات', quick:'إجراءات سريعة',
      late_title:'أعضاء متأخرون', all_good:'✅ كل الأعضاء ملتزمون',
      new_receipt:'سند قبض', new_payment:'سند صرف',
      food_receipt:'إيصال غداء', diwan_receipt:'إيصال ديوان',
      new_donation:'تسجيل تبرع', food_stmt:'كشف الغداء',
      diwan_stmt:'كشف الديوان',
    },
    receipts: {
      title_food:'إيصالات صندوق الغداء',
      title_diwan:'إيصالات صندوق الديوان',
      modal_food:'إيصال صندوق الغداء',
      modal_diwan:'إيصال صندوق الديوان',
      new:'إيصال جديد', type:'نوع الإيصال',
      payer:'الدافع', payer_type:'نوع الدافع',
      member_payer:'عضو من العائلة',
      contact_payer:'جهة اتصال مسجلة',
      manual_payer:'إدخال يدوي',
      payer_name:'اسم الدافع',
      save_contact:'حفظ كجهة اتصال',
      fund:'الصندوق', fund_food:'صندوق الغداء',
      fund_diwan:'صندوق الديوان', fund_don:'تبرع',
      don_direction:'توجيه التبرع',
      don_display:'يُظهر في كشف أي صندوق؟',
      alloc_type:'نوع التخصيص',
      alloc_support_current:'دعم الرصيد الحالي',
      alloc_reduce_deficit:'تسوية العجز التاريخي',
      no_data:'لا توجد إيصالات',
      receipt_no:'رقم الإيصال',
      info_food:'مدفوعات أعضاء العائلة للمساهمة في صندوق الغداء',
      info_diwan:'مدفوعات للديوان من الأعضاء أو من خارج العائلة',
      opt_food_long:'صندوق الغداء — مساهمة عضو',
      opt_diwan_long:'صندوق الديوان — دفعة للديوان',
      opt_don_long:'تبرع — يُسجَّل في صندوق التبرعات',
      payer_section:'بيانات الدافع', member_name:'اسم العضو',
      contact:'جهة الاتصال', payer_ph:'اكتب الاسم',
      don_disp_food:'كشف صندوق الغداء', don_disp_diwan:'كشف صندوق الديوان',
      amount_date:'المبلغ والتاريخ', amount_cur:'المبلغ والعملة',
      cur_ils:'₪ شيكل إسرائيلي', cur_usd:'$ دولار أمريكي', cur_jod:'د.أ دينار أردني',
      ils_amount:'المبلغ بالشيكل: ', notes_opt_ph:'ملاحظات اختيارية...', amount_err:'أدخل مبلغاً',
      cheque_info:'معلومات الشيك', cheque_no:'رقم الشيك', cheque_date:'تاريخ الشيك',
      cheque_bank:'البنك المسحوب عليه', cheque_no_ph:'مثال: 123456', bank_ph:'اسم البنك',
      save_print:'حفظ وطباعة', save_only:'حفظ فقط',
    },
    payments: {
      fund:'الصندوق',
      title_food:'مصاريف صندوق الغداء',
      title_diwan:'مصاريف صندوق الديوان',
      modal_food:'سند صرف الغداء',
      modal_diwan:'سند صرف الديوان',
      new:'مصروف جديد', beneficiary:'المستفيد',
      ben_type:'نوع المستفيد', expense_type:'فئة المصروف',
      approved_by:'معتمد من',
      food_expense:'مصاريف إطعام عزاء',
      electricity:'كهرباء', water:'ماء',
      cleaning:'تنظيف', maintenance:'صيانة', other:'أخرى',
      no_data:'لا توجد مصاريف',
      payment_no:'رقم السند',
      method:'طريقة الدفع',
      cash:'نقد', check:'شيك', transfer:'تحويل', online:'أونلاين',
      info_food:'مصاريف إطعام أهل المتوفى في حالات العزاء — تُدفع من صندوق الغداء',
      cat_all:'كل الفئات', category:'الفئة',
      opt_food_long:'صندوق الغداء — مصاريف الإطعام',
      opt_diwan_long:'صندوق الديوان — مصاريف الديوان',
      member_name:'اسم العضو', ben_name:'اسم المستفيد', ben_name_ph:'اسم المستفيد',
      method_pay:'طريقة الصرف', approved_ph:'اسم المعتمد', desc_ph:'وصف تفصيلي...',
    },
    donations: {
      title:'سجل التبرعات', new:'تبرع جديد',
      donor:'المتبرع', show_in:'يُظهر في', classification:'التصنيف',
      no_data:'لا توجد تبرعات',
      info:'التبرع النقدي يدخل خزينته ويُقيَّد هنا مرجعياً · العيني/الخدمي قيمة توثيقية لا تدخل أي خزينة',
    },
    members: {
      title:'أعضاء العائلة', new:'عضو جديد',
      food_balance:'رصيد الغداء ₪',
      paid:'مسدَّد', late:'متأخر',
      opening_hint:'سالب = دين على العضو',
      no_data:'لا يوجد أعضاء',
      member_stmt:'كشف حساب عضو',
      choose:'-- اختر عضواً --',
      current_bal:'الرصيد الحالي',
      total_donations:'إجمالي التبرعات',
      food_stmt_title:'كشف حساب صندوق الغداء',
      opening_bal:'رصيد افتتاحي',
      annual_due:'اشتراك سنة',
      contribution:'مساهمة',
      don_section:'التبرعات (لا تؤثر على الرصيد)',
      receipt_no:'رقم السند',
      filter_all:'الكل', filter_paid:'مسدَّد', filter_late:'عليه رصيد',
      search_ph:'بحث بالاسم...',
      col_name:'الاسم', col_phone:'الهاتف', col_status:'الحالة', col_actions:'إجراءات',
      count:'عضو',
    },
    stmt: {
      type_all:'الكل', type_cr:'إيصالات فقط',
      type_dr:'مصاريف فقط', type_don:'تبرعات فقط',
      total_income:'إجمالي الإيرادات',
      total_expenses:'إجمالي المصاريف',
      closing_bal:'الرصيد الختامي',
      current_bal:'الرصيد الحالي',
      all_periods:'كل الفترات',
      date_from:'من',
      date_to:'حتى',
      print_title:'كشف',
      currency_note:'العملة: شيكل (₪)',
      period_label:'الفترة:',
      opening_bal:'الرصيد الافتتاحي',
      total_in:'إجمالي الإيرادات',
      total_out:'إجمالي المصاريف',
      col_in:'وارد',
      col_out:'مصاريف',
      sig_accountant:'المحاسب',
      sig_diwan:'توقيع الديوان',
      sig_member:'توقيع العضو',
      printed_at:'طُبع:',
      page_info:'صفحة 1 / 1',
      debit_tag:'(مدين)',
      credit_tag:'(دائن)',
      member_label:'العضو:',
      active_since:'عضو منذ',
      total_due:'إجمالي المستحقات',
      total_paid:'إجمالي المدفوعات',
      final_bal:'الرصيد الختامي',
      ref:'المرجع',
      col_due:'مستحق (مدين)',
      col_paid:'مدفوع (دائن)',
      donation_report:'تقرير التبرعات',
      count_label:'عدد التبرعات:',
      donation_count:'عدد التبرعات',
      total_donations:'إجمالي التبرعات',
      to_food:'مخصص لصندوق الغداء',
      to_diwan:'مخصص لصندوق الديوان',
      direction:'جهة التخصيص',
      no_data:'لا توجد حركات في هذه الفترة',
      credit:'دائن', debit:'مدين', balance:'الرصيد',
      desc:'البيان', donor_name:'الاسم', note:'ملاحظات',
      title_food:'كشف حساب صندوق الغداء', title_diwan:'كشف حساب صندوق الديوان',
      movement_type:'نوع الحركة',
    },
    annual: {
      title:'الاشتراكات السنوية',
      desc:'200 ₪ على كل عضو بداية كل سنة',
      year:'السنة', amount:'المبلغ ₪',
      apply:'تطبيق الاشتراك السنوي',
      history:'سجل الاشتراكات المطبقة',
      no_data:'لا توجد اشتراكات مطبقة',
      warning:'عند الضغط على تطبيق سيُضاف المبلغ كدين على كل الأعضاء. لا يمكن التراجع.',
    },
    settings: {
      title:'الإعدادات', subtitle:'الرصيد الافتتاحي وإعدادات النظام',
      opening_title:'الرصيد الافتتاحي للصناديق',
      food_opening:'الرصيد الافتتاحي لصندوق الغداء ₪',
      diwan_opening:'الرصيد الافتتاحي لصندوق الديوان ₪',
      food_hint:'المبلغ الموجود في الصندوق قبل بدء النظام',
      diwan_hint:'المبلغ الموجود في الصندوق قبل بدء النظام',
      rates_title:'أسعار الصرف الاحتياطية',
      rates_hint:'تُستخدم فقط إذا تعذّر جلب السعر التلقائي',
      usd_rate:'سعر الدولار الأمريكي USD ₪',
      jod_rate:'سعر الدينار الأردني JOD ₪',
      summary:'ملخص الأرصدة مع الافتتاحي',
      save:'حفظ الإعدادات',
      opening_warn:'الديوان: الافتتاحي يُحسب ضمن الرصيد. الغداء: الرصيد السابق للمعلومية فقط ولا يُجمع',
      food_opening_long:'رصيد صندوق الغداء السابق (للمعلومية فقط — لا يدخل في الحساب) ₪',
      diwan_usd:'رصيد الديوان السابق $ (للعملات فقط)',
      diwan_jod:'رصيد الديوان السابق JD (للعملات فقط)',
      food_usd:'رصيد الغداء السابق $ (للعملات فقط)',
      food_jod:'رصيد الغداء السابق JD (للعملات فقط)',
      usd_rate_short:'سعر الدولار USD ₪', jod_rate_short:'سعر الدينار JOD ₪',
      save_short:'حفظ',
    },
    users: {
      title:'إدارة المستخدمين', invite:'دعوة مستخدم',
      full_name:'الاسم الكامل', email:'البريد الإلكتروني',
      temp_pass:'كلمة المرور المؤقتة', role:'الدور',
      admin:'مدير — كامل الصلاحيات',
      accountant:'محاسب — إضافة سندات',
      viewer:'عارض — عرض فقط',
      role_admin:'مدير', role_accountant:'محاسب', role_viewer:'عارض',
      you:'(أنت)', create:'إنشاء الحساب',
    },
    audit: {
      title:'سجل العمليات', empty:'السجل فارغ',
      act_add:'إضافة', act_edit:'تعديل', act_delete:'حذف',
    },
    backup: {
      title:'النسخ الاحتياطي',
      json_desc:'تصدير كامل بصيغة JSON',
      download:'تحميل النسخة',
      sys_info:'معلومات النظام',
    },
    edit: {
      rec_title:'تعديل الإيصال',
      pay_title:'تعديل سند الصرف',
      mem_title:'تعديل بيانات العضو',
      warning:'يمكن تعديل المبلغ بالشيكل والملاحظات فقط',
      cancel_voucher:'إلغاء السند',
      amount_ils:'المبلغ بالشيكل ₪',
    },

    login: {
      title:'تسجيل الدخول',
      email:'البريد الإلكتروني',
      password:'كلمة المرور',
      login_btn:'تسجيل الدخول',
      forgot:'نسيت كلمة المرور؟',
      fill_all:'يرجى إدخال البريد وكلمة المرور',
      wrong_credentials:'رقم الهاتف أو البريد أو كلمة المرور غير صحيحة',
      contact_admin:'تواصل مع المدير',
    },
    password: {
      title:'تغيير كلمة المرور',
      new_pass:'كلمة المرور الجديدة',
      confirm_pass:'تأكيد كلمة المرور',
      hint:'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      min_length:'6 أحرف على الأقل',
      mismatch:'كلمات المرور غير متطابقة',
      save:'حفظ كلمة المرور',
    },
    errors: {
      no_permission:'ليس لديك صلاحية',
      no_permission_add:'ليس لديك صلاحية الإضافة',
      no_print:'ليس لديك صلاحية الطباعة',
      required:'مطلوب',
      invalid_amount:'أدخل مبلغاً صحيحاً',
      duplicate_member:'يوجد عضو بنفس الاسم',
      load_error:'خطأ في تحميل البيانات',
      save_error:'خطأ في الحفظ',
      invalid_year:'سنة غير صحيحة',
      already_applied:'تم تطبيق هذا الاشتراك مسبقاً',
      no_members:'لا يوجد أعضاء نشطون',
      confirm_apply:'هل أنت متأكد؟ لا يمكن التراجع.',
      session_expired:'انتهت الجلسة، يرجى إعادة تسجيل الدخول',
      network_error:'خطأ في الاتصال بالخادم',
      min_6_chars:'يجب أن تكون 6 أحرف على الأقل',
      passwords_mismatch:'كلمات المرور غير متطابقة',
      email_required:'البريد الإلكتروني مطلوب',
      password_required:'كلمة المرور مطلوبة',
      generic_error:'خطأ',
      invalid_file_tables:'ملف غير صالح: جداول ناقصة',
      file_error:'خطأ في الملف',
      duplicate_year:'تم تطبيق هذا الاشتراك مسبقاً',
      delete_confirm:'هل أنت متأكد من الحذف؟',
      cancel_confirm:'إلغاء هذا السند نهائياً؟',
      login_error:'رقم الهاتف أو البريد أو كلمة المرور غير صحيحة',
      min_pass:'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      pass_mismatch:'كلمات المرور غير متطابقة',
      popup_blocked:'يرجى السماح بالنوافذ المنبثقة',
      admin_only:'المدير فقط',
      preview_failed:'تعذّر فتح المعاينة',
      download_failed:'تعذّر التنزيل',
      delete_failed:'فشل الحذف',
      name_required:'الاسم مطلوب',
      select_member:'اختر عضواً أولاً',
      excel_load_failed:'تعذّر تحميل مكتبة Excel',
    },
    messages: {
      saved:'تم الحفظ بنجاح',
      deleted:'تم الحذف',
      cancelled:'تم الإلغاء',
      updated:'تم التحديث بنجاح',
      logged_out:'تم تسجيل الخروج',
      annual_applied:'تم تطبيق الاشتراك السنوي بنجاح',
      contact_saved:'تم حفظ جهة الاتصال',
      exported:'تم التصدير بنجاح',
      printed:'جاهز للطباعة',
      contact_admin:'يرجى التواصل مع المدير لإعادة تعيين كلمة المرور',
      pass_changed:'تم تغيير كلمة المرور بنجاح',
      settings_saved:'تم حفظ الإعدادات',
      restoring:'جاري الاستعادة...',
      restore_partial:'استعادة جزئية مع أخطاء',
      restore_success:'تم استعادة النسخة بنجاح',
      backup_done:'تم تصدير النسخة الاحتياطية',
      forgot_contact:'يرجى التواصل مع المدير لإعادة تعيين كلمة المرور',
      attach_uploaded:'✓ تم رفع المرفق',
      attach_deleted:'✓ تم حذف المرفق',
      receipt_saved:'✓ تم حفظ الإيصال',
      payment_saved:'✓ تم حفظ السند',
      member_added:'✓ تمت إضافة العضو',
      role_changed:'تم تغيير الدور',
      account_created:'تم إنشاء الحساب',
      access_denied:'ليس لديك صلاحية الوصول لهذه الصفحة',
    },
  },

  en: {
    common: {
      required:'Required',
      save:'Save', cancel:'Cancel', edit:'Edit', delete:'Delete',
      print:'Print', export:'Export', search:'Search...', refresh:'Refresh',
      apply:'Apply', view:'View', close:'Close', confirm:'Confirm',
      attachments:'Attachments', preview:'Preview', download:'Download',
      save_print:'Save & Print', save_only:'Save Only',
      no_data:'No data available', loading:'Loading...',
      actions:'Actions', notes:'Notes', date:'Date',
      amount:'Amount', currency:'Currency', method:'Payment Method',
      status:'Status', name:'Name', phone:'Phone',
      all:'All', yes:'Yes', no:'No',
      export_dd:'Export ▼', number:'No.', amount_ils:'Amount ₪',
      from_date:'From Date', to_date:'To Date',
      opening_balance:'Opening Balance',
    },
    nav: {
      dashboard:'Dashboard',
      food_receipts:'Food Receipts', food_expenses:'Food Expenses', food_stmt:'Food Statement',
      diwan_receipts:'Diwan Receipts', diwan_expenses:'Diwan Expenses', diwan_stmt:'Diwan Statement',
      donations:'Donations', members:'Family Members',
      member_stmt:'Member Statement', annual:'Annual Dues',
      users:'Users', audit:'Audit Log',
      backup:'Backup', settings:'Settings',
      home:'Home', operations:'Operations',
      food_fund:'Food Fund', diwan_fund:'Diwan Fund',
      donations_sec:'Donations', members_sec:'Members',
      reports_sec:'Reports', system_sec:'System', more:'More',
      reservations:'Reservation Calendar', reservations_sec:'Diwan — Reservations',
    },
    reservations: {
      title:'Reservation Calendar', subtitle:'One reservation per day · Gregorian · week starts Saturday',
      new:'New Reservation', today:'Today', details:'Reservation Details',
      search_ph:'Instant search: name, phone, date, type…',
      f_today:'Today', f_week:'This Week', f_month:'This Month', f_reserved:'Reserved', f_available:'Available',
      lg_reserved:'Reserved', lg_available:'Available', lg_today:'Today', lg_past:'Past (view only)',
      f_date:'Date *', f_name:'Customer Name *', f_name_ph:'Full name',
      f_phone:'Phone Number *', f_type:'Reservation Type *', f_notes_ph:'Optional — guests count, special setup…',
      cancel_res:'Cancel Reservation', cancel_title:'Confirm Cancellation',
      cancel_note:'Soft cancel: hidden from the calendar, kept in the audit log; the day becomes free immediately.',
      keep:'Keep', confirm_cancel:'Confirm Cancel',
    },
    topbar: {
      backup:'Backup', light:'Light', dark:'Dark',
      logout:'Logout', password:'Password',
    },
    dashboard: {
      title:'Dashboard', subtitle:'Financial Overview',
      food_fund:'Food Fund', diwan_fund:'Diwan Fund',
      don_fund:'Donations Fund', total_members:'Family Members',
      late_members:'Late', unpaid:'Unpaid',
      total_income:'Total Receipts', total_expenses:'Total Expenses',
      monthly:'Monthly Activity', last6:'Last 6 months',
      recent:'Recent Operations', quick:'Quick Actions',
      late_title:'Late Members', all_good:'✅ All members are up to date',
      new_receipt:'Receipt', new_payment:'Payment',
      food_receipt:'Food Receipt', diwan_receipt:'Diwan Receipt',
      new_donation:'New Donation', food_stmt:'Food Statement',
      diwan_stmt:'Diwan Statement',
    },
    receipts: {
      title_food:'Food Fund Receipts',
      title_diwan:'Diwan Fund Receipts',
      modal_food:'Food Fund Receipt',
      modal_diwan:'Diwan Fund Receipt',
      new:'New Receipt', type:'Receipt Type',
      payer:'Payer', payer_type:'Payer Type',
      member_payer:'Family Member',
      contact_payer:'Saved Contact',
      manual_payer:'Manual Entry',
      payer_name:'Payer Name',
      save_contact:'Save as Contact',
      fund:'Fund', fund_food:'Food Fund',
      fund_diwan:'Diwan Fund', fund_don:'Donation',
      don_direction:'Donation Direction',
      don_display:'Show in which fund statement?',
      alloc_type:'Allocation Type',
      alloc_support_current:'Support Current Balance',
      alloc_reduce_deficit:'Settle Historical Deficit',
      no_data:'No receipts found',
      receipt_no:'Receipt No.',
      info_food:'Family members payments to contribute to the food fund',
      info_diwan:'Payments to the Diwan from members or outside the family',
      opt_food_long:'Food Fund — Member Contribution',
      opt_diwan_long:'Diwan Fund — Diwan Payment',
      opt_don_long:'Donation — Recorded in Donations Fund',
      payer_section:'Payer Information', member_name:'Member Name',
      contact:'Contact', payer_ph:'Enter name',
      don_disp_food:'Food Fund Statement', don_disp_diwan:'Diwan Fund Statement',
      amount_date:'Amount & Date', amount_cur:'Amount & Currency',
      cur_ils:'₪ Israeli Shekel', cur_usd:'$ US Dollar', cur_jod:'JD Jordanian Dinar',
      ils_amount:'Amount in ILS: ', notes_opt_ph:'Optional notes...', amount_err:'Enter amount',
      cheque_info:'Cheque Information', cheque_no:'Cheque No.', cheque_date:'Cheque Date',
      cheque_bank:'Drawee Bank', cheque_no_ph:'e.g. 123456', bank_ph:'Bank name',
      save_print:'Save & Print', save_only:'Save Only',
    },
   payments: {
   fund:'Fund',
   title_food:'Food Fund Expenses',
   title_diwan:'Diwan Fund Expenses',
   modal_food:'Food Fund Payment Voucher',
   modal_diwan:'Diwan Fund Payment Voucher',
   new:'New Expense',
   beneficiary:'Beneficiary',
   ben_type:'Beneficiary Type',
   expense_type:'Expense Type',
   approved_by:'Approved By',
   food_expense:'Funeral Food Expenses',
   electricity:'Electricity',
   water:'Water',
   cleaning:'Cleaning',
   maintenance:'Maintenance',
   other:'Other',
   no_data:'No expenses found',
   payment_no:'Payment No.',
   method:'Payment Method',
   cash:'Cash',
   check:'Cheque',
   transfer:'Transfer',
   online:'Online',
   info_food:'Funeral catering expenses for the deceased family — paid from the food fund',
   cat_all:'All Categories', category:'Category',
   opt_food_long:'Food Fund — Catering Expenses',
   opt_diwan_long:'Diwan Fund — Diwan Expenses',
   member_name:'Member Name', ben_name:'Beneficiary Name', ben_name_ph:'Beneficiary name',
   method_pay:'Disbursement Method', approved_ph:'Approver name', desc_ph:'Detailed description...',
},


    donations: {
      title:'Donations Registry', new:'New Donation',
      donor:'Donor', show_in:'Show In', classification:'Classification',
      no_data:'No donations found',
      info:'A cash donation enters its treasury and is referenced here · in-kind/service value is documentation only and never enters a treasury',
    },
    members: {
      title:'Family Members', new:'New Member',
      food_balance:'Food Balance ₪',
      paid:'Paid', late:'Late',
      opening_hint:'Negative = debt on member',
      no_data:'No members found',
      member_stmt:'Member Statement',
      choose:'-- Select Member --',
      current_bal:'Current Balance',
      total_donations:'Total Donations',
      food_stmt_title:'Food Fund Statement',
      opening_bal:'Opening Balance',
      annual_due:'Annual Due',
      contribution:'Contribution',
      don_section:'Donations (do not affect balance)',
      receipt_no:'Receipt No.',
      filter_all:'All', filter_paid:'Paid', filter_late:'Has Balance',
      search_ph:'Search by name...',
      col_name:'Name', col_phone:'Phone', col_status:'Status', col_actions:'Actions',
      count:'members',
    },
    stmt: {
      type_all:'All', type_cr:'Receipts Only',
      type_dr:'Expenses Only', type_don:'Donations Only',
      total_income:'Total Income',
      total_expenses:'Total Expenses',
      closing_bal:'Closing Balance',
      current_bal:'Current Balance',
      all_periods:'All Periods',
      date_from:'From',
      date_to:'To',
      print_title:'Statement',
      currency_note:'Currency: ILS (₪)',
      period_label:'Period:',
      opening_bal:'Opening Balance',
      total_in:'Total Income',
      total_out:'Total Expenses',
      col_in:'Receipts',
      col_out:'Expenses',
      sig_accountant:'Accountant',
      sig_diwan:'Diwan Signature',
      sig_member:'Member Signature',
      printed_at:'Printed:',
      page_info:'Page 1 / 1',
      debit_tag:'(Debit)',
      credit_tag:'(Credit)',
      member_label:'Member:',
      active_since:'Active Since',
      total_due:'Total Due',
      total_paid:'Total Paid',
      final_bal:'Closing Balance',
      ref:'Reference',
      col_due:'Amount Due',
      col_paid:'Amount Paid',
      donation_report:'Donations Report',
      count_label:'Donation Count:',
      donation_count:'Donation Count',
      total_donations:'Total Donations',
      to_food:'Allocated to Food Fund',
      to_diwan:'Allocated to Diwan Fund',
      direction:'Allocation',
      no_data:'No transactions in this period',
      credit:'Credit', debit:'Debit', balance:'Balance',
      desc:'Description', donor_name:'Name', note:'Notes',
      title_food:'Food Fund Statement', title_diwan:'Diwan Fund Statement',
      movement_type:'Movement Type',
    },
    annual: {
      title:'Annual Dues',
      desc:'₪200 per member at start of each year',
      year:'Year', amount:'Amount ₪',
      apply:'Apply Annual Due',
      history:'Applied Dues History',
      no_data:'No dues applied yet',
      warning:'Pressing apply will add the amount as debt on all members. Cannot be undone.',
    },
    settings: {
      title:'Settings', subtitle:'Opening Balances & System Settings',
      opening_title:'Fund Opening Balances',
      food_opening:'Food Fund Opening Balance ₪',
      diwan_opening:'Diwan Fund Opening Balance ₪',
      food_hint:'Amount in the fund before system start',
      diwan_hint:'Amount in the fund before system start',
      rates_title:'Fallback Exchange Rates',
      rates_hint:'Used only if automatic rate fetch fails',
      usd_rate:'US Dollar Rate USD ₪',
      jod_rate:'Jordanian Dinar Rate JOD ₪',
      summary:'Balance Summary with Opening',
      save:'Save Settings',
      opening_warn:'Diwan: opening balance is included in the balance. Food: previous balance is for reference only and not added.',
      food_opening_long:'Food Fund Previous Balance (reference only — not included in calculation) ₪',
      diwan_usd:'Diwan Previous Balance $ (currencies only)',
      diwan_jod:'Diwan Previous Balance JD (currencies only)',
      food_usd:'Food Previous Balance $ (currencies only)',
      food_jod:'Food Previous Balance JD (currencies only)',
      usd_rate_short:'USD Rate ₪', jod_rate_short:'JOD Rate ₪',
      save_short:'Save',
    },
    users: {
      title:'User Management', invite:'Invite User',
      full_name:'Full Name', email:'Email Address',
      temp_pass:'Temporary Password', role:'Role',
      admin:'Admin — Full access',
      accountant:'Accountant — Add vouchers',
      viewer:'Viewer — Read only',
      role_admin:'Admin', role_accountant:'Accountant', role_viewer:'Viewer',
      you:'(You)', create:'Create Account',
    },
    audit: {
      title:'Audit Log', empty:'Log is empty',
      act_add:'Add', act_edit:'Edit', act_delete:'Delete',
    },
    backup: {
      title:'Backup',
      json_desc:'Full export in JSON format',
      download:'Download Backup',
      sys_info:'System Information',
    },
    edit: {
      rec_title:'Edit Receipt',
      pay_title:'Edit Payment',
      mem_title:'Edit Member',
      warning:'Only amount in ILS and notes can be edited',
      cancel_voucher:'Cancel Voucher',
      amount_ils:'Amount in ILS ₪',
    },

    login: {
      title:'Sign In',
      email:'Email Address',
      password:'Password',
      login_btn:'Sign In',
      forgot:'Forgot password?',
      fill_all:'Please enter email and password',
      wrong_credentials:'Invalid phone/email or password',
      contact_admin:'Contact your administrator',
    },
    password: {
      title:'Change Password',
      new_pass:'New Password',
      confirm_pass:'Confirm Password',
      hint:'Password must be at least 6 characters',
      min_length:'At least 6 characters',
      mismatch:'Passwords do not match',
      save:'Save Password',
    },
    login: {
      title:'Sign In',
      email:'Email Address',
      password:'Password',
      login_btn:'Sign In',
      forgot:'Forgot password?',
      fill_all:'Please enter email and password',
      wrong_credentials:'Invalid phone/email or password',
      contact_admin:'Contact your administrator',
    },
    errors: {
      no_permission:'Permission denied',
      no_permission_add:'No permission to add',
      no_print:'No print permission',
      required:'Required',
      invalid_amount:'Enter a valid amount',
      duplicate_member:'A member with this name already exists',
      load_error:'Error loading data',
      save_error:'Error saving data',
      invalid_year:'Invalid year',
      already_applied:'This due has already been applied',
      no_members:'No active members found',
      confirm_apply:'Are you sure? This cannot be undone.',
      session_expired:'Session expired, please login again',
      network_error:'Network connection error',
      min_6_chars:'Must be at least 6 characters',
      passwords_mismatch:'Passwords do not match',
      email_required:'Email is required',
      password_required:'Password is required',
      generic_error:'Error',
      invalid_file_tables:'Invalid file: missing tables',
      file_error:'File error',
      duplicate_year:'Annual due already applied for this year',
      delete_confirm:'Are you sure you want to delete?',
      cancel_confirm:'Cancel this voucher permanently?',
      login_error:'Invalid phone/email or password',
      min_pass:'Password must be at least 6 characters',
      pass_mismatch:'Passwords do not match',
      popup_blocked:'Please allow popups in your browser',
      admin_only:'Admin only',
      preview_failed:'Failed to open preview',
      download_failed:'Download failed',
      delete_failed:'Delete failed',
      name_required:'Name is required',
      select_member:'Select a member first',
      excel_load_failed:'Failed to load Excel library',
    },
    messages: {
      saved:'Saved successfully',
      deleted:'Deleted successfully',
      cancelled:'Cancelled',
      updated:'Updated successfully',
      logged_out:'Logged out successfully',
      annual_applied:'Annual due applied successfully',
      contact_saved:'Contact saved',
      exported:'Exported successfully',
      printed:'Ready to print',
      contact_admin:'Please contact the admin to reset your password',
      pass_changed:'Password changed successfully',
      settings_saved:'Settings saved',
      restoring:'Restoring...',
      restore_partial:'Partial restore with errors',
      restore_success:'Backup restored successfully',
      backup_done:'Backup exported',
      forgot_contact:'Please contact the admin to reset your password',
   attach_uploaded:'✓ Attachment uploaded',
   attach_deleted:'✓ Attachment deleted',
   receipt_saved:'✓ Receipt saved',
   payment_saved:'✓ Payment saved',
   member_added:'✓ Member added',
   role_changed:'Role changed',
   account_created:'Account created',
   access_denied:'You do not have access to this page',
    },
  },
};


/* == FORMATTERS == */
window.formatNumber = function(n) {
  const num = Number(n || 0);
  return Math.round(num).toLocaleString('en-US');
};

window.formatCurrency = function(n) {
  const num = Number(n || 0);
  if (window.LANG === 'ar') {
    return Math.round(num).toLocaleString('en-US') + ' ₪';
  }
  return '₪ ' + Math.round(num).toLocaleString('en-US');
};

window.formatCurrencyD = function(n) {
  const num = Number(n || 0);
  const fixed = num.toFixed(2);
  if (window.LANG === 'ar') {
    return parseFloat(fixed).toLocaleString('ar-SA', {minimumFractionDigits:2}) + ' ₪';
  }
  return '₪ ' + parseFloat(fixed).toLocaleString('en-US', {minimumFractionDigits:2});
};

window.formatDate = function(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    if (window.LANG === 'en') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return dd + ' ' + months[dt.getMonth()] + ' ' + yyyy;
    }
    return dd + '/' + mm + '/' + yyyy;
  } catch(e) { return d; }
};

window.formatDateFull = function(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (window.LANG === 'ar') {
      return dt.toLocaleDateString('ar-SA', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    }
    return dt.toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  } catch(e) { return d; }
};

/* == TRANSLATION HELPER == */
window.t = function(key) {
  if(!key) return '';
  const parts = key.split('.');
  let obj = translations[window.LANG] || translations.ar;
  for (const p of parts) {
    if (obj && obj[p] !== undefined) obj = obj[p];
    else {
      if(window.LANG !== 'ar') {
        let fallback = translations.ar;
        for (const p2 of parts) {
          if (fallback && fallback[p2] !== undefined) fallback = fallback[p2];
          else { console.warn('[i18n] Missing key:', key); return key; }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
      console.warn('[i18n] Missing key:', key);
      return key;
    }
  }
  return typeof obj === 'string' ? obj : key;
};

/* == SET EL TEXT SAFELY == */
function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setInner(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, val);
}
function qTxt(sel, text) {
  const el = document.querySelector(sel);
  if (el) el.textContent = text;
}


/* == SCAN FOR UNTRANSLATED TEXT == */
window.scanForUntranslatedText = function() {
  const arabicRegex = /[؀-ۿ]/;
  const results = { hardcoded: [], missing: [], total: 0 };

  // فحص العناصر التي تحتوي نصاً عربياً بدون data-i18n
  document.querySelectorAll('button, label, th, td, h1, h2, h3, p, span, div').forEach(el => {
    if (el.children.length === 0) {
      const txt = el.textContent.trim();
      if (arabicRegex.test(txt) && !el.hasAttribute('data-i18n') && !el.closest('[data-i18n]')) {
        results.hardcoded.push({ tag: el.tagName, text: txt.slice(0,50), el });
      }
    }
    results.total++;
  });

  // فحص data-i18n مفاتيح غير موجودة
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (window.t(key) === key) {
      results.missing.push(key);
    }
  });

  console.group('[i18n] Scan Report');
  console.log('Total elements scanned:', results.total);
  console.log('Hardcoded Arabic text:', results.hardcoded.length);
  results.hardcoded.forEach(r => console.warn('  Hardcoded:', r.tag, '-', r.text));
  console.log('Missing translation keys:', results.missing.length);
  results.missing.forEach(k => console.warn('  Missing key:', k));
  console.groupEnd();

  return results;
};

/* == CACHE DOM REFS FOR PERFORMANCE == */
const _i18nCache = {};
function getCached(sel) {
  if (!_i18nCache[sel]) _i18nCache[sel] = document.querySelectorAll(sel);
  return _i18nCache[sel];
}
function clearI18nCache() {
  Object.keys(_i18nCache).forEach(k => delete _i18nCache[k]);
}


/* == CACHE DOM REFS FOR PERFORMANCE == */
const _missingKeys = new Set();
const _originalT = window.t;
window.t = function(key) {
  const parts = key.split('.');
  let obj = translations[window.LANG] || translations.ar;
  let found = true;
  for (const p of parts) {
    if (obj && obj[p] !== undefined) { obj = obj[p]; }
    else { found = false; break; }
  }
  if (!found || typeof obj !== 'string') {
    if (!_missingKeys.has(key)) {
      _missingKeys.add(key);
      console.warn(`[i18n] Missing key: "${key}" for lang: ${window.LANG}`);
    }
    // fallback to Arabic
    obj = translations.ar;
    for (const p of parts) {
      if (obj && obj[p] !== undefined) obj = obj[p];
      else return key;
    }
    return typeof obj === 'string' ? obj : key;
  }
  return obj;
};

/* == CACHE DOM REFS FOR PERFORMANCE == */
window.scanForUntranslatedText = function() {
  const arabicRegex = /[؀-ۿ]/;
  const issues = [];
  const allText = document.querySelectorAll('*');
  let count = 0;
  allText.forEach(el => {
    if (['SCRIPT','STYLE','META','LINK'].includes(el.tagName)) return;
    if (el.childNodes.length === 0) return;
    el.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        const txt = node.textContent.trim();
        if (txt && arabicRegex.test(txt) && !el.hasAttribute('data-i18n')) {
          issues.push({ element: el.tagName, text: txt.slice(0,50), path: el.className||el.id||'' });
          count++;
        }
      }
    });
  });
  const translated = document.querySelectorAll('[data-i18n]').length;
  const total = count + translated;
  console.group('[i18n] Translation Coverage Report');
  console.log(`Total elements: ${total}`);
  console.log(`Translated (data-i18n): ${translated}`);
  console.log(`Potentially untranslated: ${count}`);
  console.log(`Missing keys logged: ${_missingKeys.size}`);
  if (issues.length > 0) {
    console.warn('Untranslated Arabic text found:');
    issues.slice(0,20).forEach(i => console.warn(`  <${i.element}> "${i.text}" [${i.path}]`));
  }
  console.groupEnd();
  return { total, translated, untranslated: count, missingKeys: [..._missingKeys] };
};

/* == DOM CACHE for performance == */
const _domCache = new Map();
function getCached(selector) {
  if (!_domCache.has(selector)) {
    _domCache.set(selector, document.querySelector(selector));
  }
  return _domCache.get(selector);
}
function clearDomCache() { _domCache.clear(); }

/* == APPLY LANGUAGE == */
window.applyLang = function() {
  const lang = window.LANG;
  const isAr = lang === 'ar';
  clearI18nCache();

  // RTL ثابت دائماً
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', 'rtl');

  // data-i18n — ترجمة النصوص
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = window.t(key);
    if (text && text !== key) el.textContent = text;
  });

  // data-i18n-placeholder — ترجمة placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = window.t(key);
    if (text && text !== key) el.setAttribute('placeholder', text);
  });

  // data-i18n-title — ترجمة titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const text = window.t(key);
    if (text && text !== key) el.setAttribute('title', text);
  });

  // -- TOPBAR --
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    const isLight = document.body.classList.contains('light');
    const ico = isLight ? 'ti-moon' : 'ti-sun';
    const lbl = isLight ? window.t('topbar.dark') : window.t('topbar.light');
    themeBtn.innerHTML = `<i class="ti ${ico}"></i>${lbl}`;
  }
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.innerHTML = `<i class="ti ti-language"></i>${isAr ? 'EN' : 'AR'}`;

  const backupBtn = document.querySelector('.tbtn[onclick="window.doBackup()"]');
  if (backupBtn) backupBtn.innerHTML = `<i class="ti ti-database-export"></i>${window.t('topbar.backup')}`;
  const passBtn = document.querySelector('.tbtn[onclick="window.openM(\'change-pass\')"]');
  if (passBtn) passBtn.innerHTML = `<i class="ti ti-lock"></i>${window.t('topbar.password')}`;
  const logoutBtn = document.querySelector('.tbtn.red[onclick="window.logout()"]');
  if (logoutBtn) logoutBtn.innerHTML = `<i class="ti ti-logout"></i>${window.t('topbar.logout')}`;

  // -- SIDEBAR --
  const nbMap = {
    'dash':        ['ti-layout-dashboard', 'nav.dashboard'],
    'food-rec':    ['ti-receipt',          'nav.food_receipts'],
    'food-pay':    ['ti-cash',             'nav.food_expenses'],
    'food-stmt':   ['ti-file-description', 'nav.food_stmt'],
    'diwan-rec':   ['ti-receipt',          'nav.diwan_receipts'],
    'diwan-pay':   ['ti-cash',             'nav.diwan_expenses'],
    'diwan-stmt':  ['ti-file-description', 'nav.diwan_stmt'],
    'don':         ['ti-heart',            'nav.donations'],
    'members':     ['ti-users',            'nav.members'],
    'member-stmt': ['ti-user',             'nav.member_stmt'],
    'annual':      ['ti-calendar',         'nav.annual'],
    'users':       ['ti-shield-lock',      'nav.users'],
    'audit':       ['ti-list-check',       'nav.audit'],
    'reservations':['ti-calendar-event',   'nav.reservations'],
    'bk':          ['ti-database',         'nav.backup'],
    'settings':    ['ti-settings',         'nav.settings'],
  };
  Object.entries(nbMap).forEach(([p, [ico, key]]) => {
    const el = document.querySelector(`.nb[data-p="${p}"]`);
    if (el) el.innerHTML = `<i class="ti ${ico}"></i>${window.t(key)}`;
  });

  // Sidebar sections
  const secs = document.querySelectorAll('.sb-sec');
  const secLabels = [
    'nav.home','nav.operations','nav.food_fund','nav.diwan_fund',
    'nav.donations_sec','nav.members_sec','nav.system_sec'
  ];
  secs.forEach((el, i) => { if (secLabels[i]) el.textContent = window.t(secLabels[i]); });

  // -- PAGE HEADERS --
  qTxt('#pg-dash .ph-t',       window.t('dashboard.title'));
  qTxt('#pg-food-rec .ph-t',   window.t('receipts.title_food'));
  qTxt('#pg-food-pay .ph-t',   window.t('payments.title_food'));
  qTxt('#pg-food-stmt .ph-t',  window.t('nav.food_stmt'));
  qTxt('#pg-diwan-rec .ph-t',  window.t('receipts.title_diwan'));
  qTxt('#pg-diwan-pay .ph-t',  window.t('payments.title_diwan'));
  qTxt('#pg-diwan-stmt .ph-t', window.t('nav.diwan_stmt'));
  qTxt('#pg-don .ph-t',        window.t('donations.title'));
  qTxt('#pg-members .ph-t',    window.t('members.title'));
  qTxt('#pg-member-stmt .ph-t',window.t('nav.member_stmt'));
  qTxt('#pg-annual .ph-t',     window.t('annual.title'));
  qTxt('#pg-annual .ph-s',     window.t('annual.desc'));
  qTxt('#pg-users .ph-t',      window.t('users.title'));
  qTxt('#pg-audit .ph-t',      window.t('audit.title'));
  qTxt('#pg-bk .ph-t',         window.t('backup.title'));
  qTxt('#pg-settings .ph-t',   window.t('settings.title'));
  qTxt('#pg-settings .ph-s',   window.t('settings.subtitle'));

  // -- ACTION BUTTONS --
  const btnMap = {
    'dash-btn-rec':   ['ti-plus',     'dashboard.new_receipt'],
    'dash-btn-pay':   ['ti-minus',    'dashboard.new_payment'],
    'btn-food-rec':   ['ti-plus',     'receipts.new'],
    'btn-food-pay':   ['ti-plus',     'payments.new'],
    'btn-diwan-rec':  ['ti-plus',     'receipts.new'],
    'btn-diwan-pay':  ['ti-plus',     'payments.new'],
    'btn-don':        ['ti-heart',    'donations.new'],
    'btn-add-member': ['ti-user-plus','members.new'],
    'btn-apply-due':  ['ti-calendar-plus','annual.apply'],
  };
  Object.entries(btnMap).forEach(([id, [ico, key]]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<i class="ti ${ico}"></i>${window.t(key)}`;
  });

  // Export buttons
  document.querySelectorAll('.btn.sm[onclick*="exportCSV"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-download"></i>${window.t('common.export')}`;
  });
  document.querySelectorAll('.btn.sm[onclick*="prtStmt"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-printer"></i>${window.t('common.print')}`;
  });
  document.querySelectorAll('.btn.sm[onclick*="prtMember"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-printer"></i>${window.t('common.print')}`;
  });
  document.querySelectorAll('.btn.sm[onclick="window.loadAll()"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-refresh"></i>${window.t('common.refresh')}`;
  });

  // -- TABLE HEADERS --
  const thMap = {
    'food-rec-body':   [t('receipts.receipt_no'), t('common.date'), t('receipts.payer'), t('common.amount'), t('payments.method'), t('common.notes'), t('common.actions')],
    'food-pay-body':   [t('payments.payment_no'), t('common.date'), t('payments.beneficiary'), t('common.amount'), t('payments.method'), t('common.notes'), t('common.actions')],
    'diwan-rec-body':  [t('receipts.receipt_no'), t('common.date'), t('receipts.payer'), t('common.amount'), t('common.currency'), t('payments.method'), t('common.notes'), t('common.actions')],
    'diwan-pay-body':  [t('payments.payment_no'), t('common.date'), t('payments.beneficiary'), t('common.amount'), t('payments.expense_type'), t('payments.method'), t('common.notes'), t('common.actions')],
    'don-body':        [t('receipts.receipt_no'), t('common.date'), t('donations.donor'), t('common.amount'), t('common.currency'), t('donations.classification'), t('common.notes'), t('common.actions')],
    'members-body':    ['#', t('common.name'), t('common.phone'), t('members.food_balance'), t('common.status'), t('common.actions')],
  };
  Object.entries(thMap).forEach(([bodyId, headers]) => {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;
    const table = tbody.closest('table');
    const thead = table ? table.querySelector('thead tr') : null;;
    if (thead) thead.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
  });

  // -- STATEMENT FILTERS --
  [['food-stmt-from','diwan-stmt-from','ms-from']].flat().forEach(id => {
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (lbl) lbl.textContent = window.t('common.from_date');
  });
  [['food-stmt-to','diwan-stmt-to','ms-to']].flat().forEach(id => {
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (lbl) lbl.textContent = window.t('common.to_date');
  });
  document.querySelectorAll('[id$="-stmt-type"] option, #food-stmt-type option, #diwan-stmt-type option').forEach(opt => {
    if (opt.value === '')    opt.text = window.t('stmt.type_all');
    if (opt.value === 'cr')  opt.text = window.t('stmt.type_cr');
    if (opt.value === 'dr')  opt.text = window.t('stmt.type_dr');
    if (opt.value === 'don') opt.text = window.t('stmt.type_don');
  });

  // -- DIWAN PAY FILTER --
  const diwanPayFilter = document.getElementById('f-diwan-pay-type');
  if (diwanPayFilter) {
    const opts = diwanPayFilter.options;
    if (opts[0]) opts[0].text = window.t('common.all');
    if (opts[1]) opts[1].text = window.t('payments.electricity');
    if (opts[2]) opts[2].text = window.t('payments.water');
    if (opts[3]) opts[3].text = window.t('payments.cleaning');
    if (opts[4]) opts[4].text = window.t('payments.maintenance');
    if (opts[5]) opts[5].text = window.t('payments.other');
  }

  // -- MEMBER FILTER --
  const memFilter = document.getElementById('f-member-status');
  if (memFilter) {
    const opts = memFilter.options;
    if (opts[0]) opts[0].text = window.t('common.all');
    if (opts[1]) opts[1].text = window.t('members.paid');
    if (opts[2]) opts[2].text = window.t('members.late');
  }

  // -- MODALS --
  // Receipt modal
  qTxt('#rec-mtitle', window.t('receipts.new'));
  const recFundSel = document.getElementById('rec-fund');
  if (recFundSel) {
    const opts = recFundSel.options;
    if (opts[0]) opts[0].text = window.t('receipts.fund_food') + ' — ' + (isAr ? 'مساهمة عضو' : 'Member Contribution');
    if (opts[1]) opts[1].text = window.t('receipts.fund_diwan') + ' — ' + (isAr ? 'دفعة للديوان' : 'Diwan Payment');
    if (opts[2]) opts[2].text = window.t('receipts.fund_don') + ' — ' + (isAr ? 'صندوق التبرعات' : 'Donation Fund');
  }
  qTxt('label[for="rec-member"]',   window.t('members.title'));
  qTxt('label[for="rec-currency"]', window.t('common.currency'));
  qTxt('label[for="rec-date"]',     window.t('common.date'));

  // Payment modal
  qTxt('#pay-mtitle', window.t('payments.new'));
  qTxt('label[for="pay-currency"]', window.t('common.currency'));
  qTxt('label[for="pay-date"]',     window.t('common.date'));
  qTxt('label[for="pay-approved"]', window.t('payments.approved_by'));

  // Placeholders
  const placeholders = {
    'q-food-rec': 'common.search', 'q-food-pay': 'common.search',
    'q-diwan-rec': 'common.search', 'q-diwan-pay': 'common.search',
    'q-don': 'common.search', 'q-members': 'common.search',
  };
  Object.entries(placeholders).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = window.t(key);
  });

  // Payment method pills
  document.querySelectorAll('.pill[data-val="cash"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-cash"></i>${window.t('payments.cash')}`;
  });
  document.querySelectorAll('.pill[data-val="check"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-file-dollar"></i>${window.t('payments.check')}`;
  });
  document.querySelectorAll('.pill[data-val="transfer"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-building-bank"></i>${window.t('payments.transfer')}`;
  });
  document.querySelectorAll('.pill[data-val="online"]').forEach(el => {
    el.innerHTML = `<i class="ti ti-device-mobile"></i>${window.t('payments.online')}`;
  });

  // Settings page labels
  qTxt('label[for="set-food-opening"]',  window.t('settings.food_opening'));
  qTxt('label[for="set-diwan-opening"]', window.t('settings.diwan_opening'));
  qTxt('label[for="set-usd-rate"]',      window.t('settings.usd_rate'));
  qTxt('label[for="set-jod-rate"]',      window.t('settings.jod_rate'));

  // Annual page
  qTxt('label[for="due-year"]',   window.t('annual.year'));
  qTxt('label[for="due-amount"]', window.t('annual.amount'));

  // Member stmt
  const msFrom = document.querySelector('label[for="ms-from"]');
  if (msFrom) msFrom.textContent = window.t('common.from_date');
  const msTo = document.querySelector('label[for="ms-to"]');
  if (msTo) msTo.textContent = window.t('common.to_date');
  const msSel = document.querySelector('label[for="ms-member"]');
  if (msSel) msSel.textContent = window.t('nav.members');

  // Invite user modal
  qTxt('#m-invite .modal-title-text', window.t('users.invite'));
  qTxt('label[for="inv-name"]',  window.t('users.full_name'));
  qTxt('label[for="inv-email"]', window.t('users.email'));
  qTxt('label[for="inv-pass"]',  window.t('users.temp_pass'));
  qTxt('label[for="inv-role"]',  window.t('users.role'));
  const invRoleSel = document.getElementById('inv-role');
  if (invRoleSel) {
    const opts = invRoleSel.options;
    if (opts[0]) opts[0].text = window.t('users.viewer');
    if (opts[1]) opts[1].text = window.t('users.accountant');
    if (opts[2]) opts[2].text = window.t('users.admin');
  }

  // Change password modal
  qTxt('label[for="new-pass"]',     window.t('password.new_pass'));
  qTxt('label[for="confirm-pass"]', window.t('password.confirm_pass'));

  // Edit modals
  qTxt('label[for="edit-rec-amount"]',  window.t('edit.amount_ils'));
  qTxt('label[for="edit-pay-amount"]',  window.t('edit.amount_ils'));

  // Mobile nav
  const mobNav = document.getElementById('mobile-nav');
  if (mobNav) {
    const mnbs = mobNav.querySelectorAll('.mnb span');
    const mobLabels = [
      'nav.dashboard','nav.food_fund','nav.diwan_fund','nav.members','nav.more'
    ];
    mnbs.forEach((el, i) => { if (mobLabels[i]) el.textContent = window.t(mobLabels[i]); });
  }

  // Users page invite btn
  qTxt('#pg-users .btn.sm.primary', window.t('users.invite'));

  // ترجمة كل بقية العناصر
  translateAll();
};


/* == COMPLETE UI TRANSLATION == */

// قاموس ثنائي الاتجاه لكل النصوص
const UI_MAP = {
  // صناديق
  'صندوق الغداء': 'Food Fund',
  'صندوق الديوان': 'Diwan Fund',
  'صندوق التبرعات': 'Donations Fund',

  // KPI labels
  'أعضاء العائلة': 'Family Members',
  'متأخرون': 'Late Members',
  'لم يسددوا': 'Unpaid',
  'إجمالي الإيصالات': 'Total Receipts',
  'إجمالي المصاريف': 'Total Expenses',
  'الرصيد الحالي': 'Current Balance',
  'الرصيد الحالي (2025+)': 'Current Balance (2025+)',
  'إجمالي التبرعات': 'Total Donations',
  'إجمالي الإيرادات': 'Total Income',
  'الرصيد الختامي': 'Closing Balance',
  'صندوق الغداء (مع الافتتاحي)': 'Food Fund (with Opening)',
  'صندوق الديوان (مع الافتتاحي)': 'Diwan Fund (with Opening)',

  // dashboard sections
  'الحركات الشهرية': 'Monthly Activity',
  'آخر 6 أشهر': 'Last 6 months',
  'آخر الحركات': 'Recent Operations',
  'إجراءات سريعة': 'Quick Actions',
  'أعضاء متأخرون': 'Late Members',
  '✅ كل الأعضاء ملتزمون': '✅ All members are up to date',

  // badges / status
  'نقد': 'Cash', 'شيك': 'Cheque', 'تحويل': 'Transfer',
  'تحويل بنكي': 'Bank Transfer', 'أونلاين': 'Online',
  'مسدَّد': 'Paid', 'متأخر': 'Late',
  'مساهمة': 'Contribution',
  'كهرباء': 'Electricity', 'ماء': 'Water',
  'تنظيف': 'Cleaning', 'صيانة': 'Maintenance', 'أخرى': 'Other',
  'مصاريف إطعام': 'Food Expenses',
  'مصاريف إطعام عزاء': 'Funeral Food Expenses',
  'غداء': 'Food', 'ديوان': 'Diwan', 'تبرع': 'Donation',

  // form labels
  'نوع الإيصال': 'Receipt Type',
  'نوع الدافع': 'Payer Type',
  'اسم العضو': 'Member Name',
  'جهة الاتصال': 'Contact',
  'اسم الدافع': 'Payer Name',
  'حفظ كجهة اتصال': 'Save as Contact',
  'توجيه التبرع': 'Donation Direction',
  'يُظهر في كشف أي صندوق؟': 'Show in which fund?',
  'المبلغ': 'Amount',
  'طريقة الدفع': 'Payment Method',
  'طريقة الصرف': 'Payment Method',
  'فئة المصروف': 'Expense Type',
  'المستفيد': 'Beneficiary',
  'نوع المستفيد': 'Beneficiary Type',
  'اسم المستفيد': 'Beneficiary Name',
  'معتمد من': 'Approved By',
  'الاسم الكامل': 'Full Name',
  'سالب = دين على العضو': 'Negative = debt on member',
  'الرصيد الافتتاحي لصندوق الغداء ₪': 'Food Fund Opening Balance ₪',
  'الرصيد الافتتاحي لصندوق الديوان ₪': 'Diwan Fund Opening Balance ₪',
  'المبلغ الموجود في الصندوق قبل بدء النظام': 'Amount in fund before system start',
  'سعر الدولار الأمريكي USD ₪': 'USD Rate ₪',
  'سعر الدينار الأردني JOD ₪': 'JOD Rate ₪',
  'تُستخدم فقط إذا تعذّر جلب السعر التلقائي من الإنترنت': 'Used only if automatic rate fetch fails',
  'ملخص الأرصدة مع الافتتاحي': 'Balance Summary with Opening',
  'السنة': 'Year',
  'المبلغ ₪': 'Amount ₪',
  'من تاريخ': 'From Date',
  'إلى تاريخ': 'To Date',
  'اختر العضو': 'Select Member',
  'نوع الحركة': 'Operation Type',
  'البريد الإلكتروني': 'Email Address',
  'كلمة المرور المؤقتة': 'Temporary Password',
  'الدور': 'Role',
  'كلمة المرور الجديدة': 'New Password',
  'تأكيد كلمة المرور': 'Confirm Password',
  'المبلغ بالشيكل ₪': 'Amount in ILS ₪',
  'رقم الشيك': 'Cheque No.',
  'تاريخ الشيك': 'Cheque Date',
  'البنك المسحوب عليه': 'Bank Name',
  'اسم المتبرع': 'Donor Name',
  'نوع الدافع': 'Payer Type',
  'معلومات الشيك': 'Cheque Information',

  // select options
  'صندوق الغداء — مساهمة عضو': 'Food Fund — Member Contribution',
  'صندوق الديوان — دفعة للديوان': 'Diwan Fund — Diwan Payment',
  'تبرع — يُسجَّل في صندوق التبرعات': 'Donation — Donations Fund',
  'عضو من العائلة': 'Family Member',
  'جهة اتصال مسجلة': 'Saved Contact',
  'إدخال يدوي': 'Manual Entry',
  'كشف صندوق الغداء': 'Food Fund Statement',
  'كشف صندوق الديوان': 'Diwan Fund Statement',
  '₪ شيكل إسرائيلي': '₪ Israeli Shekel',
  '$ دولار أمريكي': '$ US Dollar',
  'د.أ دينار أردني': 'JD Jordanian Dinar',
  'صندوق الغداء — مصاريف الإطعام': 'Food Fund — Food Expenses',
  'صندوق الديوان — مصاريف الديوان': 'Diwan Fund — Diwan Expenses',
  'كل الفئات': 'All Categories',
  'الكل': 'All',
  'إيصالات فقط': 'Receipts Only',
  'مصاريف فقط': 'Expenses Only',
  'تبرعات فقط': 'Donations Only',
  'عليه رصيد': 'Has Balance',
  'شخص آخر': 'Other Person',
  'عارض — عرض فقط': 'Viewer — Read Only',
  'محاسب — إضافة سندات': 'Accountant — Add Vouchers',
  'مدير — كامل الصلاحيات': 'Admin — Full Access',
  '-- اختر عضواً --': '-- Select Member --',
  '-- اختر --': '-- Select --',

  // empty states
  'لا توجد إيصالات': 'No receipts found',
  'لا توجد مصاريف': 'No expenses found',
  'لا توجد تبرعات': 'No donations found',
  'لا يوجد أعضاء': 'No members found',
  'لا توجد حركات': 'No transactions found',
  'لا توجد حركات في هذه الفترة': 'No transactions in this period',
  'لا توجد اشتراكات مطبقة': 'No dues applied yet',
  'السجل فارغ': 'Log is empty',
  'لا توجد بيانات': 'No data available',

  // mobile nav
  'الرئيسية': 'Home',
  'الغداء': 'Food',
  'الديوان': 'Diwan',
  'الأعضاء': 'Members',
  'المزيد': 'More',
  'إيصالات الغداء': 'Food Receipts',
  'إيصالات الديوان': 'Diwan Receipts',
  'مصاريف الغداء': 'Food Expenses',
  'مصاريف الديوان': 'Diwan Expenses',
  'كشف عضو': 'Member Stmt',
  'سجل العمليات': 'Audit Log',
  'الاشتراكات': 'Annual Dues',
  'المستخدمون': 'Users',
  'الإعدادات': 'Settings',

  // system info
  'عدد الأعضاء': 'Members Count',
  'عدد الإيصالات': 'Receipts Count',
  'عدد سندات الصرف': 'Payments Count',
  'رصيد صندوق الغداء': 'Food Fund Balance',
  'رصيد صندوق الديوان': 'Diwan Fund Balance',
  'سعر الدولار': 'Dollar Rate',
  'سعر الدينار الأردني': 'JD Rate',

  // page subtitles
  '200 ₪ على كل عضو بداية كل سنة': '₪200 per member at start of each year',
  'الرصيد الافتتاحي وإعدادات النظام': 'Opening balances and system settings',
  'مدفوعات أعضاء العائلة للمساهمة في صندوق الغداء': 'Member contributions to the Food Fund',

  // warnings
  'يمكن تعديل المبلغ بالشيكل والملاحظات فقط': 'Only ILS amount and notes can be edited',
  'الرصيد الافتتاحي يُحسب أولاً قبل أي عملية — يُدخَل مرة واحدة فقط ولا يتغير إلا بموافقة المدير':
    'Opening balance is calculated first — entered once only',

  // backup
  'تصدير كامل بصيغة JSON': 'Full export in JSON format',
  'معلومات النظام': 'System Information',

  // login
  'يرجى التواصل مع المدير لإعادة تعيين كلمة المرور': 'Please contact the admin to reset your password',
  'نسيت كلمة المرور؟': 'Forgot password?',

  // user roles
  'مدير': 'Admin', 'محاسب': 'Accountant', 'عارض': 'Viewer',
  '(أنت)': '(You)',

  // annual
  'سجل الاشتراكات المطبقة': 'Applied Dues History',
  'طُبِّق': 'Applied',
  'بواسطة': 'By',
};

// بناء الخريطة العكسية تلقائياً
const UI_MAP_REVERSE = {};
Object.entries(UI_MAP).forEach(([ar, en]) => { UI_MAP_REVERSE[en] = ar; });

function translateText(txt, toEn) {
  const t = txt.trim();
  if (toEn) return UI_MAP[t] || t;
  return UI_MAP_REVERSE[t] || t;
}

function translateNode(el, toEn) {
  if (!el) return;
  // تجاهل العناصر التي لها أطفال عناصر (ليس نص فقط)
  const hasOnlyText = Array.from(el.childNodes).every(n =>
    n.nodeType === 3 || (n.nodeType === 1 && ['I','SPAN','B','STRONG','SMALL'].includes(n.tagName))
  );
  if (!hasOnlyText) return;

  el.childNodes.forEach(node => {
    if (node.nodeType === 3 && node.textContent.trim()) {
      const translated = translateText(node.textContent.trim(), toEn);
      if (translated !== node.textContent.trim()) {
        node.textContent = node.textContent.replace(node.textContent.trim(), translated);
      }
    }
  });
}

function translateAll() {
  const toEn = window.LANG === 'en';
  const isAr = !toEn;

  // ترجمة كل العناصر النصية في النظام
  const selectors = [
    '.fund-label', '.kpi-lbl', '.kpi-sub',
    '.ct', '.badge', '.role-tag',
    '.fi label', '.lfi label', '.sdiv',
    '.empty-t', '.empty-s',
    '.fund-sub', '.info-t', '.info-d',
    '.sr-l', '.sr-v',
    '.ph-s',
    '.ibox > span', '.ibox > i + span',
    'select option',
    '.pill',
    '.mtt > span:last-child',
    '#pg-bk p',
    '.card > .ct',
    '.ledger-hdr > span',
    '.lr-desc',
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      // تجاهل data-i18n (تُترجم تلقائياً)
      if (el.hasAttribute('data-i18n')) return;
      // تجاهل الأيقونات
      if (el.tagName === 'I') return;
      translateNode(el, toEn);
    });
  });

  // ترجمة placeholders
  const phMap = {
    'ملاحظات اختيارية...': 'Optional notes...',
    'وصف تفصيلي...': 'Detailed description...',
    'اسم المعتمد': 'Approver name',
    'اسم المستفيد': 'Beneficiary name',
    'Beneficiary Name': 'Beneficiary Name',
    'اسم الشخص': 'Person name',
    'اسم الدافع': 'Payer name',
    'اسم البنك': 'Bank name',
    'Bank Name': 'Bank Name',
    'مثال: 123456': 'e.g. 123456',
    'الاسم الكامل': 'Full name',
    'ملاحظات...': 'Notes...',
    'بحث...': 'Search...',
    'Search...': 'Search...',
    'اسم العضو': 'Member name',
    '0599-xxx-xxxx': '0599-xxx-xxxx',
  };
  const phMapRev = Object.fromEntries(Object.entries(phMap).map(([k,v])=>[v,k]));

  document.querySelectorAll('input, textarea').forEach(el => {
    if (el.hasAttribute('data-i18n-placeholder')) return;
    const ph = el.placeholder;
    if (!ph) return;
    if (toEn && phMap[ph]) { el.placeholder = phMap[ph]; }
    else if (!toEn && phMapRev[ph]) { el.placeholder = phMapRev[ph]; }
    else {
      const tr = translateText(ph, toEn);
      if (tr !== ph) el.placeholder = tr;
    }
  });

  // ترجمة login screen
  const lEmail = document.getElementById('l-email');
  if (lEmail) lEmail.placeholder = toEn ? 'Enter your phone number or email address' : 'أدخل رقم الهاتف أو البريد الإلكتروني';
  const lPass = document.getElementById('l-pass');
  if (lPass) lPass.placeholder = toEn ? 'Password' : 'كلمة المرور';
  const lEmailLbl = document.getElementById('lbl-email');
  if (lEmailLbl) lEmailLbl.textContent = toEn ? 'Phone Number or Email Address' : 'رقم الهاتف أو البريد الإلكتروني';
  const lPassLbl = document.getElementById('lbl-pass');
  if (lPassLbl) lPassLbl.textContent = toEn ? 'Password' : 'كلمة المرور';
  const lRemLbl = document.getElementById('lbl-remember');
  if (lRemLbl) lRemLbl.textContent = toEn ? 'Remember me' : 'تذكرني';
  const forgotBtn = document.getElementById('btn-forgot');
  if (forgotBtn) forgotBtn.textContent = toEn ? 'Forgot password?' : 'نسيت كلمة المرور؟';
  const loginLangTxt = document.getElementById('login-lang-txt');
  if (loginLangTxt) loginLangTxt.textContent = toEn ? 'AR' : 'EN';
  const loginBtnTxt = document.getElementById('btn-login-txt');
  if (loginBtnTxt) loginBtnTxt.textContent = toEn ? 'Sign In' : 'تسجيل الدخول';

  // ترجمة topbar subtitle
  const sub = document.querySelector('.top-logo-sub');
  if (sub) sub.textContent = toEn ? 'Financial Management System' : 'نظام الإدارة المالية';
  // ترجمة topbar title
  const topTitle = document.querySelector('.top-logo-text');
  if (topTitle) topTitle.textContent = toEn ? 'Diwan Al Taha' : 'ديوان آل طه';
}

/* == TOGGLE LANGUAGE == */
window.toggleLang = function() {
  window.LANG = window.LANG === 'ar' ? 'en' : 'ar';
  localStorage.setItem('diwan_lang', window.LANG);
  // إعادة رسم كل البيانات أولاً (تستخدم window.LANG الجديد)
  if (typeof renderAll === 'function') renderAll();
  // ثم تطبيق الترجمة على العناصر الثابتة
  window.applyLang();
};

/* == INIT ON LOAD == */
document.addEventListener('DOMContentLoaded', () => {
  window.LANG = localStorage.getItem('diwan_lang') || 'ar';
});
