import { create } from 'zustand';

/**
 * In-memory representation of a push notification payload received at runtime.
 * Distinct from the API's AppNotification (api/notifications.ts) which is the
 * persisted notification feed fetched from the server.
 */
interface PushNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationState {
  /** Runtime push notifications received this session (not persisted). */
  items: PushNotificationItem[];
  /** Unread count synced from the API notification feed or incremented by push. */
  unreadCount: number;
  add: (item: PushNotificationItem) => void;
  setAll: (items: PushNotificationItem[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Sync the badge count directly from the API unreadCount response. */
  setBadgeCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  add: (item) =>
    set((state) => ({
      items: [item, ...state.items],
      unreadCount: state.unreadCount + (item.isRead ? 0 : 1),
    })),
  setAll: (items) =>
    set({
      items,
      unreadCount: items.filter((n) => !n.isRead).length,
    }),
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  setBadgeCount: (count) => set({ unreadCount: count }),
}));
