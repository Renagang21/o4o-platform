import React from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@o4o/ui';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '@o4o/utils';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useVendorDashboardStats, useVendorSalesChart, useVendorRecentOrders } from '../../hooks/vendor/useVendorStats';

// 대시보드 통계 카드 컴포넌트
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  subtitle
}: { 
  title: string; 
  value: string; 
  change?: string | number; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) {
  const isPositive = trend === 'up';
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {(change !== undefined || subtitle) && (
              <div className="flex items-center mt-2">
                {change !== undefined && trend && trend !== 'neutral' && (
                  <>
                    {isPositive ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
                    </span>
                  </>
                )}
                {subtitle && (
                  <span className="text-sm text-gray-500 ml-1">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${
            trend === 'up' ? 'bg-green-100' : 
            trend === 'down' ? 'bg-red-100' : 
            'bg-blue-100'
          }`}>
            <Icon className={`h-6 w-6 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusColors = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '대기중' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: '확인됨' },
  processing: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '처리중' },
  shipped: { bg: 'bg-purple-100', text: 'text-purple-800', label: '배송중' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: '배송완료' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: '취소됨' },
  returned: { bg: 'bg-gray-100', text: 'text-gray-800', label: '반품' },
};

// 로딩 컴포넌트
function LoadingDashboard() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">대시보드를 불러오는 중...</p>
      </div>
    </div>
  );
}

// 에러 컴포넌트
function ErrorDashboard({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading, error: statsError } = useVendorDashboardStats();
  const { data: salesData, isLoading: chartLoading } = useVendorSalesChart('7d');
  const { data: recentOrders, isLoading: ordersLoading } = useVendorRecentOrders(5);

  if (statsLoading || chartLoading || ordersLoading) {
    return <LoadingDashboard />;
  }

  if (statsError) {
    return <ErrorDashboard error="대시보드 데이터를 불러오는데 실패했습니다." />;
  }

  // 날짜 포맷 함수
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 차트 데이터 포맷
  const formattedSalesData = salesData?.map(item => ({
    date: formatChartDate(item.date),
    sales: item.sales,
    orders: item.orders
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-1">
            {user?.business_name || user?.name}님, 오늘도 좋은 하루 되세요! 👋
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">리포트 다운로드</Button>
          <Button onClick={() => window.location.href = '/vendor/products'}>
            새 상품 등록
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="오늘 매출"
          value={formatCurrency(stats?.todaySales || 0)}
          change={stats?.growthRate}
          icon={DollarSign}
          trend={stats?.growthRate > 0 ? 'up' : stats?.growthRate < 0 ? 'down' : 'neutral'}
          subtitle="전월 대비"
        />
        <StatCard
          title="전체 주문"
          value={(stats?.totalOrders || 0).toLocaleString()}
          icon={ShoppingCart}
          trend="neutral"
          subtitle={`신규 ${stats?.newOrders || 0}건`}
        />
        <StatCard
          title="활성 상품"
          value={(stats?.activeProducts || 0).toLocaleString()}
          icon={Package}
          trend="neutral"
          subtitle="판매중"
        />
        <StatCard
          title="이번 달 매출"
          value={formatCurrency(stats?.monthSales || 0)}
          icon={TrendingUp}
          trend={stats?.monthSales > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 매출 추이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 7일 매출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {formattedSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedSalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `₩${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  아직 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 주문 추이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 7일 주문 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {formattedSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedSalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  아직 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 주문 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최근 주문</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/vendor/orders'}
          >
            전체 보기
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-gray-600">주문번호</th>
                  <th className="pb-3 font-medium text-gray-600">고객명</th>
                  <th className="pb-3 font-medium text-gray-600">상품</th>
                  <th className="pb-3 font-medium text-gray-600">금액</th>
                  <th className="pb-3 font-medium text-gray-600">상태</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders && recentOrders.length > 0 ? (
                  recentOrders.map((order: any) => {
                    const status = statusColors[order.status as keyof typeof statusColors] || statusColors.pending;
                    return (
                      <tr key={order.id} className="border-b">
                        <td className="py-4 font-medium">{order.orderNumber}</td>
                        <td className="py-4">{order.customer}</td>
                        <td className="py-4">{order.items?.length || 0}개 상품</td>
                        <td className="py-4">{formatCurrency(order.total)}</td>
                        <td className="py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4">
                          <button 
                            className="p-1 hover:bg-gray-100 rounded"
                            onClick={() => window.location.href = `/vendor/orders/${order.id}`}
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      아직 주문이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}