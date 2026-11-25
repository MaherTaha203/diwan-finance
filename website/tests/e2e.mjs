/**
 * End-to-end checks for the Diwan Al-Taha website.
 *
 *   npm run build && npm run test:e2e
 *
 * Serves dist/ with Vite preview and drives Chromium (Playwright) through:
 *  - desktop and phone layouts, no horizontal overflow, no console errors;
 *  - exactly three sections in the approved order, no login/forms;
 *  - the official logo is present, loaded and never rotates;
 *  - the model's Y rotation follows scroll down and reverses on scroll up;
 *  - navigation, map, directions link;
 *  - WebGL disabled and ?static → static renders, content intact;
 *  - prefers-reduced-motion → no rotation.
 * Screenshots go to test-output/ (git-ignored).
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'test-output');
const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}/`;
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

/** Console errors and failed same-origin requests (third-party map tiles are reported separately). */
function watch(page) {
  const log = { errors: [], external: [] };
  page.on('pageerror', (e) => log.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => {
    const url = r.url();
    if (url.startsWith(BASE)) log.errors.push(`requestfailed: ${url}`);
    else log.external.push(url);
  });
  page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) log.errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  return log;
}

const sceneState = (page) => page.evaluate(() => document.documentElement.dataset.scene);
const angle = (page) => page.evaluate(() => Number(document.getElementById('stage-canvas').dataset.angle));
const scrollToFraction = (page, f) => page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), f);

/** Waits until the eased rotation has settled (software WebGL is slow in CI). */
async function settledAngle(page, timeout = 30000) {
  const start = Date.now();
  let previous = await angle(page);
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(400);
    const now = await angle(page);
    if (Math.abs(now - previous) < 1e-4) return now;
    previous = now;
  }
  return previous;
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

async function desktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const log = watch(page);
  await page.goto(BASE, { waitUntil: 'load' });

  const sections = await page.$$eval('main section', (els) => els.map((s) => s.id));
  check('desktop: exactly three sections in order', JSON.stringify(sections) === JSON.stringify(['about', 'history', 'location']), sections.join(', '));
  const forbidden = await page.evaluate(() => document.querySelectorAll('form, input[type="password"], input[type="email"]').length);
  check('desktop: no login or forms', forbidden === 0, `${forbidden} form elements`);
  check('desktop: 1940 shown in history', (await page.textContent('#history')).includes('1940'));

  const logo = await page.$eval('.brand__logo', (img) => ({ ok: img.complete && img.naturalWidth > 0, src: img.currentSrc }));
  check('desktop: official logo loaded in header', logo.ok && logo.src.includes('/brand/logo-'), logo.src);

  await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 60000 }).catch(() => {});
  check('desktop: 3D scene mounted', (await sceneState(page)) === 'ready', await sceneState(page));
  await page.waitForFunction(() => document.getElementById('stage-canvas').dataset.textures === 'ready', null, { timeout: 90000 }).catch(() => {});
  await page.screenshot({ path: path.join(outDir, 'desktop-0.png') });

  // Rotation follows scroll down …
  const a0 = await settledAngle(page);
  const samples = [a0];
  for (const f of [0.33, 0.66, 1]) {
    await scrollToFraction(page, f);
    samples.push(await settledAngle(page));
    await page.screenshot({ path: path.join(outDir, `desktop-${Math.round(f * 100)}.png`) });
  }
  const decreasing = samples.every((v, i) => i === 0 || v < samples[i - 1] - 0.05);
  check('desktop: model rotates on Y as the page scrolls down', decreasing, samples.map((v) => v.toFixed(2)).join(' → '));
  const turned = samples[0] - samples[samples.length - 1];
  check('desktop: rotation reveals sides and back (> 180°)', turned > Math.PI, `${((turned * 180) / Math.PI).toFixed(0)}°`);

  // … and reverses on the way back up.
  await scrollToFraction(page, 0.5);
  const mid = await settledAngle(page);
  await scrollToFraction(page, 0);
  const back = await settledAngle(page);
  check('desktop: rotation reverses when scrolling up', mid > samples[3] && Math.abs(back - a0) < 0.01, `${mid.toFixed(2)} → ${back.toFixed(2)}`);

  // Idle page does not keep rendering.
  const f1 = await page.evaluate(() => Number(document.getElementById('stage-canvas').dataset.frames));
  await page.waitForTimeout(1500);
  const f2 = await page.evaluate(() => Number(document.getElementById('stage-canvas').dataset.frames));
  check('desktop: no rendering while idle (render on demand)', f1 === f2, `${f1} → ${f2} frames`);

  const logoTransform = await page.$eval('.brand__logo', (img) => getComputedStyle(img).transform);
  check('desktop: logo does not rotate', logoTransform === 'none', logoTransform);

  for (const id of ['history', 'location', 'about']) {
    await page.click(`.site-nav a[href="#${id}"]`);
    await page.waitForTimeout(1500);
    const current = await page.$eval('[aria-current="true"]', (a) => a.dataset.sectionLink).catch(() => null);
    const inView = await page.$eval(`#${id}`, (s) => s.getBoundingClientRect().top < window.innerHeight * 0.6);
    check(`desktop: nav link "${id}" scrolls and highlights`, current === id && inView, `aria-current=${current}`);
  }

  const directions = await page.$eval('.button--primary', (a) => ({ href: a.href, target: a.target, rel: a.rel }));
  check('desktop: directions button opens Google Maps directions safely',
    directions.href.startsWith('https://www.google.com/maps/dir/?api=1&destination=') && directions.target === '_blank' && directions.rel.includes('noopener'),
    directions.href);
  const map = await page.$eval('.map__frame', (f) => ({ src: f.src, title: f.title }));
  check('desktop: interactive map embedded with an accessible title', map.src.includes('maps.google.com') && map.title.length > 5);
  check('desktop: no horizontal overflow', await noHorizontalOverflow(page));
  check('desktop: no console errors or failed local requests', log.errors.length === 0, log.errors.join(' | '));
  if (log.external.length) console.log(`INFO  third-party requests that could not load here: ${[...new Set(log.external.map((u) => new URL(u).host))].join(', ')}`);
  await page.close();
}

async function phone(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  const log = watch(page);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 60000 }).catch(() => {});
  check('phone: 3D scene mounted', (await sceneState(page)) === 'ready', `${await sceneState(page)} / quality ${await page.evaluate(() => document.documentElement.dataset.quality)}`);
  await page.waitForFunction(() => document.getElementById('stage-canvas').dataset.textures === 'ready', null, { timeout: 90000 }).catch(() => {});
  await page.screenshot({ path: path.join(outDir, 'phone-0.png') });
  const a0 = await settledAngle(page);
  await scrollToFraction(page, 0.5);
  const a1 = await settledAngle(page);
  await page.screenshot({ path: path.join(outDir, 'phone-50.png') });
  check('phone: model rotates with scroll', a1 < a0 - 0.5, `${a0.toFixed(2)} → ${a1.toFixed(2)}`);

  await page.click('.site-nav a[href="#history"]');
  await page.waitForTimeout(1500);
  const layout = await page.evaluate(() => ({
    stageBottom: document.getElementById('stage').getBoundingClientRect().bottom,
    headingTop: document.querySelector('#history .eyebrow').getBoundingClientRect().top,
  }));
  check('phone: section text lands below the pinned model', layout.headingTop >= layout.stageBottom - 1, `${layout.headingTop.toFixed(0)} ≥ ${layout.stageBottom.toFixed(0)}`);
  check('phone: no horizontal overflow', await noHorizontalOverflow(page));
  check('phone: no console errors or failed local requests', log.errors.length === 0, log.errors.join(' | '));
  await context.close();
}

async function noWebGL() {
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const log = watch(page);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check('no WebGL: page falls back to static renders', (await sceneState(page)) === 'static');
  const img = await page.$eval('#stage-fallback', (i) => ({ ok: i.complete && i.naturalWidth > 0, src: i.currentSrc, opacity: getComputedStyle(i).opacity }));
  check('no WebGL: static render visible', img.ok && img.opacity === '1', img.src);
  await page.click('.site-nav a[href="#history"]');
  await page.waitForTimeout(1500);
  const swapped = await page.$eval('#stage-fallback', (i) => i.getAttribute('src'));
  check('no WebGL: static render follows the section', swapped.includes('diwan-side'), swapped);
  const text = await page.textContent('main');
  check('no WebGL: all content readable', text.includes('ديوان آل طه') && text.includes('1940') && text.includes('سردا'));
  check('no WebGL: no console errors', log.errors.length === 0, log.errors.join(' | '));
  await page.screenshot({ path: path.join(outDir, 'no-webgl.png') });
  await browser.close();
}

async function staticParamAndReducedMotion(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto(`${BASE}?static`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('?static: 3D is skipped', (await sceneState(page)) === 'static');
  await page.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rm = await context.newPage();
  await rm.goto(BASE, { waitUntil: 'load' });
  await rm.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 60000 }).catch(() => {});
  const r0 = await settledAngle(rm);
  await scrollToFraction(rm, 0.8);
  const r1 = await settledAngle(rm);
  check('reduced motion: model stays still while scrolling', Math.abs(r0 - r1) < 1e-3, `${r0.toFixed(2)} / ${r1.toFixed(2)}`);
  await context.close();
}

await mkdir(outDir, { recursive: true });
const server = await preview({ root, logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: GL_ARGS });
try {
  await desktop(browser);
  await phone(browser);
  await staticParamAndReducedMotion(browser);
  await noWebGL();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
