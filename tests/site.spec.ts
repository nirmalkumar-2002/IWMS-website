import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { headerContent, heroContent } from '../content/hero';
import { siteConfig } from '../content/config';
import { SHOTS, createRig, type Rig } from '../components/hero/scene/rig';
import {
  CITY_SHOTS,
  COLLECT_END_SEC,
  JOURNEY_END_SEC,
  SCENE1_END_SEC,
  STOP_SEC,
  secondsAtDistance,
} from '../components/hero/scene/route';
import { buildReveal } from '../components/hero/scene/timeline';

/**
 * Phase 3.3 QA: site header (SSR, keyboard, Request demo, Explore platform, Skip intro), the
 * internal-only proxy badge, and a guard that the reveal timeline was not retimed.
 */

const HAS_MODEL = existsSync(resolve('public/models/garbage-truck.glb'));
const OVERLAY_KEYS = ['pin', 'gps', 'route', 'net', 'scan', 'done'] as const;

/** The reveal timeline built in node with a plain rig and stub copy targets (pure GSAP). */
function nodeReveal() {
  const rig = createRig();
  const stub = () => ({ style: {}, opacity: 1, y: 0 }) as unknown as HTMLElement;
  const tl = buildReveal(rig, {
    words: [stub(), stub(), stub(), stub(), stub()],
    subtitle: stub(),
    city: [stub(), stub()],
  });
  return { rig, tl };
}

/** Pre-Phase-3.3 timeline constants (timeline.ts). Changing them retimes the whole page. */
const MOVE = 1;
const DWELL = 0.55;
const FIRST = 0.35;
const SCENE1_DRIVE = 3.6;
const CITY_UNITS = 14;
const COLLECT_UNITS = 7.6;
const TAIL = 0.4;
const CITY_SPAN = JOURNEY_END_SEC - SCENE1_END_SEC;
const C = (SCENE1_END_SEC / SCENE1_DRIVE) * (CITY_UNITS / CITY_SPAN) - 1;
const cityEase = (u: number) => u + C * u * (1 - u) * (1 - u);
function cityEaseInverse(y: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cityEase(mid) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function expectedLabels() {
  const labels: Record<string, number> = {};
  let at = FIRST;
  for (let i = 1; i < SHOTS.length; i++) {
    labels[SHOTS[i].id] = at;
    at += MOVE + DWELL;
  }
  labels.drive = at;
  const city = at + SCENE1_DRIVE;
  labels.city = city;
  const last = CITY_SHOTS.length - 1;
  for (let i = 1; i <= last; i++)
    labels[`city:${CITY_SHOTS[i].id}`] =
      i === last
        ? city + CITY_UNITS
        : city +
          CITY_UNITS *
            cityEaseInverse((secondsAtDistance(CITY_SHOTS[i].at) - SCENE1_END_SEC) / CITY_SPAN);
  const collect = city + CITY_UNITS;
  const rate = CITY_SPAN / CITY_UNITS;
  const qr = collect + 5.1;
  Object.assign(labels, {
    collect,
    'collect:stop': collect + (STOP_SEC - JOURNEY_END_SEC) / rate,
    'collect:household': collect + 3.4,
    'collect:qr': qr,
    'collect:verified': qr + 0.9,
    'collect:completed': qr + 1.9,
    'collect:end': collect + COLLECT_UNITS,
  });
  return { labels, duration: collect + COLLECT_UNITS + TAIL };
}

test.describe('Phase 3.3 timeline guard (node)', () => {
  test('reveal timeline keeps its duration and label times', () => {
    const { tl } = nodeReveal();
    const want = expectedLabels();
    expect(Math.abs(tl.duration() - 33.7), `duration ${tl.duration()}`).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(want.duration - 33.7)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(tl.labels.collect - 25.7), `collect ${tl.labels.collect}`).toBeLessThanOrEqual(1e-6);
    expect(Object.keys(tl.labels).sort()).toEqual(Object.keys(want.labels).sort());
    for (const [k, v] of Object.entries(want.labels))
      expect(Math.abs(tl.labels[k] - v), `label ${k}: ${tl.labels[k]} vs ${v}`).toBeLessThanOrEqual(1e-6);
  });
});

/** Own numeric fields only (GSAP tags tweened objects with a circular `_gsap`). */
const numeric = (o: object) =>
  Object.fromEntries(
    Object.entries(o).filter(([k, v]) => !k.startsWith('_') && typeof v === 'number'),
  ) as Record<string, number>;

/**
 * Rig range the browser may show at a label, allowing ±2 px of scroll rounding (the page has
 * 16.8 viewports of scroll for 33.7 timeline units).
 */
function rigRangeAt(label: string, viewport: number) {
  const { rig, tl } = nodeReveal();
  const slack = (2 / (viewport * 16.8)) * tl.duration();
  const sample = (t: number) => {
    tl.seek(Math.min(tl.duration(), Math.max(0, t)), false);
    return numeric(rig);
  };
  const t = tl.labels[label];
  const a = sample(t - slack);
  const b = sample(t + slack);
  const c = sample(t);
  const range: Record<string, [number, number]> = {};
  for (const k of Object.keys(c))
    range[k] = [Math.min(a[k], b[k], c[k]), Math.max(a[k], b[k], c[k])];
  return range;
}

interface HeroDebug {
  rig: Rig & Record<string, number>;
}

const rig = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.entries((window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig).filter(
        ([k, v]) => !k.startsWith('_') && typeof v === 'number',
      ),
    ),
  ) as Promise<Record<string, number>>;

/** scrollY and the scrubbed rig unchanged for ≥ 12 frames. */
const settle = (page: Page) =>
  page.waitForFunction(
    () =>
      new Promise<boolean>((done) => {
        const h = (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero;
        const key = () =>
          `${window.scrollY}|${h.rig.driveSec}|${h.rig.collectU}|${h.rig.camU}|${h.rig.approach}`;
        let last = key();
        let same = 0;
        const t0 = performance.now();
        const tick = () => {
          const k = key();
          same = k === last ? same + 1 : 0;
          last = k;
          if (same >= 12) done(true);
          else if (performance.now() - t0 > 4000) done(false);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    undefined,
    { timeout: 30_000 },
  );

function watch(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

async function openCinematic(page: Page, query = '?quality=high&debug&testcam') {
  await page.goto(`/${query}`);
  const hero = page.locator('section.hero');
  await expect(hero).toHaveClass(/\bhero--cinematic\b/);
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('lenis'), undefined, {
    timeout: 30_000,
  });
}

const header = (page: Page) => page.locator('header.site-header');
const skip = (page: Page) => header(page).getByRole('button', { name: headerContent.skipIntroLabel });
const explore = (page: Page) => header(page).getByRole('button', { name: headerContent.explore });
const demo = (page: Page) => header(page).locator('a.site-header__action--primary');

function expectDemoHref(href: string | null) {
  expect(href).not.toBeNull();
  expect(href!).not.toContain('{{');
  expect(href!).not.toMatch(/^#|^$/);
  if (siteConfig.email.includes('{{')) expect(href).toBe(siteConfig.website);
  else expect(href!).toMatch(/^mailto:[^{}\s]+@[^{}\s]+/);
  expect(href!).toMatch(/^(mailto:[^{}\s]+@|https:\/\/www\.zigma\.in)/);
}

test.describe('site header without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('header, branding and real links are in the prerendered markup', async ({ page }) => {
    await page.goto('/');
    const h = header(page);
    await expect(h).toHaveCount(1);
    await expect(h).toBeVisible();
    const brand = h.locator('a.site-header__brand');
    await expect(brand).toHaveAttribute('href', '/');
    await expect(brand).toHaveAccessibleName(headerContent.homeLabel);
    await expect(brand.locator('img.site-header__logo')).toBeVisible();
    await expect(brand).toContainText(headerContent.brand);
    await expect(h.getByRole('navigation', { name: headerContent.navLabel })).toHaveCount(1);
    // No timeline without JS: Skip intro is absent, Explore is the brochure link.
    await expect(h.getByRole('button')).toHaveCount(0);
    const brochure = h.getByRole('link', { name: headerContent.exploreBrochureLabel });
    await expect(brochure).toHaveAttribute('href', siteConfig.brochurePath);
    expectDemoHref(await demo(page).getAttribute('href'));
    await expect(demo(page)).toBeVisible();
    // Header is fixed: it adds no page height.
    expect(await h.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    // Early IWMS positioning is visible copy right under the title.
    const pos = page.locator('section.hero p.hero__positioning');
    await expect(pos).toHaveText(heroContent.positioning);
    await expect(pos).toBeVisible();
    expect(await pos.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  });

  test('dist/index.html: header precedes the hero, positioning follows the h1, no placeholders', () => {
    const html = readFileSync(resolve('dist/index.html'), 'utf8');
    const iHeader = html.indexOf('class="site-header"');
    const iHero = html.indexOf('<section');
    const iH1 = html.indexOf('id="hero-title"');
    const iPos = html.indexOf('class="hero__positioning"');
    expect(iHeader).toBeGreaterThan(-1);
    expect(iHeader).toBeLessThan(iHero);
    expect(iH1).toBeGreaterThan(iHero);
    expect(iPos).toBeGreaterThan(iH1);
    expect(html).toContain(`>${headerContent.brand}<`);
    expect(html).not.toContain('{{');
    expect(html).not.toContain('hero__proxy-note');
    // The brochure the no-JS Explore link points at is shipped.
    expect(existsSync(resolve(`dist${siteConfig.brochurePath}`))).toBe(true);
  });
});

test.describe('site header, static poster @software', () => {
  test('poster tier keeps the brochure link and a valid Request demo', async ({ page }) => {
    const w = watch(page);
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/);
    await expect(header(page).getByRole('button')).toHaveCount(0);
    await expect(
      header(page).getByRole('link', { name: headerContent.exploreBrochureLabel }),
    ).toHaveAttribute('href', siteConfig.brochurePath);
    expectDemoHref(await demo(page).getAttribute('href'));
    await expect(page.locator('.hero__proxy-note')).toHaveCount(0);
    expect(w.pageErrors).toEqual([]);
  });
});

test.describe('site header, cinematic', () => {
  test.describe.configure({ timeout: 120_000 });

  test('keyboard order, focus ring and Request demo', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    await expect(skip(page)).toBeVisible();
    const names: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      names.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? '';
        }),
      );
      if (names.at(-1) === headerContent.demoWebsiteLabel || names.at(-1) === headerContent.demo)
        break;
    }
    // Page skip-link, brand, Skip intro, Explore, Request demo — in that order.
    const order = [
      headerContent.homeLabel,
      headerContent.skipIntroLabel,
      headerContent.explore,
    ].map((n) => names.indexOf(n));
    test.info().annotations.push({ type: 'tab order', description: names.join(' → ') });
    expect(order.every((i) => i >= 0), names.join(' → ')).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(names.at(-1)).toBe(
      siteConfig.email.includes('{{') ? headerContent.demoWebsiteLabel : headerContent.demo,
    );
    // Visible keyboard focus on the focused header action.
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
    const a = demo(page);
    expectDemoHref(await a.getAttribute('href'));
    if (siteConfig.email.includes('{{')) {
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
    // The header never overlaps the hero title.
    const [hb, tb] = await Promise.all([
      header(page).boundingBox(),
      page.locator('#hero-title').boundingBox(),
    ]);
    expect(hb!.y + hb!.height).toBeLessThanOrEqual(tb!.y);
    expect(w.pageErrors).toEqual([]);
  });

  test('Explore platform (keyboard) lands on the collect:household state', async ({ page }) => {
    const w = watch(page);
    await openCinematic(page);
    await explore(page).focus();
    await page.keyboard.press('Enter');
    await settle(page);
    const viewport = await page.evaluate(() => window.innerHeight);
    const want = rigRangeAt('collect:household', viewport);
    const got = await rig(page);
    const detail = JSON.stringify({ got, want });
    for (const k of ['driveSec', 'cityU', 'collectU', 'camU', 'focal', ...OVERLAY_KEYS]) {
      const [lo, hi] = want[k];
      expect(got[k], `${k}: ${detail}`).toBeGreaterThanOrEqual(lo - 1e-4);
      expect(got[k], `${k}: ${detail}`).toBeLessThanOrEqual(hi + 1e-4);
    }
    // At the household beat: GPS arrival logged, QR not scanned, not completed.
    // (gps is still finishing its 0.4-unit ramp here; the monitor logs arrival from 0.5.)
    expect(got.gps, detail).toBeGreaterThanOrEqual(0.5);
    await expect
      .poll(() =>
        page.$$eval('.hero__collect .hero__states li', (els) =>
          els.map((li) => li.getAttribute('data-state')),
        ),
      )
      .toEqual(['done', 'awaiting', 'pending']);
    expect(got.scan, detail).toBe(0);
    expect(got.done, detail).toBe(0);
    // Intro completed by the jump.
    expect(got.approach).toBe(0);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.className ?? ''))
      .toContain('hero__monitor');
    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('Skip intro jumps to the end immediately, completes the intro and focuses the monitor', async ({
    page,
  }) => {
    const w = watch(page);
    await openCinematic(page);
    // Mid-intro: the dolly has not finished.
    expect((await rig(page)).approach).toBeGreaterThan(0);
    // `collect:end` sits just before the timeline's 0.4-unit tail, not at the page bottom.
    const { tl } = nodeReveal();
    const endFrac = tl.labels['collect:end'] / tl.duration();
    const t0 = Date.now();
    await skip(page).click();
    await page.waitForFunction(
      (frac) =>
        Math.abs(
          window.scrollY - frac * (document.documentElement.scrollHeight - window.innerHeight),
        ) <= 2,
      endFrac,
      { timeout: 1_500 },
    );
    const elapsed = Date.now() - t0;
    test.info().annotations.push({ type: 'skip ms', description: String(elapsed) });
    await settle(page);
    const got = await rig(page);
    const detail = JSON.stringify(got);
    expect(got.approach, detail).toBe(0);
    for (const k of ['marker', 'tail', 'headL', 'headR', 'beam']) expect(got[k], `${k} ${detail}`).toBe(1);
    expect(Math.abs(got.driveSec - COLLECT_END_SEC), detail).toBeLessThanOrEqual(1e-3);
    expect(got.cityU, detail).toBe(1);
    for (const k of OVERLAY_KEYS) expect(Math.abs(got[k] - 1), `${k} ${detail}`).toBeLessThanOrEqual(1e-6);
    // Intro is over for good: the title does not come back on its own.
    await page.waitForTimeout(1_500);
    expect(
      await page.$$eval('.hero__word, .hero__positioning, .hero__subtitle', (els) =>
        els.map((el) => Number(getComputedStyle(el).opacity)),
      ),
    ).toEqual(Array(heroContent.title.split(' ').length + 2).fill(0));
    const focused = await page.evaluate(() => ({
      cls: document.activeElement?.className ?? '',
      hidden: document.activeElement?.getAttribute('aria-hidden'),
    }));
    expect(focused.cls).toContain('hero__monitor');
    expect(focused.hidden).toBe('false');
    expect(w.pageErrors).toEqual([]);
    expect(w.consoleErrors).toEqual([]);
  });

  test('proxy badge is internal-only: absent without ?debug, present with it', async ({ page }) => {
    await openCinematic(page, '?quality=high');
    await page.waitForTimeout(500);
    await expect(page.locator('.hero__proxy-note')).toHaveCount(0);
    await openCinematic(page, '?quality=high&debug');
    await expect(page.locator('.hero__proxy-note')).toHaveCount(HAS_MODEL ? 0 : 1);
  });
});
