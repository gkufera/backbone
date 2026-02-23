import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API_BASE_URL configuration', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    vi.resetModules();
  });

  it('defaults to http://localhost:8000 when NEXT_PUBLIC_API_BASE_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const mod = await import('../api');

    const fetchCalls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      fetchCalls.push(typeof input === 'string' ? input : input.toString());
      return new Response(
        JSON.stringify({
          token: 'test',
          user: { id: '1', name: 'Test', email: 'test@test.com', createdAt: new Date().toISOString() },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      await mod.authApi.signup({ name: 'Test', email: 'test@test.com', password: 'password' });
      expect(fetchCalls[0]).toBe('http://localhost:8000/api/auth/signup');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses NEXT_PUBLIC_API_BASE_URL when set', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.slugmax.com';
    const mod = await import('../api');

    const fetchCalls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
      fetchCalls.push(typeof input === 'string' ? input : input.toString());
      return new Response(
        JSON.stringify({
          token: 'test',
          user: { id: '1', name: 'Test', email: 'test@test.com', createdAt: new Date().toISOString() },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      await mod.authApi.signup({ name: 'Test', email: 'test@test.com', password: 'password' });
      expect(fetchCalls[0]).toBe('https://api.slugmax.com/api/auth/signup');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
