import { test, expect, type Page } from '@playwright/test';

/**
 * Indian LEFT-hand traffic QA (Phase 2.1). Runs on the real-GPU project with `?debug`, which
 * exposes `window.__iwmsHero`. Every assertion is made on a settled rig state, so results are
 * deterministic regardless of frame rate.
 */

const TRUCK_LANE_Z = -1.75;
/** SHOTS[0].pos − (0, 0, TRUCK_LANE_Z): the activation shot relative to the truck. */
const ACTIVATION_OFFSET: [number, number, number] = [26, 0.75, 7.75];
/** First median run ends here; before it the truck must stay left of the median (z ≤ −0.5). */
const MEDIAN_RUN_END_X = 550;
const MAIN_ROAD_X: [number, number] = [40, 540];
/** route.ts WHEELBASE: truck() reports the front axle, the route is traced by the rear axle. */
const WHEELBASE = 5.075;

interface TruckPose {
  x: number;
  z: number;
  yaw: number;
}
type Truck = TruckPose & { distance: number };
interface HeroDebug {
  rig: { driveSec: number; cityU: number; approach: number };
  distance: () => number;
  camera: () => [number, number, number];
  truck: () => Truck;
  truckWorld: () => TruckPose | null;
  geometry: () => { residentialAxisX: number };
}
type State = { truck: Truck; world: TruckPose | null; cityU: number };

function watch(page: Page) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  return { pageErrors };
}

const state = (page: Page) =>
  page.evaluate((): State => {
    const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
    return { truck: h.truck(), world: h.truckWorld(), cityU: h.rig.cityU };
  });

const maxScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(y));
}

/**
 * Settled = scrollY is where we put it and the route pose/cityU have been identical for ≥ 300 ms
 * AND ≥ 12 animation frames (frame-counted so a slow, GPU-contended page cannot fake stability).
 */
async function settle(page: Page, timeout = 20_000): Promise<State> {
  const ok = await page.evaluate(
    ({ timeout }) =>
      new Promise<boolean>((resolve) => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const key = () => {
          const t = h.truck();
          return `${window.scrollY}|${t.distance}|${t.x}|${t.z}|${h.rig.cityU}`;
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
  const s = await state(page);
  if (!ok)
    throw new Error(
      `rig did not settle within ${timeout} ms (last ${JSON.stringify(s)})`,
    );
  return s;
}

async function at(page: Page, y: number) {
  await scrollToY(page, y);
  // Give the scroll event and ScrollTrigger's scrub tick a couple of frames to start moving.
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  return settle(page);
}

/** Smallest scroll y (px resolution) where `pred` holds; `pred` must be monotonic in scroll. */
async function findY(
  page: Page,
  pred: (s: State) => boolean,
  lo: number,
  hi: number,
) {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (pred(await at(page, mid))) hi = mid;
    else lo = mid;
  }
  return hi;
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

const fmt = (s: State) =>
  `x=${s.truck.x.toFixed(4)} z=${s.truck.z.toFixed(4)} yaw=${s.truck.yaw.toFixed(5)} d=${s.truck.distance.toFixed(3)}`;

test.describe('Left-hand traffic', () => {
  test.describe.configure({ timeout: 180_000 });

  test('main road keeps left and the rendered truck matches the route', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findY(page, (s) => s.truck.x >= MAIN_ROAD_X[0], 0, max);
    const y1 =
      (await findY(page, (s) => s.truck.x > MAIN_ROAD_X[1], y0, max)) - 1;
    expect(y1, `main-road scroll range [${y0}, ${y1}]`).toBeGreaterThan(y0 + 8);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const y = y0 + ((y1 - y0) * i) / (n - 1);
      const s = await at(page, y);
      const detail = `y=${Math.round(y)} ${fmt(s)} world=${JSON.stringify(s.world)}`;
      expect(s.truck.x, detail).toBeGreaterThanOrEqual(MAIN_ROAD_X[0] - 0.5);
      expect(s.truck.x, detail).toBeLessThanOrEqual(MAIN_ROAD_X[1] + 0.5);
      expect(Math.abs(s.truck.z - TRUCK_LANE_Z), detail).toBeLessThanOrEqual(
        0.01,
      );
      expect(Math.abs(s.truck.yaw), detail).toBeLessThan(1e-3);
      expect(s.world, detail).not.toBeNull();
      expect(Math.abs(s.world!.x - s.truck.x), detail).toBeLessThanOrEqual(
        0.05,
      );
      expect(Math.abs(s.world!.z - s.truck.z), detail).toBeLessThanOrEqual(
        0.05,
      );
      expect(Math.abs(s.world!.yaw - s.truck.yaw), detail).toBeLessThanOrEqual(
        1e-3,
      );
    }
    expect(w.pageErrors).toEqual([]);
  });

  test('right turn crosses into the residential street left lane without teleporting', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const { residentialAxisX } = await page.evaluate(() =>
      (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.geometry(),
    );
    await scrollToY(page, max);
    await expect
      .poll(async () => (await state(page)).truck.distance, { timeout: 30_000 })
      .toBeGreaterThan(680);
    const final = await settle(page);
    const yStart = await findY(page, (s) => s.truck.x >= 540, 0, max);
    const yEnd = await findY(
      page,
      (s) => s.truck.distance >= final.truck.distance - 1e-3,
      yStart,
      max,
    );
    const steps = 80;
    const trace: State[] = [];
    for (let i = 0; i <= steps; i++) {
      trace.push(await at(page, yStart + ((yEnd - yStart) * i) / steps));
    }
    const dump = () => trace.map(fmt).join('\n');
    test.info().annotations.push({ type: 'turn-trace', description: dump() });

    for (let i = 0; i < trace.length; i++) {
      const s = trace[i].truck;
      if (s.x < MEDIAN_RUN_END_X) {
        expect(
          s.z,
          `left of median before the gap, step ${i}\n${dump()}`,
        ).toBeLessThanOrEqual(-0.5);
      }
      if (i === 0) continue;
      const p = trace[i - 1].truck;
      expect(
        s.yaw - p.yaw,
        `yaw decreased at step ${i}\n${dump()}`,
      ).toBeGreaterThanOrEqual(-1e-4);
      // The rear axle rolls along its heading (the front axle crabs outward by atan(L/R) in a
      // turn), so split the rear-axle step into forward/lateral in the chord frame: the mean
      // heading of the two samples, exact for a circular arc and a straight.
      const rx = (t: TruckPose) => t.x - Math.cos(t.yaw) * WHEELBASE;
      const rz = (t: TruckPose) => t.z - Math.sin(t.yaw) * WHEELBASE;
      const dx = rx(s) - rx(p);
      const dz = rz(s) - rz(p);
      const mid = (s.yaw + p.yaw) / 2;
      const hx = Math.cos(mid);
      const hz = Math.sin(mid);
      const forward = dx * hx + dz * hz;
      const lateral = Math.abs(-dx * hz + dz * hx);
      expect(
        forward,
        `truck moved backward at step ${i}\n${dump()}`,
      ).toBeGreaterThanOrEqual(-1e-6);
      expect(
        lateral,
        `rear-axle lateral jump at step ${i} (forward ${forward})\n${dump()}`,
      ).toBeLessThanOrEqual(0.02 + 0.2 * forward);
    }

    const end = trace.at(-1)!;
    const detail = `end ${fmt(end)} axisX=${residentialAxisX}`;
    expect(Math.abs(end.truck.yaw - Math.PI / 2), detail).toBeLessThanOrEqual(
      1e-3,
    );
    expect(
      Math.abs(end.truck.x - residentialAxisX - 1.5),
      detail,
    ).toBeLessThanOrEqual(0.05);
    expect(end.world, detail).not.toBeNull();
    expect(Math.abs(end.world!.x - end.truck.x), detail).toBeLessThanOrEqual(
      0.05,
    );
    expect(Math.abs(end.world!.z - end.truck.z), detail).toBeLessThanOrEqual(
      0.05,
    );
    expect(
      Math.abs(end.world!.yaw - end.truck.yaw),
      detail,
    ).toBeLessThanOrEqual(1e-3);
    expect(w.pageErrors).toEqual([]);
  });

  test('Scene 01 opening frames the truck from the activation shot', async ({
    page,
  }) => {
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
    await settle(page);
    const offset = () =>
      page.evaluate(() => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const c = h.camera();
        const t = h.truck();
        return [c[0] - t.x, c[1], c[2] - t.z];
      });
    const err = async () => {
      const o = await offset();
      return Math.max(...o.map((v, i) => Math.abs(v - ACTIVATION_OFFSET[i])));
    };
    await expect
      .poll(err, {
        timeout: 10_000,
        message: `camera − truck should approach ${JSON.stringify(ACTIVATION_OFFSET)}`,
      })
      .toBeLessThanOrEqual(0.15);
    const o = await offset();
    test
      .info()
      .annotations.push({
        type: 'activation-offset',
        description: JSON.stringify(o),
      });
    expect(w.pageErrors).toEqual([]);
  });

  test('reverse scrub through the turn replays the forward pose', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const yTurn = await findY(page, (s) => s.truck.x >= 560, 0, max);
    // Approach from below, as on the way down.
    await at(page, yTurn - 200);
    const forward = await at(page, yTurn);
    expect(
      forward.truck.yaw,
      `inside the turn: ${fmt(forward)}`,
    ).toBeGreaterThan(0.05);
    expect(forward.truck.yaw, `inside the turn: ${fmt(forward)}`).toBeLessThan(
      Math.PI / 2 - 0.05,
    );
    await at(page, max);
    const back = await at(page, yTurn);
    const detail = `forward ${fmt(forward)} / reverse ${fmt(back)}`;
    expect(
      Math.abs(back.truck.x - forward.truck.x),
      detail,
    ).toBeLessThanOrEqual(0.01);
    expect(
      Math.abs(back.truck.z - forward.truck.z),
      detail,
    ).toBeLessThanOrEqual(0.01);
    expect(
      Math.abs(back.truck.yaw - forward.truck.yaw),
      detail,
    ).toBeLessThanOrEqual(1e-3);
    expect(w.pageErrors).toEqual([]);
  });
});
