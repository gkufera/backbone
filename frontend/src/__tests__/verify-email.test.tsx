import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailPage from '../app/verify-email/page';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('token=test-verify-token'),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  authApi: {
    verifyEmail: vi.fn(),
  },
}));

import { authApi } from '../lib/api';
const mockedAuthApi = vi.mocked(authApi);

describe('Verify email page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success message when verification succeeds', async () => {
    mockedAuthApi.verifyEmail.mockResolvedValue({
      message: 'Email verified successfully',
    });

    render(<VerifyEmailPage />);

    expect(await screen.findByText(/verified/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows error message when verification fails', async () => {
    mockedAuthApi.verifyEmail.mockRejectedValue(new Error('This verification token has expired'));

    render(<VerifyEmailPage />);

    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
  });

  it('shows verifying state initially', () => {
    mockedAuthApi.verifyEmail.mockReturnValue(new Promise(() => {})); // never resolves

    render(<VerifyEmailPage />);

    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
  });
});
