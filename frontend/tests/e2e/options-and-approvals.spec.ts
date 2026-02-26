import { test, expect } from '@playwright/test';
import { setupSeededProduction, loginAs, apiSignup, getAuthToken, API_BASE } from './helpers';

test.describe('Options', () => {
  test('option gallery shows seeded LINK option with URL', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    expect(elements[0].name).toBe('John');
    const element = elements[0]; // John — has a LINK option
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Verify LINK option badge is visible
    await expect(page.getByText('LINK').first()).toBeVisible({ timeout: 5000 });

    // Verify the option URL is shown
    await expect(
      page.getByText(`https://example.com/${element.name.toLowerCase()}`).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('create link option → appears in gallery', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    expect(elements[2].name).toBe('Office');
    const element = elements[2]; // Office — LOCATION
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click Add Option
    await page.getByRole('button', { name: /add option/i }).click();

    // Select Link mode
    await page.getByRole('button', { name: /link/i }).click();

    // Fill URL
    await page.getByPlaceholder(/enter url/i).fill('https://example.com/office-reference');

    // Fill description
    await page.getByPlaceholder(/description/i).fill('Office reference photo link');

    // Submit
    await page.getByRole('button', { name: /add option/i }).last().click();

    // Verify new option appears
    await expect(page.getByText('https://example.com/office-reference').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('mark option ready → badge updates', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    // Use element[2] (Office) which has readyForReview=false
    expect(elements[2].name).toBe('Office');
    const element = elements[2];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click "Mark Ready"
    await page.getByRole('button', { name: /mark ready/i }).click();

    // Verify "Ready" badge appears
    await expect(page.getByText('READY').first()).toBeVisible({ timeout: 5000 });
  });

  test('unmark option ready → badge reverts', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    // Use element[0] (John) which has readyForReview=true
    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click "Unmark Ready" (aria-label is "Mark not ready")
    await page.getByRole('button', { name: /mark not ready/i }).click();

    // After unmarking, "Mark Ready" button should reappear
    await expect(page.getByRole('button', { name: /^mark ready$/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test('option upload form — file mode renders', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click Add Option
    await page.getByRole('button', { name: /add option/i }).click();

    // File mode should be default — verify drag zone text
    await expect(page.getByText(/drop file|click to browse/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Approvals', () => {
  test('approve option (Y) → approval indicator visible', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    // Use element[0] (John) which has readyForReview=true
    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click Y (approve) button
    await page.getByRole('button', { name: 'Y', exact: true }).click();

    // Verify approval indicator appears (APPROVED badge in approval history)
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 5000 });
  });

  test('reject option (N) → rejection indicator visible', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click N (reject) button
    await page.getByRole('button', { name: 'N', exact: true }).click();

    // Verify rejection indicator
    await expect(page.getByText('REJECTED').first()).toBeVisible({ timeout: 5000 });
  });

  test('maybe option (M) → maybe indicator visible', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click M (maybe) button
    await page.getByRole('button', { name: 'M', exact: true }).click();

    // Verify maybe indicator
    await expect(page.getByText('MAYBE').first()).toBeVisible({ timeout: 5000 });
  });

  test('approval with note → note text visible', async ({ page, request }) => {
    const { email, productionId, scriptId, elements } = await setupSeededProduction(request);
    await loginAs(page, email);

    const element = elements[0];
    await page.goto(
      `/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`,
    );

    await expect(page.getByRole('heading', { name: element.name })).toBeVisible({
      timeout: 10000,
    });

    // Click "+ Note" to open note textarea
    await page.getByRole('button', { name: /\+ note/i }).click();

    // Fill note textarea
    await page.getByPlaceholder(/add a note/i).fill('Great reference for this character');

    // Click Y (approve) with the note
    await page.getByRole('button', { name: 'Y', exact: true }).click();

    // Verify both approval and note are visible
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Great reference for this character').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('review feed shows elements with ready options', async ({ page, request }) => {
    const { email, productionId } = await setupSeededProduction(request);
    await loginAs(page, email);

    await page.goto(`/productions/${productionId}/feed`);

    await expect(page.getByRole('heading', { name: /review feed/i })).toBeVisible({
      timeout: 10000,
    });

    // Seeded data has 2 elements with readyForReview=true (John and Sarah)
    // Feed should show elements that have ready options
    await expect(page.getByText('John')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Sarah')).toBeVisible({ timeout: 5000 });
  });
});
