import create from 'zustand';

export interface LiveStats {
  sales: number;
  orders: number;
  signups: number;
  orderData: { date: string; orders: number }[];
  salesData: { date: string; sales: number }[];
  signupData: { date: string; signups: number }[];
  topProducts: { name: string; sales: number }[];
}

interface AdminLiveStatsState extends LiveStats {
  updateLiveStats: () => Promise<void>;
}

const initialState: LiveStats = {
  sales: 12345000,
  orders: 123,
  signups: 45,
  orderData: [
    { date: '05-01', orders: 10 },
    { date: '05-02', orders: 15 },
    { date: '05-03', orders: 8 },
    { date: '05-04', orders: 20 },
    { date: '05-05', orders: 12 },
    { date: '05-06', orders: 18 },
    { date: '05-07', orders: 22 },
  ],
  salesData: [
    { date: '05-01', sales: 1000000 },
    { date: '05-02', sales: 1500000 },
    { date: '05-03', sales: 800000 },
    { date: '05-04', sales: 2000000 },
    { date: '05-05', sales: 1200000 },
    { date: '05-06', sales: 1800000 },
    { date: '05-07', sales: 2200000 },
  ],
  signupData: [
    { date: '05-01', signups: 2 },
    { date: '05-02', signups: 5 },
    { date: '05-03', signups: 3 },
    { date: '05-04', signups: 7 },
    { date: '05-05', signups: 4 },
    { date: '05-06', signups: 6 },
    { date: '05-07', signups: 8 },
  ],
  topProducts: [
    { name: '상품 A', sales: 120 },
    { name: '상품 B', sales: 95 },
    { name: '상품 C', sales: 80 },
    { name: '상품 D', sales: 60 },
    { name: '상품 E', sales: 45 },
  ],
};

export const useAdminLiveStatsStore = create<AdminLiveStatsState>((set) => ({
  ...initialState,
  updateLiveStats: async () => {
    try {
      // 실제 구현 시 JWT 인증 헤더 필요
      const res = await fetch('/admin/stats/live');
      if (!res.ok) throw new Error('실시간 통계 fetch 실패');
      const data = await res.json();
      set({
        sales: data.sales,
        orders: data.orders,
        signups: data.signups,
        orderData: data.orderData,
        salesData: data.salesData,
        signupData: data.signupData,
        topProducts: data.topProducts,
      });
    } catch {
      // 네트워크 오류 시 이전 상태 유지
    }
  },
})); 