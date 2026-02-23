import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserNav } from '../components/user-nav';
import { AuthProvider } from '../lib/auth-context';

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
    me: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('UserNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows logout button when authenticated', async () => {
    localStorage.setItem('token', 'valid-token');
    mockedAuthApi.me.mockResolvedValue({
      user: {
        id: 'test-id',
        name: 'Jane Director',
        email: 'jane@example.com',
        createdAt: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <UserNav />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Director')).toBeInTheDocument();
  });

  it('hides logout button when not authenticated', async () => {
    mockedAuthApi.me.mockRejectedValue(new Error('No token'));

    render(
      <AuthProvider>
        <UserNav />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });
  });

  it('clears token and user state when logout clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'valid-token');
    mockedAuthApi.me.mockResolvedValue({
      user: {
        id: 'test-id',
        name: 'Jane Director',
        email: 'jane@example.com',
        createdAt: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <UserNav />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});
