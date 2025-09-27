import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  AlertCircle,
  Activity,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface PlatformStats {
  overview: {
    totalRevenue: number;
    netProfit: number;
    pendingSettlement: number;
    totalOrders: number;
    activeUsers: number;
    totalProducts: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  revenue: {
    daily: Array<{ date: string; revenue: number; orders: number }>;
    monthly: Array<{ month: string; revenue: number; profit: number }>;
    commissions: {
      partner: number;
      vendor: number;
      platform: number;
      total: number;
    };
  };
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
    avgProcessTime: string;
  };
  users: {
    suppliers: number;
    partners: number;
    sellers: number;
    customers: number;
    growth: number;
  };
  settlements: {
    pending: Array<{
      id: string;
      type: string;
      amount: number;
      recipient: string;
      dueDate: string;
    }>;
    completed: number;
    upcoming: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface AdminPlatformStatsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const AdminPlatformStats: React.FC<AdminPlatformStatsProps> = ({
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPlatformStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPlatformStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/platform-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 403) {
        toast({
          title: 'Access Denied',
          description: '관리자 권한이 필요합니다',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      toast({
        title: 'Error',
        description: '통계 데이터를 불러올 수 없습니다',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-green-600">
          <ArrowUpRight className="h-4 w-4" />
          +{value.toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-600">
          <ArrowDownRight className="h-4 w-4" />
          {value.toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500">0%</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>플랫폼 통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          통계 데이터를 불러올 수 없습니다. 관리자 권한을 확인해주세요.
        </AlertDescription>
      </Alert>
    );
  }

  const pieChartData = [
    { name: '파트너 수수료', value: stats.revenue.commissions.partner, color: '#8b5cf6' },
    { name: '벤더 수수료', value: stats.revenue.commissions.vendor, color: '#3b82f6' },
    { name: '플랫폼 수익', value: stats.revenue.commissions.platform, color: '#10b981' }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">플랫폼 운영 현황</h2>
          <p className="text-gray-600">실시간 운영 지표 및 재무 현황</p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className={`h-5 w-5 ${autoRefresh ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {autoRefresh ? '자동 업데이트 중' : '수동 모드'}
          </span>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.alerts.length > 0 && (
        <Alert variant={stats.alerts[0].type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {stats.alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              전일 대비 {getChangeIndicator(12.5)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순 사이트 수익</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.overview.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              수수료 총액 (마진 {((stats.overview.netProfit / stats.overview.totalRevenue) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">정산 예정액</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.overview.pendingSettlement)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.settlements.upcoming}건 대기중
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.approvals.pending}건</div>
            <p className="text-xs text-red-600">
              평균 처리 시간: {stats.approvals.avgProcessTime}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">종합 현황</TabsTrigger>
          <TabsTrigger value="revenue">매출 분석</TabsTrigger>
          <TabsTrigger value="users">사용자 현황</TabsTrigger>
          <TabsTrigger value="settlements">정산 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>일별 매출 추이</CardTitle>
                <CardDescription>최근 30일 매출 및 주문 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.revenue.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#3b82f6"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Commission Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>수수료 분포</CardTitle>
                <CardDescription>수익 구조 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">전환율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.conversionRate.toFixed(2)}%</div>
                <Progress value={stats.overview.conversionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">평균 주문 금액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.overview.averageOrderValue)}</div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">전월 대비 8.3% 증가</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">활성 사용자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.overview.activeUsers)}</div>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-gray-600">일일 활성 사용자</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 매출 및 수익</CardTitle>
              <CardDescription>최근 12개월 재무 성과</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.revenue.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="총 매출" />
                  <Bar dataKey="profit" fill="#10b981" name="순 수익" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">공급자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.suppliers}</div>
                <p className="text-xs text-muted-foreground">등록된 공급자</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">파트너</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.partners}</div>
                <p className="text-xs text-muted-foreground">활성 파트너</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">판매자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.sellers}</div>
                <p className="text-xs text-muted-foreground">등록 판매자</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">고객</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.customers}</div>
                <p className="text-xs text-muted-foreground">
                  성장률 {getChangeIndicator(stats.users.growth)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>정산 대기 목록</CardTitle>
              <CardDescription>처리가 필요한 정산 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.settlements.pending.map(settlement => (
                  <div key={settlement.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{settlement.recipient}</span>
                        <span className="text-sm text-gray-500">({settlement.type})</span>
                      </div>
                      <p className="text-sm text-gray-600">정산 예정일: {settlement.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(settlement.amount)}</div>
                      <button className="text-sm text-blue-600 hover:underline">
                        정산 처리
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPlatformStats;