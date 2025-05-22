import create from 'zustand';

export interface AdminLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  target: string;
  detail: string;
  role?: string;
}

export type ReportPeriod = 'week' | 'month';

interface AdminReportState {
  logs: AdminLog[];
  loading: boolean;
  error: string | null;
  filters: {
    role: string | 'all';
    period: ReportPeriod;
  };
  fetchLogs: () => Promise<void>;
  setRoleFilter: (role: string | 'all') => void;
  setPeriodFilter: (period: ReportPeriod) => void;
  getStats: () => {
    byAdmin: { [email: string]: number };
    byRole: { [role: string]: number };
    trend: { date: string; count: number }[];
  };
}

export const useAdminReportStore = create<AdminReportState>((set, get) => ({
  logs: [],
  loading: false,
  error: null,
  filters: { role: 'all', period: 'week' },
  fetchLogs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/admin/logs');
      const data = await res.json();
      set({ logs: data, loading: false });
    } catch (e) {
      set({ error: '로그 불러오기 실패', loading: false });
    }
  },
  setRoleFilter: (role) => set((state) => ({ filters: { ...state.filters, role } })),
  setPeriodFilter: (period) => set((state) => ({ filters: { ...state.filters, period } })),
  getStats: () => {
    const { logs, filters } = get();
    // 기간 필터링
    const now = new Date();
    let start: Date;
    if (filters.period === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    }
    const filtered = logs.filter(l => {
      const t = new Date(l.timestamp);
      return t >= start && t <= now && (filters.role === 'all' || l.role === filters.role);
    });
    // 관리자별 집계
    const byAdmin: { [email: string]: number } = {};
    filtered.forEach(l => { byAdmin[l.adminEmail] = (byAdmin[l.adminEmail] || 0) + 1; });
    // 역할별 집계
    const byRole: { [role: string]: number } = {};
    filtered.forEach(l => { if (l.role) byRole[l.role] = (byRole[l.role] || 0) + 1; });
    // 날짜별 추이
    const trend: { date: string; count: number }[] = [];
    for (let i = 0; i < (filters.period === 'week' ? 7 : 30); i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = filtered.filter(l => l.timestamp.slice(0, 10) === dateStr).length;
      trend.push({ date: dateStr, count });
    }
    return { byAdmin, byRole, trend };
  },
})); 