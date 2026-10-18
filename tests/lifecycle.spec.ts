import { test, expect, type Page } from '@playwright/test';

/**
 * Scene 04 M1: the hero's render loop pauses while the hero section is entirely off-screen and
 * resumes when it scrolls back in, without recreating the WebGL context, recompiling programs or
 * disturbing the timeline. Content after the hero does not exist yet, so the test appends a tall
 * temporary block after the hero section (standing in for Scene 04).
 *
 * Uses `?debug&testcam` (deterministic camera: no hand-held float, no damping), so the camera
 * position is an exact function of the rig and can be compared before/after the pause.
 */

interface HeroDebug {
  rig: Record<string, number>;
  camera: () => [number, number, number];
  loop: () => { frames: number; frameloop: string };
  info: () => { programs: number };
}
type Snapshot = Record<string, number>;

const RIG_KEYS = ['driveSec', 'cityU', 'collectU', 'pin', 'net', 'gps', 'route', 'scan', 'done', 'camU', 'focal'];

const hasDebugHook = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero !== undefined);

const loop = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop());

const programs = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.info().programs);

/** Program count once it has stopped changing (the city compiles asynchronously after ready). */
async function stablePrograms(page: Page) {
  let last = await programs(page);
  let since = Date.now();
  const deadline = since + 20_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(150);
    const now = await programs(page);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= 1_500) break;
  }
  return last;
}

/** Scroll y where the hero timeline ends (hero-relative). */
const heroEnd = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section.hero')!;
    return el.offsetTop + el.offsetHeight - window.innerHeight;
  });

/** Scrolls, waits for the scroll to land, then for the rig + camera to hold for 8 frames. */
async function at(page: Page, y: number): Promise<Snapshot> {
  await page.evaluate(
    ({ y, keys }) =>
      new Promise<void>((resolve, reject) => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const want = Math.min(Math.max(0, y), document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, want);
        const key = () => [window.scrollY, ...keys.map((k) => h.rig[k]), ...h.camera()].join('|');
        let last = '';
        let same = 0;
        const start = performance.now();
        const tick = () => {
          const k = key();
          same = Math.abs(window.scrollY - want) <= 1 && k === last ? same + 1 : 0;
          last = k;
          if (same >= 8) return resolve();
          if (performance.now() - start > 20_000) return reject(new Error(`no settle at ${want}`));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { y: Math.round(y), keys: RIG_KEYS },
  );
  return snapshot(page);
}

const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate((keys) => {
    const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
    const s: Record<string, number> = {};
    for (const k of keys) s[k] = h.rig[k];
    const [x, y, z] = h.camera();
    return { ...s, camX: x, camY: y, camZ: z, scrollY: window.scrollY };
  }, RIG_KEYS);

function expectSame(a: Snapshot, b: Snapshot, label: string) {
  for (const k of [...RIG_KEYS, 'camX', 'camY', 'camZ'])
    expect(Math.abs(a[k] - b[k]), `${label}: ${k} ${a[k]} vs ${b[k]}`).toBeLessThanOrEqual(1e-6);
}

async function open(page: Page, quality: 'high' | 'medium') {
  await page.goto(`/?quality=${quality}&debug&testcam`);
  const section = page.locator('section.hero');
  await expect(section).toHaveClass(/\bhero--cinematic\b/);
  await expect(section).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(() => '__iwmsHero' in window, undefined, { timeout: 30_000 });
  await page.waitForFunction(
    () => document.documentElement.classList.contains('lenis') && window.scrollY === 0,
    undefined,
    { timeout: 30_000 },
  );
  expect(await hasDebugHook(page)).toBe(true);
  // Stand-in for Scene 04: tall content after the hero section.
  await page.evaluate(() => {
    const filler = document.createElement('div');
    filler.id = 'after-hero';
    filler.style.height = '300vh';
    document.querySelector('section.hero')!.after(filler);
  });
}

test.describe('hero render loop pauses off-screen (Scene 04 M1)', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const quality of ['high', 'medium'] as const) {
    test(`${quality}: pause below the hero, resume on return, state and context unchanged`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await open(page, quality);
      const end = await heroEnd(page);

      // Reference states before any pause: mid-journey (reverse-navigation target) and the end.
      const mid = await at(page, end * 0.5);
      const atEnd = await at(page, end);
      expect((await loop(page)).frameloop).toBe('always');
      // Baseline only after the city's asynchronous compile has finished (not caused by pausing).
      const programsBefore = await stablePrograms(page);
      // Tag the canvas so we can prove the same element (and WebGL context) survives the pause.
      await page.evaluate(() => {
        (document.querySelector('.hero__canvas canvas') as HTMLCanvasElement & { __m1?: number }).__m1 = 1;
      });

      // Scroll fully past the hero (beyond the half-viewport resume margin): the loop stops.
      const below = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('section.hero')!;
        return el.offsetTop + el.offsetHeight + window.innerHeight;
      });
      await page.evaluate((y) => window.scrollTo(0, y), below);
      await expect.poll(async () => (await loop(page)).frameloop, { timeout: 5_000 }).toBe('never');
      const pausedAt = (await loop(page)).frames;
      await page.waitForTimeout(1_500);
      expect((await loop(page)).frames, 'no frames rendered while the hero is off-screen').toBe(pausedAt);

      // The timeline still follows scroll while paused (end state held past the hero).
      const whilePaused = await snapshot(page);
      expect(Math.abs(whilePaused.collectU - atEnd.collectU)).toBeLessThanOrEqual(1e-6);

      // Scroll back: the loop resumes (observer fires asynchronously, so wait for it explicitly)
      // and renders the exact pre-pause state.
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(end));
      await expect.poll(async () => (await loop(page)).frameloop, { timeout: 5_000 }).toBe('always');
      await expect
        .poll(async () => (await loop(page)).frames, { timeout: 5_000, message: 'frames resume' })
        .toBeGreaterThan(pausedAt + 5);
      const resumed = await at(page, end);
      expectSame(resumed, atEnd, 'end state after resume');

      // Reverse navigation after a pause lands exactly where it did before.
      expectSame(await at(page, end * 0.5), mid, 'mid-journey after resume');

      // No context recreation, no recompiles, no errors.
      const sameCanvas = await page.evaluate(
        () =>
          (document.querySelector('.hero__canvas canvas') as HTMLCanvasElement & { __m1?: number })
            .__m1 === 1 && document.querySelectorAll('canvas').length === 1,
      );
      expect(sameCanvas, 'same single canvas element survives the pause').toBe(true);
      expect(await programs(page), 'no shader programs compiled by pause/resume').toBe(programsBefore);
      expect(errors).toEqual([]);
    });
  }

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('still frame keeps its on-demand loop; no pause logic involved', async ({ page }) => {
      await page.goto('/?quality=high&debug');
      const section = page.locator('section.hero');
      await expect(section).toHaveClass(/\bhero--still\b/);
      await expect(section).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
      await page.waitForFunction(() => '__iwmsHero' in window, undefined, { timeout: 30_000 });
      expect((await loop(page)).frameloop).toBe('demand');
      await page.evaluate(() => {
        const filler = document.createElement('div');
        filler.style.height = '300vh';
        document.querySelector('section.hero')!.after(filler);
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForTimeout(800);
      expect((await loop(page)).frameloop).toBe('demand');
    });
  });
});
