import { api } from './client';

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  createdAt: string;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data } = await api.get<{ announcements: Announcement[] } | Announcement[]>('/api/announcements');
  return Array.isArray(data) ? data : (data as any).announcements ?? [];
}
