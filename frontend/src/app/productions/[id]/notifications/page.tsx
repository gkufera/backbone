'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notificationsApi, type NotificationResponse } from '../../../../lib/api';

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const productionId = params.id as string;

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notificationsApi
      .list(productionId)
      .then((data) => setNotifications(data.notifications))
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setIsLoading(false));
  }, [productionId]);

  async function handleClick(notification: NotificationResponse) {
    if (!notification.read) {
      await notificationsApi.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-zinc-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notif) => (
            <li key={notif.id}>
              <button
                onClick={() => handleClick(notif)}
                className={`w-full rounded border px-4 py-3 text-left hover:bg-zinc-50 ${
                  notif.read
                    ? 'border-zinc-200 text-zinc-500'
                    : 'border-zinc-300 font-medium text-zinc-900'
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
  );
}
