import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type NoticeType = 'success' | 'error' | 'warning' | 'info';

export interface AdminNotice {
  id: string;
  type: NoticeType;
  message: string;
  dismissible?: boolean;
  persistent?: boolean;
  duration?: number; // Auto-dismiss after milliseconds
  createdAt: Date;
}

interface AdminNoticesStore {
  notices: AdminNotice[];
  addNotice: (notice: Omit<AdminNotice, 'id' | 'createdAt'>) => string;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
  clearNoticesByType: (type: NoticeType) => void;
}

/**
 * Zustand store for WordPress-style admin notices
 */
const useAdminNoticesStore = create<AdminNoticesStore>((set) => ({
  notices: [],
  
  addNotice: (notice) => {
    const id = uuidv4();
    const newNotice: AdminNotice = {
      ...notice,
      id,
      createdAt: new Date(),
      dismissible: notice.dismissible ?? true,
      persistent: notice.persistent ?? false,
    };
    
    set((state) => ({
      notices: [...state.notices, newNotice],
    }));
    
    // Auto-dismiss if duration is set
    if (notice.duration && notice.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notices: state.notices.filter((n) => n.id !== id),
        }));
      }, notice.duration);
    }
    
    return id;
  },
  
  dismissNotice: (id) => {
    set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    }));
  },
  
  clearNotices: () => {
    set({ notices: [] });
  },
  
  clearNoticesByType: (type) => {
    set((state) => ({
      notices: state.notices.filter((notice) => notice.type !== type),
    }));
  },
}));

/**
 * Hook for managing WordPress-style admin notices
 */
export function useAdminNotices() {
  const store = useAdminNoticesStore();
  
  // Helper functions for common notice types
  const success = (message: string, options?: Partial<AdminNotice>) => {
    return store.addNotice({ ...options, type: 'success', message });
  };
  
  const error = (message: string, options?: Partial<AdminNotice>) => {
    return store.addNotice({ ...options, type: 'error', message });
  };
  
  const warning = (message: string, options?: Partial<AdminNotice>) => {
    return store.addNotice({ ...options, type: 'warning', message });
  };
  
  const info = (message: string, options?: Partial<AdminNotice>) => {
    return store.addNotice({ ...options, type: 'info', message });
  };
  
  return {
    notices: store.notices,
    addNotice: store.addNotice,
    dismissNotice: store.dismissNotice,
    clearNotices: store.clearNotices,
    clearNoticesByType: store.clearNoticesByType,
    // Convenience methods
    success,
    error,
    warning,
    info,
  };
}