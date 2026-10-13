import { test, expect, type Page } from '@playwright/test';
import { buildCity } from '../components/hero/scene/city/layout';
import {
  BIN,
  BINS,
  COLLECTION_POINTS,
  COLLECT_SHOTS,
  CURRENT_POINT,
  DEMO,
  QR_TAG,
  SCAN_BIN,
  SHOT_U,
  binFrontX,
} from '../components/hero/scene/collection';
import { heroContent } from '../content/hero';
import {
  CITY_SHOTS,
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
 * Phase 3.1 (household collection) + Phase 3.2 (household QR verification) QA.
 *
 * The first two groups are pure Node checks on the shared route/layout/collection modules (no
 * page). The browser groups run on the real-GPU project with `?debug`, which exposes
 * `window.__iwmsHero` (see DebugHook in Stage.tsx). Every browser assertion is made on a settled
 * rig: scroll, rig values, camera and overlay placement frame-stable for ≥ 300 ms / 12 frames.
 */

/** Truck stops with its front axle this far past the collection gate (route.ts STOP_FRONT_Z). */
const STOP_PAST_GATE = 9.5;
const LANE_X = RESIDENTIAL.axisX + 1.5;
const OVERLAY_KEYS = ['collectU', 'pin', 'net', 'gps', 'route', 'scan', 'done'] as const;
/** The only world-anchored overlay elements: the H-12 marker head and the wet bin's QR tag centre. */
const ANCHOR_IDS = [CURRENT_POINT.id, 'qr'];
/** Business thresholds (CollectionOverlay.tsx): QR verified at scan ≥ 0.95, completed at done ≥ 0.5. */
const VERIFIED = 0.95;
const COMPLETED = 0.5;
const ARRIVED = 0.5;
/** Gate kit (city/kit.ts `gate`): 0.35 m pillars beside a 3 m opening. */
const PILLAR_WIDTH = 0.35;
const HALF_OPENING = 1.5;
/**
 * Parked truck's rear end at rest: front axle at gate.z + 9.5 (≈ 151.88) minus the 8.3 m from the
 * front axle to the rear bumper (COLLECT_SHOTS doc: rear end ≈ local x −8.3).
 */
const TRUCK_REAR_Z = COLLECTION_GATE.z + STOP_PAST_GATE - 8.3;
/** Phone sheet copy (content/hero.ts). */
const PHONE = heroContent.collect.phone;
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
  scan: number;
  done: number;
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
/** The overlay DOM as written by CollectionDirector on the last drawn frame. */
interface Dom {
  /** `.hero__states li` data-state: [arrived (GPS), QR verified, completed]. */
  states: string[];
  /** `.hero__monitor-rows` text, e.g. "… 11 / 24 …". */
  rows: string;
  marker: string | null;
  scanVerified: string | null;
  /** `.hero__phone` data-state: align | scanning | verified. */
  phone: string | null;
  /** `.hero__collect` data-phone ('true' while the phone is up). */
  phoneUp: string | null;
  /** `.hero__collect` is visible (the layer is live). While hidden, the DOM is not rewritten. */
  shown: boolean;
}
type State = Collection & {
  driveSec: number;
  cityU: number;
  distance: number;
  camera: [number, number, number];
  scrollY: number;
  viewport: { width: number; height: number };
  dom: Dom;
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
      viewport: { width: window.innerWidth, height: window.innerHeight },
      dom: {
        states: [...document.querySelectorAll('.hero__collect .hero__states li')].map(
          (li) => li.getAttribute('data-state') ?? '',
        ),
        rows: (document.querySelector('.hero__collect .hero__monitor-rows')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
        marker:
          document
            .querySelector('.hero__collect .hero__collect-marker[data-id="H-12"]')
            ?.getAttribute('data-state') ?? null,
        scanVerified:
          document.querySelector('.hero__collect .hero__scan')?.getAttribute('data-verified') ??
          null,
        phone:
          document.querySelector('.hero__collect .hero__phone')?.getAttribute('data-state') ?? null,
        phoneUp: document.querySelector('.hero__collect')?.getAttribute('data-phone') ?? null,
        shown:
          document.querySelector<HTMLElement>('.hero__collect')?.style.visibility === 'visible',
      },
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
 * Settled = the page has reached the requested scroll position (when given), then scrollY, journey,
 * every Phase 3.1 rig value and every overlay anchor's opacity have been identical, and the camera
 * has moved < 0.6 mm per frame, for ≥ 6 consecutive frames AND ≥ 100 ms.
 *
 * Pages open with `?debug&testcam` (Director `steady`): no hand-held float and no camera damping,
 * so the camera is an exact function of the rig. The scrub maps scroll → rig on the same frame,
 * so a short frame-counted window after the scroll has landed is enough; nothing waits out
 * smoothing any more.
 */
async function settle(page: Page, target?: number, timeout = 30_000): Promise<State> {
  const ok = await page.evaluate(
    ({ timeout, target }) =>
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
            c.scan,
            c.done,
            anchors,
          ].join('|');
        };
        const start = performance.now();
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        const want = target === undefined ? null : Math.min(Math.max(0, target), maxY);
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
          const landed = want === null || Math.abs(window.scrollY - want) <= 1;
          if (!landed || k !== last || moved > 6e-4) {
            last = k;
            since = now;
            frames = 0;
          } else frames++;
          if (frames >= 6 && now - since >= 100) return resolve(true);
          if (now - start > timeout) return resolve(false);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { timeout, target: target === undefined ? undefined : Math.round(target) },
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
  return settle(page, y);
}

/** Shader program count once it has stopped changing (async compiles finished). */
async function stablePrograms(page: Page) {
  let last = await programs(page);
  let since = Date.now();
  const deadline = since + 10_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(100);
    const now = await programs(page);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= 750) break;
  }
  return last;
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

/** Served-count fragment of the monitor rows ("11 / 24"). */
const served = (n: number) => `${n} / ${DEMO.households}`;

/** First scroll y past Scene 02's end (driveSec has moved beyond SCENE2_END_SEC). */
const findPhaseStart = (page: Page, max: number) =>
  findY(page, (s) => s.driveSec > SCENE2_END_SEC + 1e-6, 0, max);

async function openCinematic(page: Page) {
  await page.goto('/?quality=high&debug&testcam');
  const hero = page.locator('section.hero');
  await expect(hero).toHaveClass(/\bhero--cinematic\b/);
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(() => '__iwmsHero' in window, undefined, {
    timeout: 30_000,
  });
  // startExperience resets scroll to 0, creates the ScrollTrigger, then Lenis (which tags <html>).
  await page.waitForFunction(
    () => document.documentElement.classList.contains('lenis') && window.scrollY === 0,
    undefined,
    { timeout: 30_000 },
  );
  await settle(page, 0);
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
  `y=${s.scrollY} sec=${s.driveSec.toFixed(4)} d=${s.distance.toFixed(3)} u=${s.collectU.toFixed(4)} pin=${s.pin.toFixed(3)} gps=${s.gps.toFixed(3)} route=${s.route.toFixed(3)} net=${s.net.toFixed(3)} scan=${s.scan.toFixed(3)} done=${s.done.toFixed(3)} states=[${s.dom.states}] phone=${s.dom.phone}/${s.dom.phoneUp} cam=${s.camera.map((v) => v.toFixed(3)).join(',')}`;

/** Shown anchors (in front of the camera, opacity > 0) rendered more than `tol` px off the projection. */
function anchorErrors(s: State, tol: number) {
  return s.anchors
    .filter((a) => a.expected.visible && a.rendered.opacity > 0)
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

  test('collection camera keys: arrive → turn → household → qr → confirm', () => {
    expect(COLLECT_SHOTS.map((s) => s.id)).toEqual(['arrive', 'turn', 'household', 'qr', 'confirm']);
    expect(SHOT_U).toEqual({ arrive: 0, turn: 0.25, household: 0.5, qr: 0.75, confirm: 1 });
    // The first key is Scene 02's last, so the hand-over has no camera pop.
    const arrive = CITY_SHOTS.at(-1)!;
    expect(arrive.id).toBe('arrive');
    expect(COLLECT_SHOTS[0].pos).toEqual(arrive.pos);
    expect(COLLECT_SHOTS[0].target).toEqual(arrive.target);
    expect(COLLECT_SHOTS[0].focal).toBe(arrive.focal);
  });

  test('waste bins stand on the kerbside strip in front of plot 12, clear of gate and truck (both tiers)', () => {
    const h12 = COLLECTION_POINTS.find((p) => p.id === 'H-12')!;
    expect(h12).toBe(CURRENT_POINT);
    expect(BINS.map((b) => b.kind).sort()).toEqual(['dry', 'wet']);
    expect(new Set(BINS.map((b) => b.id)).size).toBe(BINS.length);
    expect(SCAN_BIN.kind, 'the wet bin is the one scanned').toBe('wet');
    expect(SCAN_BIN.id).toBe('BIN-0712-W');

    // Physical half-extents (WasteBins.tsx): the body widens by `taper` toward the top and the lid
    // overhangs it by 1 cm per side along z; the wheels (5 cm thick) are centred 3 cm outside the
    // body's base sides; the back handle bar sits 3.5 cm behind the top of the body with a 1.6 cm
    // radius, so the bin's rearmost point is 5.1 cm behind the tapered body.
    const halfZ = Math.max((BIN.width * BIN.taper + 0.02) / 2, BIN.width / 2 + 0.03 + 0.025);
    const backReach = (BIN.depth * BIN.taper) / 2 + 0.035 + 0.016;
    for (const q of ['high', 'medium'] as const) {
      const gate = buildCity(q).gates.find((g) => g.plot === h12.plot && g.side === 1);
      expect(gate, `${q}: plot 12 east gate`).toBeDefined();
      const g = gate!;
      // Near (−z) pillar of the gate kit starts at the opening − 0.35 m.
      const pillar0 = g.z - HALF_OPENING - PILLAR_WIDTH;
      for (const bin of BINS) {
        const detail = `${q}: bin ${JSON.stringify(bin)} gate ${JSON.stringify(g)}`;
        const z0 = bin.z - halfZ;
        const z1 = bin.z + halfZ;
        expect(z0, `before plot 12's frontage: ${detail}`).toBeGreaterThanOrEqual(g.from);
        expect(z1, `into the near gate pillar: ${detail}`).toBeLessThanOrEqual(pillar0);
        expect(z1, `under the parked truck (rear ≈ ${TRUCK_REAR_Z}): ${detail}`).toBeLessThan(TRUCK_REAR_Z);
        // Back (incl. handle) in front of the wall face; front on the kerbside strip, off the street.
        expect(bin.x + backReach, `through the wall: ${detail}`).toBeLessThan(g.x);
        // Most street-ward point: the lid's front lip (WasteBins shellGeometry), ≈ 4 cm ahead of
        // the body's top edge.
        const front = bin.x - (BIN.depth * BIN.taper) / 2 - 0.04;
        expect(front, `front on the carriageway: ${detail}`).toBeGreaterThan(RESIDENTIAL.axisX + 3);
      }
    }
    // The two bins don't intersect each other.
    const [a, b] = BINS;
    expect(Math.abs(a.z - b.z), 'bins overlap').toBeGreaterThanOrEqual(2 * halfZ);

    // The scanned QR tag is the centre of the wet bin's label, just proud of its (tapered) face.
    expect(Math.abs(QR_TAG.z - SCAN_BIN.z)).toBeLessThanOrEqual(1e-9);
    // Bins stand on the verge's drain-cover slabs (top y 0.07), so the label sits above that base.
    expect(BIN.baseY).toBeCloseTo(0.07, 9);
    expect(Math.abs(QR_TAG.y - (BIN.baseY + BIN.label.y))).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(QR_TAG.x - (binFrontX(SCAN_BIN, BIN.label.y) - 0.006))).toBeLessThanOrEqual(1e-9);
    expect(QR_TAG.size).toBe(BIN.qrSize);
    // The tag fits inside the label, and the label inside the body height.
    expect(QR_TAG.size).toBeLessThanOrEqual(Math.min(BIN.label.width, BIN.label.height));
    expect(BIN.label.y - BIN.label.height / 2).toBeGreaterThan(BIN.bodyY0);
    expect(BIN.label.y + BIN.label.height / 2).toBeLessThan(BIN.bodyY0 + BIN.bodyH);
  });
});

/* --------------------------------------------------------------------------------------------- */
/* Browser                                                                                       */
/* --------------------------------------------------------------------------------------------- */

test.describe('Phase 3.1–3.2 collection', () => {
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

    // Overlay DOM: one world-anchored marker (H-12) plus the QR scan frame; everything else
    // lives in the IWMS monitor.
    await expect(page.locator('.hero__collect')).toHaveCount(1);
    await expect(page.locator('.hero__collect-marker')).toHaveCount(1);
    const marker = page.locator(`.hero__collect-marker[data-id="${CURRENT_POINT.id}"]`);
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveAttribute('data-state', 'completed');
    expect(s.anchors.map((a) => a.id).sort(), 'anchors').toEqual([...ANCHOR_IDS].sort());
    for (const a of s.anchors)
      expect(Number.isFinite(a.rendered.x) && Number.isFinite(a.rendered.y), `rendered ${a.id}`).toBe(true);
    for (const sel of [
      '.hero__scan',
      '.hero__scan-check',
      '.hero__phone',
      '.hero__phone-sheet',
      '.hero__collect-copy',
    ])
      await expect(page.locator(`.hero__collect ${sel}`), sel).toHaveCount(1);
    await expect(page.locator('.hero__scan')).toHaveAttribute('data-verified', 'true');
    // Phone sheet carries all three texts; only the matching one is displayed.
    const sheet = page.locator('.hero__phone-sheet');
    await expect(sheet.locator('[data-when="align"]')).toHaveText(PHONE.align);
    await expect(sheet.locator('[data-when="scanning"]')).toHaveText(PHONE.scanning);
    await expect(sheet.locator('[data-when="verified"]')).toContainText(PHONE.verified);
    await expect(sheet.locator('[data-when="verified"]')).toContainText(SCAN_BIN.id);
    await expect(page.locator('.hero__phone')).toHaveAttribute('data-state', 'verified');
    // The phone has left by the final frame.
    expect(s.dom.phoneUp, detail).toBe('false');
    // Removed in the Phase 3.1/3.2 redesigns (GPS tag, route line, link, step list, pillar plate).
    for (const sel of [
      '.hero__gps',
      'svg .hero__route-line',
      '.hero__link',
      '.hero__collect-steps',
      '[data-step]',
      '.hero__scan-caption',
    ])
      await expect(page.locator(sel), `${sel} was removed`).toHaveCount(0);

    const monitor = page.locator('.hero__monitor');
    await expect(monitor).toBeVisible();
    await expect(monitor).toContainText('Illustrative demo data');
    const label = monitor.getByText('Illustrative demo data');
    await expect(label.first()).toBeVisible();
    expect(await effectiveOpacity(page, '.hero__monitor')).toBeGreaterThanOrEqual(0.9);
    await expect(monitor.locator('svg.hero__map')).toHaveCount(1);
    for (const p of COLLECTION_POINTS)
      await expect(
        monitor.locator(`svg.hero__map .hero__map-point[data-id="${p.id}"]`),
        `map point ${p.id}`,
      ).toHaveCount(1);
    await expect(monitor.locator('svg.hero__map .hero__map-vehicle')).toHaveCount(1);
    await expect(monitor.locator('.hero__states li')).toHaveCount(3);
    expect(s.dom.states, detail).toEqual(['done', 'done', 'done']);
    expect(s.dom.rows, detail).toContain(served(DEMO.served + 1));
    await expect(monitor.locator('.hero__monitor-next')).toHaveCount(1);
    expect(await effectiveOpacity(page, '.hero__monitor-next')).toBeGreaterThanOrEqual(0.9);

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
    const n = 16;
    const shown: Record<string, number> = { [CURRENT_POINT.id]: 0, qr: 0 };
    const trace: string[] = [];
    for (let i = 1; i <= n; i++) {
      const s = await at(page, y0 + ((max - y0) * i) / n);
      const on = s.anchors
        .filter((a) => a.expected.visible && a.rendered.opacity > 0)
        .map((a) => `${a.id}@${a.rendered.opacity.toFixed(2)}`);
      trace.push(`${fmt(s)} shown=[${on}]`);
      expect(s.anchors.map((a) => a.id).sort(), fmt(s)).toEqual([...ANCHOR_IDS].sort());
      const active = OVERLAY_KEYS.some((k) => k !== 'collectU' && s[k] > 0);
      if (!active) continue;
      // While the layer is live, both anchors are written every frame (opacity may be 0).
      for (const a of s.anchors)
        expect(
          Number.isFinite(a.rendered.x) && Number.isFinite(a.rendered.y),
          `anchor ${a.id} not rendered: ${fmt(s)}`,
        ).toBe(true);
      for (const a of s.anchors) if (a.expected.visible && a.rendered.opacity > 0) shown[a.id]++;
      const errors = anchorErrors(s, 2);
      expect(
        errors,
        `marker off its anchor: ${fmt(s)}\n${JSON.stringify(s.anchors)}`,
      ).toEqual([]);
    }
    const dump = trace.join('\n');
    test.info().annotations.push({ type: 'marker-trace', description: dump });
    expect(shown[CURRENT_POINT.id], `H-12 marker checked\n${dump}`).toBeGreaterThanOrEqual(3);
    expect(shown.qr, `QR frame checked\n${dump}`).toBeGreaterThanOrEqual(1);
    expect(w.pageErrors).toEqual([]);
  });

  test('household states are distinct: GPS arrival, QR verified, completed', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);
    const yArrived = await findY(page, (s) => s.gps >= ARRIVED, y0, max);
    const yVerified = await findY(page, (s) => s.scan >= VERIFIED, yArrived, max);
    const yCompleted = await findY(page, (s) => s.done >= COMPLETED, yVerified, max);
    const marks = `y0=${y0} arrived=${yArrived} verified=${yVerified} completed=${yCompleted} max=${max}`;
    test.info().annotations.push({ type: 'state-marks', description: marks });
    // Each business state holds for its own stretch of scroll (≥ 50 px), not a single frame.
    expect(yVerified - yArrived, marks).toBeGreaterThan(50);
    expect(yCompleted - yVerified, marks).toBeGreaterThan(50);

    // Just before arrival the monitor is already up (it rises while the truck creeps in), but
    // nothing is logged yet.
    const before = await at(page, yArrived - 1);
    expect(before.gps, fmt(before)).toBeLessThan(ARRIVED);
    expect(before.dom.shown, fmt(before)).toBe(true);
    expect(before.dom.states, fmt(before)).toEqual(['pending', 'pending', 'pending']);
    expect(before.dom.rows, fmt(before)).toContain(served(DEMO.served));

    // Arrived by GPS proximity, QR not yet scanned: arrival is NOT verification or completion.
    const arrived = await at(page, Math.round((yArrived + yVerified) / 2));
    expect(arrived.gps, fmt(arrived)).toBeGreaterThanOrEqual(ARRIVED);
    expect(arrived.scan, fmt(arrived)).toBeLessThan(VERIFIED);
    expect(arrived.dom.shown, fmt(arrived)).toBe(true);
    expect(arrived.dom.states, fmt(arrived)).toEqual(['done', 'awaiting', 'pending']);
    expect(arrived.dom.rows, fmt(arrived)).toContain(served(DEMO.served));
    expect(arrived.dom.marker, fmt(arrived)).toBe('pending');
    expect(arrived.dom.scanVerified, fmt(arrived)).toBe('false');
    expect(arrived.dom.phone, fmt(arrived)).not.toBe('verified');

    // QR verified, collection not yet completed: verification is NOT completion.
    const verified = await at(page, Math.round((yVerified + yCompleted) / 2));
    expect(verified.scan, fmt(verified)).toBeGreaterThanOrEqual(VERIFIED);
    expect(verified.done, fmt(verified)).toBeLessThan(COMPLETED);
    expect(verified.dom.shown, fmt(verified)).toBe(true);
    expect(verified.dom.states, fmt(verified)).toEqual(['done', 'done', 'pending']);
    expect(verified.dom.rows, fmt(verified)).toContain(served(DEMO.served));
    expect(verified.dom.marker, fmt(verified)).toBe('verified');
    expect(verified.dom.scanVerified, fmt(verified)).toBe('true');
    expect(verified.dom.phone, fmt(verified)).toBe('verified');

    // Completed: only now is the household counted as served.
    const final = await at(page, max);
    expect(final.dom.shown, fmt(final)).toBe(true);
    expect(final.dom.states, fmt(final)).toEqual(['done', 'done', 'done']);
    expect(final.dom.rows, fmt(final)).toContain(served(DEMO.served + 1));
    expect(final.dom.marker, fmt(final)).toBe('completed');

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('at every sampled position each state follows only its own signal', async ({ page }) => {
    // ~40 settled positions (boundary search + 25 samples), each waiting out camera damping.
    test.setTimeout(360_000);
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);
    const n = 24;
    const trace: string[] = [];
    for (let i = 0; i <= n; i++) {
      const s = await at(page, y0 + ((max - y0) * i) / n);
      trace.push(fmt(s));
      const d = `${fmt(s)} rows="${s.dom.rows}" marker=${s.dom.marker}`;
      const isArrived = s.gps >= ARRIVED;
      const isVerified = s.scan >= VERIFIED;
      const isCompleted = s.done >= COMPLETED;
      const active = OVERLAY_KEYS.some((k) => k !== 'collectU' && s[k] > 0);
      // A hidden layer is not rewritten (it may still hold a later position's states): only the
      // painted DOM carries business meaning.
      expect(s.dom.shown, `layer shown iff a digital value is live: ${d}`).toBe(active);
      if (!active) continue;
      expect(s.dom.states, d).toHaveLength(3);
      expect(s.dom.states[0] === 'done', `arrived iff gps >= ${ARRIVED}: ${d}`).toBe(isArrived);
      expect(s.dom.states[1] === 'done', `verified iff scan >= ${VERIFIED}: ${d}`).toBe(isVerified);
      expect(s.dom.states[2] === 'done', `completed iff done >= ${COMPLETED}: ${d}`).toBe(isCompleted);
      if (s.dom.states[1] === 'awaiting') expect(isArrived && !isVerified, d).toBe(true);
      expect(s.dom.rows, d).toContain(served(DEMO.served + (isCompleted ? 1 : 0)));
      expect(s.dom.marker, d).toBe(isCompleted ? 'completed' : isVerified ? 'verified' : 'pending');
      expect(s.dom.scanVerified, d).toBe(isVerified ? 'true' : 'false');
      expect(s.dom.phone, d).toBe(isVerified ? 'verified' : s.scan > 0 ? 'scanning' : 'align');
      // GPS arrival alone never verifies or completes.
      if (isArrived && !isVerified) expect(s.dom.states.slice(1), d).toEqual(['awaiting', 'pending']);
      // The story's order: completion implies verification implies arrival.
      if (isCompleted) expect(isVerified, d).toBe(true);
      if (isVerified) expect(isArrived, d).toBe(true);
    }
    test.info().annotations.push({ type: 'state-trace', description: trace.join('\n') });
    expect(w.pageErrors).toEqual([]);
  });

  test('QR close-up: phone viewfinder on the bin tag, then verified', async ({ page }) => {
    test.setTimeout(240_000);
    const w = watch(page);
    await openCinematic(page);
    const max = await maxScroll(page);
    const y0 = await findPhaseStart(page, max);
    const phone = page.locator('.hero__phone');
    const sheet = page.locator('.hero__phone-sheet');

    // Push-in, before the scan starts: the phone is up and asks to align the tag.
    const yAlign = await findY(page, (s) => s.collectU >= 0.72, y0, max);
    const a = await at(page, yAlign);
    const da = fmt(a);
    expect(a.scan, da).toBe(0);
    expect(a.dom.phone, da).toBe('align');
    expect(a.dom.phoneUp, da).toBe('true');
    await expect(sheet.locator('[data-when="align"]')).toBeVisible();
    await expect(sheet.locator('[data-when="align"]')).toHaveText(PHONE.align);
    await expect(sheet.locator('[data-when="scanning"]')).toBeHidden();
    await expect(sheet.locator('[data-when="verified"]')).toBeHidden();

    // Mid-scan: the camera holds the `qr` key (collectU 0.75) while the scan runs.
    const yMid = await findY(page, (s) => s.scan >= 0.5, yAlign, max);
    const s = await at(page, yMid);
    const d = `${fmt(s)}\n${JSON.stringify(s.anchors)}`;
    expect(Math.abs(s.collectU - SHOT_U.qr), d).toBeLessThanOrEqual(0.01);
    expect(s.scan, d).toBeGreaterThan(0.2);
    expect(s.scan, d).toBeLessThan(0.8);
    expect(await effectiveOpacity(page, '.hero__phone'), d).toBeGreaterThan(0.9);
    await expect(phone).toHaveAttribute('data-state', 'scanning');
    expect(s.dom.phoneUp, d).toBe('true');
    await expect(sheet.locator('[data-when="scanning"]')).toBeVisible();
    await expect(sheet.locator('[data-when="scanning"]')).toHaveText(PHONE.scanning);
    await expect(sheet.locator('[data-when="align"]')).toBeHidden();
    await expect(sheet.locator('[data-when="verified"]')).toBeHidden();
    expect(await effectiveOpacity(page, '.hero__scan'), d).toBeGreaterThan(0.9);
    const qr = s.anchors.find((x) => x.id === 'qr');
    expect(qr, d).toBeDefined();
    expect(qr!.expected.visible, d).toBe(true);
    expect(qr!.rendered.opacity, d).toBeGreaterThan(0.9);
    // The tag is the viewfinder's centre: within the middle 40 % of the viewport on both axes.
    const { width: W, height: H } = s.viewport;
    expect(qr!.expected.x, `qr tag off-centre: ${d}`).toBeGreaterThanOrEqual(0.3 * W);
    expect(qr!.expected.x, `qr tag off-centre: ${d}`).toBeLessThanOrEqual(0.7 * W);
    expect(qr!.expected.y, `qr tag off-centre: ${d}`).toBeGreaterThanOrEqual(0.3 * H);
    expect(qr!.expected.y, `qr tag off-centre: ${d}`).toBeLessThanOrEqual(0.7 * H);
    expect(
      Math.hypot(qr!.rendered.x - qr!.expected.x, qr!.rendered.y - qr!.expected.y),
      d,
    ).toBeLessThanOrEqual(2);
    await expect(page.locator('.hero__scan')).toHaveAttribute('data-verified', 'false');
    // Scanning is not verification.
    expect(s.dom.states, d).toEqual(['done', 'awaiting', 'pending']);
    expect(s.dom.marker, d).toBe('pending');

    // Scan complete, collection not yet completed: verified.
    const yScanned = await findY(page, (s) => s.scan >= 1 - 1e-6, yMid, max);
    const yDone = await findY(page, (s) => s.done > 0, yScanned, max);
    const v = await at(page, Math.round((yScanned + yDone) / 2));
    const dv = fmt(v);
    expect(v.scan, dv).toBeGreaterThanOrEqual(1 - 1e-6);
    expect(v.done, dv).toBe(0);
    await expect(page.locator('.hero__scan[data-verified="true"]')).toHaveCount(1);
    await expect(phone).toHaveAttribute('data-state', 'verified');
    await expect(sheet.locator('[data-when="verified"]')).toBeVisible();
    await expect(sheet.locator('[data-when="verified"]')).toContainText(PHONE.verified);
    await expect(sheet.locator('[data-when="verified"]')).toContainText(SCAN_BIN.id);
    await expect(sheet.locator('[data-when="scanning"]')).toBeHidden();
    expect(v.dom.states, dv).toEqual(['done', 'done', 'pending']);
    expect(v.dom.rows, dv).toContain(served(DEMO.served));
    expect(v.dom.marker, dv).toBe('verified');

    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
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
      // Discrete states replay exactly (rows also carry the rounded km/h, compared via distance).
      expect(b.dom.states, detail).toEqual(a.dom.states);
      expect(b.dom.marker, detail).toBe(a.dom.marker);
      expect(b.dom.scanVerified, detail).toBe(a.dom.scanVerified);
      expect(b.dom.phone, detail).toBe(a.dom.phone);
      expect(b.dom.phoneUp, detail).toBe(a.dom.phoneUp);
      for (const k of OVERLAY_KEYS)
        expect(Math.abs(a[k] - b[k]), `${k}: ${detail}`).toBeLessThanOrEqual(1e-3);
      for (const anchor of a.anchors) {
        const other = b.anchors.find((x) => x.id === anchor.id);
        expect(other, `anchor ${anchor.id}: ${detail}`).toBeDefined();
        // Only markers on screen matter; a hidden marker can sit right beside the camera, where
        // centimetres of hand-held float swing its (invisible) projection, even across the near plane.
        if (anchor.rendered.opacity < 0.01 && other!.rendered.opacity < 0.01) continue;
        expect(other!.expected.visible, `anchor ${anchor.id}: ${detail}`).toBe(anchor.expected.visible);
        // With the QA camera (`testcam`: no hand-held float, no damping) two visits to the same
        // scroll position must place every visible marker identically (sub-pixel rounding only).
        expect(
          Math.hypot(other!.rendered.x - anchor.rendered.x, other!.rendered.y - anchor.rendered.y),
          `anchor ${anchor.id} rendered: ${detail}`,
        ).toBeLessThanOrEqual(2);
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

  test('production camera keeps its hand-held float and smoothing; testcam is exact', async ({
    page,
  }) => {
    // The QA camera must never leak into production: without `testcam` the Director still adds
    // its clock-driven hand-held float (the camera keeps moving with the rig at rest) ...
    const camPath = async () => {
      const max = await maxScroll(page);
      await at(page, max * 0.85);
      return page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
            const first = h.camera();
            let travel = 0;
            const t0 = performance.now();
            const tick = () => {
              const c = h.camera();
              travel = Math.max(travel, Math.hypot(c[0] - first[0], c[1] - first[1], c[2] - first[2]));
              if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
              else resolve(travel);
            };
            requestAnimationFrame(tick);
          }),
      );
    };
    await page.goto('/?quality=high&debug');
    await expect(page.locator('section.hero')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));
    const production = await camPath();
    expect(production, 'hand-held float present in production').toBeGreaterThan(0.002);
    expect(production, 'float stays centimetre-scale').toBeLessThan(0.1);
    // ... while `testcam` makes the camera an exact function of the rig (no motion at rest).
    await openCinematic(page);
    const qa = await camPath();
    expect(qa, 'testcam camera is still at rest').toBeLessThanOrEqual(1e-6);
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
    const p0 = await stablePrograms(page);
    const before = await state(page);
    expect(before.driveSec, fmt(before)).toBeLessThanOrEqual(SCENE2_END_SEC + 1e-6);
    for (let i = 0; i <= steps; i++) await at(page, y0 + ((max - y0) * i) / steps);
    const p1 = await stablePrograms(page);
    // And back through the hand-over once more.
    await at(page, y0 - 600);
    await at(page, max);
    const p2 = await stablePrograms(page);
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
