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
import { NotificationBell } from '../components/notification-bell';

const mockedNotificationsApi = vi.mocked(notificationsApi);

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell icon with unread count badge', async () => {
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 3 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(<NotificationBell productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows no badge when count is 0', async () => {
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(<NotificationBell productionId="prod-1" />);

    await waitFor(() => {
      expect(mockedNotificationsApi.unreadCount).toHaveBeenCalled();
    });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens dropdown with notification list on click', async () => {
    const user = userEvent.setup();
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 1 });
    mockedNotificationsApi.list.mockResolvedValue({
      notifications: [
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
      ],
    });

    render(<NotificationBell productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText(/your option on john was approved/i)).toBeInTheDocument();
    });
  });

  it('marks notification as read on click', async () => {
    const user = userEvent.setup();
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 1 });
    mockedNotificationsApi.list.mockResolvedValue({
      notifications: [
        {
          id: 'notif-1',
          userId: 'user-1',
          productionId: 'prod-1',
          type: 'OPTION_APPROVED',
          message: 'Your option was approved',
          link: null,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    mockedNotificationsApi.markAsRead.mockResolvedValue({
      notification: {
        id: 'notif-1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_APPROVED',
        message: 'Your option was approved',
        link: null,
        read: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<NotificationBell productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText(/your option was approved/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/your option was approved/i));

    await waitFor(() => {
      expect(mockedNotificationsApi.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });
});
