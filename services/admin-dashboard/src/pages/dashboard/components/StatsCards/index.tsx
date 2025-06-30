/**
 * Stats Cards Container
 * 5개 주요 통계 카드 컨테이너
 */

import React, { memo } from 'react';
import UserStats from './UserStats';
import SalesStats from './SalesStats';
import ProductStats from './ProductStats';
import ContentStats from './ContentStats';
import PartnerStats from './PartnerStats';

interface StatsCardsProps {
  stats?: {
    users: any;
    sales: any;
    products: any;
    content: any;
    partners: any;
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