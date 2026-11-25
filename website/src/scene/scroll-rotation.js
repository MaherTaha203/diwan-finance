/**
 * Maps the page scroll position to a Y-rotation of the model.
 *
 * Each section is tied to a facade angle (data-facade on the section). The
 * angle is a pure function of scrollY — piecewise between section anchors with
 * a smoothstep ease — so scrolling back up reverses the motion exactly and
 * nothing rotates on its own.
 */
export const FACADE_ANGLES = {
  front: 0.18, // the front as on the approved renders: olive tree on the left, door and rosette
  side: -1.4, // the right flank, the olive crown behind
  back: -2.98, // the back facade
};
const START_ANGLE = 0.3;
const END_ANGLE = -3.3;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (t) => t * t * (3 - 2 * t);

export function createScrollRotation({ reducedMotion = false, readingCenter = () => window.innerHeight / 2 } = {}) {
  let anchors = [{ s: 0, a: START_ANGLE }, { s: 1, a: END_ANGLE }];

  const measure = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const center = readingCenter();
    const points = [{ s: 0, a: START_ANGLE }];
    for (const section of document.querySelectorAll('[data-section]')) {
      const angle = FACADE_ANGLES[section.dataset.facade];
      if (angle === undefined) continue;
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // The facade is fully turned when the section's middle reaches the reading centre.
      points.push({ s: clamp(top + rect.height / 2 - center, 0, max), a: angle });
    }
    points.push({ s: max, a: END_ANGLE });
    points.sort((p, q) => p.s - q.s);
    // Collapse anchors that share a scroll position (keep the later, section-defined angle).
    anchors = points.filter((p, i) => i === points.length - 1 || points[i + 1].s - p.s > 1);
  };

  const angleAt = (s) => {
    if (s <= anchors[0].s) return anchors[0].a;
    for (let i = 1; i < anchors.length; i++) {
      const b = anchors[i];
      if (s <= b.s) {
        const a = anchors[i - 1];
        const t = smoothstep(clamp((s - a.s) / (b.s - a.s), 0, 1));
        return a.a + (b.a - a.a) * t;
      }
    }
    return anchors[anchors.length - 1].a;
  };

  return {
    measure,
    target: () => (reducedMotion ? FACADE_ANGLES.front : angleAt(window.scrollY)),
    get anchors() { return anchors.slice(); },
  };
}

/** Which facade faces the camera (camera looks down −Z towards the model). */
export function facadeFor(angle) {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const scores = [
    ['الواجهة الأمامية', c],
    ['الواجهة الجانبية', -s],
    ['الواجهة الخلفية', -c],
    ['الواجهة الجانبية', s],
  ];
  scores.sort((x, y) => y[1] - x[1]);
  return scores[0][0];
}
