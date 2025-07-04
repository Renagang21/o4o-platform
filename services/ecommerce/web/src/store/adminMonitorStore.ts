import create from 'zustand';

export interface SystemStatus {
  server: 'up' | 'down';
  responseTime: number; // ms
  requestCounts: { '1m': number; '10m': number; '1h': number };
  errorSummary: { '4xx': number; '5xx': number };
  dbStatus: 'connected' | 'disconnected';
  activeAdmins: number;
  recentErrors?: { time: string; message: string; code: string }[];
}

interface AdminMonitorState {
  status: SystemStatus | null;
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
}

export const useAdminMonitorStore = create<AdminMonitorState>((set) => ({
  status: null,
  loading: false,
  error: null,
  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/admin/system/status');
      const data = await res.json();
      set({ status: data, loading: false });
    } catch {
      set({ error: '상태 정보를 불러오지 못했습니다.', loading: false });
    }
  },
})); 