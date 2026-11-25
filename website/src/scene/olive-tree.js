/**
 * The ancient olive tree of the approved design (day render): a massive,
 * twisted multi-strand trunk and a broad silver-green crown that reaches over
 * the roof. Wood is geometry with the render's bark; the crown is built from
 * foliage cards cut from the render's own canopy (olive-foliage.webp), so the
 * leaves are the design's leaves.
 *
 * Origin = trunk base on the ground. The crown leans towards +X.
 */
import {
  CatmullRomCurve3, Vector3, Group, Mesh, BufferGeometry, Float32BufferAttribute, Euler, Matrix4,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { organicTube } from './geometry-utils.js';
import { mulberry32 } from './random.js';

const UP = new Vector3(0, 1, 0);

export function buildOliveTree(materials, { density = 1, seed = 77 } = {}) {
  const rand = mulberry32(seed);
  const group = new Group();
  group.name = 'olive-tree';
  const woodParts = [];
  const clusters = [];

  // Twisted strands of the old trunk (the render shows three plaited strands).
  const strand = (r0, r1, phase) => (t, a) => {
    const flare = t < 0.16 ? 1 + (0.16 - t) * 4.5 : 1;
    const gnarl = 1 + 0.2 * Math.sin(3 * a + t * 10 + phase) + 0.09 * Math.sin(7 * a - t * 19 + phase * 2) + 0.05 * Math.sin(11 * a + t * 6);
    return (r0 + (r1 - r0) * t) * flare * gnarl;
  };
  const twist = (radius, turns, phase, height, lean) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = phase + t * turns * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * radius * (1 - t * 0.3) + lean * t * t, t * height - 0.05, Math.sin(a) * radius * (1 - t * 0.3)));
    }
    return new CatmullRomCurve3(pts);
  };
  const strands = [
    { curve: twist(0.2, 0.55, 0.0, 2.5, 0.55), r: [0.4, 0.2], phase: 0.4 },
    { curve: twist(0.22, 0.5, 2.2, 2.3, 0.2), r: [0.34, 0.17], phase: 2.1 },
    { curve: twist(0.18, 0.6, 4.3, 2.4, 0.4), r: [0.3, 0.15], phase: 4.0 },
  ];
  for (const s of strands) {
    woodParts.push(organicTube(s.curve, strand(s.r[0], s.r[1], s.phase), { tubular: 40, radial: 16, uScale: 1.3 }));
  }

  const tops = strands.map((s) => s.curve.getPointAt(1));
  // Main limbs: spread wide and up, biased towards +X where the crown covers the roof.
  const limbs = [
    { from: tops[0], phi: 0.1, len: 2.6, lift: 1.5 },
    { from: tops[0], phi: 0.75, len: 2.2, lift: 1.9 },
    { from: tops[1], phi: -0.6, len: 2.3, lift: 1.7 },
    { from: tops[2], phi: 1.6, len: 1.9, lift: 1.8 },
    { from: tops[1], phi: 2.5, len: 2.0, lift: 1.5 },
    { from: tops[2], phi: 3.4, len: 2.1, lift: 1.4 },
    { from: tops[0], phi: 4.4, len: 1.9, lift: 1.9 },
    { from: tops[1], phi: 5.4, len: 2.2, lift: 1.6 },
  ];
  const limbRadius = (r0, r1) => (t, a) => (r0 + (r1 - r0) * t) * (1 + 0.12 * Math.sin(5 * a + t * 11));

  for (const def of limbs) {
    const dir = new Vector3(Math.cos(def.phi), 0, Math.sin(def.phi));
    const jitter = () => new Vector3((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.3);
    const p0 = def.from.clone();
    const p1 = p0.clone().addScaledVector(dir, def.len * 0.3).addScaledVector(UP, def.lift * 0.45).add(jitter());
    const p2 = p0.clone().addScaledVector(dir, def.len * 0.68).addScaledVector(UP, def.lift * 0.78).add(jitter());
    const p3 = p0.clone().addScaledVector(dir, def.len).addScaledVector(UP, def.lift * (0.9 + rand() * 0.2));
    const curve = new CatmullRomCurve3([p0, p1, p2, p3]);
    woodParts.push(organicTube(curve, limbRadius(0.15, 0.04), { tubular: 22, radial: 10, uScale: 0.8 }));
    clusters.push({ c: p3.clone().addScaledVector(UP, 0.2), r: 1.05 + rand() * 0.25 });
    clusters.push({ c: p2.clone().addScaledVector(UP, 0.35), r: 0.85 + rand() * 0.2 });
    for (const side of [-1, 1]) {
      if (rand() < 0.3) continue;
      const dir2 = dir.clone().applyAxisAngle(UP, side * (0.6 + rand() * 0.4));
      const s0 = curve.getPointAt(0.5);
      const s1 = s0.clone().addScaledVector(dir2, 0.5).addScaledVector(UP, 0.35);
      const s2 = s0.clone().addScaledVector(dir2, 1.0).addScaledVector(UP, 0.5 + rand() * 0.25);
      woodParts.push(organicTube(new CatmullRomCurve3([s0, s1, s2]), limbRadius(0.06, 0.02), { tubular: 12, radial: 7, uScale: 0.5 }));
      clusters.push({ c: s2.clone().addScaledVector(UP, 0.12), r: 0.75 + rand() * 0.2 });
    }
  }
  // Fill the heart of the crown so it reads as one dense mass, as on the render.
  const heart = tops[0].clone().add(new Vector3(0.9, 1.8, -0.2));
  clusters.push({ c: heart, r: 1.4 }, { c: heart.clone().add(new Vector3(-0.9, 0.3, 0.6)), r: 1.1 }, { c: heart.clone().add(new Vector3(1.0, 0.5, -0.5)), r: 1.15 });

  const wood = new Mesh(mergeGeometries(woodParts, false), materials.bark);
  woodParts.forEach((g) => g.dispose());
  wood.castShadow = true;
  wood.receiveShadow = true;
  wood.name = 'olive-wood';
  group.add(wood);

  const crown = new Mesh(foliageCards(clusters, rand, density), materials.leaf);
  crown.castShadow = true;
  crown.receiveShadow = true;
  crown.name = 'olive-crown';
  group.add(crown);
  return group;
}

/** Rosemary shrub at the foot of the walls: three crossed cards from the same foliage atlas. */
export function buildShrub(material, { size = 0.9, seed = 3 } = {}) {
  const rand = mulberry32(seed);
  const cards = [];
  const base = rand() * Math.PI;
  for (let k = 0; k < 3; k++) {
    const yaw = base + (k * Math.PI) / 3;
    const s = size * (0.85 + rand() * 0.3);
    cards.push(card(new Vector3(0, s * 0.42, 0), new Euler(0, yaw, 0), s, s * 0.85, Math.floor(rand() * 4), new Vector3(0, s * 0.2, 0)));
  }
  const mesh = new Mesh(mergeGeometries(cards, false), material);
  cards.forEach((g) => g.dispose());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shrub';
  return mesh;
}

/** Crown of crossed foliage cards; normals point out of each cluster for soft volumetric light. */
function foliageCards(clusters, rand, density) {
  const parts = [];
  for (const { c, r } of clusters) {
    const count = Math.max(4, Math.round((4 + r * 9) * density));
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const rr = r * 0.62 * Math.cbrt(rand());
      const s = Math.sqrt(1 - u * u);
      const pos = new Vector3(c.x + s * Math.cos(theta) * rr, c.y + u * rr * 0.7, c.z + s * Math.sin(theta) * rr);
      const rot = new Euler((rand() - 0.5) * 1.0, rand() * Math.PI * 2, (rand() - 0.5) * 0.8);
      const size = r * (0.72 + rand() * 0.38);
      parts.push(card(pos, rot, size, size, Math.floor(rand() * 4), c));
    }
  }
  const geometry = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * One double-sided card (two quads, both with outward normals) showing one cell of the 2×2 atlas.
 * `centre` is the point the normals radiate from.
 */
function card(position, rotation, width, height, cell, centre) {
  const m = new Matrix4().makeRotationFromEuler(rotation).setPosition(position);
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, y]) => new Vector3(x * width, y * height, 0).applyMatrix4(m));
  const u0 = (cell % 2) * 0.5;
  const v0 = 0.5 - Math.floor(cell / 2) * 0.5;
  const uv = [[u0, v0], [u0 + 0.5, v0], [u0 + 0.5, v0 + 0.5], [u0, v0 + 0.5]];
  const faceNormal = new Vector3(0, 0, 1).transformDirection(m);
  const positions = [];
  const normals = [];
  const uvs = [];
  const push = (idx, flip) => {
    for (const i of idx) {
      const p = corners[i];
      const radial = p.clone().sub(centre).normalize();
      const n = radial.multiplyScalar(0.75).addScaledVector(faceNormal, flip * 0.25).normalize();
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(uv[i][0], uv[i][1]);
    }
  };
  push([0, 1, 2, 0, 2, 3], 1);
  push([0, 2, 1, 0, 3, 2], -1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
}
