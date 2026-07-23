/* ═══ MODEL v2 — NEW FINANCIAL MODEL DEFINITIONS (P2-A, INERT) ═══════════════
   This module is the single declarative definition of the ratified new financial
   model (FMD-01 / Execution Order V2.0 / FEM-01 / FAS-01). It is INTENTIONALLY
   INERT in P2-A: it only exposes a frozen `window.MODEL2` constants object. It
   does NOT read or write the database, does NOT touch FIN, does NOT change any
   balance, voucher, report, statement, or allocation. Wiring FIN to understand
   these definitions happens in P2-B; data migration happens in P2-C; system-wide
   wiring in P2-D. Removing this file (and its <script> tag) fully reverts P2-A.

   Naming note: the KEYS of TREASURIES / REGISTERS / EVENTS / CLASSIFICATION are
   the stable machine identifiers. `contains`, `note`, and *_ar/*_en labels are
   human-readable DOCUMENTATION only (they are NOT EVENTS keys and must not be
   used for event→treasury mapping). Nothing here is authoritative yet. ──────── */
(function(){
  'use strict';

  /* ── 1) TREASURIES — real cash only. Exactly three. ───────────────────────── */
  const TREASURIES = {
    food: {
      key:'food', kind:'cash',
      label_ar:'خزينة الغداء', label_en:'Food Treasury',
      contains:['subscription_payment','food_donation','future_credit','overflow_from_deficit','food_expense'],
      note:'الاشتراكات + تبرعات الغداء + الرصيد المستقبلي + فائض العجز بعد صفره − مصروفات الغداء'
    },
    diwan: {
      key:'diwan', kind:'cash',
      label_ar:'خزينة الديوان', label_en:'Diwan Treasury',
      contains:['diwan_donation','diwan_expense'],
      note:'تبرعات الديوان − مصروفات الديوان'
    },
    historical_deficit: {
      key:'historical_deficit', kind:'cash',
      label_ar:'خزينة العجز التاريخي', label_en:'Historical Deficit Treasury',
      contains:['historical_debt_collection','deficit_directed_donation'],   /* funding-only (CA-004 R1) */
      purpose:'تقليص العجز التاريخي فقط',
      informational:true,   /* CA-004 R1 — accumulates Historical Deficit FUNDING; no internal outflow */
      overflow_to:'food',   /* when remaining deficit reaches zero, extra money moves to Food */
      note:'تمويل العجز التاريخي: تحصيل الذمم + التبرعات الموجَّهة للعجز؛ الفائض ↦ الغداء (لا تُسجَّل تسويات — تتم خارج النظام)'
    }
  };

  /* ── 2) REGISTERS — references only. NEVER hold cash, NEVER have a balance. ── */
  const REGISTERS = {
    cash_donation: {
      key:'cash_donation', kind:'register', holds_cash:false, has_balance:false,
      label_ar:'سجل التبرعات النقدية', label_en:'Cash Donation Register',
      fields:['reference_no','date','donor','amount','donation_type','destination_treasury','linked_receipt','status'],
      note:'كل تبرع نقدي يُنشئ (١) حركة في خزينة الوجهة و(٢) قيد مرجعي هنا؛ لا يملك نقداً'
    },
    inkind: {
      key:'inkind', kind:'register', holds_cash:false, has_balance:false,
      label_ar:'سجل التبرعات العينية والخدمية', label_en:'In-Kind & Services Register',
      categories:['furniture','equipment','food','construction','maintenance','professional_services','animals','assets','other'],
      fields:['reference_no','date','donor','category','estimated_value','description','status'],
      note:'مساهمات غير نقدية؛ قيمة تقديرية فقط، لا رصيد نقدي'
    }
  };

  /* ── 3) FINANCIAL EVENTS — every money movement is one typed event. ───────── */
  const EVENTS = {
    subscription_payment:        {key:'subscription_payment',        label_ar:'دفعة اشتراك',            treasury:'food',               cash:true},
    historical_debt_collection:  {key:'historical_debt_collection',  label_ar:'تحصيل ذمة تاريخية',       treasury:'historical_deficit', cash:true},
    /* CA-004 R1 — the internal `historical_deficit_settlement` outflow was RETIRED.
       The software only records historical-deficit FUNDING; external settlements are
       intentionally outside the accounting model. Payments to historical creditors
       are performed outside the software and record no settlement transaction,
       treasury outflow, voucher, or movement — they are intentionally not reflected
       in this balance. */
    donation_cash:               {key:'donation_cash',               label_ar:'تبرع نقدي',              treasury:'ADMIN_SELECTED',     cash:true, register:'cash_donation'},
    /* FA-01 (Financial Events Catalog) — per-destination primary donation/income events.
       All Reserved (forward-only; no existing voucher carries them; zero numeric impact).
       Register union is by the `register` property, never by a literal movement_type. */
    diwan_operational_income:    {key:'diwan_operational_income',    label_ar:'إيراد الديوان التشغيلي',  treasury:'diwan',              cash:true, revenue_class:'exchange', event_id:'FE-004'},
    diwan_cash_donation:         {key:'diwan_cash_donation',         label_ar:'تبرع نقدي للديوان',       treasury:'diwan',              cash:true, register:'cash_donation', revenue_class:'contribution', event_id:'FE-005'},
    food_cash_donation:          {key:'food_cash_donation',          label_ar:'تبرع نقدي للغداء',        treasury:'food',               cash:true, register:'cash_donation', revenue_class:'contribution', event_id:'FE-002'},
    deficit_cash_donation:       {key:'deficit_cash_donation',       label_ar:'تبرع نقدي موجَّه للعجز',   treasury:'historical_deficit', cash:true, register:'cash_donation', revenue_class:'contribution', event_id:'FE-007'},
    donation_inkind:             {key:'donation_inkind',             label_ar:'تبرع عيني/خدمي',         treasury:null,                 cash:false, register:'inkind'},
    food_expense:                {key:'food_expense',                label_ar:'مصروف غداء',             treasury:'food',               cash:true, outflow:true},
    diwan_expense:               {key:'diwan_expense',               label_ar:'مصروف ديوان',            treasury:'diwan',              cash:true, outflow:true},
    overflow_transfer:           {key:'overflow_transfer',           label_ar:'تحويل فائض العجز للغداء', treasury:'food',               cash:true, automatic:true, source_treasury:'historical_deficit', trigger:'remaining_deficit<=0'},
    /* V6 · Law 4 (Explicit Classification) — the ق5 transfer promoted to a FIRST-CLASS
       accounting event. The debt-settled slice of a member's food-display cash donation
       is an internal cash transfer: it leaves the Food treasury and lands in the
       Historical-Deficit treasury (it settles the member's OWN historical debt). Its
       amount is DERIVED from the single-source Item-9 allocation, but its accounting
       IDENTITY (a Food → Historical-Deficit transfer) is now declared explicitly here,
       not inferred at read time. Automatic like overflow_transfer (no stored row);
       purely semantic — zero numeric impact (proven by the golden baseline). */
    q5_debt_settlement_transfer: {key:'q5_debt_settlement_transfer', label_ar:'تسوية ذمة تاريخية من تبرع غذائي (تحويل داخلي)', treasury:'historical_deficit', cash:true, automatic:true, source_treasury:'food', derived_from:'item9_debt_settlement', trigger:'member_food_donation_settles_own_debt'},
    /* Refund reverses the ORIGINAL receipt; its treasury is derived from the linked
       origin (FEM-01 E-14), never freely chosen — the admin cannot refund from a
       treasury the money never entered. */
    refund:                      {key:'refund',                      label_ar:'استرداد',               treasury:'FROM_LINKED_ORIGIN', cash:true, outflow:true, reverses:'linked_receipt'},
    reclassification:            {key:'reclassification',            label_ar:'إعادة تصنيف',            treasury:null,                 cash:false, corrects_classification_only:true}
  };

  /* ── 4) CLASSIFICATION LAYER — every movement must carry these three. ─────── */
  const CLASSIFICATION = {
    required:['movement_type','destination','reason'],
    movement_type:  Object.keys(EVENTS),
    destination:    [...Object.keys(TREASURIES), ...Object.keys(REGISTERS).map(k=>'register:'+k)],
    never_guess:true,  /* the system never infers destination; the admin selects it */
    note:'نوع الحركة + الوجهة + السبب؛ لا يُسمح للنظام بتخمين أي منها'
  };

  /* ── 5) MEMBER PAYMENT ALLOCATION ORDER — strict, never bypassed. ─────────── */
  const ALLOCATION_ORDER = [
    {step:1, key:'subscription_2025', label_ar:'اشتراك 2025'},
    {step:2, key:'subscription_2026', label_ar:'اشتراك 2026'},
    {step:3, key:'historical_debt',   label_ar:'العجز/الذمة التاريخية'},
    {step:4, key:'future_credit',     label_ar:'رصيد مستقبلي'}
  ];

  /* ── 6) DONATION DESTINATIONS — admin-selected; no "general donation". ─────── */
  const DONATION_DESTINATIONS = ['food','diwan','historical_deficit'];

  /* ── 7) RECEIPT TRANSPARENCY — every receipt must display the full split. ─── */
  const RECEIPT_TRANSPARENCY = {
    must_show:['total_received','allocation_breakdown','each_destination','each_amount','remaining','resulting_member_balance'],
    note:'لا يُخفى شيء في الإيصال'
  };

  /* Deep-freeze so nested definitions (e.g. treasury.contains) are immutable too. */
  const deepFreeze=o=>{ if(o&&typeof o==='object'&&!Object.isFrozen(o)){ Object.freeze(o); Object.keys(o).forEach(k=>deepFreeze(o[k])); } return o; };
  window.MODEL2 = deepFreeze({
    version:2, status:'DEFINED_INERT_P2A',
    TREASURIES, REGISTERS, EVENTS, CLASSIFICATION,
    ALLOCATION_ORDER, DONATION_DESTINATIONS, RECEIPT_TRANSPARENCY
  });
})();
