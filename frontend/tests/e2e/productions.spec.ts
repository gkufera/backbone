import { test, expect } from '@playwright/test';

const uniqueEmail = () => `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'securepassword123';
const TEST_NAME = 'E2E Test User';

async function signupAndLogin(page: import('@playwright/test').Page) {
  const email = uniqueEmail();

  // Signup (auto-verified in test mode)
  await page.goto('/signup');
  await page.getByLabel(/name/i).fill(TEST_NAME);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(page).toHaveURL(/verify-email-sent/, { timeout: 10000 });

  // Login
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for login redirect to /productions to complete
  await expect(page).toHaveURL(/\/productions$/, { timeout: 10000 });

  return email;
}

test.describe('Production flow', () => {
  test('create production → see dashboard with title', async ({ page }) => {
    await signupAndLogin(page);

    // Navigate to create production
    await page.goto('/productions/new');

    // Fill in production details
    await page.getByLabel(/title/i).fill('My Test Production');
    await page.getByRole('button', { name: /create/i }).click();

    // Should redirect to production dashboard and show the title
    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'My Test Production' })).toBeVisible({ timeout: 10000 });
  });

  test('create production → add team member → see in member list', async ({ page }) => {
    // Create first user (production owner)
    await signupAndLogin(page);

    // Create a second user to add as team member via API
    const memberEmail = uniqueEmail();
    await page.evaluate(
      async ({ email, password, name, baseUrl }) => {
        await fetch(`${baseUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
      },
      {
        email: memberEmail,
        password: TEST_PASSWORD,
        name: 'Team Member',
        baseUrl: 'http://localhost:8000',
      },
    );

    // Navigate to create production
    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Team Production');
    await page.getByRole('button', { name: /create/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Team Production' })).toBeVisible({ timeout: 10000 });

    // Add team member by email
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();

    // Should see the new member in the list
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });
  });
});
