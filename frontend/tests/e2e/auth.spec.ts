import { test, expect } from '@playwright/test';
import { signupAndLogin, TEST_PASSWORD, TEST_NAME, API_BASE } from './helpers';

const uniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

test.describe('Auth flow', () => {
  test('signup with valid credentials → redirected to verify-email-sent', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/signup');
    await page.getByLabel(/name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up/i }).click();

    await expect(page).toHaveURL(/verify-email-sent/, { timeout: 10000 });
    await expect(page.getByText('Check Your Email', { exact: true })).toBeVisible({
      timeout: 5000,
    });
  });

  test('login with existing credentials → see productions page', async ({ page }) => {
    const email = uniqueEmail();

    // First signup
    await page.goto('/signup');
    await page.getByLabel(/name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/verify-email-sent/, { timeout: 10000 });

    // Now login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/productions$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Productions' })).toBeVisible({ timeout: 5000 });
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('logout → token cleared and log out button disappears', async ({ page }) => {
    await signupAndLogin(page);

    // Should be on /productions after login
    await expect(page).toHaveURL(/\/productions$/);

    // Log out button should be visible while authenticated
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: /log out/i }).click();

    // Wait for logout to complete — user should be redirected or log out button disappears
    await expect(page.getByRole('button', { name: /log out/i })).not.toBeVisible({ timeout: 5000 });

    // Verify token is cleared from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('forgot password form → shows success message', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByRole('button', { name: /reset|send/i }).click();

    // Should show success message (even if email doesn't exist — security best practice)
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 });
  });

  test('reset password page renders with token', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token-123');

    // Should show password form fields
    await expect(page.getByLabel(/new password/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('verify-email with invalid token → shows error', async ({ page }) => {
    await page.goto('/verify-email?token=invalid-token');

    // Should show error message about invalid/expired token
    await expect(page.getByText(/invalid|expired|error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('signup validation — missing fields shows error', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit with empty fields
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation error (browser validation or app-level)
    // Check that we're still on the signup page (form wasn't submitted)
    await expect(page).toHaveURL(/\/signup/);
  });
});
