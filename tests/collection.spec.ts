import { test, expect, type Page } from '@playwright/test';
import { buildCity } from '../components/hero/scene/city/layout';
import { COLLECTION_POINTS } from '../components/hero/scene/collection';
import {
  COLLECTION_GATE,
  COLLECT_END_SEC,
  JOURNEY_END_SEC,
  RESIDENTIAL,
  SCENE2_END_SEC,
  STOP_DISTANCE,
  STOP_SEC,
  WHEELBASE,
  driveAt,
  samplePath,
  type DriveState,
  type PathSample,
} from '../components/hero/scene/route';

/**
 * Phase 3.1 (smart collection & digital connectivity) QA.
 *
 * The first two groups are pure Node checks on the shared route/layout/collection modules (no
 * page). The browser groups run on the real-GPU project with `?debug`, which exposes
 * `window.__iwmsHero` (see DebugHook in Stage.tsx). Every browser assertion is made on a settled
 * rig: scroll, rig values, camera and overlay placement frame-stable for ≥ 300 ms / 12 frames.
 */

/** Truck stops with its front axle this far past the collection gate (route.ts STOP_FRONT_Z). */
const STOP_PAST_GATE = 9.5;
const LANE_X = RESIDENTIAL.axisX + 1.5;
const OVERLAY_KEYS = ['collectU', 'pin', 'gps', 'route', 'net'] as const;
type OverlayKey = (typeof OVERLAY_KEYS)[number];

interface Anchor {
  id: string;
  expected: { x: number; y: number; visible: boolean };
  rendered: { x: number; y: number; opacity: number };
}
interface Collection {
  collectU: number;
  pin: number;
  gps: number;
  route: number;
  net: number;
  stopDistance: number;
  stopSec: number;
  collectEndSec: number;
  scene2EndSec: number;
  gate: { x: number; z: number };
  wheel: { spin: number; radius: number } | null;
  anchors: Anchor[];
}
interface TruckPose {
  x: number;
  z: number;
  yaw: number;
}
interface HeroDebug {
  rig: Record<OverlayKey | 'driveSec' | 'cityU', number>;
  distance: () => number;
  camera: () => [number, number, number];
  truck: () => TruckPose & { distance: number };
  truckWorld: () => TruckPose | null;
  sun: () => { progress: number };
  info: () => { programs: number };
  collection: () => Collection;
}
type State = Collection & {
  driveSec: number;
  cityU: number;
  distance: number;
  camera: [number, number, number];
  scrollY: number;
};

function watch(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  return { consoleErrors, pageErrors };
}

const state = (page: Page) =>
  page.evaluate((): State => {
    const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
    return {
      ...h.collection(),
      driveSec: h.rig.driveSec,
      cityU: h.rig.cityU,
      distance: h.distance(),
      camera: h.camera(),
      scrollY: window.scrollY,
    };
  });

const maxScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(y));
}

/**
 * Settled = scrollY, journey, every Phase 3.1 rig value and every overlay anchor's opacity have
 * been identical, and the camera has moved < 0.6 mm per frame, for ≥ 300 ms AND ≥ 12 frames.
 * The camera never stops exactly: the Director adds a deliberate hand-held float (≈ ±2 cm, under
 * 0.4 mm per frame), so "settled" means the scroll damping has died out, not zero motion.
 */
async function settle(page: Page, timeout = 30_000): Promise<State> {
  const ok = await page.evaluate(
    ({ timeout }) =>
      new Promise<boolean>((resolve) => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const key = () => {
          const c = h.collection();
          const anchors = c.anchors.map((a) => a.rendered.opacity.toFixed(3)).join(';');
          return [
            window.scrollY,
            h.rig.driveSec,
            h.rig.cityU,
            c.collectU,
            c.pin,
            c.gps,
            c.route,
            c.net,
            anchors,
          ].join('|');
        };
        const start = performance.now();
        let last = key();
        let since = start;
        let frames = 0;
        let cam = h.camera();
        const tick = () => {
          const now = performance.now();
          const k = key();
          const next = h.camera();
          const moved = Math.hypot(next[0] - cam[0], next[1] - cam[1], next[2] - cam[2]);
          cam = next;
          if (k !== last || moved > 6e-4) {
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

/** First scroll y past Scene 02's end (driveSec has moved beyond SCENE2_END_SEC). */
const findPhaseStart = (page: Page, max: number) =>
  findY(page, (s) => s.driveSec > SCENE2_END_SEC + 1e-6, 0, max);

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

const programs = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.info()
        .programs,
  );

/** Opacity as painted: the product of the element's and all its ancestors' opacity. */
const effectiveOpacity = (page: Page, selector: string) =>
  page.$eval(selector, (el) => {
    let o = 1;
    for (let e: Element | null = el; e; e = e.parentElement)
      o *= Number(getComputedStyle(e).opacity);
    return o;
  });

const fmt = (s: State) =>
  `y=${s.scrollY} sec=${s.driveSec.toFixed(4)} d=${s.distance.toFixed(3)} u=${s.collectU.toFixed(4)} pin=${s.pin.toFixed(3)} gps=${s.gps.toFixed(3)} route=${s.route.toFixed(3)} net=${s.net.toFixed(3)} cam=${s.camera.map((v) => v.toFixed(3)).join(',')}`;

/** Visible anchors whose rendered position is more than `tol` px from the camera projection. */
function anchorErrors(s: State, tol: number) {
  return s.anchors
    .filter((a) => a.expected.visible)
    .map((a) => ({
      id: a.id,
      dx: a.rendered.x - a.expected.x,
      dy: a.rendered.y - a.expected.y,
    }))
    .filter((e) => Math.hypot(e.dx, e.dy) > tol);
}

/* --------------------------------------------------------------------------------------------- */
/* Node-only: data and kinematics contracts                                                       */
/* --------------------------------------------------------------------------------------------- */

test.describe('Phase 3.1 data (node)', () => {
  test('collection points match the seeded city gates on both tiers', () => {
    expect(COLLECTION_POINTS.length).toBeGreaterThan(0);
    const ids = COLLECTION_POINTS.map((p) => p.id);
    expect(new Set(ids).size, `duplicate ids ${ids}`).toBe(ids.length);
    const current = COLLECTION_POINTS.filter((p) => p.status === 'current');
    expect(current, 'exactly one current collection point').toHaveLength(1);
    expect(Math.abs(current[0].x - COLLECTION_GATE.x)).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(current[0].z - COLLECTION_GATE.z)).toBeLessThanOrEqual(1e-3);
    // Kerbside under left-hand traffic heading +Z is the east (+X) side.
    expect(current[0].side).toBe(1);
    for (const p of COLLECTION_POINTS)
      expect(['collected', 'current', 'scheduled']).toContain(p.status);

    const tiers = (['high', 'medium'] as const).map((q) => buildCity(q).gates);
    // The street layout is tier-independent.
    expect(tiers[1]).toEqual(tiers[0]);
    for (const [i, gates] of tiers.entries()) {
      const tier = i === 0 ? 'high' : 'medium';
      for (const p of COLLECTION_POINTS) {
        const g = gates.find((g) => g.plot === p.plot && g.side === p.side);
        const detail = `${tier}: ${JSON.stringify(p)} vs gate ${JSON.stringify(g)}`;
        expect(g, detail).toBeDefined();
        expect(Math.abs(g!.x - p.x), detail).toBeLessThanOrEqual(1e-3);
        expect(Math.abs(g!.z - p.z), detail).toBeLessThanOrEqual(1e-3);
      }
      const gate = gates.find(
        (g) =>
          g.side === 1 &&
          Math.abs(g.x - COLLECTION_GATE.x) <= 1e-3 &&
          Math.abs(g.z - COLLECTION_GATE.z) <= 1e-3,
      );
      expect(gate, `${tier}: COLLECTION_GATE is a real east-side gate`).toBeDefined();
    }
  });

  test('truck decelerates gently to rest at the collection gate', () => {
    const o = {} as DriveState;
    const rear = {} as PathSample;
    const front = (d: number) => {
      samplePath(d - WHEELBASE, rear);
      return {
        x: rear.x + Math.cos(rear.yaw) * WHEELBASE,
        z: rear.z + Math.sin(rear.yaw) * WHEELBASE,
        yaw: rear.yaw,
      };
    };
    expect(JOURNEY_END_SEC).toBe(SCENE2_END_SEC);
    expect(STOP_SEC).toBeGreaterThan(SCENE2_END_SEC + 1);
    expect(COLLECT_END_SEC).toBeGreaterThan(STOP_SEC);

    // Scene 02 → 3.1 hand-over in the table is seamless.
    const before = { ...driveAt(SCENE2_END_SEC - 1e-9, o) };
    const after = { ...driveAt(SCENE2_END_SEC + 1e-9, o) };
    expect(Math.abs(after.distance - before.distance)).toBeLessThan(1e-4);
    expect(Math.abs(after.speed - before.speed)).toBeLessThan(1e-4);

    const step = 0.01;
    let prev = driveAt(SCENE2_END_SEC, o).distance;
    let prevSpeed = Infinity;
    for (let t = SCENE2_END_SEC; t <= COLLECT_END_SEC + 1e-9; t += step) {
      const s = driveAt(t, o);
      const detail = `t=${t.toFixed(4)} d=${s.distance} v=${s.speed} a=${s.accel}`;
      expect(s.distance, `distance decreased: ${detail}`).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(Math.abs(s.accel), `|accel| > 0.5: ${detail}`).toBeLessThanOrEqual(0.5);
      if (t >= SCENE2_END_SEC + 1) {
        expect(s.speed, `speed increased: ${detail}`).toBeLessThanOrEqual(prevSpeed + 1e-6);
        prevSpeed = s.speed;
      }
      if (t >= STOP_SEC) {
        expect(s.speed, `moving after STOP_SEC: ${detail}`).toBeLessThanOrEqual(1e-6);
        expect(Math.abs(s.distance - STOP_DISTANCE), `creeping: ${detail}`).toBeLessThanOrEqual(1e-6);
      }
      // Already on the residential straight: left lane, heading +Z.
      const f = front(s.distance);
      expect(Math.abs(f.x - LANE_X), `lane: ${detail} x=${f.x}`).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(f.yaw - Math.PI / 2), `heading: ${detail}`).toBeLessThanOrEqual(1e-6);
      prev = s.distance;
    }

    const end = driveAt(COLLECT_END_SEC, o);
    expect(Math.abs(end.distance - STOP_DISTANCE)).toBeLessThanOrEqual(1e-9);
    expect(end.speed).toBe(0);
    const rest = front(STOP_DISTANCE);
    const detail = JSON.stringify({ rest, COLLECTION_GATE, STOP_DISTANCE });
    expect(Math.abs(rest.z - (COLLECTION_GATE.z + STOP_PAST_GATE)), detail).toBeLessThanOrEqual(0.01);
    expect(Math.abs(rest.x - LANE_X), detail).toBeLessThanOrEqual(1e-3);
  });
});

/* --------------------------------------------------------------------------------------------- */
/* Browser                                                                                       */
/* --------------------------------------------------------------------------------------------- */

test.describe('Phase 3.1 collection', () => {
  test.describe.configure({ timeout: 180_000 });
  // chromium-gpu only: the chromium-software project greps for @software.

  test('final frame: truck at rest at the gate, overlay fully revealed', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const s = await at(page, max);
    const detail = fmt(s);

    expect(Math.abs(s.driveSec - COLLECT_END_SEC), detail).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(s.distance - STOP_DISTANCE), detail).toBeLessThanOrEqual(0.05);
    for (const k of OVERLAY_KEYS)
      expect(Math.abs(s[k] - 1), `${k} at the final scroll: ${detail}`).toBeLessThanOrEqual(1e-6);
    expect(s.cityU, detail).toBe(1);

    // Debug constants agree with the route module the tests import.
    expect(Math.abs(s.stopDistance - STOP_DISTANCE)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(s.stopSec - STOP_SEC)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(s.collectEndSec - COLLECT_END_SEC)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(s.scene2EndSec - SCENE2_END_SEC)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(s.gate.x - COLLECTION_GATE.x)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(s.gate.z - COLLECTION_GATE.z)).toBeLessThanOrEqual(1e-6);

    // Wheels rolled exactly the distance driven (no slip, no reset at the hand-over).
    expect(s.wheel, 'wheel debug info').not.toBeNull();
    expect(s.wheel!.radius).toBeGreaterThan(0);
    expect(
      Math.abs(s.wheel!.spin + s.stopDistance / s.wheel!.radius),
      JSON.stringify(s.wheel),
    ).toBeLessThanOrEqual(1e-3);

    // Rendered truck stands in the left lane, front axle 9.5 m past the gate, heading +Z.
    const pose = await page.evaluate(() => {
      const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
      return { route: h.truck(), world: h.truckWorld() };
    });
    const pd = JSON.stringify(pose);
    expect(Math.abs(pose.route.x - LANE_X), pd).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(pose.route.z - (COLLECTION_GATE.z + STOP_PAST_GATE)), pd).toBeLessThanOrEqual(0.05);
    expect(Math.abs(pose.route.yaw - Math.PI / 2), pd).toBeLessThanOrEqual(1e-3);
    expect(pose.world, pd).not.toBeNull();
    expect(Math.abs(pose.world!.x - pose.route.x), pd).toBeLessThanOrEqual(0.05);
    expect(Math.abs(pose.world!.z - pose.route.z), pd).toBeLessThanOrEqual(0.05);

    // Daylight carried over from Scene 02.
    const sun = await page.evaluate(() =>
      (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.sun(),
    );
    expect(sun.progress, JSON.stringify(sun)).toBe(1);

    // Overlay DOM.
    await expect(page.locator('.hero__collect')).toHaveCount(1);
    const current = COLLECTION_POINTS.find((p) => p.status === 'current')!;
    for (const p of COLLECTION_POINTS)
      await expect(
        page.locator(`.hero__collect-marker[data-id="${p.id}"]`),
        `marker ${p.id}`,
      ).toHaveCount(1);
    const anchorIds = s.anchors.map((a) => a.id);
    expect(anchorIds, 'anchors').toContain(current.id);
    expect(anchorIds, 'anchors').toContain('gps');
    await expect(page.locator('.hero__gps')).toHaveCount(1);
    await expect(page.locator('svg .hero__route-line').first()).toBeAttached();

    const monitor = page.locator('.hero__monitor');
    await expect(monitor).toBeVisible();
    await expect(monitor).toContainText('Illustrative demo data');
    const label = monitor.getByText('Illustrative demo data');
    await expect(label.first()).toBeVisible();
    expect(await effectiveOpacity(page, '.hero__monitor')).toBeGreaterThanOrEqual(0.9);
    await expect(page.locator('.hero__collect-steps [data-step]')).toHaveCount(4);

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('Scene 02 → 3.1 hand-over is continuous', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const boundary = await findPhaseStart(page, max);
    const step = max * 0.002;
    const samples: State[] = [];
    for (let i = -12; i <= 16; i++)
      samples.push(await at(page, Math.min(max, boundary + i * step)));
    const dump = () => samples.map(fmt).join('\n');
    test.info().annotations.push({ type: 'handover-trace', description: dump() });

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.driveSec < SCENE2_END_SEC - 1e-6) {
        // Phase 3.1 owns nothing until Scene 02 has ended.
        for (const k of OVERLAY_KEYS)
          expect(s[k], `${k} before Scene 02 ended, sample ${i}\n${dump()}`).toBe(0);
      }
      if (i === 0) continue;
      const p = samples[i - 1];
      const dd = s.distance - p.distance;
      const du = s.collectU - p.collectU;
      const dc = Math.hypot(
        s.camera[0] - p.camera[0],
        s.camera[1] - p.camera[1],
        s.camera[2] - p.camera[2],
      );
      expect(dd, `distance decreased at sample ${i}\n${dump()}`).toBeGreaterThanOrEqual(-1e-6);
      expect(dd, `distance jump at sample ${i}\n${dump()}`).toBeLessThanOrEqual(3);
      expect(du, `collectU decreased at sample ${i}\n${dump()}`).toBeGreaterThanOrEqual(-1e-6);
      expect(dc, `camera jump at sample ${i}\n${dump()}`).toBeLessThanOrEqual(2.5);
    }
    expect(samples[0].driveSec, dump()).toBeLessThan(SCENE2_END_SEC);
    expect(samples[0].collectU, dump()).toBe(0);
    expect(samples.at(-1)!.driveSec, dump()).toBeGreaterThan(SCENE2_END_SEC);
    expect(samples.at(-1)!.collectU, dump()).toBeGreaterThan(0);
    expect(w.pageErrors).toEqual([]);
  });

  test('world-anchored markers stay on their anchors', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);
    const n = 14;
    let checked = 0;
    let duringRise = 0;
    const trace: string[] = [];
    for (let i = 1; i <= n; i++) {
      const s = await at(page, y0 + ((max - y0) * i) / n);
      const visible = s.anchors.filter((a) => a.expected.visible).map((a) => a.id);
      trace.push(`${fmt(s)} visible=[${visible}]`);
      if (s.pin <= 0.5) continue;
      checked++;
      if (s.collectU > 0.5 && s.collectU < 1) duringRise++;
      const errors = anchorErrors(s, 2);
      expect(
        errors,
        `marker off its anchor: ${fmt(s)}\n${JSON.stringify(s.anchors)}`,
      ).toEqual([]);
    }
    test.info().annotations.push({ type: 'marker-trace', description: trace.join('\n') });
    expect(checked, trace.join('\n')).toBeGreaterThanOrEqual(3);
    expect(duringRise, `no sample during the camera rise\n${trace.join('\n')}`).toBeGreaterThanOrEqual(1);
    expect(w.pageErrors).toEqual([]);
  });

  test('scrubbing is deterministic and survives rapid scrolling', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);

    const compare = (a: State, b: State, detail: string) => {
      expect(Math.abs(a.distance - b.distance), detail).toBeLessThanOrEqual(1e-3);
      for (const k of OVERLAY_KEYS)
        expect(Math.abs(a[k] - b[k]), `${k}: ${detail}`).toBeLessThanOrEqual(1e-3);
      for (const anchor of a.anchors) {
        const other = b.anchors.find((x) => x.id === anchor.id);
        expect(other, `anchor ${anchor.id}: ${detail}`).toBeDefined();
        expect(other!.expected.visible, `anchor ${anchor.id}: ${detail}`).toBe(anchor.expected.visible);
        // Positions only matter for markers on screen; a hidden marker can sit right beside the
        // camera, where centimetres of hand-held float swing its (invisible) projection.
        if (anchor.rendered.opacity < 0.01 && other!.rendered.opacity < 0.01) continue;
        // Two visits differ only by the Director's clock-driven hand-held float (≈ ±2.4 cm, up to
        // ≈ ±2.4 px at the 12 m kerb framing). The rig is compared exactly above, and same-frame
        // marker accuracy (≤ 2 px) is asserted by 'world-anchored markers stay on their anchors'.
        expect(
          Math.hypot(other!.rendered.x - anchor.rendered.x, other!.rendered.y - anchor.rendered.y),
          `anchor ${anchor.id} rendered: ${detail}`,
        ).toBeLessThanOrEqual(6);
        expect(
          Math.abs(other!.rendered.opacity - anchor.rendered.opacity),
          `anchor ${anchor.id} opacity: ${detail}`,
        ).toBeLessThanOrEqual(1e-2);
      }
    };

    for (const f of [0.2, 0.45, 0.7, 0.9]) {
      const y = y0 + (max - y0) * f;
      await at(page, Math.min(max, y + 400));
      const fromAbove = await at(page, y);
      await at(page, Math.max(0, y - 400));
      const fromBelow = await at(page, y);
      expect(fromBelow.collectU, fmt(fromBelow)).toBeGreaterThan(0);
      compare(fromAbove, fromBelow, `f=${f}\nabove ${fmt(fromAbove)}\nbelow ${fmt(fromBelow)}`);
    }

    // Rapid scroll: no settling between jumps.
    const target = y0 + (max - y0) * 0.6;
    for (let i = 0; i < 4; i++) {
      for (const y of [max, 0, target]) {
        await scrollToY(page, y);
        await page.waitForTimeout(40);
      }
    }
    const afterRapid = await at(page, target);
    await at(page, Math.max(0, target - 400));
    const reference = await at(page, target);
    compare(afterRapid, reference, `after rapid ${fmt(afterRapid)}\nreference ${fmt(reference)}`);

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('no errors and no shader programs added after Scene 02', async ({
    page,
  }) => {
    // Two loads and ~63 settled scroll positions.
    test.setTimeout(420_000);
    const w = watch(page);
    // Locate Scene 02's end on a first load (the search scrolls into Phase 3.1) ...
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);

    // ... then reload so Phase 3.1 has never been drawn before the baseline is taken.
    await openCinematic(page);
    const steps = 30;
    for (let i = 0; i < steps; i++) await at(page, ((y0 - 1) * i) / (steps - 1));
    await page.waitForTimeout(2_000);
    const p0 = await programs(page);
    const before = await state(page);
    expect(before.driveSec, fmt(before)).toBeLessThanOrEqual(SCENE2_END_SEC + 1e-6);
    for (let i = 0; i <= steps; i++) await at(page, y0 + ((max - y0) * i) / steps);
    await page.waitForTimeout(1_000);
    const p1 = await programs(page);
    // And back through the hand-over once more.
    await at(page, y0 - 600);
    await at(page, max);
    const p2 = await programs(page);
    test.info().annotations.push({ type: 'programs', description: `${p0} → ${p1} → ${p2}` });
    expect(p1 - p0, `programs Scene 02 end ${p0} → final ${p1}`).toBeLessThanOrEqual(0);
    expect(p2 - p0, `programs after a second pass ${p2}`).toBeLessThanOrEqual(0);
    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('still frame has no collection overlay', async ({ page }) => {
      const w = watch(page);
      await page.goto('/?quality=high&debug');
      const hero = page.locator('section.hero');
      await expect(hero).toHaveClass(/\bhero--still\b/);
      await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
      await page.waitForTimeout(1_500);
      await expect(page.locator('.hero__collect')).toHaveCount(0);
      expect(w.pageErrors).toEqual([]);
    });
  });
});

// Runs only in the `chromium-software` project (SwiftShader → static poster tier).
test.describe('Phase 3.1 on the static poster @software', () => {
  test('static tier has no collection overlay', async ({ page }) => {
    const w = watch(page);
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000);
    await expect(page.locator('.hero__collect')).toHaveCount(0);
    expect(w.pageErrors).toEqual([]);
  });
});
