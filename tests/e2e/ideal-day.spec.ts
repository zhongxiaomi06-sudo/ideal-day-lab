import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('day-') && !['pixel', 'iphone'].includes(testInfo.project.name), 'Ideal Day app only');
  await page.goto('/');
});

test('TEST-DAY-001 input and primary action are immediately interactive', async ({ page }) => {
  await expect(page.getByLabel('What belongs in your ideal day?')).toBeEditable();
  await expect(page.getByRole('button', { name: 'Build my 24 hours' })).toBeEnabled();
});

test('TEST-DAY-002/004/005 user builds, edits, saves and discovers a day', async ({ page }) => {
  await page.getByLabel('What belongs in your ideal day?').fill('Sleep deeply, write, walk, cook, talk with friends');
  await page.getByRole('button', { name: 'Build my 24 hours' }).click();
  await expect(page.getByText('24h conserved ✓')).toBeVisible();
  const before = await page.getByText(/\d{2}:\d{2}–\d{2}:\d{2}/).first().textContent();
  await page.getByRole('button', { name: /Lengthen .* by 5 minutes/ }).first().click();
  await expect(page.getByText('24h conserved ✓')).toBeVisible();
  expect(await page.getByText(/\d{2}:\d{2}–\d{2}:\d{2}/).first().textContent()).not.toBe(before);
  await page.getByRole('button', { name: 'Save day' }).click();
  await page.getByRole('button', { name: 'See the ridiculous scale' }).click();
  await expect(page.getByText(/fit into one year of this day/).first()).toBeVisible();
});

test('TEST-DAY-006 library supports a reversible delete', async ({ page }) => {
  await page.getByRole('button', { name: 'Build my 24 hours' }).click();
  await page.getByRole('button', { name: 'Save day' }).click();
  await page.getByRole('button', { name: /Library/ }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: 'Restore last deleted' })).toBeVisible();
});

test('mobile viewport has no horizontal overflow across primary screens', async ({ page }) => {
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await noOverflow();
  await page.getByRole('button', { name: 'Build my 24 hours' }).click();
  await noOverflow();
  await page.getByRole('button', { name: 'See the ridiculous scale' }).click();
  await noOverflow();
});

test('mobile visual system keeps imagery, navigation and touch targets intact at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  const reel = page.locator('.day-reel img');
  await expect(reel).toBeVisible();
  expect(await reel.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveCSS('position', 'fixed');
  const primaryAction = page.getByRole('button', { name: 'Build my 24 hours' });
  await expect(primaryAction).toBeVisible();
  const [actionBox, navigationBox] = await Promise.all([primaryAction.boundingBox(), navigation.boundingBox()]);
  expect(actionBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navigationBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
