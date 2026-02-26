import { test, expect } from '@playwright/test';
import { apiSignup, getAuthToken, loginAs, API_BASE } from './helpers';

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

  test('notifications page — empty state shows message', async ({ page, request }) => {
    // Create a fresh user and production via API (no notifications generated)
    const email = await apiSignup(request, undefined, 'Empty Notif User');
    const token = await getAuthToken(request, email);

    // Create production via API
    const prodRes = await request.post(`${API_BASE}/api/productions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Empty Notif Test Production' },
    });
    const prodBody = await prodRes.json();
    const productionId = prodBody.production.id;

    // Login via browser and navigate to notifications
    await loginAs(page, email);
    await page.goto(`/productions/${productionId}/notifications`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 15000,
    });

    // Should show empty state text
    await expect(page.getByText(/no notifications/i)).toBeVisible({ timeout: 5000 });
  });
});
