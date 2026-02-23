import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignupPage from '../app/signup/page';

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

describe('Signup page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with name, email, and password fields', () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    render(<SignupPage />);

    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  it('calls signup API with form data on submit', async () => {
    const user = userEvent.setup();

    mockedAuthApi.signup.mockResolvedValue({
      token: 'test-token',
      user: {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
      },
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(mockedAuthApi.signup).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword123',
    });
  });

  it('displays an error message when signup fails', async () => {
    const user = userEvent.setup();

    mockedAuthApi.signup.mockRejectedValue(new Error('A user with this email already exists'));

    render(<SignupPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
