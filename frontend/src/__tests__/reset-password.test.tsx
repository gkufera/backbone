import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordPage from '../app/reset-password/page';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('token=test-token-123'),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('Reset password page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password fields', () => {
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows success message after valid reset', async () => {
    const user = userEvent.setup();

    mockedAuthApi.resetPassword.mockResolvedValue({
      message: 'Password has been reset successfully',
    });

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/reset successfully/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows error on API failure', async () => {
    const user = userEvent.setup();

    mockedAuthApi.resetPassword.mockRejectedValue(new Error('This reset token has expired'));

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/i);
  });
});
