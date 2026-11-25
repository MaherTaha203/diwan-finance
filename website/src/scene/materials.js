/**
 * Materials of the diwan, textured from the approved Figma design.
 *
 * Every image map is extracted from the Figma renders by
 * tools/figma/extract_textures.py (door, arch surround and rosette are the
 * render's own pixels; walls, dome and paving reuse its stone faces), and the
 * flat colours come from figma-palette.json, sampled by the same tool.
 *
 * Materials start with flat colours matching their textures, so the model can
 * be drawn at once; `textureJobs()` then streams the maps in, most visible first.
 */
import {
  MeshStandardMaterial, MeshBasicMaterial, Color, DoubleSide, TextureLoader,
  RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace, NoColorSpace,
} from 'three';
import palette from './figma-palette.json';
import backdropUrl from '../assets/textures/backdrop.jpg';
import wallUrl from '../assets/textures/stone-wall.jpg';
import wallHeightUrl from '../assets/textures/stone-wall-height.jpg';
import dressedUrl from '../assets/textures/stone-dressed.jpg';
import doorUrl from '../assets/textures/door.jpg';
import archUrl from '../assets/textures/arch.jpg';
import rosetteUrl from '../assets/textures/rosette.jpg';
import domeUrl from '../assets/textures/dome.jpg';
import domeHeightUrl from '../assets/textures/dome-height.jpg';
import pavingUrl from '../assets/textures/paving.jpg';
import pavingHeightUrl from '../assets/textures/paving-height.jpg';
import barkUrl from '../assets/textures/bark.jpg';
import foliageUrl from '../assets/textures/olive-foliage.webp';

export { palette };

/** Metres covered by one repeat of each tiling texture (geometry UVs are in metres). */
export const TILE_METRES = { wall: 2.4, dressed: 1.2, paving: 4, bark: [1.1, 1.6] };

export function createMaterials() {
  const std = (color, roughness, extra = {}) => new MeshStandardMaterial({
    color: new Color(color), roughness, metalness: 0, ...extra,
  });
  return {
    backdrop: new MeshBasicMaterial({ color: new Color(palette.sky.horizon), toneMapped: false, fog: false, depthWrite: false }),
    wall: std('#d8c4a0', 0.93),
    dressed: std('#e6d9c1', 0.86),
    arch: std('#e3d6bd', 0.86),
    door: std('#93673f', 0.72),
    rosette: std('#e4d8c0', 0.85),
    dome: std('#e2d5bb', 0.9),
    plaster: std('#d6c9ae', 0.96),
    navy: std(palette.navy, 0.42, { metalness: 0.05 }),
    timber: std(palette.timber, 0.78),
    iron: std('#242427', 0.5, { metalness: 0.6 }),
    glass: std('#18212e', 0.14, { metalness: 0.3 }),
    tile: std('#ffffff', 0.62, { side: DoubleSide }), // pan tiles are seen from their concave side
    paving: std('#cbb998', 0.94),
    bark: std('#7f6d58', 0.97),
    leaf: std(palette.leaf, 0.82, { alphaTest: 0.5 }),
    shrub: std('#7b8556', 0.88, { alphaTest: 0.5 }),
  };
}

/**
 * Ordered texture loads. Each job resolves after assigning its maps, so the
 * caller can redraw between jobs. Failures leave the flat colour in place.
 */
export function textureJobs(materials, { anisotropy = 4 } = {}) {
  const loader = new TextureLoader();
  const load = async (url, { color = true, repeat = null, clamp = false } = {}) => {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    texture.anisotropy = anisotropy;
    const wrap = clamp ? ClampToEdgeWrapping : RepeatWrapping;
    texture.wrapS = wrap;
    texture.wrapT = wrap;
    if (repeat) texture.repeat.set(...(Array.isArray(repeat) ? repeat : [repeat, repeat]));
    return texture;
  };
  const apply = (material, maps, { tint = '#ffffff', bumpScale } = {}) => {
    Object.assign(material, maps);
    if (bumpScale !== undefined) material.bumpScale = bumpScale;
    material.color.set(tint);
    material.needsUpdate = true;
  };
  const per = (metres) => (Array.isArray(metres) ? metres.map((m) => 1 / m) : 1 / metres);

  return [
    async () => apply(materials.backdrop, { map: await load(backdropUrl, { clamp: true }) }),
    async () => {
      const [map, bumpMap] = await Promise.all([
        load(wallUrl, { repeat: per(TILE_METRES.wall) }),
        load(wallHeightUrl, { color: false, repeat: per(TILE_METRES.wall) }),
      ]);
      apply(materials.wall, { map, bumpMap }, { bumpScale: 3.4 });
    },
    async () => {
      const [door, arch, rosette] = await Promise.all([
        load(doorUrl, { clamp: true }),
        load(archUrl, { clamp: true }),
        load(rosetteUrl, { clamp: true }),
      ]);
      apply(materials.door, { map: door }, { bumpScale: 0 });
      apply(materials.arch, { map: arch, bumpMap: arch }, { bumpScale: 1.2 });
      apply(materials.rosette, { map: rosette, bumpMap: rosette }, { bumpScale: 3 });
    },
    async () => {
      const dressed = await load(dressedUrl, { repeat: per(TILE_METRES.dressed) });
      apply(materials.dressed, { map: dressed, bumpMap: dressed }, { bumpScale: 1.2 });
    },
    async () => {
      const [map, bumpMap] = await Promise.all([load(domeUrl), load(domeHeightUrl, { color: false })]);
      map.wrapT = ClampToEdgeWrapping;
      bumpMap.wrapT = ClampToEdgeWrapping;
      apply(materials.dome, { map, bumpMap }, { bumpScale: 1.6 });
    },
    async () => {
      const [map, bumpMap] = await Promise.all([
        load(pavingUrl, { repeat: per(TILE_METRES.paving) }),
        load(pavingHeightUrl, { color: false, repeat: per(TILE_METRES.paving) }),
      ]);
      apply(materials.paving, { map, bumpMap }, { bumpScale: 2 });
    },
    async () => {
      const foliage = await load(foliageUrl, { clamp: true });
      apply(materials.leaf, { map: foliage }, { tint: '#ffffff' });
      apply(materials.shrub, { map: foliage }, { tint: '#d9dcc6' });
    },
    async () => apply(materials.bark, { map: await load(barkUrl, { repeat: per(TILE_METRES.bark) }) }, { tint: '#ffffff' }),
  ];
}
