/**
 * Vertical centre (in viewport pixels) of the area where the visitor reads.
 * Desktop: between the header and the bottom of the window.
 * Phone/tablet: between the pinned 3D stage and the bottom of the window.
 */
export function readingCenter() {
  const header = document.querySelector('.site-header');
  const stage = document.getElementById('stage');
  let top = header ? header.getBoundingClientRect().bottom : 0;
  if (stage) {
    const rect = stage.getBoundingClientRect();
    // The stage spans the full width only in the pinned (phone/tablet) layout.
    if (rect.width >= window.innerWidth - 1) top = Math.max(top, rect.bottom);
  }
  return (top + window.innerHeight) / 2;
}
