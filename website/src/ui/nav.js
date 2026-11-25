import { readingCenter } from './reading.js';

/**
 * Section navigation: marks the header link of the section under the reading
 * position (aria-current) and reports section changes. The anchors themselves
 * work without JavaScript.
 */
export function initSectionNav({ onSectionChange } = {}) {
  const sections = Array.from(document.querySelectorAll('[data-section]'));
  const links = Array.from(document.querySelectorAll('[data-section-link]'));
  let current = null;
  let scheduled = false;

  const setActive = (section) => {
    const id = section.dataset.section;
    if (id === current) return;
    current = id;
    for (const link of links) {
      if (link.dataset.sectionLink === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    if (onSectionChange) onSectionChange(id, section.dataset.facade);
  };

  const update = () => {
    scheduled = false;
    if (!sections.length) return;
    const line = readingCenter();
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) active = section;
    }
    // At the very bottom of the page the last section is always the current one.
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    setActive(atBottom ? sections[sections.length - 1] : active);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();

  return { get current() { return current; } };
}
