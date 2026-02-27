const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/** Convert Date fields to string for JSON API responses */
export type JsonSerialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const method = (init.method ?? 'GET').toUpperCase();
    if (retries > 0 && err instanceof TypeError && method === 'GET') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetchWithRetry(url, init, retries - 1);
    }
    throw err;
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithRetry(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? `Request failed with status ${res.status}`,
      res.status,
      body.code,
    );
  }

  return res.json() as Promise<T>;
}
