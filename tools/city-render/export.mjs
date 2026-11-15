/**
 * Export the Scene 04 static city images + hotspot JSON.
 *
 *   1. npx vite --port 5180 --strictPort        (from the project root)
 *   2. node tools/city-render/export.mjs [--url http://127.0.0.1:5180] [--only desktop|mobile] [--ss 2]
 *
 * Opens tools/city-render/index.html in headless Chromium with the GPU enabled, waits for
 * window.__renderDone, then writes every base64 output and city.json into tools/static-city/.
 * AVIF is skipped: there is no encoder available without new dependencies (no sharp / ffmpeg).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '';
const outDir = join(here, '..', 'static-city', outArg);
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const base = arg('url', 'http://127.0.0.1:5180');
const only = arg('only', '');
const ss = arg('ss', '2');

const t0 = Date.now();
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (m) => console.log(`[page] ${m.text()}`));
page.on('pageerror', (e) => console.error(`[pageerror] ${e.message}`));
const q = new URLSearchParams({ ss, ...(only ? { only } : {}) });
// Any other --key value pairs are forwarded to the page as query params (e.g. --smap 4096).
for (let i = 2; i < process.argv.length - 1; i++) {
  const k = process.argv[i];
  if (k.startsWith('--') && !['--url', '--only', '--ss', '--out'].includes(k)) q.set(k.slice(2), process.argv[i + 1]);
}
await page.goto(`${base}/tools/city-render/index.html?${q}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__renderDone || window.__renderError, null, { timeout: 600_000, polling: 500 });
const err = await page.evaluate(() => window.__renderError);
if (err) {
  console.error(err);
  await browser.close();
  process.exit(1);
}
const { outputs, json, stats } = await page.evaluate(() => ({
  outputs: window.__outputs,
  json: window.__cityJson,
  stats: window.__stats,
}));
await browser.close();

mkdirSync(outDir, { recursive: true });
for (const [file, b64] of Object.entries(outputs)) writeFileSync(join(outDir, file), Buffer.from(b64, 'base64'));
if (!only) writeFileSync(join(outDir, 'city.json'), `${JSON.stringify(json, null, 2)}\n`);
else writeFileSync(join(outDir, `city.${only}.partial.json`), `${JSON.stringify(json, null, 2)}\n`);
console.log(JSON.stringify(stats, null, 2));
console.log(`export finished in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${outDir}`);
