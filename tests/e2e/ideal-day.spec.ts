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

test('responsive audit covers compact phones through wide desktop', async ({ page }) => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 1000 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}px compose overflow`).toBeLessThanOrEqual(1);
    if (viewport.width <= 780) {
      const targetSizes = await page.locator('nav button').evaluateAll((buttons) => buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }));
      for (const size of targetSizes) {
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(size.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.getByRole('button', { name: 'Build my 24 hours' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}px editor overflow`).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'See the ridiculous scale' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}px scale overflow`).toBeLessThanOrEqual(1);
  }
});

test('core palette meets WCAG AA text and non-text contrast thresholds', async ({ page }) => {
  const audit = await page.evaluate(() => {
    const parseHex = (value: string) => {
      const hex = value.trim().replace('#', '');
      return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
    };
    const luminance = (value: string) => {
      const [red, green, blue] = parseHex(value).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const contrast = (first: string, second: string) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const background = token('--bg');
    const surface = token('--surface');
    return [
      { name: 'primary text', ratio: contrast(token('--text'), background), minimum: 4.5 },
      { name: 'muted text', ratio: contrast(token('--muted'), surface), minimum: 4.5 },
      { name: 'small metadata', ratio: contrast(token('--subtle'), surface), minimum: 4.5 },
      { name: 'accent text', ratio: contrast(token('--acid'), background), minimum: 4.5 },
      { name: 'component boundary', ratio: contrast(token('--line'), surface), minimum: 3 },
    ];
  });

  for (const result of audit) expect(result.ratio, result.name).toBeGreaterThanOrEqual(result.minimum);
});
