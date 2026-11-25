import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Euler, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Box whose UVs are expressed in metres on every face (textures tile at real scale). */
export function box(w, h, d) {
  const geometry = new BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each with 1 segment).
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return geometry;
}

/** Scales an existing UV channel (e.g. to convert cylinder 0–1 UVs to metres). */
export function scaleUV(geometry, su, sv) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}

const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3(1, 1, 1);

/** Transform matrix: translation + XYZ Euler rotation (radians) + optional uniform scale. */
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz, 'XYZ');
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(s, s, s);
  return new Matrix4().compose(_p, _q, _s);
}

/**
 * Batches geometries per material key and merges each batch into one mesh,
 * keeping the whole building to a handful of draw calls.
 */
export class GeometryBatch {
  constructor() { this.groups = new Map(); }

  add(key, geometry, matrix) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.clearGroups();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (matrix) g.applyMatrix4(matrix);
    if (!this.groups.has(key)) this.groups.set(key, []);
    this.groups.get(key).push(g);
    if (g !== geometry) geometry.dispose();
    return this;
  }

  merged() {
    const out = new Map();
    for (const [key, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (merged) {
        merged.computeBoundingSphere();
        out.set(key, merged);
      }
    }
    this.groups.clear();
    return out;
  }
}

/**
 * Tube along a curve with a radius that varies along its length and around its
 * circumference — used for gnarled olive trunks and tapering branches.
 * radiusFn(t, angle) must be periodic in angle so the seam closes.
 */
export function organicTube(curve, radiusFn, { tubular = 48, radial = 12, uScale = 1, vScale = 1 } = {}) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const length = curve.getLength();
  const positions = [];
  const uvs = [];
  const indices = [];
  const point = new Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, point);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const r = radiusFn(t, a);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      positions.push(
        point.x + (ca * n.x + sa * b.x) * r,
        point.y + (ca * n.y + sa * b.y) * r,
        point.z + (ca * n.z + sa * b.z) * r,
      );
      uvs.push((j / radial) * uScale, t * length * vScale);
    }
  }
  const ring = radial + 1;
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}
