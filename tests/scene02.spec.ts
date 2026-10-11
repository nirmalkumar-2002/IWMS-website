import { test, expect, type Page } from '@playwright/test';

/**
 * Scene 02 (city entry) QA. Runs on the real-GPU project with `?debug`, which exposes
 * `window.__iwmsHero = { rig, distance(), info() }`. Nothing here depends on city visuals.
 */

const SCENE1_END_DISTANCE = 29.4;
const JOURNEY_MIN_END = 680;

interface HeroDebug {
  rig: { driveSec: number; cityU: number };
  distance: () => number;
  info: () => { programs: number };
}
type Snapshot = { distance: number; cityU: number; driveSec: number };

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

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
    return {
      distance: h.distance(),
      cityU: h.rig.cityU,
      driveSec: h.rig.driveSec,
    };
  });

const maxScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

/** Polls the rig until distance/cityU are unchanged for ~300 ms; returns the settled state. */
async function settle(page: Page, timeout = 15_000): Promise<Snapshot> {
  await page.waitForTimeout(80);
  const deadline = Date.now() + timeout;
  let last = await snapshot(page);
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await page.waitForTimeout(60);
    const now = await snapshot(page);
    if (now.distance !== last.distance || now.cityU !== last.cityU) {
      last = now;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 300) {
      return now;
    }
  }
  throw new Error(`rig did not settle within ${timeout} ms (last ${JSON.stringify(last)})`);
}

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(y));
}

async function scrollToFrac(page: Page, frac: number) {
  const max = await maxScroll(page);
  await scrollToY(page, frac * max);
}

async function openCinematic(page: Page) {
  await page.goto('/?quality=high&debug');
  const hero = page.locator('section.hero');
  await expect(hero).toHaveClass(/\bhero--cinematic\b/);
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(
    () => '__iwmsHero' in window,
    undefined,
    { timeout: 30_000 },
  );
  // Let startExperience wire the ScrollTrigger (it resets scroll to 0).
  await page.waitForTimeout(1_500);
  await settle(page);
}

test.describe('Scene 02 city entry', () => {
  test.describe.configure({ timeout: 180_000 });
  // chromium-gpu only: the chromium-software project greps for @software.

  test('journey distance is monotonic over a full scroll', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const steps = 30;
    const trace: Array<[number, number]> = [];
    let prev = -Infinity;
    for (let i = 0; i <= steps; i++) {
      await scrollToY(page, (max * i) / steps);
      const { distance } = await settle(page);
      trace.push([i / steps, distance]);
      expect(
        distance,
        `distance decreased at step ${i}: ${JSON.stringify(trace)}`,
      ).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = distance;
    }
    test.info().annotations.push({ type: 'trace', description: JSON.stringify(trace) });
    expect(prev).toBeGreaterThanOrEqual(JOURNEY_MIN_END);
    expect(w.pageErrors).toEqual([]);
  });

  test('Scene 01 → 02 hand-over is continuous', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);

    // Binary-search the scroll position where the truck reaches the hand-over distance.
    let lo = 0;
    let hi = max;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      await scrollToY(page, mid);
      const { distance } = await settle(page);
      if (distance < SCENE1_END_DISTANCE) lo = mid;
      else hi = mid;
    }
    const boundary = hi;
    const step = max * 0.002;
    const samples: Array<{ y: number } & Snapshot> = [];
    for (let i = -12; i <= 16; i++) {
      const y = boundary + i * step;
      await scrollToY(page, y);
      samples.push({ y: Math.round(y), ...(await settle(page)) });
    }
    const detail = JSON.stringify(samples);
    for (let i = 1; i < samples.length; i++) {
      const dd = samples[i].distance - samples[i - 1].distance;
      const du = samples[i].cityU - samples[i - 1].cityU;
      expect(dd, `distance jump at sample ${i}: ${detail}`).toBeGreaterThanOrEqual(-1e-6);
      expect(dd, `distance jump at sample ${i}: ${detail}`).toBeLessThan(6);
      expect(du, `cityU jump at sample ${i}: ${detail}`).toBeGreaterThanOrEqual(-1e-6);
      expect(du, `cityU jump at sample ${i}: ${detail}`).toBeLessThan(0.02);
    }
    expect(samples[0].cityU, detail).toBe(0);
    expect(samples[0].distance, detail).toBeLessThan(SCENE1_END_DISTANCE);
    expect(samples.at(-1)!.cityU, detail).toBeGreaterThan(0);
    expect(samples.at(-1)!.distance, detail).toBeGreaterThan(SCENE1_END_DISTANCE);
    expect(w.pageErrors).toEqual([]);
  });

  test('scrubbing is deterministic, reversible and survives rapid scrolling', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const recorded: Record<number, Snapshot> = {};
    for (const frac of [0.55, 0.75, 0.9]) {
      await scrollToFrac(page, Math.min(1, frac + 0.08));
      await settle(page);
      await scrollToFrac(page, frac);
      const fromAbove = await settle(page);
      await scrollToFrac(page, frac - 0.08);
      await settle(page);
      await scrollToFrac(page, frac);
      const fromBelow = await settle(page);
      const detail = `frac ${frac}: above ${JSON.stringify(fromAbove)} below ${JSON.stringify(fromBelow)}`;
      expect(Math.abs(fromAbove.distance - fromBelow.distance), detail).toBeLessThanOrEqual(0.05);
      expect(Math.abs(fromAbove.cityU - fromBelow.cityU), detail).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(fromAbove.driveSec - fromBelow.driveSec), detail).toBeLessThanOrEqual(1e-3);
      recorded[frac] = fromBelow;
    }

    // Rapid scroll: no settling between jumps.
    for (let i = 0; i < 4; i++) {
      for (const frac of [1, 0, 0.7]) {
        await scrollToFrac(page, frac);
        await page.waitForTimeout(40);
      }
    }
    await scrollToFrac(page, 0.7);
    const afterRapid = await settle(page);
    // Fresh reference for 0.7 (approached from above/below in the deterministic pass above).
    await scrollToFrac(page, 0.6);
    await settle(page);
    await scrollToFrac(page, 0.7);
    const reference = await settle(page);
    expect(
      Math.abs(afterRapid.distance - reference.distance),
      `after rapid ${JSON.stringify(afterRapid)} vs ${JSON.stringify(reference)}`,
    ).toBeLessThanOrEqual(0.05);
    expect(Math.abs(afterRapid.cityU - reference.cityU)).toBeLessThanOrEqual(1e-3);

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('city copy shows only around the establishing shot', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    expect(await opacities(page, '.hero__city-line')).toEqual([0, 0]);

    // cityU is non-decreasing in scroll: binary-search for cityU ≈ 0.5 (establish).
    let lo = 0;
    let hi = max;
    let found: Snapshot | null = null;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      await scrollToY(page, mid);
      const s = await settle(page);
      if (s.cityU >= 0.48 && s.cityU <= 0.52) {
        found = s;
        break;
      }
      if (s.cityU < 0.48) lo = mid;
      else hi = mid;
    }
    expect(found, 'could not find a scroll position with cityU in [0.48, 0.52]').not.toBeNull();
    const y = await page.evaluate(() => window.scrollY);
    await expect
      .poll(() => opacities(page, '.hero__city-line'), {
        timeout: 3_000,
        message: `city copy at scrollY ${y}/${max} (${JSON.stringify(found)})`,
      })
      .toEqual([1, 1]);

    await scrollToFrac(page, 1);
    await settle(page);
    await expect
      .poll(() => opacities(page, '.hero__city-line'), { timeout: 3_000 })
      .toEqual([0, 0]);
    await scrollToFrac(page, 0);
    await settle(page);
    await expect
      .poll(() => opacities(page, '.hero__city-line'), { timeout: 3_000 })
      .toEqual([0, 0]);
    expect(w.pageErrors).toEqual([]);
  });

  test('no errors and no shader recompiles late in the journey', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const programs = () =>
      page.evaluate(
        () => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.info().programs,
      );
    // Walk to mid-Scene 02 so everything the city needs has been drawn at least once.
    for (let f = 0; f <= 0.75; f += 0.05) {
      await scrollToFrac(page, f);
      await settle(page);
    }
    await page.waitForTimeout(2_000);
    const mid = await programs();
    for (let f = 0.75; f <= 1.0001; f += 0.025) {
      await scrollToFrac(page, f);
      await settle(page);
    }
    await page.waitForTimeout(1_000);
    const end = await programs();
    test.info().annotations.push({ type: 'programs', description: `mid ${mid}, end ${end}` });
    expect(end - mid, `programs mid ${mid} → end ${end}`).toBeLessThanOrEqual(2);
    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('keeps the still frame and never loads the city chunk', async ({ page }) => {
      const w = watch(page);
      await page.goto('/?quality=high&debug');
      const hero = page.locator('section.hero');
      await expect(hero).toHaveClass(/\bhero--still\b/);
      await expect(hero).not.toHaveClass(/\bhero--cinematic\b/);
      await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
      await expect(page.locator('.hero__stage canvas')).toHaveCount(1);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1_500);
      expect(w.requests.filter((u) => /\/assets\/City-[^/]*\.js/.test(u))).toEqual([]);
      expect(w.pageErrors).toEqual([]);
    });
  });
});
