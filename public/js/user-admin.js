/* ═══ AUTH-001 · User Management client (PR-2) ═══
   Thin client for the `admin-users` Edge Function. Admin-only management actions
   (disable / enable / unlock / reset password / force change) and a reusable one-time
   credentials dialog. No service_role here — every privileged mutation is performed by
   the Edge Function after it re-verifies the caller's admin JWT. Classic script:
   SB, can, toast, loadUsers, logAction, CUR, esc resolve at call time. */
(function () {
  'use strict';
  var L = function (ar, en) { return (typeof window !== 'undefined' && window.LANG === 'en') ? en : ar; };

  /* Invoke the Edge Function; normalize the {ok, data|error} shape (reads the JSON
     error body that supabase-js hides behind FunctionsHttpError.context). */
  async function call(body) {
    try {
      var res = await SB.functions.invoke('admin-users', { body: body });
      if (res.error) {
        var msg = res.error.message || 'request_failed';
        try { var j = await res.error.context.json(); if (j && j.error) msg = j.error + (j.field ? (' · ' + j.field) : ''); } catch (_) {}
        return { ok: false, error: msg };
      }
      var d = res.data || {};
      return d.error ? { ok: false, error: d.error } : { ok: true, data: d };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  window.adminUsersCall = call;

  function fail(r) { toast((window.t ? window.t('errors.generic_error') : 'خطأ') + ': ' + r.error, 'err'); }

  window.adminUserDisable = async function (uid, disable) {
    if (!can.admin()) return;
    var q = disable ? L('تعطيل هذا المستخدم؟ سيُنهى نشاطه ويُمنع دخوله.', 'Disable this user? Their access is revoked and future login blocked.')
                    : L('تفعيل هذا المستخدم؟', 'Enable this user?');
    if (!window.confirm(q)) return;
    var r = await call({ action: disable ? 'disable' : 'enable', user_id: uid });
    if (!r.ok) return fail(r);
    toast(disable ? L('تم تعطيل المستخدم', 'User disabled') : L('تم تفعيل المستخدم', 'User enabled'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  window.adminUserUnlock = async function (uid) {
    if (!can.admin()) return;
    var r = await call({ action: 'unlock', user_id: uid });
    if (!r.ok) return fail(r);
    toast(L('تم فكّ القفل وإعادة الحساب لحالته الأولى', 'Account unlocked (reset to initial state)'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  window.adminUserForce = async function (uid) {
    if (!can.admin()) return;
    var r = await call({ action: 'force_change', user_id: uid });
    if (!r.ok) return fail(r);
    toast(L('سيُطلب من المستخدم تغيير كلمة المرور عند الدخول', 'User will be forced to change password on next login'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  window.adminUserReset = async function (uid, identifier) {
    if (!can.admin()) return;
    if (!window.confirm(L('توليد كلمة مرور مؤقتة جديدة لهذا المستخدم؟ سيُطلب منه تغييرها عند الدخول.',
                          'Generate a new temporary password for this user? They must change it on next login.'))) return;
    var r = await call({ action: 'reset_password', user_id: uid, mode: 'auto' });
    if (!r.ok) return fail(r);
    if (r.data && r.data.password) window.showCredentials({ identifier: identifier || '', password: r.data.password, uid: uid, kind: 'reset' });
    else toast(L('تمت إعادة التعيين', 'Password reset'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  /* Reusable ONE-TIME credentials dialog (used by reset here, and by create in PR-5).
     The password is shown once and cannot be retrieved again — only the hash is stored. */
  window.showCredentials = function (o) {
    o = o || {};
    var host = document.getElementById('cred-dialog');
    if (host) host.remove();
    host = document.createElement('div');
    host.id = 'cred-dialog';
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
    var title = o.kind === 'reset' ? L('تمت إعادة تعيين كلمة المرور', 'Password reset') : L('تم إنشاء المستخدم بنجاح', 'User created successfully');
    host.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:var(--bg2,#fff);color:var(--tx,#111);border:1px solid var(--bd,#ccc);border-radius:12px;max-width:420px;width:92%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:var(--fn,sans-serif)">'
      + '<div style="font-weight:700;font-size:15px;margin-bottom:12px"><i class="ti ti-shield-check"></i> ' + title + '</div>'
      + (o.identifier ? ('<div style="font-size:11px;color:var(--tx3,#888)">' + L('المعرّف', 'Identifier') + '</div><div style="font-weight:600;margin-bottom:10px" dir="ltr">' + (window.esc ? esc(o.identifier) : o.identifier) + '</div>') : '')
      + '<div style="font-size:11px;color:var(--tx3,#888)">' + L('كلمة المرور المؤقتة', 'Temporary password') + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">'
      + '<code id="cred-pass" style="flex:1;background:var(--bg,#f4f4f4);padding:8px 10px;border-radius:8px;font-size:14px;letter-spacing:1px" dir="ltr">••••••••••••</code>'
      + '<button class="btn ghost sm" id="cred-eye" aria-label="' + L('إظهار', 'Reveal') + '"><i class="ti ti-eye"></i></button></div>'
      + '<div style="font-size:11px;color:var(--tx3,#888);margin-bottom:14px"><i class="ti ti-alert-triangle"></i> ' + L('تُعرض مرة واحدة فقط ولا يمكن استرجاعها لاحقاً.', 'Shown only once — it cannot be displayed again.') + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn primary sm" id="cred-copy"><i class="ti ti-copy"></i> ' + L('نسخ معلومات الدخول', 'Copy Login Information') + '</button>'
      + '<button class="btn sm" id="cred-close">' + L('إغلاق', 'Close') + '</button></div></div>';
    document.body.appendChild(host);
    var shown = false;
    document.getElementById('cred-eye').addEventListener('click', function () {
      shown = !shown; document.getElementById('cred-pass').textContent = shown ? o.password : '••••••••••••';
    });
    document.getElementById('cred-copy').addEventListener('click', async function () {
      var block = (o.identifier ? (L('المعرّف', 'Identifier') + ': ' + o.identifier + '\n') : '') + L('كلمة المرور', 'Password') + ': ' + o.password;
      try { await navigator.clipboard.writeText(block); toast(L('تم نسخ معلومات الدخول', 'Login information copied'), 'ok'); } catch (_) { toast(L('تعذّر النسخ', 'Copy failed'), 'warn'); }
      try { if (typeof logAction === 'function') logAction('credentials_copied', L('نسخ معلومات دخول مستخدم', 'Copied user login information'), 'auth', o.uid || null); } catch (_) {}
    });
    var close = function () { host.remove(); };
    document.getElementById('cred-close').addEventListener('click', close);
    host.addEventListener('click', function (e) { if (e.target === host) close(); });
  };

  /* ── Self-disable guard for active tabs ──
     If THIS logged-in admin/user gets disabled mid-session, terminate the tab as soon
     as it regains focus (belt-and-suspenders with the Edge ban + login-gate block). */
  window.authRecheckDisabled = async function () {
    try {
      if (typeof CU === 'undefined' || !CU) return;
      var r = await SB.from('user_roles').select('is_disabled').eq('user_id', CU.id).maybeSingle();
      if (r.data && r.data.is_disabled === true && typeof window.logout === 'function') {
        toast(L('تم تعطيل حسابك من قبل المسؤول', 'Your account was disabled by an administrator'), 'err');
        window.logout();
      }
    } catch (_) {}
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) window.authRecheckDisabled(); });
})();
