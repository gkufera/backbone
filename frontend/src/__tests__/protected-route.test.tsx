import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../lib/auth-context';
import { ProtectedRoute } from '../components/protected-route';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the auth API
vi.mock('../lib/api', () => ({
  authApi: {
    signup: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to /login when user is not authenticated', async () => {
    mockedAuthApi.me.mockRejectedValue(new Error('No token'));

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret content</div>
        </ProtectedRoute>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('renders children when user is authenticated', async () => {
    localStorage.setItem('token', 'valid-token');

    mockedAuthApi.me.mockResolvedValue({
      user: {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret content</div>
        </ProtectedRoute>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Secret content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/login');
  });

  it('shows loading state while checking authentication', () => {
    // Don't resolve the me() call to keep loading state
    mockedAuthApi.me.mockReturnValue(new Promise(() => {}));
    localStorage.setItem('token', 'valid-token');

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret content</div>
        </ProtectedRoute>
      </AuthProvider>,
    );

    // Should not show protected content while loading
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
