import { test, expect } from '@playwright/test';
import {
  signupAndLogin,
  apiSignup,
  getAuthToken,
  loginAs,
  createActiveProduction,
  API_BASE,
} from './helpers';

test.describe('Production flow', () => {
  test('new production form → shows success message', async ({ page }) => {
    await signupAndLogin(page);

    await page.goto('/productions/new');
    await page.getByLabel(/production title/i).fill('My Test Production');
    await page.getByLabel(/studio name/i).fill('Test Studio');
    // contactName and contactEmail may be pre-filled from auth context,
    // but fill them explicitly to avoid race conditions
    const contactNameInput = page.getByLabel(/your name/i);
    if (await contactNameInput.inputValue() === '') {
      await contactNameInput.fill('E2E Test User');
    }
    const contactEmailInput = page.getByLabel(/contact email/i);
    if (await contactEmailInput.inputValue() === '') {
      await contactEmailInput.fill('test@example.com');
    }
    await page.getByRole('button', { name: /create production/i }).click();

    // After submission, shows success message (no redirect — production is PENDING)
    await expect(page.getByText('Request Submitted')).toBeVisible({ timeout: 10000 });
  });

  test('active production dashboard shows title', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'My Test Production');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    await expect(page.getByRole('heading', { name: 'My Test Production' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('add team member → see in member list', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Team Production');

    // Create a second user to invite
    const memberEmail = await apiSignup(request);

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);
    await expect(page.getByRole('heading', { name: 'Team Production' })).toBeVisible({
      timeout: 10000,
    });

    // Add team member by email
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();

    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });
  });

  test('dashboard sections render — Scripts, Team, Departments', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Section Test');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    // Verify key sections are visible
    await expect(page.getByText(/scripts/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/departments/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('production list — created production appears in list', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    await createActiveProduction(request, token, 'Listed Production');

    await loginAs(page, email);
    await page.goto('/productions');
    await expect(page.getByText('Listed Production')).toBeVisible({ timeout: 5000 });
  });

  test('create department → appears in department list', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Dept Test');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    // Fill new department name and add
    const deptInput = page.getByPlaceholder(/department/i);
    await deptInput.fill('Custom Department');
    await page.getByRole('button', { name: /add department/i }).click();

    // Scope to the Departments section to avoid matching member row <option> elements
    const deptSection = page.locator('section', { hasText: 'Departments' }).first();
    await expect(deptSection.locator('li', { hasText: 'Custom Department' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('delete department → removed from list', async ({ page, request }) => {
    const email = await apiSignup(request);
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Dept Delete Test');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    // Add a custom department first
    const deptInput = page.getByPlaceholder(/department/i);
    await deptInput.fill('Temp Department');
    await page.getByRole('button', { name: /add department/i }).click();

    // Scope to the Departments section
    const deptSection = page.locator('section', { hasText: 'Departments' }).first();
    const deptRow = deptSection.locator('li', { hasText: 'Temp Department' });
    await expect(deptRow).toBeVisible({ timeout: 5000 });

    // Register dialog handler BEFORE triggering the action
    page.on('dialog', (dialog) => dialog.accept());

    // Find and click the delete button for the newly created department
    await deptRow.getByRole('button', { name: /delete/i }).click();

    // Verify it's gone
    await expect(deptRow).not.toBeVisible({ timeout: 5000 });
  });

  test('change member role via dropdown', async ({ page, request }) => {
    const email = await apiSignup(request, undefined, 'Admin User');
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Role Test');

    const memberEmail = await apiSignup(request, undefined, 'Role Test Member');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    // Add team member
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });

    // Change role via dropdown (target the member's row, not the admin's)
    const roleSelect = page.getByLabel('Role for Role Test Member');
    await roleSelect.selectOption('DECIDER');

    // Verify the role change persists
    await expect(roleSelect).toHaveValue('DECIDER', { timeout: 5000 });
  });

  test('assign member to department via dropdown', async ({ page, request }) => {
    const email = await apiSignup(request, undefined, 'Admin User');
    const token = await getAuthToken(request, email);
    const productionId = await createActiveProduction(request, token, 'Dept Assign Test');

    const memberEmail = await apiSignup(request, undefined, 'Dept Test Member');

    await loginAs(page, email);
    await page.goto(`/productions/${productionId}`);

    // Add team member
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill(memberEmail);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 5000 });

    // Assign department via dropdown (default departments are seeded on creation)
    const deptSelect = page.getByLabel('Department for Dept Test Member');
    await deptSelect.selectOption({ label: 'Cast' });

    // Verify the department assignment
    await expect(deptSelect).toContainText('Cast', { timeout: 5000 });
  });
});
