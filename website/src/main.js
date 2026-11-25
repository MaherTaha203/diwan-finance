import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './styles/main.css';

import { initSectionNav } from './ui/nav.js';
import { createFallbackStage } from './ui/fallback.js';
import { detectCapabilities } from './scene/capabilities.js';

const root = document.documentElement;
const stage = document.getElementById('stage');
const canvas = document.getElementById('stage-canvas');
const fallbackImage = document.getElementById('stage-fallback');
const facadeLabel = document.getElementById('stage-facade');
const status = document.getElementById('stage-status');

const caps = detectCapabilities();
root.dataset.scene = 'static';
root.dataset.quality = caps.tier;

const fallback = createFallbackStage({ img: fallbackImage, label: facadeLabel, reducedMotion: caps.reducedMotion });
initSectionNav({ onSectionChange: (_id, facadeKey) => fallback.show(facadeKey) });

const useStatic = (reason) => {
  root.classList.remove('scene-ready');
  root.dataset.scene = 'static';
  if (status) status.hidden = true;
  if (reason) console.info('[diwan] Static renders in use:', reason instanceof Error ? reason.message : reason);
};

async function start3D() {
  if (status) status.hidden = false;
  try {
    const { mountDiwanScene } = await import('./scene/index.js');
    await mountDiwanScene({
      canvas,
      container: stage,
      tier: caps.tier,
      reducedMotion: caps.reducedMotion,
      onFacade: (label) => { facadeLabel.textContent = label; },
      onFailure: (error) => useStatic(error),
    });
    root.dataset.scene = 'ready';
    root.classList.add('scene-ready');
    if (status) status.hidden = true;
  } catch (error) {
    useStatic(error);
  }
}

if (caps.use3D) {
  // Let the text and the static render paint first; the 3D chunk loads after.
  const begin = () => window.setTimeout(start3D, 60);
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
} else {
  useStatic(caps.webgl ? 'reduced data or ?static' : 'WebGL not supported');
  window.addEventListener('load', () => fallback.preload(), { once: true });
}
