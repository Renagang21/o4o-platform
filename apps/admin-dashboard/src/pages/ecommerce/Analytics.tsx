import { FC, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
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

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    chart: Array<{ date: string; value: number }>;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    averageValue: number;
    chart: Array<{ date: string; count: number; value: number }>;
  };
  products: {
    topSelling: Array<{ id: string; name: string; sales: number; revenue: number }>;
    lowStock: Array<{ id: string; name: string; stock: number; reorderPoint: number }>;
    categories: Array<{ name: string; sales: number; percentage: number }>;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    churnRate: number;
    lifetime: number;
    segments: Array<{ segment: string; count: number; value: number }>;
  };
  inventory: {
    totalValue: number;
    turnoverRate: number;
    deadStock: number;
    avgDaysToSell: number;
  };
}

const EcommerceAnalytics: FC = () => {
  const [period, setPeriod] = useState('month');
  const [compareMode, setCompareMode] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['ecommerce-analytics', period],
    queryFn: async () => {
      const response = await authClient.api.get(`/analytics/ecommerce?period=${period}`);
      return response.data?.data as AnalyticsData;
    }
  });

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    revenue: {
      current: 1250000,
      previous: 980000,
      growth: 27.55,
      chart: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: Math.floor(Math.random() * 50000 + 30000)
      }))
    },
    orders: {
      total: 324,
      completed: 287,
      pending: 23,
      cancelled: 14,
      averageValue: 3858,
      chart: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        count: Math.floor(Math.random() * 20 + 5),
        value: Math.floor(Math.random() * 5000 + 2000)
      }))
    },
    products: {
      topSelling: [
        { id: '1', name: '프리미엄 헤드폰', sales: 89, revenue: 4450000 },
        { id: '2', name: '무선 키보드', sales: 67, revenue: 2010000 },
        { id: '3', name: '스마트 워치', sales: 54, revenue: 2700000 },
        { id: '4', name: 'USB-C 허브', sales: 48, revenue: 720000 },
        { id: '5', name: '웹캠 HD', sales: 42, revenue: 1260000 }
      ],
      lowStock: [
        { id: '1', name: '프리미엄 헤드폰', stock: 12, reorderPoint: 20 },
        { id: '2', name: '무선 마우스', stock: 8, reorderPoint: 15 },
        { id: '3', name: '노트북 스탠드', stock: 5, reorderPoint: 10 }
      ],
      categories: [
        { name: '전자제품', sales: 145, percentage: 44.8 },
        { name: '액세서리', sales: 89, percentage: 27.5 },
        { name: '소프트웨어', sales: 56, percentage: 17.3 },
        { name: '기타', sales: 34, percentage: 10.5 }
      ]
    },
    customers: {
      total: 1234,
      new: 234,
      returning: 1000,
      churnRate: 5.2,
      lifetime: 125000,
      segments: [
        { segment: 'VIP', count: 123, value: 500000 },
        { segment: '일반', count: 789, value: 300000 },
        { segment: '신규', count: 322, value: 100000 }
      ]
    },
    inventory: {
      totalValue: 8900000,
      turnoverRate: 4.2,
      deadStock: 340000,
      avgDaysToSell: 18
    }
  };

  const data = analyticsData || mockData;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportReport = () => {
    // Export functionality would be implemented here
    // TODO: Implement report export functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-commerce 분석</h1>
          <p className="text-muted-foreground mt-1">실시간 판매 및 재고 분석</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="quarter">분기</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            보고서 내보내기
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{data.revenue.current.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.revenue.growth > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{data.revenue.growth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{data.revenue.growth}%</span>
                </>
              )}
              <span className="ml-1">전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">주문 수</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.orders.total}</div>
            <div className="text-xs text-muted-foreground">
              평균 주문액: ₩{data.orders.averageValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고객 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customers.total}</div>
            <div className="text-xs text-muted-foreground">
              신규: {data.customers.new} | 재구매: {data.customers.returning}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 회전율</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inventory.turnoverRate}x</div>
            <div className="text-xs text-muted-foreground">
              평균 판매 소요일: {data.inventory.avgDaysToSell}일
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">매출 분석</TabsTrigger>
          <TabsTrigger value="products">상품 분석</TabsTrigger>
          <TabsTrigger value="customers">고객 분석</TabsTrigger>
          <TabsTrigger value="inventory">재고 분석</TabsTrigger>
        </TabsList>

        {/* Revenue Analysis */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>매출 추이</CardTitle>
              <CardDescription>일별 매출 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.revenue.chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>주문 상태별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: '완료', value: data.orders.completed },
                        { name: '진행중', value: data.orders.pending },
                        { name: '취소', value: data.orders.cancelled }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>일별 주문 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.orders.chart.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Analysis */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>베스트셀러 TOP 5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.products.topSelling.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sales}개 판매</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₩{product.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>카테고리별 판매</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={data.products.categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                    >
                      {data.products.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>재고 부족 상품</CardTitle>
              <CardDescription>재주문이 필요한 상품 목록</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.products.lowStock.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">재주문점: {product.reorderPoint}개</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={product.stock < 10 ? "destructive" : "warning"}>
                        재고: {product.stock}개
                      </Badge>
                      <Button size="sm" variant="outline">재주문</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Analysis */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.customers.segments.map((segment) => (
              <Card key={segment.segment}>
                <CardHeader>
                  <CardTitle className="text-base">{segment.segment} 고객</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{segment.count}명</div>
                    <div className="text-sm text-muted-foreground">
                      평균 구매액: ₩{(segment.value / segment.count).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      총 매출: ₩{segment.value.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>고객 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">이탈률</p>
                  <p className="text-2xl font-bold">{data.customers.churnRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">재구매율</p>
                  <p className="text-2xl font-bold">
                    {((data.customers.returning / data.customers.total) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">신규 고객</p>
                  <p className="text-2xl font-bold">{data.customers.new}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LTV</p>
                  <p className="text-2xl font-bold">₩{data.customers.lifetime.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Analysis */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">총 재고 가치</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩{data.inventory.totalValue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">재고 회전율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.inventory.turnoverRate}x</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">데드스톡</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩{data.inventory.deadStock.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">평균 판매일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.inventory.avgDaysToSell}일</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>재고 최적화 제안</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>데드스톡 처리 필요</AlertTitle>
                  <AlertDescription>
                    3개월 이상 판매되지 않은 상품이 ₩{data.inventory.deadStock.toLocaleString()} 어치 있습니다.
                    할인 프로모션을 고려해보세요.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>재고 회전율 개선</AlertTitle>
                  <AlertDescription>
                    현재 회전율 {data.inventory.turnoverRate}x는 업계 평균보다 낮습니다.
                    재주문 주기를 조정하여 회전율을 높이세요.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcommerceAnalytics;

// Import Alert components
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';