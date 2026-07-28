/* ═══════════════════════════════════════════════════════════════════════════
   UX-002 · Keyboard operability for inline-onclick controls (WCAG 2.1.1 / 4.1.2).
   ---------------------------------------------------------------------------
   The app renders interactive controls (person/voucher links, filter tabs/pills,
   selectable rows, expandable headers) as NON-button elements carrying an inline
   `onclick`, and replaces them wholesale on every `innerHTML` render. Those elements
   are therefore not tab-focusable and not announced as controls. UX-001 measured
   50 such elements (S2-1).

   This module makes them keyboard-operable WITHOUT editing the ~50 render sites:
     1) one delegated `keydown` handler — Enter/Space on a focused inline-onclick
        control triggers its click (Space is prevented from scrolling the page);
     2) a self-healing enhancer — gives every inline-onclick control that isn't a
        native control `tabindex="0"` + `role="button"`, so it enters the tab order
        and is announced. It runs once at load and again on the subtrees added by
        each re-render (scoped MutationObserver on #app), so it survives the
        innerHTML-replace model. It's idempotent (`:not([tabindex])` skips done ones).

   Presentation/accessibility only: no data, accounting, or behaviour changes; the
   existing `onclick` (mouse) path is untouched. Load AFTER app.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (typeof document === 'undefined') return;

  /* inline-onclick elements that are NOT already keyboard-operable native controls */
  var SEL = '[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not([tabindex])';
  var NATIVE = { BUTTON: 1, A: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, OPTION: 1 };

  function enhanceEl(el) {
    if (!el || el.nodeType !== 1 || !el.matches) return;
    if (!el.matches(SEL)) return;
    el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  }

  function enhanceTree(node) {
    if (!node || node.nodeType !== 1) return;
    enhanceEl(node);
    if (node.querySelectorAll) {
      var list = node.querySelectorAll(SEL);
      for (var i = 0; i < list.length; i++) enhanceEl(list[i]);
    }
  }

  /* 1 · delegated keyboard activation (Enter / Space) */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = e.target;
    if (!t || t.nodeType !== 1 || NATIVE[t.tagName]) return;   // native controls handle themselves
    if (!t.hasAttribute || !t.hasAttribute('onclick')) return; // only our inline-onclick controls
    e.preventDefault();                                        // stop Space from scrolling
    if (typeof t.click === 'function') t.click();
  });

  /* 2 · self-healing focusability across re-renders */
  function start() {
    var appRoot = document.getElementById('app') || document.body;
    enhanceTree(appRoot);
    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) enhanceTree(added[j]);
        }
      });
      mo.observe(appRoot, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  /* test/introspection hook (no effect in the browser runtime) */
  if (typeof module !== 'undefined' && module.exports) module.exports = { enhanceTree: enhanceTree, SEL: SEL };
})(typeof window !== 'undefined' ? window : this);
