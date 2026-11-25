/**
 * Decides whether to mount the 3D scene and at which quality tier.
 *  - use3D: false → the static renders are kept (no WebGL, Save-Data, ?static).
 *  - tier: 'high' | 'mid' | 'low' → drives pixel ratio, shadow map, foliage density.
 */
export function detectCapabilities() {
  const params = new URLSearchParams(window.location.search);
  const connection = navigator.connection || {};
  const saveData = connection.saveData === true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1023px)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const webgl = hasWebGL();

  let tier = 'high';
  if (coarsePointer || narrow || cores <= 4 || memory <= 4) tier = 'mid';
  if (cores <= 2 || memory <= 2) tier = 'low';
  const forced = params.get('quality');
  if (forced === 'high' || forced === 'mid' || forced === 'low') tier = forced;

  const use3D = webgl && !saveData && !params.has('static');
  return { use3D, tier, reducedMotion, saveData, webgl };
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    // Release the probe context so it does not count against the browser's context limit.
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch {
    return false;
  }
}
