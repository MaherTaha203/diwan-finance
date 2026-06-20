'use strict';
/**
 * member-account/manageAccount.js — Phase 15 (reference module, admin-only)
 *
 * Admin edits: Active Year, Historical Balance, Historical Payments, Credit,
 * Subscription 2025/2026 (with Manual Override), Notes. All changes audited.
 *
 * Behaviour required by spec:
 *  - Active Year is EDITABLE; changing it shows a live PREVIEW of recalculated
 *    subscription obligations and does NOT save until the admin confirms.
 *  - Changing Active Year never modifies Historical Balance (independent, D-2).
 *  - Manual Override freezes a subscription value against rebuild; payments may
 *    still reduce the remaining overridden balance.
 *
 * Server contract (Express, service_role):
 *   GET  /api/members/:id/account        -> { member, subscriptions }
 *   POST /api/members/:id/account/preview { active_year } -> { before, after }
 *   PUT  /api/members/:id/account         { patch, reason } -> { ok }
 * The PUT handler must writeAudit() per changed field (auditService action types).
 */
(function (global) {
  const t = (k) => (global.t ? global.t(k) : k);
  const DUES = { 2025: 200, 2026: 200 };

  // Pure preview: mirrors allocationEngine gating; never writes.
  function previewObligations(activeYear, subs) {
    return Object.keys(DUES).map(Number).sort().map((year) => {
      const ov = subs.find((s) => s.year === year && s.is_overridden);
      if (ov) return { year, due: ov.override_amount_ils, overridden: true };
      return { year, due: year >= activeYear ? DUES[year] : 0, overridden: false };
    });
  }

  function ManageAccount(root, { api, member, subscriptions, isAdmin }) {
    if (!isAdmin) { root.innerHTML = `<div class="empty">${t('manageAccount.adminOnly')}</div>`; return; }
    let model = structuredClone({ member, subscriptions });

    function field(label, key, value, type = 'number') {
      return `<label class="field"><span>${t(label)}</span>` +
        `<input data-key="${key}" type="${type}" value="${value ?? ''}"></label>`;
    }

    function overrideRow(year) {
      const s = model.subscriptions.find((x) => x.year === year) || {};
      return `<fieldset class="sub"><legend>${t('manageAccount.fields.subscription' + year)}</legend>` +
        `<label class="field"><input data-key="sub_${year}_bal" type="number" value="${s.balance_ils ?? 0}"></label>` +
        `<label class="check"><input type="checkbox" data-key="sub_${year}_ovr" ${s.is_overridden ? 'checked' : ''}> ${t('manageAccount.override.label')}</label>` +
        `<label class="field reason" hidden><span>${t('manageAccount.override.reason')}</span><input data-key="sub_${year}_reason" type="text"></label>` +
        `</fieldset>`;
    }

    function render() {
      root.innerHTML =
        `<h2>${t('manageAccount.title')}</h2>` +
        `<div class="grid">` +
          field('manageAccount.fields.activeYear', 'active_from_year', model.member.active_from_year) +
          field('manageAccount.fields.historicalBalance', 'historical_balance_ils', model.member.historical_balance_ils) +
          field('manageAccount.fields.historicalPayments', 'historical_payments_ils', model.member.historical_payments_ils) +
          field('manageAccount.fields.creditBalance', 'credit_balance_ils', model.member.credit_balance_ils) +
        `</div>` +
        overrideRow(2025) + overrideRow(2026) +
        field('manageAccount.fields.notes', 'notes', model.member.notes, 'text') +
        `<div class="preview" hidden></div>` +
        `<div class="actions">` +
          `<button data-act="preview">${t('manageAccount.actions.preview')}</button>` +
          `<button data-act="save" disabled>${t('manageAccount.actions.save')}</button>` +
        `</div>`;
      wire();
    }

    async function doPreview() {
      const ay = Number(root.querySelector('[data-key="active_from_year"]').value);
      const before = previewObligations(model.member.active_from_year, model.subscriptions);
      const after = previewObligations(ay, model.subscriptions);
      const box = root.querySelector('.preview');
      const same = JSON.stringify(before) === JSON.stringify(after);
      box.hidden = false;
      box.innerHTML = `<strong>${t('manageAccount.preview.title')}</strong>` +
        (same ? `<p>${t('manageAccount.preview.noChange')}</p>` :
          after.map((a, i) => `<div>${a.year}: ${before[i].due} → ${a.due}</div>`).join('')) +
        `<p class="warn">${t('manageAccount.preview.warning')}</p>`;
      root.querySelector('[data-act="save"]').disabled = false;
    }

    async function doSave() {
      const patch = {};
      root.querySelectorAll('[data-key]').forEach((el) => {
        const v = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
        patch[el.dataset.key] = v;
      });
      const reason = patch['sub_2025_reason'] || patch['sub_2026_reason'] || '';
      try {
        await api.put(`/api/members/${model.member.id}/account`, { patch, reason });
        global.toast?.(t('manageAccount.toast.saved'));
      } catch (e) { global.toast?.(t('manageAccount.toast.error'), 'error'); }
    }

    function wire() {
      root.querySelector('[data-act="preview"]').onclick = doPreview;
      root.querySelector('[data-act="save"]').onclick = doSave;
      // reveal override reason when its checkbox is on
      [2025, 2026].forEach((y) => {
        const cb = root.querySelector(`[data-key="sub_${y}_ovr"]`);
        const reason = cb.closest('.sub').querySelector('.reason');
        cb.addEventListener('change', () => { reason.hidden = !cb.checked; });
      });
    }

    render();
  }

  global.ManageAccount = ManageAccount;
  global.previewObligations = previewObligations;
})(typeof window !== 'undefined' ? window : globalThis);
