import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page, type Browser } from '@playwright/test';
import { siteConfig } from '../content/config';
import { ECOSYSTEM_NODES } from '../content/ecosystem';
import {
  CITY_DESKTOP,
  CITY_MOBILE,
  type CityComposition,
} from '../components/ecosystem/cityData';

/**
 * Scene 04: the IWMS ecosystem after the hero. Interface (SSR/no-JS markup, tab/keyboard model,
 * content integrity, actions, responsive layout, reduced motion, poster tier, hero ↔ section) and
 * the static city (M5): one pre-rendered image at the full content width with its own aspect
 * ratio, numbered pins at exact percentage anchors, the selected-zone highlight, one contextual
 * floating popup and the details disclosure — no WebGL, camera or 3D code in Scene 04.
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
const IDS = ECOSYSTEM_NODES.map((n) => n.id);

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
    () =>
      document.documentElement.classList.contains('lenis') &&
      window.scrollY === 0,
    undefined,
    { timeout: 30_000 },
  );
  await expect(page.locator('#ecosystem')).toHaveAttribute(
    'data-enhanced',
    'true',
  );
}

/** Scene 04 behaves the same on every tier; the poster hero keeps these tests light. */
async function openPoster(page: Page) {
  await page.goto('/?quality=poster');
  await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/, {
    timeout: 30_000,
  });
  await expect(page.locator('#ecosystem')).toHaveAttribute(
    'data-enhanced',
    'true',
  );
}

/** Bring the whole city on screen and wait for its image. */
async function showCity(page: Page) {
  await page
    .locator('#ecosystem .eco__city')
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>(
      '#ecosystem .eco__city-img',
    );
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

const heroEnd = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section.hero')!;
    return el.offsetTop + el.offsetHeight - window.innerHeight;
  });
const heroBottomY = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section.hero')!;
    return el.offsetTop + el.offsetHeight;
  });

const scrollTo = (page: Page, y: number) =>
  page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top);
        const done = () =>
          Math.abs(
            window.scrollY -
              Math.min(
                top,
                document.documentElement.scrollHeight - innerHeight,
              ),
          ) <= 1;
        const tick = () =>
          done()
            ? requestAnimationFrame(() => resolve())
            : requestAnimationFrame(tick);
        requestAnimationFrame(tick);
      }),
    Math.round(y),
  );

const visiblePanels = (page: Page) =>
  page.$$eval('.eco__card', (els) =>
    els.filter((e) => !(e as HTMLElement).hidden).map((e) => e.id),
  );
/** The selected module's View details button (in the floating popup, or in its panel). */
const detailsBtn = (page: Page, id: string) =>
  page.locator(
    `#eco-popup .eco__details-btn[aria-controls="eco-${id}-details"], #eco-${id} .eco__details-btn`,
  );
const openPopup = (page: Page) =>
  page.locator('.eco__popup[data-eco-popup="open"]');

test.describe('Scene 04 ecosystem', () => {
  test.describe.configure({ timeout: 120_000 });

  test('content: seven official modules in brochure order plus ICCC as an integration', () => {
    const modules = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
    expect(modules.map((n) => n.name)).toEqual(OFFICIAL_MODULES);
    expect(modules.map((n) => n.number)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
    ]);
    const integrations = ECOSYSTEM_NODES.filter(
      (n) => n.kind === 'integration',
    );
    expect(integrations.map((n) => n.name)).toEqual(['ICCC Integration']);
    const ids = new Set(IDS);
    for (const n of ECOSYSTEM_NODES) {
      expect(n.capabilities.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.capabilities.length, n.id).toBeLessThanOrEqual(4);
      expect(n.page, n.id).toBeGreaterThanOrEqual(3);
      for (const to of n.connects)
        expect(ids.has(to), `${n.id} → ${to}`).toBe(true);
      // No figures or live statistics in the copy.
      for (const line of [n.summary, n.benefit, ...n.capabilities])
        expect(line, `${n.id}: ${line}`).not.toMatch(
          /\d+\s?(%|kg|km|t\b|tonnes|households)/i,
        );
    }
    // City data covers every zone, inside the image.
    for (const comp of [CITY_DESKTOP, CITY_MOBILE])
      for (const id of IDS) {
        const z = comp.nodes[id];
        expect(z.footprint.length, id).toBeGreaterThanOrEqual(3);
        for (const v of [...z.anchor, ...z.box]) {
          expect(v, id).toBeGreaterThanOrEqual(0);
          expect(v, id).toBeLessThanOrEqual(100);
        }
      }
  });

  test('prerendered page: section after the hero with every module and the city image, no placeholders', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'dist/index.html'),
      'utf8',
    );
    const hero = html.indexOf('class="hero');
    const eco = html.indexOf('id="ecosystem"');
    expect(hero).toBeGreaterThan(-1);
    expect(eco).toBeGreaterThan(hero);
    const section = html.slice(eco);
    for (const name of OFFICIAL_MODULES)
      expect(section, name).toContain(name.replace(/&/g, '&amp;'));
    expect(section).toContain('ICCC Integration');
    expect(section).not.toContain('{{');
    // The static city is server-rendered: <picture> with mobile + desktop WebP sources, a JPEG
    // fallback with explicit size, lazy loading, async decoding and a descriptive alt.
    const city = section.slice(
      section.indexOf('class="eco__city"'),
      section.indexOf('</picture>'),
    );
    expect(city).toContain('<picture');
    expect(city).toMatch(
      /<source media="\(max-width: 767px\)" type="image\/webp" srcSet="\/scene04\/city-mobile-720\.webp 720w, \/scene04\/city-mobile-1080\.webp 1080w"/i,
    );
    expect(city).toMatch(
      /srcSet="\/scene04\/city-desktop-1280\.webp 1280w, \/scene04\/city-desktop-1920\.webp 1920w, \/scene04\/city-desktop-2560\.webp 2560w"/i,
    );
    expect(city).toMatch(/sizes="\(min-width: 1304px\) 1200px, 92vw"/);
    expect(city).toMatch(/<img[^>]+src="\/scene04\/city-desktop-1920\.jpg"/);
    expect(city).toMatch(/<img[^>]+width="1920"[^>]+height="1080"/);
    expect(city).toMatch(/<img[^>]+loading="lazy"/);
    expect(city).toMatch(/<img[^>]+decoding="async"/);
    expect(city).toMatch(/<img[^>]+alt="Illustrated miniature city[^"]{60,}"/);
    // The 3D stage is gone from the build.
    expect(
      readdirSync(resolve(process.cwd(), 'dist/assets')).filter((f) =>
        /EcosystemStage/.test(f),
      ),
    ).toEqual([]);
  });

  test('Scene 04 source has no Three.js / WebGL code', () => {
    for (const f of [
      'EcosystemSection.tsx',
      'EcosystemCity.tsx',
      'cityData.ts',
    ]) {
      const src = readFileSync(
        resolve(process.cwd(), 'components/ecosystem', f),
        'utf8',
      );
      expect(src, f).not.toMatch(
        /from ['"](three|@react-three\/[\w-]+|postprocessing)['"]/,
      );
      expect(src, f).not.toMatch(
        /EcosystemStage|EcosystemMap|detectQuality|<canvas|getContext\(/,
      );
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the city image and all modules are readable as a list with working in-page links', async ({
      page,
    }) => {
      await page.goto('/');
      const section = page.locator('#ecosystem');
      await expect(section).toHaveAttribute('data-enhanced', 'false');
      await expect(section.locator('[role="tablist"]')).toHaveCount(0);
      await expect(section.locator('.eco__card')).toHaveCount(8);
      for (const id of IDS)
        await expect(section.locator(`#eco-${id}`)).toBeVisible();
      await expect(section.locator('.eco__tabs--static a')).toHaveCount(8);
      await expect(section.locator('.eco__pillar')).toHaveCount(4);
      await expect(section.locator('.eco__pin')).toHaveCount(0);
      // The city is shown (image loaded, its box reserved at 16:9); no horizontal overflow.
      await section.locator('.eco__city').scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLImageElement>('#ecosystem .eco__city-img')!
            .naturalWidth > 0,
      );
      const m = await page.evaluate(() => {
        const r = document
          .querySelector('#ecosystem .eco__city')!
          .getBoundingClientRect();
        return {
          docW: document.documentElement.scrollWidth,
          vw: innerWidth,
          w: r.width,
          h: r.height,
        };
      });
      expect(m.docW).toBe(m.vw);
      expect(m.h).toBeGreaterThan(200);
      expect(Math.abs(m.w / m.h - 16 / 9)).toBeLessThanOrEqual(0.01);
      // In-page links land clear of the fixed site header; details are all expanded.
      await section
        .locator('.eco__tabs--static a[href="#eco-landfill"]')
        .click();
      await page.waitForTimeout(300);
      const clear = await page.evaluate(
        () =>
          document.querySelector('#eco-landfill')!.getBoundingClientRect().top -
          document.querySelector('.site-header')!.getBoundingClientRect()
            .bottom,
      );
      expect(clear).toBeGreaterThanOrEqual(0);
      await expect(section.locator('#eco-landfill-details')).toBeVisible();
      await expect(section.locator('a.eco__action--primary')).toHaveAttribute(
        'href',
        /^(mailto:|https:\/\/www\.zigma\.in)/,
      );
    });
  });

  test('tabs: one panel at a time, ARIA wiring, keyboard model, connections', async ({
    page,
  }) => {
    const errors = watch(page);
    await openCinematic(page);
    const tabs = page.locator('#ecosystem [role="tab"]');
    await expect(tabs).toHaveCount(8);
    await expect(
      page.locator('#ecosystem [role="tab"][data-kind="integration"]'),
    ).toHaveCount(1);
    expect(await visiblePanels(page)).toEqual(['eco-collection']);

    // ARIA: selected tab ↔ panel, roving tabindex.
    const first = page.locator('#eco-tab-collection');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-controls', 'eco-collection');
    await expect(first).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#eco-collection')).toHaveAttribute(
      'role',
      'tabpanel',
    );
    await expect(page.locator('#eco-collection')).toHaveAttribute(
      'aria-labelledby',
      'eco-tab-collection',
    );
    expect(
      await page.locator('#ecosystem [role="tab"][tabindex="0"]').count(),
    ).toBe(1);

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
    const summary = (id: string) =>
      page.locator(`#eco-popup, #eco-${id} .eco__summary`);
    await expect(summary('iccc').locator('.eco__card-tag')).toContainText(
      'Integration',
    );
    await expect(summary('iccc').locator('.eco__card-note')).toBeVisible();
    await page.locator('#eco-tab-weighbridge').click();
    await expect(summary('weighbridge').locator('.eco__card-note')).toHaveCount(
      0,
    );
    await expect(
      summary('weighbridge').locator('.eco__card-tag'),
    ).toContainText('Module 04');

    // "Connected to" (in the disclosed full details) selects the target and focuses its tab.
    await detailsBtn(page, 'weighbridge').click();
    await page
      .locator('#eco-weighbridge .eco__link', { hasText: 'Processing' })
      .click();
    expect(await visiblePanels(page)).toEqual(['eco-processing']);
    await expect(page.locator('#eco-tab-processing')).toBeFocused();

    // The city pins mirror the selection (presentational, aria-hidden).
    await expect(page.locator('#ecosystem .eco__pins')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(page.locator('.eco__pin')).toHaveCount(8);
    await expect(
      page.locator('.eco__pin[data-state="selected"]'),
    ).toHaveAttribute('data-id', 'processing');

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

    // Only the hero's canvas on the page; none in Scene 04.
    expect(await page.locator('#ecosystem canvas').count()).toBe(0);
    expect(await page.locator('canvas').count()).toBeLessThanOrEqual(1);
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
      () =>
        ({
          ...(window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig,
        }) as Record<string, number>,
    );
    // Deep into the section (the hero has entirely left the viewport).
    const vh = await page.evaluate(() => innerHeight);
    await scrollTo(page, end + vh * 2);
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop()
              .frameloop,
        ),
      )
      .toBe('never');
    // Reverse back into the hero: rendering resumes and the timeline state is unchanged.
    await scrollTo(page, end);
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.loop()
              .frameloop,
        ),
      )
      .toBe('always');
    const after = await page.evaluate(
      () =>
        ({
          ...(window as unknown as { __iwmsHero: HeroDebug }).__iwmsHero.rig,
        }) as Record<string, number>,
    );
    for (const k of ['driveSec', 'cityU', 'collectU', 'scan', 'done'])
      expect(Math.abs(after[k] - before[k]), k).toBeLessThanOrEqual(1e-6);
    expect(errors).toEqual([]);
  });

  test('desktop layout: header clear of the site header, one pill row, full-width city, compact popup', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await openCinematic(page);
    // Section top at the viewport top: the heading sits below the fixed site header.
    await scrollTo(
      page,
      await page.evaluate(
        () => document.querySelector<HTMLElement>('#ecosystem')!.offsetTop,
      ),
    );
    const m = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('#ecosystem')!;
      const r = (sel: string) =>
        s.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
      const tabs = [...s.querySelectorAll<HTMLElement>('[role="tab"]')].map(
        (t) => t.getBoundingClientRect(),
      );
      const sec = s.getBoundingClientRect();
      const head = r('.eco__head');
      return {
        headerBottom: document
          .querySelector('.site-header')!
          .getBoundingClientRect().bottom,
        eyebrowTop: r('.eco__eyebrow').top,
        headCentre: Math.abs(
          head.left + head.width / 2 - (sec.left + sec.width / 2),
        ),
        titleAlign: getComputedStyle(s.querySelector('.eco__title')!).textAlign,
        rows: new Set(tabs.map((t) => Math.round(t.top))).size,
        cityW: r('.eco__city').width,
        pillars: s.querySelectorAll('.eco__pillar').length,
        sticky: [...s.querySelectorAll<HTMLElement>('*')].some(
          (e) => getComputedStyle(e).position === 'sticky',
        ),
      };
    });
    expect(
      m.eyebrowTop,
      'heading clear of the fixed header',
    ).toBeGreaterThanOrEqual(m.headerBottom + 8);
    expect(m.headCentre).toBeLessThanOrEqual(2);
    expect(m.titleAlign).toBe('center');
    expect(m.rows, 'pills form one horizontal row').toBe(1);
    expect(m.cityW).toBeCloseTo(1200, 0);
    expect(m.pillars).toBe(4);
    expect(m.sticky, 'natural flow, no pinned stage').toBe(false);

    // Overview: nothing large over the city — the summary card sits below it.
    await showCity(page);
    const below = await page.evaluate(() => {
      const city = document
        .querySelector('#ecosystem .eco__city')!
        .getBoundingClientRect();
      const card = document
        .querySelector('#ecosystem .eco__card:not([hidden]) .eco__summary')!
        .getBoundingClientRect();
      return card.top >= city.bottom - 1;
    });
    expect(below).toBe(true);
    await expect(openPopup(page)).toHaveCount(0);

    // Selected: the summary becomes one compact popup floating on the city (small, no nested
    // scrolling), owned by the selected tabpanel.
    await page.locator('#eco-tab-processing').click();
    await expect(openPopup(page)).toBeVisible();
    await expect(page.locator('#eco-processing')).toHaveAttribute(
      'aria-owns',
      'eco-popup',
    );
    await page.waitForTimeout(500);
    const f = await page.evaluate(() => {
      const city = document
        .querySelector('#ecosystem .eco__city')!
        .getBoundingClientRect();
      const el = document.querySelector<HTMLElement>('#eco-popup')!;
      const sum = el.getBoundingClientRect();
      const scrolls = [el, ...el.querySelectorAll<HTMLElement>('*')].some(
        (e) =>
          /(auto|scroll)/.test(getComputedStyle(e).overflowY) &&
          e.scrollHeight > e.clientHeight + 1,
      );
      return {
        inside:
          sum.left >= city.left &&
          sum.right <= city.right &&
          sum.top >= city.top &&
          sum.bottom <= city.bottom,
        area: (sum.width * sum.height) / (city.width * city.height),
        scrolls,
      };
    });
    expect(f.inside).toBe(true);
    expect(f.area, 'summary covers a small part of the city').toBeLessThan(0.2);
    expect(f.scrolls).toBe(false);
    // No 3D stage chunk is ever requested; no canvas in Scene 04.
    expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
    expect(await page.locator('#ecosystem canvas').count()).toBe(0);
    // Hero length untouched.
    const heroRatio = await page.evaluate(
      () =>
        document.querySelector<HTMLElement>('section.hero')!.offsetHeight /
        innerHeight,
    );
    expect(Math.abs(heroRatio - 17.8)).toBeLessThanOrEqual(0.01);
  });

  test.describe('short desktop window (1525×662)', () => {
    test.use({ viewport: { width: 1525, height: 662 } });
    test('fixed header: solid only past the hero, heading clear on arrival, city at 16:9', async ({
      page,
    }) => {
      await openCinematic(page);
      const header = page.locator('.site-header');
      // Over the hero the header keeps its light gradient.
      await expect(header).toHaveAttribute('data-solid', 'false');
      const bottom = await heroBottomY(page);
      // Arrival in Scene 04: heading, lead and pills all below the (now solid) header.
      await scrollTo(page, bottom);
      await expect(header).toHaveAttribute('data-solid', 'true');
      const m = await page.evaluate(() => {
        const hb = document
          .querySelector('.site-header')!
          .getBoundingClientRect().bottom;
        const top = (sel: string) =>
          document.querySelector(sel)!.getBoundingClientRect().top;
        const city = document
          .querySelector('#ecosystem .eco__city')!
          .getBoundingClientRect();
        return {
          hb,
          eyebrow: top('#ecosystem .eco__eyebrow'),
          title: top('#ecosystem .eco__title'),
          tabs: document
            .querySelector('#ecosystem [role="tablist"]')!
            .getBoundingClientRect().bottom,
          aspect: city.width / city.height,
          vh: innerHeight,
        };
      });
      expect(m.eyebrow).toBeGreaterThanOrEqual(m.hb);
      expect(m.title).toBeGreaterThanOrEqual(m.hb);
      expect(m.tabs).toBeLessThanOrEqual(m.vh);
      expect(Math.abs(m.aspect - 16 / 9)).toBeLessThanOrEqual(0.01);
      // Content that scrolls beneath the header is covered by its solid backing.
      await expect
        .poll(async () =>
          page.evaluate(
            () =>
              getComputedStyle(
                document.querySelector('.site-header')!,
                '::before',
              ).opacity,
          ),
        )
        .toBe('1');
      // Back into the hero (Scene 03): the gradient returns.
      await scrollTo(page, bottom - 1100);
      await expect(header).toHaveAttribute('data-solid', 'false');
    });
  });

  test.describe('portrait phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('no horizontal overflow, scrolling chip rail, ≥44px targets, summary below a 1:1 city', async ({
      page,
    }) => {
      const errors = watch(page);
      await openCinematic(page, 'medium');
      await scrollTo(page, (await heroEnd(page)) + 900);
      await showCity(page);
      await page.locator('#eco-tab-landfill').dispatchEvent('click');
      const m = await page.evaluate(() => {
        const rail = document.querySelector<HTMLElement>(
          '#ecosystem [role="tablist"]',
        )!;
        const chips = [...rail.querySelectorAll<HTMLElement>('[role="tab"]')];
        const actions = [
          ...document.querySelectorAll<HTMLElement>('#ecosystem .eco__action'),
        ];
        const city = document
          .querySelector('#ecosystem .eco__city')!
          .getBoundingClientRect();
        const card = document
          .querySelector('#ecosystem .eco__card:not([hidden]) .eco__summary')!
          .getBoundingClientRect();
        const hit = getComputedStyle(
          document.querySelector('.eco__pin')!,
          '::before',
        );
        return {
          docW: document.documentElement.scrollWidth,
          vw: innerWidth,
          railScrolls: rail.scrollWidth > rail.clientWidth,
          minChip: Math.min(
            ...chips.map((c) => c.getBoundingClientRect().height),
          ),
          minAction: Math.min(
            ...actions.map((a) => a.getBoundingClientRect().height),
          ),
          cityAspect: city.width / city.height,
          cityH: city.height,
          below: card.top >= city.bottom - 1,
          hit: [parseFloat(hit.width), parseFloat(hit.height)],
        };
      });
      expect(m.docW).toBe(m.vw);
      expect(m.railScrolls).toBe(true);
      expect(m.minChip).toBeGreaterThanOrEqual(44);
      expect(m.minAction).toBeGreaterThanOrEqual(44);
      expect(Math.abs(m.cityAspect - 1)).toBeLessThanOrEqual(0.01);
      expect(m.cityH).toBeGreaterThanOrEqual(300);
      expect(m.below).toBe(true);
      expect(m.hit[0]).toBeGreaterThanOrEqual(44);
      expect(m.hit[1]).toBeGreaterThanOrEqual(44);
      await expect(openPopup(page), 'no floating popup on phones').toHaveCount(
        0,
      );
      await expect(
        page.locator('.eco__pin[data-id="landfill"] .eco__pin-label'),
      ).toBeVisible();
      // The "Return to overview" chip never sits on a pin badge, whichever module is selected.
      for (const id of ECOSYSTEM_NODES.map((n) => n.id)) {
        await page.locator(`#eco-tab-${id}`).dispatchEvent('click');
        const under = await page.evaluate(() => {
          const chip = document
            .querySelector('#ecosystem .eco__overview-btn')!
            .getBoundingClientRect();
          return [...document.querySelectorAll<HTMLElement>('.eco__pin')]
            .filter((p) => {
              const b = p.querySelector('.eco__pin-badge')!.getBoundingClientRect();
              return (
                b.left < chip.right &&
                b.right > chip.left &&
                b.top < chip.bottom &&
                b.bottom > chip.top
              );
            })
            .map((p) => p.dataset.id);
        });
        expect(under, id).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('section works without a scroll pin or animations; the city is shown', async ({
      page,
    }) => {
      const requests: string[] = [];
      page.on('request', (r) => requests.push(r.url()));
      await page.goto('/?quality=high');
      await expect(page.locator('section.hero')).toHaveClass(/\bhero--still\b/);
      const section = page.locator('#ecosystem');
      await expect(section).toHaveAttribute('data-enhanced', 'true');
      await showCity(page);
      await page.locator('#eco-tab-landfill').click();
      expect(await visiblePanels(page)).toEqual(['eco-landfill']);
      await expect(openPopup(page)).toBeVisible();
      const m = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>('#ecosystem')!;
        const style = (sel: string) => getComputedStyle(s.querySelector(sel)!);
        return {
          anim: style('#eco-landfill').animationName,
          popupAnim: style('#eco-popup').animationName,
          popupTransition: style('#eco-popup').transitionDuration,
          zoneAnim: style('.eco__zone-sel').animationName,
          pinTransition: style('.eco__pin-label').transitionDuration,
          cityH: s.querySelector<HTMLElement>('.eco__city')!.offsetHeight,
        };
      });
      expect(m.anim).toBe('none');
      expect(m.popupAnim).toBe('none');
      expect(m.popupTransition).toMatch(/^0s(, 0s)*$/);
      expect(m.zoneAnim).toBe('none');
      expect(m.pinTransition).toMatch(/^0s(, 0s)*$/);
      expect(m.cityH).toBeGreaterThan(200);
      expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
    });
  });
});

/* ---------------------------------------------------------------------------------- static city */

const VIEWPORTS = [
  {
    width: 1440,
    height: 900,
    comp: CITY_DESKTOP,
    aspect: 16 / 9,
    image: 'city-desktop-1280.webp',
  },
  {
    width: 1024,
    height: 768,
    comp: CITY_DESKTOP,
    aspect: 16 / 9,
    image: 'city-desktop-1280.webp',
  },
  {
    width: 390,
    height: 844,
    comp: CITY_MOBILE,
    aspect: 1,
    image: 'city-mobile-720.webp',
  },
] as const;

async function newPage(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

/** City box, content box of .eco__inner, pins (anchor point + badge) and the popup, in px. */
const measureCity = (page: Page) =>
  page.evaluate(() => {
    const box = (r: DOMRect) => ({
      l: r.left,
      t: r.top,
      r: r.right,
      b: r.bottom,
      w: r.width,
      h: r.height,
    });
    const inner = document.querySelector<HTMLElement>(
      '#ecosystem .eco__inner',
    )!;
    const cs = getComputedStyle(inner);
    const ir = inner.getBoundingClientRect();
    const pop = document.querySelector<HTMLElement>('#eco-popup');
    return {
      vw: document.documentElement.clientWidth,
      content: {
        l: ir.left + parseFloat(cs.paddingLeft),
        r: ir.right - parseFloat(cs.paddingRight),
      },
      city: box(
        document
          .querySelector('#ecosystem .eco__city')!
          .getBoundingClientRect(),
      ),
      blocks: ['.eco__head', '.eco__view', '.eco__pillars'].map((s) =>
        box(document.querySelector(`#ecosystem ${s}`)!.getBoundingClientRect()),
      ),
      pins: [
        ...document.querySelectorAll<HTMLElement>('#ecosystem .eco__pin'),
      ].map((p) => ({
        id: p.dataset.id!,
        at: box(p.getBoundingClientRect()),
        badge: box(p.querySelector('.eco__pin-badge')!.getBoundingClientRect()),
        dot: box(p.querySelector('.eco__pin-dot')!.getBoundingClientRect()),
        label: box(p.querySelector('.eco__pin-label')!.getBoundingClientRect()),
        hidden: getComputedStyle(p).visibility === 'hidden',
        labelShown:
          getComputedStyle(p.querySelector('.eco__pin-label')!).visibility ===
          'visible',
        selected: p.dataset.state === 'selected',
      })),
      popup: pop
        ? { ...box(pop.getBoundingClientRect()), side: pop.dataset.side }
        : null,
      popups: document.querySelectorAll('.eco__popup').length,
    };
  });
type CityMeasure = Awaited<ReturnType<typeof measureCity>>;
type Box = CityMeasure['city'];
const hit = (a: Box, b: Box) =>
  a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const zoneBox = (
  m: CityMeasure,
  comp: CityComposition,
  id: (typeof IDS)[number],
): Box => {
  const [l, t, r, b] = comp.nodes[id].box;
  const x = (v: number) => m.city.l + (v / 100) * m.city.w;
  const y = (v: number) => m.city.t + (v / 100) * m.city.h;
  return { l: x(l), t: y(t), r: x(r), b: y(b), w: x(r) - x(l), h: y(b) - y(t) };
};

test.describe('Scene 04 static city (M5)', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const vp of VIEWPORTS) {
    test(`${vp.width}×${vp.height}: full content width, equal margins, ${vp.aspect === 1 ? '1:1' : '16:9'}, no layout shift, one image request, exact pins`, async ({
      browser,
    }) => {
      const { page, close } = await newPage(browser, vp.width, vp.height);
      const errors = watch(page);
      const images: string[] = [];
      page.on('request', (r) => {
        if (/\/scene04\//.test(r.url())) images.push(r.url().split('/').pop()!);
      });
      // Hold the city image back until the box has been measured without it.
      let release = () => {};
      const held = new Promise<void>((r) => (release = r));
      await page.route('**/scene04/**', async (route) => {
        await held;
        await route.continue();
      });
      await openPoster(page);
      await page
        .locator('#ecosystem .eco__city')
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect.poll(() => images.length).toBeGreaterThan(0);
      // Before the image loads, the box already has its final size (no layout shift).
      const pre = await page.evaluate(() => {
        const img = document.querySelector<HTMLImageElement>(
          '#ecosystem .eco__city-img',
        )!;
        const r = document
          .querySelector('#ecosystem .eco__city')!
          .getBoundingClientRect();
        return {
          loaded: img.complete && img.naturalWidth > 0,
          w: r.width,
          h: r.height,
        };
      });
      expect(pre.loaded, 'image still held back').toBe(false);
      expect(Math.abs(pre.w / pre.h - vp.aspect)).toBeLessThanOrEqual(0.01);
      release();

      await showCity(page);
      await page.waitForTimeout(300);
      const m = await measureCity(page);
      // No layout shift: same box after the image arrived; the image fills it exactly.
      expect(Math.abs(m.city.h - pre.h)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(m.city.w - pre.w)).toBeLessThanOrEqual(0.5);
      const img = await page.locator('#ecosystem .eco__city-img').boundingBox();
      expect(Math.abs(img!.width - m.city.w)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(img!.height - m.city.h)).toBeLessThanOrEqual(0.5);
      // One content width: the city spans the .eco__inner content box with equal margins, and
      // the heading block, view and capability cards share it.
      expect(Math.abs(m.city.l - m.content.l)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.city.r - m.content.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.city.l - (m.vw - m.city.r))).toBeLessThanOrEqual(1);
      expect(Math.abs(m.city.w / m.city.h - vp.aspect)).toBeLessThanOrEqual(
        0.01,
      );
      for (const b of m.blocks.slice(1)) {
        expect(Math.abs(b.l - m.city.l)).toBeLessThanOrEqual(1);
        expect(Math.abs(b.r - m.city.r)).toBeLessThanOrEqual(1);
      }
      expect(
        Math.abs(m.blocks[0].l + m.blocks[0].w / 2 - (m.city.l + m.city.w / 2)),
      ).toBeLessThanOrEqual(1);
      // Exactly one city image request, the right variant for this width (srcset/sizes).
      await page.waitForTimeout(500);
      expect(images).toEqual([vp.image]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(vp.width);
      // Every pin sits exactly on its anchor (image box × anchor%).
      expect(m.pins.map((p) => p.id).sort()).toEqual([...IDS].sort());
      for (const p of m.pins) {
        const [ax, ay] = vp.comp.nodes[p.id as (typeof IDS)[number]].anchor;
        expect(
          Math.abs(p.at.l + p.at.w / 2 - (m.city.l + (ax / 100) * m.city.w)),
          p.id,
        ).toBeLessThanOrEqual(1.5);
        expect(
          Math.abs(p.at.t + p.at.h / 2 - (m.city.t + (ay / 100) * m.city.h)),
          p.id,
        ).toBeLessThanOrEqual(1.5);
        // Overview: small pins only, all visible and inside the view; no labels.
        expect(p.hidden, p.id).toBe(false);
        expect(p.labelShown, p.id).toBe(false);
        expect(
          p.badge.l >= m.city.l &&
            p.badge.r <= m.city.r &&
            p.badge.t >= m.city.t &&
            p.badge.b <= m.city.b,
          p.id,
        ).toBe(true);
      }
      // No highlight, dim or connection lines in the overview; no canvas.
      await expect(
        page.locator('#ecosystem .eco__zone-sel, #ecosystem .eco__zone-dim'),
      ).toHaveCount(0);
      await expect(
        page.locator(
          '#ecosystem .eco__links, #ecosystem path[stroke-dasharray]',
        ),
      ).toHaveCount(0);
      await expect(page.locator('#ecosystem canvas')).toHaveCount(0);
      await expect(page.locator('#ecosystem .eco__hint')).toBeVisible();
      expect(errors).toEqual([]);
      await close();
    });
  }

  for (const vp of VIEWPORTS.slice(0, 2)) {
    test(`${vp.width}×${vp.height}: one popup beside the selected zone, never over its box or pin; covered pins hidden`, async ({
      browser,
    }) => {
      const { page, close } = await newPage(browser, vp.width, vp.height);
      const errors = watch(page);
      await openPoster(page);
      await showCity(page);
      // Pill hover previews that zone's label (overview, no selection).
      await page.locator('#eco-tab-landfill').hover();
      await expect(
        page.locator('.eco__pin[data-id="landfill"] .eco__pin-label'),
      ).toBeVisible();
      await page.mouse.move(1, vp.height - 1);
      await expect(
        page.locator('.eco__pin[data-id="landfill"] .eco__pin-label'),
      ).toBeHidden();

      let first = true;
      for (const id of IDS) {
        // Never two popups at any frame while switching.
        const most = page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              let max = 0;
              let n = 0;
              const tick = () => {
                max = Math.max(
                  max,
                  document.querySelectorAll('.eco__popup').length,
                );
                if (++n < 20) requestAnimationFrame(tick);
                else resolve(max);
              };
              requestAnimationFrame(tick);
            }),
        );
        await page.locator(`#eco-tab-${id}`).dispatchEvent('click');
        expect(await most, `${id}: one popup`).toBe(1);
        await expect(openPopup(page)).toContainText(
          ECOSYSTEM_NODES.find((n) => n.id === id)!.name,
        );
        await page.waitForTimeout(450); // glide
        // The same element across modules (it glides; never re-created).
        const same = await page.evaluate(() => {
          const el = document.querySelector<HTMLElement>('#eco-popup')!;
          const had = el.dataset.probe === '1';
          el.dataset.probe = '1';
          return had;
        });
        if (!first) expect(same, `${id}: same popup element`).toBe(true);
        first = false;

        const m = await measureCity(page);
        const pop = m.popup!;
        const sel = m.pins.find((p) => p.id === id)!;
        expect(m.popups).toBe(1);
        expect(
          pop.l >= m.city.l &&
            pop.r <= m.city.r &&
            pop.t >= m.city.t &&
            pop.b <= m.city.b,
          `${id}: inside`,
        ).toBe(true);
        expect(
          hit(pop, zoneBox(m, vp.comp, id)),
          `${id}: over its zone box`,
        ).toBe(false);
        expect(hit(pop, sel.badge), `${id}: over its pin`).toBe(false);
        expect(sel.labelShown, `${id}: label shown`).toBe(true);
        expect(hit(pop, sel.label), `${id}: over its label`).toBe(false);
        expect(sel.selected && !sel.hidden).toBe(true);
        // On the side of the zone it says.
        const zone = zoneBox(m, vp.comp, id);
        expect(
          pop.side === 'right' ? pop.l >= zone.r : pop.r <= zone.l,
          `${id}: side`,
        ).toBe(true);
        // A pin (badge, stem and dot) is hidden exactly when the popup covers it.
        for (const p of m.pins.filter((q) => q.id !== id))
          expect(p.hidden, `${id}: pin ${p.id}`).toBe(
            hit(pop, p.badge) || hit(pop, { ...p.dot, t: p.badge.b }),
          );
        // Only the selected label is shown; it stays inside the view.
        expect(m.pins.filter((p) => p.labelShown).map((p) => p.id)).toEqual([
          id,
        ]);
        expect(
          sel.label.l >= m.city.l &&
            sel.label.r <= m.city.r &&
            sel.label.t >= m.city.t &&
            sel.label.b <= m.city.b,
        ).toBe(true);
        // Highlight: one amber footprint, a ≤10% dim; no linked outlines or connection lines.
        await expect(page.locator('#ecosystem .eco__zone-sel')).toHaveCount(1);
        const dim = await page
          .locator('#ecosystem .eco__zone-dim')
          .evaluate((e) => getComputedStyle(e).fill);
        const alpha = Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(dim)?.[1] ?? 1);
        expect(alpha).toBeLessThanOrEqual(0.1);
        await expect(
          page.locator(
            '#ecosystem .eco__links, #ecosystem path[stroke-dasharray]',
          ),
        ).toHaveCount(0);
      }
      expect(errors).toEqual([]);
      await close();
    });
  }

  test('pins select; × / Escape close the popup (selection kept), reselect reopens, overview clears', async ({
    page,
  }) => {
    const errors = watch(page);
    await openPoster(page);
    await showCity(page);
    await expect(page.locator('.eco__overview-btn')).toHaveCount(0);

    // A pin selects its module: pill, panel, highlight and popup in sync.
    await page
      .locator('.eco__pin[data-id="weighbridge"] .eco__pin-badge')
      .click();
    await expect(page.locator('#eco-tab-weighbridge')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await visiblePanels(page)).toEqual(['eco-weighbridge']);
    await expect(
      page.locator('.eco__pin[data-state="selected"]'),
    ).toHaveAttribute('data-id', 'weighbridge');
    await expect(openPopup(page)).toContainText('Weighbridge Management');
    await expect(page.locator('#eco-popup .eco__details-btn')).toHaveAttribute(
      'aria-controls',
      'eco-weighbridge-details',
    );

    // × closes the popup, keeps the selection and its highlight, focus → selected pill.
    await page.locator('#eco-popup .eco__popup-close').click();
    await expect(openPopup(page)).toHaveCount(0);
    await expect(page.locator('#eco-tab-weighbridge')).toBeFocused();
    await expect(page.locator('#eco-tab-weighbridge')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#ecosystem .eco__zone-sel')).toHaveCount(1);
    expect(await visiblePanels(page)).toEqual(['eco-weighbridge']);
    await expect(page.locator('#eco-weighbridge .eco__summary')).toBeVisible();
    // No pin stays hidden once the popup is gone.
    await expect(page.locator('.eco__pin[data-covered="true"]')).toHaveCount(0);

    // Re-selecting reopens it; Escape inside it (or on the pills) closes it.
    await page.locator('#eco-tab-weighbridge').click();
    await expect(openPopup(page)).toBeVisible();
    await page.locator('#eco-popup .eco__details-btn').focus();
    await page.keyboard.press('Escape');
    await expect(openPopup(page)).toHaveCount(0);
    await expect(page.locator('#eco-tab-weighbridge')).toBeFocused();
    await page.locator('#eco-tab-landfill').click();
    await expect(openPopup(page)).toBeVisible();
    await page.locator('#eco-tab-landfill').focus();
    await page.keyboard.press('Escape');
    await expect(openPopup(page)).toHaveCount(0);

    // Return to overview clears the highlight and the popup; focus → selected pill.
    await page.locator('#eco-tab-processing').click();
    await expect(openPopup(page)).toBeVisible();
    const back = page.locator('.eco__overview-btn');
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(openPopup(page)).toHaveCount(0);
    await expect(back).toHaveCount(0);
    await expect(page.locator('#eco-tab-processing')).toBeFocused();
    await expect(
      page.locator('#ecosystem .eco__zone-sel, #ecosystem .eco__zone-dim'),
    ).toHaveCount(0);
    await expect(page.locator('.eco__pin[data-state="selected"]')).toHaveCount(
      0,
    );
    await expect(page.locator('#ecosystem .eco__hint')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('details disclosure: full brochure content below the city, no auto-scroll on selection', async ({
    page,
  }) => {
    const errors = watch(page);
    await openPoster(page);
    await showCity(page);
    await page.locator('#eco-tab-collection').click();
    const btn = detailsBtn(page, 'collection');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#eco-collection-details')).toBeHidden();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(btn).toHaveAttribute(
      'aria-controls',
      'eco-collection-details',
    );
    const details = page.locator('#eco-collection-details');
    await expect(details).toBeVisible();
    // Every brochure capability, the benefit, connections and the source are present.
    const node = ECOSYSTEM_NODES.find((n) => n.id === 'collection')!;
    await expect(details.locator('.eco__card-list li')).toHaveCount(
      node.capabilities.length,
    );
    await expect(details.locator('.eco__card-benefit')).toHaveText(
      node.benefit,
    );
    await expect(details.locator('.eco__link')).toHaveCount(
      node.connects.length,
    );
    await expect(details.locator('.eco__source')).toHaveAttribute(
      'href',
      `${siteConfig.brochurePath}#page=${node.page}`,
    );
    // Below the city, in normal flow, at the content width, no nested scrolling.
    const m = await details.evaluate((el) => {
      const city = document
        .querySelector('#ecosystem .eco__city')!
        .getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const scrolls = [el, ...el.querySelectorAll<HTMLElement>('*')].some(
        (e) =>
          /(auto|scroll)/.test(getComputedStyle(e).overflowY) &&
          e.scrollHeight > e.clientHeight + 1,
      );
      return {
        below: r.top >= city.bottom - 1,
        sameWidth:
          Math.abs(r.left - city.left) <= 1 &&
          Math.abs(r.right - city.right) <= 1,
        scrolls,
      };
    });
    expect(m.below).toBe(true);
    expect(m.sameWidth).toBe(true);
    expect(m.scrolls).toBe(false);
    // Switching modules keeps the details open for the new module, without scrolling the page.
    let last = -1;
    await expect
      .poll(
        async () => {
          const now = await page.evaluate(() => scrollY);
          const same = now === last;
          last = now;
          return same;
        },
        { intervals: [250] },
      )
      .toBe(true);
    const y = last;
    // Dispatched click: Playwright's actionability scroll would otherwise move the page itself.
    await page.locator('#eco-tab-landfill').dispatchEvent('click');
    await expect(page.locator('#eco-landfill-details')).toBeVisible();
    await page.waitForTimeout(400);
    expect(
      Math.abs((await page.evaluate(() => scrollY)) - y),
    ).toBeLessThanOrEqual(1);
    // Close collapses and returns focus to View details.
    await page.locator('#eco-landfill .eco__close-btn').click();
    await expect(page.locator('#eco-landfill-details')).toBeHidden();
    await expect(detailsBtn(page, 'landfill')).toBeFocused();
    await expect(detailsBtn(page, 'landfill')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(errors).toEqual([]);
  });
});

test.describe('Scene 04 on the static poster tier @software', () => {
  test('interface and city work without WebGL', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/, {
      timeout: 30_000,
    });
    await expect(page.locator('#ecosystem')).toHaveAttribute(
      'data-enhanced',
      'true',
    );
    await showCity(page);
    await expect(page.locator('#ecosystem .eco__city-img')).toBeVisible();
    await expect(page.locator('.eco__pin')).toHaveCount(8);
    await expect(page.locator('.eco__overview-btn')).toHaveCount(0);
    await page.locator('#eco-tab-grievance').click();
    expect(await visiblePanels(page)).toEqual(['eco-grievance']);
    await expect(
      page.locator('.eco__pin[data-state="selected"]'),
    ).toHaveAttribute('data-id', 'grievance');
    await expect(page.locator('.eco__overview-btn')).toBeVisible();
    expect(await page.locator('canvas').count()).toBe(0);
    expect(requests.filter((u) => /EcosystemStage/.test(u))).toEqual([]);
    await expect(page.locator('.eco__pillar')).toHaveCount(4);
  });
});
