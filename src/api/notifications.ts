import { api } from './client';

export interface AppNotification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  /** Optional deep-link path sent by the backend (e.g. "/jobs/abc123") */
  link?: string;
  /** Arbitrary payload that may carry resource IDs for deep-linking */
  data?: Record<string, unknown>;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export async function getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const { data } = await api.get<NotificationsResponse>('/api/notifications');
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: data.unreadCount ?? 0,
  };
}

export async function markAllRead(): Promise<void> {
  await api.patch('/api/notifications');
}

export async function markOneRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}`);
}

export async function registerPushToken(expoPushToken: string): Promise<void> {
  await api.post('/api/notifications/register-token', { token: expoPushToken });
}
