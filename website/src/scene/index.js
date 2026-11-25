/**
 * Mounts the 3D diwan scene into the fixed stage.
 *
 * Rendering is on demand: a frame is drawn only while the model is easing
 * towards its scroll-driven angle, after a resize, or when a texture arrives.
 * Nothing renders while the page is idle.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group, Mesh,
  CylinderGeometry, CircleGeometry, Vector3, MathUtils, ACESFilmicToneMapping, SRGBColorSpace,
  PCFSoftShadowMap, PMREMGenerator,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, textureJobs } from './materials.js';
import { buildDiwan } from './building.js';
import { buildOliveTree } from './olive-tree.js';
import { createScrollRotation, facadeFor } from './scroll-rotation.js';
import { scaleUV } from './geometry-utils.js';
import { readingCenter } from '../ui/reading.js';

const QUALITY = {
  high: { dpr: 1.75, shadows: true, shadowMap: 2048, leaves: 7200, texture: 1024, antialias: true },
  mid: { dpr: 1.4, shadows: true, shadowMap: 1024, leaves: 4200, texture: 512, antialias: true },
  low: { dpr: 1, shadows: false, shadowMap: 0, leaves: 1800, texture: 512, antialias: false },
};

/** Framing volume around the turntable axis (metres). */
const FRAME = { radius: 7.35, top: 5.9, bottom: -0.45, elevationDeg: 14, lift: 0.55 };

const idle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 400 });
  else window.setTimeout(resolve, 32);
});

export async function mountDiwanScene({ canvas, container, tier = 'mid', reducedMotion = false, onFacade, onFailure }) {
  const quality = QUALITY[tier] || QUALITY.mid;
  const capture = new URLSearchParams(window.location.search).has('capture');

  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas, alpha: true, antialias: quality.antialias, powerPreference: 'high-performance',
      preserveDrawingBuffer: capture,
    });
  } catch (error) {
    throw new Error(`WebGL renderer unavailable: ${error && error.message ? error.message : error}`);
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.24;
  if (typeof room.dispose === 'function') room.dispose();
  pmrem.dispose();

  // Late-afternoon sun from the front-right, sky/ground bounce and a cool rim fill.
  scene.add(new HemisphereLight(0xe4ebf4, 0xa98f6a, 0.5));
  const sun = new DirectionalLight(0xffd9a8, 3.2);
  sun.position.set(8.5, 9.5, 8);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    const cam = sun.shadow.camera;
    cam.left = -9; cam.right = 9; cam.top = 9; cam.bottom = -9; cam.near = 2; cam.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
  }
  scene.add(sun, sun.target);
  const rim = new DirectionalLight(0xc8d5ea, 0.5);
  rim.position.set(-9, 6, -7);
  scene.add(rim);

  // Model on a turntable. The composition (house + tree) is centred on the axis.
  const materials = createMaterials();
  const jobs = textureJobs(materials, quality.texture);
  jobs.shift()(); // the wall stone is generated before the first frame; the rest stream in

  const pivot = new Group();
  pivot.name = 'turntable';
  scene.add(pivot);
  const composition = new Group();
  composition.position.x = 2.0;
  pivot.add(composition);
  composition.add(buildDiwan(materials));
  const tree = buildOliveTree(materials, { leafCount: quality.leaves });
  tree.position.set(-5.15, 0, 1.55);
  tree.rotation.y = 0.3;
  tree.scale.setScalar(1.18);
  composition.add(tree);
  pivot.add(buildGround(materials));

  const camera = new PerspectiveCamera(30, 1, 0.5, 120);
  const lookTarget = new Vector3();
  const fit = (width, height) => {
    camera.aspect = width / height;
    const vfov = MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const halfHeight = (FRAME.top - FRAME.bottom) / 2;
    const distance = Math.max(FRAME.radius / Math.tan(hfov / 2), halfHeight / Math.tan(vfov / 2)) + FRAME.radius * 0.3;
    const elevation = MathUtils.degToRad(FRAME.elevationDeg);
    lookTarget.set(0, FRAME.bottom + halfHeight - FRAME.lift, 0);
    camera.position.set(0, lookTarget.y + Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();
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

  resize();
  draw();

  // Progressive texturing: one generated texture set per idle slot.
  (async () => {
    for (const job of jobs) {
      await idle();
      if (disposed || lost) return;
      job();
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

/** Round stone plinth the model stands on (a turntable base). */
function buildGround(materials) {
  const group = new Group();
  const radius = 6.9;
  const top = scaleUV(new CircleGeometry(radius, 96), radius * 2, radius * 2);
  top.rotateX(-Math.PI / 2);
  const topMesh = new Mesh(top, materials.paving);
  topMesh.position.y = 0.002;
  topMesh.receiveShadow = true;
  const side = scaleUV(new CylinderGeometry(radius, radius + 0.1, 0.32, 96, 1, true), 2 * Math.PI * radius, 0.32);
  const sideMesh = new Mesh(side, materials.dressed);
  sideMesh.position.y = -0.16;
  const base = new Mesh(new CylinderGeometry(radius + 0.25, radius + 0.3, 0.1, 96), materials.plinth);
  base.position.y = -0.37;
  group.add(topMesh, sideMesh, base);
  return group;
}
