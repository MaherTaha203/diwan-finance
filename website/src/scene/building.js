/**
 * Procedural model of a Palestinian village guest house (diwan) inspired by the
 * official logo: a limestone block with a dome, an arched oak door with a
 * dressed-stone surround, a carved eight-petal rosette panel, a portico with a
 * terracotta-tiled gable roof on two navy columns — and real side and back
 * facades (barred windows, rain spouts, an external stair to the roof).
 *
 * It is an architectural interpretation of the logo, not a survey of the
 * historical building.
 *
 * Units are metres. The front faces +Z; y = 0 is the ground.
 */
import {
  Shape, Path, ExtrudeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, ShapeGeometry,
  IcosahedronGeometry, InstancedMesh, Mesh, Group, Matrix4, Quaternion, Vector3, Color,
} from 'three';
import { box, scaleUV, M, GeometryBatch } from './geometry-utils.js';
import { mulberry32 } from './textures.js';

export const DIM = { W: 7.2, D: 5.6, H: 3.7, T: 0.45 };
const DOOR = { cx: -0.5, hw: 0.68, spring: 1.75 };
const WINDOW = { w: 0.8, h: 1.05, y0: 1.0 };

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);

const extrude = (shape, depth, bevel = null) => new ExtrudeGeometry(shape, {
  depth, steps: 1, curveSegments: 28,
  bevelEnabled: Boolean(bevel), ...(bevel || {}),
});

const rectHole = (cx, y0, w, h) => {
  const p = new Path();
  p.moveTo(cx - w / 2, y0);
  p.lineTo(cx + w / 2, y0);
  p.lineTo(cx + w / 2, y0 + h);
  p.lineTo(cx - w / 2, y0 + h);
  p.closePath();
  return p;
};

const wallShape = (length, height, holes) => {
  const s = new Shape();
  s.moveTo(-length / 2, 0);
  s.lineTo(length / 2, 0);
  s.lineTo(length / 2, height);
  s.lineTo(-length / 2, height);
  s.closePath();
  s.holes.push(...holes);
  return s;
};

export function buildDiwan(materials, { seed = 1940 } = {}) {
  const { W, D, H, T } = DIM;
  const rand = mulberry32(seed);
  const batch = new GeometryBatch();
  const group = new Group();
  group.name = 'diwan';

  // Wall frames: local x runs along the wall, y up, z from the inner face (0) to the outer face (T).
  const frontM = M(0, 0, D / 2 - T);
  const backM = M(0, 0, -D / 2 + T, 0, Math.PI, 0);
  const rightM = M(W / 2 - T, 0, 0, 0, Math.PI / 2, 0);
  const leftM = M(-W / 2 + T, 0, 0, 0, -Math.PI / 2, 0);
  const at = (wallM, x, y, z, rx = 0, ry = 0, rz = 0) => wallM.clone().multiply(M(x, y, z, rx, ry, rz));

  const addWindow = (wallM, cx, y0, w, h, { grill = true } = {}) => {
    const zf = T * 0.45;
    const fw = 0.06;
    batch.add('glass', box(w - 0.04, h - 0.04, 0.02), at(wallM, cx, y0 + h / 2, zf - 0.035));
    batch.add('navy', box(fw, h, 0.08), at(wallM, cx - w / 2 + fw / 2, y0 + h / 2, zf));
    batch.add('navy', box(fw, h, 0.08), at(wallM, cx + w / 2 - fw / 2, y0 + h / 2, zf));
    batch.add('navy', box(w, fw, 0.08), at(wallM, cx, y0 + fw / 2, zf));
    batch.add('navy', box(w, fw, 0.08), at(wallM, cx, y0 + h - fw / 2, zf));
    batch.add('navy', box(0.045, h, 0.06), at(wallM, cx, y0 + h / 2, zf));
    batch.add('navy', box(w, 0.04, 0.06), at(wallM, cx, y0 + h * 0.64, zf));
    if (grill) {
      const zg = T - 0.07;
      for (let k = 1; k <= 4; k++) {
        batch.add('iron', new CylinderGeometry(0.011, 0.011, h, 6), at(wallM, cx - w / 2 + (w * k) / 5, y0 + h / 2, zg));
      }
      for (const f of [0.3, 0.72]) batch.add('iron', box(w, 0.022, 0.012), at(wallM, cx, y0 + h * f, zg));
    }
    batch.add('dressed', box(w + 0.26, 0.07, 0.22), at(wallM, cx, y0 - 0.035, T - 0.02));
    batch.add('dressed', box(w + 0.36, 0.22, 0.07), at(wallM, cx, y0 + h + 0.11, T + 0.035));
  };

  /* ── Front wall with the arched doorway ──────────────────────────────── */
  const { cx, hw, spring } = DOOR;
  const front = new Shape();
  front.moveTo(-W / 2, 0);
  front.lineTo(cx - hw, 0);
  front.lineTo(cx - hw, spring);
  front.absarc(cx, spring, hw, Math.PI, 0, true);
  front.lineTo(cx + hw, 0);
  front.lineTo(W / 2, 0);
  front.lineTo(W / 2, H);
  front.lineTo(-W / 2, H);
  front.closePath();
  batch.add('stone', extrude(front, T), frontM);

  // Oak door leaves recessed in the reveal, iron studs and a ring knocker.
  const doorShape = new Shape();
  doorShape.moveTo(cx - hw, 0);
  doorShape.lineTo(cx - hw, spring);
  doorShape.absarc(cx, spring, hw, Math.PI, 0, true);
  doorShape.lineTo(cx + hw, 0);
  doorShape.closePath();
  const dz = T * 0.3;
  batch.add('wood', extrude(doorShape, 0.07), at(frontM, 0, 0, dz));
  batch.add('woodDark', box(0.016, spring + hw - 0.02, 0.012), at(frontM, cx, (spring + hw) / 2, dz + 0.076));
  for (const yb of [0.42, 1.38]) batch.add('woodDark', box(hw * 2 - 0.04, 0.05, 0.014), at(frontM, cx, yb, dz + 0.077));
  const studZ = dz + 0.085;
  for (const xs of [-0.47, -0.17, 0.17, 0.47]) {
    for (const ys of [0.28, 0.68, 1.08, 1.6]) batch.add('iron', new SphereGeometry(0.018, 8, 6), at(frontM, cx + xs, ys, studZ));
  }
  batch.add('iron', new TorusGeometry(0.055, 0.011, 8, 20), at(frontM, cx + 0.14, 1.1, studZ + 0.025));
  batch.add('iron', new CylinderGeometry(0.03, 0.03, 0.016, 12), at(frontM, cx + 0.14, 1.155, studZ, Math.PI / 2));

  // Dressed-stone arch surround with a keystone.
  const ow = hw + 0.2;
  const surround = new Shape();
  surround.moveTo(cx - ow, 0);
  surround.lineTo(cx - ow, spring);
  surround.absarc(cx, spring, ow, Math.PI, 0, true);
  surround.lineTo(cx + ow, 0);
  surround.lineTo(cx + hw, 0);
  surround.lineTo(cx + hw, spring);
  surround.absarc(cx, spring, hw, 0, Math.PI, false);
  surround.lineTo(cx - hw, 0);
  surround.closePath();
  batch.add('dressed', extrude(surround, 0.07), at(frontM, 0, 0, T));
  batch.add('dressed', box(0.24, 0.34, 0.1), at(frontM, cx, spring + hw + 0.1, T + 0.05));

  // Carved eight-petal rosette panel (to the right of the door, as in the logo).
  const rx = 2.2;
  const ry = 1.95;
  batch.add('dressed', box(1.06, 1.06, 0.05), at(frontM, rx, ry, T + 0.025));
  const frame = new Shape();
  frame.moveTo(-0.53, -0.53);
  frame.lineTo(0.53, -0.53);
  frame.lineTo(0.53, 0.53);
  frame.lineTo(-0.53, 0.53);
  frame.closePath();
  frame.holes.push(rectHole(0, -0.43, 0.86, 0.86));
  batch.add('dressed', extrude(frame, 0.035), at(frontM, rx, ry, T + 0.05));
  const petal = new Shape();
  petal.moveTo(0, 0.075);
  petal.quadraticCurveTo(0.1, 0.2, 0, 0.36);
  petal.quadraticCurveTo(-0.1, 0.2, 0, 0.075);
  const bevel = { bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 };
  for (let k = 0; k < 8; k++) {
    batch.add('dressed', extrude(petal, 0.022, bevel), at(frontM, rx, ry, T + 0.05, 0, 0, (k * Math.PI) / 4));
  }
  batch.add('dressed', new TorusGeometry(0.4, 0.014, 6, 56), at(frontM, rx, ry, T + 0.056));
  batch.add('dressed', new CylinderGeometry(0.065, 0.075, 0.06, 24), at(frontM, rx, ry, T + 0.08, Math.PI / 2));

  /* ── Side walls and back wall ─────────────────────────────────────────── */
  const sideLen = D - 2 * T;
  const sideXs = [-1.1, 1.1];
  for (const wallM of [rightM, leftM]) {
    const holes = sideXs.map((x) => rectHole(x, WINDOW.y0, WINDOW.w, WINDOW.h));
    batch.add('stone', extrude(wallShape(sideLen, H, holes), T), wallM);
    for (const x of sideXs) addWindow(wallM, x, WINDOW.y0, WINDOW.w, WINDOW.h);
  }
  const backHoles = [rectHole(2.1, WINDOW.y0, WINDOW.w, WINDOW.h), rectHole(-1.6, 2.8, 0.5, 0.36)];
  batch.add('stone', extrude(wallShape(W, H, backHoles), T), backM);
  addWindow(backM, 2.1, WINDOW.y0, WINDOW.w, WINDOW.h);
  addWindow(backM, -1.6, 2.8, 0.5, 0.36, { grill: false });

  /* ── Base course ──────────────────────────────────────────────────────── */
  const plH = 0.38;
  const po = 0.05;
  const doorL = cx - ow;
  const doorR = cx + ow;
  const fa = doorL - (-W / 2 - po);
  const fb = W / 2 + po - doorR;
  batch.add('plinth', box(fa, plH, 0.1), M(-W / 2 - po + fa / 2, plH / 2, D / 2));
  batch.add('plinth', box(fb, plH, 0.1), M(doorR + fb / 2, plH / 2, D / 2));
  batch.add('plinth', box(W + 2 * po, plH, 0.1), M(0, plH / 2, -D / 2));
  batch.add('plinth', box(0.1, plH, D), M(-W / 2, plH / 2, 0));
  batch.add('plinth', box(0.1, plH, D), M(W / 2, plH / 2, 0));

  /* ── Cornice, roof, parapet with coping ───────────────────────────────── */
  batch.add('dressed', box(W + 0.16, 0.14, D + 0.16), M(0, H + 0.07, 0));
  batch.add('plaster', box(W - 0.02, 0.1, D - 0.02), M(0, H + 0.19, 0));
  const pH = 0.42;
  const pT = 0.24;
  const pY = H + 0.14 + pH / 2;
  const cY = H + 0.14 + pH + 0.03;
  const parapet = (x, z, lx, lz) => {
    batch.add('stone', box(lx, pH, lz), M(x, pY, z));
    batch.add('dressed', box(lx + 0.06, 0.06, lz + 0.06), M(x, cY, z));
  };
  parapet(0, D / 2 - pT / 2, W, pT);
  parapet(-W / 2 + pT / 2, 0, pT, D - 2 * pT);
  parapet(W / 2 - pT / 2, 0, pT, D - 2 * pT);
  const gapA = -0.62;
  const gapB = 0.2;
  parapet((-W / 2 + gapA) / 2, -D / 2 + pT / 2, gapA + W / 2, pT);
  parapet((gapB + W / 2) / 2, -D / 2 + pT / 2, W / 2 - gapB, pT);

  // Clay rain spouts.
  batch.add('clay', new CylinderGeometry(0.05, 0.065, 0.55, 12), M(W / 2 + 0.22, H + 0.26, -1.4, 0, 0, Math.PI / 2));
  batch.add('clay', new CylinderGeometry(0.05, 0.065, 0.55, 12), M(-W / 2 - 0.22, H + 0.26, 1.2, 0, 0, Math.PI / 2));

  /* ── Dome on a low drum ───────────────────────────────────────────────── */
  const roofTop = H + 0.24;
  const domeX = 0.35;
  const domeZ = -0.35;
  const R = 1.62;
  const drum = scaleUV(new CylinderGeometry(R, R + 0.03, 0.34, 64, 1, true), 2 * Math.PI * R, 0.34);
  batch.add('dome', drum, M(domeX, roofTop + 0.17, domeZ));
  const domeGeo = scaleUV(new SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), 2 * Math.PI * R, (Math.PI / 2) * R);
  domeGeo.scale(1, 0.8, 1);
  batch.add('dome', domeGeo, M(domeX, roofTop + 0.34, domeZ));
  batch.add('dressed', new TorusGeometry(R + 0.02, 0.04, 8, 72), M(domeX, roofTop + 0.36, domeZ, Math.PI / 2));

  /* ── Portico: paved floor, navy columns, timber frame, gable roof ─────── */
  const colZ = D / 2 + 1.2;
  const roofZ1 = D / 2 + 1.65;
  const colXs = [cx - 1.25, cx + 1.25];
  batch.add('paving', box(3.5, 0.12, 1.62), M(cx, 0.06, D / 2 + 0.81));
  batch.add('dressed', box(1.7, 0.06, 0.28), M(cx, 0.03, D / 2 + 1.62 + 0.14));
  for (const x of colXs) {
    batch.add('dressed', box(0.34, 0.16, 0.34), M(x, 0.2, colZ));
    batch.add('navy', new CylinderGeometry(0.105, 0.12, 2.32, 28), M(x, 0.28 + 1.16, colZ));
    batch.add('navy', new CylinderGeometry(0.165, 0.11, 0.12, 28), M(x, 2.66, colZ));
    batch.add('dressed', box(0.36, 0.08, 0.36), M(x, 2.76, colZ));
    batch.add('woodDark', box(0.16, 0.14, 1.22), M(x, 2.87, D / 2 + 0.6));
  }
  batch.add('woodDark', box(3.05, 0.16, 0.18), M(cx, 2.88, colZ));
  batch.add('woodDark', box(3.05, 0.14, 0.14), M(cx, 2.9, D / 2 + 0.07));

  const roof = { cx, yr: 3.52, ye: 2.97, half: 1.78, z0: D / 2, z1: roofZ1 };
  roof.th = Math.atan2(roof.yr - roof.ye, roof.half);
  roof.L = Math.hypot(roof.half, roof.yr - roof.ye);
  const depth = roof.z1 - roof.z0;
  const zc = (roof.z0 + roof.z1) / 2;
  const midY = (roof.yr + roof.ye) / 2;
  for (const s of [-1, 1]) {
    batch.add('woodDark', box(roof.L + 0.06, 0.045, depth), M(cx + (s * roof.half) / 2, midY - 0.025, zc, 0, 0, -s * roof.th));
    batch.add('woodDark', box(roof.L + 0.1, 0.09, 0.05), M(cx + (s * roof.half) / 2, midY - 0.04, roof.z1 + 0.02, 0, 0, -s * roof.th));
  }
  const gable = new Shape();
  gable.moveTo(-roof.half, 0);
  gable.lineTo(roof.half, 0);
  gable.lineTo(0, roof.yr - roof.ye);
  gable.closePath();
  batch.add('woodDark', new ShapeGeometry(gable), M(cx, roof.ye, roof.z1 - 0.03));

  /* ── External stair to the roof along the back wall ───────────────────── */
  const steps = 12;
  const rise = roofTop / steps;
  const run = 0.33;
  const stairX0 = 3.5;
  const stairZ = -D / 2 - 0.475;
  for (let k = 0; k < steps; k++) {
    const h = (k + 1) * rise;
    const x = stairX0 - (k + 0.5) * run;
    batch.add('stone', box(run, h, 0.95), M(x, h / 2, stairZ));
    batch.add('dressed', box(run + 0.03, 0.04, 0.99), M(x, h + 0.02, stairZ));
    // Stepped stone parapet along the open edge of the stair, with dressed coping.
    const railZ = stairZ - 0.475 + 0.09;
    batch.add('stone', box(run, 0.5, 0.18), M(x, h + 0.25, railZ));
    batch.add('dressed', box(run + 0.02, 0.05, 0.22), M(x, h + 0.525, railZ));
  }

  /* ── A few rosemary shrubs ─────────────────────────────────────────────── */
  const hash = (x, y, z) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const shrub = (x, z, r) => {
    const g = new IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 0.82 + 0.32 * hash(+p.getX(i).toFixed(3), +p.getY(i).toFixed(3), +p.getZ(i).toFixed(3));
      p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.72, p.getZ(i) * f);
    }
    g.computeVertexNormals();
    batch.add('shrub', g, M(x, r * 0.55, z));
  };
  shrub(1.6, 4.3, 0.34);
  shrub(-2.6, 4.15, 0.3);
  shrub(3.95, 1.5, 0.36);
  shrub(3.9, 2.25, 0.26);
  shrub(-3.95, -2.15, 0.32);

  for (const [key, geometry] of batch.merged()) {
    const mesh = new Mesh(geometry, materials[key]);
    mesh.name = key;
    mesh.castShadow = key !== 'glass';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.add(buildRoofTiles(materials.tile, roof, rand));
  return group;
}

/** Spanish-style pan and cap tiles laid in rows down both slopes, plus ridge caps. */
function buildRoofTiles(material, roof, rand) {
  const geometry = new CylinderGeometry(0.088, 0.088, 0.36, 8, 1, true, -Math.PI / 2, Math.PI);
  geometry.rotateX(-Math.PI / 2); // bulge → +Y, axis → Z
  geometry.rotateY(Math.PI / 2); // axis → X
  const flip = new Quaternion().setFromAxisAngle(AXIS_X, Math.PI);
  const pitch = 0.176;
  const rows = [];
  for (let u = 0.18; u < roof.L - 0.05; u += 0.3) rows.push(u);
  const columns = Math.floor((roof.z1 - roof.z0 - 0.12) / pitch) + 1;
  const items = [];
  for (const s of [-1, 1]) {
    const slope = new Quaternion().setFromAxisAngle(AXIS_Z, s < 0 ? roof.th : -roof.th);
    const normal = new Vector3(s * Math.sin(roof.th), Math.cos(roof.th), 0);
    rows.forEach((u, i) => {
      const base = new Vector3(roof.cx + s * u * Math.cos(roof.th), roof.yr - u * Math.sin(roof.th), 0);
      const stack = (rows.length - i) * 0.004;
      for (let k = 0; k < columns; k++) {
        const z = roof.z0 + 0.06 + k * pitch;
        items.push({ p: base.clone().addScaledVector(normal, 0.012 + stack).setZ(z), q: slope.clone().multiply(flip), cap: false });
        if (k < columns - 1) {
          items.push({ p: base.clone().addScaledVector(normal, 0.06 + stack).setZ(z + pitch / 2), q: slope.clone(), cap: true });
        }
      }
    });
  }
  const ridge = new Quaternion().setFromAxisAngle(AXIS_Y, Math.PI / 2);
  for (let z = roof.z0 + 0.15; z < roof.z1; z += 0.3) {
    items.push({ p: new Vector3(roof.cx, roof.yr + 0.07, z), q: ridge, cap: true, s: 1.15 });
  }

  const mesh = new InstancedMesh(geometry, material, items.length);
  const matrix = new Matrix4();
  const scale = new Vector3();
  const color = new Color();
  const palette = ['#b24b2a', '#a8452a', '#bd5a34', '#9e4126', '#c4673b', '#ad5030'];
  items.forEach((it, i) => {
    scale.setScalar(it.s || 1);
    matrix.compose(it.p, it.q, scale);
    mesh.setMatrixAt(i, matrix);
    color.set(palette[Math.floor(rand() * palette.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.05);
    if (!it.cap) color.multiplyScalar(0.84);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'tiles';
  return mesh;
}
