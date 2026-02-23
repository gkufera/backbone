import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    id: 'prod-1',
  }),
}));

vi.mock('../lib/api', () => ({
  authApi: { signup: vi.fn(), login: vi.fn(), me: vi.fn() },
  notificationsApi: {
    list: vi.fn(),
    markAsRead: vi.fn(),
    unreadCount: vi.fn(),
  },
}));

import { notificationsApi } from '../lib/api';
import NotificationsPage from '../app/productions/[id]/notifications/page';

const mockedNotificationsApi = vi.mocked(notificationsApi);

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    productionId: 'prod-1',
    type: 'OPTION_APPROVED',
    message: 'Your option on JOHN was approved',
    link: null,
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    productionId: 'prod-1',
    type: 'OPTION_READY',
    message: 'New option on BEACH HOUSE is ready',
    link: null,
    read: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('Notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of notifications', async () => {
    mockedNotificationsApi.list.mockResolvedValue({
      notifications: mockNotifications,
    });

    render(<NotificationsPage />);

    expect(await screen.findByText(/your option on john was approved/i)).toBeInTheDocument();
    expect(screen.getByText(/new option on beach house is ready/i)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(<NotificationsPage />);

    expect(await screen.findByText(/no notifications/i)).toBeInTheDocument();
  });

  it('marks notification as read on click', async () => {
    const user = userEvent.setup();
    mockedNotificationsApi.list.mockResolvedValue({
      notifications: mockNotifications,
    });
    mockedNotificationsApi.markAsRead.mockResolvedValue({
      notification: { ...mockNotifications[0], read: true },
    });

    render(<NotificationsPage />);

    await screen.findByText(/your option on john was approved/i);
    await user.click(screen.getByText(/your option on john was approved/i));

    await waitFor(() => {
      expect(mockedNotificationsApi.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('distinguishes read vs unread notifications', async () => {
    mockedNotificationsApi.list.mockResolvedValue({
      notifications: mockNotifications,
    });

    render(<NotificationsPage />);

    await screen.findByText(/your option on john was approved/i);

    // Unread notification should have font-medium (bold)
    const unreadItem = screen.getByText(/your option on john was approved/i).closest('button');
    expect(unreadItem?.className).toContain('font-medium');

    // Read notification should not have font-medium
    const readItem = screen.getByText(/new option on beach house is ready/i).closest('button');
    expect(readItem?.className).not.toContain('font-medium');
  });
});
