import { AdminStatsCard } from './AdminStatsCard';

interface AdminDashboardPanelProps {
  stats: {
    users?: number;
    products?: number;
    ordersToday?: number;
    revenue?: number;
    sellers?: number;
    suppliers?: number;
    partners?: number;
  };
  recentActivity?: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export function AdminDashboardPanel({ stats, recentActivity = [] }: AdminDashboardPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
        <AdminStatsCard
          users={stats.users || 0}
          products={stats.products || 0}
          ordersToday={stats.ordersToday || 0}
          revenue={stats.revenue || 0}
          sellers={stats.sellers || 0}
          suppliers={stats.suppliers || 0}
          partners={stats.partners || 0}
        />
      </div>

      {recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-3 border-b last:border-b-0"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{activity.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
