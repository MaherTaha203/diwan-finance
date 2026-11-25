#!/usr/bin/env python3
"""
Extracts the 3D model's textures from the approved Figma design.

The approved design of Diwan Al-Taha consists of four realistic renders in the
Figma file "Diwan Al-Taha — Public Portal & Staff Gateway (Concept)" (frames
1:2 day, 1:3 mobile, 1:4 night, 1:5 rosette close-up). They are flat raster
images from a single viewpoint, so they cannot be rotated directly. This tool
converts them into the material set of the 3D model without redrawing them:

  * the door leaf, the arch surround and the rosette panel are the render's own
    pixels, colour-normalised so real-time lighting can be applied on top;
  * walls, dome and paving reuse the hand-dressed stone faces of the close-up,
    laid out at the course and block sizes measured on the full-building
    renders, with tones sampled from those renders;
  * the olive foliage cards and bark come from the olive tree of the day render;
  * the backdrop keeps the render's sky gradient, clouds and distant hills;
  * flat colours (navy columns, timber, terracotta) are sampled, not chosen.

Sources : website/design/figma/{day,mobile,night,detail}.jpg
Outputs : website/src/assets/textures/*  and  website/src/scene/figma-palette.json

Usage   : python3 tools/figma/extract_textures.py      (from website/)
Requires: numpy, Pillow (with WebP), opencv-python-headless
Deterministic: every random choice is seeded.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "design" / "figma"
OUT = ROOT / "src" / "assets" / "textures"
PALETTE_OUT = ROOT / "src" / "scene" / "figma-palette.json"

# Measured on the renders (pixels). See README "Figma conversion".
DETAIL_PX_PER_M = 414.0          # close-up: the 0.93 m rosette panel spans 385 px
MOBILE_PX_PER_M = 127.0          # mobile render: the 1.30 m door spans 165 px
DOOR_BOX = (478, 1043, 643, 1325)  # mobile: door leaf (x0, y0, x1, y1)
DOOR_AXIS = (560.5, 1325.0)        # mobile: door axis x and threshold y
ARCH_BOX = (418, 980, 704, 1345)   # mobile: arch surround neighbourhood
ROSETTE_BOX = (280, 375, 665, 757)  # detail: rosette panel with its frame
STONE_POOL = [                     # detail: joint-free areas of single blocks
    (700, 520, 1530, 870),
    (1010, 205, 1530, 490),
    (700, 330, 980, 490),
    (700, 905, 1530, 1015),
]
CANOPY_CLUMPS = [                  # day: olive foliage against the sky (x0, y0, x1, y1)
    (300, 0, 600, 300),
    (360, 40, 600, 280),
    (120, 30, 400, 310),
    (0, 40, 260, 300),
]
TRUNK_BOX = (150, 470, 310, 700)   # day: twisted trunk
SKY_BOX = (1040, 0, 1536, 470)     # day: clean sky with clouds
HILLS_BOX = (1010, 455, 1536, 600)  # day: distant hills and village (above the terrace wall)

# Reference albedo of the limestone (light-neutral), used to undo the golden-hour cast.
LIMESTONE = np.array([220.0, 202.0, 170.0])


# ─── helpers ────────────────────────────────────────────────────────────────

def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGB")).astype(np.float32)


def crop(img: np.ndarray, box) -> np.ndarray:
    x0, y0, x1, y1 = box
    return img[y0:y1, x0:x1].copy()


def blur(img: np.ndarray, sigma: float) -> np.ndarray:
    return cv2.GaussianBlur(img, (0, 0), sigmaX=sigma, sigmaY=sigma, borderType=cv2.BORDER_REFLECT)


def luminance(img: np.ndarray) -> np.ndarray:
    return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114


def detail_ratio(img: np.ndarray, sigma: float, gamma: float = 1.0) -> np.ndarray:
    """Per-channel ratio of the image to its low frequencies: texture without lighting."""
    ratio = img / np.maximum(blur(img, sigma), 1.0)
    return np.clip(ratio, 0.35, 1.9) ** gamma


def normalise(img: np.ndarray, target, sigma: float, keep_low: float = 0.25, gamma: float = 1.0,
              chroma: float = 1.0) -> np.ndarray:
    """Re-lights a crop: keeps its detail (and a fraction of its broad shading), sets its mean colour.

    chroma < 1 blends the per-channel detail towards luminance-only detail, which removes the
    colour cast of the golden-hour light from surfaces that are really near-neutral (dressed stone).
    """
    target = np.asarray(target, dtype=np.float32)
    ratio = detail_ratio(img, sigma, gamma)
    if chroma < 1.0:
        mono = detail_ratio(luminance(img)[..., None].repeat(3, axis=2), sigma, gamma)
        ratio = mono + chroma * (ratio - mono)
    low = blur(img, sigma)
    low_rel = luminance(low)[..., None] / max(float(luminance(low).mean()), 1.0) if chroma < 1.0 else \
        low / np.maximum(low.reshape(-1, 3).mean(0), 1.0)
    shading = 1.0 + keep_low * (low_rel - 1.0)
    return np.clip(target * ratio * shading, 0, 255)


def save_jpg(img: np.ndarray, name: str, quality: int = 86) -> None:
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT / name, quality=quality, optimize=True, progressive=True)


def save_gray(img: np.ndarray, name: str, quality: int = 84) -> None:
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "L").save(OUT / name, quality=quality, optimize=True)


def save_webp(img: np.ndarray, name: str, quality: int = 82) -> None:
    mode = "RGBA" if img.shape[2] == 4 else "RGB"
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), mode).save(OUT / name, quality=quality, method=6, alpha_quality=88)


def hexcolor(rgb) -> str:
    r, g, b = (int(round(max(0, min(255, c)))) for c in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def light_of(render_wall_mean) -> np.ndarray:
    """Colour of the light in a render, estimated from its lit limestone."""
    return np.asarray(render_wall_mean, dtype=np.float32) / LIMESTONE


def resize(img: np.ndarray, size) -> np.ndarray:
    w, h = size
    interp = cv2.INTER_AREA if w < img.shape[1] else cv2.INTER_LANCZOS4
    return cv2.resize(img, (int(w), int(h)), interpolation=interp)


def sharpen(img: np.ndarray, amount: float = 0.45, sigma: float = 1.2) -> np.ndarray:
    return np.clip(img + amount * (img - blur(img, sigma)), 0, 255)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ─── masonry synthesis from the Figma stone faces ───────────────────────────

class FacePool:
    """Joint-free stone surface from the close-up, stored as lighting-free detail ratios."""

    def __init__(self, detail: np.ndarray):
        self.faces = [detail_ratio(crop(detail, box), sigma=26, gamma=0.8) for box in STONE_POOL]

    def sample(self, rng: np.random.Generator, w: int, h: int, px_per_m_x: float, px_per_m_y: float) -> np.ndarray:
        """A w×h patch of stone face at the requested texture density (px per metre)."""
        sx = DETAIL_PX_PER_M / px_per_m_x
        sy = DETAIL_PX_PER_M / px_per_m_y
        need_w, need_h = max(2, int(math.ceil(w * sx))), max(2, int(math.ceil(h * sy)))
        candidates = [f for f in self.faces if f.shape[1] >= need_w and f.shape[0] >= need_h]
        if not candidates:  # very large block: take the largest face and scale it
            face = max(self.faces, key=lambda f: f.shape[0] * f.shape[1])
            return resize(face, (w, h))
        face = candidates[int(rng.integers(len(candidates)))]
        x = int(rng.integers(0, face.shape[1] - need_w + 1))
        y = int(rng.integers(0, face.shape[0] - need_h + 1))
        patch = face[y:y + need_h, x:x + need_w]
        if rng.random() < 0.5:
            patch = patch[:, ::-1]
        return resize(patch, (w, h))


def block_profile(w: int, h: int, bevel: float) -> np.ndarray:
    """Pillowed block height: flat face, worn rounded arrises."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.minimum.reduce([xx + 0.5, w - xx - 0.5, yy + 0.5, h - yy - 0.5])
    return smoothstep(0, max(1.0, bevel), d)


def paste_wrapped(dst: np.ndarray, src: np.ndarray, x: int, y: int) -> None:
    """Writes src into dst at (x, y) with horizontal wrap-around (seamless tiles)."""
    H, W = dst.shape[:2]
    h, w = src.shape[:2]
    for dx in (-W, 0, W):
        x0, x1 = x + dx, x + dx + w
        if x1 <= 0 or x0 >= W:
            continue
        sx0, sx1 = max(0, -x0), w - max(0, x1 - W)
        dst[y:y + h, max(0, x0):min(W, x1)] = src[:, sx0:sx1]


def masonry(pool: FacePool, *, size, metres, course_m, course_var, block_ratio, palette, mortar,
            joint_m, bevel_m, seed, rows_override=None):
    """Seamless coursed ashlar tile (size×size px covering metres×metres)."""
    rng = np.random.default_rng(seed)
    ppm = size / metres
    albedo = np.empty((size, size, 3), np.float32)
    albedo[:] = mortar
    height = np.full((size, size), 0.18, np.float32)

    n_courses = rows_override or max(1, round(metres / course_m))
    raw = 1 + (rng.random(n_courses) * 2 - 1) * course_var
    heights = np.round(raw / raw.sum() * size).astype(int)
    heights[-1] += size - heights.sum()
    joint = max(2, int(round(joint_m * ppm)))
    bevel = bevel_m * ppm
    palette = np.asarray(palette, np.float32)

    y = 0
    for h in heights:
        widths, total = [], 0.0
        while total < size - h * 1.2:
            wv = h * (block_ratio[0] + rng.random() * (block_ratio[1] - block_ratio[0]))
            widths.append(wv)
            total += wv
        scale = size / total
        x = int(-rng.random() * h * 2)
        for w0 in widths:
            w = int(round(w0 * scale))
            bw, bh = w - joint, h - joint
            if bw > 2 and bh > 2:
                mix = rng.dirichlet(np.ones(len(palette)) * 0.7)
                tone = (mix[:, None] * palette).sum(0) * (0.92 + rng.random() * 0.13)
                face = pool.sample(rng, bw, bh, ppm, ppm)
                prof = block_profile(bw, bh, bevel)
                grime = 1 - 0.1 * (1 - prof)  # worn arrises collect a little dirt
                block = tone * face * grime[..., None]
                lum = luminance(face)
                paste_wrapped(albedo, block, x + joint // 2, y + joint // 2)
                paste_wrapped(height, (0.55 + 0.4 * prof * (0.75 + 0.25 * lum))[..., None][..., 0],
                              x + joint // 2, y + joint // 2)
            x += w
        y += h
    return albedo, height


def dome_masonry(pool: FacePool, *, width, height_px, radius, course_m, block_m, palette, mortar, joint_m, seed):
    """Dome courses in UV space (u = azimuth, v = latitude, row 0 = crown)."""
    rng = np.random.default_rng(seed)
    meridian = radius * math.pi / 2
    vppm = height_px / meridian
    albedo = np.empty((height_px, width, 3), np.float32)
    albedo[:] = mortar
    height = np.full((height_px, width), 0.2, np.float32)
    palette = np.asarray(palette, np.float32)
    n = max(4, round(meridian / course_m))
    bounds = np.linspace(0, height_px, n + 1).round().astype(int)
    joint_v = max(2, int(round(joint_m * vppm)))
    for i in range(n):
        y0, y1 = bounds[i], bounds[i + 1]
        lat = (1 - ((y0 + y1) / 2) / height_px) * math.pi / 2
        circumference = 2 * math.pi * radius * math.cos(lat)
        count = max(1, round(circumference / (block_m * (0.85 + rng.random() * 0.3))))
        hppm = width / max(circumference, 1e-3)
        joint_h = max(2, int(round(joint_m * hppm))) if count > 1 else 0
        edges = np.linspace(0, width, count + 1)
        offset = int(rng.random() * width / count)
        for k in range(count):
            x0 = int(round(edges[k])) + offset
            bw = int(round(edges[k + 1] - edges[k])) - joint_h
            bh = (y1 - y0) - joint_v
            if bw <= 2 or bh <= 2:
                continue
            mix = rng.dirichlet(np.ones(len(palette)) * 0.8)
            tone = (mix[:, None] * palette).sum(0) * (0.95 + rng.random() * 0.08)
            face = pool.sample(rng, bw, bh, hppm, vppm)
            prof = block_profile(bw, bh, max(1.5, 0.02 * vppm))
            paste_wrapped(albedo, tone * face * (1 - 0.06 * (1 - prof))[..., None], x0 + joint_h // 2, y0 + joint_v // 2)
            paste_wrapped(height, 0.55 + 0.4 * prof, x0 + joint_h // 2, y0 + joint_v // 2)
    return albedo, height


# ─── individual assets ──────────────────────────────────────────────────────

def make_door(mobile: np.ndarray, palette: dict) -> None:
    leaf = crop(mobile, DOOR_BOX)
    oak = np.array([150.0, 106.0, 66.0])
    out = normalise(leaf, oak, sigma=leaf.shape[1] / 2.2, keep_low=0.35)
    out = sharpen(resize(out, (leaf.shape[1] * 2, leaf.shape[0] * 2)), 0.5)
    save_jpg(out, "door.jpg", 88)
    palette["door"] = {"widthM": round((DOOR_BOX[2] - DOOR_BOX[0]) / MOBILE_PX_PER_M, 3),
                       "heightM": round((DOOR_BOX[3] - DOOR_BOX[1]) / MOBILE_PX_PER_M, 3)}


def make_arch(mobile: np.ndarray, palette: dict) -> None:
    region = crop(mobile, ARCH_BOX)
    dressed = np.array([226.0, 212.0, 186.0])
    out = normalise(region, dressed, sigma=14, keep_low=0.12, gamma=0.9, chroma=0.15)
    out = sharpen(resize(out, (region.shape[1] * 2, region.shape[0] * 2)), 0.4)
    save_jpg(out, "arch.jpg", 86)
    ax, ay = DOOR_AXIS
    palette["arch"] = {
        "pxPerM": MOBILE_PX_PER_M,
        "box": ARCH_BOX,
        "axis": [ax, ay],
    }


def make_rosette(detail: np.ndarray) -> None:
    panel = crop(detail, ROSETTE_BOX)
    dressed = np.array([228.0, 214.0, 188.0])
    out = normalise(panel, dressed, sigma=60, keep_low=0.35, gamma=0.95, chroma=0.4)
    save_jpg(resize(out, (512, 512)), "rosette.jpg", 88)


def make_walls(pool: FacePool) -> None:
    # Tones of the full-building renders (cream ↔ honey), mortar lighter and greyer.
    wall_palette = [[226, 208, 176], [212, 182, 138], [232, 221, 200], [204, 186, 154], [220, 194, 152], [198, 172, 132]]
    albedo, height = masonry(
        pool, size=1024, metres=2.4, course_m=0.27, course_var=0.42, block_ratio=(1.2, 3.4),
        palette=wall_palette, mortar=[212, 200, 178], joint_m=0.016, bevel_m=0.035, seed=1940,
    )
    save_jpg(albedo, "stone-wall.jpg", 80)
    save_gray(height * 255, "stone-wall-height.jpg", 82)

    paving_palette = [[208, 194, 168], [200, 184, 156], [214, 202, 180], [196, 182, 158]]
    albedo, height = masonry(
        pool, size=1024, metres=4.0, course_m=0.6, course_var=0.6, block_ratio=(0.7, 2.0),
        palette=paving_palette, mortar=[172, 158, 136], joint_m=0.018, bevel_m=0.03, seed=31,
    )
    save_jpg(albedo, "paving.jpg", 74)
    save_gray(height * 255, "paving-height.jpg", 80)


def make_dressed(pool: FacePool) -> None:
    """Joint-free dressed limestone (coping, sills, column bases, steps): one large face, made seamless."""
    face = pool.faces[0]
    size = 512
    metres = 1.2
    ppm = size / metres
    patch = resize(face[: int(face.shape[0] * 0.95), : int(face.shape[1] * 0.95)],
                   (int(face.shape[1] * ppm / DETAIL_PX_PER_M), int(face.shape[0] * ppm / DETAIL_PX_PER_M)))
    patch = patch[:size, :size] if patch.shape[0] >= size and patch.shape[1] >= size else resize(patch, (size, size))
    # Seamless by blending with a half-offset copy across the borders.
    shifted = np.roll(np.roll(patch, size // 2, 0), size // 2, 1)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    edge = np.minimum.reduce([xx, size - 1 - xx, yy, size - 1 - yy]) / (size / 2)
    w = smoothstep(0.0, 0.35, edge)[..., None]
    tiled = patch * w + shifted * (1 - w)
    tone = np.array([228.0, 214.0, 190.0])
    save_jpg(tone * tiled, "stone-dressed.jpg", 84)


def make_dome(pool: FacePool) -> None:
    dome_palette = [[232, 220, 198], [224, 208, 180], [236, 228, 210], [218, 204, 178]]
    albedo, height = dome_masonry(
        pool, width=1536, height_px=384, radius=1.75, course_m=0.17, block_m=0.42,
        palette=dome_palette, mortar=[214, 204, 184], joint_m=0.014, seed=7,
    )
    save_jpg(albedo, "dome.jpg", 80)
    save_gray(height * 255, "dome-height.jpg", 80)


def make_bark(day: np.ndarray) -> None:
    trunk = crop(day, TRUNK_BOX)
    bark = np.array([132.0, 116.0, 98.0])
    out = normalise(trunk, bark, sigma=10, keep_low=0.0, gamma=1.1)
    out = resize(out, (256, 384))
    # Seamless: mirror-blend the borders.
    for axis in (0, 1):
        n = out.shape[axis]
        ramp = np.clip(np.abs(np.arange(n) - (n - 1) / 2) / ((n - 1) / 2), 0, 1) ** 4
        ramp = ramp.reshape((-1, 1, 1) if axis == 0 else (1, -1, 1))
        flipped = np.flip(out, axis=axis)
        out = out * (1 - 0.5 * ramp) + flipped * (0.5 * ramp)
    save_jpg(out, "bark.jpg", 84)


def make_foliage(day: np.ndarray, palette: dict) -> None:
    """2×2 atlas of olive foliage clumps cut from the day render's canopy (sky keyed out)."""
    tile = 512
    atlas = np.zeros((tile * 2, tile * 2, 4), np.float32)
    leaf_means = []
    for i, box in enumerate(CANOPY_CLUMPS):
        region = crop(day, box)
        r, g, b = region[..., 0], region[..., 1], region[..., 2]
        lum = luminance(region)
        key = np.clip((g - b - 2) / 14, 0, 1)
        key = np.maximum(key, np.clip((150 - lum) / 40, 0, 1))
        h, w = key.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        rad = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
        # Ragged, leafy outline: towards the rim only the strongest sprigs survive.
        edge = smoothstep(0.35, 0.98, rad)
        strength = blur(luminance(region), 1.2)
        strength = (strength - strength.min()) / max(np.ptp(strength), 1.0)
        alpha = key * smoothstep(edge - 0.1, edge + 0.1, strength * 0.9 + 0.1 * (1 - edge))
        alpha *= 1 - smoothstep(0.92, 1.0, rad)
        alpha = blur(alpha, 0.6)
        # Mild de-lighting so the real sun can shade the cards.
        rgb = normalise(region, region[alpha > 0.6].mean(0) if (alpha > 0.6).any() else region.mean((0, 1)),
                        sigma=30, keep_low=0.35, gamma=0.8)
        leaf_means.append(rgb[alpha > 0.6].mean(0))
        cell = np.dstack([resize(rgb, (tile, tile)), resize(alpha, (tile, tile))[..., None] * 255])
        oy, ox = (i // 2) * tile, (i % 2) * tile
        atlas[oy:oy + tile, ox:ox + tile] = cell
    # Undo the golden cast of the render on the leaf colour (olive leaves are silver-green).
    light = light_of([196, 151, 109]) * np.array([1.0, 0.97, 0.9])
    rgb = atlas[..., :3] / light * 0.8
    # Silver-green: olive leaves are pale on their undersides; lift and slightly desaturate.
    grey = luminance(rgb)[..., None]
    rgb = (grey + 0.78 * (rgb - grey)) * 1.28
    lum_shift = np.array(leaf_means).mean(0) / light * 0.8 * 1.2
    # Bleed opaque leaf colour into the transparent margin so filtering never shows sky fringes.
    weight = (atlas[..., 3] > 140).astype(np.float32)
    bled = blur(rgb * weight[..., None], 6) / np.maximum(blur(weight, 6), 1e-4)[..., None]
    rgb = rgb * weight[..., None] + bled * (1 - weight[..., None])
    atlas[..., :3] = np.clip(rgb, 0, 255)
    save_webp(atlas, "olive-foliage.webp", 80)
    palette["leaf"] = hexcolor(lum_shift)


def ridge(width: int, rng: np.random.Generator, amp: float, waves) -> np.ndarray:
    """Smooth hill silhouette (height in px per column) as a sum of seeded sine waves."""
    x = np.linspace(0, 1, width)
    h = np.zeros(width)
    for period, weight in waves:
        h += weight * np.sin(2 * math.pi * x * period + rng.random() * 2 * math.pi)
    h = (h - h.min()) / max(h.max() - h.min(), 1e-6)
    return h * amp


def make_backdrop(day: np.ndarray, palette: dict) -> None:
    """Wide, calm backdrop: the render's sky gradient and clouds, layered hills, its village hill."""
    W, H = 2048, 1024
    horizon = int(H * 0.72)
    rng = np.random.default_rng(1940)
    sky = crop(day, SKY_BOX)
    rows = np.median(sky, axis=1)  # vertical gradient (blue → warm haze)
    rows = blur(rows[:, None, :], 6)[:, 0, :]
    t = np.linspace(0, 1, horizon)
    src_t = np.linspace(0, 1, rows.shape[0])
    gradient = np.stack([np.interp(t, src_t, rows[:, c]) for c in range(3)], axis=1)
    out = np.empty((H, W, 3), np.float32)
    out[:horizon] = gradient[:, None, :]
    haze = rows[-1]
    out[horizon:] = haze

    # Clouds: the render's own cloud layer (ratio to its gradient), stretched wide, softened.
    cloud = sky / np.maximum(rows[:, None, :], 1)
    cloud = blur(resize(cloud, (W, horizon)), 2.0)
    out[:horizon] *= 1 + 0.45 * (cloud - 1)

    # Far ridges: colours of the render's hills, lighter with distance (atmospheric perspective).
    hills = crop(day, HILLS_BOX)
    hill_far = np.median(hills[: hills.shape[0] // 3].reshape(-1, 3), axis=0)
    hill_near = np.median(hills[hills.shape[0] // 2:].reshape(-1, 3), axis=0)
    yy = np.arange(H)[:, None]
    layers = [
        (0.55, hill_far * 0.62 + haze * 0.38, int(H * 0.06), [(1.3, 1), (3.1, 0.5), (7.0, 0.2)], int(H * 0.045)),
        (0.35, hill_far * 0.7 + hill_near * 0.2 + haze * 0.1, int(H * 0.07), [(1.9, 1), (4.3, 0.45), (9.0, 0.15)], int(H * 0.022)),
        (0.18, hill_near * 0.85 + haze * 0.15, int(H * 0.055), [(2.6, 1), (6.2, 0.4), (13.0, 0.12)], int(H * 0.004)),
    ]
    for depth, colour, amp, waves, lift in layers:
        top = horizon - lift - ridge(W, rng, amp, waves)
        mask = smoothstep(-1.2, 1.2, yy - top[None, :])[..., None]
        # Soft vertical shading: ridge tops catch the low sun, valleys sink into haze.
        below = np.clip((yy - top[None, :]) / max(amp, 1), 0, 1)[..., None]
        fill = colour * (1.06 - 0.1 * below) * (1 - depth * 0.0)
        out = out * (1 - mask) + fill * mask

    # The render's village hill, once, on the right as in the original composition.
    hh = int(H * 0.15)
    band = resize(hills, (int(hills.shape[1] * hh / hills.shape[0]), hh))
    band_sky = np.median(band[: max(2, hh // 10)], axis=(0, 1))  # the band's own sky colour
    diff = blur(np.abs(band - band_sky).sum(2), 1.5)
    ridge_row = np.argmax(diff > 45, axis=0).astype(np.float32)  # first row of land in each column
    ridge_row[~(diff > 45).any(axis=0)] = hh
    ridge_row = blur(ridge_row[None, :], 2.0)[0]
    alpha = smoothstep(-1.5, 1.5, np.arange(hh)[:, None] - ridge_row[None, :])
    bw = band.shape[1]
    xfade = smoothstep(0, bw * 0.28, np.arange(bw)) * smoothstep(0, bw * 0.28, bw - 1 - np.arange(bw))
    alpha = alpha * xfade[None, :]
    band = band * 0.8 + haze * 0.2
    x0, y0 = int(W * 0.64), horizon - hh + int(hh * 0.18)
    region = out[y0:y0 + hh, x0:x0 + bw]
    out[y0:y0 + hh, x0:x0 + bw] = region * (1 - alpha[..., None]) + band * alpha[..., None]

    # Below the ridges: warm ground haze.
    fade = smoothstep(horizon - 2, horizon + 40, np.arange(H))[:, None, None]
    out = out * (1 - fade) + haze * fade
    save_jpg(out, "backdrop.jpg", 82)
    palette["sky"] = {"zenith": hexcolor(rows[0]), "horizon": hexcolor(haze), "horizonV": round(1 - horizon / H, 4)}


def make_palette(day: np.ndarray, mobile: np.ndarray, detail: np.ndarray, palette: dict) -> None:
    light_day = light_of([196, 151, 109])

    def albedo(region, light, pct=(25, 75)):
        px = region.reshape(-1, 3)
        lum = luminance(px)
        lo, hi = np.percentile(lum, pct)
        sel = px[(lum >= lo) & (lum <= hi)]
        return sel.mean(0) / light

    navy = albedo(crop(day, (545, 440, 566, 680)), light_day, (30, 80))
    palette["navy"] = hexcolor(navy)
    beam = albedo(crop(mobile, (470, 955, 690, 975)), light_of([169, 122, 82]), (30, 85))
    palette["timber"] = hexcolor(beam)
    def terracotta(region):
        px = region.reshape(-1, 3)
        lum = luminance(px)
        keep = (px[:, 0] > 1.45 * px[:, 1]) & (px[:, 1] > 1.15 * px[:, 2]) & (lum > 55) & (lum < 215)
        return px[keep]
    roof = np.concatenate([
        terracotta(crop(day, (450, 295, 845, 395))) / light_day,
        terracotta(crop(detail, (460, 0, 1040, 80))) / light_of([211, 184, 157]),
    ])
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
    cv2.setRNGSeed(5)
    _, labels, centres = cv2.kmeans(roof.astype(np.float32), 6, None, criteria, 4, cv2.KMEANS_PP_CENTERS)
    tiles = sorted(np.clip(centres, 0, 255).tolist(), key=lambda c: sum(c))
    palette["tiles"] = [hexcolor(c) for c in tiles]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    day, mobile, detail = load("day.jpg"), load("mobile.jpg"), load("detail.jpg")
    palette: dict = {"source": "Figma: Diwan Al-Taha — Public Portal & Staff Gateway (Concept), frames 1:2–1:5"}
    pool = FacePool(detail)
    make_door(mobile, palette)
    make_arch(mobile, palette)
    make_rosette(detail)
    make_walls(pool)
    make_dressed(pool)
    make_dome(pool)
    make_bark(day)
    make_foliage(day, palette)
    make_backdrop(day, palette)
    make_palette(day, mobile, detail, palette)
    PALETTE_OUT.write_text(json.dumps(palette, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for f in sorted(OUT.iterdir()):
        print(f"{f.name:28s} {f.stat().st_size / 1024:7.1f} KB")
    print(json.dumps(palette, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
