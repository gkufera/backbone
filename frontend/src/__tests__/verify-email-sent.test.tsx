import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailSentPage from '../app/verify-email-sent/page';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('email=test@example.com'),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  authApi: {
    resendVerification: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('Verify email sent page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows instructions to check email', () => {
    render(<VerifyEmailSentPage />);

    expect(screen.getByText(/verification link/i)).toBeInTheDocument();
  });

  it('shows success message when resend succeeds (emailSent: true)', async () => {
    const user = userEvent.setup();

    mockedAuthApi.resendVerification.mockResolvedValue({
      message: 'If that email exists, check your email for a verification link',
      emailSent: true,
    });

    render(<VerifyEmailSentPage />);

    const resendBtn = screen.getByRole('button', { name: /resend/i });
    await user.click(resendBtn);

    expect(mockedAuthApi.resendVerification).toHaveBeenCalledWith('test@example.com');
    expect(await screen.findByText(/Verification email sent/i)).toBeInTheDocument();
  });

  it('shows warning message when email send fails (emailSent: false)', async () => {
    const user = userEvent.setup();

    mockedAuthApi.resendVerification.mockResolvedValue({
      message: 'If that email exists, check your email for a verification link',
      emailSent: false,
    });

    render(<VerifyEmailSentPage />);

    const resendBtn = screen.getByRole('button', { name: /resend/i });
    await user.click(resendBtn);

    expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
  });

  it('has a link to login', () => {
    render(<VerifyEmailSentPage />);

    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });
});
