import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { siteConfig } from '../content/config';
import { ECOSYSTEM_NODES } from '../content/ecosystem';

/**
 * Scene 04 M2: the IWMS ecosystem interface after the hero (HTML/CSS only, no 3D yet).
 * Covers SSR/no-JS markup, the tab/keyboard model, content integrity, actions, no extra canvas,
 * responsive layout, reduced motion, the static poster tier, and hero ↔ section navigation.
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
  page.$$eval('.eco__panel', (els) => els.filter((e) => !(e as HTMLElement).hidden).map((e) => e.id));

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
      await expect(section.locator('.eco__panel')).toHaveCount(8);
      for (const id of ECOSYSTEM_NODES.map((n) => n.id))
        await expect(section.locator(`#eco-${id}`)).toBeVisible();
      await expect(section.locator('.eco__rail--static a')).toHaveCount(8);
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
    await expect(page.locator('#eco-iccc .eco__panel-tag')).toContainText('Integration');
    await expect(page.locator('#eco-iccc .eco__panel-note')).toBeVisible();
    await page.locator('#eco-tab-weighbridge').click();
    await expect(page.locator('#eco-weighbridge .eco__panel-note')).toHaveCount(0);
    await expect(page.locator('#eco-weighbridge .eco__panel-tag')).toContainText('Module 04');

    // "Connected to" selects the target and moves focus to its tab.
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

    // Performance: no extra canvas; still exactly one WebGL canvas (the hero's).
    expect(await page.locator('canvas').count()).toBe(1);
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
    // Deep into the section (past the hero's half-viewport resume margin).
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

  test('desktop layout: provisional ~200vh section with a pinned stage', async ({ page }) => {
    await openCinematic(page);
    const m = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('#ecosystem')!;
      const stage = s.querySelector<HTMLElement>('.eco__stage')!;
      return { ratio: s.offsetHeight / innerHeight, pos: getComputedStyle(stage).position };
    });
    expect(Math.abs(m.ratio - 2)).toBeLessThanOrEqual(0.01);
    expect(m.pos).toBe('sticky');
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
          stage: getComputedStyle(document.querySelector('#ecosystem .eco__stage')!).position,
        };
      });
      expect(m.docW).toBe(m.vw);
      expect(m.railScrolls).toBe(true);
      expect(m.minChip).toBeGreaterThanOrEqual(44);
      expect(m.minAction).toBeGreaterThanOrEqual(44);
      expect(m.stage).toBe('static');
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
          stage: getComputedStyle(s.querySelector('.eco__stage')!).position,
          anim: getComputedStyle(s.querySelector('#eco-landfill')!).animationName,
          ratio: s.offsetHeight / innerHeight,
        };
      });
      expect(m.stage).toBe('static');
      expect(m.anim).toBe('none');
      expect(m.ratio).toBeLessThan(2);
    });
  });
});

test.describe('Scene 04 on the static poster tier @software', () => {
  test('interface works without WebGL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section.hero')).toHaveClass(/\bhero--static\b/, { timeout: 30_000 });
    await expect(page.locator('#ecosystem')).toHaveAttribute('data-enhanced', 'true');
    await page.locator('#eco-tab-grievance').click();
    expect(await visiblePanels(page)).toEqual(['eco-grievance']);
    expect(await page.locator('canvas').count()).toBe(0);
  });
});
