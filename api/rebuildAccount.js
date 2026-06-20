'use strict';
/**
 * rebuild-account/rebuildAccount.js — Phase 15 (reference module)
 *
 * Triggers a rebuild that recomputes subscriptions, balances, and allocations
 * while PRESERVING manual overrides. Shows the allocation rules permanently
 * inside the dialog (bilingual via window.t()).
 *
 * Server contract:
 *   POST /api/rebuild { scope, reason } -> { run_id, members_affected, status }
 * The handler runs rebuildService (regenerate non-overridden subs, replay live
 * payments through allocationEngine), writes a rebuild_runs row + audit entries.
 */
(function (global) {
  const t = (k) => (global.t ? global.t(k) : k);

  function RebuildAccount(root, { api, scope = 'all' }) {
    function rulesBlock() {
      const rules = t('rebuild.rules'); // array via i18n
      const items = Array.isArray(rules) ? rules : [];
      return `<section class="rules"><h3>${t('rebuild.rulesTitle')}</h3><ol>` +
        items.map((r) => `<li>${r}</li>`).join('') + `</ol></section>`;
    }

    function render(state = {}) {
      root.innerHTML =
        `<h2>${t('rebuild.title')}</h2>` +
        `<p>${t('rebuild.description')}</p>` +
        rulesBlock() +
        `<label class="field"><span>${t('rebuild.reasonLabel')}</span><input id="rb_reason" type="text"></label>` +
        `<div class="status" role="status">${state.message || ''}</div>` +
        `<div class="actions">` +
          `<button data-act="run" ${state.running ? 'disabled' : ''}>${state.running ? t('rebuild.states.running') : t('rebuild.actions.run')}</button>` +
        `</div>`;
      root.querySelector('[data-act="run"]').onclick = run;
    }

    async function run() {
      const reason = root.querySelector('#rb_reason').value;
      render({ running: true, message: t('rebuild.states.running') });
      try {
        const res = await api.post('/api/rebuild', { scope, reason });
        render({ message: t('rebuild.states.success').replace('{count}', res.members_affected) });
      } catch (e) {
        render({ message: t('rebuild.states.error') });
      }
    }

    render();
  }

  global.RebuildAccount = RebuildAccount;
})(typeof window !== 'undefined' ? window : globalThis);
