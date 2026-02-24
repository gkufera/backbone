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

// Use vi.hoisted to avoid variable reference issues with vi.mock hoisting
const { mockUpdateUser, mockUpdateMe, mockToastShow } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockUpdateMe: vi.fn(),
  mockToastShow: vi.fn(),
}));

vi.mock('../lib/toast-context', () => ({
  useToast: () => ({ show: mockToastShow, toasts: [], dismiss: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the auth context
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      emailNotificationsEnabled: true,
      phone: null,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateUser: mockUpdateUser,
  }),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  authApi: {
    updateMe: mockUpdateMe,
    sendPhoneCode: vi.fn(),
    verifyPhone: vi.fn(),
  },
}));

describe('Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name and email fields', () => {
    render(<SettingsPage />);

    expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows email verified badge', () => {
    render(<SettingsPage />);

    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it('saves name change', async () => {
    const user = userEvent.setup();

    mockUpdateMe.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'New Name',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
    });
    expect(mockUpdateUser).toHaveBeenCalled();
  });

  it('changes password with correct current password', async () => {
    const user = userEvent.setup();

    mockUpdateMe.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    await user.type(screen.getByLabelText(/current password/i), 'oldpassword123');
    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      });
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.type(screen.getByLabelText(/current password/i), 'oldpassword123');
    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows API error on failed password change', async () => {
    const user = userEvent.setup();

    mockUpdateMe.mockRejectedValue(new Error('Current password is incorrect'));

    render(<SettingsPage />);

    await user.type(screen.getByLabelText(/current password/i), 'wrongpassword');
    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
  });

  it('renders email notifications checkbox', () => {
    render(<SettingsPage />);

    const checkbox = screen.getByLabelText(/email notifications/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('shows toast on successful profile update', async () => {
    const user = userEvent.setup();

    mockUpdateMe.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'New Name',
        email: 'test@example.com',
        emailVerified: true,
        emailNotificationsEnabled: true,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('calls updateMe with emailNotificationsEnabled when toggled', async () => {
    const user = userEvent.setup();

    mockUpdateMe.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        emailNotificationsEnabled: false,
        createdAt: new Date().toISOString(),
      },
    });

    render(<SettingsPage />);

    const checkbox = screen.getByLabelText(/email notifications/i);
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({ emailNotificationsEnabled: false });
    });
  });
});
