import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 2.2 sunrise QA. Runs on the real-GPU project with `?debug`, which exposes
 * `window.__iwmsHero.sun()`. Sun progress is a pure function of journey distance, so every
 * assertion is made on a settled rig (scroll, distance and applied progress frame-stable).
 */

const SCENE1_END_DISTANCE = 29.4;
const NIGHT_ZENITH = '080d19';
/** World.tsx lamp-head emissive base (Scene 01 value). */
const LAMP_BASE = 2.4;

interface Sun {
  distance: number;
  expected: number;
  progress: number;
  sunLight: number;
  hemisphere: number;
  zenith: string | null;
  lampHeads: number[];
}
interface HeroDebug {
  rig: { driveSec: number; cityU: number; approach: number };
  distance: () => number;
  sun: () => Sun;
  info: () => { programs: number };
}

function watch(page: Page) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  return { pageErrors };
}

const sun = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.sun(),
  );

const programs = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.info()
        .programs,
  );

const maxScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(y));
}

/**
 * Settled = scrollY, journey distance, cityU and the applied sun state have been identical for
 * ≥ 300 ms AND ≥ 12 animation frames (frame-counted so a slow, GPU-contended page cannot fake
 * stability).
 */
async function settle(page: Page, timeout = 30_000): Promise<Sun> {
  const ok = await page.evaluate(
    ({ timeout }) =>
      new Promise<boolean>((resolve) => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const key = () => {
          const s = h.sun();
          return `${window.scrollY}|${s.distance}|${h.rig.cityU}|${s.progress}|${s.sunLight}|${s.hemisphere}|${s.zenith}`;
        };
        const start = performance.now();
        let last = key();
        let since = start;
        let frames = 0;
        const tick = () => {
          const now = performance.now();
          const k = key();
          if (k !== last) {
            last = k;
            since = now;
            frames = 0;
          } else frames++;
          if (frames >= 12 && now - since >= 300) return resolve(true);
          if (now - start > timeout) return resolve(false);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { timeout },
  );
  const s = await sun(page);
  if (!ok)
    throw new Error(
      `rig did not settle within ${timeout} ms (last ${JSON.stringify(s)})`,
    );
  return s;
}

async function at(page: Page, y: number) {
  await scrollToY(page, y);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  return settle(page);
}

async function openCinematic(page: Page) {
  await page.goto('/?quality=high&debug');
  const hero = page.locator('section.hero');
  await expect(hero).toHaveClass(/\bhero--cinematic\b/);
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(() => '__iwmsHero' in window, undefined, {
    timeout: 30_000,
  });
  // Let startExperience wire the ScrollTrigger (it resets scroll to 0).
  await page.waitForTimeout(1_500);
  await settle(page);
}

/** Smallest scroll y where the settled distance exceeds `d` (distance is monotonic in scroll). */
async function yForDistance(page: Page, d: number, lo: number, hi: number) {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await at(page, mid)).distance > d) hi = mid;
    else lo = mid;
  }
  return hi;
}

const sunKey = (s: Sun) => ({
  progress: s.progress,
  sunLight: s.sunLight,
  hemisphere: s.hemisphere,
  zenith: s.zenith,
});

test.describe('Sunrise', () => {
  test.describe.configure({ timeout: 180_000 });

  test('Scene 01 stays pre-dawn', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    await scrollToY(page, 0);
    await page.waitForFunction(
      () =>
        (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig
          .approach === 0,
      undefined,
      { timeout: 30_000 },
    );
    const max = await maxScroll(page);
    const yEnd = await yForDistance(page, SCENE1_END_DISTANCE, 0, max);
    const ys = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.floor((yEnd - 1) * f));
    for (const y of ys) {
      const s = await at(page, y);
      const detail = `y=${y} ${JSON.stringify(s)}`;
      expect(s.distance, detail).toBeLessThanOrEqual(SCENE1_END_DISTANCE);
      expect(s.progress, detail).toBe(0);
      expect(s.sunLight, detail).toBe(0);
      expect(s.zenith, detail).toBe(NIGHT_ZENITH);
      expect(s.lampHeads.length, detail).toBeGreaterThan(0);
      for (const l of s.lampHeads)
        expect(l, detail).toBeGreaterThanOrEqual(LAMP_BASE - 0.01);
    }
    expect(w.pageErrors).toEqual([]);
  });

  test('sunrise is monotonic through Scene 02 and matches sunAt(distance)', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const steps = 30;
    const trace: string[] = [];
    let prev = -Infinity;
    let last: Sun | null = null;
    for (let i = 0; i <= steps; i++) {
      const s = await at(page, (max * i) / steps);
      trace.push(
        `${i}: d=${s.distance.toFixed(3)} p=${s.progress.toFixed(6)} sun=${s.sunLight.toFixed(4)} z=${s.zenith}`,
      );
      const detail = () => trace.join('\n');
      expect(s.progress, `progress decreased\n${detail()}`).toBeGreaterThanOrEqual(prev);
      expect(
        Math.abs(s.progress - s.expected),
        `applied ≠ sunAt(d)\n${detail()}`,
      ).toBeLessThan(1e-6);
      prev = s.progress;
      last = s;
    }
    test.info().annotations.push({ type: 'sun-trace', description: trace.join('\n') });
    expect(last!.progress).toBe(1);
    expect(last!.sunLight).toBeGreaterThan(1);
    expect(w.pageErrors).toEqual([]);
  });

  test('sun state is identical arriving from above and below', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const yStart = await yForDistance(page, 45, 0, max);
    const fracs = [0.2, 0.5, 0.8];
    for (const f of fracs) {
      const y = yStart + (max - yStart) * f;
      await at(page, Math.max(0, y - 400));
      const fromAbove = await at(page, y);
      await at(page, Math.min(max, y + 400));
      const fromBelow = await at(page, y);
      const detail = `y=${Math.round(y)} above=${JSON.stringify(fromAbove)} below=${JSON.stringify(fromBelow)}`;
      expect(fromAbove.progress, detail).toBeGreaterThan(0);
      expect(sunKey(fromBelow), detail).toEqual(sunKey(fromAbove));
    }
    expect(w.pageErrors).toEqual([]);
  });

  test('rapid scrolling settles on the exact sun state', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    for (let i = 0; i < 10; i++) {
      await scrollToY(page, max * 0.3);
      await page.waitForTimeout(40);
      await scrollToY(page, max * 0.95);
      await page.waitForTimeout(40);
    }
    const s = await at(page, max * 0.7);
    expect(s.progress, JSON.stringify(s)).toBeGreaterThan(0);
    expect(Math.abs(s.progress - s.expected), JSON.stringify(s)).toBeLessThan(1e-6);
    expect(w.pageErrors).toEqual([]);
  });

  test('sunrise causes no shader recompiles', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const end1 = await at(page, max);
    expect.soft(end1.progress, "sun progress at the end of the journey").toBe(1);
    const p1 = await programs(page);
    await at(page, max * 0.5);
    const pMid = await programs(page);
    const end2 = await at(page, max);
    const p2 = await programs(page);
    expect.soft(end2.progress, "sun progress at the end of the journey").toBe(1);
    expect(pMid, 'programs after scrolling back to 0.5').toBe(p1);
    expect(p2, 'programs after returning to the end').toBe(p1);
    expect(w.pageErrors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('still frame stays pre-dawn', async ({ page }) => {
      const w = watch(page);
      await page.goto('/?quality=high&debug');
      const hero = page.locator('section.hero');
      await expect(hero).toHaveClass(/\bhero--still\b/);
      await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
      await page.waitForFunction(() => '__iwmsHero' in window, undefined, {
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);
      const s = await sun(page);
      expect(s.progress, JSON.stringify(s)).toBe(0);
      expect(s.sunLight, JSON.stringify(s)).toBe(0);
      expect(w.pageErrors).toEqual([]);
    });
  });
});
