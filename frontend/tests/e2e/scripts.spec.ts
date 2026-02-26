import { test, expect } from '@playwright/test';
import { signupAndLogin, setupSeededProduction, loginAs } from './helpers';

test.describe('Script workflow', () => {
  test('upload page renders with file input and title field', async ({ page, request }) => {
    const { email, productionId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/upload`);

    await expect(page.getByRole('heading', { name: /upload script/i })).toBeVisible({
      timeout: 10000,
    });
    // File input for PDF
    await expect(page.getByLabel(/pdf file/i)).toBeVisible();
    // Title field
    await expect(page.getByLabel(/title/i)).toBeVisible();
    // Upload button
    await expect(page.getByRole('button', { name: /upload script/i })).toBeVisible();
  });

  test('script viewer shows seeded elements', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);

    // Wait for script viewer to load
    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // Verify seeded element names are visible
    for (const elem of elements) {
      await expect(page.getByText(elem.name).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('version history page shows version 1', async ({ page, request }) => {
    const { email, productionId, scriptId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}/versions`);

    await expect(page.getByRole('heading', { name: /version history/i })).toBeVisible({
      timeout: 10000,
    });
    // At least version 1 should be listed
    await expect(page.getByText(/v1/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('revision upload page renders', async ({ page, request }) => {
    const { email, productionId, scriptId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}/revisions/upload`);

    await expect(page.getByRole('heading', { name: /upload new draft/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByLabel(/pdf file/i)).toBeVisible();
  });

  test('element list shows all 5 elements with correct types', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);

    // Wait for elements section
    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // Verify all elements are listed
    for (const elem of elements) {
      await expect(page.getByText(elem.name).first()).toBeVisible({ timeout: 5000 });
    }

    // Verify type badges are present (CHARACTER, LOCATION, OTHER)
    await expect(page.getByText('CHARACTER').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('LOCATION').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('OTHER').first()).toBeVisible({ timeout: 5000 });
  });
});
