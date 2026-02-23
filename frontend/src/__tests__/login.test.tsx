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
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

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

  it('renders a link to the signup page', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
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
});
