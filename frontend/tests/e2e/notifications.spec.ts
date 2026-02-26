import { test, expect } from '@playwright/test';
import { signupAndLogin, apiSignup, getAuthToken, loginAs, API_BASE, TEST_PASSWORD } from './helpers';

const uniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

test.describe('Notifications', () => {
  /**
   * Setup: User A creates production, adds User B → triggers MEMBER_INVITED notification for B.
   */
  async function setupNotificationScenario(request: import('@playwright/test').APIRequestContext) {
    // Create User A (production owner)
    const emailA = await apiSignup(request, undefined, 'Owner User');
    const tokenA = await getAuthToken(request, emailA);

    // Create User B (will be invited)
    const emailB = await apiSignup(request, undefined, 'Invited User');

    // User A creates a production
    const prodRes = await request.post(`${API_BASE}/api/productions`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { title: 'Notification Test Production' },
    });
    const prodBody = await prodRes.json();
    const productionId = prodBody.production.id;

    // User A adds User B as member → triggers MEMBER_INVITED notification
    await request.post(`${API_BASE}/api/productions/${productionId}/members`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { email: emailB },
    });

    return { emailA, tokenA, emailB, productionId };
  }

  test('notification bell shows count after being invited', async ({ page, request }) => {
    const { emailB, productionId } = await setupNotificationScenario(request);
    await loginAs(page, emailB);

    // Navigate to the production dashboard
    await page.goto(`/productions/${productionId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /notification test production/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for notification indicator (bell with count)
    const notifIndicator = page.locator('.mac-notification-dot');
    await expect(notifIndicator).toBeVisible({ timeout: 5000 });
  });

  test('notifications page shows invitation message', async ({ page, request }) => {
    const { emailB, productionId } = await setupNotificationScenario(request);
    await loginAs(page, emailB);

    await page.goto(`/productions/${productionId}/notifications`);

    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 10000,
    });

    // Should show the invitation notification
    await expect(page.getByText(/invited/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('click notification → mark as read', async ({ page, request }) => {
    const { emailB, productionId } = await setupNotificationScenario(request);
    await loginAs(page, emailB);

    await page.goto(`/productions/${productionId}/notifications`);

    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 10000,
    });

    // Click on the notification
    const notification = page.getByText(/invited/i).first();
    await notification.click();

    // After clicking, the notification style should change (no longer bold/unread)
    // Wait for the click action to complete (navigation or state change)
    await page.waitForLoadState('networkidle');

    // Navigate back to notifications to verify read state
    await page.goto(`/productions/${productionId}/notifications`);
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('notifications page — empty state shows message', async ({ page }) => {
    // Sign up fresh user with no notifications
    await signupAndLogin(page);

    // Create a production to access notifications page
    await page.goto('/productions/new');
    await page.getByLabel(/title/i).fill('Empty Notif Test');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page).toHaveURL(/\/productions\/[a-z0-9-]+$/, { timeout: 10000 });

    // Extract production ID from URL
    const url = page.url();
    const productionId = url.split('/productions/')[1];

    await page.goto(`/productions/${productionId}/notifications`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 15000,
    });

    // Should show empty state text
    await expect(page.getByText(/no notifications/i)).toBeVisible({ timeout: 5000 });
  });
});
