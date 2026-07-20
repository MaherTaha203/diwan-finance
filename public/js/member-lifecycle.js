/* ═══ MEMBER FINANCIAL LIFECYCLE — P2 · Slice 1 (read-only module) ═══════════
   The first Business Module surface (P2-000). It ORCHESTRATES the certified
   Business Operations and the certified read model into the member's financial
   lifecycle; it performs NO accounting logic of its own.

   Slice 1 scope (owner-narrowed): Onboarding (BO-07) + Annual Billing (BO-10) +
   the member's INITIAL-STATE view. Onboarding and billing are already provided by
   the certified operations (window.BusinessOps.createMember / applyAnnualDues);
   this module adds only the read-only initial-state projection and its view.

   `initialState` is a pure projection over the certified read model:
     opening position (the member's carried opening) + the generated dues schedule
     (member_subscriptions) → the member's STARTING balance (opening + dues, before
     any payment). It introduces no second source of truth and no new calculation:
     opening and dues are read verbatim from the certified inputs; startingBalance
     is their sum, i.e. the member's balance at the initial (pre-payment) state.

   NOT in this slice: payment recording, corrections, allocation (deferred).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const R2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const money = n => (typeof fmt === 'function' ? fmt(n) : String(n));

  /* the member's lifecycle starting point, derived from the certified read model */
  function initialState(memberId) {
    const members = (typeof DB !== 'undefined' && DB.members) || [];
    const subs = (typeof DB !== 'undefined' && DB.subscriptions) || [];
    const m = members.find(x => x.id === memberId);
    if (!m) return null;
    // opening = the member's carried net position (same inputs the engine reads)
    const opening = R2(Number(m.historical_balance_ils || 0) - Number(m.historical_payments_ils || 0));
    const schedule = subs
      .filter(s => s.member_id === memberId)
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map(s => ({ year: Number(s.year), due: R2(Number(s.due_amount_ils || 0)) }));
    const totalDues = R2(schedule.reduce((t, r) => t + r.due, 0));
    const startingBalance = R2(opening + totalDues);      // opening + billed dues, before any payment
    const stage = schedule.length ? 'billed' : (m ? 'onboarded' : 'none');
    return { memberId, opening, schedule, totalDues, startingBalance, stage };
  }

  /* read-only initial-state card (presentation only; theme-aware via app CSS vars) */
  function initialStateCard(memberId, en) {
    const s = initialState(memberId);
    if (!s) return '';
    const T = (ar, e) => (en ? e : ar);
    const pol = v => v > 0 ? T('مدين', 'Dr') : v < 0 ? T('دائن', 'Cr') : '';
    const chips = s.schedule.length
      ? s.schedule.map(r => '<span style="display:inline-block;padding:3px 9px;margin:2px;border:1px solid var(--bd);border-radius:999px;font-size:12px;background:var(--bg2)">'
          + r.year + ': ₪ ' + money(r.due) + '</span>').join('')
      : '<span style="color:var(--tx3);font-size:12px">' + T('لا توجد استحقاقات بعد', 'no dues billed yet') + '</span>';
    return '<div class="mlc-initial" style="margin:12px 0;border:1px solid var(--bd);border-radius:12px;overflow:hidden">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--bd)">'
      +   '<strong style="font-size:13px">' + T('الحالة الأولية للعضو', 'Member Initial State') + '</strong>'
      +   '<span style="font-size:11px;color:var(--tx3)">' + T('مشتقّة من المحرك المعتمد', 'derived from the certified engine') + '</span>'
      + '</div>'
      + '<div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;font-size:13px">'
      +   '<div><span style="color:var(--tx3)">' + T('الرصيد الافتتاحي', 'Opening') + '</span> · <strong>₪ ' + money(Math.abs(s.opening)) + (pol(s.opening) ? ' ' + pol(s.opening) : '') + '</strong></div>'
      +   '<div style="flex:1;min-width:180px"><span style="color:var(--tx3)">' + T('جدول الاستحقاقات', 'Dues schedule') + '</span><div style="margin-top:4px">' + chips + '</div></div>'
      +   '<div><span style="color:var(--tx3)">' + T('الرصيد الابتدائي', 'Starting balance') + '</span> · <strong>₪ ' + money(Math.abs(s.startingBalance)) + (pol(s.startingBalance) ? ' ' + pol(s.startingBalance) : '') + '</strong></div>'
      + '</div>'
      + '</div>';
  }

  const MemberLifecycle = { version: 1, initialState, initialStateCard };
  if (typeof window !== 'undefined') window.MemberLifecycle = MemberLifecycle;
  if (typeof module !== 'undefined' && module.exports) module.exports = MemberLifecycle;
})();
