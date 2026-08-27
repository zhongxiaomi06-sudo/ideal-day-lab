import { expect, test } from '@playwright/test';

test('mobile first viewport exposes one clear task and no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main button').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('keyboard reaches the primary task', async ({ page, browserName }) => {
  await page.goto('/');
  const skipLink = page.locator('.skip-link');
  if (browserName === 'chromium') {
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
  } else {
    await skipLink.focus();
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});
