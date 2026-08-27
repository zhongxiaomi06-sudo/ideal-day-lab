import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata.app !== 'space', 'Scroll to Space contract');
  await page.addInitScript(() => {
    Object.defineProperty(window, '__locationCalls', { value: 0, writable: true });
    if (navigator.geolocation) {
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = (...args) => {
        (window as typeof window & { __locationCalls: number }).__locationCalls += 1;
        return original(...args);
      };
    }
  });
  await page.goto('/');
});

test('TEST-SPACE-001 selects a city and starts without location access', async ({ page }) => {
  await page.getByRole('button', { name: /Washington, D.C./ }).click();
  await expect(page.getByRole('button', { name: 'Begin ascent' })).toBeEnabled();
  expect(await page.evaluate(() => (window as typeof window & { __locationCalls: number }).__locationCalls)).toBe(0);
});

test('TEST-SPACE-003/004 exposes ordered chapters and complete scale evidence', async ({ page }) => {
  await page.getByRole('button', { name: 'Begin ascent' }).click();
  await page.getByRole('navigation', { name: 'Journey chapters' }).getByRole('button', { name: 'Go to S4: Edge country' }).click();
  await page.getByRole('button', { name: /Scale notes/ }).click();
  await expect(page.getByRole('dialog', { name: /Real height/ })).toContainText('heightM');
  await expect(page.getByRole('dialog', { name: /Real height/ })).toContainText('logarithmic');
  await expect(page.getByRole('dialog', { name: /Real height/ }).locator('a')).toContainText(/NASA|Source|Skyscraper/);
});

test('TEST-SPACE-007 static route preserves the current stage', async ({ page }) => {
  await page.getByRole('button', { name: 'Begin ascent' }).click();
  await page.getByRole('navigation', { name: 'Journey chapters' }).getByRole('button', { name: 'Go to S3: Stratosphere' }).click();
  await expect(page.getByText('S3', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Use still chapters' }).click();
  await expect(page.getByText('S3', { exact: true }).first()).toBeVisible();
});

test('TEST-SPACE-008 completes the five-stage route and offers Eazo share', async ({ page }) => {
  await page.getByRole('button', { name: 'Begin ascent' }).click();
  for (const stage of ['Go to S1: Street level', 'Go to S2: Flight level', 'Go to S3: Stratosphere', 'Go to S4: Edge country', 'Go to S5: Orbital quiet']) {
    await page.getByRole('navigation', { name: 'Journey chapters' }).getByRole('button', { name: stage }).click();
  }
  await expect(page.getByRole('dialog', { name: /408 km/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Share through Eazo/ })).toBeEnabled();
});

test('mobile layout has no horizontal overflow or clipped primary action', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Begin ascent' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
