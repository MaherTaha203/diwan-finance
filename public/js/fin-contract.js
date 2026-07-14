/* ═══ Foundation-B — FinContract · the single financial access facade ═══
   MISSION: give the treasury balances ONE canonical source and remove the
   duplicate computation. Every surface reads through FinContract; no NEW
   consumer reads FIN/FIN2 directly (CONTRACT FIRST).

   - Treasury balances (food / diwan / historical-deficit remaining): canonical
     source is FIN2 (model-driven, reads the frozen MODEL2). This is the path
     that removes the FIN duplicate. Proven byte-identical to FIN in Domain 4
     (reconciliation) and re-checked in every migration step.
   - Registers (cash / in-kind) + the isCashDonation property: FIN2 (sole owner).
   - Member statements / allocation (ق2/ق5/Item-9) / ledgers / delinquency:
     FIN (sole owner — no FIN2 equivalent; PRESERVATION principle).

   Loaded via <script defer> AFTER fin.js + fin2.js. No load-time side effects.
   Reverting Foundation-B = re-point consumers to FIN.* and delete this file. */
(function(){
  'use strict';
  const F  = ()=> (typeof window!=='undefined' && window.FIN)  || null;
  const F2 = ()=> (typeof window!=='undefined' && window.FIN2) || null;
  const R2 = n => Math.round((Number(n)||0)*100)/100;

  const FinContract = {
    version: 'FB',
    /* ── canonical treasuries (FIN2) — the single source that ends the duplication ── */
    foodBalance(){          return F2().composed().food; },
    diwanBalance(){         return F2().composed().diwan; },
    foodDeficitRemaining(){ return F2().composed().historical_deficit_remaining; },
    foodNetPosition(){ const c=F2().composed(); return R2(c.food + c.historical_deficit_remaining); },

    /* ── registers (FIN2, sole owner) ── */
    cashDonationRegister(){ return F2().cashDonationRegister(); },
    inkindRegister(){       return F2().inkindRegister(); },
    isCashDonation(mt){     return F2().isCashDonation(mt); },

    /* ── member / allocation / ledger (FIN, sole owner — preserved unchanged) ── */
    memberStatement(...a){      return F().memberStatement(...a); },
    memberBalance(...a){        return F().memberBalance(...a); },
    memberDelinquency(...a){    return F().memberDelinquency(...a); },
    allocateFoodDonations(...a){return F().allocateFoodDonations(...a); },
    fundLedger(...a){           return F().fundLedger(...a); },
    subscriptionYears(...a){    return F().subscriptionYears(...a); },
    balanceLabel(...a){         return F().balanceLabel(...a); },
    foodSettlementReserve(...a){    return F().foodSettlementReserve(...a); },
    foodDebtSettlementTotal(...a){  return F().foodDebtSettlementTotal(...a); },
    foodCurrentSupportTotal(...a){  return F().foodCurrentSupportTotal(...a); }
  };
  if(typeof window!=='undefined') window.FinContract = FinContract;
})();
