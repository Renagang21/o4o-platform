import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface PartnerDashboardData {
  totalCommissions: number;
  pendingPayouts: number;
  activeReferrals: number;
  clicksThisMonth: number;
  conversionRate: number;
}

export function usePartnerDashboardData() {
  return useQuery({
    queryKey: ['partner-dashboard'],
    queryFn: async () => {
      const response = await axios.get<PartnerDashboardData>('/api/partner/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
