/**
 * Renders the static fallback images from the real 3D model.
 *
 *   npm run render:fallback
 *
 * Starts a Vite dev server, opens the page in capture mode (?capture) with
 * Playwright/Chromium, turns the model to each facade angle and saves the
 * rendered scene (building, tree, forecourt, sky) as WebP into
 * public/fallback/. Requires Playwright with Chromium available to Node
 * (globally installed is fine).
 */
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { FACADE_ANGLES } from '../src/scene/scroll-rotation.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'fallback');
const SIZE = 1200;
const QUALITY = 0.8;

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

try {
  // 1600×940 makes the desktop stage exactly square (54% × (100vh − header)).
  const page = await browser.newPage({ viewport: { width: 1600, height: 940 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', (error) => { throw error; });
  await page.goto('http://127.0.0.1:5199/?capture&quality=high', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__diwanCapture && window.__diwanCapture.texturesReady(), null, { timeout: 120000 });
  await mkdir(outDir, { recursive: true });

  for (const [name, angle] of Object.entries(FACADE_ANGLES)) {
    const dataUrl = await page.evaluate(({ angle, size, quality }) => {
      window.__diwanCapture.setAngle(angle);
      const source = document.getElementById('stage-canvas');
      const out = document.createElement('canvas');
      out.width = size;
      out.height = size;
      const side = Math.min(source.width, source.height);
      out.getContext('2d').drawImage(
        source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, size, size,
      );
      return out.toDataURL('image/webp', quality);
    }, { angle, size: SIZE, quality: QUALITY });
    const file = path.join(outDir, `diwan-${name}.webp`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`saved ${path.relative(root, file)} (angle ${angle})`);
  }
} finally {
  await browser.close();
  await server.close();
}
