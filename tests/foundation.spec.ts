import { test, expect } from '@playwright/test';

test('marketing home hydrates without errors and fits 360px', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'From doorstep pickup to landfill. One accountable platform.',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const open = page.getByRole('button', { name: 'Open navigation' });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close navigation' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(open).toBeFocused();
  expect(errors).toEqual([]);
});

test('prerendered home and module copy remain visible without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 800 },
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page
      .locator('noscript')
      .getByRole('link', { name: 'Modules', exact: true }),
  ).toBeVisible();
  await page.goto('/modules/weighbridge-management/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Weighbridge Management',
  );
  await expect(page).toHaveTitle('Weighbridge Management | IWMS');
  await context.close();
});

test('reduced motion does not request the animation runtime', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).count();
  await page.waitForTimeout(1800);
  expect(requests.filter((url) => /runtime-.*\.js/.test(url))).toEqual([]);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});

test('isolated preview and direct module routes work after refresh', async ({
  page,
  request,
}) => {
  await page.goto('/dev/journey/');
  await expect(page.locator('main section')).toHaveCount(1);
  await expect(page.locator('#how-it-works')).toBeVisible();
  await page.reload();
  await expect(page.locator('#how-it-works')).toBeVisible();
  for (const slug of [
    'collection-verification',
    'd2d-logistics',
    'resource-management',
    'weighbridge-management',
    'waste-management',
    'landfill-management',
    'grievance-redressal',
  ]) {
    const response = await request.get(`/modules/${slug}/`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(`<section id="${slug}"`);
  }
  const brochure = await request.get('/brand/iwms-brochure.pdf');
  expect(brochure.headers()['content-type']).toContain('pdf');
});
