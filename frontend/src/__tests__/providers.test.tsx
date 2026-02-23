import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Providers } from '../app/providers';
import { useAuth } from '../lib/auth-context';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the auth API
vi.mock('../lib/api', () => ({
  authApi: {
    signup: vi.fn(),
    login: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('No token')),
  },
}));

function AuthConsumer() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
    </div>
  );
}

describe('Providers component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides AuthContext to children', async () => {
    render(
      <Providers>
        <AuthConsumer />
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });
});
