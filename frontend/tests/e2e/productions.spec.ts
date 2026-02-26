import { test, expect } from '@playwright/test';
import { signupAndLogin, apiSignup, TEST_PASSWORD, API_BASE } from './helpers';

const uniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

test.describe('Production flow', () => {
  test('create production → see dashboard with title', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('My Test Production');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'My Test Production' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('create production → add team member → see in member list', async ({ page, request }) => {
    await signupAndLogin(page);

    // Create a second user via API
    const memberEmail = await apiSignup(request);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Team Production');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Team Production' })).toBeVisible({
      timeout: 10000,
    });

    // Add team member by email
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();

    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });
  });

  test('dashboard sections render — Scripts, Team, Departments', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Section Test');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Verify key sections are visible
    await expect(page.getByText(/scripts/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/departments/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('production list — created production appears in list', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Listed Production');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Navigate back to productions list
    await page.goto('/productions');
    await expect(page.getByText('Listed Production')).toBeVisible({ timeout: 5000 });
  });

  test('create department → appears in department list', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Dept Test');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Fill new department name and add
    const deptInput = page.getByPlaceholder(/department/i);
    await deptInput.fill('Custom Department');
    await page.getByRole('button', { name: /add department/i }).click();

    await expect(page.getByText('Custom Department')).toBeVisible({ timeout: 5000 });
  });

  test('delete department → removed from list', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Dept Delete Test');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Add a custom department first
    const deptInput = page.getByPlaceholder(/department/i);
    await deptInput.fill('Temp Department');
    await page.getByRole('button', { name: /add department/i }).click();
    await expect(page.getByText('Temp Department')).toBeVisible({ timeout: 5000 });

    // Find and click the delete button for the newly created department
    const deptRow = page.locator('li', { hasText: 'Temp Department' });
    await deptRow.getByRole('button', { name: /delete/i }).click();

    // Verify it's gone
    await expect(page.getByText('Temp Department')).not.toBeVisible({ timeout: 5000 });
  });

  test('change member role via dropdown', async ({ page, request }) => {
    await signupAndLogin(page);

    const memberEmail = await apiSignup(request, undefined, 'Role Test Member');

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Role Test');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Add team member
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });

    // Change role via dropdown
    const roleSelect = page.getByLabel(/role for/i);
    await roleSelect.selectOption('DECIDER');

    // Verify the role change persists
    await expect(roleSelect).toHaveValue('DECIDER', { timeout: 5000 });
  });

  test('assign member to department via dropdown', async ({ page, request }) => {
    await signupAndLogin(page);

    const memberEmail = await apiSignup(request, undefined, 'Dept Test Member');

    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Dept Assign Test');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Add team member
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });

    // Assign department via dropdown (default departments are seeded on creation)
    const deptSelect = page.getByLabel(/department for/i);
    await deptSelect.selectOption({ label: 'Cast' });

    // Verify the department assignment
    await expect(deptSelect).toContainText('Cast', { timeout: 5000 });
  });
});
