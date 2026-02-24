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

  it('renders Slug Max logo', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );
    expect(screen.getByAltText('Slug Max')).toBeInTheDocument();
  });

  it('renders marketing copy', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );
    expect(screen.getByText(/for film & tv creatives/i)).toBeInTheDocument();
    expect(screen.getByText(/production's hub for creative decisions/i)).toBeInTheDocument();
    expect(screen.getByText(/stop searching email threads, start shooting/i)).toBeInTheDocument();
  });

  it('shows login and signup links when not authenticated', async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );
    const loginLink = await screen.findByRole('link', { name: /log in/i });
    const signupLink = await screen.findByRole('link', { name: /sign up/i });
    expect(loginLink).toHaveAttribute('href', '/login');
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});
