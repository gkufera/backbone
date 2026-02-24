import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockLocalStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key];
  },
});

import { ApiError } from '../lib/api';

describe('API retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries once on network TypeError, succeeds on second call', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      });

    const { productionsApi } = await import('../lib/api');
    const result = await productionsApi.list();

    expect(result).toEqual({ data: 'success' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on ApiError (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    });

    const { productionsApi } = await import('../lib/api');

    let caught: unknown;
    try {
      await productionsApi.list();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry POST requests on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { authApi } = await import('../lib/api');

    let caught: unknown;
    try {
      await authApi.login({ email: 'a@b.com', password: 'pw' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(TypeError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws after retry exhausted', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { productionsApi } = await import('../lib/api');

    let caught: unknown;
    try {
      await productionsApi.list();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(TypeError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
