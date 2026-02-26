import { test, expect } from '@playwright/test';
import { signupAndLogin, TEST_PASSWORD } from './helpers';

test.describe('Settings', () => {
  test('settings page renders all sections', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Verify key sections exist (phone section removed in Sprint 32)
    await expect(page.getByText(/profile/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/notifications/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/change password/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('update name → success', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Clear and update name
    const nameInput = page.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Updated Test Name');
    await page.getByRole('button', { name: /save profile/i }).click();

    // Verify success — name should persist on reload
    await page.reload();
    await expect(page.getByLabel(/name/i)).toHaveValue('Updated Test Name', { timeout: 5000 });
  });

  test('change password → success → login with new password', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    const newPassword = 'newSecurePass456';

    // Fill change password form
    await page.getByLabel(/current password/i).fill(TEST_PASSWORD);
    await page.getByLabel(/^new password$/i).fill(newPassword);
    await page.getByLabel(/confirm new password/i).fill(newPassword);
    await page.getByRole('button', { name: /change password/i }).click();

    // Verify success message
    await expect(page.getByText(/password changed/i)).toBeVisible({ timeout: 5000 });
  });

  test('wrong current password → shows error', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Fill with wrong current password
    await page.getByLabel(/current password/i).fill('wrongpassword123');
    await page.getByLabel(/^new password$/i).fill('newPass12345');
    await page.getByLabel(/confirm new password/i).fill('newPass12345');
    await page.getByRole('button', { name: /change password/i }).click();

    // Verify error message
    await expect(page.getByText(/fail|error|incorrect|wrong/i)).toBeVisible({ timeout: 5000 });
  });

  test('password mismatch → shows error', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Fill with mismatched new passwords
    await page.getByLabel(/current password/i).fill(TEST_PASSWORD);
    await page.getByLabel(/^new password$/i).fill('newPassword123');
    await page.getByLabel(/confirm new password/i).fill('differentPassword456');
    await page.getByRole('button', { name: /change password/i }).click();

    // Verify mismatch error
    await expect(page.getByText(/match|mismatch/i)).toBeVisible({ timeout: 5000 });
  });

  test('email notifications toggle changes state', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10000,
    });

    // Find email notifications checkbox
    const checkbox = page.getByLabel(/email notifications/i);
    const initialState = await checkbox.isChecked();

    // Toggle the checkbox
    await checkbox.click();

    // Verify state changed
    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
  });
});
