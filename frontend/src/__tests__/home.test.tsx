import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../app/page';
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
    me: vi.fn().mockRejectedValue(new Error('No token')),
  },
}));

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Slug Max heading', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );
    expect(screen.getByRole('heading', { name: /slug max/i })).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );
    expect(screen.getByText(/production collaboration platform/i)).toBeInTheDocument();
  });
});
