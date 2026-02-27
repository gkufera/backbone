import type { Notification } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';

export type NotificationResponse = JsonSerialized<Notification>;

export interface NotificationPreferenceResponse {
  optionEmails: boolean;
  noteEmails: boolean;
  approvalEmails: boolean;
  scriptEmails: boolean;
  memberEmails: boolean;
  scopeFilter: string;
}

export const notificationPreferencesApi = {
  get(productionId: string): Promise<{ preferences: NotificationPreferenceResponse }> {
    return request(`/api/productions/${productionId}/notification-preferences`);
  },

  update(
    productionId: string,
    data: Partial<NotificationPreferenceResponse>,
  ): Promise<{ preferences: NotificationPreferenceResponse }> {
    return request(`/api/productions/${productionId}/notification-preferences`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const notificationsApi = {
  list(productionId: string): Promise<{ notifications: NotificationResponse[] }> {
    return request(`/api/productions/${productionId}/notifications`);
  },

  markAsRead(notificationId: string): Promise<{ notification: NotificationResponse }> {
    return request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  unreadCount(productionId: string): Promise<{ count: number }> {
    return request(`/api/productions/${productionId}/notifications/unread-count`);
  },
};
