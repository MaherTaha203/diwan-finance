/* ═══════════════════════════════════════════════════════════════════════════
   Constitutional Laboratory — PERMANENT TEST CASES (FOC certification cases)
   Strict FOC order. Each case links a FOC chapter to an executable scenario over
   the fixed seed and declares its EXPECTED effect (assertions over before/after),
   the constitutional laws involved, and a plain-Arabic business explanation. The
   runner executes it against the real app (isolated in-memory store), checks each
   assertion, captures screenshots, and generates the chapter certification record.

   Snapshot shape (produced by the runner, per phase):
     { treasuries:{food,diwan,defRem,over},
       members:{ 'LAB-001':{finalBalance,totalDues,totalPaid,openingBalance,creditBalance}, ... },
       registers:{cashN,cashS,inkN}, auditN, lastReceipt:{no,movement_type,destination_treasury,amount_ils} }
   Optional per-case flag: ownerDecision:true → chapter status OWNER DECISION REQUIRED.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
const eq = (a, b) => R2(a) === R2(b);

module.exports = [
  {
    id: 'FOC-001',
    title: 'دفعة اشتراك عضو (سداد تامّ 400)',
    member: 'LAB-001',
    narrative: 'محمد أحمد عليه ذمّة تاريخية 350 واشتراكان 2025+2026 = 400. يدفع 400 بالضبط.',
    business: 'العضو سدّد اشتراكيه بالكامل، فدخل المال خزينة الغداء وقلّ ما عليه بمقدار 400 (من 750 إلى 350، وتبقى ذمّته التاريخية 350). لم تتأثّر الخزينتان الأخريان لأن دفعة الاشتراك وجهتها الغداء فقط.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '7 الذرّية', '8 العهدة', '12 تفرّد الهوية'],
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 400 },
    expect: (b, a) => [
      { label: 'السند صُنّف «دفعة اشتراك» ووجهته «خزينة الغداء»', pass: a.lastReceipt && a.lastReceipt.movement_type === 'subscription_payment' && a.lastReceipt.destination_treasury === 'food', detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الغداء +400', pass: eq(a.treasuries.food, b.treasuries.food + 400), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 350', pass: eq(b.members['LAB-001'].finalBalance, 750) && eq(a.members['LAB-001'].finalBalance, 350), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'خزينة الديوان لم تتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan },
      { label: 'خزينة العجز التاريخي لم تتغيّر', pass: eq(a.treasuries.defRem, b.treasuries.defRem), detail: a.treasuries.defRem }
    ]
  },
  {
    id: 'FOC-002',
    title: 'دفعة اشتراك جزئية (250)',
    member: 'LAB-001',
    narrative: 'نفس العضو (عليه 750). يدفع 250: يُسدَّد اشتراك 2025 (200) بالكامل، و2026 جزئيًّا (50)، ويبقى عليه 500.',
    business: 'الدفعة الجزئية وُزِّعت على الأقدم أولًا: غطّت 2025 كاملًا ثم 50 من 2026. دخل المال خزينة الغداء (+250) وقلّ ما على العضو 250 (من 750 إلى 500). بقيت السنوات اللاحقة مستحقّة، ولم تتأثّر الخزائن الأخرى.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة'],
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 250 },
    expect: (b, a) => [
      { label: 'خزينة الغداء +250', pass: eq(a.treasuries.food, b.treasuries.food + 250), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 500 (سُدّد جزء)', pass: eq(a.members['LAB-001'].finalBalance, 500), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'السند صُنّف «دفعة اشتراك» / غداء', pass: a.lastReceipt && a.lastReceipt.movement_type === 'subscription_payment' && a.lastReceipt.destination_treasury === 'food', detail: JSON.stringify(a.lastReceipt) },
      { label: 'الديوان والعجز لم يتغيّرا', pass: eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-003',
    title: 'دفعة زائدة (700) مع وجود ذمّة تاريخية',
    member: 'LAB-001',
    narrative: 'العضو (عليه 750). يدفع 700: 400 اشتراكات + 300 من الذمّة التاريخية (تبقى 50)، ولا رصيد مستقبلي.',
    business: 'الفائض بعد الاشتراكات خفّض ذمّة العضو التاريخية الشخصية (300 من 350، تبقى 50). لم يتكوّن رصيد مستقبلي لأن التزاماته لم تُصفَّ بعد. وفي الواقع الحالي لا تتحرّك خزينة العجز المشتركة من دفعة العضو (القاعدة المعتمَدة لتحويلها معتمَدة وغير مطبَّقة بعد — PAF-001/002).',
    laws: ['1 حفظ القيمة', '2 الاشتقاق', '3 مصدر واحد'],
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 700 },
    expect: (b, a) => [
      { label: 'خزينة الغداء +700', pass: eq(a.treasuries.food, b.treasuries.food + 700), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 50', pass: eq(a.members['LAB-001'].finalBalance, 50), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'لا رصيد مستقبلي بعد (الرصيد لا يزال موجبًا)', pass: a.members['LAB-001'].finalBalance > 0 && eq(a.members['LAB-001'].creditBalance, 0), detail: 'credit=' + a.members['LAB-001'].creditBalance },
      { label: 'خزينة العجز المشتركة لم تتغيّر (الواقع الحالي)', pass: eq(a.treasuries.defRem, b.treasuries.defRem), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'الديوان لم يتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan }
    ]
  },
  {
    id: 'FOC-004',
    title: 'تبرّع نقدي للغداء (دعم حالي) من عضو مسدَّد بالكامل',
    member: 'LAB-004',
    narrative: 'سارة محمود (لا دَين عليها) تتبرّع 500 للغداء، دعم حالي. تبرّعٌ صافٍ كامل — لا شريحة سداد دَين.',
    business: 'لأن العضو لا دَين عليه، دخل التبرّع كلّه خزينة الغداء (+500) وأُدرِج في سجلّ التبرّعات النقدية. لم يتأثّر رصيد العضو (تبرّع لا اشتراك)، ولا الخزينتان الأخريان.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة'],
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 500, kind: 'cash', display: 'food', alloc: 'support_current' },
    expect: (b, a) => [
      { label: 'خزينة الغداء +500', pass: eq(a.treasuries.food, b.treasuries.food + 500), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'سجلّ التبرّعات النقدية +1', pass: a.registers.cashN === b.registers.cashN + 1, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'رصيد العضو لم يتغيّر', pass: eq(a.members['LAB-004'].finalBalance, b.members['LAB-004'].finalBalance), detail: a.members['LAB-004'].finalBalance },
      { label: 'العجز والديوان لم يتغيّرا', pass: eq(a.treasuries.defRem, b.treasuries.defRem) && eq(a.treasuries.diwan, b.treasuries.diwan), detail: '' }
    ]
  },
  {
    id: 'FOC-005',
    title: 'تبرّع غذائي من عضو مَدين — أولوية سداد الدَّين (ق5)',
    member: 'LAB-002',
    narrative: 'أحمد يوسف عليه اشتراكان (دَينه 400). يتبرّع 500 للغداء: يُسدَّد دَينه 400 أولًا (تحويل داخلي غداء←عجز)، ويبقى 100 تبرّعًا. الشريحة المسدِّدة مُستبعَدة من سجلّ التبرّعات.',
    business: 'التبرّع سدّد دَين العضو أولًا (400): خرجت هذه الشريحة من الغداء ودخلت خزينة العجز (تحويل داخلي متوازن)، وبقيت 100 تبرّعًا للغداء. لأن الشريحة سدّدت دَينًا فهي ليست تبرّعًا عامًّا، فلم تُدرَج في سجلّ التبرّعات.',
    laws: ['1 حفظ القيمة', '2 الاشتقاق', '4 هويّة معلنة', '8 العهدة', '9 حدّ العجز'],
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-002', amount: 500, kind: 'cash', display: 'food', alloc: 'support_current' },
    expect: (b, a) => [
      { label: 'دَين العضو 400 → 0', pass: eq(b.members['LAB-002'].finalBalance, 400) && eq(a.members['LAB-002'].finalBalance, 0), detail: b.members['LAB-002'].finalBalance + ' → ' + a.members['LAB-002'].finalBalance },
      { label: 'خزينة الغداء +100 فقط (الفائض بعد الدَّين)', pass: eq(a.treasuries.food, b.treasuries.food + 100), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'خزينة العجز −3000 → −2600 (استلمت شريحة الدَّين 400)', pass: eq(a.treasuries.defRem, b.treasuries.defRem + 400), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'الشريحة المسدِّدة مُستبعَدة من سجلّ التبرّعات', pass: a.registers.cashN === b.registers.cashN, detail: b.registers.cashN + ' → ' + a.registers.cashN }
    ]
  },
  {
    id: 'FOC-006',
    title: 'تبرّع موجَّه للعجز التاريخي (تقليل العجز)',
    member: 'LAB-004',
    narrative: 'سارة محمود (لا دَين) تتبرّع 500 موجّهةً لتقليل العجز. العجز −3000 → −2500، دون فائض للغداء.',
    business: 'التبرّع الموجَّه دخل خزينة العجز مباشرةً وقلّصه بمقدار 500 (من 3000 إلى 2500). لأن العجز أكبر من التبرّع، لا فائض يتحوّل للغداء. رصيد العضو لم يتأثّر (تبرّع لا اشتراك).',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '9 حدّ العجز'],
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 500, kind: 'cash', display: 'food', alloc: 'reduce_deficit' },
    expect: (b, a) => [
      { label: 'السند وجهته «خزينة العجز التاريخي»', pass: a.lastReceipt && a.lastReceipt.destination_treasury === 'historical_deficit', detail: a.lastReceipt && a.lastReceipt.destination_treasury },
      { label: 'العجز المتبقّي −3000 → −2500', pass: eq(a.treasuries.defRem, b.treasuries.defRem + 500), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'خزينة الغداء لم تتغيّر (لا فائض)', pass: eq(a.treasuries.food, b.treasuries.food), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'الديوان لم يتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan }
    ]
  },
  {
    id: 'FOC-007',
    title: 'تحصيل ذمّة تاريخية من عضو (ق4)',
    member: 'LAB-001',
    narrative: 'محمد أحمد (عليه 750، منها ذمّة تاريخية 350) يسدّد 300 من ذمّته التاريخية. تُصنَّف «تحصيل ذمّة» فتدخل خزينة العجز وتُخفّض ذمّته الشخصية معًا.',
    business: 'التحصيل ظهر في كشفَي العضو والعجز معًا: قلّت ذمّة العضو 300 (من 750 إلى 450)، ودخلت خزينة العجز المشتركة 300 (من 3000 إلى 2700). وليس تبرّعًا عامًّا فلم يُدرَج في سجلّ التبرّعات. الغداء والديوان لم يتغيّرا.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة', '9 حدّ العجز'],
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-001', amount: 300, kind: 'cash', display: 'food', alloc: 'reduce_deficit' },
    expect: (b, a) => [
      { label: 'صُنّف «تحصيل ذمّة تاريخية» ووجهته خزينة العجز', pass: a.lastReceipt && a.lastReceipt.movement_type === 'historical_debt_collection' && a.lastReceipt.destination_treasury === 'historical_deficit', detail: JSON.stringify(a.lastReceipt) },
      { label: 'ذمّة العضو 750 → 450 (قلّت 300)', pass: eq(a.members['LAB-001'].finalBalance, 450), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'خزينة العجز −3000 → −2700 (استلمت 300)', pass: eq(a.treasuries.defRem, b.treasuries.defRem + 300), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'مُستبعَد من سجلّ التبرّعات (ليس تبرّعًا عامًّا)', pass: a.registers.cashN === b.registers.cashN, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'الغداء والديوان لم يتغيّرا', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan), detail: '' }
    ]
  },
  {
    id: 'FOC-008',
    title: 'تبرّع نقدي للديوان (غير عضو)',
    member: 'LAB-001',
    narrative: 'متبرّعٌ غير عضو يتبرّع 400 لخزينة الديوان. مالٌ يدخل الديوان فقط.',
    business: 'دخل التبرّع خزينة الديوان (+400 من 5000 إلى 5400) وأُدرِج في سجلّ التبرّعات. لم تتأثّر خزينتا الغداء والعجز ولا أرصدة الأعضاء، لأن وجهته الديوان حصرًا.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة'],
    op: { type: 'receipt', fund: 'diwan', diwanType: 'donation', payerType: 'nonmember', payerName: 'متبرّع الديوان', amount: 400 },
    expect: (b, a) => [
      { label: 'صُنّف «تبرّع نقدي للديوان» ووجهته الديوان', pass: a.lastReceipt && a.lastReceipt.destination_treasury === 'diwan', detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الديوان 5000 → 5400', pass: eq(a.treasuries.diwan, b.treasuries.diwan + 400), detail: b.treasuries.diwan + ' → ' + a.treasuries.diwan },
      { label: 'الغداء والعجز لم يتغيّرا', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-009',
    title: 'تبرّع عيني/خدمي (سجلّ فقط، لا نقد)',
    member: 'LAB-004',
    narrative: 'سارة محمود تتبرّع عينيًّا (تجهيزات) بقيمة 1200. توثيقٌ في سجلّ العينيّات دون أي خزينة.',
    business: 'التبرّع العينيّ سُجِّل في سجلّ العينيّات فقط (+1)، ولم يدخل أي خزينة نقدية ولم يغيّر أي رصيد — لأن العينيّ لا يُخلط بالنقديّ إطلاقًا.',
    laws: ['3 مصدر واحد', '4 التصنيف الصريح'],
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 1200, kind: 'inkind', category: 'equipment' },
    expect: (b, a) => [
      { label: 'صُنّف «تبرّع عيني» بلا وجهة خزينة', pass: a.lastReceipt && a.lastReceipt.movement_type === 'donation_inkind' && !a.lastReceipt.destination_treasury, detail: JSON.stringify(a.lastReceipt) },
      { label: 'سجلّ العينيّات +1', pass: a.registers.inkN === b.registers.inkN + 1, detail: b.registers.inkN + ' → ' + a.registers.inkN },
      { label: 'كل الخزائن لم تتغيّر', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' },
      { label: 'سجلّ التبرّعات النقدية لم يتغيّر', pass: a.registers.cashN === b.registers.cashN, detail: '' }
    ]
  },
  {
    id: 'FOC-010',
    title: 'مصروف غداء',
    member: 'LAB-001',
    narrative: 'صرفٌ من خزينة الغداء بمبلغ 200 لمستفيدٍ غير عضو.',
    business: 'خرج المال من خزينة الغداء (−200، من 0 إلى −200). لم تتأثّر خزينتا الديوان والعجز ولا أرصدة الأعضاء — الصرف من الغداء حصرًا (لا يُصرَف من خزينةٍ لم يدخلها المال).',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة'],
    op: { type: 'payment', fund: 'food', benType: 'nonmember', benName: 'مورّد الغداء', amount: 200, expense: 'other' },
    expect: (b, a) => [
      { label: 'خزينة الغداء −200', pass: eq(a.treasuries.food, b.treasuries.food - 200), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'الديوان والعجز لم يتغيّرا', pass: eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-011',
    title: 'مصروف ديوان',
    member: 'LAB-001',
    narrative: 'صرفٌ من خزينة الديوان بمبلغ 300 لمستفيدٍ غير عضو.',
    business: 'خرج المال من خزينة الديوان (−300، من 5000 إلى 4700). لم تتأثّر خزينتا الغداء والعجز — الصرف من الديوان حصرًا.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '8 العهدة'],
    op: { type: 'payment', fund: 'diwan', benType: 'nonmember', benName: 'مورّد الديوان', amount: 300, expense: 'other' },
    expect: (b, a) => [
      { label: 'خزينة الديوان −300', pass: eq(a.treasuries.diwan, b.treasuries.diwan - 300), detail: b.treasuries.diwan + ' → ' + a.treasuries.diwan },
      { label: 'الغداء والعجز لم يتغيّرا', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-014',
    title: 'توليد الاشتراكات السنوية (BO-10)',
    member: 'LAB-001',
    narrative: 'المدير يولّد اشتراك سنة جديدة 2027 بقيمة 200 لكل الأعضاء. التزامٌ فقط — لا مال يتحرّك.',
    business: 'أُنشئ مستحقّ 2027 (200) لكل عضو، فارتفعت التزاماتهم: رصيد محمد أحمد 750 → 950. لم تتحرّك أي خزينة نقدية (توليد التزامٍ فقط، لا قبض). عدد صفوف الاشتراكات زاد بمقدار عدد الأعضاء.',
    laws: ['4 التصنيف الصريح', '7 الذرّية'],
    op: { type: 'applyDues', year: 2027, amount: 200 },
    expect: (b, a) => [
      { label: 'رصيد العضو 750 → 950 (أُضيف مستحقّ 2027)', pass: eq(a.members['LAB-001'].finalBalance, 950), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'عدد صفوف الاشتراكات زاد', pass: a.subsCount > b.subsCount, detail: b.subsCount + ' → ' + a.subsCount },
      { label: 'لا خزينة تغيّرت (توليد التزامٍ فقط)', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-015',
    title: 'إنشاء عضو (BO-07)',
    member: 'LAB-001',
    narrative: 'المدير يضيف عضوًا جديدًا «مصطفى كامل» برصيدٍ افتتاحيّ 500 وجدول اشتراكاته، في عمليةٍ ذرّية واحدة.',
    business: 'أُنشئ العضو مع جدول اشتراكاته دفعةً واحدة (كلٌّ أو لا شيء): عدد الأعضاء +1 وصفوف الاشتراكات زادت. لم تتحرّك أي خزينة نقدية — الإنشاء التزامٌ لا قبض.',
    laws: ['7 الذرّية', '6 التتبّع'],
    op: { type: 'createMember', name: 'مصطفى كامل', opening: 500, fromYear: 2024 },
    expect: (b, a) => [
      { label: 'عدد الأعضاء +1', pass: a.membersCount === b.membersCount + 1, detail: b.membersCount + ' → ' + a.membersCount },
      { label: 'صفوف الاشتراكات زادت (جدول العضو الجديد)', pass: a.subsCount > b.subsCount, detail: b.subsCount + ' → ' + a.subsCount },
      { label: 'لا خزينة تغيّرت (إنشاء التزامٍ لا قبض)', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-016',
    title: 'تعديل عضو (BO-08)',
    member: 'LAB-003',
    narrative: 'المدير يصحّح اسم العضو خالد علي دون مساس بأرقامه المالية.',
    business: 'تُحدَّث بيانات العضو التعريفية فقط (الاسم). لم يتغيّر رصيده ولا اشتراكاته ولا أي خزينة — التعديل إداريّ لا ماليّ.',
    laws: ['6 التتبّع'],
    op: { type: 'editMember', member: 'LAB-003', newName: 'خالد علي المحترم' },
    expect: (b, a) => [
      { label: 'اسم العضو تغيّر إلى الجديد', pass: a.namesByCode['LAB-003'] === 'خالد علي المحترم' && b.namesByCode['LAB-003'] !== a.namesByCode['LAB-003'], detail: b.namesByCode['LAB-003'] + ' → ' + a.namesByCode['LAB-003'] },
      { label: 'رصيد العضو لم يتغيّر', pass: eq(a.members['LAB-003'].finalBalance, b.members['LAB-003'].finalBalance), detail: b.members['LAB-003'].finalBalance + ' → ' + a.members['LAB-003'].finalBalance },
      { label: 'لا خزينة تغيّرت', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-017',
    title: 'إلغاء/تعطيل عضو (BO-09)',
    member: 'LAB-004',
    narrative: 'المدير يُعطّل العضو سارة محمود. لا يُمحى تاريخها؛ تُصبح غير فعّالة فقط.',
    business: 'العضو أصبح غير فعّال (عدد الأعضاء الفعّالين −1)، لكن سنداته وتاريخه محفوظة (لا محو). لم تتأثّر أي خزينة — التعطيل إداريّ لا ماليّ.',
    laws: ['5 حفظ التاريخ', '6 التتبّع'],
    op: { type: 'cancelMember', member: 'LAB-004' },
    expect: (b, a) => [
      { label: 'عدد الأعضاء الفعّالين −1', pass: a.activeCount === b.activeCount - 1, detail: b.activeCount + ' → ' + a.activeCount },
      { label: 'إجمالي الأعضاء لم ينقص (لا محو للتاريخ)', pass: a.membersCount === b.membersCount, detail: b.membersCount + ' → ' + a.membersCount },
      { label: 'لا خزينة تغيّرت', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-018',
    title: 'تعديل سند (BO-02)',
    member: 'LAB-001',
    narrative: 'يُنشأ إيصال اشتراك 200 لمحمد أحمد، ثم يُعدَّل مبلغه إلى 350 مع حفظ النسخة السابقة.',
    business: 'التعديل حفظ نسخةً كاملةً من الحالة القديمة (لا محو)، وانعكس الفرق على الخزينة والكشف: صار الإيصال 350، فخزينة الغداء تعكس 350 ورصيد العضو نقص 350 (750 → 400). رقم السند لم يتغيّر.',
    laws: ['5 حفظ التاريخ', '6 التتبّع', '7 الذرّية', '11 حرمة الفترة المقفلة'],
    op: { type: 'editReceipt', create: { fund: 'food', payerType: 'member', member: 'LAB-001', amount: 200 }, newAmount: 350, reason: 'تصحيح المبلغ' },
    expect: (b, a) => [
      { label: 'مبلغ السند بعد التعديل = 350', pass: a.lastReceipt && eq(a.lastReceipt.amount_ils, 350), detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الغداء تعكس المبلغ المعدَّل (0 → 350)', pass: eq(a.treasuries.food, b.treasuries.food + 350), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 400 (سُدّد 350)', pass: eq(a.members['LAB-001'].finalBalance, 400), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'الديوان والعجز لم يتغيّرا', pass: eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-019',
    title: 'إلغاء سند (BO-03)',
    member: 'LAB-004',
    narrative: 'يُنشأ تبرّع غداء 500 من سارة محمود، ثم يُلغى. الإلغاء يبطل أثره المالي مع بقائه في التاريخ.',
    business: 'الإلغاء أعاد الوضع كما كان: خزينة الغداء عادت إلى ما قبل التبرّع، وسجلّ التبرّعات النقدية عاد كما كان. السند نفسه لم يُمحَ (محفوظ كنسخةٍ ملغاة) — الإبطال حالةٌ محفوظة لا حذف.',
    laws: ['1 حفظ القيمة', '5 حفظ التاريخ', '6 التتبّع'],
    op: { type: 'cancelReceipt', create: { fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 500, kind: 'cash', display: 'food', alloc: 'support_current' } },
    expect: (b, a) => [
      { label: 'خزينة الغداء عادت كما كانت (أثر السند أُبطِل)', pass: eq(a.treasuries.food, b.treasuries.food), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'سجلّ التبرّعات عاد كما كان', pass: a.registers.cashN === b.registers.cashN, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'الديوان والعجز لم يتغيّرا', pass: eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-020',
    title: 'إعادة تصنيف سند (BO-04)',
    member: 'LAB-001',
    narrative: 'يُقبَض إيصال ديوان تشغيليّ 400 (إيراد تشغيل)، ثم يُعاد تصنيفه إلى «تبرّع نقدي للديوان». المالُ لا يتحرّك من خزينته — يتغيّر التصنيف فقط.',
    business: 'إعادة التصنيف صحّحت هويّة السند دون تحريك المال: بقيت خزينة الديوان كما هي (+400 محفوظة، من 5000 إلى 5400)، لأن كلا النوعين وجهتُهما الديوان (القانون 8 — لا يخرج المال من عهدته). تغيّر نوع الحركة إلى «تبرّع نقدي للديوان»، فدخل السند سجلّ التبرّعات النقدية (+1). لم تتأثّر الغداء ولا العجز.',
    laws: ['4 التصنيف الصريح', '6 التتبّع', '8 العهدة'],
    op: { type: 'reclassifyReceipt', create: { fund: 'diwan', diwanType: 'operational', payerType: 'nonmember', payerName: 'متبرّع الديوان', amount: 400 }, newType: 'diwan_cash_donation', newDest: 'diwan', reason: 'تصحيح التصنيف إلى تبرّع' },
    expect: (b, a) => [
      { label: 'نوع الحركة صار «تبرّع نقدي للديوان»', pass: a.lastReceipt && a.lastReceipt.movement_type === 'diwan_cash_donation' && a.lastReceipt.destination_treasury === 'diwan', detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الديوان محفوظة (5000 → 5400) — لا تحريك مال', pass: eq(a.treasuries.diwan, b.treasuries.diwan + 400), detail: b.treasuries.diwan + ' → ' + a.treasuries.diwan },
      { label: 'سجلّ التبرّعات النقدية +1 (دخله بعد التصنيف)', pass: a.registers.cashN === b.registers.cashN + 1, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'الغداء والعجز لم يتغيّرا', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-021',
    title: 'تقسيم سند بإعادة تصنيف جزئية (BO-05)',
    member: 'LAB-001',
    narrative: 'يُقبَض إيصال ديوان تشغيليّ 597، ثم يُعاد تصنيف 400 منه إلى «تبرّع نقدي للديوان». يبقى 197 بتصنيفه الأصليّ، وينفصل 400 في سندٍ مرتبطٍ جديد.',
    business: 'التقسيم حفظ القيمة كاملةً (القانون 1): 197 بقيت «إيراد تشغيل» في سندها الأصليّ، و400 انتقلت إلى سندٍ جديدٍ مرتبطٍ صُنّف «تبرّع نقدي للديوان». عدد الإيصالات زاد 2 (الأصل + المولود). خزينة الديوان محفوظة كاملةً (597، من 5000 إلى 5597) لأن الجزأين في الديوان. الشريحة المتبرَّع بها فقط (400) دخلت سجلّ التبرّعات (+1). لا مساس بالغداء أو العجز.',
    laws: ['1 حفظ القيمة', '4 التصنيف الصريح', '6 التتبّع', '7 الذرّية', '8 العهدة'],
    op: { type: 'reclassifyReceipt', create: { fund: 'diwan', diwanType: 'operational', payerType: 'nonmember', payerName: 'متبرّع الديوان', amount: 597 }, newType: 'diwan_cash_donation', newDest: 'diwan', partial: 400, reason: 'تقسيم: 400 تبرّع' },
    expect: (b, a) => [
      { label: 'عدد الإيصالات +2 (الأصل المخفَّض + المولود)', pass: a.receiptsCount === b.receiptsCount + 2, detail: b.receiptsCount + ' → ' + a.receiptsCount },
      { label: 'السند المولود = 400 «تبرّع نقدي للديوان»', pass: a.lastReceipt && eq(a.lastReceipt.amount_ils, 400) && a.lastReceipt.movement_type === 'diwan_cash_donation', detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الديوان محفوظة كاملةً (5000 → 5597)', pass: eq(a.treasuries.diwan, b.treasuries.diwan + 597), detail: b.treasuries.diwan + ' → ' + a.treasuries.diwan },
      { label: 'سجلّ التبرّعات +1 (الشريحة المتبرَّع بها فقط)', pass: a.registers.cashN === b.registers.cashN + 1, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'الغداء والعجز لم يتغيّرا', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-022',
    title: 'تحويل فائض العجز إلى الغداء (Overflow)',
    member: 'LAB-004',
    narrative: 'يُقبَض تحصيلُ ذمّةٍ موجَّهٌ للعجز بمبلغ 9000 (المتبقّي 3000). يُسدَّد العجز المشترك بالكامل (يصير 0)، ويتحوّل الفائض 6000 تلقائيًّا إلى خزينة الغداء.',
    business: 'المبلغ الموجَّه للعجز أكبر من العجز المتبقّي: أغلق خزينة العجز المشتركة كاملًا (−3000 → 0)، والفائض 6000 تحوّل تلقائيًّا إلى الغداء بقاعدة قراءةٍ لا صفوف تُكتب (القانون 2 — الاشتقاق، القانون 9 — حدّ العجز). فصارت خزينة الغداء 0 → 6000، وبقي الديوان دون تغيّر.',
    laws: ['1 حفظ القيمة', '2 الاشتقاق', '9 حدّ العجز'],
    observation: 'لتشغيل قاعدة الفائض لزم توجيهُ مبلغٍ للعجز أكبر من العجز المتبقّي (9000 > 3000). لا يملك أيُّ عضوٍ ذمّةً تاريخيةً تفوق 3000، فاختير عضوٌ مسدَّد (LAB-004، ذمّته التاريخية = 0) موجَّهًا للعجز؛ فصُنّف المبلغ «تحصيل ذمّة تاريخية» (ق4). قاعدة تحويل الفائض — موضوع هذا الفصل — عملت عملًا صحيحًا وموثَّقًا. لكنّ أثرًا جانبيًّا ظهر: تحصيلُ الذمّة (ق4) لا يُحَدُّ برصيد العضو التاريخيّ الفعليّ، فانخفض رصيد LAB-004 إلى −9000 (رصيدٌ دائنٌ كبير لا يقابله دَينٌ حقيقيّ). هذا سيناريو مُختبَريّ مُصطنَعٌ لإظهار الفائض، لا عمليةٌ طبيعية. **قرار مطلوب من المالك:** هل يُحَدُّ تحصيلُ الذمّة التاريخية عند رصيد العضو الفعليّ (منعُ رصيدٍ دائنٍ زائف)؟ لا يُصلَح شيء في الإنتاج قبل قرارك — رُصِدَ فقط دون تعديل.',
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 9000, kind: 'cash', display: 'food', alloc: 'reduce_deficit' },
    expect: (b, a) => [
      { label: 'العجز المتبقّي −3000 → 0 (سُدّد بالكامل)', pass: eq(b.treasuries.defRem, -3000) && eq(a.treasuries.defRem, 0), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'الفائض المتحوّل للغداء = 6000', pass: eq(a.treasuries.over, 6000), detail: 'overflow=' + a.treasuries.over },
      { label: 'خزينة الغداء 0 → 6000 (استلمت الفائض)', pass: eq(a.treasuries.food, b.treasuries.food + 6000), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'الديوان لم يتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan }
    ]
  },
  {
    id: 'FOC-023',
    title: 'توزيع الدفعة على الأقدم أوّلًا (محرّك التوزيع)',
    member: 'LAB-001',
    narrative: 'محمد أحمد (عليه 750: اشتراك 2025=200، 2026=200، ذمّة تاريخية 350) يدفع 500. يُوزَّع المال على الأقدم أوّلًا: 2025 كاملًا، ثم 2026 كاملًا، ثم 100 من الذمّة التاريخية.',
    business: 'محرّك التوزيع طبّق «الأقدم أوّلًا» على مجموعِ التزامات العضو: سدّد 2025 (200) ثم 2026 (200) ثم 100 من الذمّة التاريخية — إجمالي 500. فنزل رصيده 750 → 250، ودخل المالُ خزينة الغداء (+500). التوزيع مشتقٌّ لا مُخزَّن (القانون 2)، وصُنّف «دفعة اشتراك». لم تتأثّر الخزينتان الأخريان.',
    laws: ['1 حفظ القيمة', '2 الاشتقاق', '3 مصدر واحد', '4 التصنيف الصريح'],
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 500 },
    expect: (b, a) => [
      { label: 'رصيد العضو 750 → 250 (وُزِّع 500 على الأقدم أوّلًا)', pass: eq(b.members['LAB-001'].finalBalance, 750) && eq(a.members['LAB-001'].finalBalance, 250), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'خزينة الغداء +500', pass: eq(a.treasuries.food, b.treasuries.food + 500), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'السند صُنّف «دفعة اشتراك» / غداء', pass: a.lastReceipt && a.lastReceipt.movement_type === 'subscription_payment' && a.lastReceipt.destination_treasury === 'food', detail: JSON.stringify(a.lastReceipt) },
      { label: 'الديوان والعجز لم يتغيّرا', pass: eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-024',
    title: 'أثر الترحيل (Phase 15)',
    member: 'LAB-001',
    narrative: 'الترحيل يُغلق السنة السابقة ويحمل أرصدتها الختامية أرصدةً افتتاحيةً لهذه السنة (العجز −3000، الديوان 5000). ثم تُجرَّب محاولةُ قبض سندٍ بتاريخٍ داخل السنة المرحّلة المقفلة (2024) — فتُرفَض.',
    business: 'الترحيل هو جسر السنوات: ما أُقفِل في الماضي يُحمَل رصيدًا افتتاحيًّا لا يُعاد فتحه. الأرصدة المرحّلة حاضرةٌ في الأساس (العجز الافتتاحي −3000، الديوان 5000، الغداء 0)، والسنة المرحّلة (حتى 2024) مقفلةٌ حرمةً: محاولةُ قبض سندٍ بتاريخ 2024 رُفِضت، فلم يزد عدد الإيصالات ولم تتحرّك أي خزينة. هكذا يُصان تاريخُ الأرصدة (القانون 5) وحرمةُ الفترة المقفلة (القانون 11).',
    laws: ['1 حفظ القيمة', '5 حفظ التاريخ', '11 حرمة الفترة المقفلة'],
    op: { type: 'lockedWrite', fund: 'food', member: 'LAB-001', amount: 200, date: '2024-06-01' },
    expect: (b, a) => [
      { label: 'الأرصدة الافتتاحية المرحّلة حاضرة (العجز −3000، الديوان 5000)', pass: eq(b.openings.historical_deficit, -3000) && eq(b.openings.diwan, 5000) && eq(b.treasuries.defRem, -3000) && eq(b.treasuries.diwan, 5000), detail: 'opening def=' + b.openings.historical_deficit + ' diwan=' + b.openings.diwan },
      { label: 'السنة المرحّلة مقفلة حتى 2024 (حدّ الترحيل)', pass: b.lockedThroughYear === 2024, detail: 'lockedThroughYear=' + b.lockedThroughYear },
      { label: 'قبضُ سندٍ بتاريخ داخل السنة المقفلة رُفِض (لا زيادة إيصالات)', pass: a.receiptsCount === b.receiptsCount, detail: b.receiptsCount + ' → ' + a.receiptsCount },
      { label: 'لا خزينة تغيّرت (الماضي المرحّل محصّن)', pass: eq(a.treasuries.food, b.treasuries.food) && eq(a.treasuries.diwan, b.treasuries.diwan) && eq(a.treasuries.defRem, b.treasuries.defRem), detail: '' }
    ]
  },
  {
    id: 'FOC-025',
    title: 'دور MODEL2',
    member: 'LAB-002',
    narrative: 'يُقبَض سندُ اشتراكٍ 300 من أحمد يوسف (عليه 400). يُوثَّق دورُ MODEL2: محمَّلٌ ومُعرَّفٌ خاملًا (DEFINED_INERT_P2A)، أحداثُه تحكم تصنيف كل سند، وترتيبُ التوزيع فيه مُعلَنٌ لا مُطبَّق — فالتوزيع الفعليّ «الأقدم أوّلًا».',
    business: 'MODEL2 هو المرجع الدستوريّ للتصنيف: كل حركةٍ ماليّةٍ نوعُها حدثٌ معرَّفٌ فيه (هنا «دفعة اشتراك»). لكنّه معرَّفٌ خاملًا (DEFINED_INERT_P2A): ترتيبُ التوزيع المُعلَن فيه (2025 ← 2026 ← تاريخيّ ← مستقبليّ) موجودٌ نصًّا لكنّه غير مُنفَّذ في التشغيل؛ التوزيع الفعليّ يجري «الأقدم أوّلًا» تجميعيًّا (رصيد العضو 400 → 100). فدور MODEL2 اليوم: يحكم التصنيف وهويّات الخزائن، ولا يُشغّل التوزيع — لم يُفعَّل. لا يُغيَّر شيءٌ فيه (أثرٌ مجمَّد).',
    laws: ['2 الاشتقاق', '3 مصدر واحد', '4 التصنيف الصريح'],
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-002', amount: 300 },
    expect: (b, a) => [
      { label: 'MODEL2 محمَّلٌ ومُعرَّفٌ خاملًا (DEFINED_INERT_P2A) — لم يُفعَّل', pass: a.model2.loaded === true && a.model2.status === 'DEFINED_INERT_P2A', detail: 'status=' + (a.model2 && a.model2.status) },
      { label: 'أحداث MODEL2 تحكم التصنيف: نوع السند حدثٌ معرَّف فيه', pass: a.lastReceipt && a.model2.events.indexOf(a.lastReceipt.movement_type) !== -1 && a.lastReceipt.movement_type === 'subscription_payment', detail: a.lastReceipt && a.lastReceipt.movement_type },
      { label: 'ترتيب التوزيع مُعلَنٌ (4 خطوات) لا مُطبَّق', pass: a.model2.allocationOrder.length === 4 && a.model2.allocationOrder[0] === 'subscription_2025', detail: a.model2.allocationOrder.join(' ← ') },
      { label: 'التوزيع الفعليّ «الأقدم أوّلًا»: رصيد العضو 400 → 100', pass: eq(b.members['LAB-002'].finalBalance, 400) && eq(a.members['LAB-002'].finalBalance, 100), detail: b.members['LAB-002'].finalBalance + ' → ' + a.members['LAB-002'].finalBalance },
      { label: 'خزينة الغداء +300 (السند اشتراكٌ حقيقيّ)', pass: eq(a.treasuries.food, b.treasuries.food + 300), detail: b.treasuries.food + ' → ' + a.treasuries.food }
    ]
  }
];
