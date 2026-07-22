/* ═══════════════════════════════════════════════════════════════════════════
   Constitutional Laboratory — PERMANENT TEST CASES
   Each case links a FOC chapter to an executable scenario over the fixed seed.
   A case declares: which member, which operation, and the EXPECTED effect
   (expressed as assertions over the before/after snapshot). The runner executes
   the operation against the real app (isolated in-memory store) and checks each
   assertion, producing expected-vs-actual evidence + screenshots.

   Snapshot shape (produced by the runner, per phase):
     { treasuries:{food,diwan,defRem,over},
       members:{ 'LAB-001':{finalBalance,totalDues,totalPaid,openingBalance,creditBalance}, ... },
       registers:{cashN,cashS,inkN}, auditN, lastReceipt:{no,movement_type,destination_treasury,amount_ils} }
   R2 rounds to 2 decimals. Every assertion returns {label, pass, detail}.
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
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 400 },
    expect: (b, a) => [
      { label: 'السند صُنّف «دفعة اشتراك» ووجهته «خزينة الغداء»', pass: a.lastReceipt && a.lastReceipt.movement_type === 'subscription_payment' && a.lastReceipt.destination_treasury === 'food', detail: JSON.stringify(a.lastReceipt) },
      { label: 'خزينة الغداء +400', pass: eq(a.treasuries.food, b.treasuries.food + 400), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 350 (سُدّد الاشتراكان، بقيت الذمّة)', pass: eq(b.members['LAB-001'].finalBalance, 750) && eq(a.members['LAB-001'].finalBalance, 350), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'خزينة الديوان لم تتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan },
      { label: 'خزينة العجز التاريخي لم تتغيّر', pass: eq(a.treasuries.defRem, b.treasuries.defRem), detail: a.treasuries.defRem }
    ]
  },
  {
    id: 'FOC-003',
    title: 'دفعة زائدة (700) مع وجود ذمّة تاريخية',
    member: 'LAB-001',
    narrative: 'نفس العضو (750 عليه). يدفع 700: 400 اشتراكات + 300 من الذمّة التاريخية (تبقى 50)، ولا رصيد مستقبلي.',
    op: { type: 'receipt', fund: 'food', payerType: 'member', member: 'LAB-001', amount: 700 },
    expect: (b, a) => [
      { label: 'خزينة الغداء +700', pass: eq(a.treasuries.food, b.treasuries.food + 700), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'رصيد العضو 750 → 50 (لا يزال عليه 50 من الذمّة)', pass: eq(a.members['LAB-001'].finalBalance, 50), detail: b.members['LAB-001'].finalBalance + ' → ' + a.members['LAB-001'].finalBalance },
      { label: 'لا رصيد مستقبلي بعد (الرصيد لا يزال موجبًا)', pass: a.members['LAB-001'].finalBalance > 0 && eq(a.members['LAB-001'].creditBalance, 0), detail: 'credit=' + a.members['LAB-001'].creditBalance },
      { label: 'خزينة العجز المشتركة لم تتغيّر (دفعة العضو لا تموّلها في الواقع الحالي)', pass: eq(a.treasuries.defRem, b.treasuries.defRem), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'الديوان لم يتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan }
    ]
  },
  {
    id: 'FOC-004',
    title: 'تبرّع نقدي للغداء (دعم حالي) من عضو مسدَّد بالكامل',
    member: 'LAB-004',
    narrative: 'سارة محمود (اشتراكاتها مدفوعة كلّها، لا دَين عليها) تتبرّع 500 للغداء، دعم حالي. تبرّعٌ صافٍ كامل — لا شريحة سداد دَين — فيدخل الغداء كلّه ويُدرَج في سجلّ التبرّعات.',
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-004', amount: 500, kind: 'cash', display: 'food', alloc: 'support_current' },
    expect: (b, a) => [
      { label: 'خزينة الغداء +500 (لا دَين يُسدَّد أولًا)', pass: eq(a.treasuries.food, b.treasuries.food + 500), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'سجلّ التبرّعات النقدية +1 (تبرّعٌ حقيقي غير مُستبعَد)', pass: a.registers.cashN === b.registers.cashN + 1, detail: b.registers.cashN + ' → ' + a.registers.cashN },
      { label: 'رصيد العضو لم يتغيّر (تبرّع لا اشتراك)', pass: eq(a.members['LAB-004'].finalBalance, b.members['LAB-004'].finalBalance), detail: a.members['LAB-004'].finalBalance },
      { label: 'خزينة العجز والديوان لم تتغيّرا', pass: eq(a.treasuries.defRem, b.treasuries.defRem) && eq(a.treasuries.diwan, b.treasuries.diwan), detail: '' }
    ]
  },
  {
    id: 'FOC-005',
    title: 'تبرّع غذائي من عضو مَدين — أولوية سداد الدَّين (ق5)',
    member: 'LAB-002',
    narrative: 'أحمد يوسف عليه اشتراكان غير مدفوعين (دَينه 400). يتبرّع 500 للغداء: يُسدَّد دَينه 400 أولًا (تحويل داخلي غداء←عجز)، ويبقى 100 تبرّعًا للغداء. الشريحة المسدِّدة للدَّين مُستبعَدة من سجلّ التبرّعات.',
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-002', amount: 500, kind: 'cash', display: 'food', alloc: 'support_current' },
    expect: (b, a) => [
      { label: 'دَين العضو 400 → 0 (سُدِّد من التبرّع أولًا)', pass: eq(b.members['LAB-002'].finalBalance, 400) && eq(a.members['LAB-002'].finalBalance, 0), detail: b.members['LAB-002'].finalBalance + ' → ' + a.members['LAB-002'].finalBalance },
      { label: 'خزينة الغداء +100 فقط (الفائض بعد الدَّين)', pass: eq(a.treasuries.food, b.treasuries.food + 100), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'خزينة العجز −3000 → −2600 (استلمت شريحة الدَّين 400)', pass: eq(a.treasuries.defRem, b.treasuries.defRem + 400), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'الشريحة المسدِّدة للدَّين مُستبعَدة من سجلّ التبرّعات (cashN بلا زيادة)', pass: a.registers.cashN === b.registers.cashN, detail: b.registers.cashN + ' → ' + a.registers.cashN }
    ]
  },
  {
    id: 'FOC-006',
    title: 'تبرّع موجَّه للعجز التاريخي (تقليل العجز)',
    member: 'LAB-002',
    narrative: 'أحمد يوسف يتبرّع 500 موجّهةً لتقليل العجز. العجز 3000 → 2500، دون فائض للغداء.',
    op: { type: 'receipt', fund: 'donation', payerType: 'member', member: 'LAB-002', amount: 500, kind: 'cash', display: 'food', alloc: 'reduce_deficit' },
    expect: (b, a) => [
      { label: 'السند وجهته «خزينة العجز التاريخي»', pass: a.lastReceipt && a.lastReceipt.destination_treasury === 'historical_deficit', detail: a.lastReceipt && a.lastReceipt.destination_treasury },
      { label: 'العجز المتبقّي −3000 → −2500 (قلّ بمقدار 500)', pass: eq(a.treasuries.defRem, b.treasuries.defRem + 500), detail: b.treasuries.defRem + ' → ' + a.treasuries.defRem },
      { label: 'خزينة الغداء لم تتغيّر (لا فائض، العجز أكبر من التبرّع)', pass: eq(a.treasuries.food, b.treasuries.food), detail: b.treasuries.food + ' → ' + a.treasuries.food },
      { label: 'الديوان لم يتغيّر', pass: eq(a.treasuries.diwan, b.treasuries.diwan), detail: a.treasuries.diwan }
    ]
  }
];
