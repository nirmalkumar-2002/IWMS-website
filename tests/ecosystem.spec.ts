import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { siteConfig } from '../content/config';
import { ECOSYSTEM_NODES } from '../content/ecosystem';

/**
 * Scene 04: the IWMS ecosystem after the hero. M2 interface (SSR/no-JS markup, tab/keyboard model,
 * content integrity, actions, responsive layout, reduced motion, poster tier, hero ↔ section),
 * M3 lazy on-demand city, M4 layout (pills, one large city view, info card, capability cards) and
 * city interactions (hotspots, camera focus / return, rapid selection, connections).
 */

const OFFICIAL_MODULES = [
  'Collection & Verification',
  'D2D Collection & Logistics Management',
  'Resource Management',
  'Weighbridge Management',
  'Waste Management (Processing)',
  'Landfill Management',
  'Grievance Redressal Management',
];

interface HeroDebug {
  rig: Record<string, number>;
  loop: () => { frames: number; frameloop: string };
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function openCinematic(page: Page, quality: 'high' | 'medium' = 'high') {
  await page.goto(`/?quality=${quality}&debug&testcam`);
  const hero = page.locator('section.hero');
  await expect(hero).toHaveClass(/\bhero--cinematic\b/);
  await expect(hero).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.waitForFunction(
    () => document.documentElement.classList.contains('lenis') && window.scrollY === 0,
    undefined,
    { timeout: 30_000 },
  );
  await expect(page.locator('#ecosystem')).toHaveAttribute('data-enhanced', 'true');
}

const heroEnd = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section.hero')!;
    return el.offsetTop + el.offsetHeight - window.innerHeight;
  });

const scrollTo = (page: Page, y: number) =>
  page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top);
        const done = () =>
          Math.abs(window.scrollY - Math.min(top, document.documentElement.scrollHeight - innerHeight)) <= 1;
        const tick = () => (done() ? requestAnimationFrame(() => resolve()) : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    Math.round(y),
  );

const visiblePanels = (page: Page) =>
  page.$$eval('.eco__card', (els) => els.filter((e) => !(e as HTMLElement).hidden).map((e) => e.id));

test.describe('Scene 04 ecosystem (M2)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('content: seven official modules in brochure order plus ICCC as an integration', () => {
    const modules = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
    expect(modules.map((n) => n.name)).toEqual(OFFICIAL_MODULES);
    expect(modules.map((n) => n.number)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    const integrations = ECOSYSTEM_NODES.filter((n) => n.kind === 'integration');
    expect(integrations.map((n) => n.name)).toEqual(['ICCC Integration']);
    const ids = new Set(ECOSYSTEM_NODES.map((n) => n.id));
    for (const n of ECOSYSTEM_NODES) {
      expect(n.capabilities.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.capabilities.length, n.id).toBeLessThanOrEqual(4);
      expect(n.page, n.id).toBeGreaterThanOrEqual(3);
      for (const to of n.connects) expect(ids.has(to), `${n.id} → ${to}`).toBe(true);
      // No figures or live statistics in the copy.
      for (const line of [n.summary, n.benefit, ...n.capabilities])
        expect(line, `${n.id}: ${line}`).not.toMatch(/\d+\s?(%|kg|km|t\b|tonnes|households)/i);
    }
  });

  test('prerendered page: section after the hero with every module, no placeholders', () => {
    const html = readFileSync(resolve(process.cwd(), 'dist/index.html'), 'utf8');
    const hero = html.indexOf('class="hero');
    const eco = html.indexOf('id="ecosystem"');
    expect(hero).toBeGreaterThan(-1);
    expect(eco).toBeGreaterThan(hero);
    for (const name of OFFICIAL_MODULES)
      expect(html.slice(eco), name).toContain(name.replace(/&/g, '&amp;'));
    expect(html.slice(eco)).toContain('ICCC Integration');
    expect(html.slice(eco)).not.toContain('{{');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('all modules are readable as a list with working in-page links', async ({ page }) => {
      await page.goto('/');
      const section = page.locator('#ecosystem');
      await expect(section).toHaveAttribute('data-enhanced', 'false');
      await expect(section.locator('[role="tablist"]')).toHaveCount(0);
      await expect(section.locator('.eco__card')).toHaveCount(8);
      for (const id of ECOSYSTEM_NODES.map((n) => n.id))
        await expect(section.locator(`#eco-${id}`)).toBeVisible();
      await expect(section.locator('.eco__tabs--static a')).toHaveCount(8);
      await expect(section.locator('.eco__pillar')).toHaveCount(4);
      // No horizontal overflow and nothing collapsed to zero height without JS.
      const m = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        vw: innerWidth,
        slotH: document.querySelector<HTMLElement>('#ecosystem .eco__slot')!.offsetHeight,
      }));
      expect(m.docW).toBe(m.vw);
      expect(m.slotH).toBeGreaterThan(200);
      // In-page links land clear of the fixed site header; details are all expanded.
      await section.locator('.eco__tabs--static a[href="#eco-landfill"]').click();
      await page.waitForTimeout(300);
      const clear = await page.evaluate(
        () =>
          document.querySelector('#eco-landfill')!.getBoundingClientRect().top -
          document.querySelector('.site-header')!.getBoundingClientRect().bottom,
      );
      expect(clear).toBeGreaterThanOrEqual(0);
      await expect(section.locator('#eco-landfill-details')).toBeVisible();
      await expect(section.locator('a.eco__action--primary')).toHaveAttribute('href', /^(mailto:|https:\/\/www\.zigma\.in)/);
    });
  });

  test('tabs: one panel at a time, ARIA wiring, keyboard model, connections', async ({ page }) => {
    const errors = watch(page);
    await openCinematic(page);
    const tabs = page.locator('#ecosystem [role="tab"]');
    await expect(tabs).toHaveCount(8);
    await expect(page.locator('#ecosystem [role="tab"][data-kind="integration"]')).toHaveCount(1);
    expect(await visiblePanels(page)).toEqual(['eco-collection']);

    // ARIA: selected tab ↔ panel, roving tabindex.
    const first = page.locator('#eco-tab-collection');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-controls', 'eco-collection');
    await expect(first).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#eco-collection')).toHaveAttribute('role', 'tabpanel');
    await expect(page.locator('#eco-collection')).toHaveAttribute('aria-labelledby', 'eco-tab-collection');
    expect(await page.locator('#ecosystem [role="tab"][tabindex="0"]').count()).toBe(1);

    // Keyboard: arrows (both axes), Home/End, focus follows selection.
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#eco-tab-logistics')).toBeFocused();
    expect(await visiblePanels(page)).toEqual(['eco-logistics']);
    await page.keyboard.press('ArrowRight');
    expect(await visiblePanels(page)).toEqual(['eco-resources']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    expect(await visiblePanels(page)).toEqual(['eco-collection']);
    await page.keyboard.press('ArrowUp'); // wraps to the last tab
    await expect(page.locator('#eco-tab-iccc')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#eco-tab-collection')).toBeFocused();
    await page.keyboard.press('End');
    expect(await visiblePanels(page)).toEqual(['eco-iccc']);

    // ICCC is labelled as an integration, not a module; modules never carry that note.
    await expect(page.locator('#eco-iccc .eco__card-tag')).toContainText('Integration');
    await expect(page.locator('#eco-iccc .eco__card-note')).toBeVisible();
    await page.locator('#eco-tab-weighbridge').click();
    await expect(page.locator('#eco-weighbridge .eco__card-note')).toHaveCount(0);
    await expect(page.locator('#eco-weighbridge .eco__card-tag')).toContainText('Module 04');

    // "Connected to" selects the target and moves focus to its tab.
    // (M4.1) "Connected to" lives in the disclosed full details.
    await page.locator('#eco-weighbridge .eco__details-btn').click();
    await page.locator('#eco-weighbridge .eco__link', { hasText: 'Processing' }).click();
    expect(await visiblePanels(page)).toEqual(['eco-processing']);
    await expect(page.locator('#eco-tab-processing')).toBeFocused();

    // Map mirrors the selection (presentational, aria-hidden).
    await expect(page.locator('.eco__map')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.eco__map-node[data-state="selected"]')).toHaveCount(1);

    // Actions work: brochure page link, Request demo (mailto or the company site, never a placeholder).
    await expect(page.locator('#eco-processing .eco__source')).toHaveAttribute(
      'href',
      `${siteConfig.brochurePath}#page=14`,
    );
    const demo = page.locator('#ecosystem a.eco__action--primary');
    const href = (await demo.getAttribute('href')) ?? '';
    expect(href).not.toContain('{{');
    expect(href).toMatch(/^(mailto:[^\s{}]+@|https:\/\/www\.zigma\.in)/);
    const brochure = await page.request.get(siteConfig.brochurePath);
    expect(brochure.status()).toBe(200);

    // At most the hero's canvas plus the lazily loaded Scene 04 city (M3); never more.
    expect(await page.locator('canvas').count()).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('hero ↔ section navigation: hero state survives, its loop pauses deep in Scene 04', async ({
    page,
  }) => {
    const errors = watch(page);
    await openCinematic(page);
    const end = await heroEnd(page);
    await scrollTo(page, end);
    await page.waitForTimeout(600);
    const before = await page.evaluate(
      () => ({ ...(window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig }) as Record<string, number>,
    );
    // Deep into the section (the hero has entirely left the viewport).
    const vh = await page.evaluate(() => innerHeight);
    await scrollTo(page, end + vh * 2);
    await expect
      .poll(async () => page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop().frameloop))
      .toBe('never');
    // Reverse back into the hero: rendering resumes and the timeline state is unchanged.
    await scrollTo(page, end);
    await expect
      .poll(async () => page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop().frameloop))
      .toBe('always');
    const after = await page.evaluate(
      () => ({ ...(window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig }) as Record<string, number>,
    );
    for (const k of ['driveSec', 'cityU', 'collectU', 'scan', 'done'])
      expect(Math.abs(after[k] - before[k]), k).toBeLessThanOrEqual(1e-6);
    expect(errors).toEqual([]);
  });

  test('desktop layout (M4.1): header clear of the site header, one pill row, unobstructed city, compact summary', async ({
    page,
  }) => {
    await openCinematic(page);
    // Section top at the viewport top: the heading sits below the fixed site header.
    await scrollTo(page, await page.evaluate(() => document.querySelector<HTMLElement>('#ecosystem')!.offsetTop));
    const m = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('#ecosystem')!;
      const r = (sel: string) => s.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
      const tabs = [...s.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => t.getBoundingClientRect());
      const sec = s.getBoundingClientRect();
      const head = r('.eco__head');
      const stage = r('.eco__stage-card');
      return {
        headerBottom: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
        eyebrowTop: r('.eco__eyebrow').top,
        headCentre: Math.abs(head.left + head.width / 2 - (sec.left + sec.width / 2)),
        titleAlign: getComputedStyle(s.querySelector('.eco__title')!).textAlign,
        rows: new Set(tabs.map((t) => Math.round(t.top))).size,
        stageW: stage.width / innerWidth,
        stageH: stage.height,
        // Header, pills and the whole city view fit one 1440×900 viewport.
        stageBottom: stage.bottom,
        pillars: s.querySelectorAll('.eco__pillar').length,
        sticky: [...s.querySelectorAll<HTMLElement>('*')].some((e) => getComputedStyle(e).position === 'sticky'),
      };
    });
    expect(m.eyebrowTop, 'heading clear of the fixed header').toBeGreaterThanOrEqual(m.headerBottom + 8);
    expect(m.headCentre).toBeLessThanOrEqual(2);
    expect(m.titleAlign).toBe('center');
    expect(m.rows, 'pills form one horizontal row').toBe(1);
    expect(m.stageW).toBeGreaterThan(0.7);
    expect(m.stageH).toBeGreaterThanOrEqual(420);
    expect(m.stageBottom).toBeLessThanOrEqual(900);
    expect(m.pillars).toBe(4);
    expect(m.sticky, 'natural flow, no pinned stage').toBe(false);

    // Overview: nothing large over the city — the card sits below it.
    await scrollTo(page, (await heroBottomY(page)) + 40);
    await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'ready', { timeout: 30_000 });
    const below = await page.evaluate(() => {
      const stage = document.querySelector('#ecosystem .eco__stage-card')!.getBoundingClientRect();
      const card = document.querySelector('#ecosystem .eco__card:not([hidden])')!.getBoundingClientRect();
      return card.top >= stage.bottom - 1;
    });
    expect(below).toBe(true);

    // Selected (M4.2): the summary becomes a compact popup floating on the city (small, no
    // nested scrolling).
    await page.locator('#eco-tab-processing').click();
    await expect(page.locator('#eco-processing .eco__popup[data-eco-popup="open"]')).toBeVisible();
    await expect.poll(async () => (await ecoCamera(page)).tweening, { timeout: 10_000 }).toBe(false);
    await page.waitForTimeout(500); // popup move transition
    const f = await page.evaluate(() => {
      const stage = document.querySelector('#ecosystem .eco__stage-card')!.getBoundingClientRect();
      const el = document.querySelector<HTMLElement>('#eco-processing .eco__summary')!;
      const sum = el.getBoundingClientRect();
      const scrolls = [el, ...el.querySelectorAll<HTMLElement>('*')].some(
        (e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1,
      );
      return {
        inside: sum.left >= stage.left && sum.right <= stage.right && sum.top >= stage.top && sum.bottom <= stage.bottom,
        area: (sum.width * sum.height) / (stage.width * stage.height),
        scrolls,
      };
    });
    expect(f.inside).toBe(true);
    expect(f.area, 'summary covers a small part of the city').toBeLessThan(0.2);
    expect(f.scrolls).toBe(false);
    // Hero length untouched.
    const heroRatio = await page.evaluate(
      () => document.querySelector<HTMLElement>('section.hero')!.offsetHeight / innerHeight,
    );
    expect(Math.abs(heroRatio - 17.8)).toBeLessThanOrEqual(0.01);
  });

  test.describe('portrait phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('no horizontal overflow, scrolling chip rail, ≥44px targets', async ({ page }) => {
      await openCinematic(page, 'medium');
      const end = await heroEnd(page);
      await scrollTo(page, end + 900);
      const m = await page.evaluate(() => {
        const rail = document.querySelector<HTMLElement>('#ecosystem [role="tablist"]')!;
        const chips = [...rail.querySelectorAll<HTMLElement>('[role="tab"]')];
        const actions = [...document.querySelectorAll<HTMLElement>('#ecosystem .eco__action')];
        return {
          docW: document.documentElement.scrollWidth,
          vw: innerWidth,
          railScrolls: rail.scrollWidth > rail.clientWidth,
          minChip: Math.min(...chips.map((c) => c.getBoundingClientRect().height)),
          minAction: Math.min(...actions.map((a) => a.getBoundingClientRect().height)),
          stageH: document.querySelector<HTMLElement>('#ecosystem .eco__stage-card')!.offsetHeight,
        };
      });
      expect(m.docW).toBe(m.vw);
      expect(m.railScrolls).toBe(true);
      expect(m.minChip).toBeGreaterThanOrEqual(44);
      expect(m.minAction).toBeGreaterThanOrEqual(44);
      expect(m.stageH).toBeGreaterThanOrEqual(300);
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('section works without a scroll pin or animations', async ({ page }) => {
      await page.goto('/?quality=high');
      await expect(page.locator('section.hero')).toHaveClass(/\bhero--still\b/);
      const section = page.locator('#ecosystem');
      await expect(section).toHaveAttribute('data-enhanced', 'true');
      await page.locator('#eco-tab-landfill').click();
      expect(await visiblePanels(page)).toEqual(['eco-landfill']);
      const m = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>('#ecosystem')!;
        return {
          anim: getComputedStyle(s.querySelector('#eco-landfill')!).animationName,
          slotH: s.querySelector<HTMLElement>('.eco__slot')!.offsetHeight,
        };
      });
      expect(m.anim).toBe('none');
      expect(m.slotH).toBeGreaterThan(200);
    });
  });
});

const ecoCamera = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsEco: { camera: () => { tweening: boolean } } }).__iwmsEco.camera());

interface EcoPose {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  focused: boolean;
  selected: string;
  tweening: boolean;
}
interface EcoDebug {
  frames: () => number;
  camera: () => EcoPose;
  info: () => { calls: number; triangles: number; textures: number; programs: number; contextLost: boolean };
}
const eco = (page: Page) =>
  page.evaluate(() => {
    const e = (window as unknown as { __iwmsEco?: EcoDebug }).__iwmsEco;
    return e ? { frames: e.frames(), ...e.info() } : null;
  });
const ecoCam = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsEco: EcoDebug }).__iwmsEco.camera());
/** Wait until the camera move has finished and the on-demand frame counter has stopped. */
async function settle(page: Page) {
  await expect.poll(async () => (await ecoCam(page)).tweening, { timeout: 10_000 }).toBe(false);
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = (await eco(page))!.frames;
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [300], timeout: 5_000 },
    )
    .toBe(true);
  return last;
}
const heroLoop = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop());
const heroBottomY = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section.hero')!;
    return el.offsetTop + el.offsetHeight;
  });

test.describe('Scene 04 3D city (M3)', () => {
  test.describe.configure({ timeout: 150_000 });

  for (const quality of ['high', 'medium'] as const) {
    test(`${quality}: lazy, on-demand, one renderer at a time, interactions recompile nothing`, async ({
      page,
    }) => {
      const errors = watch(page);
      const requests: string[] = [];
      page.on('request', (r) => requests.push(r.url()));
      await openCinematic(page, quality);
      // Not fetched while the visitor is in the hero.
      await page.waitForTimeout(1_000);
      expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
      expect(await page.locator('#ecosystem canvas').count()).toBe(0);

      // Into Scene 04: the city loads, compiles, shows; the hero stops rendering.
      const heroBottom = await heroBottomY(page);
      await scrollTo(page, heroBottom + 40);
      await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'ready', { timeout: 30_000 });
      // One stage script chunk (plus its small stylesheet since M4), fetched once.
      expect(requests.filter((u) => /EcosystemStage-[\w-]+\.js$/.test(u)).length).toBe(1);
      expect(await page.locator('canvas').count()).toBe(2);
      await expect.poll(async () => (await heroLoop(page)).frameloop).toBe('never');
      await expect(page.locator('.eco__hotspot')).toHaveCount(8);
      await expect(page.locator('.eco__overlay')).toHaveAttribute('aria-hidden', 'true');

      // Budget (M3): ≤ 4 draw calls, ≤ 20k triangles, no textures; no frames while idle.
      const idle = (await eco(page))!;
      expect(idle.calls).toBeLessThanOrEqual(4);
      expect(idle.triangles).toBeLessThanOrEqual(20_000);
      expect(idle.textures).toBe(0);
      await page.waitForTimeout(1_500);
      expect((await eco(page))!.frames, 'no idle frames').toBe(idle.frames);
      const heroFrames = (await heroLoop(page)).frames;

      // Selections (M4): each starts one short camera move that renders only while it runs; no
      // shader compiles; the hotspot follows the selection.
      const t0 = Date.now();
      for (const [id, text] of [
        ['weighbridge', /WEIGHBRIDGE/i],
        ['landfill', /LANDFILL/i],
        ['iccc', /ICCC/i],
      ] as const) {
        await page.locator(`#eco-tab-${id}`).click();
        await expect(page.locator('.eco__hotspot[data-state="selected"]')).toHaveText(text);
      }
      // Wait for the move to finish and the frames it requested to render, then read the counter.
      await settle(page);
      const moving = Date.now() - t0;
      const after = (await eco(page))!;
      // Frames are bounded by the time the camera was moving (≤ 120 Hz + a few settling frames),
      // never a continuous loop; then strictly nothing (checked below and on return to the hero).
      expect(after.frames - idle.frames).toBeGreaterThanOrEqual(1);
      expect(after.frames - idle.frames).toBeLessThanOrEqual(Math.ceil((moving / 1000) * 120) + 4);
      await page.waitForTimeout(1_500);
      expect((await eco(page))!.frames, 'no frames once the camera is still').toBe(after.frames);
      expect(after.programs).toBe(idle.programs);
      expect(after.contextLost).toBe(false);
      expect((await heroLoop(page)).frames, 'hero stays paused during Scene 04 use').toBe(heroFrames);

      // Back to the hero: it resumes; the idle city renders nothing meanwhile.
      const ecoFrames = after.frames;
      await scrollTo(page, heroBottom - (await page.evaluate(() => innerHeight)));
      await expect.poll(async () => (await heroLoop(page)).frameloop).toBe('always');
      await page.waitForTimeout(1_000);
      // At most one late-settling frame from the selections above, then strictly nothing:
      // the city never renders in a loop while the hero is on screen.
      const settledFrames = (await eco(page))!.frames;
      expect(settledFrames - ecoFrames).toBeLessThanOrEqual(1);
      await page.waitForTimeout(1_500);
      expect((await eco(page))!.frames, 'no city frames while the hero is shown').toBe(settledFrames);
      expect(errors).toEqual([]);
    });
  }

  test('WebGL context loss falls back to the schematic; the interface keeps working', async ({ page }) => {
    await openCinematic(page, 'medium');
    await scrollTo(page, (await heroBottomY(page)) + 40);
    await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'ready', { timeout: 30_000 });
    await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#ecosystem canvas')!;
      (c.getContext('webgl2') ?? c.getContext('webgl'))!.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'failed');
    await expect(page.locator('#ecosystem canvas')).toHaveCount(0);
    await expect(page.locator('.eco__map')).toBeVisible();
    await page.locator('#eco-tab-processing').click();
    expect(await visiblePanels(page)).toEqual(['eco-processing']);
    await expect(page.locator('.eco__map-node[data-state="selected"]')).toHaveCount(1);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('never loads the 3D city; the schematic is shown', async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (r) => requests.push(r.url()));
      await page.goto('/?quality=high');
      await expect(page.locator('#ecosystem')).toHaveAttribute('data-enhanced', 'true');
      await page.locator('#ecosystem').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2_000);
      expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
      await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'off');
      await expect(page.locator('.eco__map')).toBeVisible();
    });
  });
});

test.describe('Scene 04 city interactions (M4)', () => {
  test.describe.configure({ timeout: 150_000 });

  async function openCity(page: Page) {
    await openCinematic(page, 'high');
    await scrollTo(page, (await heroBottomY(page)) + 40);
    await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'ready', { timeout: 30_000 });
    // Bring the whole city view on screen so every hotspot can be clicked.
    await page.locator('.eco__stage-card').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await settle(page);
  }
  /** Visible hotspot labels/dots that leave the slot, touch an overlay, or overlap each other. */
  const hotspotProblems = (page: Page) =>
    page.evaluate(() => {
      const slot = document.querySelector('#ecosystem .eco__slot')!.getBoundingClientRect();
      const overlays = [...document.querySelectorAll<HTMLElement>('#ecosystem [data-eco-overlay]')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => e.getBoundingClientRect());
      const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const shown = [...document.querySelectorAll<HTMLElement>('.eco__hotspot')].filter(
        (h) => getComputedStyle(h).visibility === 'visible',
      );
      const boxes = shown.flatMap((h) =>
        [h.querySelector('.eco__hotspot-label')!, h.querySelector('.eco__hotspot-dot')!].map((e) => ({
          id: h.dataset.id!,
          r: e.getBoundingClientRect(),
        })),
      );
      const out: string[] = [];
      for (const b of boxes) {
        if (b.r.left < slot.left || b.r.right > slot.right || b.r.top < slot.top || b.r.bottom > slot.bottom)
          out.push(`${b.id} leaves the city view`);
        if (overlays.some((o) => hit(o, b.r))) out.push(`${b.id} under overlaid UI`);
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
          if (boxes[i].id !== boxes[j].id && hit(boxes[i].r, boxes[j].r)) out.push(`${boxes[i].id} overlaps ${boxes[j].id}`);
      return [...new Set(out)];
    });
  const drawnLinks = (page: Page) =>
    page.$$eval('.eco__links path', (ps) => ps.filter((p) => (p.getAttribute('d') ?? '') !== '').length);
  const near = (a: EcoPose, b: EcoPose) =>
    Math.max(...(['px', 'py', 'pz', 'tx', 'ty', 'tz'] as const).map((k) => Math.abs(a[k] - b[k])));

  test('hotspots select, camera focuses and returns, rapid selection never conflicts', async ({ page }) => {
    const errors = watch(page);
    await openCity(page);
    const overview = await ecoCam(page);
    expect(overview.focused).toBe(false);
    const programs = (await eco(page))!.programs;
    // Overview: no return control and no connection arcs until a module is chosen; every
    // hotspot readable (inside the view, no overlaps).
    await expect(page.locator('.eco__overview-btn')).toHaveCount(0);
    expect(await drawnLinks(page)).toBe(0);
    expect(await hotspotProblems(page)).toEqual([]);

    // A city hotspot selects its module: pill, card and camera stay in sync.
    await page.locator('.eco__hotspot[data-id="weighbridge"]').click();
    await expect(page.locator('#eco-tab-weighbridge')).toHaveAttribute('aria-selected', 'true');
    expect(await visiblePanels(page)).toEqual(['eco-weighbridge']);
    await settle(page);
    const focusedPose = await ecoCam(page);
    expect(focusedPose.focused).toBe(true);
    expect(focusedPose.selected).toBe('weighbridge');
    expect(near(focusedPose, overview)).toBeGreaterThan(1);
    await expect(page.locator('.eco__hotspot[data-state="selected"]')).toHaveAttribute('data-id', 'weighbridge');
    // Connections appear for the selected module only (at most its own connections).
    const connects = ECOSYSTEM_NODES.find((n) => n.id === 'weighbridge')!.connects.length;
    const links = await drawnLinks(page);
    expect(links).toBeGreaterThanOrEqual(1);
    expect(links).toBeLessThanOrEqual(connects);
    await expect(page.locator('.eco__hotspot[data-state="linked"]')).toHaveCount(connects);

    // Visible hotspots stay inside the city view, clear of the overlaid UI and of each other.
    expect(await hotspotProblems(page)).toEqual([]);

    // Return to overview: keyboard reachable, restores the exact overview pose, focus goes back
    // to the selected pill, arcs disappear.
    const back = page.locator('.eco__overview-btn');
    await expect(back).toBeVisible();
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#eco-tab-weighbridge')).toBeFocused();
    await expect(back).toHaveCount(0);
    await settle(page);
    const restored = await ecoCam(page);
    expect(restored.focused).toBe(false);
    expect(near(restored, overview)).toBeLessThanOrEqual(1e-3);
    expect(await drawnLinks(page)).toBe(0);

    // Rapid selection (no waiting between clicks): one move wins, ending exactly where a calm
    // selection of the same module ends.
    for (const id of ['landfill', 'iccc', 'grievance', 'logistics', 'processing'])
      await page.locator(`#eco-tab-${id}`).click({ delay: 0 });
    await settle(page);
    const rapid = await ecoCam(page);
    expect(rapid.selected).toBe('processing');
    expect(rapid.tweening).toBe(false);
    expect(await visiblePanels(page)).toEqual(['eco-processing']);
    await page.locator('#eco-tab-landfill').click();
    await settle(page);
    await page.locator('#eco-tab-processing').click();
    await settle(page);
    expect(near(await ecoCam(page), rapid)).toBeLessThanOrEqual(1e-3);

    // Budget holds through every interaction: ≤ 4 draw calls, no new shader programs, no idle frames.
    const info = (await eco(page))!;
    expect(info.calls).toBeLessThanOrEqual(4);
    expect(info.programs).toBe(programs);
    expect(info.contextLost).toBe(false);
    const still = info.frames;
    await page.waitForTimeout(1_500);
    expect((await eco(page))!.frames).toBe(still);
    expect(errors).toEqual([]);
  });

  test('details disclosure: full brochure content below the city, no auto-scroll on selection', async ({ page }) => {
    const errors = watch(page);
    await openCity(page);
    await page.locator('#eco-tab-collection').click();
    const btn = page.locator('#eco-collection .eco__details-btn');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#eco-collection-details')).toBeHidden();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(btn).toHaveAttribute('aria-controls', 'eco-collection-details');
    const details = page.locator('#eco-collection-details');
    await expect(details).toBeVisible();
    // Every brochure capability, the benefit, connections and the source are present.
    const node = ECOSYSTEM_NODES.find((n) => n.id === 'collection')!;
    await expect(details.locator('.eco__card-list li')).toHaveCount(node.capabilities.length);
    await expect(details.locator('.eco__link')).toHaveCount(node.connects.length);
    await expect(details.locator('.eco__source')).toHaveAttribute('href', `${siteConfig.brochurePath}#page=${node.page}`);
    // Below the city, in normal flow, no nested scrolling.
    const m = await details.evaluate((el) => {
      const stage = document.querySelector('#ecosystem .eco__stage-card')!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const scrolls = [el, ...el.querySelectorAll<HTMLElement>('*')].some(
        (e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1,
      );
      return { below: r.top >= stage.bottom - 1, scrolls };
    });
    expect(m.below).toBe(true);
    expect(m.scrolls).toBe(false);
    // Switching modules keeps the details open for the new module, without scrolling the page.
    // Let the reveal scroll of View details finish before measuring.
    let last = -1;
    await expect
      .poll(async () => {
        const now = await page.evaluate(() => scrollY);
        const same = now === last;
        last = now;
        return same;
      }, { intervals: [250] })
      .toBe(true);
    const y = last;
    // Dispatched click: Playwright's actionability scroll would otherwise move the page itself.
    await page.locator('#eco-tab-landfill').dispatchEvent('click');
    await expect(page.locator('#eco-landfill-details')).toBeVisible();
    await page.waitForTimeout(400);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(1);
    // Close collapses and returns focus to View details.
    await page.locator('#eco-landfill .eco__close-btn').click();
    await expect(page.locator('#eco-landfill-details')).toBeHidden();
    await expect(page.locator('#eco-landfill .eco__details-btn')).toBeFocused();
    await expect(page.locator('#eco-landfill .eco__details-btn')).toHaveAttribute('aria-expanded', 'false');
    expect(errors).toEqual([]);
  });

  test('contextual popup (M4.2): opens on selection beside the zone, one element, close / reopen / overview', async ({
    page,
  }) => {
    const errors = watch(page);
    await openCity(page);
    const popup = page.locator('.eco__popup');
    // Overview: no popup.
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toHaveCount(0);

    const place = async (id: string) => {
      await settle(page);
      await page.waitForTimeout(500); // the popup's 0.4 s move transition
      return page.evaluate((sel) => {
        const slot = document.querySelector('#ecosystem .eco__slot')!.getBoundingClientRect();
        const el = document.querySelector<HTMLElement>('.eco__popup[data-eco-popup="open"]')!;
        const r = el.getBoundingClientRect();
        const dot = document.querySelector(`.eco__hotspot[data-id="${sel}"] .eco__hotspot-dot`)!.getBoundingClientRect();
        return {
          x: r.left - slot.left,
          y: r.top - slot.top,
          side: el.dataset.side,
          inside: r.left >= slot.left && r.right <= slot.right && r.top >= slot.top && r.bottom <= slot.bottom,
          coversSelected: r.left < dot.right && r.right > dot.left && r.top < dot.bottom && r.bottom > dot.top,
          // The popup sits on the side of the zone it says, next to it (not pinned to a corner).
          beside: el.dataset.side === 'right' ? r.left >= dot.right : r.right <= dot.left,
          near: Math.min(Math.abs(r.left - dot.right), Math.abs(dot.left - r.right)) < slot.width * 0.35,
        };
      }, id);
    };

    // A city hotspot opens it next to the selected operation.
    await page.locator('.eco__hotspot[data-id="collection"]').click();
    await expect(page.locator('#eco-tab-collection')).toHaveAttribute('aria-selected', 'true');
    await expect(popup).toHaveAttribute('data-eco-popup', 'open');
    await expect(popup).toContainText('Collection & Verification');
    const a = await place('collection');
    expect(a).toMatchObject({ inside: true, coversSelected: false, beside: true, near: true });
    expect(await hotspotProblems(page)).toEqual([]);

    // Another module updates and repositions the popup: never two on screen, at any frame.
    for (const id of ['processing', 'logistics', 'weighbridge', 'iccc']) {
      const most = page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let max = 0;
            let n = 0;
            const tick = () => {
              max = Math.max(max, document.querySelectorAll('.eco__popup').length);
              if (++n < 45) requestAnimationFrame(tick);
              else resolve(max);
            };
            requestAnimationFrame(tick);
          }),
      );
      await page.locator(`#eco-tab-${id}`).click();
      expect(await most, `${id}: one popup`).toBe(1);
      const b = await place(id);
      expect(b, id).toMatchObject({ inside: true, coversSelected: false, beside: true, near: true });
      expect(await hotspotProblems(page), id).toEqual([]);
    }
    // Contextual, not pinned: western and eastern zones put it on different sides/positions.
    const west = await (async () => {
      await page.locator('#eco-tab-collection').click();
      return place('collection');
    })();
    const east = await (async () => {
      await page.locator('#eco-tab-processing').click();
      return place('processing');
    })();
    expect(west.side).toBe('right');
    expect(east.side).toBe('left');
    expect(Math.abs(west.x - east.x)).toBeGreaterThan(100);

    // Full brochure details stay reachable from the popup.
    await expect(popup.locator('.eco__details-btn')).toHaveAttribute('aria-controls', 'eco-processing-details');

    // × closes the popup, keeps the selection and the focused camera, focus → selected pill.
    await popup.locator('.eco__popup-close').click();
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toHaveCount(0);
    await expect(page.locator('#eco-tab-processing')).toBeFocused();
    await expect(page.locator('#eco-tab-processing')).toHaveAttribute('aria-selected', 'true');
    await settle(page);
    expect((await ecoCam(page)).focused).toBe(true);
    expect(await visiblePanels(page)).toEqual(['eco-processing']);

    // Re-selecting reopens it; Escape inside it closes it.
    await page.locator('#eco-tab-processing').click();
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toBeVisible();
    await page.locator('.eco__popup .eco__details-btn').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toHaveCount(0);
    await expect(page.locator('#eco-tab-processing')).toBeFocused();

    // Return to overview restores the full city and dismisses the popup.
    await page.locator('#eco-tab-landfill').click();
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toBeVisible();
    await page.locator('.eco__overview-btn').click();
    await expect(page.locator('.eco__popup[data-eco-popup="open"]')).toHaveCount(0);
    await settle(page);
    expect((await ecoCam(page)).focused).toBe(false);

    // Still no idle rendering and no new programs after all of it.
    const f = (await eco(page))!.frames;
    await page.waitForTimeout(1_500);
    expect((await eco(page))!.frames).toBe(f);
    expect(errors).toEqual([]);
  });

  const occupancy = (page: Page) =>
    page.evaluate(() =>
      (window as unknown as { __iwmsEco: { occupancy: () => { x: number; y: number } } }).__iwmsEco.occupancy(),
    );
  const hiddenHotspots = (page: Page) =>
    page.$$eval('.eco__hotspot', (hs) =>
      hs.filter((h) => getComputedStyle(h).visibility !== 'visible').map((h) => (h as HTMLElement).dataset.id),
    );

  test('camera composition: a large overview with every zone labelled', async ({ page }) => {
    await openCity(page);
    const occ = await occupancy(page);
    // The island fills most of the 2:1 view: nearly all of its height (labels included) and,
    // limited by its own ~1.7:1 footprint, about two thirds of its width.
    expect(occ.y).toBeGreaterThanOrEqual(0.85);
    expect(occ.x).toBeGreaterThanOrEqual(0.6);
    expect(await hiddenHotspots(page)).toEqual([]);
    expect(await hotspotProblems(page)).toEqual([]);
  });

  test.describe('portrait phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('compact layout: city above the card, focus keeps the selected hotspot in view', async ({ page }) => {
      const errors = watch(page);
      await openCinematic(page, 'medium');
      await scrollTo(page, (await heroBottomY(page)) + 40);
      await expect(page.locator('.eco__slot')).toHaveAttribute('data-stage', 'ready', { timeout: 30_000 });
      await page.locator('.eco__stage-card').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.locator('#eco-tab-landfill').click();
      await settle(page);
      const m = await page.evaluate(() => {
        const stage = document.querySelector('#ecosystem .eco__stage-card')!.getBoundingClientRect();
        const card = document.querySelector('#ecosystem .eco__card:not([hidden])')!.getBoundingClientRect();
        const sel = document.querySelector<HTMLElement>('.eco__hotspot[data-state="selected"]')!;
        const r = sel.getBoundingClientRect();
        return {
          below: card.top >= stage.bottom - 1,
          selVisible: getComputedStyle(sel).visibility === 'visible',
          selInside: r.left >= stage.left && r.right <= stage.right && r.top >= stage.top && r.bottom <= stage.bottom,
          docW: document.documentElement.scrollWidth,
          vw: innerWidth,
        };
      });
      expect(m.below).toBe(true);
      expect(m.selVisible).toBe(true);
      expect(m.selInside).toBe(true);
      expect(m.docW).toBe(m.vw);
      expect(await hotspotProblems(page)).toEqual([]);
      await expect(page.locator('.eco__popup[data-eco-popup="open"]'), 'no floating popup on phones').toHaveCount(0);
      // Phones frame the eight zones (the island rim may bleed off); every zone stays labelled in
      // the overview, and each selected zone stays labelled and in view when focused.
      await page.locator('.eco__overview-btn').click();
      await settle(page);
      expect(await hiddenHotspots(page)).toEqual([]);
      for (const n of ECOSYSTEM_NODES) {
        await page.locator(`#eco-tab-${n.id}`).dispatchEvent('click');
        await settle(page);
        expect(await hiddenHotspots(page), n.id).not.toContain(n.id);
      }
      await expect(page.locator('.eco__overview-btn')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
});

test.describe('Scene 04 on the static poster tier @software', () => {
  test('interface works without WebGL', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/, { timeout: 30_000 });
    await expect(page.locator('#ecosystem')).toHaveAttribute('data-enhanced', 'true');
    await page.locator('#eco-tab-grievance').click();
    expect(await visiblePanels(page)).toEqual(['eco-grievance']);
    expect(await page.locator('canvas').count()).toBe(0);
    expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
    await expect(page.locator('.eco__pillar')).toHaveCount(4);
    await expect(page.locator('.eco__overview-btn')).toHaveCount(0);
  });
});
