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
  }
];
