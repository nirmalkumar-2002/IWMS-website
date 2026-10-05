import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const results = [];
try {
  await mkdir('components/sections/Hero/reports', { recursive: true });
  for (const width of [360, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 360 ? 800 : 900 },
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4174/');
    await page.waitForSelector('[data-enhanced="true"]');
    await page.waitForTimeout(250);
    const before = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      pins: document.querySelectorAll('.pin-spacer').length,
      cta:
        document.querySelector('.hero-actions').getBoundingClientRect().bottom <
        innerHeight,
    }));
    await page.screenshot({
      path: `components/sections/Hero/reports/hero-${width}.png`,
    });
    await page.evaluate(() => window.scrollTo(0, innerHeight));
    await page.waitForTimeout(1200);
    if (width === 1440)
      await page.screenshot({
        path: 'components/sections/Hero/reports/hero-verified.png',
      });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);
    await page.getByRole('link', { name: 'Skip animation' }).last().click();
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => ({
      pins: document.querySelectorAll('.pin-spacer').length,
      focus: document.activeElement?.id,
    }));
    results.push({ width, before, after, errors });
    await page.close();
  }
  const reduced = await browser.newPage({
    reducedMotion: 'reduce',
    viewport: { width: 360, height: 800 },
  });
  const requests = [];
  reduced.on('request', (request) => requests.push(request.url()));
  await reduced.goto('http://127.0.0.1:4174/dev/hero/');
  await reduced.waitForTimeout(1800);
  results.push({
    reducedMotion: true,
    pins: await reduced.locator('.pin-spacer').count(),
    animationRequests: requests.filter((url) => /runtime-.*\.js/.test(url)),
    verified: await reduced.locator('[data-verify]').isVisible(),
  });
  await reduced.screenshot({
    path: 'components/sections/Hero/reports/hero-reduced.png',
  });
  results[5].skipVisible =
    (await reduced.getByRole('link', { name: 'Skip animation' }).count()) > 0;
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 800 },
  });
  await nojs.goto('http://127.0.0.1:4174/');
  results.push({
    nojs: true,
    heading: await nojs.locator('h1').textContent(),
    verified: await nojs.locator('[data-verify]').isVisible(),
  });
  await writeFile(
    'components/sections/Hero/reports/checks.json',
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
  if (
    results.some(
      (r) =>
        r.errors?.length ||
        r.before?.overflow ||
        r.before?.cta === false ||
        r.after?.pins ||
        (r.after?.focus && r.after.focus !== 'hero-end') ||
        r.animationRequests?.length ||
        r.skipVisible,
    )
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
