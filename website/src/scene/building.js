/**
 * Diwan Al-Taha — 3D conversion of the approved Figma design.
 *
 * The design (Figma frames 1:2–1:5) is a set of realistic renders from one
 * viewpoint. This module gives it the geometry needed to turn: proportions are
 * measured on the renders (1.30 m door ⇒ 127 px/m on the mobile render) and
 * the surfaces use textures cut from them (see materials.js). Nothing is added
 * to the front beyond what the renders show; the flanks and the back, which no
 * render shows, only repeat the design's own wall, coping and window.
 *
 * Units are metres. The front faces +Z, y = 0 is the ground, the footprint is
 * centred on the origin (the turning axis).
 */
import {
  Shape, Path, ExtrudeGeometry, ShapeGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry,
  TorusGeometry, InstancedMesh, Mesh, Group, Matrix4, Quaternion, Vector3, Color,
  BufferGeometry, Float32BufferAttribute,
} from 'three';
import { box, scaleUV, M, GeometryBatch } from './geometry-utils.js';
import { mulberry32 } from './random.js';
import { palette } from './materials.js';

/** Overall dimensions measured on the renders. */
export const DIM = {
  W: 7.4, // facade length
  D: 6.0, // depth (not visible on the renders; sized to carry the dome)
  H: 3.5, // wall body
  coping: 0.2, // projecting top course (total height 3.7 m)
  T: 0.5, // wall thickness
};
/** Door on the mobile render: 165 × 282 px at 127 px/m. */
const DOOR = { cx: 0.6, hw: 0.65, height: 2.22, y0: 0.16 };
DOOR.spring = DOOR.y0 + DOOR.height - DOOR.hw;
/** Voussoir ring: outer radius 122 px, jambs 38 px wide, imposts 1.44–1.60 m above the threshold. */
const ARCH = { outer: 0.96, impost: [1.44, 1.6] };
const ROSETTE = { x: DOOR.cx + 1.98, y: 1.62, size: 0.93 };
const PORTICO = { halfSpan: 1.2, colZ: 1.35, depth: 1.85, eave: 3.16, ridge: 3.95, overhang: 0.48 };
const WINDOW = { w: 0.92, h: 1.24, y0: 1.05 };

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);

const extrude = (shape, depth) => new ExtrudeGeometry(shape, { depth, steps: 1, curveSegments: 32, bevelEnabled: false });

const rectHole = (cx, y0, w, h) => {
  const p = new Path();
  p.moveTo(cx - w / 2, y0);
  p.lineTo(cx + w / 2, y0);
  p.lineTo(cx + w / 2, y0 + h);
  p.lineTo(cx - w / 2, y0 + h);
  p.closePath();
  return p;
};

const wallShape = (length, height, holes = []) => {
  const s = new Shape();
  s.moveTo(-length / 2, 0);
  s.lineTo(length / 2, 0);
  s.lineTo(length / 2, height);
  s.lineTo(-length / 2, height);
  s.closePath();
  s.holes.push(...holes);
  return s;
};

/** Replaces a geometry's UVs with a planar projection of its (local) x, y. */
function projectUV(geometry, fn) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const [u, v] = fn(pos.getX(i), pos.getY(i));
    uv.setXY(i, u, v);
  }
  return geometry;
}

/** Arch surround texture = the mobile render around the door (see figma-palette.json → arch). */
function archUV(x, y) {
  const { pxPerM, box: [x0, y0, x1, y1], axis: [ax, ay] } = palette.arch;
  const px = ax + (x - DOOR.cx) * pxPerM;
  const py = ay - (y - DOOR.y0) * pxPerM;
  return [(px - x0) / (x1 - x0), 1 - (py - y0) / (y1 - y0)];
}

export function buildDiwan(materials, { seed = 1940 } = {}) {
  const { W, D, H, T } = DIM;
  const rand = mulberry32(seed);
  const batch = new GeometryBatch();
  const group = new Group();
  group.name = 'diwan';

  // Wall frames: local x along the wall, y up, z from the inner face (0) to the outer face (T).
  const frontM = M(0, 0, D / 2 - T);
  const backM = M(0, 0, -D / 2 + T, 0, Math.PI, 0);
  const rightM = M(W / 2 - T, 0, 0, 0, Math.PI / 2, 0);
  const leftM = M(-W / 2 + T, 0, 0, 0, -Math.PI / 2, 0);
  const at = (wallM, x, y, z, rx = 0, ry = 0, rz = 0) => wallM.clone().multiply(M(x, y, z, rx, ry, rz));

  /* ── Front wall, door, arch surround, rosette ─────────────────────────── */
  const { cx, hw, spring, y0 } = DOOR;
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
  batch.add('wall', extrude(front, T), frontM);

  // Threshold stone filling the opening below the door.
  batch.add('dressed', box(hw * 2, y0, T), at(frontM, cx, y0 / 2, T / 2));

  // Door leaf: the render's own oak door, recessed in the reveal.
  const leaf = new Shape();
  leaf.moveTo(cx - hw, y0);
  leaf.lineTo(cx - hw, spring);
  leaf.absarc(cx, spring, hw, Math.PI, 0, true);
  leaf.lineTo(cx + hw, y0);
  leaf.closePath();
  const leafGeo = projectUV(new ShapeGeometry(leaf, 32), (x, y) => [(x - (cx - hw)) / (2 * hw), (y - y0) / DOOR.height]);
  batch.add('door', leafGeo, at(frontM, 0, 0, T * 0.42));

  // Voussoir ring and jambs, textured by projection of the render's arch surround.
  const ow = ARCH.outer;
  const surround = new Shape();
  surround.moveTo(cx - ow, y0);
  surround.lineTo(cx - ow, spring);
  surround.absarc(cx, spring, ow, Math.PI, 0, true);
  surround.lineTo(cx + ow, y0);
  surround.lineTo(cx + hw, y0);
  surround.lineTo(cx + hw, spring);
  surround.absarc(cx, spring, hw, 0, Math.PI, false);
  surround.lineTo(cx - hw, y0);
  surround.closePath();
  batch.add('arch', projectUV(extrude(surround, 0.05), archUV), at(frontM, 0, 0, T));
  for (const s of [-1, 1]) {
    const ix = cx + s * (hw + (ow - hw) / 2);
    const [ia, ib] = ARCH.impost;
    const impost = projectUV(box(ow - hw + 0.1, ib - ia, 0.1), (x, y) => archUV(x + ix, y + y0 + (ia + ib) / 2));
    batch.add('arch', impost, at(frontM, ix, y0 + (ia + ib) / 2, T + 0.05));
  }

  // Carved rosette panel: the close-up render's panel on its front face.
  const r = ROSETTE;
  batch.add('dressed', box(r.size, r.size, 0.05), at(frontM, r.x, r.y, T + 0.025));
  batch.add('rosette', new PlaneGeometry(r.size, r.size), at(frontM, r.x, r.y, T + 0.0505));

  /* ── Flanks and back: the same wall, coping and window as the design ──── */
  const sideLen = D - 2 * T;
  const addWindow = (wallM, wx) => {
    const { w, h, y0: wy } = WINDOW;
    const zf = T * 0.55;
    const f = 0.075;
    batch.add('glass', box(w - 0.06, h - 0.06, 0.02), at(wallM, wx, wy + h / 2, zf - 0.05));
    batch.add('navy', box(f, h, 0.09), at(wallM, wx - w / 2 + f / 2, wy + h / 2, zf));
    batch.add('navy', box(f, h, 0.09), at(wallM, wx + w / 2 - f / 2, wy + h / 2, zf));
    batch.add('navy', box(w, f, 0.09), at(wallM, wx, wy + f / 2, zf));
    batch.add('navy', box(w, f, 0.09), at(wallM, wx, wy + h - f / 2, zf));
    // Small-pane glazing bars, as on the renders' windows (3 × 4 panes).
    for (const k of [1, 2]) batch.add('iron', box(0.03, h - 2 * f, 0.04), at(wallM, wx - w / 2 + f + ((w - 2 * f) * k) / 3, wy + h / 2, zf));
    for (const k of [1, 2, 3]) batch.add('iron', box(w - 2 * f, 0.03, 0.04), at(wallM, wx, wy + f + ((h - 2 * f) * k) / 4, zf));
    batch.add('dressed', box(w + 0.24, 0.08, 0.16), at(wallM, wx, wy - 0.04, T + 0.03));
    batch.add('dressed', box(w + 0.3, 0.22, 0.06), at(wallM, wx, wy + h + 0.11, T + 0.03));
  };
  for (const wallM of [rightM, leftM]) {
    batch.add('wall', extrude(wallShape(sideLen, H, [rectHole(0, WINDOW.y0, WINDOW.w, WINDOW.h)]), T), wallM);
    addWindow(wallM, 0);
  }
  const backXs = [-1.7, 1.7];
  batch.add('wall', extrude(wallShape(W, H, backXs.map((x) => rectHole(x, WINDOW.y0, WINDOW.w, WINDOW.h))), T), backM);
  backXs.forEach((x) => addWindow(backM, x));

  /* ── Coping: a projecting course of separate dressed blocks ───────────── */
  const cop = DIM.coping;
  const copingRun = (x0, z0, along, length, outward) => {
    let s = 0;
    while (s < length - 0.05) {
      const len = Math.min(length - s, 0.42 + rand() * 0.24);
      const mid = s + len / 2;
      const px = x0 + along.x * mid + outward.x * 0.03;
      const pz = z0 + along.z * mid + outward.z * 0.03;
      const geo = along.x !== 0 ? box(len - 0.025, cop, T + 0.1) : box(T + 0.1, cop, len - 0.025);
      batch.add('dressed', geo, M(px, H + cop / 2, pz));
      s += len;
    }
  };
  copingRun(-W / 2, D / 2 - T / 2, { x: 1, z: 0 }, W, { x: 0, z: 1 });
  copingRun(-W / 2, -D / 2 + T / 2, { x: 1, z: 0 }, W, { x: 0, z: -1 });
  copingRun(W / 2 - T / 2, -D / 2 + T, { x: 0, z: 1 }, D - 2 * T, { x: 1, z: 0 });
  copingRun(-W / 2 + T / 2, -D / 2 + T, { x: 0, z: 1 }, D - 2 * T, { x: -1, z: 0 });

  // Flat roof slab behind the coping.
  batch.add('plaster', box(W - 2 * T + 0.02, 0.12, D - 2 * T + 0.02), M(0, H - 0.06, 0));

  /* ── Base course (split around the portico platform at the front) ─────── */
  const baseH = 0.32;
  const bo = 0.05;
  const platL = cx - PORTICO.halfSpan - 0.45;
  const platR = cx + PORTICO.halfSpan + 0.45;
  const fa = platL - (-W / 2 - bo);
  const fb = W / 2 + bo - platR;
  batch.add('dressed', box(fa, baseH, 0.1), M(-W / 2 - bo + fa / 2, baseH / 2, D / 2));
  batch.add('dressed', box(fb, baseH, 0.1), M(platR + fb / 2, baseH / 2, D / 2));
  batch.add('dressed', box(W + 2 * bo, baseH, 0.1), M(0, baseH / 2, -D / 2));
  batch.add('dressed', box(0.1, baseH, D), M(-W / 2, baseH / 2, 0));
  batch.add('dressed', box(0.1, baseH, D), M(W / 2, baseH / 2, 0));

  /* ── Dome on a low drum hidden behind the coping ──────────────────────── */
  const R = 1.75;
  const domeX = cx + 0.75;
  const domeZ = -0.3;
  const domeBase = H + 0.08;
  const drum = scaleUV(new CylinderGeometry(R, R, 0.3, 72, 1, true), 2 * Math.PI * R, 0.3);
  batch.add('wall', drum, M(domeX, domeBase - 0.15, domeZ));
  const domeGeo = new SphereGeometry(R, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.scale(1, 0.88, 1);
  batch.add('dome', domeGeo, M(domeX, domeBase, domeZ));

  /* ── Portico: platform, navy columns on stone bases, timber frame, tiled gable ─ */
  const p = PORTICO;
  const zWall = D / 2;
  const colZ = zWall + p.colZ;
  const colXs = [cx - p.halfSpan, cx + p.halfSpan];
  const platDepth = p.colZ + 0.42;
  batch.add('dressed', box(platR - platL, 0.16, platDepth), M(cx, 0.08, zWall + platDepth / 2));
  batch.add('dressed', box(hw * 2 + 0.5, 0.08, 0.36), M(cx, 0.2, zWall + 0.18));
  for (const x of colXs) {
    batch.add('dressed', box(0.44, 0.5, 0.44), M(x, 0.16 + 0.25, colZ));
    batch.add('navy', new CylinderGeometry(0.13, 0.145, 2.12, 32), M(x, 0.66 + 1.06, colZ));
    batch.add('navy', new TorusGeometry(0.145, 0.03, 10, 32), M(x, 2.8, colZ, Math.PI / 2));
    batch.add('navy', new CylinderGeometry(0.2, 0.14, 0.1, 32), M(x, 2.86, colZ));
    batch.add('dressed', box(0.42, 0.1, 0.42), M(x, 2.96, colZ));
    batch.add('timber', box(0.16, 0.16, p.colZ + 0.3), M(x, 3.09, zWall + (p.colZ + 0.3) / 2));
  }
  batch.add('timber', box(p.halfSpan * 2 + 0.55, 0.18, 0.18), M(cx, 3.1, colZ));
  batch.add('timber', box(p.halfSpan * 2 + 0.55, 0.14, 0.14), M(cx, 3.1, zWall + 0.07));

  // Half-hip roof against the facade: a tiled triangle faces the street (as on the day render and
  // the logo), two tiled side triangles fall to the flanks, the apex meets the wall above the door.
  const half = p.halfSpan + p.overhang;
  const roof = {
    apex: new Vector3(cx, p.ridge, zWall),
    fl: new Vector3(cx - half, p.eave, zWall + p.depth),
    fr: new Vector3(cx + half, p.eave, zWall + p.depth),
    bl: new Vector3(cx - half, p.eave, zWall),
    br: new Vector3(cx + half, p.eave, zWall),
  };
  const faces = [[roof.apex, roof.fl, roof.fr], [roof.apex, roof.bl, roof.fl], [roof.apex, roof.fr, roof.br]];
  // Boarded deck just under the tiles (seen from below between the beams).
  batch.add('timber', triangles(faces, -0.03), null);
  // Fascia boards along the three eaves.
  const fascia = (a, b) => {
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
    batch.add('timber', box(len + 0.08, 0.13, 0.06), M(mid.x, mid.y - 0.05, mid.z, 0, yaw, 0));
  };
  fascia(roof.fl, roof.fr);
  fascia(roof.bl, roof.fl);
  fascia(roof.fr, roof.br);

  for (const [key, geometry] of batch.merged()) {
    const mesh = new Mesh(geometry, materials[key]);
    mesh.name = key;
    mesh.castShadow = key !== 'glass' && key !== 'rosette' && key !== 'door';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.add(buildRoofTiles(materials.tile, faces, rand));
  return group;
}

/** Triangles (with UVs in metres) offset along their normal — used for the roof deck. */
function triangles(faces, offset) {
  const positions = [];
  const uvs = [];
  for (const [a, b, c] of faces) {
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    for (const v of [a, b, c]) {
      const p = v.clone().addScaledVector(n, offset);
      positions.push(p.x, p.y, p.z);
      uvs.push(p.x + p.z, p.y);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Pan-and-cap clay tiles laid in courses on each roof triangle (apex, eave start, eave end),
 * trimmed by the hips, with cap tiles along the hips. Colours sampled from the render's roof.
 */
function buildRoofTiles(material, faces, rand) {
  const geometry = new CylinderGeometry(0.088, 0.088, 0.36, 8, 1, true, -Math.PI / 2, Math.PI);
  geometry.rotateX(-Math.PI / 2); // bulge → +Y, axis → Z
  geometry.rotateY(Math.PI / 2); // axis → X (local X = down the slope)
  const flip = new Quaternion().setFromAxisAngle(AXIS_X, Math.PI);
  const pitch = 0.176;
  const course = 0.3;
  const items = [];
  const basis = new Matrix4();

  for (const [apex, e0, e1] of faces) {
    const eaveMid = e0.clone().add(e1).multiplyScalar(0.5);
    const fallLen = apex.distanceTo(eaveMid);
    const row = e1.clone().sub(e0).normalize();
    const fall = eaveMid.clone().sub(apex).normalize(); // down the slope
    const normal = new Vector3().crossVectors(row, fall).normalize();
    if (normal.y < 0) normal.negate();
    const q = new Quaternion().setFromRotationMatrix(basis.makeBasis(fall, normal, row.clone().cross(fall).dot(normal) > 0 ? row : row.clone().negate()));
    let k = 0;
    for (let u = 0.16; u < fallLen - 0.12; u += course, k++) {
      const t = u / fallLen; // 0 at the eave → 1 at the apex
      const a = e0.clone().lerp(apex, t);
      const b = e1.clone().lerp(apex, t);
      const len = a.distanceTo(b);
      const n = Math.floor((len - 0.1) / pitch);
      if (n < 1) continue;
      const start = (len - (n - 1) * pitch) / 2;
      const lift = (fallLen - u) * 0.004;
      for (let i = 0; i < n; i++) {
        const pos = a.clone().addScaledVector(row, start + i * pitch).addScaledVector(normal, 0.012 + lift);
        items.push({ p: pos, q: q.clone().multiply(flip), cap: false });
        if (i < n - 1) items.push({ p: pos.clone().addScaledVector(row, pitch / 2).addScaledVector(normal, 0.048), q: q.clone(), cap: true });
      }
    }
  }
  // Cap tiles along the two front hips.
  const [front] = faces;
  for (const corner of [front[1], front[2]]) {
    const dir = corner.clone().sub(front[0]);
    const len = dir.length();
    dir.normalize();
    const side = new Vector3().crossVectors(dir, AXIS_Y).normalize();
    const up = new Vector3().crossVectors(side, dir).normalize();
    const q = new Quaternion().setFromRotationMatrix(basis.makeBasis(dir, up, new Vector3().crossVectors(dir, up)));
    for (let s = 0.12; s < len; s += 0.3) {
      items.push({ p: front[0].clone().addScaledVector(dir, s).addScaledVector(up, 0.09), q, cap: true, s: 1.12 });
    }
  }

  // Terracotta tones sampled from the render (darkest shadow and brightest highlight clusters excluded).
  const tones = palette.tiles.slice(1, -1);
  const mesh = new InstancedMesh(geometry, material, items.length);
  const matrix = new Matrix4();
  const scale = new Vector3();
  const color = new Color();
  items.forEach((it, i) => {
    scale.setScalar(it.s || 1);
    matrix.compose(it.p, it.q, scale);
    mesh.setMatrixAt(i, matrix);
    color.set(tones[Math.floor(rand() * tones.length)]).offsetHSL(0, 0.05, (rand() - 0.5) * 0.04);
    if (!it.cap) color.multiplyScalar(0.86);
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
