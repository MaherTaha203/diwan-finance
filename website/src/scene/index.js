/**
 * Mounts the 3D diwan — the approved Figma design converted to 3D — into the
 * fixed stage, standing in its own landscape: the render's sky and hills far
 * behind, an open stone forecourt that fades into the horizon haze. There is
 * no plinth or display base; the building and its olive tree turn on the spot.
 *
 * Rendering is on demand: a frame is drawn only while the model is easing
 * towards its scroll-driven angle, after a resize, or when a texture arrives.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group, Mesh, PlaneGeometry,
  MeshBasicMaterial, CanvasTexture, Fog, Color, MathUtils, NeutralToneMapping, SRGBColorSpace,
  PCFSoftShadowMap, PMREMGenerator,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, textureJobs, palette } from './materials.js';
import { buildDiwan, DIM } from './building.js';
import { box, scaleUV } from './geometry-utils.js';
import { buildOliveTree, buildShrub } from './olive-tree.js';
import { createScrollRotation, facadeFor } from './scroll-rotation.js';
import { readingCenter } from '../ui/reading.js';

const QUALITY = {
  high: { dpr: 1.75, shadows: true, shadowMap: 2048, density: 1, anisotropy: 8, antialias: true },
  mid: { dpr: 1.4, shadows: true, shadowMap: 1024, density: 0.85, anisotropy: 4, antialias: true },
  low: { dpr: 1, shadows: false, shadowMap: 0, density: 0.6, anisotropy: 2, antialias: false },
};

/**
 * View of the renders: from a little above the portico eaves (so its tiles and the
 * dome read as they do in the design), the horizon a little above the middle.
 */
const VIEW = { fov: 28, eye: 4.4, horizon: 0.42, radius: 5.1, top: 6.9, margin: 0.02 };
const BACKDROP_DISTANCE = 420;

const idle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 300 });
  else window.setTimeout(resolve, 16);
});

export async function mountDiwanScene({ canvas, container, tier = 'mid', reducedMotion = false, onFacade, onFailure }) {
  const quality = QUALITY[tier] || QUALITY.mid;
  const capture = new URLSearchParams(window.location.search).has('capture');
  const haze = new Color(palette.sky.horizon);

  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas, antialias: quality.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: capture,
    });
  } catch (error) {
    throw new Error(`WebGL renderer unavailable: ${error && error.message ? error.message : error}`);
  }
  renderer.setClearColor(haze, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.fog = new Fog(haze, 40, 200);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.22;
  if (typeof room.dispose === 'function') room.dispose();
  pmrem.dispose();

  // Golden-hour light of the renders: low warm sun from the front-left, soft sky fill.
  scene.add(new HemisphereLight(0xc6d3e6, 0xc2a27a, 0.55));
  const sun = new DirectionalLight(0xffcf96, 3.5);
  sun.position.set(-9, 9.5, 11);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    const cam = sun.shadow.camera;
    cam.left = -11; cam.right = 11; cam.top = 11; cam.bottom = -11; cam.near = 4; cam.far = 45;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
  }
  scene.add(sun, sun.target);
  const rim = new DirectionalLight(0xd2dcec, 0.45);
  rim.position.set(10, 6, -8);
  scene.add(rim);

  const materials = createMaterials();

  // The landscape stays still: forecourt to the horizon, backdrop far behind.
  const groundGeo = scaleUV(new PlaneGeometry(900, 900), 900, 900);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new Mesh(groundGeo, materials.paving);
  ground.receiveShadow = true;
  ground.name = 'forecourt';
  scene.add(ground);

  // The forecourt's low stone parapet with the view beyond, as on the day and night renders.
  scene.add(terraceWall(materials));

  // The building and its tree turn together on the spot.
  const pivot = new Group();
  pivot.name = 'turntable';
  scene.add(pivot);
  pivot.add(buildDiwan(materials));
  pivot.add(contactShade(DIM.W + 1.4, DIM.D + 3.6, 0.9));
  const tree = buildOliveTree(materials, { density: quality.density });
  tree.position.set(-3.05, 0, 4.25);
  tree.rotation.y = 0.35;
  pivot.add(tree);
  const shrubs = [[-3.7, 3.6, 0.95], [-2.3, 3.55, 0.8], [-4.1, 4.7, 0.9], [-1.4, 3.3, 0.7], [3.3, 3.4, 0.85], [3.95, 2.6, 0.75]];
  shrubs.forEach(([x, z, size], i) => {
    const shrub = buildShrub(materials.shrub, { size, seed: 11 + i * 7 });
    shrub.position.set(x, 0, z);
    pivot.add(shrub);
  });

  const camera = new PerspectiveCamera(VIEW.fov, 1, 0.5, 800);
  scene.add(camera);
  const backdrop = new Mesh(new PlaneGeometry(1, 1), materials.backdrop);
  backdrop.renderOrder = -1;
  backdrop.name = 'backdrop';
  camera.add(backdrop);

  /**
   * Frames the turntable inside the clear part of the stage: the stage's dissolving
   * edges (CSS --fade-x on the content side, --fade-bottom) are kept free of the
   * building, so it never sinks into the fade.
   */
  const fit = (width, height) => {
    const styles = getComputedStyle(container);
    const shift = (parseFloat(styles.getPropertyValue('--fade-x')) || 0) / 100 * 0.9;
    const safeBottom = (parseFloat(styles.getPropertyValue('--fade-bottom')) || 0) / 100 * 0.8;
    const fullWidth = width * (1 + shift);
    camera.aspect = fullWidth / height;
    // Render the right-hand part of a wider frame: the axis moves left, away from the fading edge.
    camera.setViewOffset(fullWidth, height, width * shift, 0, width, height);
    const tanV = Math.tan(MathUtils.degToRad(VIEW.fov / 2));
    const tanH = tanV * (width / height) * (1 - shift);
    // Look up or down so the horizon lands at VIEW.horizon (fraction from the top); with a large
    // faded band at the bottom (phone layout) the horizon moves up to keep the building big.
    const horizon = VIEW.horizon - safeBottom * 0.6;
    const pitch = Math.atan((2 * horizon - 1) * tanV);
    // On the full-width phone stage the crown may touch the sides, as on the renders.
    const radius = shift > 0 ? VIEW.radius : VIEW.radius * 0.9;
    const half = MathUtils.degToRad(VIEW.fov / 2);
    const bottom = Math.atan((1 - 2 * safeBottom) * tanV);
    const m = VIEW.margin * 2 * half;
    const dWidth = radius / tanH + radius * 0.35;
    const dTop = (VIEW.top - VIEW.eye) / Math.tan(half + pitch - m);
    const dBottom = radius * 0.6 + VIEW.eye / Math.tan(Math.max(0.05, bottom - pitch - m));
    const distance = Math.max(dWidth, dTop, dBottom);
    camera.position.set(0, VIEW.eye, distance);
    camera.lookAt(0, VIEW.eye + Math.tan(pitch) * distance, 0);
    camera.updateProjectionMatrix();
    scene.fog.near = distance + 12;
    scene.fog.far = distance + 170;

    // Backdrop: covers the whole (offset) view; its horizon row sits exactly on the camera's horizon.
    const L = BACKDROP_DISTANCE;
    const hView = 2 * L * tanV;
    const wView = hView * camera.aspect;
    const hv = palette.sky.horizonV;
    const yHorizon = -L * Math.tan(pitch);
    // Only the sky must be covered: below the horizon the forecourt and its haze take over.
    const hp = 1.04 * Math.max(wView / 2, (hView / 2 - yHorizon) / (1 - hv));
    backdrop.scale.set(hp * 2, hp, 1);
    backdrop.position.set(0, yHorizon + hp * (0.5 - hv), -L);
  };

  const rotation = createScrollRotation({ reducedMotion, readingCenter });
  rotation.measure();
  let current = rotation.target();
  let raf = 0;
  let last = 0;
  let disposed = false;
  let lost = false;
  let facade = '';
  let frames = 0;

  const draw = () => {
    pivot.rotation.y = current;
    renderer.render(scene, camera);
    frames += 1;
    canvas.dataset.angle = current.toFixed(4);
    canvas.dataset.frames = String(frames);
    const next = facadeFor(current);
    if (next !== facade) {
      facade = next;
      if (onFacade) onFacade(next);
    }
  };

  const tick = (now) => {
    raf = 0;
    if (disposed || lost) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const target = rotation.target();
    if (reducedMotion) {
      current = target;
    } else {
      current += (target - current) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(target - current) < 0.0005) current = target;
    }
    draw();
    if (current !== target) raf = window.requestAnimationFrame(tick);
    else last = 0;
  };
  const request = () => {
    if (!raf && !disposed && !lost) raf = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    renderer.setSize(width, height, false);
    fit(width, height);
    rotation.measure();
    request();
  };

  const onLost = (event) => {
    event.preventDefault();
    lost = true;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    if (onFailure) onFailure(new Error('WebGL context lost'));
  };

  window.addEventListener('scroll', request, { passive: true });
  canvas.addEventListener('webglcontextlost', onLost);
  const stageObserver = new ResizeObserver(resize);
  stageObserver.observe(container);
  const pageObserver = new ResizeObserver(() => { rotation.measure(); request(); });
  pageObserver.observe(document.body);

  // The backdrop and the wall stone arrive before the first frame is shown; the rest stream in.
  const jobs = textureJobs(materials, { anisotropy: Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy()) });
  const runJob = async (job) => {
    try {
      await job();
    } catch (error) {
      console.warn('[diwan] texture failed to load; keeping its flat colour', error);
    }
  };
  await Promise.all(jobs.splice(0, 3).map(runJob));
  if (disposed || lost) throw new Error('3D scene stopped while loading');

  resize();
  draw();

  (async () => {
    for (const job of jobs) {
      await idle();
      if (disposed || lost) return;
      await runJob(job);
      request();
    }
    canvas.dataset.textures = 'ready';
  })();

  if (capture) {
    window.__diwanCapture = {
      setAngle(angle) { current = angle; draw(); },
      texturesReady: () => canvas.dataset.textures === 'ready',
    };
  }

  return {
    get angle() { return current; },
    dispose() {
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      canvas.removeEventListener('webglcontextlost', onLost);
      stageObserver.disconnect();
      pageObserver.disconnect();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      for (const material of Object.values(materials)) {
        for (const key of ['map', 'bumpMap']) if (material[key]) material[key].dispose();
        material.dispose();
      }
      environment.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Soft contact shade under the building (ambient occlusion where walls meet the
 * forecourt). It turns with the building; there is no visible base.
 */
function contactShade(width, depth, centreZ) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  // Stacked translucent rounded rectangles: dense under the walls, fading outwards (alphaMap = green).
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const inset = t * size * 0.32;
    const r = size * 0.2 * (1 - t) + 6;
    const x = inset;
    const w = size - inset * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.beginPath();
    ctx.moveTo(x + r, x);
    ctx.arcTo(x + w, x, x + w, x + w, r);
    ctx.arcTo(x + w, x + w, x, x + w, r);
    ctx.arcTo(x, x + w, x, x, r);
    ctx.arcTo(x, x, x + w, x, r);
    ctx.fill();
  }
  const material = new MeshBasicMaterial({
    color: 0x3a2c1c, alphaMap: new CanvasTexture(canvas), transparent: true, opacity: 0.55, depthWrite: false,
  });
  const geo = new PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geo, material);
  mesh.position.set(0, 0.012, centreZ);
  mesh.renderOrder = 1;
  mesh.name = 'contact-shade';
  return mesh;
}

/** Low stone parapet closing the forecourt, far behind the building (it does not turn). */
function terraceWall(materials) {
  const group = new Group();
  group.name = 'terrace-wall';
  const length = 160;
  const wall = new Mesh(box(length, 0.8, 0.5), materials.wall);
  wall.position.set(0, 0.4, -17);
  const coping = new Mesh(box(length, 0.1, 0.62), materials.dressed);
  coping.position.set(0, 0.85, -17);
  for (const mesh of [wall, coping]) {
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
