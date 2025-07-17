/**
 * Stats Cards Container
 * 5개 주요 통계 카드 컨테이너
 */

import { memo } from 'react';
import UserStats from './UserStats';
import SalesStats from './SalesStats';
import ProductStats from './ProductStats';
import ContentStats from './ContentStats';
import PartnerStats from './PartnerStats';

interface UserStatsData {
  total: number;
  pending: number;
  today: number;
  activeRate: number;
  change: number;
  trend: 'up' | 'down';
}

interface SalesStatsData {
  today: number;
  changePercent: number;
  monthlyTotal: number;
  monthlyTarget: number;
  trend: 'up' | 'down';
}

interface ProductStatsData {
  active: number;
  lowStock: number;
  newThisWeek: number;
  bestsellers: { id: string; name: string; sales: number; }[];
  change: number;
  trend: 'up' | 'down';
}

interface ContentStatsData {
  publishedPages: number;
  draftContent: number;
  totalMedia: number;
  todayViews: number;
  change: number;
  trend: 'up' | 'down';
}

interface PartnerStatsData {
  active: number;
  pending: number;
  totalCommission: number;
  topPartners: { id: string; name: string; commission: number; }[];
  change: number;
  trend: 'up' | 'down';
}

interface StatsCardsProps {
  stats?: {
    users: UserStatsData;
    sales: SalesStatsData;
    products: ProductStatsData;
    content: ContentStatsData;
    partners: PartnerStatsData;
  };
  isLoading?: boolean;
}

const StatsCards = memo<StatsCardsProps>(({ stats, isLoading = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <UserStats 
        data={stats?.users}
        isLoading={isLoading}
      />
      <SalesStats 
        data={stats?.sales}
        isLoading={isLoading}
      />
      <ProductStats 
        data={stats?.products}
        isLoading={isLoading}
      />
      <ContentStats 
        data={stats?.content}
        isLoading={isLoading}
      />
      <PartnerStats 
        data={stats?.partners}
        isLoading={isLoading}
      />
    </div>
  );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;