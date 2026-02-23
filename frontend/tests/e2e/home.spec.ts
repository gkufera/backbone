import { test, expect } from '@playwright/test';

test('home page loads and shows Backbone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /backbone/i })).toBeVisible();
});
