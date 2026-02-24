import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForgotPasswordPage from '../app/forgot-password/page';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('Forgot password page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with email field', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows success message after submit', async () => {
    const user = userEvent.setup();

    mockedAuthApi.forgotPassword.mockResolvedValue({
      message: 'If that email exists, check your email for a reset link',
    });

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('has a link back to login', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });
});
