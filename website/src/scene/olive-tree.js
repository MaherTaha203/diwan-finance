/**
 * Procedural Palestinian olive tree: two twisted, gnarled trunks, tapering
 * branches and a silver-green canopy of instanced narrow leaves.
 * Origin = trunk base on the ground.
 */
import {
  CatmullRomCurve3, Vector3, Quaternion, Euler, Matrix4, Color, Group, Mesh, InstancedMesh,
  Shape, ShapeGeometry, TorusGeometry, CircleGeometry, IcosahedronGeometry,
} from 'three';
import { organicTube } from './geometry-utils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from './textures.js';

const UP = new Vector3(0, 1, 0);

export function buildOliveTree(materials, { leafCount = 5000, seed = 77 } = {}) {
  const rand = mulberry32(seed);
  const group = new Group();
  group.name = 'olive-tree';
  const woodParts = [];
  const clusters = [];

  const trunkRadius = (r0, r1, phase) => (t, a) => {
    const flare = t < 0.14 ? 1 + (0.14 - t) * 4.2 : 1;
    const gnarl = 1 + 0.17 * Math.sin(3 * a + t * 9 + phase) + 0.08 * Math.sin(7 * a - t * 17 + phase * 2) + 0.05 * Math.sin(11 * a + t * 5);
    return (r0 + (r1 - r0) * t) * flare * gnarl;
  };

  const trunkA = new CatmullRomCurve3([
    new Vector3(0, -0.05, 0), new Vector3(0.16, 0.55, 0.06), new Vector3(0.03, 1.1, 0.12),
    new Vector3(0.22, 1.7, 0.02), new Vector3(0.36, 2.25, -0.06),
  ]);
  const trunkB = new CatmullRomCurve3([
    new Vector3(-0.06, -0.05, -0.08), new Vector3(-0.24, 0.5, -0.14), new Vector3(-0.31, 1.05, -0.02),
    new Vector3(-0.17, 1.6, 0.12), new Vector3(-0.34, 2.1, 0.22),
  ]);
  woodParts.push(organicTube(trunkA, trunkRadius(0.34, 0.15, 0.4), { tubular: 40, radial: 16, uScale: 1.4 }));
  woodParts.push(organicTube(trunkB, trunkRadius(0.27, 0.12, 2.1), { tubular: 36, radial: 14, uScale: 1.1 }));

  const topA = trunkA.getPointAt(1);
  const topB = trunkB.getPointAt(1);
  // Main branches — slightly biased towards +X, where the canopy reaches over the roof.
  const branchDefs = [
    { from: topA, phi: 0.15, len: 2.2, lift: 1.0 },
    { from: topA, phi: 0.95, len: 1.7, lift: 1.15 },
    { from: topA, phi: -0.75, len: 1.8, lift: 1.05 },
    { from: topB, phi: 2.0, len: 1.6, lift: 1.2 },
    { from: topB, phi: 2.9, len: 1.5, lift: 1.0 },
    { from: topB, phi: 3.9, len: 1.7, lift: 1.1 },
    { from: topA, phi: 5.0, len: 1.55, lift: 1.25 },
  ];

  const branchRadius = (r0, r1) => (t, a) => (r0 + (r1 - r0) * t) * (1 + 0.1 * Math.sin(5 * a + t * 11));

  for (const def of branchDefs) {
    const dir = new Vector3(Math.cos(def.phi), 0, Math.sin(def.phi));
    const jitter = () => new Vector3((rand() - 0.5) * 0.25, (rand() - 0.5) * 0.18, (rand() - 0.5) * 0.25);
    const p0 = def.from.clone();
    const p1 = p0.clone().addScaledVector(dir, def.len * 0.35).addScaledVector(UP, def.lift * 0.4).add(jitter());
    const p2 = p0.clone().addScaledVector(dir, def.len * 0.7).addScaledVector(UP, def.lift * 0.7).add(jitter());
    const p3 = p0.clone().addScaledVector(dir, def.len).addScaledVector(UP, def.lift * (0.85 + rand() * 0.25));
    const curve = new CatmullRomCurve3([p0, p1, p2, p3]);
    woodParts.push(organicTube(curve, branchRadius(0.12, 0.035), { tubular: 20, radial: 9, uScale: 0.7 }));
    clusters.push({ c: p3.clone().addScaledVector(UP, 0.12), r: 0.95 + rand() * 0.22 });
    clusters.push({ c: p2.clone().addScaledVector(UP, 0.22), r: 0.66 + rand() * 0.16 });

    for (const side of [-1, 1]) {
      if (rand() < 0.25) continue;
      const turn = side * (0.6 + rand() * 0.4);
      const dir2 = dir.clone().applyAxisAngle(UP, turn);
      const s0 = curve.getPointAt(0.55);
      const s1 = s0.clone().addScaledVector(dir2, 0.45).addScaledVector(UP, 0.3);
      const s2 = s0.clone().addScaledVector(dir2, 0.9).addScaledVector(UP, 0.42 + rand() * 0.2);
      woodParts.push(organicTube(new CatmullRomCurve3([s0, s1, s2]), branchRadius(0.055, 0.02), { tubular: 12, radial: 7, uScale: 0.5 }));
      clusters.push({ c: s2.clone().addScaledVector(UP, 0.08), r: 0.62 + rand() * 0.16 });
    }
  }

  const wood = new Mesh(mergeGeometries(woodParts, false), materials.bark);
  woodParts.forEach((g) => g.dispose());
  wood.castShadow = true;
  wood.receiveShadow = true;
  wood.name = 'olive-wood';
  group.add(wood);

  group.add(buildFoliageMass(materials.foliage, clusters));
  group.add(buildCanopy(materials.leaf, clusters, leafCount, rand));

  // Stone planter ring and soil.
  const ring = new Mesh(new TorusGeometry(0.95, 0.13, 8, 28), materials.dressed);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  ring.castShadow = true;
  ring.receiveShadow = true;
  const soil = new Mesh(new CircleGeometry(0.92, 28), materials.soil);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.11;
  soil.receiveShadow = true;
  group.add(ring, soil);

  return group;
}

/**
 * Dense inner foliage volumes: irregular low-poly masses inside each leaf cluster,
 * so the crown reads as solid olive foliage instead of scattered leaves.
 */
function buildFoliageMass(material, clusters) {
  const hash = (x, y, z) => {
    const v = Math.sin(x * 91.7 + y * 47.3 + z * 13.9) * 15731.743;
    return v - Math.floor(v);
  };
  const parts = clusters.map((cluster) => {
    const g = new IcosahedronGeometry(cluster.r * 0.55, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const f = 0.78 + 0.36 * hash(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3));
      p.setXYZ(i, x * f + cluster.c.x, y * f * 0.72 + cluster.c.y, z * f + cluster.c.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const mesh = new Mesh(mergeGeometries(parts, false), material);
  parts.forEach((g) => g.dispose());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'olive-foliage';
  return mesh;
}

function buildCanopy(material, clusters, count, rand) {
  const leaf = new Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.042, 0.1, 0, 0.24);
  leaf.quadraticCurveTo(-0.042, 0.1, 0, 0);
  const geometry = new ShapeGeometry(leaf, 3);
  geometry.translate(0, -0.03, 0);

  const weights = clusters.map((k) => k.r ** 3);
  const total = weights.reduce((a, b) => a + b, 0);
  const mesh = new InstancedMesh(geometry, material, count);
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const euler = new Euler();
  const scale = new Vector3();
  const color = new Color();
  const palette = [new Color('#56653d'), new Color('#6c7b4c'), new Color('#7f8b5c'), new Color('#a3ac8f')];
  const paletteWeights = [0.34, 0.3, 0.14, 0.22];

  let index = 0;
  clusters.forEach((cluster, ci) => {
    const n = ci === clusters.length - 1 ? count - index : Math.round((weights[ci] / total) * count);
    for (let i = 0; i < n && index < count; i++, index++) {
      // Random direction, biased to the outer shell so the canopy reads as foliage masses.
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const f = 0.42 + 0.58 * Math.pow(rand(), 0.55);
      position.set(
        cluster.c.x + s * Math.cos(theta) * cluster.r * f,
        cluster.c.y + u * cluster.r * 0.68 * f,
        cluster.c.z + s * Math.sin(theta) * cluster.r * f,
      );
      euler.set(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2);
      quaternion.setFromEuler(euler);
      scale.setScalar(0.8 + rand() * 0.5);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);

      let pick = rand();
      let k = 0;
      while (k < paletteWeights.length - 1 && pick > paletteWeights[k]) { pick -= paletteWeights[k]; k++; }
      color.copy(palette[k]).offsetHSL(0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.06);
      mesh.setColorAt(index, color);
    }
  });
  mesh.count = index;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.name = 'olive-leaves';
  return mesh;
}
