'use client';

import { useState, useEffect } from 'react';
import { notificationsApi, type NotificationResponse } from '../lib/api';

interface NotificationBellProps {
  productionId: string;
}

export function NotificationBell({ productionId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    notificationsApi.unreadCount(productionId).then((data) => setUnreadCount(data.count)).catch(() => {
      // Fail silently, keep count at 0
    });
  }, [productionId]);

  async function handleOpen() {
    if (!isOpen) {
      try {
        const data = await notificationsApi.list(productionId);
        setNotifications(data.notifications);
      } catch {
        setNotifications([]);
      }
    }
    setIsOpen(!isOpen);
  }

  async function handleNotificationClick(notification: NotificationResponse) {
    if (!notification.read) {
      await notificationsApi.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b p-3 text-sm font-semibold dark:border-zinc-700">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No notifications</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 ${
                      notif.read ? 'text-zinc-500' : 'font-medium text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <p>{notif.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
