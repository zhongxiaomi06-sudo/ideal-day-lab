import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata.app !== 'life', 'Life Elsewhere only');
  await page.goto('/');
});

test('production path discloses synthetic content and creates a pair', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Right now, elsewhere feels normal.' })).toBeVisible();
  await expect(page.getByText('Every person is synthetic.')).toBeVisible();
  await expect(page.getByText('No real identity. No live tracking. No location collected.')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Look across the world ↗' }).click();
  await expect(page.getByText('SYNTHETIC SCENE')).toBeVisible();
  await expect(page.getByText('national estimate · not a personal prediction')).toBeVisible();
  await page.getByRole('button', { name: '＋ Save for a pair' }).click();
  await expect(page.getByRole('status')).toContainText('Saved on this device.');
  await page.getByRole('button', { name: 'Pair 1' }).click();
  await expect(page.getByRole('heading', { name: 'Difference without a scoreboard.' })).toBeVisible();
  await expect(page.getByText(/Comparable context|No ranking shown/)).toBeVisible();
});

test('method ledger exposes complete source and Eazo runtime information', async ({ page }) => {
  await page.getByRole('button', { name: 'Method' }).click();
  await expect(page.getByRole('heading', { name: 'How the atlas is made.' })).toBeVisible();
  await expect(page.getByText('48 / 48 reviewed')).toBeVisible();
  await expect(page.getByText('d791b6dcfdb7cccf98f1be1326acc015554ca974a3f16d86fb3a87ec947e8cb4')).toBeVisible();
  await expect(page.getByText('Web fallback active')).toBeVisible();
  await expect(page.getByRole('link', { name: 'World Bank ↗' })).toHaveCount(4);
});

test('offline state keeps the local experience usable', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Look across the world ↗' }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline ready')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Look across the world ↗' })).toBeEnabled();
  await context.setOffline(false);
});
