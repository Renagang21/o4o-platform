import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminNotification {
  id: string;
  type: 'order' | 'user' | 'status' | 'error';
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

interface AdminNotificationState {
  notifications: AdminNotification[];
  addNotification: (n: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  unreadCount: number;
}

const initialNotifications: AdminNotification[] = [
  { id: '1', type: 'order', message: '신규 주문이 접수되었습니다.', createdAt: '2024-05-01 10:00', read: false, link: '/admin/orders/101' },
  { id: '2', type: 'user', message: '신규 회원이 가입했습니다.', createdAt: '2024-05-01 09:50', read: false, link: '/admin/users' },
  { id: '3', type: 'status', message: '주문 101의 상태가 변경되었습니다.', createdAt: '2024-05-01 09:40', read: true, link: '/admin/orders/101' },
  { id: '4', type: 'error', message: '시스템 오류가 발생했습니다.', createdAt: '2024-05-01 09:30', read: false },
];

export const useAdminNotificationStore = create<AdminNotificationState>()(
  persist(
    (set, get) => ({
      notifications: initialNotifications,
      addNotification: (n) => {
        set((state) => ({
          notifications: [
            { ...n, id: Date.now().toString(), createdAt: new Date().toISOString(), read: false },
            ...state.notifications,
          ],
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      get unreadCount() {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    { name: 'admin-notifications' }
  )
); 