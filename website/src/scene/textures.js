/**
 * Procedural, seeded material textures drawn on <canvas>.
 * No image downloads: every surface (dressed limestone ashlar, plaster
 * courses, oak planks, olive bark, terracotta grain, paving) is generated
 * locally, deterministically, and tiles seamlessly.
 *
 * Convention: geometry UVs are in metres, so `repeat` = 1 / (metres per tile).
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, NoColorSpace } from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

function toTexture(canvas, { color = true, metresPerTile = [3, 3], anisotropy = 4 } = {}) {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.repeat.set(1 / metresPerTile[0], 1 / metresPerTile[1]);
  return texture;
}

/** Adds per-pixel luminance noise (fine stone/wood grain). */
function grain(ctx, size, amount, rand) {
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Coursed ashlar masonry (Palestinian village "tubzeh"): rows of blocks with
 * varied lengths, a smooth drafted margin around a rough, chiselled face.
 * Returns { map, bump }.
 */
export function ashlarTextures({
  size = 1024, courses = 10, seed = 3, base = [219, 201, 164], spread = 16,
  mortar = [232, 221, 198], mortarBump = 70, drafted = true, rough = 1, metres = 3, courseVariance = 0,
} = {}) {
  const rand = mulberry32(seed);
  const colorCanvas = makeCanvas(size);
  const bumpCanvas = makeCanvas(size);
  const c = colorCanvas.getContext('2d');
  const b = bumpCanvas.getContext('2d');

  c.fillStyle = rgb(mortar);
  c.fillRect(0, 0, size, size);
  b.fillStyle = rgb([mortarBump, mortarBump, mortarBump]);
  b.fillRect(0, 0, size, size);

  const gap = Math.max(2, Math.round(size * 0.0055));

  const drawBlock = (x, y, w, h, tone, blockSeed) => {
    const r = mulberry32(blockSeed);
    const x0 = x + gap / 2;
    const y0 = y + gap / 2;
    const w0 = w - gap;
    const h0 = h - gap;
    const margin = h0 * 0.1;

    c.fillStyle = rgb(tone);
    c.fillRect(x0, y0, w0, h0);
    // Convex, hand-dressed face: light catches the top, the lower edge falls into shade.
    const face = c.createLinearGradient(0, y0, 0, y0 + h0);
    face.addColorStop(0, rgba(255, 248, 232, 0.12));
    face.addColorStop(0.55, rgba(0, 0, 0, 0));
    face.addColorStop(1, rgba(88, 66, 40, 0.16));
    c.fillStyle = face;
    c.fillRect(x0, y0, w0, h0);

    // Soft weathering stain.
    if (r() < 0.45) {
      const gx = x0 + r() * w0;
      const gy = y0 + r() * h0;
      const grad = c.createRadialGradient(gx, gy, 0, gx, gy, h0 * (0.6 + r()));
      const dark = r() < 0.6;
      grad.addColorStop(0, dark ? rgba(120, 96, 62, 0.16) : rgba(255, 249, 235, 0.18));
      grad.addColorStop(1, rgba(0, 0, 0, 0));
      c.fillStyle = grad;
      c.fillRect(x0, y0, w0, h0);
    }

    // Rough, pitched face: speckles and chisel strokes inside the drafted margin.
    const fx = drafted ? x0 + margin : x0;
    const fy = drafted ? y0 + margin : y0;
    const fw = drafted ? w0 - margin * 2 : w0;
    const fh = drafted ? h0 - margin * 2 : h0;
    const speckles = Math.floor(((w0 * h0) / (size * 0.1)) * rough);
    for (let i = 0; i < speckles; i++) {
      const px = fx + r() * fw;
      const py = fy + r() * fh;
      const s = 1 + r() * size * 0.0035;
      if (r() < 0.62) c.fillStyle = rgba(96, 74, 46, 0.07 + r() * 0.12);
      else c.fillStyle = rgba(255, 250, 238, 0.08 + r() * 0.12);
      c.fillRect(px, py, s, s);
      b.fillStyle = rgb([150 + r() * 90, 150 + r() * 90, 150 + r() * 90]);
      b.fillRect(px, py, s * 1.4, s * 1.4);
    }
    c.lineWidth = Math.max(1, size / 900);
    for (let i = 0; i < (fw * fh) / (size * 4) * rough; i++) {
      const px = fx + r() * fw;
      const py = fy + r() * fh;
      const len = h * (0.04 + r() * 0.06);
      c.strokeStyle = rgba(110, 86, 54, 0.07 + r() * 0.06);
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + len, py + len * 0.55);
      c.stroke();
    }

    if (drafted) {
      // Smooth drafted margin: slightly lighter band.
      c.strokeStyle = rgba(255, 250, 240, 0.2);
      c.lineWidth = margin;
      c.strokeRect(x0 + margin / 2, y0 + margin / 2, w0 - margin, h0 - margin);
    }
    // Arris shadow at the block edge.
    c.strokeStyle = rgba(104, 80, 50, 0.32);
    c.lineWidth = Math.max(1.5, size / 600);
    c.strokeRect(x0 + 1, y0 + 1, w0 - 2, h0 - 2);

    // Bump: pillowed block, rough centre.
    b.fillStyle = 'rgb(176,176,176)';
    b.fillRect(x0, y0, w0, h0);
    b.fillStyle = 'rgb(206,206,206)';
    b.fillRect(x0 + margin * 0.6, y0 + margin * 0.6, w0 - margin * 1.2, h0 - margin * 1.2);
  };

  // Course heights may vary (traditional coursed masonry); they sum to the tile height.
  const rawHeights = Array.from({ length: courses }, () => 1 + (rand() * 2 - 1) * courseVariance);
  const heightScale = size / rawHeights.reduce((a, b) => a + b, 0);
  let blockId = 0;
  let y = 0;
  for (let row = 0; row < courses; row++) {
    const h = rawHeights[row] * heightScale;
    const widths = [];
    let total = 0;
    while (total < size - h * 1.2) {
      const w = h * (1.35 + rand() * 1.75);
      widths.push(w);
      total += w;
    }
    const scale = size / total; // the course closes exactly → seamless tiling
    let x = -rand() * h * 2;
    for (const w0 of widths) {
      const w = w0 * scale;
      const shift = (rand() - 0.5) * spread * 2;
      const warm = (rand() - 0.5) * spread * 0.6;
      const tone = [base[0] + shift + warm, base[1] + shift, base[2] + shift - warm];
      const seedB = (seed * 7919 + ++blockId * 104729) >>> 0;
      for (const dx of [-size, 0, size]) drawBlock(x + dx, y, w, h, tone, seedB);
      x += w;
    }
    y += h;
  }

  grain(c, size, 12, rand);
  grain(b, size, 26, rand);

  return {
    map: toTexture(colorCanvas, { metresPerTile: [metres, metres] }),
    bump: toTexture(bumpCanvas, { color: false, metresPerTile: [metres, metres] }),
  };
}

/** Finely dressed limestone for arches, cornices and the carved rosette panel. */
export function dressedStoneTextures({ size = 512, seed = 11, base = [234, 223, 199], metres = 2 } = {}) {
  const rand = mulberry32(seed);
  const colorCanvas = makeCanvas(size);
  const bumpCanvas = makeCanvas(size);
  const c = colorCanvas.getContext('2d');
  const b = bumpCanvas.getContext('2d');
  c.fillStyle = rgb(base);
  c.fillRect(0, 0, size, size);
  b.fillStyle = 'rgb(180,180,180)';
  b.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.04 + rand() * 0.14);
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rand() < 0.5 ? rgba(150, 124, 86, 0.06) : rgba(255, 252, 244, 0.09));
    grad.addColorStop(1, rgba(0, 0, 0, 0));
    c.fillStyle = grad;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      c.save();
      c.translate(dx, dy);
      c.fillRect(x - r, y - r, r * 2, r * 2);
      c.restore();
    }
  }
  grain(c, size, 9, rand);
  grain(b, size, 34, rand);
  return {
    map: toTexture(colorCanvas, { metresPerTile: [metres, metres] }),
    bump: toTexture(bumpCanvas, { color: false, metresPerTile: [metres, metres] }),
  };
}

/** Vertical oak planks with wavy grain, seams and the odd knot. */
export function woodTextures({ size = 512, seed = 5, planks = 6, base = [172, 136, 92] } = {}) {
  const rand = mulberry32(seed);
  const colorCanvas = makeCanvas(size);
  const bumpCanvas = makeCanvas(size);
  const c = colorCanvas.getContext('2d');
  const b = bumpCanvas.getContext('2d');
  const pw = size / planks;
  b.fillStyle = 'rgb(190,190,190)';
  b.fillRect(0, 0, size, size);
  for (let p = 0; p < planks; p++) {
    const x0 = p * pw;
    const shift = (rand() - 0.5) * 26;
    c.fillStyle = rgb([base[0] + shift, base[1] + shift * 0.9, base[2] + shift * 0.7]);
    c.fillRect(x0, 0, pw, size);
    const lines = 16 + Math.floor(rand() * 10);
    for (let l = 0; l < lines; l++) {
      const lx = x0 + rand() * pw;
      const amp = 1 + rand() * pw * 0.06;
      const k = 1 + Math.floor(rand() * 3);
      const phase = rand() * Math.PI * 2;
      c.strokeStyle = rgba(78, 52, 28, 0.08 + rand() * 0.16);
      c.lineWidth = 0.6 + rand() * 1.6;
      c.beginPath();
      for (let y = 0; y <= size; y += 6) {
        const xx = lx + Math.sin((y / size) * Math.PI * 2 * k + phase) * amp;
        if (y === 0) c.moveTo(xx, y);
        else c.lineTo(xx, y);
      }
      c.stroke();
    }
    if (rand() < 0.5) {
      const kx = x0 + pw * (0.3 + rand() * 0.4);
      const ky = rand() * size;
      c.strokeStyle = rgba(70, 44, 22, 0.35);
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(kx, ky, pw * 0.08, pw * 0.16, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = rgba(38, 26, 16, 0.7);
    c.fillRect(x0, 0, Math.max(2, size / 220), size);
    b.fillStyle = 'rgb(40,40,40)';
    b.fillRect(x0, 0, Math.max(2, size / 200), size);
  }
  grain(c, size, 10, rand);
  grain(b, size, 18, rand);
  return {
    map: toTexture(colorCanvas, { metresPerTile: [1.2, 2.4] }),
    bump: toTexture(bumpCanvas, { color: false, metresPerTile: [1.2, 2.4] }),
  };
}

/** Deeply fissured olive bark (vertical runs, lichen flecks). */
export function barkTextures({ size = 512, seed = 9 } = {}) {
  const rand = mulberry32(seed);
  const colorCanvas = makeCanvas(size);
  const bumpCanvas = makeCanvas(size);
  const c = colorCanvas.getContext('2d');
  const b = bumpCanvas.getContext('2d');
  c.fillStyle = 'rgb(124,111,96)';
  c.fillRect(0, 0, size, size);
  b.fillStyle = 'rgb(170,170,170)';
  b.fillRect(0, 0, size, size);
  const fissure = (dark) => {
    const lx = rand() * size;
    const amp = size * (0.01 + rand() * 0.03);
    const k = 1 + Math.floor(rand() * 3);
    const phase = rand() * Math.PI * 2;
    const w = dark ? 2 + rand() * 6 : 1 + rand() * 3;
    const path = (ctx) => {
      ctx.beginPath();
      for (let y = 0; y <= size; y += 8) {
        const xx = lx + Math.sin((y / size) * Math.PI * 2 * k + phase) * amp;
        if (y === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
    };
    for (const dx of [-size, 0, size]) {
      c.save(); b.save();
      c.translate(dx, 0); b.translate(dx, 0);
      path(c);
      c.strokeStyle = dark ? rgba(46, 38, 31, 0.55) : rgba(176, 164, 146, 0.4);
      c.lineWidth = w;
      c.stroke();
      path(b);
      b.strokeStyle = dark ? 'rgb(30,30,30)' : 'rgb(235,235,235)';
      b.lineWidth = w;
      b.stroke();
      c.restore(); b.restore();
    }
  };
  for (let i = 0; i < 70; i++) fissure(true);
  for (let i = 0; i < 50; i++) fissure(false);
  for (let i = 0; i < 160; i++) {
    c.fillStyle = rgba(168, 172, 146, 0.12 + rand() * 0.18);
    const s = 2 + rand() * 7;
    c.fillRect(rand() * size, rand() * size, s, s * 0.7);
  }
  grain(c, size, 16, rand);
  grain(b, size, 30, rand);
  return {
    map: toTexture(colorCanvas, { metresPerTile: [1, 1.4] }),
    bump: toTexture(bumpCanvas, { color: false, metresPerTile: [1, 1.4] }),
  };
}

/** Near-white grain that modulates per-instance terracotta tile colours. */
export function terracottaGrain({ size = 256, seed = 21 } = {}) {
  const rand = mulberry32(seed);
  const canvas = makeCanvas(size);
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgb(238,232,226)';
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rand() < 0.7 ? rgba(120, 70, 50, 0.08 + rand() * 0.12) : rgba(255, 245, 230, 0.15);
    const s = 1 + rand() * 4;
    c.fillRect(rand() * size, rand() * size, s, s);
  }
  for (let i = 0; i < 14; i++) {
    c.strokeStyle = rgba(90, 60, 40, 0.07);
    c.lineWidth = 2 + rand() * 6;
    const y = rand() * size;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(size, y + (rand() - 0.5) * 20);
    c.stroke();
  }
  grain(c, size, 14, rand);
  return toTexture(canvas, { metresPerTile: [0.4, 0.4] });
}
