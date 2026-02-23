import { test, expect } from '@playwright/test';

test('home page loads and shows Slug Max', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /slug max/i })).toBeVisible();
});
