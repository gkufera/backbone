import { test, expect } from '@playwright/test';
import { signupAndLogin, setupSeededProduction, loginAs } from './helpers';

const MOBILE = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 720 };

test.describe('Responsive — Mobile (375x667)', () => {
  test.use({ viewport: MOBILE });

  test('home page renders on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/slug max/i).first()).toBeVisible({ timeout: 10000 });
    // No horizontal overflow
    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE.width + 5);
  });

  test('login page renders on mobile', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('productions list renders on mobile', async ({ page }) => {
    await signupAndLogin(page);
    await expect(page.getByRole('heading', { name: 'Productions' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('production dashboard renders on mobile', async ({ page, request }) => {
    const { email, productionId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}`);
    await expect(page.getByRole('heading', { name: /test production/i })).toBeVisible({
      timeout: 10000,
    });

    // Key sections should be visible (may be stacked vertically on mobile)
    await expect(page.getByText(/scripts/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('script viewer renders on mobile', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);

    // Wait for elements to load
    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // At least one element should be visible
    await expect(page.getByText(elements[0].name).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive — Desktop (1280x720)', () => {
  test.use({ viewport: DESKTOP });

  test('home page renders on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/slug max/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('login page renders on desktop', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('productions list renders on desktop', async ({ page }) => {
    await signupAndLogin(page);
    await expect(page.getByRole('heading', { name: 'Productions' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('production dashboard renders on desktop', async ({ page, request }) => {
    const { email, productionId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}`);
    await expect(page.getByRole('heading', { name: /test production/i })).toBeVisible({
      timeout: 10000,
    });

    // All sections visible
    await expect(page.getByText(/scripts/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/departments/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('script viewer renders on desktop', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);

    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // All elements should be visible on desktop
    for (const elem of elements) {
      await expect(page.getByText(elem.name).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
