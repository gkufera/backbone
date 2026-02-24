import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the ApiError class and that request() throws it
// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Reset modules to get fresh import
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('ApiError', () => {
  it('is thrown with status and code on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Please verify your email', code: 'EMAIL_NOT_VERIFIED' }),
    });

    const { authApi, ApiError } = await import('../lib/api');

    try {
      await authApi.login({ email: 'test@example.com', password: 'password123' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiError = err as InstanceType<typeof ApiError>;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe('EMAIL_NOT_VERIFIED');
      expect(apiError.message).toBe('Please verify your email');
    }
  });

  it('has default message when body has no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { authApi, ApiError } = await import('../lib/api');

    try {
      await authApi.login({ email: 'test@example.com', password: 'password123' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiError = err as InstanceType<typeof ApiError>;
      expect(apiError.status).toBe(500);
      expect(apiError.message).toMatch(/500/);
    }
  });
});
