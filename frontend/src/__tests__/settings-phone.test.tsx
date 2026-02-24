import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../app/settings/page';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const { mockUpdateUser, mockUpdateMe, mockSendPhoneCode, mockVerifyPhone, mockToastShow } =
  vi.hoisted(() => ({
    mockUpdateUser: vi.fn(),
    mockUpdateMe: vi.fn(),
    mockSendPhoneCode: vi.fn(),
    mockVerifyPhone: vi.fn(),
    mockToastShow: vi.fn(),
  }));

vi.mock('../lib/toast-context', () => ({
  useToast: () => ({ show: mockToastShow, toasts: [], dismiss: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUser = vi.hoisted(() => ({
  current: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    emailNotificationsEnabled: true,
    phone: null as string | null,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
  },
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: mockUser.current,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateUser: mockUpdateUser,
  }),
}));

vi.mock('../lib/api', () => ({
  authApi: {
    updateMe: mockUpdateMe,
    sendPhoneCode: mockSendPhoneCode,
    verifyPhone: mockVerifyPhone,
  },
}));

describe('Settings page — Phone Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      emailNotificationsEnabled: true,
      phone: null,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
    };
  });

  it('renders phone input when phone not verified', () => {
    render(<SettingsPage />);

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
  });

  it('shows verified badge when phone already verified', () => {
    mockUser.current = {
      ...mockUser.current,
      phone: '+15551234567',
      phoneVerified: true,
    };

    render(<SettingsPage />);

    expect(screen.getByText('+15551234567')).toBeInTheDocument();
    // Both email and phone show VERIFIED badges
    const badges = screen.getAllByText(/VERIFIED/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
  });

  it('submits phone number and shows code input', async () => {
    const user = userEvent.setup();
    mockSendPhoneCode.mockResolvedValue({ message: 'Code sent' });

    render(<SettingsPage />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '+15551234567');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(mockSendPhoneCode).toHaveBeenCalledWith('+15551234567');
    });

    expect(await screen.findByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it('validates phone format before submitting', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '555-bad');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    expect(await screen.findByText(/E\.164/i)).toBeInTheDocument();
    expect(mockSendPhoneCode).not.toHaveBeenCalled();
  });
});
