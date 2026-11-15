import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { dashboardLabels, softwareContent, TOURS } from '../content/software';

/**
 * M6 "IWMS in Action": the guided tour of the recreated IWMS analytics dashboards.
 * SSR/no-JS content, sanitisation (no operational values or identities), autoplay once,
 * pausing (hover, off-screen, user control), controls, reduced motion and the phone focus view.
 * The light poster hero tier keeps these tests fast; the section is identical on every tier.
 */

const amp = (s: string) => s.replace(/&/g, '&amp;').replace(/’/g, '’');

/** Real identities visible in the reference recording; none may appear on the website. */
const REAL_NAMES = [
  'MANJERI',
  'KASARGODE',
  'THAMARASSERY',
  'PERUMBAVOOR',
  'KOMBARA',
  'Andaman',
  'MALAPPURAM',
  'ERNAKULAM',
  'PERUVAYAL',
  'ALAPPUZHA',
  'UNNIKULAM',
  'KONDOTTY',
  'OMASSERY',
  'KIZHAKOTH',
  'VERRA',
  'PLANET PROTECTORS',
];

async function open(page: Page) {
  await page.goto('/?quality=poster');
  await expect(page.locator('#software')).toHaveAttribute(
    'data-enhanced',
    'true',
  );
}
const current = (page: Page) =>
  page.$eval('.sw-now__title', (e) => e.textContent ?? '');
const nextBtn = (page: Page) =>
  page.getByRole('button', { name: softwareContent.next, exact: true });
const backBtn = (page: Page) =>
  page.getByRole('button', { name: softwareContent.back, exact: true });
/** Step with Back/Next until the current step of `tour` is index `i`. */
async function goToStep(page: Page, tour: number, i: number) {
  const titles = TOURS[tour].steps.map((s) => s.title);
  for (let n = 0; n < titles.length * 2; n++) {
    const at = titles.indexOf(await current(page));
    if (at === i) break;
    await (at > i ? backBtn(page) : nextBtn(page)).click();
  }
  expect(await current(page)).toBe(titles[i]);
}
const activeTab = (page: Page) =>
  page.$eval('.sw-app .iw-tab[data-active="true"]', (e) => e.textContent ?? '');
async function showTour(page: Page) {
  await page
    .locator('.sw-stage')
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

test.describe('IWMS in Action (M6 dashboard tour)', () => {
  test('prerendered page: #software follows #ecosystem with the tours, steps, dashboard and disclosure', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'dist/index.html'),
      'utf8',
    );
    const eco = html.indexOf('id="ecosystem"');
    const sw = html.indexOf('id="software"');
    expect(eco).toBeGreaterThan(-1);
    expect(sw).toBeGreaterThan(eco);
    const section = html.slice(sw);
    expect(section).toContain(amp(softwareContent.title));
    expect(section).toContain(amp(softwareContent.disclosure));
    expect(section).toContain(dashboardLabels.inwardTitle);
    for (const t of dashboardLabels.tabs) expect(section).toContain(t.label);
    for (const tour of TOURS) {
      expect(section, tour.id).toContain(amp(tour.label));
      for (const s of tour.steps) expect(section, s.id).toContain(amp(s.title));
    }
  });

  test('sanitised: no real identities anywhere, no digits in the dashboard data', async ({
    page,
  }) => {
    await open(page);
    const html = await page.content();
    for (const name of REAL_NAMES)
      expect(html.toUpperCase(), name).not.toContain(name.toUpperCase());
    // Walk both dashboards: every value is masked (pager numbers are UI, not data).
    for (const tour of [0, 1]) {
      await page.locator('.sw-tourbtn').nth(tour).click();
      // Stop autoplay, then walk to the tour's last step with Next.
      if (
        (await page
          .locator('.sw-ctl--primary')
          .getAttribute('aria-pressed')) === 'true'
      )
        await page.locator('.sw-ctl--primary').click();
      await goToStep(page, tour, TOURS[tour].steps.length - 1);
      await page.waitForTimeout(900);
      const text = await page.$eval('.sw-app', (el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.iw-pager').forEach((p) => p.remove());
        return clone.textContent ?? '';
      });
      expect(text, `tour ${tour}`).not.toMatch(/\d/);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the dashboard still and every tour step are readable', async ({
      page,
    }) => {
      await page.goto('/');
      const section = page.locator('#software');
      await expect(section).toHaveAttribute('data-enhanced', 'false');
      await expect(section.locator('.sw-app .iw')).toBeVisible();
      await expect(section.locator('.sw-static')).toHaveCount(TOURS.length);
      for (const t of TOURS)
        for (const s of t.steps)
          await expect(section.getByText(s.caption)).toBeVisible();
      await expect(section.locator('button')).toHaveCount(0);
    });
  });

  test('autoplays once when half on screen; pauses on hover and off-screen', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await open(page);
    // Not playing before it is seen.
    await page.waitForTimeout(1200);
    expect(await current(page)).toBe(TOURS[0].steps[0].title);
    await page.mouse.move(5, 5);
    await showTour(page);
    // Step 1 clicks the Inward tab: the cursor appears and the tab switches.
    await expect(page.locator('.sw-cursor')).toHaveCount(1);
    await expect.poll(() => activeTab(page)).toBe('Inward Dashboard');
    await expect
      .poll(() => current(page), { timeout: 6000 })
      .toBe(TOURS[0].steps[1].title);
    await expect(page.locator('.sw-ctl--primary')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Hover pauses.
    await page.locator('.sw-stage').hover();
    const held = await current(page);
    await page.waitForTimeout(4200);
    expect(await current(page)).toBe(held);
    // Leaving resumes; off-screen pauses again.
    await page.mouse.move(5, 5);
    await expect.poll(() => current(page), { timeout: 6000 }).not.toBe(held);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const away = await current(page);
    await page.waitForTimeout(4200);
    expect(await current(page)).toBe(away);
    expect(errors).toEqual([]);
  });

  test('controls: tour selection, pause, back/next, replay; overlays track targets', async ({
    page,
  }) => {
    await open(page);
    await page.mouse.move(5, 5);
    await showTour(page);
    // Choose the Sorting tour: it starts on Inward and clicks over to Sorting.
    await page.locator('.sw-tourbtn').nth(1).click();
    await expect(page.locator('.sw-tourbtn').nth(1)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => activeTab(page)).toBe('Sorting Dashboard');
    // Pause stops progression.
    await page.locator('.sw-ctl--primary').click();
    await expect(page.locator('.sw-ctl--primary')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const paused = await current(page);
    await page.waitForTimeout(3600);
    expect(await current(page)).toBe(paused);
    // Next / Back (the dock's "now" line names the current step).
    await goToStep(page, 1, 1);
    await nextBtn(page).click();
    expect(await current(page)).toBe(TOURS[1].steps[2].title);
    await page.waitForTimeout(1000);
    // The ring surrounds the step's target, the summary row is hovered.
    const fit = await page.evaluate(() => {
      const ring = document.querySelector('.sw-ring')!.getBoundingClientRect();
      const t = document
        .querySelector('[data-tour="sorting-summary"]')!
        .getBoundingClientRect();
      return Math.max(
        Math.abs(ring.left + 4 - t.left),
        Math.abs(ring.top + 4 - t.top),
        Math.abs(ring.width - 8 - t.width),
        Math.abs(ring.height - 8 - t.height),
      );
    });
    expect(fit).toBeLessThanOrEqual(2);
    await expect(page.locator('[data-tour="summary-row"]')).toHaveAttribute(
      'data-hover',
      'true',
    );
    await backBtn(page).click();
    expect(await current(page)).toBe(TOURS[1].steps[1].title);
    // Replay restarts the full tour from the beginning and plays.
    await page.getByRole('button', { name: softwareContent.replay }).click();
    await expect(page.locator('.sw-tourbtn').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await current(page)).toBe(TOURS[0].steps[0].title);
    await expect(page.locator('.sw-ctl--primary')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Keyboard: Tab reaches the controls, with a visible focus ring.
    await page.locator('.sw-tourbtn').first().focus();
    const activeCls = () =>
      page.evaluate(() => document.activeElement?.className ?? '');
    for (let i = 0; i < 6 && !(await activeCls()).includes('sw-ctl'); i++)
      await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({
      cls: document.activeElement?.className ?? '',
      outline: getComputedStyle(document.activeElement!).outlineStyle,
    }));
    expect(focused.cls).toContain('sw-ctl');
    expect(focused.outline).not.toBe('none');
  });

  test('layout: full-width dashboard, dock below it, no side panel or browser bar', async ({
    page,
  }) => {
    await open(page);
    await page.mouse.move(5, 5);
    for (const vp of [
      { width: 1440, height: 900, fit: true },
      { width: 1024, height: 768, fit: false },
      { width: 1525, height: 662, fit: true },
    ]) {
      const tag = `${vp.width}x${vp.height}`;
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await expect(
        page.locator('.sw-panel, .sw-steps, .sw-browser__bar'),
      ).toHaveCount(0);
      await page
        .locator('.sw-tour')
        .evaluate((el) =>
          el.scrollIntoView({ block: 'start', behavior: 'instant' }),
        );
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const inner = document.querySelector('.sw__inner') as HTMLElement;
        const cs = getComputedStyle(inner);
        const content =
          inner.clientWidth -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight);
        const frame = document
          .querySelector('.sw-frame')!
          .getBoundingClientRect();
        const dock = document
          .querySelector('.sw-dock:not(.sw-dock--static)')!
          .getBoundingClientRect();
        const header = parseFloat(
          getComputedStyle(
            document.getElementById('software')!,
          ).getPropertyValue('--sw-header'),
        );
        return {
          content,
          frameW: frame.width,
          // The dashboard itself fills the frame: the width never shrinks to honour the height cap.
          appW: document.querySelector('.sw-app')!.getBoundingClientRect()
            .width,
          frameTop: frame.top,
          frameBottom: frame.bottom,
          dockTop: dock.top,
          dockBottom: dock.bottom,
          header,
          docW: document.documentElement.scrollWidth,
          vw: document.documentElement.clientWidth,
          vh: innerHeight,
        };
      });
      expect(m.frameW, tag).toBeGreaterThanOrEqual(m.content * 0.97);
      expect(m.appW, tag).toBeGreaterThanOrEqual(m.frameW - 2);
      expect(m.dockTop, tag).toBeGreaterThanOrEqual(m.frameBottom - 1);
      expect(m.docW, tag).toBeLessThanOrEqual(m.vw);
      if (vp.fit) {
        expect(m.frameTop, tag).toBeGreaterThanOrEqual(
          (Number.isFinite(m.header) ? m.header : 0) - 1,
        );
        expect(m.dockBottom, tag).toBeLessThanOrEqual(m.vh);
      }
    }
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('no autoplay, no cursor, no play controls; steps switch instantly', async ({
      page,
    }) => {
      await open(page);
      await showTour(page);
      await page.waitForTimeout(2500);
      expect(await current(page)).toBe(TOURS[0].steps[0].title);
      await expect(page.locator('.sw-cursor')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: softwareContent.play }),
      ).toHaveCount(0);
      await page.locator('.sw-tourbtn').nth(1).click();
      await nextBtn(page).click();
      expect(await current(page)).toBe(TOURS[1].steps[1].title);
      expect(await activeTab(page)).toBe('Sorting Dashboard');
      const anim = await page.$eval(
        '.iw-cellbar',
        (e) => getComputedStyle(e).animationName,
      );
      expect(anim).toBe('none');
    });
  });

  test.describe('portrait phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('one readable panel per step, no cursor, no horizontal overflow', async ({
      page,
    }) => {
      await open(page);
      await page.mouse.move(5, 5);
      await showTour(page);
      await expect(page.locator('.sw-app .iw--focus')).toHaveCount(1);
      await expect(page.locator('.sw-cursor')).toHaveCount(0);
      await page.locator('.sw-tourbtn').nth(1).click();
      await page.locator('.sw-ctl--primary').click();
      for (const [i, target] of [
        [1, 'kpis'],
        [2, 'sorting-summary'],
      ] as const) {
        await goToStep(page, 1, i);
        await expect(
          page.locator(`.iw-focus [data-tour="${target}"]`),
        ).toBeVisible();
      }
      const m = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        vw: innerWidth,
        font: parseFloat(
          getComputedStyle(document.querySelector('.iw-focus td')!).fontSize,
        ),
      }));
      expect(m.docW).toBe(m.vw);
      expect(m.font).toBeGreaterThanOrEqual(12);
    });
  });
});
