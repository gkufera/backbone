import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../app/login/page';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the auth context
const mockLogin = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

// Mock the API (for ApiError and resend) - use vi.hoisted to avoid variable reference issues
const { mockResendVerification } = vi.hoisted(() => ({
  mockResendVerification: vi.fn(),
}));
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api');
  return {
    ...actual,
    authApi: {
      resendVerification: mockResendVerification,
    },
  };
});

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('uses flex-1 instead of min-h-screen for proper layout', () => {
    const { container } = render(<LoginPage />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex-1');
    expect(wrapper).not.toHaveClass('min-h-screen');
  });

  it('renders a link to the signup page', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('has a forgot password link', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('calls auth context login and redirects to /productions on submit', async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'securepassword123');
    expect(mockPush).toHaveBeenCalledWith('/productions');
  });

  it('displays an error message when login fails', async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValue(new Error('Invalid email or password'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });

  it('shows verification message with resend option on 403 EMAIL_NOT_VERIFIED', async () => {
    const user = userEvent.setup();

    // Import ApiError from the actual module
    const { ApiError } = await import('../lib/api');
    mockLogin.mockRejectedValue(
      new ApiError('Please verify your email', 403, 'EMAIL_NOT_VERIFIED'),
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('shows success message when resend verification succeeds (emailSent: true)', async () => {
    const user = userEvent.setup();

    const { ApiError } = await import('../lib/api');
    mockLogin.mockRejectedValue(
      new ApiError('Please verify your email', 403, 'EMAIL_NOT_VERIFIED'),
    );

    mockResendVerification.mockResolvedValue({ message: 'ok', emailSent: true });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const resendBtn = await screen.findByRole('button', { name: /resend/i });
    await user.click(resendBtn);

    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });

  it('shows warning message when resend email fails (emailSent: false)', async () => {
    const user = userEvent.setup();

    const { ApiError } = await import('../lib/api');
    mockLogin.mockRejectedValue(
      new ApiError('Please verify your email', 403, 'EMAIL_NOT_VERIFIED'),
    );

    mockResendVerification.mockResolvedValue({ message: 'ok', emailSent: false });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const resendBtn = await screen.findByRole('button', { name: /resend/i });
    await user.click(resendBtn);

    expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
  });
});
