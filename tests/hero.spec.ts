import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const TITLE_WORDS = ['INTEGRATED', 'WASTE', 'MANAGEMENT', 'SUITE'];
const SUBTITLE = 'A unified digital platform for waste management.';
const CITY_TITLE = 'Smart Collection. Connected Cities.';
const CITY_SUBTITLE = 'GPS-enabled fleet tracking and optimized collection routes.';

/** Collects console errors, page errors and every requested URL for a page. */
function watch(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('request', (req) => requests.push(req.url()));
  return { consoleErrors, pageErrors, requests };
}

const opacities = (page: Page, selector: string) =>
  page.$$eval(selector, (els) =>
    els.map((el) => Number(getComputedStyle(el).opacity)),
  );

/** Visible to Playwright *and* not hidden by opacity (toBeVisible ignores opacity). */
async function expectCopyVisible(page: Page) {
  const title = page.locator('h1#hero-title');
  await expect(title).toBeVisible();
  await expect(title).toHaveText(TITLE_WORDS.join(' '));
  await expect(page.locator('h1#hero-title .hero__word')).toHaveCount(
    TITLE_WORDS.length,
  );
  const subtitle = page.locator('.hero__subtitle');
  await expect(subtitle).toBeVisible();
  await expect(subtitle).toHaveText(SUBTITLE);
  await expect
    .poll(() => opacities(page, '.hero__word, .hero__subtitle'))
    .toEqual(Array(TITLE_WORDS.length + 1).fill(1));
}

/** Scene 02 copy: present and fully opaque (static/still/no-JS modes). */
async function expectCityCopyVisible(page: Page) {
  const title = page.locator('h2.hero__city-title');
  await expect(title).toBeVisible();
  await expect(title).toHaveText(CITY_TITLE);
  const subtitle = page.locator('p.hero__city-subtitle');
  await expect(subtitle).toBeVisible();
  await expect(subtitle).toHaveText(CITY_SUBTITLE);
  await expect
    .poll(() => opacities(page, '.hero__city-line'))
    .toEqual([1, 1]);
}

const isHeavyAsset = (url: string) =>
  /\/assets\/Stage-[^/]*\.js/.test(url) ||
  /\/assets\/City-[^/]*\.js/.test(url) ||
  /\/textures\/city\//.test(url) ||
  /\.hdr(\?|$)/.test(url) ||
  /\/(textures|models|draco|hdri)\//.test(url);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('prerendered hero copy is present and visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveCount(1);
    await expectCopyVisible(page);
    await expectCityCopyVisible(page);
  });
});

// Runs only in the `chromium-software` project (SwiftShader forced in playwright.config.ts),
// so detection sees a software rasteriser regardless of the host GPU.
test.describe('default tier on a software renderer @software', () => {
  test('falls back to the static poster without loading 3D', async ({
    page,
  }) => {
    const w = watch(page);
    await page.goto('/');
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return 'no-webgl2';
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    });
    test.info().annotations.push({ type: 'renderer', description: renderer });

    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/);
    await expectCopyVisible(page);
    await expectCityCopyVisible(page);
    await expect(page.locator('.hero__stage canvas')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(w.requests.filter(isHeavyAsset)).toEqual([]);
    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('renders a still frame with visible copy and no scroll pin', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const w = watch(page);
    await page.goto('/?quality=high');
    const hero = page.locator('section.hero');
    await expect(hero).toHaveClass(/\bhero--still\b/);
    await expect(hero).toHaveAttribute('data-ready', 'true', {
      timeout: 60_000,
    });
    await expect(page.locator('.hero__stage canvas')).toHaveCount(1);
    await expectCopyVisible(page);
    await expectCityCopyVisible(page);

    const { docHeight, viewport, sectionHeight } = await page.evaluate(() => ({
      docHeight: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
      sectionHeight: document
        .querySelector('section.hero')!
        .getBoundingClientRect().height,
    }));
    expect(Math.abs(sectionHeight - viewport)).toBeLessThanOrEqual(2);
    expect(Math.abs(docHeight - viewport)).toBeLessThanOrEqual(2);
    expect(w.pageErrors).toEqual([]);
  });
});

test.describe('cinematic', () => {
  test('loads, plays the intro and survives a full scroll round-trip', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const w = watch(page);
    await page.goto('/?quality=high');
    const hero = page.locator('section.hero');
    await expect(hero).toHaveClass(/\bhero--cinematic\b/);
    await expect(hero).toHaveAttribute('data-ready', 'true', {
      timeout: 60_000,
    });
    await expect(page.locator('.hero__stage canvas')).toHaveCount(1);

    const viewport = await page.evaluate(() => window.innerHeight);
    const sectionHeight = await hero.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    // Scene 01 + Scene 02 (1400vh) + Phase 3.1 collection (450vh) = 1850vh.
    expect(Math.abs(sectionHeight - viewport * 18.5)).toBeLessThanOrEqual(4);

    // Intro (~9.5 s) reveals the title by ~8 s; allow margin.
    await page.waitForTimeout(11_000);
    await expect
      .poll(() => opacities(page, '.hero__word'), { timeout: 5_000 })
      .toEqual(Array(TITLE_WORDS.length).fill(1));

    // Scroll to the bottom (end of Phase 3.1, past Scene 02): Scene 01 copy and the city copy
    // are both clear.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(3_000);
    await expect
      .poll(() => opacities(page, '.hero__word, .hero__subtitle'), {
        timeout: 5_000,
      })
      .toEqual(Array(TITLE_WORDS.length + 1).fill(0));
    await expect
      .poll(() => opacities(page, '.hero__city-line'), { timeout: 5_000 })
      .toEqual([0, 0]);

    // Back to the top: title returns.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3_000);
    await expect
      .poll(() => opacities(page, '.hero__word'), { timeout: 5_000 })
      .toEqual(Array(TITLE_WORDS.length).fill(1));
    expect(await opacities(page, '.hero__city-line')).toEqual([0, 0]);

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });
});

test.describe('secondary routes', () => {
  test('/privacy renders a heading and is noindex', async ({ page }) => {
    // Trailing slash: the prerendered file is dist/privacy/index.html. `vite preview` answers
    // `/privacy` (no slash) with the SPA fallback (home HTML), which has no robots meta.
    await page.goto('/privacy/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });

  test('/404 renders a heading', async ({ page }) => {
    await page.goto('/404');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('dist/404.html exists and is noindex', () => {
    const html = readFileSync(resolve('dist/404.html'), 'utf8');
    expect(html).toContain('<h1');
    expect(html).toMatch(/<meta name="robots" content="noindex/);
  });
});

test('SSR bundle does not import three', () => {
  const src = readFileSync(resolve('.prerender/entry-server.js'), 'utf8');
  expect(src).not.toMatch(/from\s*['"](three|@react-three\/[^'"]+)['"]/);
  expect(src).not.toMatch(/import\(\s*['"](three|@react-three\/[^'"]+)['"]/);
  expect(src).not.toContain('three');
});
