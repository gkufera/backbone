import { test, expect } from '@playwright/test';
import { setupSeededProduction, loginAs } from './helpers';

test.describe('Element management', () => {
  test('element detail page shows name, type badge, and options section', async ({
    page,
    request,
  }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0]; // John - CHARACTER
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    // Verify element name as heading
    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Verify type badge
    await expect(page.getByText(element.type).first()).toBeVisible({ timeout: 5000 });

    // Verify Options section exists
    await expect(page.getByText(/options/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('assign department to element via dropdown', async ({ page, request }) => {
    const { email, productionId, scriptId, elements, departments } =
      await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0]; // John - CHARACTER
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Use Department dropdown
    const deptSelect = page.getByLabel('Department');
    await deptSelect.selectOption(departments[0].id);

    // Verify selection sticks (re-read the select value)
    await expect(deptSelect).toHaveValue(departments[0].id, { timeout: 5000 });
  });

  test('create element via quick-add form on script viewer', async ({ page, request }) => {
    const { email, productionId, scriptId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);

    // Wait for page to load
    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // Click "Add Element" to show the form
    await page.getByRole('button', { name: /add element/i }).click();

    // Fill in new element name and select type
    await page.getByPlaceholder(/element name/i).fill('New Test Element');
    // The type dropdown - select "Other"
    await page.getByRole('combobox').selectOption('OTHER');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Verify new element appears in the list
    await expect(page.getByText('New Test Element').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigate between elements — correct data loads', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    // Go to first element
    const elem1 = elements[0]; // John
    const elem2 = elements[2]; // Office
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${elem1.id}`,
    );
    await expect(page.getByRole('heading', { name: elem1.name })).toBeVisible({
      timeout: 10000,
    });

    // Go back to script viewer
    await page.goto(`/productions/${productionId}/scripts/${scriptId}`);
    await expect(page.getByText(/elements/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate to second element
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${elem2.id}`,
    );
    await expect(page.getByRole('heading', { name: elem2.name })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(elem2.type).first()).toBeVisible({ timeout: 5000 });
  });

  test('element detail shows Add Option button', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Verify Add Option button exists
    await expect(page.getByRole('button', { name: /add option/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
