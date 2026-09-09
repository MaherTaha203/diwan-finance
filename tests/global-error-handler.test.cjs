/* Runtime regression · global error handler — graceful, non-leaking failure.
   Proves the handler: registers window 'error' + 'unhandledrejection' listeners;
   shows the user ONE GENERIC ARABIC message (never a stack/internal detail);
   logs internally; de-duplicates (no spam); stays silent (no toast) for benign
   noise and for resource-load errors; and never surfaces secrets/stack to the user.
   Functional test with a mocked window. Run: node --test tests/global-error-handler.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

function freshHandler() {
  // isolated window mock capturing listeners + toast + console
  const listeners = {};
  const toasts = [];
  const logs = [];
  const win = {
    addEventListener: (t, fn) => { listeners[t] = fn; },
    toast: (msg, type) => { toasts.push({ msg, type }); },
  };
  global.window = win;
  const realErr = console.error;
  console.error = (...a) => { logs.push(a.join(' ')); };
  const p = path.join(__dirname, '..', 'public', 'js', 'global-error-handler.js');
  delete require.cache[require.resolve(p)];
  const mod = require(p);
  console.error = realErr;
  return { listeners, toasts, logs, win, mod, restoreLog: () => {} };
}

// capture console.error during a dispatch
function withConsole(logs, fn) {
  const real = console.error;
  console.error = (...a) => { logs.push(a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ')); };
  try { fn(); } finally { console.error = real; }
}

test('registers error + unhandledrejection listeners', () => {
  const h = freshHandler();
  assert.equal(typeof h.listeners.error, 'function');
  assert.equal(typeof h.listeners.unhandledrejection, 'function');
});

test('a real error → ONE generic Arabic toast, no stack/detail leaked to user', () => {
  const h = freshHandler();
  withConsole(h.logs, () => {
    h.listeners.error({ error: { name: 'TypeError', message: 'x is not a function', stack: 'at secret.js:42\nTOKEN=abc' }, filename: 'app.js', lineno: 10, target: h.win });
  });
  assert.equal(h.toasts.length, 1, 'exactly one toast');
  assert.equal(h.toasts[0].type, 'err');
  assert.ok(/[؀-ۿ]/.test(h.toasts[0].msg), 'toast message is Arabic');
  assert.ok(!/x is not a function|secret\.js|TOKEN|stack|at /i.test(h.toasts[0].msg), 'no stack/internal/secret in user message');
  assert.ok(h.logs.some(l => /\[global-error\]/.test(l)), 'logged internally');
});

test('duplicate identical error within the window → no second toast (no spam)', () => {
  const h = freshHandler();
  const ev = { error: { name: 'TypeError', message: 'dup' }, target: h.win };
  withConsole(h.logs, () => { h.listeners.error(ev); h.listeners.error(ev); });
  assert.equal(h.toasts.length, 1, 'de-duplicated');
});

test('unhandled rejection → generic Arabic toast', () => {
  const h = freshHandler();
  withConsole(h.logs, () => { h.listeners.unhandledrejection({ reason: new Error('boom') }); });
  assert.equal(h.toasts.length, 1);
  assert.ok(/[؀-ۿ]/.test(h.toasts[0].msg));
});

test('benign noise (ResizeObserver / AbortError) is logged but does NOT alarm the user', () => {
  const h = freshHandler();
  withConsole(h.logs, () => {
    h.listeners.error({ error: { name: 'Error', message: 'ResizeObserver loop completed with undelivered notifications.' }, target: h.win });
    h.listeners.unhandledrejection({ reason: { name: 'AbortError', message: 'The operation was aborted' } });
  });
  assert.equal(h.toasts.length, 0, 'no toast for benign noise');
  assert.ok(h.logs.length >= 1, 'still logged');
});

test('resource-load error (target is an element, not window) is ignored', () => {
  const h = freshHandler();
  withConsole(h.logs, () => {
    h.listeners.error({ target: { tagName: 'IMG', src: 'x.png' } }); // no ev.error, element target
  });
  assert.equal(h.toasts.length, 0, 'resource load error must not alarm the user');
});

test('the user-facing message is a fixed generic string (no interpolation surface)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'global-error-handler.js'), 'utf8');
  assert.ok(/GENERIC_AR\s*=\s*['"][؀-ۿ]/.test(src), 'generic Arabic constant');
  // the toast call must pass the constant, never the error message/stack
  assert.ok(/root\.toast\(\s*GENERIC_AR/.test(src), 'toast uses the fixed generic constant only');
  assert.ok(!/toast\([^)]*(msg|errLike|\.message|\.stack)/.test(src), 'never toasts raw error detail');
});
