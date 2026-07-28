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

  /* ═══ Create-User workflow (PR-5) ═══
     Owner-approved screen: Full Name · Role · Phone · Email · password mode
     (auto default / manual) · force-change (default on). At least one of phone/email
     is required. Creation is performed by the admin-users Edge Function (service_role);
     on success the one-time credentials dialog reveals the temporary password once. */
  function $(id) { return document.getElementById(id); }

  window.genCreatePass = function () {
    var inp = $('cu-pass'); if (!inp || !window.AuthDS) return;
    inp.value = window.AuthDS.genPassword(16);
    inp.dispatchEvent(new Event('input'));
  };

  /* Show/hide the manual-password block and (lazily) wire its live policy UI. */
  var _cuPolicyWired = false;
  function cuSyncMode() {
    var manual = (document.querySelector('input[name="cu-mode"]:checked') || {}).value === 'manual';
    var block = $('cu-manual-block'); if (block) block.style.display = manual ? '' : 'none';
    if (manual && !_cuPolicyWired && window.AuthDS) {
      _cuPolicyWired = true;
      window.AuthDS.attachPolicyUI({
        newInput: $('cu-pass'), meterBar: $('cu-bar'), meterLvl: $('cu-lvl'), noteEl: $('cu-note'),
        ctx: function () { return { email: ($('cu-email') || {}).value || '', username: ($('cu-name') || {}).value || '' }; },
        extraInputs: [$('cu-email'), $('cu-name')].filter(Boolean),
      });
    }
  }

  /* Open + reset the Create-User modal fresh each time. */
  window.openCreateUser = function () {
    if (!can.admin()) { toast(window.t ? window.t('errors.no_permission') : 'المدير فقط', 'err'); return; }
    if (typeof window.openM === 'function') window.openM('invite');
    ['cu-name', 'cu-phone', 'cu-email', 'cu-pass'].forEach(function (id) { var el = $(id); if (el) el.value = ''; });
    var role = $('cu-role'); if (role) role.value = 'accountant';
    var auto = document.querySelector('input[name="cu-mode"][value="auto"]'); if (auto) auto.checked = true;
    var force = $('cu-force'); if (force) force.checked = true;
    if ($('cu-note')) { $('cu-note').textContent = ''; $('cu-note').className = 'pw-note'; }
    if ($('cu-bar')) { $('cu-bar').className = ''; $('cu-bar').style.width = '0'; }
    if ($('cu-lvl')) $('cu-lvl').textContent = '—';
    document.querySelectorAll('input[name="cu-mode"]').forEach(function (r) {
      if (!r.__cuBound) { r.__cuBound = true; r.addEventListener('change', cuSyncMode); }
    });
    cuSyncMode();
    setTimeout(function () { var n = $('cu-name'); if (n) n.focus(); }, 80);
  };

  var CREATE_ERR = {
    identifier_required: L('أدخل الهاتف أو البريد الإلكتروني (أحدهما على الأقل).', 'Enter a phone or email (at least one).'),
    invalid_email: L('البريد الإلكتروني غير صالح.', 'Invalid email address.'),
    invalid_role: L('الدور المحدد غير صالح.', 'Invalid role.'),
    weak_password: L('كلمة المرور لا تحقق السياسة — 10 أحرف على الأقل ونوعان مختلفان.', 'Password does not meet policy — at least 10 characters and two different types.'),
    'duplicate_identifier · email': L('هذا البريد الإلكتروني مُسجَّل مسبقاً.', 'That email is already registered.'),
    'duplicate_identifier · phone': L('رقم الهاتف هذا مُسجَّل مسبقاً.', 'That phone number is already registered.'),
    duplicate_identifier: L('المعرّف مُسجَّل مسبقاً.', 'That identifier is already registered.'),
    not_admin: L('صلاحيات المدير مطلوبة.', 'Administrator privileges required.'),
  };

  window.createUser = async function () {
    if (!can.admin()) { toast(window.t ? window.t('errors.no_permission') : 'المدير فقط', 'err'); return; }
    var name = ($('cu-name') || {}).value ? $('cu-name').value.trim() : '';
    var role = ($('cu-role') || {}).value || 'accountant';
    var phone = ($('cu-phone') || {}).value ? $('cu-phone').value.trim() : '';
    var email = ($('cu-email') || {}).value ? $('cu-email').value.trim().toLowerCase() : '';
    var mode = (document.querySelector('input[name="cu-mode"]:checked') || {}).value === 'manual' ? 'manual' : 'auto';
    var pass = ($('cu-pass') || {}).value || '';
    var force = !!($('cu-force') && $('cu-force').checked);

    /* Client-side pre-checks (the Edge Function re-validates authoritatively). */
    if (!phone && !email) { toast(CREATE_ERR.identifier_required, 'warn'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast(CREATE_ERR.invalid_email, 'err'); return; }
    if (mode === 'manual') {
      var pol = window.AuthDS ? window.AuthDS.checkPassword(pass, { email: email, username: name }) : null;
      if (pol && !pol.valid) { toast(CREATE_ERR.weak_password, 'err'); return; }
    }

    var btn = $('cu-submit'); if (btn) btn.disabled = true;
    try {
      var payload = { action: 'create', full_name: name, role: role, force_change: force, mode: mode };
      if (phone) payload.phone = phone;
      if (email) payload.email = email;
      if (mode === 'manual') payload.password = pass;

      var r = await call(payload);
      if (!r.ok) {
        var msg = CREATE_ERR[r.error] || (L('تعذّر إنشاء المستخدم', 'Could not create user') + ': ' + r.error);
        toast(msg, 'err');
        return;
      }
      if (typeof window.closeM === 'function') window.closeM();
      var d = r.data || {};
      /* One-time credentials dialog (identifier + temp password, revealed once). */
      window.showCredentials({ identifier: d.identifier || email || phone, password: d.password || '', uid: d.user_id || null, kind: 'create' });
      if (typeof loadUsers === 'function') loadUsers();
    } catch (e) {
      toast(L('تعذّر إنشاء المستخدم', 'Could not create user') + ': ' + String((e && e.message) || e), 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
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

  /* ═══ AUTH-003 · additional admin actions ═══ */
  window.adminUserSignOut = async function (uid) {
    if (!can.admin()) return;
    if (!window.confirm(L('إنهاء جميع جلسات هذا المستخدم الآن؟', 'Sign out all sessions for this user now?'))) return;
    var r = await call({ action: 'sign_out', user_id: uid });
    if (!r.ok) return fail(r);
    toast(L('تم إنهاء جميع الجلسات', 'All sessions signed out'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  window.adminUserDelete = async function (uid) {
    if (!can.admin()) return;
    if (!window.confirm(L('حذف هذا المستخدم نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.', 'Permanently delete this user? This cannot be undone.'))) return;
    var r = await call({ action: 'delete', user_id: uid });
    if (!r.ok) {
      var m = r.error === 'last_admin_protected' ? L('لا يمكن حذف آخر مدير مفعّل.', 'Cannot delete the last enabled administrator.')
            : r.error === 'cannot_delete_self' ? L('لا يمكنك حذف حسابك الخاص.', 'You cannot delete your own account.')
            : r.error;
      return toast((window.t ? window.t('errors.generic_error') : 'خطأ') + ': ' + m, 'err');
    }
    toast(L('تم حذف المستخدم', 'User deleted'), 'ok');
    if (typeof loadUsers === 'function') loadUsers();
  };

  /* Compact Edit-User dialog (name / email / phone) → admin-users `update`. */
  window.editUserOpen = function (uid, fullName, email, phone) {
    if (!can.admin()) return;
    var host = document.getElementById('edituser-dialog'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'edituser-dialog';
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
    var dec = function (s) { return (s == null ? '' : String(s)).replace(/"/g, '&quot;'); };
    host.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:var(--bg2,#fff);color:var(--tx,#111);border:1px solid var(--bd,#ccc);border-radius:12px;max-width:440px;width:92%;padding:20px;font-family:var(--fn,sans-serif)">'
      + '<div style="font-weight:700;font-size:15px;margin-bottom:12px"><i class="ti ti-user-edit"></i> ' + L('تعديل المستخدم', 'Edit User') + '</div>'
      + '<label for="eu-name" style="font-size:11px;color:var(--tx3,#888)">' + L('الاسم الكامل', 'Full name') + '</label>'
      + '<input id="eu-name" value="' + dec(fullName) + '" style="width:100%;margin:3px 0 10px;padding:8px 10px;border:1px solid var(--bd2,#ccc);border-radius:8px;background:var(--bg,#fff);color:var(--tx,#111)">'
      + '<label for="eu-email" style="font-size:11px;color:var(--tx3,#888)">' + L('البريد الإلكتروني', 'Email') + '</label>'
      + '<input id="eu-email" dir="ltr" value="' + dec(email) + '" style="width:100%;margin:3px 0 10px;padding:8px 10px;border:1px solid var(--bd2,#ccc);border-radius:8px;background:var(--bg,#fff);color:var(--tx,#111)">'
      + '<label for="eu-phone" style="font-size:11px;color:var(--tx3,#888)">' + L('رقم الهاتف', 'Phone') + '</label>'
      + '<input id="eu-phone" dir="ltr" value="' + dec(phone) + '" style="width:100%;margin:3px 0 14px;padding:8px 10px;border:1px solid var(--bd2,#ccc);border-radius:8px;background:var(--bg,#fff);color:var(--tx,#111)">'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn primary sm" id="eu-save">' + L('حفظ', 'Save') + '</button>'
      + '<button class="btn sm" id="eu-cancel">' + L('إلغاء', 'Cancel') + '</button></div></div>';
    document.body.appendChild(host);
    var close = function () { host.remove(); };
    document.getElementById('eu-cancel').addEventListener('click', close);
    host.addEventListener('click', function (e) { if (e.target === host) close(); });
    document.getElementById('eu-save').addEventListener('click', async function () {
      var payload = { action: 'update', user_id: uid,
        full_name: (document.getElementById('eu-name').value || '').trim(),
        email: (document.getElementById('eu-email').value || '').trim().toLowerCase(),
        phone: (document.getElementById('eu-phone').value || '').trim() };
      var r = await call(payload);
      if (!r.ok) return fail(r);
      toast(L('تم تحديث المستخدم', 'User updated'), 'ok'); close();
      if (typeof loadUsers === 'function') loadUsers();
    });
  };

  /* View a single user's recent activity (audit rows filtered by actor). */
  window.viewUserActivity = async function (uid, label) {
    if (!can.admin()) return;
    var res = await SB.from('audit_log')
      .select('action,description,ip,created_at').eq('actor_user_id', uid)
      .order('created_at', { ascending: false }).limit(60);
    var rows = (res.data || []);
    var host = document.getElementById('activity-dialog'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'activity-dialog';
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
    var body = rows.length
      ? rows.map(function (a) {
          var d = new Date(a.created_at).toLocaleString(window.LANG === 'en' ? 'en-GB' : 'ar');
          return '<div style="padding:7px 0;border-bottom:1px solid var(--bd,#eee);font-size:12px">'
            + '<span style="font-weight:600">' + (window.esc ? esc(a.action) : a.action) + '</span> · <span style="color:var(--tx3,#888)">' + d + (a.ip ? ' · ' + a.ip : '') + '</span>'
            + (a.description ? '<div style="color:var(--tx2,#555)">' + (window.esc ? esc(a.description) : a.description) + '</div>' : '') + '</div>';
        }).join('')
      : '<div style="color:var(--tx3,#888);font-size:12px;padding:10px 0">' + L('لا يوجد نشاط مسجّل.', 'No recorded activity.') + '</div>';
    host.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:var(--bg2,#fff);color:var(--tx,#111);border:1px solid var(--bd,#ccc);border-radius:12px;max-width:520px;width:92%;max-height:80vh;overflow:auto;padding:20px;font-family:var(--fn,sans-serif)">'
      + '<div style="font-weight:700;font-size:15px;margin-bottom:10px"><i class="ti ti-history"></i> ' + L('نشاط المستخدم', 'User Activity') + (label ? ' — ' + (window.esc ? esc(label) : label) : '') + '</div>'
      + body
      + '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn sm" id="act-close">' + L('إغلاق', 'Close') + '</button></div></div>';
    document.body.appendChild(host);
    var close = function () { host.remove(); };
    document.getElementById('act-close').addEventListener('click', close);
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
