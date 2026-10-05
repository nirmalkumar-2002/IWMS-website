import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
const report = [];
const base = 'http://127.0.0.1:4174';
const directory = 'components/scene/reports';
try {
  await mkdir(directory, { recursive: true });
  for (const width of [360, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: width === 360 ? 800 : 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('[data-motion="active"]');
    const initial = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      ctaAboveFold: document.querySelector('.hero-actions').getBoundingClientRect().bottom <= innerHeight,
      chapters: document.querySelectorAll('.experience-chapters a').length,
      pins: document.querySelectorAll('.pin-spacer').length,
    }));
    assert.equal(initial.overflow, false);
    assert.equal(initial.ctaAboveFold, true);
    assert.equal(initial.chapters, 15);
    assert.equal(initial.pins, 0);
    await page.screenshot({ path: `${directory}/experience-${width}.png` });
    const ids = ['problem', 'how-it-works', 'modules', 'dashboard', 'technologies', 'citizen', 'compliance', 'impact', 'finance', 'estimator', 'roadmap', 'audience', 'faq', 'contact'];
    const chapters = [];
    for (const id of ids) {
      await page.evaluate(id => {
        const section = document.getElementById(id);
        window.scrollTo({ top: section.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' });
      }, id);
      await page.waitForTimeout(850);
      const state = await page.evaluate(() => ({
        chapter: document.querySelector('.scroll-experience').dataset.chapter,
        world: document.querySelector('[data-world-pan]').getAttribute('transform'),
        stageVisible: document.querySelector('.experience-stage').getBoundingClientRect().top < innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.equal(state.overflow, false);
      assert.equal(state.stageVisible, true);
      assert.match(state.world, /translate\(-/);
      chapters.push({ target: id, ...state });
      if ((width === 1440 || width === 360) && ['how-it-works', 'dashboard', 'roadmap'].includes(id))
        await page.screenshot({ path: `${directory}/experience-${width}-${id}.png` });
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.scroll-experience').getAttribute('data-chapter'), 'platform');
    await page.getByRole('button', { name: 'Pause scene motion' }).click();
    assert.equal(await page.locator('.scroll-experience').getAttribute('data-paused'), 'true');
    await page.evaluate(() => window.scrollTo({ top: 4000, behavior: 'instant' }));
    await page.waitForTimeout(900);
    assert.equal(await page.locator('[data-world-pan]').getAttribute('transform'), null);
    await page.getByRole('button', { name: 'Resume scene motion' }).click();
    await page.waitForSelector('[data-motion="active"]');
    assert.deepEqual(errors, []);
    report.push({ width, initial, chapters, errors });
    await page.close();
  }
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const page = await browser.newPage({ ...options, viewport: { width: 360, height: 800 } });
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(base);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('h1').isVisible(), true);
    assert.equal(await page.locator('.experience-chapters a').count(), 15);
    assert.equal(await page.locator('[data-motion="active"]').count(), 0);
    assert.deepEqual(requests.filter(url => /runtime-.*\.js/.test(url)), []);
    report.push({ ...options, readable: true, animationRequests: 0 });
    await page.close();
  }
  await writeFile(`${directory}/checks.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.map(({ width, initial, errors, ...other }) => width ? { width, ...initial, errors } : other), null, 2));
} finally { await browser.close(); }
