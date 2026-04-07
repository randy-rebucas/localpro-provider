import { api } from './client';

export interface AppNotification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
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
