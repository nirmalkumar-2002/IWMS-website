import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { SOFTWARE_DEMOS, softwareContent } from '../content/software';

/**
 * M6.2 "IWMS in Action": static software demonstrations after Scene 04. SSR/no-JS markup, the
 * one interaction (WAI-ARIA tabs switching the demonstration), region/marker integrity, the
 * no-fictional-data rule, responsive overflow, header clearance and reduced motion.
 * The light poster hero tier keeps these tests fast; the section is identical on every tier.
 */

const amp = (s: string) => s.replace(/&/g, '&amp;');

async function open(page: Page) {
  await page.goto('/?quality=poster');
  await expect(page.locator('#software')).toHaveAttribute(
    'data-enhanced',
    'true',
  );
}

test.describe('IWMS in Action (M6.2)', () => {
  test('prerendered page: #software follows #ecosystem with every demonstration and the disclosure', () => {
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
    for (const d of SOFTWARE_DEMOS) {
      expect(section, d.id).toContain(amp(d.title));
      expect(section, d.id).toContain(`id="software-${d.id}"`);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('all four demonstrations and every stage caption are shown, selectors are links', async ({
      page,
    }) => {
      await page.goto('/');
      const section = page.locator('#software');
      await expect(section).toHaveAttribute('data-enhanced', 'false');
      await expect(section.locator('[role="tablist"]')).toHaveCount(0);
      await expect(section.locator('.sw-sels--static a')).toHaveCount(4);
      for (const d of SOFTWARE_DEMOS) {
        const demo = section.locator(`#software-${d.id}`);
        await expect(demo).toBeVisible();
        await expect(
          section.locator(`.sw-sels--static a[href="#software-${d.id}"]`),
        ).toHaveCount(1);
        for (const s of d.stages)
          await expect(demo.locator('.sw-step__caption')).toContainText([
            s.caption,
          ]);
      }
    });
  });

  test('tabs switch the one visible demonstration; regions, markers and no fictional data', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await open(page);
    const section = page.locator('#software');
    await expect(section.locator('.sw__badge')).toBeVisible();
    await expect(section.locator('.sw__badge')).toHaveText(
      softwareContent.disclosure,
    );
    const tabs = section.locator('[role="tablist"] [role="tab"]');
    await expect(tabs).toHaveCount(4);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(section.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

    const visible = () =>
      section
        .locator('.sw-demo')
        .evaluateAll((els) =>
          els
            .filter((e) => (e as HTMLElement).offsetParent !== null)
            .map((e) => e.id),
        );
    await tabs.first().focus();
    for (let i = 0; i < SOFTWARE_DEMOS.length; i++) {
      const d = SOFTWARE_DEMOS[i];
      await expect(tabs.nth(i)).toBeFocused();
      await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      expect(await visible()).toEqual([`software-${d.id}`]);
      const demo = section.locator(`#software-${d.id}`);
      await expect(demo).toHaveAttribute('role', 'tabpanel');
      const frame = demo.locator('figure.sw-frame');
      await expect(frame).toHaveAttribute(
        'aria-label',
        new RegExp(`^Illustrative IWMS ${d.title}`),
      );
      // Every region referenced by the callouts exists in the composition.
      for (const s of d.stages)
        for (const co of s.callouts)
          await expect(
            frame.locator(`[data-region="${co.region}"]`),
            `${d.id}:${co.region}`,
          ).toHaveCount(1);
      // Active stage (step 1): one numbered marker per callout, on its region.
      const callouts = d.stages[0].callouts;
      await expect(frame.locator('.sw-marker')).toHaveCount(callouts.length);
      for (const [n, co] of callouts.entries())
        await expect(
          frame.locator(`[data-region="${co.region}"] > .sw-marker`),
        ).toHaveText(String(n + 1));
      await expect(demo.locator('.sw-callout')).toHaveCount(callouts.length);
      await expect(demo.locator('.sw-ctl[aria-disabled="true"]')).toHaveCount(
        2,
      );
      // No numbers in the screen except the marker badges and level ordinals.
      const text = await frame.evaluate((el) => {
        const c = el.cloneNode(true) as HTMLElement;
        c.querySelectorAll('.sw-marker, .sw-ord').forEach((n) => n.remove());
        return c.textContent ?? '';
      });
      // The official module name ("D2D …") is the only verified text with a digit.
      expect(text.split(d.title).join(''), d.id).not.toMatch(/\d/);
      await page.keyboard.press('ArrowRight');
    }
    // Wraps around; End / Home.
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    expect(await visible()).toEqual(['software-landfill']);
    await page.keyboard.press('Home');
    expect(await visible()).toEqual(['software-fleet']);
    expect(errors).toEqual([]);
  });

  test('phone 390×844: no horizontal overflow, heading clear of the fixed header', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    for (const d of SOFTWARE_DEMOS) {
      await page.locator(`#software-tab-${d.id}`).click();
      const m = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        vw: innerWidth,
      }));
      expect(m.doc, d.id).toBe(m.vw);
    }
    const r = await page.evaluate(async () => {
      const s = document.querySelector('#software')!;
      window.scrollTo({
        top: s.getBoundingClientRect().top + window.scrollY,
        behavior: 'instant',
      });
      await new Promise((f) => requestAnimationFrame(() => f(null)));
      await new Promise((f) => requestAnimationFrame(() => f(null)));
      const top = s.getBoundingClientRect().top;
      return {
        top,
        header: document.querySelector('.site-header')!.getBoundingClientRect()
          .bottom,
        title: document
          .querySelector('#software-title')!
          .getBoundingClientRect().top,
      };
    });
    expect(Math.abs(r.top)).toBeLessThanOrEqual(2);
    expect(r.title).toBeGreaterThanOrEqual(r.header);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('no transitions in the section', async ({ page }) => {
      await open(page);
      const durations = await page
        .locator('#software .sw-sel, #software .sw-source')
        .evaluateAll((els) =>
          els.map((e) => getComputedStyle(e).transitionDuration),
        );
      expect(durations.length).toBeGreaterThan(0);
      for (const d of durations)
        expect(d.split(',').every((x) => parseFloat(x) === 0)).toBe(true);
    });
  });
});
