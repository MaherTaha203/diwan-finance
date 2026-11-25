import { MeshStandardMaterial, DoubleSide, Color } from 'three';
import {
  ashlarTextures, dressedStoneTextures, woodTextures, barkTextures, terracottaGrain,
} from './textures.js';

/**
 * Physically-based materials. They start as flat colours so the model can be
 * shown immediately; `textureJobs()` then generates and assigns the procedural
 * maps one by one (progressive loading).
 */
export function createMaterials() {
  const std = (color, roughness, extra = {}) => new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0, ...extra });
  return {
    stone: std('#d8c6a1', 0.92),
    plinth: std('#c9b690', 0.95),
    dressed: std('#e8ddc5', 0.82),
    dome: std('#e2d4b4', 0.9),
    plaster: std('#d9cdb3', 0.96),
    paving: std('#cdbb98', 0.93),
    wood: std('#ad885c', 0.72),
    woodDark: std('#6f523a', 0.8),
    navy: std('#2B4569', 0.42, { metalness: 0.05 }),
    iron: std('#2a2a2d', 0.5, { metalness: 0.7 }),
    glass: std('#1c2838', 0.12, { metalness: 0.35 }),
    tile: std('#ffffff', 0.62, { side: DoubleSide }), // pan tiles are seen from their concave side
    clay: std('#a8653f', 0.8),
    soil: std('#6a5541', 1),
    shrub: std('#55623d', 0.9, { flatShading: true }),
    bark: std('#8b7c69', 0.97),
    leaf: std('#ffffff', 0.7, { side: DoubleSide }),
    foliage: std('#5a6741', 0.95, { flatShading: true }),
  };
}

/** Returns an ordered list of small jobs; each generates one texture set and assigns it. */
export function textureJobs(materials, size) {
  const half = Math.max(256, size / 2);
  const assign = (material, set, { tint = '#ffffff', bumpScale = 1.5 } = {}) => {
    material.map = set.map;
    if (set.bump) {
      material.bumpMap = set.bump;
      material.bumpScale = bumpScale;
    }
    material.color.set(tint);
    material.needsUpdate = true;
  };
  return [
    () => {
      const wall = ashlarTextures({
        size, courses: 10, seed: 3, base: [214, 195, 158], spread: 24,
        mortar: [192, 176, 146], mortarBump: 46, courseVariance: 0.28,
      });
      assign(materials.stone, wall, { bumpScale: 3.2 });
      assign(materials.plinth, wall, { tint: '#cbb994', bumpScale: 3.4 });
    },
    () => assign(materials.dressed, dressedStoneTextures({ size: half, seed: 11 }), { bumpScale: 0.8 }),
    () => assign(materials.dome, ashlarTextures({
      size: half, courses: 18, seed: 17, base: [228, 215, 189], spread: 5,
      mortar: [221, 208, 182], mortarBump: 150, drafted: false, rough: 0.3, metres: 2.4,
    }), { bumpScale: 0.6 }),
    () => assign(materials.paving, ashlarTextures({
      size: half, courses: 6, seed: 29, base: [206, 190, 158], spread: 18,
      mortar: [150, 134, 108], mortarBump: 40, drafted: false, rough: 0.6, metres: 3,
    }), { bumpScale: 1.6 }),
    () => {
      const wood = woodTextures({ size: half, seed: 5 });
      assign(materials.wood, wood, { bumpScale: 0.6 });
      assign(materials.woodDark, wood, { tint: '#8a6a4e', bumpScale: 0.6 });
    },
    () => assign(materials.bark, barkTextures({ size: half, seed: 9 }), { bumpScale: 3 }),
    () => assign(materials.tile, { map: terracottaGrain({ size: 256, seed: 21 }) }),
  ];
}
