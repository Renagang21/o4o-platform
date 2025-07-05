/**
 * Charts Container
 * Recharts 기반 3개 차트 시스템 컨테이너
 */

import { memo } from 'react';
import SalesChart from './SalesChart';
import OrderChart from './OrderChart';
import UserChart from './UserChart';

interface ChartsProps {
  data?: {
    sales: Array<{
      date: string;
      amount: number;
      orders: number;
    }>;
    orders: Array<{
      status: string;
      count: number;
      color: string;
    }>;
    users: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
    }>;
  };
  isLoading?: boolean;
}

const Charts = memo<ChartsProps>(({ data, isLoading = false }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sales Trend Chart */}
      <div className="lg:col-span-2">
        <SalesChart 
          data={data?.sales || []}
          isLoading={isLoading}
        />
      </div>

      {/* Order Status Chart */}
      <div className="lg:col-span-1">
        <OrderChart 
          data={data?.orders || []}
          isLoading={isLoading}
        />
      </div>

      {/* User Activity Chart - Full Width */}
      <div className="lg:col-span-3">
        <UserChart 
          data={data?.users || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
});

Charts.displayName = 'Charts';

export default Charts;