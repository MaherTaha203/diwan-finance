'use strict';
/**
 * donation-allocation/donationAllocation.js  — Phase 15 (reference component)
 *
 * Renders the mandatory "Donation Allocation" field ONLY when:
 *   receiptType === 'donation'  AND  targetStatement === 'food'
 * Otherwise the field is removed from the DOM (external-donor flow unchanged).
 *
 * Framework-agnostic Vanilla JS, matches the project's window.t() convention.
 * INTEGRATION: mount() into the receipt form; call update() whenever the receipt
 * type or target statement changes; read getValue()/validate() on submit.
 *
 * API contract on submit: include `food_donation_allocation` in the receipt POST/PUT
 * body. The DB CHECK + foodFundDonationService.validateReceipt enforce server-side.
 */
(function (global) {
  const t = (k) => (global.t ? global.t(k) : k); // project i18n
  const VALUES = ['support_current', 'reduce_deficit'];

  function DonationAllocation(mountEl) {
    let current = null;       // selected value
    let visible = false;

    function render() {
      mountEl.innerHTML = '';
      if (!visible) return;
      const wrap = document.createElement('div');
      wrap.className = 'field field--required donation-allocation';
      wrap.innerHTML =
        `<label class="field__label">${t('donationAllocation.label')} <span class="req">*</span></label>` +
        `<p class="field__hint">${t('donationAllocation.required')}</p>`;
      VALUES.forEach((v) => {
        const id = `da_${v}`;
        const row = document.createElement('label');
        row.className = 'radio';
        row.setAttribute('for', id);
        row.innerHTML =
          `<input type="radio" name="food_donation_allocation" id="${id}" value="${v}" ${current === v ? 'checked' : ''}>` +
          `<span>${t('donationAllocation.options.' + v)}</span>`;
        row.querySelector('input').addEventListener('change', () => { current = v; });
        wrap.appendChild(row);
      });
      mountEl.appendChild(wrap);
    }

    return {
      /** Call on any change to receipt type / target statement. */
      update({ receiptType, targetStatement }) {
        const shouldShow = receiptType === 'donation' && targetStatement === 'food';
        if (!shouldShow) current = null;            // clear when not applicable
        visible = shouldShow;
        render();
      },
      getValue() { return visible ? current : null; },
      /** @returns {true|string} true if ok, else error key */
      validate() {
        if (!visible) return true;
        return VALUES.includes(current) ? true : t('donationAllocation.required');
      },
      reset() { current = null; render(); },
    };
  }

  global.DonationAllocation = DonationAllocation;
})(typeof window !== 'undefined' ? window : globalThis);
