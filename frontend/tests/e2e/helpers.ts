import type { Page, APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

export const API_BASE = 'http://localhost:8000';
export const TEST_PASSWORD = 'securepassword123';
export const TEST_NAME = 'E2E Test User';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

/**
 * Sign up a new user and log in via the browser UI.
 * Returns the email used for the account.
 */
export async function signupAndLogin(page: Page): Promise<string> {
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
  await expect(page).toHaveURL(/\/productions$/, { timeout: 10000 });

  return email;
}

/**
 * Sign up a user directly via API (no browser navigation).
 * Returns the email used.
 */
export async function apiSignup(
  request: APIRequestContext,
  email?: string,
  name?: string,
): Promise<string> {
  const userEmail = email ?? uniqueEmail();
  const userName = name ?? TEST_NAME;

  await request.post(`${API_BASE}/api/auth/signup`, {
    data: { name: userName, email: userEmail, password: TEST_PASSWORD },
  });

  return userEmail;
}

/**
 * Login via API and return the JWT token.
 */
export async function getAuthToken(
  request: APIRequestContext,
  email: string,
  password?: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password: password ?? TEST_PASSWORD },
  });
  const body = await res.json();
  return body.token;
}

/**
 * Create a fully-seeded production via the test seeder endpoint.
 * Returns production ID, script ID, elements, and departments.
 */
export async function seedProduction(request: APIRequestContext, token: string) {
  const res = await request.post(`${API_BASE}/api/test/seed-production`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `seedProduction failed (${res.status()}): ${body.error ?? 'unknown error'}${body.details ? ` — ${body.details}` : ''}`,
    );
  }
  return res.json() as Promise<{
    productionId: string;
    scriptId: string;
    elements: { id: string; name: string; type: string; optionId: string }[];
    departments: { id: string; name: string }[];
  }>;
}

/**
 * Sign up, login via API, and seed a production.
 * Returns token, email, and seeded data.
 */
export async function setupSeededProduction(request: APIRequestContext) {
  const email = await apiSignup(request);
  const token = await getAuthToken(request, email);
  const seed = await seedProduction(request, token);
  return { email, token, ...seed };
}

/**
 * Login via browser UI with an existing account.
 */
export async function loginAs(page: Page, email: string, password?: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password ?? TEST_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/productions$/, { timeout: 10000 });
}

/**
 * Set the auth token in localStorage (for direct navigation after API login).
 */
export async function setToken(page: Page, token: string): Promise<void> {
  await page.goto('/login');
  await page.evaluate((t) => localStorage.setItem('token', t), token);
}

/**
 * Activate a PENDING production (test-only endpoint).
 * Must be called after creating a production via the API or UI form.
 */
export async function activateProduction(
  request: APIRequestContext,
  token: string,
  productionId: string,
): Promise<void> {
  const res = await request.post(`${API_BASE}/api/test/activate-production/${productionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`activateProduction failed (${res.status()})`);
  }
}

/**
 * Create a production via API and activate it (for E2E tests that need an ACTIVE production).
 * Returns the production ID.
 */
export async function createActiveProduction(
  request: APIRequestContext,
  token: string,
  title: string,
): Promise<string> {
  const prodRes = await request.post(`${API_BASE}/api/productions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      studioName: 'Test Studio',
      contactName: 'Test User',
      contactEmail: 'test@example.com',
    },
  });
  const prodBody = await prodRes.json();
  const productionId = prodBody.production.id;
  await activateProduction(request, token, productionId);
  return productionId;
}
