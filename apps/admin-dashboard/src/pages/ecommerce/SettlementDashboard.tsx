import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, Users, Calculator, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SettlementOverview {
  todayRevenue: number;
  todayPlatformFee: number;
  todayTossFee: number;
  todayNetRevenue: number;
  pendingSettlements: number;
  completedSettlements: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
  totalVendors: number;
  activeVendors: number;
}

interface VendorSettlement {
  id: string;
  vendorName: string;
  vendorEmail: string;
  totalSales: number;
  platformFee: number;
  tossFee: number;
  netAmount: number;
  orderCount: number;
  status: 'pending' | 'approved' | 'completed' | 'held';
  settlementDate: string;
  lastSettled: string;
}

interface RevenueData {
  date: string;
  totalRevenue: number;
  platformFee: number;
  tossFee: number;
  netRevenue: number;
  orderCount: number;
}

interface FeeBreakdown {
  name: string;
  value: number;
  color: string;
}

const SettlementDashboard: FC = () => {
  const [dateRange, setDateRange] = useState('7days');

  // Fetch settlement overview
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['settlement-overview'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/settlements/overview');
      return response.data;
    }
  });
  const overview: SettlementOverview = overviewData?.data || {};

  // Fetch vendor settlements
  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-settlements'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/settlements/vendors');
      return response.data;
    }
  });
  const vendors: VendorSettlement[] = vendorData?.data || [];

  // Fetch revenue chart data
  const { data: chartData } = useQuery({
    queryKey: ['settlement-charts', dateRange],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/settlements/charts?range=${dateRange}`);
      return response.data;
    }
  });
  const revenueData: RevenueData[] = chartData?.data?.revenue || [];
  const feeBreakdown: FeeBreakdown[] = chartData?.data?.feeBreakdown || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">대기중</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">승인됨</Badge>;
      case 'completed':
        return <Badge>완료</Badge>;
      case 'held':
        return <Badge variant="secondary">보류</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">정산 대시보드</h1>
          <p className="text-modern-text-secondary mt-1">플랫폼 수익 및 판매자 정산 현황</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="7days">최근 7일</option>
            <option value="30days">최근 30일</option>
            <option value="90days">최근 90일</option>
            <option value="1year">최근 1년</option>
          </select>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            보고서 생성
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              오늘 총 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {formatCurrency(overview.todayRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-modern-text-tertiary mt-1">
              {overview.monthlyGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              전월 대비 {Math.abs(overview.monthlyGrowth || 0)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              플랫폼 수수료 수익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(overview.todayPlatformFee || 0)}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              토스 수수료: {formatCurrency(overview.todayTossFee || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              정산 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(overview.pendingSettlements || 0)}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              승인 대기 중
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Users className="w-4 h-4" />
              활성 판매자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview.activeVendors || 0}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              총 {overview.totalVendors || 0}명 중
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>매출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="totalRevenue"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="총 매출"
                  />
                  <Area
                    type="monotone"
                    dataKey="platformFee"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="플랫폼 수수료"
                  />
                  <Area
                    type="monotone"
                    dataKey="tossFee"
                    stackId="3"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="토스 수수료"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>수수료 구성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {feeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {feeBreakdown.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>판매자별 정산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    판매자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    총 매출
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    플랫폼 수수료
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    정산 금액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    주문 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    정산일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {vendorLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-modern-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-modern-text-secondary">
                      정산 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  vendors.slice(0, 10).map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-modern-bg-hover">
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {vendor.vendorName}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {vendor.vendorEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-modern-text-primary">
                          {formatCurrency(vendor.totalSales)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-secondary">
                          {formatCurrency(vendor.platformFee)}
                        </div>
                        <div className="text-xs text-modern-text-tertiary">
                          토스: {formatCurrency(vendor.tossFee)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(vendor.netAmount)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-secondary">
                          {vendor.orderCount}건
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(vendor.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-secondary">
                          {new Date(vendor.settlementDate).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-modern-text-primary">정산 승인</h3>
              <p className="text-sm text-modern-text-secondary">대기 중인 정산을 일괄 승인</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-modern-text-primary">정산 보고서</h3>
              <p className="text-sm text-modern-text-secondary">월별 정산 보고서 생성</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-modern-text-primary">수수료 정책</h3>
              <p className="text-sm text-modern-text-secondary">플랫폼 수수료 정책 관리</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettlementDashboard;