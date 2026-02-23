import { test, expect } from '@playwright/test';

const uniqueEmail = () => `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'securepassword123';
const TEST_NAME = 'E2E Test User';

test.describe('Auth flow', () => {
  test('signup with valid credentials → redirected to home → see logout button', async ({
    page,
  }) => {
    const email = uniqueEmail();

    await page.goto('/signup');
    await page.getByLabel(/name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should redirect to home and show logout
    await expect(page.getByRole('heading', { name: /slug max/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_NAME)).toBeVisible();
  });

  test('login with existing credentials → see home page', async ({ page }) => {
    const email = uniqueEmail();

    // First signup to create the account
    await page.goto('/signup');
    await page.getByLabel(/name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /slug max/i })).toBeVisible({ timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page.getByRole('button', { name: /log out/i })).not.toBeVisible();

    // Now login with the same credentials
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByRole('heading', { name: /slug max/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible({ timeout: 5000 });
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 5000 });
  });
});
